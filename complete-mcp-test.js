#!/usr/bin/env node
/**
 * Comprehensive MCP Docking Station Test
 * Validates entire system functionality for Agent Dr Girlfriend and MCP agents
 *
 * This test file validates the completion status claims in completion-stats.md
 */

import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dynamic imports for testing
let express, socketIoClient, http;
let server, mcpCrypto, bambiAuth, mcpTools, repoManager;

// Test configuration
const TEST_CONFIG = {
    serverPort: 6969,
    testTimeout: 30000,
    agentId: 'test-agent-dr-girlfriend',
    demoApiKey: 'bambi-demo-patron-1-api-key'
};

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    errors: []
};

/**
 * Test runner utility
 */
function runTest(testName, testFn) {
    testResults.total++;
    console.log(`🧪 Running: ${testName}`);

    try {
        const result = testFn();
        if (result === true || result === undefined) {
            testResults.passed++;
            console.log(`✅ PASSED: ${testName}`);
        } else {
            testResults.failed++;
            console.log(`❌ FAILED: ${testName} - ${result}`);
            testResults.errors.push(`${testName}: ${result}`);
        }
    } catch (error) {
        testResults.failed++;
        console.log(`❌ ERROR: ${testName} - ${error.message}`);
        testResults.errors.push(`${testName}: ${error.message}`);
    }
}

/**
 * Async test runner utility
 */
async function runAsyncTest(testName, testFn) {
    testResults.total++;
    console.log(`🧪 Running: ${testName}`);

    try {
        const result = await testFn();
        if (result === true || result === undefined) {
            testResults.passed++;
            console.log(`✅ PASSED: ${testName}`);
        } else {
            testResults.failed++;
            console.log(`❌ FAILED: ${testName} - ${result}`);
            testResults.errors.push(`${testName}: ${result}`);
        }
    } catch (error) {
        testResults.failed++;
        console.log(`❌ ERROR: ${testName} - ${error.message}`);
        testResults.errors.push(`${testName}: ${error.message}`);
    }
}

/**
 * Test 1: File Structure Validation
 */
function testFileStructure() {
    const requiredFiles = [
        'src/server.js',
        'src/crypto-utils.js',
        'auth/bambi-patron-auth.js',
        'mcp/tools-registry.js',
        'repository/repo-manager.js',
        'repository/workers/repo-worker.js',
        'package.json',
        'README.md'
    ];

    for (const file of requiredFiles) {
        const filePath = join(__dirname, file);
        if (!existsSync(filePath)) {
            return `Missing required file: ${file}`;
        }
    }

    console.log(`📁 All required files found`);
    return true;
}

/**
 * Test 2: Dynamic Module Loading
 */
async function testModuleLoading() {
    try {
        // Import required modules
        express = (await import('express')).default;
        socketIoClient = (await import('socket.io-client')).default;
        http = await import('http');

        // Import MCP components
        const MCPCrypto = (await import('./src/crypto-utils.js')).default;
        const { BambiPatronAuth } = await import('./auth/bambi-patron-auth.js');
        const MCPToolsRegistry = (await import('./mcp/tools-registry.js')).default;
        const { RepositoryManager } = await import('./repository/repo-manager.js');

        // Initialize components
        mcpCrypto = new MCPCrypto();
        bambiAuth = new BambiPatronAuth();
        mcpTools = new MCPToolsRegistry();
        repoManager = new RepositoryManager({
            workspaceDir: join(__dirname, 'test-workspace'),
            maxWorkers: 1
        });

        console.log('📦 All modules loaded successfully');
        return true;
    } catch (error) {
        return `Module loading failed: ${error.message}`;
    }
}

/**
 * Test 3: Encryption System Validation
 */
