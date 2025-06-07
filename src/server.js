import { promises as fsPromises } from 'fs';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import axios from 'axios';
import { spawn } from 'child_process';

// Import modules
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import mongoose from 'mongoose';
import { Worker } from 'worker_threads';

// Import custom utils
import urlValidator from './utils/urlValidator.js';
import audioTriggers from './utils/audioTriggers.js';
import userMentions from './utils/userMentions.js';
import aigfLogger from './utils/aigfLogger.js';
import sessionService from './services/sessionService.js';

// Import workers
import spiralsWorker from './workers/spirals.js';

// Import configuration
import config from './config/config.js';
import footerConfig from './config/footer.config.js';
// Database module is imported dynamically to prevent circular dependencies

// Import routes
import indexRoute from './routes/index.js';
import psychodelicTriggerManiaRouter from './routes/psychodelic-trigger-mania.js';
import helpRoute from './routes/help.js';
import chatRouter, { basePath as chatBasePath } from './routes/chat.js';
import healthRoute from './routes/health.js';
import bnncsRoutes from './routes/bnncs.js';

import Logger from './utils/logger.js';
import errorHandler from './utils/errorHandler.js';

// Import Bambi Control Network
import bambiControlNetwork from './services/bambiControlNetwork.js';

// Fix the registerModels function to properly export the models
async function registerModels() {
  try {
    // Import Profile model - fix schema extraction
    const ProfileModule = await import('./models/Profile.js');
    if (!mongoose.models.Profile) {
      // ProfileModule.default already has the model created in the file
      // Just ensure it's registered in mongoose models
      mongoose.models.Profile = ProfileModule.default;
      logger.info('Profile model registered');
    }

    // Import SessionHistory model - same fix
    const SessionHistoryModule = await import('./models/SessionHistory.js');
    if (!mongoose.models.SessionHistory) {
      // SessionHistoryModule.default already has the model created in the file
      mongoose.models.SessionHistory = SessionHistoryModule.default;
      logger.info('SessionHistory model registered');
    }    // Initialize session service chat model
    await sessionService.initSessionService();
    logger.info('SessionService chat model registered');
    
    const AudioInteractionModule = await import('./models/AudioInteraction.js');
    if (!mongoose.models.AudioInteraction) {
      mongoose.models.AudioInteraction = AudioInteractionModule.default;
      logger.info('AudioInteraction model registered');
    }
    
    const UserInteractionModule = await import('./models/UserInteraction.js');
    if (!mongoose.models.UserInteraction) {
      mongoose.models.UserInteraction = UserInteractionModule.default;
      logger.info('UserInteraction model registered');
    }
    
    const AigfInteractionModule = await import('./models/AigfInteraction.js');
    if (!mongoose.models.AigfInteraction) {
      mongoose.models.AigfInteraction = AigfInteractionModule.default;
      logger.info('AigfInteraction model registered');
    }
      // Models have been registered
    logger.success('All models registered successfully');
  } catch (error) {
    logger.error(`Model registration error: ${error.message}`);
  }
}

// Initialize these at the top of the file
const memoryMonitor = {
  start(interval = 60000) {
    this.interval = setInterval(() => this.checkMemory(), interval);
    logger.info(`Memory monitor started with interval ${interval}ms`);
  },

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  },

  checkMemory() {
    const used = process.memoryUsage();
    logger.debug(`Memory usage: RSS ${Math.round(used.rss / 1024 / 1024)}MB, Heap ${Math.round(used.heapUsed / 1024 / 1024)}/${Math.round(used.heapTotal / 1024 / 1024)}MB`);

    // Force garbage collection if memory pressure is high
    if (used.heapUsed > used.heapTotal * 0.85) {
      logger.warning('Memory pressure detected, suggesting garbage collection');
      global.gc && global.gc();
    }
  },

  getClientScript() {
    return `
      // Memory monitoring client script
      console.log('Memory monitoring active');
      setInterval(() => {
        const memory = performance.memory;
        if (memory) {
          console.log('Memory: ' + Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB / ' + 
                       Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB');
        }
      }, 60000);
    `;
  }
};

const scheduledTasks = {
  tasks: [],
  initialize() {
    logger.info('Initializing scheduled tasks');
  },

  addTask(name, fn, interval) {
    const task = {
      name,
      fn,
      interval,
      timer: setInterval(fn, interval)
    };
    this.tasks.push(task);
    return task;
  },

  stopAll() {
    this.tasks.forEach(task => {
      clearInterval(task.timer);
    });
    this.tasks = [];
  },

  stop() {
    // Adding alias for stopAll to handle shutdown correctly
    this.stopAll();
  }
};

// Define empty arrays for database routes
const dbRoutes = [];

// Function to monitor database health
function startDbHealthMonitor() {
  const interval = config.DB_HEALTH_CHECK_INTERVAL || 60000; scheduledTasks.addTask('dbHealthCheck', async () => {
    try {
      // Import database module dynamically to prevent circular dependencies
      const db = await import('./config/db.js');
      const { checkAllDatabasesHealth, connectAllDatabases, hasConnection } = db.default;

      // First check if connection is available at all
      if (!hasConnection()) {
        logger.warning('Database connection is not available, attempting reconnection');
        try {
          await connectAllDatabases(1);
        } catch (reconnErr) {
          logger.error(`Failed to reconnect to database: ${reconnErr.message}`);
        }
        return;
      }

      // Safely check health of all database connections with double protection
      let healthResults;
      try {
        healthResults = await Promise.resolve(checkAllDatabasesHealth()).catch(err => {
          logger.error(`Failed to check database health: ${err.message}`);
          return {
            main: { status: 'error', error: err.message },
            profiles: { status: 'error', error: err.message }
          };
        });
      } catch (innerError) {
        logger.error(`Unexpected error during health check: ${innerError.message}`);
        healthResults = {
          main: { status: 'error', error: innerError.message },
          profiles: { status: 'error', error: innerError.message }
        };
      }

      // Log database health status
      for (const [type, status] of Object.entries(healthResults)) {
        if (status.status !== 'healthy' && status.status !== 'connected') {
          logger.warning(`${type} database connection not healthy: ${status.status}`);
          // Try to reconnect to unhealthy database
          logger.info(`Attempting to reconnect to ${type} database`);
          try {            // Import database module dynamically to prevent circular dependencies
            const db = await import('./config/db.js');
            const { connectAllDatabases } = db.default;

            await Promise.resolve(connectAllDatabases(1)).catch(err => {
              logger.error(`Failed to reconnect to ${type} database: ${err.message}`);
              // Continue server operations even if reconnection fails
            });
          } catch (reconnectError) {
            logger.error(`Error during database reconnection: ${reconnectError.message}`);
            // Continue server operations even if reconnection fails
          }
        }
      }
    } catch (error) {
      // This outer catch provides an additional safety net
      logger.error(`DB health check critical failure: ${error.message}`);
      logger.info('Server will continue running with limited database functionality');
    }
  }, interval);
}

