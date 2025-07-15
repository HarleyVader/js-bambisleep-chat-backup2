# 🔌 BambiSleep.Chat - API Documentation

Simple API reference for BambiSleep.Chat platform.

## Base URL
```
https://bambisleep.chat
```

## Authentication
Uses cookie-based authentication:
- `bambiid`: Session identifier
- `bambiname`: Username (URL-encoded)

## Core API Endpoints

### Profile Data
```
GET /api/profile/:username/data
```
Get user profile information.

**Response:**
```json
{
  "username": "bambidoll",
  "displayName": "Bambi Doll", 
  "level": 5,
  "xp": 1250,
  "activeTriggers": ["BAMBI SLEEP", "GOOD GIRL"]
}
```

### System Controls
```
GET /api/profile/:username/system-controls
POST /api/profile/:username/system-controls
```
Get/update user's system control settings.

**Response:**
```json
{
  "activeTriggers": ["BAMBI SLEEP"],
  "systemControls": {
    "collarEnabled": true,
    "collarText": "Good Girl",
    "spiralsEnabled": false
  }
}
```

### Triggers
```
GET /api/triggers
```
Get available audio triggers.

**Response:**
```json
{
  "triggers": [
    {
      "name": "BAMBI SLEEP",
      "description": "Deep trance activation",
      "category": "core"
    }
  ]
}
```

## Data Models

### Profile Model
```javascript
{
  username: String,
  displayName: String,
  level: Number,
  xp: Number,
  activeTriggers: Array,
  systemControls: Object
}
```

### Trigger Model  
```javascript
{
  name: String,
  description: String,
  category: String,
  audioFile: String
}
```

## Error Responses

All endpoints return standard HTTP status codes:
- `200`: Success
- `400`: Bad request
- `403`: Unauthorized
- `404`: Not found
- `500`: Server error

## Rate Limiting

API endpoints are rate-limited to prevent abuse.
Standard limits apply per IP address.

## RESTful API Endpoints

### Profile Endpoints

#### Get Profile Data
```http
GET /api/profile/{username}/data
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "username": "string",
    "xp": 0,
    "level": 0,
    "bio": "string",
    "socialLinks": {
      "twitter": "string",
      "instagram": "string",
      "discord": "string",
      "reddit": "string",
      "custom": "string"
    },
    "likes": 0,
    "loves": 0,
    "usageStats": {
      "sessionsCount": 0,
      "totalTimeSpent": 0,
      "triggersActivated": 0,
      "messagesPosted": 0,
      "joinDate": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

#### Get System Controls
```http
GET /api/profile/{username}/system-controls
```

**Response:**
```json
{
  "activeTriggers": [
    {
      "name": "BAMBI SLEEP",
      "category": "core",
      "enabled": true
    }
  ],
  "systemSettings": {
    "autoTriggers": true,
    "audioEnabled": true,
    "ttsVoice": "af_bella"
  }
}
```

#### Update System Controls
```http
POST /api/profile/{username}/system-controls
```

**Request Body:**
```json
{
  "section": "triggers",
  "settings": {
    "autoTriggers": true,
    "triggerSensitivity": "high"
  }
}
```

#### Update Profile
```http
POST /profile/{username}/update
```

**Request Body:**
```json
{
  "bio": "string",
  "socialLinks": {
    "twitter": "username",
    "discord": "username#1234"
  },
  "profileStyle": "premium"
}
```

#### React to Profile
```http
POST /profile/{username}/reaction
```

**Request Body:**
```json
{
  "type": "like" // or "love"
}
```

### Chat Endpoints

#### Get Recent Messages
```http
GET /api/chat/messages?limit=50
```

**Response:**
```json
{
  "messages": [
    {
      "_id": "message_id",
      "username": "string",
      "data": "string",
      "timestamp": "2025-01-01T00:00:00.000Z",
      "messageType": "text",
      "urls": [],
      "mentions": [],
      "audioTriggered": null,
      "isAigfResponse": false
    }
  ]
}
```

### Trigger Endpoints

#### Get Available Triggers
```http
GET /api/triggers
```

**Response:**
```json
{
  "triggers": [
    {
      "name": "BAMBI SLEEP",
      "audioFile": "Bambi Sleep",
      "description": "Instant deep trance trigger",
      "details": "Trained in: Bimbo Slavedoll Conditioning 01",
      "filename": "Bambi-Sleep.mp3",
      "category": "core"
    }
  ]
}
```

### Audio/TTS Endpoints

#### Get Available Voices
```http
GET /api/tts/voices
```

**Response:**
```json
{
  "voices": [
    {
      "id": "af_bella",
      "name": "Bella",
      "language": "en-US",
      "gender": "female"
    }
  ]
}
```

#### Generate Speech
```http
GET /api/tts?text={text}&voice={voice_id}
```

**Parameters:**
- `text` (required): Text to convert to speech
- `voice` (optional): Voice ID (default: af_bella)

**Response:** Binary audio data (audio/mpeg)

### Health Endpoints

#### System Health Check
```http
GET /health/api
```

**Response:**
```json
{
  "system": {
    "uptime": "string",
    "memory": {
      "total": 16384,
      "free": 8192,
      "used": 8192,
      "percentage": 50
    },
    "cpu": {
      "percentage": 25
    }
  },
  "database": {
    "status": "connected",
    "responseTime": 10
  },
  "workers": {
    "lmstudio": {
      "status": "healthy",
      "sessions": 5
    }
  }
}
```

### Session Endpoints

#### Get User Sessions
```http
GET /api/sessions/{username}
```

**Response:**
```json
{
  "sessions": [
    {
      "sessionId": "string",
      "startTime": "2025-01-01T00:00:00.000Z",
      "endTime": "2025-01-01T01:00:00.000Z",
      "messageCount": 50,
      "triggerCount": 5
    }
  ]
}
```

---

## Socket.IO Events

### Connection Events

#### Join Events
```javascript
// Join main chat
socket.emit('join-chat', { username: 'username' });

