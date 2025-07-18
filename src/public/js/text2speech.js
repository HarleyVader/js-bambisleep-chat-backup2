// Instead of using let currentVoice, use the globally shared one
window.currentVoice = window.currentVoice || 'af_bella'; // Default voice

/**
 * Set the voice to use for TTS
 */
function setVoice(voice) {
    if (voice && typeof voice === 'string') {
        window.currentVoice = voice;
    }
}

/**
 * Push text to TTS queue and create URL 
 */
function arrayPush(array, e) {
    if (document.querySelector("#audio")) {
        document.querySelector("#audio").hidden = true;
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
    
    let retries = 2; // Number of retry attempts
    let audioUrl = null; // Track the blob URL for cleanup
    
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
                // Handle 503 Service Unavailable specially - don't retry
                if (response.status === 503) {
                    try {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'TTS service unavailable');
                    } catch (parseError) {
                        throw new Error('TTS service not configured');
                    }
                }
                
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
            audioUrl = URL.createObjectURL(audioBlob);
            
            // Set audio source to blob URL
            if (window.audio) {
                window.audio.src = audioUrl;
                console.log("Audio source set:", audioUrl);
                
                window.audio.load();
                
                // Set up event handlers
                window.audio.onloadedmetadata = function() {
                    console.log("Audio metadata loaded, duration:", window.audio.duration);
                    if (messageEl) messageEl.textContent = "Playing...";
                    window.audio.play().catch(e => {
                        console.error("Error playing audio:", e);
                        if (messageEl) messageEl.textContent = "Error playing audio: " + e.message;
                        
                        // Cleanup on play error
                        if (audioUrl) {
                            URL.revokeObjectURL(audioUrl);
                            audioUrl = null;
                        }
                        
                        // Process next item in queue if any
                        if (array.length > 0) {
                            do_tts(array);
                        }
                    });
                };
                
                window.audio.onended = function() {
                    console.log("Audio playback ended");
                    if (messageEl) messageEl.textContent = "Finished!";
                    
                    // Release the blob URL to free memory
                    if (audioUrl) {
                        URL.revokeObjectURL(audioUrl);
                        audioUrl = null;
                    }
                    
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
                    
                    // Release the blob URL on error
                    if (audioUrl) {
                        URL.revokeObjectURL(audioUrl);
                        audioUrl = null;
                    }
                    
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
                
                // Cleanup on fetch error
                if (audioUrl) {
                    URL.revokeObjectURL(audioUrl);
                    audioUrl = null;
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
            if (response.status === 503) {
                console.warn("TTS service not configured");
                return [];
            }
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