#!/bin/bash

# BambiSleep.Chat Update Script
# This script handles graceful updates with maintenance mode

set -e  # Exit on any error

# Configuration
SERVICE_NAME="bambisleep-chat"
PROJECT_DIR="/home/brandynette/web/bambisleep.chat/js-bambisleep-chat"
MAINTENANCE_PORT=6970
MAIN_PORT=6969
LOG_FILE="/var/log/bambisleep-update.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${PURPLE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to start maintenance server
start_maintenance() {
    log "Starting maintenance server on port $MAINTENANCE_PORT..."
    cd "$PROJECT_DIR"
    node scripts/maintenance-server.js &
    MAINTENANCE_PID=$!
    echo $MAINTENANCE_PID > /tmp/bambisleep-maintenance.pid
    sleep 2
    success "Maintenance server started with PID $MAINTENANCE_PID"
}

# Function to stop maintenance server
stop_maintenance() {
    if [ -f /tmp/bambisleep-maintenance.pid ]; then
        MAINTENANCE_PID=$(cat /tmp/bambisleep-maintenance.pid)
        log "Stopping maintenance server (PID: $MAINTENANCE_PID)..."
        kill $MAINTENANCE_PID 2>/dev/null || true
        rm -f /tmp/bambisleep-maintenance.pid
        success "Maintenance server stopped"
    fi
}

# Function to check if main server is running
check_main_server() {
    if systemctl is-active --quiet $SERVICE_NAME; then
        return 0
    else
        return 1
    fi
}

# Function to wait for server to be ready
wait_for_server() {
    local port=$1
    local timeout=30
    local count=0
    
    log "Waiting for server on port $port to be ready..."
    while [ $count -lt $timeout ]; do
        if curl -s http://localhost:$port >/dev/null 2>&1; then
            success "Server on port $port is ready"
            return 0
        fi
        sleep 1
        ((count++))
    done
    
    error "Server on port $port failed to start within $timeout seconds"
    return 1
}

# Main update function
update_bambisleep() {
    log "Starting BambiSleep.Chat update process..."
    
    # Start maintenance server first
    start_maintenance
    
    # Wait for maintenance server to be ready
    if ! wait_for_server $MAINTENANCE_PORT; then
        error "Maintenance server failed to start"
        exit 1
    fi
    
    # Redirect traffic to maintenance server (assuming nginx config)
    log "Redirecting traffic to maintenance server..."
    
    # Stop main service
    if check_main_server; then
        log "Stopping main BambiSleep service..."
        sudo systemctl stop $SERVICE_NAME
        success "Main service stopped"
    else
        warning "Main service was not running"
    fi
    
    # Change to project directory
    cd "$PROJECT_DIR"
    
    # Git pull
    log "Pulling latest changes from git..."
    git pull origin MK-XI
    success "Git pull completed"
    
    # Install dependencies
    log "Installing/updating npm dependencies..."
    npm install --production
    success "Dependencies updated"
    
    # Start main service
    log "Starting main BambiSleep service..."
    sudo systemctl start $SERVICE_NAME
    
    # Wait for main server to be ready
    if wait_for_server $MAIN_PORT; then
        success "Main server is ready"
        
        # Stop maintenance server
        stop_maintenance
        
        # Redirect traffic back to main server (assuming nginx config)
        log "Redirecting traffic back to main server..."
        
        success "Update completed successfully!"
        log "BambiSleep.Chat is now running the latest version"
    else
        error "Main server failed to start properly"
        error "Maintenance server will continue running"
        exit 1
    fi
}

# Cleanup function
cleanup() {
    log "Cleaning up on exit..."
    stop_maintenance
}

# Set trap for cleanup
trap cleanup EXIT

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
    error "This script needs to be run with sudo privileges"
    exit 1
fi

# Main execution
case "${1:-update}" in
    "update")
        update_bambisleep
        ;;
    "start-maintenance")
        start_maintenance
        ;;
    "stop-maintenance")
        stop_maintenance
        ;;
    "status")
        if check_main_server; then
            success "Main server is running"
        else
            warning "Main server is not running"
        fi
        
        if [ -f /tmp/bambisleep-maintenance.pid ]; then
            success "Maintenance server is running"
        else
            warning "Maintenance server is not running"
        fi
        ;;
    *)
        echo "Usage: $0 {update|start-maintenance|stop-maintenance|status}"
        exit 1
        ;;
esac
