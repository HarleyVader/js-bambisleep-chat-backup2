import mongoose from 'mongoose';
import Logger from '../utils/logger.js';
import db from '../config/db.js';

const logger = new Logger('ClickedUrl');

const clickedUrlSchema = new mongoose.Schema({
  // The URL that was clicked
  url: {
    type: String,
    required: true,
    index: true
  },
  // Who clicked the URL
  username: {
    type: String,
    required: true,
    index: true
  },
  // When the URL was clicked
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Where the URL was clicked from (chat message, profile, etc.)
  source: {
    type: String,
    enum: ['chat', 'profile', 'trigger', 'audio', 'session', 'other'],
    default: 'chat'
  },
  // If from a chat message, store the message ID
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    default: null
  },
  // Any metadata about the click
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Whether the URL was determined to be safe
  wasUrlSafe: {
    type: Boolean,
    default: true
  }
});

// Log a URL click
clickedUrlSchema.statics.logClick = async function(clickData) {
  try {
    const chatConnection = db.getChatConnection();
    if (!chatConnection) {
      throw new Error('No chat database connection available');
    }

    const ClickedUrl = chatConnection.model('ClickedUrl', clickedUrlSchema);
    const click = new ClickedUrl(clickData);
    await click.save();
    
    logger.info(`URL click logged: ${clickData.username} clicked ${clickData.url}`);
    return click;
  } catch (error) {
    logger.error(`Failed to log URL click: ${error.message}`);
    throw error;
  }
};

// Get clicks for a specific URL
clickedUrlSchema.statics.getClicksForUrl = async function(url, limit = 50) {
  try {
    const chatConnection = db.getChatConnection();
    if (!chatConnection) {
      throw new Error('No chat database connection available');
    }

    const ClickedUrl = chatConnection.model('ClickedUrl', clickedUrlSchema);
    const clicks = await ClickedUrl.find({ url })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    
    return clicks;
  } catch (error) {
    logger.error(`Failed to get clicks for URL ${url}: ${error.message}`);
    return [];
  }
};

// Get clicks by a specific user
clickedUrlSchema.statics.getClicksByUser = async function(username, limit = 50) {
  try {
    const chatConnection = db.getChatConnection();
    if (!chatConnection) {
      throw new Error('No chat database connection available');
    }

    const ClickedUrl = chatConnection.model('ClickedUrl', clickedUrlSchema);
    const clicks = await ClickedUrl.find({ username })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    
    return clicks;
  } catch (error) {
    logger.error(`Failed to get clicks for user ${username}: ${error.message}`);
    return [];
  }
};

// Get top clicked URLs
clickedUrlSchema.statics.getTopUrls = async function(limit = 10) {
  try {
    const chatConnection = db.getChatConnection();
    if (!chatConnection) {
      throw new Error('No chat database connection available');
    }

    const ClickedUrl = chatConnection.model('ClickedUrl', clickedUrlSchema);
    const topUrls = await ClickedUrl.aggregate([
      {
        $group: {
          _id: "$url",
          count: { $sum: 1 },
          firstClicked: { $min: "$timestamp" },
          lastClicked: { $max: "$timestamp" },
          users: { $addToSet: "$username" }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: limit
      }
    ]);
    
    return topUrls;
  } catch (error) {
    logger.error(`Failed to get top URLs: ${error.message}`);
    return [];
  }
};

const ClickedUrl = mongoose.models.ClickedUrl || 
  mongoose.model('ClickedUrl', clickedUrlSchema);

export default ClickedUrl;
