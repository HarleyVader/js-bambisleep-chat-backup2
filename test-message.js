#!/usr/bin/env node
/**
 * Test message sending to BambiSleep server
 */

import { io } from 'socket.io-client';

const SERVER_URL = 'http://192.168.0.69:6969';

console.log('🧪 Testing message sending to BambiSleep server...');

// Create socket connection
const socket = io(SERVER_URL, {
    autoConnect: true,
    timeout: 10000
});

socket.on('connect', () => {
    console.log(`✅ Connected to server with socket ID: ${socket.id}`);
    
    // Test sending a message like the frontend does
    console.log('📨 Sending test message...');
    socket.emit('message', 'Hello Bambi, this is a test message from the automated test script!');
    
    // Set a timeout to wait for response
    setTimeout(() => {
        console.log('⏰ Test timeout reached, disconnecting...');
        socket.disconnect();
        process.exit(0);
    }, 10000);
});

socket.on('response', (message) => {
    console.log('🎉 RECEIVED RESPONSE:', message);
    socket.disconnect();
    process.exit(0);
});

socket.on('error', (error) => {
    console.log('❌ RECEIVED ERROR:', error);
});

socket.on('system', (data) => {
    console.log('🔔 RECEIVED SYSTEM MESSAGE:', data);
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
});

socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected:', reason);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, disconnecting...');
    socket.disconnect();
    process.exit(0);
});

console.log('⏳ Connecting to server...');
