/**
 * Automation Rule Manager
 * Manages automation rules, triggers, and scripted responses
 */

import { EventEmitter } from 'events';
import Logger from '../../utils/logger.js';

const logger = new Logger('Automation');

export class AutomationRuleManager extends EventEmitter {
  constructor(controlNetwork) {
    super();
    this.controlNetwork = controlNetwork;
    this.rules = new Map();
    this.ruleGroups = new Map();
    this.conditions = new Map();
    this.actions = new Map();
    this.scripts = new Map();
    this.schedules = new Map();
    this.evaluationTimer = null;
    this.isInitialized = false;
  }

  async initialize() {
    logger.info('🤖 Initializing Automation Rule Manager...');
    
    // Initialize built-in conditions and actions
    this.initializeConditions();
    this.initializeActions();
    
    // Set up default rule groups
    this.setupDefaultRuleGroups();
    
    // Load default automation rules
    this.loadDefaultRules();
    
    // Start rule evaluation
    this.startRuleEvaluation();
    
    this.isInitialized = true;
    logger.info('✅ Automation Rule Manager initialized');
  }

  initializeConditions() {
    const conditions = [
      {
        id: 'SIGNAL_TYPE',
        name: 'Signal Type Check',
        description: 'Check if signal matches specific type',
        evaluate: (signal, parameters) => signal.type === parameters.expectedType
      },
      {
        id: 'VALUE_THRESHOLD',
        name: 'Value Threshold',
        description: 'Check if value exceeds threshold',
        evaluate: (signal, parameters) => {
          const value = this.extractValue(signal, parameters.valuePath);
          return this.compareValue(value, parameters.operator, parameters.threshold);
        }
      },
      {
        id: 'TIME_CONDITION',
        name: 'Time-based Condition',
        description: 'Check time-based conditions',
        evaluate: (signal, parameters) => this.evaluateTimeCondition(parameters)
      },
      {
        id: 'NODE_STATUS',
        name: 'Node Status Check',
        description: 'Check node status conditions',
        evaluate: (signal, parameters) => this.evaluateNodeStatus(signal, parameters)
      },
      {
        id: 'SYSTEM_HEALTH',
        name: 'System Health Check',
        description: 'Check overall system health',
        evaluate: (signal, parameters) => this.evaluateSystemHealth(parameters)
      },
      {
        id: 'COMPOSITE',
        name: 'Composite Condition',
        description: 'Combine multiple conditions with logic operators',
        evaluate: (signal, parameters) => this.evaluateCompositeCondition(signal, parameters)
      }
    ];

    for (const condition of conditions) {
      this.conditions.set(condition.id, condition);
    }

    logger.info(`✅ Initialized ${conditions.length} condition types`);
  }

  initializeActions() {
    const actions = [
      {
        id: 'SEND_SIGNAL',
        name: 'Send Control Signal',
        description: 'Send a control signal to specified nodes',
        execute: (parameters, context) => this.executeSendSignal(parameters, context)
      },
      {
        id: 'UPDATE_SETPOINT',
        name: 'Update Control Setpoint',
        description: 'Update setpoint for control loops',
        execute: (parameters, context) => this.executeUpdateSetpoint(parameters, context)
      },
      {
        id: 'TRIGGER_ALARM',
        name: 'Trigger System Alarm',
        description: 'Raise an alarm condition',
        execute: (parameters, context) => this.executeTriggerAlarm(parameters, context)
      },
      {
        id: 'LOG_EVENT',
        name: 'Log Event',
        description: 'Log an event to the system log',
        execute: (parameters, context) => this.executeLogEvent(parameters, context)
      },
      {
        id: 'EXECUTE_SCRIPT',
        name: 'Execute Script',
        description: 'Execute a custom automation script',
        execute: (parameters, context) => this.executeScript(parameters, context)
      },
      {
        id: 'MODIFY_RULE',
        name: 'Modify Rule State',
        description: 'Enable/disable other automation rules',
        execute: (parameters, context) => this.executeModifyRule(parameters, context)
      },
      {
        id: 'CONTROL_SYSTEM',
        name: 'System Control Action',
        description: 'Control system-level operations',
        execute: (parameters, context) => this.executeSystemControl(parameters, context)
      }
    ];

    for (const action of actions) {
      this.actions.set(action.id, action);
    }

    logger.info(`✅ Initialized ${actions.length} action types`);
  }

