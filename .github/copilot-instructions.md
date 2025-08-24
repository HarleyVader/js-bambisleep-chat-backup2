# 🚀 COPILOT DEVELOPMENT INSTRUCTIONS - 3-STEP PROCESS

## 🚫 FORBIDDEN PRACTICES
- **NO quick/simple/synthetic tests**
- **NO iterative loop file creation**
- **NO multiple test files proliferation**

## 📋 MANDATORY 3-STEP DEVELOPMENT PROCESS

### STEP 1: IMAGINE x3 FIND CORRECT DEVELOPMENT
**Write development plan to markdown file**

Before writing any code:
1. **Analyze codebase architecture** - Understanding MCP Agent Docking Station structure
2. **Identify correct development patterns** - Follow existing patterns in:
   - `server.js` - Main MCP server with Socket.IO + encrypted endpoints (1,655 lines)
   - `crypto-utils.js` - AES-256-GCM encryption system (143 lines)
   - `mcp/tools-registry.js` - MCP tools system (287 lines)
   - `auth/bambi-patron-auth.js` - Patreon authentication (186 lines)
   - `repository/repo-manager.js` - Worker thread management (389 lines)
   - `complete-mcp-test.js` - Testing patterns (301 lines)
3. **Plan comprehensive solution** - Write detailed implementation plan to `DEVELOPMENT-PLAN.md`

### STEP 2: ANALYZE CODEBASE & CONTINUE DEVELOPMENT
**Compare codebase to plan and implement**

1. **Compare existing code** to the markdown plan from Step 1
2. **Identify gaps and required changes**
3. **Implement following existing patterns**:
   - Use MCP protocol compliance (`mcpVersion: '1.0.0'`)
   - Follow Socket.IO event patterns (`agent-dock`, `agent-command`)
   - Use encrypted communication via `/api/agents` endpoint
   - Implement patron authentication via `bambiAuth.verifyApiKey()`
   - Follow repository management patterns with worker threads
   - Use consistent error handling with HTTP status codes
   - Include emoji logging for clarity (🔐, 🚀, ⚡, 📁, etc.)
   - Follow existing file structure and naming conventions

4. **Document completion status** - At the end of Step 2, update `.github/completion-stats.md` with:
   ```
   `filename.ext` [%] [STATUS] [exists true/false] **last change to file** <all file capabilities before updates>
   ```
   - **`filename.ext`**: Full filename with path (e.g., `server.js`, `auth/bambi-patron-auth.js`)
   - **[%]**: Completion percentage (0-100%)
   - **[STATUS]**: COMPLETE | IN-PROGRESS | PLANNED | MODIFIED | NEW
   - **[true/false]**: Whether file existed before changes
   - **last change to file**: Brief description of most recent modification
   - **all file capabilities before updates**: List of functionalities the file had prior to current session

### STEP 3: COMPREHENSIVE SINGLE TEST FILE
**Create/update one test file, debug until it works**

1. **Single test file approach**:
   - If `tests/complete-mcp-test.js` exists, UPDATE IT
   - If not, CREATE `tests/complete-mcp-test.js`
   - **NO other test files**
   - **ALL test files MUST be stored in `tests/` folder**

2. **Test must include**:
   - MCP Agent registration and docking
   - Socket.IO communication testing
   - Encrypted API endpoint testing (`/api/agents`)
   - MCP tools authentication and execution
   - Patron verification testing
   - Repository management testing
   - Error handling verification

3. **Debug cycle**:
   - Run test and identify failures
   - Fix implementation code (not test code)
   - Repeat until all tests pass
   - **Test file should remain comprehensive and stable**

## 🏗️ CODEBASE ARCHITECTURE OVERVIEW

### Core Components
- **`server.js`** - Main MCP docking station (Express + Socket.IO) - 1,655 lines
- **`crypto-utils.js`** - AES-256-GCM encryption for secure communication - 143 lines
- **`auth/bambi-patron-auth.js`** - Patreon-based authentication system - 186 lines
- **`mcp/tools-registry.js`** - MCP tools system with authentication - 287 lines
- **`repository/repo-manager.js`** - Repository management with worker threads - 389 lines
- **`repository/workers/repo-worker.js`** - Isolated repository operations - 703 lines
- **`tests/complete-mcp-test.js`** - Comprehensive deployment testing - 301 lines

### Key Patterns
- **MCP Protocol Compliance**: Version 1.0.0, standardized events
- **Dual Communication**: Socket.IO for real-time + REST API for encrypted data
- **Patron Authentication**: API key verification for verified users
- **Encryption**: All sensitive data encrypted with rotating keys
- **Worker Isolation**: Repository operations in separate threads

### API Endpoints Structure
```
GET  /health                           - Server status
GET  /api/mcp/tools                    - List MCP tools
POST /api/mcp/:toolId/auth             - Tool authentication
POST /api/mcp/:toolId/execute          - Tool execution
POST /api/agents                       - Encrypted agent communication
POST /register-agent                   - Agent registration
POST /register-agent/dr-girlfriend     - Specific agent registration
```

### Socket.IO Events
```
Client -> Server: mcp-discovery, agent-dock, agent-command
Server -> Client: dock-success, mcp-server-info, command-acknowledged
Broadcast: agent-joined, agent-left, hypnosis-event
```

## 🔧 DEVELOPMENT REQUIREMENTS

### Always Follow These Patterns
1. **MCP Compliance**: Use `mcpVersion: '1.0.0'` and standard events
2. **Error Handling**: Proper HTTP status codes and error messages
3. **Authentication**: Verify API keys via `bambiAuth.verifyApiKey()`
4. **Encryption**: Use `mcpCrypto` for sensitive data
5. **Logging**: Console logs with emojis for clarity (🔐, 🚀, ⚡, 📁, etc.)
6. **Socket Rooms**: Use `agent-${agentId}` pattern for targeting
7. **File Structure**: Follow existing directory organization
8. **Testing**: Use single comprehensive test file approach

### File Creation Rules
- **Markdown files**: For planning and documentation only
- **Implementation files**: Follow existing directory structure
- **Single test file**: `tests/complete-mcp-test.js` - comprehensive, not multiple files
- **Config files**: Update existing, don't create new unless absolutely necessary
- **Line counts**: Track file complexity (server.js: 1,655 lines, repo-worker.js: 703 lines)
- **Naming convention**: Use kebab-case for files, camelCase for variables

## 💡 SUCCESS CRITERIA

1. **Step 1 Complete**: Detailed markdown plan exists
2. **Step 2 Complete**: Implementation follows existing patterns perfectly
3. **Step 3 Complete**: Single comprehensive test passes all scenarios
4. **No file proliferation**: Minimal new files created
5. **Pattern consistency**: Code matches existing architecture
6. **Documentation updated**: completion-stats.md includes filename prefixes
7. **Emoji logging**: Consistent use of emojis in console output

Remember: **KEEP IT SIMPLE** - Follow the 3 steps, use one comprehensive test file, and maintain consistency with the existing MCP Agent Docking Station architecture.
