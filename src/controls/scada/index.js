/**
 * SCADA (Supervisory Control and Data Acquisition) Manager
 * Manages SCADA workstations, operator interfaces, and data visualization
 */

import { EventEmitter } from 'events';
import Logger from '../../utils/logger.js';

const logger = new Logger('SCADA');

export class SCADAManager extends EventEmitter {
  constructor(controlNetwork) {
    super();
    this.controlNetwork = controlNetwork;
    this.workstations = new Map();
    this.operators = new Map();
    this.displays = new Map();
    this.alarms = new Map();
    this.trends = new Map();
    this.reports = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    logger.info('🖥️ Initializing SCADA Manager...');
    
    // Set up default displays
    this.setupDefaultDisplays();
    
    // Initialize alarm management
    this.initializeAlarmManagement();
    
    // Set up trending
    this.initializeTrending();
    
    this.isInitialized = true;
    logger.info('✅ SCADA Manager initialized');
  }

  setupDefaultDisplays() {
    const displays = [
      {
        id: 'MAIN_OVERVIEW',
        name: 'Main System Overview',
        type: 'OVERVIEW',
        elements: ['TRIGGER_STATUS', 'AUDIO_LEVELS', 'USER_COUNT', 'SYSTEM_HEALTH']
      },
      {
        id: 'TRIGGER_CONTROL',
        name: 'Trigger Control Panel',
        type: 'CONTROL',
        elements: ['TRIGGER_INTENSITY', 'TRIGGER_FREQUENCY', 'ACTIVE_TRIGGERS']
      },
      {
        id: 'ALARM_SUMMARY',
        name: 'Alarm Summary Display',
        type: 'ALARM',
        elements: ['ACTIVE_ALARMS', 'ALARM_HISTORY', 'ACKNOWLEDGMENTS']
      },
      {
        id: 'TRENDS_DISPLAY',
        name: 'Process Trends',
        type: 'TREND',
        elements: ['HISTORICAL_DATA', 'REAL_TIME_TRENDS', 'PERFORMANCE_METRICS']
      }
    ];

    for (const display of displays) {
      this.displays.set(display.id, {
        ...display,
        data: new Map(),
        lastUpdate: Date.now(),
        refreshRate: 1000 // 1 second default
      });
    }

    logger.info(`📊 Created ${displays.length} default SCADA displays`);
  }

  initializeAlarmManagement() {
    // Alarm priority levels
    this.alarmPriorities = {
      'EMERGENCY': { level: 1, color: '#FF0000', sound: 'emergency.wav' },
      'HIGH': { level: 2, color: '#FF6600', sound: 'high_alarm.wav' },
      'MEDIUM': { level: 3, color: '#FFFF00', sound: 'medium_alarm.wav' },
      'LOW': { level: 4, color: '#00FF00', sound: 'low_alarm.wav' },
      'INFO': { level: 5, color: '#0066FF', sound: null }
    };

    logger.info('🚨 Alarm management system initialized');
  }

  initializeTrending() {
    const trendGroups = [
      {
        id: 'SYSTEM_PERFORMANCE',
        name: 'System Performance Trends',
        variables: ['CPU_USAGE', 'MEMORY_USAGE', 'NETWORK_LATENCY']
      },
      {
        id: 'TRIGGER_ANALYTICS',
        name: 'Trigger Analytics',
        variables: ['TRIGGER_FREQUENCY', 'TRIGGER_EFFECTIVENESS', 'USER_RESPONSE']
      },
      {
        id: 'AUDIO_METRICS',
        name: 'Audio Metrics',
        variables: ['AUDIO_LEVEL', 'AUDIO_QUALITY', 'PLAYBACK_ERRORS']
      }
    ];

    for (const group of trendGroups) {
      this.trends.set(group.id, {
        ...group,
        data: new Map(),
        maxDataPoints: 1000,
        retentionTime: 24 * 60 * 60 * 1000 // 24 hours
      });
    }

    logger.info(`📈 Initialized ${trendGroups.length} trend groups`);
  }

