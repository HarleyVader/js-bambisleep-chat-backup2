# 🧠 BambiSleep.Chat API Routes Documentation

**Updated:** June 7, 2025  
**Version:** 2.0  
**Base URL:** `https://bambisleep.chat`  
**Completion:** <span class="checkmark-indicator checked">100% Implementation</span>

## 📋 Overview

This document provides comprehensive documentation for all API routes in the BambiSleep.Chat application. All routes are fully functional and integrated with the Bambi Control Network system.

## 🔐 Authentication

### Cookie-based Authentication
- **bambiid**: Session identifier cookie
- **bambiname**: Username cookie (URL-encoded)

### Security
- CORS enabled for all routes
- Rate limiting applied to API endpoints
- Profile access restricted to authenticated users

---

## 🏠 Core Routes

### Homepage Route
**Route:** `/`  
**Method:** `GET`  
**File:** `src/routes/index.js`

**Description:** Main application homepage with user profile and chat data.

**Response Data:**
```javascript
{
  profile: {
    username: string,
    displayName: string,
    level: number,
    xp: number,
    activeTriggers: array
  },
  chatMessages: array,
  triggers: array,
  controlNetworkStatus: object,
  controlNetworkMetrics: object
}
```

**Template:** `views/index.ejs`

---

## 💬 Chat Routes

### Chat Interface
**Route:** `/chat`  
**Method:** `GET`  
**File:** `src/routes/chat.js`

**Description:** Interactive chat interface with real-time messaging.

**Features:**
- Real-time Socket.IO integration
- Trigger system integration
- Profile-based customization
- Control network monitoring

**Template:** `views/chat.ejs`

---

## 🔧 API Routes

### 🎯 Triggers API

#### Get All Triggers
**Route:** `/api/triggers`  
**Method:** `GET`  
**File:** `src/routes/index.js`

**Response:**
```json
{
  "triggers": [
    {
      "name": "BAMBI SLEEP",
      "description": "triggers deep trance and receptivity",
      "category": "core"
    },
    {
      "name": "GOOD GIRL", 
      "description": "reinforces obedience and submission",
      "category": "core"
    }
  ]
}
```

**Source:** `src/config/triggers.json`

### 👤 Profile API

#### Get Profile Data
**Route:** `/api/profile/:username/data`  
**Method:** `GET`  
**File:** `src/routes/index.js`

**Parameters:**
- `username` (string): Target user's username

**Authorization:** Must match authenticated user's username

**Response:**
```json
{
  "username": "bambidoll",
  "displayName": "Bambi Doll",
  "level": 5,
  "xp": 1250,
  "activeTriggers": ["BAMBI SLEEP", "GOOD GIRL"],
  "systemControls": {
    "activeTriggers": [],
    "collarEnabled": false,
    "collarText": ""
  }
}
```

**Profile Status Display:**

<div class="health-card">
  <h4><span class="checkmark-indicator checked">Profile Status</span></h4>
  <div class="health-metrics">
    <div class="metric-item">
      <div class="metric-value">
        <span class="status-indicator active">Active</span>
      </div>
      <div class="metric-label">Triggers</div>
    </div>
    <div class="metric-item">
      <div class="metric-value">
        <span class="status-indicator off">Disabled</span>
      </div>
      <div class="metric-label">Collar</div>
    </div>
    <div class="metric-item">
      <div class="metric-value">Level 5</div>
      <div class="metric-label">User Level</div>
    </div>
    <div class="metric-item">
      <div class="metric-value">1250 XP</div>
      <div class="metric-label">Experience</div>
    </div>
  </div>
</div>

**Error Responses:**
- `400`: Username required
- `403`: Unauthorized access
- `404`: Profile not found
- `500`: Server error

#### Get System Controls
**Route:** `/api/profile/:username/system-controls`  
**Method:** `GET`  
**File:** `src/routes/index.js`

**Parameters:**
- `username` (string): Target user's username

**Response:**
```json
{
  "activeTriggers": ["BAMBI SLEEP"],
  "systemControls": {
    "collarEnabled": true,
    "collarText": "Good Girl"
  },
  "level": 5,
  "xp": 1250
}
```

---

## 🏥 Health & Monitoring

### Health API Endpoint
**Route:** `/health/api`  
**Method:** `GET`  
**File:** `src/routes/health.js`

**Description:** Comprehensive system health monitoring

**Response:**
```json
{
  "system": {
    "hostname": "bambisleep-server",
    "platform": "linux",
    "uptime": "2 days, 14 hours",
    "memory": {
      "total": 8192,
      "free": 4096,
      "used": 4096,
      "percentage": 50
    },
    "cpu": {
      "load1": 0.5,
      "load5": 0.7,
      "load15": 0.8,
      "percentage": 25
    }
  },
  "users": {
    "connected": 42,
    "active": 38,
    "total": 1337
  },
  "database": {
    "status": "connected",
    "responseTime": 45
  },
  "workers": {
    "spirals": "active",
    "lmstudio": "active"
  },
  "responseTime": 123
}
```