// Function to monitor connection pool
function startConnectionPoolMonitor() {
  const interval = config.CONNECTION_POOL_CHECK_INTERVAL || 300000;
  scheduledTasks.addTask('connectionPoolMonitor', async () => {
    try {
      // First check if we have a connection monitor function available
      try {        // Dynamically import db to avoid circular dependencies
        const db = await import('./config/db.js').catch(() => {
          return { default: { checkDBHealth: null } };
        });
        if (db.default.checkAllDatabasesHealth) {
          await db.default.checkAllDatabasesHealth();
          return;
        }
      } catch (importError) {
        logger.debug(`Could not use dedicated pool monitor: ${importError.message}`);
      }
      // Fallback: Check if connection exists and is ready
      const dbModule = await import('./config/db.js');
      if (!dbModule.default.hasConnection()) {
        logger.debug('MongoDB connection not ready, skipping pool check');
        return;
      }

      // Then check if db and serverConfig are available
      if (!mongoose.connection.db || !mongoose.connection.db.serverConfig) {
        logger.debug('MongoDB server configuration not available');
        return;
      }

      // Check if pool exists
      const pool = mongoose.connection.db.serverConfig.s?.pool;
      if (!pool) {
        logger.debug('MongoDB connection pool not available');
        return;
      }

      // Now safely log the pool stats
      logger.debug(`DB connection pool: ${pool.totalConnectionCount || 0} total, ${pool.availableConnectionCount || 0} available`);
    } catch (error) {
      logger.error(`Connection pool check failed: ${error.message}`);
      // Error in pool check shouldn't affect server operation
    }
  }, interval);
}

// Function to start connection monitoring
function startConnectionMonitoring(interval) {
  scheduledTasks.addTask('connectionMonitoring', () => {
    const activeConnections = socketStore ? socketStore.size : 0;
    logger.info(`Active connections: ${activeConnections}`);
  }, interval);
}

// Add this middleware definition that was missing
function dbFeatureCheck(required) {
  return async (req, res, next) => {
    if (required) {
      const db = await import('./config/db.js');
      if (!db.default.hasConnection()) {
        return res.render('db-unavailable', {
          message: 'This feature requires database connectivity which is currently unavailable.'
        });
      }
    }
    next();
  };
}

// Add this function to your server.js file
function checkServiceAvailability(req, res, next) {
  // Skip health check endpoints
  if (req.path === '/health' || req.path === '/api/health') {
    return next();
  }

  // Check if the server is in maintenance mode
  if (global.maintenanceMode) {
    const retryAfter = global.maintenanceRetryAfter || 30;
    res.set('Retry-After', retryAfter);

    // For API endpoints return JSON
    if (req.path.startsWith('/api/')) {
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable due to maintenance',
        retryAfter: retryAfter
      });
    }

    // For normal requests, render the service-unavailable page
    return res.status(503).render('service-unavailable', {
      message: 'Service temporarily unavailable due to maintenance',
      retryAfter: retryAfter,
      title: 'Service Unavailable'
    });
  }

  next();
}

// Add these helper functions for maintenance mode management
function enableMaintenanceMode(duration = 300) {
  global.maintenanceMode = true;
  global.maintenanceRetryAfter = duration;
  logger.warning(`Maintenance mode enabled. Will last for ${duration} seconds.`);

  // Schedule automatic disabling of maintenance mode
  setTimeout(() => {
    disableMaintenanceMode();
  }, duration * 1000);
}

function disableMaintenanceMode() {
  global.maintenanceMode = false;
  global.maintenanceRetryAfter = null;
  logger.info('Maintenance mode disabled. Service available again.');
}

// Expose these functions globally
global.enableMaintenanceMode = enableMaintenanceMode;
global.disableMaintenanceMode = disableMaintenanceMode;

/**
 * Reboot server with git pull, npm install, and restart
 * Integrates with Bambi Control Network for status reporting
 */
async function rebootServer(duration = 600) {
  logger.info('🔄 Initiating server reboot sequence...');
  
  try {
    // Enable maintenance mode
    enableMaintenanceMode(duration);
    
    // Report to control network
    if (bambiControlNetwork && bambiControlNetwork.initialized) {
      bambiControlNetwork.emit('systemEvent', {
        type: 'REBOOT_INITIATED',
        message: 'Server reboot sequence started',
        timestamp: Date.now()
      });
    }

    // Step 1: Git pull
    logger.info('📥 Step 1/3: Pulling latest changes...');
    await executeCommand('git', ['pull']);
    
    if (bambiControlNetwork && bambiControlNetwork.initialized) {
      bambiControlNetwork.emit('systemEvent', {
        type: 'GIT_PULL_COMPLETE',
        message: 'Git pull completed successfully',
        timestamp: Date.now()
      });
    }

    // Step 2: NPM install
    logger.info('📦 Step 2/3: Installing dependencies...');
    await executeCommand('npm', ['install']);
    
    if (bambiControlNetwork && bambiControlNetwork.initialized) {
      bambiControlNetwork.emit('systemEvent', {
        type: 'NPM_INSTALL_COMPLETE',
        message: 'NPM install completed successfully',
        timestamp: Date.now()
      });
    }

    // Step 3: Restart server
    logger.info('🚀 Step 3/3: Restarting server...');
    if (bambiControlNetwork && bambiControlNetwork.initialized) {
      bambiControlNetwork.emit('systemEvent', {
        type: 'SERVER_RESTART_INITIATED',
        message: 'Server restart initiated',
        timestamp: Date.now()
      });
    }

    // Schedule the actual restart
    setTimeout(() => {
      logger.info('🔄 Executing server restart...');
      process.exit(0); // Exit gracefully, process manager should restart
    }, 2000);

    return true;
  } catch (error) {
    logger.error(`Reboot failed: ${error.message}`);
    
    if (bambiControlNetwork && bambiControlNetwork.initialized) {
      bambiControlNetwork.emit('systemEvent', {
        type: 'REBOOT_FAILED',
        message: `Server reboot failed: ${error.message}`,
        error: error.message,
        timestamp: Date.now()
      });
    }
    
    // Disable maintenance mode on failure
    disableMaintenanceMode();
    throw error;
  }
}

/**
 * Execute a command and return a promise
 */
function executeCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    logger.info(`Executing: ${command} ${args.join(' ')}`);
    
    const process = spawn(command, args, {
      stdio: 'pipe',
      shell: true
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
      logger.debug(`${command} stdout: ${data.toString().trim()}`);
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
      logger.debug(`${command} stderr: ${data.toString().trim()}`);
    });

    process.on('close', (code) => {
      if (code === 0) {
        logger.info(`${command} completed successfully`);
        resolve({ stdout, stderr, code });
      } else {
        logger.error(`${command} failed with code ${code}`);
        reject(new Error(`${command} failed with code ${code}: ${stderr}`));
      }
    });

    process.on('error', (error) => {
      logger.error(`Failed to execute ${command}: ${error.message}`);
      reject(error);
    });
  });
}

// Expose reboot function globally
global.rebootServer = rebootServer;

// Initialize environment and paths
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize logger
const logger = new Logger('Server');
logger.info('Starting BambiSleep.chat server...');

/**
 * Main application setup
 * 
 * Initializes Express app, HTTP server, and Socket.io
 * Sets up middleware, routes, and socket handlers
 */