  setupDefaultRuleGroups() {
    const groups = [
      {
        id: 'SAFETY',
        name: 'Safety Rules',
        priority: 'CRITICAL',
        enabled: true,
        description: 'Safety-related automation rules'
      },
      {
        id: 'PERFORMANCE',
        name: 'Performance Optimization',
        priority: 'HIGH',
        enabled: true,
        description: 'Performance optimization rules'
      },
      {
        id: 'MAINTENANCE',
        name: 'Maintenance Rules',
        priority: 'NORMAL',
        enabled: true,
        description: 'Maintenance and housekeeping rules'
      },
      {
        id: 'USER_INTERACTION',
        name: 'User Interaction Rules',
        priority: 'NORMAL',
        enabled: true,
        description: 'Rules for user interaction automation'
      }
    ];

    for (const group of groups) {
      this.ruleGroups.set(group.id, {
        ...group,
        rules: new Set(),
        created: Date.now()
      });
    }

    logger.info(`📊 Created ${groups.length} rule groups`);
  }

  loadDefaultRules() {
    const defaultRules = [
      {
        id: 'EMERGENCY_SHUTDOWN',
        name: 'Emergency Shutdown Rule',
        group: 'SAFETY',
        priority: 'CRITICAL',
        condition: {
          type: 'COMPOSITE',
          parameters: {
            operator: 'OR',
            conditions: [
              { type: 'SIGNAL_TYPE', parameters: { expectedType: 'EMERGENCY_STOP' } },
              { type: 'SYSTEM_HEALTH', parameters: { healthLevel: 'CRITICAL' } }
            ]
          }
        },
        action: {
          type: 'CONTROL_SYSTEM',
          parameters: { command: 'EMERGENCY_SHUTDOWN', reason: 'Automated safety response' }
        }
      },
      {
        id: 'TRIGGER_CASCADE',
        name: 'Bambi Trigger Cascade',
        group: 'USER_INTERACTION',
        priority: 'HIGH',
        condition: {
          type: 'VALUE_THRESHOLD',
          parameters: {
            valuePath: 'data.triggerIntensity',
            operator: 'GREATER_THAN',
            threshold: 0.8
          }
        },
        action: {
          type: 'SEND_SIGNAL',
          parameters: {
            signalType: 'TRIGGER_CASCADE',
            targetNodes: 'ALL_ACTIVE',
            data: { cascadeLevel: 2 }
          }
        }
      },
      {
        id: 'PERFORMANCE_MONITOR',
        name: 'System Performance Monitor',
        group: 'PERFORMANCE',
        priority: 'NORMAL',
        condition: {
          type: 'VALUE_THRESHOLD',
          parameters: {
            valuePath: 'metrics.averageResponseTime',
            operator: 'GREATER_THAN',
            threshold: 1000
          }
        },
        action: {
          type: 'LOG_EVENT',
          parameters: {
            level: 'WARNING',
            message: 'System performance degraded - response time exceeded threshold'
          }
        }
      },
      {
        id: 'CLEANUP_STALE_NODES',
        name: 'Cleanup Stale Nodes',
        group: 'MAINTENANCE',
        priority: 'LOW',
        condition: {
          type: 'TIME_CONDITION',
          parameters: {
            schedule: 'PERIODIC',
            interval: 300000 // 5 minutes
          }
        },
        action: {
          type: 'CONTROL_SYSTEM',
          parameters: { command: 'CLEANUP_STALE_NODES' }
        }
      }
    ];

    for (const ruleConfig of defaultRules) {
      this.registerRule(ruleConfig.id, ruleConfig);
    }

    logger.info(`📋 Loaded ${defaultRules.length} default automation rules`);
  }

