#!/bin/bash

# BambiSleep.Chat Environment Setup
# Comprehensive environment check and setup script
# This script checks first, does later, ignores steps if correctly setup

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/brandynette/web/bambisleep.chat/js-bambisleep-chat"
NODE_VERSION="v24.1.0"
MAIN_APP_PORT="6969"

# Logging function
log() {
    echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if service exists and is enabled
service_exists() {
    systemctl list-unit-files | grep -q "^$1.service"
}

# Check if service is running
service_running() {
    systemctl is-active --quiet "$1" 2>/dev/null
}

# Check if port is in use
port_in_use() {
    lsof -i ":$1" >/dev/null 2>&1
}

# Check if directory exists and is writable
dir_writable() {
    [ -d "$1" ] && [ -w "$1" ]
}

# ============================================================================
# ENVIRONMENT CHECKS
# ============================================================================

log "🔍 Starting comprehensive environment checks..."

# Check if we're on the right server
if [ "$(whoami)" != "brandynette" ]; then
    error "This script must be run as user 'brandynette'"
    exit 1
fi

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    error "Project directory not found: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"
success "Project directory found: $PROJECT_DIR"

# ============================================================================
# NODE.JS ENVIRONMENT CHECK & SETUP
# ============================================================================

log "🔧 Checking Node.js environment..."

# Check if NVM is installed
if [ ! -d "$HOME/.nvm" ]; then
    warning "NVM not found, installing..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    success "NVM installed"
else
    success "NVM already installed"
fi

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Check Node.js version
if ! command_exists node || [ "$(node --version)" != "$NODE_VERSION" ]; then
    warning "Installing Node.js $NODE_VERSION..."
    nvm install "$NODE_VERSION"
    nvm use "$NODE_VERSION"
    nvm alias default "$NODE_VERSION"
    success "Node.js $NODE_VERSION installed and set as default"
else
    success "Node.js $NODE_VERSION already installed"
fi

# Check npm
if ! command_exists npm; then
    error "npm not found even after Node.js installation"
    exit 1
fi

success "Node.js environment ready: $(node --version), npm $(npm --version)"

# ============================================================================
# PROJECT DEPENDENCIES CHECK & SETUP
# ============================================================================

log "📦 Checking project dependencies..."

# Check if package.json exists
if [ ! -f "package.json" ]; then
    error "package.json not found in project directory"
    exit 1
fi

# Check if node_modules exists and has required packages
DEPS_MISSING=false

# Check for critical dependencies
CRITICAL_DEPS=("express" "socket.io" "mongoose" "ejs" "axios")
for dep in "${CRITICAL_DEPS[@]}"; do
    if [ ! -d "node_modules/$dep" ]; then
        warning "Missing dependency: $dep"
        DEPS_MISSING=true
    fi
done

# Install/update dependencies if needed
if [ "$DEPS_MISSING" = true ] || [ ! -d "node_modules" ]; then
    warning "Installing/updating project dependencies..."
    
    # Clean install for reliability
    rm -rf node_modules package-lock.json
    npm install
    
    # Verify installation
    for dep in "${CRITICAL_DEPS[@]}"; do
        if [ ! -d "node_modules/$dep" ]; then
            error "Failed to install dependency: $dep"
            exit 1
        fi
    done
    
    success "All project dependencies installed"
else
    success "All project dependencies already present"
fi

# Check specific EJS installation (the main issue we're fixing)
if npm list ejs >/dev/null 2>&1; then
    success "EJS dependency verified and working"
else
    warning "EJS not properly installed, forcing reinstall..."
    npm install ejs --save
    success "EJS dependency fixed"
fi

# ============================================================================
# SYSTEM DEPENDENCIES CHECK & SETUP
# ============================================================================

log "🛠️  Checking system dependencies..."

# Check for required system packages
SYSTEM_DEPS=("curl" "git" "lsof" "systemctl")
for dep in "${SYSTEM_DEPS[@]}"; do
    if command_exists "$dep"; then
        success "$dep is available"
    else
        warning "$dep not found, attempting to install..."
        if command_exists apt; then
            sudo apt update && sudo apt install -y "$dep"
        elif command_exists yum; then
            sudo yum install -y "$dep"
        else
            error "Cannot install $dep - unsupported package manager"
            exit 1
        fi
    fi
done

# ============================================================================
# DATABASE CONNECTIVITY CHECK
# ============================================================================

log "🗄️  Checking database connectivity..."

# Check if MongoDB is accessible (Docker or service)
if command_exists docker && docker ps | grep -q mongodb; then
    success "MongoDB Docker container is running"
elif service_running mongod; then
    success "MongoDB service is running"
elif service_running mongodb; then
    success "MongoDB service is running"
else
    warning "MongoDB not detected, checking if Docker Compose can start it..."
    if [ -f "docker-compose.yml" ]; then
        docker-compose up -d mongodb
        sleep 5
        if docker ps | grep -q mongodb; then
            success "MongoDB started via Docker Compose"
        else
            warning "MongoDB not running - may need manual configuration"
        fi
    else
        warning "No MongoDB detected - may need manual setup"
    fi
fi

# ============================================================================
# PORT AVAILABILITY CHECK
# ============================================================================

log "🔌 Checking port availability..."

# Check if main app port is free (when not running our service)
if port_in_use "$MAIN_APP_PORT" && ! pgrep -f "node.*server.js" >/dev/null; then
    warning "Port $MAIN_APP_PORT is in use by another process"
    lsof -i ":$MAIN_APP_PORT"
fi

# ============================================================================
# CONFIGURATION FILES CHECK
# ============================================================================

log "⚙️  Checking configuration files..."

# Check .env file
if [ ! -f ".env" ]; then
    warning ".env file not found, creating from example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        warning "Please edit .env file with your actual configuration"
    else
        error ".env.example not found - manual configuration required"
    fi
else
    success ".env file exists"
fi

# Check maintenance status file
if [ ! -f "maintenance-status.json" ]; then
    info "Creating maintenance-status.json..."
    cat > maintenance-status.json << 'EOF'
{
  "isActive": false,
  "message": "Bambi is making everything prettier...",
  "currentIssue": "System ready",
  "countdown": 0,
  "startTime": null,
  "estimatedCompletion": null
}
EOF
    success "maintenance-status.json created"
else
    success "maintenance-status.json exists"
fi

# ============================================================================
# CIRCUIT BREAKER INFRASTRUCTURE SETUP
# ============================================================================

log "🔄 Setting up Circuit Breaker infrastructure..."

# Create scripts directory if it doesn't exist
if [ ! -d "scripts" ]; then
    mkdir -p scripts
    success "Created scripts directory"
fi

# Create circuit-breaker server script
info "Creating circuit-breaker-server.js..."
cat > scripts/circuit-breaker-server.js << 'EOF'
#!/usr/bin/env node
import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = process.env.CIRCUIT_BREAKER_PORT || 6970;
const STATUS_FILE = join(projectRoot, 'maintenance-status.json');

// Middleware
app.use(express.json());
app.use(express.static(join(projectRoot, 'src', 'public')));
app.set('view engine', 'ejs');
app.set('views', join(projectRoot, 'src', 'views'));

// State management
let maintenanceState = {
  isActive: true,
  message: "Bambi is making everything prettier...",
  currentIssue: "Circuit breaker active",
  countdown: 0,
  startTime: Date.now(),
  estimatedCompletion: null
};

// Load persistent state
async function loadState() {
  try {
    const data = await fs.readFile(STATUS_FILE, 'utf8');
    maintenanceState = { ...maintenanceState, ...JSON.parse(data) };
    console.log('✅ Loaded maintenance state from file');
  } catch (error) {
    console.log('ℹ️  Using default maintenance state');
  }
}

// Save persistent state
async function saveState() {
  try {
    await fs.writeFile(STATUS_FILE, JSON.stringify(maintenanceState, null, 2));
  } catch (error) {
    console.error('❌ Failed to save state:', error.message);
  }
}

// API Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'circuit-breaker',
    uptime: process.uptime(),
    connections: io.engine.clientsCount
  });
});