async function initializeApp() {
  try {
    // Create Express app and HTTP server
    const app = express();
    const server = http.createServer(app);

    // Set up view engine
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // Initialize Socket.io with configured timeouts
    const io = new SocketIOServer(server, {
      pingTimeout: config.SOCKET_PING_TIMEOUT || 86400000, // 1 day in milliseconds
      pingInterval: config.SOCKET_PING_INTERVAL || 25000,
      cors: {
        origin: config.ALLOWED_ORIGINS || ['https://bambisleep.chat'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Load filtered words for content moderation
    const filteredWords = JSON.parse(await fsPromises.readFile(
      path.join(__dirname, 'filteredWords.json'), 'utf8'
    ));
    
    // Verify DB connection before proceeding with robust health check
    const db = await import('./config/db.js');
    const dbInitResults = await db.default.connectAllDatabases(3);

    if (!dbInitResults.main || !dbInitResults.profiles || !dbInitResults.chat || !dbInitResults.aigfLogs) {
      logger.warning('Some database connections failed, server running in limited mode');
      logger.warning(`Connection status: main=${dbInitResults.main}, profiles=${dbInitResults.profiles}, chat=${dbInitResults.chat}, aigfLogs=${dbInitResults.aigfLogs}`);
    } else {
      logger.success('All database connections established successfully');
    }

    // Register models after DB connection
    await registerModels();

    // Add a route to check database status
    dbRoutes.push('/api/db-status');
      // Define an API route to check DB health
    app.get('/api/db-status', async (req, res) => {
      try {
        const dbHealthCheck = await db.default.checkAllDatabasesHealth();
        res.json({
          healthy: dbHealthCheck.main.status === 'healthy' && 
                   dbHealthCheck.profiles.status === 'healthy' &&
                   dbHealthCheck.chat.status === 'healthy' &&
                   dbHealthCheck.aigfLogs.status === 'healthy',
          details: dbHealthCheck
        });
      } catch (error) {
        res.status(500).json({
          healthy: false,
          error: error.message
        });
      }
    });    // Add API route for server reboot
    app.post('/api/reboot', async (req, res) => {
      try {
        const duration = req.body?.duration || 600; // Default 10 minutes
        
        logger.info('🔄 Reboot requested via API');
        
        // Start reboot process (don't await as it will restart the server)
        rebootServer(duration).catch(error => {
          logger.error('Reboot process failed:', error);
        });
        
        res.json({
          success: true,
          message: 'Server reboot initiated',
          maintenanceDuration: duration,
          timestamp: Date.now()
        });
      } catch (error) {
        logger.error('Reboot API error:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Git webhook endpoint for automatic reboot on push
    app.post('/api/webhook/git-push', async (req, res) => {
      try {
        // Basic security check - verify webhook secret if configured
        const webhookSecret = process.env.GIT_WEBHOOK_SECRET || config.GIT_WEBHOOK_SECRET;
        if (webhookSecret) {
          const providedSecret = req.headers['x-hub-signature-256'] || req.headers['x-secret'] || req.body.secret;
          if (!providedSecret || providedSecret !== webhookSecret) {
            logger.warning('Git webhook: Invalid or missing secret');
            return res.status(401).json({ error: 'Unauthorized webhook request' });
          }
        }

        logger.info('🔄 Git webhook received - initiating automatic reboot...');
        
        // Use existing reboot functionality
        await rebootServer(600); // 10 minute maintenance window
        
        res.status(200).json({ 
          success: true, 
          message: 'Server reboot initiated via git webhook',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error(`Git webhook reboot failed: ${error.message}`);
        res.status(500).json({ 
          error: 'Failed to initiate reboot',
          details: error.message 
        });
      }
    });

    // Set up middleware
    setupMiddleware(app);

    // Set up routes
    setupRoutes(app);

    // Set up TTS routes
    setupTTSRoutes(app);

    // Add route for memory monitoring script
    app.get('/js/memory-monitoring.js', (req, res) => {
      res.type('text/javascript').send(memoryMonitor.getClientScript());
    });

    // Set up socket handlers with shared store for workers
    const socketStore = new Map();
    setupSocketHandlers(io, socketStore, filteredWords);

    // Set up error handlers
    setupErrorHandlers(app);
    
    // Initialize scheduled tasks
    scheduledTasks.initialize();
    global.scheduledTasks = scheduledTasks;    // Initialize the spirals worker for advanced hypnotic spiral controls
    try {
      logger.info('Initializing spirals worker...');
      spiralsWorker.initialize(server);
      logger.info('Spirals worker initialized successfully');
      
      // Integrate spirals worker with controls system
      logger.info('Integrating spirals worker with controls system...');      spiralsWorker.on('clientConnected', async (username, ws) => {
        // Spiral workers are now handled by the simplified control network
        const nodeId = `spiral_${username}_${Date.now()}`;
        bambiControlNetwork.addControlNode(nodeId, {
          type: 'WORKER',
          sessionId: ws.id || nodeId,
          metadata: { username, workerType: 'spiral' }
        });
      });
      
      spiralsWorker.on('clientDisconnected', (username) => {
        // Find and remove spiral control node
        const nodeId = `spiral_${username}`;
        bambiControlNetwork.removeControlNode(nodeId);
      });
      
      logger.info('Spirals worker integrated with controls system');
    } catch (error) {
      logger.error('Failed to initialize spirals worker:', error);
    }// Initialize BNNCS (Bambi Neural Network Control System)
    logger.info('🧠 Starting Bambi Neural Network Control System...');
      // Initialize BDICS (Bambi Distributed Industrial Control System)
    try {      logger.info('🌀 Initializing Bambi Control Network...');
      await bambiControlNetwork.initialize();
      logger.info('✅ Bambi Control Network initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize BDICS:', error);
      throw error;
    }
    
    // Set up BDICS (Bambi Distributed Industrial Control System) event handlers
    bambiControlNetwork.on('automationAction', (action) => {
      if (action.type === 'CASCADE_TRIGGER' && action.targetTriggers) {
        // Emit cascade triggers to all connected clients
        setTimeout(() => {
          io.emit('automation trigger', {
            triggers: action.targetTriggers,
            source: 'BDICS_AUTOMATION',
            type: 'CASCADE'
          });
          logger.info(`🔄 BDICS automation: Cascading triggers ${action.targetTriggers.join(', ')}`);
        }, action.delay || 0);
      }
    });

    // Industrial control event handlers
    bambiControlNetwork.on('alarmEscalation', (data) => {
      logger.warning(`🚨 SCADA Alarm escalated to workstation ${data.workstationId}: ${data.alarm?.description || 'Unknown alarm'}`);
      // Could emit to specific SCADA clients if implemented
    });

    bambiControlNetwork.on('scadaUpdate', (data) => {
      logger.debug(`🖥️ SCADA update for workstation ${data.workstationId}`);
      // Could emit SCADA data to specific clients if implemented
    });

    bambiControlNetwork.on('siteRegistered', (site) => {
      logger.info(`🏭 Remote industrial site registered: ${site.name} (${site.protocol})`);
    });

    bambiControlNetwork.on('nodeRegistered', (node) => {
      logger.debug(`🔗 Industrial node registered: ${node.type} (${node.id})`);
    });

    bambiControlNetwork.on('nodeDisconnected', (node) => {
      logger.debug(`🔌 Industrial node disconnected: ${node.type} (${node.id})`);
    });

    return { app, server, io, socketStore };
  } catch (error) {
    logger.error('Error in initializeApp:', error);
    throw error;
  }
}

/**
 * Configure Express middleware
 * 
 * @param {Express} app - Express application instance
 */
function setupMiddleware(app) {
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }
  }));

  // Add the service availability check middleware
  app.use(checkServiceAvailability);

  // Serve static files with correct MIME types
  app.use('/css', express.static(path.join(__dirname, 'public/css'), {
    setHeaders: (res, path) => {
      if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      }
    }
  }));

  app.use('/js', express.static(path.join(__dirname, 'public/js'), {
    setHeaders: (res, path) => {
      if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));

  app.use('/gif', express.static(path.join(__dirname, 'public/gif')));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/workers', express.static(path.join(__dirname, 'workers')));

  // Serve socket.io client script
  app.get('/socket.io/socket.io.js', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'node_modules/socket.io/client-dist/socket.io.js'));
  });

  // Add backward compatibility redirects
  app.get('/gif/default-header.jpg', (req, res) => {
    res.redirect('/gif/default-header.gif');
  });

  app.get('/config/triggers.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'config/triggers.json'));
  });

  logger.info('Middleware configured');
}

/**
 * Configure routes for the application
 * 
 * @param {Express} app - Express application instance
 */
async function setupRoutes(app) {  // Routes that don't strictly require database access
  const basicRoutes = [
    { path: '/', handler: indexRoute, dbRequired: false },
    { path: '/psychodelic-trigger-mania', handler: psychodelicTriggerManiaRouter, dbRequired: false },
    { path: '/help', handler: helpRoute, dbRequired: false },
    { path: '/health', handler: healthRoute, dbRequired: false },
    { path: chatBasePath, handler: chatRouter, dbRequired: true }
  ];
  // Import and setup docs router
  const docsRouter = await import('./routes/docs.js');
  app.use('/docs', dbFeatureCheck(false), docsRouter.default);
  
  // Setup routes with appropriate database checks
  if (Array.isArray(basicRoutes)) {
    basicRoutes.forEach(route => {
      if (route && route.path && route.handler) {
        app.use(route.path, dbFeatureCheck(route.dbRequired), route.handler);
      }
    });
  }

  if (Array.isArray(dbRoutes)) {
    dbRoutes.forEach(route => {
      if (route && typeof route === 'object' && route.path && route.handler) {
        app.use(route.path, dbFeatureCheck(true), route.handler);
      } else if (route && typeof route === 'string') {
        // For string-only routes, they might be handled elsewhere
        logger.debug(`String route path found: ${route}`);
      }
    });
  }

  // Add BNNCS routes
  app.use('/bnncs', bnncsRoutes);

  // BNNCS API routes
  app.use('/api/bnncs', bnncsRoutes);
}

/**
 * Configure TTS routes for the application
 * 
 * @param {Express} app - Express application instance
 */
function setupTTSRoutes(app) {
  // Get voice list
  app.get('/api/tts/voices', async (req, res) => {
    try {
      const response = await axios({
        method: 'get',
        url: `${config.KOKORO_API_URL}/voices`,
        headers: {
          'Authorization': `Bearer ${config.KOKORO_API_KEY}`
        }
      });

      res.json(response.data);
    } catch (error) {
      logger.error(`Voice listing error: ${error.message}`);
      res.status(500).json({
        error: 'Error fetching voice list',
        details: process.env.NODE_ENV === 'production' ? null : error.message
      });
    }
  });

  // Generate speech
  app.get('/api/tts', async (req, res) => {
    const text = req.query.text;
    const voice = req.query.voice || config.KOKORO_DEFAULT_VOICE;

    if (typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ error: 'Invalid input: text must be a non-empty string' });
    }

    try {
      const response = await fetchTTSFromKokoro(text, voice);

      // Set appropriate headers
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', response.data.length);
      res.setHeader('Cache-Control', 'no-cache');

      // Send the audio data
      res.send(response.data);
    } catch (error) {
      handleTTSError(error, res);
    }
  });

  logger.info('TTS routes configured');
}

/**
 * Handle errors from the TTS API
 * 
 * @param {Error} error - The error that occurred
 * @param {Response} res - Express response object
 */
function handleTTSError(error, res) {
  logger.error(`TTS API Error: ${error.message}`);

  if (error.response) {
    const status = error.response.status;

    if (status === 401) {
      logger.error('Unauthorized access to Kokoro API - invalid API key');
      return res.status(401).json({ error: 'Unauthorized access' });
    } else {
      // For other error types
      const errorDetails = process.env.NODE_ENV === 'production' ? null : error.message;
      return res.status(status).json({
        error: 'Error generating speech',
        details: errorDetails
      });
    }
  }

  return res.status(500).json({
    error: 'Unexpected error in TTS service',
    details: process.env.NODE_ENV === 'production' ? null : error.message
  });
}

/**
 * Fetches text-to-speech audio from Kokoro API
 * 
 * @param {string} text - Text to convert to speech
 * @param {string} voice - Voice ID to use
 * @returns {Promise<AxiosResponse>} - Response containing audio data
 */
async function fetchTTSFromKokoro(text, voice = config.KOKORO_DEFAULT_VOICE) {
  let attempts = 0;
  const maxAttempts = 3;

  // Increase timeout incrementally with each attempt
  while (attempts < maxAttempts) {
    try {
      logger.info(`TTS: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

      const requestData = {
        model: "kokoro",
        voice: voice,
        input: text,
        response_format: "mp3"
      };

      // Increase timeout with each retry
      const timeout = 10000 + (attempts * 5000); // 10s, 15s, 20s

      const response = await axios({
        method: 'post',
        url: `${config.KOKORO_API_URL}/audio/speech`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.KOKORO_API_KEY}`
        },
        data: requestData,
        responseType: 'arraybuffer',
        timeout: timeout
      });

      return response;
    } catch (error) {
      attempts++;

      // For timeout errors specifically, increase wait time
      const waitTime = error.code === 'ECONNABORTED' ? 2000 * attempts : 1000 * attempts;

      if (attempts >= maxAttempts) {
        logger.error(`Error fetching TTS audio after ${maxAttempts} attempts: ${error.message}`);
        throw error;
      }

      // Wait longer between retries for timeouts
      await new Promise(resolve => setTimeout(resolve, waitTime));
      logger.info(`TTS retry ${attempts}/${maxAttempts}`);
    }
  }
}