  async registerWorkstation(workstationId, config = {}) {
    if (this.workstations.has(workstationId)) {
      throw new Error(`SCADA workstation ${workstationId} already registered`);
    }

    const workstation = {
      id: workstationId,
      name: config.name || `SCADA-${workstationId}`,
      location: config.location || 'Unknown',
      status: 'INITIALIZING',
      activeOperator: null,
      authorizedSites: config.authorizedSites || ['LOCAL'],
      displayConfiguration: config.displays || ['MAIN_OVERVIEW'],
      alarmConfiguration: {
        soundEnabled: config.alarmSound !== false,
        autoAcknowledge: config.autoAcknowledge || false,
        priorityFilter: config.priorityFilter || ['EMERGENCY', 'HIGH', 'MEDIUM']
      },
      lastActivity: Date.now(),
      metrics: {
        commandsIssued: 0,
        alarmsAcknowledged: 0,
        displaysViewed: 0,
        sessionTime: 0
      }
    };

    this.workstations.set(workstationId, workstation);
    
    // Register with main control network
    await this.controlNetwork.registerControlNode(workstationId, 'SCADA_WORKSTATION', {
      ...config,
      workstationType: 'OPERATOR_INTERFACE'
    });

    workstation.status = 'ACTIVE';
    
    logger.info(`✅ SCADA Workstation registered: ${workstationId}`);
    this.emit('workstationRegistered', workstation);
    
    return workstation;
  }

  async processOperatorCommand(commandData, sourceNodeId) {
    const workstation = this.workstations.get(sourceNodeId);
    if (!workstation) {
      throw new Error(`Unknown SCADA workstation: ${sourceNodeId}`);
    }

    workstation.lastActivity = Date.now();
    workstation.metrics.commandsIssued++;

    const { command, target, parameters } = commandData;
    
    logger.info(`👨‍💼 SCADA Command from ${sourceNodeId}: ${command} → ${target}`);

    switch (command) {
      case 'ACKNOWLEDGE_ALARM':
        return await this.acknowledgeAlarm(parameters.alarmId, workstation);
      
      case 'SET_SETPOINT':
        return await this.sendSetpointCommand(target, parameters, workstation);
      
      case 'START_CONTROLLER':
      case 'STOP_CONTROLLER':
        return await this.sendControllerCommand(target, command, workstation);
      
      case 'UPDATE_DISPLAY':
        return await this.updateDisplay(parameters.displayId, parameters.data, workstation);
      
      case 'GENERATE_REPORT':
        return await this.generateReport(parameters.reportType, parameters, workstation);
      
      default:
        logger.warning(`Unknown SCADA command: ${command}`);
        return { success: false, error: 'Unknown command' };
    }
  }

  async acknowledgeAlarm(alarmId, workstation) {
    const alarm = this.alarms.get(alarmId);
    if (!alarm) {
      return { success: false, error: 'Alarm not found' };
    }

    alarm.acknowledged = true;
    alarm.acknowledgedBy = workstation.activeOperator;
    alarm.acknowledgedAt = Date.now();
    alarm.acknowledgedFrom = workstation.id;

    workstation.metrics.alarmsAcknowledged++;

    logger.info(`✅ Alarm ${alarmId} acknowledged by operator at ${workstation.id}`);
    
    this.emit('alarmAcknowledged', {
      alarmId,
      workstationId: workstation.id,
      operator: workstation.activeOperator
    });

    return { success: true, alarmId };
  }

  async sendSetpointCommand(controllerId, parameters, workstation) {
    const { loopId, setpoint } = parameters;
    
    // Emit operator command for DCS manager to handle
    this.emit('operatorCommand', {
      type: 'SETPOINT_CHANGE',
      controllerId,
      loopId,
      setpoint,
      source: workstation.id,
      operator: workstation.activeOperator
    });

    logger.info(`🎯 Setpoint command sent: ${controllerId}/${loopId} = ${setpoint}`);
    
    return { success: true, controllerId, loopId, setpoint };
  }

