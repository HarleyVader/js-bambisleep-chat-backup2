#!/usr/bin/env node

/**
 * BambiSleep Chat Boot Script for PM2
 * Entry point for PM2 process management
 */

// Import the main server
import('./src/server.js')
  .then(() => {
    console.log('BambiSleep Chat server started successfully via PM2');
  })
  .catch((error) => {
    console.error('Failed to start BambiSleep Chat server:', error);
    process.exit(1);
  });
