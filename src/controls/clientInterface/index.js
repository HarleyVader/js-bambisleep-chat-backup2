/**
 * Client Interface Manager
 * Bridges client-side controls with server-side industrial control system
 */

import { EventEmitter } from 'events';
import Logger from '../../utils/logger.js';

const logger = new Logger('ClientInterface');

export class ClientInterfaceManager extends EventEmitter {
  constructor(controlNetwork) {
    super();
    this.controlNetwork = controlNetwork;
    this.clientConnections = new Map();
    this.clientStates = new Map();
    this.activeControls = new Map();
    this.isInitialized = false;

    // Control types that can be managed from client
    this.controlTypes = {
      TRIGGERS: 'trigger_control',
      SPIRALS: 'spiral_control', 
      BRAINWAVES: 'brainwave_control',
      COLLAR: 'collar_control',
      ADVANCED_BINAURAL: 'advanced_binaural_control',
      STREAMING: 'streaming_control'
    };
  }

  async initialize() {
    logger.info('🌐 Initializing Client Interface Manager...');
    
    // Set up control handlers
    this.setupControlHandlers();
    
    // Initialize default client configurations
    this.setupDefaultConfigurations();
    
    this.isInitialized = true;
    logger.info('✅ Client Interface Manager initialized');
  }

  /**
   * Register a client connection
   */
  registerClient(socketId, metadata = {}) {
    const client = {
      id: socketId,
      socketId,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      controls: new Map(),
      state: {
        triggers: [],
        spirals: { enabled: false },
        brainwaves: { enabled: false },
        collar: { enabled: false },
        advanced: { enabled: false },
        streaming: { enabled: false }
      },
      metadata
    };

    this.clientConnections.set(socketId, client);
    this.clientStates.set(socketId, client.state);
    
    logger.info(`🔗 Client registered: ${socketId}`);
    this.emit('clientRegistered', client);
    
    return client;
  }

  /**
   * Unregister a client connection
   */
  unregisterClient(socketId) {
    const client = this.clientConnections.get(socketId);
    if (client) {
      this.clientConnections.delete(socketId);
      this.clientStates.delete(socketId);
      
      // Clean up any active controls
      this.deactivateClientControls(socketId);
      
      logger.info(`🔌 Client unregistered: ${socketId}`);
      this.emit('clientUnregistered', client);
    }
  }

  /**
   * Process client control update
   */
  async processClientControl(socketId, controlType, controlData) {
    try {
      const client = this.clientConnections.get(socketId);
      if (!client) {
        throw new Error(`Client ${socketId} not found`);
      }

      // Update client activity
      client.lastActivity = Date.now();

      // Process control based on type
      switch (controlType) {
        case this.controlTypes.TRIGGERS:
          return await this.processTriggerControl(socketId, controlData);
        
        case this.controlTypes.SPIRALS:
          return await this.processSpiralControl(socketId, controlData);
        
        case this.controlTypes.BRAINWAVES:
          return await this.processBrainwaveControl(socketId, controlData);
        
        case this.controlTypes.COLLAR:
          return await this.processCollarControl(socketId, controlData);
        
        case this.controlTypes.ADVANCED_BINAURAL:
          return await this.processAdvancedBinauralControl(socketId, controlData);
        
        case this.controlTypes.STREAMING:
          return await this.processStreamingControl(socketId, controlData);
        
        default:
          throw new Error(`Unknown control type: ${controlType}`);
      }
    } catch (error) {
      logger.error(`Error processing client control ${controlType} from ${socketId}:`, error);
      throw error;
    }
  }

  /**
   * Process trigger control from client
   */
  async processTriggerControl(socketId, data) {
    const client = this.clientConnections.get(socketId);
    
    // Update client state
    client.state.triggers = data.triggers || [];
    
    // Send control signal to automation manager
    if (this.controlNetwork.controlsSystem?.automationManager) {
      await this.controlNetwork.controlsSystem.automationManager.processSignal({
        type: 'CLIENT_TRIGGER_UPDATE',
        data: {
          clientId: socketId,
          triggers: data.triggers,
          action: data.action || 'UPDATE'
        }
      }, socketId);
    }

    // Emit event for other systems
    this.emit('triggerUpdate', {
      clientId: socketId,
      triggers: data.triggers,
      timestamp: Date.now()
    });

    logger.debug(`🎯 Trigger control updated for client ${socketId}: ${data.triggers?.length || 0} triggers`);
    return { success: true, triggers: data.triggers };
  }

  /**
   * Process spiral control from client
   */
  async processSpiralControl(socketId, data) {
    const client = this.clientConnections.get(socketId);
    
    // Update client state
    client.state.spirals = { ...client.state.spirals, ...data };
    
    // Send control signal to spiral manager
    if (this.controlNetwork.controlsSystem?.spiralManager) {
      // Map client data to spiral control system
      const spiralCommands = this.mapClientSpiralData(data);
      
      for (const [pv, value] of Object.entries(spiralCommands)) {
        await this.controlNetwork.controlsSystem.spiralManager.setPV(pv, value);
      }
    }

    // Emit event for other systems
    this.emit('spiralUpdate', {
      clientId: socketId,
      spiralData: data,
      timestamp: Date.now()
    });

    logger.debug(`🌀 Spiral control updated for client ${socketId}`);
    return { success: true, spirals: data };
  }

