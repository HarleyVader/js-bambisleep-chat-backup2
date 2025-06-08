import { promises as fsPromises } from 'fs';
import fs from 'fs';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import axios from 'axios';

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
// Database module is imported dynamically to prevent circular dependencies

// Import routes
import indexRoute from './routes/index.js';
import psychodelicTriggerManiaRouter from './routes/psychodelic-trigger-mania.js';
import helpRoute from './routes/help.js';
import chatRouter, { basePath as chatBasePath } from './routes/chat.js';
import healthRoute from './routes/health.js';

import Logger from './utils/logger.js';
import errorHandler from './utils/errorHandler.js';

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

// Unified database monitoring function that consolidates startDbHealthMonitor, startConnectionPoolMonitor, and startConnectionMonitoring
function startUnifiedDatabaseMonitor() {
  const healthInterval = config.DB_HEALTH_CHECK_INTERVAL || 60000;
  const poolInterval = config.CONNECTION_POOL_CHECK_INTERVAL || 300000;
  const connectionInterval = config.CONNECTION_MONITORING_INTERVAL || 30000;

  // Database health monitoring - runs most frequently for critical health checks
  scheduledTasks.addTask('dbHealthCheck', async () => {
    try {
      const db = await import('./config/db.js');
      const { checkAllDatabasesHealth, connectAllDatabases, hasConnection } = db.default;

      // Check if connection is available first
      if (!hasConnection()) {
        logger.warning('Database connection unavailable, attempting reconnection');
        try {
          await connectAllDatabases(1);
        } catch (reconnErr) {
          logger.error(`Reconnection failed: ${reconnErr.message}`);
        }
        return;
      }

      // Check health of all database connections with error protection
      let healthResults;
      try {
        healthResults = await Promise.resolve(checkAllDatabasesHealth()).catch(err => {
          logger.error(`Health check failed: ${err.message}`);
          return { main: { status: 'error', error: err.message }, profiles: { status: 'error', error: err.message } };
        });
      } catch (innerError) {
        logger.error(`Unexpected health check error: ${innerError.message}`);
        healthResults = { main: { status: 'error', error: innerError.message }, profiles: { status: 'error', error: innerError.message } };
      }

      // Process health results and attempt reconnection if needed
      for (const [type, status] of Object.entries(healthResults)) {
        if (status.status !== 'healthy' && status.status !== 'connected') {
          logger.warning(`${type} database unhealthy: ${status.status}`);
          logger.info(`Attempting ${type} database reconnection`);
          try {
            await Promise.resolve(connectAllDatabases(1)).catch(err => {
              logger.error(`Failed to reconnect ${type} database: ${err.message}`);
            });
          } catch (reconnectError) {
            logger.error(`Reconnection error for ${type}: ${reconnectError.message}`);
          }
        }
      }
    } catch (error) {
      logger.error(`DB health monitor critical failure: ${error.message}`);
      logger.info('Server continuing with limited database functionality');
    }
  }, healthInterval);

  // Connection pool monitoring - runs less frequently for resource optimization
  scheduledTasks.addTask('connectionPoolMonitor', async () => {
    try {
      const dbModule = await import('./config/db.js');
      if (!dbModule.default.hasConnection()) {
        logger.debug('MongoDB connection not ready, skipping pool check');
        return;
      }

      // Use dedicated health check if available, otherwise fallback to manual check
      try {
        const db = await import('./config/db.js').catch(() => ({ default: { checkAllDatabasesHealth: null } }));
        if (db.default.checkAllDatabasesHealth) {
          await db.default.checkAllDatabasesHealth();
          return;
        }
      } catch (importError) {
        logger.debug(`Could not use dedicated pool monitor: ${importError.message}`);
      }

      // Manual pool status check for older MongoDB versions
      if (!mongoose.connection.db || !mongoose.connection.db.serverConfig) {
        logger.debug('MongoDB server configuration not available');
        return;
      }

      const pool = mongoose.connection.db.serverConfig.s?.pool;
      if (!pool) {
        logger.debug('MongoDB connection pool not available');
        return;
      }

      logger.debug(`DB pool: ${pool.totalConnectionCount || 0} total, ${pool.availableConnectionCount || 0} available`);
    } catch (error) {
      logger.error(`Connection pool check failed: ${error.message}`);
    }
  }, poolInterval);

  // Active connection monitoring - tracks socket connections for performance insights
  scheduledTasks.addTask('connectionMonitoring', () => {
    const activeConnections = socketStore ? socketStore.size : 0;
    logger.info(`Active socket connections: ${activeConnections}`);
  }, connectionInterval);

  logger.info('Unified database monitoring started');
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

// Initialize environment and paths
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize logger
const logger = new Logger('Server');
logger.info('Starting BambiSleep.chat server...');

// Git pull detection and auto-restart functionality
function setupGitPullDetection() {
  const gitFetchHeadPath = path.join(path.dirname(__dirname), '.git', 'FETCH_HEAD');
  
  if (fs.existsSync(gitFetchHeadPath)) {
    logger.info('🔍 Watching for git pull changes...');
    
    fs.watchFile(gitFetchHeadPath, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        logger.info('🔄 Git pull detected! Restarting server in 3 seconds...');
        
        // Give git pull time to complete and log the restart
        setTimeout(() => {
          logger.info('🌟 Server restarting due to git pull...');
          process.exit(0);
        }, 3000);
      }
    });
    
    logger.success('✅ Git pull detection active');
  } else {
    logger.warning('⚠️  Git repository not found - auto-restart on git pull disabled');
  }
}

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

    // Add a route to check database status    // Define an API route to check DB health
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
    });

    // Set up middleware
    setupMiddleware(app);

    // Set up routes
    setupRoutes(app);

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
    global.scheduledTasks = scheduledTasks;

    // TEXT2SPEECH (TTS) routes
    setupTTSRoutes(app);

    // Initialize the spirals worker for advanced hypnotic spiral controls
    try {
      logger.info('Initializing spirals worker...');
      spiralsWorker.initialize(server);
      logger.info('Spirals worker initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize spirals worker:', error);
    }


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
async function setupRoutes(app) {
  // Routes that don't strictly require database access
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
      }    });
  }
}

