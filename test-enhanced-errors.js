import { io } from 'socket.io-client';

console.log('🧪 Enhanced Error Handler Test');
console.log('===============================');

const socket = io('http://192.168.0.69:6969', {
    auth: { token: 'test' }
});

socket.on('connect', () => {
    console.log('✅ Connected to server');
    console.log('🤖 Sending test message to trigger AI response...');
    
    // Send a test message to trigger AI processing
    socket.emit('message', 'Hello AI, can you respond?');
});

// Listen for enhanced error types
socket.on('connection_error', (data) => {
    console.log('🔴 CONNECTION_ERROR received:', data);
    process.exit(0);
});

socket.on('model_error', (data) => {
    console.log('🟡 MODEL_ERROR received:', data);
    process.exit(0);
});

socket.on('server_error', (data) => {
    console.log('🟠 SERVER_ERROR received:', data);
    process.exit(0);
});

socket.on('unknown_error', (data) => {
    console.log('🟣 UNKNOWN_ERROR received:', data);
    process.exit(0);
});

// Listen for regular response 
socket.on('response', (data) => {
    console.log('✅ RESPONSE received:', data);
    console.log('🎉 AI is working correctly!');
    process.exit(0);
});

// Listen for old error format
socket.on('error', (data) => {
    console.log('⚠️ OLD ERROR format received:', data);
    process.exit(0);
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
    console.log('⏰ Test timed out - no response received');
    process.exit(1);
}, 10000);
