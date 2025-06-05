/**
 * Consolidated Session Service for BambiSleep Chat
 * 
 * This service combines functionality from:
 * - ChatMessage and EnhancedChatMessage models
 * - Chat route handling
 * - User mentions utility
 * - URL validation and handling
 * 
 * It provides a centralized service for all chat operations.
 */

import express from 'express';
import mongoose from 'mongoose';
import { withDbConnection, connectToChatDatabase } from '../config/db.js';
import Logger from '../utils/logger.js';
import footerConfig from '../config/footer.config.js';
import config from '../config/config.js';
import Profile from '../models/Profile.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize logger
const logger = new Logger('SessionService');

// Define the enhanced chat message schema
const chatMessageSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    default: 'anonymous'
  },
  data: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  // Enhanced fields
  messageType: {
    type: String,
    enum: ['text', 'audio', 'trigger', 'command', 'url', 'system'],
    default: 'text'
  },
  // Store URLs found in the message for tracking and security
  urls: [{
    url: String,
    isClean: Boolean,
    checkedAt: Date
  }],
  // For user tagging
  mentions: [{
    username: String,
    index: Number
  }],
  // For audio triggering
  audioTriggered: {
    type: String,
    default: null
  },
  // For AIGF interactions
  isAigfResponse: {
    type: Boolean,
    default: false
  },
  // For reply messages
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    default: null
  }
});

/**
 * Retrieves recent chat messages from the database
 * 
 * @param {number} limit - Maximum number of messages to retrieve
 * @returns {Promise<Array>} - Array of chat messages
 */
chatMessageSchema.statics.getRecentMessages = async function(limit = 50) {
  logger.info(`Attempting to retrieve ${limit} recent messages from database`);
  try {
    return withDbConnection(async () => {
      const startTime = Date.now();
      
      // Get the most recent messages by sorting in descending order (-1)
      const messages = await this.find({})
        .sort({ timestamp: -1 }) 
        .limit(limit)
        .lean();
      
      const queryTime = Date.now() - startTime;
      
      // Log detailed information about the retrieved messages
      logger.info(`Retrieved ${messages.length} messages in ${queryTime}ms`, {
        messageCount: messages.length,
        firstMessageId: messages.length > 0 ? messages[0]._id : null,
        lastMessageId: messages.length > 0 ? messages[messages.length-1]._id : null,
        oldestTimestamp: messages.length > 0 ? messages[messages.length-1].timestamp : null,
        newestTimestamp: messages.length > 0 ? messages[0].timestamp : null,
        performanceMs: queryTime
      });
      
      if (messages.length === 0) {
        logger.warning('No messages found in database, this could indicate a data issue');
      }
      
      // Return in chronological order (oldest first) for UI display
      return messages.reverse();
    });
  } catch (error) {
    logger.error(`Error retrieving recent messages: ${error.message}`, { 
      stack: error.stack,
      limit,
      errorName: error.name,
      code: error.code
    });
    // Return empty array instead of throwing to prevent UI failures
    return [];
  }
};

/**
 * Saves a new chat message to the database
 * 
 * @param {Object} messageData - Message data to save
 * @returns {Promise<Object>} - Saved message object
 */
