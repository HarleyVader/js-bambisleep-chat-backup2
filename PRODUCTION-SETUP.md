# Production Server Setup Guide

## Quick Installation on Production Server

SSH into the production server and run these commands:

```bash
# Navigate to project directory
cd ~/web/bambisleep.chat/js-bambisleep-chat

# Pull latest changes
git pull origin MK-XI

# Install the systemd service
sudo ./scripts/install-service.sh

# Optional: Set up nginx configuration
sudo cp scripts/nginx-bambisleep.conf /etc/nginx/sites-available/bambisleep.chat
sudo ln -sf /etc/nginx/sites-available/bambisleep.chat /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
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