/**
 * Configure TTS routes for the application
 * 
 * @param {Express} app - Express application instance
 */
function setupTTSRoutes(app) {
  // Check if Kokoro API is configured
  if (!config.KOKORO_API_URL) {
    logger.warning('Kokoro API URL not configured, TTS routes will return 503');
    
    // Return service unavailable for all TTS endpoints
    app.get('/api/tts/voices', (req, res) => {
      res.status(503).json({ error: 'TTS service not configured' });
    });
    
    app.get('/api/tts', (req, res) => {
      res.status(503).json({ error: 'TTS service not configured' });
    });
    
    return;
  }

  // Get voice list
  app.get('/api/tts/voices', async (req, res) => {
    try {
      const response = await axios({
        method: 'get',
        url: `${config.KOKORO_API_URL}/voices`,
        headers: {
          'Authorization': `Bearer ${config.KOKORO_API_KEY}`
        },
        timeout: config.TTS_TIMEOUT
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

  // Handle connection errors specifically
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    logger.error('TTS service is unavailable - connection refused');
    return res.status(503).json({
      error: 'TTS service temporarily unavailable',
      details: process.env.NODE_ENV === 'production' ? null : 'Connection to Kokoro API failed'
    });
  }

  // Handle timeout errors
  if (error.code === 'ECONNABORTED') {
    logger.error('TTS request timed out');
    return res.status(504).json({
      error: 'TTS request timed out',
      details: process.env.NODE_ENV === 'production' ? null : 'Request took too long to complete'
    });
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
  let maxAttempts = 3;

  // Increase timeout incrementally with each attempt
  while (attempts < maxAttempts) {
    try {
      logger.info(`TTS: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

      const requestData = {
        model: "kokoro",
        voice: voice,
        input: text,
        response_format: "mp3"
      };      // Use configured timeout with incremental increases
      const timeout = config.TTS_TIMEOUT + (attempts * 5000);

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

      // For connection errors, reduce retry attempts (service likely down)
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        maxAttempts = Math.min(maxAttempts, 1); // Only one attempt for connection errors
      }

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

// Helper functions to reduce redundancy in socket handlers

/**
 * Award XP to a user with consistent logging and validation
 * Centralizes XP awarding logic to prevent duplication
 */
function awardUserXP(socket, xpSystem, amount, reason = 'interaction') {
  if (!socket?.bambiData || !xpSystem) return false;
  
  try {
    xpSystem.awardXP(socket, amount, reason);
    return true;
  } catch (error) {
    logger.error(`Failed to award XP: ${error.message}`);
    return false;
  }
}

/**
 * Log AIGF interaction with standardized error handling
 * Reduces repetitive AIGF logging code throughout socket handlers
 */
async function logAigfInteraction(socketId, username, type, inputData, responseData, duration = 0) {
  try {
    const AigfInteraction = await modelCache.getModel('AigfInteraction');
    
    await aigfLogger.logAigfInteraction(
      AigfInteraction,
      username || 'anonymous',
      type,
      inputData,
      responseData,
      duration,
      socketId
    );
    return true;
  } catch (logError) {
    logger.error(`Failed to log AIGF interaction: ${logError.message}`);
    return false;
  }
}

/**
 * Log AIGF error with standardized error handling
 * Centralizes error logging to prevent code duplication
 */
async function logAigfError(socketId, username, type, inputData, error) {
  try {
    const AigfInteraction = await modelCache.getModel('AigfInteraction');
    
    await aigfLogger.logAigfError(
      AigfInteraction,
      username || 'anonymous',
      type,
      inputData,
      error,
      socketId
    );
    return true;
  } catch (logError) {
    logger.error(`Failed to log AIGF error: ${logError.message}`);
    return false;
  }
}

/**
 * Emit status update with consistent formatting
 * Reduces repetitive status update emissions
 */
function emitStatusUpdate(io, status, info, details) {
  try {
    io.emit('statusUpdate', {
      system: { status, info, details }
    });
  } catch (error) {
    logger.error(`Failed to emit status update: ${error.message}`);
  }
}

/**
 * Execute admin command with standardized error handling and status updates
 * Consolidates the repetitive pattern of admin command execution
 */
async function executeAdminCommand(command, io) {
  const result = { command, success: false, output: '' };
  
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    let commandToRun = '';
    let successMessage = '';
    let statusInfo = '';
    let statusDetails = '';
    
    switch (command) {
      case 'git-pull':
        commandToRun = 'git pull origin MK-XI';
        successMessage = 'Git pull completed successfully';
        statusInfo = 'Code Updated';
        statusDetails = 'Latest changes pulled from repository';
        break;
        
      case 'npm-install':
        commandToRun = 'npm install';
        successMessage = 'NPM install completed successfully';
        statusInfo = 'Dependencies Updated';
        statusDetails = 'Package installation completed';
        break;
        
      case 'git-status':
        const branchResult = await execAsync('git branch --show-current');
        const currentBranch = branchResult.stdout.trim();
        commandToRun = 'git status --porcelain';
        result.success = true;
        result.output = `Branch: ${currentBranch}\nStatus: ${await execAsync(commandToRun).then(r => r.stdout || 'Working tree clean')}`;
        emitStatusUpdate(io, 'maintenance', 'Git Status Check', `Branch: ${currentBranch}`);
        return result;
        
      default:
        throw new Error(`Unknown command: ${command}`);
    }
    
    if (commandToRun) {
      const { stdout } = await execAsync(commandToRun);
      result.success = true;
      result.output = stdout || successMessage;
      
      if (statusInfo) {
        emitStatusUpdate(io, 'maintenance', statusInfo, statusDetails);
      }
    }
  } catch (error) {
    result.output = `${command} failed: ${error.message}`;
    logger.error(`${command} error:`, error);
  }
  
  return result;
}

/**
 * Send error message to socket with consistent formatting
 * Centralizes socket error emission patterns
 */
function emitSocketError(socket, message) {
  try {
    socket.emit('error', { message });
  } catch (error) {
    logger.error(`Failed to emit socket error: ${error.message}`);
  }
}

/**
 * Manage socket store operations with consistent error handling
 * Centralizes socket store management patterns
 */
const socketStoreManager = {
  addSocket(socketStore, socketId, socketData) {
    try {
      socketStore.set(socketId, socketData);
      return true;
    } catch (error) {
      logger.error(`Failed to add socket to store: ${error.message}`);
      return false;
    }
  },

  updateSocket(socketStore, socketId, updates) {
    try {
      const existing = socketStore.get(socketId);
      if (existing) {
        socketStore.set(socketId, { ...existing, ...updates });
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Failed to update socket in store: ${error.message}`);
      return false;
    }
  },

  removeSocket(socketStore, socketId) {
    try {
      const removed = socketStore.delete(socketId);
      return removed;
    } catch (error) {
      logger.error(`Failed to remove socket from store: ${error.message}`);
      return false;
    }
  }
};

/**
 * Cache for dynamically imported models to avoid repeated imports
 * Reduces redundant model import operations
 */
const modelCache = {
  cache: new Map(),
  
  async getModel(modelName) {
    if (this.cache.has(modelName)) {
      return this.cache.get(modelName);
    }
    
    try {
      const module = await import(`./models/${modelName}.js`);
      const model = module.default;
      this.cache.set(modelName, model);
      return model;
    } catch (error) {
      logger.error(`Failed to import model ${modelName}: ${error.message}`);
      return null;
    }
  },

  // Pre-load commonly used models
  async preloadModels() {
    const modelNames = ['AudioInteraction', 'UserInteraction', 'AigfInteraction'];
    await Promise.all(modelNames.map(name => this.getModel(name)));
    logger.info('Common models preloaded');
  }
};

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
    const lmstudio = new Worker(path.join(__dirname, 'workers/lmstudio.js'));    // Restart the worker automatically to maintain AI service availability
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
          await logAigfInteraction(
            msg.socketId,
            msg.username,
            'chat',
            msg.prompt || 'Unknown input',
            responseData,
            processingDuration
          );        } else if (msg.type === 'error') {
          // Provide user-friendly error messages while logging technical details
          logger.error(`Worker error for ${msg.socketId}: ${msg.error}`);
          
          // Send friendly error message to client
          const errorMessage = process.env.NODE_ENV === 'production' 
            ? "Sorry, I couldn't process your request. Please try again."
            : `Error: ${msg.error}`;
            
          io.to(msg.socketId).emit("error", { message: errorMessage });
            // Log AIGF error
          await logAigfError(
            msg.socketId,
            msg.username,
            'chat',
            msg.prompt || 'Unknown input',
            new Error(msg.error)
          );
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
    });    // Log worker information for debugging and monitoring purposes
    lmstudio.on('info', (info) => {
      logger.info('Worker info:', info);
    });    // Recover from worker errors to maintain service availability
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
          : 'anonBambi';        // Store socket reference with centralized management
        socketStoreManager.addSocket(socketStore, socket.id, { socket, username });

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
        }        // Add socket to global store with worker reference  
        socketStoreManager.addSocket(socketStore, socket.id, { socket, worker: lmstudio, files: [] });
        logger.info(`Client connected: ${socket.id} sockets: ${socketStore.size}`);        // Enhanced chat message handling
        socket.on('chat message', async (msg) => {
          try {            // Validate message format
            if (!msg || !msg.data || typeof msg.data !== 'string') {
              logger.warning('Received invalid message format');
              emitSocketError(socket, 'Invalid message format');
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
            try {              // Use sessionService for message handling with cached models
              const AudioInteraction = await modelCache.getModel('AudioInteraction');
              const UserInteraction = await modelCache.getModel('UserInteraction');
              
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
              }              // Give XP for chat interactions
              awardUserXP(socket, xpSystem, 1, 'chat');            } catch (dbError) {
              // Log database error but don't disrupt the user experience
              logger.error(`Failed to save enhanced chat message: ${dbError.message}`, {
                username: messageData.username,
                messageLength: messageData.data?.length || 0
              });
              emitSocketError(socket, 'Failed to save message');
            }
          } catch (error) {
            logger.error('Error in chat message handler:', error);
            emitSocketError(socket, 'Failed to process message');
          }
        });

        // Username setting
        socket.on('set username', (username) => {
          try {
            // Store old username for reference
            const oldUsername = socket.bambiUsername;
            
            // Update username
            socket.bambiUsername = username;
              // Update socket store with new username
            socketStoreManager.updateSocket(socketStore, socket.id, { username });
            
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
        });        // Route AIGF messages to worker thread for processing
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
            });          } catch (error) {
            logger.error('Error in message handler:', error);
            emitSocketError(socket, 'Failed to process your message');
              // Log the error
            (async () => {
              await logAigfError(
                socket.id,
                socket.bambiUsername,
                'chat',
                message,
                error
              );
            })();
          }
        });        // Allow users to trigger audio for themselves or specific targets
        socket.on('play audio', async (data) => {
          try {
            const audioFile = data.audioFile;
            const targetUsername = data.targetUsername; // Optional
              if (!audioFile) {
              return emitSocketError(socket, 'No audio file specified');
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
              // Log audio interaction using cached model
            try {
              const AudioInteraction = await modelCache.getModel('AudioInteraction');
              
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
            awardUserXP(socket, xpSystem, 1, 'audio');          } catch (error) {
            logger.error('Error in play audio handler:', error);
            emitSocketError(socket, 'Failed to play audio');
          }
        });

        // Fixed triggers handler - not nested inside other handlers
        socket.on('triggers', async (data) => {
          logger.info('Received triggers:', data);
          lmstudio.postMessage({
            type: 'triggers',
            triggers: data.triggerNames,
            socketId: socket.id
          });          // Award XP for using triggers
          awardUserXP(socket, xpSystem, 2, 'triggers');
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
            }            // Award XP for collar usage
            awardUserXP(socket, xpSystem, 2, 'collar');
              // Log AIGF interaction for collar
            await logAigfInteraction(
              socket.id,
              socket.bambiUsername,
              'collar',
              collarData.data,
              'Collar text set',
              0
            );
          } catch (error) {
            logger.error('Error in collar handler:', error);
          }
        });        // Clean up resources when users disconnect to prevent memory leaks
        socket.on('disconnect', (reason) => {
          try {
            logger.info('Client disconnected:', socket.id, 'Reason:', reason);            // Get socket data and clean up using centralized management
            socketStoreManager.removeSocket(socketStore, socket.id);
            
            logger.info(`Client disconnected: ${socket.id} sockets: ${socketStore.size}`);
          } catch (error) {
            logger.error('Error in disconnect handler:', error);
          }        });        
        
        // Bridge between client UI and worker thread for real-time settings updates
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
              socketStoreManager.updateSocket(socketStore, socket.id, {
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
          }        });

        // Admin Command Handler
        socket.on('adminCommand', async (data) => {
          try {
            const { command } = data;
            logger.info(`Admin command received: ${command} from ${socket.id}`);

            let result = { command, success: false, output: '' };

            switch (command) {              case 'git-pull':
              case 'npm-install': 
              case 'git-status':
                result = await executeAdminCommand(command, io);
                break;              case 'restart-server':
                try {
                  result.success = true;
                  result.output = 'Server restart initiated';
                  
                  emitStatusUpdate(io, 'maintenance', 'Restarting', 'Server restart in progress');
                  
                  // Delay restart to allow response to be sent
                  setTimeout(() => {
                    process.exit(0);
                  }, 2000);
                } catch (error) {
                  result.output = `Server restart failed: ${error.message}`;
                  logger.error('Server restart error:', error);
                }
                break;

              case 'full-deploy':
                try {
                  const { exec } = await import('child_process');
                  const { promisify } = await import('util');
                  const execAsync = promisify(exec);
                  
                  // Start deployment sequence
                  socket.emit('commandResult', {
                    command: 'full-deploy-start',
                    success: true,
                    output: 'Starting full deployment sequence...'
                  });

                  // Step 1: Git pull
                  io.emit('countdownUpdate', { remaining: 180, progress: 20 });
                  const gitResult = await execAsync('git pull origin MK-XI');
                  
                  // Step 2: NPM install
                  io.emit('countdownUpdate', { remaining: 120, progress: 60 });
                  const npmResult = await execAsync('npm install');
                  
                  // Step 3: Prepare restart
                  io.emit('countdownUpdate', { remaining: 30, progress: 90 });
                  
                  result.success = true;
                  result.output = 'Full deployment completed, restarting server...';
                        // Broadcast completion
              emitStatusUpdate(io, 'maintenance', 'Deployment Complete', 'Full deployment cycle finished');
                  
                  io.emit('countdownUpdate', { remaining: 0, progress: 100 });
                  
                  // Restart server
                  setTimeout(() => {
                    process.exit(0);
                  }, 3000);
                } catch (error) {
                  result.output = `Full deployment failed: ${error.message}`;
                  logger.error('Full deployment error:', error);
                }                break;

              case 'nvm-install':
                try {
                  const nodeVersion = process.version;
                  const { stdout, stderr } = await execAsync('nvm install node');
                  result.success = true;
                  result.output = `NVM install completed. Current: ${nodeVersion}, Latest installed via NVM`;
                    emitStatusUpdate(io, 'maintenance', 'Node Updated', 'Latest Node.js version installed');
                } catch (error) {
                  result.output = `NVM install failed: ${error.message}`;
                  logger.error('NVM install error:', error);
                }
                break;

              case 'git-status':
                try {
                  const { stdout, stderr } = await execAsync('git status --porcelain');
                  const branchResult = await execAsync('git branch --show-current');
                  const currentBranch = branchResult.stdout.trim();
                  
                  result.success = true;
                  result.output = `Branch: ${currentBranch}\nStatus: ${stdout || 'Working tree clean'}`;
                    emitStatusUpdate(io, 'maintenance', 'Git Status Check', `Branch: ${currentBranch}`);
                } catch (error) {
                  result.output = `Git status failed: ${error.message}`;
                  logger.error('Git status error:', error);
                }
                break;

              case 'system-check':
                try {
                  const uptime = process.uptime();
                  const memory = process.memoryUsage();
                  const memoryMB = Math.round(memory.rss / 1024 / 1024);
                  const diskUsage = await execAsync('df -h | head -n 2');
                  
                  result.success = true;
                  result.output = `System Health Check:
Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m
Memory: ${memoryMB}MB RSS
Node: ${process.version}
Platform: ${process.platform}
Disk Usage:
${diskUsage.stdout}`;
                    emitStatusUpdate(io, 'maintenance', 'System Check Complete', `Memory: ${memoryMB}MB, Uptime: ${Math.floor(uptime / 3600)}h`);
                } catch (error) {
                  result.output = `System check failed: ${error.message}`;
                  logger.error('System check error:', error);
                }
                break;

              case 'backup-system':
                try {
                  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                  const backupDir = `backup-${timestamp}`;
                  await execAsync(`mkdir -p ../backups/${backupDir}`);
                  await execAsync(`cp -r ../js-bambisleep-chat ../backups/${backupDir}/`);
                  
                  result.success = true;
                  result.output = `Backup created: ../backups/${backupDir}`;
                    emitStatusUpdate(io, 'maintenance', 'Backup Complete', `Backup stored: ${backupDir}`);
                } catch (error) {
                  result.output = `Backup failed: ${error.message}`;
                  logger.error('Backup error:', error);
                }
                break;

              default:
                result.output = `Unknown command: ${command}`;
            }

            socket.emit('commandResult', result);
          } catch (error) {
            logger.error('Error in adminCommand handler:', error);
            socket.emit('commandResult', {
              command: data.command,
              success: false,
              output: `Command failed: ${error.message}`
            });
          }
        });

        // Mode Change Handler
        socket.on('modeChange', (data) => {
          try {
            const { mode } = data;
            logger.info(`Mode change requested: ${mode} from ${socket.id}`);            if (mode === 'maintenance') {
              enableMaintenanceMode(300); // 5 minutes
              
              io.emit('modeChanged', { mode: 'maintenance' });
              emitStatusUpdate(io, 'maintenance', 'Maintenance Mode Active', 'Serving maintenance page');
              socket.emit('statusUpdate', {
                frontend: { status: 'maintenance', info: 'Maintenance Mode Active', details: 'Serving maintenance page' },
                backend: { status: 'offline', info: 'Under Maintenance', details: 'Server updating...' },
                database: { status: 'online', info: 'Online', details: 'Data preserved' },
                system: { status: 'maintenance', info: 'Manual maintenance activated', details: 'System maintenance in progress' }
              });
            } else if (mode === 'normal') {
              disableMaintenanceMode();
              
              io.emit('modeChanged', { mode: 'normal' });
              socket.emit('statusUpdate', {
                frontend: { status: 'online', info: 'Service Active', details: 'All systems operational' },
                backend: { status: 'online', info: 'Running', details: 'Server operational' },
                database: { status: 'online', info: 'Connected', details: 'Database available' },
                system: { status: 'online', info: 'Normal Operation', details: 'All systems green' }
              });
            }
          } catch (error) {
            logger.error('Error in modeChange handler:', error);
          }
        });

        // System Info Handler
        socket.on('getSystemInfo', () => {
          try {
            const uptime = process.uptime();
            const memory = process.memoryUsage();
            const memoryMB = Math.round(memory.rss / 1024 / 1024);
            const cpuUsage = process.cpuUsage();

            socket.emit('systemInfo', {
              uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
              memory: `${memoryMB}MB RSS`,
              cpu: `${Math.round((cpuUsage.user + cpuUsage.system) / 1000)}ms`
            });
          } catch (error) {
            logger.error('Error in getSystemInfo handler:', error);
          }
        });        // Status Request Handler
        socket.on('requestStatus', () => {
          try {
            const isMaintenanceMode = global.maintenanceMode || false;
              if (isMaintenanceMode) {
              socket.emit('statusUpdate', {
                frontend: { status: 'maintenance', info: 'Maintenance Mode Active', details: 'Serving maintenance page' },
                backend: { status: 'offline', info: 'Under Maintenance', details: 'Server updating...' },
                database: { status: 'online', info: 'Online', details: 'Data preserved' },
                system: { status: 'maintenance', info: 'Maintenance Mode', details: 'System maintenance in progress' }
              });
              
              // Send countdown update
              const remaining = global.maintenanceRetryAfter || 300;
              socket.emit('countdownUpdate', { remaining, progress: 50 });
            } else {
              socket.emit('statusUpdate', {
                frontend: { status: 'online', info: 'Service Active', details: 'All systems operational' },
                backend: { status: 'online', info: 'Running', details: 'Server operational' },
                database: { status: 'online', info: 'Connected', details: 'Database available' },
                system: { status: 'online', info: 'Normal Operation', details: 'All systems green' }
              });
            }
          } catch (error) {
            logger.error('Error in requestStatus handler:', error);
          }
        });

        // Connection Count Handler
        socket.on('getConnectionCount', () => {
          try {
            const connectionCount = socketStore ? socketStore.size : 0;
            socket.emit('connectionCount', { count: connectionCount });
          } catch (error) {
            logger.error('Error in getConnectionCount handler:', error);
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
    }    // Ensure all models are properly registered
    try {
      await ensureModelsRegistered();
      logger.debug('All database models registered successfully');
      
      // Preload commonly used models into cache for better performance
      await modelCache.preloadModels();
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

    startUnifiedDatabaseMonitor();

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

    // Setup git pull detection
    setupGitPullDetection();

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
  try {
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