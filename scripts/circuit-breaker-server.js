import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: "https://bambisleep.chat",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.CIRCUIT_BREAKER_PORT || process.env.SERVER_PORT || 6970;
const STATUS_FILE = path.join(__dirname, '..', 'maintenance-status.json');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'bambi-admin-2025';

// Circuit breaker state
let maintenanceState = {
    isActive: true,
    message: 'Bambi is making everything prettier...',
    currentIssue: 'Updating hypnotic experience',
    countdown: 300, // 5 minutes default
    startTime: Date.now(),
    estimatedCompletion: Date.now() + (5 * 60 * 1000)
};

// Admin state
let adminState = {
    routeSwitched: false,
    childProcess: null,
    gitOperations: []
};

// Health data for status dashboard - Fixed to avoid duplicates and include all required properties
let healthData = {
    system: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        uptime: '0s',
        memory: {
            total: 0,
            free: 0,
            used: 0,
            percentage: 0
        },
        cpu: {
            load1: 0,
            load5: 0,
            load15: 0,
            percentage: 0
        }
    },
    users: {
        count: 0,
        list: [],
        online: 0,
        anonymous: 0
    },
    database: {
        status: 'Circuit Breaker Mode',
        connected: false,
        message: 'Database bypassed during maintenance'
    },
    workers: {
        lmstudio: { status: 'disabled', message: 'Disabled during maintenance' },
        spirals: { status: 'disabled', message: 'Disabled during maintenance' },
        total: 2,
        running: 0,
        workers: [
            { name: 'LMStudio', status: 'disabled' },
            { name: 'Spirals', status: 'disabled' }
        ]
    },
    circuitBreaker: {
        status: 'active',
        service: 'circuit-breaker',
        uptime: 0,
        connections: 0,
        adminState: false,
        maintenanceState: false
    }
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

// Git operations helper
const executeGitCommand = (command, callback) => {
    const workingDir = path.join(__dirname, '..');
    console.log(`🔧 Executing git command: ${command}`);
    
    exec(command, { cwd: workingDir }, (error, stdout, stderr) => {
        const result = {
            command,
            success: !error,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            timestamp: new Date().toISOString()
        };
        
        adminState.gitOperations.push(result);
        if (adminState.gitOperations.length > 50) {
            adminState.gitOperations = adminState.gitOperations.slice(-50);
        }
        
        callback(result);
    });
};

// Process management with port conflict handling
const manageMainServer = (action, callback) => {
    console.log(`🔧 Managing main server: ${action}`);
    
    // Helper function to kill process on port
    const killProcessOnPort = (port, callback) => {
        const killCommand = process.platform === 'win32' 
            ? `netstat -ano | findstr :${port} && for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /PID %a /F`
            : `lsof -ti:${port} | xargs kill -9`;
            
        exec(killCommand, (error, stdout, stderr) => {
            if (error) {
                console.log(`No process found on port ${port} or error killing: ${error.message}`);
            } else {
                console.log(`✅ Killed process on port ${port}`);
            }
            callback();
        });
    };
    
    switch (action) {
        case 'start':
            // First, kill any existing process on port 6969
            killProcessOnPort(6969, () => {
                if (adminState.childProcess) {
                    adminState.childProcess.kill('SIGTERM');
                    adminState.childProcess = null;
                }
                
                // Wait a moment for port to be freed
                setTimeout(() => {
                    adminState.childProcess = spawn('node', ['src/server.js'], {
                        cwd: path.join(__dirname, '..'),
                        stdio: 'pipe',
                        env: { ...process.env, PORT: '6969' }
                    });
                    
                    adminState.childProcess.on('error', (err) => {
                        console.error('❌ Server process error:', err);
                        adminState.childProcess = null;
                    });
                    
                    adminState.childProcess.on('exit', (code, signal) => {
                        console.log(`🔧 Server process exited with code ${code}, signal ${signal}`);
                        adminState.childProcess = null;
                    });
                    
                    callback({ success: true, message: 'Server started on port 6969' });
                }, 2000);
            });
            break;
            
        case 'stop':
            // Kill both our child process and any process on port 6969
            killProcessOnPort(6969, () => {
                if (adminState.childProcess) {
                    adminState.childProcess.kill('SIGTERM');
                    adminState.childProcess = null;
                    callback({ success: true, message: 'Server stopped' });
                } else {
                    callback({ success: true, message: 'Server processes terminated' });
                }
            });
            break;
            
        case 'restart':
            manageMainServer('stop', () => {
                setTimeout(() => {
                    manageMainServer('start', callback);
                }, 3000); // Longer delay for restart
            });
            break;
            
        default:
            callback({ success: false, message: 'Unknown action' });
    }
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

// Admin API endpoints (backup to socket commands)
app.post('/api/admin/server/:action', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token !== ADMIN_TOKEN) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const { action } = req.params;
    manageMainServer(action, (result) => {
        res.json(result);
    });
});

