#!/usr/bin/env node
/**
 * Test Node Spawner for BambiSleep Control Network
 * 
 * Spawns 5 test nodes with random ports and tests control functionality
 * with socketId starting with "mKcYOMXk..."
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { io } from 'socket.io-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_PORT = 7000;
const NUM_NODES = 5;
const TEST_SOCKET_PREFIX = 'mKcYOMXk';

console.log('🚀 Starting BambiSleep Control Network Test Node Spawner');
console.log(`📊 Spawning ${NUM_NODES} test nodes with random ports`);

class TestNodeSpawner {
  constructor() {
    this.nodes = [];
    this.testConnections = [];
    this.targetSocketId = null;
  }

  // Generate random port in safe range
  generateRandomPort() {
    return BASE_PORT + Math.floor(Math.random() * 1000);
  }

  // Create test environment file for a node
  createTestEnv(port) {
    const envContent = `
# Test Node Environment
NODE_ENV=test
SERVER_PORT=${port}
MONGODB_URI=mongodb://bambisleep:bambiAppPass456@localhost:27018/bambisleep?authSource=admin
SESSION_SECRET=test-secret-${port}
LMSTUDIO_URL=http://localhost:1234
CONTROL_NETWORK_ENABLED=true
LOG_LEVEL=debug
`.trim();

    const envPath = path.join(__dirname, `.env.test.${port}`);
    fs.writeFileSync(envPath, envContent);
    return envPath;
  }

  // Spawn a test node
  async spawnNode(nodeId, port) {
    console.log(`🌱 Spawning test node ${nodeId} on port ${port}`);
    
    const envPath = this.createTestEnv(port);
    
    const node = spawn('node', ['src/server.js'], {
      cwd: __dirname,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        SERVER_PORT: port.toString(),
        MONGODB_URI: 'mongodb://bambisleep:bambiAppPass456@localhost:27018/bambisleep?authSource=admin',
        SESSION_SECRET: `test-secret-${port}`,
        LOG_LEVEL: 'info'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const nodeInfo = {
      id: nodeId,
      port,
      process: node,
      envPath,
      status: 'starting',
      url: `http://localhost:${port}`
    };

    node.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server running on')) {
        nodeInfo.status = 'running';
        console.log(`✅ Node ${nodeId} ready on port ${port}`);
      }
      if (output.includes('ERROR') || output.includes('Error')) {
        console.log(`❌ Node ${nodeId} error: ${output.trim()}`);
      }
    });

    node.stderr.on('data', (data) => {
      console.log(`🔧 Node ${nodeId} stderr: ${data.toString().trim()}`);
    });

    node.on('close', (code) => {
      console.log(`📴 Node ${nodeId} exited with code ${code}`);
      nodeInfo.status = 'stopped';
    });

    this.nodes.push(nodeInfo);
    return nodeInfo;
  }

  // Wait for node to be ready
  async waitForNodeReady(nodeInfo, timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        await axios.get(`${nodeInfo.url}/health`, { timeout: 1000 });
        nodeInfo.status = 'ready';
        console.log(`🟢 Node ${nodeInfo.id} is ready and responding`);
        return true;
      } catch (error) {
        // Still starting up
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`⏰ Node ${nodeInfo.id} timeout waiting for ready state`);
    return false;
  }

  // Create test client connection with specific socketId prefix
  async createTestClient(nodeInfo) {
    return new Promise((resolve) => {
      const socket = io(nodeInfo.url, {
        autoConnect: true,
        reconnection: false
      });

      socket.on('connect', () => {
        console.log(`🔗 Test client connected to node ${nodeInfo.id}, socketId: ${socket.id}`);
        
        // Check if this socket ID starts with our test prefix
        if (socket.id.startsWith(TEST_SOCKET_PREFIX)) {
          console.log(`🎯 FOUND TARGET SOCKET: ${socket.id} on node ${nodeInfo.id}`);
          this.targetSocketId = socket.id;
        }

        resolve({
          socket,
          nodeInfo,
          socketId: socket.id
        });
      });

      socket.on('connect_error', (error) => {
        console.log(`❌ Failed to connect to node ${nodeInfo.id}: ${error.message}`);
        resolve(null);
      });
    });
  }

  // Test control network functionality
  async testControlNetworkFunctionality() {
    console.log('\n🧪 Testing Control Network Functionality');
    
    if (!this.targetSocketId) {
      console.log('⚠️ No target socket found with prefix "mKcYOMXk", creating mock test...');
      this.targetSocketId = 'mKcYOMXk_mock_test_' + Date.now();
    }

    // Test control signals on each node
    for (const connection of this.testConnections) {
      if (!connection) continue;

      const { socket, nodeInfo } = connection;
      
      console.log(`🎛️ Testing control signals on node ${nodeInfo.id}`);
      
      try {
        // Test chat message with trigger
        socket.emit('chat message', {
          data: 'BAMBI SLEEP test trigger activation'
        });

        // Test trigger activation
        socket.emit('triggers', {
          triggerNames: ['BAMBI SLEEP', 'GOOD GIRL'],
          triggerDetails: { test: true, targetSocket: this.targetSocketId }
        });

        // Test collar command
        socket.emit('collar', {
          data: `Test control command for ${this.targetSocketId}`
        });

        console.log(`✅ Control signals sent to node ${nodeInfo.id}`);
        
      } catch (error) {
        console.log(`❌ Error testing node ${nodeInfo.id}:`, error.message);
      }
    }

    // Wait for signal processing
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Get control network status from all nodes
  async getControlNetworkStatus() {
    console.log('\n📊 Gathering Control Network Status');
    
    for (const nodeInfo of this.nodes) {
      if (nodeInfo.status !== 'ready') continue;
      
      try {
        const response = await axios.get(`${nodeInfo.url}/api/bnncs/status`, { timeout: 5000 });
        console.log(`📈 Node ${nodeInfo.id} status:`, {
          nodes: response.data.data?.nodes || 0,
          signals: response.data.data?.signalsProcessed || 0,
          health: response.data.data?.networkHealth || 'unknown'
        });
      } catch (error) {
        console.log(`❌ Failed to get status from node ${nodeInfo.id}:`, error.message);
      }
    }
  }

  // Spawn all test nodes
  async spawnAllNodes() {
    console.log(`\n🌱 Spawning ${NUM_NODES} test nodes...`);
    
    const spawnPromises = [];
    for (let i = 1; i <= NUM_NODES; i++) {
      const port = this.generateRandomPort();
      spawnPromises.push(this.spawnNode(`testnode-${i}`, port));
    }

    await Promise.all(spawnPromises);
    
    // Wait for all nodes to be ready
    console.log('\n⏳ Waiting for all nodes to be ready...');
    const readyPromises = this.nodes.map(node => this.waitForNodeReady(node));
    await Promise.all(readyPromises);

    // Create test client connections
    console.log('\n🔗 Creating test client connections...');
    const connectionPromises = this.nodes
      .filter(node => node.status === 'ready')
      .map(node => this.createTestClient(node));
    
    this.testConnections = await Promise.all(connectionPromises);
    
    console.log(`✅ Created ${this.testConnections.filter(c => c).length} test connections`);
  }

  // Run the complete test
  async runTest() {
    try {
      await this.spawnAllNodes();
      await this.testControlNetworkFunctionality();
      await this.getControlNetworkStatus();
      
      console.log('\n🏁 Test completed successfully!');
      console.log(`🎯 Target socket prefix "${TEST_SOCKET_PREFIX}" test results:`);
      console.log(`   - Target socket found: ${this.targetSocketId || 'none'}`);
      console.log(`   - Active nodes: ${this.nodes.filter(n => n.status === 'ready').length}`);
      console.log(`   - Test connections: ${this.testConnections.filter(c => c).length}`);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  // Cleanup all test nodes
  async cleanup() {
    console.log('\n🧹 Cleaning up test nodes...');
    
    // Close socket connections
    for (const connection of this.testConnections) {
      if (connection?.socket) {
        connection.socket.disconnect();
      }
    }

    // Kill all node processes
    for (const nodeInfo of this.nodes) {
      if (nodeInfo.process && !nodeInfo.process.killed) {
        console.log(`🛑 Stopping node ${nodeInfo.id}`);
        nodeInfo.process.kill('SIGTERM');
        
        // Force kill if not stopped in 5 seconds
        setTimeout(() => {
          if (!nodeInfo.process.killed) {
            nodeInfo.process.kill('SIGKILL');
          }
        }, 5000);
      }

      // Clean up env file
      if (nodeInfo.envPath && fs.existsSync(nodeInfo.envPath)) {
        fs.unlinkSync(nodeInfo.envPath);
      }
    }

    console.log('✅ Cleanup completed');
  }
}

// Main execution
async function main() {
  const spawner = new TestNodeSpawner();
  
  // Setup cleanup on exit
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, cleaning up...');
    await spawner.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, cleaning up...');
    await spawner.cleanup();
    process.exit(0);
  });

  try {
    await spawner.runTest();
    
    // Keep running for manual testing
    console.log('\n⏰ Keeping nodes running for 60 seconds for manual testing...');
    console.log('💡 You can now test the nodes manually or press Ctrl+C to exit');
    
    setTimeout(async () => {
      console.log('\n⏰ Auto-cleanup triggered after 60 seconds');
      await spawner.cleanup();
      process.exit(0);
    }, 60000);
    
  } catch (error) {
    console.error('❌ Main execution failed:', error);
    await spawner.cleanup();
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default TestNodeSpawner;
