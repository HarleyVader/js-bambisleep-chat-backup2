/**
 * Bambi Controls System Integration
 * Main controller for managing the distributed industrial control system
 * Integrates with BambiControlNetwork.js for comprehensive control management
 */

import { DCSControllerManager } from './dcs/index.js';
import { SCADAManager } from './scada/index.js';
import { ProtocolManager } from './protocols/index.js';
import { ControlLoopManager } from './loops/index.js';
import { AutomationRuleManager } from './automation/index.js';
import { RemoteSiteManager } from './sites/index.js';
import { SafetySystemManager } from './safety/index.js';
import SpiralControlManager from './spirals/index.js';
import { ClientInterfaceManager } from './clientInterface/index.js';
import Logger from '../utils/logger.js';

const logger = new Logger('Controls');

class BambiControlsSystem {
  constructor() {
    this.controlNetwork = null; // Will be set during initialization
    this.isInitialized = false;
    
    // Initialize sub-managers (without controlNetwork for now)
    this.dcsManager = null;
    this.scadaManager = null;
    this.protocolManager = null;
    this.loopManager = null;
    this.automationManager = null;
    this.siteManager = null;
    this.safetyManager = null;
    this.spiralManager = new SpiralControlManager();
    this.clientInterfaceManager = null;
  }

  /**
   * Initialize the complete controls system
   */  async initialize(controlNetwork) {
    if (this.isInitialized) {
      logger.warning('Controls system already initialized');
      return;
    }

    try {
      logger.info('🎛️ Initializing Bambi Controls System...');
        // Set up control network
      this.controlNetwork = controlNetwork;
        // Initialize sub-managers with control network
      this.dcsManager = new DCSControllerManager(this.controlNetwork);
      this.scadaManager = new SCADAManager(this.controlNetwork);
      this.protocolManager = new ProtocolManager(this.controlNetwork);
      this.loopManager = new ControlLoopManager(this.controlNetwork);
      this.automationManager = new AutomationRuleManager(this.controlNetwork);
      this.siteManager = new RemoteSiteManager(this.controlNetwork);
      this.safetyManager = new SafetySystemManager(this.controlNetwork);
      this.clientInterfaceManager = new ClientInterfaceManager(this.controlNetwork);
        // Initialize all managers in proper order
      await this.protocolManager.initialize();
      await this.safetyManager.initialize();
      await this.siteManager.initialize();
      await this.dcsManager.initialize();
      await this.loopManager.initialize();
      await this.automationManager.initialize();
      await this.scadaManager.initialize();
      await this.clientInterfaceManager.initialize();
      await this.spiralManager.initialize();

      // Set up inter-manager communication
      this.setupManagerInterfaces();

      this.isInitialized = true;
      logger.info('✅ Bambi Controls System initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize Controls System:', error);
      throw error;
    }
  }

  /**
   * Set up communication interfaces between managers
   */
  setupManagerInterfaces() {
    // DCS Controller events
    this.dcsManager.on('controllerFailure', (data) => {
      this.safetyManager.handleControllerFailure(data);
      this.scadaManager.updateAlarmDisplay(data);
    });

    // Safety system events
    this.safetyManager.on('safetyViolation', (data) => {
      this.dcsManager.emergencyShutdown(data);
      this.scadaManager.raiseAlarm(data);
    });

    // SCADA operator commands
    this.scadaManager.on('operatorCommand', (data) => {
      this.dcsManager.processOperatorCommand(data);
      this.loopManager.updateSetpoint(data);
    });

    // Control loop updates
    this.loopManager.on('loopOutput', (data) => {
      this.dcsManager.updateControlOutput(data);
      this.scadaManager.updateProcessDisplay(data);
    });    // Automation rule triggers
    this.automationManager.on('ruleTriggered', (data) => {
      this.scadaManager.logAutomationEvent(data);
      this.dcsManager.executeAutomatedAction(data);
    });

    // Spiral system events
    this.spiralManager.on('pvChanged', (data) => {
      this.scadaManager.updateProcessDisplay(data);
      this.loopManager.updateProcessVariable(data);
    });

    this.spiralManager.on('alarm', (data) => {
      this.scadaManager.raiseAlarm(data);
      this.safetyManager.handleAlarm(data);
    });    // User activity triggers spiral automation
    this.scadaManager.on('userActivity', (data) => {
      this.spiralManager.emit('automationTrigger', {
        type: 'USER_ACTIVITY_DETECTED',
        data: data
      });
    });

    // Client interface events
    this.clientInterfaceManager.on('triggerUpdate', (data) => {
      this.automationManager.processSignal({
        type: 'CLIENT_TRIGGER_UPDATE',
        data: data
      }, data.clientId);
    });

    this.clientInterfaceManager.on('spiralUpdate', (data) => {
      this.spiralManager.emit('clientSpiralUpdate', data);
      this.scadaManager.updateProcessDisplay({
        type: 'SPIRAL_CLIENT_UPDATE',
        data: data
      });
    });

    this.clientInterfaceManager.on('brainwaveUpdate', (data) => {
      this.dcsManager.processSignal({
        type: 'BRAINWAVE_CONTROL_UPDATE',
        data: data
      }, data.clientId);
    });

    logger.info('🔗 Manager interfaces established');
  }

