#!/usr/bin/env node
/**
 * Repository Worker Thread - MCP Agent Docking Station
 * Isolated worker for loading/unloading GitHub repositories
 * Prevents interference with main server package operations
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';

import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Load environment variables

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Worker thread execution
if (!isMainThread && parentPort) {
    const { action, repoUrl, repoId, workspaceDir, config } = workerData;

    try {
        switch (action) {
            case 'clone':
                await cloneRepository(repoUrl, repoId, workspaceDir, config);
                break;
            case 'update':
                await updateRepository(repoId, workspaceDir);
                break;
            case 'unload':
                await unloadRepository(repoId, workspaceDir);
                break;
            case 'install':
                await installDependencies(repoId, workspaceDir, config);
                break;
            case 'status':
                await getRepositoryStatus(repoId, workspaceDir);
                break;
            case 'run':
                await runRepository(repoId, workspaceDir, config);
                break;
            case 'stop':
                await stopRepository(repoId, workspaceDir);
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    } catch (error) {
        parentPort.postMessage({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
}

/**
 * Clone a GitHub repository to an isolated workspace
 */
async function cloneRepository(repoUrl, repoId, workspaceDir, config = {}) {
    const repoPath = join(workspaceDir, repoId);

    console.log(`🔄 [Worker] Cloning repository: ${repoUrl}`);

    // Ensure workspace directory exists
    if (!existsSync(workspaceDir)) {
        mkdirSync(workspaceDir, { recursive: true });
    }

    // Remove existing repo if it exists
    if (existsSync(repoPath)) {
        rmSync(repoPath, { recursive: true, force: true });
    }

    try {
        // Prepare authenticated clone URL for private repositories
        const githubToken = process.env.GITHUB_TOKEN;
        let authenticatedUrl = repoUrl;

        if (githubToken && repoUrl.includes('github.com')) {
            // Convert to authenticated URL for private repos
            authenticatedUrl = repoUrl.replace(
                'https://github.com/',
                `https://${githubToken}@github.com/`
            );
        }

        const cloneDepth = config.depth || 1;
        const branch = config.branch || 'main';

        const cloneCommand = `git clone --depth ${cloneDepth} --branch ${branch} ${authenticatedUrl} ${repoPath}`;

        execSync(cloneCommand, {
            stdio: 'inherit',
            cwd: workspaceDir,
            timeout: 60000,
            env: {
                ...process.env,
                GIT_TERMINAL_PROMPT: '0' // Disable interactive prompts
            }
        });

        // Create isolation manifest
        const manifest = {
            repoId,
            repoUrl: repoUrl, // Store original URL without token
            clonedAt: new Date().toISOString(),
            branch,
            depth: cloneDepth,
            isolated: true,
            authenticated: !!githubToken,
            packageManager: detectPackageManager(repoPath),
            framework: detectFramework(repoPath),
            nodeVersion: process.version
        };

        writeFileSync(
            join(repoPath, '.mcp-isolation.json'),
            JSON.stringify(manifest, null, 2)
        );

        parentPort.postMessage({
            success: true,
            action: 'clone',
            repoId,
            manifest,
            message: `Repository ${repoId} cloned successfully with GitHub authentication`
        });

    } catch (error) {
        parentPort.postMessage({
            success: false,
            action: 'clone',
            repoId,
            error: error.message
        });
    }
}

/**
 * Update an existing repository
 */
async function updateRepository(repoId, workspaceDir) {
    const repoPath = join(workspaceDir, repoId);

    if (!existsSync(repoPath)) {
        throw new Error(`Repository ${repoId} not found`);
    }

    try {
        // Pull latest changes
        execSync('git pull origin', {
            cwd: repoPath,
            stdio: 'inherit',
            timeout: 30000
        });

        // Update manifest
        const manifestPath = join(repoPath, '.mcp-isolation.json');
        if (existsSync(manifestPath)) {
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
            manifest.lastUpdated = new Date().toISOString();
            writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        }

        parentPort.postMessage({
            success: true,
            action: 'update',
            repoId,
            message: `Repository ${repoId} updated successfully`
        });

    } catch (error) {
        parentPort.postMessage({
            success: false,
            action: 'update',
            repoId,
            error: error.message
        });
    }
}

