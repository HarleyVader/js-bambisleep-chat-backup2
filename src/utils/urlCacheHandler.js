import mongoose from 'mongoose';
import Logger from './logger.js';
import db from '../config/db.js';

const logger = new Logger('URLCacheHandler');

/**
 * Check if a URL's safety status is cached in the database
 * 
 * @param {string} url - The URL to check
 * @returns {Promise<{isClean: boolean, reason: string}|null>} - Cached result or null
 */
export async function checkUrlCache(url) {
  try {
    const chatConnection = db.getChatConnection();
    if (!chatConnection) {
      logger.warning('No chat database connection available for URL cache check');
      return null;
    }

    // Define the UrlSafety model schema if it doesn't exist
    const UrlSafetySchema = new mongoose.Schema({
      url: { type: String, required: true, unique: true },
      isClean: { type: Boolean, required: true },
      reason: { type: String },
      lastChecked: { type: Date, default: Date.now },
      checkCount: { type: Number, default: 1 }
    });
    
    // Get or create the model
    const UrlSafety = chatConnection.models.UrlSafety || 
                      chatConnection.model('UrlSafety', UrlSafetySchema);
    
    // Look for the URL in the cache
    const cachedUrl = await UrlSafety.findOne({ url }).lean();
    
    if (cachedUrl) {
      // Update the check count and last checked timestamp
      await UrlSafety.updateOne(
        { url },
        { 
          $inc: { checkCount: 1 },
          $set: { lastChecked: new Date() }
        }
      );
      
      // Return the cached result
      return {
        isClean: cachedUrl.isClean,
        reason: cachedUrl.reason
      };
    }
    
    return null;
  } catch (error) {
    logger.error(`Error checking URL cache: ${error.message}`);
    return null;
  }
}

/**
 * Save a URL validation result to the database
 * 
 * @param {string} url - The URL that was validated
 * @param {{isClean: boolean, reason: string}} result - The validation result
 * @returns {Promise<void>}
 */
export async function saveUrlResult(url, result) {
  try {
    const chatConnection = db.getChatConnection();
    if (!chatConnection) {
      logger.warning('No chat database connection available for saving URL result');
      return;
    }

    // Define the UrlSafety model schema if it doesn't exist
    const UrlSafetySchema = new mongoose.Schema({
      url: { type: String, required: true, unique: true },
      isClean: { type: Boolean, required: true },
      reason: { type: String },
      lastChecked: { type: Date, default: Date.now },
      checkCount: { type: Number, default: 1 }
    });
    
    // Get or create the model
    const UrlSafety = chatConnection.models.UrlSafety || 
                      chatConnection.model('UrlSafety', UrlSafetySchema);
    
    // Upsert the URL safety record
    await UrlSafety.updateOne(
      { url },
      {
        isClean: result.isClean,
        reason: result.reason,
        lastChecked: new Date(),
        $inc: { checkCount: 1 }
      },
      { upsert: true }
    );
      logger.info(`Saved URL validation result for ${url}: ${result.isClean ? 'clean' : 'unsafe'}`);
  } catch (error) {
    logger.error(`Error saving URL result: ${error.message}`);
  }
}

export default {
  checkUrlCache,
  saveUrlResult
};
