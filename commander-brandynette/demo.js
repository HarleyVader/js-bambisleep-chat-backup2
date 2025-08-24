#!/usr/bin/env node
/**
 * Demo script showing Agent Dr Girlfriend MCP prototype capabilities
 */

import AgentDrGirlfriend from './agent.js';

async function demonstrateAgent() {
    console.log(`🎭 Agent Dr Girlfriend MCP Prototype Demo`);
    console.log(`${'='.repeat(50)}\n`);

    // Initialize agent
    const agent = new AgentDrGirlfriend();

    // Show agent configuration
    console.log(`🤖 Agent Configuration:`);
    console.log(`   Agent ID: ${agent.agentId}`);
    console.log(`   Capabilities: ${agent.capabilities.join(', ')}`);
    console.log(`   Session ID: ${agent.sessionId}`);
    console.log(`   Docking Station: ${agent.dockingStationUrl}\n`);

    // Demonstrate status functionality
    console.log(`📊 Agent Status:`);
    const status = agent.getAgentStatus();
    console.log(`   Status: ${status.status}`);
    console.log(`   Uptime: ${status.uptime.toFixed(2)} seconds`);
    console.log(`   Timestamp: ${status.timestamp}\n`);

    // Demonstrate command handling (simulation)
    console.log(`⚙️ Command Processing Demo:`);

    // Simulate MCP command
    const mockCommand = {
        id: 'demo-cmd-001',
        type: 'capabilities',
        timestamp: new Date().toISOString()
    };

    console.log(`   📨 Simulating MCP command: ${mockCommand.type}`);
    await agent.handleMCPCommand(mockCommand);

    // Simulate hypnosis trigger
    const mockTrigger = {
        id: 'demo-trigger-001',
        type: 'bambi-sleep',
        intensity: 'medium'
    };

    console.log(`   🌀 Simulating hypnosis trigger: ${mockTrigger.type}`);
    agent.handleHypnosisTrigger(mockTrigger);

    // Simulate chat message
    const mockMessage = {
        id: 'demo-msg-001',
        content: 'Hello Dr Girlfriend, I want to learn about Bambi',
        user: 'demo-user'
    };

    console.log(`   💬 Simulating chat message: "${mockMessage.content}"`);
    agent.handleChatMessage(mockMessage);

    console.log(`\n✅ Demo completed successfully!`);
    console.log(`🚀 Agent is ready for MCP docking station connection.`);
    console.log(`\n📋 Next Steps:`);
    console.log(`   1. Start the Bambi Docking Station server (port 6969)`);
    console.log(`   2. Obtain API key via Patreon authentication`);
    console.log(`   3. Run: npm start`);
    console.log(`   4. Agent will automatically dock and await commands`);
}

// Run demo
demonstrateAgent().catch(console.error);
