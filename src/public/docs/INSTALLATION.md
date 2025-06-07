# 📗 BambiSleep.Chat Installation Guide

## Table of Contents
- [System Requirements](#system-requirements)
- [Installation Options](#installation-options)
- [Standard Installation](#standard-installation)
- [Docker Installation](#docker-installation)
- [Advanced Setup](#advanced-setup)
- [Configuration](#configuration)
- [Upgrading](#upgrading)
- [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements
- **OS**: Linux (Ubuntu 22.04+), Windows 10+, or macOS 12+
- **CPU**: 4+ cores, 2.5GHz+
- **RAM**: 8GB (16GB recommended)
- **Storage**: 10GB free space (SSD recommended)
- **Network**: Stable internet connection
- **Software**: Node.js 18.0.0+, MongoDB 6.0+

### Recommended Specifications
- **CPU**: 8+ cores, 3.0GHz+
- **RAM**: 16GB or more
- **Storage**: 50GB+ SSD
- **Network**: 100Mbps+ connection
- **GPU**: Optional for TTS acceleration (NVIDIA with CUDA support)

### Software Dependencies
- Node.js 18.0.0+
- MongoDB 6.0+
- Docker (for containerized deployment)
- Git

## Installation Options

BambiSleep.Chat can be installed in several ways depending on your needs:

1. **Standard Installation**: Direct installation on your system
2. **Docker Installation**: Containerized setup for easy deployment
3. **Development Setup**: For contributors and developers
4. **Production Deployment**: For large-scale hosting

## Standard Installation

### 1. Clone the Repository
```bash
git clone https://github.com/bambisleep/bambisleep-chat.git
cd bambisleep-chat
```

### 2. Install Node.js Using NVM
```bash
# Windows
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash
# Linux
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash
# Make nvm available immediately
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install and use Node.js
nvm install node
nvm use node
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Set Up MongoDB
See the detailed [MongoDB Setup Guide](MONGODB-SETUP.md) for complete instructions.

### 5. Configure Environment
Create a `.env` file in the root directory:
```bash
# Server config
SERVER_PORT=6969

# LMStudio connection
LMS_HOST=192.168.0.178
LMS_PORT=7777

# Text-to-speech connection
KOKORO_PORT=8880
KOKORO_HOST=192.168.0.178
KOKORO_DEFAULT_VOICE=af_bella
KOKORO_API_KEY=not-needed

# Database connections
MONGODB_URI=mongodb://<USER>:<PASSWORD>@<IP-ADDRESS>:<PORT>/bambisleep?authSource=admin
MONGODB_PROFILES=mongodb://<USER>:<PASSWORD>@<IP-ADDRESS>:<PORT>/bambisleep-profiles?authSource=admin

# AI models
MODEL_1=llama-3.2-3b-claude-3.7-sonnet-reasoning-distilled@q4_0
MODEL_2=L3-SthenoMaidBlackroot-8B-V1@q2_k
```

### 6. Start the Server
```bash
npm run start
```

### 7. Setup Text-to-Speech (Optional)
```bash
# Using Docker for Kokoro TTS
docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
# Or with GPU support
docker run --gpus all -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-gpu:latest
```

### 8. Verify Installation
- Open a web browser and navigate to `http://localhost:6969`
- You should see the BambiSleep.Chat welcome page
- Create an account to test functionality

## Docker Installation

### 1. Install Docker and Docker Compose
Follow the [official Docker installation guide](https://docs.docker.com/get-docker/) for your platform.

### 2. Clone the Repository
```bash
git clone https://github.com/bambisleep/bambisleep-chat.git
cd bambisleep-chat
```

### 3. Configure Environment
Create a `.env` file with your configuration (similar to the standard installation).

### 4. Start with Docker Compose
```bash
docker-compose up -d
```

This will:
- Start MongoDB container
- Start Kokoro TTS container
- Build and start the BambiSleep.Chat application
- Configure networking between containers

### 5. Verify Installation
- Open a web browser and navigate to `http://localhost:6969`
- Check container status with `docker-compose ps`
- View logs with `docker-compose logs -f`

## Advanced Setup

### High Availability Configuration

For production environments requiring high availability:

1. **Database Replication**
   For detailed instructions on setting up MongoDB replication, refer to the [MongoDB Setup Guide - Advanced Topics](MONGODB-SETUP.md#replication) section.

2. **Load Balancing**
   - Set up load balancer as needed for high traffic
   - Configure sticky sessions for WebSocket support

3. **Process Management**
   - The application uses Docker containers for process management and auto-restart functionality
   - For development, use `npm run dev` with nodemon for automatic restarts
   - For production, the Docker container handles process management automatically

### Multi-Model Configuration

To use multiple AI models in parallel:

1. Update your `.env` file with additional model configurations:
   ```
   MODEL_1=llama-3.2-3b-claude-3.7-sonnet-reasoning-distilled@q4_0
   MODEL_2=L3-SthenoMaidBlackroot-8B-V1@q2_k
   MODEL_3=your-third-model
   LMS_HOST_1=192.168.0.178
   LMS_PORT_1=7777
   LMS_HOST_2=192.168.0.179
   LMS_PORT_2=7778
   ```

2. Enable the multi-model feature in the configuration:
   ```bash
   npm run config:set -- --enable-multi-model
   ```

## Configuration

### Core Configuration Options

Edit your `.env` file or set environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| SERVER_PORT | Port for web server | 6969 |
| NODE_ENV | Environment (development/production) | development |
| LOG_LEVEL | Logging verbosity | info |
| SESSION_SECRET | Secret for session encryption | random |
| MONGODB_URI | Main database connection string | - |
| MONGODB_PROFILES | Profiles database connection string | - |

### Feature Flags

Enable/disable features in `config/features.js`:

```javascript
{
  "enablePublicChat": true,
  "enableTTS": true,
  "enableSpiralVisuals": true,
  "enableCustomTriggers": true,
  "enableProfileSharing": true,
  "enableCommunityDirectory": true
}
```

### Performance Tuning

For high-traffic environments, modify `config/performance.js`:

```javascript
{
  "workerThreads": 4,           // CPU cores to use
  "maxConcurrentUsers": 500,    // Maximum concurrent connections 
  "cacheSize": "2048m",         // Memory allocated for caching
  "sessionTimeout": 1800,       // Session timeout in seconds
  "rateLimit": {
    "window": 60000,            // Rate limit window in ms
    "max": 100                  // Max requests per window
  }
}
```

## Upgrading

### Standard Upgrade

1. Pull the latest changes
   ```bash
   git pull origin main
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Run database migrations
   ```bash
   npm run migrate
   ```

4. Restart the server
   ```bash
   npm restart
   ```

### Docker Upgrade

1. Pull the latest images
   ```bash
   docker-compose pull
   ```

2. Restart containers
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Major Version Upgrade

For major version upgrades, follow the specific migration guide in the release notes.

## Troubleshooting

### Common Issues

#### MongoDB Connection Errors
```
Error: MongoNetworkError: connect ECONNREFUSED
```
- Verify MongoDB is running: `systemctl status mongodb` (Linux) or check Services (Windows)
- Check connection string in `.env` file
- Ensure network access to MongoDB port (default 27017)
- Run connectivity test: `npm run test:mongodb`
- For detailed MongoDB troubleshooting, see [MongoDB Setup Guide](MONGODB-SETUP.md#troubleshooting)

#### Node.js Version Issues
```
Error: The module was compiled against a different Node.js version
```
- Verify Node.js version: `node -v`
- Update Node.js: `nvm install node` 
- Reinstall dependencies: `npm rebuild`

#### Port Conflicts
```
Error: listen EADDRINUSE: address already in use :::6969
```
- Check for processes using the port: `netstat -ano | findstr :6969`
- Kill conflicting process or change port in `.env`

#### TTS Service Unavailable
```
Error: Failed to connect to Kokoro TTS service
```
- Verify Docker container is running: `docker ps`
- Check Kokoro logs: `docker logs kokoro-tts`
- Verify network connectivity to Kokoro port
- Check configuration in `.env` file

### Diagnostic Tools

Use the built-in diagnostic tools:
```bash
# Test MongoDB connection
npm run test:mongodb

# Check MongoDB server status
npm run check:mongodb

# Validate environment variables
npm run check:config

# Check MongoDB installation (Linux only)
npm run check:mongo-install
```

For a comprehensive set of MongoDB diagnostic and administration tools, refer to the [MongoDB Setup Guide](MONGODB-SETUP.md#connection-testing).

### Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/bambisleep/bambisleep-chat/issues)
2. Join our [Discord Support Channel](https://discord.gg/E7U5BxVttv)
3. Submit a detailed bug report including:
   - OS and Node.js version
   - Error messages and logs
   - Steps to reproduce the issue
   - Configuration details (redact sensitive info)

---

For additional assistance, contact support@bambisleep.chat

Last updated: May 21, 2025