  /**
   * Process brainwave control from client
   */
  async processBrainwaveControl(socketId, data) {
    const client = this.clientConnections.get(socketId);
    
    // Update client state
    client.state.brainwaves = { ...client.state.brainwaves, ...data };

    // Send to DCS for audio processing control
    if (this.controlNetwork.controlsSystem?.dcsManager) {
      await this.controlNetwork.controlsSystem.dcsManager.processSignal({
        type: 'BRAINWAVE_CONTROL_UPDATE',
        data: {
          clientId: socketId,
          brainwaveConfig: data
        }
      }, socketId);
    }

    this.emit('brainwaveUpdate', {
      clientId: socketId,
      brainwaveData: data,
      timestamp: Date.now()
    });

    logger.debug(`🧠 Brainwave control updated for client ${socketId}`);
    return { success: true, brainwaves: data };
  }

  /**
   * Process collar control from client
   */
  async processCollarControl(socketId, data) {
    const client = this.clientConnections.get(socketId);
    
    // Update client state
    client.state.collar = { ...client.state.collar, ...data };

    // Emit event for other systems to handle collar display
    this.emit('collarUpdate', {
      clientId: socketId,
      collarData: data,
      timestamp: Date.now()
    });

    logger.debug(`👑 Collar control updated for client ${socketId}`);
    return { success: true, collar: data };
  }

  /**
   * Process advanced binaural control from client
   */
  async processAdvancedBinauralControl(socketId, data) {
    const client = this.clientConnections.get(socketId);
    
    // Update client state
    client.state.advanced = { ...client.state.advanced, ...data };

    // Send to DCS for advanced audio processing
    if (this.controlNetwork.controlsSystem?.dcsManager) {
      await this.controlNetwork.controlsSystem.dcsManager.processSignal({
        type: 'ADVANCED_BINAURAL_UPDATE',
        data: {
          clientId: socketId,
          binauralConfig: data
        }
      }, socketId);
    }

    this.emit('advancedBinauralUpdate', {
      clientId: socketId,
      binauralData: data,
      timestamp: Date.now()
    });

    logger.debug(`🎵 Advanced binaural control updated for client ${socketId}`);
    return { success: true, advanced: data };
  }

  /**
   * Process streaming control from client
   */
  async processStreamingControl(socketId, data) {
    const client = this.clientConnections.get(socketId);
    
    // Update client state
    client.state.streaming = { ...client.state.streaming, ...data };

    this.emit('streamingUpdate', {
      clientId: socketId,
      streamingData: data,
      timestamp: Date.now()
    });

    logger.debug(`📺 Streaming control updated for client ${socketId}`);
    return { success: true, streaming: data };
  }

  /**
   * Map client spiral data to control system process variables
   */
  mapClientSpiralData(data) {
    const commands = {};
    
    if (data.enabled !== undefined) {
      commands.SPIRAL_ENABLED = data.enabled ? 1 : 0;
    }
    
    if (data.spiral1Width !== undefined) {
      commands.SPIRAL_THICKNESS = data.spiral1Width;
    }
    
    if (data.spiral1Speed !== undefined) {
      commands.SPIRAL_SPEED = data.spiral1Speed / 20; // Normalize
    }
    
    if (data.spiral2Width !== undefined) {
      // Could map to a second spiral or intensity
      commands.SPIRAL_INTENSITY = data.spiral2Width / 10;
    }
    
    return commands;
  }

  /**
   * Get client state
   */
  getClientState(socketId) {
    return this.clientStates.get(socketId) || null;
  }

  /**
   * Get all client states
   */
  getAllClientStates() {
    return Array.from(this.clientStates.entries()).map(([id, state]) => ({
      clientId: id,
      ...state
    }));
  }

  /**
   * Broadcast control update to all clients
   */
  broadcastControlUpdate(controlType, data) {
    this.emit('broadcastControl', {
      type: controlType,
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Deactivate all controls for a client
   */
  deactivateClientControls(socketId) {
    const client = this.clientConnections.get(socketId);
    if (client) {
      // Reset all control states
      client.state = {
        triggers: [],
        spirals: { enabled: false },
        brainwaves: { enabled: false },
        collar: { enabled: false },
        advanced: { enabled: false },
        streaming: { enabled: false }
      };
      
      this.clientStates.set(socketId, client.state);
      
      // Notify systems of deactivation
      this.emit('clientControlsDeactivated', { clientId: socketId });
    }
  }

  /**
   * Setup control handlers
   */
  setupControlHandlers() {
    // Listen for events from other managers
    if (this.controlNetwork.controlsSystem?.automationManager) {
      this.controlNetwork.controlsSystem.automationManager.on('ruleTriggered', (data) => {
        // Broadcast automation events to relevant clients
        this.broadcastControlUpdate('automation', data);
      });
    }
  }

  /**
   * Setup default configurations
   */
  setupDefaultConfigurations() {
    this.defaultConfig = {
      triggers: {
        maxActive: 10,
        cooldownMs: 1000
      },
      spirals: {
        maxSpeed: 100,
        maxRadius: 500
      },
      brainwaves: {
        maxFrequency: 40,
        maxVolume: 100
      }
    };
  }

  /**
   * Get manager status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      clientCount: this.clientConnections.size,
      activeControlsCount: this.activeControls.size,
      controlTypes: Object.keys(this.controlTypes)
    };
  }

  /**
   * Shutdown the client interface manager
   */
  async shutdown() {
    logger.info('🔴 Shutting down Client Interface Manager...');
    
    // Deactivate all client controls
    for (const socketId of this.clientConnections.keys()) {
      this.deactivateClientControls(socketId);
    }
    
    this.clientConnections.clear();
    this.clientStates.clear();
    this.activeControls.clear();
    
    this.isInitialized = false;
    logger.info('✅ Client Interface Manager shutdown complete');
  }
}

export default ClientInterfaceManager;
