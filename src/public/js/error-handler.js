// Error handler for BambiSleep chat components

// Track resources that have failed to load to avoid repeated attempts
const failedResources = new Set();

// Handle audio loading errors
function handleAudioError(audioPath, triggerName, fallbackCallback) {
  if (failedResources.has(audioPath)) return;
  
  failedResources.add(audioPath);
  console.log(`Failed to load audio: ${triggerName}`);
    // Try alternative path if possible
  if (!audioPath.includes('_alt') && !audioPath.includes('fallback')) {
    const altPath = audioPath.replace('.mp3', '.wav');
    const altAudio = new Audio(altPath);
    
    altAudio.addEventListener('canplaythrough', () => {
      if (window.audioCache && window.audioCache[triggerName]) {
        window.audioCache[triggerName] = altAudio;
        failedResources.delete(audioPath);
      }
    });
    
    // Add error handling for the alternative audio
    altAudio.addEventListener('error', () => {
      console.log(`Failed to load alternative audio for: ${triggerName}`);
      // Keep the original path in failed resources
    });
  }
  
  if (typeof fallbackCallback === 'function') fallbackCallback();
}

// Handle resource fetch errors (JSON, config files)
function handleResourceError(resource, error, isCritical, fallbackCallback) {
  if (failedResources.has(resource)) return;
  
  failedResources.add(resource);
  console.log(`Error loading resource: ${resource}`, error);
  
  if (isCritical && typeof window.showNotification === 'function') {
    window.showNotification(`Failed to load ${resource.split('/').pop()}. Some features may not work.`, 'error');
  }
  
  if (typeof fallbackCallback === 'function') fallbackCallback();
}

// Handle API errors
function handleApiError(endpoint, error, fallbackCallback) {
  console.log(`API error (${endpoint}):`, error);
  if (typeof fallbackCallback === 'function') fallbackCallback();
}

// Handle service unavailable errors (503)
function handleServiceUnavailable(endpoint, error, retryAfter = 30, retryCallback) {
  console.log(`Service unavailable (${endpoint}):`, error);
  
  if (typeof window.showNotification === 'function') {
    const notification = window.showNotification(
      `Service temporarily unavailable. Retrying in ${retryAfter} seconds...`, 
      'warning',
      retryAfter * 1000
    );
    
    if (notification && typeof retryCallback === 'function') {
      const retryBtn = document.createElement('button');
      retryBtn.textContent = 'Retry Now';
      retryBtn.className = 'retry-btn';
      retryBtn.onclick = retryCallback;
      notification.appendChild(retryBtn);
    }
  }
  
  if (typeof retryCallback === 'function') {
    setTimeout(retryCallback, retryAfter * 1000);
  }
}

/**
 * Clear a specific failed resource to allow retrying
 * @param {string} resource - Resource path to clear
 */
function clearFailedResource(resource) {
  failedResources.delete(resource);
}

/**
 * Clear all failed resources
 */
function clearAllFailedResources() {
  failedResources.clear();
}

// Make functions available globally
window.errorHandler = {
  handleAudioError,
  handleResourceError,
  handleApiError,
  handleServiceUnavailable,
  clearFailedResource,
  clearAllFailedResources,
  getFailedResources: () => Array.from(failedResources)
};