chatMessageSchema.statics.saveMessage = async function(messageData) {
  logger.info(`Attempting to save message from user: ${messageData.username}`);
  try {
    // Extract URLs from message content
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = [];
    let match;
    
    // Check for URLs in the message
    if (messageData.data && typeof messageData.data === 'string') {
      while ((match = urlRegex.exec(messageData.data)) !== null) {
        urls.push({
          url: match[0],
          isClean: true, // Assume URLs are clean by default
          checkedAt: new Date()
        });
      }
    }
    
    // Extract mentions from message content
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    
    // Check for mentions in the message
    if (messageData.data && typeof messageData.data === 'string') {
      while ((match = mentionRegex.exec(messageData.data)) !== null) {
        mentions.push({
          username: match[1],
          index: match.index
        });
      }
    }
    
    // Create enhanced message object
    const enhancedMessageData = {
      ...messageData,
      urls: urls.length > 0 ? urls : undefined,
      mentions: mentions.length > 0 ? mentions : undefined,
      messageType: messageData.messageType || 'text'
    };
    
    return withDbConnection(async () => {
      // Add validation check
      if (!enhancedMessageData.data || typeof enhancedMessageData.data !== 'string') {
        throw new Error('Invalid message data format');
      }
      
      const message = new this(enhancedMessageData);
      const startTime = Date.now();
      const savedMessage = await message.save();
      const saveTime = Date.now() - startTime;
      
      logger.info(`Successfully saved message with ID: ${savedMessage._id} in ${saveTime}ms`, {
        messageId: savedMessage._id,
        username: savedMessage.username,
        timestampSaved: savedMessage.timestamp,
        performanceMs: saveTime
      });
      return savedMessage;
    });
  } catch (error) {
    logger.error(`Error saving chat message: ${error.message}`, { 
      stack: error.stack,
      username: messageData.username,
      dataType: typeof messageData.data,
      dataLength: messageData.data ? messageData.data.length : 0,
      errorName: error.name,
      code: error.code
    });
    throw error; // Re-throw to allow caller to handle
  }
};

/**
 * Performs a database health check
 * 
 * @returns {Promise<Object>} - Health check status
 */
