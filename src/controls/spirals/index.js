/**
 * Spiral Control Manager
 * Industrial control system integration for spiral visual effects
 */

import { EventEmitter } from 'events';
import Logger from '../../utils/logger.js';

const logger = new Logger('SpiralControlManager');

class SpiralControlManager extends EventEmitter {
    constructor() {
        super();
        this.processVariables = new Map();
        this.controlLoops = new Map();
        this.automationRules = new Map();
        this.spiralWorkers = new Map();
        this.initialized = false;
        
        // Spiral process variable definitions
        this.spiralPVs = {
            'SPIRAL_SPEED': { min: 0.1, max: 10.0, unit: 'rps', default: 1.0 },
            'SPIRAL_INTENSITY': { min: 0.0, max: 1.0, unit: 'percent', default: 0.5 },
            'SPIRAL_RADIUS': { min: 10, max: 500, unit: 'pixels', default: 100 },
            'SPIRAL_COLOR_HUE': { min: 0, max: 360, unit: 'degrees', default: 180 },
            'SPIRAL_SATURATION': { min: 0, max: 100, unit: 'percent', default: 70 },
            'SPIRAL_BRIGHTNESS': { min: 0, max: 100, unit: 'percent', default: 80 },
            'SPIRAL_ARMS': { min: 1, max: 8, unit: 'count', default: 3 },
            'SPIRAL_THICKNESS': { min: 1, max: 20, unit: 'pixels', default: 5 },
            'SPIRAL_ENABLED': { min: 0, max: 1, unit: 'boolean', default: 0 }
        };
        
        this.name = 'SpiralControlManager';
    }
    
    async initialize() {
        try {
            logger.info('[SPIRAL-CTRL] Initializing Spiral Control Manager...');
            
            // Initialize process variables
            this.initializeProcessVariables();
            
            // Setup control loops
            this.initializeControlLoops();
            
            // Setup automation rules
            this.initializeAutomationRules();
            
            // Setup event handlers
            this.setupEventHandlers();
            
            this.initialized = true;
            logger.info('[SPIRAL-CTRL] Spiral Control Manager initialized successfully');
            
            this.emit('initialized');
            return true;
        } catch (error) {
            logger.error('[SPIRAL-CTRL] Failed to initialize:', error);
            throw error;
        }
    }
    
    initializeProcessVariables() {
        logger.info('[SPIRAL-CTRL] Initializing spiral process variables...');
        
        for (const [pvName, config] of Object.entries(this.spiralPVs)) {
            this.processVariables.set(pvName, {
                name: pvName,
                value: config.default,
                setpoint: config.default,
                min: config.min,
                max: config.max,
                unit: config.unit,
                quality: 'GOOD',
                timestamp: new Date(),
                alarm: false,
                lastChanged: new Date()
            });
        }
        
        logger.info(`[SPIRAL-CTRL] Initialized ${this.processVariables.size} process variables`);
    }
    
    initializeControlLoops() {
        logger.info('[SPIRAL-CTRL] Initializing spiral control loops...');
        
        // Spiral Speed Control Loop
        this.controlLoops.set('SPIRAL_SPEED_LOOP', {
            name: 'SPIRAL_SPEED_LOOP',
            type: 'PID',
            pv: 'SPIRAL_SPEED',
            sp: 'SPIRAL_SPEED',
            output: 'SPIRAL_SPEED',
            kp: 1.0,
            ki: 0.1,
            kd: 0.05,
            enabled: true,
            mode: 'AUTO',
            lastUpdate: new Date()
        });
        
        // Spiral Intensity Control Loop
        this.controlLoops.set('SPIRAL_INTENSITY_LOOP', {
            name: 'SPIRAL_INTENSITY_LOOP',
            type: 'PID',
            pv: 'SPIRAL_INTENSITY',
            sp: 'SPIRAL_INTENSITY', 
            output: 'SPIRAL_INTENSITY',
            kp: 1.0,
            ki: 0.2,
            kd: 0.0,
            enabled: true,
            mode: 'AUTO',
            lastUpdate: new Date()
        });
        
        logger.info(`[SPIRAL-CTRL] Initialized ${this.controlLoops.size} control loops`);
    }
    