app.get('/api/maintenance/status', (req, res) => {
  res.json(maintenanceState);
});

app.post('/api/maintenance/status', async (req, res) => {
  maintenanceState = { ...maintenanceState, ...req.body };
  await saveState();
  io.emit('statusUpdate', maintenanceState);
  res.json({ success: true, state: maintenanceState });
});

// Serve maintenance page for all other routes
app.get('*', (req, res) => {
  res.render('circuit-breaker', {
    title: 'BambiSleep.Chat - Circuit Breaker Active',
    status: maintenanceState
  });
});

// Socket.IO events
io.on('connection', (socket) => {
  console.log(`🔌 Client connected (${io.engine.clientsCount} total)`);
  
  // Send current status immediately
  socket.emit('statusUpdate', maintenanceState);
  
  socket.on('requestStatus', () => {
    socket.emit('statusUpdate', maintenanceState);
  });
  
  socket.on('adminCommand', async (data) => {
    console.log(`🔧 Admin command: ${data.command}`);
    // Handle admin commands here
    socket.emit('commandResult', { command: data.command, status: 'executed' });
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected (${io.engine.clientsCount} total)`);
  });
});

// Countdown updates
setInterval(() => {
  if (maintenanceState.countdown > 0) {
    maintenanceState.countdown--;
    io.emit('countdownUpdate', maintenanceState.countdown);
  }
}, 1000);

// Initialize and start server
async function init() {
  await loadState();
  
  server.listen(PORT, () => {
    console.log(`🚀 Circuit Breaker Server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Status API: http://localhost:${PORT}/api/maintenance/status`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 Shutting down Circuit Breaker Server...');
  await saveState();
  server.close(() => {
    console.log('✅ Circuit Breaker Server stopped');
    process.exit(0);
  });
});

init().catch(console.error);
EOF

chmod +x scripts/circuit-breaker-server.js
success "Circuit Breaker server script created"

# Create circuit-breaker control script
info "Creating circuit-breaker.sh..."
cat > scripts/circuit-breaker.sh << 'EOF'
#!/bin/bash

# Circuit Breaker Control Script for BambiSleep.Chat
# This script manages the circuit breaker service

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="/var/run/bambisleep-circuit-breaker.pid"
LOG_FILE="/var/log/bambisleep-circuit-breaker.log"

# Load NVM and Node.js
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd "$PROJECT_DIR"

case "$1" in
  start)
    echo "🚀 Starting Circuit Breaker Service..."
    nohup node scripts/circuit-breaker-server.js >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "✅ Circuit Breaker Service started (PID: $(cat "$PID_FILE"))"
    ;;
  stop)
    echo "📴 Stopping Circuit Breaker Service..."
    if [ -f "$PID_FILE" ]; then
      kill "$(cat "$PID_FILE")" 2>/dev/null
      rm -f "$PID_FILE"
      echo "✅ Circuit Breaker Service stopped"
    else
      echo "⚠️  PID file not found, attempting to kill by process name..."
      pkill -f "circuit-breaker-server.js" || echo "🔍 No process found"
    fi
    ;;
  restart)
    $0 stop
    sleep 2
    $0 start
    ;;
  status)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "✅ Circuit Breaker Service is running (PID: $(cat "$PID_FILE"))"
      curl -s http://localhost:6970/health | jq . 2>/dev/null || echo "Health check failed"
    else
      echo "❌ Circuit Breaker Service is not running"
    fi
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac
EOF