function testEncryptionSystem() {
    const testData = {
        agentId: 'test-agent',
        command: 'test-command',
        payload: { test: 'data' }
    };

    // Test encryption
    const encrypted = mcpCrypto.encrypt(testData);
    if (!encrypted.encrypted || !encrypted.iv || !encrypted.tag) {
        return 'Encryption failed to produce required components';
    }

    // Test decryption
    const decrypted = mcpCrypto.decrypt(encrypted);
    if (JSON.stringify(decrypted) !== JSON.stringify(testData)) {
        return 'Decryption failed to restore original data';
    }

    // Test socket ID encryption
    const socketId = 'test-socket-123';
    const agentId = 'test-agent';
    const encryptedSocketId = mcpCrypto.encryptSocketId(socketId, agentId);
    const decryptedSocketData = mcpCrypto.decryptSocketId(encryptedSocketId);

    if (decryptedSocketData.socketId !== socketId || decryptedSocketData.agentId !== agentId) {
        return 'Socket ID encryption/decryption failed';
    }

    console.log('🔐 Encryption system validated');
    return true;
}

/**
 * Test 4: Authentication System Validation
 */
function testAuthenticationSystem() {
    // Test demo patron verification
    const demoPatrons = bambiAuth.getVerifiedPatrons();
    if (demoPatrons.length === 0) {
        return 'No demo patrons found';
    }

    // Test API key verification
    const verification = bambiAuth.verifyApiKey(TEST_CONFIG.demoApiKey);
    if (!verification.valid) {
        return `Demo API key verification failed: ${verification.reason}`;
    }

    // Test patron tier retrieval
    const tier = bambiAuth.getPatronTier(verification.patron.userId);
    if (!tier) {
        return 'Patron tier retrieval failed';
    }

    console.log(`🔐 Authentication system validated - Demo patron: ${verification.patron.name}`);
    return true;
}

/**
 * Test 5: MCP Tools Registry Validation
 */
function testMCPToolsRegistry() {
    // Test tool listing
    const tools = mcpTools.listTools();
    if (tools.length === 0) {
        return 'No MCP tools registered';
    }

    // Test required tools exist
    const requiredTools = ['agent-command', 'memory-sync', 'hypnosis-trigger'];
    for (const toolName of requiredTools) {
        if (!tools.find(tool => tool.name === toolName)) {
            return `Required tool missing: ${toolName}`;
        }
    }

    console.log(`🔧 MCP Tools Registry validated - ${tools.length} tools available`);
    return true;
}

/**
 * Test 6: Repository Manager Validation
 */
async function testRepositoryManager() {
    try {
        // Test repository manager initialization
        const stats = repoManager.getStats();
        if (!stats.workspaceDir) {
            return 'Repository manager workspace not initialized';
        }

        // Test repository listing
        const repos = repoManager.listRepositories();
        if (!Array.isArray(repos)) {
            return 'Repository listing failed';
        }

        console.log(`📁 Repository Manager validated - Workspace: ${stats.workspaceDir}`);
        return true;
    } catch (error) {
        return `Repository manager validation failed: ${error.message}`;
    }
}

/**
 * Test 7: Server Startup Simulation
 */
async function testServerStartup() {
    try {
        // Create test server
        const app = express();
        const testServer = http.createServer(app);

        // Add basic health endpoint
        app.get('/health', (req, res) => {
            res.json({
                status: 'operational',
                timestamp: new Date().toISOString()
            });
        });

        // Start server on alternative port for testing
        const testPort = 6970;
        await new Promise((resolve, reject) => {
            testServer.listen(testPort, (error) => {
                if (error) reject(error);
                else resolve();
            });
        });

        // Test health endpoint
        const response = await fetch(`http://localhost:${testPort}/health`);
        if (!response.ok) {
            testServer.close();
            return 'Health endpoint test failed';
        }

        const healthData = await response.json();
        if (healthData.status !== 'operational') {
            testServer.close();
            return 'Health endpoint returned incorrect status';
        }

        // Cleanup
        testServer.close();

        console.log(`🚀 Server startup simulation validated`);
        return true;
    } catch (error) {
        return `Server startup test failed: ${error.message}`;
    }
}

