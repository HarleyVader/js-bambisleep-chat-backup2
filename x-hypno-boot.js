#!/usr/bin/env node

/**
 * BambiSleep Chat Boot Script for PM2
 * Entry point for PM2 process management with auto-deployment
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';

const execAsync = promisify(exec);

/**
 * Execute a command and return the result
 * @param {string} command - Command to execute
 * @param {string} description - Description for logging
 * @returns {Promise<string>} - Command output
 */
async function executeCommand(command, description) {
  console.log(`🔄 ${description}...`);
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr && !stderr.includes('warning')) {
      console.log(`⚠️  ${description} warnings:`, stderr.trim());
    }
    if (stdout.trim()) {
      console.log(`✅ ${description} completed:`, stdout.trim());
    } else {
      console.log(`✅ ${description} completed successfully`);
    }
    return stdout.trim();
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

/**
 * Get the hash of package.json content
 * @returns {string} - MD5 hash of package.json
 */
function getPackageJsonHash() {
  if (!existsSync('package.json')) {
    return '';
  }
  const content = readFileSync('package.json', 'utf8');
  return createHash('md5').update(content).digest('hex');
}

/**
 * Check if git repository has changes
 * @returns {Promise<boolean>} - True if there are changes
 */
async function hasGitChanges() {
  try {
    const { stdout } = await execAsync('git status --porcelain');
    return stdout.trim().length > 0;
  } catch (error) {
    console.log('⚠️  Could not check git status:', error.message);
    return false;
  }
}

/**
 * Auto-deployment sequence
 */
async function deployAndStart() {
  console.log('🚀 Starting BambiSleep Chat deployment sequence...');
  
  try {
    // Store original package.json hash
    const originalPackageHash = getPackageJsonHash();
    
    // Check git status before pulling
    const hasChanges = await hasGitChanges();
    if (hasChanges) {
      console.log('⚠️  Local changes detected. Stashing them before pull...');
      await executeCommand('git stash', 'Stashing local changes');
    }
    
    // Pull latest changes from git
    const gitOutput = await executeCommand('git pull origin MK-XI', 'Pulling latest changes');
    
    // Check if pull actually updated anything
    const isUpToDate = gitOutput.includes('Already up to date') || gitOutput.includes('Already up-to-date');
    
    if (isUpToDate) {
      console.log('📦 Repository is already up to date');
    } else {
      console.log('📦 New changes pulled from repository');
    }
    
    // Restore stashed changes if any
    if (hasChanges) {
      try {
        await executeCommand('git stash pop', 'Restoring local changes');
      } catch (error) {
        console.log('⚠️  Could not restore stashed changes (may have conflicts)');
      }
    }
    
    // Check if package.json changed
    const newPackageHash = getPackageJsonHash();
    const packageChanged = originalPackageHash !== newPackageHash;
    
    if (packageChanged || !isUpToDate) {
      console.log('📦 Package.json changes detected or new code pulled');
      await executeCommand('npm install', 'Installing/updating dependencies');
    } else {
      console.log('📦 No package.json changes detected, skipping npm install');
    }
    
    // Start the server
    console.log('🌟 Starting BambiSleep Chat server...');
    await import('./src/server.js');
    console.log('✅ BambiSleep Chat server started successfully via PM2');
    
  } catch (error) {
    console.error('💥 Deployment failed:', error.message);
    console.log('🔄 Attempting to start server anyway...');
    
    try {
      await import('./src/server.js');
      console.log('✅ BambiSleep Chat server started (despite deployment issues)');
    } catch (serverError) {
      console.error('💥 Failed to start BambiSleep Chat server:', serverError.message);
      process.exit(1);
    }
  }
}

// Start deployment sequence
deployAndStart();
