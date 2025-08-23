/**
 * Bambi Patron Authentication Service
 * Manages patron verification and API key generation for MCP agents
 */

import crypto from 'crypto';
import { PatreonOAuth } from './patreon-oauth.js';
import { PatreonAPIClient } from './patreon-api.js';

export class BambiPatronAuth {
    constructor(config) {
        this.oauth = new PatreonOAuth({
            clientId: config.patreonClientId,
            clientSecret: config.patreonClientSecret,
            redirectUri: config.patreonRedirectUri
        });

        // In-memory storage for verified patrons (would be database in production)
        this.verifiedPatrons = new Map();
        this.apiKeys = new Map();
        this.sessions = new Map();
    }

    /**
     * Generate authorization URL for patron verification
     */
    getPatronAuthUrl(agentId) {
        const state = this.generateState(agentId);
        return this.oauth.getAuthorizationUrl(['identity', 'campaigns'], state);
    }

    /**
     * Process OAuth callback and verify patron status
     */
    async processPatronCallback(code, state) {
        try {
            // Verify state parameter
            const agentId = this.verifyState(state);
            if (!agentId) {
                throw new Error('Invalid state parameter');
            }

            // Exchange code for tokens
            const tokens = await this.oauth.getTokens(code);

            // Create API client with access token
            const apiClient = new PatreonAPIClient({
                accessToken: tokens.access_token,
                userAgent: 'BambiMCP/1.0.0'
            });

            // Get user info and verify patron status
            const [user, patronStatus] = await Promise.all([
                apiClient.getCurrentUser(),
                apiClient.verifyPatronStatus()
            ]);

            const patronData = {
                userId: user.data.id,
                email: user.data.attributes.email,
                name: user.data.attributes.full_name || user.data.attributes.first_name,
                vanity: user.data.attributes.vanity,
                isPatron: patronStatus.isPatron,
                tier: patronStatus.tier,
                status: patronStatus.status,
                membershipId: patronStatus.membershipId,
                verifiedAt: new Date().toISOString(),
                agentId: agentId,
                tokens: {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
                }
            };

            // Store verified patron
            this.verifiedPatrons.set(user.data.id, patronData);

            // Generate API key for verified patrons
            if (patronStatus.isPatron) {
                const apiKey = this.generateApiKey(user.data.id, patronStatus.tier);
                this.apiKeys.set(apiKey, {
                    userId: user.data.id,
                    tier: patronStatus.tier,
                    agentId: agentId,
                    createdAt: new Date().toISOString()
                });
                patronData.apiKey = apiKey;
            }

            return patronData;

        } catch (error) {
            console.error('Patron verification failed:', error);
            throw error;
        }
    }

    /**
     * Verify API key and return patron status
     */
    verifyApiKey(apiKey) {
        const keyData = this.apiKeys.get(apiKey);
        if (!keyData) {
            return { valid: false, reason: 'Invalid API key' };
        }

        const patron = this.verifiedPatrons.get(keyData.userId);
        if (!patron) {
            return { valid: false, reason: 'Patron not found' };
        }

        if (!patron.isPatron) {
            return { valid: false, reason: 'Not an active patron' };
        }

        return {
            valid: true,
            patron: {
                userId: patron.userId,
                name: patron.name,
                tier: patron.tier,
                agentId: patron.agentId,
                status: patron.status
            }
        };
    }

    /**
     * Check if user is verified patron by user ID
     */
    isVerifiedPatron(userId) {
        const patron = this.verifiedPatrons.get(userId);
        return patron && patron.isPatron;
    }

    /**
     * Get patron tier information
     */
    getPatronTier(userId) {
        const patron = this.verifiedPatrons.get(userId);
        if (!patron || !patron.isPatron) {
            return null;
        }

        // Define tier levels (in cents)
        const tiers = {
            100: 'Bambi Supporter',      // $1+
            500: 'Good Girl',            // $5+
            1000: 'Devoted Bambi',       // $10+
            2500: 'Premium Doll',        // $25+
            5000: 'Elite Bambi'          // $50+
        };

        const tierAmount = patron.tier || 0;
        let tierName = 'Patron';

        for (const [amount, name] of Object.entries(tiers)) {
            if (tierAmount >= parseInt(amount)) {
                tierName = name;
            }
        }

        return {
            amount: tierAmount,
            name: tierName,
            cents: tierAmount
        };
    }

    /**
     * Generate secure state parameter
     */
    generateState(agentId) {
        const state = crypto.randomBytes(16).toString('hex');
        this.sessions.set(state, { agentId, createdAt: Date.now() });
        return state;
    }

    /**
     * Verify state parameter and return agent ID
     */
    verifyState(state) {
        const session = this.sessions.get(state);
        if (!session) {
            return null;
        }

        // Check if state is not too old (5 minutes)
        if (Date.now() - session.createdAt > 5 * 60 * 1000) {
            this.sessions.delete(state);
            return null;
        }

        this.sessions.delete(state);
        return session.agentId;
    }

    /**
     * Generate API key for verified patron
     */
    generateApiKey(userId, tier) {
        const prefix = 'bambi';
        const tierCode = Math.floor(tier / 100) || 1;
        const random = crypto.randomBytes(16).toString('hex');
        return `${prefix}_${tierCode}_${random}`;
    }

    /**
     * Get all verified patrons (for admin purposes)
     */
    getVerifiedPatrons() {
        return Array.from(this.verifiedPatrons.values()).map(patron => ({
            userId: patron.userId,
            name: patron.name,
            tier: patron.tier,
            status: patron.status,
            verifiedAt: patron.verifiedAt,
            agentId: patron.agentId
        }));
    }
}
