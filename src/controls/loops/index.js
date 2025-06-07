/**
 * Control Loop Manager
 * Manages PID controllers, fuzzy logic controllers, and other control algorithms
 */

import { EventEmitter } from 'events';
import Logger from '../../utils/logger.js';

const logger = new Logger('ControlLoops');

export class ControlLoopManager extends EventEmitter {
  constructor(controlNetwork) {
    super();
    this.controlNetwork = controlNetwork;
    this.loops = new Map();
    this.controllers = new Map();
    this.tuningProfiles = new Map();
    this.loopGroups = new Map();
    this.executionTimer = null;
    this.isInitialized = false;
  }

  async initialize() {
    logger.info('⚙️ Initializing Control Loop Manager...');
    
    // Initialize control algorithms
    this.initializeControllers();
    
    // Set up default tuning profiles
    this.setupTuningProfiles();
    
    // Create default loop groups
    this.setupDefaultLoopGroups();
    
    // Start loop execution
    this.startLoopExecution();
    
    this.isInitialized = true;
    logger.info('✅ Control Loop Manager initialized');
  }

  initializeControllers() {
    // PID Controller
    this.controllers.set('PID', {
      name: 'PID Controller',
      description: 'Proportional-Integral-Derivative Controller',
      execute: this.executePIDController.bind(this),
      tuningParameters: ['kp', 'ki', 'kd', 'outputMin', 'outputMax']
    });

    // Fuzzy Logic Controller
    this.controllers.set('FUZZY', {
      name: 'Fuzzy Logic Controller',
      description: 'Fuzzy Logic Control System',
      execute: this.executeFuzzyController.bind(this),
      tuningParameters: ['rules', 'membershipFunctions', 'defuzzificationMethod']
    });

    // On-Off Controller
    this.controllers.set('ON_OFF', {
      name: 'On-Off Controller',
      description: 'Simple On-Off Bang-Bang Controller',
      execute: this.executeOnOffController.bind(this),
      tuningParameters: ['threshold', 'hysteresis']
    });

    // Model Predictive Controller
    this.controllers.set('MPC', {
      name: 'Model Predictive Controller',
      description: 'Model Predictive Control',
      execute: this.executeMPCController.bind(this),
      tuningParameters: ['horizonLength', 'constraints', 'weights']
    });

    logger.info(`🎛️ Initialized ${this.controllers.size} control algorithms`);
  }

  setupTuningProfiles() {
    const profiles = [
      {
        id: 'TRIGGER_AGGRESSIVE',
        name: 'Aggressive Trigger Control',
        type: 'PID',
        parameters: { kp: 2.0, ki: 0.5, kd: 0.1, outputMin: 0, outputMax: 1 }
      },
      {
        id: 'TRIGGER_CONSERVATIVE',
        name: 'Conservative Trigger Control',
        type: 'PID',
        parameters: { kp: 0.8, ki: 0.1, kd: 0.05, outputMin: 0, outputMax: 1 }
      },
      {
        id: 'AUDIO_SMOOTH',
        name: 'Smooth Audio Control',
        type: 'PID',
        parameters: { kp: 1.2, ki: 0.3, kd: 0.02, outputMin: 0, outputMax: 1 }
      },
      {
        id: 'ENGAGEMENT_FUZZY',
        name: 'User Engagement Fuzzy Control',
        type: 'FUZZY',
        parameters: {
          rules: [
            'IF engagement IS low THEN output IS high',
            'IF engagement IS medium THEN output IS medium',
            'IF engagement IS high THEN output IS low'
          ],
          membershipFunctions: {
            engagement: { low: [0, 0, 0.3], medium: [0.2, 0.5, 0.8], high: [0.7, 1.0, 1.0] },
            output: { low: [0, 0, 0.3], medium: [0.2, 0.5, 0.8], high: [0.7, 1.0, 1.0] }
          }
        }
      }
    ];

    for (const profile of profiles) {
      this.tuningProfiles.set(profile.id, profile);
    }

    logger.info(`🎯 Created ${profiles.length} tuning profiles`);
  }

  setupDefaultLoopGroups() {
    const groups = [
      {
        id: 'TRIGGER_SYSTEM',
        name: 'Trigger Control System',
        priority: 'HIGH',
        executionRate: 50 // 50ms
      },
      {
        id: 'AUDIO_SYSTEM',
        name: 'Audio Control System',
        priority: 'NORMAL',
        executionRate: 100 // 100ms
      },
      {
        id: 'USER_SYSTEM',
        name: 'User Engagement System',
        priority: 'NORMAL',
        executionRate: 500 // 500ms
      }
    ];

    for (const group of groups) {
      this.loopGroups.set(group.id, {
        ...group,
        loops: new Set(),
        lastExecution: 0,
        created: Date.now()
      });
    }

    logger.info(`📊 Created ${groups.length} loop groups`);
  }

