import chalk from 'chalk';

// Define color patterns directly in logger.js
const colors = {
  primary: chalk.hex('#0c2a2ac9'),
  primaryAlt: chalk.hex('#15aab5ec'),
  secondary: chalk.hex('#40002f'),
  secondaryAlt: chalk.hex('#005d46'),
  tertiary: chalk.hex('#cc0174'),
  tertiaryAlt: chalk.hex('#01c69eae'),
  button: chalk.hex('#df0471'),
  buttonAlt: chalk.hex('#110000'),
  nav: chalk.hex('#0a2626'),
  navAlt: chalk.hex('#17dbd8'),
  transparent: chalk.hex('#ffffff00')
};

const patterns = {
  server: {
    info: chalk.hex('#005d46'),
    success: chalk.hex('#15aab5ec'),
    warning: chalk.hex('#cc0174'),
    error: chalk.hex('#df0471'),
  }
};

// Terminal interface integration
let terminalInterface = null;

/**
 * Enable terminal interface mode
 */
export function enableTerminalInterface() {
  try {
    // Dynamic import to avoid dependency if not used
    import('./terminalInterface.js').then(({ default: TerminalInterface }) => {
      terminalInterface = new TerminalInterface();
      terminalInterface.init();
    });
  } catch (error) {
    console.error('Failed to initialize terminal interface:', error.message);
  }
}

/**
 * Disable terminal interface mode
 */
export function disableTerminalInterface() {
  if (terminalInterface) {
    terminalInterface.destroy();
    terminalInterface = null;
  }
}

/**
 * Unified logging utility for bambisleep-chat with enhanced visual formatting
 * Uses contrasting colors for message text vs prefix and highlights important elements
 */
class Logger {
  constructor(moduleName) {
    this.moduleName = moduleName;
    
    // Create contrasting text colors (swapped for visual impact)
    this.textColors = {
      info: patterns.server.warning,    // Info text uses warning color
      success: patterns.server.error,   // Success text uses error color
      warning: patterns.server.info,    // Warning text uses info color
      error: patterns.server.success    // Error text uses success color
    };

    // Special formatting colors
    this.specialColors = {
      number: chalk.hex('#01c69eae'),       // Teal green for numbers - from tertiaryAlt
      socket: chalk.hex('#17dbd8'),         // Marine blue for socket IDs - from navAlt
      url: chalk.hex('#01c69eae'),          // Teal green for URLs - from tertiaryAlt
      bambi: chalk.hex('#ff9ce6'),          // Pink for bambi names
      worker: chalk.hex('#f7d56e')          // Gold for worker names
    };
    
    // Flags to control suppression of repetitive logs
    this.suppressTriggerUpdates = true;
    this.suppressConfigLogs = true;
    this.configLoggedOnce = false;
  }

  /**
   * Format the timestamp for log messages
   * @returns {string} Formatted timestamp [HH:MM:SS]
   */
  getTimestamp() {
    const now = new Date();
    return `[${now.toLocaleTimeString([], {hour12: false})}]`;
  }

  /**
   * Format the module prefix for log messages
   * @returns {string} Formatted module name
   */
  getModulePrefix() {
    return this.moduleName ? `[${this.moduleName}]` : '';
  }
  /**
   * Simplified message formatting
   */
  formatMessage(message) {
    return typeof message === 'string' ? message : String(message);
  }

  /**
   * Check if a message contains content that should be suppressed
   * @param {string} message - The message to check
   * @returns {boolean} True if message should be suppressed
   */
  shouldSuppressMessage(message) {
    if (typeof message !== 'string') return false;
    
    // Enhanced system controls update suppression
    if (message.includes('System controls updated for')) {
      // Store the last username we saw in a system control update
      const usernameMatch = message.match(/System controls updated for\s+([^\s,.:;]+(?:[\s-][^\s,.:;]+)*)/i);
      const username = usernameMatch ? usernameMatch[1] : null;
      
      if (username) {
        const lastUpdateKey = `lastSystemControlUpdate_${username}`;
        const now = Date.now();
        const lastUpdate = Logger[lastUpdateKey] || 0;
        
        // Only show system control updates once per 5 seconds per user
        if (now - lastUpdate < 5000) {
          return true;
        }
        
        // Update the timestamp for this user's system control updates
        Logger[lastUpdateKey] = now;
      }
    }
    
    // Enhanced check for trigger updates with module-level tracking and rate limiting
    if (this.suppressTriggerUpdates && 
       (message.includes('triggers updated') || message.includes('Trigger updated'))) {
      
      // Each module gets to show trigger updates once per 5 seconds
      const moduleKey = `triggerUpdated_${this.moduleName}`;
      const now = Date.now();
      const lastUpdate = Logger[moduleKey] || 0;
      
      if (now - lastUpdate < 5000) {
        return true;
      }
      
      // Update the timestamp for this module's trigger updates
      Logger[moduleKey] = now;
      return false;
    }
    
    // Suppress "Using existing MongoDB connection" messages - too spammy
    if (message.includes('Using existing MongoDB connection')) {
      return true;
    }
    
    // Check for config logs - more aggressive suppression
    if (this.suppressConfigLogs && 
       (message.toLowerCase().includes('config') || 
        message.toLowerCase().includes('configuration'))) {
      
      // Special case - always show server startup messages
      if (message.includes('===== SERVER STARTUP =====')) {
        return false;
      }
      
      // For config module specifically, only show the first config log
      if (this.moduleName === 'Config') {
        if (!Logger.configHasBeenLogged) {
          Logger.configHasBeenLogged = true;
          return false;
        }
        return true;
      }
      
      // For all other modules, suppress all config-related logs
      return true;
    }
    
    return false;
  }

