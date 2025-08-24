# Repository Management System

This directory contains the complete repository management system for the MCP Agent Docking Station with worker threads.

## Structure

### 📁 Core Components

- **`repo-manager.js`** - Main repository manager with worker pool coordination
- **`workers/repo-worker.js`** - Isolated worker thread for git operations

### 🧪 Testing

- **`tests/test-repo-manager.js`** - Complete test suite for repository manager and worker threads
- **`tests/test-api.js`** - API endpoint testing script with demo credentials
- **`tests/test-github-auth.js`** - GitHub authentication testing

## Usage

### Run Repository Manager Tests

```bash
node repository/tests/test-repo-manager.js
```

### Test GitHub Authentication

```bash
node repository/tests/test-github-auth.js
```

### Test API Endpoints

```bash
# Start the server first
node server.js

# Then in another terminal
node repository/tests/test-api.js
```bash
npm run test-repo
```

### Run API Tests

```bash
npm run test-api
```

### Show Worker Threads Demo

```bash
npm run demo
```

### Show Deployment Status

```bash
npm run status
```

## Demo Credentials

The system includes demo Patreon patron credentials for testing:

- **Test Bambi**: Basic tier patron
- **Dr Girlfriend Test**: Premium tier patron

API keys are generated automatically when the server starts. Check the server console output for current keys.

## Testing Requirements

- Server must be running on port 6969
- Git must be available in the system PATH
- Network access for cloning repositories
- Appropriate file system permissions for repository operations

## Expected Test Results

✅ **Repository Manager Tests:**

- Worker threads create and terminate successfully
- Repositories clone in isolation
- Dependencies install without server interference
- Status tracking functions correctly
- Cleanup removes all temporary files

✅ **API Tests:**

- Health endpoint responds correctly
- Authentication works with demo credentials
- Repository operations succeed
- Proper error handling for invalid requests

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**
   - Ensure all dependencies are installed: `npm install`
   - Check file paths in import statements

2. **Git clone failures**
   - Verify network connectivity
   - Some repositories may use 'master' instead of 'main' branch
   - Try with different test repositories

3. **Worker thread timeouts**
   - Increase timeout values in test configuration
   - Check system resources and available memory

4. **Permission errors**
   - Ensure write permissions in project directory
   - Run with appropriate user privileges

### Debug Mode

Enable debug logging by setting environment variable:

```bash
DEBUG=mcp:* npm run test-repo
```

## Integration Testing

These demo files can be used to verify:

- MCP protocol compliance
- Agent docking procedures
- Repository isolation
- Austrian GDPR compliance endpoints
- Patreon authentication flows

Perfect for demonstrating to **Agent Dr Girlfriend** and other MCP agents! 🔮💖