    initializeAutomationRules() {
        logger.info('[SPIRAL-CTRL] Initializing spiral automation rules...');
        
        // Auto-enable spirals when user activity detected
        this.automationRules.set('AUTO_ENABLE_ON_ACTIVITY', {
            name: 'AUTO_ENABLE_ON_ACTIVITY',
            description: 'Enable spirals when user activity detected',
            enabled: true,
            trigger: 'USER_ACTIVITY_DETECTED',
            conditions: [
                { pv: 'SPIRAL_ENABLED', operator: '==', value: 0 }
            ],
            actions: [
                { type: 'SET_PV', pv: 'SPIRAL_ENABLED', value: 1 },
                { type: 'LOG', message: 'Spirals auto-enabled due to user activity' }
            ]
        });
        
        // Auto-adjust intensity based on time of day
        this.automationRules.set('TIME_BASED_INTENSITY', {
            name: 'TIME_BASED_INTENSITY',
            description: 'Adjust spiral intensity based on time of day',
            enabled: true,
            trigger: 'TIME_SCHEDULE',
            schedule: '*/5 * * * *', // Every 5 minutes
            actions: [
                { type: 'CALCULATE_INTENSITY', formula: 'sin((hour/24)*2*PI)*0.3+0.7' }
            ]
        });
        
        // Safety rule: Disable on high system load
        this.automationRules.set('SAFETY_DISABLE_HIGH_LOAD', {
            name: 'SAFETY_DISABLE_HIGH_LOAD',
            description: 'Disable spirals when system load is high',
            enabled: true,
            trigger: 'SYSTEM_LOAD_HIGH',
            conditions: [
                { pv: 'SYSTEM_CPU_LOAD', operator: '>', value: 80 }
            ],
            actions: [
                { type: 'SET_PV', pv: 'SPIRAL_ENABLED', value: 0 },
                { type: 'ALARM', level: 'WARNING', message: 'Spirals disabled due to high system load' }
            ]
        });
        
        logger.info(`[SPIRAL-CTRL] Initialized ${this.automationRules.size} automation rules`);
    }
    
    setupEventHandlers() {
        // Handle process variable changes
        this.on('pvChanged', this.handlePVChange.bind(this));
        
        // Handle control loop updates
        this.on('controlLoopUpdate', this.handleControlLoopUpdate.bind(this));
        
        // Handle automation rule triggers
        this.on('automationTrigger', this.handleAutomationTrigger.bind(this));
    }
    
    // Process Variable Management
    getPV(name) {
        return this.processVariables.get(name);
    }
    
    setPV(name, value, quality = 'GOOD') {
        const pv = this.processVariables.get(name);
        if (!pv) {
            logger.warn(`[SPIRAL-CTRL] Attempt to set unknown PV: ${name}`);
            return false;
        }
        
        // Validate value range
        const clampedValue = Math.max(pv.min, Math.min(pv.max, value));
        
        if (pv.value !== clampedValue) {
            const oldValue = pv.value;
            pv.value = clampedValue;
            pv.quality = quality;
            pv.timestamp = new Date();
            pv.lastChanged = new Date();
            
            logger.debug(`[SPIRAL-CTRL] PV ${name}: ${oldValue} -> ${clampedValue}`);
            
            this.emit('pvChanged', {
                name: name,
                oldValue: oldValue,
                newValue: clampedValue,
                pv: pv
            });
            
            // Update connected spiral workers
            this.updateSpiralWorkers(name, clampedValue);
        }
        
        return true;
    }
    
    setSP(name, setpoint) {
        const pv = this.processVariables.get(name);
        if (!pv) {
            logger.warn(`[SPIRAL-CTRL] Attempt to set setpoint for unknown PV: ${name}`);
            return false;
        }
        
        const clampedSP = Math.max(pv.min, Math.min(pv.max, setpoint));
        pv.setpoint = clampedSP;
        
        logger.debug(`[SPIRAL-CTRL] Setpoint ${name}: ${clampedSP}`);
        
        this.emit('setpointChanged', {
            name: name,
            setpoint: clampedSP,
            pv: pv
        });
        
        return true;
    }
    
