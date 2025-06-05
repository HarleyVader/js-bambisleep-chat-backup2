import mongoose from 'mongoose';
import Logger from '../utils/logger.js';
import db from '../config/db.js';

const logger = new Logger('UserTagInteraction');

const userTagInteractionSchema = new mongoose.Schema({
  // User who tagged someone
  sourceUsername: {
    type: String,
    required: true,
    index: true
  },
  // User who was tagged
  targetUsername: {
    type: String,
    required: true,
    index: true
  },
  // When the tag occurred
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  // The message where the tag occurred
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    required: true
  },
  // The message text for context
  messageText: {
    type: String
  },
  // Any actions taken as a result of the tag
  actions: [{
    type: String,
    enum: ['audio', 'trigger', 'spiral', 'notification', 'reply'],
  }],
  // Was this an AIGF-generated tag?
  isAigfGenerated: {
    type: Boolean,
    default: false
  }
});

// Log a new user tag
userTagInteractionSchema.statics.logTag = async function(tagData) {
  try {
    const chatConnection = db.getChatConnection();
    if (!chatConnection) {
      throw new Error('No chat database connection available');
    }

    const UserTagInteraction = chatConnection.model('UserTagInteraction', userTagInteractionSchema);
    const tag = new UserTagInteraction(tagData);
    await tag.save();
    
    logger.info(`User tag logged: ${tagData.sourceUsername} tagged ${tagData.targetUsername}`);
    return tag;
  } catch (error) {
    logger.error(`Failed to log user tag: ${error.message}`);
    throw error;
  }
};

// Get tags where a user tagged others
userTagInteractionSchema.statics.getTagsFromUser = async function(username, limit = 50) {
  try {
    const chatConnection = db.getChatConnection();
    if (!chatConnection) {
      throw new Error('No chat database connection available');
    }

    const UserTagInteraction = chatConnection.model('UserTagInteraction', userTagInteractionSchema);
    const tags = await UserTagInteraction.find({ sourceUsername: username })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    
    return tags;
  } catch (error) {
    logger.error(`Failed to get tags from user ${username}: ${error.message}`);
    return [];
  }
};

// Get tags where a user was tagged
userTagInteractionSchema.statics.getTagsToUser = async function(username, limit = 50) {
  try {
    const chatConnection = db.getChatConnection();
    if (!chatConnection) {
      throw new Error('No chat database connection available');
    }

    const UserTagInteraction = chatConnection.model('UserTagInteraction', userTagInteractionSchema);
    const tags = await UserTagInteraction.find({ targetUsername: username })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    
    return tags;
  } catch (error) {
    logger.error(`Failed to get tags to user ${username}: ${error.message}`);
    return [];
  }
};

// Get tag interactions between two users
userTagInteractionSchema.statics.getTagsBetweenUsers = async function(username1, username2, limit = 50) {
  try {
    const chatConnection = db.getChatConnection();
    if (!chatConnection) {
      throw new Error('No chat database connection available');
    }

    const UserTagInteraction = chatConnection.model('UserTagInteraction', userTagInteractionSchema);
    const tags = await UserTagInteraction.find({
      $or: [
        { sourceUsername: username1, targetUsername: username2 },
        { sourceUsername: username2, targetUsername: username1 }
      ]
    })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
    
    return tags;
  } catch (error) {
    logger.error(`Failed to get tags between users ${username1} and ${username2}: ${error.message}`);
    return [];
  }
};

// Get most active taggers
userTagInteractionSchema.statics.getMostActiveTaggers = async function(limit = 10) {
  try {
    const chatConnection = db.getChatConnection();
    if (!chatConnection) {
      throw new Error('No chat database connection available');
    }

    const UserTagInteraction = chatConnection.model('UserTagInteraction', userTagInteractionSchema);
    const taggers = await UserTagInteraction.aggregate([
      {
        $group: {
          _id: "$sourceUsername",
          count: { $sum: 1 },
          uniqueTargets: { $addToSet: "$targetUsername" }
        }
      },
      {
        $addFields: {
          uniqueTargetCount: { $size: "$uniqueTargets" }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: limit
      }
    ]);
    
    return taggers;
  } catch (error) {
    logger.error(`Failed to get most active taggers: ${error.message}`);
    return [];
  }
};

const UserTagInteraction = mongoose.models.UserTagInteraction || 
  mongoose.model('UserTagInteraction', userTagInteractionSchema);

export default UserTagInteraction;