  /**
   * Enhanced info logging that includes socket and user info when appropriate
   * @param {string} message - The message to log
   * @param {any} data - Optional data to log
   * @param {Object} context - Optional context with socket ID and username
   */
  info(message, data, context) {
    // Skip suppressed messages
    if (this.shouldSuppressMessage(message)) {
      return;
    }
    
    const timestamp = this.getTimestamp();
    const prefix = this.getModulePrefix();
    
    // Extract context information if available
    let contextInfo = '';
    if (context) {
      if (context.socketId) {
        contextInfo += ` [Socket: ${this.specialColors.socket(context.socketId)}]`;
      }
      if (context.username) {
        contextInfo += ` [User: ${this.specialColors.bambi(context.username)}]`;
      }
    }
    
    console.log(
      patterns.server.info(`${timestamp} ${prefix}${contextInfo} INFO:`), 
      this.textColors.info(this.formatMessage(message)), 
      data ? this.formatMessage(data) : ''
    );
  }

  /**
   * Log config information once at server startup
   * @param {string} message - The message to log
   * @param {any} configData - The configuration data
   */
  logConfig(message, configData) {
    // If config has already been logged globally, don't log again
    if (Logger.configHasBeenLogged && this.suppressConfigLogs) {
      return;
    }
    
    const timestamp = this.getTimestamp();
    const prefix = this.getModulePrefix();
    
    console.log(
      patterns.server.info(`${timestamp} ${prefix} CONFIG:`), 
      this.textColors.info(this.formatMessage(message))
    );
    
    // Log sensitive values with masking
    if (configData) {
      const maskedConfig = {...configData};
      
      // Mask sensitive values
      for (const [key, value] of Object.entries(maskedConfig)) {
        if (key.includes('KEY') || key.includes('SECRET') || 
            key.includes('PASSWORD') || key.includes('TOKEN') ||
            key.includes('URI') || key.includes('URL')) {
          maskedConfig[key] = '******';
        }
      }
      
      // Print each config option on its own line for better readability
      for (const [key, value] of Object.entries(maskedConfig)) {
        console.log(
          patterns.server.info(`${timestamp} ${prefix} CONFIG:`),
          this.textColors.info(`  ${key}: ${value}`)
        );
      }
    }
    
    // Mark globally that config has been logged
    Logger.configHasBeenLogged = true;
  }

  /**
   * Log success message with contrasting colors and special formatting
   * @param {string} message - The message to log
   * @param {any} data - Optional data to log
   */
  success(message, data) {
    // Skip suppressed messages
    if (this.shouldSuppressMessage(message)) {
      return;
    }
    
    const timestamp = this.getTimestamp();
    const prefix = this.getModulePrefix();
    console.log(
      patterns.server.success(`${timestamp} ${prefix} SUCCESS:`), 
      this.textColors.success(this.formatMessage(message)), 
      data ? this.formatMessage(data) : ''
    );
  }

  /**
   * Log warning message with contrasting colors and special formatting
   * @param {string} message - The message to log
   * @param {any} data - Optional data to log
   */
  warning(message, data) {
    // Skip suppressed messages
    if (this.shouldSuppressMessage(message)) {
      return;
    }
    
    const timestamp = this.getTimestamp();
    const prefix = this.getModulePrefix();
    console.log(
      patterns.server.warning(`${timestamp} ${prefix} WARNING:`), 
      this.textColors.warning(this.formatMessage(message)), 
      data ? this.formatMessage(data) : ''
    );
  }

