/**
 * Bambi Distributed Industrial Control System (BDICS)
 * A modular distributed control/automation system for BambiSleep.Chat
 * 
 * Enhanced with industrial control capabilities:
 * - DCS (Distributed Control System): Decentralized control functions across modules
 * - SCADA (Supervisory Control and Data Acquisition): Remote monitoring and control
 * - ICS/NCS (Industrial/Networked Control System): Industrial network communication
 * 
 * This system treats the chat environment as an industrial control network where:
 * - DCS Controllers manage distributed control loops
 * - SCADA Workstations provide supervisory oversight
 * - RTUs/PLCs handle remote terminal operations
 * - Industrial protocols ensure reliable communication
 * - Users are processing nodes with industrial-grade reliability
 * - Chat interactions are control signals with protocol validation
 * - Audio/visual effects are actuator outputs with feedback loops
 */

import Logger from '../utils/logger.js';
import { EventEmitter } from 'events';
import BambiControlsSystem from '../controls/index.js';

const logger = new Logger('BDICS');

class BambiDistributedIndustrialControlSystem extends EventEmitter {
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
      
      // Industrial Control System Configuration
      maxRemoteSites: config.maxRemoteSites || 50, // Maximum remote sites
      maxControllersPerSite: config.maxControllersPerSite || 20, // DCS controllers per site
      communicationTimeout: config.communicationTimeout || 5000, // Protocol timeout
      redundancyLevel: config.redundancyLevel || 'DUAL', // SINGLE, DUAL, TRIPLE
      protocolVersions: config.protocolVersions || ['MODBUS', 'ETHERNET_IP', 'PROFINET', 'BAMBI_NATIVE'],
      scadaUpdateInterval: config.scadaUpdateInterval || 1000, // SCADA refresh rate
      dcsLoopTime: config.dcsLoopTime || 100, // DCS control loop time (ms)
      industrialGrade: config.industrialGrade || true, // Enable industrial-grade features
      