  /**
   * Process a control signal through the appropriate managers
   */
  async processControlSignal(signalType, signalData, sourceNodeId, options = {}) {
    try {
      // Route signal to appropriate manager based on type
      switch (signalType) {
        case 'DCS_CONTROLLER_UPDATE':
          return await this.dcsManager.processSignal(signalData, sourceNodeId);
        
        case 'SCADA_OPERATOR_COMMAND':
          return await this.scadaManager.processOperatorCommand(signalData, sourceNodeId);
        
        case 'CONTROL_LOOP_UPDATE':
          return await this.loopManager.updateLoop(signalData, sourceNodeId);
        
        case 'AUTOMATION_RULE_TRIGGER':
          return await this.automationManager.evaluateRule(signalData, sourceNodeId);
        
        case 'SAFETY_INTERLOCK':
          return await this.safetyManager.checkSafetyCondition(signalData, sourceNodeId);
          case 'REMOTE_SITE_STATUS':
          return await this.siteManager.updateSiteStatus(signalData, sourceNodeId);
        
        case 'SPIRAL_CONTROL_UPDATE':
          return await this.spiralManager.setPV(signalData.pv, signalData.value);
          case 'SPIRAL_AUTOMATION_TRIGGER':
          return await this.spiralManager.emit('automationTrigger', signalData);
        
        case 'CLIENT_CONTROL_UPDATE':
          return await this.clientInterfaceManager.processClientControl(
            sourceNodeId,
            signalData.controlType,
            signalData.controlData
          );
        
        default:
          // Pass through to main control network
          return this.controlNetwork.processControlSignal(
            signalType, 
            signalData, 
            sourceNodeId, 
            options
          );
      }
    } catch (error) {
      logger.error(`Failed to process control signal ${signalType}:`, error);
      throw error;
    }
  }
  /**
   * Get comprehensive system status
   */
  getSystemStatus() {
    return {
      controlNetwork: this.controlNetwork.getSystemStatus(),
      dcs: this.dcsManager.getStatus(),
      scada: this.scadaManager.getStatus(),
      protocols: this.protocolManager.getStatus(),
      loops: this.loopManager.getStatus(),
      automation: this.automationManager.getStatus(),
      sites: this.siteManager.getStatus(),
      safety: this.safetyManager.getStatus(),
      spirals: this.spiralManager.getStatus(),
      clientInterface: this.clientInterfaceManager.getStatus(),
      isInitialized: this.isInitialized
    };
  }

  /**
   * Register a new control component
   */
  async registerComponent(componentType, componentId, config = {}) {
    switch (componentType) {
      case 'DCS_CONTROLLER':
        return await this.dcsManager.registerController(componentId, config);
      
      case 'SCADA_WORKSTATION':
        return await this.scadaManager.registerWorkstation(componentId, config);
      
      case 'REMOTE_SITE':
        return await this.siteManager.registerSite(componentId, config);
      
      case 'CONTROL_LOOP':
        return await this.loopManager.registerLoop(componentId, config);
        case 'AUTOMATION_RULE':
        return await this.automationManager.registerRule(componentId, config);
        case 'SPIRAL_WORKER':
        return await this.spiralManager.registerSpiralWorker(componentId, config);
      
      case 'CLIENT_CONNECTION':
        return await this.clientInterfaceManager.registerClient(componentId, config);
      
      default:
        throw new Error(`Unknown component type: ${componentType}`);
    }
  }

  /**
   * Emergency shutdown of all control systems
   */
  async emergencyShutdown(reason = 'Manual trigger') {
    logger.error(`🚨 EMERGENCY SHUTDOWN INITIATED: ${reason}`);
    
    try {
      // Immediate safety shutdown
      await this.safetyManager.emergencyShutdown();
        // Graceful shutdown of other systems
      await this.spiralManager.shutdown();
      await this.loopManager.shutdown();
      await this.dcsManager.shutdown();
      await this.scadaManager.shutdown();
      await this.automationManager.shutdown();
      await this.siteManager.shutdown();
      await this.protocolManager.shutdown();
      
      logger.info('✅ Emergency shutdown completed');
    } catch (error) {
      logger.error('❌ Error during emergency shutdown:', error);
      throw error;
    }
  }
  /**
   * Shutdown the controls system gracefully
   */
  async shutdown() {
    if (!this.isInitialized) {
      return;
    }

    logger.info('🔴 Shutting down Bambi Controls System...');
    
    try {
      // Shutdown in reverse order of initialization
      await this.spiralManager.shutdown();
      await this.clientInterfaceManager.shutdown();
      await this.scadaManager.shutdown();
      await this.automationManager.shutdown();
      await this.loopManager.shutdown();
      await this.dcsManager.shutdown();
      await this.siteManager.shutdown();
      await this.safetyManager.shutdown();
      await this.protocolManager.shutdown();

      this.isInitialized = false;
      logger.info('✅ Bambi Controls System shutdown complete');
    } catch (error) {
      logger.error('❌ Error during controls system shutdown:', error);
      throw error;
    }
  }
}

// Export singleton instance
const bambiControlsSystem = new BambiControlsSystem();

export default bambiControlsSystem;
export { BambiControlsSystem };
