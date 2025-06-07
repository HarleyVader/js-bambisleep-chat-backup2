#!/usr/bin/env node
/**
 * Quick Socket Test for BambiSleep Control Network
 */

import { io } from 'socket.io-client';
import axios from 'axios';

const SERVER_URL = 'http://localhost:6969';
const TEST_SOCKET_PREFIX = 'mKcYOMXk';

console.log('🔗 Quick Socket Control Test');

async function quickTest() {
  try {
    // Test server health
    console.log('🏥 Checking server health...');
    const health = await axios.get(`${SERVER_URL}/health`, { timeout: 3000 });
    console.log('✅ Server is healthy');

    // Test control network status
    console.log('📊 Getting control network status...');
    try {
      const status = await axios.get(`${SERVER_URL}/api/bnncs/status`, { timeout: 3000 });
      console.log('🌐 Control Network Status:', status.data.data);
    } catch (error) {
      console.log('⚠️ Control network API not available:', error.message);
    }

    // Create a single test connection
    console.log('🔌 Creating test connection...');
    const socket = io(SERVER_URL, {
      autoConnect: true,
      timeout: 5000
    });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⏰ Connection timeout');
        socket.disconnect();
        resolve();
      }, 10000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        console.log(`📡 Connected with socket ID: ${socket.id}`);
        
        const isTarget = socket.id.startsWith(TEST_SOCKET_PREFIX);
        if (isTarget) {
          console.log(`🎯 FOUND TARGET SOCKET: ${socket.id}`);
        } else {
          console.log(`ℹ️ Socket doesn't match target prefix "${TEST_SOCKET_PREFIX}"`);
        }

        // Test control functionality
        console.log('🎛️ Testing control signals...');
        
        socket.emit('chat message', {
          data: 'Test control message from automated test'
        });

        socket.emit('triggers', {
          triggerNames: ['BAMBI SLEEP'],
          triggerDetails: { test: true, socketId: socket.id }
        });

        console.log('✅ Control signals sent');

        setTimeout(() => {
          socket.disconnect();
          console.log('🔌 Disconnected');
          resolve();
        }, 2000);
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        console.log('❌ Connection failed:', error.message);
        resolve();
      });
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

quickTest().then(() => {
  console.log('🏁 Quick test completed');
  process.exit(0);
});