/**
 * Get profile data for a username
 * @param {string} username - Username to look up
 * @returns {Promise<Object|null>} - Profile data or null if not found
 */
async function getProfileData(username) {
  try {
    // Skip if username is invalid
    if (!username || username === 'anonBambi') return null;

    // Ensure models are registered
    await registerModels();

    // Get profile from database
    const Profile = mongoose.models.Profile;
    if (!Profile) {
      logger.error('Profile model not available');
      return null;
    }

    // Find profile
    const profile = await Profile.findOne({ username: username });

    // Convert to plain object to avoid mongoose issues
    return profile ? profile.toObject() : null;
  } catch (error) {
    logger.error(`Error getting profile for ${username}: ${error.message}`);
    return null;
  }
}

/**
 * Update profile XP
 * @param {string} username - Username to update
 * @param {number} xp - New XP amount
 */
async function updateProfileXP(username, xp) {
  try {
    // Skip if username is invalid
    if (!username || username === 'anonBambi') return;

    // Ensure models are registered
    await registerModels();

    const Profile = mongoose.models.Profile;
    if (!Profile) return;

    // Update or create profile
    await Profile.findOneAndUpdate(
      { username },
      { $set: { xp, lastUpdated: new Date() } },
      { upsert: true }
    );
  } catch (error) {
    logger.error(`Failed to update profile XP for ${username}: ${error.message}`);
  }
}

/**
 * Set up Socket.io event handlers
 * 
 * @param {SocketIO.Server} io - Socket.io server instance
 * @param {Map} socketStore - Map to store socket and worker references
 * @param {string[]} filteredWords - List of words to filter
 */
