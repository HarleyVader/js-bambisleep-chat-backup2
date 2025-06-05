import Logger from '../utils/logger.js';
import { WebSocketServer } from 'ws';
import errorHandler from '../utils/errorHandler.js';

const logger = new Logger('SpiralsWorker');

// Constants for transgender flag colors (light blue, pink, white)
const TRANS_COLORS = [
  [91, 206, 250],  // Light blue
  [245, 169, 184], // Pink
  [255, 255, 255]  // White
];

// Class to handle spiral animation parameters and state
class SpiralsWorker {
  constructor() {
    this.clients = new Map();
    this.defaultSettings = {
      spiral1Width: 5.0,
      spiral2Width: 3.0,
      spiral1Speed: 20,
      spiral2Speed: 15,
      wavePatternInverted: false,
      colorMode: 'default', // default, trans, rainbow      pulseRate: 0,         // 0 means no pulse
      performanceMode: 'balanced', // minimal, balanced, quality
      rainbowSpeed: 5,      // Speed of rainbow color cycling
      opacityLevel: 1.0,    // Opacity from 0.1 to 1.0
      showFPS: false,       // Whether to show FPS counter
    };
    
    // Settings mapped by username
    this.userSettings = new Map();
    
    // Store active animations by username
    this.activeAnimations = new Map();
  }
  
  initialize(server) {
    try {
      // Create WebSocket server
      this.wss = new WebSocketServer({ noServer: true });
      
      // Handle connections
      this.wss.on('connection', (ws, req) => {
        try {
          // Extract username from URL
          const url = new URL(req.url, `http://${req.headers.host}`);
          const username = url.searchParams.get('username') || 'anonymous';
          
          logger.info(`New spirals connection from ${username}`);
          
          // Store client connection
          this.clients.set(username, ws);
          
          // Initialize user settings if not exist
          if (!this.userSettings.has(username)) {
            this.userSettings.set(username, { ...this.defaultSettings });
          }
          
          // Send initial settings
          this.sendSettings(username);
          
          // Handle incoming messages
          ws.on('message', (message) => this.handleMessage(message, username));
          
          // Handle disconnection
          ws.on('close', () => {
            logger.info(`Spirals connection closed for ${username}`);
            this.clients.delete(username);
            
            // Stop any active animations
            if (this.activeAnimations.has(username)) {
              clearInterval(this.activeAnimations.get(username));
              this.activeAnimations.delete(username);
            }
          });
          
          // Handle errors
          ws.on('error', (error) => {
            errorHandler.handleError(error, 'Spirals WebSocket Error');
            logger.error(`WebSocket error for ${username}: ${error.message}`);
          });
        } catch (error) {
          errorHandler.handleError(error, 'Spirals WebSocket Connection Error');
        }
      });
      
      // Handle upgrade
      server.on('upgrade', (request, socket, head) => {
        const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
        
        if (pathname === '/spirals') {
          this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss.emit('connection', ws, request);
          });
        }
      });
      