  async registerLoop(loopId, config = {}) {
    if (this.loops.has(loopId)) {
      throw new Error(`Control loop ${loopId} already registered`);
    }

    const controllerType = config.type || 'PID';
    const controller = this.controllers.get(controllerType);
    
    if (!controller) {
      throw new Error(`Unknown controller type: ${controllerType}`);
    }

    const loop = {
      id: loopId,
      name: config.name || loopId,
      type: controllerType,
      description: config.description || '',
      
      // Control variables
      setpoint: config.setpoint || 0,
      processVariable: config.processVariable || 0,
      output: config.output || 0,
      
      // Control parameters
      tuningProfile: config.tuningProfile || null,
      parameters: config.parameters || this.getDefaultParameters(controllerType),
      
      // State variables
      enabled: config.enabled !== false,
      mode: config.mode || 'AUTO', // AUTO, MANUAL, CASCADE
      
      // Execution control
      executionRate: config.executionRate || 100, // ms
      lastExecution: 0,
      
      // History for derivative calculations
      history: {
        errors: [],
        outputs: [],
        processVariables: [],
        maxLength: 100
      },
      
      // Statistics
      metrics: {
        executionCount: 0,
        totalError: 0,
        averageError: 0,
        maxError: 0,
        settlingTime: 0,
        overshoot: 0
      },
      
      // Safety limits
      limits: {
        outputMin: config.outputMin || 0,
        outputMax: config.outputMax || 1,
        rateOfChangeLimit: config.rateOfChangeLimit || null
      },
      
      created: Date.now()
    };

    // Add to group if specified
    if (config.group && this.loopGroups.has(config.group)) {
      this.loopGroups.get(config.group).loops.add(loopId);
      loop.group = config.group;
    }

    this.loops.set(loopId, loop);
    
    logger.info(`✅ Control loop registered: ${loopId} (${controllerType})`);
    this.emit('loopRegistered', loop);
    
    return loop;
  }

  getDefaultParameters(controllerType) {
    switch (controllerType) {
      case 'PID':
        return { kp: 1.0, ki: 0.1, kd: 0.05, outputMin: 0, outputMax: 1 };
      
      case 'FUZZY':
        return {
          rules: ['IF error IS zero THEN output IS zero'],
          membershipFunctions: {
            error: { negative: [-1, -1, 0], zero: [-0.1, 0, 0.1], positive: [0, 1, 1] },
            output: { negative: [-1, -1, 0], zero: [-0.1, 0, 0.1], positive: [0, 1, 1] }
          }
        };
      
      case 'ON_OFF':
        return { threshold: 0.5, hysteresis: 0.05 };
      
      case 'MPC':
        return { horizonLength: 10, constraints: {}, weights: { output: 1.0, error: 10.0 } };
      
      default:
        return {};
    }
  }

  startLoopExecution() {
    // Execute control loops at high frequency
    this.executionTimer = setInterval(() => {
      this.executeControlLoops();
    }, 10); // 10ms base execution rate

    logger.info('🔄 Control loop execution started');
  }

  executeControlLoops() {
    const now = Date.now();
    
    for (const [loopId, loop] of this.loops) {
      if (!loop.enabled) continue;
      
      // Check if it's time to execute this loop
      if (now - loop.lastExecution >= loop.executionRate) {
        this.executeLoop(loop, now);
      }
    }
  }

  async executeLoop(loop, timestamp) {
    try {
      const controller = this.controllers.get(loop.type);
      if (!controller) {
        logger.warning(`Controller not found for loop ${loop.id}: ${loop.type}`);
        return;
      }

      // Calculate error
      const error = loop.setpoint - loop.processVariable;
      
      // Execute control algorithm
      const result = await controller.execute(loop, error, timestamp);
      
      // Apply rate limiting if configured
      let newOutput = result.output;
      if (loop.limits.rateOfChangeLimit) {
        const maxChange = loop.limits.rateOfChangeLimit * (timestamp - loop.lastExecution) / 1000;
        const outputChange = newOutput - loop.output;
        
        if (Math.abs(outputChange) > maxChange) {
          newOutput = loop.output + Math.sign(outputChange) * maxChange;
        }
      }
      
      // Apply output limits
      newOutput = Math.max(loop.limits.outputMin, Math.min(loop.limits.outputMax, newOutput));
      
      // Update loop state
      loop.output = newOutput;
      loop.lastExecution = timestamp;
      loop.metrics.executionCount++;
      
      // Update history
      this.updateLoopHistory(loop, error, newOutput);
      
      // Update metrics
      this.updateLoopMetrics(loop, error);
      
      // Emit loop output event
      this.emit('loopOutput', {
        loopId: loop.id,
        setpoint: loop.setpoint,
        processVariable: loop.processVariable,
        output: newOutput,
        error: error,
        timestamp: timestamp
      });
      
    } catch (error) {
      logger.error(`❌ Error executing loop ${loop.id}:`, error);
      loop.enabled = false; // Disable loop on error
    }
  }

