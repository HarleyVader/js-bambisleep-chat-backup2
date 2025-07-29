// Realtime Stats Service - Enhanced XP and Analytics System
import Logger from '../utils/logger.js';
import mongoose from 'mongoose';

const logger = new Logger('RealtimeStatsService');

class RealtimeStatsService {
  constructor() {
    this.statsCache = new Map(); // Cache for active user stats
    this.sessionStats = new Map(); // Active session tracking
    this.systemStats = {
      totalUsers: 0,
      activeUsers: 0,
      totalXPAwarded: 0,
      avgXPPerSession: 0,
      topLevelUsers: []
    };
  }

  /**
   * Initialize the realtime stats service
   */
  async initialize() {
    try {
      await this.loadSystemStats();
      logger.info('Realtime Stats Service initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Realtime Stats Service:', error);
      return false;
    }
  }

  /**
   * Start tracking user session
   */
  startSession(username, socketId) {
    const sessionId = `${username}-${Date.now()}`;
    const sessionData = {
      userId: username,
      username,
      sessionId,
      socketId,
      startTime: Date.now(),
      xpEarned: 0,
      messagesCount: 0,
      triggersUsed: 0,
      audioPlayed: 0,
      lastActivity: Date.now(),
      isActive: true
    };

    this.sessionStats.set(username, sessionData); // Use username as key for easier lookup
    this.updateActiveUserCount();
    
    logger.debug(`Session started for ${username}: ${sessionId}`);
    return sessionId;
  }

  /**
   * End user session and save stats
   */
  async endSession(username, io = null) {
    const session = this.sessionStats.get(username);
    if (!session) return;

    const duration = Date.now() - session.startTime;
    session.endTime = Date.now();
    session.duration = duration;
    session.isActive = false;

    try {
      await this.saveSessionToDatabase(session);
      await this.updateUserStats(session.username, session);
      
      // Emit final session stats
      if (io) {
        io.emit('session:ended', {
          sessionId: session.sessionId,
          duration,
          xpEarned: session.xpEarned,
          stats: this.getSessionSummary(session)
        });
      }

      this.sessionStats.delete(username);
      this.updateActiveUserCount();
      
      logger.debug(`Session ended for ${session.username}: ${session.sessionId}`);
    } catch (error) {
      logger.error('Error ending session:', error);
    }
  }

  /**
   * Track XP award in realtime
   */
  async trackXPAward(username, amount, reason, io = null) {
    try {
      // Update session stats
      const activeSession = this.getActiveSession(username);
      if (activeSession) {
        activeSession.xpEarned += amount;
        activeSession.lastActivity = Date.now();
      }

      // Update user cache
      if (!this.statsCache.has(username)) {
        await this.loadUserStats(username);
      }
      
      const userStats = this.statsCache.get(username);
      if (userStats) {
        userStats.totalXP += amount;
        userStats.xpThisSession += amount;
        userStats.lastXPAward = Date.now();
      }

      // Update system stats
      this.systemStats.totalXPAwarded += amount;

      // Calculate XP/hour for this session
      const xpPerHour = activeSession ? 
        (activeSession.xpEarned / ((Date.now() - activeSession.startTime) / 3600000)) : 0;

      // Emit realtime update
      if (io) {
        io.emit('stats:xp:update', {
          username,
          amount,
          reason,
          totalXP: userStats?.totalXP || 0,
          sessionXP: userStats?.xpThisSession || 0,
          xpPerHour: Math.round(xpPerHour),
          timestamp: Date.now()
        });
      }

      logger.debug(`XP tracked: ${username} +${amount} XP (${reason})`);
    } catch (error) {
      logger.error('Error tracking XP award:', error);
    }
  }

  /**
   * Track activity in realtime
   */
  async trackActivity(username, activityType, data = {}, io = null) {
    try {
      const activeSession = this.getActiveSession(username);
      if (!activeSession) return;

      activeSession.lastActivity = Date.now();

      // Track specific activity types
      switch (activityType) {
        case 'message':
          activeSession.messagesCount++;
          break;
        case 'audio_trigger':
          activeSession.triggersUsed++;
          break;
        case 'audio':
          activeSession.audioPlayed++;
          break;
      }

      // Update user cache
      if (!this.statsCache.has(username)) {
        await this.loadUserStats(username);
      }

      const userStats = this.statsCache.get(username);
      if (userStats) {
        userStats[`${activityType}Count`] = (userStats[`${activityType}Count`] || 0) + 1;
      }

      // Emit realtime activity update
      if (io) {
        io.emit('stats:activity:update', {
          username,
          activityType,
          sessionStats: this.getSessionSummary(activeSession),
          timestamp: Date.now()
        });
      }

      logger.debug(`Activity tracked: ${username} - ${activityType}`);
    } catch (error) {
      logger.error('Error tracking activity:', error);
    }
  }