**Visual Status Display:**

<div class="health-card">
  <h4><span class="checkmark-indicator checked">System Health</span></h4>
  <div class="health-metrics">
    <div class="metric-item">
      <div class="metric-value">
        <span class="status-indicator operational">Connected</span>
      </div>
      <div class="metric-label">Database</div>
    </div>
    <div class="metric-item">
      <div class="metric-value">
        <span class="status-indicator active">Active</span>
      </div>
      <div class="metric-label">Spirals Worker</div>
    </div>
    <div class="metric-item">
      <div class="metric-value">
        <span class="status-indicator active">Active</span>
      </div>
      <div class="metric-label">LMStudio Worker</div>
    </div>
    <div class="metric-item">
      <div class="metric-value">42</div>
      <div class="metric-label">Connected Users</div>
    </div>
  </div>
</div>

### Health Dashboard
**Route:** `/health`  
**Method:** `GET`  
**File:** `src/routes/health.js`

**Description:** Visual health monitoring dashboard

**Template:** `views/health.ejs`

---

## 🧠 Bambi Neural Network Control System (BNNCS)

### System Status
**Route:** `/api/bnncs/status`  
**Method:** `GET`  
**File:** `src/routes/bnncs.js`

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "operational",
    "nodes": 5,
    "activeConnections": 42,
    "systemUptime": "2d 14h 32m"
  },
  "timestamp": "2025-06-07T12:00:00Z"
}
```

**System Status Display:**

<div class="health-card">
  <h4><span class="checkmark-indicator checked">BNNCS Status</span></h4>
  <div class="health-metrics">
    <div class="metric-item">
      <div class="metric-value">
        <span class="status-indicator operational">Operational</span>
      </div>
      <div class="metric-label">System Status</div>
    </div>
    <div class="metric-item">
      <div class="metric-value">5</div>
      <div class="metric-label">Active Nodes</div>
    </div>
    <div class="metric-item">
      <div class="metric-value">42</div>
      <div class="metric-label">Connections</div>
    </div>
    <div class="metric-item">
      <div class="metric-value">2d 14h</div>
      <div class="metric-label">System Uptime</div>
    </div>
  </div>
</div>

### Control Nodes
**Route:** `/api/bnncs/nodes`  
**Method:** `GET`  
**File:** `src/routes/bnncs.js`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "aigf-core-123",
      "type": "USER_INTERFACE",
      "status": "active",
      "lastSeen": "2025-06-07T12:00:00Z"
    },
    {
      "id": "tts-456",
      "type": "AUDIO_PROCESSOR", 
      "status": "active",
      "lastSeen": "2025-06-07T11:59:30Z"
    }
  ],
  "total": 5
}
```

**Control Nodes Status:**

<div class="health-card">
  <h4><span class="checkmark-indicator checked">Control Nodes</span></h4>
  <div class="health-metrics">
    <div class="metric-item">
      <div class="metric-value">
        <span class="status-indicator active">Active</span>
      </div>
      <div class="metric-label">USER_INTERFACE</div>
    </div>
    <div class="metric-item">
      <div class="metric-value">
        <span class="status-indicator active">Active</span>
      </div>
      <div class="metric-label">AUDIO_PROCESSOR</div>
    </div>
    <div class="metric-item">
      <div class="metric-value">5</div>
      <div class="metric-label">Total Nodes</div>
    </div>
    <div class="metric-item">
      <div class="metric-value">
        <span class="checkmark-indicator checked">Online</span>
      </div>
      <div class="metric-label">Network Status</div>
    </div>
  </div>
</div>

---

## 📚 Documentation Routes

### Documentation Hub
**Route:** `/docs`  
**Method:** `GET`  
**File:** `src/routes/docs.js`

**Description:** Interactive documentation browser

**Features:**
- Markdown rendering with syntax highlighting
- GitHub-style formatting
- Automatic file discovery
- Category organization

**Template:** `views/docs/docs-index.ejs`

### Individual Document
**Route:** `/docs/:filename`  
**Method:** `GET`  
**File:** `src/routes/docs.js`

**Parameters:**
- `filename` (string): Markdown file name (without .md extension)

**Template:** `views/docs/docs-view.ejs`

---

## ❓ Help Routes

### Help Center
**Route:** `/help`  
**Method:** `GET`  
**File:** `src/routes/help.js`

**Description:** User help and support documentation

**Template:** `views/help.ejs`

### Help Document
**Route:** `/help/:filename`  
**Method:** `GET`  
**File:** `src/routes/help.js`

