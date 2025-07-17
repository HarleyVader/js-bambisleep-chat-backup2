/**
 * Enhanced Chat Features for BambiSleep Chat
 * Handles URL formatting only - mentions and triggers handled in chat.ejs
 */

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait for socket to be available from chat.ejs
  setTimeout(() => {
    if (window.socket) {
      setupEnhancedChat();
    }
  }, 100);
});

/**
 * Set up enhanced chat features
 */
function setupEnhancedChat() {
  // Use existing socket from global scope
  const socket = window.socket;
  
  if (!socket) {
    console.warn('Socket not available for enhanced chat features');
    return;
  }
  
  // Set up event listeners for enhanced features
  setupURLHandling(socket);
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
          if (node.nodeType === 1) {
            const messageSpan = node.querySelector('.chat-message');
            if (messageSpan) {
              formatURLs(messageSpan);
            }
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

// Export enhanced chat setup for use in other scripts
window.setupEnhancedChat = setupEnhancedChat;