function setupSocketHandlers(io, socketStore, filteredWords) {
  try {
    // Initialize the LMStudio worker thread
    const lmstudio = new Worker(path.join(__dirname, 'workers/lmstudio.js'));

    // Handle worker exit
    lmstudio.on('exit', (code) => {
      logger.error(`Worker thread exited with code ${code}`);

      // Notify all connected clients
      if (io) {
        io.emit('system', {
          message: 'AI service restarting, please wait...'
        });
      }

      // Start a new worker after a short delay
      setTimeout(() => {
        setupSocketHandlers(io, socketStore, filteredWords);
      }, 1000);
    });

    // Set up worker message handlers
    lmstudio.on("message", async (msg) => {
      try {
        if (msg.type === "log") {
          logger.info(msg.data, msg.socketId);
        } else if (msg.type === 'response') {
          // Convert object responses to strings
          const responseData = typeof msg.data === 'object' ? JSON.stringify(msg.data) : msg.data;

          // Send response to client
          io.to(msg.socketId).emit("response", responseData);
          
          // Log AIGF interaction - get models first
          try {
            const AigfInteraction = await import('./models/AigfInteraction.js').then(module => module.default);
            const startTime = msg.startTime || Date.now() - 1000; // Fallback if no start time
            const processingDuration = Date.now() - startTime;
            
            await aigfLogger.logAigfInteraction(
              AigfInteraction,
              msg.username || 'anonymous',
              'chat',
              msg.prompt || 'Unknown input',
              responseData,
              processingDuration,
              msg.socketId
            );
          } catch (logError) {
            logger.error(`Failed to log AIGF interaction: ${logError.message}`);
          }
        } else if (msg.type === 'error') {
          // Handle error messages from worker
          logger.error(`Worker error for ${msg.socketId}: ${msg.error}`);
          
          // Send friendly error message to client
          const errorMessage = process.env.NODE_ENV === 'production' 
            ? "Sorry, I couldn't process your request. Please try again."
            : `Error: ${msg.error}`;
            
          io.to(msg.socketId).emit("error", { message: errorMessage });
          
          // Log AIGF error
          try {
            const AigfInteraction = await import('./models/AigfInteraction.js').then(module => module.default);
            
            await aigfLogger.logAigfError(
              AigfInteraction,
              msg.username || 'anonymous',
              'chat',
              msg.prompt || 'Unknown input',
              new Error(msg.error),
              msg.socketId
            );
          } catch (logError) {
            logger.error(`Failed to log AIGF error: ${logError.message}`);
          }
        } else if (msg.type === 'worker:settings:response') {
          // Forward settings response to client
          if (msg.socketId) {
            io.to(msg.socketId).emit('worker:settings:response', msg.data);
          }
        } else if (msg.type === 'xp:update') {
          // Forward XP updates to client
          if (msg.socketId) {
            io.to(msg.socketId).emit('xp:update', msg.data);
          }
        } else if (msg.type === 'detected-triggers') {
          // Forward detected triggers to client
          if (msg.socketId && msg.triggers) {
            io.to(msg.socketId).emit('detected-triggers', msg.triggers);
          }
        }
      } catch (error) {
        logger.error('Error in lmstudio message handler:', error);
      }
    });

    // Handle worker info messages - moved outside socket handler
    lmstudio.on('info', (info) => {
      logger.info('Worker info:', info);
    });

    // Handle worker errors - moved outside socket handler
    lmstudio.on('error', (err) => {
      logger.error('Worker error:', err);
      
      // Notify all clients about system issues
      if (io) {
        io.emit('system', {
          message: 'AI service encountered an error, trying to recover...',
          type: 'error'
        });
      }
      
      // Attempt to restart worker if it's a critical error
      if (err.fatal) {
        logger.error('Fatal worker error, attempting restart');
        
        // Start a new worker after a short delay
        setTimeout(() => {
          setupSocketHandlers(io, socketStore, filteredWords);
        }, 5000);
      }
    });

    // Add admin namespace for circuit breaker admin interface
    const adminNamespace = io.of('/admin');
    adminNamespace.on('connection', (socket) => {
      logger.info(`Admin connected to main server: ${socket.id}`);
      let authenticated = false;

      // Authentication handler
      socket.on('authenticate', async (token) => {
        try {
          // Verify token against circuit breaker server
          const response = await axios.post(`http://localhost:6969/api/admin/authenticate`, 
            { token }, 
            { timeout: 5000 }
          );
          
          if (response.data.success) {
            authenticated = true;
            socket.emit('authenticated', { success: true });
            logger.info(`Admin authenticated on main server: ${socket.id}`);
          } else {
            socket.emit('authenticated', { success: false });
            logger.warning(`Admin auth failed on main server: ${socket.id}`);
          }
        } catch (error) {
          logger.error(`Admin auth error: ${error.message}`);
          socket.emit('authenticated', { success: false });
        }
      });

      // Server command handler
      socket.on('serverCommand', async (data) => {
        if (!authenticated) {
          socket.emit('commandResult', { success: false, message: 'Not authenticated' });
          return;
        }

        try {
          const response = await axios.post(`http://localhost:6969/api/admin/server/${data.action}`, 
            { token: process.env.ADMIN_TOKEN }, 
            { timeout: 10000 }
          );
          socket.emit('commandResult', response.data);
        } catch (error) {
          logger.error(`Server command error: ${error.message}`);
          socket.emit('commandResult', { success: false, message: error.message });
        }
      });

      // Git command handler
      socket.on('gitCommand', async (data) => {
        if (!authenticated) {
          socket.emit('gitResult', { success: false, message: 'Not authenticated' });
          return;
        }        try {
          const response = await axios.post(`http://localhost:6970/api/admin/git`, 
            { command: data.command, token: process.env.ADMIN_TOKEN }, 
            { timeout: 15000 }
          );
          socket.emit('gitResult', response.data);
        } catch (error) {
          logger.error(`Git command error: ${error.message}`);
          socket.emit('gitResult', { success: false, message: error.message });
        }
      });

      // Git commit handler
      socket.on('gitCommit', async (data) => {
        if (!authenticated) {
          socket.emit('gitResult', { success: false, message: 'Not authenticated' });
          return;
        }

        try {
          const response = await axios.post(`http://localhost:6969/api/admin/git`, 
            { command: `git commit -m "${data.message}"`, token: process.env.ADMIN_TOKEN }, 
            { timeout: 15000 }
          );
          socket.emit('gitResult', response.data);
        } catch (error) {
          logger.error(`Git commit error: ${error.message}`);
          socket.emit('gitResult', { success: false, message: error.message });
        }
      });

      // Route switching handler
      socket.on('switchRoute', async (data) => {
        if (!authenticated) {
          socket.emit('routeResult', { success: false, message: 'Not authenticated' });
          return;
        }

        try {
          const response = await axios.post(`http://localhost:6970/api/admin/route`, 
            { switched: data.switched, token: process.env.ADMIN_TOKEN }, 
            { timeout: 5000 }
          );
          socket.emit('routeResult', response.data);
        } catch (error) {
          logger.error(`Route switch error: ${error.message}`);
          socket.emit('routeResult', { success: false, message: error.message });
        }
      });

      // Admin status handler
      socket.on('getAdminStatus', async () => {
        if (!authenticated) return;

        try {
          const response = await axios.get(`http://localhost:6970/api/admin/status`, 
            { timeout: 5000 }
          );
          socket.emit('adminStatus', response.data);
        } catch (error) {
          logger.error(`Admin status error: ${error.message}`);
        }
      });

      socket.on('disconnect', () => {
        logger.info(`Admin disconnected from main server: ${socket.id}`);
      });
    });

    // Simple filter function to avoid bad words
    function filter(content) {
      if (!content || !filteredWords || !filteredWords.length) return content;

      if (typeof content !== 'string') {
        content = String(content);
      }

      return content
        .split(' ')
        .map(word => filteredWords.includes(word.toLowerCase()) ? '[filtered]' : word)
        .join(' ')
        .trim();
    }

    // XP system functions
    const xpSystem = {
      requirements: [1000, 2500, 4500, 7000, 12000, 36000, 112000, 332000],

      // Calculate level based on XP
      calculateLevel(xp) {
        let level = 0;
        while (level < this.requirements.length && xp >= this.requirements[level]) {
          level++;
        }
        return level;
      },

      // Award XP to a user
      awardXP(socket, amount, reason = 'interaction') {
        if (!socket.bambiData) return;

        const oldXP = socket.bambiData.xp || 0;
        const oldLevel = this.calculateLevel(oldXP);

        // Add XP
        socket.bambiData.xp = oldXP + amount;
        const newLevel = this.calculateLevel(socket.bambiData.xp);

        // Notify client of XP gain
        socket.emit('xp:update', {
          xp: socket.bambiData.xp,
          level: newLevel,
          xpEarned: amount,
          reason: reason
        });

        // Check for level up
        if (newLevel > oldLevel) {
          socket.emit('level-up', { level: newLevel });
          logger.info(`User ${socket.bambiUsername} leveled up to ${newLevel}`);
        }

        // Save to database if available
        if (socket.bambiUsername && socket.bambiUsername !== 'anonBambi') {
          updateProfileXP(socket.bambiUsername, socket.bambiData.xp);
        }
      }
    };

    io.on('connection', (socket) => {
      try {
        // Connection setup code...
        const cookies = socket.handshake.headers.cookie || '';
        const cookiePairs = cookies.split(';').map(cookie => cookie.trim().split('='));
        const cookieObj = Object.fromEntries(cookiePairs.map(pair => [pair[0], pair[1] || '']));

        const username = cookieObj.bambiname
          ? decodeURIComponent(cookieObj.bambiname)
          : 'anonBambi';

        // Store socket reference
        socketStore.set(socket.id, { socket, username });

        logger.info(`Socket connected: ${socket.id} - User: ${username}`);

        // Initialize user data
        socket.bambiUsername = username;
        socket.bambiData = {
          xp: 0,
          username: username,
          sessionId: null
        };

        if (username === 'anonBambi') {
          socket.emit('prompt username');
        } else {
          // Load profile data if user is not anonymous
          getProfileData(username).then(profile => {
            if (profile) {
              socket.bambiData.xp = profile.xp || 0;
              socket.emit('profile-data', { profile });
              socket.emit('profile-update', {
                xp: profile.xp,
                level: xpSystem.calculateLevel(profile.xp || 0)
              });
            }
          });
        }

        // Add socket to global store
        socketStore.set(socket.id, { socket, worker: lmstudio, files: [] });
        logger.info(`Client connected: ${socket.id} sockets: ${socketStore.size}`);        // Register socket in BDICS (Bambi Distributed Industrial Control System)
        bambiControlNetwork.registerControlNode(socket.id, 'USER', {
          username: socket.bambiUsername || 'anonymous',
          connectTime: Date.now()
        });

        // Enhanced chat message handling
        socket.on('chat message', async (msg) => {
          try {
            // Validate message format
            if (!msg || !msg.data || typeof msg.data !== 'string') {
              logger.warning('Received invalid message format');
              socket.emit('error', { message: 'Invalid message format' });
              return;
            }

            const timestamp = new Date().toISOString();

            // Create message object with consistent structure
            const messageData = {
              username: socket.bambiUsername || 'anonymous',
              data: msg.data,
              timestamp: timestamp
            };

            // Broadcast message to all connected clients first for responsiveness
            io.emit('chat message', messageData);            // Process message for enhanced features (URLs, mentions, triggers)
            try {
              // Use sessionService for message handling
              const AudioInteraction = await import('./models/AudioInteraction.js').then(module => module.default);
              const UserInteraction = await import('./models/UserInteraction.js').then(module => module.default);
              
              // Load triggers for audio detection
              let triggers = [];
              try {
                const fs = await import('fs/promises');
                const triggersPath = path.resolve(path.dirname(__dirname), 'config', 'triggers.json');
                const triggerData = await fs.readFile(triggersPath, 'utf8');
                triggers = JSON.parse(triggerData).triggers || [];
              } catch (triggerError) {
                logger.error('Error loading triggers:', triggerError);
              }
              
              // Save enhanced message to database using sessionService
              const savedMessage = await sessionService.ChatMessage.saveMessage(messageData);
              logger.debug(`Enhanced chat message saved to database: ${savedMessage._id}`);
              
              // Check for audio triggers
              const detectedTriggers = audioTriggers.detectAudioTriggers(msg.data, triggers);
              if (detectedTriggers.length > 0) {
                // Emit triggers to all clients
                io.emit('audio triggers', {
                  username: socket.bambiUsername,
                  triggers: detectedTriggers
                });
                
                // Log audio interactions
                for (const trigger of detectedTriggers) {
                  await audioTriggers.logAudioInteraction(
                    AudioInteraction,
                    socket.bambiUsername,
                    trigger.name,
                    'chat',
                    null, // No specific target
                    savedMessage._id
                  );
                }
              }
              
              // Process user mentions
              const mentions = userMentions.detectUserMentions(msg.data);
              if (mentions.length > 0) {
                // Notify mentioned users
                for (const mention of mentions) {
                  // Find sockets for the mentioned user
                  const mentionedSockets = [];
                  for (const [id, data] of socketStore.entries()) {
                    if (data.socket?.bambiUsername?.toLowerCase() === mention.username.toLowerCase()) {
                      mentionedSockets.push(data.socket);
                    }
                  }
                  
                  // Send notification to mentioned users
                  for (const mentionedSocket of mentionedSockets) {
                    mentionedSocket.emit('mention', {
                      from: socket.bambiUsername,
                      message: msg.data,
                      timestamp: timestamp
                    });
                  }
                  
                  // Log user mention interaction
                  await userMentions.logUserMention(
                    UserInteraction,
                    socket.bambiUsername,
                    mention.username,
                    savedMessage._id
                  );
                }
              }
              
              // Process URLs for security validation
              if (savedMessage.urls && savedMessage.urls.length > 0) {
                // Perform async URL validation for each URL
                for (const urlObj of savedMessage.urls) {
                  // Run validation in background
                  (async () => {
                    const validation = await urlValidator.validateUrl(urlObj.url);
                      // Update URL status in database using sessionService
                    await urlValidator.updateUrlStatus(
                      sessionService.ChatMessage,
                      savedMessage._id,
                      urlObj.url,
                      validation.isClean
                    );
                    
                    // If URL is unsafe, notify users
                    if (!validation.isClean) {
                      io.emit('unsafe url', {
                        messageId: savedMessage._id,
                        url: urlObj.url,
                        reason: validation.reason
                      });
                    }
                  })().catch(error => {
                    logger.error(`URL validation error: ${error.message}`);
                  });
                }
              }

              // Process chat message through BNNCS
              bambiControlNetwork.processControlSignal('CHAT_MESSAGE', {
                message: msg.data,
                username: socket.bambiUsername,
                hasUrls: savedMessage.urls && savedMessage.urls.length > 0,
                detectedTriggers
              }, socket.id);

              // Update node activity
              bambiControlNetwork.updateNodeActivity(socket.id);

              // Give XP for chat interactions
              xpSystem.awardXP(socket, 1, 'chat');            } catch (dbError) {
              // Log database error but don't disrupt the user experience
              logger.error(`Failed to save enhanced chat message: ${dbError.message}`, {
                username: messageData.username,
                messageLength: messageData.data?.length || 0
              });
              socket.emit('error', { message: 'Failed to save message' });
            }
          } catch (error) {
            logger.error('Error in chat message handler:', error);
            socket.emit('error', { message: 'Failed to process message' });
          }
        });

        // Username setting
        socket.on('set username', (username) => {
          try {
            // Store old username for reference
            const oldUsername = socket.bambiUsername;
            
            // Update username
            socket.bambiUsername = username;
            
            // Update socket store
            const socketData = socketStore.get(socket.id);
            if (socketData) {
              socketData.username = username;
              socketStore.set(socket.id, socketData);
            }
            
            // Notify client
            socket.emit('username set', { username });
            
            logger.info(`Username set: ${oldUsername} -> ${username}`);
          } catch (error) {
            logger.error('Error in set username handler:', error);
          }
        });

        // Get profile data
        socket.on('get-profile-data', async (data, callback) => {
          try {
            if (!callback || typeof callback !== 'function') return;
            
            const username = data?.username || socket.bambiUsername;
            
            if (!username || username === 'anonBambi') {
              return callback({ success: false, error: 'No username provided' });
            }
            
            const profile = await getProfileData(username);
            
            if (profile) {
              callback({ success: true, profile });
            } else {
              callback({ success: false, error: 'Profile not found' });
            }
          } catch (error) {
            logger.error('Error getting profile data:', error);
            callback({ success: false, error: 'Failed to load profile data' });
          }
        });

        // Message handler for AIGF
        socket.on("message", (message) => {
          try {
            // Track when the request started for performance monitoring
            const startTime = Date.now();
            
            lmstudio.postMessage({
              type: "message",
              prompt: message,
              socketId: socket.id,
              username: socket.bambiUsername,
              startTime: startTime
            });
          } catch (error) {
            logger.error('Error in message handler:', error);
            socket.emit('error', { message: 'Failed to process your message' });
            
            // Log the error
            (async () => {
              try {
                const AigfInteraction = await import('./models/AigfInteraction.js').then(module => module.default);
                
                await aigfLogger.logAigfError(
                  AigfInteraction,
                  socket.bambiUsername || 'anonymous',
                  'chat',
                  message,
                  error,
                  socket.id
                );
              } catch (logError) {
                logger.error(`Failed to log AIGF error: ${logError.message}`);
              }
            })();
          }
        });

        // Handle audio play in chat
        socket.on('play audio', async (data) => {
          try {
            const audioFile = data.audioFile;
            const targetUsername = data.targetUsername; // Optional
            
            if (!audioFile) {
              return socket.emit('error', { message: 'No audio file specified' });
            }
            
            // Broadcast to target or everyone
            if (targetUsername) {
              // Find socket for target user
              let targetSocket = null;
              for (const [id, data] of socketStore.entries()) {
                if (data.socket?.bambiUsername === targetUsername) {
                  targetSocket = data.socket;
                  break;
                }
              }
              
              // Send to target if found
              if (targetSocket) {
                targetSocket.emit('play audio', {
                  audioFile,
                  sourceUsername: socket.bambiUsername
                });
              }
            } else {
              // Broadcast to everyone
              io.emit('play audio', {
                audioFile,
                sourceUsername: socket.bambiUsername
              });
            }
            
            // Log audio interaction
            try {
              const AudioInteraction = await import('./models/AudioInteraction.js').then(module => module.default);
              
              await audioTriggers.logAudioInteraction(
                AudioInteraction,
                socket.bambiUsername,
                audioFile,
                'direct',
                targetUsername
              );
            } catch (logError) {
              logger.error(`Failed to log audio interaction: ${logError.message}`);
            }
            
            // Award XP
            xpSystem.awardXP(socket, 1, 'audio');
          } catch (error) {
            logger.error('Error in play audio handler:', error);
            socket.emit('error', { message: 'Failed to play audio' });
          }
        });

        // Fixed triggers handler - not nested inside other handlers
        socket.on('triggers', async (data) => {
          logger.info('Received triggers:', data);

          // Process trigger through BNNCS
          bambiControlNetwork.processControlSignal('TRIGGER_ACTIVATION', {
            triggerNames: data.triggerNames,
            triggerDetails: data.triggerDetails,
            username: socket.bambiUsername
          }, socket.id);

          lmstudio.postMessage({
            type: 'triggers',
            triggers: data.triggerNames,
            socketId: socket.id
          });

          // Award XP for using triggers
          xpSystem.awardXP(socket, 2, 'triggers');
        });

        // Collar text handling - moved outside other handlers
        socket.on('collar', async (collarData) => {
          try {
            const filteredCollar = filter(collarData.data);
            lmstudio.postMessage({
              type: 'collar',
              data: filteredCollar,
              socketId: socket.id
            });

            // Emit to target socket if specified
            if (collarData.socketId) {
              io.to(collarData.socketId).emit('collar', filteredCollar);
            }

            // Award XP for collar usage
            xpSystem.awardXP(socket, 2, 'collar');
            
            // Log AIGF interaction for collar
            try {
              const AigfInteraction = await import('./models/AigfInteraction.js').then(module => module.default);
              
              await aigfLogger.logAigfInteraction(
                AigfInteraction,
                socket.bambiUsername || 'anonymous',
                'collar',
                collarData.data,
                'Collar text set',
                0,
                socket.id
              );
            } catch (logError) {
              logger.error(`Failed to log collar interaction: ${logError.message}`);
            }
          } catch (error) {
            logger.error('Error in collar handler:', error);
          }
        });

        // Handle client disconnection
        socket.on('disconnect', (reason) => {
          try {
            logger.info('Client disconnected:', socket.id, 'Reason:', reason);

            // Unregister from BNNCS
            bambiControlNetwork.unregisterControlNode(socket.id);

            // Get socket data and clean up
            const socketData = socketStore.get(socket.id);
            if (socketData) {
              socketStore.delete(socket.id);
            }
            
            logger.info(`Client disconnected: ${socket.id} sockets: ${socketStore.size}`);
          } catch (error) {
            logger.error('Error in disconnect handler:', error);
          }
        });

        // Handle settings updates from client to worker
        socket.on('worker:settings:update', (data) => {
          try {
            if (!data || !data.section) {
              return socket.emit('worker:settings:response', {
                success: false,
                error: 'Invalid settings data'
              });
            }

            // Add socket ID to identify the source
            data.socketId = socket.id;

            // Log settings update
            logger.debug(`Settings update for ${data.section} from ${socket.id}`);
            
            // Store username with socket if provided
            if (data.username && !socket.username) {
              socket.username = data.username;
              socketStore.set(socket.id, {
                socket,
                username: data.username,
                lastActivity: Date.now()
              });
            }

            // Forward settings to worker
            lmstudio.postMessage({
              type: 'settings:update',
              data: data
            });

            // Acknowledge receipt (immediate response)
            socket.emit('worker:settings:response', {
              success: true,
              section: data.section,
              message: 'Settings received'
            });
          } catch (error) {
            logger.error(`Error handling settings update: ${error.message}`);
            socket.emit('worker:settings:response', {
              success: false,
              error: 'Server error processing settings'
            });
          }
        });
      } catch (error) {
        logger.error('Error handling socket connection:', error);
      }
    });
  } catch (error) {
    logger.error('Error in setupSocketHandlers:', error);
  }

}

