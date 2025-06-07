import express from 'express';
import sessionService from '../services/sessionService.js';
import Logger from '../utils/logger.js';
import footerConfig from '../config/footer.config.js';
import config from '../config/config.js';
import Profile from '../models/Profile.js';

const router = express.Router();
const logger = new Logger('Chat');

// Base path for this router
export const basePath = '/chat';

// Main chat page
router.get('/', async (req, res) => {
  try {
    // Get username from cookie
    const username = req.cookies?.bambiname 
      ? decodeURIComponent(req.cookies.bambiname) 
      : 'anonBambi';
      // Get recent chat messages for the chat history
    let chatMessages = [];
    try {
      chatMessages = await sessionService.ChatMessage.getRecentMessages(50);
      logger.info(`Retrieved ${chatMessages.length} messages for chat history`);
    } catch (error) {
      logger.error(`Error fetching chat messages: ${error.message}`);
      // Continue with empty array rather than failing the whole page
    }
    
    // Get profile data if available
    let profile = null;
    if (username && username !== 'anonBambi') {
      try {
        profile = await Profile.findByUsername(username);
      } catch (error) {
        logger.error(`Error fetching profile for ${username}:`, error);
      }
    }
    
    // Get footer links from config
    const footerLinks = config?.FOOTER_LINKS || footerConfig?.links || [];
    
    // Load trigger data for client if profile exists
    let triggers = [];
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
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
      // Render the chat view with necessary data
    res.render('chat', {
      title: 'BambiSleep Chat',
      profile,
      username,
      footerLinks,
      footer: footerConfig,
      chatMessages,
      triggers
    });  } catch (error) {
    logger.error('Error rendering chat page:', error);
    
    // Fallback with minimal data
    res.render('chat', {
      title: 'BambiSleep Chat',
      profile: null,
      username: '',
      footerLinks: config?.FOOTER_LINKS || footerConfig?.links || [],
      footer: footerConfig,
      chatMessages: [],
      triggers: []
    });
  }
});

export default router;