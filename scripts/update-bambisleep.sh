#!/bin/bash
set -e

SERVICE_NAME="bambisleep-chat"
PROJECT_DIR="/home/brandynette/web/bambisleep.chat/js-bambisleep-chat"
MAINTENANCE_PORT=6976
MAIN_PORT=6969

log() { echo "[$(date '+%H:%M:%S')] $1"; }

start_maintenance() {
    log "Starting maintenance server..."
    cd "$PROJECT_DIR"
    node scripts/maintenance-server.js &
    echo $! > /tmp/bambisleep-maintenance.pid
    sleep 2
}

stop_maintenance() {
    [ -f /tmp/bambisleep-maintenance.pid ] && kill $(cat /tmp/bambisleep-maintenance.pid) 2>/dev/null && rm -f /tmp/bambisleep-maintenance.pid
}

wait_for_server() {
    for i in {1..30}; do
        curl -s http://localhost:$1 >/dev/null 2>&1 && return 0
        sleep 1
    done
    return 1
}

update_bambisleep() {
    log "Starting update..."
    start_maintenance
    wait_for_server $MAINTENANCE_PORT || { log "Maintenance server failed"; exit 1; }
    
    systemctl is-active --quiet $SERVICE_NAME && { log "Stopping service..."; sudo systemctl stop $SERVICE_NAME; }
    
    cd "$PROJECT_DIR"
    log "Git pull..."
    git pull origin MK-XI
    log "Installing dependencies..."
    npm install --production
    
    log "Starting service..."
    sudo systemctl start $SERVICE_NAME
    
    if wait_for_server $MAIN_PORT; then
        stop_maintenance
        log "Update completed!"
    else
        log "Service failed to start"
        exit 1
    fi
}

cleanup() { stop_maintenance; }
trap cleanup EXIT

[[ $EUID -ne 0 ]] && { echo "Run with sudo"; exit 1; }

case "${1:-update}" in
    "update") update_bambisleep ;;
    "start-maintenance") start_maintenance ;;
    "stop-maintenance") stop_maintenance ;;
    "status") 
        systemctl is-active --quiet $SERVICE_NAME && echo "Main: running" || echo "Main: stopped"
        [ -f /tmp/bambisleep-maintenance.pid ] && echo "Maintenance: running" || echo "Maintenance: stopped"
        ;;
    *) echo "Usage: $0 {update|start-maintenance|stop-maintenance|status}"; exit 1 ;;
esac
