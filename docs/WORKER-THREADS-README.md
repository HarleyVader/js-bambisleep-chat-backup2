# Worker Threads Repository Management

This documentation covers the worker threads infrastructure added to the MCP Agent Docking Station for isolated GitHub repository management.

## Overview

The repository management system uses Node.js worker threads to provide:

- **Isolation**: Each repository operation runs in its own worker thread
- **Non-interference**: Repository operations don't affect the main server
- **Concurrent Operations**: Multiple repositories can be processed simultaneously
- **Resource Management**: Automatic cleanup and timeout handling

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Docking Station                      │
│                      (Main Thread)                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │ Repository      │    │ Express Routes                  │ │
│  │ Manager         │    │ /repo/clone                     │ │
│  │                 │    │ /repo/:id/install               │ │
│  │ - Event Emitter │    │ /repo/:id/status                │ │
│  │ - Worker Pool   │    │ Socket.IO Events                │ │
│  │ - Queue Mgmt    │    │ repo-operation                  │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                Worker Thread Pool                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Worker 1    │  │ Worker 2    │  │ Worker N            │  │
│  │             │  │             │  │                     │  │
│  │ Git Clone   │  │ NPM Install │  │ Repository Update   │  │
│  │ Operations  │  │ Operations  │  │ Operations          │  │
│  │             │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                 Isolated Workspace                          │
│              (repo-workspace/ directory)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ owner-repo1/    │  │ owner-repo2/    │                   │
│  │ ├── src/        │  │ ├── lib/        │                   │
│  │ ├── package.json│  │ ├── package.json│                   │
│  │ ├── node_modules│  │ ├── node_modules│                   │
│  │ └── .mcp-       │  │ └── .mcp-       │                   │
│  │     isolation.  │  │     isolation.  │                   │
│  │     json        │  │     json        │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Repository Manager (`repo-manager.js`)

- **Main coordinator** running in the primary thread
- **Event-driven** architecture with EventEmitter
- **Worker pool management** with configurable limits
- **Repository registry** tracking all loaded repositories

### 2. Repository Worker (`workers/repo-worker.js`)

- **Isolated execution environment** for git and npm operations
- **Action-based operations**: clone, install, update, unload, status, run, stop
- **Process management** for running cloned repositories
- **Timeout protection** and error handling
- **Manifest generation** for repository tracking

### 3. Integration Layer

- **Express API endpoints** for HTTP-based repository management
- **Socket.IO events** for real-time repository operations
- **Process isolation** for running repositories safely
- **Authentication integration** with Patreon patron verification

## API Endpoints

### Clone Repository

```bash
POST /repo/clone
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "repoUrl": "https://github.com/owner/repo.git",
  "branch": "main",
  "depth": 1,
  "production": false
}
```

### Install Dependencies

```bash
POST /repo/:repoId/install
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "packageManager": "npm",
  "production": true
}
```

### Repository Status

```bash
GET /repo/:repoId/status
Authorization: Bearer <api_key>
```

### Run Repository

```bash
POST /repo/:repoId/run
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "background": true,
  "port": 3000,
  "script": "start",
  "env": {
    "NODE_ENV": "development"
  }
}
```

### Stop Repository

```bash
POST /repo/:repoId/stop
Authorization: Bearer <api_key>
```

### List Repositories

```bash
GET /repo/list
Authorization: Bearer <api_key>
```

### Unload Repository

```bash
DELETE /repo/:repoId
Authorization: Bearer <api_key>
```

## Socket.IO Events

### Repository Operations

```javascript
// Clone a repository
socket.emit('repo-operation', {
  operation: 'clone',
  repoUrl: 'https://github.com/owner/repo.git',
  options: {
    branch: 'main',
    depth: 1
  },
  apiKey: 'your-api-key'
});

// Run a repository
socket.emit('repo-operation', {
  operation: 'run',
  repoId: 'owner-repo',
  options: {
    background: true,
    port: 3000,
    script: 'start',
    env: { NODE_ENV: 'development' }
  },
  apiKey: 'your-api-key'
});

// Stop a repository
socket.emit('repo-operation', {
  operation: 'stop',
  repoId: 'owner-repo',
  apiKey: 'your-api-key'
});
```

### Event Responses

- `repo-success` - Operation completed successfully
- `repo-error` - Operation failed with error details
- `repo-notification` - Broadcast to other connected agents
- `repo-event` - Repository lifecycle events

## Configuration

### Repository Manager Options

```javascript
const repoManager = new RepositoryManager({
  workspaceDir: '/path/to/workspace',  // Repository storage location
  maxWorkers: 3,                       // Maximum concurrent workers
  workerTimeout: 300000                // Worker timeout (5 minutes)
});
```

### Worker Configuration

```javascript
const config = {
  depth: 1,                    // Git clone depth
  branch: 'main',              // Default branch
  packageManager: 'npm',       // npm, yarn, or pnpm
  production: false,           // Install production dependencies only
  isolated: true               // Isolated environment flag
};
```

## Repository Execution Lifecycle

The MCP server supports a complete repository lifecycle from clone to execution:

### 1. Clone & Install

```javascript
// Step 1: Clone repository
socket.emit('repo-operation', {
  operation: 'clone',
  repoUrl: 'https://github.com/owner/app.git',
  apiKey: 'your-api-key'
});

// Step 2: Install dependencies
socket.emit('repo-operation', {
  operation: 'install',
  repoId: 'owner-app',
  options: { production: false },
  apiKey: 'your-api-key'
});
```

