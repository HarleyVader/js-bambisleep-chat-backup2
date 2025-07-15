// Simplified terminal interface stub
// The full terminal interface was removed to reduce complexity

import Logger from './logger.js';

const logger = new Logger('TerminalInterface');

class TerminalInterface {
  constructor() {
    this.isActive = false;
  }

  init() {
    // Stub implementation
    logger.info('Terminal interface disabled for simplicity');
  }

  destroy() {
    // Stub implementation
  }

  addLog() {
    // Stub implementation
  }
}

export default TerminalInterface;
