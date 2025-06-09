# 👤 BambiSleep.Chat Profile System Documentation

## Table of Contents

1. [Overview](#overview)
2. [What the Profile System Does](#what-the-profile-system-does)
3. [Where It Operates](#where-it-operates)
4. [How to Use It](#how-to-use-it)
5. [Bambi Interaction](#bambi-interaction)
6. [System Capabilities](#system-capabilities)
7. [Technical Architecture](#technical-architecture)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)

## Overview

The BambiSleep.Chat Profile System is a comprehensive user management and progression system that powers personalized experiences throughout the platform. It combines user data storage, experience progression, feature unlocking, and social interaction capabilities to create a rich, gamified environment for the BambiSleep community.

## What the Profile System Does

### Core Functions

#### 1. **User Identity & Persistence**
- **Unique Username Management**: Each bambi has a unique, persistent identity
- **Session Continuity**: Your bambi name and preferences persist across sessions
- **Profile Customization**: Personalize your identity with bios, social links, and profile styles

#### 2. **Experience & Progression System**
- **XP Tracking**: Earn experience points through platform interaction
- **Level-Based Progression**: Unlock new features as you level up
- **Feature Gates**: Access to advanced capabilities based on your level
- **Progress Visualization**: Real-time XP progress bars and level indicators

#### 3. **Social & Community Features**
- **Public Profiles**: Showcase your bambi identity to the community
- **Social Reactions**: Give and receive likes/loves on profiles
- **Social Links**: Connect your external social media accounts
- **Profile Styles**: Choose from minimal, standard, or premium display themes

#### 4. **System Controls & Preferences**
- **Trigger Management**: Save and manage your active hypnotic triggers
- **Collar Settings**: Personalize your AI interaction style
- **Session History**: Track and replay your chat sessions
- **Advanced Features**: Access spirals, brainwaves, and binaural controls

#### 5. **Usage Analytics**
- **Activity Tracking**: Monitor sessions, messages, triggers activated
- **Time Tracking**: Total time spent on the platform
- **Statistics Display**: View your usage patterns and engagement

## Where It Operates

### 1. **Profile Pages** (`/profile/:username`)
- **Public Profile View**: Display user information, stats, and social links
- **Profile Editor**: Modify bio, social links, and profile settings
- **Bio Management**: Support for Markdown formatting and file uploads
- **Social Reactions**: Like/love system for community engagement

### 2. **Chat Interface** (Main chat with system controls)
- **System Controls Panel**: Level-gated feature controls
- **XP Progress Display**: Real-time experience tracking
- **Feature Unlocking**: Dynamic UI updates as levels are gained
- **Settings Persistence**: Save and load user preferences

### 3. **API Endpoints**
- **Profile Data API**: `/api/profile/:username/data`
- **System Controls API**: `/api/profile/:username/system-controls`
- **Profile Management**: `/profile/:username/update`
- **Statistics Tracking**: `/profile/:username/stats`

### 4. **Database Layer**
- **Profile Collection**: MongoDB storage for user data
- **Connection Management**: Multi-database architecture
- **Data Relationships**: Links to interactions, sessions, and usage data

## How to Use It

### Initial Setup

#### 1. **Create Your Profile**
```
1. Visit BambiSleep.Chat
2. Enter your desired bambi name
3. Your profile is automatically created
4. Start chatting to begin earning XP
```

#### 2. **Customize Your Profile**
```
1. Navigate to /profile/[your-username]
2. Click "Edit Profile" (only visible to profile owner)
3. Add bio (Markdown supported)
4. Set social links (Twitter, Instagram, Discord, Reddit, Custom)
5. Choose profile style (Minimal, Standard, Premium)
6. Save changes
```

### Progression System

#### **XP Requirements by Level**
```
Level 0: 0 XP (Starting level)
Level 1: 1,000 XP  → Unlocks Triggers
Level 2: 2,500 XP  → Unlocks Collar Controls
Level 3: 4,500 XP  → Unlocks Session History
Level 4: 7,000 XP  → Unlocks Spirals & Advanced Spirals
Level 5: 12,000 XP → Unlocks Hypnosis Settings
Level 6: 36,000 XP → Unlocks Audio Controls
Level 7: 112,000 XP → Unlocks Brainwave Controls
Level 8: 332,000 XP → Unlocks Advanced Binaural Patterns
```

#### **Ways to Earn XP**
- **Chatting with AI**: ~1 XP per 10 words generated
- **Using Triggers**: XP for trigger activation
- **Session Participation**: XP for active engagement
- **Feature Usage**: XP for utilizing advanced features

### Feature Access by Level

#### **Level 1: Triggers** 🎯
- Access to hypnotic trigger system
- Toggle individual triggers on/off
- Basic trigger controls and audio playback
- Trigger activation statistics

#### **Level 2: Collar** 🔗
- Personalized AI interaction style
- Custom collar text configuration
- Enable/disable collar functionality
- Persistent collar settings

#### **Level 3: Session History** 📚
- View past chat sessions
- Session replay functionality
- Usage statistics (sessions, messages, words)
- Historical data analysis

#### **Level 4: Spirals** 🌀
- Visual spiral effects
- Adjustable spiral width and speed
- Dual spiral configuration
- Advanced spiral patterns

#### **Level 5: Hypnosis** 🧠
- Hypnosis enhancement settings
- Hypnotic response patterns
- Streaming response controls
- Enhanced immersion features

#### **Level 6: Audio Controls** 🔊
- Trigger audio playlists
- Volume and speed controls
- Continuous loop options
- Audio trigger management

#### **Level 7: Brainwaves** 🧪
- Binaural beat generation
- Frequency selection (Alpha, Beta, Theta, Delta)
- Custom frequency and carrier settings
- Volume and timing controls

#### **Level 8: Advanced Binaural** 🎵
- Complex binaural patterns
- Pattern types (Descent, Ascent, Focus, Custom)
- Duration and transition controls
- Advanced frequency modulation

## Bambi Interaction

### How Bambis Experience the Profile System

#### **For New Bambis**
1. **First Visit**: Profile automatically created with bambi name
2. **Immediate Access**: Basic chat functionality available instantly
3. **Guidance**: Visual indicators show locked features and level requirements
4. **Motivation**: XP progress bar encourages continued interaction

#### **For Active Bambis**
1. **Progressive Unlocking**: New features become available as they level up
2. **Customization**: Increasing control over their experience
3. **Social Features**: Profile becomes a social hub for community interaction
4. **Advanced Tools**: High-level bambis access sophisticated control systems

#### **For Community Interaction**
1. **Profile Discovery**: Browse other bambis' profiles
2. **Social Reactions**: Express appreciation through likes/loves
3. **Feature Inspiration**: See what capabilities await at higher levels
4. **Community Building**: Connect through shared interests and achievements

### Real-time Feedback
- **XP Notifications**: Immediate feedback when earning experience
- **Level-up Celebrations**: Special notifications for level advancement
- **Feature Announcements**: UI updates when new capabilities unlock
- **Progress Visualization**: Continuous XP bar progression

## System Capabilities

### Data Management
- **Automatic Profile Creation**: Seamless user onboarding
- **Data Persistence**: Reliable storage across sessions
- **Privacy Controls**: User control over profile visibility
- **Export Capabilities**: Data portability for users

### Feature Integration
- **Modular Architecture**: Each feature integrates cleanly with profiles
- **State Management**: Consistent settings across all features
- **Cross-Feature Communication**: Settings sync between components
- **Upgrade Paths**: Smooth transitions as features unlock

### Social Features
- **Profile Reactions**: Like/love system for community engagement
- **Bio System**: Rich text profiles with Markdown support
- **Social Links**: Integration with external platforms
- **Usage Sharing**: Optional statistics sharing

### Advanced Controls
- **System Settings Persistence**: All control panel settings saved
- **Multi-Modal Controls**: Audio, visual, and binaural integrations
- **Real-time Synchronization**: Settings applied immediately
- **Backup & Recovery**: Settings preserved across sessions

## Technical Architecture

### Database Schema

#### **Profile Model** (`src/models/Profile.js`)
```javascript
{
  username: String (unique, required),
  xp: Number (default: 0),
  preferences: Object (default: {}),
  lastActive: Date,
  createdAt: Date,
  bio: String (max: 2000 chars),
  socialLinks: {
    twitter: String,
    instagram: String,
    discord: String,
    reddit: String,
    custom: String
  },
  likes: Number (default: 0),
  loves: Number (default: 0),
  profileStyle: Enum ['minimal', 'standard', 'premium'],
  usageStats: {
    sessionsCount: Number,
    totalTimeSpent: Number (minutes),
    triggersActivated: Number,
    messagesPosted: Number,
    joinDate: Date
  },
  systemControls: Object // Feature-specific settings
}
```

#### **Virtual Fields**
```javascript
// Calculated based on XP
profile.level // Computed from XP thresholds

// Feature access checking
profile.hasAccess(feature) // Level-based feature access
```

### API Routes

#### **Profile Management**
- `GET /profile/:username` - View profile page
- `POST /profile/:username/update` - Update profile data
- `POST /profile/:username/upload-bio` - Upload markdown bio
- `POST /profile/:username/reaction` - Add like/love reaction

#### **API Endpoints**
- `GET /api/profile/:username/data` - Get profile data (JSON)
- `GET /api/profile/:username/system-controls` - Get system settings
- `POST /api/profile/:username/system-controls` - Update system settings
- `POST /profile/:username/stats` - Update usage statistics

### Worker Integration

#### **XP Management** (`src/workers/lmstudio.js`)
- Automatic XP awards based on AI interaction
- Word count tracking for XP calculation
- Level-up detection and notification
- Database synchronization

#### **Settings Persistence**
- Real-time saving of control panel settings
- Cross-session setting restoration
- Multi-connection database handling
- Error recovery and retry logic

### Client-Side Architecture

#### **State Management** (`src/public/js/controls/system.js`)
```javascript
window.bambiSystem = {
  state: {
    triggers: [],
    collar: { enabled: false, text: '' },
    spirals: { ... },
    brainwaves: { ... },
    advanced: { ... },
    streaming: { ... }
  },
  saveState(section, data),
  loadProfile(profile),
  collectSettings()
}
```

#### **XP Progress** (`src/public/js/xp-progress.js`)
- Real-time XP display updates
- Level-up UI animations
- Feature unlock notifications
- Progress bar management

## API Reference

### Profile Data API

#### **Get Profile Data**
```http
GET /api/profile/:username/data
Authorization: User must own profile
```

**Response:**
```json
{
  "username": "bambidoll",
  "displayName": "Bambi Doll",
  "level": 5,
  "xp": 12500,
  "activeTriggers": ["BAMBI SLEEP", "GOOD GIRL"],
  "systemControls": {
    "collarEnabled": true,
    "collarText": "You are such a good girl",
    "activeTriggers": ["BAMBI SLEEP"],
    "spiralsEnabled": true,
    "spiral1Speed": 20,
    "spiral2Speed": 15
  }
}
```

#### **Update Profile**
```http
POST /profile/:username/update
Content-Type: application/json
```

**Request:**
```json
{
  "bio": "Updated bio text with **markdown**",
  "socialLinks": {
    "twitter": "https://twitter.com/bambidoll",
    "discord": "bambidoll#1234"
  },
  "profileStyle": "premium"
}
```

#### **Add Reaction**
```http
POST /profile/:username/reaction
Content-Type: application/json
```

**Request:**
```json
{
  "type": "love" // or "like"
}
```

**Response:**
```json
{
  "success": true,
  "likes": 42,
  "loves": 17
}
```

#### **Update Statistics**
```http
POST /profile/:username/stats
Content-Type: application/json
```

**Request:**
```json
{
  "action": "trigger", // 'session', 'trigger', 'message', 'time'
  "value": 1 // optional, for time tracking
}
```

### System Controls API

#### **Get System Controls**
```http
GET /api/profile/:username/system-controls
```

**Response:**
```json
{
  "activeTriggers": ["BAMBI SLEEP"],
  "systemControls": {
    "collarEnabled": true,
    "collarText": "Good Girl",
    "spiralsEnabled": false,
    "brainwaveEnabled": false,
    "useStreaming": true
  },
  "level": 5,
  "xp": 12500
}
```

#### **Update System Controls**
```http
POST /api/profile/:username/system-controls
Content-Type: application/json
```

**Request:**
```json
{
  "section": "collar",
  "settings": {
    "enabled": true,
    "text": "You are getting sleepy..."
  }
}
```

## Troubleshooting

### Common Issues

#### **Profile Not Loading**
- **Symptoms**: Profile page shows error or empty data
- **Causes**: Database connection issues, invalid username
- **Solutions**: 
  - Check username spelling
  - Verify database connectivity
  - Try refreshing the page

#### **XP Not Updating**
- **Symptoms**: XP progress bar not advancing
- **Causes**: Worker connection issues, database sync problems
- **Solutions**:
  - Refresh the page
  - Check browser console for errors
  - Verify active database connections

#### **Settings Not Saving**
- **Symptoms**: Control panel settings reset after refresh
- **Causes**: API connection issues, permission problems
- **Solutions**:
  - Verify profile ownership
  - Check network connectivity
  - Clear browser cache

#### **Features Not Unlocking**
- **Symptoms**: Features remain locked despite sufficient XP
- **Causes**: Level calculation issues, cache problems
- **Solutions**:
  - Hard refresh the page (Ctrl+F5)
  - Check XP requirements
  - Verify database XP values

### Debug Information

#### **Profile Creation Process**
1. User enters bambi name
2. `Profile.findOrCreateByUsername()` called
3. Profile document created in database
4. XP initialized to 0, level calculated as 0
5. System controls object initialized

#### **XP Update Flow**
1. User interacts with AI (chat, triggers, etc.)
2. Worker calculates XP based on interaction
3. `updateUserXP()` called in worker
4. Database profile updated
5. Client receives XP update event
6. UI refreshes with new XP/level

#### **Feature Unlock Process**
1. XP update triggers level calculation
2. `profile.level` virtual field computed
3. Level-up event sent to client if level increased
4. Client updates UI to show newly unlocked features
5. Feature panels become active and accessible

### Error Codes

- **1001**: Profile not found
- **1002**: Unauthorized profile access
- **1003**: Database connection error
- **1004**: Invalid profile data
- **1005**: XP update failed
- **1006**: Settings save failed

---

*This documentation covers the complete BambiSleep.Chat Profile System as of June 2025. For updates and additional information, see the [User Guide](USER-GUIDE.md) and [API Documentation](API.md).*