  /**
   * Get realtime dashboard data
   */
  async getDashboardData(userId = null) {
    const dashboardData = {
      systemStats: {
        ...this.systemStats,
        activeUsers: this.sessionStats.size
      },
      activeSessions: Array.from(this.sessionStats.values()).map(session => ({
        username: session.username,
        duration: Date.now() - session.startTime,
        xpEarned: session.xpEarned,
        xpPerHour: (session.xpEarned / ((Date.now() - session.startTime) / 3600000)) || 0,
        activities: {
          messages: session.messagesCount,
          triggers: session.triggersUsed,
          audio: session.audioPlayed
        }
      })),
      topXPEarners: await this.getTopXPEarners(),
      recentActivity: await this.getRecentActivity()
    };

    // Add user-specific data if requested
    if (userId) {
      dashboardData.userStats = await this.getUserDashboardStats(userId);
    }

    return dashboardData;
  }

  /**
   * Get active session for user
   */
  getActiveSession(username) {
    return this.sessionStats.get(username) || null;
  }

  /**
   * Load user stats into cache
   */
  async loadUserStats(username) {
    try {
      const Profile = mongoose.models.Profile;
      if (!Profile) return null;

      const profile = await Profile.findOne({ username });
      if (profile) {
        const userStats = {
          userId: username,
          totalXP: profile.xp || 0,
          level: this.calculateLevel(profile.xp || 0),
          xpThisSession: 0,
          messageCount: profile.usageStats?.messagesPosted || 0,
          triggerCount: profile.usageStats?.triggersActivated || 0,
          audioCount: profile.usageStats?.audioPlayed || 0,
          sessionsCount: profile.usageStats?.sessionsCount || 0,
          totalTimeSpent: profile.usageStats?.totalTimeSpent || 0,
          lastActivity: Date.now(),
          lastXPAward: null
        };

        this.statsCache.set(username, userStats);
        return userStats;
      }
    } catch (error) {
      logger.error('Error loading user stats:', error);
    }
    return null;
  }

  /**
   * Calculate level from XP
   */
  calculateLevel(xp) {
    const requirements = [1000, 2500, 4500, 7000, 12000, 36000, 112000, 332000];
    let level = 0;
    while (level < requirements.length && xp >= requirements[level]) level++;
    return level;
  }

  /**
   * Get session summary
   */
  getSessionSummary(session) {
    const duration = Date.now() - session.startTime;
    const xpPerHour = session.xpEarned / (duration / 3600000) || 0;
    
    return {
      duration,
      xpEarned: session.xpEarned,
      xpPerHour: Math.round(xpPerHour),
      activities: {
        messages: session.messagesCount,
        triggers: session.triggersUsed,
        audio: session.audioPlayed
      }
    };
  }

  /**
   * Load system stats
   */
  async loadSystemStats() {
    try {
      const Profile = mongoose.models.Profile;
      if (!Profile) return;

      const totalUsers = await Profile.countDocuments();
      const totalXPResult = await Profile.aggregate([
        { $group: { _id: null, totalXP: { $sum: '$xp' } } }
      ]);
      
      const topUsers = await Profile.find()
        .sort({ xp: -1 })
        .limit(10)
        .select('username xp');

      this.systemStats = {
        totalUsers,
        activeUsers: this.sessionStats.size,
        totalXPAwarded: totalXPResult[0]?.totalXP || 0,
        avgXPPerSession: 0, // Will be calculated from session data
        topLevelUsers: topUsers.map(user => ({
          username: user.username,
          xp: user.xp,
          level: this.calculateLevel(user.xp)
        }))
      };
    } catch (error) {
      logger.error('Error loading system stats:', error);
    }
  }

  /**
   * Save session to database
   */
  async saveSessionToDatabase(session) {
    try {
      const SessionHistory = mongoose.models.SessionHistory;
      if (!SessionHistory) return;

      await SessionHistory.create({
        username: session.username,
        startTime: new Date(session.startTime),
        endTime: new Date(session.endTime),
        duration: session.duration,
        xpEarned: session.xpEarned,
        messagesCount: session.messagesCount,
        triggersUsed: session.triggersUsed,
        audioPlayed: session.audioPlayed,
        sessionId: session.sessionId
      });
    } catch (error) {
      logger.error('Error saving session to database:', error);
    }
  }

