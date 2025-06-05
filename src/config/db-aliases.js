import Logger from '../utils/logger.js';
import db from './db.js';

const logger = new Logger('DB-Aliases');

/**
 * Helper function to get a model from a specific database connection
 * 
 * @param {string} modelName - The name of the model to get
 * @param {string} connectionType - The type of connection to use ('main', 'profiles', 'chat', 'aigfLogs')
 * @returns {mongoose.Model|null} - The requested model or null if not available
 */
export async function getModel(modelName, connectionType = 'main') {
  try {
    // First, ensure the model is imported
    let modelModule;
    try {
      modelModule = await import(`../models/${modelName}.js`);
    } catch (importError) {
      logger.error(`Failed to import model ${modelName}: ${importError.message}`);
      return null;
    }
    
    // Get the appropriate connection
    let connection;
    switch (connectionType.toLowerCase()) {
      case 'main':
        connection = await db.getConnection();
        break;
      case 'profiles':
        connection = await db.getProfilesConnection();
        break;
      case 'chat':
        connection = await db.getChatConnection();
        break;
      case 'aigflogs':
      case 'aigf_logs':
      case 'aigf':
        connection = await db.getAigfLogsConnection();
        break;
      default:
        logger.error(`Unknown connection type: ${connectionType}`);
        return null;
    }
    
    if (!connection) {
      logger.error(`No database connection available for ${connectionType}`);
      return null;
    }
    
    // Return the model from the specified connection
    return modelModule.default;
  } catch (error) {
    logger.error(`Error getting model ${modelName} from ${connectionType}: ${error.message}`);
    return null;
  }
}

/**
 * Shorthand functions for common models
 */

// Profile models
export async function getProfileModel() {
  return getModel('Profile', 'profiles');
}

// Chat models
export async function getChatMessageModel() {
  return getModel('ChatMessage', 'chat');
}

export async function getEnhancedChatMessageModel() {
  return getModel('EnhancedChatMessage', 'chat');
}

export async function getAudioInteractionModel() {
  return getModel('AudioInteraction', 'chat');
}

export async function getUserInteractionModel() {
  return getModel('UserInteraction', 'chat');
}

// AIGF models
export async function getAigfInteractionModel() {
  return getModel('AigfInteraction', 'aigfLogs');
}

export default {
  getModel,
  getProfileModel,
  getChatMessageModel,
  getEnhancedChatMessageModel,
  getAudioInteractionModel,
  getUserInteractionModel,
  getAigfInteractionModel
};