  startRuleEvaluation() {
    // Evaluate rules every 100ms
    this.evaluationTimer = setInterval(() => {
      this.evaluateRules();
    }, 100);

    logger.info('🔄 Rule evaluation started');
  }

  async registerRule(ruleId, config = {}) {
    if (this.rules.has(ruleId)) {
      throw new Error(`Automation rule ${ruleId} already registered`);
    }

    const rule = {
      id: ruleId,
      name: config.name || ruleId,
      description: config.description || '',
      group: config.group || 'USER_INTERACTION',
      priority: config.priority || 'NORMAL',
      
      // Rule logic
      condition: config.condition || {},
      action: config.action || {},
      
      // State
      enabled: config.enabled !== false,
      lastEvaluation: 0,
      lastTriggered: 0,
      
      // Timing
      cooldownPeriod: config.cooldownPeriod || 1000, // 1 second default
      evaluationInterval: config.evaluationInterval || 100, // 100ms default
      
      // Statistics
      metrics: {
        evaluationCount: 0,
        triggerCount: 0,
        successCount: 0,
        errorCount: 0,
        averageExecutionTime: 0
      },
      
      created: Date.now()
    };

    // Add to group if it exists
    if (this.ruleGroups.has(rule.group)) {
      this.ruleGroups.get(rule.group).rules.add(ruleId);
    }

    this.rules.set(ruleId, rule);
    
    logger.info(`✅ Automation rule registered: ${ruleId} (${rule.priority})`);
    this.emit('ruleRegistered', rule);
    
    return rule;
  }

  evaluateRules() {
    const now = Date.now();
    
    for (const [ruleId, rule] of this.rules) {
      if (!rule.enabled) continue;
      
      // Check if it's time to evaluate this rule
      if (now - rule.lastEvaluation < rule.evaluationInterval) continue;
      
      // Check cooldown period
      if (now - rule.lastTriggered < rule.cooldownPeriod) continue;
      
      this.evaluateRule(rule, now);
    }
  }

  async evaluateRule(rule, timestamp) {
    const startTime = Date.now();
    
    try {
      rule.lastEvaluation = timestamp;
      rule.metrics.evaluationCount++;
      
      // Get current system state as signal context
      const systemSignal = {
        type: 'SYSTEM_STATE',
        data: this.controlNetwork.getSystemStatus(),
        metrics: this.controlNetwork.getMetrics(),
        timestamp: timestamp
      };
      
      // Evaluate condition
      const conditionResult = await this.evaluateCondition(systemSignal, rule.condition);
      
      if (conditionResult) {
        // Condition met - execute action
        await this.executeAction(rule.action, {
          rule: rule,
          signal: systemSignal,
          timestamp: timestamp
        });
        
        rule.lastTriggered = timestamp;
        rule.metrics.triggerCount++;
        rule.metrics.successCount++;
        
        logger.info(`🤖 Rule triggered: ${rule.id} - ${rule.name}`);
        
        this.emit('ruleTriggered', {
          ruleId: rule.id,
          ruleName: rule.name,
          action: rule.action,
          timestamp: timestamp
        });
      }
      
      // Update execution time metric
      const executionTime = Date.now() - startTime;
      rule.metrics.averageExecutionTime = 
        (rule.metrics.averageExecutionTime * 0.9) + (executionTime * 0.1);
      
    } catch (error) {
      rule.metrics.errorCount++;
      logger.error(`❌ Error evaluating rule ${rule.id}:`, error);
    }
  }

  async evaluateCondition(signal, conditionConfig) {
    const conditionType = this.conditions.get(conditionConfig.type);
    if (!conditionType) {
      logger.warning(`Unknown condition type: ${conditionConfig.type}`);
      return false;
    }

    try {
      return await conditionType.evaluate(signal, conditionConfig.parameters || {});
    } catch (error) {
      logger.error(`❌ Error evaluating condition ${conditionConfig.type}:`, error);
      return false;
    }
  }

