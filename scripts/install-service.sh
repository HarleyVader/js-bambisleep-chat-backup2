#!/bin/bash
set -e

[[ $EUID -ne 0 ]] && { echo "Run with sudo"; exit 1; }

SERVICE_NAME="bambisleep-chat"
PROJECT_DIR="/home/brandynette/web/bambisleep.chat/js-bambisleep-chat"
SCRIPT_DIR="$PROJECT_DIR/scripts"

echo "Installing BambiSleep.Chat service..."

[ ! -d "$PROJECT_DIR" ] && { echo "Project directory not found: $PROJECT_DIR"; exit 1; }

cp "$SCRIPT_DIR/bambisleep-chat.service" /etc/systemd/system/
chmod +x "$SCRIPT_DIR/update-bambisleep.sh"
ln -sf "$SCRIPT_DIR/update-bambisleep.sh" /usr/local/bin/bambisleep-update
systemctl daemon-reload
systemctl enable $SERVICE_NAME

mkdir -p /var/log/bambisleep
chown brandynette:brandynette /var/log/bambisleep
touch /var/log/bambisleep-update.log
chown brandynette:brandynette /var/log/bambisleep-update.log

echo "Installation complete!"
echo ""
echo "Commands:"
echo "  sudo systemctl {start|stop|restart|status} $SERVICE_NAME"
echo "  sudo journalctl -u $SERVICE_NAME -f"
echo "  sudo bambisleep-update"
echo ""

read -p "Start service now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    systemctl start $SERVICE_NAME
    sleep 2
    systemctl is-active --quiet $SERVICE_NAME && echo "Service started!" || echo "Failed to start"
fi
