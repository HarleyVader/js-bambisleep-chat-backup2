#!/usr/bin/env node
// Admin client for circuit breaker server
import { io } from 'socket.io-client';
import readline from 'readline';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'bambi-admin-2025';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:6970';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log(`🔧 Connecting to admin interface at ${SERVER_URL}/admin`);

const socket = io(`${SERVER_URL}/admin`);

socket.on('connect', () => {
    console.log('✅ Connected to admin interface');
    console.log('🔑 Authenticating...');
    socket.emit('authenticate', ADMIN_TOKEN);
});

socket.on('authenticated', (data) => {
    if (data.success) {
        console.log('✅ Authenticated successfully');
        showMenu();
    } else {
        console.log('❌ Authentication failed');
        process.exit(1);
    }
});

socket.on('commandResult', (result) => {
    console.log(`📊 Server Command Result:`, result);
    showMenu();
});

socket.on('gitResult', (result) => {
    console.log(`📊 Git Command Result:`);
    console.log(`   Command: ${result.command}`);
    console.log(`   Success: ${result.success}`);
    if (result.stdout) console.log(`   Output: ${result.stdout}`);
    if (result.stderr) console.log(`   Error: ${result.stderr}`);
    showMenu();
});

socket.on('routeResult', (result) => {
    console.log(`📊 Route Switch Result:`, result);
    showMenu();
});

socket.on('adminStatus', (status) => {
    console.log(`📊 Admin Status:`);
    console.log(`   Route Switched: ${status.routeSwitched}`);
    console.log(`   Server Running: ${status.serverRunning}`);
    console.log(`   Recent Git Operations: ${status.gitOperations.length}`);
    showMenu();
});

const showMenu = () => {
    console.log('\n🔧 Admin Commands:');
    console.log('1. start    - Start main server');
    console.log('2. stop     - Stop main server');
    console.log('3. restart  - Restart main server');
    console.log('4. status   - Get admin status');
    console.log('5. git      - Git operations');
    console.log('6. switch   - Toggle route switching');
    console.log('7. exit     - Exit admin client');
    
    rl.question('\nEnter command: ', (answer) => {
        handleCommand(answer.trim().toLowerCase());
    });
};

const handleCommand = (cmd) => {
    switch (cmd) {
        case '1':
        case 'start':
            socket.emit('serverCommand', { action: 'start' });
            break;
            
        case '2':
        case 'stop':
            socket.emit('serverCommand', { action: 'stop' });
            break;
            
        case '3':
        case 'restart':
            socket.emit('serverCommand', { action: 'restart' });
            break;
            
        case '4':
        case 'status':
            socket.emit('getAdminStatus');
            break;
            
        case '5':
        case 'git':
            showGitMenu();
            break;
            
        case '6':
        case 'switch':
            rl.question('Switch route OFF? (y/n): ', (answer) => {
                const switched = answer.toLowerCase() === 'y';
                socket.emit('switchRoute', { switched });
            });
            break;
            
        case '7':
        case 'exit':
            console.log('👋 Goodbye!');
            process.exit(0);
            break;
            
        default:
            console.log('❌ Unknown command');
            showMenu();
    }
};

const showGitMenu = () => {
    console.log('\n📁 Git Commands:');
    console.log('1. status  - Git status');
    console.log('2. pull    - Git pull');
    console.log('3. add     - Git add .');
    console.log('4. commit  - Git commit with message');
    console.log('5. log     - Git log (last 10)');
    console.log('6. back    - Back to main menu');
    
    rl.question('\nEnter git command: ', (answer) => {
        handleGitCommand(answer.trim().toLowerCase());
    });
};

const handleGitCommand = (cmd) => {
    switch (cmd) {
        case '1':
        case 'status':
            socket.emit('gitCommand', { command: 'git status' });
            break;
            
        case '2':
        case 'pull':
            socket.emit('gitCommand', { command: 'git pull' });
            break;
            
        case '3':
        case 'add':
            socket.emit('gitCommand', { command: 'git add .' });
            break;
            
        case '4':
        case 'commit':
            rl.question('Enter commit message: ', (message) => {
                if (message.trim()) {
                    socket.emit('gitCommit', { message: message.trim() });
                } else {
                    console.log('❌ Commit message required');
                    showGitMenu();
                }
            });
            break;
            
        case '5':
        case 'log':
            socket.emit('gitCommand', { command: 'git log --oneline -10' });
            break;
            
        case '6':
        case 'back':
            showMenu();
            break;
            
        default:
            console.log('❌ Unknown git command');
            showGitMenu();
    }
};

socket.on('disconnect', () => {
    console.log('❌ Disconnected from admin interface');
    process.exit(1);
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
    process.exit(1);
});
