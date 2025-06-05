import axios from 'axios';
import Logger from './logger.js';
import db from '../config/db.js';
import mongoose from 'mongoose';
import { checkUrlCache, saveUrlResult } from './urlCacheHandler.js';

const logger = new Logger('URLValidator');

/**
 * Validates if a URL is safe using basic checks and database cache
 * In a production environment, you would want to use a more robust
 * solution like Google Safe Browsing API or similar service
 * 
 * @param {string} url - The URL to validate
 * @returns {Promise<{isClean: boolean, reason: string}>} - Validation result
 */
export async function validateUrl(url) {
  try {
    // Basic URL validation
    if (!url || typeof url !== 'string') {
      return { isClean: false, reason: 'Invalid URL format' };
    }

    // First check if we have this URL in our database cache
    const cachedResult = await checkUrlCache(url);
    if (cachedResult) {
      logger.info(`Using cached result for URL: ${url}`);
      return cachedResult;
    }

    // Check for obviously malicious patterns
    const maliciousPatterns = [
      /phish/i, 
      /malware/i, 
      /exploit/i,
      /\.(exe|bat|cmd|sh|msi|vbs)$/i,  // Executable extensions
      /^data:/i,  // Data URLs (can be used for XSS)
      /^javascript:/i  // JavaScript URLs
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(url)) {
        const result = { 
          isClean: false, 
          reason: `URL matches potentially malicious pattern: ${pattern}` 
        };
        
        // Save result to database
        await saveUrlResult(url, result);
        return result;
      }
    }

    // Check for common safe domains (whitelist approach)
    const safeDomains = [
      'github.com', 
      'youtube.com', 
      'youtu.be',
      'twitter.com', 
      'x.com',
      'instagram.com',
      'bambisleep.chat',
      'imgur.com',
      'discord.com',
      'discord.gg',
      'google.com',
      'githubusercontent.com'
    ];

    // Extract domain from URL
    let domain;
    try {
      domain = new URL(url).hostname;
    } catch (error) {
      return { isClean: false, reason: 'Invalid URL format' };
    }

    // Check if domain is in our safe list
    const isDomainSafe = safeDomains.some(safeDomain => 
      domain === safeDomain || domain.endsWith(`.${safeDomain}`)
    );    if (isDomainSafe) {
      const result = { isClean: true, reason: 'Domain is in safelist' };
      await saveUrlResult(url, result);
      return result;
    }

    // For other domains, we could make a HEAD request to check if the site is up
    // This is a very basic check and not a security validation
    try {
      const response = await axios.head(url, { 
        timeout: 3000,
        maxRedirects: 3
      });
        // Check if response is valid (200-299)
      if (response.status >= 200 && response.status < 300) {
        const result = { 
          isClean: true, 
          reason: `URL is accessible (status: ${response.status})` 
        };
        await saveUrlResult(url, result);
        return result;
      } else {
        const result = { 
          isClean: false, 
          reason: `URL returned status code: ${response.status}` 
        };
        await saveUrlResult(url, result);
        return result;
      }    } catch (error) {
      const result = { 
        isClean: false, 
        reason: `Failed to access URL: ${error.message}` 
      };
      await saveUrlResult(url, result);
      return result;
    }
  } catch (error) {
    logger.error(`URL validation error: ${error.message}`);
    return { isClean: false, reason: `Validation error: ${error.message}` };
  }
}

/**
 * Updates the URL validation status in the database
 * 
 * @param {object} EnhancedChatMessage - The EnhancedChatMessage model
 * @param {string} messageId - The ID of the message containing the URL
 * @param {string} url - The URL to update
 * @param {boolean} isClean - Whether the URL is safe
 */
export async function updateUrlStatus(EnhancedChatMessage, messageId, url, isClean) {
  try {
    await EnhancedChatMessage.updateOne(
      { _id: messageId, 'urls.url': url },
      { 
        $set: { 
          'urls.$.isClean': isClean,
          'urls.$.checkedAt': new Date()
        }
      }
    );
    
    logger.info(`Updated URL status for ${url} in message ${messageId}: ${isClean ? 'clean' : 'unsafe'}`);
  } catch (error) {
    logger.error(`Failed to update URL status: ${error.message}`);
  }
}

export default {
  validateUrl,
  updateUrlStatus
};
