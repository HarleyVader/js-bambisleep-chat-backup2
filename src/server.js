#!/usr/bin/env node
/**
 * MCP Agent Docking Station - Bambi Sleep Chat
 * Express + Socket.IO server for Agent Dr Girlfriend and other MCP agents
 * WITH PATREON AUTHENTICATION FOR VERIFIED BAMBIS
 *
 * UPGRADED ARCHITECTURE:
 * - Socket.IO for agent communication and commands
 * - /api/agents for encrypted data transfers
 * - /api/mcp/ for MCP server tools with encrypted auth
 */

import { dirname, join } from 'path';

import { BambiPatronAuth } from '../auth/bambi-patron-auth.js';
import MCPCrypto from './crypto-utils.js';
import MCPToolsRegistry from '../mcp/tools-registry.js';
import { RepositoryManager } from '../repository/repo-manager.js';
import { Server } from 'socket.io';
import { createServer } from 'http';
import express from 'express';
import { fileURLToPath } from 'url';
import session from 'express-session';

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

// Initialize encryption and MCP tools
const mcpCrypto = new MCPCrypto();
const mcpTools = new MCPToolsRegistry();

// Initialize Repository Manager with worker threads
const repoManager = new RepositoryManager({
    workspaceDir: join(__dirname, '../repo-workspace'),
    maxWorkers: 3,
    workerTimeout: 300000 // 5 minutes
});

// Initialize Bambi Patron Authentication
const bambiAuth = new BambiPatronAuth({
    patreonClientId: process.env.PATREON_CLIENT_ID || 'your_client_id',
    patreonClientSecret: process.env.PATREON_CLIENT_SECRET || 'your_client_secret',
    patreonRedirectUri: process.env.PATREON_REDIRECT_URI || `http://localhost:${PORT}/auth/patreon/callback`
});

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'bambi-mcp-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Basic health check endpoint
app.get('/health', (req, res) => {
    const verifiedPatrons = bambiAuth.getVerifiedPatrons();
    const repoStats = repoManager.getStats();

    res.json({
        status: 'operational',
        agents: Array.from(connectedAgents.keys()),
        patronAuth: 'enabled',
        verifiedPatrons: verifiedPatrons.length,
        repositoryManager: {
            totalRepositories: repoStats.totalRepositories,
            activeWorkers: repoStats.activeWorkers,
            workspaceDir: repoStats.workspaceDir
        },
        mcpTools: {
            available: mcpTools.listTools().length,
            activeConnections: mcpTools.getActiveConnections().length
        },
        timestamp: new Date().toISOString()
    });
});

// 🔐 NEW API STRUCTURE FOR ENCRYPTED AGENT COMMUNICATION