  async sendControllerCommand(controllerId, command, workstation) {
    // Emit operator command for DCS manager to handle
    this.emit('operatorCommand', {
      type: 'CONTROLLER_COMMAND',
      controllerId,
      command,
      source: workstation.id,
      operator: workstation.activeOperator
    });

    logger.info(`⚙️ Controller command sent: ${controllerId} - ${command}`);
    
    return { success: true, controllerId, command };
  }

  async updateDisplay(displayId, data, workstation) {
    const display = this.displays.get(displayId);
    if (!display) {
      return { success: false, error: 'Display not found' };
    }

    // Update display data
    for (const [key, value] of Object.entries(data)) {
      display.data.set(key, {
        value,
        timestamp: Date.now(),
        source: workstation.id
      });
    }

    display.lastUpdate = Date.now();
    workstation.metrics.displaysViewed++;

    this.emit('displayUpdated', {
      displayId,
      workstationId: workstation.id,
      data
    });

    return { success: true, displayId };
  }

  async generateReport(reportType, parameters, workstation) {
    const reportId = `RPT_${Date.now()}_${workstation.id}`;
    
    const report = {
      id: reportId,
      type: reportType,
      generatedBy: workstation.id,
      operator: workstation.activeOperator,
      parameters,
      createdAt: Date.now(),
      status: 'GENERATING'
    };

    this.reports.set(reportId, report);

    // Simulate report generation
    setTimeout(() => {
      report.status = 'COMPLETED';
      report.data = this.generateReportData(reportType, parameters);
      
      this.emit('reportGenerated', report);
      logger.info(`📄 Report generated: ${reportId} (${reportType})`);
    }, 2000);

    return { success: true, reportId };
  }

  generateReportData(reportType, parameters) {
    // Simplified report data generation
    switch (reportType) {
      case 'ALARM_SUMMARY':
        return {
          totalAlarms: this.alarms.size,
          acknowledgedAlarms: Array.from(this.alarms.values()).filter(a => a.acknowledged).length,
          severityBreakdown: this.getAlarmSeverityBreakdown()
        };
      
      case 'SYSTEM_PERFORMANCE':
        return {
          uptime: Date.now() - this.controlNetwork.systemState.startedAt,
          activeNodes: this.controlNetwork.controlNodes.size,
          totalSignals: this.controlNetwork.metrics.signalsProcessed
        };
      
      default:
        return { message: 'Report data not available' };
    }
  }

  getAlarmSeverityBreakdown() {
    const breakdown = {};
    for (const priority of Object.keys(this.alarmPriorities)) {
      breakdown[priority] = Array.from(this.alarms.values())
        .filter(a => a.severity === priority).length;
    }
    return breakdown;
  }