app.post('/api/admin/git', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token !== ADMIN_TOKEN) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const { command, message } = req.body;
    
    if (message) {
        // Git commit
        executeGitCommand(`git commit -m "${message}"`, (result) => {
            res.json(result);
        });
    } else if (command) {
        // Regular git command
        const allowedCommands = ['git status', 'git pull', 'git add .', 'git log --oneline -10'];
        if (!allowedCommands.includes(command)) {
            return res.status(400).json({ success: false, message: 'Command not allowed' });
        }
        
        executeGitCommand(command, (result) => {
            res.json(result);
        });
    } else {
        res.status(400).json({ success: false, message: 'Command or message required' });
    }
});

app.get('/api/admin/status', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token !== ADMIN_TOKEN) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    res.json({
        routeSwitched: adminState.routeSwitched,
        serverRunning: !!adminState.childProcess,
        gitOperations: adminState.gitOperations.slice(-10),
        maintenanceState
    });
});

// Help route handling
app.get('/help*', (req, res) => {
    // If route is switched (admin bypass), return a simple response
    if (adminState.routeSwitched) {
        return res.status(200).json({ 
            message: 'Circuit breaker bypassed - help route not available',
            timestamp: new Date().toISOString()
        });
    }
    
    // Otherwise, show maintenance page for help routes too
    const elapsed = Math.floor((Date.now() - maintenanceState.startTime) / 1000);
    const remaining = Math.max(0, maintenanceState.countdown - elapsed);
    
    res.status(503).render('circuit-breaker', {
        title: 'BambiSleep.Chat - Help Unavailable',
        message: maintenanceState.message,
        currentIssue: 'Help system temporarily unavailable during maintenance',
        countdown: remaining,
        estimatedCompletion: new Date(maintenanceState.estimatedCompletion).toLocaleTimeString(),
        startTime: new Date(maintenanceState.startTime).toLocaleTimeString()
    });
});