chmod +x scripts/circuit-breaker.sh
success "Circuit Breaker control script created"

# Create systemd service file
info "Creating systemd service file..."
cat > scripts/bambisleep-circuit-breaker.service << 'EOF'
[Unit]
Description=BambiSleep.Chat Circuit Breaker Service
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=brandynette
Group=brandynette
WorkingDirectory=/home/brandynette/web/bambisleep.chat/js-bambisleep-chat
ExecStart=/home/brandynette/web/bambisleep.chat/js-bambisleep-chat/scripts/circuit-breaker.sh start
ExecStop=/home/brandynette/web/bambisleep.chat/js-bambisleep-chat/scripts/circuit-breaker.sh stop
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bambisleep-circuit-breaker

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log /var/run /home/brandynette/web/bambisleep.chat/js-bambisleep-chat

# Environment
Environment=NODE_ENV=production
Environment=CIRCUIT_BREAKER_PORT=6970

[Install]
WantedBy=multi-user.target
EOF

success "Systemd service file created"

# Create circuit-breaker status utility
info "Creating circuit-breaker-status.sh..."
cat > scripts/circuit-breaker-status.sh << 'EOF'
#!/bin/bash

# Circuit Breaker Status Utility
# Tool for updating maintenance status and controlling the circuit breaker