    // Control Loop Management
    runControlLoops() {
        if (!this.initialized) return;
        
        for (const [loopName, loop] of this.controlLoops.entries()) {
            if (!loop.enabled || loop.mode !== 'AUTO') continue;
            
            try {
                this.executeControlLoop(loop);
            } catch (error) {
                logger.error(`[SPIRAL-CTRL] Error in control loop ${loopName}:`, error);
            }
        }
    }
    
    executeControlLoop(loop) {
        const pv = this.processVariables.get(loop.pv);
        if (!pv) return;
        
        const error = pv.setpoint - pv.value;
        const now = new Date();
        const dt = (now - loop.lastUpdate) / 1000; // Convert to seconds
        
        if (dt <= 0) return;
        
        // Simple PID calculation
        loop.integral = (loop.integral || 0) + error * dt;
        const derivative = ((error - (loop.lastError || 0)) / dt);
        
        const output = (loop.kp * error) + 
                      (loop.ki * loop.integral) + 
                      (loop.kd * derivative);
        
        // Apply output to process variable
        const newValue = pv.value + (output * dt);
        this.setPV(loop.output, newValue);
        
        loop.lastError = error;
        loop.lastUpdate = now;
    }
    
    // Automation Rule Processing
    processAutomationRules() {
        if (!this.initialized) return;
        
        for (const [ruleName, rule] of this.automationRules.entries()) {
            if (!rule.enabled) continue;
            
            try {
                this.evaluateAutomationRule(rule);
            } catch (error) {
                logger.error(`[SPIRAL-CTRL] Error in automation rule ${ruleName}:`, error);
            }
        }
    }
    
    evaluateAutomationRule(rule) {
        // Check conditions
        if (rule.conditions) {
            for (const condition of rule.conditions) {
                const pv = this.processVariables.get(condition.pv);
                if (!pv) continue;
                
                const result = this.evaluateCondition(pv.value, condition.operator, condition.value);
                if (!result) return; // Condition not met
            }
        }
        
        // Execute actions
        if (rule.actions) {
            for (const action of rule.actions) {
                this.executeAction(action);
            }
        }
    }
    
    evaluateCondition(value, operator, target) {
        switch (operator) {
            case '==': return value === target;
            case '!=': return value !== target;
            case '>': return value > target;
            case '<': return value < target;
            case '>=': return value >= target;
            case '<=': return value <= target;
            default: return false;
        }
    }
    
    executeAction(action) {
        switch (action.type) {
            case 'SET_PV':
                this.setPV(action.pv, action.value);
                break;
            case 'LOG':
                logger.info(`[SPIRAL-CTRL] Automation: ${action.message}`);
                break;
            case 'ALARM':
                this.emit('alarm', {
                    level: action.level,
                    message: action.message,
                    timestamp: new Date()
                });
                break;
            case 'CALCULATE_INTENSITY':
                const hour = new Date().getHours();
                const intensity = eval(action.formula.replace('hour', hour).replace('PI', 'Math.PI'));
                this.setPV('SPIRAL_INTENSITY', intensity);
                break;
        }
    }
      // Spiral Worker Integration
    async registerSpiralWorker(workerId, config) {
        const { ws, username } = config;
        
        // Create adapter for the WebSocket connection
        const { default: SpiralWorkerAdapter } = await import('./adapter.js');
        const adapter = new SpiralWorkerAdapter(workerId, ws);
        
        this.spiralWorkers.set(workerId, adapter);
        logger.info(`[SPIRAL-CTRL] Registered spiral worker: ${workerId} for user: ${username}`);
        
        // Set up adapter event handlers
        adapter.on('parameterChanged', (event) => {
            // Map spiral parameter to process variable
            const pvName = this.mapSpiralParamToPV(event.parameter);
            if (pvName) {
                this.setPV(pvName, event.newValue);
            }
        });
        
        adapter.on('performanceWarning', (event) => {
            this.emit('alarm', {
                level: 'WARNING',
                message: `Spiral performance warning: ${event.type} = ${event.value}`,
                workerId: event.workerId,
                timestamp: new Date()
            });
        });
        
        adapter.on('disconnected', (workerId) => {
            this.unregisterSpiralWorker(workerId);
        });
        
        // Send current spiral settings to worker
        this.syncWorkerSettings(workerId);
        
        return adapter;
    }
    
    unregisterSpiralWorker(workerId) {
        this.spiralWorkers.delete(workerId);
        logger.info(`[SPIRAL-CTRL] Unregistered spiral worker: ${workerId}`);
    }
    