/**
 * Unload and remove a repository
 */
async function unloadRepository(repoId, workspaceDir) {
    const repoPath = join(workspaceDir, repoId);

    try {
        if (existsSync(repoPath)) {
            // Kill any running processes from this repo
            await killRepositoryProcesses(repoId);

            // Remove directory
            rmSync(repoPath, { recursive: true, force: true });
        }

        parentPort.postMessage({
            success: true,
            action: 'unload',
            repoId,
            message: `Repository ${repoId} unloaded successfully`
        });

    } catch (error) {
        parentPort.postMessage({
            success: false,
            action: 'unload',
            repoId,
            error: error.message
        });
    }
}

/**
 * Install dependencies in isolated environment
 */
async function installDependencies(repoId, workspaceDir, config = {}) {
    const repoPath = join(workspaceDir, repoId);

    if (!existsSync(repoPath)) {
        throw new Error(`Repository ${repoId} not found`);
    }

    try {
        const detectedPackageManager = detectPackageManager(repoPath);
        let packageManager = config.packageManager || detectedPackageManager;
        let installCommand;

        // Check if preferred package manager is available, fallback to npm
        const isPackageManagerAvailable = (pm) => {
            try {
                execSync(`${pm} --version`, { stdio: 'ignore' });
                return true;
            } catch {
                return false;
            }
        };

        // Fallback logic: prefer detected -> specified -> npm
        if (!isPackageManagerAvailable(packageManager)) {
            console.log(`⚠️ [Worker] ${packageManager} not available, falling back to npm`);
            packageManager = 'npm';
        }

        switch (packageManager) {
            case 'npm':
                installCommand = config.production ? 'npm ci --production' : 'npm install';
                break;
            case 'yarn':
                installCommand = config.production ? 'yarn install --production' : 'yarn install';
                break;
            case 'pnpm':
                installCommand = config.production ? 'pnpm install --prod' : 'pnpm install';
                break;
            default:
                installCommand = 'npm install';
                packageManager = 'npm';
        }

        console.log(`📦 [Worker] Installing dependencies with: ${installCommand}`);

        execSync(installCommand, {
            cwd: repoPath,
            stdio: 'inherit',
            timeout: 300000, // 5 minutes timeout
            env: {
                ...process.env,
                // Isolate npm cache to prevent conflicts
                NPM_CONFIG_CACHE: join(repoPath, '.npm-cache'),
                NODE_ENV: config.production ? 'production' : 'development'
            }
        });

        parentPort.postMessage({
            success: true,
            action: 'install',
            repoId,
            packageManager,
            message: `Dependencies installed for ${repoId} using ${packageManager}`
        });

    } catch (error) {
        parentPort.postMessage({
            success: false,
            action: 'install',
            repoId,
            error: error.message
        });
    }
}

/**
 * Get repository status and information
 */
async function getRepositoryStatus(repoId, workspaceDir) {
    const repoPath = join(workspaceDir, repoId);

    if (!existsSync(repoPath)) {
        parentPort.postMessage({
            success: false,
            action: 'status',
            repoId,
            error: 'Repository not found'
        });
        return;
    }

    try {
        // Get git status
        const gitStatus = execSync('git status --porcelain', {
            cwd: repoPath,
            encoding: 'utf8'
        });

        // Get current branch
        const currentBranch = execSync('git branch --show-current', {
            cwd: repoPath,
            encoding: 'utf8'
        }).trim();

        // Get last commit
        const lastCommit = execSync('git log -1 --format="%H %s %an %ad" --date=iso', {
            cwd: repoPath,
            encoding: 'utf8'
        }).trim();

        // Read manifest
        const manifestPath = join(repoPath, '.mcp-isolation.json');
        const manifest = existsSync(manifestPath)
            ? JSON.parse(readFileSync(manifestPath, 'utf8'))
            : null;

        // Check if dependencies are installed
        const hasNodeModules = existsSync(join(repoPath, 'node_modules'));
        const packageJsonExists = existsSync(join(repoPath, 'package.json'));

        parentPort.postMessage({
            success: true,
            action: 'status',
            repoId,
            status: {
                path: repoPath,
                gitStatus: gitStatus.trim(),
                currentBranch,
                lastCommit,
                hasNodeModules,
                packageJsonExists,
                manifest,
                isolated: true
            }
        });

    } catch (error) {
        parentPort.postMessage({
            success: false,
            action: 'status',
            repoId,
            error: error.message
        });
    }
}