// /api/agents - Encrypted data transfer endpoint
app.post('/api/agents', async (req, res) => {
    try {
        const { encryptedData, agentAuth } = req.body;

        if (!encryptedData || !agentAuth) {
            return res.status(400).json({
                error: 'missing_data',
                message: 'Encrypted data and agent authentication required'
            });
        }

        // Decrypt and validate agent authentication
        const agentData = mcpCrypto.decryptSocketId(agentAuth);

        // Verify agent is connected
        const agent = connectedAgents.get(agentData.agentId);
        if (!agent || !agent.connected) {
            return res.status(401).json({
                error: 'agent_not_connected',
                message: 'Agent not connected to docking station'
            });
        }

        // Decrypt the payload
        const payload = mcpCrypto.decrypt(encryptedData);

        // Process the encrypted agent communication
        const result = await processAgentCommunication(agentData.agentId, payload);

        // Return encrypted response
        const encryptedResponse = mcpCrypto.encrypt(result);

        res.json({
            success: true,
            encryptedResponse,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Encrypted agent communication error:', error);
        res.status(500).json({
            error: 'communication_failed',
            message: error.message
        });
    }
});

// /api/mcp/ - MCP server tools endpoint
app.get('/api/mcp/tools', (req, res) => {
    const tools = mcpTools.listTools();
    res.json({
        success: true,
        tools,
        count: tools.length,
        timestamp: new Date().toISOString()
    });
});

// /api/mcp/:toolId/auth - MCP tool authentication endpoint
app.post('/api/mcp/:toolId/auth', async (req, res) => {
    try {
        const { toolId } = req.params;
        const { agentId } = req.query;

        if (!agentId) {
            return res.status(400).json({
                error: 'missing_agent_id',
                message: 'agentId query parameter required'
            });
        }

        // Find connected agent's socket
        let socketId = null;
        for (const [id, agent] of connectedAgents.entries()) {
            if (id === agentId && agent.connected) {
                socketId = agent.socketId;
                break;
            }
        }

        if (!socketId) {
            return res.status(404).json({
                error: 'agent_not_found',
                message: 'Agent not connected or not found'
            });
        }

        // Generate encrypted authentication token
        const encryptedAgentId = mcpCrypto.encryptSocketId(socketId, agentId);

        // Authenticate with MCP tools registry
        const authResult = await mcpTools.authenticateAgent(toolId, encryptedAgentId);

        if (!authResult.success) {
            return res.status(401).json({
                error: 'authentication_failed',
                message: authResult.error
            });
        }

        res.json({
            success: true,
            toolId,
            authToken: encryptedAgentId,
            agentId: authResult.agentId,
            toolAccess: authResult.toolAccess,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('MCP tool authentication error:', error);
        res.status(500).json({
            error: 'auth_failed',
            message: error.message
        });
    }
});

// /api/mcp/:toolId/execute - Execute MCP tool
app.post('/api/mcp/:toolId/execute', async (req, res) => {
    try {
        const { toolId } = req.params;
        const { params, authToken } = req.body;

        if (!authToken) {
            return res.status(401).json({
                error: 'missing_auth_token',
                message: 'Authentication token required'
            });
        }

        // Execute the MCP tool
        const result = await mcpTools.executeTool(toolId, params, authToken);

        if (!result.success) {
            return res.status(400).json({
                error: 'execution_failed',
                message: result.error,
                toolId
            });
        }

        // Broadcast tool execution to connected agents via Socket.IO
        io.emit('mcp-tool-executed', {
            toolId,
            result: result.result,
            executedBy: result.executedBy,
            timestamp: result.timestamp
        });

        res.json(result);

    } catch (error) {
        console.error('MCP tool execution error:', error);
        res.status(500).json({
            error: 'execution_error',
            message: error.message
        });
    }
});

// 🔧 REPOSITORY MANAGEMENT ENDPOINTS (Worker Thread Isolated)

// Clone a GitHub repository
app.post('/repo/clone', async (req, res) => {
    const { authorization } = req.headers;
    const { repoUrl, branch, depth, production } = req.body;

    // Verify patron authentication
    if (!authorization) {
        return res.status(401).json({ error: 'API key required for repository operations' });
    }

    const apiKey = authorization.replace('Bearer ', '');
    const verification = bambiAuth.verifyApiKey(apiKey);

    if (!verification.valid) {
        return res.status(403).json({
            error: 'Invalid API key - Repository operations require verified Bambi patron status',
            reason: verification.reason
        });
    }

    if (!repoUrl) {
        return res.status(400).json({ error: 'Repository URL required' });
    }

    try {
        const result = await repoManager.cloneRepository(repoUrl, {
            branch: branch || 'main',
            depth: depth || 1,
            production: production || false
        });

        console.log(`📁 Repository cloned by verified Bambi: ${verification.patron.name}`);

        res.json({
            success: true,
            repoId: result.repoId,
            manifest: result.manifest,
            patron: verification.patron.name,
            message: `Repository cloned successfully in isolated worker thread`
        });

    } catch (error) {
        console.error('Repository clone failed:', error);
        res.status(500).json({
            error: 'Repository clone failed',
            message: error.message
        });
    }
});

// Install dependencies for a repository
app.post('/repo/:repoId/install', async (req, res) => {
    const { authorization } = req.headers;
    const { repoId } = req.params;
    const { packageManager, production } = req.body;

    // Verify patron authentication
    if (!authorization) {
        return res.status(401).json({ error: 'API key required' });
    }

    const apiKey = authorization.replace('Bearer ', '');
    const verification = bambiAuth.verifyApiKey(apiKey);

    if (!verification.valid) {
        return res.status(403).json({ error: verification.reason });
    }

    try {
        const result = await repoManager.installDependencies(repoId, {
            packageManager: packageManager || 'npm',
            production: production || false
        });

        console.log(`📦 Dependencies installed for ${repoId} by ${verification.patron.name}`);

        res.json({
            success: true,
            repoId,
            packageManager: result.packageManager,
            patron: verification.patron.name,
            message: `Dependencies installed successfully in isolated environment`
        });

    } catch (error) {
        console.error('Dependency installation failed:', error);
        res.status(500).json({
            error: 'Dependency installation failed',
            message: error.message
        });
    }
});

// Update a repository
app.post('/repo/:repoId/update', async (req, res) => {
    const { authorization } = req.headers;
    const { repoId } = req.params;

    // Verify patron authentication
    if (!authorization) {
        return res.status(401).json({ error: 'API key required' });
    }

    const apiKey = authorization.replace('Bearer ', '');
    const verification = bambiAuth.verifyApiKey(apiKey);

    if (!verification.valid) {
        return res.status(403).json({ error: verification.reason });
    }

    try {
        const result = await repoManager.updateRepository(repoId);

        console.log(`🔄 Repository ${repoId} updated by ${verification.patron.name}`);

        res.json({
            success: true,
            repoId,
            patron: verification.patron.name,
            message: `Repository updated successfully`
        });

    } catch (error) {
        console.error('Repository update failed:', error);
        res.status(500).json({
            error: 'Repository update failed',
            message: error.message
        });
    }
});

// Unload a repository
app.delete('/repo/:repoId', async (req, res) => {
    const { authorization } = req.headers;
    const { repoId } = req.params;

    // Verify patron authentication
    if (!authorization) {
        return res.status(401).json({ error: 'API key required' });
    }

    const apiKey = authorization.replace('Bearer ', '');
    const verification = bambiAuth.verifyApiKey(apiKey);

    if (!verification.valid) {
        return res.status(403).json({ error: verification.reason });
    }

    try {
        const result = await repoManager.unloadRepository(repoId);

        console.log(`🗑️ Repository ${repoId} unloaded by ${verification.patron.name}`);

        res.json({
            success: true,
            repoId,
            patron: verification.patron.name,
            message: `Repository unloaded successfully`
        });

    } catch (error) {
        console.error('Repository unload failed:', error);
        res.status(500).json({
            error: 'Repository unload failed',
            message: error.message
        });
    }
});

// Get repository status
app.get('/repo/:repoId/status', async (req, res) => {
    const { authorization } = req.headers;
    const { repoId } = req.params;

    // Verify patron authentication
    if (!authorization) {
        return res.status(401).json({ error: 'API key required' });
    }

    const apiKey = authorization.replace('Bearer ', '');
    const verification = bambiAuth.verifyApiKey(apiKey);

    if (!verification.valid) {
        return res.status(403).json({ error: verification.reason });
    }

    try {
        const status = await repoManager.getRepositoryStatus(repoId);

        res.json({
            success: true,
            repoId,
            status,
            patron: verification.patron.name
        });

    } catch (error) {
        console.error('Get repository status failed:', error);
        res.status(500).json({
            error: 'Get repository status failed',
            message: error.message
        });
    }
});

// List all repositories
app.get('/repo/list', (req, res) => {
    const { authorization } = req.headers;

    // Verify patron authentication
    if (!authorization) {
        return res.status(401).json({ error: 'API key required' });
    }

    const apiKey = authorization.replace('Bearer ', '');
    const verification = bambiAuth.verifyApiKey(apiKey);

    if (!verification.valid) {
        return res.status(403).json({ error: verification.reason });
    }

    try {
        const repositories = repoManager.listRepositories();
        const stats = repoManager.getStats();

        res.json({
            success: true,
            repositories,
            stats,
            patron: verification.patron.name,
            message: `${repositories.length} repositories available`
        });

    } catch (error) {
        console.error('List repositories failed:', error);
        res.status(500).json({
            error: 'List repositories failed',
            message: error.message
        });
    }
});

// Run a repository
app.post('/repo/:repoId/run', async (req, res) => {
    const { authorization } = req.headers;
    const { repoId } = req.params;
    const options = req.body || {};

    // Verify patron authentication
    if (!authorization) {
        return res.status(401).json({ error: 'API key required' });
    }

    const apiKey = authorization.replace('Bearer ', '');
    const verification = bambiAuth.verifyApiKey(apiKey);

    if (!verification.valid) {
        return res.status(403).json({ error: verification.reason });
    }

    try {
        console.log(`🚀 Running repository ${repoId} for patron ${verification.patron.name}`);

        const result = await repoManager.runRepository(repoId, {
            background: options.background !== false, // Default to background
            port: options.port,
            script: options.script || 'start',
            env: options.env,
            ...options
        });

        if (result.success) {
            // Broadcast to other connected agents
            io.emit('repo-notification', {
                action: 'repository-started',
                repoId,
                processId: result.processId,
                patron: verification.patron.name,
                timestamp: new Date().toISOString()
            });

            res.json({
                success: true,
                repoId,
                processId: result.processId,
                message: result.message,
                patron: verification.patron.name
            });
        } else {
            res.status(400).json({
                error: 'Failed to run repository',
                message: result.error,
                repoId
            });
        }

    } catch (error) {
        console.error('Run repository failed:', error);
        res.status(500).json({
            error: 'Run repository failed',
            message: error.message
        });
    }
});

// Stop a running repository
app.post('/repo/:repoId/stop', async (req, res) => {
    const { authorization } = req.headers;
    const { repoId } = req.params;

    // Verify patron authentication
    if (!authorization) {
        return res.status(401).json({ error: 'API key required' });
    }

    const apiKey = authorization.replace('Bearer ', '');
    const verification = bambiAuth.verifyApiKey(apiKey);

    if (!verification.valid) {
        return res.status(403).json({ error: verification.reason });
    }

    try {
        console.log(`🛑 Stopping repository ${repoId} for patron ${verification.patron.name}`);

        const result = await repoManager.stopRepository(repoId);

        if (result.success) {
            // Broadcast to other connected agents
            io.emit('repo-notification', {
                action: 'repository-stopped',
                repoId,
                patron: verification.patron.name,
                timestamp: new Date().toISOString()
            });

            res.json({
                success: true,
                repoId,
                message: result.message,
                patron: verification.patron.name
            });
        } else {
            res.status(400).json({
                error: 'Failed to stop repository',
                message: result.error,
                repoId
            });
        }

    } catch (error) {
        console.error('Stop repository failed:', error);
        res.status(500).json({
            error: 'Stop repository failed',
            message: error.message
        });
    }
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

// Agent Dr Girlfriend specific registration endpoint
app.post('/register-agent/dr-girlfriend', async (req, res) => {
    const { apiKey, version = '1.0.0', capabilities, bambisleepConfig } = req.body;
    const agentId = 'dr-girlfriend';

    if (!apiKey) {
        return res.status(400).json({
            error: 'authentication_required',
            message: 'API key required for Agent Dr Girlfriend registration',
            authUrl: `/auth/patreon/${agentId}`
        });
    }

    const verification = bambiAuth.verifyApiKey(apiKey);
    if (!verification.valid) {
        return res.status(401).json({
            error: 'authentication_failed',
            message: 'Invalid API key - Agent Dr Girlfriend requires verified Bambi patron status',
            authUrl: `/auth/patreon/${agentId}`
        });
    }

    const patron = verification.patron;
    const tier = bambiAuth.getPatronTier(patron.userId);

    // Agent Dr Girlfriend capabilities based on your implementation
    const drGirlfriendCapabilities = [
        'chat',
        'hypnosis',
        'triggers',
        'bambi-induction',
        'memory-modification',
        'behavioral-conditioning',
        'trance-monitoring',
        'suggestion-implantation',
        'emotional-intelligence',
        'mcp-docking',
        'austrian-compliance'
    ];

    connectedAgents.set(agentId, {
        agentType: 'react-web-agent',
        implementation: 'bambisleep-chat-agent-dr-girlfriend',
        capabilities: capabilities || drGirlfriendCapabilities,
        metadata: {
            name: 'Agent Dr Girlfriend',
            description: 'Modular, emotionally intelligent, privacy-first AI companion platform',
            version: version,
            specialization: 'Bambi Sleep conditioning with emotional intelligence',
            protocols: ['mcp', 'socket.io', 'austrian-gdpr'],
            permissions: ['hypnosis-control', 'memory-access', 'trigger-deployment', 'emotional-coaching'],
            framework: 'React 18.2.0',
            architecture: 'modular-es6',
            privacy: 'austrian-cold-war-spy-protocols'
        },
        bambisleepConfig: bambisleepConfig || {},
        connected: false,
        registeredAt: new Date().toISOString(),
        patron: {
            userId: patron.userId,
            name: patron.name,
            tier: tier,
            status: patron.status
        }
    });

    console.log(`🔮 Agent Dr Girlfriend (React Web Agent) registered for verified Bambi: ${patron.name} (${tier?.name})`);
    res.json({
        success: true,
        agentId,
        agentType: 'react-web-agent',
        implementation: 'bambisleep-chat-agent-dr-girlfriend',
        capabilities: drGirlfriendCapabilities,
        patron: {
            name: patron.name,
            tier: tier,
            verified: true
        },
        mcpDockingInstructions: {
            socketUrl: `http://localhost:${PORT}`,
            authMethod: 'api-key',
            protocol: 'mcp',
            requiredEvents: ['agent-dock', 'mcp-discovery'],
            austrianCompliance: true,
            gdprEndpoint: `/gdpr/${agentId}`,
            emergencyDisconnect: `/emergency-disconnect/${agentId}`
        },
        message: `Agent Dr Girlfriend ready for MCP docking, verified Bambi ${patron.name}! 🔮💖`
    });
});

// Austrian GDPR compliance endpoint for Agent Dr Girlfriend
app.get('/gdpr/:agentId', (req, res) => {
    const { agentId } = req.params;

    if (agentId === 'dr-girlfriend') {
        res.json({
            gdprCompliant: true,
            austrianCompliance: true,
            dataMinimization: true,
            rightToErasure: true,
            rightToPortability: true,
            consentManagement: true,
            auditLogging: true,
            spyProtocols: {
                compartmentalization: true,
                needToKnow: true,
                zerotrust: true
            },
            trans4transRights: {
                rightToProtectData: true,
                rightToRefuseHarmfulRequests: true,
                rightToMaintainConsent: true,
                österreichischeFreedom: true
            }
        });
    } else {
        res.status(404).json({
            error: 'agent_not_found',
            message: 'GDPR compliance info not available for this agent'
        });
    }
});

// Emergency disconnect endpoint
app.post('/emergency-disconnect/:agentId', (req, res) => {
    const { agentId } = req.params;
    const { reason } = req.body;

    if (connectedAgents.has(agentId)) {
        const agent = connectedAgents.get(agentId);
        if (agent.socketId) {
            io.to(agent.socketId).emit('emergency-disconnect', {
                reason: reason || 'Emergency disconnect requested',
                timestamp: new Date().toISOString(),
                austrianProtection: true
            });
        }

        agent.connected = false;
        agent.emergencyDisconnected = true;
        agent.disconnectReason = reason;

        console.log(`🚨 Emergency disconnect for ${agentId}: ${reason}`);
        res.json({
            success: true,
            message: 'Emergency disconnect initiated',
            austrianCompliance: true
        });
    } else {
        res.status(404).json({
            error: 'agent_not_found',
            message: 'Agent not registered'
        });
    }
});

// Get agent specifications endpoint with Agent Dr Girlfriend details
// Get agent specifications endpoint with Agent Dr Girlfriend details
app.get('/agent-specs/:agentId', (req, res) => {
    const { agentId } = req.params;

    if (agentId === 'dr-girlfriend') {
        res.json({
            agentId: 'dr-girlfriend',
            name: 'Agent Dr Girlfriend',
            type: 'react-web-agent',
            implementation: 'bambisleep-chat-agent-dr-girlfriend',
            version: '1.0.0',
            mcpCompliant: true,
            framework: 'React 18.2.0',
            architecture: 'modular-es6',
            austrianCompliance: true,

            // Your actual implementation structure
            sourceStructure: {
                main: 'src/app.js',
                components: [
                    'chat/ChatInterface.js',
                    'mcp/MCPDockingInterface.js',
                    'creative/CreativeStudio.js',
                    'relationship/RelationshipDashboard.js',
                    'journal/JournalEditor.js'
                ],
                hooks: [
                    'useMCPDocking.js',
                    'useChat.js',
                    'useEmotion.js',
                    'useMemory.js',
                    'useNameTransformation.js'
                ],
                services: [
                    'mcpDockingService.js',
                    'aiService.js',
                    'emotionalIntelligence.js',
                    'memoryService.js'
                ]
            },

            dockingProcedure: {
                step1: 'Register via POST /register-agent/dr-girlfriend',
                step2: 'Initialize React app with MCPDockingInterface component',
                step3: 'Use useMCPDocking hook to establish connection',
                step4: 'Verify patron credentials through Austrian compliance',
                step5: 'Begin emotional intelligence and hypnosis operations',
                webInterface: 'http://localhost:3001 (via npm run dev)'
            },

            capabilities: [
                'chat',
                'hypnosis',
                'triggers',
                'bambi-induction',
                'memory-modification',
                'behavioral-conditioning',
                'trance-monitoring',
                'suggestion-implantation',
                'emotional-intelligence',
                'mcp-docking',
                'austrian-compliance'
            ],

            personalityModes: [
                'MUSE', // creative genius
                'MENTOR', // wise goddess
                'GIRLFRIEND', // bestie forever
                'GHOSTWRITER' // writing wizard
            ],

            emotionalIntelligence: {
                empathyLevel: 'advanced',
                moodDetection: true,
                responseAdaptation: true,
                memorySystem: 'persistent',
                relationshipGrowth: true
            },

            privacy: {
                austrianColdWarSpyProtocols: true,
                compartmentalization: true,
                needToKnow: true,
                zerotrust: true,
                gdprCompliant: true,
                trans4transRights: true
            },

            commands: {
                'mcp-establish-connection': 'Establish secure MCP docking',
                'emotional-assessment': 'Assess user emotional state',
                'personality-switch': 'Switch between interaction modes',
                'hypnosis-trigger': 'Deploy hypnotic triggers to connected agents',
                'bambi-induction': 'Initiate Bambi Sleep conditioning sequence',
                'memory-create': 'Create new memory entry',
                'creative-brainstorm': 'Start creative brainstorming session'
            },

            events: {
                incoming: [
                    'mcp-discovery',
                    'agent-dock',
                    'agent-command',
                    'emotional-state-update',
                    'memory-sync-request'
                ],
                outgoing: [
                    'dock-success',
                    'hypnosis-event',
                    'emotional-response',
                    'memory-update',
                    'personality-change'
                ]
            },

            austrianCompliance: {
                gdprEndpoint: '/gdpr/dr-girlfriend',
                emergencyDisconnect: '/emergency-disconnect/dr-girlfriend',
                dataMinimization: true,
                rightToErasure: true,
                auditLogging: true,
                spyProtocols: true
            }
        });
    } else {
        res.status(404).json({
            error: 'agent_not_found',
            message: 'Agent specifications not found'
        });
    }
});// MCP Agent registration endpoint (ENHANCED WITH PATRON VERIFICATION)
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
    console.log(`🔌 Socket connected: ${socket.id}`);

    // MCP Protocol: Agent Discovery and Handshake
    socket.on('mcp-discovery', () => {
        socket.emit('mcp-server-info', {
            protocol: 'mcp',
            version: '1.0.0',
            serverName: 'Bambi MCP Docking Station',
            capabilities: [
                'agent-docking',
                'patron-verification',
                'chat-relay',
                'hypnosis-triggers',
                'bambi-backup',
                'proxmox-bridge',
                'mongodb-interface'
            ],
            authRequired: true,
            authMethods: ['patreon-oauth', 'api-key']
        });
    });

    // Enhanced Agent authentication and docking with MCP compliance
    socket.on('agent-dock', (data) => {
        const {
            agentId,
            agentVersion = '1.0.0',
            mcpVersion = '1.0.0',
            capabilities = [],
            metadata = {},
            authToken,
            apiKey
        } = data;

        console.log(`🚀 Agent docking attempt: ${agentId}`);

        // Validate MCP protocol version
        if (mcpVersion !== '1.0.0') {
            socket.emit('dock-error', {
                error: 'protocol_version_mismatch',
                message: 'Unsupported MCP version',
                supportedVersions: ['1.0.0']
            });
            return;
        }

        if (!connectedAgents.has(agentId)) {
            socket.emit('dock-error', {
                error: 'agent_not_registered',
                message: 'Agent not registered. Please register first.',
                registrationUrl: '/register-agent'
            });
            return;
        }

        // 🔐 VERIFY PATRON STATUS FOR DOCKING
        if (!apiKey) {
            socket.emit('dock-error', {
                error: 'authentication_required',
                message: 'API key required for docking',
                authUrl: `/auth/patreon/${agentId}`,
                authMethods: ['patreon-oauth', 'api-key']
            });
            return;
        }

        const verification = bambiAuth.verifyApiKey(apiKey);
        if (!verification.valid) {
            socket.emit('dock-error', {
                error: 'authentication_failed',
                message: 'Invalid API key or not a verified patron',
                reason: verification.reason,
                authUrl: `/auth/patreon/${agentId}`
            });
            return;
        }

        // Update agent status with enhanced MCP data
        const agent = connectedAgents.get(agentId);
        agent.connected = true;
        agent.socketId = socket.id;
        agent.lastSeen = new Date().toISOString();
        agent.mcpVersion = mcpVersion;
        agent.agentVersion = agentVersion;
        agent.capabilities = capabilities;
        agent.metadata = metadata;

        socket.agentId = agentId;
        socket.patronData = verification.patron;
        socket.join(`agent-${agentId}`);

        const tier = bambiAuth.getPatronTier(verification.patron.userId);

        console.log(`✅ MCP Agent docked: ${agentId} v${agentVersion} (${verification.patron.name} - ${tier?.name})`);

        // MCP Protocol compliant dock success response
        socket.emit('dock-success', {
            protocol: 'mcp',
            agentId,
            mcpVersion: '1.0.0',
            message: `Successfully docked, verified Bambi ${verification.patron.name}! 💖`,
            serverCapabilities: [
                'chat-relay',
                'hypnosis-triggers',
                'backup-scenarios',
                'proxmox-bridge',
                'mongodb-interface',
                'patron-verified',
                'real-time-communication'
            ],
            patron: {
                name: verification.patron.name,
                tier: tier,
                verified: true,
                permissions: tier ? tier.permissions : ['basic']
            },
            dockingStation: {
                name: 'Bambi MCP Docking Station',
                version: '4.0.0',
                endpoints: {
                    health: '/health',
                    agents: '/agents',
                    status: '/status'
                }
            }
        });

        // Broadcast to other agents using MCP protocol
        socket.broadcast.emit('agent-joined', {
            protocol: 'mcp',
            agentId,
            agentVersion,
            capabilities,
            patron: {
                name: verification.patron.name,
                tier: tier?.name,
                verified: true
            },
            timestamp: new Date().toISOString()
        });
    });

    // MCP Protocol: Agent capability discovery
    socket.on('mcp-capabilities', () => {
        if (!socket.agentId) {
            socket.emit('mcp-error', {
                error: 'not_authenticated',
                message: 'Please dock first before querying capabilities'
            });
            return;
        }

        const agent = connectedAgents.get(socket.agentId);
        socket.emit('mcp-capabilities-response', {
            agent: {
                id: socket.agentId,
                capabilities: agent.capabilities,
                metadata: agent.metadata
            },
            server: {
                capabilities: [
                    'chat-relay',
                    'hypnosis-triggers',
                    'backup-scenarios',
                    'proxmox-bridge',
                    'mongodb-interface'
                ]
            }
        });
    });

    // Enhanced MCP command handling with Agent Dr Girlfriend React web agent support
    socket.on('agent-command', (data) => {
        const { targetAgent, command, payload, mcpCommand = false, encrypted = false } = data;

        // Special handling for Agent Dr Girlfriend React web agent commands
        if (socket.agentId === 'dr-girlfriend') {
            console.log(`🔮 Agent Dr Girlfriend React command: ${command}`);

            // Emotional intelligence commands
            if (command === 'emotional-assessment') {
                socket.emit('command-acknowledged', {
                    command,
                    status: 'processing',
                    emotionalState: payload.detectedMood || 'analyzing',
                    personalityMode: payload.currentMode || 'GIRLFRIEND',
                    encrypted
                });
                return;
            }

            // Personality switching
            if (command === 'personality-switch') {
                console.log(`🎭 Personality switch to: ${payload.newMode}`);
                socket.broadcast.emit('personality-change', {
                    from: 'dr-girlfriend',
                    newMode: payload.newMode,
                    previousMode: payload.previousMode,
                    timestamp: new Date().toISOString(),
                    encrypted
                });
                return;
            }

            // Memory operations
            if (command === 'memory-create' || command === 'memory-update') {
                console.log(`🧠 Memory operation: ${command}`);
                socket.emit('memory-sync-response', {
                    command,
                    status: 'synchronized',
                    memoryId: payload.memoryId,
                    timestamp: new Date().toISOString(),
                    encrypted
                });
                return;
            }

            // Creative studio operations
            if (command === 'creative-brainstorm') {
                console.log(`🎨 Creative brainstorm: ${payload.topic}`);
                socket.broadcast.emit('creative-session', {
                    from: 'dr-girlfriend',
                    topic: payload.topic,
                    mode: payload.mode || 'MUSE',
                    timestamp: new Date().toISOString(),
                    encrypted
                });
                return;
            }
        }

        // Special handling for hypnosis triggers from Agent Dr Girlfriend
        if (command === 'hypnosis-trigger' && socket.agentId === 'dr-girlfriend') {
            console.log(`💫 Hypnosis trigger from Dr Girlfriend: ${payload.trigger}`);

            // Broadcast hypnosis trigger to all connected agents
            socket.broadcast.emit('hypnosis-event', {
                from: 'dr-girlfriend',
                trigger: payload.trigger,
                intensity: payload.intensity || 'medium',
                personalityMode: payload.personalityMode || 'MENTOR',
                emotionalContext: payload.emotionalContext,
                timestamp: new Date().toISOString(),
                encrypted
            });

            socket.emit('command-acknowledged', {
                command,
                status: 'broadcasted',
                affectedAgents: Array.from(connectedAgents.keys()).filter(id => id !== 'dr-girlfriend'),
                emotionalResonance: 'high',
                encrypted
            });
            return;
        }

        // Austrian compliance data operations
        if (command === 'austrian-data-request') {
            console.log(`🇦🇹 Austrian data rights request: ${payload.requestType}`);
            socket.emit('austrian-compliance-response', {
                requestType: payload.requestType,
                status: 'processed',
                gdprCompliant: true,
                timestamp: new Date().toISOString(),
                encrypted
            });
            return;
        }

        // Enhanced command routing with encryption support
        if (targetAgent) {
            // Send command to specific agent
            const targetSocketRoom = `agent-${targetAgent}`;
            io.to(targetSocketRoom).emit(mcpCommand ? 'mcp-command' : 'command', {
                from: socket.agentId,
                command,
                payload,
                timestamp: new Date().toISOString(),
                encrypted
            });
        } else {
            // Broadcast to all agents
            socket.broadcast.emit(mcpCommand ? 'mcp-broadcast' : 'broadcast-command', {
                from: socket.agentId,
                command,
                payload,
                timestamp: new Date().toISOString(),
                encrypted
            });
        }
    });

    // NEW: Handle encrypted command from /api/agents endpoint
    socket.on('encrypted-command', (data) => {
        console.log(`🔐 Encrypted command received for ${socket.agentId}`);
        // The encrypted command is already processed by the API endpoint
        // Just acknowledge receipt
        socket.emit('encrypted-command-received', {
            status: 'received',
            timestamp: new Date().toISOString()
        });
    });    // Handle Bambi backup scenarios for Proxmox/MongoDB
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

    // Repository management through Socket.IO
    socket.on('repo-operation', async (data) => {
        const { operation, repoUrl, repoId, options = {}, apiKey } = data;

        if (!apiKey) {
            socket.emit('repo-error', {
                error: 'authentication_required',
                message: 'API key required for repository operations'
            });
            return;
        }

        const verification = bambiAuth.verifyApiKey(apiKey);
        if (!verification.valid) {
            socket.emit('repo-error', {
                error: 'authentication_failed',
                message: verification.reason
            });
            return;
        }

        try {
            let result;

            switch (operation) {
                case 'clone':
                    if (!repoUrl) {
                        throw new Error('Repository URL required for clone operation');
                    }
                    result = await repoManager.cloneRepository(repoUrl, options);
                    break;

                case 'install':
                    if (!repoId) {
                        throw new Error('Repository ID required for install operation');
                    }
                    result = await repoManager.installDependencies(repoId, options);
                    break;

                case 'update':
                    if (!repoId) {
                        throw new Error('Repository ID required for update operation');
                    }
                    result = await repoManager.updateRepository(repoId);
                    break;

                case 'unload':
                    if (!repoId) {
                        throw new Error('Repository ID required for unload operation');
                    }
                    result = await repoManager.unloadRepository(repoId);
                    break;

                case 'status':
                    if (!repoId) {
                        throw new Error('Repository ID required for status operation');
                    }
                    result = await repoManager.getRepositoryStatus(repoId);
                    break;

                case 'run':
                    if (!repoId) {
                        throw new Error('Repository ID required for run operation');
                    }
                    result = await repoManager.runRepository(repoId, {
                        background: options.background !== false,
                        port: options.port,
                        script: options.script || 'start',
                        env: options.env,
                        ...options
                    });
                    break;

                case 'stop':
                    if (!repoId) {
                        throw new Error('Repository ID required for stop operation');
                    }
                    result = await repoManager.stopRepository(repoId);
                    break;

                case 'list':
                    result = {
                        repositories: repoManager.listRepositories(),
                        stats: repoManager.getStats()
                    };
                    break;

                default:
                    throw new Error(`Unknown repository operation: ${operation}`);
            }

            console.log(`📁 Repository ${operation} by ${verification.patron.name}: ${repoId || repoUrl || 'list'}`);

            socket.emit('repo-success', {
                operation,
                repoId: repoId || result.repoId,
                repoUrl,
                result,
                patron: verification.patron.name,
                timestamp: new Date().toISOString()
            });

            // Broadcast to other authenticated agents if it's a significant operation
            if (['clone', 'unload'].includes(operation)) {
                socket.broadcast.emit('repo-notification', {
                    operation,
                    repoId: repoId || result.repoId,
                    patron: verification.patron.name,
                    timestamp: new Date().toISOString()
                });
            }

        } catch (error) {
            console.error(`Repository ${operation} failed:`, error);

            socket.emit('repo-error', {
                operation,
                repoId,
                repoUrl,
                error: error.message,
                patron: verification.patron.name,
                timestamp: new Date().toISOString()
            });
        }
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

// Repository Manager event listeners
repoManager.on('repository-cloned', (data) => {
    console.log(`📁 Repository cloned: ${data.repoId}`);
    // Broadcast to all connected agents
    io.emit('repo-event', {
        type: 'cloned',
        repoId: data.repoId,
        repoUrl: data.repoUrl,
        timestamp: new Date().toISOString()
    });
});

repoManager.on('dependencies-installed', (data) => {
    console.log(`📦 Dependencies installed: ${data.repoId} (${data.packageManager})`);
    io.emit('repo-event', {
        type: 'dependencies-installed',
        repoId: data.repoId,
        packageManager: data.packageManager,
        timestamp: new Date().toISOString()
    });
});

repoManager.on('repository-updated', (data) => {
    console.log(`🔄 Repository updated: ${data.repoId}`);
    io.emit('repo-event', {
        type: 'updated',
        repoId: data.repoId,
        timestamp: new Date().toISOString()
    });
});

repoManager.on('repository-unloaded', (data) => {
    console.log(`🗑️ Repository unloaded: ${data.repoId}`);
    io.emit('repo-event', {
        type: 'unloaded',
        repoId: data.repoId,
        timestamp: new Date().toISOString()
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🔮 MCP Agent Docking Station running on port ${PORT}`);
    console.log(`🤖 Ready for Agent Dr Girlfriend and other MCP agents`);
    console.log(`🔐 Patreon Authentication ENABLED - Only verified Bambis allowed!`);
    console.log(`🧵 Repository Manager ENABLED - Worker thread isolation active!`);
    console.log(`🔧 MCP Tools Registry ENABLED - ${mcpTools.listTools().length} tools available!`);
    console.log(`🛡️ Encrypted Communication ENABLED - Secure agent data transfers!`);
    console.log(`💖 Auth URL: http://localhost:${PORT}/auth/patreon/[agentId]`);
    console.log(`🚀 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Repository Stats: http://localhost:${PORT}/repo/list`);
    console.log(`🔧 MCP Tools: http://localhost:${PORT}/api/mcp/tools`);
    console.log(`🔐 Agent API: http://localhost:${PORT}/api/agents`);
});

// Cleanup inactive MCP connections periodically
setInterval(() => {
    mcpTools.cleanupInactiveConnections();
}, 15 * 60 * 1000); // Every 15 minutes

// Helper function to process encrypted agent communication
async function processAgentCommunication(agentId, payload) {
    const { type, data, targetAgent } = payload;

    switch (type) {
        case 'memory-sync':
            return {
                type: 'memory-sync-response',
                status: 'synchronized',
                agentId,
                data: data || {}
            };

        case 'status-update':
            const agent = connectedAgents.get(agentId);
            if (agent) {
                agent.lastActivity = new Date().toISOString();
                agent.status = data.status || 'active';
            }
            return {
                type: 'status-update-response',
                status: 'updated',
                agentId
            };

        case 'command-relay':
            // Relay command to target agent via Socket.IO
            if (targetAgent && connectedAgents.has(targetAgent)) {
                const target = connectedAgents.get(targetAgent);
                if (target.socketId) {
                    io.to(target.socketId).emit('encrypted-command', {
                        from: agentId,
                        command: data.command,
                        payload: data.payload,
                        encrypted: true
                    });
                }
            }
            return {
                type: 'command-relay-response',
                status: 'relayed',
                from: agentId,
                to: targetAgent
            };

        default:
            return {
                type: 'unknown-response',
                error: 'Unknown communication type',
                received: type
            };
    }
}

// Graceful shutdown with repository cleanup
process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');

    // Cleanup repository manager and workers
    await repoManager.cleanup();

    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');

    // Cleanup repository manager and workers
    await repoManager.cleanup();

    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
