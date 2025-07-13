#!/usr/bin/env node
/**
 * Database connection test script
 */

import { connectToDatabase, checkAllDatabasesHealth } from '../src/config/db.js';
import Logger from '../src/utils/logger.js';

const logger = new Logger('DB-Test');

async function testDatabase() {
  try {
    logger.info('Testing database connection...');
    
    // Test main connection
    await connectToDatabase();
    logger.success('Main database connection successful');
    
    // Test all databases health
    const health = await checkAllDatabasesHealth();
    logger.info('Database health check:', health);
    
    process.exit(0);
  } catch (error) {
    logger.error('Database test failed:', error.message);
    process.exit(1);
  }
}

testDatabase();
