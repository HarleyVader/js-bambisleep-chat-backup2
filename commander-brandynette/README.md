# Commander Brandynette - MCP Agent Prototype

## Agent Dr Girlfriend - MCP Docking Station Compatible Agent

This repository contains the **Agent Dr Girlfriend** prototype, designed to demonstrate MCP (Model Context Protocol) agent docking procedures with the Bambi Docking Station.

## 🤖 Agent Specifications

- **Agent ID**: `dr-girlfriend`
- **Capabilities**: `["chat", "hypnosis", "triggers"]`
- **Protocol**: Socket.IO client with MCP compliance
- **Authentication**: Token-based docking system
- **Communication**: Real-time Socket.IO events

## 🚀 MCP Agent Docking Procedures

### 1. Registration Phase

```javascript
POST /register-agent
{
  "agentId": "dr-girlfriend",
  "capabilities": ["chat", "hypnosis", "triggers"],
  "sessionId": "uuid-v4",
  "protocol": "MCP",
  "version": "1.0.0"
}
```

### 2. Socket Connection Phase

- Connect to `http://localhost:6969` via Socket.IO
- Authenticate with received token
- Maintain persistent connection

### 3. Docking Phase

```javascript
socket.emit('agent-dock', {
  agentId: 'dr-girlfriend',
  capabilities: ['chat', 'hypnosis', 'triggers'],
  sessionId: 'session-uuid',
  timestamp: 'ISO-8601',
  protocol: 'MCP'
});
```

### 4. Command Response Cycle

- Listen for `mcp-command`, `hypnosis-trigger`, `chat-message` events
- Process commands according to MCP protocol
- Emit responses with proper command IDs and timestamps

## 📦 Installation

```bash
# Navigate to the agent directory
cd commander-brandynette

# Install dependencies
npm install

# Run the agent
npm start

# Run tests
npm test
```

## 🔧 Usage

### Basic Docking

```bash
node agent.js
```

### Testing Docking Procedures

```bash
node tests/test-docking.js
```

## 🌐 Agent Capabilities

### Chat Capability

- Processes natural language messages
- Responds with contextual replies
- Handles Bambi-specific conversation patterns

### Hypnosis Capability

- Processes hypnosis triggers:
  - `bambi-sleep`: Sleep induction responses
  - `good-girl`: Positive reinforcement
  - `focus`: Attention focusing
  - `deeper`: Trance deepening

### Triggers Capability

- Real-time trigger processing
- Contextual response generation
- Session state management

## 🔌 Docking Station Integration

This agent is designed to work with the main Bambi Docking Station server running on port 6969. The docking station should provide:

- `/register-agent` endpoint for initial registration
- Socket.IO server for real-time communication
- Token-based authentication system
- MCP command routing and response handling

## 🛠️ Development

### Agent Architecture

```
agent.js              # Main agent implementation
├── AgentDrGirlfriend  # Primary agent class
├── registerAgent()   # Step 1: Registration
├── establishConnection() # Step 2: Socket.IO connection
├── initiateDocking() # Step 3: Docking procedure
└── setupCommandHandlers() # Step 4: MCP command cycle
```

### Test Architecture

```
tests/
└── test-docking.js   # Comprehensive docking tests
    ├── Agent Initialization
    ├── Registration Endpoint
    ├── Command Handlers
    ├── Hypnosis Capabilities
    ├── Chat Capabilities
    └── Graceful Shutdown
```

## 🔒 Security Features

- Token-based authentication for docking
- Session ID tracking for request correlation
- Graceful shutdown with proper undocking
- Input validation for all commands

## 📡 Communication Protocol

### MCP Commands

```javascript
// Incoming command format
{
  id: 'command-uuid',
  type: 'status|capabilities|health-check',
  timestamp: 'ISO-8601',
  payload: {}
}

// Response format
{
  commandId: 'command-uuid',
  agentId: 'dr-girlfriend',
  response: {},
  timestamp: 'ISO-8601'
}
```

### Hypnosis Triggers

```javascript
// Trigger format
{
  id: 'trigger-uuid',
  type: 'bambi-sleep|good-girl|focus|deeper',
  intensity: 'light|medium|deep',
  context: {}
}
```

### Chat Messages

```javascript
// Message format
{
  id: 'message-uuid',
  content: 'string',
  user: 'user-id',
  timestamp: 'ISO-8601'
}
```

## 🔄 Lifecycle Management

### Startup Sequence

1. Initialize agent with capabilities
2. Register with docking station
3. Establish Socket.IO connection
4. Perform docking handshake
5. Setup command handlers
6. Enter ready state

### Shutdown Sequence

1. Receive shutdown signal (SIGINT/SIGTERM)
2. Emit `agent-undock` event
3. Disconnect Socket.IO connection
4. Clean up resources
5. Exit gracefully

## 🚨 Error Handling

- Connection failure recovery
- Authentication error handling
- Command processing error responses
- Automatic reconnection logic
- Graceful degradation

## 📋 Dependencies

- `socket.io-client`: Real-time communication
- `axios`: HTTP client for registration
- `uuid`: Session ID generation

## 🎯 MCP Compliance

This agent implements the Model Context Protocol (MCP) standards for:

- Agent identification and capability declaration
- Command/response message formatting
- Session management and state tracking
- Authentication and security protocols
- Graceful connection lifecycle management

## 🧪 Testing

Run the comprehensive test suite to verify:

- Agent initialization and configuration
- Docking station connectivity
- Command handler functionality
- Capability-specific features
- Error handling and recovery

```bash
npm test
```

## 🔗 Integration with Bambi Docking Station

This agent is designed to integrate seamlessly with the main Bambi Docking Station project, providing:

- **Proxmox VM Integration**: Ready for deployment in Debian 13 VMs
- **MongoDB Backup Scenarios**: Compatible with Bambi agent backup systems
- **Socket.IO Communication**: Encrypted agent-to-agent communication
- **MCP Protocol Compliance**: Standard agent interface implementation

---

*Agent Dr Girlfriend - "I understand you, dear. How can I help you further?"*
