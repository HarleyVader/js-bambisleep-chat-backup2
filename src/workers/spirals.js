import Logger from '../utils/logger.js';
import { WebSocketServer } from 'ws';

const logger = new Logger('SpiralsWorker');

// Simple spiral worker implementation
class SpiralsWorker {
  constructor() {
    this.clients = new Map();
    this.defaultSettings = {
      spiral1Width: 5.0,
      spiral2Width: 3.0,
      spiral1Speed: 20,
      spiral2Speed: 15,
      opacityLevel: 1.0,
      enabled: false
    };
    
    this.userSettings = new Map();
  }
  
  initialize(server) {
    try {
      this.wss = new WebSocketServer({ noServer: true });
      
      this.wss.on('connection', (ws, req) => {
        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const username = url.searchParams.get('username') || 'anonymous';
          
          logger.info(`New spirals connection from ${username}`);
          
          this.clients.set(username, ws);
          
          ws.on('message', (message) => {
            this.handleMessage(message.toString(), username);
          });
          
          ws.on('close', () => {
            this.clients.delete(username);
            logger.info(`Spirals connection closed for ${username}`);
          });
          
          // Send initial settings
          this.sendSettings(username);
          
        } catch (error) {
          logger.error('Error handling spirals connection:', error);
        }
      });
      
      server.on('upgrade', (request, socket, head) => {
        if (request.url?.includes('/spirals')) {
          this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss.emit('connection', ws, request);
          });
        }
      });
      
      logger.info('Spirals worker initialized');
    } catch (error) {
      logger.error('Spirals Worker Initialization Error:', error);
    }
  }
  
  handleMessage(message, username) {
    try {
      const data = JSON.parse(message);
      logger.debug(`Received message from ${username}: ${JSON.stringify(data)}`);
      
      switch (data.action) {
        case 'updateSettings':
          this.updateSettings(username, data.settings);
          break;
          
        case 'getSettings':
          this.sendSettings(username);
          break;
          
        default:
          logger.warning(`Unknown action: ${data.action}`);
      }
    } catch (error) {
      logger.error(`Error handling message from ${username}:`, error);
    }
  }
  
  updateSettings(username, newSettings) {
    try {
      const settings = this.validateSettings({ ...this.defaultSettings, ...newSettings });
      this.userSettings.set(username, settings);
      
      // Send updated settings back
      this.sendSettings(username);
      
      logger.debug(`Updated settings for ${username}:`, settings);
    } catch (error) {
      logger.error(`Error updating settings for ${username}:`, error);
    }
  }
  
  validateSettings(settings) {
    // Simple validation
    settings.spiral1Width = Math.max(1, Math.min(10, parseFloat(settings.spiral1Width) || 5.0));
    settings.spiral2Width = Math.max(1, Math.min(10, parseFloat(settings.spiral2Width) || 3.0));
    settings.spiral1Speed = Math.max(5, Math.min(50, parseInt(settings.spiral1Speed) || 20));
    settings.spiral2Speed = Math.max(5, Math.min(50, parseInt(settings.spiral2Speed) || 15));
    settings.opacityLevel = Math.max(0.1, Math.min(1.0, parseFloat(settings.opacityLevel) || 1.0));
    settings.enabled = !!settings.enabled;
    
    return settings;
  }
  
  sendSettings(username) {
    try {
      const ws = this.clients.get(username);
      if (!ws) return;
      
      const settings = this.userSettings.get(username) || this.defaultSettings;
      
      ws.send(JSON.stringify({
        type: 'settings',
        data: settings
      }));
    } catch (error) {
      logger.error(`Error sending settings to ${username}:`, error);
    }
  }
}

// Export as singleton
export default new SpiralsWorker();
