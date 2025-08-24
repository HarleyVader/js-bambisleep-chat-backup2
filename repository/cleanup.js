#!/usr/bin/env node
/**
 * Codebase Cleanup Script - MCP Agent Docking Station
 * Automated cleanup for development and production environments
 */

import { existsSync, rmSync } from 'fs';

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧹 MCP Agent Docking Station - Codebase Cleanup\n');

const cleanupTasks = [
    {
        name: 'Repository Workspaces',
        paths: [
            'repo-workspace',
            'test-repo-workspace'
        ],
        description: 'Removes isolated repository workspaces'
    },
    {
        name: 'Cache Directories',
        paths: [
            '.npm-cache',
            'node_modules/.cache'
        ],
        description: 'Removes npm and build caches'
    },
    {
        name: 'Temporary Files',
        paths: [
            '*.tmp',
            '*.log',
            '.mcp-isolation.json'
        ],
        description: 'Removes temporary and isolation files'
    }
];

function cleanupDirectory(path) {
    const fullPath = join(__dirname, '..', path);
    if (existsSync(fullPath)) {
        try {
            rmSync(fullPath, { recursive: true, force: true });
            console.log(`  ✅ Removed: ${path}`);
            return true;
        } catch (error) {
            console.log(`  ❌ Failed to remove ${path}: ${error.message}`);
            return false;
        }
    } else {
        console.log(`  ⏭️  Not found: ${path}`);
        return true;
    }
}

async function runCleanup() {
    let totalCleaned = 0;
    let totalErrors = 0;

    for (const task of cleanupTasks) {
        console.log(`🔄 ${task.name}:`);
        console.log(`   ${task.description}`);

        for (const path of task.paths) {
            const success = cleanupDirectory(path);
            if (success) {
                totalCleaned++;
            } else {
                totalErrors++;
            }
        }
        console.log('');
    }

    // Summary
    console.log('📊 Cleanup Summary:');
    console.log(`   ✅ Items cleaned: ${totalCleaned}`);
    console.log(`   ❌ Errors: ${totalErrors}`);
    console.log(`   🧹 Status: ${totalErrors === 0 ? 'Complete' : 'Partial'}`);

    if (totalErrors === 0) {
        console.log('\n💖 Codebase cleanup completed successfully!');
        console.log('🔮 MCP Agent Docking Station is ready for deployment!');
    } else {
        console.log('\n⚠️  Some items could not be cleaned. Check permissions and try again.');
    }
}

// Run cleanup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runCleanup().catch(console.error);
}

export { runCleanup };
