#!/usr/bin/env node
/**
 * MCP Server Tools Registry
 * Manages MCP tools and authentication for /api/mcp/ endpoints
 */

import MCPCrypto from '../src/crypto-utils.js';
import crypto from 'crypto';

class MCPToolsRegistry {
    constructor() {
        this.crypto = new MCPCrypto();
        this.tools = new Map();
        this.activeConnections = new Map();

        // Initialize core MCP tools
        this.initializeCoreTools();
    }

    /**
     * Initialize core MCP tools
     */
    initializeCoreTools() {
        // Agent communication tools
        this.registerTool('agent-command', {
            name: 'Agent Command',
            description: 'Send commands to connected agents',
            schema: {
                type: 'object',
                properties: {
                    targetAgent: { type: 'string' },
                    command: { type: 'string' },
                    payload: { type: 'object' }
                },
                required: ['command']
            },
            handler: this.handleAgentCommand.bind(this)
        });

        // Memory management tools
        this.registerTool('memory-sync', {
            name: 'Memory Synchronization',
            description: 'Synchronize agent memory across sessions',
            schema: {
                type: 'object',
                properties: {
                    agentId: { type: 'string' },
                    memoryData: { type: 'object' },
                    operation: { type: 'string', enum: ['create', 'update', 'delete'] }
                },
                required: ['agentId', 'operation']
            },
            handler: this.handleMemorySync.bind(this)
        });

        // Hypnosis tools
        this.registerTool('hypnosis-trigger', {
            name: 'Hypnosis Trigger Deployment',
            description: 'Deploy hypnotic triggers to connected agents',
            schema: {
                type: 'object',
                properties: {
                    trigger: { type: 'string' },
                    intensity: { type: 'string', enum: ['light', 'medium', 'deep'] },
                    targetAgents: { type: 'array', items: { type: 'string' } }
                },
                required: ['trigger']
            },
            handler: this.handleHypnosisTrigger.bind(this)
        });

        // Repository management tools
        this.registerTool('repo-deploy', {
            name: 'Repository Deployment',
            description: 'Deploy and manage agent repositories',
            schema: {
                type: 'object',
                properties: {
                    repoUrl: { type: 'string' },
                    branch: { type: 'string' },
                    agentId: { type: 'string' }
                },
                required: ['repoUrl', 'agentId']
            },
            handler: this.handleRepoDeployment.bind(this)
        });

        console.log(`🔧 MCP Tools Registry initialized with ${this.tools.size} core tools`);
    }

    /**
     * Register a new MCP tool
     */
    registerTool(toolId, toolConfig) {
        this.tools.set(toolId, {
            ...toolConfig,
            id: toolId,
            registeredAt: new Date().toISOString()
        });

        console.log(`📋 MCP Tool registered: ${toolId}`);
    }

    /**
     * Get tool by ID
     */
    getTool(toolId) {
        return this.tools.get(toolId);
    }

    /**
     * List all available tools
     */
    listTools() {
        return Array.from(this.tools.values()).map(tool => ({
            id: tool.id,
            name: tool.name,
            description: tool.description,
            schema: tool.schema
        }));
    }

    /**
     * Authenticate agent for tool access
     */
    async authenticateAgent(toolId, encryptedAgentId) {
        try {
            const agentData = this.crypto.decryptSocketId(encryptedAgentId);

            if (!agentData.socketId || !agentData.agentId) {
                throw new Error('Invalid agent credentials');
            }

            // Store active connection
            this.activeConnections.set(agentData.socketId, {
                agentId: agentData.agentId,
                toolId,
                authenticatedAt: Date.now(),
                lastActivity: Date.now()
            });

            return {
                success: true,
                agentId: agentData.agentId,
                socketId: agentData.socketId,
                toolAccess: this.tools.has(toolId)
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Execute MCP tool
     */
    async executeTool(toolId, params, agentAuth) {
        try {
            const tool = this.tools.get(toolId);
            if (!tool) {
                throw new Error(`Tool not found: ${toolId}`);
            }

            // Validate authentication
            const auth = await this.authenticateAgent(toolId, agentAuth);
            if (!auth.success) {
                throw new Error(`Authentication failed: ${auth.error}`);
            }

            // Execute tool handler
            const result = await tool.handler(params, auth);

            // Update activity
            const connection = this.activeConnections.get(auth.socketId);
            if (connection) {
                connection.lastActivity = Date.now();
            }

            return {
                success: true,
                toolId,
                result,
                executedBy: auth.agentId,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                toolId,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Handle agent command tool
     */
    async handleAgentCommand(params, auth) {
        const { targetAgent, command, payload } = params;

        return {
            action: 'agent-command-dispatched',
            from: auth.agentId,
            to: targetAgent || 'broadcast',
            command,
            payload: payload || {}
        };
    }

    /**
     * Handle memory synchronization tool
     */
    async handleMemorySync(params, auth) {
        const { agentId, memoryData, operation } = params;

        return {
            action: 'memory-synchronized',
            agentId,
            operation,
            memoryData: operation === 'delete' ? null : memoryData,
            synchronizedBy: auth.agentId
        };
    }

    /**
     * Handle hypnosis trigger tool
     */
    async handleHypnosisTrigger(params, auth) {
        const { trigger, intensity = 'medium', targetAgents } = params;

        return {
            action: 'hypnosis-trigger-deployed',
            trigger,
            intensity,
            targetAgents: targetAgents || ['all'],
            deployedBy: auth.agentId,
            triggerEffect: 'activation-pending'
        };
    }

    /**
     * Handle repository deployment tool
     */
    async handleRepoDeployment(params, auth) {
        const { repoUrl, branch = 'main', agentId } = params;

        return {
            action: 'repository-deployment-initiated',
            repoUrl,
            branch,
            targetAgent: agentId,
            deployedBy: auth.agentId,
            status: 'deployment-queued'
        };
    }

    /**
     * Get active connections
     */
    getActiveConnections() {
        return Array.from(this.activeConnections.entries()).map(([socketId, data]) => ({
            socketId,
            ...data
        }));
    }

    /**
     * Cleanup inactive connections
     */
    cleanupInactiveConnections() {
        const maxInactivity = 30 * 60 * 1000; // 30 minutes
        const now = Date.now();

        for (const [socketId, connection] of this.activeConnections.entries()) {
            if (now - connection.lastActivity > maxInactivity) {
                this.activeConnections.delete(socketId);
                console.log(`🧹 Cleaned up inactive MCP connection: ${socketId}`);
            }
        }
    }
}

export default MCPToolsRegistry;