  // PID Controller Implementation
  async executePIDController(loop, error, timestamp) {
    const { kp, ki, kd } = loop.parameters;
    const dt = (timestamp - loop.lastExecution) / 1000; // Convert to seconds
    
    // Proportional term
    const proportional = kp * error;
    
    // Integral term
    if (!loop.integral) loop.integral = 0;
    loop.integral += error * dt;
    const integral = ki * loop.integral;
    
    // Derivative term
    let derivative = 0;
    if (loop.history.errors.length > 0) {
      const lastError = loop.history.errors[loop.history.errors.length - 1];
      derivative = kd * (error - lastError) / dt;
    }
    
    const output = proportional + integral + derivative;
    
    return {
      output: output,
      components: {
        proportional: proportional,
        integral: integral,
        derivative: derivative
      }
    };
  }

  // Fuzzy Logic Controller Implementation
  async executeFuzzyController(loop, error, timestamp) {
    const { rules, membershipFunctions } = loop.parameters;
    
    // Fuzzification
    const errorMembership = this.fuzzify(error, membershipFunctions.error);
    
    // Rule evaluation
    let outputMembership = {};
    for (const rule of rules) {
      const ruleOutput = this.evaluateFuzzyRule(rule, errorMembership);
      this.combineMembership(outputMembership, ruleOutput);
    }
    
    // Defuzzification (centroid method)
    const output = this.defuzzify(outputMembership, membershipFunctions.output);
    
    return { output: output };
  }

  // On-Off Controller Implementation
  async executeOnOffController(loop, error, timestamp) {
    const { threshold, hysteresis } = loop.parameters;
    
    let output = loop.output;
    
    if (error > threshold + hysteresis) {
      output = 1;
    } else if (error < threshold - hysteresis) {
      output = 0;
    }
    // Otherwise maintain current output (hysteresis)
    
    return { output: output };
  }

  // Model Predictive Controller Implementation (simplified)
  async executeMPCController(loop, error, timestamp) {
    const { horizonLength, weights } = loop.parameters;
    
    // Simplified MPC - predict future errors and optimize
    let optimalOutput = loop.output;
    let minCost = Infinity;
    
    // Simple optimization - try different output values
    for (let testOutput = 0; testOutput <= 1; testOutput += 0.1) {
      const cost = this.calculateMPCCost(loop, testOutput, horizonLength, weights);
      if (cost < minCost) {
        minCost = cost;
        optimalOutput = testOutput;
      }
    }
    
    return { output: optimalOutput };
  }

  calculateMPCCost(loop, testOutput, horizonLength, weights) {
    // Simplified cost calculation
    const errorWeight = weights.error || 1.0;
    const outputWeight = weights.output || 1.0;
    
    const errorCost = errorWeight * Math.pow(loop.setpoint - loop.processVariable, 2);
    const outputCost = outputWeight * Math.pow(testOutput - loop.output, 2);
    
    return errorCost + outputCost;
  }

  fuzzify(value, membershipFunctions) {
    const result = {};
    
    for (const [label, points] of Object.entries(membershipFunctions)) {
      result[label] = this.calculateMembership(value, points);
    }
    
    return result;
  }

  calculateMembership(value, points) {
    const [a, b, c] = points;
    
    if (value <= a || value >= c) return 0;
    if (value === b) return 1;
    if (value < b) return (value - a) / (b - a);
    return (c - value) / (c - b);
  }

  evaluateFuzzyRule(rule, membership) {
    // Simplified rule evaluation
    // In a real implementation, this would parse the rule properly
    return { medium: 0.5 }; // Simplified output
  }

  combineMembership(target, source) {
    for (const [key, value] of Object.entries(source)) {
      target[key] = Math.max(target[key] || 0, value);
    }
  }

  defuzzify(membership, outputFunctions) {
    // Centroid defuzzification
    let numerator = 0;
    let denominator = 0;
    
    for (let x = 0; x <= 1; x += 0.01) {
      let membershipValue = 0;
      
      for (const [label, points] of Object.entries(outputFunctions)) {
        const mu = this.calculateMembership(x, points);
        membershipValue = Math.max(membershipValue, mu * (membership[label] || 0));
      }
      
      numerator += x * membershipValue;
      denominator += membershipValue;
    }
    
    return denominator > 0 ? numerator / denominator : 0;
  }

