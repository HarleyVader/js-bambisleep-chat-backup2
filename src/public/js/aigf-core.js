// BambiSleep Chat Client
const socket = window.socket || io();
window.socket = socket;

let token = '';

// Create arrays and cache DOM elements
const _textArray = [];
const _audioArray = [];
const textarea = document.getElementById('textarea');
const submit = document.getElementById('submit');
const response = document.getElementById('response');
const userPrompt = document.getElementById('user-prompt');

// Check for missing critical elements
if (!textarea) console.warn('textarea element not found');
if (!submit) console.warn('submit button not found');
if (!response) console.warn('response element not found');

// Share audio element between scripts
window.audio = window.audio || document.getElementById('audio');
const audio = window.audio;

// Variables for state management
let text = '';
let state = true;

// Share arrays with other scripts
window._textArray = _textArray;
window._audioArray = _audioArray;

// Enhanced control network integration
function initializeControlNetwork() {
  // Initialize bambi control network integration
  let controlNodeId = null;
  if (window.bambiControlNetwork && typeof window.bambiControlNetwork.registerControlNode === 'function') {
    const nodeId = `aigf-core-${Date.now()}`;
    const success = window.bambiControlNetwork.registerControlNode(nodeId, 'USER_INTERFACE', {
      component: 'AIGF_CORE',
      username: window.username || 'unknown',
      capabilities: ['message_processing', 'response_display', 'audio_control'],
      onSignal: function(signalType, signalData, sourceId) {
        console.log(`🎛️ AIGF received signal: ${signalType}`, signalData);
        
        // Handle incoming control signals
        switch(signalType) {
          case 'SYSTEM_TRIGGER':
            if (signalData.trigger && signalData.duration) {
              flashTrigger(signalData.trigger, signalData.duration);
            }
            break;
          case 'AUDIO_CONTROL':
            if (signalData.action === 'stop' && window.audio) {
              window.audio.pause();
              window.audio.currentTime = 0;
            }
            break;
          case 'UI_UPDATE':
            if (signalData.element && signalData.content) {
              const element = document.getElementById(signalData.element);
              if (element) {
                element.textContent = signalData.content;
              }
            }
            break;
        }
      }
    });
    
    if (success) {
      controlNodeId = nodeId;
      console.log(`📡 AIGF Core successfully registered with control network: ${nodeId}`);
    }
  } else {
    // Fallback for when control network is not available
    console.log('🎛️ Control network not available, using fallback integration');
    window.bambiControlNetwork = window.bambiControlNetwork || {
      processControlSignal: function(signalType, signalData, sourceId) {
        console.log(`🎛️ AIGF Control Signal (fallback): ${signalType}`, signalData);
      },
      registerControlNode: function(nodeId, nodeType, nodeData) {
        controlNodeId = nodeId;
        console.log(`📡 AIGF registered as control node (fallback): ${nodeId}`);
        return true;
      }
    };
  }
}

// Socket event handlers
socket.on('disconnect', () => {
    console.log('Disconnected');
    alert('Bambi disconnected!\nrefresh bambisleep.chat');
});

socket.on('connect', () => {
    console.log('Connected to BambiSleep chat server! Socket ID:', socket.id);
});

socket.on('reconnect_attempt', () => {
    console.log('Attempting to reconnect...');
});

socket.on('reconnect', () => {
    console.log('Reconnected to server');
});

socket.on('reconnect_failed', () => {
    console.error('Failed to reconnect to server');
});

socket.on('connect_error', (error) => {
    console.log('Connection Error:', error.message);
    // Try to reconnect automatically
    setTimeout(() => {
        if (!socket.connected) {
            console.log('Attempting to reconnect...');
            socket.connect();
        }
    }, 2000);
});

// Handle message events from server
socket.on('message', (message) => {
    console.log('Received message:', message);
    // Display in UI if needed
});

// Handle system messages
socket.on('system', (data) => {
    console.log('System message:', data.message);
    if (data.type === 'error') {
        showError(data.message);
    } else {
        showSystemMessage(data.message);
    }
});

function showError(message) {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
}

function showSystemMessage(message) {
    const messageElement = document.createElement('p');
    messageElement.className = 'system-message';
    messageElement.textContent = message;
    
    if (response && response.firstChild) {
        response.insertBefore(messageElement, response.firstChild);
    } else if (response) {
        response.appendChild(messageElement);
    }
}

let debounceTimeout;
let isProcessing = false;