// Health check endpoint with admin controls
app.get('/health', (req, res) => {
    const startTime = Date.now();
    
    // Debug log for health endpoint
    console.log(`🔍 Health request: Accept=${req.headers.accept || 'none'}, IP=${req.ip}`);
    
    // Check if this is an API request (wants JSON)
    const isAPIRequest = req.headers.accept && req.headers.accept.includes('application/json');
    console.log(`🔍 Request type: ${isAPIRequest ? 'API/JSON' : 'Browser/HTML'}`);
    
    // If not API request, serve the admin control panel HTML
    if (!isAPIRequest) {
        // Update the health data with current information
        healthData.system = {
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            uptime: formatUptime(os.uptime()),
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            cpuCount: os.cpus().length,
            timestamp: new Date().toISOString(),
            memory: {
                total: Math.round(os.totalmem() / 1024 / 1024),
                free: Math.round(os.freemem() / 1024 / 1024),
                used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024),
                percentage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
            },
            cpu: {
                load1: os.loadavg()[0],
                load5: os.loadavg()[1],
                load15: os.loadavg()[2],
                percentage: Math.min(Math.round((os.loadavg()[0] / os.cpus().length) * 100), 100)
            }
        };
        
        // Update workers info
        healthData.workers = {
            lmstudio: { status: 'disabled', message: 'Disabled during maintenance' },
            spirals: { status: 'disabled', message: 'Disabled during maintenance' },
            total: 2,
            running: 0,
            workers: [
                { name: 'LMStudio', status: 'disabled' },
                { name: 'Spirals', status: 'disabled' }
            ]
        };
        
        // Update circuit breaker info
        healthData.circuitBreaker = {
            status: 'active',
            service: 'circuit-breaker',
            uptime: formatUptime(process.uptime()),
            connections: io.engine.clientsCount,
            adminState: adminState,
            maintenanceState: maintenanceState
        };
        
        // Update response time
        healthData.responseTime = Date.now() - startTime;
        
        // Return the enhanced health dashboard with admin controls
        try {
            res.render('health', {
                title: 'Circuit Breaker Health Monitor',
                health: healthData,
                footer: { links: [] },
                req: req
            });
        } catch (err) {
            console.error('❌ Error rendering health template:', err);
            res.status(500).send(`
                <html>
                    <head><title>Health Dashboard Error</title></head>
                    <body>
                        <h1>Error rendering health dashboard</h1>
                        <p>${err.message}</p>
                        <p>Check server logs for details.</p>
                    </body>
                </html>
            `);
        }
    } else {
        // Return JSON for API requests
        res.json({ 
            status: 'ok', 
            service: 'circuit-breaker',
            uptime: formatUptime(process.uptime()),
            memory: {
                total: Math.round(os.totalmem() / 1024 / 1024) + ' MB',
                free: Math.round(os.freemem() / 1024 / 1024) + ' MB',
                used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024) + ' MB'
            },
            connections: io.engine.clientsCount,
            adminState: {
                routeSwitched: adminState.routeSwitched,
                serverRunning: !!adminState.childProcess,
                gitOperations: adminState.gitOperations.length
            },
            maintenanceState: maintenanceState,
            responseTime: Date.now() - startTime + ' ms'
        });
    }
});

// Health API endpoint - specifically for JSON requests
app.get('/health/api', (req, res) => {
    const startTime = Date.now();
    
    // Update the health data with current information
    const currentHealthData = {
        status: 'maintenance',
        service: 'circuit-breaker',
        uptime: formatUptime(process.uptime()),
        timestamp: new Date().toISOString(),
        system: {
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            uptime: formatUptime(os.uptime()),
            memory: {
                total: Math.round(os.totalmem() / 1024 / 1024),
                free: Math.round(os.freemem() / 1024 / 1024),
                used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024),
                percentage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
            },
            cpu: {
                load1: os.loadavg()[0],
                load5: os.loadavg()[1],
                load15: os.loadavg()[2],
                percentage: Math.min(Math.round((os.loadavg()[0] / os.cpus().length) * 100), 100)
            }
        },
        users: {
            count: io.engine.clientsCount,
            online: io.engine.clientsCount,
            anonymous: io.engine.clientsCount,
            list: []
        },
        database: {
            status: 'Circuit Breaker Mode',
            connected: false,
            message: 'Database bypassed during maintenance'
        },
        workers: {
            lmstudio: { status: 'disabled', message: 'Disabled during maintenance' },
            spirals: { status: 'disabled', message: 'Disabled during maintenance' },
            total: 2,
            running: 0,
            workers: [
                { name: 'LMStudio', status: 'disabled' },
                { name: 'Spirals', status: 'disabled' }
            ]
        },
        circuitBreaker: {
            status: 'active',
            service: 'circuit-breaker',
            uptime: formatUptime(process.uptime()),
            connections: io.engine.clientsCount,
            adminState: adminState.routeSwitched,
            maintenanceState: maintenanceState.isActive
        },
        maintenanceState: maintenanceState,
        responseTime: Date.now() - startTime
    };
    
    res.json(currentHealthData);
});

// Helper function to format uptime
function formatUptime(uptimeSeconds) {
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);
    
    let formatted = '';
    if (days > 0) formatted += `${days}d `;
    if (hours > 0) formatted += `${hours}h `;
    if (minutes > 0) formatted += `${minutes}m `;
    formatted += `${seconds}s`;
    
    return formatted.trim();
}

// Update connected times for users
function updateConnectedTimes() {
    if (healthData.users && healthData.users.list) {
        const now = new Date();
        healthData.users.list.forEach(user => {
            if (user.connectedAt && user.socketId !== 'offline') {
                const connectedTime = (now - new Date(user.connectedAt)) / 1000; // in seconds
                user.connectedTime = formatUptime(connectedTime);
            }
        });
    }
}

