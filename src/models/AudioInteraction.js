import mongoose from 'mongoose';
import Logger from '../utils/logger.js';
import db from '../config/db.js';

const logger = new Logger('AudioInteraction');

const audioInteractionSchema = new mongoose.Schema({
  // Who triggered the audio
  sourceUsername: {
    type: String,
    required: true,
    index: true
  },
  // Who received the audio (if targeted)
  targetUsername: {
    type: String,
    default: null,
    index: true
  },
  // The audio file played
  audioFile: {
    type: String,
    required: true
  },
  // When it was triggered
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Whether it was a trigger or a direct audio command
  triggerType: {
    type: String,
    enum: ['direct', 'chat', 'trigger', 'mention', 'aigf'],
    default: 'direct'
  },
  // Associated message ID if triggered through chat
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    default: null
  },
  // Session ID to associate with user sessions
  sessionId: {
    type: String,
    default: null,
    index: true
  },
  // Additional metadata for more context
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

// Save a new audio interaction
audioInteractionSchema.statics.saveInteraction = async function(interactionData) {
  try {
    const chatConnection = db.getChatConnection();
    if (!chatConnection) {
      throw new Error('No chat database connection available');
    }

    const AudioInteraction = chatConnection.model('AudioInteraction', audioInteractionSchema);
    const interaction = new AudioInteraction(interactionData);
    await interaction.save();
    
    logger.info(`Audio interaction saved: ${interactionData.sourceUsername} played ${interactionData.audioFile} for ${interactionData.targetUsername || 'everyone'}`);
    return interaction;
  } catch (error) {
    logger.error(`Failed to save audio interaction: ${error.message}`);
    throw error;
  }
};

// Get recent audio interactions for a user
audioInteractionSchema.statics.getRecentForUser = async function(username, limit = 20) {
  try {
    const chatConnection = db.getChatConnection();
    if (!chatConnection) {
      throw new Error('No chat database connection available');
    }

    const AudioInteraction = chatConnection.model('AudioInteraction', audioInteractionSchema);
    const interactions = await AudioInteraction.find({
      $or: [
        { sourceUsername: username },
        { targetUsername: username }
      ]
    })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
    
    return interactions;
  } catch (error) {
    logger.error(`Failed to get audio interactions for user ${username}: ${error.message}`);
    return [];
  }
};

// Get all interactions in a time range
audioInteractionSchema.statics.getInteractionsInRange = async function(startTime, endTime) {
  try {
    const chatConnection = db.getChatConnection();
    if (!chatConnection) {
      throw new Error('No chat database connection available');
    }

    const AudioInteraction = chatConnection.model('AudioInteraction', audioInteractionSchema);
    const interactions = await AudioInteraction.find({
      timestamp: {
        $gte: startTime,
        $lte: endTime
      }
    })
    .sort({ timestamp: -1 })
    .lean();
    
    return interactions;
  } catch (error) {
    logger.error(`Failed to get audio interactions in range: ${error.message}`);
    return [];
  }
};

const AudioInteraction = mongoose.models.AudioInteraction || 
  mongoose.model('AudioInteraction', audioInteractionSchema);

export default AudioInteraction;
