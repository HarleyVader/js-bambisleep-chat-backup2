import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server);

const PORT = process.env.CIRCUIT_BREAKER_PORT || 6970;
const STATUS_FILE = path.join(__dirname, '..', 'maintenance-status.json');

// Circuit breaker state
let maintenanceState = {
    isActive: true,
    message: 'Bambi is making everything prettier...',
    currentIssue: 'Updating hypnotic experience',
    countdown: 300, // 5 minutes default
    startTime: Date.now(),
    estimatedCompletion: Date.now() + (5 * 60 * 1000)
};

// Load status from file if exists
if (fs.existsSync(STATUS_FILE)) {
    try {
        const saved = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
        maintenanceState = { ...maintenanceState, ...saved };
    } catch (err) {
        console.log('Using default maintenance state');
    }
}

// Save status to file
const saveState = () => {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(maintenanceState, null, 2));
};

// Serve static files
app.use('/static', express.static(path.join(__dirname, '..', 'src', 'public')));
app.use(express.json());

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'src', 'views'));

// API endpoint to update maintenance status
app.post('/api/maintenance/status', (req, res) => {
    const { message, currentIssue, countdown, estimatedCompletion } = req.body;
    
    if (message) maintenanceState.message = message;
    if (currentIssue) maintenanceState.currentIssue = currentIssue;
    if (countdown) {
        maintenanceState.countdown = countdown;
        maintenanceState.estimatedCompletion = Date.now() + (countdown * 1000);
    }
    if (estimatedCompletion) maintenanceState.estimatedCompletion = estimatedCompletion;
    
    saveState();
    
    // Broadcast update to all connected clients
    io.emit('statusUpdate', maintenanceState);
    
    res.json({ success: true, state: maintenanceState });
});

// Get current status
app.get('/api/maintenance/status', (req, res) => {
    res.json(maintenanceState);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'circuit-breaker',
        uptime: process.uptime(),
        connections: io.engine.clientsCount
    });
});

// Main maintenance page (must be last)
app.get('*', (req, res) => {
    // Update countdown based on elapsed time
    const elapsed = Math.floor((Date.now() - maintenanceState.startTime) / 1000);
    const remaining = Math.max(0, maintenanceState.countdown - elapsed);
    
    res.status(503).render('circuit-breaker', {
        title: 'BambiSleep.Chat - Maintenance Mode',
        message: maintenanceState.message,
        currentIssue: maintenanceState.currentIssue,
        countdown: remaining,
        estimatedCompletion: new Date(maintenanceState.estimatedCompletion).toLocaleTimeString(),
        startTime: new Date(maintenanceState.startTime).toLocaleTimeString()
    });
});

// Socket.IO connections
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    
    // Send current state to new client
    socket.emit('statusUpdate', maintenanceState);
    
    // Handle client requesting status update
    socket.on('requestStatus', () => {
        socket.emit('statusUpdate', maintenanceState);
    });
    
    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

// Countdown timer - update every second
setInterval(() => {
    const elapsed = Math.floor((Date.now() - maintenanceState.startTime) / 1000);
    const remaining = Math.max(0, maintenanceState.countdown - elapsed);
    
    if (remaining !== maintenanceState.lastBroadcast) {
        maintenanceState.lastBroadcast = remaining;
        io.emit('countdownUpdate', { remaining, elapsed });
    }
}, 1000);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'circuit-breaker',
        uptime: process.uptime(),
        connections: io.engine.clientsCount
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🔧 Circuit Breaker Server running on port ${PORT}`);
    console.log(`🌐 Maintenance mode active for BambiSleep.Chat`);
    console.log(`📊 Status API: http://localhost:${PORT}/api/maintenance/status`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
const shutdown = () => {
    console.log('🛑 Circuit breaker server shutting down...');
    saveState();
    server.close(() => {
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    saveState();
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
    saveState();
    process.exit(1);
});
