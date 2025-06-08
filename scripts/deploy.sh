#!/bin/bash
#
# Simple deployment script for BambiSleep.Chat
# Combines git pull with automatic service restart
#

echo "🚀 BambiSleep.Chat Deployment Script"
echo "===================================="

# Check if we're in the correct directory
if [ ! -f "src/server.js" ]; then
    echo "❌ Error: Not in BambiSleep.Chat directory"
    echo "💡 Run this script from the project root directory"
    exit 1
fi

# Check if service exists
if [ ! -f "/etc/systemd/system/bambisleep-chat.service" ]; then
    echo "⚠️  Service not installed. Run: sudo ./scripts/install-service.sh"
    exit 1
fi

echo "📁 Current directory: $(pwd)"
echo "🌿 Current branch: $(git branch --show-current)"

# Pull latest changes
echo ""
echo "📥 Pulling latest changes..."
git pull origin $(git branch --show-current)

if [ $? -ne 0 ]; then
    echo "❌ Git pull failed"
    exit 1
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install --production

if [ $? -ne 0 ]; then
    echo "❌ NPM install failed"
    exit 1
fi

# Restart the service
echo ""
echo "🔄 Restarting service..."
sudo systemctl restart bambisleep-chat

if [ $? -eq 0 ]; then
    echo "✅ Service restarted successfully"
    
    # Wait a moment and check status
    sleep 2
    if systemctl is-active --quiet bambisleep-chat; then
        echo "🎉 Deployment completed successfully!"
        echo "🌐 Service is running on http://$(hostname):6969"
    else
        echo "❌ Service failed to start after restart"
        echo "🔍 Check logs with: sudo journalctl -u bambisleep-chat --no-pager"
        exit 1
    fi
else
    echo "❌ Service restart failed"
    exit 1
fi

echo ""
echo "📊 Service Status:"
systemctl status bambisleep-chat --no-pager -l
