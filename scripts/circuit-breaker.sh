#!/bin/bash

# BambiSleep.Chat Circuit Breaker Service
# Always-on maintenance server with socket connectivity

set -e

PROJECT_DIR="/home/brandynette/web/bambisleep.chat/js-bambisleep-chat"
NODE_SCRIPT="$PROJECT_DIR/scripts/circuit-breaker-server.js"
PID_FILE="/var/run/bambisleep-circuit-breaker.pid"
LOG_FILE="/var/log/bambisleep-circuit-breaker.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    echo "[$(date '+%H:%M:%S')] $1"
}

start_server() {
    cd "$PROJECT_DIR"
    log "Starting circuit breaker server..."
    
    # Start the Node.js server in background
    node "$NODE_SCRIPT" >> "$LOG_FILE" 2>&1 &
    local pid=$!
    
    # Save PID
    echo $pid > "$PID_FILE"
    log "Circuit breaker server started with PID: $pid"
    
    # Monitor the process
    while kill -0 $pid 2>/dev/null; do
        sleep 5
    done
    
    log "Circuit breaker server process ended, restarting..."
    start_server
}

stop_server() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        log "Stopping circuit breaker server (PID: $pid)..."
        kill $pid 2>/dev/null || true
        rm -f "$PID_FILE"
    fi
}

# Handle signals
trap 'stop_server; exit 0' SIGTERM SIGINT

# Ensure log file exists
touch "$LOG_FILE"
chown brandynette:brandynette "$LOG_FILE" 2>/dev/null || true

case "${1:-start}" in
    start)
        log "Circuit breaker service starting..."
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        stop_server
        sleep 2
        start_server
        ;;
    status)
        if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
            echo "Circuit breaker server is running (PID: $(cat "$PID_FILE"))"
        else
            echo "Circuit breaker server is not running"
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