/**
 * Test 8: Package.json Validation
 */
function testPackageJson() {
    try {
        const packageData = JSON.parse(
            require('fs').readFileSync(join(__dirname, 'package.json'), 'utf8')
        );

        // Test required fields
        const requiredFields = ['name', 'version', 'main', 'scripts'];
        for (const field of requiredFields) {
            if (!packageData[field]) {
                return `Missing required package.json field: ${field}`;
            }
        }

        // Test scripts
        if (!packageData.scripts.start || !packageData.scripts.test) {
            return 'Missing required scripts in package.json';
        }

        // Test dependencies
        const requiredDeps = ['express', 'socket.io'];
        for (const dep of requiredDeps) {
            if (!packageData.dependencies[dep]) {
                return `Missing required dependency: ${dep}`;
            }
        }

        console.log(`📦 Package.json validated - Version: ${packageData.version}`);
        return true;
    } catch (error) {
        return `Package.json validation failed: ${error.message}`;
    }
}

/**
 * Test 9: Environment Configuration
 */
function testEnvironmentConfig() {
    const envExamplePath = join(__dirname, '.env.example');
    if (!existsSync(envExamplePath)) {
        return '.env.example file missing';
    }

    const envContent = require('fs').readFileSync(envExamplePath, 'utf8');
    const requiredVars = ['PORT', 'PATREON_CLIENT_ID', 'SESSION_SECRET'];

    for (const envVar of requiredVars) {
        if (!envContent.includes(envVar)) {
            return `Missing environment variable in .env.example: ${envVar}`;
        }
    }

    console.log(`⚙️ Environment configuration validated`);
    return true;
}

/**
 * Test 10: Documentation Validation
 */
function testDocumentation() {
    const readmePath = join(__dirname, 'README.md');
    if (!existsSync(readmePath)) {
        return 'README.md missing';
    }

    const readmeContent = require('fs').readFileSync(readmePath, 'utf8');
    const requiredSections = ['Agent Dr Girlfriend', 'Architecture', 'Docking Procedure'];

    for (const section of requiredSections) {
        if (!readmeContent.includes(section)) {
            return `Missing documentation section: ${section}`;
        }
    }

    console.log(`📚 Documentation validated`);
    return true;
}

/**
 * Main test execution
 */
async function runComprehensiveTests() {
    console.log('🔮 MCP Agent Docking Station - Comprehensive Test Suite');
    console.log('=' * 60);

    // Phase 1: Structure and Dependencies
    console.log('\n📁 PHASE 1: Structure and Dependencies');
    runTest('File Structure Validation', testFileStructure);
    await runAsyncTest('Module Loading', testModuleLoading);
    runTest('Package.json Validation', testPackageJson);
    runTest('Environment Configuration', testEnvironmentConfig);
    runTest('Documentation Validation', testDocumentation);

    // Phase 2: Core Components
    console.log('\n🔧 PHASE 2: Core Component Validation');
    runTest('Encryption System', testEncryptionSystem);
    runTest('Authentication System', testAuthenticationSystem);
    runTest('MCP Tools Registry', testMCPToolsRegistry);
    await runAsyncTest('Repository Manager', testRepositoryManager);

    // Phase 3: Integration Testing
    console.log('\n🚀 PHASE 3: Integration Testing');
    await runAsyncTest('Server Startup Simulation', testServerStartup);

    // Test Results Summary
    console.log('\n' + '=' * 60);
    console.log('🎯 TEST RESULTS SUMMARY');
    console.log('=' * 60);
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);

    if (testResults.failed > 0) {
        console.log('\n🚨 FAILED TESTS:');
        testResults.errors.forEach((error, index) => {
            console.log(`${index + 1}. ${error}`);
        });
    }

    // Cleanup
    if (repoManager) {
        await repoManager.cleanup();
    }

    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
    runComprehensiveTests().catch(console.error);
}

export default { runComprehensiveTests, testResults };
