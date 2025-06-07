/**
 * BNNCS API Routes
 * REST API endpoints for the Bambi Neural Network Control System
 */

import express from 'express';
import bambiIndustrialControlSystem from '../services/bambiControlNetwork.js';
import Logger from '../utils/logger.js';

const router = express.Router();
const logger = new Logger('BNNCS-API');

/**
 * GET /api/bnncs/status
 * Get current system status
 */
router.get('/status', (req, res) => {
  try {
    const status = bambiIndustrialControlSystem.getSystemStatus();
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error getting BNNCS status: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status'
    });
  }
});

/**
 * GET /api/bnncs/nodes
 * Get all control nodes
 */
router.get('/nodes', (req, res) => {
  try {
    const nodes = bambiIndustrialControlSystem.getConnectedNodes();
    res.json({
      success: true,
      data: nodes,
      total: nodes.length
    });
  } catch (error) {
    logger.error(`Error getting control nodes: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get control nodes'
    });
  }
});

/**
 * POST /api/bnncs/automation/rule
 * Add a new automation rule
 */
router.post('/automation/rule', (req, res) => {
  try {
    const { ruleId, condition, action } = req.body;
    
    if (!ruleId || !condition || !action) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ruleId, condition, action'
      });
    }

    // Simple rule creation (in production, you'd want more validation)
    const rule = {
      condition: new Function('signal', condition),
      action: new Function('signal', action)
    };

    bambiIndustrialControlSystem.addAutomationRule(ruleId, rule);
    
    res.json({
      success: true,
      message: `Automation rule '${ruleId}' added successfully`
    });
    
  } catch (error) {
    logger.error(`Error adding automation rule: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to add automation rule'
    });
  }
});

/**
 * POST /api/bnncs/mode
 * Change system operating mode
 */
router.post('/mode', (req, res) => {
  try {
    const { mode } = req.body;
    
    if (!mode || !['AUTO', 'MANUAL', 'MAINTENANCE', 'OFFLINE'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mode. Must be one of: AUTO, MANUAL, MAINTENANCE, OFFLINE'
      });
    }

    bambiIndustrialControlSystem.setSystemMode(mode);
    
    res.json({
      success: true,
      message: `System mode changed to ${mode}`
    });
    
  } catch (error) {
    logger.error(`Error changing system mode: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to change system mode'
    });
  }
});

/**
 * GET /api/bnncs/automation/rules
 * Get all automation rules
 */
router.get('/automation/rules', (req, res) => {  try {
    const status = bambiIndustrialControlSystem.getSystemStatus();
    res.json({
      success: true,
      data: status.automationRules
    });
  } catch (error) {
    logger.error(`Error getting automation rules: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get automation rules'
    });
  }
});

/**
 * POST /api/bnncs/test/signal
 * Send a test control signal (for debugging)
 */
router.post('/test/signal', (req, res) => {
  try {
    const { signalType, signalData, sourceNodeId } = req.body;
    
    if (!signalType) {
      return res.status(400).json({
        success: false,
        error: 'signalType is required'
      });
    }

    const signal = bambiIndustrialControlSystem.processControlSignal(
      signalType,
      signalData || {},
      sourceNodeId || 'API_TEST'
    );
    
    res.json({
      success: true,
      data: signal,
      message: 'Test signal processed successfully'
    });
    
  } catch (error) {
    logger.error(`Error processing test signal: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to process test signal'
    });
  }
});

export default router;
