#!/usr/bin/env node
/**
 * Initial setup script for BambiSleep.Chat
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from '../src/utils/logger.js';

const logger = new Logger('Setup');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function createEnvFile() {
  const envPath = path.join(rootDir, '.env');
  
  try {
    await fs.access(envPath);
    logger.info('.env file already exists');
  } catch {
    logger.info('Creating .env file...');
    
    const envTemplate = `# BambiSleep.Chat Configuration
NODE_ENV=development
SERVER_PORT=6969

# MongoDB Configuration
MONGODB_URI=mongodb://bambisleep:bambiAppPass456@localhost:27017/profilesDB?authSource=admin

# LMStudio Configuration
KOKORO_HOST=localhost
KOKORO_PORT=8880
KOKORO_API_URL=http://localhost:8880/v1

# Socket.io Configuration  
SOCKET_PING_TIMEOUT=86400000
SOCKET_PING_INTERVAL=25000

# Application Configuration
ALLOWED_ORIGINS=https://bambisleep.chat,http://localhost:6969
WORKER_TIMEOUT=60000
LOG_LEVEL=info

# Security
GIT_WEBHOOK_SECRET=your-webhook-secret-here
`;

    await fs.writeFile(envPath, envTemplate);
    logger.success('.env file created successfully');
  }
}

async function createDirectories() {
  const dirs = [
    'logs',
    'uploads',
    'temp'
  ];
  
  for (const dir of dirs) {
    const dirPath = path.join(rootDir, dir);
    try {
      await fs.mkdir(dirPath, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    } catch (error) {
      logger.warning(`Failed to create directory ${dir}: ${error.message}`);
    }
  }
}

async function setup() {
  try {
    logger.info('Setting up BambiSleep.Chat...');
    
    await createEnvFile();
    await createDirectories();
    
    logger.success('Setup completed successfully!');
    logger.info('Next steps:');
    logger.info('1. Update the .env file with your configuration');
    logger.info('2. Start MongoDB with Docker: docker-compose up -d mongodb');
    logger.info('3. Run the application: npm start');
    
  } catch (error) {
    logger.error('Setup failed:', error.message);
    process.exit(1);
  }
}

setup();
