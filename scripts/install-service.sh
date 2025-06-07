#!/bin/bash

# BambiSleep.Chat Service Installation Script
# This script installs the systemd service and sets up the update mechanism

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

log() {
    echo -e "${PURPLE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error "This script needs to be run with sudo privileges"
    exit 1
fi

# Configuration
SERVICE_NAME="bambisleep-chat"
PROJECT_DIR="/home/brandynette/web/bambisleep.chat/js-bambisleep-chat"
SCRIPT_DIR="$PROJECT_DIR/scripts"

log "Installing BambiSleep.Chat systemd service..."

# Check if project directory exists
if [[ ! -d "$PROJECT_DIR" ]]; then
    error "Project directory not found: $PROJECT_DIR"
    exit 1
fi

# Copy service file
log "Installing systemd service file..."
cp "$SCRIPT_DIR/bambisleep-chat.service" /etc/systemd/system/
success "Service file installed"

# Make update script executable
log "Setting up update script..."
chmod +x "$SCRIPT_DIR/update-bambisleep.sh"
success "Update script is now executable"

# Create symlink for easier access
log "Creating symbolic link for update script..."
ln -sf "$SCRIPT_DIR/update-bambisleep.sh" /usr/local/bin/bambisleep-update
success "Update script available as 'bambisleep-update'"

# Reload systemd daemon
log "Reloading systemd daemon..."
systemctl daemon-reload
success "Systemd daemon reloaded"

# Enable service
log "Enabling BambiSleep.Chat service..."
systemctl enable $SERVICE_NAME
success "Service enabled for automatic startup"

# Create log directory if it doesn't exist
log "Setting up logging..."
mkdir -p /var/log/bambisleep
chown brandynette:brandynette /var/log/bambisleep
touch /var/log/bambisleep-update.log
chown brandynette:brandynette /var/log/bambisleep-update.log
success "Logging configured"

log "Installation completed!"
echo ""
success "Service management commands:"
echo "  Start service:    sudo systemctl start $SERVICE_NAME"
echo "  Stop service:     sudo systemctl stop $SERVICE_NAME"
echo "  Restart service:  sudo systemctl restart $SERVICE_NAME"
echo "  Service status:   sudo systemctl status $SERVICE_NAME"
echo "  View logs:        sudo journalctl -u $SERVICE_NAME -f"
echo ""
success "Update commands:"
echo "  Update server:    sudo bambisleep-update"
echo "  Update status:    sudo bambisleep-update status"
echo "  Start maintenance: sudo bambisleep-update start-maintenance"
echo "  Stop maintenance:  sudo bambisleep-update stop-maintenance"
echo ""
warning "Note: Make sure to configure nginx to handle traffic redirection during maintenance!"

# Ask if user wants to start the service now
read -p "Would you like to start the service now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Starting BambiSleep.Chat service..."
    systemctl start $SERVICE_NAME
    sleep 2
    if systemctl is-active --quiet $SERVICE_NAME; then
        success "BambiSleep.Chat service is now running!"
        log "Check status with: sudo systemctl status $SERVICE_NAME"
    else
        error "Failed to start service. Check logs with: sudo journalctl -u $SERVICE_NAME"
    fi
fi
