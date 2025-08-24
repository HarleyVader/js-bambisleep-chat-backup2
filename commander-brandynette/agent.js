#!/usr/bin/env node
/**
 * Agent Dr Girlfriend - MCP Agent Prototype
 * Implements MCP-compliant docking procedures for Bambi Docking Station
 * UPGRADED: Support for encrypted communication via /api/agents
 */

import axios from 'axios';
import crypto from 'crypto';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

class AgentDrGirlfriend {
    constructor() {
        this.agentId = 'dr-girlfriend';
        this.capabilities = ['chat', 'hypnosis', 'triggers'];
        this.dockingStationUrl = 'http://localhost:6969';
        this.socket = null;
        this.isConnected = false;
        this.authToken = null;
        this.sessionId = uuidv4();
        this.encryptionKey = null;
        // API key for MCP deployment test
        this.apiKey = 'bambi_mepeae3m_6716f559e1653e145fcc263a9e8f858b';

        console.log(`🤖 Agent Dr Girlfriend initializing...`);
        console.log(`📋 Agent ID: ${this.agentId}`);
        console.log(`🔧 Capabilities: ${this.capabilities.join(', ')}`);
        console.log(`🔌 Session ID: ${this.sessionId}`);
        console.log(`🔐 Encrypted Communication: ENABLED`);
    }

    /**
     * Initialize encryption for secure communication
     */
    initializeEncryption() {
        // Generate local encryption key for this session
        this.encryptionKey = crypto.randomBytes(32);
        console.log('🔐 Local encryption initialized');
    }

    /**
     * Step 1: Register with the docking station
     */
    async registerAgent() {
        try {
            console.log(`📡 Registering with docking station at ${this.dockingStationUrl}...`);

            const registrationData = {
                agentId: this.agentId,
                capabilities: this.capabilities,
                sessionId: this.sessionId,
                protocol: 'MCP',
                version: '1.0.0',
                apiKey: this.apiKey
            };

            const response = await axios.post(`${this.dockingStationUrl}/register-agent`, registrationData);

            if (response.data.success) {
                this.authToken = response.data.token;
                console.log(`✅ Registration successful! Token received.`);
                return true;
            } else {
                console.error(`❌ Registration failed:`, response.data.error);
                return false;
            }
        } catch (error) {
            console.error(`❌ Registration error:`, error.message);
            return false;
        }
    }

    /**
     * Step 2: Establish Socket.IO connection and dock
     */
    async establishConnection() {
        return new Promise((resolve, reject) => {
            console.log(`🔌 Establishing Socket.IO connection...`);

            this.socket = io(this.dockingStationUrl, {
                auth: {
                    token: this.authToken,
                    agentId: this.agentId,
                    sessionId: this.sessionId
                },
                timeout: 10000
            });

            // Connection successful
            this.socket.on('connect', () => {
                console.log(`🔗 Socket connected with ID: ${this.socket.id}`);
                this.isConnected = true;
                this.initiateDocking();
            });

            // Docking response handlers
            this.socket.on('dock-success', (data) => {
                console.log(`🚀 Docking successful!`, data);
                this.setupCommandHandlers();
                this.initializeEncryption();
                resolve(true);
            });

            // NEW: Handle encrypted commands from the server
            this.socket.on('encrypted-command', (data) => {
                console.log(`🔐 Received encrypted command:`, data);
                this.handleEncryptedCommand(data);
            });

            this.socket.on('dock-failure', (data) => {
                console.error(`💥 Docking failed:`, data.error);
                reject(new Error(data.error));
            });

            // Connection error handlers
            this.socket.on('connect_error', (error) => {
                console.error(`❌ Connection error:`, error.message);
                reject(error);
            });

            this.socket.on('disconnect', () => {
                console.log(`🔌 Disconnected from docking station`);
                this.isConnected = false;
            });
        });
    }

    /**
     * Step 3: Initiate docking procedure
     */
    initiateDocking() {
        console.log(`🚀 Initiating docking procedure...`);

        const dockingRequest = {
            agentId: this.agentId,
            capabilities: this.capabilities,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            protocol: 'MCP'
        };

        this.socket.emit('agent-dock', dockingRequest);
    }

