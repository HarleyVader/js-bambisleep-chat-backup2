import mongoose from 'mongoose';
import Logger from '../utils/logger.js';
import db from '../config/db.js';

const logger = new Logger('AigfInteraction');

const aigfInteractionSchema = new mongoose.Schema({
  // User interacting with the AIGF
  username: {
    type: String,
    required: true,
    index: true
  },
  // Type of interaction
  interactionType: {
    type: String,
    enum: ['command', 'chat', 'trigger', 'spirals', 'hypnosis', 'collar', 'audioCommand'],
    required: true
  },
  // The input from the user
  userInput: {
    type: String,
    required: true
  },
  // The response from the AIGF
  aigfResponse: {
    type: String,
    default: null
  },
  // Additional data about the interaction
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Duration of the interaction in milliseconds
  processingDuration: {
    type: Number,
    default: 0
  },
  // When the interaction began
  timestamp: {
    type: Date,
    default: Date.now
  },
  // Associated session ID
  sessionId: {
    type: String,
    index: true
  },
  // Whether the interaction was successful
  success: {
    type: Boolean,
    default: true
  },
  // Error information if interaction failed
  error: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
});

// Create indexes for better performance
aigfInteractionSchema.index({ interactionType: 1, timestamp: -1 });
aigfInteractionSchema.index({ timestamp: -1 });

// Log a new AIGF interaction
aigfInteractionSchema.statics.logInteraction = async function(interactionData) {
  try {
    const aigfLogsConnection = db.getAigfLogsConnection();
    if (!aigfLogsConnection) {
      throw new Error('No AIGF logs database connection available');
    }

    const AigfInteraction = aigfLogsConnection.model('AigfInteraction', aigfInteractionSchema);
    const interaction = new AigfInteraction(interactionData);
    await interaction.save();
    
    logger.info(`AIGF interaction logged: ${interactionData.username} - ${interactionData.interactionType}`);
    return interaction;
  } catch (error) {
    logger.error(`Failed to log AIGF interaction: ${error.message}`);
    // Don't throw - we don't want logging failures to affect the main app
    return null;
  }
};

// Get recent interactions for a user
aigfInteractionSchema.statics.getRecentForUser = async function(username, limit = 20) {
  try {
    const aigfLogsConnection = db.getAigfLogsConnection();
    if (!aigfLogsConnection) {
      throw new Error('No AIGF logs database connection available');
    }

    const AigfInteraction = aigfLogsConnection.model('AigfInteraction', aigfInteractionSchema);
    const interactions = await AigfInteraction.find({ username })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    
    return interactions;
  } catch (error) {
    logger.error(`Failed to get AIGF interactions for user ${username}: ${error.message}`);
    return [];
  }
};

// Get interactions by type
aigfInteractionSchema.statics.getByType = async function(interactionType, limit = 50) {
  try {
    const aigfLogsConnection = db.getAigfLogsConnection();
    if (!aigfLogsConnection) {
      throw new Error('No AIGF logs database connection available');
    }

    const AigfInteraction = aigfLogsConnection.model('AigfInteraction', aigfInteractionSchema);
    const interactions = await AigfInteraction.find({ interactionType })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    
    return interactions;
  } catch (error) {
    logger.error(`Failed to get AIGF interactions by type ${interactionType}: ${error.message}`);
    return [];
  }
};

// Get error interactions
aigfInteractionSchema.statics.getErrorInteractions = async function(limit = 50) {
  try {
    const aigfLogsConnection = db.getAigfLogsConnection();
    if (!aigfLogsConnection) {
      throw new Error('No AIGF logs database connection available');
    }

    const AigfInteraction = aigfLogsConnection.model('AigfInteraction', aigfInteractionSchema);
    const interactions = await AigfInteraction.find({ success: false })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    
    return interactions;
  } catch (error) {
    logger.error(`Failed to get AIGF error interactions: ${error.message}`);
    return [];
  }
};

// Aggregate performance metrics
aigfInteractionSchema.statics.getPerformanceMetrics = async function(timeframe = 'day') {
  try {
    const aigfLogsConnection = db.getAigfLogsConnection();
    if (!aigfLogsConnection) {
      throw new Error('No AIGF logs database connection available');
    }

    const AigfInteraction = aigfLogsConnection.model('AigfInteraction', aigfInteractionSchema);
    
    // Define time range based on timeframe
    const now = new Date();
    let startDate;
    
    if (timeframe === 'day') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 1);
    } else if (timeframe === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (timeframe === 'month') {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
    } else {
      startDate = new Date(0); // All time
    }
    
    // Run aggregation
    const metrics = await AigfInteraction.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: "$interactionType",
          count: { $sum: 1 },
          avgDuration: { $avg: "$processingDuration" },
          maxDuration: { $max: "$processingDuration" },
          successCount: { 
            $sum: { $cond: ["$success", 1, 0] }
          },
          errorCount: { 
            $sum: { $cond: ["$success", 0, 1] }
          }
        }
      }
    ]);
    
    return metrics;
  } catch (error) {
    logger.error(`Failed to get AIGF performance metrics: ${error.message}`);
    return [];
  }
};

const AigfInteraction = mongoose.models.AigfInteraction || 
  mongoose.model('AigfInteraction', aigfInteractionSchema);

export default AigfInteraction;
