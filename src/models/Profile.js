import mongoose from 'mongoose';

const ProfileSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  xp: {
    type: Number,
    default: 0
  },
  preferences: {
    type: Object,
    default: {}
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Profile enhancement features
  bio: {
    type: String,
    default: '',
    maxlength: 2000
  },
  socialLinks: {
    twitter: { type: String, default: '' },
    instagram: { type: String, default: '' },
    discord: { type: String, default: '' },
    reddit: { type: String, default: '' },
    custom: { type: String, default: '' }
  },
  likes: {
    type: Number,
    default: 0
  },
  loves: {
    type: Number,
    default: 0
  },
  profileStyle: {
    type: String,
    enum: ['minimal', 'standard', 'premium'],
    default: 'standard'
  },
  usageStats: {
    sessionsCount: { type: Number, default: 0 },
    totalTimeSpent: { type: Number, default: 0 }, // in minutes
    triggersActivated: { type: Number, default: 0 },
    messagesPosted: { type: Number, default: 0 },
    joinDate: { type: Date, default: Date.now }
  }
});

// Calculate user level based on XP
ProfileSchema.virtual('level').get(function() {
  const requirements = [100, 250, 450, 700, 1200];
  let level = 0;
  
  while (level < requirements.length && this.xp >= requirements[level]) {
    level++;
  }
  
  return level;
});

// Add methods to check if user has access to specific features
ProfileSchema.methods.hasAccess = function(feature) {
  // Basic feature check based on level
  const featureLevels = {
    basicChat: 0,
    customTriggers: 1,
    voiceCommands: 2,
    sessionHistory: 1
  };
  
  const requiredLevel = featureLevels[feature] || 0;
  return this.level >= requiredLevel;
};

// Add findOrCreateByUsername method
ProfileSchema.statics.findOrCreateByUsername = async function(username, userData = {}) {
  if (!username) return null;
  
  let profile = await this.findOne({ username });
  
  if (!profile) {
    profile = await this.create({
      username,
      xp: 0,
      created: new Date(),
      lastSeen: new Date(),
      ...userData
    });
  } else {
    profile.lastSeen = new Date();
    await profile.save();
  }
  
  return profile;
};

// Export both the schema and model to allow reuse in workers
const Profile = mongoose.models.Profile || mongoose.model('Profile', ProfileSchema);

// Add schema to the export for worker thread registration
Profile.schema = ProfileSchema;

// Export helper function for getting profile by username
export async function getProfile(username) {
  if (!username) return null;
  try {
    return await Profile.findOne({ username });
  } catch (error) {
    // Use console.error for now as logger isn't imported in models
    console.error('Error fetching profile:', error);
    return null;
  }
}

export default Profile;
