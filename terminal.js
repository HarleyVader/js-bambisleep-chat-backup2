#!/usr/bin/env node

/**
 * Terminal Interface Launcher for BambiSleep Chat
 * Starts the application with HTOP-style terminal interface
 */

// Set environment variable for terminal UI mode
process.env.TERMINAL_UI = 'true';

// Import and run the boot script
import('./x-hypno-boot.js')
  .then(() => {
    console.log('🖥️  BambiSleep Chat Terminal Interface started');
  })
  .catch((error) => {
    console.error('❌ Failed to start terminal interface:', error.message);
    process.exit(1);
  });