/**
 * Set up error handlers for the application
 * 
 * @param {Express} app - Express application instance
 */
function setupErrorHandlers(app) {
  app.use(errorHandler);

  logger.info('Error handlers configured');
}

/**
 * Get the server's IP address
 * 
 * @returns {string} - Server IP address
 */
function getServerAddress() {
  try {
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }

    return '127.0.0.1';
  } catch (error) {
    logger.error('Error getting server address:', error);
    return 'localhost';
  }
}

/**
 * Main server initialization sequence
 */
async function startServer() {
  try {
    logger.info('Step 1/5: Connecting to MongoDB...');

    // Import database module
    const db = await import('./config/db.js');
    const {
      connectAllDatabases,
      ensureModelsRegistered,
      inFallbackMode,
      checkAllDatabasesHealth,
      isDatabaseConnectionHealthy
    } = db.default;

    // Connect to all databases with 3 retry attempts
    const dbResults = await connectAllDatabases(3);

    // Check connection results
    if (!dbResults.main) {
      logger.warning('⚠️ Failed to connect to main MongoDB database after multiple attempts.');
      logger.warning('⚠️ Server will start with LIMITED FUNCTIONALITY - database-dependent features disabled.');
    } else if (!(await isDatabaseConnectionHealthy())) {
      logger.warning('⚠️ Database connection reported success but connection is not ready.');
      logger.warning('⚠️ Server will start with LIMITED FUNCTIONALITY - database-dependent features disabled.');
    }

    // Ensure all models are properly registered
    try {
      await ensureModelsRegistered();
      logger.debug('All database models registered successfully');
    } catch (modelError) {
      logger.error(`Failed to register database models: ${modelError.message}`);
    }

    // Log connection status
    const dbHealth = await checkAllDatabasesHealth();

    if (inFallbackMode()) {
      logger.warning('⚠️ Connected to FALLBACK DATABASE - running with limited functionality');
    } else if (dbResults.main && (await isDatabaseConnectionHealthy())) {
      logger.success(`MongoDB connection established (${dbHealth.main?.database || 'unknown'})`);
      if (dbResults.profiles) {
        logger.success(`Profiles database connected (${dbHealth.profiles?.database || 'unknown'})`);
      }
    }

    logger.info('Step 2/5: Initializing application...');
    const { app, server, io, socketStore } = await initializeApp();
    logger.success('Application initialized');

    logger.info('Step 3/5: Starting HTTP server...');
    const PORT = config.SERVER_PORT || 6969;

    server.listen(PORT, () => {
      logger.success(`Server running on http://${getServerAddress()}:${PORT}`);
      logger.success('Server startup completed successfully');
    });

    if (process.env.NODE_ENV === 'production') {
      startConnectionMonitoring(300000);
    } else {
      startConnectionMonitoring(60000);
    }

    // Start database health monitoring
    startDbHealthMonitor();
    startConnectionPoolMonitor();
    logger.info('Database health and connection pool monitors started');

    global.socketStore = socketStore;
    memoryMonitor.start();
    if (process.env.MEMORY_MONITOR_ENABLED === 'true') {
      const monitorInterval = process.env.MEMORY_MONITOR_INTERVAL
        ? parseInt(process.env.MEMORY_MONITOR_INTERVAL)
        : (process.env.NODE_ENV === 'production' ? 60000 : 30000);

      memoryMonitor.start(monitorInterval);
      logger.info(`Enhanced memory monitoring started (interval: ${monitorInterval}ms) to prevent overnight OOM kills`);
    } else {
      memoryMonitor.start(process.env.NODE_ENV === 'production' ? 60000 : 30000);
      logger.info('Standard memory monitoring started to prevent overnight OOM kills');
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception:', err);
      shutdown('UNCAUGHT_EXCEPTION');
    });
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection:', reason);
      shutdown('UNHANDLED_REJECTION');
    });

    // Store the server and io instances globally for proper shutdown
    global.httpServer = server;
    global.io = io;

    // Increase max listeners to prevent warning during rapid shutdown signals
    server.setMaxListeners(25);

    return server;
  } catch (error) {
    logger.error('Error during server startup:', error);
    process.exit(1);
  }
}

