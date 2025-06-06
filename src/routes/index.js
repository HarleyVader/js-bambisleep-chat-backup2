import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import Logger from '../utils/logger.js';
import footerConfig from '../config/footer.config.js';
import config from '../config/config.js'; // Add this import
import { getModel, withDbConnection } from '../config/db.js';
import sessionService from '../services/sessionService.js';

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
    
    // Render the index view with profile data and chat messages
    res.render('index', { 
      profile,
      username,
      footerLinks,
      footer: footerConfig, // Add full footer config
      chatMessages,
      triggers,
      title: 'BambiSleep.Chat - Hypnotic AI Chat'
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
      title: 'BambiSleep.Chat - Hypnotic AI Chat'
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
    
    res.json({ triggers });
  } catch (error) {
    logger.error('Error loading triggers:', error);
    
    // Return fallback triggers
    res.json({
      triggers: [
        { name: "BAMBI SLEEP", description: "triggers deep trance and receptivity", category: "core" },
        { name: "GOOD GIRL", description: "reinforces obedience and submission", category: "core" }
      ]
    });
  }
});

// Add API endpoints for profile data and system controls
router.get('/api/profile/:username/data', async (req, res) => {
  try {
    const username = req.params.username;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Verify that this is the user's own profile using the cookie
    const cookie = req.cookies?.bambiid;
    const bambinameCookie = req.cookies?.bambiname;
    
    if (bambinameCookie && decodeURIComponent(bambinameCookie) !== username) {
      return res.status(403).json({ error: 'Unauthorized access to profile' });
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

export default router;