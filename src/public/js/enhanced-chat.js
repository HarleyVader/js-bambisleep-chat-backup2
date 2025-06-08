/**
 * Enhanced Chat Features for BambiSleep Chat
 * Handles URL formatting, user mentions, and audio triggers
 */

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
  setupEnhancedChat();
});

/**
 * Set up enhanced chat features
 */
function setupEnhancedChat() {
  // Get socket from global scope
  const socket = window.socket || io();
  window.socket = socket;
  
  // Set up event listeners for enhanced features
  setupURLHandling(socket);
  setupUserMentions(socket);
  setupAudioTriggers(socket);
}

/**
 * Set up URL handling
 */
function setupURLHandling(socket) {
  // Listen for unsafe URL notifications
  socket.on('unsafe url', (data) => {
    console.warn(`Unsafe URL detected: ${data.url} - ${data.reason}`);
    
    // Find all links with this URL and mark them
    const links = document.querySelectorAll(`a[href="${data.url}"]`);
    links.forEach(link => {
      link.classList.add('unsafe-url');
      link.setAttribute('data-reason', data.reason);
      link.setAttribute('title', `Warning: ${data.reason}`);
      
      // Replace with warning span
      const warningSpan = document.createElement('span');
      warningSpan.className = 'unsafe-url-warning';
      warningSpan.innerHTML = `⚠️ Unsafe URL: ${link.textContent} (${data.reason})`;
      link.parentNode.replaceChild(warningSpan, link);
    });
  });
  
  // Add URL handling to chat messages
  function formatURLs(messageElement) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const messageText = messageElement.innerHTML;
    
    messageElement.innerHTML = messageText.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-url">${url}</a>`;
    });
  }
  
  // Observe chat message list for new messages
  const chatObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.classList && node.classList.contains('chat-message')) {
            formatURLs(node);
          }
        });
      }
    });
  });
  
  // Start observing chat messages
  const chatResponse = document.getElementById('chat-response');
  if (chatResponse) {
    chatObserver.observe(chatResponse, { childList: true, subtree: true });
    
    // Format existing messages
    const existingMessages = chatResponse.querySelectorAll('.chat-message');
    existingMessages.forEach(msg => formatURLs(msg));
  }
}

/**
 * Set up user mentions handling
 */