// Join profile room
socket.emit('join-profile', 'username');

// Join psychedelic trigger mania
socket.emit('join-psychodelic-trigger-mania', { username: 'username' });
```

### Chat Events

#### Send Message
```javascript
socket.emit('chat message', {
  data: 'message content'
});
```

#### Receive Message
```javascript
socket.on('chat message', (messageData) => {
  // messageData contains username, data, timestamp
});
```

### AI Interaction Events

#### Send AI Message
```javascript
socket.emit('message', 'prompt for AI');
```

#### Receive AI Response
```javascript
socket.on('response', (response) => {
  // AI response text
});
```

#### AI Error
```javascript
socket.on('error', (error) => {
  // Error message from AI
});
```

### Trigger Events

#### Activate Triggers
```javascript
socket.emit('triggers', {
  triggerNames: ['BAMBI SLEEP', 'GOOD GIRL']
});
```

#### Receive Trigger Activation
```javascript
socket.on('audio triggers', (data) => {
  // data.username, data.triggers
});
```

#### Detected Triggers
```javascript
socket.on('detected-triggers', (data) => {
  // Automatically detected triggers in messages
});
```

### Audio Events

#### Play Audio
```javascript
socket.emit('play audio', {
  audioFile: 'Good-Girl.mp3',
  targetUsername: 'optional_target' // or null for broadcast
});
```

#### Receive Audio Play
```javascript
socket.on('play audio', (data) => {
  // data.audioFile, data.sourceUsername
});
```

### Profile Events

#### Get Profile Data
```javascript
socket.emit('get profile data', { username: 'username' }, (response) => {
  // response.success, response.profile or response.error
});
```

#### Profile Update
```javascript
socket.on('profile-update', (data) => {
  // data.xp, data.level
});
```

#### XP Update
```javascript
socket.on('xp:update', (data) => {
  // data.xp, data.level, data.xpEarned, data.reason
});
```

### System Events

#### Status Updates
```javascript
socket.on('statusUpdate', (status) => {
  // System status information
});
```

#### Mode Changes
```javascript
socket.emit('modeChange', { mode: 'maintenance' });
socket.on('modeChanged', (data) => {
  // data.mode
});
```

#### Settings Updates
```javascript
socket.emit('worker:settings:update', {
  section: 'audio',
  username: 'username',
  settings: { volume: 0.8 }
});