// Update connected times every minute
setInterval(updateConnectedTimes, 60000);

// API catch-all route - return JSON for any API requests not handled above
app.all('/api/*', (req, res) => {
    // Check if route is switched off (admin bypassed circuit breaker)
    if (adminState.routeSwitched) {
        return res.status(200).json({ 
            message: 'Circuit breaker bypassed by admin - API unavailable',
            timestamp: new Date().toISOString()
        });
    }
    
    // Return maintenance mode JSON response for all other API routes
    res.status(503).json({
        status: 'maintenance',
        message: maintenanceState.message,
        currentIssue: maintenanceState.currentIssue,
        service: 'circuit-breaker',
        timestamp: new Date().toISOString(),
        maintenanceState: maintenanceState
    });
});

// Main maintenance page (must be last)
app.get('*', (req, res) => {
    // Check if route is switched off (admin bypassed circuit breaker)
    if (adminState.routeSwitched) {
        return res.status(200).json({ 
            message: 'Circuit breaker bypassed by admin',
            timestamp: new Date().toISOString()
        });
    }
    
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
    
    // Track connected users for health dashboard
    const connectedAt = new Date();
    const userData = {
        socketId: socket.id,
        username: `Client-${socket.id.substring(0, 6)}`,
        bambiId: 'n/a',
        location: socket.handshake.headers.referer || 'Unknown',
        lastTrigger: 'None',
        connectedAt: connectedAt,
        connectedTime: '0s'
    };
    
    // Add to connected users list
    healthData.users.list.push(userData);
    healthData.users.count = healthData.users.list.length;
    healthData.users.online = healthData.users.list.filter(u => u.socketId !== 'offline').length;
    
    // Send current state to new client
    socket.emit('statusUpdate', maintenanceState);
    
    // Handle client requesting status update
    socket.on('requestStatus', () => {
        socket.emit('statusUpdate', maintenanceState);
    });
    
    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
        
        // Update connected users list when client disconnects
        const index = healthData.users.list.findIndex(u => u.socketId === socket.id);
        if (index !== -1) {
            healthData.users.list.splice(index, 1);
            healthData.users.count = healthData.users.list.length;
            healthData.users.online = healthData.users.list.filter(u => u.socketId !== 'offline').length;
        }
    });
});