  /**
   * Update user stats in database
   */
  async updateUserStats(username, session) {
    try {
      const Profile = mongoose.models.Profile;
      if (!Profile) return;

      await Profile.findOneAndUpdate(
        { username },
        {
          $inc: {
            'usageStats.sessionsCount': 1,
            'usageStats.totalTimeSpent': session.duration / 60000, // Convert to minutes
            'usageStats.messagesPosted': session.messagesCount,
            'usageStats.triggersActivated': session.triggersUsed
          },
          $set: {
            lastActive: new Date()
          }
        },
        { upsert: true }
      );
    } catch (error) {
      logger.error('Error updating user stats:', error);
    }
  }

  /**
   * Update active user count
   */
  updateActiveUserCount() {
    this.systemStats.activeUsers = this.sessionStats.size;
  }

  /**
   * Get top XP earners for leaderboard
   */
  async getTopXPEarners(limit = 10) {
    try {
      const Profile = mongoose.models.Profile;
      if (!Profile) return [];

      const topUsers = await Profile.find()
        .sort({ xp: -1 })
        .limit(limit)
        .select('username xp lastActive');

      return topUsers.map(user => ({
        username: user.username,
        xp: user.xp,
        level: this.calculateLevel(user.xp),
        lastActive: user.lastActive
      }));
    } catch (error) {
      logger.error('Error getting top XP earners:', error);
      return [];
    }
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(limit = 20) {
    try {
      const activities = [];
      const now = Date.now();
      
      // Get recent XP awards from active sessions
      for (const session of this.sessionStats.values()) {
        if (session.xpEarned > 0) {
          activities.push({
            type: 'xp_earned',
            username: session.username,
            amount: session.xpEarned,
            timestamp: session.lastActivity,
            timeAgo: now - session.lastActivity
          });
        }
      }

      // Sort by timestamp and limit
      return activities
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    } catch (error) {
      logger.error('Error getting recent activity:', error);
      return [];
    }
  }

  /**
   * Get user-specific dashboard stats
   */
  async getUserDashboardStats(username) {
    try {
      const userStats = this.statsCache.get(username) || await this.loadUserStats(username);
      const activeSession = this.getActiveSession(username);
      
      return {
        ...userStats,
        currentSession: activeSession ? this.getSessionSummary(activeSession) : null,
        rank: await this.getUserRank(username),
        nextLevelXP: this.getNextLevelXP(userStats?.totalXP || 0),
        xpToNextLevel: this.getXPToNextLevel(userStats?.totalXP || 0)
      };
    } catch (error) {
      logger.error('Error getting user dashboard stats:', error);
      return null;
    }
  }

  /**
   * Get user rank
   */
  async getUserRank(username) {
    try {
      const Profile = mongoose.models.Profile;
      if (!Profile) return 0;

      const userProfile = await Profile.findOne({ username });
      if (!userProfile) return 0;

      const rank = await Profile.countDocuments({ xp: { $gt: userProfile.xp } });
      return rank + 1;
    } catch (error) {
      logger.error('Error getting user rank:', error);
      return 0;
    }
  }

  /**
   * Get next level XP requirement
   */
  getNextLevelXP(currentXP) {
    const requirements = [1000, 2500, 4500, 7000, 12000, 36000, 112000, 332000];
    for (const req of requirements) {
      if (currentXP < req) return req;
    }
    return requirements[requirements.length - 1];
  }

  /**
   * Get XP needed for next level
   */
  getXPToNextLevel(currentXP) {
    const nextLevelXP = this.getNextLevelXP(currentXP);
    return Math.max(0, nextLevelXP - currentXP);
  }

  /**
   * Clean up inactive sessions
   */
  cleanupInactiveSessions(inactivityThreshold = 30 * 60 * 1000) {
    const now = Date.now();
    const toRemove = [];
    
    for (const [sessionId, session] of this.sessionStats.entries()) {
      if (now - session.lastActivity > inactivityThreshold) {
        toRemove.push(sessionId);
      }
    }
    
    for (const sessionId of toRemove) {
      this.endSession(sessionId);
    }
    
    if (toRemove.length > 0) {
      logger.info(`Cleaned up ${toRemove.length} inactive sessions`);
    }
  }
}

// Create singleton instance
const realtimeStatsService = new RealtimeStatsService();

export default realtimeStatsService;