  async executeAction(actionConfig, context) {
    const actionType = this.actions.get(actionConfig.type);
    if (!actionType) {
      logger.warning(`Unknown action type: ${actionConfig.type}`);
      return;
    }

    try {
      await actionType.execute(actionConfig.parameters || {}, context);
    } catch (error) {
      logger.error(`❌ Error executing action ${actionConfig.type}:`, error);
      throw error;
    }
  }

  // Condition evaluation methods
  extractValue(signal, valuePath) {
    const parts = valuePath.split('.');
    let value = signal;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  compareValue(value, operator, threshold) {
    switch (operator) {
      case 'EQUALS': return value === threshold;
      case 'NOT_EQUALS': return value !== threshold;
      case 'GREATER_THAN': return value > threshold;
      case 'LESS_THAN': return value < threshold;
      case 'GREATER_EQUAL': return value >= threshold;
      case 'LESS_EQUAL': return value <= threshold;
      default: return false;
    }
  }

  evaluateTimeCondition(parameters) {
    const now = Date.now();
    
    switch (parameters.schedule) {
      case 'PERIODIC':
        return (now % parameters.interval) < 100; // 100ms window
      
      case 'DAILY':
        const dailyTime = new Date().getHours() * 3600 + new Date().getMinutes() * 60;
        return Math.abs(dailyTime - parameters.timeOfDay) < 60; // 1 minute window
      
      case 'ONCE':
        return now >= parameters.targetTime && now < parameters.targetTime + 1000;
      
      default:
        return false;
    }
  }

  evaluateNodeStatus(signal, parameters) {
    const nodeCount = this.controlNetwork.controlNodes.size;
    
    switch (parameters.condition) {
      case 'MIN_NODES':
        return nodeCount >= parameters.value;
      
      case 'MAX_NODES':
        return nodeCount <= parameters.value;
      
      case 'NO_NODES':
        return nodeCount === 0;
      
      default:
        return false;
    }
  }

  evaluateSystemHealth(parameters) {
    const systemState = this.controlNetwork.systemState;
    
    switch (parameters.healthLevel) {
      case 'HEALTHY':
        return systemState.networkHealth === 'HEALTHY';
      
      case 'DEGRADED':
        return systemState.networkHealth === 'DEGRADED';
      
      case 'CRITICAL':
        return systemState.networkHealth === 'CRITICAL';
      
      default:
        return false;
    }
  }

  evaluateCompositeCondition(signal, parameters) {
    const { operator, conditions } = parameters;
    const results = conditions.map(cond => this.evaluateCondition(signal, cond));
    
    switch (operator) {
      case 'AND':
        return results.every(result => result);
      
      case 'OR':
        return results.some(result => result);
      
      case 'NOT':
        return !results[0];
      
      default:
        return false;
    }
  }

  // Action execution methods
  async executeSendSignal(parameters, context) {
    const { signalType, targetNodes, data } = parameters;
    
    // Determine target nodes
    let nodeIds = [];
    if (targetNodes === 'ALL_ACTIVE') {
      nodeIds = Array.from(this.controlNetwork.controlNodes.keys());
    } else if (Array.isArray(targetNodes)) {
      nodeIds = targetNodes;
    } else {
      nodeIds = [targetNodes];
    }
    
    // Send signal to each target node
    for (const nodeId of nodeIds) {
      await this.controlNetwork.processControlSignal(signalType, data, nodeId);
    }
    
    logger.info(`📤 Signal sent: ${signalType} to ${nodeIds.length} nodes`);
  }

  async executeUpdateSetpoint(parameters, context) {
    const { controllerId, loopId, setpoint } = parameters;
    
    this.emit('setpointUpdate', {
      controllerId,
      loopId,
      setpoint,
      source: 'AUTOMATION',
      ruleId: context.rule.id
    });
    
    logger.info(`🎯 Setpoint updated by automation: ${controllerId}/${loopId} = ${setpoint}`);
  }

  async executeTriggerAlarm(parameters, context) {
    const alarm = {
      id: `AUTO_${Date.now()}_${context.rule.id}`,
      severity: parameters.severity || 'MEDIUM',
      description: parameters.message || 'Automated alarm triggered',
      source: 'AUTOMATION',
      ruleId: context.rule.id,
      timestamp: Date.now()
    };
    
    this.emit('alarmTriggered', alarm);
    
    logger.warning(`🚨 Automation alarm: ${alarm.description} (${alarm.severity})`);
  }

  async executeLogEvent(parameters, context) {
    const { level, message } = parameters;
    
    const logMessage = `[AUTOMATION:${context.rule.id}] ${message}`;
    
    switch (level) {
      case 'INFO':
        logger.info(logMessage);
        break;
      case 'WARNING':
        logger.warning(logMessage);
        break;
      case 'ERROR':
        logger.error(logMessage);
        break;
      default:
        logger.debug(logMessage);
    }
  }

  async executeScript(parameters, context) {
    const { scriptId, scriptData } = parameters;
    const script = this.scripts.get(scriptId);
    
    if (!script) {
      throw new Error(`Script not found: ${scriptId}`);
    }
    
    // Execute custom script (simplified)
    await script.execute(scriptData, context);
    
    logger.info(`📜 Script executed: ${scriptId}`);
  }

  async executeModifyRule(parameters, context) {
    const { ruleId, action } = parameters;
    const targetRule = this.rules.get(ruleId);
    
    if (!targetRule) {
      throw new Error(`Target rule not found: ${ruleId}`);
    }
    
    switch (action) {
      case 'ENABLE':
        targetRule.enabled = true;
        break;
      case 'DISABLE':
        targetRule.enabled = false;
        break;
      case 'RESET':
        targetRule.lastTriggered = 0;
        targetRule.metrics = { ...targetRule.metrics, triggerCount: 0, errorCount: 0 };
        break;
    }
    
    logger.info(`🔧 Rule modified: ${ruleId} - ${action}`);
  }

  async executeSystemControl(parameters, context) {
    const { command } = parameters;
    
    switch (command) {
      case 'EMERGENCY_SHUTDOWN':
        await this.controlNetwork.setSystemMode('EMERGENCY');
        break;
      
      case 'CLEANUP_STALE_NODES':
        this.controlNetwork.cleanupStaleNodes();
        break;
      
      case 'RESTART_MONITORING':
        this.controlNetwork.startSystemMonitoring();
        break;
    }
    
    logger.info(`⚙️ System control executed: ${command}`);
  }

  async enableRule(ruleId) {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      logger.info(`✅ Rule enabled: ${ruleId}`);
      this.emit('ruleEnabled', { ruleId });
    }
  }