API_URL="http://localhost:6970/api/maintenance/status"

show_help() {
    cat << EOF
Circuit Breaker Status Utility

Usage: $0 [OPTIONS]

Options:
    --status                   Get current status
    --message "text"          Set maintenance message
    --issue "text"            Set current issue description
    --time MINUTES            Set countdown in minutes
    --countdown SECONDS       Set countdown in seconds
    --activate                Activate maintenance mode
    --deactivate              Deactivate maintenance mode
    --help                    Show this help message

Examples:
    $0 --status
    $0 --message "Bambi is upgrading servers" --time 10
    $0 --issue "Installing security updates" --countdown 600
    $0 --activate --message "Emergency maintenance" --time 30

EOF
}

get_status() {
    curl -s "$API_URL" | jq . 2>/dev/null || echo "Failed to get status"
}

update_status() {
    local payload="$1"
    curl -s -X POST -H "Content-Type: application/json" -d "$payload" "$API_URL" | jq . 2>/dev/null
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --status)
            get_status
            exit 0
            ;;
        --message)
            MESSAGE="$2"
            shift 2
            ;;
        --issue)
            ISSUE="$2"
            shift 2
            ;;
        --time)
            COUNTDOWN=$((60 * $2))
            shift 2
            ;;
        --countdown)
            COUNTDOWN="$2"
            shift 2
            ;;
        --activate)
            ACTIVE="true"
            shift
            ;;
        --deactivate)
            ACTIVE="false"
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Build JSON payload
PAYLOAD="{"
[ -n "$ACTIVE" ] && PAYLOAD="$PAYLOAD\"isActive\":$ACTIVE,"
[ -n "$MESSAGE" ] && PAYLOAD="$PAYLOAD\"message\":\"$MESSAGE\","
[ -n "$ISSUE" ] && PAYLOAD="$PAYLOAD\"currentIssue\":\"$ISSUE\","
[ -n "$COUNTDOWN" ] && PAYLOAD="$PAYLOAD\"countdown\":$COUNTDOWN,\"estimatedCompletion\":$(($(date +%s) * 1000 + COUNTDOWN * 1000)),"
PAYLOAD="${PAYLOAD%,}}"

if [ "$PAYLOAD" = "{}" ]; then
    show_help
    exit 1
fi

echo "Updating status with: $PAYLOAD"
update_status "$PAYLOAD"
EOF

chmod +x scripts/circuit-breaker-status.sh
success "Circuit Breaker status utility created"

# ============================================================================
# SYSTEMD SERVICE INSTALLATION
# ============================================================================

log "🔧 Installing systemd service..."

# Install systemd service
if ! service_exists bambisleep-circuit-breaker; then
    info "Installing Circuit Breaker systemd service..."
    sudo cp scripts/bambisleep-circuit-breaker.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable bambisleep-circuit-breaker
    success "Circuit Breaker systemd service installed and enabled"
else
    success "Circuit Breaker systemd service already installed"
fi

# Create symbolic links for easy command access
if [ ! -L "/usr/local/bin/circuit-breaker" ]; then
    info "Creating symbolic links..."
    sudo ln -sf "$PROJECT_DIR/scripts/circuit-breaker.sh" /usr/local/bin/circuit-breaker
    sudo ln -sf "$PROJECT_DIR/scripts/circuit-breaker-status.sh" /usr/local/bin/circuit-breaker-status
    success "Command line utilities linked"
else
    success "Command line utilities already linked"
fi

# ============================================================================
# PERMISSIONS AND SECURITY
# ============================================================================

log "🔒 Setting up permissions and security..."

