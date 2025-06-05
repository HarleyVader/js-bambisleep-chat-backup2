import mongoose from 'mongoose';
import Logger from '../utils/logger.js';
import db from '../config/db.js';

const logger = new Logger('UserInteraction');

const userInteractionSchema = new mongoose.Schema({
  // Source user who initiated the interaction
  sourceUsername: {
    type: String,
    required: true
  },
  // Target user who received the interaction
  targetUsername: {
    type: String,
    required: true
  },
  // Type of interaction
  interactionType: {
    type: String,
    enum: ['mention', 'audio', 'trigger', 'reply', 'command', 'reaction'],
    required: true
  },
  // When the interaction occurred
  timestamp: {
    type: Date,
    default: Date.now
  },
  // Additional data about the interaction
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Associated message ID if relevant
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    default: null
  }
});

// Create indexes for better performance
userInteractionSchema.index({ sourceUsername: 1, timestamp: -1 });
userInteractionSchema.index({ targetUsername: 1, timestamp: -1 });
userInteractionSchema.index({ interactionType: 1, timestamp: -1 });

// Save a new user interaction
userInteractionSchema.statics.saveInteraction = async function(interactionData) {
  try {
    const chatConnection = db.getChatConnection();
    if (!chatConnection) {
      throw new Error('No chat database connection available');
    }

    const UserInteraction = chatConnection.model('UserInteraction', userInteractionSchema);
    const interaction = new UserInteraction(interactionData);
    await interaction.save();
    
    logger.info(`User interaction saved: ${interactionData.sourceUsername} -> ${interactionData.targetUsername} (${interactionData.interactionType})`);
    return interaction;
  } catch (error) {
    logger.error(`Failed to save user interaction: ${error.message}`);
    throw error;
  }
};

// Get interactions where user is the source
userInteractionSchema.statics.getInteractionsFromUser = async function(username, limit = 20) {
  try {
    const chatConnection = db.getChatConnection();
    if (!chatConnection) {
      throw new Error('No chat database connection available');
    }

    const UserInteraction = chatConnection.model('UserInteraction', userInteractionSchema);
    const interactions = await UserInteraction.find({ sourceUsername: username })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    
    return interactions;
  } catch (error) {
    logger.error(`Failed to get interactions from user ${username}: ${error.message}`);
    return [];
  }
};

// Get interactions where user is the target
userInteractionSchema.statics.getInteractionsToUser = async function(username, limit = 20) {
  try {
    const chatConnection = db.getChatConnection();
    if (!chatConnection) {
      throw new Error('No chat database connection available');
    }

    const UserInteraction = chatConnection.model('UserInteraction', userInteractionSchema);
    const interactions = await UserInteraction.find({ targetUsername: username })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    
    return interactions;
  } catch (error) {
    logger.error(`Failed to get interactions to user ${username}: ${error.message}`);
    return [];
  }
};

// Get all interactions between two users
userInteractionSchema.statics.getInteractionsBetweenUsers = async function(username1, username2, limit = 50) {
  try {
    const chatConnection = db.getChatConnection();
    if (!chatConnection) {
      throw new Error('No chat database connection available');
    }

    const UserInteraction = chatConnection.model('UserInteraction', userInteractionSchema);
    const interactions = await UserInteraction.find({
      $or: [
        { sourceUsername: username1, targetUsername: username2 },
        { sourceUsername: username2, targetUsername: username1 }
      ]
    })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
    
    return interactions;
  } catch (error) {
    logger.error(`Failed to get interactions between users ${username1} and ${username2}: ${error.message}`);
    return [];
  }
};

const UserInteraction = mongoose.models.UserInteraction || 
  mongoose.model('UserInteraction', userInteractionSchema);

export default UserInteraction;
