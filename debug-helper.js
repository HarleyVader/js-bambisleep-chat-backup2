/**
 * BambiSleep Chat Debug Helper
 * 
 * This script helps debug common issues with the BambiSleep Chat application.
 * It checks various parts of the application setup and provides fixes.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

// Setup helpers
const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

// Configuration
const SERVER_PORT = process.env.SERVER_PORT || 6970;
const MONGO_HOST = process.env.MONGO_HOST || 'localhost';
const MONGO_PORT = process.env.MONGO_PORT || 27018;
const MONGO_USER = process.env.MONGO_USER || 'bambisleep';
const MONGO_PASSWORD = process.env.MONGO_PASSWORD || 'bambiAppPass456';
const MONGODB_CONTAINER = process.env.MONGODB_CONTAINER_NAME || 'bambisleep-mongodb';

// Define color output for better visibility
const success = chalk.green;
const error = chalk.red;
const info = chalk.blue;
const warning = chalk.yellow;

console.log(info('=== BambiSleep Chat Debug Helper ==='));

// Function to check if required directories exist
async function checkDirectoryStructure() {
  console.log(info('\nChecking directory structure:'));
  
  const dirs = [
    'src/views',
    'src/public',
    'src/routes',
    'src/models',
    'src/config',
    'src/services',
    'src/utils',
    'src/workers'
  ];
  
  for (const dir of dirs) {
    const fullPath = path.join(__dirname, dir);
    try {
      await fs.promises.access(fullPath);
      console.log(success(`✓ ${dir} exists`));
    } catch (err) {
      console.log(error(`✗ ${dir} does not exist`));
    }
  }
}

// Function to check MongoDB container
async function checkMongoContainer() {
  console.log(info('\nChecking MongoDB container:'));
  
  try {
    const { stdout } = await execAsync('docker ps');
    
    if (stdout.includes(MONGODB_CONTAINER)) {
      console.log(success(`✓ MongoDB container '${MONGODB_CONTAINER}' is running`));
      return true;
    } else {
      console.log(error(`✗ MongoDB container '${MONGODB_CONTAINER}' is not running`));
      
      // Try to start it
      console.log(info('Attempting to start MongoDB container...'));
      try {
        await execAsync('docker-compose up -d mongodb');
        console.log(success('Started MongoDB container'));
        return true;
      } catch (startErr) {
        console.log(error(`Failed to start MongoDB container: ${startErr.message}`));
        return false;
      }
    }
  } catch (err) {
    console.log(error(`Error checking Docker: ${err.message}`));
    return false;
  }
}

// Function to test MongoDB connection
async function testMongoConnection() {
  console.log(info('\nTesting MongoDB connection:'));
  
  const connectionString = `mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/profilesDB?authSource=admin`;
  console.log(info(`Connecting to: ${connectionString.replace(/:[^:]*@/, ':****@')}`));
  
  try {
    const connection = await mongoose.connect(connectionString);
    console.log(success('✓ Successfully connected to MongoDB'));
    
    // Check for collections
    const collections = await connection.connection.db.listCollections().toArray();
    console.log(success(`✓ Found ${collections.length} collections`));
    
    if (collections.length === 0) {
      console.log(warning('⚠ No collections found. Database might be empty.'));
    } else {
      console.log(info('Collections:'));
      collections.forEach(collection => {
        console.log(info(`  - ${collection.name}`));
      });
    }
    
    await mongoose.disconnect();
    return true;
  } catch (err) {
    console.log(error(`✗ Failed to connect to MongoDB: ${err.message}`));
    return false;
  }
}

// Function to check for view engine configuration
async function checkViewEngine() {
  console.log(info('\nChecking view engine configuration:'));
  
  const serverFilePath = path.join(__dirname, 'src', 'server.js');
  
  try {
    const content = await fs.promises.readFile(serverFilePath, 'utf8');
    
    if (content.includes("app.set('view engine'")) {
      console.log(success('✓ View engine is configured'));
      return true;
    } else {
      console.log(error('✗ View engine configuration is missing'));
      
      console.log(info('Recommended fix:'));
      console.log(info(`
  // Add near the beginning of your Express app setup (after app is created)
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
      `));
      
      return false;
    }
  } catch (err) {
    console.log(error(`Error reading server.js: ${err.message}`));
    return false;
  }
}

// Function to check port availability
async function checkPortAvailability() {
  console.log(info(`\nChecking if port ${SERVER_PORT} is available:`));
  
  try {
    const { stdout } = await execAsync(`netstat -ano | findstr :${SERVER_PORT}`);
    
    if (stdout.trim()) {
      console.log(error(`✗ Port ${SERVER_PORT} is already in use`));
      console.log(info('Process using this port:'));
      console.log(info(stdout));
      return false;
    } else {
      console.log(success(`✓ Port ${SERVER_PORT} is available`));
      return true;
    }
  } catch (err) {
    // If command fails because nothing is using the port, that's good
    console.log(success(`✓ Port ${SERVER_PORT} is available`));
    return true;
  }
}

// Function to check package dependencies
async function checkDependencies() {
  console.log(info('\nChecking package dependencies:'));
  
  const requiredPackages = [
    'express', 'mongoose', 'socket.io', 'ejs', 
    'dotenv', 'cors', 'nodemon'
  ];
  
  try {
    const packageJsonPath = path.join(__dirname, 'package.json');
    const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    let allPresent = true;
    
    for (const pkg of requiredPackages) {
      if (dependencies[pkg]) {
        console.log(success(`✓ ${pkg} is installed (${dependencies[pkg]})`));
      } else {
        console.log(error(`✗ ${pkg} is missing`));
        allPresent = false;
      }
    }
    
    return allPresent;
  } catch (err) {
    console.log(error(`Error checking package.json: ${err.message}`));
    return false;
  }
}

// Function to check .env file
async function checkEnvFile() {
  console.log(info('\nChecking .env file configuration:'));
  
  const requiredVars = [
    'SERVER_PORT',
    'MONGODB_URI',
    'MONGODB_PROFILES',
    'MONGODB_CHAT',
    'MONGODB_AIGF_LOGS'
  ];
  
  let allPresent = true;
  
  for (const variable of requiredVars) {
    if (process.env[variable]) {
      console.log(success(`✓ ${variable} is set`));
    } else {
      console.log(error(`✗ ${variable} is missing`));
      allPresent = false;
    }
  }
  
  return allPresent;
}

// Main function to run all checks
async function runDiagnostics() {
  await checkDirectoryStructure();
  const mongoRunning = await checkMongoContainer();
  
  if (mongoRunning) {
    await testMongoConnection();
  }
  
  await checkViewEngine();
  await checkPortAvailability();
  await checkDependencies();
  await checkEnvFile();
  
  console.log(info('\n=== Debug Summary ==='));
  console.log(info('To start the application in debug mode:'));
  console.log(info('1. Make sure MongoDB container is running'));
  console.log(info('2. Use one of these commands:'));
  console.log(info('   - npm run debug       # Normal debug mode'));
  console.log(info('   - npm run debug:break # Debug with initial breakpoint'));
  console.log(info('3. Connect with VS Code debugger or Chrome DevTools'));
  
  console.log(info('\nTo fix "No default engine" error:'));
  console.log(info('Add the following to server.js after creating the Express app:'));
  console.log(info(`
  // Set up view engine
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  `));
}

runDiagnostics().catch(console.error);
