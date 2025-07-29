// Live Stats Database Model
import mongoose from 'mongoose';

// Session Statistics Schema
const sessionStatsSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  endTime: {
    type: Date,
    index: true
  },
  duration: {
    type: Number, // milliseconds
    default: 0
  },
  xpEarned: {
    type: Number,
    default: 0,
    index: true
  },
  xpPerHour: {
    type: Number,
    default: 0
  },
  activities: {
    messages: {
      type: Number,
      default: 0
    },
    triggers: {
      type: Number,
      default: 0
    },
    audio: {
      type: Number,
      default: 0
    },
    profileUpdates: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    timezone: String
  }
}, {
  timestamps: true,
  collection: 'live_sessions'
});

// XP Award Tracking Schema
const xpAwardSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true,
    enum: ['interaction', 'message', 'trigger', 'audio', 'login', 'achievement', 'bonus']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  context: {
    messageId: mongoose.Schema.Types.ObjectId,
    triggerName: String,
    audioFile: String,
    additionalData: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: false,
  collection: 'xp_awards'
});

// Activity Tracking Schema
const activitySchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['message', 'audio_trigger', 'audio', 'profile_update', 'login', 'logout']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  data: {
    messageText: String,
    triggerNames: [String],
    audioFile: String,
    profileField: String,
    additionalData: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: false,
  collection: 'activity_log'
});

// Daily Statistics Aggregation Schema
const dailyStatsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  totalUsers: {
    type: Number,
    default: 0
  },
  activeUsers: {
    type: Number,
    default: 0
  },
  totalSessions: {
    type: Number,
    default: 0
  },
  totalXP: {
    type: Number,
    default: 0
  },
  avgSessionDuration: {
    type: Number,
    default: 0
  },
  avgXPPerSession: {
    type: Number,
    default: 0
  },
  topActivities: [{
    type: String,
    count: Number
  }],
  topUsers: [{
    username: String,
    xpEarned: Number,
    sessionsCount: Number
  }]
}, {
  timestamps: true,
  collection: 'daily_stats'
});

// User Statistics Summary Schema
const userStatsSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  totalSessions: {
    type: Number,
    default: 0
  },
  totalTimeSpent: {
    type: Number, // milliseconds
    default: 0
  },
  totalXPEarned: {
    type: Number,
    default: 0
  },
  avgXPPerHour: {
    type: Number,
    default: 0
  },
  bestSession: {
    sessionId: String,
    xpEarned: Number,
    duration: Number,
    date: Date
  },
  activityBreakdown: {
    messages: {
      type: Number,
      default: 0
    },
    triggers: {
      type: Number,
      default: 0
    },
    audio: {
      type: Number,
      default: 0
    }
  },
  streaks: {
    current: {
      type: Number,
      default: 0
    },
    longest: {
      type: Number,
      default: 0
    }
  },
  lastActive: {
    type: Date,
    index: true
  },
  rank: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'user_stats_summary'
});

// Indexes for performance
sessionStatsSchema.index({ username: 1, startTime: -1 });
sessionStatsSchema.index({ isActive: 1, startTime: -1 });
xpAwardSchema.index({ username: 1, timestamp: -1 });
xpAwardSchema.index({ sessionId: 1, timestamp: -1 });
activitySchema.index({ username: 1, timestamp: -1 });
activitySchema.index({ type: 1, timestamp: -1 });
dailyStatsSchema.index({ date: -1 });
userStatsSchema.index({ totalXPEarned: -1 });

// Static methods for SessionStats
sessionStatsSchema.statics.getActiveSession = function(username) {
  return this.findOne({ username, isActive: true }).sort({ startTime: -1 });
};

sessionStatsSchema.statics.getUserSessions = function(username, limit = 10) {
  return this.find({ username })
    .sort({ startTime: -1 })
    .limit(limit)
    .select('sessionId startTime endTime duration xpEarned activities');
};

sessionStatsSchema.statics.getTopSessions = function(limit = 10) {
  return this.find({ isActive: false })
    .sort({ xpEarned: -1 })
    .limit(limit)
    .select('username sessionId xpEarned duration startTime');
};

// Static methods for XPAward
xpAwardSchema.statics.getUserXPHistory = function(username, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.find({
    username,
    timestamp: { $gte: startDate }
  }).sort({ timestamp: -1 });
};

xpAwardSchema.statics.getXPByReason = function(username, sessionId = null) {
  const match = { username };
  if (sessionId) match.sessionId = sessionId;
  
  return this.aggregate([
    { $match: match },
    { $group: { _id: '$reason', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } }
  ]);
};

// Static methods for Activity
activitySchema.statics.getUserActivity = function(username, hours = 24) {
  const startTime = new Date();
  startTime.setHours(startTime.getHours() - hours);
  
  return this.find({
    username,
    timestamp: { $gte: startTime }
  }).sort({ timestamp: -1 });
};

activitySchema.statics.getActivityByType = function(username, sessionId = null) {
  const match = { username };
  if (sessionId) match.sessionId = sessionId;
  
  return this.aggregate([
    { $match: match },
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

// Static methods for UserStats
userStatsSchema.statics.updateUserStats = async function(username, sessionData) {
  const stats = await this.findOneAndUpdate(
    { username },
    {
      $inc: {
        totalSessions: 1,
        totalTimeSpent: sessionData.duration,
        totalXPEarned: sessionData.xpEarned,
        'activityBreakdown.messages': sessionData.activities.messages,
        'activityBreakdown.triggers': sessionData.activities.triggers,
        'activityBreakdown.audio': sessionData.activities.audio
      },
      $set: {
        lastActive: new Date(),
        avgXPPerHour: sessionData.xpPerHour
      }
    },
    { upsert: true, new: true }
  );

  // Update best session if this one is better
  if (!stats.bestSession || sessionData.xpEarned > stats.bestSession.xpEarned) {
    stats.bestSession = {
      sessionId: sessionData.sessionId,
      xpEarned: sessionData.xpEarned,
      duration: sessionData.duration,
      date: sessionData.startTime
    };
    await stats.save();
  }

  return stats;
};

userStatsSchema.statics.getLeaderboard = function(limit = 10) {
  return this.find()
    .sort({ totalXPEarned: -1 })
    .limit(limit)
    .select('username totalXPEarned totalSessions avgXPPerHour lastActive');
};

// Create models
const SessionStats = mongoose.model('SessionStats', sessionStatsSchema);
const XPAward = mongoose.model('XPAward', xpAwardSchema);
const Activity = mongoose.model('Activity', activitySchema);
const DailyStats = mongoose.model('DailyStats', dailyStatsSchema);
const UserStats = mongoose.model('UserStats', userStatsSchema);

export {
  SessionStats,
  XPAward,
  Activity,
  DailyStats,
  UserStats
};

export default {
  SessionStats,
  XPAward,
  Activity,
  DailyStats,
  UserStats
};
