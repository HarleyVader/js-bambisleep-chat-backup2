# 🏗️ BambiSleep Chat - Technical Details

## 📖 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [System Components](#system-components)
- [Database Design](#database-design)
- [Real-Time Communication](#real-time-communication)
- [AI Integration](#ai-integration)
- [Audio System](#audio-system)
- [Security & Privacy](#security--privacy)
- [Performance & Scalability](#performance--scalability)
- [Deployment](#deployment)
- [Development Workflow](#development-workflow)
- [Monitoring & Logging](#monitoring--logging)

---

## Architecture Overview

BambiSleep Chat is a Node.js-based real-time web application that combines traditional web technologies with AI integration and multimedia features to create an immersive hypnotic chat experience.

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │   Node.js API   │    │    Database     │
│   (Browser)     │◄──►│     Server      │◄──►│   (MongoDB)     │
│                 │    │                 │    │                 │
│ - Socket.IO     │    │ - Express.js    │    │ - Chat Messages │
│ - EJS Templates │    │ - Socket.IO     │    │ - User Profiles │
│ - Audio API     │    │ - Worker Threads│    │ - Interactions  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │  External APIs  │
                       │                 │
                       │ - LMStudio AI   │
                       │ - Kokoro TTS    │
                       │ - RunPod (opt)  │
                       └─────────────────┘
```

### Design Principles

- **Real-Time First**: Socket.IO for instant communication
- **Microservice Ready**: Modular component design
- **Performance Optimized**: Worker threads for CPU-intensive tasks
- **User Experience**: Seamless multimedia integration
- **Extensibility**: Plugin-based trigger system

---

## Technology Stack

### Backend Technologies

- **Runtime**: Node.js 18+ with ES6 modules
- **Framework**: Express.js 4.21+
- **Real-Time**: Socket.IO 4.8+
- **Database**: MongoDB 6.15 with Mongoose 8.13+
- **Process Management**: Worker Threads, Child Process

### Frontend Technologies

- **Templating**: EJS 3.1+
- **Styling**: Bootstrap 5, Custom CSS
- **JavaScript**: Vanilla ES6+, Socket.IO Client
- **Audio**: Web Audio API, HTML5 Audio

### External Integrations

- **AI Models**: LMStudio (Local LLM), Claude 3.7 Sonnet
- **Text-to-Speech**: Kokoro TTS Service
- **Image Generation**: RunPod API (optional)
- **Audio Processing**: FFmpeg (for audio conversion)

### Development Tools

- **Package Manager**: npm
- **Linting**: ESLint 9.17+
- **Process Manager**: nodemon 3.1+ (development)
- **Containerization**: Docker support
- **Version Control**: Git with GitHub

---

## System Components

### Core Server (`src/server.js`)

The main application entry point that orchestrates all system components:

```javascript
// Key responsibilities:
- Express.js application setup
- Socket.IO server initialization
- Route registration and middleware configuration
- Worker thread management
- Database connection management
- Error handling and graceful shutdown
```

### Route Modules (`src/routes/`)

Modular route handlers for different application sections:

- **`index.js`**: Homepage and route loading management
- **`chat.js`**: Main chat interface
- **`profile.js`**: User profile management
- **`apiRoutes.js`**: RESTful API endpoints
- **`health.js`**: System health monitoring
- **`help.js`**: Documentation system
- **`psychodelic-trigger-mania.js`**: Specialized trigger interface

### Worker Threads (`src/workers/`)

CPU-intensive operations run in separate threads:

- **`lmstudio.js`**: AI model communication and session management
- **`spirals.js`**: Visual effect generation and control

### Models (`src/models/`)

MongoDB schema definitions using Mongoose:

- **`Profile.js`**: User profiles with XP and preferences
- **`AigfInteraction.js`**: AI girlfriend interaction logging
- **`AudioInteraction.js`**: Audio trigger interaction tracking
- **`UserInteraction.js`**: General user interaction logging
- **`SessionHistory.js`**: Chat session management
- **`ClickedUrl.js`**: URL interaction tracking
- **`UserTagInteraction.js`**: User mention tracking

### Services (`src/services/`)

Business logic and data processing:

- **`sessionService.js`**: Chat message handling and user mentions

### Utilities (`src/utils/`)

Shared utility functions and helpers:

- **`logger.js`**: Centralized logging system
- **`errorHandler.js`**: Error processing and reporting
- **`audioTriggers.js`**: Audio trigger detection and management
- **`userMentions.js`**: User mention processing
- **`urlValidator.js`**: URL safety validation
- **`aigfLogger.js`**: AI interaction logging
- **`gracefulShutdown.js`**: Clean application shutdown

### Configuration (`src/config/`)

Application configuration and settings:

- **`config.js`**: Environment-based configuration management
- **`db.js`**: Database connection configuration
- **`triggers.json`**: Audio trigger definitions
- **`footer.config.js`**: UI footer configuration

---

## Database Design

### MongoDB Collections

#### Profiles Collection
```javascript
{
  _id: ObjectId,
  username: String (unique, indexed),
  xp: Number (default: 0),
  preferences: Object,
  lastActive: Date (indexed),
  createdAt: Date,
  bio: String (maxlength: 2000),
  socialLinks: {
    twitter: String,
    instagram: String,
    discord: String,
    reddit: String,
    custom: String
  },
  likes: Number (default: 0),
  loves: Number (default: 0),
  profileStyle: String (enum),
  usageStats: {
    sessionsCount: Number,
    totalTimeSpent: Number,
    triggersActivated: Number,
    messagesPosted: Number,
    joinDate: Date
  }
}
```

#### Chat Messages Collection
```javascript
{
  _id: ObjectId,
  username: String (indexed),
  data: String (required),
  timestamp: Date (indexed, default: now),
  messageType: String (enum),
  urls: [{
    url: String,
    isClean: Boolean,
    checkedAt: Date
  }],
  mentions: [{
    username: String,
    index: Number
  }],
  audioTriggered: String,
  isAigfResponse: Boolean,
  replyTo: ObjectId
}
```

#### AIGF Interactions Collection
```javascript
{
  _id: ObjectId,
  username: String (indexed),
  interactionType: String,
  inputData: String,
  outputData: String,
  duration: Number,
  socketId: String,
  timestamp: Date (indexed),
  errorData: Object
}
```

### Database Indexes

```javascript
// Performance optimization indexes
db.profiles.createIndex({ "username": 1 }, { unique: true });
db.profiles.createIndex({ "lastActive": -1 });
db.chatmessages.createIndex({ "timestamp": -1 });
db.chatmessages.createIndex({ "username": 1 });
db.aigfinteractions.createIndex({ "timestamp": -1 });
db.aigfinteractions.createIndex({ "username": 1 });
```

### Database Configuration

- **Connection Pooling**: Configured for optimal performance
- **Read Preference**: Primary preferred for consistency
- **Write Concern**: Acknowledged writes for reliability
- **Connection Timeout**: 30 seconds
- **Retry Logic**: Automatic retry for transient failures

---

## Real-Time Communication

### Socket.IO Architecture

```javascript
// Server-side socket management
io.on('connection', (socket) => {
  // User authentication via cookies
  // Socket store management
  // Event handler registration
  // Resource cleanup on disconnect
});
```

### Event Categories

#### User Events
- **Authentication**: `join-chat`, `join-profile`
- **Communication**: `chat message`, `message`
- **Interaction**: `triggers`, `collar`, `play audio`

#### System Events
- **Status**: `statusUpdate`, `modeChanged`
- **Configuration**: `worker:settings:update`
- **Administration**: `adminCommand`

#### AI Events
- **Processing**: `message` → `response`
- **Errors**: `error`
- **Settings**: `worker:settings:response`

### Socket Management

```javascript
// Centralized socket store
const socketStore = new Map();

// Socket lifecycle management
socketStoreManager = {
  addSocket(socketStore, socketId, socketData),
  updateSocket(socketStore, socketId, updates),
  removeSocket(socketStore, socketId)
};
```

### Performance Optimizations

- **Connection Pooling**: Reuse existing connections
- **Event Throttling**: Rate limiting for message events
- **Memory Management**: Automatic cleanup of disconnected sockets
- **Broadcasting**: Efficient message distribution

---

## AI Integration

### LMStudio Integration

```javascript
// Worker thread for AI processing
const lmstudio = new Worker('./workers/lmstudio.js');

// Message processing pipeline
User Input → Content Filter → AI Processing → Response Generation → TTS
```

### AI Features

#### Session Management
- **Context Persistence**: Conversation history per socket
- **Memory Management**: Automatic cleanup of old sessions
- **State Tracking**: User preferences and interaction patterns

#### Content Processing
- **Trigger Detection**: Automatic identification of trigger phrases
- **Content Filtering**: Message sanitization and safety checks
- **Response Enhancement**: Integration of hypnotic elements

#### Performance Features
- **Asynchronous Processing**: Non-blocking AI operations
- **Error Recovery**: Graceful handling of AI service failures
- **Timeout Management**: Request timeouts to prevent hangs

### AI Configuration

```javascript
// AI model settings
{
  model: "llama3-8b-instruct",
  max_tokens: 2048,
  temperature: 0.7,
  top_p: 0.9,
  frequency_penalty: 0.1,
  presence_penalty: 0.1
}
```

---

## Audio System

### Text-to-Speech Architecture

```javascript
// TTS API integration
const kokoroAPI = `http://${KOKORO_HOST}:${KOKORO_PORT}/v1`;

// Voice synthesis pipeline
Text Input → Voice Selection → TTS Processing → Audio Stream → Client
```

### Audio Features

#### Voice Options
- **Multiple Voices**: Various voice profiles available
- **Quality Settings**: Configurable audio quality
- **Speed Control**: Adjustable playback speed
- **Volume Control**: Independent audio levels

#### Audio Triggers
- **Detection Engine**: Pattern matching for trigger phrases
- **Audio Library**: Pre-recorded hypnotic audio files
- **Playback Queue**: Sequential audio playback system
- **Synchronization**: Audio-visual effect coordination

### Audio File Management

```
src/public/audio/
├── triggers/           # Trigger-specific audio
├── voices/            # TTS voice samples
├── effects/           # Sound effects
└── background/        # Ambient audio
```

---

## Security & Privacy

### Authentication & Authorization

#### Session Security
- **Secure Cookies**: HttpOnly, SameSite attributes
- **Session Timeout**: Automatic session expiration
- **CSRF Protection**: Cross-site request forgery prevention

#### Access Control
- **Role-Based Access**: Different user privilege levels
- **Feature Gating**: XP-based feature unlocking
- **Admin Controls**: Administrative command authorization

### Data Protection

#### Content Security
- **Input Sanitization**: XSS prevention
- **Content Filtering**: Inappropriate content detection
- **URL Validation**: Malicious link detection

#### Privacy Controls
- **Profile Visibility**: Public/private profile options
- **Data Anonymization**: Personal information protection
- **User Consent**: Explicit permission for data collection

### Security Headers

```javascript
// Helmet.js security configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "wss:"]
    }
  }
}));
```

---

## Performance & Scalability

### Performance Optimizations

#### Server-Side
- **Worker Threads**: CPU-intensive tasks isolation
- **Connection Pooling**: Database connection reuse
- **Memory Management**: Garbage collection optimization
- **Caching**: In-memory caching for frequently accessed data

#### Client-Side
- **Asset Optimization**: Minified CSS/JS files
- **Lazy Loading**: On-demand resource loading
- **Service Workers**: Offline capability (planned)
- **Compression**: Gzip compression for responses

### Scalability Considerations

#### Horizontal Scaling
- **Load Balancing**: Multiple server instance support
- **Session Stickiness**: Socket.IO clustering considerations
- **Database Sharding**: Planned for high-volume deployments

#### Vertical Scaling
- **Resource Monitoring**: CPU, memory, and I/O tracking
- **Auto-scaling**: Planned cloud deployment features
- **Performance Metrics**: Real-time system monitoring

### Monitoring

```javascript
// Health monitoring endpoints
GET /health/api     // System health data
GET /health         // Health dashboard

// Performance metrics
- Response times
- Memory usage
- Database performance
- Socket.IO connection metrics
```

---

## Deployment

### Production Environment

#### Server Requirements
- **CPU**: Minimum 4 cores, 8+ recommended
- **RAM**: Minimum 8GB, 16GB+ recommended
- **Storage**: SSD with at least 50GB available
- **Network**: Stable internet with low latency

#### Software Dependencies
- **Node.js**: Version 18 or higher
- **MongoDB**: Version 6.0 or higher
- **FFmpeg**: For audio processing
- **PM2**: Process management (recommended)

### Docker Deployment

```dockerfile
# Multi-stage Docker build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 6969
CMD ["npm", "start"]
```

### Environment Configuration

```bash
# Production environment variables
NODE_ENV=production
SERVER_PORT=6969
MONGODB_URI=mongodb://user:pass@host:port/database
KOKORO_HOST=tts-server
KOKORO_PORT=8880
LMS_HOST=ai-server
LMS_PORT=7777
```

### Process Management

```javascript
// PM2 ecosystem configuration
{
  "apps": [{
    "name": "bambisleep-chat",
    "script": "src/server.js",
    "instances": "max",
    "exec_mode": "cluster",
    "env": {
      "NODE_ENV": "production"
    }
  }]
}
```

---

## Development Workflow

### Local Development Setup

```bash
# Clone repository
git clone https://github.com/HarleyVader/js-bambisleep-chat.git
cd js-bambisleep-chat

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Development Scripts

```json
{
  "start": "node src/server.js",
  "dev": "nodemon src/server.js",
  "debug": "node --inspect src/server.js",
  "test": "npm run test:unit && npm run test:integration",
  "lint": "eslint src/"
}
```

### Code Organization

#### File Structure Standards
- **Routes**: One file per major feature area
- **Models**: One file per database collection
- **Utils**: Shared functionality across modules
- **Config**: Environment and application configuration

#### Naming Conventions
- **Files**: kebab-case for files, PascalCase for models
- **Functions**: camelCase for functions and variables
- **Constants**: UPPER_SNAKE_CASE for constants
- **Classes**: PascalCase for class names

### Testing Strategy

#### Unit Tests
- **Model Testing**: Database schema validation
- **Utility Testing**: Helper function verification
- **Service Testing**: Business logic validation

#### Integration Tests
- **API Testing**: Endpoint functionality verification
- **Socket Testing**: Real-time communication testing
- **Database Testing**: Data persistence validation

---

## Monitoring & Logging

### Logging System

```javascript
// Centralized logging with levels
const logger = new Logger('ComponentName');

// Log levels
logger.error('Error message');    // Critical errors
logger.warning('Warning message'); // Potential issues
logger.info('Info message');      // General information
logger.debug('Debug message');    // Development information
```

### System Monitoring

#### Health Checks
- **Database Connectivity**: MongoDB connection status
- **External Services**: AI and TTS service availability
- **System Resources**: CPU, memory, disk usage
- **Performance Metrics**: Response times and throughput

#### Alerting
- **Error Rates**: Automatic alerts for high error rates
- **Resource Usage**: Notifications for resource exhaustion
- **Service Downtime**: Immediate alerts for service failures

### Analytics

#### User Metrics
- **Active Users**: Real-time and historical user counts
- **Feature Usage**: Most popular features and interactions
- **Session Duration**: Average session length and patterns
- **Conversion Rates**: XP progression and feature adoption

#### System Metrics
- **Response Times**: API and page load performance
- **Error Rates**: Application and infrastructure errors
- **Resource Utilization**: Server resource usage patterns
- **Scalability Metrics**: Performance under load

---

## Future Enhancements

### Planned Features

#### Technical Improvements
- **Microservice Architecture**: Service decomposition
- **Kubernetes Deployment**: Container orchestration
- **Redis Caching**: Distributed caching layer
- **CDN Integration**: Static asset delivery optimization

#### Feature Additions
- **Mobile App**: Native mobile applications
- **Voice Recognition**: Speech-to-text integration
- **VR/AR Support**: Immersive interface options
- **Machine Learning**: Personalized experience optimization

### Roadmap

#### Phase 1 (Current)
- Core functionality completion
- Performance optimization
- Security hardening

#### Phase 2 (Q2 2025)
- Mobile application development
- Advanced AI features
- Community features expansion

#### Phase 3 (Q3 2025)
- Enterprise features
- API marketplace
- Advanced analytics

---

*This technical documentation provides comprehensive details about the BambiSleep Chat system architecture, implementation, and operational aspects. For user-facing information, see the User Guide. For API details, see the API Documentation.*