      logger.info('Spirals worker initialized');
    } catch (error) {
      errorHandler.handleError(error, 'Spirals Worker Initialization Error');
    }
  }
  
  // Handle incoming messages
  handleMessage(message, username) {
    try {
      const data = JSON.parse(message);
      logger.debug(`Received message from ${username}: ${JSON.stringify(data)}`);
      
      switch (data.action) {
        case 'updateSettings':
          this.updateSettings(username, data.settings);
          break;
        
        case 'startAnimation':
          this.startAnimation(username, data.type);
          break;
        
        case 'stopAnimation':
          this.stopAnimation(username);
          break;
          
        case 'getSettings':
          this.sendSettings(username);
          break;
          
        default:
          logger.warn(`Unknown action received: ${data.action}`);
      }
    } catch (error) {
      errorHandler.handleError(error, 'Spirals Message Handling Error');
    }
  }
  
  // Update user settings
  updateSettings(username, newSettings) {
    try {
      if (!this.userSettings.has(username)) {
        this.userSettings.set(username, { ...this.defaultSettings });
      }
      
      // Update only the provided settings
      const currentSettings = this.userSettings.get(username);
      const updatedSettings = { ...currentSettings, ...newSettings };
      
      // Validate and sanitize settings
      this.validateSettings(updatedSettings);
      
      // Save updated settings
      this.userSettings.set(username, updatedSettings);
      
      // Send updated settings to client
      this.sendSettings(username);
      
      logger.info(`Updated settings for ${username}`);
    } catch (error) {
      errorHandler.handleError(error, 'Spirals Settings Update Error');
    }
  }
  
  // Validate and sanitize settings
  validateSettings(settings) {
    // Ensure numeric values are within valid ranges
    settings.spiral1Width = Math.max(1, Math.min(10, parseFloat(settings.spiral1Width) || 5.0));
    settings.spiral2Width = Math.max(1, Math.min(10, parseFloat(settings.spiral2Width) || 3.0));
    settings.spiral1Speed = Math.max(5, Math.min(50, parseInt(settings.spiral1Speed) || 20));
    settings.spiral2Speed = Math.max(5, Math.min(50, parseInt(settings.spiral2Speed) || 15));
    settings.rainbowSpeed = Math.max(1, Math.min(20, parseInt(settings.rainbowSpeed) || 5));
    settings.opacityLevel = Math.max(0.1, Math.min(1.0, parseFloat(settings.opacityLevel) || 1.0));
      // Ensure boolean values are actually booleans
    settings.wavePatternInverted = !!settings.wavePatternInverted;
    settings.showFPS = !!settings.showFPS;
    
    // Ensure string values are valid options
    if (!['default', 'trans', 'rainbow'].includes(settings.colorMode)) {
      settings.colorMode = 'default';
    }
    
    if (!['minimal', 'balanced', 'quality'].includes(settings.performanceMode)) {
      settings.performanceMode = 'balanced';
    }
    
    return settings;
  }
  
  // Send current settings to client
  sendSettings(username) {
    try {
      const ws = this.clients.get(username);
      if (ws && ws.readyState === 1) { // 1 = OPEN
        const settings = this.userSettings.get(username) || this.defaultSettings;
        
        ws.send(JSON.stringify({
          action: 'settings',
          settings: settings
        }));
      }
    } catch (error) {
      errorHandler.handleError(error, 'Spirals Send Settings Error');
    }
  }
  
  // Start animation sequence
  startAnimation(username, type = 'pulse') {
    try {
      // Stop any existing animation
      this.stopAnimation(username);
      
      const ws = this.clients.get(username);
      if (!ws || ws.readyState !== 1) return;
      
      const settings = this.userSettings.get(username) || this.defaultSettings;
      
      // Different animation types
      switch (type) {
        case 'pulse':
          // Gradually change spiral speeds for hypnotic effect
          let pulsePhase = 0;
          const pulseInterval = setInterval(() => {
            pulsePhase += 0.05;
            const speedFactor = Math.sin(pulsePhase) * 0.5 + 1.0; // 0.5 to 1.5
            
            ws.send(JSON.stringify({
              action: 'updateAnimation',
              params: {
                spiral1Speed: settings.spiral1Speed * speedFactor,
                spiral2Speed: settings.spiral2Speed * (2 - speedFactor) // Inverse relationship
              }
            }));
          }, 100);
          
          this.activeAnimations.set(username, pulseInterval);
          break;
          
        case 'rainbow':
          // Cycle through colors
          let rainbowPhase = 0;
          const rainbowInterval = setInterval(() => {
            rainbowPhase += 0.02 * settings.rainbowSpeed;
            
            // Generate rainbow colors
            const hue1 = (rainbowPhase * 360) % 360;
            const hue2 = ((rainbowPhase + 0.5) * 360) % 360;
            
            const color1 = this.hslToRgb(hue1 / 360, 1, 0.5);
            const color2 = this.hslToRgb(hue2 / 360, 1, 0.5);
            
            ws.send(JSON.stringify({
              action: 'updateAnimation',
              params: {
                spiral1Color: color1,
                spiral2Color: color2
              }
            }));
          }, 50);
          
          this.activeAnimations.set(username, rainbowInterval);
          break;
          
        case 'trans':
          // Cycle through transgender flag colors
          let transIndex = 0;
          const transInterval = setInterval(() => {
            // Slowly cycle through trans flag colors
            const colorIndex1 = transIndex % TRANS_COLORS.length;
            const colorIndex2 = (transIndex + 1) % TRANS_COLORS.length;
            
            ws.send(JSON.stringify({
              action: 'updateAnimation',
              params: {
                spiral1Color: TRANS_COLORS[colorIndex1],
                spiral2Color: TRANS_COLORS[colorIndex2]
              }
            }));
            
            // Increment every 3 seconds
            transIndex = (transIndex + 1) % TRANS_COLORS.length;
          }, 3000);
          
          this.activeAnimations.set(username, transInterval);
          break;
          
        case 'wave':
          // Invert wave pattern periodically
          const waveInterval = setInterval(() => {
            const invertedState = !settings.wavePatternInverted;
            
            ws.send(JSON.stringify({
              action: 'updateAnimation',
              params: {
                wavePatternInverted: invertedState
              }
            }));
            
            // Update the saved setting
            settings.wavePatternInverted = invertedState;
            this.userSettings.set(username, settings);
          }, 5000);
          
          this.activeAnimations.set(username, waveInterval);
          break;
          
        default:
          logger.warn(`Unknown animation type: ${type}`);
      }
      
      logger.info(`Started ${type} animation for ${username}`);
    } catch (error) {
      errorHandler.handleError(error, 'Spirals Animation Start Error');
    }
  }
  
  // Stop animation
  stopAnimation(username) {
    try {
      if (this.activeAnimations.has(username)) {
        clearInterval(this.activeAnimations.get(username));
        this.activeAnimations.delete(username);
        logger.info(`Stopped animation for ${username}`);
      }
    } catch (error) {
      errorHandler.handleError(error, 'Spirals Animation Stop Error');
    }
  }
  
  // Convert HSL to RGB (helper for rainbow effects)
  hslToRgb(h, s, l) {
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
  
  // Process user commands (for AIGF agent integration)
  processCommand(username, command) {
    try {
      logger.info(`Processing command from ${username}: ${command}`);
      
      // Only process if client is connected
      if (!this.clients.has(username)) {
        logger.warn(`No active connection for ${username}`);
        return { success: false, message: 'No active connection' };
      }
      
      // Parse natural language command
      if (command.includes('faster')) {
        // Increase speed
        const settings = this.userSettings.get(username);
        const newSpeed1 = Math.min(50, settings.spiral1Speed + 5);
        const newSpeed2 = Math.min(50, settings.spiral2Speed + 5);
        
        this.updateSettings(username, {
          spiral1Speed: newSpeed1,
          spiral2Speed: newSpeed2
        });
        
        return { 
          success: true, 
          message: `Increased spiral speeds to ${newSpeed1} and ${newSpeed2}` 
        };
      } 
      else if (command.includes('slower')) {
        // Decrease speed
        const settings = this.userSettings.get(username);
        const newSpeed1 = Math.max(5, settings.spiral1Speed - 5);
        const newSpeed2 = Math.max(5, settings.spiral2Speed - 5);
        
        this.updateSettings(username, {
          spiral1Speed: newSpeed1,
          spiral2Speed: newSpeed2
        });
        
        return { 
          success: true, 
          message: `Decreased spiral speeds to ${newSpeed1} and ${newSpeed2}` 
        };
      }
      else if (command.includes('invert') || command.includes('flip')) {
        // Invert wave pattern
        const settings = this.userSettings.get(username);
        const newState = !settings.wavePatternInverted;
        
        this.updateSettings(username, {
          wavePatternInverted: newState
        });
        
        return { 
          success: true, 
          message: `Wave pattern inversion ${newState ? 'enabled' : 'disabled'}` 
        };
      }
      else if (command.includes('rainbow')) {
        // Enable rainbow mode
        this.updateSettings(username, {
          colorMode: 'rainbow'
        });
        
        // Start rainbow animation
        this.startAnimation(username, 'rainbow');
        
        return { 
          success: true, 
          message: 'Rainbow color mode activated' 
        };
      }
      else if (command.includes('trans') || command.includes('transgender')) {
        // Enable transgender flag colors
        this.updateSettings(username, {
          colorMode: 'trans'
        });
        
        // Start trans animation
        this.startAnimation(username, 'trans');
        
        return { 
          success: true, 
          message: 'Transgender flag colors activated' 
        };
      }
      else if (command.includes('pulse')) {
        // Start pulse animation
        this.startAnimation(username, 'pulse');
        
        return { 
          success: true, 
          message: 'Pulse animation started' 
        };
      }
      else if (command.includes('stop')) {
        // Stop animations
        this.stopAnimation(username);
        
        return { 
          success: true, 
          message: 'Animations stopped' 
        };      }
      else if (command.includes('performance') || command.includes('minimal')) {
        // Set performance mode
        this.updateSettings(username, {
          performanceMode: 'minimal'
        });
        
        return { 
          success: true, 
          message: 'Minimal performance mode activated for better framerate' 
        };
      }
      else if (command.includes('quality') || command.includes('high quality')) {
        // Set quality mode
        this.updateSettings(username, {
          performanceMode: 'quality'
        });
        
        return { 
          success: true, 
          message: 'High quality mode activated' 
        };
      }
      else if (command.includes('show fps') || command.includes('display fps')) {
        // Show FPS counter
        this.updateSettings(username, {
          showFPS: true
        });
        
        return { 
          success: true, 
          message: 'FPS counter enabled' 
        };
      }
      else if (command.includes('hide fps')) {
        // Hide FPS counter
        this.updateSettings(username, {
          showFPS: false
        });
        
        return { 
          success: true, 
          message: 'FPS counter disabled' 
        };
      }
      else {
        return { success: false, message: 'Unknown command' };
      }
    } catch (error) {
      errorHandler.handleError(error, 'Spirals Command Processing Error');
      return { success: false, message: 'Error processing command' };
    }
  }
}

// Export as singleton
export default new SpiralsWorker();
