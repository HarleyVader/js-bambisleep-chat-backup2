/**
 * Bambi Control Network
 * Simple control network for BambiSleep.Chat
 * 
 * Basic functionality:
 * - Node management (users, workers)
 * - Rate limiting 
 * - Event emission for integration
 */

import Logger from '../utils/logger.js';
import { EventEmitter } from 'events';

const logger = new Logger('ControlNetwork');

class BambiControlNetwork extends EventEmitter {
  constructor() {
    super();
    
    // Simple configuration
    this.config = {
      rateLimitMax: 100, // max signals per minute per node
      rateLimitWindow: 60000 // 1 minute
    };
    
    // Core components
    this.controlNodes = new Map(); // Connected nodes (USER/WORKER)
    this.rateLimiter = new Map(); // Rate limiting per node
    
    // Basic metrics
    this.metrics = {
      signalsProcessed: 0,
      nodesConnected: 0,
      nodesDisconnected: 0,
      errorsEncountered: 0
    };
    
    this.initialized = false;
  }

  /**
   * Initialize the control network
   */
  async initialize() {
    if (this.initialized) {
      logger.warn('Control network already initialized');
      return;
    }
    
    logger.info('🌀 Initializing Bambi Control Network');
    this.initialized = true;
    logger.info('✅ Bambi Control Network initialized');
  }

  /**
   * Add a control node (user or worker)
   */
  addControlNode(nodeId, nodeData) {
    try {
      const node = {
        id: nodeId,
        type: nodeData.type || 'USER', // USER, WORKER
        sessionId: nodeData.sessionId,
        connected: true,
        lastSeen: Date.now(),
        signalCount: 0,
        metadata: nodeData.metadata || {}
      };
      
      this.controlNodes.set(nodeId, node);
      this.metrics.nodesConnected++;
      
      logger.debug(`➕ Control node added: ${nodeId} (${node.type})`);
      this.emit('nodeConnected', node);
      
      return true;
    } catch (error) {
      logger.error('Error adding control node:', error);
      this.metrics.errorsEncountered++;
      return false;
    }
  }

  /**
   * Remove a control node
   */
  removeControlNode(nodeId) {
    try {
      const node = this.controlNodes.get(nodeId);
      if (node) {
        this.controlNodes.delete(nodeId);
        this.rateLimiter.delete(nodeId);
        this.metrics.nodesDisconnected++;
        
        logger.debug(`➖ Control node removed: ${nodeId}`);
        this.emit('nodeDisconnected', node);
        
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error removing control node:', error);
      this.metrics.errorsEncountered++;
      return false;
    }
  }

  /**
   * Process a control signal from a node
   */
  async processSignal(nodeId, signal) {
    try {
      // Check if node exists
      const node = this.controlNodes.get(nodeId);
      if (!node) {
        logger.warn(`Signal from unknown node: ${nodeId}`);
        return false;
      }
      
      // Rate limiting check
      if (!this.checkRateLimit(nodeId)) {
        logger.warn(`Rate limit exceeded for node: ${nodeId}`);
        this.emit('rateLimitExceeded', { nodeId, signal });
        return false;
      }
      
      // Update node activity
      node.lastSeen = Date.now();
      node.signalCount++;
      
      // Process the signal
      this.metrics.signalsProcessed++;
      this.emit('signalProcessed', { nodeId, signal });
      
      return true;
    } catch (error) {
      logger.error('Error processing signal:', error);
      this.metrics.errorsEncountered++;
      return false;
    }
  }

  /**
   * Check rate limiting for a node
   */
  checkRateLimit(nodeId) {
    const now = Date.now();
    const nodeLimit = this.rateLimiter.get(nodeId) || { count: 0, windowStart: now };
    
    // Reset window if expired
    if (now - nodeLimit.windowStart > this.config.rateLimitWindow) {
      nodeLimit.count = 0;
      nodeLimit.windowStart = now;
    }
    
    // Check if under limit
    if (nodeLimit.count < this.config.rateLimitMax) {
      nodeLimit.count++;
      this.rateLimiter.set(nodeId, nodeLimit);
      return true;
    }
    
    return false;
  }

  /**
   * Get connected nodes
   */
  getConnectedNodes() {
    return Array.from(this.controlNodes.values());
  }

  /**
   * Get current system metrics (compatibility method)
   */
  getMetrics() {
    return this.metrics;
  }

  /**
   * Process a control signal (compatibility method with different signature)
   */
  async processControlSignal(signalType, signalData, sourceNodeId, options = {}) {
    const signal = {
      type: signalType,
      data: signalData,
      timestamp: Date.now(),
      nodeId: sourceNodeId,
      ...options
    };
    
    return await this.processSignal(sourceNodeId, signal);
  }

  /**
   * Update node activity (compatibility method)
   */
  updateNodeActivity(nodeId) {
    const node = this.controlNodes.get(nodeId);
    if (node) {
      node.lastSeen = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Register a control node (compatibility method)
   */
  registerControlNode(nodeId, nodeType, nodeData = {}) {
    return this.addControlNode(nodeId, {
      type: nodeType,
      ...nodeData
    });
  }

  /**
   * Unregister a control node (compatibility method)
   */
  unregisterControlNode(nodeId) {
    return this.removeControlNode(nodeId);
  }

  /**
   * Shutdown the control network
   */
  async shutdown() {
    logger.info('🛑 Shutting down Bambi Control Network');
    
    // Disconnect all nodes
    this.controlNodes.clear();
    this.rateLimiter.clear();
    
    this.initialized = false;
    logger.info('✅ Bambi Control Network shutdown complete');
  }
}

// Create singleton instance
const bambiControlNetwork = new BambiControlNetwork();

export default bambiControlNetwork;
