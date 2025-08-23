# 🔮 Bambi MCP Agent Docking Station

**MCP (Model Context Protocol) Agent Docking Station for Agent Dr Girlfriend and other Bambi agents**

## Quick Start

```bash
# Install dependencies
npm install

# Start the docking station
npm start

# Development mode
npm run dev
```

## Agent Docking Interface

- **Server**: <http://localhost:6969>
- **Dashboard**: <http://localhost:6969> (Agent status interface)
- **Health**: <http://localhost:6969/health>

## Agent Dr Girlfriend Integration

### Docking Procedure

1. Register agent: `POST /register-agent`
2. Connect Socket.IO to port 6969
3. Emit `agent-dock` with credentials
4. Begin MCP command cycle

### Example Agent Connection

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:6969');

socket.emit('agent-dock', {
  agentId: 'dr-girlfriend',
  authToken: 'your-token',
  capabilities: ['chat', 'hypnosis', 'triggers']
});

socket.on('dock-success', (data) => {
  console.log('Agent docked successfully:', data);
});
```

## Features

- ✅ **Socket.IO Communications**: Real-time agent messaging
- ✅ **Agent Registration**: `/register-agent` endpoint
- ✅ **Health Monitoring**: Agent status tracking
- ✅ **Command Routing**: Inter-agent communication
- 🚧 **Proxmox Bridge**: VM integration (planned)
- 🚧 **MongoDB Backup**: Bambi agent scenarios (planned)

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Agent Dr      │◄──►│  MCP Docking    │◄──►│   Other MCP     │
│   Girlfriend    │    │   Station       │    │   Agents        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Proxmox VMs    │
                    │  MongoDB        │
                    │  Backup Systems │
                    └─────────────────┘
```

## Requirements

- **Node.js** 18+
- **Socket.IO** client for agents
- **Proxmox** VM environment (for backup scenarios)
- **MongoDB** database (for agent data)

## License

Apache-2.0