/**
 * Detect package manager from repository
 */
function detectPackageManager(repoPath) {
    if (existsSync(join(repoPath, 'yarn.lock'))) return 'yarn';
    if (existsSync(join(repoPath, 'pnpm-lock.yaml'))) return 'pnpm';
    if (existsSync(join(repoPath, 'package-lock.json'))) return 'npm';
    return 'npm'; // default
}

/**
 * Detect framework from repository
 */
function detectFramework(repoPath) {
    const packageJsonPath = join(repoPath, 'package.json');

    if (!existsSync(packageJsonPath)) return 'unknown';

    try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

        if (deps.react || deps['@types/react']) return 'react';
        if (deps.vue || deps['@vue/cli']) return 'vue';
        if (deps.angular || deps['@angular/core']) return 'angular';
        if (deps.next || deps['next']) return 'nextjs';
        if (deps.express) return 'express';
        if (deps.fastify) return 'fastify';

        return 'nodejs';
    } catch {
        return 'unknown';
    }
}

/**
 * Run a cloned repository with appropriate start command
 */
async function runRepository(repoId, workspaceDir, config = {}) {
    const repoPath = join(workspaceDir, repoId);

    if (!existsSync(repoPath)) {
        throw new Error(`Repository ${repoId} not found`);
    }

    try {
        console.log(`🚀 [Worker] Starting repository: ${repoId}`);

        const manifest = getManifest(repoPath);
        if (!manifest) {
            throw new Error(`Repository ${repoId} manifest not found`);
        }

        // Check if dependencies are installed (only if package.json has dependencies)
        const packageJsonPath = join(repoPath, 'package.json');
        let hasDependencies = false;

        if (existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
            hasDependencies = (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) ||
                (packageJson.devDependencies && Object.keys(packageJson.devDependencies).length > 0);
        }

        const hasNodeModules = existsSync(join(repoPath, 'node_modules'));
        if (hasDependencies && !hasNodeModules && manifest.packageManager) {
            throw new Error(`Dependencies not installed. Run install first.`);
        }

        // Determine run command based on package.json
        let runCommand = config.command || 'start';
        let packageManager = config.packageManager || manifest.packageManager || 'npm';

        if (existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

            // Check for available scripts
            if (packageJson.scripts) {
                if (config.script && packageJson.scripts[config.script]) {
                    runCommand = config.script;
                } else if (packageJson.scripts.start) {
                    runCommand = 'start';
                } else if (packageJson.scripts.dev) {
                    runCommand = 'dev';
                } else if (packageJson.scripts.serve) {
                    runCommand = 'serve';
                } else {
                    throw new Error(`No suitable run script found. Available: ${Object.keys(packageJson.scripts).join(', ')}`);
                }
            }
        }

        // Build the command
        let command;
        switch (packageManager) {
            case 'npm':
                command = `npm run ${runCommand}`;
                break;
            case 'yarn':
                command = `yarn ${runCommand}`;
                break;
            case 'pnpm':
                command = `pnpm run ${runCommand}`;
                break;
            default:
                command = `npm run ${runCommand}`;
        }

        // Add environment variables if specified
        const env = { ...process.env };
        if (config.env) {
            Object.assign(env, config.env);
        }

        // Set port if specified
        if (config.port) {
            env.PORT = config.port.toString();
        }

        console.log(`🔧 [Worker] Executing: ${command}`);
        console.log(`📁 [Worker] Working directory: ${repoPath}`);

        // For background processes, we'll use spawn instead of execSync
        const { spawn } = await import('child_process');

        const child = spawn(command, [], {
            cwd: repoPath,
            env,
            shell: true,
            detached: config.detached || false,
            stdio: config.stdio || ['pipe', 'pipe', 'pipe']
        });

        // Store process info in manifest
        const updatedManifest = {
            ...manifest,
            status: 'running',
            lastStarted: new Date().toISOString(),
            processId: child.pid,
            command,
            port: config.port || null
        };

        writeFileSync(
            join(repoPath, '.mcp-isolation.json'),
            JSON.stringify(updatedManifest, null, 2)
        );

        // Handle process events
        child.on('error', (error) => {
            console.error(`❌ [Worker] Process error for ${repoId}:`, error.message);
        });

        child.on('exit', (code, signal) => {
            console.log(`🔄 [Worker] Process ${repoId} exited with code ${code}, signal ${signal}`);

            // Update manifest
            const exitManifest = {
                ...updatedManifest,
                status: 'stopped',
                lastStopped: new Date().toISOString(),
                exitCode: code,
                exitSignal: signal,
                processId: null
            };

            writeFileSync(
                join(repoPath, '.mcp-isolation.json'),
                JSON.stringify(exitManifest, null, 2)
            );
        });

        // If running in background mode, return immediately
        if (config.background) {
            parentPort.postMessage({
                success: true,
                action: 'run',
                repoId,
                manifest: updatedManifest,
                processId: child.pid,
                message: `Repository ${repoId} started in background (PID: ${child.pid})`
            });
            return;
        }

        // For non-background mode, wait a bit to see if it starts successfully
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                resolve();
            }, config.startupDelay || 3000);

            child.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });

            child.on('exit', (code) => {
                clearTimeout(timeout);
                if (code !== 0) {
                    reject(new Error(`Process exited with code ${code}`));
                } else {
                    resolve();
                }
            });
        });

        parentPort.postMessage({
            success: true,
            action: 'run',
            repoId,
            manifest: updatedManifest,
            processId: child.pid,
            message: `Repository ${repoId} started successfully (PID: ${child.pid})`
        });

    } catch (error) {
        parentPort.postMessage({
            success: false,
            action: 'run',
            repoId,
            error: error.message
        });
    }
}

