import express from 'express';
import multer from 'multer';
import { marked } from 'marked';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Logger from '../utils/logger.js';
import footerConfig from '../config/footer.config.js';
import { getModel, withDbConnection } from '../config/db.js';

const router = express.Router();
const logger = new Logger('Profile');
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for .md file uploads
const storage = multer.diskStorage({
  destination: join(__dirname, '..', 'uploads', 'profiles'),
  filename: (req, file, cb) => {
    const username = req.params.username || 'anonymous';
    cb(null, `${username}-${Date.now()}.md`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/markdown' || file.originalname.endsWith('.md')) {
      cb(null, true);
    } else {
      cb(new Error('Only .md files are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Ensure upload directory exists
await fs.mkdir(join(__dirname, '..', 'uploads', 'profiles'), { recursive: true });

export const basePath = '/profile';

// XP requirements for each level
const xpRequirements = [1000, 2500, 4500, 7000, 12000, 36000, 112000, 332000];

// Calculate level from XP
function calculateLevel(xp) {
  if (!xp || xp < 0) return 0;
  
  let level = 0;
  let totalXpRequired = 0;
  
  for (let i = 0; i < xpRequirements.length; i++) {
    totalXpRequired += xpRequirements[i];
    if (xp >= totalXpRequired) {
      level = i + 1;
    } else {
      break;
    }
  }
  
  return level;
}

// Get XP progress for current level
function getXpProgress(xp, level) {
  if (level === 0) return { currentLevelXp: 0, nextLevelXp: xpRequirements[0], progress: 0 };
  if (level >= xpRequirements.length) return { currentLevelXp: xp, nextLevelXp: null, progress: 100 };
  
  let totalXpForCurrentLevel = 0;
  for (let i = 0; i < level; i++) {
    totalXpForCurrentLevel += xpRequirements[i];
  }
  
  const currentLevelXp = xp - totalXpForCurrentLevel;
  const nextLevelXp = xpRequirements[level];
  const progress = nextLevelXp ? (currentLevelXp / nextLevelXp) * 100 : 100;
  
  return { currentLevelXp, nextLevelXp, progress };
}

// Get profile page
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const Profile = getModel('Profile');
    let profile = await withDbConnection(async () => {
      return await Profile.findOne({ username });
    });    // Create a basic profile if none exists
    if (!profile) {
      profile = await withDbConnection(async () => {
        return await Profile.create({
          username,
          xp: 0,
          level: 0,
          bio: '',
          socialLinks: {},
          likes: 0,
          loves: 0,
          profileStyle: 'standard',
          usageStats: {
            sessionsCount: 0,
            totalTimeSpent: 0,
            triggersActivated: 0,
            messagesPosted: 0,
            joinDate: new Date()
          },
          systemControls: {
            collarEnabled: false,
            collarText: '',
            aiModel: 'lmstudio', // Default to LMStudio, can be 'lmstudio' or 'huggingface'
            spiralsEnabled: false,
            spiral1Width: 5.0,
            spiral2Width: 3.0,
            spiral1Speed: 20,
            spiral2Speed: 15,
            hypnosisEnabled: false,
            useStreaming: false,
            brainwaveEnabled: false,
            brainwaveMode: 'alpha',
            carrierFrequency: 200,
            brainwaveVolume: 50,
            customFrequency: 10,
            advancedBinauralEnabled: false,
            binauralPattern: 'descent',
            patternDuration: 20,
            transitionTime: 30
          }
        });
      });
    }

    // Ensure level is calculated correctly from XP
    profile.level = calculateLevel(profile.xp || 0);
    
    // Save updated level if it changed
    if (profile.isModified && profile.isModified('level')) {
      await withDbConnection(async () => {
        return await profile.save();
      });
    }// Parse bio if it contains markdown
    let bioHtml = '';
    if (profile.bio) {
      bioHtml = marked(profile.bio);
    }    // Calculate next level XP for progress bar
    const xpProgress = getXpProgress(profile.xp || 0, profile.level);
    let nextLevelXP = null;
    let currentLevelBaseXP = 0;
    
    if (profile.level < xpRequirements.length) {
      // Calculate total XP needed for current level
      for (let i = 0; i < profile.level; i++) {
        currentLevelBaseXP += xpRequirements[i];
      }
      nextLevelXP = currentLevelBaseXP + xpRequirements[profile.level];
    }

    res.render('profile', {
      title: `${profile.username}'s Profile - BambiSleep.Chat`,
      profile,
      bioHtml,
      footer: footerConfig,
      isOwner: req.cookies?.bambiname === encodeURIComponent(username),
      xpRequirements,
      nextLevelXP,
      currentLevelBaseXP,
      xpProgress
    });
  } catch (error) {
    logger.error(`Error loading profile for ${req.params.username}:`, error);    res.status(500).render('error', {
      title: 'Profile Error',
      message: 'Error loading profile',
      footer: footerConfig,
      error: { status: 500 },
      req: req
    });
  }
});

// Update profile data
router.post('/:username/update', async (req, res) => {
  try {
    const { username } = req.params;
    const { bio, socialLinks, profileStyle } = req.body;
    
    // Verify ownership
    if (req.cookies?.bambiname !== encodeURIComponent(username)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const Profile = getModel('Profile');
    const profile = await withDbConnection(async () => {
      return await Profile.findOne({ username });
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Update profile fields
    if (bio !== undefined) profile.bio = bio;
    if (socialLinks) {
      profile.socialLinks = {
        ...profile.socialLinks,
        ...socialLinks
      };
    }
    if (profileStyle && ['minimal', 'standard', 'premium'].includes(profileStyle)) {
      profile.profileStyle = profileStyle;
    }

    await withDbConnection(async () => {
      return await profile.save();
    });

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    logger.error(`Error updating profile for ${req.params.username}:`, error);
    res.status(500).json({ error: 'Error updating profile' });
  }
});

// Upload markdown file for bio
router.post('/:username/upload-bio', upload.single('bioFile'), async (req, res) => {
  try {
    const { username } = req.params;
    
    // Verify ownership
    if (req.cookies?.bambiname !== encodeURIComponent(username)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read the uploaded markdown file
    const bioContent = await fs.readFile(req.file.path, 'utf8');
    
    const Profile = getModel('Profile');
    const profile = await withDbConnection(async () => {
      return await Profile.findOne({ username });
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Update bio with file content
    profile.bio = bioContent;
    await withDbConnection(async () => {
      return await profile.save();
    });

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    res.json({ success: true, message: 'Bio updated from markdown file' });
  } catch (error) {
    logger.error(`Error uploading bio for ${req.params.username}:`, error);
    res.status(500).json({ error: 'Error uploading bio' });
  }
});

// Like/Love profile
router.post('/:username/reaction', async (req, res) => {
  try {
    const { username } = req.params;
    const { type } = req.body; // 'like' or 'love'
    
    if (!['like', 'love'].includes(type)) {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    const Profile = getModel('Profile');
    const profile = await withDbConnection(async () => {
      return await Profile.findOne({ username });
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Increment the appropriate counter
    if (type === 'like') {
      profile.likes = (profile.likes || 0) + 1;
    } else {
      profile.loves = (profile.loves || 0) + 1;
    }

    await withDbConnection(async () => {
      return await profile.save();
    });

    res.json({ 
      success: true, 
      likes: profile.likes, 
      loves: profile.loves 
    });
  } catch (error) {
    logger.error(`Error adding reaction to ${req.params.username}:`, error);
    res.status(500).json({ error: 'Error adding reaction' });
  }
});

// Update usage stats (called internally by other parts of the app)
router.post('/:username/stats', async (req, res) => {
  try {
    const { username } = req.params;
    const { action, value } = req.body; // action: 'session', 'trigger', 'message', 'time'
    
    const Profile = getModel('Profile');
    const profile = await withDbConnection(async () => {
      return await Profile.findOne({ username });
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Initialize usage stats if they don't exist
    if (!profile.usageStats) {
      profile.usageStats = {
        sessionsCount: 0,
        totalTimeSpent: 0,
        triggersActivated: 0,
        messagesPosted: 0,
        joinDate: profile.createdAt || new Date()
      };
    }

    // Update the appropriate stat
    switch (action) {
      case 'session':
        profile.usageStats.sessionsCount += 1;
        break;
      case 'trigger':
        profile.usageStats.triggersActivated += 1;
        break;
      case 'message':
        profile.usageStats.messagesPosted += 1;
        break;
      case 'time':
        profile.usageStats.totalTimeSpent += (value || 1);
        break;
    }

    profile.lastActive = new Date();
    await withDbConnection(async () => {
      return await profile.save();
    });

    res.json({ success: true });
  } catch (error) {
    logger.error(`Error updating stats for ${req.params.username}:`, error);
    res.status(500).json({ error: 'Error updating stats' });  }
});

// Test endpoint to set fake high level account (development only)
router.post('/:username/debug/set-level', async (req, res) => {
  try {
    const { username } = req.params;
    const { level, xp } = req.body;
    
    // Verify ownership
    if (req.cookies?.bambiname !== encodeURIComponent(username)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const Profile = getModel('Profile');
    const profile = await withDbConnection(async () => {
      return await Profile.findOne({ username });
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Set level and XP for testing
    if (level !== undefined) profile.level = parseInt(level);
    if (xp !== undefined) profile.xp = parseInt(xp);

    await withDbConnection(async () => {
      return await profile.save();
    });

    res.json({ 
      success: true, 
      message: `Profile updated to level ${profile.level} with ${profile.xp} XP`,
      level: profile.level,
      xp: profile.xp
    });
  } catch (error) {
    logger.error(`Error setting debug level for ${req.params.username}:`, error);
    res.status(500).json({ error: 'Error updating profile' });
  }
});

export default router;