### 2. Run & Manage

```javascript
// Step 3: Run the application
socket.emit('repo-operation', {
  operation: 'run',
  repoId: 'owner-app',
  options: {
    background: true,
    port: 3000,
    script: 'start',  // npm script to run
    env: {
      NODE_ENV: 'development',
      API_KEY: 'your-app-api-key'
    }
  },
  apiKey: 'your-api-key'
});

// Monitor status
socket.emit('repo-operation', {
  operation: 'status',
  repoId: 'owner-app',
  apiKey: 'your-api-key'
});

// Stop when needed
socket.emit('repo-operation', {
  operation: 'stop',
  repoId: 'owner-app',
  apiKey: 'your-api-key'
});
```

### 3. Execution Features

- **Background Processing**: Repositories run as background processes
- **Port Management**: Specify custom ports for web applications
- **Environment Variables**: Set custom environment for each repository
- **Script Selection**: Choose which npm script to execute (start, dev, serve, etc.)
- **Process Monitoring**: Track running processes with PID and status
- **Automatic Cleanup**: Process termination on worker shutdown

### 4. Repository States

- `cloned` - Repository downloaded but dependencies not installed
- `ready` - Dependencies installed, ready to run
- `running` - Application is currently executing
- `stopped` - Application was running but has been stopped
- `error` - An error occurred during operation

## Security Features

### Patron Authentication

- **API key verification** required for all operations
- **Patreon patron status** validation
- **Tier-based permissions** (if configured)

### Process Isolation

- **Worker thread isolation** prevents cross-contamination
- **Separate npm cache** per repository
- **Isolated file systems** with workspace separation
- **Automatic cleanup** on worker termination

### Resource Protection

- **Worker timeouts** prevent runaway processes
- **Memory limits** via worker thread boundaries
- **File system sandboxing** in workspace directories

## Usage Examples

### Basic Repository Clone

```javascript
// HTTP API
const response = await fetch('/repo/clone', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-api-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    repoUrl: 'https://github.com/facebook/react.git',
    branch: 'main',
    depth: 1
  })
});

// Socket.IO
socket.emit('repo-operation', {
  operation: 'clone',
  repoUrl: 'https://github.com/facebook/react.git',
  options: { branch: 'main', depth: 1 },
  apiKey: 'your-api-key'
});
```

### Install Dependencies

```javascript
// After cloning, install dependencies
socket.emit('repo-operation', {
  operation: 'install',
  repoId: 'facebook-react',
  options: {
    packageManager: 'npm',
    production: false
  },
  apiKey: 'your-api-key'
});
```

### Monitor Repository Status

```javascript
socket.emit('repo-operation', {
  operation: 'status',
  repoId: 'facebook-react',
  apiKey: 'your-api-key'
});

socket.on('repo-success', (data) => {
  console.log('Repository Status:', data.result);
  // Shows git status, branch info, dependencies, etc.
});
```

## Testing

### Run Test Suite

```bash
npm run test-repo
```

### Manual Testing

```bash
# Start server
npm start

# In another terminal, test endpoints
curl -X POST http://localhost:6969/repo/clone \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "https://github.com/octocat/Hello-World.git"}'
```

## Troubleshooting

### Common Issues

1. **Worker Timeout**
   - Increase `workerTimeout` value
   - Check network connectivity for git operations
   - Verify repository URL accessibility

2. **Permission Errors**
   - Ensure workspace directory is writable
   - Check git credentials for private repositories
   - Verify API key authenticity

3. **Memory Issues**
   - Reduce `maxWorkers` count
   - Monitor repository sizes
   - Clean up unused repositories regularly

### Debug Logging

```javascript
// Enable debug mode
process.env.DEBUG = 'repo-manager:*';
```

### Health Monitoring

```bash
GET /health
```

Returns repository manager statistics and worker status.

## Integration with Agent Dr Girlfriend

The repository management system is designed to work seamlessly with Agent Dr Girlfriend and other MCP agents:

```javascript
// Agent Dr Girlfriend can manage repositories
socket.emit('repo-operation', {
  operation: 'clone',
  repoUrl: 'https://github.com/bambisleep/agent-dr-girlfriend.git',
  options: {
    branch: 'main',
    packageManager: 'npm'
  },
  apiKey: agentApiKey
});

// Install and run in isolated environment
socket.emit('repo-operation', {
  operation: 'install',
  repoId: 'bambisleep-agent-dr-girlfriend',
  options: { production: false },
  apiKey: agentApiKey
});

// Run the cloned repository
socket.emit('repo-operation', {
  operation: 'run',
  repoId: 'bambisleep-agent-dr-girlfriend',
  options: {
    background: true,
    port: 8080,
    script: 'start',
    env: {
      NODE_ENV: 'production',
      MCP_AGENT_MODE: 'docked'
    }
  },
  apiKey: agentApiKey
});
```

## Complete Repository Lifecycle

The MCP server now supports the full lifecycle: **Clone → Install → Run → Stop → Unload**

### Automated Workflow

After cloning and installing dependencies, repositories can be executed automatically:

1. **Clone**: Download repository to isolated workspace
2. **Install**: Install dependencies with fallback package manager support
3. **Run**: Execute the repository as a background process
4. **Monitor**: Track process status and health
5. **Stop**: Gracefully terminate running processes
6. **Unload**: Clean up workspace and free resources

This allows agents to dynamically load, update, and execute their own code repositories without affecting the main docking station operations.
