# BambiSleep.Chat Production Deployment Scripts

This directory contains scripts for managing BambiSleep.Chat in a production environment with systemd, including graceful updates with maintenance mode.

## 📁 Files Overview

- `bambisleep-chat.service` - Systemd service configuration
- `update-bambisleep.sh` - Main update script with maintenance mode
- `maintenance-server.js` - Simple Node.js server for maintenance pages
- `install-service.sh` - Installation script for the systemd service
- `nginx-bambisleep.conf` - Nginx configuration with maintenance mode support

## 🚀 Quick Setup

### 1. Install the Service

```bash
# Make the installation script executable
chmod +x scripts/install-service.sh

# Run the installation (requires sudo)
sudo ./scripts/install-service.sh
```

### 2. Configure Nginx (Optional but Recommended)

```bash
# Copy nginx configuration
sudo cp scripts/nginx-bambisleep.conf /etc/nginx/sites-available/bambisleep.chat

# Enable the site
sudo ln -s /etc/nginx/sites-available/bambisleep.chat /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

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

### Automatic Update with Maintenance Mode

```bash
# Perform a complete update (recommended)
sudo bambisleep-update

# Check current status
sudo bambisleep-update status
```

### Manual Maintenance Mode Control

```bash
# Start maintenance mode only
sudo bambisleep-update start-maintenance

# Stop maintenance mode only
sudo bambisleep-update stop-maintenance
```

## 🛠️ How the Update Process Works

1. **Start Maintenance Server** - Launches on port 6970
2. **Stop Main Service** - Gracefully stops the main BambiSleep.Chat service
3. **Git Pull** - Updates code from the repository
4. **Install Dependencies** - Runs `npm install --production`
5. **Start Main Service** - Restarts the main service on port 6969
6. **Stop Maintenance Server** - Removes the maintenance page

During this process, nginx automatically routes traffic to the maintenance server when the main service is unavailable.

## 🎨 Maintenance Page Features

The maintenance page includes:
- Themed BambiSleep.Chat styling with spirals and animations
- Automatic refresh every 30 seconds
- Progress bar animation
- Floating particles
- Responsive design
- Hypnotic color scheme

## 📊 Monitoring & Logging

### Service Logs
```bash
# View service logs
sudo journalctl -u bambisleep-chat -f

# View update logs
sudo tail -f /var/log/bambisleep-update.log
```

### Nginx Logs
```bash
# View access logs
sudo tail -f /var/log/nginx/bambisleep.chat.access.log

# View error logs
sudo tail -f /var/log/nginx/bambisleep.chat.error.log
```

## 🔒 Security Features

The systemd service includes security hardening:
- `NoNewPrivileges=true` - Prevents privilege escalation
- `PrivateTmp=true` - Isolated temporary directory
- `ProtectSystem=strict` - Read-only system directories
- `ProtectHome=true` - Protected home directories
- Limited `ReadWritePaths` - Only necessary directories are writable

## 🌐 Environment Variables

Configure these in `/etc/systemd/system/bambisleep-chat.service`:

```ini
Environment=NODE_ENV=production
Environment=SERVER_PORT=6969
Environment=MONGODB_URI=your_mongodb_connection_string
Environment=LMS_HOST=your_lmstudio_host
Environment=LMS_PORT=your_lmstudio_port
```

After changing environment variables:
```bash
sudo systemctl daemon-reload
sudo systemctl restart bambisleep-chat
```

## 🚨 Troubleshooting

### Service Won't Start
```bash
# Check service status
sudo systemctl status bambisleep-chat

# View detailed logs
sudo journalctl -u bambisleep-chat --no-pager

# Check file permissions
ls -la /home/brandynette/web/bambisleep.chat/js-bambisleep-chat/
```

### Update Script Issues
```bash
# Check update log
sudo tail -f /var/log/bambisleep-update.log

# Manually test components
sudo bambisleep-update status
```

### Nginx Issues
```bash
# Test nginx configuration
sudo nginx -t

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Port Conflicts
```bash
# Check what's using the ports
sudo netstat -tlnp | grep :6969
sudo netstat -tlnp | grep :6970
```

## 📝 Manual Override

### Force Maintenance Mode
```bash
# Create maintenance flag file
sudo touch /tmp/bambisleep-maintenance

# Remove maintenance flag file
sudo rm /tmp/bambisleep-maintenance
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

1. **Stop the broken service**
   ```bash
   sudo systemctl stop bambisleep-chat
   ```

2. **Rollback git changes**
   ```bash
   cd /home/brandynette/web/bambisleep.chat/js-bambisleep-chat
   git log --oneline -10  # Find the last good commit
   git reset --hard <commit-hash>
   ```

3. **Reinstall dependencies**
   ```bash
   npm install --production
   ```

4. **Restart service**
   ```bash
   sudo systemctl start bambisleep-chat
   ```

## 📚 Additional Notes

- The maintenance server serves the same static assets as the main application
- Update process includes automatic dependency installation
- Service automatically restarts on failure (with 10-second delay)
- All operations are logged for audit purposes
- The system is designed to minimize downtime during updates

## 🤝 Contributing

When adding new features that affect the production deployment:

1. Test the update process in a staging environment
2. Update this documentation if necessary
3. Consider the impact on the maintenance mode
4. Ensure proper error handling in update scripts
