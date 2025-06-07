/**
 * DCS (Distributed Control System) Controller Manager
 * Manages DCS controllers, their control loops, and process control operations
 */

import { EventEmitter } from 'events';
import Logger from '../../utils/logger.js';

const logger = new Logger('DCS');

export class DCSControllerManager extends EventEmitter {
  constructor(controlNetwork) {
    super();
    this.controlNetwork = controlNetwork;
    this.controllers = new Map();
    this.controllerGroups = new Map();
    this.processVariables = new Map();
    this.setpoints = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    logger.info('⚙️ Initializing DCS Controller Manager...');
    
    // Set up default controller groups
    this.setupDefaultControllerGroups();
    
    // Initialize process variables
    this.initializeProcessVariables();
    
    this.isInitialized = true;
    logger.info('✅ DCS Controller Manager initialized');
  }

  setupDefaultControllerGroups() {
    const groups = [
      {
        id: 'TRIGGER_CONTROL',
        name: 'Trigger Control Group',
        description: 'Controllers managing trigger activation and intensity',
        priority: 'HIGH'
      },
      {
        id: 'AUDIO_CONTROL',
        name: 'Audio Control Group',
        description: 'Controllers managing audio processing and effects',
        priority: 'NORMAL'
      },
      {
        id: 'USER_INTERACTION',
        name: 'User Interaction Group',
        description: 'Controllers managing user engagement and responses',
        priority: 'HIGH'
      }
    ];

    for (const group of groups) {
      this.controllerGroups.set(group.id, {
        ...group,
        controllers: new Set(),
        created: Date.now()
      });
    }

    logger.info(`📊 Created ${groups.length} default controller groups`);
  }

  initializeProcessVariables() {
    const processVars = [
      { name: 'TRIGGER_INTENSITY', value: 0.5, units: 'percent', min: 0, max: 1 },
      { name: 'AUDIO_LEVEL', value: 0.7, units: 'percent', min: 0, max: 1 },
      { name: 'USER_ENGAGEMENT', value: 0.8, units: 'percent', min: 0, max: 1 },
      { name: 'SYSTEM_LOAD', value: 0.3, units: 'percent', min: 0, max: 1 },
      { name: 'NETWORK_LATENCY', value: 50, units: 'ms', min: 0, max: 1000 }
    ];

    for (const pv of processVars) {
      this.processVariables.set(pv.name, {
        ...pv,
        timestamp: Date.now(),
        quality: 'GOOD'
      });
    }

    logger.info(`📈 Initialized ${processVars.length} process variables`);
  }

  async registerController(controllerId, config = {}) {
    if (this.controllers.has(controllerId)) {
      throw new Error(`Controller ${controllerId} already registered`);
    }

    const controller = {
      id: controllerId,
      name: config.name || `Controller-${controllerId}`,
      type: config.type || 'STANDARD',
      siteId: config.siteId || 'LOCAL',
      status: 'INITIALIZING',
      controlLoops: new Map(),
      processOutputs: new Map(),
      alarms: new Map(),
      configuration: config,
      redundancyPair: config.redundancyPair || null,
      lastUpdate: Date.now(),
      metrics: {
        commandsProcessed: 0,
        loopsExecuted: 0,
        alarmsRaised: 0,
        uptime: 0
      }
    };

    // Add to appropriate group if specified
    if (config.group && this.controllerGroups.has(config.group)) {
      this.controllerGroups.get(config.group).controllers.add(controllerId);
      controller.group = config.group;
    }

    this.controllers.set(controllerId, controller);
    
    // Register with main control network
    await this.controlNetwork.registerControlNode(controllerId, 'DCS_CONTROLLER', {
      ...config,
      controllerType: controller.type,
      siteId: controller.siteId
    });

    controller.status = 'ACTIVE';
    
    logger.info(`✅ DCS Controller registered: ${controllerId} (${controller.type})`);
    this.emit('controllerRegistered', controller);
    
    return controller;
  }

