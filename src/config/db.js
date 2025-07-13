import Logger from '../utils/logger.js';
import mongoose from 'mongoose';

// Initialize logger
const logger = new Logger('Database');

// Track connection status
let isConnected = false;
let profilesConnection = null;
let chatConnection = null;
let aigfLogsConnection = null;
let inFallbackModeState = false;
let modelsRegistered = false;

/**
 * Connect to the main MongoDB database
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<mongoose.Connection>} The database connection
 */
export async function connectToDatabase(retries = 3) {
  if (isConnected && mongoose.connection.readyState === 1) {
    logger.info('Using existing database connection');
    return mongoose.connection;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const connectionOptions = {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        retryWrites: true,
        retryReads: true
      };

      await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
      
      isConnected = true;
      logger.success(`Connected to main database (attempt ${attempt}/${retries})`);
      
      // Set up connection event handlers
      mongoose.connection.on('error', (err) => {
        logger.error(`Database connection error: ${err.message}`);
        isConnected = false;
      });
      
      mongoose.connection.on('disconnected', () => {
        logger.warning('Database disconnected');
        isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('Database reconnected');
        isConnected = true;
      });
      
      return mongoose.connection;
    } catch (error) {
      logger.error(`Failed to connect to database (attempt ${attempt}/${retries}): ${error.message}`);
      
      if (attempt === retries) {
        logger.error('All database connection attempts failed');
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}

/**
 * Connect to the profiles MongoDB database
 * @returns {Promise<mongoose.Connection>} The profiles database connection
 */
export async function connectToProfilesDatabase() {
  if (profilesConnection) {
    logger.info('Using existing profiles database connection');
    return profilesConnection;
  }

  try {
    // Create a separate connection for profiles
    profilesConnection = mongoose.createConnection(process.env.MONGODB_PROFILES);
    
    logger.info('Connected to profiles database');
    
    // Set up connection event handlers
    profilesConnection.on('error', (err) => {
      logger.error(`Profiles database connection error: ${err.message}`);
      profilesConnection = null;
    });
    
    profilesConnection.on('disconnected', () => {
      logger.warning('Profiles database disconnected');
      profilesConnection = null;
    });
    
    return profilesConnection;
  } catch (error) {
    logger.error(`Failed to connect to profiles database: ${error.message}`);
    throw error;
  }
}

/**
 * Connect to the chat MongoDB database
 * @returns {Promise<mongoose.Connection>} The chat database connection
 */
export async function connectToChatDatabase() {
  if (chatConnection) {
    logger.info('Using existing chat database connection');
    return chatConnection;
  }

  try {
    // Create a separate connection for chat data
    chatConnection = mongoose.createConnection(process.env.MONGODB_CHAT);
    
    logger.info('Connected to chat database');
    
    // Set up connection event handlers
    chatConnection.on('error', (err) => {
      logger.error(`Chat database connection error: ${err.message}`);
      chatConnection = null;
    });
    
    chatConnection.on('disconnected', () => {
      logger.warning('Chat database disconnected');
      chatConnection = null;
    });
    
    return chatConnection;
  } catch (error) {
    logger.error(`Failed to connect to chat database: ${error.message}`);
    throw error;
  }
}

/**
 * Connect to the AIGF logs MongoDB database
 * @returns {Promise<mongoose.Connection>} The AIGF logs database connection
 */
export async function connectToAigfLogsDatabase() {
  if (aigfLogsConnection) {
    logger.info('Using existing AIGF logs database connection');
    return aigfLogsConnection;
  }

  try {
    // Create a separate connection for AIGF logs
    aigfLogsConnection = mongoose.createConnection(process.env.MONGODB_AIGF_LOGS);
    
    logger.info('Connected to AIGF logs database');
    
    // Set up connection event handlers
    aigfLogsConnection.on('error', (err) => {
      logger.error(`AIGF logs database connection error: ${err.message}`);
      aigfLogsConnection = null;
    });
    
    aigfLogsConnection.on('disconnected', () => {
      logger.warning('AIGF logs database disconnected');
      aigfLogsConnection = null;
    });
    
    return aigfLogsConnection;
  } catch (error) {
    logger.error(`Failed to connect to AIGF logs database: ${error.message}`);
    throw error;
  }
}

/**
 * Disconnect from all databases
 */
export async function disconnectFromDatabases() {
  try {
    if (isConnected) {
      await mongoose.disconnect();
      logger.info('Disconnected from main database');
    }
    
    if (profilesConnection) {
      await profilesConnection.close();
      logger.info('Disconnected from profiles database');
    }
    
    if (chatConnection) {
      await chatConnection.close();
      logger.info('Disconnected from chat database');
    }
    
    if (aigfLogsConnection) {
      await aigfLogsConnection.close();
      logger.info('Disconnected from AIGF logs database');
    }
    
    isConnected = false;
    profilesConnection = null;
    chatConnection = null;
    aigfLogsConnection = null;
  } catch (error) {
    logger.error(`Error during database disconnection: ${error.message}`);
    throw error;
  }
}

/**
 * Alias for connectToDatabase for server.js compatibility
 */
export async function connectDB(retries = 1, force = false) {
  try {
    if (isConnected && !force) {
      return { success: true, connection: mongoose.connection };
    }
    
    let lastError = null;
    for (let i = 0; i < retries; i++) {
      try {
        const connection = await connectToDatabase();
        return { success: true, connection };
      } catch (error) {
        lastError = error;
        logger.warning(`Connection attempt ${i + 1}/${retries} failed: ${error.message}`);
        if (i < retries - 1) {
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    return { success: false, error: lastError?.message || 'Failed to connect to database' };
  } catch (error) {
    logger.error(`Failed to connect to database: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Alias for connectToProfilesDatabase for server.js compatibility
 */
export async function connectProfilesDB(retries = 1, force = false) {
  try {
    if (profilesConnection && !force) {
      return { success: true, connection: profilesConnection };
    }
    
    let lastError = null;
    for (let i = 0; i < retries; i++) {
      try {
        const connection = await connectToProfilesDatabase();
        return { success: true, connection };
      } catch (error) {
        lastError = error;
        logger.warning(`Profiles connection attempt ${i + 1}/${retries} failed: ${error.message}`);
        if (i < retries - 1) {
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    return { success: false, error: lastError?.message || 'Failed to connect to profiles database' };
  } catch (error) {
    logger.error(`Failed to connect to profiles database: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Alias for connectToChatDatabase for server.js compatibility
 */
export async function connectChatDB(retries = 1, force = false) {
  try {
    if (chatConnection && !force) {
      return { success: true, connection: chatConnection };
    }
    
    let lastError = null;
    for (let i = 0; i < retries; i++) {
      try {
        const connection = await connectToChatDatabase();
        return { success: true, connection };
      } catch (error) {
        lastError = error;
        logger.warning(`Chat connection attempt ${i + 1}/${retries} failed: ${error.message}`);
        if (i < retries - 1) {
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    return { success: false, error: lastError?.message || 'Failed to connect to chat database' };
  } catch (error) {
    logger.error(`Failed to connect to chat database: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Alias for connectToAigfLogsDatabase for server.js compatibility
 */
export async function connectAigfLogsDB(retries = 1, force = false) {
  try {
    if (aigfLogsConnection && !force) {
      return { success: true, connection: aigfLogsConnection };
    }
    
    let lastError = null;
    for (let i = 0; i < retries; i++) {
      try {
        const connection = await connectToAigfLogsDatabase();
        return { success: true, connection };
      } catch (error) {
        lastError = error;
        logger.warning(`AIGF logs connection attempt ${i + 1}/${retries} failed: ${error.message}`);
        if (i < retries - 1) {
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    return { success: false, error: lastError?.message || 'Failed to connect to AIGF logs database' };
  } catch (error) {
    logger.error(`Failed to connect to AIGF logs database: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Connect to all databases with retries
 */
export async function connectAllDatabases(retries = 1) {
  const mainResult = await connectDB(retries);
  const profilesResult = await connectProfilesDB(retries);
  const chatResult = await connectChatDB(retries);
  const aigfLogsResult = await connectAigfLogsDB(retries);
  
  return {
    main: mainResult.success,
    profiles: profilesResult.success,
    chat: chatResult.success,
    aigfLogs: aigfLogsResult.success
  };
}

/**
 * Alias for disconnectFromDatabases for server.js compatibility
 */
export async function disconnectDB() {
  return disconnectFromDatabases();
}

/**
 * Check health of database connections
 */
export async function checkDBHealth() {
  try {
    // Check main connection
    const mainStatus = mongoose.connection.readyState;
    const mainConnected = mainStatus === 1;
    
    // Check profiles connection
    const profilesStatus = profilesConnection ? profilesConnection.readyState : 0;
    const profilesConnected = profilesStatus === 1;
    
    return {
      status: mainConnected && profilesConnected ? 'healthy' : 'unhealthy',
      main: mainConnected ? 'connected' : 'disconnected',
      profiles: profilesConnected ? 'connected' : 'disconnected'
    };
  } catch (error) {
    logger.error(`Error checking database health: ${error.message}`);
    return { status: 'error', error: error.message };
  }
}

/**
 * Check health of all database connections
 */
export async function checkAllDatabasesHealth() {
  try {
    const mainStatus = mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy';
    const profilesStatus = profilesConnection && profilesConnection.readyState === 1 ? 'healthy' : 'unhealthy';
    const chatStatus = chatConnection && chatConnection.readyState === 1 ? 'healthy' : 'unhealthy';
    const aigfLogsStatus = aigfLogsConnection && aigfLogsConnection.readyState === 1 ? 'healthy' : 'unhealthy';
    
    return {
      main: { 
        status: mainStatus,
        database: mongoose.connection.db?.databaseName || 'unknown'
      },
      profiles: { 
        status: profilesStatus,
        database: profilesConnection?.db?.databaseName || 'unknown'
      },
      chat: { 
        status: chatStatus,
        database: chatConnection?.db?.databaseName || 'unknown'
      },
      aigfLogs: { 
        status: aigfLogsStatus,
        database: aigfLogsConnection?.db?.databaseName || 'unknown'
      }
    };
  } catch (error) {
    logger.error(`Error checking all databases health: ${error.message}`);
    return {
      main: { status: 'error', error: error.message },
      profiles: { status: 'error', error: error.message },
      chat: { status: 'error', error: error.message },
      aigfLogs: { status: 'error', error: error.message }
    };
  }
}

/**
 * Check if the main database connection is healthy
 */
export async function isDatabaseConnectionHealthy(type = 'main') {
  try {
    if (type === 'main') {
      return mongoose.connection.readyState === 1;
    } else if (type === 'profiles') {
      return profilesConnection && profilesConnection.readyState === 1;
    } else if (type === 'chat') {
      return chatConnection && chatConnection.readyState === 1;
    } else if (type === 'aigfLogs') {
      return aigfLogsConnection && aigfLogsConnection.readyState === 1;
    } else if (type === 'all') {
      return mongoose.connection.readyState === 1 && 
             profilesConnection && profilesConnection.readyState === 1 &&
             chatConnection && chatConnection.readyState === 1 &&
             aigfLogsConnection && aigfLogsConnection.readyState === 1;
    }
    return false;
  } catch (error) {
    logger.error(`Error checking database health: ${error.message}`);
    return false;
  }
}

/**
 * Check if any database connection is available
 */
export function hasConnection() {
  return mongoose.connection.readyState === 1 || 
         (profilesConnection && profilesConnection.readyState === 1) ||
         (chatConnection && chatConnection.readyState === 1) ||
         (aigfLogsConnection && aigfLogsConnection.readyState === 1);
}

/**
 * Check if using fallback database mode
 */
export function inFallbackMode() {
  return inFallbackModeState;
}

/**
 * Set fallback mode
 */
export function setFallbackMode(mode) {
  inFallbackModeState = !!mode;
}

/**
 * Ensure all models are registered
 */
export async function ensureModelsRegistered() {
  if (modelsRegistered) return true;
  
  try {
    // Dynamically import models to prevent circular dependencies
    await Promise.all([
      import('../models/SessionHistory.js'),
      import('../models/Profile.js')
    ]);
    
    modelsRegistered = true;
    return true;
  } catch (error) {
    logger.error(`Failed to register models: ${error.message}`);
    return false;
  }
}

/**
 * Execute a function with a database connection
 * Handles reconnection if necessary
 */
export async function withDbConnection(callback, options = {}) {
  const { retries = 1, requireConnection = true } = options;
  
  // Check if we have a connection
  if (requireConnection && !hasConnection()) {
    // Try to reconnect
    const reconnected = await connectDB(1).then(res => res.success);
    if (!reconnected && requireConnection) {
      throw new Error('No database connection available');
    }
  }
  
  // Execute the callback
  let lastError = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await callback();
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
  
  // If we get here, all retries failed
  if (lastError) throw lastError;
}

/**
 * Get a model from the main database or profiles database
 * @param {string} modelName - The name of the model to get
 * @param {string} connectionType - 'main' or 'profiles'
 * @returns {mongoose.Model} The requested model
 */
export function getModel(modelName, connectionType = 'main') {
  try {
    if (connectionType === 'profiles' && profilesConnection) {
      return profilesConnection.model(modelName);
    } else if (connectionType === 'chat' && chatConnection) {
      return chatConnection.model(modelName);
    } else if (connectionType === 'aigfLogs' && aigfLogsConnection) {
      return aigfLogsConnection.model(modelName);
    }
    return mongoose.model(modelName);
  } catch (error) {
    logger.error(`Failed to get model ${modelName}: ${error.message}`);
    throw error;
  }
}

/**
 * Get the main database connection
 * @returns {mongoose.Connection|null} The database connection or null if not connected
 */
export function getConnection() {
  if (!isConnected) {
    logger.warning('Main database connection not available');
    return null;
  }
  return mongoose.connection;
}

/**
 * Get the profiles database connection
 * @returns {mongoose.Connection|null} The profiles database connection or null if not connected
 */
export function getProfilesConnection() {
  if (!profilesConnection) {
    logger.warning('Profiles database connection not available');
    return null;
  }
  return profilesConnection;
}

/**
 * Get the chat database connection
 * @returns {mongoose.Connection|null} The chat database connection or null if not connected
 */
export function getChatConnection() {
  if (!chatConnection) {
    logger.warning('Chat database connection not available');
    return null;
  }
  return chatConnection;
}

/**
 * Get the AIGF logs database connection
 * @returns {mongoose.Connection|null} The AIGF logs database connection or null if not connected
 */
export function getAigfLogsConnection() {
  if (!aigfLogsConnection) {
    logger.warning('AIGF logs database connection not available');
    return null;
  }
  return aigfLogsConnection;
}

export default {
  connectToDatabase,
  connectToProfilesDatabase,
  connectToChatDatabase,
  connectToAigfLogsDatabase,
  disconnectFromDatabases,
  connectDB,
  connectProfilesDB,
  connectChatDB,
  connectAigfLogsDB,
  connectAllDatabases,
  disconnectDB,
  checkDBHealth,
  checkAllDatabasesHealth,
  isDatabaseConnectionHealthy,
  hasConnection,
  inFallbackMode,
  setFallbackMode,
  ensureModelsRegistered,
  withDbConnection,
  getModel,
  getConnection,
  getProfilesConnection,
  getChatConnection,
  getAigfLogsConnection
};