  async disableRule(ruleId) {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      logger.info(`❌ Rule disabled: ${ruleId}`);
      this.emit('ruleDisabled', { ruleId });
    }
  }

  getRule(ruleId) {
    return this.rules.get(ruleId);
  }

  getRulesByGroup(groupId) {
    const group = this.ruleGroups.get(groupId);
    if (!group) return [];
    
    return Array.from(group.rules).map(ruleId => this.rules.get(ruleId));
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      totalRules: this.rules.size,
      enabledRules: Array.from(this.rules.values()).filter(rule => rule.enabled).length,
      ruleGroups: this.ruleGroups.size,
      conditionTypes: this.conditions.size,
      actionTypes: this.actions.size,
      rules: Array.from(this.rules.values()).map(rule => ({
        id: rule.id,
        name: rule.name,
        group: rule.group,
        priority: rule.priority,
        enabled: rule.enabled,
        metrics: rule.metrics
      }))
    };
  }

  async shutdown() {
    if (!this.isInitialized) return;
    
    logger.info('🔴 Shutting down Automation Rule Manager...');
    
    // Stop rule evaluation
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
    }
    
    // Disable all rules
    for (const [ruleId, rule] of this.rules) {
      rule.enabled = false;
    }
    
    this.rules.clear();
    this.ruleGroups.clear();
    this.conditions.clear();
    this.actions.clear();
    this.scripts.clear();
    this.schedules.clear();
    
    this.isInitialized = false;
    logger.info('✅ Automation Rule Manager shutdown complete');
  }
}

export default AutomationRuleManager;
