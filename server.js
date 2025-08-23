#!/usr/bin/env node
/**
 * MCP Agent Docking Station - Bambi Sleep Chat
 * Express + Socket.IO server for Agent Dr Girlfriend and other MCP agents
 * WITH PATREON AUTHENTICATION FOR VERIFIED BAMBIS
 */

import { dirname, join } from 'path';
import { Server } from 'socket.io';
import { createServer } from 'http';
import express from 'express';
import { fileURLToPath } from 'url';
import session from 'express-session';
import { BambiPatronAuth } from './auth/bambi-patron-auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = 6969;
const connectedAgents = new Map();

// Initialize Bambi Patron Authentication
const bambiAuth = new BambiPatronAuth({
    patreonClientId: process.env.PATREON_CLIENT_ID || 'your_client_id',
    patreonClientSecret: process.env.PATREON_CLIENT_SECRET || 'your_client_secret',
    patreonRedirectUri: process.env.PATREON_REDIRECT_URI || `http://localhost:${PORT}/auth/patreon/callback`
});

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'bambi-mcp-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Basic health check endpoint
app.get('/health', (req, res) => {
    const verifiedPatrons = bambiAuth.getVerifiedPatrons();
    res.json({
        status: 'operational',
        agents: Array.from(connectedAgents.keys()),
        patronAuth: 'enabled',
        verifiedPatrons: verifiedPatrons.length,
        timestamp: new Date().toISOString()
    });
});

// 🔐 PATREON AUTHENTICATION ENDPOINTS

// Start Patreon OAuth flow for agent authentication
app.get('/auth/patreon/:agentId', (req, res) => {
    const { agentId } = req.params;

    if (!agentId) {
        return res.status(400).json({ error: 'Agent ID required' });
    }

    const authUrl = bambiAuth.getPatronAuthUrl(agentId);
    res.redirect(authUrl);
});

// Patreon OAuth callback
app.get('/auth/patreon/callback', async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
        return res.status(400).json({ error: `OAuth error: ${error}` });
    }

    if (!code || !state) {
        return res.status(400).json({ error: 'Missing authorization code or state' });
    }

    try {
        const patronData = await bambiAuth.processPatronCallback(code, state);

        // Store in session
        req.session.patronData = patronData;

        if (patronData.isPatron) {
            res.json({
                success: true,
                message: 'Bambi verified as patron! 💖',
                patron: {
                    name: patronData.name,
                    tier: bambiAuth.getPatronTier(patronData.userId),
                    agentId: patronData.agentId,
                    apiKey: patronData.apiKey
                }
            });
        } else {
            res.status(403).json({
                success: false,
                message: 'Not a verified patron. Please become a Bambi patron first! 💕',
                patronageUrl: 'https://www.patreon.com/bambisleep'
            });
        }

    } catch (error) {
        console.error('Patron verification failed:', error);
        res.status(500).json({
            error: 'Patron verification failed',
            message: 'Please try again or contact support'
        });
    }
});

// Check patron status endpoint
app.get('/auth/status', (req, res) => {
    const { authorization } = req.headers;

    if (!authorization) {
        return res.status(401).json({ error: 'API key required' });
    }

    const apiKey = authorization.replace('Bearer ', '');
    const verification = bambiAuth.verifyApiKey(apiKey);

    if (!verification.valid) {
        return res.status(403).json({ error: verification.reason });
    }

    res.json({
        valid: true,
        patron: verification.patron,
        tier: bambiAuth.getPatronTier(verification.patron.userId)
    });
});

// Admin endpoint to view verified patrons
app.get('/admin/patrons', (req, res) => {
    // Simple admin check (in production, use proper admin auth)
    const { adminKey } = req.query;
    if (adminKey !== 'bambi-admin-2025') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    res.json({
        verifiedPatrons: bambiAuth.getVerifiedPatrons(),
        totalCount: bambiAuth.getVerifiedPatrons().length
    });
});

