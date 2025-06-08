import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import Logger from '../utils/logger.js';
import footerConfig from '../config/footer.config.js';
import config from '../config/config.js'; // Add this import
import { getModel, withDbConnection } from '../config/db.js';
import sessionService from '../services/sessionService.js';
import bambiControlNetwork from '../services/bambiControlNetwork.js';

const logger = new Logger('RouteManager');
const router = express.Router();

// Function to dynamically load all route modules
export async function loadAllRoutes(app) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Get all route files
    const files = await fs.readdir(__dirname);
    const routeFiles = files.filter(file => 
      file !== 'index.js' && 
      file.endsWith('.js')
    );
    
    logger.info(`Found ${routeFiles.length} route modules to load`);
    
    // Load each route module
    for (const file of routeFiles) {
      const moduleName = file.replace('.js', '');
      try {
        logger.info(`Loading route module: ${moduleName}`);
        const routeModule = await import(`./${file}`);
        
        // Check if the module exports a setup function or a router
        if (typeof routeModule.setup === 'function') {
          // Use the setup function
          const moduleRouter = routeModule.setup(app);
          if (moduleRouter) {
            // Check for corresponding view before registering
            const basePath = routeModule.basePath || `/${moduleName}`;
            app.use(basePath, moduleRouter);
            logger.success(`Registered route module '${moduleName}' at path: ${basePath}`);
          }
        } else if (routeModule.default) {
          // Use the default export directly - it should already be a router instance
          const basePath = routeModule.basePath || `/${moduleName}`;
          app.use(basePath, routeModule.default);
          logger.success(`Registered route module '${moduleName}' at path: ${basePath}`);
        } else {
          logger.warning(`Module '${moduleName}' has no default export or setup function`);
        }
      } catch (error) {
        logger.error(`Failed to load route module '${moduleName}': ${error.message}`);
      }
    }
    
    // Register the homepage routes
    app.use('/', router);
      // Handle 404 routes - move this to the end after all routes are registered
    app.use((req, res, next) => {
      res.status(404).render('error', {
        message: 'Page not found',
        error: { status: 404 },
        title: 'Error - Page Not Found',
        footer: footerConfig
      });
    });
    
    return true;
  } catch (error) {
    logger.error(`Error loading route modules: ${error.message}`);
    return false;
  }
}

/**
 * Home page route
 */
router.get('/', async (req, res) => {
  try {
    // Get profile from cookie
    const cookie = req.cookies?.bambiid;
    let profile = null;
    let username = '';
    
    // Check for a bambiname cookie first
    if (req.cookies?.bambiname) {
      username = decodeURIComponent(req.cookies.bambiname);
      
      // Try to fetch the profile by username
      const Profile = getModel('Profile');
      try {
        profile = await withDbConnection(async () => {
          return await Profile.findOrCreateByUsername(username);
        });
      } catch (error) {
        logger.error(`Error getting profile by username ${username}: ${error.message}`);
        // Fall back to cookie-based lookup if username lookup fails
        if (cookie) {
          profile = await withDbConnection(async () => {
            return await Profile.findOrCreateByCookie(cookie);
          });
        }
      }
    } 
    // Otherwise use the bambiid cookie
    else if (cookie) {
      const Profile = getModel('Profile');
      profile = await withDbConnection(async () => {
        return await Profile.findOrCreateByCookie(cookie);
      });
      
      // Set username from profile
      if (profile && profile.username) {
        username = profile.username;
      }
    }
      // Fetch recent chat messages
    const chatMessages = await sessionService.ChatMessage.getRecentMessages(50);
    
    // Load trigger data for client
    let triggers = [];
    try {
      // Define __dirname for this scope
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      
      // Read triggers from config file
      const triggersPath = path.resolve(path.dirname(__dirname), 'config', 'triggers.json');
      const triggerData = await fs.readFile(triggersPath, 'utf8');
      triggers = JSON.parse(triggerData).triggers;
    } catch (error) {
      logger.error('Error loading triggers:', error);
      // Use fallback triggers
      triggers = [
        { name: "BAMBI SLEEP", description: "triggers deep trance and receptivity", category: "core" },
        { name: "GOOD GIRL", description: "reinforces obedience and submission", category: "core" }
      ];
    }
      // Get footer links from config, with fallback to imported footerConfig
    const footerLinks = config?.FOOTER_LINKS || footerConfig?.links || [];
    
    // Get control network status
    let controlNetworkStatus = null;
    let controlNetworkMetrics = null;
    try {      controlNetworkStatus = await bambiControlNetwork.getSystemStatus();
      controlNetworkMetrics = await bambiControlNetwork.getMetrics();
    } catch (error) {
      logger.error('Error fetching control network data:', error);
    }
    
    // Render the index view with profile data and chat messages
    res.render('index', { 
      profile,
      username,
      footerLinks,
      footer: footerConfig, // Add full footer config
      chatMessages,
      triggers,
      title: 'BambiSleep.Chat - Hypnotic AI Chat',
      controlNetworkStatus,
      controlNetworkMetrics
    });
  } catch (error) {
    logger.error('Error rendering home page:', error);
      // Fallback with minimal data
    res.render('index', { 
      profile: null, 
      username: '',
      footerLinks: config?.FOOTER_LINKS || footerConfig?.links || [],
      footer: footerConfig, // Add full footer config here too
      chatMessages: [],
      triggers: [],
      title: 'BambiSleep.Chat - Hypnotic AI Chat',
      controlNetworkStatus: null,
      controlNetworkMetrics: null
    });
  }
});