chatMessageSchema.statics.checkHealth = async function() {
  try {
    return withDbConnection(async () => {
      const startTime = Date.now();
      const count = await this.countDocuments({});
      const checkTime = Date.now() - startTime;
      
      logger.info(`Database health check: ${count} total chat messages, query took ${checkTime}ms`);
      return {
        status: 'healthy',
        messageCount: count,
        responseTimeMs: checkTime
      };
    });
  } catch (error) {
    logger.error(`Database health check failed: ${error.message}`, { stack: error.stack });
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

/**
 * Finds messages by username
 * 
 * @param {string} username - Username to find messages for
 * @param {number} limit - Maximum number of messages to retrieve
 * @returns {Promise<Array>} - Array of messages from the user
 */
chatMessageSchema.statics.findByUsername = async function(username, limit = 50) {
  try {
    return withDbConnection(async () => {
      const messages = await this.find({ username })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
      
      logger.info(`Retrieved ${messages.length} messages for user: ${username}`);
      return messages.reverse();
    });
  } catch (error) {
    logger.error(`Failed to retrieve messages for ${username}: ${error.message}`);
    return [];
  }
};

/**
 * Finds messages containing URLs
 * 
 * @param {number} limit - Maximum number of messages to retrieve
 * @returns {Promise<Array>} - Array of messages containing URLs
 */
chatMessageSchema.statics.findWithUrls = async function(limit = 50) {
  try {
    return withDbConnection(async () => {
      const messages = await this.find({ 'urls.0': { $exists: true } })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
      
      logger.info(`Retrieved ${messages.length} messages containing URLs`);
      return messages;
    });
  } catch (error) {
    logger.error(`Failed to retrieve messages with URLs: ${error.message}`);
    return [];
  }
};

/**
 * Finds messages that mention a specific user
 * 
 * @param {string} username - Username to find mentions of
 * @param {number} limit - Maximum number of messages to retrieve
 * @returns {Promise<Array>} - Array of messages mentioning the user
 */
chatMessageSchema.statics.findMentionsOfUser = async function(username, limit = 50) {
  try {
    return withDbConnection(async () => {
      const messages = await this.find({ 'mentions.username': username })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
      
      logger.info(`Retrieved ${messages.length} messages mentioning user: ${username}`);
      return messages;
    });
  } catch (error) {
    logger.error(`Failed to retrieve mentions for ${username}: ${error.message}`);
    return [];
  }
};

// Initialize the ChatMessage model
let ChatMessage;
try {
  // Check if model already exists to prevent duplicate model error
  ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema);
  logger.info('ChatMessage model initialized successfully');
} catch (error) {
  logger.error(`Error initializing ChatMessage model: ${error.message}`);
  throw error;
}

/**
 * User Mentions Functionality
 */

/**
 * Detects user mentions in a chat message
 * 
 * @param {string} messageContent - The chat message text
 * @returns {Array} - List of user mentions with username and index
 */
export function detectUserMentions(messageContent) {
  try {
    if (!messageContent || typeof messageContent !== 'string') {
      return [];
    }
    
    const mentions = [];
    const mentionRegex = /@(\w+)/g;
    let match;
    
    while ((match = mentionRegex.exec(messageContent)) !== null) {
      mentions.push({
        username: match[1],
        index: match.index
      });
    }
    
    if (mentions.length > 0) {
      logger.info(`Detected ${mentions.length} user mentions in message`);
    }
    
    return mentions;
  } catch (error) {
    logger.error(`Error detecting user mentions: ${error.message}`);
    return [];
  }
}

/**
 * Validate if mentioned users exist in the database
 * 
 * @param {Array<{username: string, index: number}>} mentions - Array of mentions
 * @returns {Promise<Array<{username: string, index: number, exists: boolean}>>} - Validated mentions
 */
export async function validateMentions(mentions) {
  if (!mentions || !Array.isArray(mentions) || mentions.length === 0) {
    return [];
  }
  
  try {
    return withDbConnection(async () => {
      // Get unique usernames to check
      const usernames = [...new Set(mentions.map(mention => mention.username))];
      
      // Find which users exist
      const existingUsers = await Profile.find({ 
        username: { $in: usernames } 
      }).select('username').lean();
      
      const existingUsernames = existingUsers.map(user => user.username);
      
      // Add existence status to mentions
      return mentions.map(mention => ({
        ...mention,
        exists: existingUsernames.includes(mention.username)
      }));
    });
  } catch (error) {
    logger.error(`Error validating mentions: ${error.message}`);
    return mentions.map(mention => ({ ...mention, exists: false }));
  }
}

/**
 * Format a message with highlighted mentions
 * 
 * @param {string} messageText - Original message text
 * @param {Array<{username: string, index: number, exists: boolean}>} validatedMentions - Validated mentions
 * @returns {string} - HTML formatted message with highlighted mentions
 */
export function formatMessageWithMentions(messageText, validatedMentions) {
  if (!messageText || !validatedMentions || validatedMentions.length === 0) {
    return messageText;
  }
  
  let formattedMessage = messageText;
  let offset = 0;
  
  // Sort mentions by index to process them in order
  const sortedMentions = [...validatedMentions].sort((a, b) => a.index - b.index);
  
  for (const mention of sortedMentions) {
    const mentionText = `@${mention.username}`;
    const startPos = mention.index + offset;
    const endPos = startPos + mentionText.length;
    
    const cssClass = mention.exists ? 'valid-mention' : 'invalid-mention';
    const replacement = `<span class="${cssClass}" data-username="${mention.username}">${mentionText}</span>`;
    
    formattedMessage = 
      formattedMessage.substring(0, startPos) + 
      replacement + 
      formattedMessage.substring(endPos);
      
    // Adjust offset for next replacements
    offset += (replacement.length - mentionText.length);
  }
  
  return formattedMessage;
}

/**
 * Notify mentioned users about the message
 * 
 * @param {Array<string>} usernames - Array of usernames to notify
 * @param {Object} messageData - Data about the message
 * @param {Object} io - Socket.io instance for notifications
 * @returns {Promise<void>}
 */
export async function notifyMentionedUsers(usernames, messageData, io) {
  if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
    return;
  }
  
  if (!io) {
    logger.warning('No Socket.io instance provided for mention notifications');
    return;
  }
  
  try {
    // For each mentioned user, send a notification
    for (const username of usernames) {
      io.to(`user:${username}`).emit('mention', {
        from: messageData.username,
        message: messageData.data,
        timestamp: messageData.timestamp || new Date(),
        messageId: messageData._id
      });
      
      logger.info(`Sent mention notification to ${username} from ${messageData.username}`);
    }
    
    // Log the mentions in the UserTagInteraction model if it exists
    try {
      const UserTagInteraction = mongoose.models.UserTagInteraction;
      if (UserTagInteraction) {
        for (const username of usernames) {
          await UserTagInteraction.create({
            sourceUsername: messageData.username,
            targetUsername: username,
            messageId: messageData._id,
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      logger.error(`Error logging user tag interactions: ${error.message}`);
    }
  } catch (error) {
    logger.error(`Error notifying mentioned users: ${error.message}`);
  }
}

/**
 * Express Router Setup for Chat Routes
 */
export function createChatRouter() {
  const router = express.Router();
  
  // Base path for this router
  const basePath = '/chat';
  
  // Main chat page
  router.get('/', async (req, res) => {
    try {
      // Get username from cookie
      const username = req.cookies?.bambiname 
        ? decodeURIComponent(req.cookies.bambiname) 
        : 'anonBambi';
      
      // Get recent chat messages for the chat history
      let chatMessages = [];
      try {
        chatMessages = await ChatMessage.getRecentMessages(50);
        logger.info(`Retrieved ${chatMessages.length} messages for chat history`);
      } catch (error) {
        logger.error(`Error fetching chat messages: ${error.message}`);
        // Continue with empty array rather than failing the whole page
      }
      
      // Get profile data if available
      let profile = null;
      if (username && username !== 'anonBambi') {
        try {
          profile = await Profile.findByUsername(username);
        } catch (error) {
          logger.error(`Error fetching profile for ${username}:`, error);
        }
      }
      
      // Get footer links from config
      const footerLinks = config?.FOOTER_LINKS || footerConfig?.links || [];
      
      // Load trigger data for client if profile exists
      let triggers = [];
      try {
        // Get the current file's directory
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        
        // Read triggers from config file
        const triggersPath = path.resolve(path.dirname(__dirname), 'config', 'triggers.json');
        const triggerData = await fs.readFile(triggersPath, 'utf8');
        triggers = JSON.parse(triggerData).triggers;
      } catch (error) {
        logger.error('Error loading triggers:', error);
        // Use fallback triggers
        triggers = [
          { name: "BAMBI SLEEP", description: "triggers deep trance and receptivity", category: "core" },
          { name: "GOOD GIRL", description: "reinforces obedience and submission", category: "core" }
        ];
      }
      
      // Render the chat view with necessary data
      res.render('chat', {
        title: 'BambiSleep Chat',
        profile,
        username,
        footerLinks,
        chatMessages,
        triggers
      });
    } catch (error) {
      logger.error('Error rendering chat page:', error);
      
      // Fallback with minimal data
      res.render('chat', {
        title: 'BambiSleep Chat',
        profile: null,
        username: '',
        footerLinks: config?.FOOTER_LINKS || footerConfig?.links || [],
        chatMessages: [],
        triggers: []
      });
    }
  });
  
  return { router, basePath };
}

/**
 * Setup Socket.IO chat functionality
 * 
 * @param {Object} io - Socket.IO server instance
 */
export function setupChatSockets(io) {
  // Note: Socket handlers moved to server.js to consolidate chat functionality
  // This eliminates duplicate 'chat message' handlers and centralizes all socket logic
  logger.info('Socket setup delegated to server.js for consolidated chat handling');
}

/**
 * Initialize the session service
 */
export async function initSessionService() {
  try {
    // Connect to chat database
    await connectToChatDatabase();
    logger.info('Connected to chat database');
    
    return {
      ChatMessage,
      detectUserMentions,
      validateMentions,
      formatMessageWithMentions,
      notifyMentionedUsers,
      createChatRouter,
      setupChatSockets
    };
  } catch (error) {
    logger.error(`Failed to initialize session service: ${error.message}`);
    throw error;
  }
}

export default {
  ChatMessage,
  detectUserMentions,
  validateMentions,
  formatMessageWithMentions,
  notifyMentionedUsers,
  createChatRouter,
  setupChatSockets,
  initSessionService
};