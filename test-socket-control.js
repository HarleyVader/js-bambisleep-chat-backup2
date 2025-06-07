#!/usr/bin/env node
/**
 * Socket Control Test for BambiSleep Control Network
 * 
 * Tests control functionality with socketId starting with "mKcYOMXk..."
 */

import { io } from 'socket.io-client';
import axios from 'axios';

const TEST_SOCKET_PREFIX = 'mKcYOMXk';
const MAIN_SERVER_URL = 'http://localhost:6969'; // Default server
const MAX_CONNECTIONS = 10;

console.log('🔗 BambiSleep Socket Control Test');
console.log(`🎯 Target socket prefix: "${TEST_SOCKET_PREFIX}"`);

class SocketControlTester {
  constructor() {
    this.connections = [];
    this.targetSockets = [];
  }

  // Create multiple connections to find target socket
  async createConnections() {
    console.log(`🔌 Creating ${MAX_CONNECTIONS} connections to find target socket...`);
    
    const promises = [];
    for (let i = 0; i < MAX_CONNECTIONS; i++) {
      promises.push(this.createConnection(i));
    }

    const results = await Promise.all(promises);
    this.connections = results.filter(conn => conn !== null);
    
    console.log(`✅ Created ${this.connections.length} connections`);
    console.log(`🎯 Found ${this.targetSockets.length} target sockets with prefix "${TEST_SOCKET_PREFIX}"`);
    
    return this.targetSockets.length > 0;
  }

