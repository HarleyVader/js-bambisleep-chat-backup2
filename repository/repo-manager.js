#!/usr/bin/env node
/**
 * Repository Manager - MCP Agent Docking Station
 * Manages GitHub repositories using isolated worker threads
 * Prevents interference with main server operations
 */

import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

import EventEmitter from 'events';
import { Worker } from 'worker_threads';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class RepositoryManager extends EventEmitter {
    constructor(options = {}) {
        super();

        this.workspaceDir = options.workspaceDir || join(__dirname, '..', 'repo-workspace');
        this.maxWorkers = options.maxWorkers || 3;
        this.workerTimeout = options.workerTimeout || 300000; // 5 minutes

        this.activeWorkers = new Map();
        this.repositories = new Map();
        this.workerQueue = [];

        // Ensure workspace directory exists
        if (!existsSync(this.workspaceDir)) {
            mkdirSync(this.workspaceDir, { recursive: true });
        }

        // Load existing repositories
        this.scanExistingRepositories();

        console.log(`📁 Repository Manager initialized`);
        console.log(`📂 Workspace: ${this.workspaceDir}`);
        console.log(`⚡ Max Workers: ${this.maxWorkers}`);
    }

    /**
     * Scan for existing repositories in workspace
     */
    scanExistingRepositories() {
        try {
            const dirs = readdirSync(this.workspaceDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            for (const dir of dirs) {
                const manifestPath = join(this.workspaceDir, dir, '.mcp-isolation.json');
                if (existsSync(manifestPath)) {
                    try {
                        const manifest = JSON.parse(
                            require('fs').readFileSync(manifestPath, 'utf8')
                        );

                        this.repositories.set(dir, {
                            ...manifest,
                            status: 'loaded',
                            lastAccessed: new Date().toISOString()
                        });

                        console.log(`📦 Found existing repo: ${dir}`);
                    } catch (error) {
                        console.error(`❌ Failed to read manifest for ${dir}:`, error.message);
                    }
                }
            }

            console.log(`📊 Loaded ${this.repositories.size} existing repositories`);
        } catch (error) {
            console.error('❌ Failed to scan repositories:', error.message);
        }
    }

    /**
     * Clone a GitHub repository
     */
    async cloneRepository(repoUrl, options = {}) {
        const repoId = this.generateRepoId(repoUrl);

        if (this.repositories.has(repoId)) {
            throw new Error(`Repository ${repoId} already exists`);
        }

        console.log(`🔄 Cloning repository: ${repoUrl} as ${repoId}`);

        const config = {
            depth: options.depth || 1,
            branch: options.branch || 'main',
            isolated: true,
            ...options
        };

        const result = await this.executeWorkerAction('clone', {
            repoUrl,
            repoId,
            workspaceDir: this.workspaceDir,
            config
        });

        if (result.success) {
            this.repositories.set(repoId, {
                ...result.manifest,
                status: 'cloned',
                lastAccessed: new Date().toISOString()
            });

            this.emit('repository-cloned', { repoId, repoUrl, manifest: result.manifest });
        }

        return result;
    }

    /**
     * Install dependencies for a repository
     */
    async installDependencies(repoId, options = {}) {
        if (!this.repositories.has(repoId)) {
            throw new Error(`Repository ${repoId} not found`);
        }

        console.log(`📦 Installing dependencies for: ${repoId}`);

        const result = await this.executeWorkerAction('install', {
            repoId,
            workspaceDir: this.workspaceDir,
            config: options
        });

        if (result.success) {
            const repo = this.repositories.get(repoId);
            repo.dependenciesInstalled = true;
            repo.lastDependencyInstall = new Date().toISOString();
            repo.status = 'ready';

            this.emit('dependencies-installed', { repoId, packageManager: result.packageManager });
        }

        return result;
    }

    /**
     * Update a repository
     */
    async updateRepository(repoId) {
        if (!this.repositories.has(repoId)) {
            throw new Error(`Repository ${repoId} not found`);
        }

        console.log(`🔄 Updating repository: ${repoId}`);

        const result = await this.executeWorkerAction('update', {
            repoId,
            workspaceDir: this.workspaceDir
        });

        if (result.success) {
            const repo = this.repositories.get(repoId);
            repo.lastUpdated = new Date().toISOString();
            repo.status = 'updated';

            this.emit('repository-updated', { repoId });
        }

        return result;
    }

    /**
     * Run a repository
     */
    async runRepository(repoId, options = {}) {
        if (!this.repositories.has(repoId)) {
            throw new Error(`Repository ${repoId} not found`);
        }

        console.log(`🚀 Starting repository: ${repoId}`);

        const result = await this.executeWorkerAction('run', {
            repoId,
            workspaceDir: this.workspaceDir,
            config: options
        });

        if (result.success) {
            const repo = this.repositories.get(repoId);
            repo.status = 'running';
            repo.lastStarted = new Date().toISOString();
            repo.processId = result.processId;

            this.emit('repository-started', { repoId, processId: result.processId });
        }

        return result;
    }

    /**
     * Stop a running repository
     */
    async stopRepository(repoId) {
        if (!this.repositories.has(repoId)) {
            throw new Error(`Repository ${repoId} not found`);
        }

        console.log(`🛑 Stopping repository: ${repoId}`);

        const result = await this.executeWorkerAction('stop', {
            repoId,
            workspaceDir: this.workspaceDir
        });

        if (result.success) {
            const repo = this.repositories.get(repoId);
            repo.status = 'stopped';
            repo.lastStopped = new Date().toISOString();
            repo.processId = null;

            this.emit('repository-stopped', { repoId });
        }

        return result;
    }

    /**
     * Unload and remove a repository
     */
    async unloadRepository(repoId) {
        if (!this.repositories.has(repoId)) {
            throw new Error(`Repository ${repoId} not found`);
        }

        console.log(`🗑️ Unloading repository: ${repoId}`);

        const result = await this.executeWorkerAction('unload', {
            repoId,
            workspaceDir: this.workspaceDir
        });

        if (result.success) {
            this.repositories.delete(repoId);
            this.emit('repository-unloaded', { repoId });
        }

        return result;
    }

    /**
     * Get repository status
     */
    async getRepositoryStatus(repoId) {
        if (!this.repositories.has(repoId)) {
            throw new Error(`Repository ${repoId} not found`);
        }

        const result = await this.executeWorkerAction('status', {
            repoId,
            workspaceDir: this.workspaceDir
        });

        if (result.success) {
            const repo = this.repositories.get(repoId);
            repo.lastAccessed = new Date().toISOString();

            return {
                ...result.status,
                managerInfo: repo
            };
        }

        return result;
    }

    /**
     * List all repositories
     */
    listRepositories() {
        return Array.from(this.repositories.entries()).map(([id, info]) => ({
            id,
            ...info
        }));
    }

    /**
     * Execute worker action with proper isolation
     */
    async executeWorkerAction(action, data) {
        return new Promise((resolve, reject) => {
            const workerId = `${action}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            console.log(`⚡ Starting worker ${workerId} for action: ${action}`);

            const worker = new Worker(join(__dirname, 'workers', 'repo-worker.js'), {
                workerData: { action, ...data }
            });

            this.activeWorkers.set(workerId, worker);

            // Set timeout
            const timeout = setTimeout(() => {
                worker.terminate();
                this.activeWorkers.delete(workerId);
                reject(new Error(`Worker timeout for action: ${action}`));
            }, this.workerTimeout);

            worker.on('message', (result) => {
                clearTimeout(timeout);
                this.activeWorkers.delete(workerId);

                console.log(`✅ Worker ${workerId} completed: ${result.success ? 'SUCCESS' : 'FAILED'}`);

                if (result.success) {
                    resolve(result);
                } else {
                    reject(new Error(result.error));
                }
            });

            worker.on('error', (error) => {
                clearTimeout(timeout);
                this.activeWorkers.delete(workerId);

                console.error(`❌ Worker ${workerId} error:`, error);
                reject(error);
            });

            worker.on('exit', (code) => {
                clearTimeout(timeout);
                this.activeWorkers.delete(workerId);

                if (code !== 0) {
                    console.error(`❌ Worker ${workerId} exited with code: ${code}`);
                    reject(new Error(`Worker exited with code: ${code}`));
                }
            });
        });
    }

    /**
     * Generate repository ID from URL
     */
    generateRepoId(repoUrl) {
        // Extract owner/repo from GitHub URL
        const match = repoUrl.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
        if (match) {
            return `${match[1]}-${match[2]}`;
        }

        // Fallback to hash
        return `repo-${Buffer.from(repoUrl).toString('base64').slice(0, 10)}`;
    }

    /**
     * Cleanup all workers and resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up Repository Manager...');

        // Terminate all active workers
        for (const [workerId, worker] of this.activeWorkers) {
            console.log(`⏹️ Terminating worker: ${workerId}`);
            await worker.terminate();
        }

        this.activeWorkers.clear();
        this.repositories.clear();

        console.log('✅ Repository Manager cleanup complete');
    }

    /**
     * Get manager statistics
     */
    getStats() {
        return {
            totalRepositories: this.repositories.size,
            activeWorkers: this.activeWorkers.size,
            workspaceDir: this.workspaceDir,
            maxWorkers: this.maxWorkers,
            repositories: this.listRepositories()
        };
    }
}

export { RepositoryManager };