# Ensure proper ownership
sudo chown -R brandynette:brandynette "$PROJECT_DIR"
success "Project ownership verified"

# Create log directory if needed
sudo mkdir -p /var/log
sudo touch /var/log/bambisleep-circuit-breaker.log
sudo chown brandynette:brandynette /var/log/bambisleep-circuit-breaker.log
success "Log file prepared"

# Set executable permissions
chmod +x scripts/*.sh
success "Script permissions set"

# ============================================================================
# VERIFICATION AND TESTING
# ============================================================================

log "🧪 Running verification tests..."

# Test Node.js setup
if node --version >/dev/null 2>&1 && npm --version >/dev/null 2>&1; then
    success "Node.js environment functional"
else
    error "Node.js environment test failed"
    exit 1
fi

# Test project dependencies
if [ -f "package.json" ] && [ -d "node_modules" ]; then
    success "Project dependencies verified"
else
    error "Project dependency verification failed"
    exit 1
fi

# Test EJS specifically (the main issue we were fixing)
if node -e "require('ejs')" >/dev/null 2>&1; then
    success "EJS dependency test passed"
else
    error "EJS dependency test failed"
    exit 1
fi

# Test circuit breaker files
REQUIRED_FILES=(
    "scripts/circuit-breaker-server.js"
    "scripts/circuit-breaker.sh"
    "scripts/circuit-breaker-status.sh"
    "scripts/bambisleep-circuit-breaker.service"
    "maintenance-status.json"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        success "File verified: $file"
    else
        error "Missing file: $file"
        exit 1
    fi
done

# ============================================================================
# FINAL SETUP AND INSTRUCTIONS
# ============================================================================

log "🎯 Final setup and configuration..."

# Update maintenance status to ready state
cat > maintenance-status.json << 'EOF'
{
  "isActive": false,
  "message": "BambiSleep.Chat environment setup completed successfully",
  "currentIssue": "Ready for deployment",
  "countdown": 0,
  "startTime": null,
  "estimatedCompletion": null
}
EOF

success "Environment setup completed successfully!"

echo
echo "================================================================================"
echo -e "${GREEN}🎉 BambiSleep.Chat Environment Setup Complete!${NC}"
echo "================================================================================"
echo
echo -e "${BLUE}📋 What was accomplished:${NC}"
echo "  ✅ Node.js $NODE_VERSION environment verified/installed"
echo "  ✅ Project dependencies installed and verified"
echo "  ✅ EJS dependency issue resolved"
echo "  ✅ Circuit Breaker infrastructure deployed"
echo "  ✅ Systemd service configured and enabled"
echo "  ✅ Command line utilities installed"
echo "  ✅ Security permissions configured"
echo
echo -e "${BLUE}🚀 Available Commands:${NC}"
echo "  🔄 circuit-breaker {start|stop|restart|status}"
echo "  📊 circuit-breaker-status --status"
echo "  ⚙️  circuit-breaker-status --message \"Custom message\" --time 10"
echo "  🐳 docker-compose up -d mongodb"
echo "  📱 npm start"
echo
echo -e "${BLUE}🔗 Service URLs:${NC}"
echo "  🌐 Main App: http://localhost:$MAIN_APP_PORT"
echo "  🔄 Circuit Breaker: http://localhost:$CIRCUIT_BREAKER_PORT"
echo "  ❤️  Health Check: http://localhost:$CIRCUIT_BREAKER_PORT/health"
echo
echo -e "${BLUE}📝 Usage Examples:${NC}"
echo "  # Start circuit breaker for maintenance"
echo "  sudo systemctl start bambisleep-circuit-breaker"
echo
echo "  # Update maintenance message"
echo "  circuit-breaker-status --message \"Upgrading Bambi's brain\" --time 15"
echo
echo "  # Start main application"
echo "  npm start"
echo
echo -e "${GREEN}🎯 Next Steps:${NC}"
echo "  1. Start MongoDB if needed: docker-compose up -d mongodb"
echo "  2. Test the main application: npm start"
echo "  3. For maintenance, use: sudo systemctl start bambisleep-circuit-breaker"
echo
echo "================================================================================"
