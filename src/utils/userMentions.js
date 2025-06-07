import Logger from './logger.js';
import db from '../config/db.js';
import mongoose from 'mongoose';

const logger = new Logger('UserMentions');

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
 * Log a user mention interaction to the database
 * 
 * @param {object} UserInteraction - The UserInteraction model
 * @param {string} sourceUsername - The user who mentioned someone
 * @param {string} targetUsername - The user being mentioned
 * @param {string} messageId - The ID of the message containing the mention
 */
export async function logUserMention(
  UserInteraction, 
  sourceUsername, 
  targetUsername, 
  messageId
) {
  try {
    const interactionData = {
      sourceUsername,
      targetUsername,
      interactionType: 'mention',
      messageId,
      details: {
        timestamp: new Date()
      }
    };
    
    await UserInteraction.saveInteraction(interactionData);
    logger.info(`Logged user mention: ${sourceUsername} mentioned ${targetUsername}`);
  } catch (error) {
    logger.error(`Failed to log user mention: ${error.message}`);
  }
}

export default {
  detectUserMentions,
  logUserMention,
  validateMentions,
  formatMessageWithMentions,
  notifyMentionedUsers
};

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
    const profilesConnection = db.getProfilesConnection();
    if (!profilesConnection) {
      logger.warning('No profiles database connection available for validating mentions');
      return mentions.map(mention => ({ ...mention, exists: false }));
    }
    
    // Define Profile schema if needed
    const ProfileSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      level: { type: Number, default: 0 },
      xp: { type: Number, default: 0 }
    });
    
    const Profile = profilesConnection.models.Profile || 
                   profilesConnection.model('Profile', ProfileSchema);
    
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
    
    // Log the mentions
    await logMentionsInDatabase(usernames, messageData);
  } catch (error) {
    logger.error(`Error notifying mentioned users: ${error.message}`);
  }
}

/**
 * Log mentions in the database
 * 
 * @param {Array<string>} usernames - Array of usernames mentioned
 * @param {Object} messageData - Data about the message
 * @returns {Promise<void>}
 */
async function logMentionsInDatabase(usernames, messageData) {
  try {
    const chatConnection = db.getChatConnection();
    if (!chatConnection) {
      logger.warning('No chat database connection available for logging mentions');
      return;
    }
    
    // Define the UserMention schema
    const UserMentionSchema = new mongoose.Schema({
      mentioningUser: { type: String, required: true, index: true },
      mentionedUser: { type: String, required: true, index: true },
      messageId: { type: mongoose.Schema.Types.ObjectId, required: true },
      timestamp: { type: Date, default: Date.now }
    });
    
    const UserMention = chatConnection.models.UserMention || 
                        chatConnection.model('UserMention', UserMentionSchema);
    
    // Create a mention record for each mentioned user
    const mentionDocs = usernames.map(username => ({
      mentioningUser: messageData.username,
      mentionedUser: username,
      messageId: messageData._id,
      timestamp: messageData.timestamp || new Date()
    }));
    
    await UserMention.insertMany(mentionDocs);
    logger.info(`Logged ${mentionDocs.length} mentions in database`);
  } catch (error) {
    logger.error(`Error logging mentions in database: ${error.message}`);
  }
}
