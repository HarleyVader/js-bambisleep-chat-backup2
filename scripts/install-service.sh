#!/bin/bash
#
# Installation script for BambiSleep.Chat systemd service
# Simple service installation with auto-restart on git pull
#

echo "🚀 Installing BambiSleep.Chat systemd service..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root: sudo $0"
    exit 1
fi

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "📁 Project directory: $PROJECT_DIR"

# Copy service file
echo "📋 Installing systemd service file..."
cp "$SCRIPT_DIR/bambisleep.service" /etc/systemd/system/bambisleep-chat.service

if [ $? -eq 0 ]; then
    echo "✅ Service file installed"
else
    echo "❌ Failed to install service file"
    exit 1
fi

# Reload systemd
echo "🔄 Reloading systemd..."
systemctl daemon-reload

# Enable the service
echo "🔗 Enabling service..."
systemctl enable bambisleep-chat

# Check if the service can start
echo "🧪 Testing service..."
systemctl start bambisleep-chat

if systemctl is-active --quiet bambisleep-chat; then
    echo "✅ Service is running successfully"
    systemctl status bambisleep-chat --no-pager
else
    echo "❌ Service failed to start"
    echo "🔍 Check logs with: journalctl -u bambisleep-chat --no-pager"
    exit 1
fi

echo ""
echo "🎉 Installation completed successfully!"
echo ""
echo "📝 Available commands:"
echo "  sudo systemctl start bambisleep-chat"
echo "  sudo systemctl stop bambisleep-chat"
echo "  sudo systemctl restart bambisleep-chat"
echo "  sudo systemctl status bambisleep-chat"
echo "  sudo journalctl -u bambisleep-chat -f"
echo ""
echo "🔄 Git post-merge hook is already installed and will automatically restart the service after 'git pull'"