  // Create a single connection
  async createConnection(index) {
    return new Promise((resolve) => {
      const socket = io(MAIN_SERVER_URL, {
        autoConnect: true,
        reconnection: false,
        timeout: 5000
      });

      const timeout = setTimeout(() => {
        socket.disconnect();
        resolve(null);
      }, 10000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        
        const socketId = socket.id;
        console.log(`📡 Connection ${index}: ${socketId}`);
        
        const connection = {
          index,
          socket,
          socketId,
          isTarget: socketId.startsWith(TEST_SOCKET_PREFIX)
        };

        if (connection.isTarget) {
          console.log(`🎯 TARGET FOUND: ${socketId}`);
          this.targetSockets.push(connection);
        }

        resolve(connection);
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        console.log(`❌ Connection ${index} failed: ${error.message}`);
        resolve(null);
      });
    });
  }

  // Test control functionality on target socket
  async testControlFunctionality() {
    if (this.targetSockets.length === 0) {
      console.log('⚠️ No target sockets found, testing with mock socket ID');
      await this.testMockControl();
      return;
    }

    console.log('\n🎛️ Testing Control Functionality');
    
    for (const targetConn of this.targetSockets) {
      console.log(`\n🔧 Testing control on target socket: ${targetConn.socketId}`);
      
      // Test 1: Chat message with trigger
      console.log('📝 Test 1: Chat message with trigger');
      targetConn.socket.emit('chat message', {
        data: 'BAMBI SLEEP control test from automated system'
      });

      await this.wait(1000);

      // Test 2: Direct trigger activation
      console.log('⚡ Test 2: Direct trigger activation');
      targetConn.socket.emit('triggers', {
        triggerNames: ['BAMBI SLEEP', 'GOOD GIRL'],
        triggerDetails: {
          source: 'control_test',
          target: targetConn.socketId,
          timestamp: Date.now()
        }
      });

      await this.wait(1000);

      // Test 3: Collar command
      console.log('👑 Test 3: Collar command');
      targetConn.socket.emit('collar', {
        data: `Control test collar command - Socket: ${targetConn.socketId}`
      });

      await this.wait(1000);

      // Test 4: Audio command
      console.log('🔊 Test 4: Audio command');
      targetConn.socket.emit('play audio', {
        audioFile: 'test-control-audio.mp3',
        target: targetConn.socketId
      });

      console.log(`✅ Control tests completed for ${targetConn.socketId}`);
    }
  }

  // Test with mock control (when no target socket found)
  async testMockControl() {
    const mockSocketId = `${TEST_SOCKET_PREFIX}_mock_${Date.now()}`;
    console.log(`🎭 Testing with mock target socket: ${mockSocketId}`);

    // Use first available connection for control tests
    const controlSocket = this.connections[0];
    if (!controlSocket) {
      console.log('❌ No connections available for mock control test');
      return;
    }

    console.log('📝 Mock Test 1: Chat message');
    controlSocket.socket.emit('chat message', {
      data: `Control test targeting mock socket ${mockSocketId}`
    });

    await this.wait(1000);

    console.log('⚡ Mock Test 2: Trigger activation');
    controlSocket.socket.emit('triggers', {
      triggerNames: ['BAMBI SLEEP'],
      triggerDetails: {
        source: 'mock_control_test',
        mockTarget: mockSocketId,
        timestamp: Date.now()
      }
    });

    console.log('✅ Mock control tests completed');
  }

  // Get control network status
  async getControlNetworkStatus() {
    console.log('\n📊 Getting Control Network Status');
    
    try {
      const response = await axios.get(`${MAIN_SERVER_URL}/api/bnncs/status`, { timeout: 5000 });
      const status = response.data.data;
      
      console.log('🌐 Control Network Status:');
      console.log(`   - Total nodes: ${status?.nodes || 0}`);
      console.log(`   - Signals processed: ${status?.signalsProcessed || 0}`);
      console.log(`   - Network health: ${status?.networkHealth || 'unknown'}`);
      console.log(`   - Active controllers: ${status?.activeControllers || 0}`);
      
    } catch (error) {
      console.log('❌ Failed to get control network status:', error.message);
    }

    try {
      const response = await axios.get(`${MAIN_SERVER_URL}/api/bnncs/nodes`, { timeout: 5000 });
      const nodes = response.data.data;
      
      console.log(`\n🔗 Connected Nodes (${nodes?.length || 0}):`);
      if (nodes && nodes.length > 0) {
        nodes.forEach((node, index) => {
          const isTarget = node.id?.startsWith(TEST_SOCKET_PREFIX);
          const marker = isTarget ? '🎯' : '📡';
          console.log(`   ${marker} ${node.id} (${node.type}) - signals: ${node.signalCount || 0}`);
        });
      }
      
    } catch (error) {
      console.log('❌ Failed to get nodes list:', error.message);
    }
  }

  // Wait helper
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup connections
  async cleanup() {
    console.log('\n🧹 Cleaning up connections...');
    
    for (const conn of this.connections) {
      if (conn?.socket) {
        conn.socket.disconnect();
      }
    }
    
    console.log('✅ Cleanup completed');
  }

  // Run the complete test
  async runTest() {
    try {
      console.log('🚀 Starting socket control test...');
      
      // Check if server is running
      try {
        await axios.get(`${MAIN_SERVER_URL}/health`, { timeout: 5000 });
        console.log('✅ Server is running and healthy');
      } catch (error) {
        console.log('❌ Server not accessible:', error.message);
        return;
      }

      // Create connections and find target sockets
      const foundTargets = await this.createConnections();
      
      if (foundTargets) {
        console.log(`🎯 Found ${this.targetSockets.length} target socket(s) with prefix "${TEST_SOCKET_PREFIX}"`);
      } else {
        console.log(`⚠️ No sockets found with prefix "${TEST_SOCKET_PREFIX}"`);
        console.log('💡 This is normal - socket IDs are randomly generated by Socket.io');
      }

      // Test control functionality
      await this.testControlFunctionality();
      
      // Get status
      await this.getControlNetworkStatus();
      
      console.log('\n🏁 Socket control test completed!');
      console.log('📋 Test Summary:');
      console.log(`   - Total connections: ${this.connections.length}`);
      console.log(`   - Target sockets found: ${this.targetSockets.length}`);
      console.log(`   - Control tests executed: ✅`);
      console.log(`   - Network status checked: ✅`);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }
}

// Main execution
async function main() {
  const tester = new SocketControlTester();
  
  // Setup cleanup on exit
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, cleaning up...');
    await tester.cleanup();
    process.exit(0);
  });

  try {
    await tester.runTest();
    
    // Keep connections for a bit to observe behavior
    console.log('\n⏰ Keeping connections for 10 seconds...');
    await tester.wait(10000);
    
    await tester.cleanup();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Main execution failed:', error);
    await tester.cleanup();
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default SocketControlTester;
