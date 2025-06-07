import Logger from './logger.js';

// Terminal interface integration for AIGF logging
let terminalInterface = null;

/**
 * Initialize terminal interface for AIGF logging
 */
export function initTerminalInterface() {
  if (process.env.TERMINAL_UI === 'true') {
    try {
      import('./terminalInterface.js').then(({ default: TerminalInterface }) => {
        terminalInterface = new TerminalInterface();
        terminalInterface.init();
        logger.info('AIGF Terminal interface initialized');
      });
    } catch (error) {
      logger.error('Failed to initialize AIGF terminal interface:', error.message);
    }
  }
}

const logger = new Logger('AigfLogger');

/**
 * Log an AIGF interaction to the database
 * 
 * @param {object} AigfInteraction - The AigfInteraction model
 * @param {string} username - The username interacting with AIGF
 * @param {string} interactionType - Type of interaction ('command', 'chat', etc)
 * @param {string} userInput - The input from the user
 * @param {string} aigfResponse - The response from the AIGF
 * @param {number} processingDuration - Time taken to process in milliseconds
 * @param {string} sessionId - Associated session ID
 * @param {object} metadata - Additional metadata about the interaction
 */
export async function logAigfInteraction(
  AigfInteraction,
  username,
  interactionType,
  userInput,
  aigfResponse = null,
  processingDuration = 0,
  sessionId = null,
  metadata = {}
) {
  try {
    const interactionData = {
      username,
      interactionType,
      userInput,
      aigfResponse,
      processingDuration,
      sessionId,
      metadata,
      timestamp: new Date(),
      success: true
    };
    
    await AigfInteraction.logInteraction(interactionData);
    logger.info(`Logged AIGF interaction: ${username} - ${interactionType}`);
  } catch (error) {
    logger.error(`Failed to log AIGF interaction: ${error.message}`);
  }
}

/**
 * Log an error in AIGF interaction
 * 
 * @param {object} AigfInteraction - The AigfInteraction model
 * @param {string} username - The username interacting with AIGF
 * @param {string} interactionType - Type of interaction ('command', 'chat', etc)
 * @param {string} userInput - The input from the user
 * @param {object} error - The error that occurred
 * @param {string} sessionId - Associated session ID
 */
export async function logAigfError(
  AigfInteraction,
  username,
  interactionType,
  userInput,
  error,
  sessionId = null
) {
  try {
    const interactionData = {
      username,
      interactionType,
      userInput,
      aigfResponse: null,
      processingDuration: 0,
      sessionId,
      metadata: {},
      timestamp: new Date(),
      success: false,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      }
    };
    
    await AigfInteraction.logInteraction(interactionData);
    logger.info(`Logged AIGF error: ${username} - ${interactionType} - ${error.message}`);
  } catch (logError) {
    logger.error(`Failed to log AIGF error: ${logError.message}`);
  }
}

export default {
  logAigfInteraction,
  logAigfError,
  initTerminalInterface
};
