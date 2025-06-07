// Instead of using let currentVoice, use the globally shared one
window.currentVoice = window.currentVoice || 'af_bella'; // Default voice

// Enhanced control network integration
function initializeTTSControlNetwork() {
  // Initialize bambi control network integration for TTS
  let controlNodeId = null;
  if (window.bambiControlNetwork && typeof window.bambiControlNetwork.registerControlNode === 'function') {
    const nodeId = `tts-${Date.now()}`;
    const success = window.bambiControlNetwork.registerControlNode(nodeId, 'AUDIO_PROCESSOR', {
      component: 'TEXT2SPEECH',
      voice: window.currentVoice,
      capabilities: ['voice_synthesis', 'audio_playback', 'queue_management'],
      onSignal: function(signalType, signalData, sourceId) {
        console.log(`🎛️ TTS received signal: ${signalType}`, signalData);
        
        // Handle incoming control signals
        switch(signalType) {
          case 'TTS_VOICE_CHANGE':
            if (signalData.voice) {
              setVoice(signalData.voice);
            }
            break;
          case 'TTS_STOP':
            if (window.audio) {
              window.audio.pause();
              window.audio.currentTime = 0;
            }
            break;
          case 'TTS_QUEUE_CLEAR':
            if (window._audioArray) {
              window._audioArray.length = 0;
            }
            break;
          case 'TTS_VOLUME_CHANGE':
            if (window.audio && typeof signalData.volume === 'number') {
              window.audio.volume = Math.max(0, Math.min(1, signalData.volume));
            }
            break;
        }
      }
    });
    
    if (success) {
      controlNodeId = nodeId;
      console.log(`📡 TTS successfully registered with control network: ${nodeId}`);
    }
  } else {
    // Fallback for when control network is not available
    console.log('🎛️ Control network not available, using TTS fallback integration');
    window.bambiControlNetwork = window.bambiControlNetwork || {
      processControlSignal: function(signalType, signalData, sourceId) {
        console.log(`🎛️ TTS Control Signal (fallback): ${signalType}`, signalData);
      },
      registerControlNode: function(nodeId, nodeType, nodeData) {
        controlNodeId = nodeId;
        console.log(`📡 TTS registered as control node (fallback): ${nodeId}`);
        return true;
      }
    };
  }
}

// Initialize TTS control network when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    initializeTTSControlNetwork();
  }, 600); // Wait for bambiControlNetwork and aigf-core to be loaded
});

/**
 * Set the voice to use for TTS
 */
function setVoice(voice) {
    if (voice && typeof voice === 'string') {
        window.currentVoice = voice;
        
        // Send voice change through control network
        if (controlNodeId && window.bambiControlNetwork && typeof window.bambiControlNetwork.processControlSignal === 'function') {
            window.bambiControlNetwork.processControlSignal('TTS_VOICE_CHANGED', {
                voice: voice,
                timestamp: Date.now(),
                source: 'TEXT2SPEECH'
            }, controlNodeId);
            
            // Update node activity
            if (typeof window.bambiControlNetwork.updateNodeActivity === 'function') {
                window.bambiControlNetwork.updateNodeActivity(controlNodeId);
            }
        }
    }
}

/**
 * Push text to TTS queue and create URL 
 */
function arrayPush(array, e) {
    if (document.querySelector("#audio")) {
        document.querySelector("#audio").hidden = true;
    }
    
    // Send TTS request through control network
    if (controlNodeId && window.bambiControlNetwork && typeof window.bambiControlNetwork.processControlSignal === 'function') {
        window.bambiControlNetwork.processControlSignal('TTS_REQUEST', {
            text: e,
            voice: window.currentVoice,
            timestamp: Date.now(),
            source: 'TEXT2SPEECH'
        }, controlNodeId);
        
        // Update node activity
        if (typeof window.bambiControlNetwork.updateNodeActivity === 'function') {
            window.bambiControlNetwork.updateNodeActivity(controlNodeId);
        }
    }

    // Use window.currentVoice to access the shared voice setting
    let URL = `/api/tts?text=${encodeURIComponent(e)}&voice=${encodeURIComponent(window.currentVoice)}`;
    array.push(URL);
}

/**
 * Shift and return first URL from audio array
 */
function arrayShift(array) {
    if (array.length > 0 && window.audio !== null) {
        let _currentURL = array.shift();
        console.log("Processing URL:", _currentURL);
        return _currentURL;
    }
    return undefined;
}

/**
 * Process TTS queue and play audio
 */
