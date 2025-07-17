// src/utils/config.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from '../utils/logger.js';

// Initialize logger
const logger = new Logger('Config');

// Track if config has been logged already - make this a module-level variable
let configLogged = false;

// Load environment variables
dotenv.config();

// Resolve paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuration validation schemas
 */
const configSchemas = {
  SERVER_PORT: { type: 'number', default: 6969, min: 1, max: 65535 },
  NODE_ENV: { type: 'string', default: 'development', enum: ['development', 'production', 'test'] },
  MONGODB_URI: { type: 'string', required: true },
  KOKORO_HOST: { type: 'string', default: 'localhost' },
  KOKORO_PORT: { type: 'number', default: 8880, min: 1, max: 65535 },
  KOKORO_API_URL: { type: 'string', default: null },
  KOKORO_DEFAULT_VOICE: { type: 'string', default: 'af_bella' },
  KOKORO_API_KEY: { type: 'string', default: 'not-needed', sensitive: true },
  SOCKET_PING_TIMEOUT: { type: 'number', default: 480000, min: 260000 },
  SOCKET_PING_INTERVAL: { type: 'number', default: 25000, min: 1000 },
  MAX_UPLOAD_SIZE: { type: 'number', default: 10485760, min: 1024 },
  TTS_TIMEOUT: { type: 'number', default: 300000, min: 100000 },
  ALLOWED_ORIGINS: { type: 'array', default: ['https://bambisleep.chat', 'https://fickdichselber.com'] },
  MAX_WORKER_THREADS: { type: 'number', default: 4, min: 1, max: 16 },  WORKER_TIMEOUT: { type: 'number', default: 60000, min: 1000 },
  LOG_LEVEL: { type: 'string', default: 'info', enum: ['error', 'warn', 'info', 'debug'] },
  RUNPOD_API_KEY: { type: 'string', default: '', sensitive: true },
  RUNPOD_API_URL: { type: 'string', default: 'https://api.runpod.ai/v2/ttz08s667h5t9r/run' },
};

/**
 * Validate and parse a configuration value according to its schema
 * 
 * @param {string} key - Configuration key
 * @param {any} value - Configuration value
 * @param {Object} schema - Validation schema
 * @returns {any} - Validated and parsed value
 */
function validateConfig(key, value, schema) {
  // If value is not provided or null/undefined and we have a default, use default
  if ((value === undefined || value === null || value === '') && 'default' in schema) {
    return schema.default;
  }
  
  // Required check
  if (schema.required && (value === undefined || value === null || value === '')) {
    throw new Error(`Required configuration "${key}" is missing`);
  }
  
  // Type validation and conversion
  switch (schema.type) {
    case 'string':
      value = String(value);
      if (schema.enum && !schema.enum.includes(value)) {
        throw new Error(`Value "${value}" for "${key}" must be one of: ${schema.enum.join(', ')}`);
      }
      break;
      
    case 'number':
      value = Number(value);
      if (isNaN(value)) {
        throw new Error(`Value for "${key}" must be a number`);
      }
      if (schema.min !== undefined && value < schema.min) {
        throw new Error(`Value for "${key}" must be at least ${schema.min}`);
      }
      if (schema.max !== undefined && value > schema.max) {
        throw new Error(`Value for "${key}" must be at most ${schema.max}`);
      }
      break;
      
    case 'boolean':
      if (typeof value === 'string') {
        value = value.toLowerCase();
        value = value === 'true' || value === '1' || value === 'yes';
      } else {
        value = Boolean(value);
      }
      break;
      
    case 'array':
      if (typeof value === 'string') {
        value = value.split(',').map(item => item.trim());
      } else if (!Array.isArray(value)) {
        value = schema.default || [];
      }
      break;
      
    default:
      throw new Error(`Unknown type "${schema.type}" for configuration "${key}"`);
  }
  
  return value;
}

/**
 * Build the configuration object
 */
function buildConfig() {
  const config = {};
  
  // Process each configuration schema
  for (const [key, schema] of Object.entries(configSchemas)) {
    try {
      config[key] = validateConfig(key, process.env[key], schema);
    } catch (error) {
      logger.error(`Configuration error for ${key}: ${error.message}`);
      throw error; // Re-throw to fail startup if a critical config is invalid
    }
  }
  
  // Generate derived values
  if (!config.KOKORO_API_URL) {
    config.KOKORO_API_URL = `http://${config.KOKORO_HOST}:${config.KOKORO_PORT}/v1`;
  }
  
  return config;
}

// Export a function to explicitly log the config (for server startup only)
export function logConfigOnStartup() {
  logger.info('===== SERVER STARTUP =====');
  logger.logConfig('Configuration loaded:', config);
}

// Use Node.js module caching to ensure config is only built once
const config = buildConfig();

// Log the config once at import time, only when running the main server process
if (process.argv[1] && process.argv[1].includes('server.js')) {
  logger.logConfig('Configuration loaded:', config);
}

export default config;