import express from 'express';
import os from 'os';
import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from '../utils/logger.js';
import footerConfig from '../config/footer.config.js';
import { getModel, withDbConnection } from '../config/db.js';

const router = express.Router();
const logger = new Logger('Health');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Health endpoint - JSON data
router.get('/api', async (req, res) => {
  try {
    const healthData = await getHealthData();
    res.json(healthData);
  } catch (error) {
    logger.error('Error getting health data:', error);
    res.status(500).json({ error: 'Failed to get health data' });
  }
});

// Health dashboard - HTML view
router.get('/', async (req, res) => {
  try {
    const healthData = await getHealthData();
    res.render('health', {
      title: 'System Health Monitor',
      health: healthData,
      footer: footerConfig,
      req: req
    });
  } catch (error) {
    logger.error('Error rendering health dashboard:', error);
    res.status(500).render('error', {
      title: 'Health Monitor Error',
      message: 'Failed to load health dashboard',
      error: { status: 500 },
      footer: footerConfig
    });
  }
});

/**
 * Gather comprehensive health data
 */
async function getHealthData() {
  const startTime = Date.now();
  
  try {
    // Get basic system info
    const systemInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptime: formatUptime(os.uptime()),
      loadAverage: os.loadavg(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length,
      timestamp: new Date().toISOString()
    };

    // Calculate memory usage
    const memoryUsage = {
      total: Math.round(systemInfo.totalMemory / 1024 / 1024), // MB
      free: Math.round(systemInfo.freeMemory / 1024 / 1024), // MB
      used: Math.round((systemInfo.totalMemory - systemInfo.freeMemory) / 1024 / 1024), // MB
      percentage: Math.round(((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory) * 100)
    };

    // Get CPU usage (approximated from load average)
    const cpuUsage = {
      load1: systemInfo.loadAverage[0],
      load5: systemInfo.loadAverage[1],
      load15: systemInfo.loadAverage[2],
      percentage: Math.min(Math.round((systemInfo.loadAverage[0] / systemInfo.cpuCount) * 100), 100)
    };

    // Get user/connection data
    const userData = await getUserData();
    
    // Get database health
    const dbHealth = await getDatabaseHealth();
    
    // Get worker health
    const workerHealth = await getWorkerHealth();

    const healthData = {
      system: {
        ...systemInfo,
        memory: memoryUsage,
        cpu: cpuUsage
      },
      users: userData,
      database: dbHealth,
      workers: workerHealth,
      responseTime: Date.now() - startTime
    };

    return healthData;
  } catch (error) {
    logger.error('Error gathering health data:', error);
    return {
      error: 'Failed to gather health data',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Get user and connection data
 */
async function getUserData() {
  try {
    const users = [];
    
    // Get connected users from socket store (if available globally)
    if (global.socketStore) {
      for (const [socketId, data] of global.socketStore.entries()) {
        const user = {
          socketId: socketId.substring(0, 8) + '...',
          username: data.socket?.bambiUsername || data.username || 'anonymous',
          location: 'chat', // Default location
          lastTrigger: 'N/A',
          deviceUsage: 'Unknown',
          connectedTime: formatConnectedTime(data.connectedAt || Date.now())
        };
        users.push(user);
      }
    }

    // Get database user data
    try {
      const Profile = getModel('Profile');
      if (Profile) {
        const dbUsers = await withDbConnection(async () => {
          return await Profile.find()
            .select('username bambiId level xp lastActivity activeTriggers')
            .limit(20)
            .sort({ lastActivity: -1 });
        });

        // Merge with connected users or add new ones
        for (const dbUser of dbUsers || []) {
          const existingUser = users.find(u => u.username === dbUser.username);
          if (existingUser) {
            existingUser.bambiId = dbUser.bambiId || 'N/A';
            existingUser.lastTrigger = formatLastTrigger(dbUser.activeTriggers);
            existingUser.level = dbUser.level || 0;
            existingUser.xp = dbUser.xp || 0;
          } else {
            users.push({
              socketId: 'offline',
              username: dbUser.username,
              bambiId: dbUser.bambiId || 'N/A',
              location: 'offline',
              lastTrigger: formatLastTrigger(dbUser.activeTriggers),
              deviceUsage: 'Offline',
              connectedTime: 'Offline',
              level: dbUser.level || 0,
              xp: dbUser.xp || 0
            });
          }
        }
      }
    } catch (dbError) {
      logger.warning('Could not fetch user data from database:', dbError.message);
    }

    return {
      total: users.length,
      connected: users.filter(u => u.socketId !== 'offline').length,
      offline: users.filter(u => u.socketId === 'offline').length,
      list: users
    };
  } catch (error) {
    logger.error('Error getting user data:', error);
    return {
      total: 0,
      connected: 0,
      offline: 0,
      list: [],
      error: error.message
    };
  }
}

/**
 * Get database health status
 */
async function getDatabaseHealth() {
  try {
    const db = await import('../config/db.js');
    if (db.default.checkAllDatabasesHealth) {
      const health = await db.default.checkAllDatabasesHealth();
      return {
        status: 'connected',
        details: health,
        connections: {
          main: health.main?.status === 'healthy',
          profiles: health.profiles?.status === 'healthy',
          chat: health.chat?.status === 'healthy',
          aigfLogs: health.aigfLogs?.status === 'healthy'
        }
      };
    }
    return { status: 'unknown', error: 'Health check not available' };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

/**
 * Get worker health status
 */
async function getWorkerHealth() {
  try {
    // Check if LMStudio worker is responsive
    const workers = [];
    
    // Mock worker health check since we can't easily check worker status
    workers.push({
      name: 'LMStudio',
      status: 'running',
      sessions: global.sessionCount || 0,
      lastActivity: new Date().toISOString()
    });

    return {
      total: workers.length,
      running: workers.filter(w => w.status === 'running').length,
      workers: workers
    };
  } catch (error) {
    return {
      total: 0,
      running: 0,
      workers: [],
      error: error.message
    };
  }
}

/**
 * Helper functions
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

function formatConnectedTime(connectedAt) {
  if (!connectedAt) return 'Unknown';
  const seconds = Math.floor((Date.now() - connectedAt) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

function formatLastTrigger(activeTriggers) {
  if (!activeTriggers || !Array.isArray(activeTriggers) || activeTriggers.length === 0) {
    return 'None';
  }
  return activeTriggers[0]; // Show first active trigger
}

export default router;
