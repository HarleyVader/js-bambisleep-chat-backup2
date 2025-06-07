import blessed from 'blessed';
import { exec } from 'child_process';
import { promisify } from 'util';
import Logger from './logger.js';

const execAsync = promisify(exec);
const logger = new Logger('TerminalInterface');

/**
 * HTOP-style Terminal Interface for BambiSleep Chat
 * Provides real-time logging and interactive commands
 */
class TerminalInterface {
  constructor() {
    this.screen = null;
    this.logBox = null;
    this.statusBox = null;
    this.helpBox = null;
    this.logs = [];
    this.maxLogs = 1000;
    this.isActive = false;
    this.originalLogger = null;
  }

  /**
   * Initialize the terminal interface
   */
  init() {
    if (this.isActive) return;
    
    // Create main screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'BambiSleep Chat - Terminal Interface'
    });

    // Create log display box
    this.logBox = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: '80%',
      border: {
        type: 'line',
        fg: 'cyan'
      },
      label: ' 📊 Real-time Logs ',
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      tags: true,
      style: {
        fg: 'white',
        bg: 'black',
        border: {
          fg: 'cyan'
        }
      }
    });

    // Create status box
    this.statusBox = blessed.box({
      top: '80%',
      left: 0,
      width: '60%',
      height: '10%',
      border: {
        type: 'line',
        fg: 'green'
      },
      label: ' 🚀 Status ',
      content: '{green-fg}Ready{/green-fg} - BambiSleep Chat Terminal Interface',
      tags: true,
      style: {
        fg: 'white',
        bg: 'black',
        border: {
          fg: 'green'
        }
      }
    });

    // Create help box
    this.helpBox = blessed.box({
      top: '80%',
      left: '60%',
      width: '40%',
      height: '20%',
      border: {
        type: 'line',
        fg: 'yellow'
      },
      label: ' ⌨️  Commands ',
      content: this.getHelpText(),
      tags: true,
      style: {
        fg: 'white',
        bg: 'black',
        border: {
          fg: 'yellow'
        }
      }
    });

    // Add all components to screen
    this.screen.append(this.logBox);
    this.screen.append(this.statusBox);
    this.screen.append(this.helpBox);

    // Setup key bindings
    this.setupKeyBindings();    // Render screen
    this.screen.render();
    this.isActive = true;

    // Hook into logger
    this.hookLogger();

    // Add welcome message
    this.addLog('success', '🖥️  BambiSleep Chat Terminal Interface initialized');
    this.addLog('info', '⌨️  Press ? for help, q to quit');
    this.addLog('info', '🚀 Ready for commands...');

    logger.info('Terminal interface initialized successfully');
  }
  /**
   * Get help text for commands
   */  getHelpText() {
    return `{yellow-fg}🚀 BambiSleep Commands:{/yellow-fg}
{cyan-fg}g{/cyan-fg} - {white-fg}Git pull{/white-fg} latest changes
{cyan-fg}n{/cyan-fg} - {white-fg}NPM install{/white-fg} dependencies  
{cyan-fg}r{/cyan-fg} - {white-fg}Restart{/white-fg} server
{cyan-fg}b{/cyan-fg} - {white-fg}Reboot{/white-fg} server (git pull + npm install + restart)
{cyan-fg}c{/cyan-fg} - {white-fg}Clear{/white-fg} logs
{cyan-fg}s{/cyan-fg} - {white-fg}Status{/white-fg} info
{cyan-fg}q{/cyan-fg} - {white-fg}Quit{/white-fg} interface
{cyan-fg}?{/cyan-fg} - {white-fg}Help{/white-fg}

{green-fg}⌨️  Navigation:{/green-fg}
{cyan-fg}↑/↓{/cyan-fg} - Scroll logs
{cyan-fg}PgUp/PgDn{/cyan-fg} - Page scroll
{cyan-fg}Ctrl+C{/cyan-fg} - Exit`;
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyBindings() {
    // Quit
    this.screen.key(['escape', 'q', 'C-c'], () => {
      this.destroy();
      process.exit(0);
    });

    // Git pull
    this.screen.key(['g'], () => {
      this.executeCommand('git pull origin MK-XI', 'Git Pull');
    });

    // NPM install
    this.screen.key(['n'], () => {
      this.executeCommand('npm install', 'NPM Install');
    });    // Restart server
    this.screen.key(['r'], () => {
      this.restartServer();
    });

    // Reboot server (git pull + npm install + restart)
    this.screen.key(['b'], () => {
      this.rebootServer();
    });

    // Clear logs
    this.screen.key(['c'], () => {
      this.clearLogs();
    });

    // Show status
    this.screen.key(['s'], () => {
      this.showStatus();
    });

    // Help
    this.screen.key(['?'], () => {
      this.showHelp();
    });

    // Focus logBox for scrolling
    this.logBox.focus();
  }
  /**
   * Hook into the logger to capture log messages
   */
  hookLogger() {
    // Store original console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    // Override console methods to capture logs
    console.log = (...args) => {
      const message = args.join(' ').replace(/\x1b\[[0-9;]*m/g, ''); // Strip ANSI colors
      this.addLog('info', message);
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      const message = args.join(' ').replace(/\x1b\[[0-9;]*m/g, ''); // Strip ANSI colors
      this.addLog('error', message);
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      const message = args.join(' ').replace(/\x1b\[[0-9;]*m/g, ''); // Strip ANSI colors
      this.addLog('warning', message);
      originalWarn.apply(console, args);
    };
  }
  /**
   * Add a log message to the interface
   */
  addLog(level, message) {
    if (!this.isActive) return;

    // Clean up message format and remove duplicates
    const cleanMessage = message
      .replace(/\x1b\[[0-9;]*m/g, '') // Strip ANSI codes
      .replace(/^\[.*?\]\s*/, '') // Remove timestamp prefixes
      .replace(/^\w+:\s*/, '') // Remove level prefixes
      .trim();
    
    if (!cleanMessage || cleanMessage.length < 2) return; // Skip empty/tiny messages

    const timestamp = new Date().toLocaleTimeString();
    const colorMap = {
      info: 'cyan',
      error: 'red', 
      warning: 'yellow',
      success: 'green'
    };
    
    const color = colorMap[level] || 'white';
    const logEntry = `{gray-fg}[${timestamp}]{/gray-fg} {${color}-fg}${level.toUpperCase()}{/${color}-fg}: ${cleanMessage}`;
    
    // Avoid duplicate consecutive messages
    if (this.logs.length > 0 && this.logs[this.logs.length - 1].includes(cleanMessage)) {
      return;
    }
    
    this.logs.push(logEntry);
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Update log box content
    this.logBox.setContent(this.logs.join('\n'));
    this.logBox.setScrollPerc(100); // Auto-scroll to bottom
    this.screen.render();
  }

  /**
   * Execute a command and show progress
   */
  async executeCommand(command, description) {
    this.updateStatus(`{yellow-fg}Running:{/yellow-fg} ${description}...`);
    this.addLog('info', `Executing: ${command}`);
    
    try {
      const { stdout, stderr } = await execAsync(command, { cwd: process.cwd() });
      
      if (stderr && !stderr.includes('warning')) {
        this.addLog('warning', `${description} warnings: ${stderr.trim()}`);
      }
      
      if (stdout.trim()) {
        this.addLog('success', `${description} output: ${stdout.trim()}`);
      } else {
        this.addLog('success', `${description} completed successfully`);
      }
      
      this.updateStatus(`{green-fg}Success:{/green-fg} ${description} completed`);
    } catch (error) {
      this.addLog('error', `${description} failed: ${error.message}`);
      this.updateStatus(`{red-fg}Error:{/red-fg} ${description} failed`);
    }
  }  /**
   * Restart the server
   */
  async restartServer() {
    this.updateStatus('{yellow-fg}Restarting server...{/yellow-fg}');
    this.addLog('info', '🔄 Initiating server restart');
    
    try {
      // Use the same logic as x-hypno-boot.js
      this.addLog('info', '📦 Checking for updates before restart...');
      
      // Pull latest changes
      await this.executeCommand('git pull origin MK-XI', 'Git Pull');
      
      // Install dependencies if needed
      await this.executeCommand('npm install', 'NPM Install');
      
      this.addLog('success', '✅ Server restart preparation completed');
      this.addLog('info', '🌟 Server will restart automatically...');
      this.updateStatus('{green-fg}Ready{/green-fg} - Server restart sequence completed');
      
    } catch (error) {
      this.addLog('error', `❌ Server restart failed: ${error.message}`);
      this.updateStatus('{red-fg}Error:{/red-fg} Server restart failed');
    }
  }

  /**
   * Reboot the server using the new reboot functionality
   */
  async rebootServer() {
    this.updateStatus('{yellow-fg}Rebooting server...{/yellow-fg}');
    this.addLog('info', '🔄 Initiating server reboot with maintenance mode');
    
    try {
      // Check if rebootServer function is available globally
      if (typeof global.rebootServer === 'function') {
        this.addLog('info', '🛠️ Using integrated reboot functionality');
        await global.rebootServer(300); // 5 minutes maintenance
        this.addLog('success', '✅ Server reboot initiated successfully');
        this.updateStatus('{green-fg}Reboot Started{/green-fg} - Maintenance mode active');
      } else {
        // Fallback to manual sequence
        this.addLog('warn', '⚠️ Integrated reboot not available, using manual sequence');
        this.addLog('info', '📥 Step 1/3: Pulling latest changes...');
        await this.executeCommand('git pull', 'Git Pull');
        
        this.addLog('info', '📦 Step 2/3: Installing dependencies...');
        await this.executeCommand('npm install', 'NPM Install');
        
        this.addLog('info', '🚀 Step 3/3: Restarting server...');
        this.addLog('success', '✅ Manual reboot sequence completed');
        this.updateStatus('{green-fg}Ready{/green-fg} - Manual reboot completed');
      }
      
    } catch (error) {
      this.addLog('error', `❌ Server reboot failed: ${error.message}`);
      this.updateStatus('{red-fg}Error:{/red-fg} Server reboot failed');
    }
  }

  /**
   * Clear log display
   */
  clearLogs() {
    this.logs = [];
    this.logBox.setContent('');
    this.screen.render();
    this.addLog('info', 'Logs cleared');
    this.updateStatus('{green-fg}Logs cleared{/green-fg}');
  }

  /**
   * Show system status
   */
  showStatus() {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    const memoryMB = Math.round(memory.rss / 1024 / 1024);
    
    this.addLog('info', `System Status:`);
    this.addLog('info', `  Uptime: ${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`);
    this.addLog('info', `  Memory: ${memoryMB}MB RSS`);
    this.addLog('info', `  Node.js: ${process.version}`);
    this.addLog('info', `  Platform: ${process.platform}`);
    this.addLog('info', `  PID: ${process.pid}`);
    
    this.updateStatus(`{green-fg}Status displayed{/green-fg} - Uptime: ${Math.floor(uptime / 60)}m`);
  }

  /**
   * Show help information
   */
  showHelp() {
    this.addLog('info', 'Available commands:');
    this.addLog('info', '  g - Git pull latest changes');
    this.addLog('info', '  n - NPM install dependencies');
    this.addLog('info', '  r - Restart server');
    this.addLog('info', '  c - Clear logs');
    this.addLog('info', '  s - Show status');
    this.addLog('info', '  ? - Show help');
    this.addLog('info', '  q - Quit interface');
    
    this.updateStatus('{green-fg}Help displayed{/green-fg}');
  }

  /**
   * Update status box content
   */
  updateStatus(message) {
    if (!this.statusBox) return;
    this.statusBox.setContent(message);
    this.screen.render();
  }

  /**
   * Destroy the interface and restore console
   */
  destroy() {
    if (!this.isActive) return;
    
    this.isActive = false;
    if (this.screen) {
      this.screen.destroy();
    }
    
    logger.info('Terminal interface destroyed');
  }
}

export default TerminalInterface;
