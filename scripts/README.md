# BambiSleep.Chat Deployment Scripts

## Quick Setup

1. **Install the systemd service:**
   ```bash
   sudo ./scripts/install-service.sh
   ```

2. **Deploy updates:**
   ```bash
   ./scripts/deploy.sh
   ```

## Automatic Restart

A git post-merge hook is automatically installed that will restart the service when you run `git pull` in production.

## Files

- `bambisleep.service` - Systemd service configuration
- `install-service.sh` - One-time service installation script  
- `deploy.sh` - Manual deployment script (git pull + restart)
- Git hook: `.git/hooks/post-merge` - Automatic restart after git pull

## Service Management

```bash
# Basic service commands
sudo systemctl start bambisleep-chat
sudo systemctl stop bambisleep-chat  
sudo systemctl restart bambisleep-chat
sudo systemctl status bambisleep-chat

# View logs
sudo journalctl -u bambisleep-chat -f
```

## How It Works

1. When you run `git pull`, the post-merge hook automatically triggers
2. The hook detects if you're in production (checks for systemd service)
3. If in production, it automatically restarts the bambisleep-chat service
4. The service uses systemd's auto-restart feature for reliability

This provides zero-downtime deployments with automatic server restart on git pull.
