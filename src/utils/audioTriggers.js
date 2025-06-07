import Logger from './logger.js';

const logger = new Logger('AudioTriggers');

/**
 * Detects audio triggers in chat message content
 * 
 * @param {string} messageContent - The chat message text
 * @param {Array} availableTriggers - List of available audio triggers
 * @returns {Array} - List of detected triggers
 */
export function detectAudioTriggers(messageContent, availableTriggers) {
  try {
    if (!messageContent || typeof messageContent !== 'string') {
      return [];
    }

    if (!availableTriggers || !Array.isArray(availableTriggers)) {
      logger.warning('No available triggers provided for detection');
      return [];
    }

    // Convert message to uppercase for case-insensitive matching
    const upperMessage = messageContent.toUpperCase();
    
    // Find all triggers that appear in the message
    const detectedTriggers = availableTriggers.filter(trigger => {
      if (!trigger || !trigger.name) return false;
      
      // Convert trigger name to uppercase for comparison
      const upperTriggerName = trigger.name.toUpperCase();
      
      // Check if trigger appears as a whole word
      const regex = new RegExp(`\\b${upperTriggerName}\\b`, 'i');
      return regex.test(upperMessage);
    });

    if (detectedTriggers.length > 0) {
      logger.info(`Detected ${detectedTriggers.length} audio triggers in message`);
    }
    
    return detectedTriggers;
  } catch (error) {
    logger.error(`Error detecting audio triggers: ${error.message}`);
    return [];
  }
}

/**
 * Log an audio trigger interaction to the database
 * 
 * @param {object} AudioInteraction - The AudioInteraction model
 * @param {string} sourceUsername - The user who triggered the audio
 * @param {string} targetUsername - The user receiving the audio (if targeted)
 * @param {string} audioFile - The audio file or trigger name
 * @param {string} triggerType - The type of trigger ('direct', 'chat', 'trigger')
 * @param {string} messageId - Associated message ID if from chat
 */
export async function logAudioInteraction(
  AudioInteraction, 
  sourceUsername, 
  audioFile, 
  triggerType = 'chat',
  targetUsername = null, 
  messageId = null
) {
  try {
    const interactionData = {
      sourceUsername,
      targetUsername,
      audioFile,
      triggerType,
      messageId
    };
    
    await AudioInteraction.saveInteraction(interactionData);
    logger.info(`Logged audio interaction: ${sourceUsername} triggered ${audioFile}`);
  } catch (error) {
    logger.error(`Failed to log audio interaction: ${error.message}`);
  }
}

export default {
  detectAudioTriggers,
  logAudioInteraction
};
