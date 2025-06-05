// filepath: f:\js-bambisleep-chat\src\models\ChatMessage.js
import mongoose from 'mongoose';
import Logger from '../utils/logger.js';
import { withDbConnection } from '../config/db.js';

// Create a logger instance properly
const logger = new Logger('ChatMessage');

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
  // New fields for enhanced chat functionality
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

// Enhanced message retrieval with better debugging
chatMessageSchema.statics.getRecentMessages = async function(limit = 50) {
  logger.info(`Attempting to retrieve ${limit} recent messages from database`);
  try {
    return withDbConnection(async () => {
      const messages = await this.find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
      
      logger.info(`Successfully retrieved ${messages.length} messages from database`);
      return messages.reverse(); // Return in chronological order
    });
  } catch (error) {
    logger.error(`Failed to retrieve messages: ${error.message}`);
    return [];
  }
};

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
      const newMessage = new this(enhancedMessageData);
      await newMessage.save();
      logger.info(`Message saved successfully with id: ${newMessage._id}`);
      return newMessage;
    });
  } catch (error) {
    logger.error(`Failed to save message: ${error.message}`);
    throw error;
  }
};

// Add a new method to check database health
chatMessageSchema.statics.checkHealth = async function() {
  try {
    return withDbConnection(async () => {
      const result = await this.findOne({}).limit(1);
      return {
        status: 'healthy',
        connected: true,
        message: 'Successfully connected to messages collection'
      };
    });
  } catch (error) {
    logger.error(`Health check failed: ${error.message}`);
    return {
      status: 'unhealthy',
      connected: false,
      error: error.message
    };
  }
};

// New method to find messages by username
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

// New method to find messages with URLs
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

// New method to find messages with mentions of a user
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

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

export default ChatMessage;
