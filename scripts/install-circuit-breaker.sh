#!/bin/bash

# Circuit Breaker Control Script
# Manages the circuit breaker maintenance server

set -e

SERVICE_NAME="bambisleep-circuit-breaker"
SCRIPT_DIR="/home/brandynette/web/bambisleep.chat/js-bambisleep-chat/scripts"

[[ $EUID -ne 0 ]] && { echo "Run with sudo"; exit 1; }

echo "Installing Circuit Breaker Service..."

cp "$SCRIPT_DIR/bambisleep-circuit-breaker.service" /etc/systemd/system/
chmod +x "$SCRIPT_DIR/circuit-breaker.sh"
ln -sf "$SCRIPT_DIR/circuit-breaker.sh" /usr/local/bin/circuit-breaker
systemctl daemon-reload
systemctl enable $SERVICE_NAME

echo "Circuit Breaker Service installed!"
echo ""
echo "Commands:"
echo "  sudo systemctl {start|stop|restart|status} $SERVICE_NAME"
echo "  sudo circuit-breaker {start|stop|restart|status}"
echo ""
echo "API Endpoints:"
echo "  Status: curl http://localhost:6970/api/maintenance/status"
echo "  Update: curl -X POST http://localhost:6970/api/maintenance/status -H 'Content-Type: application/json' -d '{\"message\":\"New message\",\"countdown\":600}'"
echo ""

read -p "Start circuit breaker service now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    systemctl start $SERVICE_NAME
    sleep 2
    systemctl is-active --quiet $SERVICE_NAME && echo "Circuit breaker started!" || echo "Failed to start"
fi