  raiseAlarm(alarmData) {
    const alarmId = `ALM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alarm = {
      id: alarmId,
      ...alarmData,
      timestamp: Date.now(),
      acknowledged: false,
      priority: this.alarmPriorities[alarmData.severity] || this.alarmPriorities['INFO']
    };

    this.alarms.set(alarmId, alarm);

    // Notify all workstations based on their alarm configuration
    for (const [wsId, workstation] of this.workstations) {
      if (workstation.alarmConfiguration.priorityFilter.includes(alarm.severity)) {
        this.notifyWorkstation(workstation, alarm);
      }
    }

    logger.warning(`🚨 SCADA Alarm raised: ${alarmId} - ${alarm.description} (${alarm.severity})`);
    
    this.emit('alarmRaised', alarm);
    
    return alarmId;
  }

  notifyWorkstation(workstation, alarm) {
    // Send alarm notification to workstation
    this.emit('workstationNotification', {
      workstationId: workstation.id,
      type: 'ALARM',
      data: alarm
    });

    // Play alarm sound if enabled
    if (workstation.alarmConfiguration.soundEnabled && alarm.priority.sound) {
      this.emit('playAlarmSound', {
        workstationId: workstation.id,
        sound: alarm.priority.sound
      });
    }
  }

  updateAlarmDisplay(data) {
    // Update alarm displays on all workstations
    const alarmDisplay = this.displays.get('ALARM_SUMMARY');
    if (alarmDisplay) {
      alarmDisplay.data.set('LATEST_ALARM', {
        value: data,
        timestamp: Date.now()
      });
      
      this.emit('displayRefresh', {
        displayId: 'ALARM_SUMMARY',
        data: data
      });
    }
  }

  updateProcessDisplay(processData) {
    // Update process variable displays
    const { controllerId, loopId, processVariable, output } = processData;
    
    // Update main overview display
    const overviewDisplay = this.displays.get('MAIN_OVERVIEW');
    if (overviewDisplay) {
      overviewDisplay.data.set(`${controllerId}_${loopId}`, {
        value: { processVariable, output },
        timestamp: Date.now()
      });
    }

    // Add to trending data
    this.addTrendData('SYSTEM_PERFORMANCE', `${controllerId}_${loopId}`, output);
  }

  addTrendData(trendGroupId, variable, value) {
    const trendGroup = this.trends.get(trendGroupId);
    if (!trendGroup) return;

    if (!trendGroup.data.has(variable)) {
      trendGroup.data.set(variable, []);
    }

    const variableData = trendGroup.data.get(variable);
    variableData.push({
      timestamp: Date.now(),
      value
    });

    // Maintain max data points
    if (variableData.length > trendGroup.maxDataPoints) {
      variableData.shift();
    }

    // Clean old data based on retention time
    const cutoffTime = Date.now() - trendGroup.retentionTime;
    while (variableData.length > 0 && variableData[0].timestamp < cutoffTime) {
      variableData.shift();
    }
  }

  logAutomationEvent(eventData) {
    logger.info(`🤖 Automation event logged: ${eventData.ruleId} - ${eventData.action}`);
    
    // Log to automation display if it exists
    const automationDisplay = this.displays.get('AUTOMATION_LOG');
    if (automationDisplay) {
      automationDisplay.data.set('LATEST_EVENT', {
        value: eventData,
        timestamp: Date.now()
      });
    }
  }

  async loginOperator(workstationId, operatorId, credentials) {
    const workstation = this.workstations.get(workstationId);
    if (!workstation) {
      throw new Error(`Workstation not found: ${workstationId}`);
    }

    // Simplified authentication (in production, use proper auth)
    const operator = {
      id: operatorId,
      name: credentials.name || operatorId,
      level: credentials.level || 'OPERATOR',
      loginTime: Date.now()
    };

    workstation.activeOperator = operator;
    this.operators.set(operatorId, operator);

    logger.info(`👤 Operator logged in: ${operatorId} at ${workstationId}`);
    
    this.emit('operatorLogin', {
      workstationId,
      operator
    });

    return operator;
  }

  async logoutOperator(workstationId) {
    const workstation = this.workstations.get(workstationId);
    if (!workstation || !workstation.activeOperator) {
      return;
    }

    const operator = workstation.activeOperator;
    const sessionTime = Date.now() - operator.loginTime;
    
    workstation.metrics.sessionTime += sessionTime;
    workstation.activeOperator = null;

    logger.info(`👤 Operator logged out: ${operator.id} from ${workstationId}`);
    
    this.emit('operatorLogout', {
      workstationId,
      operator,
      sessionTime
    });
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      workstationCount: this.workstations.size,
      activeOperators: Array.from(this.workstations.values())
        .filter(ws => ws.activeOperator).length,
      displayCount: this.displays.size,
      activeAlarms: Array.from(this.alarms.values())
        .filter(alarm => !alarm.acknowledged).length,
      totalAlarms: this.alarms.size,
      trendGroups: this.trends.size,
      reportsGenerated: this.reports.size
    };
  }

  async shutdown() {
    if (!this.isInitialized) return;
    
    logger.info('🔴 Shutting down SCADA Manager...');
    
    // Logout all operators
    for (const [wsId, workstation] of this.workstations) {
      if (workstation.activeOperator) {
        await this.logoutOperator(wsId);
      }
      workstation.status = 'SHUTDOWN';
    }
    
    this.workstations.clear();
    this.operators.clear();
    this.displays.clear();
    this.alarms.clear();
    this.trends.clear();
    this.reports.clear();
    
    this.isInitialized = false;
    logger.info('✅ SCADA Manager shutdown complete');
  }
}

export default SCADAManager;
