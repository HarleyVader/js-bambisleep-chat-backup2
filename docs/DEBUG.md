# 🐛 Debug Guide

**Completion:** <span class="checkmark-indicator checked">100% Ready</span>

Debugging workflows and troubleshooting logic.

## Prerequisites

- Node.js (v16+ recommended)
- Docker and Docker Compose
- MongoDB (via Docker)

## Running the Application

### Standard Run

```bash
# Start MongoDB container
docker-compose up -d mongodb

# Start the application
npm run start
```

### Development Mode (with auto-restart)

```bash
# Start MongoDB container
docker-compose up -d mongodb

# Start the application with nodemon for auto-restart
npm run dev
```

## Debugging Options

### Option 1: Using VS Code Debugger

1. Open the project in VS Code
2. Set breakpoints in your code
3. Press F5 or select the "Debug with Nodemon" configuration from the debug panel
4. The application will start with debugging enabled

### Option 2: Using Chrome DevTools

1. Run the application with the debug flag:
   ```bash
   npm run debug
   ```
2. Open Chrome and navigate to `chrome://inspect`
3. Click on "Open dedicated DevTools for Node"
4. Set breakpoints and debug

### Option 3: Using PowerShell Script

1. Run the included PowerShell script:
   ```powershell
   .\debug.ps1
   ```
2. This will check if MongoDB is running and start the application in debug mode

## Debugging with Breakpoint on Start

To pause execution at the beginning of the application:

```bash
npm run debug:break
```

## Available Ports

- Web Application: http://localhost:6970
- MongoDB: localhost:27018
- Debugger: ws://127.0.0.1:9229

## Troubleshooting

- If you encounter the error "address already in use," check for running instances:
  ```powershell
  netstat -ano | findstr :6970
  ```

- To kill a process using a specific port:
  ```powershell
  Stop-Process -Id <PID> -Force
  ```

- To check MongoDB connection:
  ```bash
  docker exec -it bambisleep-mongodb mongosh -u bambisleep -p bambiAppPass456 --authenticationDatabase admin
  ```