function setupUserMentions(socket) {
  // Listen for user mentions
  socket.on('mention', (data) => {
    console.log(`Mentioned by ${data.from}: ${data.message}`);
    
    // Show notification
    showMentionNotification(data.from, data.message);
    
    // Highlight mention in chat
    highlightMention(data.from, data.message);
  });
  
  // Show notification for mentions
  function showMentionNotification(from, message) {
    // Check if browser supports notifications
    if ("Notification" in window) {
      // Request permission if needed
      if (Notification.permission === "granted") {
        createNotification(from, message);
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            createNotification(from, message);
          }
        });
      }
    }
    
    // Also create an in-app notification
    const notificationArea = document.getElementById('notification-area') || createNotificationArea();
    
    const notification = document.createElement('div');
    notification.className = 'in-app-notification mention-notification';
    notification.innerHTML = `
      <span class="notification-title">@${from} mentioned you</span>
      <span class="notification-message">${message}</span>
    `;
    
    notificationArea.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
      notification.classList.add('notification-hiding');
      setTimeout(() => notification.remove(), 500);
    }, 5000);
  }
  
  function createNotification(from, message) {
    const notification = new Notification(`@${from} mentioned you in BambiSleep Chat`, {
      body: message,
      icon: '/img/favicon.png'
    });
    
    notification.onclick = function() {
      window.focus();
      this.close();
    };
  }
  
  function createNotificationArea() {
    const notificationArea = document.createElement('div');
    notificationArea.id = 'notification-area';
    document.body.appendChild(notificationArea);
    return notificationArea;
  }
  
  function highlightMention(from, message) {
    // Find message in chat
    const chatResponse = document.getElementById('chat-response');
    if (!chatResponse) return;
    
    const chatItems = chatResponse.querySelectorAll('li');
    chatItems.forEach(item => {
      const username = item.querySelector('.chat-username')?.textContent;
      const messageText = item.querySelector('.chat-message')?.textContent;
      
      if (username && username.includes(from) && messageText && messageText.includes(message)) {
        item.classList.add('mention-highlight');
        
        // Scroll into view
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
  
  // Format mentions in outgoing messages
  const chatForm = document.getElementById('chat-form');
  if (chatForm) {
    chatForm.addEventListener('submit', function(e) {
      const input = this.querySelector('input[type="text"]');
      if (!input) return;
      
      // Format mentions in the input
      const mentionRegex = /@(\w+)/g;
      if (mentionRegex.test(input.value)) {
        // We don't need to modify the message, just making sure we're tracking mentions
        console.log('Message contains mentions');
      }
    });
  }
}

/**
 * Set up audio triggers handling
 */
function setupAudioTriggers(socket) {
  // Listen for audio triggers
  socket.on('audio triggers', (data) => {
    console.log(`Audio triggers from ${data.username}:`, data.triggers);
    
    if (data.triggers && data.triggers.length > 0) {
      playAudioTriggers(data.triggers, data.username);
    }
  });
  
  // Listen for direct audio play
  socket.on('play audio', (data) => {
    console.log(`Audio play from ${data.sourceUsername}: ${data.audioFile}`);
    
    if (data.audioFile) {
      playAudio(data.audioFile, data.sourceUsername);
    }
  });
  
  // Play audio triggers
  function playAudioTriggers(triggers, username) {
    // Create audio element if it doesn't exist
    const audio = document.getElementById('trigger-audio') || createAudioElement();
    
    // Build a queue of triggers to play
    const triggerQueue = [...triggers];
    
    // Show trigger activation message
    showTriggerActivation(username, triggers);
    
    // Play the first trigger
    playNextTrigger();
    
    function playNextTrigger() {
      if (triggerQueue.length === 0) return;
        const trigger = triggerQueue.shift();
      const triggerName = trigger.name.toLowerCase().replace(/\s+/g, '-');
      
      // Play audio if available
      audio.src = `/audio/${triggerName}.mp3`;
      audio.onended = playNextTrigger;
      audio.onerror = playNextTrigger; // Skip if audio doesn't exist
      audio.play().catch(error => {
        console.error(`Error playing audio: ${error.message}`);
        playNextTrigger();
      });
      
      // Also display the trigger visually
      flashTrigger(trigger.name);
    }
  }
  
  // Play a single audio file
  function playAudio(audioFile, username) {
    // Create audio element if it doesn't exist
    const audio = document.getElementById('trigger-audio') || createAudioElement();
    
    // Set the source and play
    audio.src = `/audio/${audioFile}`;
    audio.play().catch(error => {
      console.error(`Error playing audio: ${error.message}`);
    });
    
    // Show audio play message
    showAudioPlay(username, audioFile);
  }
  
  // Create audio element
  function createAudioElement() {
    const audio = document.createElement('audio');
    audio.id = 'trigger-audio';
    document.body.appendChild(audio);
    return audio;
  }
  
  // Show trigger activation message
  function showTriggerActivation(username, triggers) {
    const triggerNames = triggers.map(t => t.name).join(', ');
    
    const notificationArea = document.getElementById('notification-area') || createNotificationArea();
    
    const notification = document.createElement('div');
    notification.className = 'in-app-notification trigger-notification';
    notification.innerHTML = `
      <span class="notification-title">${username} activated triggers</span>
      <span class="notification-message">${triggerNames}</span>
    `;
    
    notificationArea.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
      notification.classList.add('notification-hiding');
      setTimeout(() => notification.remove(), 500);
    }, 5000);
  }
  
  // Show audio play message
  function showAudioPlay(username, audioFile) {
    const notificationArea = document.getElementById('notification-area') || createNotificationArea();
    
    const notification = document.createElement('div');
    notification.className = 'in-app-notification audio-notification';
    notification.innerHTML = `
      <span class="notification-title">${username} played audio</span>
      <span class="notification-message">${audioFile}</span>
    `;
    
    notificationArea.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.add('notification-hiding');
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }
  
  // Create notification area
  function createNotificationArea() {
    const notificationArea = document.createElement('div');
    notificationArea.id = 'notification-area';
    document.body.appendChild(notificationArea);
    return notificationArea;
  }
  
  // Flash trigger visually
  function flashTrigger(triggerName) {
    const triggerFlash = document.getElementById('trigger-flash') || createTriggerFlash();
    
    triggerFlash.textContent = triggerName;
    triggerFlash.classList.add('active');
    
    setTimeout(() => {
      triggerFlash.classList.remove('active');
    }, 2000);
  }
  
  // Create trigger flash element
  function createTriggerFlash() {
    const triggerFlash = document.createElement('div');
    triggerFlash.id = 'trigger-flash';
    document.body.appendChild(triggerFlash);
    return triggerFlash;
  }
}

// Export enhanced chat setup for use in other scripts
window.setupEnhancedChat = setupEnhancedChat;
