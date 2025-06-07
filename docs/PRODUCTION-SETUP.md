# 🚀 Production Setup

**Completion:** <span class="checkmark-indicator checked">100% Deployment Ready</span>

Server provisioning, security hardening, and deployment automation.

## Quick Installation on Production Server

SSH into the production server and run these commands:

```bash
# Navigate to project directory
cd ~/web/bambisleep.chat/js-bambisleep-chat

# Pull latest changes
git pull origin MK-XI

# Install the systemd service
sudo ./scripts/install-service.sh
```

## Quick Update Command

Once installed, updates are simple:

```bash
# Update the entire application with maintenance mode
sudo bambisleep-update
```

## Verification

Check that everything is working:

```bash
# Check service status
sudo systemctl status bambisleep-chat

# Check if update command is available
which bambisleep-update

# Test update script
sudo bambisleep-update status
```

That's it! The system will now handle graceful updates with automatic maintenance mode.

## 📁 Scripts Overview

- `bambisleep-chat.service` - Systemd service configuration
- `update-bambisleep.sh` - Main update script with maintenance mode
- `maintenance-server.js` - Simple Node.js server for maintenance pages
- `install-service.sh` - Installation script for the systemd service

## 🔧 Service Management

### Basic Commands

```bash
# Start the service
sudo systemctl start bambisleep-chat

# Stop the service
sudo systemctl stop bambisleep-chat

# Restart the service
sudo systemctl restart bambisleep-chat

# Check status
sudo systemctl status bambisleep-chat

# View logs
sudo journalctl -u bambisleep-chat -f

# Enable auto-start on boot
sudo systemctl enable bambisleep-chat
```

## 🔄 Update Process

The update process automatically:

1. **Start Maintenance Server** - Launches on port 6970 with themed page
2. **Stop Main Service** - Gracefully stops the main BambiSleep.Chat service
3. **Git Pull** - Updates code from the repository
4. **Install Dependencies** - Runs `npm install --production`
5. **Start Main Service** - Restarts the main service on port 6969
6. **Stop Maintenance Server** - Removes the maintenance page

## 🎨 Maintenance Page Features

- Themed BambiSleep.Chat styling with spirals and animations
- Automatic refresh every 30 seconds
- Progress bar animation
- Floating particles
- Responsive design
- Hypnotic color scheme

## 🚨 Troubleshooting

### Service Won't Start
```bash
# Check service status
sudo systemctl status bambisleep-chat

# View detailed logs
sudo journalctl -u bambisleep-chat --no-pager
```

### Update Script Issues
```bash
# Check update log
sudo tail -f /var/log/bambisleep-update.log

# Test components
sudo bambisleep-update status
```

### Emergency Stop
```bash
# Stop everything immediately
sudo systemctl stop bambisleep-chat
sudo pkill -f maintenance-server.js
sudo rm -f /tmp/bambisleep-maintenance.pid
```

## 🔄 Rollback Procedure

If an update fails:

1. **Stop the service**: `sudo systemctl stop bambisleep-chat`
2. **Rollback git**: `git reset --hard <previous-commit>`
3. **Reinstall deps**: `npm install --production`
4. **Restart**: `sudo systemctl start bambisleep-chat`