    updateSpiralWorkers(pvName, value) {
        const spiralParam = this.mapPVToSpiralParam(pvName);
        if (!spiralParam) return;
        
        for (const [workerId, worker] of this.spiralWorkers.entries()) {
            try {
                if (worker && typeof worker.updateParameter === 'function') {
                    worker.updateParameter(spiralParam, value);
                }
            } catch (error) {
                logger.error(`[SPIRAL-CTRL] Error updating worker ${workerId}:`, error);
            }
        }
    }
    
    syncWorkerSettings(workerId) {
        const worker = this.spiralWorkers.get(workerId);
        if (!worker) return;
        
        const settings = {};
        for (const [pvName, pv] of this.processVariables.entries()) {
            const spiralParam = this.mapPVToSpiralParam(pvName);
            if (spiralParam) {
                settings[spiralParam] = pv.value;
            }
        }
        
        if (typeof worker.updateSettings === 'function') {
            worker.updateSettings(settings);
        }
    }
      mapPVToSpiralParam(pvName) {
        const mapping = {
            'SPIRAL_SPEED': 'speed',
            'SPIRAL_INTENSITY': 'intensity',
            'SPIRAL_RADIUS': 'radius',
            'SPIRAL_COLOR_HUE': 'hue',
            'SPIRAL_SATURATION': 'saturation',
            'SPIRAL_BRIGHTNESS': 'brightness',
            'SPIRAL_ARMS': 'arms',
            'SPIRAL_THICKNESS': 'thickness',
            'SPIRAL_ENABLED': 'enabled'
        };
        return mapping[pvName];
    }
    
    mapSpiralParamToPV(spiralParam) {
        const mapping = {
            'speed': 'SPIRAL_SPEED',
            'intensity': 'SPIRAL_INTENSITY',
            'radius': 'SPIRAL_RADIUS',
            'hue': 'SPIRAL_COLOR_HUE',
            'saturation': 'SPIRAL_SATURATION',
            'brightness': 'SPIRAL_BRIGHTNESS',
            'arms': 'SPIRAL_ARMS',
            'thickness': 'SPIRAL_THICKNESS',
            'enabled': 'SPIRAL_ENABLED'
        };
        return mapping[spiralParam];
    }
    
    // Event Handlers
    handlePVChange(event) {
        logger.debug(`[SPIRAL-CTRL] PV Changed: ${event.name} = ${event.newValue}`);
        
        // Trigger automation rules that depend on this PV
        this.emit('automationTrigger', {
            type: 'PV_CHANGE',
            pv: event.name,
            value: event.newValue
        });
    }
    
    handleControlLoopUpdate(event) {
        logger.debug(`[SPIRAL-CTRL] Control Loop Update: ${event.loopName}`);
    }
    
    handleAutomationTrigger(event) {
        logger.debug(`[SPIRAL-CTRL] Automation Trigger: ${event.type}`);
        this.processAutomationRules();
    }
    
    // Status and Diagnostics
    getStatus() {
        return {
            initialized: this.initialized,
            processVariables: Array.from(this.processVariables.entries()).map(([name, pv]) => ({
                name: name,
                value: pv.value,
                setpoint: pv.setpoint,
                quality: pv.quality,
                unit: pv.unit
            })),
            controlLoops: Array.from(this.controlLoops.entries()).map(([name, loop]) => ({
                name: name,
                enabled: loop.enabled,
                mode: loop.mode,
                type: loop.type
            })),
            automationRules: Array.from(this.automationRules.entries()).map(([name, rule]) => ({
                name: name,
                enabled: rule.enabled,
                description: rule.description
            })),
            activeWorkers: this.spiralWorkers.size
        };
    }
    
    // Shutdown
    async shutdown() {
        logger.info('[SPIRAL-CTRL] Shutting down Spiral Control Manager...');
        
        // Disable all spirals
        this.setPV('SPIRAL_ENABLED', 0);
        
        // Clear all workers
        this.spiralWorkers.clear();
        
        this.initialized = false;
        this.emit('shutdown');
        
        logger.info('[SPIRAL-CTRL] Spiral Control Manager shutdown complete');
    }
}

export default SpiralControlManager;
