/**
 * Simple UI synchronization without page reloads
 * Uses existing socket connection to broadcast state changes
 */

class UISync {
  constructor(socket) {
    this.socket = socket;
    this.setupEventListeners();
  }

  // Broadcast any UI state change to all connected clients
  broadcastChange(type, data) {
    this.socket.emit('ui-change', { type, data, timestamp: Date.now() });
  }

  // Listen for UI changes from other clients/server
  setupEventListeners() {
    this.socket.on('ui-update', (change) => {
      this.applyUIChange(change.type, change.data);
    });
  }

  // Apply UI changes without page reload
  applyUIChange(type, data) {
    switch(type) {
      case 'profile-update':
        this.updateProfileDisplay(data);
        break;
      case 'xp-update':
        this.updateXPDisplay(data);
        break;
      case 'settings-update':
        this.updateSettings(data);
        break;
      case 'font-update':
        this.updateFontSettings(data);
        break;
    }
  }

  updateProfileDisplay(data) {
    // Update profile without reload
    const profileImg = document.querySelector('.profile-picture img, #profile-picture');
    if (profileImg && data.profilePicture) {
      profileImg.src = data.profilePicture + '?t=' + Date.now();
    }
    
    const usernameEls = document.querySelectorAll('.username, .user-name');
    if (data.username) {
      usernameEls.forEach(el => el.textContent = data.username);
    }
  }

  updateXPDisplay(data) {
    const xpEl = document.querySelector('#current-xp, .xp-display');
    const levelEl = document.querySelector('#current-level, .level-display');
    
    if (xpEl && data.xp !== undefined) xpEl.textContent = data.xp;
    if (levelEl && data.level !== undefined) levelEl.textContent = data.level;
    
    // Update progress bar if exists
    const progressBar = document.querySelector('.xp-progress-bar, #xp-progress');
    if (progressBar && data.progress !== undefined) {
      progressBar.style.width = data.progress + '%';
    }
  }

  updateSettings(data) {
    // Update localStorage and UI elements
    Object.keys(data).forEach(key => {
      localStorage.setItem(key, data[key]);
      
      // Find and update corresponding UI elements
      const input = document.querySelector(`[data-setting="${key}"], #${key}`);
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = data[key] === 'true' || data[key] === true;
        } else {
          input.value = data[key];
        }
      }
    });
  }

  updateFontSettings(data) {
    // Apply font changes immediately
    const chatContainer = document.querySelector('#chat-container, .chat-messages');
    if (chatContainer && data.fontSize) {
      chatContainer.style.fontSize = data.fontSize + 'px';
    }
    if (chatContainer && data.fontFamily) {
      chatContainer.style.fontFamily = data.fontFamily;
    }
    
    // Update localStorage
    if (data.fontSize) localStorage.setItem('chatFontSize', data.fontSize);
    if (data.fontFamily) localStorage.setItem('chatFontFamily', data.fontFamily);
  }
}

// Auto-initialize if socket exists
if (typeof socket !== 'undefined') {
  window.uiSync = new UISync(socket);
}