  /**
   * Log error message with contrasting colors and special formatting
   * @param {string} message - The message to log
   * @param {any} data - Optional data to log
   */
  error(message, data) {
    // Errors should never be suppressed
    const timestamp = this.getTimestamp();
    const prefix = this.getModulePrefix();
    console.error(
      patterns.server.error(`${timestamp} ${prefix} ERROR:`), 
      this.textColors.error(this.formatMessage(message)), 
      data ? this.formatMessage(data) : ''
    );
  }

  /**
   * Log debug message with contrasting colors and special formatting
   * @param {string} message - The message to log
   * @param {...any} args - Optional arguments to log
   */
  debug(message, ...args) {
    // Skip suppressed messages
    if (this.shouldSuppressMessage(message)) {
      return;
    }
    
    const timestamp = this.getTimestamp();
    const prefix = this.getModulePrefix();
    console.log(
      patterns.server.info(`${timestamp} ${prefix} DEBUG:`), 
      this.textColors.info(this.formatMessage(message)), 
      ...args.map(arg => this.formatMessage(arg))
    );
  }
  
  /**
   * Log chat message with enhanced user and socket details
   * @param {string} username - The user who sent the message
   * @param {string} message - The message content
   * @param {string} socketId - The socket ID
   */
  chatMessage(username, message, socketId) {
    const timestamp = this.getTimestamp();
    const prefix = this.getModulePrefix();
    
    console.log(
      patterns.server.info(`${timestamp} ${prefix} CHAT MESSAGE:`),
      this.textColors.info(`From ${this.specialColors.bambi(username)} [${this.specialColors.socket(socketId)}]: ${message}`)
    );
  }

  /**
   * Log LMStudio message with enhanced user and socket details
   * @param {string} username - The user who interacted with LMStudio
   * @param {string} workerSocketId - The LMStudio worker socket ID
   * @param {string} clientSocketId - The client socket ID
   */
  lmstudioMessage(username, workerSocketId, clientSocketId) {
    const timestamp = this.getTimestamp();
    const prefix = this.getModulePrefix();
    
    console.log(
      patterns.server.info(`${timestamp} ${prefix} LMSTUDIO MESSAGE:`),
      this.textColors.info(`User ${this.specialColors.bambi(username)} [${this.specialColors.socket(clientSocketId)}] → Worker [${this.specialColors.worker(workerSocketId)}]`)
    );
  }

  /**
   * Log XP update with enhanced user details
   * @param {string} username - The user who gained XP
   * @param {number} xpGained - The amount of XP gained
   * @param {number} totalXp - The total XP for the user
   * @param {string} socketId - The socket ID
   */
  xpUpdate(username, xpGained, totalXp, socketId) {
    const timestamp = this.getTimestamp();
    const prefix = this.getModulePrefix();
    
    console.log(
      patterns.server.success(`${timestamp} ${prefix} XP UPDATE:`),
      this.textColors.success(`User ${this.specialColors.bambi(username)} [${this.specialColors.socket(socketId)}] gained ${this.specialColors.number(xpGained)} XP (Total: ${this.specialColors.number(totalXp)})`)
    );
  }

  /**
   * Log new socket connection with bambi information - with full details
   * @param {string} socketId - The socket ID
   * @param {string} bambiName - The name of the bambi
   * @param {Array} workers - Associated workers
   * @param {Array} dbConnections - Associated database connections
   * @param {number} totalConnections - Total number of active connections
   * @param {number} activeWorkers - Total number of active workers
   */
  socketConnect(socketId, bambiName, workers, dbConnections, totalConnections, activeWorkers) {
    const timestamp = this.getTimestamp();
    const prefix = this.getModulePrefix();
    
    // Full detail client info with actual values, never placeholders
    const displayName = bambiName || 'unregistered';
    const registrationStatus = bambiName ? 'registered' : 'unregistered';
    
    console.log(
      patterns.server.success(`${timestamp} ${prefix} CONNECT:`),
      this.textColors.success(`Socket ${this.specialColors.socket(socketId)} connected (User: ${this.specialColors.bambi(displayName)}, Status: ${registrationStatus})`)
    );
    
    console.log(
      patterns.server.info(`${timestamp} ${prefix} CLIENT INFO:`),
      this.textColors.info(`Socket: ${this.specialColors.socket(socketId)}, User: ${this.specialColors.bambi(displayName)}, Active Connections: ${this.specialColors.number(totalConnections)}`)
    );
    
    if (workers && workers.length) {
      console.log(
        patterns.server.info(`${timestamp} ${prefix} WORKER ASSIGNMENT:`),
        this.textColors.info(`Socket ${this.specialColors.socket(socketId)} → LMStudio Worker${workers.length > 1 ? 's' : ''}: ${this.specialColors.worker(workers.join(', '))}`)
      );
    }
    
    console.log(
      patterns.server.info(`${timestamp} ${prefix} SERVER STATS:`),
      this.textColors.info(`Total Connections: ${this.specialColors.number(totalConnections)}, Active Workers: ${this.specialColors.number(activeWorkers)}`)
    );
  }

