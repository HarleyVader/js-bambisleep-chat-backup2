#!/usr/bin/env node
/**
 * Encryption utilities for MCP Agent Communication
 * Provides secure encrypted data transfers for /api/agents and /api/mcp/ endpoints
 */

import crypto from 'crypto';

class MCPCrypto {
    constructor() {
        // Use AES-256-GCM for encryption
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32; // 256 bits
        this.ivLength = 16;  // 128 bits
        this.tagLength = 16; // 128 bits

        // Generate master key (in production, use proper key management)
        this.masterKey = process.env.MCP_ENCRYPTION_KEY || this.generateKey();

        console.log('🔐 MCPCrypto initialized with AES-256-GCM encryption');
    }

    /**
     * Generate a random encryption key
     */
    generateKey() {
        return crypto.randomBytes(this.keyLength);
    }

    /**
     * Encrypt data for secure transmission
     */
    encrypt(data) {
        try {
            const iv = crypto.randomBytes(this.ivLength);
            const cipher = crypto.createCipher(this.algorithm, this.masterKey);
            cipher.setAAD(Buffer.from('mcp-agent-docking-station'));

            let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
            encrypted += cipher.final('hex');

            const tag = cipher.getAuthTag();

            return {
                encrypted,
                iv: iv.toString('hex'),
                tag: tag.toString('hex'),
                algorithm: this.algorithm
            };
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * Decrypt data received from agents
     */
    decrypt(encryptedData) {
        try {
            const { encrypted, iv, tag, algorithm } = encryptedData;

            if (algorithm !== this.algorithm) {
                throw new Error('Unsupported encryption algorithm');
            }

            const decipher = crypto.createDecipher(this.algorithm, this.masterKey);
            decipher.setAAD(Buffer.from('mcp-agent-docking-station'));
            decipher.setAuthTag(Buffer.from(tag, 'hex'));

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    /**
     * Encrypt socket ID for secure agent authentication
     */
    encryptSocketId(socketId, agentId) {
        const data = {
            socketId,
            agentId,
            timestamp: Date.now(),
            nonce: crypto.randomBytes(16).toString('hex')
        };

        return this.encrypt(data);
    }

    /**
     * Decrypt socket ID authentication token
     */
    decryptSocketId(encryptedToken) {
        return this.decrypt(encryptedToken);
    }

    /**
     * Generate authentication hash for API keys
     */
    generateAuthHash(apiKey, salt) {
        const hash = crypto.createHash('sha256');
        hash.update(apiKey + salt);
        return hash.digest('hex');
    }

    /**
     * Verify authentication hash
     */
    verifyAuthHash(apiKey, salt, expectedHash) {
        const computedHash = this.generateAuthHash(apiKey, salt);
        return crypto.timingSafeEqual(
            Buffer.from(computedHash, 'hex'),
            Buffer.from(expectedHash, 'hex')
        );
    }

    /**
     * Generate secure session token
     */
    generateSessionToken(agentId) {
        const data = {
            agentId,
            timestamp: Date.now(),
            random: crypto.randomBytes(32).toString('hex')
        };

        return this.encrypt(data);
    }

    /**
     * Validate session token
     */
    validateSessionToken(encryptedToken, maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
        try {
            const data = this.decrypt(encryptedToken);
            const age = Date.now() - data.timestamp;

            if (age > maxAge) {
                throw new Error('Session token expired');
            }

            return {
                valid: true,
                agentId: data.agentId,
                timestamp: data.timestamp,
                age
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    /**
     * Create encrypted communication channel between agents
     */
    createSecureChannel(agentA, agentB) {
        const channelKey = this.generateKey();
        const channelId = crypto.randomBytes(16).toString('hex');

        return {
            channelId,
            agentA,
            agentB,
            key: channelKey.toString('hex'),
            created: new Date().toISOString()
        };
    }

    /**
     * Encrypt message for secure channel
     */
    encryptChannelMessage(message, channelKey) {
        const key = Buffer.from(channelKey, 'hex');
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipher(this.algorithm, key);

        let encrypted = cipher.update(JSON.stringify(message), 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const tag = cipher.getAuthTag();

        return {
            encrypted,
            iv: iv.toString('hex'),
            tag: tag.toString('hex')
        };
    }

    /**
     * Decrypt message from secure channel
     */
    decryptChannelMessage(encryptedMessage, channelKey) {
        const key = Buffer.from(channelKey, 'hex');
        const { encrypted, iv, tag } = encryptedMessage;

        const decipher = crypto.createDecipher(this.algorithm, key);
        decipher.setAuthTag(Buffer.from(tag, 'hex'));

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    }
}

export default MCPCrypto;