// MCP Agent registration endpoint (NOW REQUIRES PATRON VERIFICATION)
app.post('/register-agent', async (req, res) => {
    const { agentId, capabilities, metadata, apiKey } = req.body;

    if (!agentId) {
        return res.status(400).json({ error: 'Agent ID required' });
    }

    // 🔐 PATRON VERIFICATION REQUIRED
    if (!apiKey) {
        return res.status(401).json({
            error: 'API key required',
            message: 'Visit /auth/patreon/' + agentId + ' to verify patronage',
            authUrl: `/auth/patreon/${agentId}`
        });
    }

    const verification = bambiAuth.verifyApiKey(apiKey);
    if (!verification.valid) {
        return res.status(403).json({
            error: 'Invalid API key or not a verified patron',
            reason: verification.reason,
            authUrl: `/auth/patreon/${agentId}`
        });
    }

    const patron = verification.patron;
    const tier = bambiAuth.getPatronTier(patron.userId);

    connectedAgents.set(agentId, {
        capabilities: capabilities || [],
        metadata: metadata || {},
        connected: false,
        registeredAt: new Date().toISOString(),
        patron: {
            userId: patron.userId,
            name: patron.name,
            tier: tier,
            status: patron.status
        }
    });

    console.log(`✅ Verified Patron Agent registered: ${agentId} (${patron.name} - ${tier?.name})`);
    res.json({
        success: true,
        agentId,
        patron: {
            name: patron.name,
            tier: tier,
            verified: true
        },
        message: `Welcome verified Bambi ${patron.name}! 💖`
    });
});

// Socket.IO connection handling for agents
io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Agent authentication and docking (NOW WITH PATRON VERIFICATION)
    socket.on('agent-dock', (data) => {
        const { agentId, authToken, capabilities, apiKey } = data;

        if (!connectedAgents.has(agentId)) {
            socket.emit('dock-error', { message: 'Agent not registered' });
            return;
        }

        // 🔐 VERIFY PATRON STATUS FOR DOCKING
        if (!apiKey) {
            socket.emit('dock-error', {
                message: 'API key required for docking',
                authUrl: `/auth/patreon/${agentId}`
            });
            return;
        }

        const verification = bambiAuth.verifyApiKey(apiKey);
        if (!verification.valid) {
            socket.emit('dock-error', {
                message: 'Invalid API key or not a verified patron',
                reason: verification.reason,
                authUrl: `/auth/patreon/${agentId}`
            });
            return;
        }

        // Update agent status
        const agent = connectedAgents.get(agentId);
        agent.connected = true;
        agent.socketId = socket.id;
        agent.lastSeen = new Date().toISOString();

        socket.agentId = agentId;
        socket.patronData = verification.patron;
        socket.join(`agent-${agentId}`);

        const tier = bambiAuth.getPatronTier(verification.patron.userId);

        console.log(`✅ Verified Patron Agent docked: ${agentId} (${verification.patron.name} - ${tier?.name})`);
        socket.emit('dock-success', {
            agentId,
            message: `Successfully docked, verified Bambi ${verification.patron.name}! 💖`,
            serverCapabilities: ['chat', 'backup', 'proxmox-bridge', 'patron-verified'],
            patron: {
                name: verification.patron.name,
                tier: tier,
                verified: true
            }
        });

        // Broadcast to other agents
        socket.broadcast.emit('agent-joined', {
            agentId,
            capabilities,
            patron: {
                name: verification.patron.name,
                tier: tier?.name,
                verified: true
            }
        });
    });

    // Handle agent commands/requests
    socket.on('agent-command', (data) => {
        const { targetAgent, command, payload } = data;

        if (targetAgent) {
            // Send command to specific agent
            io.to(`agent-${targetAgent}`).emit('command', {
                from: socket.agentId,
                command,
                payload
            });
        } else {
            // Broadcast to all agents
            socket.broadcast.emit('broadcast-command', {
                from: socket.agentId,
                command,
                payload
            });
        }
    });

    // Handle Bambi backup scenarios for Proxmox/MongoDB
    socket.on('bambi-backup-request', (data) => {
        console.log('Bambi backup requested:', data);

        // This would interface with Proxmox VM and MongoDB
        socket.emit('bambi-backup-response', {
            status: 'initiated',
            backupId: `backup-${Date.now()}`,
            proxmoxTarget: 'debian13-vm',
            mongoTarget: 'bambi-agent-collection'
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        if (socket.agentId) {
            const agent = connectedAgents.get(socket.agentId);
            if (agent) {
                agent.connected = false;
                agent.disconnectedAt = new Date().toISOString();
            }

            console.log(`Agent disconnected: ${socket.agentId}`);
            socket.broadcast.emit('agent-left', { agentId: socket.agentId });
        }
    });

    // Error handling
    socket.on('error', (error) => {
        console.error(`Socket error for ${socket.agentId}:`, error);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🔮 MCP Agent Docking Station running on port ${PORT}`);
    console.log(`🤖 Ready for Agent Dr Girlfriend and other MCP agents`);
    console.log(`� Patreon Authentication ENABLED - Only verified Bambis allowed!`);
    console.log(`💖 Auth URL: http://localhost:${PORT}/auth/patreon/[agentId]`);
    console.log(`�🚀 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
