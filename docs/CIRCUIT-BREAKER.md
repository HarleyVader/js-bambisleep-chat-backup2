# Circuit Breaker Service Documentation

## Overview

The BambiSleep.Chat Circuit Breaker Service is an always-on maintenance system that provides a hypnotic, themed maintenance page with real-time updates via WebSocket connectivity. It's designed to handle server maintenance gracefully while keeping users informed with a beautiful, calming interface.

## 🔧 Components

### Core Files

1. **`circuit-breaker.sh`** - Main bash script for systemd service management
2. **`circuit-breaker-server.js`** - Express.js server with Socket.IO real-time connectivity
3. **`circuit-breaker.ejs`** - Hypnotic maintenance page with live updates
4. **`bambisleep-circuit-breaker.service`** - Systemd service configuration
5. **`install-circuit-breaker.sh`** - One-command installation script
6. **`circuit-breaker-status.sh`** - Status update utility

## ✨ Features

- **Always-On Service**: Automatically restarts on failure or reboot
- **Real-Time Updates**: WebSocket connectivity for live status updates
- **Hypnotic UI**: BambiSleep-themed maintenance page with animations
- **API Control**: REST endpoints for status management
- **Persistent State**: Maintains status across server restarts
- **Health Monitoring**: Built-in health checks and connection tracking
- **Security Hardened**: Systemd service with restricted permissions

## 🚀 Installation

### Prerequisites

- Node.js 18+ with ES modules support
- systemd-enabled Linux system
- `socket.io` package (already included in project dependencies)

### Quick Install

```bash
# Run the installation script
sudo ./scripts/install-circuit-breaker.sh

# Start the service
sudo systemctl start bambisleep-circuit-breaker
```

### Manual Installation

```bash
# Copy service file
sudo cp scripts/bambisleep-circuit-breaker.service /etc/systemd/system/

# Make scripts executable
chmod +x scripts/circuit-breaker.sh
chmod +x scripts/circuit-breaker-status.sh

# Create symlinks
sudo ln -sf /path/to/scripts/circuit-breaker.sh /usr/local/bin/circuit-breaker
sudo ln -sf /path/to/scripts/circuit-breaker-status.sh /usr/local/bin/circuit-breaker-status

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable bambisleep-circuit-breaker
```

## 🎮 Usage

### Service Management

```bash
# Start/stop/restart the service
sudo systemctl {start|stop|restart|status} bambisleep-circuit-breaker

# View logs
sudo journalctl -u bambisleep-circuit-breaker -f

# Direct script control
sudo circuit-breaker {start|stop|restart|status}
```

### Status Updates

```bash
# Update maintenance message and set 10-minute countdown
circuit-breaker-status --message "Bambi is upgrading servers" --time 10

# Set specific issue and countdown in seconds
circuit-breaker-status --issue "Installing security updates" --countdown 600

# Get current status
circuit-breaker-status --status

# Help
circuit-breaker-status --help
```

## 🌐 API Endpoints

### Base URL
- **Development**: `http://localhost:6970`
- **Production**: Configured via `CIRCUIT_BREAKER_PORT` environment variable

### Endpoints

#### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "circuit-breaker",
  "uptime": 1234.56,
  "connections": 3
}
```

#### Get Maintenance Status
```http
GET /api/maintenance/status
```

**Response:**
```json
{
  "isActive": true,
  "message": "Bambi is making everything prettier...",
  "currentIssue": "Updating hypnotic experience",
  "countdown": 300,
  "startTime": 1749264972406,
  "estimatedCompletion": 1749265272406,
  "lastBroadcast": 276
}
```

#### Update Maintenance Status
```http
POST /api/maintenance/status
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "Custom maintenance message",
  "currentIssue": "Specific task being performed",
  "countdown": 600,
  "estimatedCompletion": 1749265872406
}
```

**Response:**
```json
{
  "success": true,
  "state": {
    "isActive": true,
    "message": "Custom maintenance message",
    "currentIssue": "Specific task being performed",
    "countdown": 600,
    "startTime": 1749264972406,
    "estimatedCompletion": 1749265872406
  }
}
```

### Maintenance Page
```http
GET /*
```
Serves the hypnotic maintenance page for all other routes.

## 🎨 Frontend Features

### Real-Time Updates
- **Live countdown timer** with minutes:seconds display
- **WebSocket connection status** indicator
- **Automatic reconnection** on network issues
- **Status synchronization** across multiple browser tabs

### Visual Elements
- **Hypnotic gradient background** with smooth animations
- **Spiraling background effects** for enhanced focus
- **Pulsing container** with soft shadows
- **Progress indicators** that change based on remaining time
- **Responsive design** for mobile and desktop

### Status Indicators
- **Service Status**: Shows maintenance mode
- **Start Time**: When maintenance began
- **Progress**: Visual progress indicator (Active/Almost/Final/Complete)
- **Connection Status**: Real-time WebSocket connection indicator

## 🔄 WebSocket Events

### Client → Server
- `requestStatus`: Request current maintenance status
- `connection`: Automatic on connect

### Server → Client
- `statusUpdate`: Full status object when updated
- `countdownUpdate`: Live countdown updates every second
- `connect`/`disconnect`: Connection status events

## 📊 Monitoring

### Log Files
- **Service logs**: `sudo journalctl -u bambisleep-circuit-breaker -f`
- **Application logs**: Integrated with systemd journal
- **Status persistence**: `maintenance-status.json` in project root

### Health Monitoring
```bash
# Check service health
curl http://localhost:6970/health

# Monitor WebSocket connections
curl http://localhost:6970/health | jq '.connections'

# Service status
sudo systemctl status bambisleep-circuit-breaker
```

## 🔧 Configuration

### Environment Variables
- `CIRCUIT_BREAKER_PORT`: Server port (default: 6970)
- `NODE_ENV`: Environment mode (production/development)

### Systemd Service Configuration
Located in `/etc/systemd/system/bambisleep-circuit-breaker.service`:

```ini
[Unit]
Description=BambiSleep.Chat Circuit Breaker Service
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=brandynette
Group=brandynette
WorkingDirectory=/home/brandynette/web/bambisleep.chat/js-bambisleep-chat
ExecStart=/home/brandynette/web/bambisleep.chat/js-bambisleep-chat/scripts/circuit-breaker.sh start
ExecStop=/home/brandynette/web/bambisleep.chat/js-bambisleep-chat/scripts/circuit-breaker.sh stop
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bambisleep-circuit-breaker

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log /var/run /home/brandynette/web/bambisleep.chat/js-bambisleep-chat

# Environment
Environment=NODE_ENV=production
Environment=CIRCUIT_BREAKER_PORT=6970
```

## 🛠️ Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check service status
sudo systemctl status bambisleep-circuit-breaker

# Check logs for errors
sudo journalctl -u bambisleep-circuit-breaker --no-pager

# Verify file permissions
ls -la /usr/local/bin/circuit-breaker
```

#### Port Already in Use
```bash
# Find process using port 6970
sudo lsof -i :6970

# Kill process if needed
sudo kill $(sudo lsof -t -i:6970)

# Or change port in environment
sudo systemctl edit bambisleep-circuit-breaker
# Add: Environment=CIRCUIT_BREAKER_PORT=6971
```

#### WebSocket Connection Issues
```bash
# Check if server is running
curl http://localhost:6970/health

# Verify firewall settings
sudo ufw status

# Check network connectivity
netstat -tlnp | grep 6970
```

#### Status Not Persisting
```bash
# Check file permissions in project directory
ls -la maintenance-status.json

# Verify write permissions
sudo chown brandynette:brandynette maintenance-status.json
```

### Debug Mode

For development and debugging:

```bash
# Run server directly (not as service)
cd /path/to/js-bambisleep-chat
node scripts/circuit-breaker-server.js

# Enable debug logging
DEBUG=* node scripts/circuit-breaker-server.js
```

## 🔄 Integration with Main Service

The circuit breaker can be integrated with the main BambiSleep.Chat update process:

```bash
# In your update script, start circuit breaker before stopping main service
sudo systemctl start bambisleep-circuit-breaker

# Perform updates...
sudo systemctl stop bambisleep-chat
git pull
npm install
sudo systemctl start bambisleep-chat

# Stop circuit breaker when main service is ready
sudo systemctl stop bambisleep-circuit-breaker
```

## 🎯 Use Cases

1. **Scheduled Maintenance**: Planned server updates and improvements
2. **Emergency Maintenance**: Unexpected issues requiring immediate attention
3. **Security Updates**: Critical patches requiring service restart
4. **Feature Deployments**: Major releases with extended downtime
5. **Infrastructure Changes**: Server migrations or hardware upgrades

## 📝 Development Notes

- **ES Modules**: Uses modern JavaScript import/export syntax
- **Socket.IO v4**: Latest WebSocket implementation for real-time features
- **EJS Templates**: Server-side rendering for maintenance page
- **Express.js**: Lightweight web framework
- **Systemd Integration**: Native Linux service management
- **Security Hardened**: Restricted file system access and privileges

## 🚀 Future Enhancements

- **Multi-language support** for international users
- **Estimated completion predictions** based on historical data
- **Integration with monitoring systems** (Prometheus, Grafana)
- **Email/SMS notifications** for extended maintenance
- **Automated status updates** based on deployment progress
- **Dark/light theme** switching options