if (submit) {
    submit.addEventListener('click', (event) => {
        event.preventDefault();
        
        // Prevent multiple rapid clicks
        if (isProcessing) return;
        
        isProcessing = true;
        clearTimeout(debounceTimeout);
        
        debounceTimeout = setTimeout(() => {
            handleClick();
            
            // Reset processing state after completion or timeout
            setTimeout(() => {
                isProcessing = false;
            }, 1000); // Ensure at least 1 second between submissions
        }, 200);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    // Fix cookie parsing to handle empty cookie strings
    const cookies = {};
    if (document.cookie) {
        document.cookie.split(";").forEach(cookie => {
            const parts = cookie.split("=").map(c => c.trim());
            if (parts.length === 2) {
                cookies[parts[0]] = parts[1];
            }
        });
    }

    let username = decodeURIComponent(cookies['bambiname'] || 'anonBambi').replace(/%20/g, ' ');
    window.username = username;
    
    // Initialize control network integration
    setTimeout(() => {
        initializeControlNetwork();
    }, 500); // Wait for bambiControlNetwork to be fully loaded
});

function arrayPush(array, text) {
    if (Array.isArray(array)) {
        array.push(text);
    }
}

function applyUppercaseStyle() {
    // Get all message paragraphs in the response
    const paragraphs = response ? response.querySelectorAll('p') : [];
    
    // Apply uppercase to trigger words
    paragraphs.forEach(p => {
        if (!p) return;
        
        // Get triggers from localStorage
        const triggers = JSON.parse(localStorage.getItem('bambiActiveTriggers') || '[]');
        if (!triggers || triggers.length === 0) return;
        
        // Replace trigger words with uppercase versions
        let html = p.textContent;
        triggers.forEach(trigger => {
            const regex = new RegExp(`\\b${trigger}\\b`, 'gi');
            html = html.replace(regex, match => `<strong>${match.toUpperCase()}</strong>`);
        });
        
        p.innerHTML = html;
    });
}

function flashTrigger(trigger, duration) {
    const container = document.getElementById("eye");
    if (!container) return;
    
    container.innerHTML = "";
    const span = document.createElement("span");
    span.textContent = trigger;
    container.appendChild(span);

    setTimeout(() => {
        requestAnimationFrame(() => {
            container.innerHTML = "";
        });
    }, duration);
}

function handleClick() {
    const message = textarea ? textarea.value.trim() : '';

    if (message === '') {
        alert('Message cannot be empty');
        return;
    }
    
    // Send through control network if available
    if (controlNodeId && window.bambiControlNetwork && typeof window.bambiControlNetwork.processControlSignal === 'function') {
        window.bambiControlNetwork.processControlSignal('USER_MESSAGE', {
            content: message,
            timestamp: Date.now(),
            source: 'AIGF_CORE'
        }, controlNodeId);
        
        // Update node activity
        if (typeof window.bambiControlNetwork.updateNodeActivity === 'function') {
            window.bambiControlNetwork.updateNodeActivity(controlNodeId);
        }
    }
    
    if (userPrompt) userPrompt.textContent = message;
    socket.emit('message', message);

    if (textarea) {
        textarea.value = '';
        textarea.style.height = 'inherit';
    }
}

socket.on('response', async (message) => {
    const messageText = message;
    const sentences = messageText.split(/(?<=[:;,.!?]["']?)\s+/g);
    
    // Send response processing through control network
    if (controlNodeId && window.bambiControlNetwork && typeof window.bambiControlNetwork.processControlSignal === 'function') {
        window.bambiControlNetwork.processControlSignal('AI_RESPONSE_RECEIVED', {
            content: messageText,
            sentenceCount: sentences.length,
            timestamp: Date.now(),
            source: 'AIGF_CORE'
        }, controlNodeId);
        
        // Update node activity
        if (typeof window.bambiControlNetwork.updateNodeActivity === 'function') {
            window.bambiControlNetwork.updateNodeActivity(controlNodeId);
        }
    }

    for (let sentence of sentences) {
        _textArray.push(sentence);
        console.log('Text array:', _textArray);
        if (state) {
            handleAudioEnded();
        }
        sentence = '';
    }
    applyUppercaseStyle();
});

socket.on('chat message', (messageData) => {
    displayChatMessage(messageData);
});

function displayChatMessage(messageData) {
    const chatResponse = document.getElementById('chat-response');
    if (!chatResponse) return;
    
    const li = document.createElement('li');
    li.innerHTML = `
        <span class="chat-time">${new Date(messageData.timestamp).toLocaleTimeString([], {hour12: false})}</span> -
        <span class="chat-username"><a href="/profile/${messageData.username}" class="username-link">${messageData.username}</a>:</span>
        <span class="chat-message">${messageData.data}</span>
    `;
    
    chatResponse.appendChild(li);
    chatResponse.scrollTop = chatResponse.scrollHeight;
}

function handleAudioEnded() {
    if (_textArray.length > 0) {
        state = false;
        text = _textArray.shift();
    } else if (_textArray.length === 0) {
        state = true;
        return;
    }
    arrayPush(_audioArray, text);
    do_tts(_audioArray);
}

function handleAudioPlay() {
    console.log('Audio is playing');
    const duration = audio.duration * 1000;
    new Promise(resolve => setTimeout(resolve, duration));
    flashTrigger(text, duration);
    const messageElement = document.createElement('p');
    messageElement.textContent = text;
    console.log('Text reply: ', messageElement.textContent);
    if (response.firstChild) {
        response.insertBefore(messageElement, response.firstChild);
    } else {
        response.appendChild(messageElement);
    }
    applyUppercaseStyle();
}

// Add null check before adding event listeners
if (audio) {
    audio.addEventListener('ended', handleAudioEnded);
    audio.addEventListener('play', handleAudioPlay);
}

// Clean up event listeners when appropriate
function cleanup() {
    if (audio) {
        audio.removeEventListener('ended', handleAudioEnded);
        audio.removeEventListener('play', handleAudioPlay);
    }
    if (submit) {
        submit.removeEventListener('click', handleClick);
    }
    socket.off('response');
    socket.off('reconnect');
    socket.off('disconnect');
    socket.off('message');
    socket.off('system');
}

// Call cleanup when needed
window.addEventListener('beforeunload', cleanup);

// Handle JSON parse errors gracefully
function safeJsonParse(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        console.log('JSON parse error:', e.message);
        return {};
    }
}

// Make key functions available globally
window.handleClick = handleClick;
window.applyUppercaseStyle = applyUppercaseStyle;