  async processSignal(signalData, sourceNodeId) {
    const controller = this.controllers.get(sourceNodeId);
    if (!controller) {
      throw new Error(`Unknown controller: ${sourceNodeId}`);
    }

    controller.lastUpdate = Date.now();
    controller.metrics.commandsProcessed++;

    switch (signalData.command) {
      case 'UPDATE_SETPOINT':
        return await this.updateSetpoint(controller, signalData);
      
      case 'EXECUTE_CONTROL_LOOP':
        return await this.executeControlLoop(controller, signalData);
      
      case 'RAISE_ALARM':
        return await this.raiseAlarm(controller, signalData);
      
      case 'UPDATE_PROCESS_OUTPUT':
        return await this.updateProcessOutput(controller, signalData);
      
      default:
        logger.warning(`Unknown DCS command: ${signalData.command}`);
        return { success: false, error: 'Unknown command' };
    }
  }

  async updateSetpoint(controller, signalData) {
    const { loopId, setpoint, source } = signalData;
    
    if (!controller.controlLoops.has(loopId)) {
      controller.controlLoops.set(loopId, {
        id: loopId,
        setpoint: setpoint,
        processVariable: 0,
        output: 0,
        enabled: true,
        mode: 'AUTO'
      });
    }

    const loop = controller.controlLoops.get(loopId);
    const oldSetpoint = loop.setpoint;
    loop.setpoint = setpoint;
    loop.lastUpdate = Date.now();

    logger.info(`🎯 Setpoint updated for ${controller.id}/${loopId}: ${oldSetpoint} → ${setpoint}`);
    
    this.emit('setpointChanged', {
      controllerId: controller.id,
      loopId,
      oldSetpoint,
      newSetpoint: setpoint,
      source
    });

    return { success: true, loopId, setpoint };
  }

  async executeControlLoop(controller, signalData) {
    const { loopId } = signalData;
    const loop = controller.controlLoops.get(loopId);
    
    if (!loop || !loop.enabled) {
      return { success: false, error: 'Loop not found or disabled' };
    }

    // Simple PID control logic (simplified)
    const error = loop.setpoint - loop.processVariable;
    const output = Math.max(0, Math.min(1, loop.output + (error * 0.1)));
    
    loop.output = output;
    loop.lastExecution = Date.now();
    
    controller.metrics.loopsExecuted++;
    
    this.emit('loopExecuted', {
      controllerId: controller.id,
      loopId,
      setpoint: loop.setpoint,
      processVariable: loop.processVariable,
      output
    });

    return { success: true, loopId, output };
  }

  async raiseAlarm(controller, signalData) {
    const { alarmId, severity, description, processVariable } = signalData;
    
    const alarm = {
      id: alarmId,
      severity: severity || 'LOW',
      description,
      processVariable,
      timestamp: Date.now(),
      acknowledged: false,
      controllerId: controller.id
    };

    controller.alarms.set(alarmId, alarm);
    controller.metrics.alarmsRaised++;

    logger.warning(`🚨 Alarm raised by ${controller.id}: ${description} (${severity})`);
    
    this.emit('alarmRaised', alarm);

    return { success: true, alarmId };
  }

  async updateProcessOutput(controller, signalData) {
    const { outputId, value, timestamp } = signalData;
    
    controller.processOutputs.set(outputId, {
      id: outputId,
      value,
      timestamp: timestamp || Date.now(),
      controllerId: controller.id
    });

    // Update process variable if it exists
    if (this.processVariables.has(outputId)) {
      const pv = this.processVariables.get(outputId);
      pv.value = value;
      pv.timestamp = Date.now();
      pv.quality = 'GOOD';
    }

    this.emit('processOutputUpdated', {
      controllerId: controller.id,
      outputId,
      value
    });

    return { success: true, outputId, value };
  }

  async processOperatorCommand(commandData) {
    const { controllerId, command, parameters } = commandData;
    const controller = this.controllers.get(controllerId);
    
    if (!controller) {
      throw new Error(`Controller not found: ${controllerId}`);
    }

    logger.info(`👨‍💼 Operator command for ${controllerId}: ${command}`);
    
    switch (command) {
      case 'START_CONTROLLER':
        controller.status = 'ACTIVE';
        break;
      
      case 'STOP_CONTROLLER':
        controller.status = 'STOPPED';
        break;
      
      case 'ENABLE_LOOP':
        if (parameters.loopId && controller.controlLoops.has(parameters.loopId)) {
          controller.controlLoops.get(parameters.loopId).enabled = true;
        }
        break;
      
      case 'DISABLE_LOOP':
        if (parameters.loopId && controller.controlLoops.has(parameters.loopId)) {
          controller.controlLoops.get(parameters.loopId).enabled = false;
        }
        break;
    }

    this.emit('operatorCommandExecuted', { controllerId, command, parameters });
    
    return { success: true, controllerId, command };
  }