async function do_tts(array) {
    const messageEl = document.querySelector("#message");
    if (messageEl) messageEl.textContent = "Synthesizing...";

    let currentURL = arrayShift(array);
    if (!currentURL) return;
      // Send TTS processing start through control network
    if (controlNodeId && window.bambiControlNetwork && typeof window.bambiControlNetwork.processControlSignal === 'function') {
        window.bambiControlNetwork.processControlSignal('TTS_PROCESSING_START', {
            url: currentURL,
            timestamp: Date.now(),
            source: 'TEXT2SPEECH'
        }, controlNodeId);
    }
    
    let retries = 2; // Number of retry attempts
    
    while (retries >= 0) {
        try {
            // Fetch the audio from the server
            const response = await fetch(currentURL, {
                credentials: 'same-origin', // Include cookies for authentication
                headers: {
                    'Accept': 'audio/mpeg' // Expect MP3 format as set in app.js
                }
            });
            
            if (!response.ok) {
                if (retries > 0) {
                    console.log(`Retrying TTS request (${retries} attempts left)...`);
                    retries--;
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                    continue;
                }
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            // Get audio data as blob
            const audioBlob = await response.blob();
            
            // Create object URL from blob
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Set audio source to blob URL
            if (window.audio) {
                window.audio.src = audioUrl;
                console.log("Audio source set:", audioUrl);
                
                window.audio.load();
                
                // Set up event handlers
                window.audio.onloadedmetadata = function() {
                    console.log("Audio metadata loaded, duration:", window.audio.duration);
                    if (messageEl) messageEl.textContent = "Playing...";
                      // Send audio playback start through control network
                    if (controlNodeId && window.bambiControlNetwork && typeof window.bambiControlNetwork.processControlSignal === 'function') {
                        window.bambiControlNetwork.processControlSignal('TTS_PLAYBACK_START', {
                            duration: window.audio.duration,
                            timestamp: Date.now(),
                            source: 'TEXT2SPEECH'
                        }, controlNodeId);
                    }
                    
                    window.audio.play().catch(e => {
                        console.error("Error playing audio:", e);
                        if (messageEl) messageEl.textContent = "Error playing audio: " + e.message;
                    });
                };
                
                window.audio.onended = function() {
                    console.log("Audio playback ended");
                    if (messageEl) messageEl.textContent = "Finished!";
                      // Send audio playback end through control network
                    if (controlNodeId && window.bambiControlNetwork && typeof window.bambiControlNetwork.processControlSignal === 'function') {
                        window.bambiControlNetwork.processControlSignal('TTS_PLAYBACK_END', {
                            timestamp: Date.now(),
                            source: 'TEXT2SPEECH'
                        }, controlNodeId);
                    }
                    
                    // Release the blob URL to free memory
                    URL.revokeObjectURL(audioUrl);
                    
                    // Process next item in queue if any
                    if (array.length > 0) {
                        do_tts(array);
                    }
                };
                
                window.audio.onerror = function(e) {
                    console.error("Audio error:", e);
                    console.error("Error code:", window.audio.error ? window.audio.error.code : "unknown");
                    console.error("Error message:", window.audio.error ? window.audio.error.message : "unknown");
                    if (messageEl) messageEl.textContent = "Error playing audio: " + 
                        (window.audio.error ? window.audio.error.message : "Unknown error");
                      // Send audio error through control network
                    if (controlNodeId && window.bambiControlNetwork && typeof window.bambiControlNetwork.processControlSignal === 'function') {
                        window.bambiControlNetwork.processControlSignal('TTS_PLAYBACK_ERROR', {
                            error: window.audio.error ? window.audio.error.message : "Unknown error",
                            timestamp: Date.now(),
                            source: 'TEXT2SPEECH'
                        }, controlNodeId);
                    }
                    
                    // Release the blob URL on error
                    URL.revokeObjectURL(audioUrl);
                    
                    // Process next item in queue if any
                    if (array.length > 0) {
                        do_tts(array);
                    }
                };
            }
            
            break; // Exit the retry loop on success
            
        } catch (error) {
            if (retries <= 0) {
                console.error("Fetch error:", error);
                if (messageEl) messageEl.textContent = "Error fetching audio: " + error.message;
                  // Send TTS error through control network
                if (controlNodeId && window.bambiControlNetwork && typeof window.bambiControlNetwork.processControlSignal === 'function') {
                    window.bambiControlNetwork.processControlSignal('TTS_PROCESSING_ERROR', {
                        error: error.message,
                        timestamp: Date.now(),
                        source: 'TEXT2SPEECH'
                    }, controlNodeId);
                }
                
                // Process next item in queue if any
                if (array.length > 0) {
                    do_tts(array);
                }
            } else {
                retries--;
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            }
        }
    }
}

/**
 * Fetch available TTS voices from the server
 * @returns {Promise<Array>} - Array of available voices
 */
async function fetchAvailableVoices() {
    try {
        const response = await fetch('/api/tts/voices');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching available voices:", error);
        return [];
    }
}

// Make functions available globally
window.do_tts = do_tts;
window.tts = {
    arrayPush,
    arrayShift,
    setVoice,
    fetchAvailableVoices
};