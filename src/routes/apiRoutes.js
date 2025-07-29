import Logger from '../utils/logger.js';
import express from 'express';
import { getProfile } from '../models/Profile.js';
import mongoose from 'mongoose';
import realtimeStatsService from '../services/realtimeStatsService.js';

const router = express.Router();
const logger = new Logger('API Routes');

/**
 * Route to get chat messages with pagination
 * Endpoint: GET /api/chat/messages
 * Query params: limit (default 50), before (timestamp for pagination)
 */
router.get('/chat/messages', async (req, res) => {
  try {
    // Get requested limit with default of 50, max 100
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const before = req.query.before ? new Date(req.query.before) : null;
    
    // Import sessionService dynamically
    const { default: sessionService } = await import('../services/sessionService.js');
    
    let messages = [];
    if (before) {
      // Get messages older than the 'before' timestamp
      messages = await sessionService.ChatMessage.find({
        timestamp: { $lt: before }
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
      
      // Return in chronological order (oldest first)
      messages = messages.reverse();
    } else {
      // Get most recent messages (default behavior)
      messages = await sessionService.ChatMessage.getRecentMessages(limit);
    }
    
    res.json({ 
      messages,
      hasMore: messages.length === limit // Indicate if there might be more messages
    });
  } catch (error) {
    logger.error('Error fetching chat messages:', error);
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

/**
 * Route to get system controls for a profile
 * Endpoint: GET /api/profile/:username/system-controls
 */
router.get('/profile/:username/system-controls', async (req, res) => {
  try {
    const username = req.params.username;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Get profile from database
    const profile = await getProfile(username);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    // Return only system controls data
    // Replace this with your actual data structure
    res.json({
      activeTriggers: profile.triggers || [],
      systemSettings: profile.settings || {}
    });
  } catch (error) {
    logger.error(`Error fetching profile system controls for ${req.params.username}:`, error);
    res.status(500).json({ error: 'Error fetching profile data' });
  }
});

/**
 * Route to record client performance metrics
 * Endpoint: POST /api/performance
 */
router.post('/performance', (req, res) => {
  try {
    const metrics = req.body;
    
    // Log summary of metrics
    if (metrics && metrics.summary) {
      logger.info(`Performance metrics from client: ${JSON.stringify(metrics.summary)}`);
    }
    
    // Could store metrics in database for analysis
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error processing performance metrics:', error);
    res.status(500).json({ error: 'Error processing metrics' });  }
});

/**
 * Generate an image using RunPod API
 * Endpoint: POST /api/generate-image
 */
router.post('/generate-image', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.session || !req.session.username) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const { prompt, negativePrompt, width, height } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // Image generation functionality has been removed
    logger.info(`Image generation request received for prompt: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}`);
    return res.status(501).json({ 
      error: 'Image generation functionality has been removed',
      message: 'This feature is no longer available'
    });
  } catch (error) {
    logger.error('Error processing image generation request:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
});

/**
 * Check status of an image generation job
 * Endpoint: GET /api/image-job/:jobId
 */
router.get('/image-job/:jobId', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.session || !req.session.username) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const { jobId } = req.params;
    
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }
    
    // Job status functionality has been removed
    logger.info(`Job status check request received for job ID: ${jobId}`);
    return res.status(501).json({ 
      error: 'Image job status functionality has been removed',
      message: 'This feature is no longer available'
    });
  } catch (error) {
    logger.error('Error checking image job status:', error);
    res.status(500).json({ error: 'Failed to check job status' });
  }
});

/**
 * Get profile data for a username
 */
router.get('/api/profile/:username/data', async (req, res) => {
  try {
    const username = req.params.username;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Get profile by username
    const Profile = getModel('Profile');
    const profile = await withDbConnection(async () => {
      return await Profile.findOne({ username });
    });
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    // Return sanitized profile data
    res.json({
      username: profile.username,
      displayName: profile.displayName || profile.username,
      level: profile.level || 0,
      xp: profile.xp || 0,
      activeTriggers: profile.activeTriggers || [],
      systemControls: profile.systemControls || { 
        activeTriggers: [],
        collarEnabled: false,
        collarText: ''
      }
    });
  } catch (error) {
    logger.error(`Error fetching profile data for ${req.params.username}:`, error);
    res.status(500).json({ error: 'Error fetching profile data' });
  }
});

/**
 * Get system controls for a username
 */