  updateLoopHistory(loop, error, output) {
    const history = loop.history;
    
    // Add new values
    history.errors.push(error);
    history.outputs.push(output);
    history.processVariables.push(loop.processVariable);
    
    // Maintain max length
    if (history.errors.length > history.maxLength) {
      history.errors.shift();
      history.outputs.shift();
      history.processVariables.shift();
    }
  }

  updateLoopMetrics(loop, error) {
    const metrics = loop.metrics;
    
    // Update error statistics
    metrics.totalError += Math.abs(error);
    metrics.averageError = metrics.totalError / metrics.executionCount;
    metrics.maxError = Math.max(metrics.maxError, Math.abs(error));
  }

  async updateLoop(loopData, sourceNodeId) {
    const { loopId, updates } = loopData;
    const loop = this.loops.get(loopId);
    
    if (!loop) {
      throw new Error(`Control loop not found: ${loopId}`);
    }

    // Update loop properties
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'setpoint') {
        loop.setpoint = value;
        logger.info(`🎯 Setpoint updated for loop ${loopId}: ${value}`);
      } else if (key === 'processVariable') {
        loop.processVariable = value;
      } else if (key === 'enabled') {
        loop.enabled = value;
        logger.info(`⚙️ Loop ${loopId} ${value ? 'enabled' : 'disabled'}`);
      } else if (key === 'parameters') {
        loop.parameters = { ...loop.parameters, ...value };
        logger.info(`🔧 Parameters updated for loop ${loopId}`);
      }
    }

    this.emit('loopUpdated', {
      loopId,
      updates,
      sourceNodeId
    });

    return { success: true, loopId };
  }

  updateSetpoint(commandData) {
    const { loopId, setpoint } = commandData;
    const loop = this.loops.get(loopId);
    
    if (loop) {
      loop.setpoint = setpoint;
      logger.info(`🎯 Setpoint updated: ${loopId} = ${setpoint}`);
      
      this.emit('setpointUpdated', {
        loopId,
        setpoint,
        timestamp: Date.now()
      });
    }
  }

  async tuneLoop(loopId, tuningProfileId) {
    const loop = this.loops.get(loopId);
    const profile = this.tuningProfiles.get(tuningProfileId);
    
    if (!loop || !profile) {
      throw new Error(`Loop or tuning profile not found: ${loopId}, ${tuningProfileId}`);
    }

    if (loop.type !== profile.type) {
      throw new Error(`Controller type mismatch: ${loop.type} vs ${profile.type}`);
    }

    loop.parameters = { ...profile.parameters };
    loop.tuningProfile = tuningProfileId;

    logger.info(`🔧 Loop tuned: ${loopId} with profile ${tuningProfileId}`);
    
    this.emit('loopTuned', {
      loopId,
      tuningProfileId,
      parameters: loop.parameters
    });

    return { success: true, loopId, tuningProfileId };
  }

  getLoop(loopId) {
    return this.loops.get(loopId);
  }

  getLoopsByGroup(groupId) {
    const group = this.loopGroups.get(groupId);
    if (!group) return [];
    
    return Array.from(group.loops).map(loopId => this.loops.get(loopId));
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      totalLoops: this.loops.size,
      enabledLoops: Array.from(this.loops.values()).filter(loop => loop.enabled).length,
      controllerTypes: Array.from(this.controllers.keys()),
      tuningProfiles: this.tuningProfiles.size,
      loopGroups: this.loopGroups.size,
      loops: Array.from(this.loops.values()).map(loop => ({
        id: loop.id,
        name: loop.name,
        type: loop.type,
        enabled: loop.enabled,
        setpoint: loop.setpoint,
        processVariable: loop.processVariable,
        output: loop.output,
        metrics: loop.metrics
      }))
    };
  }

  async shutdown() {
    if (!this.isInitialized) return;
    
    logger.info('🔴 Shutting down Control Loop Manager...');
    
    // Stop loop execution
    if (this.executionTimer) {
      clearInterval(this.executionTimer);
    }
    
    // Disable all loops
    for (const [loopId, loop] of this.loops) {
      loop.enabled = false;
      loop.output = 0;
    }
    
    this.loops.clear();
    this.controllers.clear();
    this.tuningProfiles.clear();
    this.loopGroups.clear();
    
    this.isInitialized = false;
    logger.info('✅ Control Loop Manager shutdown complete');
  }
}

export default ControlLoopManager;