      ...config
    };
      // Get reference to the controls system singleton
    this.controlsSystem = BambiControlsSystem;
    
    // Legacy compatibility - these are now delegated to sub-managers
    this.controlNodes = new Map(); // Connected control nodes (users/workers)
    this.remoteSites = new Map(); // Remote industrial sites
    this.dcsControllers = new Map(); // Distributed control system controllers
    this.scadaWorkstations = new Map(); // SCADA supervisory workstations
    this.industrialProtocols = new Map(); // Communication protocol handlers
    this.controlLoops = new Map(); // Active control loops
    this.automationRules = new Map(); // Automation rule definitions
    this.rateLimiter = new Map(); // Rate limiting per node
    this.metrics = {
      signalsProcessed: 0,
      rulesTriggered: 0,
      nodesConnected: 0,
      nodesDisconnected: 0,
      errorsEncountered: 0,
      averageResponseTime: 0,
      peakNodeCount: 0,
      
      // Industrial Control Metrics
      remoteSitesOnline: 0,
      dcsControllersActive: 0,
      scadaWorkstationsConnected: 0,
      controlLoopsRunning: 0,
      protocolErrors: 0,
      redundancyFailovers: 0,
      industrialCommands: 0,
      processVariablesMonitored: 0,
      alarmConditions: 0
    };
    
    this.systemState = {
      mode: 'AUTO', // AUTO, MANUAL, MAINTENANCE, EMERGENCY_STOP
      activeControllers: 0,
      totalTriggerEvents: 0,
      networkHealth: 'HEALTHY',
      version: '3.0.0-INDUSTRIAL',
      startedAt: Date.now(),
      
      // Industrial System State
      industrialMode: 'PRODUCTION', // PRODUCTION, TESTING, MAINTENANCE, EMERGENCY
      redundancyStatus: 'ACTIVE',      communicationStatus: 'NORMAL',
      processStatus: 'STABLE',
      safetySystemStatus: 'ARMED',
      lastMaintenanceWindow: null
    };
    // Initialization will be called manually to avoid circular dependencies
  }

  /**
   * Initialize the distributed industrial control system
   */
  async initialize() {
    logger.info('🏭 Initializing Bambi Distributed Industrial Control System v3.0.0 (BDICS)');
    logger.info(`📊 Industrial Config: ${this.config.maxRemoteSites} sites, ${this.config.redundancyLevel} redundancy, ${this.config.protocolVersions.length} protocols`);
      // Initialize the modular controls system
    await this.controlsSystem.initialize(this);
    
    // Set up event forwarding from controls system
    this.setupControlsSystemEvents();
    
    // Initialize legacy compatibility layers
    this.initializeLegacyCompatibility();
    
    // Initialize industrial communication protocols (legacy compatibility)
    this.initializeIndustrialProtocols();
    
    // Set up default automation rules (legacy compatibility)
    this.setupDefaultAutomationRules();
    
    // Initialize DCS control loops (legacy compatibility)
    this.initializeDCSControlLoops();
    
    // Start system monitoring
    this.startSystemMonitoring();
    
    // Initialize metrics collection
    this.startMetricsCollection();
    
    // Start SCADA supervision (legacy compatibility)
    this.startSCADASupervision();
    
    logger.info('✅ BDICS v3.0.0 initialized - Industrial Control System ONLINE');
  }

  /**
   * Set up event forwarding from the modular controls system
   */
  setupControlsSystemEvents() {
    // Forward key events from controls system managers
    this.controlsSystem.on('controlSignal', (signal) => {
      this.emit('controlSignal', signal);
    });
    
    this.controlsSystem.on('alarmTriggered', (alarm) => {
      this.emit('alarmEscalation', alarm);
    });
    
    this.controlsSystem.on('automationAction', (action) => {
      this.emit('automationAction', action);
    });
    
    logger.info('🔗 Controls system events configured');
  }

  /**
   * Initialize legacy compatibility layers
   */
  initializeLegacyCompatibility() {
    // Map legacy data structures to new controls system
    this.controlNodes = this.controlsSystem.controlNetwork.controlNodes || new Map();
    this.remoteSites = this.controlsSystem.siteManager?.sites || new Map();
    this.dcsControllers = this.controlsSystem.dcsManager?.controllers || new Map();
    this.scadaWorkstations = this.controlsSystem.scadaManager?.workstations || new Map();
    this.industrialProtocols = this.controlsSystem.protocolManager?.protocols || new Map();
    this.controlLoops = this.controlsSystem.loopManager?.loops || new Map();
    this.automationRules = this.controlsSystem.automationManager?.rules || new Map();
    
    logger.info('🔄 Legacy compatibility layer initialized');
  }

  /**
   * Initialize industrial communication protocols
   */
  initializeIndustrialProtocols() {
    const protocols = {
      'BAMBI_NATIVE': {
        name: 'Bambi Native Protocol',
        version: '1.0',
        timeout: this.config.communicationTimeout,
        validate: (signal) => true, // Always valid for native protocol
        encode: (data) => JSON.stringify(data),
        decode: (data) => JSON.parse(data)
      },
      'MODBUS': {
        name: 'Modbus TCP/IP',
        version: '1.1b3',
        timeout: this.config.communicationTimeout,
        validate: (signal) => this.validateModbusSignal(signal),
        encode: (data) => this.encodeModbus(data),
        decode: (data) => this.decodeModbus(data)
      },
      'ETHERNET_IP': {
        name: 'EtherNet/IP',
        version: '1.0',
        timeout: this.config.communicationTimeout,
        validate: (signal) => this.validateEthernetIPSignal(signal),
        encode: (data) => this.encodeEthernetIP(data),
        decode: (data) => this.decodeEthernetIP(data)
      },
      'PROFINET': {
        name: 'PROFINET',
        version: '2.4',
        timeout: this.config.communicationTimeout,
        validate: (signal) => this.validateProfinetSignal(signal),
        encode: (data) => this.encodeProfinet(data),
        decode: (data) => this.decodeProfinet(data)
      }
    };

    for (const [protocolName, protocolConfig] of Object.entries(protocols)) {
      this.industrialProtocols.set(protocolName, protocolConfig);
    }

    logger.info(`🔌 Initialized ${this.industrialProtocols.size} industrial protocols`);
  }

  /**
   * Initialize DCS control loops
   */
  initializeDCSControlLoops() {
    // Default control loops for Bambi system
    const defaultLoops = [
      {
        id: 'TRIGGER_INTENSITY_LOOP',
        type: 'PID',
        setpoint: 0.7,
        processVariable: 0.5,
        output: 0.0,
        enabled: true,
        tuning: { kp: 1.0, ki: 0.1, kd: 0.05 }
      },
      {
        id: 'AUDIO_LEVEL_LOOP',
        type: 'PID',
        setpoint: 0.8,
        processVariable: 0.6,
        output: 0.0,
        enabled: true,
        tuning: { kp: 0.8, ki: 0.15, kd: 0.02 }
      },
      {
        id: 'USER_ENGAGEMENT_LOOP',
        type: 'FUZZY',
        setpoint: 0.9,
        processVariable: 0.7,
        output: 0.0,
        enabled: true,
        rules: ['IF engagement LOW THEN increase triggers', 'IF engagement HIGH THEN maintain']
      }
    ];

    for (const loop of defaultLoops) {
      this.controlLoops.set(loop.id, {
        ...loop,
        lastUpdate: Date.now(),
        error: 0,
        integral: 0,
        derivative: 0,
        history: []
      });
    }

    this.metrics.controlLoopsRunning = this.controlLoops.size;
    logger.info(`⚙️ Initialized ${this.controlLoops.size} DCS control loops`);
  }

  /**
   * Start SCADA supervision
   */
  startSCADASupervision() {
    // SCADA data acquisition and display updates
    this.scadaTimer = setInterval(() => {
      this.performSCADADataAcquisition();
      this.updateSCADADisplays();
    }, this.config.scadaUpdateInterval);

    logger.info('🖥️ SCADA supervision started');
  }

  /**
   * Register a control node (user/worker/industrial device) in the network
   */
  registerControlNode(nodeId, nodeType, metadata = {}) {
    // Check if we've reached max nodes
    if (this.controlNodes.size >= this.config.maxNodes) {
      logger.warning(`⚠️ Max nodes (${this.config.maxNodes}) reached, rejecting registration: ${nodeId}`);
      throw new Error('Maximum node capacity reached');
    }

    const controlNode = {
      id: nodeId,
      type: nodeType, // 'USER', 'WORKER', 'DCS_CONTROLLER', 'SCADA_WORKSTATION', 'RTU', 'PLC', 'HMI'
      status: 'ONLINE',
      lastActivity: Date.now(),
      priority: metadata.priority || 'NORMAL',
      weight: metadata.weight || 1.0,
      metadata,
      controllerCapabilities: this.getControllerCapabilities(nodeType),
      industrialConfig: this.getIndustrialConfig(nodeType, metadata),
      metrics: {
        signalsProcessed: 0,
        errorsEncountered: 0,
        averageLatency: 0,
        protocolMessages: 0,
        controlActions: 0,
        alarms: 0
      }
    };

    this.controlNodes.set(nodeId, controlNode);
    this.systemState.activeControllers = this.controlNodes.size;
    this.metrics.nodesConnected++;
    
    // Update industrial metrics based on node type
    this.updateIndustrialMetrics(nodeType, 'CONNECT');
    
    // Update peak node count
    if (this.controlNodes.size > this.metrics.peakNodeCount) {
      this.metrics.peakNodeCount = this.controlNodes.size;
    }
    
    logger.info(`🔗 Industrial Node registered: ${nodeId} (${nodeType}, priority: ${controlNode.priority}, protocol: ${controlNode.industrialConfig.protocol})`);
    this.emit('nodeRegistered', controlNode);
    
    // Auto-register to appropriate site if applicable
    this.autoRegisterToSite(controlNode);
    
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
      
      // Update industrial metrics
      this.updateIndustrialMetrics(node.type, 'DISCONNECT');
      
      // Clean up rate limiter
      this.rateLimiter.delete(nodeId);
      
      // Handle industrial-specific cleanup
      this.handleIndustrialNodeDisconnect(node);
      
      logger.info(`🔌 Industrial Node disconnected: ${nodeId} (processed ${node.metrics.signalsProcessed} signals, ${node.metrics.protocolMessages} protocol messages)`);
      this.emit('nodeDisconnected', node);
    }
  }  /**
   * Process an industrial control signal with protocol validation
   */
  async processControlSignal(signalType, signalData, sourceNodeId, protocolInfo = {}) {
    try {
      // Delegate to the modular controls system
      return await this.controlsSystem.processControlSignal(
        signalType, 
        signalData, 
        sourceNodeId, 
        protocolInfo
      );
    } catch (error) {
      this.metrics.errorsEncountered++;
      this.handleIndustrialError(error, sourceNodeId, signalType);
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

    // Rule 4: DCS redundancy monitoring
    this.addAutomationRule('DCS_REDUNDANCY_CHECK', {
      condition: (signal) => signal.type === 'CONTROLLER_STATUS' && 
                           signal.data.redundancyStatus === 'DEGRADED',
      action: (signal) => {
        logger.warning('⚠️ DCS redundancy degraded, initiating failover procedures');
        this.handleControllerFailover(signal.source);
        this.metrics.redundancyFailovers++;
      }
    });

    // Rule 5: SCADA alarm escalation
    this.addAutomationRule('SCADA_ALARM_ESCALATION', {
      condition: (signal) => signal.type === 'ALARM_CONDITION' && 
                           signal.data.severity === 'HIGH' &&
                           !signal.data.acknowledged,
      action: (signal) => {
        logger.warning('🚨 High severity alarm - escalating to all SCADA workstations');
        this.escalateAlarmToSCADA(signal.data);
        this.metrics.alarmConditions++;
      }
    });

    // Rule 6: Industrial safety interlock
    this.addAutomationRule('SAFETY_INTERLOCK', {
      condition: (signal) => signal.type === 'SAFETY_VIOLATION' ||
                           (signal.type === 'PROCESS_VARIABLE_UPDATE' && 
                            this.checkSafetyLimits(signal.data)),
      action: (signal) => {
        logger.error('🔴 SAFETY INTERLOCK ACTIVATED - Emergency stop initiated');
        this.setSystemMode('EMERGENCY_STOP');
        this.activateEmergencyStop();
      }
    });

    logger.info('📋 Default automation rules loaded');
  }
  /**
   * Add an automation rule
   */
  addAutomationRule(ruleId, rule) {
    // Delegate to the automation manager
    if (this.controlsSystem.automationManager) {
      return this.controlsSystem.automationManager.registerRule(ruleId, {
        name: rule.name || ruleId,
        condition: rule.condition,
        action: rule.action,
        ...rule
      });
    }
    
    // Legacy fallback
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
   * Get controller capabilities based on node type (enhanced for industrial)
   */
  getControllerCapabilities(nodeType) {
    switch (nodeType) {
      case 'USER':
        return ['TRIGGER_ACTIVATION', 'CHAT_INPUT', 'AUDIO_PLAYBACK', 'HMI_INTERACTION'];
      case 'WORKER':
        return ['AI_PROCESSING', 'RESPONSE_GENERATION', 'TRIGGER_DETECTION', 'DATA_ANALYSIS'];
      case 'DCS_CONTROLLER':
        return ['PROCESS_CONTROL', 'LOOP_MANAGEMENT', 'ALARM_HANDLING', 'REDUNDANCY_CONTROL'];
      case 'SCADA_WORKSTATION':
        return ['SUPERVISORY_CONTROL', 'DATA_ACQUISITION', 'ALARM_MANAGEMENT', 'REPORT_GENERATION'];
      case 'RTU':
        return ['REMOTE_IO', 'COMMUNICATION_GATEWAY', 'LOCAL_CONTROL', 'STATUS_REPORTING'];
      case 'PLC':
        return ['LOGIC_CONTROL', 'INTERLOCK_MANAGEMENT', 'SAFETY_FUNCTIONS', 'LOCAL_HMI'];
      case 'HMI':
        return ['OPERATOR_INTERFACE', 'TREND_DISPLAY', 'ALARM_DISPLAY', 'CONTROL_INTERFACE'];
      default:
        return ['BASIC_CONTROL'];
    }
  }

  /**
   * Get industrial configuration for node type
   */
  getIndustrialConfig(nodeType, metadata) {
    const baseConfig = {
      protocol: metadata.protocol || 'BAMBI_NATIVE',
      redundancy: metadata.redundancy || 'NONE',
      safetyLevel: metadata.safetyLevel || 'STANDARD',
      updateRate: metadata.updateRate || 1000
    };

    switch (nodeType) {
      case 'DCS_CONTROLLER':
        return {
          ...baseConfig,
          controlLoops: metadata.controlLoops || [],
          redundancy: 'DUAL',
          safetyLevel: 'HIGH',
          updateRate: this.config.dcsLoopTime
        };
      case 'SCADA_WORKSTATION':
        return {
          ...baseConfig,
          refreshRate: this.config.scadaUpdateInterval,
          alarmLimits: metadata.alarmLimits || {},
          displayConfig: metadata.displayConfig || {}
        };
      case 'RTU':
        return {
          ...baseConfig,
          ioPoints: metadata.ioPoints || 16,
          communicationMode: 'MASTER_SLAVE',
          protocol: metadata.protocol || 'MODBUS'
        };
      case 'PLC':
        return {
          ...baseConfig,
          scanTime: metadata.scanTime || 10,
          memorySize: metadata.memorySize || '64KB',
          safetyLevel: 'HIGH'
        };
      default:
        return baseConfig;
    }
  }

  /**
   * Update industrial metrics based on node activity
   */
  updateIndustrialMetrics(nodeType, action) {
    switch (nodeType) {
      case 'DCS_CONTROLLER':
        if (action === 'CONNECT') this.metrics.dcsControllersActive++;
        else if (action === 'DISCONNECT') this.metrics.dcsControllersActive--;
        break;
      case 'SCADA_WORKSTATION':
        if (action === 'CONNECT') this.metrics.scadaWorkstationsConnected++;
        else if (action === 'DISCONNECT') this.metrics.scadaWorkstationsConnected--;
        break;
    }
  }

  /**
   * Handle industrial node disconnection
   */
  handleIndustrialNodeDisconnect(node) {
    if (node.type === 'DCS_CONTROLLER') {
      // Handle controller failover if redundancy is configured
      if (node.industrialConfig.redundancy !== 'NONE') {
        this.handleControllerFailover(node);
      }
    } else if (node.type === 'SCADA_WORKSTATION') {
      // Log operator logout
      logger.info(`👤 SCADA Operator logged out: ${node.industrialConfig.activeOperator || 'UNKNOWN'}`);
    }
  }

  /**
   * Validate industrial protocol
   */
  validateIndustrialProtocol(signalType, protocolInfo) {
    const protocol = this.industrialProtocols.get(protocolInfo.protocol || 'BAMBI_NATIVE');
    if (!protocol) {
      return false;
    }
    
    return protocol.validate({ type: signalType, ...protocolInfo });
  }

  /**
   * Process industrial-specific signals
   */
  processIndustrialSignal(signal) {
    // Handle different industrial signal types
    switch (signal.type) {
      case 'PROCESS_VARIABLE_UPDATE':
        this.updateProcessVariable(signal);
        break;
      case 'ALARM_CONDITION':
        this.handleAlarmCondition(signal);
        break;
      case 'SETPOINT_CHANGE':
        this.handleSetpointChange(signal);
        break;
      case 'CONTROLLER_STATUS':
        this.updateControllerStatus(signal);
        break;
    }
  }

  /**
   * Update DCS control loops
   */
  updateDCSControlLoops(signal) {
    if (signal.type === 'PROCESS_VARIABLE_UPDATE') {
      const loopId = signal.data.loopId;
      const loop = this.controlLoops.get(loopId);
      
      if (loop && loop.enabled) {
        const now = Date.now();
        const dt = (now - loop.lastUpdate) / 1000; // seconds
        
        // PID control calculation
        if (loop.type === 'PID') {
          const error = loop.setpoint - signal.data.value;
          loop.integral += error * dt;
          loop.derivative = (error - loop.error) / dt;
          
          const output = (loop.tuning.kp * error) + 
                        (loop.tuning.ki * loop.integral) + 
                        (loop.tuning.kd * loop.derivative);
          
          loop.output = Math.max(0, Math.min(1, output)); // Clamp 0-1
          loop.error = error;
          loop.lastUpdate = now;
          
          // Store history for trending
          loop.history.push({
            timestamp: now,
            setpoint: loop.setpoint,
            processVariable: signal.data.value,
            output: loop.output,
            error: error
          });
          
          // Limit history size
          if (loop.history.length > 1000) {
            loop.history = loop.history.slice(-500);
          }
        }
      }
    }
  }

  /**
   * Generate sequence number for protocol messages
   */
  generateSequenceNumber() {
    this._sequenceCounter = (this._sequenceCounter || 0) + 1;
    if (this._sequenceCounter > 65535) this._sequenceCounter = 1;
    return this._sequenceCounter;
  }
  /**
   * Get current industrial system status
   */
  getSystemStatus() {
    // Get controls system status if available
    const controlsSystemStatus = this.controlsSystem && this.controlsSystem.isInitialized 
      ? this.controlsSystem.getSystemStatus() 
      : null;

    return {
      ...this.systemState,
      config: {
        version: this.systemState.version,
        rateLimitMax: this.config.rateLimitMax,
        maxNodes: this.config.maxNodes,
        maxRemoteSites: this.config.maxRemoteSites,
        redundancyLevel: this.config.redundancyLevel,
        industrialGrade: this.config.industrialGrade,
        protocolVersions: this.config.protocolVersions
      },
      metrics: { ...this.metrics },
      controlNodes: Array.from(this.controlNodes.values()).map(node => ({
        id: node.id,
        type: node.type,
        status: node.status,
        priority: node.priority,
        weight: node.weight,
        lastActivity: node.lastActivity,
        protocol: node.industrialConfig?.protocol,
        metrics: node.metrics
      })),
      remoteSites: Array.from(this.remoteSites.values()).map(site => ({
        id: site.id,
        name: site.name,
        location: site.location,
        status: site.status,
        protocol: site.protocol,
        controllersCount: site.controllers.size,
        lastCommunication: site.lastCommunication
      })),
      dcsControllers: Array.from(this.dcsControllers.values()).map(controller => ({
        id: controller.id,
        siteId: controller.siteId,
        status: controller.status,
        controlLoopsCount: controller.controlLoops.length,
        redundancyPair: controller.redundancyPair
      })),
      scadaWorkstations: Array.from(this.scadaWorkstations.values()).map(ws => ({
        id: ws.id,
        status: ws.status,
        activeOperator: ws.activeOperator,
        authorizedSites: ws.authorizedSites.length
      })),
      controlLoops: Array.from(this.controlLoops.values()).map(loop => ({
        id: loop.id,
        type: loop.type,
        setpoint: loop.setpoint,
        processVariable: loop.processVariable,
        output: loop.output,
        enabled: loop.enabled
      })),
      industrialProtocols: Array.from(this.industrialProtocols.keys()),
      automationRules: Array.from(this.automationRules.values()).map(rule => ({
        id: rule.id,
        triggered: rule.triggered,
        created: rule.created
      })),
      uptime: Date.now() - (this.startTime || Date.now()),
      
      // Include controls system status if available
      controlsSystem: controlsSystemStatus
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

    // Industrial system monitoring
    this.dcsLoopTimer = setInterval(() => {
      this.updateDCSControlLoops({ type: 'SYSTEM_TICK' });
    }, this.config.dcsLoopTime);

    // Industrial communication health check
    this.commHealthTimer = setInterval(() => {
      this.checkIndustrialCommunication();
    }, this.config.communicationTimeout);

    logger.info('📊 System monitoring started');
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    // Log industrial metrics every 2 minutes
    this.metricsTimer = setInterval(() => {
      const metrics = this.getMetrics();
      logger.info(`📈 Industrial Metrics: ${metrics.signalsProcessed} signals, ${metrics.activeNodes} nodes, ${metrics.remoteSitesOnline} sites, ${metrics.dcsControllersActive} controllers, ${Math.round(metrics.averageResponseTime)}ms avg response`);
      logger.info(`🏭 Control Status: ${metrics.controlLoopsRunning} loops, ${metrics.protocolErrors} protocol errors, ${metrics.alarmConditions} alarms`);
    }, 2 * 60 * 1000);
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
   * Shutdown the industrial control system
   */
  shutdown() {
    logger.info('🔴 BDICS v3.0.0 Industrial Control System shutting down...');
    
    // Ensure safe shutdown of industrial processes
    this.performSafeShutdown();
    
    // Clear all timers
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.rateLimiterCleanupTimer) clearInterval(this.rateLimiterCleanupTimer);
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    if (this.scadaTimer) clearInterval(this.scadaTimer);
    if (this.dcsLoopTimer) clearInterval(this.dcsLoopTimer);
    if (this.commHealthTimer) clearInterval(this.commHealthTimer);
    
    // Log final industrial metrics
    const finalMetrics = this.getMetrics();
    logger.info(`📊 Final Industrial Metrics: ${finalMetrics.signalsProcessed} signals, ${finalMetrics.remoteSitesOnline} sites, ${finalMetrics.dcsControllersActive} controllers`);
    logger.info(`🏭 Final Control Status: ${finalMetrics.controlLoopsRunning} loops, ${finalMetrics.industrialCommands} commands, ${finalMetrics.alarmConditions} alarms`);
    
    this.setSystemMode('OFFLINE');
    this.removeAllListeners();
    this.controlNodes.clear();
    this.remoteSites.clear();
    this.dcsControllers.clear();
    this.scadaWorkstations.clear();
    this.controlLoops.clear();
    this.industrialProtocols.clear();
    this.automationRules.clear();
    this.rateLimiter.clear();
    
    logger.info('✅ BDICS Industrial Control System shutdown complete');
  }

  /**
   * Perform safe industrial shutdown
   */
  performSafeShutdown() {
    // Place all control loops in safe state
    for (const [loopId, loop] of this.controlLoops) {
      loop.output = 0;
      loop.enabled = false;
    }
    
    // Notify all SCADA workstations
    for (const [wsId, workstation] of this.scadaWorkstations) {
      this.emit('scadaNotification', {
        workstationId: wsId,
        type: 'SYSTEM_SHUTDOWN',
        message: 'Industrial control system shutting down safely'
      });
    }
    
    logger.info('🛡️ Safe shutdown procedures completed');
  }

  /**
   * Industrial protocol validation methods (simplified implementations)
   */
  validateModbusSignal(signal) { return true; }
  validateEthernetIPSignal(signal) { return true; }
  validateProfinetSignal(signal) { return true; }
  
  encodeModbus(data) { return JSON.stringify(data); }
  decodeModbus(data) { return JSON.parse(data); }
  
  encodeEthernetIP(data) { return JSON.stringify(data); }
  decodeEthernetIP(data) { return JSON.parse(data); }
  
  encodeProfinet(data) { return JSON.stringify(data); }
  decodeProfinet(data) { return JSON.parse(data); }

  /**
   * Industrial helper methods
   */
  performSCADADataAcquisition() {
    // Collect data from all remote sites and controllers
    this.metrics.processVariablesMonitored += this.remoteSites.size;
  }

  updateSCADADisplays() {
    // Update all SCADA workstation displays
    for (const [wsId, workstation] of this.scadaWorkstations) {
      this.emit('scadaUpdate', {
        workstationId: wsId,
        timestamp: Date.now(),
        data: this.collectSCADAData(workstation)
      });
    }
  }

  collectSCADAData(workstation) {
    return {
      systemStatus: this.systemState,
      alarms: this.getActiveAlarms(),
      trends: this.getProcessTrends(),
      sites: Array.from(this.remoteSites.values())
    };
  }

  checkIndustrialCommunication() {
    // Check communication health with all remote sites
    const now = Date.now();
    for (const [siteId, site] of this.remoteSites) {
      if (now - site.lastCommunication > this.config.communicationTimeout * 2) {
        site.status = 'COMMUNICATION_FAULT';
        this.metrics.protocolErrors++;
        logger.warning(`📡 Communication fault with site: ${siteId}`);
      }
    }
  }

  handleControllerFailover(nodeId) {
    logger.info(`🔄 Initiating controller failover for: ${nodeId}`);
    // Simplified failover logic
  }

  handleAlarmCondition(signal) {
    this.metrics.alarmConditions++;
    logger.warning(`🚨 Alarm condition: ${signal.data.description}`);
  }

  escalateAlarmToSCADA(alarmData) {
    for (const [wsId, workstation] of this.scadaWorkstations) {
      this.emit('alarmEscalation', {
        workstationId: wsId,
        alarm: alarmData,
        timestamp: Date.now()
      });
    }
  }

  checkSafetyLimits(data) {
    // Simplified safety limit checking
    return false;
  }

  activateEmergencyStop() {
    logger.error('🔴 EMERGENCY STOP ACTIVATED');
    // Emergency stop procedures
  }

  updateProcessVariable(signal) {
    this.metrics.processVariablesMonitored++;
  }

  handleSetpointChange(signal) {
    const loopId = signal.data.loopId;
    const loop = this.controlLoops.get(loopId);
    if (loop) {
      loop.setpoint = signal.data.setpoint;
      logger.info(`⚙️ Setpoint changed for loop ${loopId}: ${signal.data.setpoint}`);
    }
  }

  updateControllerStatus(signal) {
    const controller = this.dcsControllers.get(signal.source);
    if (controller) {
      controller.status = signal.data.status;
      controller.lastUpdate = Date.now();
    }
  }

  autoRegisterToSite(node) {
    // Auto-register industrial nodes to appropriate sites
    if (['DCS_CONTROLLER', 'RTU', 'PLC'].includes(node.type)) {
      const siteId = node.metadata.siteId || 'DEFAULT_SITE';
      if (!this.remoteSites.has(siteId)) {
        this.registerRemoteSite(siteId, { name: `Auto-Site-${siteId}` });
      }
    }
  }

  handleIndustrialError(error, nodeId, signalType) {
    logger.error(`❌ Industrial error in ${signalType} from ${nodeId}: ${error.message}`);
    this.metrics.protocolErrors++;
  }

  getActiveAlarms() {
    // Return active alarm conditions
    return [];
  }

  getProcessTrends() {
    // Return process variable trends
    return {};
  }

  /**
   * Register a remote industrial site
   */
  registerRemoteSite(siteId, siteConfig = {}) {
    if (this.remoteSites.size >= this.config.maxRemoteSites) {
      throw new Error('Maximum remote sites capacity reached');
    }

    const site = {
      id: siteId,
      name: siteConfig.name || `Site-${siteId}`,
      location: siteConfig.location || 'UNKNOWN',
      type: siteConfig.type || 'PRODUCTION', // PRODUCTION, TESTING, MAINTENANCE
      status: 'ONLINE',
      controllers: new Map(),
      protocol: siteConfig.protocol || 'BAMBI_NATIVE',
      redundancy: siteConfig.redundancy || this.config.redundancyLevel,
      lastCommunication: Date.now(),
      metrics: {
        commandsProcessed: 0,
        alarmsRaised: 0,
        uptime: 0,
        communicationErrors: 0
      },
      processVariables: new Map(),
      alarmLimits: siteConfig.alarmLimits || {},
      created: Date.now()
    };

    this.remoteSites.set(siteId, site);
    this.metrics.remoteSitesOnline++;
    
    logger.info(`🏭 Remote site registered: ${siteId} (${site.name}, protocol: ${site.protocol})`);
    this.emit('siteRegistered', site);
    
    return site;
  }

  /**
   * Register a DCS controller
   */
  registerDCSController(controllerId, siteId, controllerConfig = {}) {
    const site = this.remoteSites.get(siteId);
    if (!site) {
      throw new Error(`Site ${siteId} not found`);
    }

    if (site.controllers.size >= this.config.maxControllersPerSite) {
      throw new Error(`Maximum controllers per site (${this.config.maxControllersPerSite}) reached`);
    }

    const controller = {
      id: controllerId,
      siteId,
      type: 'DCS_CONTROLLER',
      status: 'ACTIVE',
      controlLoops: controllerConfig.controlLoops || [],
      setpoints: new Map(),
      processVariables: new Map(),
      alarms: new Map(),
      lastUpdate: Date.now(),
      configuration: controllerConfig,
      redundancyPair: controllerConfig.redundancyPair || null
    };

    site.controllers.set(controllerId, controller);
    this.dcsControllers.set(controllerId, controller);
    this.metrics.dcsControllersActive++;
    
    logger.info(`⚙️ DCS Controller registered: ${controllerId} at site ${siteId}`);
    this.emit('dcsControllerRegistered', controller);
    
    return controller;
  }

  /**
   * Register a SCADA workstation
   */
  registerSCADAWorkstation(workstationId, config = {}) {
    const workstation = {
      id: workstationId,
      type: 'SCADA_WORKSTATION',
      status: 'OPERATIONAL',
      authorizedSites: config.authorizedSites || [],
      privileges: config.privileges || ['MONITOR', 'CONTROL'],
      lastLogin: Date.now(),
      activeOperator: config.operator || 'SYSTEM',
      displayConfig: config.displayConfig || {},
      alarmManagement: {
        acknowledged: new Map(),
        suppressed: new Map(),
        filtered: config.alarmFilters || []
      }
    };

    this.scadaWorkstations.set(workstationId, workstation);
    this.metrics.scadaWorkstationsConnected++;
    
    logger.info(`🖥️ SCADA Workstation registered: ${workstationId} (operator: ${workstation.activeOperator})`);
    this.emit('scadaWorkstationRegistered', workstation);
    
    return workstation;
  }
}

// Export singleton instance with enhanced industrial configuration
const bambiIndustrialControlSystem = new BambiDistributedIndustrialControlSystem({
  rateLimitMax: 200, // Allow 200 signals per minute per node (industrial grade)
  maxNodes: 5000,    // Support up to 5000 concurrent industrial nodes
  maxRemoteSites: 100, // Support 100 remote industrial sites
  maxControllersPerSite: 50, // 50 DCS controllers per site
  staleThreshold: 15 * 60 * 1000, // 15 minutes for industrial reliability
  healthCheckInterval: 30000,      // 30 seconds health checks
  scadaUpdateInterval: 500,        // 500ms SCADA refresh rate
  dcsLoopTime: 50,                // 50ms DCS control loop time
  communicationTimeout: 3000,      // 3 second communication timeout
  redundancyLevel: 'DUAL',        // Dual redundancy for industrial reliability
  priorityLevels: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL', 'SAFETY', 'EMERGENCY'],
  protocolVersions: ['BAMBI_NATIVE', 'MODBUS', 'ETHERNET_IP', 'PROFINET'],
  industrialGrade: true
});

export default bambiIndustrialControlSystem;
