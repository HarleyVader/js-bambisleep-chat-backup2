#!/usr/bin/env node
/**
 * Health endpoint test script
 */

import Logger from '../src/utils/logger.js';
import axios from 'axios';

const logger = new Logger('Health-Test');

async function testHealth() {
  try {
    logger.info('Testing health endpoint...');
    
    const response = await axios.get('http://localhost:6969/health/api', {
      timeout: 10000
    });
    
    logger.success('Health endpoint response:', response.data);
    
    if (response.data.status === 'healthy') {
      logger.success('Application is healthy');
      process.exit(0);
    } else {
      logger.warning('Application health check failed');
      process.exit(1);
    }
  } catch (error) {
    logger.error('Health test failed:', error.message);
    process.exit(1);
  }
}

testHealth();