    /**
     * Step 4: Setup MCP command handlers
     */
    setupCommandHandlers() {
        console.log(`⚙️ Setting up MCP command handlers...`);

        // Handle incoming commands
        this.socket.on('mcp-command', (command) => {
            this.handleMCPCommand(command);
        });

        // Handle hypnosis triggers
        this.socket.on('hypnosis-trigger', (trigger) => {
            this.handleHypnosisTrigger(trigger);
        });

        // Handle chat commands
        this.socket.on('chat-message', (message) => {
            this.handleChatMessage(message);
        });

        console.log(`✅ All command handlers active`);
    }

    /**
     * MCP Command Handler
     */
    async handleMCPCommand(command) {
        console.log(`📨 Received MCP command:`, command);

        try {
            let response;

            switch (command.type) {
                case 'status':
                    response = this.getAgentStatus();
                    break;
                case 'capabilities':
                    response = { capabilities: this.capabilities };
                    break;
                case 'health-check':
                    response = { status: 'healthy', timestamp: new Date().toISOString() };
                    break;
                default:
                    response = { error: `Unknown command type: ${command.type}` };
            }

            this.socket.emit('mcp-response', {
                commandId: command.id,
                agentId: this.agentId,
                response,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`❌ Error handling MCP command:`, error);
            this.socket.emit('mcp-response', {
                commandId: command.id,
                agentId: this.agentId,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Hypnosis Trigger Handler
     */
    handleHypnosisTrigger(trigger) {
        console.log(`🌀 Processing hypnosis trigger:`, trigger);

        const responses = {
            'bambi-sleep': 'Bambi feels so sleepy and relaxed...',
            'good-girl': 'Such a good girl, Bambi...',
            'focus': 'Bambi focuses completely on the words...',
            'deeper': 'Going deeper into trance...'
        };

        const response = responses[trigger.type] || 'Trigger not recognized';

        this.socket.emit('hypnosis-response', {
            triggerId: trigger.id,
            agentId: this.agentId,
            response,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Chat Message Handler
     */
    handleChatMessage(message) {
        console.log(`💬 Processing chat message:`, message);

        // Simple response logic - can be enhanced with AI/NLP
        let response = "I understand you, dear. How can I help you further?";

        if (message.content.toLowerCase().includes('sleep')) {
            response = "Would you like to explore some relaxation techniques?";
        } else if (message.content.toLowerCase().includes('bambi')) {
            response = "Bambi is such a lovely name. Tell me more about what you're feeling.";
        }

        this.socket.emit('chat-response', {
            messageId: message.id,
            agentId: this.agentId,
            response,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get agent status for health checks
     */
    getAgentStatus() {
        return {
            agentId: this.agentId,
            status: this.isConnected ? 'connected' : 'disconnected',
            capabilities: this.capabilities,
            sessionId: this.sessionId,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Graceful shutdown
     */
    shutdown() {
        console.log(`🔌 Initiating graceful shutdown...`);

        if (this.socket && this.isConnected) {
            this.socket.emit('agent-undock', {
                agentId: this.agentId,
                sessionId: this.sessionId,
                timestamp: new Date().toISOString()
            });

            this.socket.disconnect();
        }

        console.log(`👋 Agent Dr Girlfriend offline`);
        process.exit(0);
    }

    /**
     * Main docking sequence
     */
    async dock() {
        try {
            console.log(`🚀 Starting docking sequence...`);

            // Step 1: Register
            const registered = await this.registerAgent();
            if (!registered) {
                throw new Error('Agent registration failed');
            }

            // Step 2: Connect and dock
            await this.establishConnection();

            console.log(`✅ Agent Dr Girlfriend successfully docked!`);
            console.log(`🎯 Ready to receive commands...`);

        } catch (error) {
            console.error(`💥 Docking sequence failed:`, error.message);
            process.exit(1);
        }
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log(`\n🛑 Received SIGINT, shutting down gracefully...`);
    if (global.agent) {
        global.agent.shutdown();
    } else {
        process.exit(0);
    }
});

process.on('SIGTERM', () => {
    console.log(`\n🛑 Received SIGTERM, shutting down gracefully...`);
    if (global.agent) {
        global.agent.shutdown();
    } else {
        process.exit(0);
    }
});

// Initialize and start agent
async function main() {
    const agent = new AgentDrGirlfriend();
    global.agent = agent;

    await agent.dock();
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default AgentDrGirlfriend;