router.get('/api/profile/:username/system-controls', async (req, res) => {
  try {
    const username = req.params.username;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Get profile by username
    const Profile = getModel('Profile');
    const profile = await withDbConnection(async () => {
      return await Profile.findOne({ username });
    });
    
    if (!profile) {
      return res.status(404).json({ 
        activeTriggers: [],
        level: 0,
        xp: 0
      });
    }
    
    // Return system controls data
    res.json({
      activeTriggers: profile.activeTriggers || [],
      systemControls: profile.systemControls || {},
      level: profile.level || 0,
      xp: profile.xp || 0
    });
  } catch (error) {
    logger.error(`Error fetching system controls for ${req.params.username}:`, error);
    res.status(500).json({ 
      error: 'Error fetching system controls',
      activeTriggers: []
    });
  }
});

/**
 * Update system controls for a username
 */
router.post('/api/profile/:username/system-controls', async (req, res) => {
  try {
    const username = req.params.username;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Get profile by username
    const Profile = getModel('Profile');
    let profile = await withDbConnection(async () => {
      return await Profile.findOne({ username });
    });
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    // Update system controls with request body
    if (!profile.systemControls) {
      profile.systemControls = {};
    }
    
    // Update active triggers if provided
    if (req.body.activeTriggers) {
      profile.activeTriggers = req.body.activeTriggers;
      profile.systemControls.activeTriggers = req.body.activeTriggers;
    }
    
    // Update collar settings if provided
    if (req.body.collarEnabled !== undefined) {
      profile.systemControls.collarEnabled = !!req.body.collarEnabled;
    }
    
    if (req.body.collarText !== undefined) {
      profile.systemControls.collarText = req.body.collarText;
      profile.systemControls.collarLastUpdated = new Date();
    }
    
    // Update spirals settings if provided
    if (req.body.spiralsEnabled !== undefined) {
      profile.systemControls.spiralsEnabled = !!req.body.spiralsEnabled;
    }
    
    // Update hypnosis settings if provided
    if (req.body.hypnosisEnabled !== undefined) {
      profile.systemControls.hypnosisEnabled = !!req.body.hypnosisEnabled;
    }
    
    // Save the updated profile
    await withDbConnection(async () => {
      return await profile.save();
    });
    
    // Return success response
    res.json({
      success: true,
      activeTriggers: profile.activeTriggers || [],
      systemControls: profile.systemControls
    });
  } catch (error) {
    logger.error(`Error updating system controls for ${req.params.username}:`, error);
    res.status(500).json({ error: 'Error updating system controls' });
  }
});

/**
 * Route to get user's session history
 * Endpoint: GET /api/sessions/:username
 */
router.get('/sessions/:username', async (req, res) => {
  try {
    const username = req.params.username;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Get sessions from SessionHistory model
    const SessionHistory = mongoose.model('SessionHistory');
    const sessions = await SessionHistory.find({ username })
      .sort({ 'metadata.lastActivity': -1 })
      .limit(20);
    
    if (!sessions || sessions.length === 0) {
      return res.json({ 
        success: true,
        sessions: [] 
      });
    }
    
    res.json({ 
      success: true,
      sessions: sessions.map(session => ({
        _id: session._id,
        title: session.title,
        messages: session.messages,
        metadata: session.metadata,
        createdAt: session.metadata.createdAt
      }))
    });
  } catch (error) {
    logger.error(`Error fetching session history: ${error.message}`);
    res.status(500).json({ error: 'Error fetching session history', sessions: [] });
  }
});

/**
 * Route to get realtime stats for a user
 * Endpoint: GET /api/stats/realtime/:username
 */
router.get('/stats/realtime/:username', async (req, res) => {
  try {
    const username = req.params.username;
    
    if (!username || username === 'anonBambi') {
      return res.status(400).json({ error: 'Valid username is required' });
    }
    
    // Get realtime stats
    const stats = await realtimeStatsService.getDashboardData(username);
    
    res.json(stats);
  } catch (error) {
    logger.error(`Error fetching realtime stats for ${req.params.username}:`, error);
    res.status(500).json({ error: 'Error fetching realtime stats' });
  }
});

/**
 * Route to get overall dashboard data
 * Endpoint: GET /api/stats/dashboard
 */
router.get('/stats/dashboard', async (req, res) => {
  try {
    // Get global dashboard data - you could modify this to show aggregate stats
    const dashboardData = {
      message: 'Dashboard data endpoint - implement based on your needs',
      timestamp: new Date().toISOString()
    };
    
    res.json(dashboardData);
  } catch (error) {
    logger.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Error fetching dashboard data' });
  }
});

export default router;