// Add this simple shutdown function
function shutdown(signal) {
  logger.info(`Shutdown initiated (${signal})`);

  // Force exit after 3 seconds, no matter what
  setTimeout(() => {
    logger.warning('Forcing process exit');
    process.exit(0);
  }, 3000);

  // Try to close server and database
  try {    // Shutdown Bambi Control Network first for safe shutdown
    if (bambiControlNetwork) {
      bambiControlNetwork.shutdown();
    }

    if (global.httpServer) {
      global.httpServer.close();
    }

    if (mongoose.connection && mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }

    if (scheduledTasks) {
      scheduledTasks.stopAll();
    }

    if (memoryMonitor) {
      memoryMonitor.stop();
    }

    if (global.socketStore) {
      for (const [, socketData] of global.socketStore.entries()) {
        if (socketData.socket) {
          socketData.socket.disconnect(true);
        }
      }
      global.socketStore.clear();
    }
  } catch (error) {
    logger.error(`Error during shutdown: ${error.message}`);
  }
}

// Replace require with dynamic import
const loadModule = async (moduleName) => {
  try {
    return await import(moduleName);
  } catch (error) {
    logger.error(`Failed to import ${moduleName}: ${error.message}`);
    return null;
  }
};

async function saveSessionToDatabase(session) {
  try {
    // Skip if no session data
    if (!session) {
      logger.error('Cannot save null session');
      return null;
    }

    // Ensure session has ID - this is crucial
    const sessionId = session.sessionId || session.id;

    // If still no sessionId, generate one
    if (!sessionId) {
      session.sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    // Make sure models are registered
    await registerModels();

    // Get model directly
    const SessionHistory = mongoose.models.SessionHistory;

    // Match fields to your schema - ensure sessionId is always set
    const sessionData = {
      sessionId: session.sessionId,  // Using the field we just ensured exists
      username: session.username || session.userId || 'anonymous',
      messages: (session.messages || []).map(msg => ({
        role: msg.role || 'user',
        content: msg.content || msg.text || '',
        timestamp: msg.timestamp || new Date()
      })),
      startedAt: session.startTime || session.startedAt || new Date(),
      lastUpdatedAt: new Date()
    };

    // Use findOneAndUpdate with upsert
    const result = await SessionHistory.findOneAndUpdate(
      { sessionId: sessionData.sessionId },  // Be explicit about using sessionId
      sessionData,
      { upsert: true, new: true }
    );

    logger.debug(`Session saved: ${sessionData.sessionId}`);
    return result;
  } catch (error) {
    logger.error(`Error saving session: ${error.message}`);
    return null;
  }
}

startServer();