// Admin namespace for admin commands
const adminNamespace = io.of('/admin');
adminNamespace.on('connection', (socket) => {
    console.log(`🔧 Admin connected: ${socket.id}`);
    let authenticated = false;
    
    // Authentication
    socket.on('authenticate', (token) => {
        if (token === ADMIN_TOKEN) {
            authenticated = true;
            socket.emit('authenticated', { success: true });
            console.log(`✅ Admin authenticated: ${socket.id}`);
        } else {
            socket.emit('authenticated', { success: false });
            console.log(`❌ Admin auth failed: ${socket.id}`);
        }
    });
    
    // Admin commands with automatic main server termination
    socket.on('serverCommand', (data) => {
        if (!authenticated) {
            socket.emit('commandResult', { success: false, message: 'Not authenticated' });
            return;
        }
        
        const { action } = data;
        console.log(`🔧 Admin command: ${action}`);
        
        // Auto-terminate main server for any admin server command
        if (action === 'start' || action === 'restart') {
            console.log('🛑 Auto-terminating main server for admin override...');
        }
        
        manageMainServer(action, (result) => {
            socket.emit('commandResult', result);
            adminNamespace.emit('serverStatusUpdate', {
                action,
                result,
                childProcess: !!adminState.childProcess
            });
        });
    });
    
    // Git commands
    socket.on('gitCommand', (data) => {
        if (!authenticated) {
            socket.emit('gitResult', { success: false, message: 'Not authenticated' });
            return;
        }
        
        const { command } = data;
        const allowedCommands = ['git status', 'git pull', 'git add .', 'git log --oneline -10'];
        
        if (!allowedCommands.includes(command)) {
            socket.emit('gitResult', { success: false, message: 'Command not allowed' });
            return;
        }
        
        executeGitCommand(command, (result) => {
            socket.emit('gitResult', result);
            adminNamespace.emit('gitUpdate', result);
        });
    });
    
    // Git commit with message
    socket.on('gitCommit', (data) => {
        if (!authenticated) {
            socket.emit('gitResult', { success: false, message: 'Not authenticated' });
            return;
        }
        
        const { message } = data;
        if (!message) {
            socket.emit('gitResult', { success: false, message: 'Commit message required' });
            return;
        }
        
        executeGitCommand(`git commit -m "${message}"`, (result) => {
            socket.emit('gitResult', result);
            adminNamespace.emit('gitUpdate', result);
        });
    });
    
    // Route switching
    socket.on('switchRoute', (data) => {
        if (!authenticated) {
            socket.emit('routeResult', { success: false, message: 'Not authenticated' });
            return;
        }
        
        adminState.routeSwitched = data.switched;
        socket.emit('routeResult', { 
            success: true, 
            switched: adminState.routeSwitched 
        });
        adminNamespace.emit('routeUpdate', { switched: adminState.routeSwitched });
    });
    
    // Get admin status
    socket.on('getAdminStatus', () => {
        if (!authenticated) return;
        
        socket.emit('adminStatus', {
            routeSwitched: adminState.routeSwitched,
            serverRunning: !!adminState.childProcess,
            gitOperations: adminState.gitOperations.slice(-10),
            maintenanceState
        });
    });
    
    socket.on('disconnect', () => {
        console.log(`🔧 Admin disconnected: ${socket.id}`);
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

// Check for existing processes on port BEFORE starting server
console.log('🛑 Checking for existing processes on port 6969...');
const killCommand = process.platform === 'win32' 
    ? `netstat -ano | findstr :6969`
    : `lsof -ti:6969`;
    
exec(killCommand, (error, stdout, stderr) => {
    if (stdout && stdout.trim()) {
        console.log('🛑 Found existing process on port 6969, terminating...');
        const killCmd = process.platform === 'win32' 
            ? `for /f "tokens=5" %a in ('netstat -ano ^| findstr :6969') do taskkill /PID %a /F`
            : `lsof -ti:6969 | xargs kill -9`;
            
        exec(killCmd, (killError) => {
            if (killError) {
                console.log('⚠️  Could not kill existing process, may cause conflicts');
            } else {
                console.log('✅ Existing process terminated successfully');
            }
            // Wait a moment then start our server
            setTimeout(startCircuitBreakerServer, 2000);
        });
    } else {
        console.log('✅ No existing process found on port 6969');
        startCircuitBreakerServer();
    }
});

// Start server function
function startCircuitBreakerServer() {
    server.listen(PORT, () => {
        console.log(`🔧 Circuit Breaker Server running on port ${PORT}`);
        console.log(`🌐 Maintenance mode active for BambiSleep.Chat`);
        console.log(`📊 Status API: http://localhost:${PORT}/api/maintenance/status`);
        console.log(`🔧 Admin API: http://localhost:${PORT}/api/admin/*`);
        console.log(`🔌 Admin Socket: /admin namespace`);
        console.log(`🔑 Admin Token: ${ADMIN_TOKEN}`);
        console.log(`❤️  Health check: http://localhost:${PORT}/health`);
        console.log('🚀 Circuit breaker now controlling port 6969');
    });
}

// Graceful shutdown
const shutdown = () => {
    console.log('🛑 Circuit breaker server shutting down...');
    saveState();
    
    // Clean up child process
    if (adminState.childProcess) {
        console.log('🛑 Stopping child process...');
        adminState.childProcess.kill('SIGTERM');
    }
    
    server.close(() => {
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('SIGHUP', () => {
    console.log('🔄 Received SIGHUP, reloading maintenance state...');
    if (fs.existsSync(STATUS_FILE)) {
        try {
            const saved = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
            maintenanceState = { ...maintenanceState, ...saved };
            io.emit('statusUpdate', maintenanceState);
            console.log('✅ Maintenance state reloaded');
        } catch (err) {
            console.error('❌ Failed to reload maintenance state:', err);
        }
    }
});

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