// Add API endpoints for triggers
router.get('/api/triggers', async (req, res) => {
  try {
    // Define __dirname for this scope using the import.meta.url
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Read triggers from config file
    const triggersPath = path.resolve(path.dirname(__dirname), 'config', 'triggers.json');
    const triggerData = await fs.readFile(triggersPath, 'utf8');
    const triggers = JSON.parse(triggerData).triggers;
    
    // Return consistent response format
    res.json({
      success: true,
      data: {
        triggers: triggers,
        total: triggers.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error loading triggers:', error);
    
    // Return fallback triggers with consistent error format
    const fallbackTriggers = [
      { name: "BAMBI SLEEP", description: "triggers deep trance and receptivity", category: "core" },
      { name: "GOOD GIRL", description: "reinforces obedience and submission", category: "core" }
    ];
    
    res.status(500).json({
      success: false,
      data: {
        triggers: fallbackTriggers,
        total: fallbackTriggers.length
      },
      error: 'Error loading triggers from config',
      timestamp: new Date().toISOString()
    });
  }
});

// Add API endpoints for profile data and system controls
router.get('/api/profile/:username/data', async (req, res) => {
  try {
    const username = req.params.username;
    
    if (!username || typeof username !== 'string' || username.length < 1) {
      return res.status(400).json({ 
        success: false,
        error: 'Valid username is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Verify that this is the user's own profile using the cookie
    const bambinameCookie = req.cookies?.bambiname;
    
    if (bambinameCookie && decodeURIComponent(bambinameCookie) !== username) {
      return res.status(403).json({ 
        success: false,
        error: 'Unauthorized access to profile',
        timestamp: new Date().toISOString()
      });
    }
    
    // Get profile by username
    const Profile = getModel('Profile');
    const profile = await withDbConnection(async () => {
      return await Profile.findOne({ username });
    });
    
    if (!profile) {
      return res.status(404).json({ 
        success: false,
        error: 'Profile not found',
        timestamp: new Date().toISOString()
      });
    }
    
    // Return sanitized profile data with consistent format
    res.json({
      success: true,
      data: {
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
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error fetching profile data for ${req.params.username}:`, error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/api/profile/:username/system-controls', async (req, res) => {
  try {
    const username = req.params.username;
    
    if (!username || typeof username !== 'string' || username.length < 1) {
      return res.status(400).json({ 
        success: false,
        error: 'Valid username is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Get profile by username
    const Profile = getModel('Profile');
    const profile = await withDbConnection(async () => {
      return await Profile.findOne({ username });
    });
    
    if (!profile) {
      return res.status(404).json({ 
        success: false,
        data: {
          activeTriggers: [],
          level: 0,
          xp: 0
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Return system controls data with consistent format
    res.json({
      success: true,
      data: {
        activeTriggers: profile.activeTriggers || [],
        systemControls: profile.systemControls || {},
        level: profile.level || 0,
        xp: profile.xp || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error fetching system controls for ${req.params.username}:`, error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      data: {
        activeTriggers: []
      },
      timestamp: new Date().toISOString()
    });  }
});

// Test routes for debugging templates
router.get('/maintenance', (req, res) => {
  res.status(503).render('maintenance', {
    title: 'Maintenance Mode - BambiSleep.Chat',
    message: 'Bambi is making everything prettier...',
    currentIssue: 'Updating hypnotic experience',
    countdown: 300, // 5 minutes
    estimatedCompletion: Date.now() + (5 * 60 * 1000)
  });
});

router.get('/circuit-breaker', (req, res) => {
  res.status(503).render('circuit-breaker', {
    title: 'Service Temporarily Unavailable - BambiSleep.Chat',
    message: 'Circuit breaker has been activated',
    currentIssue: 'System overload detected - cooling down',
    countdown: 180, // 3 minutes
    estimatedCompletion: Date.now() + (3 * 60 * 1000)
  });
});

export default router;