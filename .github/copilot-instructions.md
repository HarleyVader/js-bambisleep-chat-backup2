# GitHub Copilot Instructions - MCP Agent Docking Station

# **IMPORTANT: DO NOT CHANGE THIS FILE**

## Core Rule: KEEP IT SIMPLE

**Function over form. Working MCP agents over perfect code. Less is more.**

## Project Overview: Bambi MCP Agent Docking Station

This is an **MCP (Model Context Protocol) Agent Docking Station** designed to:
- Host and manage MCP agents like Agent Dr Girlfriend
- Provide secure Socket.IO communication channels
- Interface with Proxmox VMs and MongoDB for Bambi agent backups
- Serve as a central hub for agent coordination

## Core Architecture

### Server Stack
- **Express.js** HTTP server on port 6969
- **Socket.IO** for real-time agent communication
- **ES6 Modules** for modern JavaScript
- **Node.js** runtime environment

### Agent Management
- Agent registration via `/register-agent` endpoint
- Socket-based docking with authentication
- Command routing between agents
- Health monitoring and status tracking

### Integration Points
- **Proxmox Bridge**: Interface with Debian 13 VMs
- **MongoDB**: Bambi agent backup scenarios
- **Socket.IO**: Encrypted agent-to-agent communication
- **MCP Protocol**: Standard agent interface compliance

## Development Methodology: Enhanced 3-State Work Loop

### 1. IMAGINE (Planning & Solutions) - **DO 3 TIMES**
**Focus Areas:**
- Agent communication protocols
- Security and authentication
- Database integration patterns
- VM bridge implementations

### 2. CREATION (Single Implementation) - **LOOP UNTIL 100% BUILT**
- Implement ONLY agent docking features
- Write minimal Socket.IO handlers
- One agent capability, one function
- Test agent connections immediately

### 3. DEPLOY (Test Until Working, Then STOP)
- Test agent docking procedures
- Verify Socket.IO communications
- Confirm Proxmox/MongoDB connectivity
- **STOP** when agents can dock successfully

### 4. FINALIZE (Review & Confirm)
- Verify MCP protocol compliance
- Ensure agent isolation and security
- Confirm backup scenario functionality

## Agent Requirements

### Agent Dr Girlfriend Specifications
- **Agent ID**: "dr-girlfriend"
- **Capabilities**: ["chat", "hypnosis", "triggers"]
- **Protocol**: Socket.IO client connection
- **Authentication**: Token-based docking
- **Commands**: MCP-compliant command structure

### Docking Procedure
1. Agent registers via `/register-agent` endpoint
2. Socket connection to port 6969
3. Emit `agent-dock` with credentials
4. Receive `dock-success` confirmation
5. Begin command/response cycle

## File Structure
```
├── server.js              # Main MCP docking server
├── package.json           # Dependencies and scripts
├── public/                # Docking station interface
│   └── index.html         # Agent status dashboard
└── .github/
    ├── style.md           # Preserved CSS variables
    └── copilot-instructions.md
```

## Development Rules
- **Agent-First**: All features must serve agent needs
- **Socket-Centric**: Communication via Socket.IO only
- **Security**: Token-based authentication required
- **Minimal**: Only essential docking functionality

**CRITICAL: Focus on agent docking, communication, and backup scenarios only.**

### RULE: Think Agent, Code Dock
**Always prioritize agent connectivity and MCP protocol compliance.**