  async updateControlOutput(outputData) {
    const { controllerId, loopId, output } = outputData;
    const controller = this.controllers.get(controllerId);
    
    if (controller && controller.controlLoops.has(loopId)) {
      const loop = controller.controlLoops.get(loopId);
      loop.output = output;
      loop.lastUpdate = Date.now();
      
      this.emit('controlOutputUpdated', { controllerId, loopId, output });
    }
  }

  async executeAutomatedAction(actionData) {
    const { controllerId, action, parameters } = actionData;
    const controller = this.controllers.get(controllerId);
    
    if (!controller) {
      logger.warning(`Cannot execute automated action: Controller ${controllerId} not found`);
      return;
    }

    logger.info(`🤖 Executing automated action on ${controllerId}: ${action}`);
    
    // Execute the automated action
    await this.processOperatorCommand({
      controllerId,
      command: action,
      parameters,
      source: 'AUTOMATION'
    });
  }

  handleControllerFailure(failureData) {
    const { controllerId, reason } = failureData;
    const controller = this.controllers.get(controllerId);
    
    if (controller) {
      controller.status = 'FAILED';
      controller.failureReason = reason;
      controller.failureTimestamp = Date.now();
      
      logger.error(`❌ Controller failure: ${controllerId} - ${reason}`);
      
      // Attempt failover if redundancy pair exists
      if (controller.redundancyPair) {
        this.initiateFailover(controllerId, controller.redundancyPair);
      }
      
      this.emit('controllerFailed', { controllerId, reason });
    }
  }

  async initiateFailover(failedControllerId, backupControllerId) {
    logger.info(`🔄 Initiating failover: ${failedControllerId} → ${backupControllerId}`);
    
    const failedController = this.controllers.get(failedControllerId);
    const backupController = this.controllers.get(backupControllerId);
    
    if (backupController) {
      // Transfer control loops to backup
      for (const [loopId, loop] of failedController.controlLoops) {
        backupController.controlLoops.set(loopId, { ...loop });
      }
      
      backupController.status = 'ACTIVE';
      
      this.emit('failoverCompleted', { 
        failedControllerId, 
        backupControllerId 
      });
    }
  }

  async emergencyShutdown() {
    logger.error('🚨 DCS Emergency Shutdown Initiated');
    
    for (const [controllerId, controller] of this.controllers) {
      controller.status = 'EMERGENCY_STOP';
      
      // Disable all control loops
      for (const [loopId, loop] of controller.controlLoops) {
        loop.enabled = false;
        loop.output = 0;
      }
      
      logger.info(`🛑 Emergency shutdown completed for controller: ${controllerId}`);
    }
    
    this.emit('emergencyShutdownCompleted');
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      controllerCount: this.controllers.size,
      activeControllers: Array.from(this.controllers.values())
        .filter(c => c.status === 'ACTIVE').length,
      controllerGroups: Array.from(this.controllerGroups.values()),
      processVariables: Array.from(this.processVariables.values()),
      totalLoops: Array.from(this.controllers.values())
        .reduce((total, controller) => total + controller.controlLoops.size, 0)
    };
  }

  async shutdown() {
    if (!this.isInitialized) return;
    
    logger.info('🔴 Shutting down DCS Controller Manager...');
    
    // Gracefully shutdown all controllers
    for (const [controllerId, controller] of this.controllers) {
      controller.status = 'SHUTDOWN';
      
      // Disable all control loops safely
      for (const [loopId, loop] of controller.controlLoops) {
        loop.enabled = false;
      }
    }
    
    this.controllers.clear();
    this.controllerGroups.clear();
    this.processVariables.clear();
    this.setpoints.clear();
    
    this.isInitialized = false;
    logger.info('✅ DCS Controller Manager shutdown complete');
  }
}

export default DCSControllerManager;