/**
 * Stop a running repository
 */
async function stopRepository(repoId, workspaceDir) {
    const repoPath = join(workspaceDir, repoId);

    if (!existsSync(repoPath)) {
        throw new Error(`Repository ${repoId} not found`);
    }

    try {
        console.log(`🛑 [Worker] Stopping repository: ${repoId}`);

        const manifest = getManifest(repoPath);
        if (!manifest) {
            throw new Error(`Repository ${repoId} manifest not found`);
        }

        if (manifest.status !== 'running' || !manifest.processId) {
            parentPort.postMessage({
                success: true,
                action: 'stop',
                repoId,
                message: `Repository ${repoId} is not running`
            });
            return;
        }

        // Kill the process
        try {
            process.kill(manifest.processId, 'SIGTERM');

            // Wait a bit, then force kill if needed
            setTimeout(() => {
                try {
                    process.kill(manifest.processId, 'SIGKILL');
                } catch (e) {
                    // Process probably already dead
                }
            }, 5000);

        } catch (error) {
            // Process might already be dead
            console.log(`⚠️ [Worker] Process ${manifest.processId} already terminated`);
        }

        // Update manifest
        const updatedManifest = {
            ...manifest,
            status: 'stopped',
            lastStopped: new Date().toISOString(),
            processId: null
        };

        writeFileSync(
            join(repoPath, '.mcp-isolation.json'),
            JSON.stringify(updatedManifest, null, 2)
        );

        parentPort.postMessage({
            success: true,
            action: 'stop',
            repoId,
            manifest: updatedManifest,
            message: `Repository ${repoId} stopped successfully`
        });

    } catch (error) {
        parentPort.postMessage({
            success: false,
            action: 'stop',
            repoId,
            error: error.message
        });
    }
}

/**
 * Kill any running processes associated with a repository
 */
async function killRepositoryProcesses(repoId) {
    // This would be platform-specific process killing
    // For now, just a placeholder
    console.log(`🔪 [Worker] Killing processes for ${repoId}`);
}

/**
 * Get repository manifest
 */
function getManifest(repoPath) {
    const manifestPath = join(repoPath, '.mcp-isolation.json');
    if (!existsSync(manifestPath)) {
        return null;
    }
    try {
        return JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch {
        return null;
    }
}

export {
    cloneRepository,
    updateRepository,
    unloadRepository,
    installDependencies,
    getRepositoryStatus,
    runRepository,
    stopRepository
};