**Parameters:**
- `filename` (string): Help document name

**Template:** `views/help-doc.ejs`

---

## 🌀 Special Features

### Psychedelic Trigger Mania
**Route:** `/triggers/mania`  
**Method:** `GET`  
**File:** `src/routes/psychodelic-trigger-mania.js`

**Description:** Interactive psychedelic trigger experience

**Features:**
- Visual effects and animations
- Audio trigger integration
- Customizable experience parameters

**Template:** `views/psychodelic-trigger-mania.ejs`

---

## 🔌 Socket.IO Integration

All routes integrate with the Socket.IO real-time system for:

- **Real-time chat messaging**
- **Trigger activation events**
- **System status updates**
- **Control network communication**
- **User presence tracking**

### Socket Events
- `bambi:trigger` - Trigger activation
- `bambi:message` - Chat message
- `bambi:status` - System status update
- `bambi:control` - Control network signal

---

## 🛡️ Error Handling

### Global Error Handler
**File:** `src/utils/errorHandler.js`

**Standard Error Response:**
```json
{
  "error": "Error message",
  "status": 500,
  "timestamp": "2025-06-07T12:00:00Z"
}
```

### Error Pages
- **404**: `views/error.ejs` - Page not found
- **500**: `views/error.ejs` - Internal server error

### Circuit Breaker
**Template:** `views/circuit-breaker.ejs`
- Activates during service failures
- Real-time status monitoring
- Automatic recovery detection

### Maintenance Mode
**Template:** `views/maintenance.ejs`
- Scheduled maintenance display
- Progress tracking
- ETA calculations

---

## 🔧 Configuration

### Environment Variables
```bash
# Server Configuration
PORT=3000
NODE_ENV=production
SESSION_SECRET=your_session_secret

# Database
MONGODB_URI=mongodb://localhost:27017/bambisleep

# External Services
LMSTUDIO_API_URL=http://localhost:1234
```

### Route Configuration
**File:** `src/routes/index.js`
- Dynamic route loading
- Automatic module discovery
- Error handling and fallbacks

---

## 🚀 Performance

### Caching Strategy
- Static asset caching (CSS, JS, images)
- Database query result caching
- Template rendering optimization

### Rate Limiting
- API endpoints: 100 requests/minute
- Authentication: 5 attempts/minute
- File uploads: 10 requests/minute

### Monitoring
- Response time tracking
- Error rate monitoring
- Resource usage metrics
- User activity analytics

---

## 📊 Database Integration

### Models Used
- **Profile**: User profiles and preferences
- **SessionHistory**: Chat session tracking
- **UserInteraction**: User activity logging
- **AigfInteraction**: AI interaction tracking
- **AudioInteraction**: Audio trigger tracking

### Connection Management
**File:** `src/config/db.js`
- Connection pooling
- Automatic retry logic
- Health monitoring
- Query optimization

---

## 🔄 Route Architecture

### Dynamic Loading System
The application uses a sophisticated route loading system that:

1. **Scans** the `/routes` directory for JavaScript files
2. **Imports** each module dynamically
3. **Registers** routes with appropriate base paths
4. **Handles** errors gracefully with fallbacks
5. **Logs** registration status for monitoring

### Module Structure
Each route module can export:
- `setup(app)` - Function to configure routes
- `default` - Express router instance
- `basePath` - Custom base path for the router

### Best Practices
- <span class="checkmark-indicator checked">Proper error handling in all routes</span>
- <span class="checkmark-indicator checked">Consistent response formats</span>
- <span class="checkmark-indicator checked">Authentication checks where needed</span>
- <span class="checkmark-indicator checked">Input validation and sanitization</span>
- <span class="checkmark-indicator checked">Logging for debugging and monitoring</span>

---

## 🔧 Maintenance & Upgrades

### Route Maintenance Checklist
- <span class="checkmark-indicator unchecked">Remove deprecated endpoints</span>
- <span class="checkmark-indicator checked">Update authentication mechanisms</span>
- <span class="checkmark-indicator checked">Optimize database queries</span>
- <span class="checkmark-indicator checked">Add input validation</span>
- <span class="checkmark-indicator checked">Update error handling</span>
- <span class="checkmark-indicator partial">Add rate limiting</span>
- <span class="checkmark-indicator checked">Update documentation</span>

### Upgrade Path
1. **Identify** deprecated routes
2. **Plan** replacement APIs
3. **Implement** new routes alongside old
4. **Migrate** clients to new APIs
5. **Remove** deprecated routes
6. **Update** documentation

---

## 📞 Support

For API support and questions:
- **Documentation**: `/docs`
- **Help Center**: `/help` 
- **Health Status**: `/health`
- **System Status**: `/api/bnncs/status`

---

**This documentation is automatically updated as routes are modified. Last generated: June 7, 2025**