  /**
   * Log socket disconnection with full details
   * @param {string} socketId - The socket ID
   * @param {string} bambiName - The name of the bambi
   * @param {number} totalConnections - Total number of active connections
   * @param {number} activeWorkers - Total number of active workers
   * @param {string} reason - Reason for disconnection
   */
  socketDisconnect(socketId, bambiName, totalConnections, activeWorkers, reason) {
    const timestamp = this.getTimestamp();
    const prefix = this.getModulePrefix();
    
    // Full client details with actual values
    const displayName = bambiName || 'unregistered';
    const reasonText = reason ? `, Reason: ${reason}` : '';
    
    console.log(
      patterns.server.warning(`${timestamp} ${prefix} DISCONNECT:`),
      this.textColors.warning(`Socket ${this.specialColors.socket(socketId)} (${this.specialColors.bambi(displayName)}) disconnected${reasonText}`)
    );
    
    console.log(
      patterns.server.info(`${timestamp} ${prefix} SERVER STATS:`),
      this.textColors.info(`Remaining Connections: ${this.specialColors.number(totalConnections)}, Active Workers: ${this.specialColors.number(activeWorkers)}`)
    );
  }

  /**
   * Log socket cleanup event with full details
   * @param {string} socketId - The socket ID
   * @param {string} bambiName - The name of the bambi
   * @param {string} stage - Cleanup stage (e.g., "confirmation received", "worker terminated")
   * @param {number} activeConnections - Number of remaining active connections
   */
  socketCleanup(socketId, bambiName, stage, activeConnections) {
    const timestamp = this.getTimestamp();
    const prefix = this.getModulePrefix();
    
    // Full client details with actual values
    const displayName = bambiName || 'unregistered';
    
    console.log(
      patterns.server.info(`${timestamp} ${prefix} CLEANUP ${stage.toUpperCase()}:`),
      this.textColors.info(`Socket ${this.specialColors.socket(socketId)} (${this.specialColors.bambi(displayName)}) - ${stage}`)
    );
    
    if (stage.includes('store')) {
      console.log(
        patterns.server.info(`${timestamp} ${prefix} ACTIVE CONNECTIONS:`),
        this.textColors.info(`${this.specialColors.number(activeConnections)} socket${activeConnections !== 1 ? 's' : ''} remaining`)
      );
    }
  }

  /**
   * Log worker cleanup confirmation with full details
   * @param {string} socketId - The socket ID
   * @param {string} bambiName - The name of the bambi
   * @param {string} workerType - Type of worker (e.g., "LMStudio", "TTS")
   */
  workerCleanup(socketId, bambiName, workerType) {
    const timestamp = this.getTimestamp();
    const prefix = this.getModulePrefix();
    
    // Full client details with actual values
    const displayName = bambiName || 'unregistered';
    
    console.log(
      patterns.server.info(`${timestamp} ${prefix} WORKER CLEANUP:`),
      this.textColors.info(`${workerType} worker for socket ${this.specialColors.socket(socketId)} (${this.specialColors.bambi(displayName)}) terminated`)
    );
  }

  /**
   * Log garbage collection of a socket with complete details
   * @param {string} socketId - The socket ID
   * @param {string} bambiName - The name of the bambi
   */
  socketGarbageCollected(socketId, bambiName) {
    const timestamp = this.getTimestamp();
    const prefix = this.getModulePrefix();
    
    // Full client details with actual values
    const displayName = bambiName || 'unregistered';
    
    console.log(
      patterns.server.warning(`${timestamp} ${prefix} GARBAGE COLLECTION:`),
      this.textColors.warning(`Socket ${this.specialColors.socket(socketId)} (${this.specialColors.bambi(displayName)}) cleaned up`)
    );
  }
}

// Add this static property at the end of the file, after the class declaration
// This ensures config is only logged once across all logger instances
Logger.configHasBeenLogged = false;

export default Logger;