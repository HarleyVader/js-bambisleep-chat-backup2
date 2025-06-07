/**
 * Spiral Worker Adapter
 * Bridges spirals.js worker with industrial control system
 */

import { EventEmitter } from 'events';
import Logger from '../../utils/logger.js';

const logger = new Logger('SpiralWorkerAdapter');

class SpiralWorkerAdapter extends EventEmitter {
    constructor(workerId, websocketConnection) {
        super();
        this.workerId = workerId;
        this.ws = websocketConnection;
        this.spiralSettings = {
            enabled: false,
            speed: 1.0,
            intensity: 0.5,
            radius: 100,
            hue: 180,
            saturation: 70,
            brightness: 80,
            arms: 3,
            thickness: 5
        };
        this.lastUpdate = new Date();
        this.updateQueue = [];
        this.isProcessing = false;
        
        this.setupWebSocketHandlers();
        this.startUpdateProcessor();
    }
    
    setupWebSocketHandlers() {
        if (!this.ws) return;
        
        this.ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                this.handleWebSocketMessage(message);
            } catch (error) {
                logger.error(`[SPIRAL-ADAPTER-${this.workerId}] Error parsing WebSocket message:`, error);
            }
        });
        
        this.ws.on('close', () => {
            logger.info(`[SPIRAL-ADAPTER-${this.workerId}] WebSocket connection closed`);
            this.emit('disconnected', this.workerId);
        });
        
        this.ws.on('error', (error) => {
            logger.error(`[SPIRAL-ADAPTER-${this.workerId}] WebSocket error:`, error);
            this.emit('error', { workerId: this.workerId, error: error });
        });
    }
    
    handleWebSocketMessage(message) {
        switch (message.type) {
            case 'spiral_settings_request':
                this.sendCurrentSettings();
                break;
            case 'spiral_parameter_update':
                this.handleParameterUpdate(message.parameter, message.value);
                break;
            case 'spiral_enable':
                this.updateParameter('enabled', true);
                break;
            case 'spiral_disable':
                this.updateParameter('enabled', false);
                break;
            case 'user_activity':
                this.emit('userActivity', { workerId: this.workerId, activity: message.activity });
                break;
            case 'performance_metrics':
                this.handlePerformanceMetrics(message.metrics);
                break;
        }
    }
    
    handleParameterUpdate(parameter, value) {
        if (this.spiralSettings.hasOwnProperty(parameter)) {
            const oldValue = this.spiralSettings[parameter];
            this.spiralSettings[parameter] = value;
            this.lastUpdate = new Date();
            
            logger.debug(`[SPIRAL-ADAPTER-${this.workerId}] Parameter ${parameter}: ${oldValue} -> ${value}`);
            
            // Emit parameter change for control system
            this.emit('parameterChanged', {
                workerId: this.workerId,
                parameter: parameter,
                oldValue: oldValue,
                newValue: value
            });
        }
    }
    
    handlePerformanceMetrics(metrics) {
        // Forward performance metrics to control system for monitoring
        this.emit('performanceMetrics', {
            workerId: this.workerId,
            metrics: metrics,
            timestamp: new Date()
        });
        
        // Check for performance issues
        if (metrics.fps && metrics.fps < 30) {
            this.emit('performanceWarning', {
                workerId: this.workerId,
                type: 'LOW_FPS',
                value: metrics.fps,
                threshold: 30
            });
        }
        
        if (metrics.cpuUsage && metrics.cpuUsage > 80) {
            this.emit('performanceWarning', {
                workerId: this.workerId,
                type: 'HIGH_CPU',
                value: metrics.cpuUsage,
                threshold: 80
            });
        }
    }
    
    // Control System Interface Methods
    updateParameter(parameter, value) {
        if (!this.spiralSettings.hasOwnProperty(parameter)) {
            logger.warn(`[SPIRAL-ADAPTER-${this.workerId}] Unknown parameter: ${parameter}`);
            return false;
        }
        
        // Validate parameter value
        const validatedValue = this.validateParameterValue(parameter, value);
        if (validatedValue === null) {
            logger.warn(`[SPIRAL-ADAPTER-${this.workerId}] Invalid value for ${parameter}: ${value}`);
            return false;
        }
        
        // Update local settings
        this.spiralSettings[parameter] = validatedValue;
        this.lastUpdate = new Date();
        
        // Queue update for WebSocket transmission
        this.queueUpdate(parameter, validatedValue);
        
        return true;
    }
    
    updateSettings(settings) {
        let updated = false;
        
        for (const [parameter, value] of Object.entries(settings)) {
            if (this.spiralSettings.hasOwnProperty(parameter)) {
                const validatedValue = this.validateParameterValue(parameter, value);
                if (validatedValue !== null) {
                    this.spiralSettings[parameter] = validatedValue;
                    this.queueUpdate(parameter, validatedValue);
                    updated = true;
                }
            }
        }
        
        if (updated) {
            this.lastUpdate = new Date();
        }
        
        return updated;
    }
    
    validateParameterValue(parameter, value) {
        const validators = {
            enabled: (v) => typeof v === 'boolean' ? v : (v === 1 || v === '1' || v === 'true'),
            speed: (v) => Math.max(0.1, Math.min(10.0, parseFloat(v) || 1.0)),
            intensity: (v) => Math.max(0.0, Math.min(1.0, parseFloat(v) || 0.5)),
            radius: (v) => Math.max(10, Math.min(500, parseInt(v) || 100)),
            hue: (v) => Math.max(0, Math.min(360, parseInt(v) || 180)),
            saturation: (v) => Math.max(0, Math.min(100, parseInt(v) || 70)),
            brightness: (v) => Math.max(0, Math.min(100, parseInt(v) || 80)),
            arms: (v) => Math.max(1, Math.min(8, parseInt(v) || 3)),
            thickness: (v) => Math.max(1, Math.min(20, parseInt(v) || 5))
        };
        
        const validator = validators[parameter];
        if (!validator) return null;
        
        try {
            return validator(value);
        } catch (error) {
            logger.error(`[SPIRAL-ADAPTER-${this.workerId}] Validation error for ${parameter}:`, error);
            return null;
        }
    }
    
    queueUpdate(parameter, value) {
        this.updateQueue.push({
            parameter: parameter,
            value: value,
            timestamp: new Date()
        });
    }
    
    startUpdateProcessor() {
        // Process updates every 50ms to avoid overwhelming the WebSocket
        this.updateProcessor = setInterval(() => {
            this.processUpdateQueue();
        }, 50);
    }
    
    processUpdateQueue() {
        if (this.isProcessing || this.updateQueue.length === 0 || !this.ws || this.ws.readyState !== 1) {
            return;
        }
        
        this.isProcessing = true;
        
        try {
            // Batch updates by parameter to reduce message count
            const batchedUpdates = {};
            
            while (this.updateQueue.length > 0) {
                const update = this.updateQueue.shift();
                batchedUpdates[update.parameter] = update.value;
            }
            
            if (Object.keys(batchedUpdates).length > 0) {
                this.sendParameterUpdates(batchedUpdates);
            }
        } catch (error) {
            logger.error(`[SPIRAL-ADAPTER-${this.workerId}] Error processing update queue:`, error);
        } finally {
            this.isProcessing = false;
        }
    }
    
    sendParameterUpdates(updates) {
        if (!this.ws || this.ws.readyState !== 1) return;
        
        const message = {
            type: 'spiral_parameter_batch_update',
            workerId: this.workerId,
            updates: updates,
            timestamp: new Date().toISOString()
        };
        
        try {
            this.ws.send(JSON.stringify(message));
            logger.debug(`[SPIRAL-ADAPTER-${this.workerId}] Sent parameter updates:`, Object.keys(updates));
        } catch (error) {
            logger.error(`[SPIRAL-ADAPTER-${this.workerId}] Error sending parameter updates:`, error);
        }
    }
    
    sendCurrentSettings() {
        if (!this.ws || this.ws.readyState !== 1) return;
        
        const message = {
            type: 'spiral_settings_response',
            workerId: this.workerId,
            settings: { ...this.spiralSettings },
            timestamp: new Date().toISOString()
        };
        
        try {
            this.ws.send(JSON.stringify(message));
            logger.debug(`[SPIRAL-ADAPTER-${this.workerId}] Sent current settings`);
        } catch (error) {
            logger.error(`[SPIRAL-ADAPTER-${this.workerId}] Error sending settings:`, error);
        }
    }
    
    // Control commands
    enable() {
        return this.updateParameter('enabled', true);
    }
    
    disable() {
        return this.updateParameter('enabled', false);
    }
    
    reset() {
        const defaultSettings = {
            enabled: false,
            speed: 1.0,
            intensity: 0.5,
            radius: 100,
            hue: 180,
            saturation: 70,
            brightness: 80,
            arms: 3,
            thickness: 5
        };
        
        return this.updateSettings(defaultSettings);
    }
    
    // Status and diagnostics
    getStatus() {
        return {
            workerId: this.workerId,
            connected: this.ws && this.ws.readyState === 1,
            settings: { ...this.spiralSettings },
            lastUpdate: this.lastUpdate,
            queueLength: this.updateQueue.length,
            isProcessing: this.isProcessing
        };
    }
    
    // Cleanup
    destroy() {
        logger.info(`[SPIRAL-ADAPTER-${this.workerId}] Destroying adapter`);
        
        if (this.updateProcessor) {
            clearInterval(this.updateProcessor);
            this.updateProcessor = null;
        }
        
        this.updateQueue = [];
        this.isProcessing = false;
        
        if (this.ws) {
            try {
                this.ws.removeAllListeners();
            } catch (error) {
                logger.error(`[SPIRAL-ADAPTER-${this.workerId}] Error cleaning up WebSocket:`, error);
            }
        }
        
        this.emit('destroyed', this.workerId);
    }
}

export default SpiralWorkerAdapter;