socket.on('worker:settings:response', (response) => {
  // response.success, response.message or response.error
});
```

### User Interaction Events

#### User Mentions
```javascript
socket.on('mention', (data) => {
  // data.from, data.message, data.timestamp
});
```

#### URL Safety
```javascript
socket.on('unsafe url', (data) => {
  // data.messageId, data.url, data.reason
});
```

---

## Data Models

### Profile Model
```javascript
{
  username: String,           // Unique username
  xp: Number,                // Experience points
  preferences: Object,        // User preferences
  lastActive: Date,          // Last activity timestamp
  createdAt: Date,           // Account creation date
  bio: String,               // Profile biography
  socialLinks: {             // Social media links
    twitter: String,
    instagram: String,
    discord: String,
    reddit: String,
    custom: String
  },
  likes: Number,             // Profile likes count
  loves: Number,             // Profile loves count
  profileStyle: String,      // 'minimal', 'standard', 'premium'
  usageStats: {              // Usage statistics
    sessionsCount: Number,
    totalTimeSpent: Number,
    triggersActivated: Number,
    messagesPosted: Number,
    joinDate: Date
  }
}
```

### Chat Message Model
```javascript
{
  username: String,          // Message author
  data: String,             // Message content
  timestamp: Date,          // Message timestamp
  messageType: String,      // 'text', 'audio', 'trigger', 'command', 'url', 'system'
  urls: [{                  // Detected URLs
    url: String,
    isClean: Boolean,
    checkedAt: Date
  }],
  mentions: [{              // User mentions
    username: String,
    index: Number
  }],
  audioTriggered: String,   // Triggered audio file
  isAigfResponse: Boolean,  // AI response flag
  replyTo: ObjectId         // Reply reference
}
```

### Trigger Model
```javascript
{
  name: String,             // Trigger phrase
  audioFile: String,        // Associated audio file
  description: String,      // Trigger description
  details: String,          // Training details
  filename: String,         // Audio filename
  category: String          // Trigger category
}
```

### Audio Interaction Model
```javascript
{
  sourceUsername: String,   // User who triggered audio
  targetUsername: String,   // Target user (optional)
  audioFile: String,        // Audio file name
  triggerType: String,      // 'direct', 'chat', 'trigger'
  messageId: ObjectId,      // Associated message
  timestamp: Date           // Interaction timestamp
}
```

### AIGF Interaction Model
```javascript
{
  username: String,         // User who interacted
  interactionType: String,  // Type of interaction
  inputData: String,        // User input
  outputData: String,       // AI response
  duration: Number,         // Response time
  socketId: String,         // Socket identifier
  timestamp: Date           // Interaction timestamp
}
```

---

## Error Handling

### Standard Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional details (development mode only)"
}
```

### Common Error Codes
- `INVALID_INPUT`: Malformed request data
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication required
- `RATE_LIMITED`: Too many requests
- `SERVER_ERROR`: Internal server error
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable

### HTTP Status Codes
- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error
- `503`: Service Unavailable

---

## Rate Limiting

### API Limits
- **Chat Messages**: 60 per minute per user
- **AI Interactions**: 10 per minute per user
- **Profile Updates**: 5 per minute per user
- **Audio Requests**: 30 per minute per user

### WebSocket Limits
- **Connection**: 1 per user
- **Message Rate**: 1 per second average
- **Trigger Rate**: 5 per minute per user

---

## Examples

### JavaScript Client Example
```javascript
// Initialize connection
const socket = io('https://bambisleep.chat');

// Join chat
socket.emit('join-chat', { username: 'myUsername' });

// Send message
socket.emit('chat message', { data: 'Hello everyone!' });

// Listen for responses
socket.on('chat message', (message) => {
  console.log(`${message.username}: ${message.data}`);
});

// Interact with AI
socket.emit('message', 'Tell me about BambiSleep');
socket.on('response', (response) => {
  console.log('AI Response:', response);
});

// Activate triggers
socket.emit('triggers', { triggerNames: ['BAMBI SLEEP'] });
```

### Profile Management Example
```javascript
// Get profile data
fetch('/api/profile/myUsername/data')
  .then(response => response.json())
  .then(data => console.log(data.profile));

// Update profile
fetch('/profile/myUsername/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bio: 'Updated bio text',
    socialLinks: { twitter: 'myhandle' }
  })
});
```

### Audio/TTS Example
```javascript
// Get available voices
fetch('/api/tts/voices')
  .then(response => response.json())
  .then(voices => console.log(voices));

// Generate speech
const audioUrl = '/api/tts?text=Hello%20world&voice=af_bella';
const audio = new Audio(audioUrl);
audio.play();
```

---

## Development Notes

### Local Development
```bash
# Start development server
npm run dev

# Enable garbage collection
npm run dev:gc

# Debug mode
npm run debug
```

### Environment Variables
```bash
SERVER_PORT=6969
MONGODB_URI=mongodb://localhost:27017/bambisleep
KOKORO_HOST=localhost
KOKORO_PORT=8880
LMS_HOST=localhost
LMS_PORT=7777
```

### Testing API Endpoints
```bash
# Health check
curl https://bambisleep.chat/health/api

# Get triggers
curl https://bambisleep.chat/api/triggers

# Get profile data
curl https://bambisleep.chat/api/profile/username/data
```

---

*This API documentation covers all available endpoints and real-time events. For usage examples, see the User Guide. For system architecture, see the Details Documentation.*
