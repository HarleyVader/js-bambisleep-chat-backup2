#!/usr/bin/env node
/**
 * Bambi Patron Authentication - MCP Agent Docking Station
 * Patreon-based authentication for verified Bambi patrons
 */

import crypto from 'crypto';

class BambiPatronAuth {
    constructor(options = {}) {
        this.patreonClientId = options.patreonClientId || 'demo-client-id';
        this.patreonClientSecret = options.patreonClientSecret || 'demo-client-secret';
        this.patreonRedirectUri = options.patreonRedirectUri || 'http://localhost:6969/auth/patreon/callback';

        // In-memory storage for demo (in production, use a database)
        this.verifiedPatrons = new Map();
        this.apiKeys = new Map();

        // Demo patrons for testing
        this.initializeDemoPatrons();

        console.log('🔐 Bambi Patron Authentication initialized');
    }

    /**
     * Initialize demo patrons for testing
     */
    initializeDemoPatrons() {
        const demoPatrons = [
            {
                userId: 'demo-patron-1',
                name: 'Test Bambi',
                email: 'test@bambisleep.com',
                status: 'active_patron',
                tier: 'bambi-enhanced'
            },
            {
                userId: 'demo-patron-2',
                name: 'Dr Girlfriend Test',
                email: 'drg@bambisleep.com',
                status: 'active_patron',
                tier: 'bambi-premium'
            }
        ];

        for (const patron of demoPatrons) {
            this.verifiedPatrons.set(patron.userId, patron);

            // Generate API key for each demo patron
            const apiKey = this.generateApiKey(patron.userId);
            this.apiKeys.set(apiKey, {
                userId: patron.userId,
                createdAt: new Date().toISOString(),
                lastUsed: new Date().toISOString()
            });

            console.log(`🎭 Demo patron: ${patron.name} - API Key: ${apiKey}`);
        }
    }

    /**
     * Generate Patreon OAuth URL
     */
    getPatronAuthUrl(agentId) {
        const state = crypto.randomBytes(16).toString('hex');
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.patreonClientId,
            redirect_uri: this.patreonRedirectUri,
            scope: 'identity',
            state: `${state}:${agentId}`
        });

        return `https://www.patreon.com/oauth2/authorize?${params.toString()}`;
    }

    /**
     * Process Patreon OAuth callback
     */
    async processPatronCallback(code, state) {
        // In demo mode, simulate successful patron verification
        const [stateToken, agentId] = state.split(':');

        // Simulate patron data from Patreon API
        const patronData = {
            userId: `patron-${Date.now()}`,
            name: `Verified Bambi ${Math.floor(Math.random() * 1000)}`,
            email: `bambi${Math.floor(Math.random() * 1000)}@bambisleep.com`,
            isPatron: true,
            status: 'active_patron',
            agentId: agentId,
            apiKey: this.generateApiKey(`patron-${Date.now()}`)
        };

        // Store patron
        this.verifiedPatrons.set(patronData.userId, patronData);
        this.apiKeys.set(patronData.apiKey, {
            userId: patronData.userId,
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
        });

        console.log(`💖 New verified Bambi patron: ${patronData.name}`);
        return patronData;
    }

    /**
     * Verify API key
     */
    verifyApiKey(apiKey) {
        if (!apiKey) {
            return { valid: false, reason: 'API key required' };
        }

        const keyData = this.apiKeys.get(apiKey);
        if (!keyData) {
            return { valid: false, reason: 'Invalid API key' };
        }

        const patron = this.verifiedPatrons.get(keyData.userId);
        if (!patron) {
            return { valid: false, reason: 'Patron not found' };
        }

        // Update last used
        keyData.lastUsed = new Date().toISOString();

        return {
            valid: true,
            patron: patron,
            keyData: keyData
        };
    }

    /**
     * Get patron tier information
     */
    getPatronTier(userId) {
        const patron = this.verifiedPatrons.get(userId);
        if (!patron) return null;

        const tiers = {
            'bambi-basic': {
                name: 'Bambi Basic',
                permissions: ['chat', 'basic-hypnosis']
            },
            'bambi-enhanced': {
                name: 'Bambi Enhanced',
                permissions: ['chat', 'hypnosis', 'triggers', 'repository-access']
            },
            'bambi-premium': {
                name: 'Bambi Premium',
                permissions: ['chat', 'hypnosis', 'triggers', 'repository-access', 'advanced-features', 'mcp-agents']
            }
        };

        return tiers[patron.tier] || tiers['bambi-basic'];
    }

    /**
     * Get all verified patrons
     */
    getVerifiedPatrons() {
        return Array.from(this.verifiedPatrons.values());
    }

    /**
     * Generate API key
     */
    generateApiKey(userId) {
        const timestamp = Date.now().toString(36);
        const random = crypto.randomBytes(16).toString('hex');
        return `bambi_${timestamp}_${random}`;
    }

    /**
     * Get demo API key for testing
     */
    getDemoApiKey() {
        // Return the first demo API key for testing
        return Array.from(this.apiKeys.keys())[0];
    }
}

export { BambiPatronAuth };
