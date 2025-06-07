/**
 * Bambi Neural Network Control System (BNNCS)
 * A modular distributed control/automation system for BambiSleep.Chat
 * 
 * This system treats the chat environment as an industrial control network where:
 * - Triggers are control mechanisms
 * - Users are processing nodes
 * - Chat interactions are control signals
 * - Audio/visual effects are actuator outputs
 */

import Logger from '../utils/logger.js';
import EventEmitter from 'events';

const logger = new Logger('BNNCS');

class BambiNeuralNetworkControlSystem extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // Configuration with defaults
    this.config = {
      rateLimitWindow: config.rateLimitWindow || 60000, // 1 minute
      rateLimitMax: config.rateLimitMax || 100, // max signals per window
      staleThreshold: config.staleThreshold || 5 * 60 * 1000, // 5 minutes
      healthCheckInterval: config.healthCheckInterval || 30000, // 30 seconds
      cleanupInterval: config.cleanupInterval || 120000, // 2 minutes
      maxNodes: config.maxNodes || 1000,
      priorityLevels: config.priorityLevels || ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'],
      ...config
    };
    
    this.controlNodes = new Map(); // Connected control nodes (users/workers)
    this.automationRules = new Map(); // Automation rule definitions
    this.rateLimiter = new Map(); // Rate limiting per node
    this.metrics = {
      signalsProcessed: 0,
      rulesTriggered: 0,
      nodesConnected: 0,
      nodesDisconnected: 0,
      errorsEncountered: 0,
      averageResponseTime: 0,
      peakNodeCount: 0
    };
    
    this.systemState = {
      mode: 'AUTO', // AUTO, MANUAL, MAINTENANCE
      activeControllers: 0,
      totalTriggerEvents: 0,
      networkHealth: 'HEALTHY',
      version: '2.0.0',
      startedAt: Date.now()
    };
    
    this.initialize();
  }
  /**
   * Initialize the control system
   */
  initialize() {
    logger.info('🧠 Initializing Bambi Neural Network Control System v2.0.0 (BNNCS)');
    logger.info(`📊 Configuration: Rate limit ${this.config.rateLimitMax}/min, Max nodes ${this.config.maxNodes}`);
    
    // Set up default automation rules
    this.setupDefaultAutomationRules();
    
    // Start system monitoring
    this.startSystemMonitoring();
    
    // Initialize metrics collection
    this.startMetricsCollection();
    
    logger.info('✅ BNNCS v2.0.0 initialized - Enhanced Industrial Control System ONLINE');
  }
  /**
   * Register a control node (user/worker) in the network
   */
  registerControlNode(nodeId, nodeType, metadata = {}) {
    // Check if we've reached max nodes
    if (this.controlNodes.size >= this.config.maxNodes) {
      logger.warning(`⚠️ Max nodes (${this.config.maxNodes}) reached, rejecting registration: ${nodeId}`);
      throw new Error('Maximum node capacity reached');
    }

    const controlNode = {
      id: nodeId,
      type: nodeType, // 'USER', 'WORKER', 'TRIGGER_PROCESSOR'
      status: 'ONLINE',
      lastActivity: Date.now(),
      priority: metadata.priority || 'NORMAL',
      weight: metadata.weight || 1.0,
      metadata,
      controllerCapabilities: this.getControllerCapabilities(nodeType),
      metrics: {
        signalsProcessed: 0,
        errorsEncountered: 0,
        averageLatency: 0
      }
    };

    this.controlNodes.set(nodeId, controlNode);
    this.systemState.activeControllers = this.controlNodes.size;
    this.metrics.nodesConnected++;
    
    // Update peak node count
    if (this.controlNodes.size > this.metrics.peakNodeCount) {
      this.metrics.peakNodeCount = this.controlNodes.size;
    }
    
    logger.info(`🔗 Control Node registered: ${nodeId} (${nodeType}, priority: ${controlNode.priority})`);
    this.emit('nodeRegistered', controlNode);
    
    return controlNode;
  }
  /**
   * Unregister a control node
   */
  unregisterControlNode(nodeId) {
    const node = this.controlNodes.get(nodeId);
    if (node) {
      this.controlNodes.delete(nodeId);
      this.systemState.activeControllers = this.controlNodes.size;
      this.metrics.nodesDisconnected++;
      
      // Clean up rate limiter
      this.rateLimiter.delete(nodeId);
      
      logger.info(`🔌 Control Node disconnected: ${nodeId} (processed ${node.metrics.signalsProcessed} signals)`);
      this.emit('nodeDisconnected', node);
    }
  }
  /**
   * Process a control signal (chat message, trigger, etc.)
   */
  processControlSignal(signalType, signalData, sourceNodeId) {
    const startTime = Date.now();
    
    try {
      // Rate limiting check
      if (!this.checkRateLimit(sourceNodeId)) {
        logger.warning(`🚫 Rate limit exceeded for node: ${sourceNodeId}`);
        this.metrics.errorsEncountered++;
        throw new Error('Rate limit exceeded');
      }

      const controlSignal = {
        type: signalType,
        data: signalData,
        source: sourceNodeId,
        timestamp: startTime,
        priority: this.getNodePriority(sourceNodeId),
        id: `ctrl_${startTime}_${Math.random().toString(36).substr(2, 9)}`
      };

      logger.debug(`📡 Processing control signal: ${signalType} from ${sourceNodeId} (priority: ${controlSignal.priority})`);
      
      // Update node activity and metrics
      this.updateNodeActivity(sourceNodeId);
      const node = this.controlNodes.get(sourceNodeId);
      if (node) {
        node.metrics.signalsProcessed++;
      }
      
      // Update system statistics
      if (signalType === 'TRIGGER_ACTIVATION') {
        this.systemState.totalTriggerEvents++;
      }
      this.metrics.signalsProcessed++;

      // Check automation rules
      this.evaluateAutomationRules(controlSignal);
      
      // Emit for other systems to handle
      this.emit('controlSignal', controlSignal);
      
      // Update response time metrics
      const responseTime = Date.now() - startTime;
      this.updateResponseTimeMetrics(responseTime);
      
      return controlSignal;
      
    } catch (error) {
      this.metrics.errorsEncountered++;
      logger.error(`❌ Error processing control signal from ${sourceNodeId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set up default automation rules
   */
  setupDefaultAutomationRules() {
    // Rule 1: Cascade trigger activation
    this.addAutomationRule('CASCADE_TRIGGERS', {
      condition: (signal) => signal.type === 'TRIGGER_ACTIVATION' && 
                           signal.data.triggerName === 'BAMBI SLEEP',
      action: (signal) => {
        logger.info('🔄 Cascade rule triggered: BAMBI SLEEP detected');
        this.emit('automationAction', {
          type: 'CASCADE_TRIGGER',
          targetTriggers: ['BAMBI FREEZE', 'GOOD GIRL'],
          delay: 2000,
          source: 'AUTOMATION_RULE'
        });
      }
    });

    // Rule 2: Network health monitoring
    this.addAutomationRule('NETWORK_HEALTH', {
      condition: () => this.controlNodes.size === 0,
      action: () => {
        this.systemState.networkHealth = 'DEGRADED';
        logger.warning('⚠️ Network health degraded: No active control nodes');
      }
    });

    // Rule 3: Auto-maintenance mode
    this.addAutomationRule('AUTO_MAINTENANCE', {
      condition: (signal) => signal.type === 'SYSTEM_ERROR' && 
                           signal.data.severity === 'CRITICAL',
      action: (signal) => {
        this.setSystemMode('MAINTENANCE');
        logger.warning('🔧 Auto-maintenance activated due to critical error');
      }
    });

    logger.info('📋 Default automation rules loaded');
  }

  /**
   * Add an automation rule
   */
  addAutomationRule(ruleId, rule) {
    this.automationRules.set(ruleId, {
      id: ruleId,
      ...rule,
      created: Date.now(),
      triggered: 0
    });
    
    logger.debug(`➕ Automation rule added: ${ruleId}`);
  }
  /**
   * Evaluate automation rules against a control signal
   */
  evaluateAutomationRules(controlSignal) {
    for (const [ruleId, rule] of this.automationRules) {
      try {
        if (rule.condition(controlSignal)) {
          logger.debug(`🎯 Automation rule triggered: ${ruleId}`);
          rule.triggered++;
          this.metrics.rulesTriggered++;
          rule.action(controlSignal);
        }
      } catch (error) {
        this.metrics.errorsEncountered++;
        logger.error(`❌ Error in automation rule ${ruleId}: ${error.message}`);
      }
    }
  }

  /**
   * Check rate limit for a node
   */
  checkRateLimit(nodeId) {
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindow;
    
    if (!this.rateLimiter.has(nodeId)) {
      this.rateLimiter.set(nodeId, []);
    }
    
    const nodeRequests = this.rateLimiter.get(nodeId);
    
    // Clean old requests outside the window
    const validRequests = nodeRequests.filter(timestamp => timestamp > windowStart);
    
    // Check if under limit
    if (validRequests.length >= this.config.rateLimitMax) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.rateLimiter.set(nodeId, validRequests);
    
    return true;
  }

  /**
   * Get node priority
   */
  getNodePriority(nodeId) {
    const node = this.controlNodes.get(nodeId);
    return node ? node.priority : 'NORMAL';
  }

  /**
   * Update response time metrics
   */
  updateResponseTimeMetrics(responseTime) {
    // Simple moving average
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * 0.9) + (responseTime * 0.1);
  }

  /**
   * Get controller capabilities based on node type
   */
  getControllerCapabilities(nodeType) {
    switch (nodeType) {
      case 'USER':
        return ['TRIGGER_ACTIVATION', 'CHAT_INPUT', 'AUDIO_PLAYBACK'];
      case 'WORKER':
        return ['AI_PROCESSING', 'RESPONSE_GENERATION', 'TRIGGER_DETECTION'];
      case 'TRIGGER_PROCESSOR':
        return ['AUDIO_PROCESSING', 'VISUAL_EFFECTS', 'TRIGGER_SYNTHESIS'];
      default:
        return ['BASIC_CONTROL'];
    }
  }

  /**
   * Set system operating mode
   */
  setSystemMode(mode) {
    const oldMode = this.systemState.mode;
    this.systemState.mode = mode;
    
    logger.info(`🔄 System mode changed: ${oldMode} → ${mode}`);
    this.emit('modeChanged', { oldMode, newMode: mode });
  }
  /**
   * Get current system status
   */
  getSystemStatus() {
    return {
      ...this.systemState,
      config: {
        version: this.systemState.version,
        rateLimitMax: this.config.rateLimitMax,
        maxNodes: this.config.maxNodes,
        staleThreshold: this.config.staleThreshold
      },
      metrics: { ...this.metrics },
      controlNodes: Array.from(this.controlNodes.values()).map(node => ({
        id: node.id,
        type: node.type,
        status: node.status,
        priority: node.priority,
        weight: node.weight,
        lastActivity: node.lastActivity,
        metrics: node.metrics
      })),
      automationRules: Array.from(this.automationRules.values()).map(rule => ({
        id: rule.id,
        triggered: rule.triggered,
        created: rule.created
      })),
      uptime: Date.now() - (this.startTime || Date.now())
    };
  }

  /**
   * Get system metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      rateLimiterSize: this.rateLimiter.size,
      activeNodes: this.controlNodes.size,
      memoryUsage: process.memoryUsage(),
      timestamp: Date.now()
    };
  }
  /**
   * Start system monitoring
   */
  startSystemMonitoring() {
    this.startTime = Date.now();
    
    // Health check every configured interval
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);

    // Clean up stale nodes every configured interval
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleNodes();
    }, this.config.cleanupInterval);

    // Clean up rate limiter every 5 minutes
    this.rateLimiterCleanupTimer = setInterval(() => {
      this.cleanupRateLimiter();
    }, 5 * 60 * 1000);

    logger.info('📊 System monitoring started');
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    // Log metrics every 5 minutes
    this.metricsTimer = setInterval(() => {
      const metrics = this.getMetrics();
      logger.info(`📈 System Metrics: ${metrics.signalsProcessed} signals, ${metrics.activeNodes} nodes, ${Math.round(metrics.averageResponseTime)}ms avg response`);
    }, 5 * 60 * 1000);
  }

  /**
   * Clean up rate limiter
   */
  cleanupRateLimiter() {
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindow;
    
    for (const [nodeId, requests] of this.rateLimiter) {
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      if (validRequests.length === 0) {
        this.rateLimiter.delete(nodeId);
      } else {
        this.rateLimiter.set(nodeId, validRequests);
      }
    }
  }

  /**
   * Perform system health check
   */
  performHealthCheck() {
    const activeNodes = this.controlNodes.size;
    const health = activeNodes > 0 ? 'HEALTHY' : 'DEGRADED';
    
    if (this.systemState.networkHealth !== health) {
      this.systemState.networkHealth = health;
      logger.info(`💚 Network health status: ${health} (${activeNodes} nodes)`);
    }
  }
  /**
   * Clean up stale control nodes
   */
  cleanupStaleNodes() {
    const now = Date.now();
    const staleThreshold = this.config.staleThreshold;
    let cleanedCount = 0;
    
    for (const [nodeId, node] of this.controlNodes) {
      if (now - node.lastActivity > staleThreshold) {
        logger.info(`🧹 Cleaning up stale node: ${nodeId} (inactive for ${Math.round((now - node.lastActivity) / 1000)}s)`);
        this.unregisterControlNode(nodeId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info(`🧹 Cleaned ${cleanedCount} stale nodes`);
    }
  }

  /**
   * Update node activity
   */
  updateNodeActivity(nodeId) {
    const node = this.controlNodes.get(nodeId);
    if (node) {
      node.lastActivity = Date.now();
    }
  }
  /**
   * Shutdown the control system
   */
  shutdown() {
    logger.info('🔴 BNNCS v2.0.0 shutting down...');
    
    // Clear all timers
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.rateLimiterCleanupTimer) clearInterval(this.rateLimiterCleanupTimer);
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    
    // Log final metrics
    const finalMetrics = this.getMetrics();
    logger.info(`📊 Final metrics: ${finalMetrics.signalsProcessed} signals processed, ${finalMetrics.nodesConnected} nodes connected, ${finalMetrics.rulesTriggered} rules triggered`);
    
    this.setSystemMode('OFFLINE');
    this.removeAllListeners();
    this.controlNodes.clear();
    this.automationRules.clear();
    this.rateLimiter.clear();
    
    logger.info('✅ BNNCS shutdown complete');
  }

  /**
   * Reset system metrics
   */
  resetMetrics() {
    this.metrics = {
      signalsProcessed: 0,
      rulesTriggered: 0,
      nodesConnected: 0,
      nodesDisconnected: 0,
      errorsEncountered: 0,
      averageResponseTime: 0,
      peakNodeCount: this.controlNodes.size
    };
    logger.info('📊 System metrics reset');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    logger.info(`⚙️ Configuration updated`);
    this.emit('configUpdated', { oldConfig, newConfig: this.config });
  }
}

// Export singleton instance with configuration options
const bambiControlNetwork = new BambiNeuralNetworkControlSystem({
  rateLimitMax: 150, // Allow 150 signals per minute per node
  maxNodes: 2000,    // Support up to 2000 concurrent nodes
  staleThreshold: 10 * 60 * 1000, // 10 minutes for production
  healthCheckInterval: 45000,      // 45 seconds health checks
  priorityLevels: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL', 'SYSTEM']
});

export default bambiControlNetwork;
