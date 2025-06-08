// Simple trigger control system
document.addEventListener('DOMContentLoaded', function() {
  // Core elements
  const triggerList = document.getElementById('trigger-list');
  
  // Skip if no trigger list exists
  if (!triggerList) return;
  
  // Flag to track if triggers are already loaded
  if (window.triggerControlsInitialized) return;
  window.triggerControlsInitialized = true;
  
  // Initialize
  function init() {
    setupToggleListeners();
    setupActionButtons();
    loadSavedTriggers();
    
    // Notify system when ready
    document.dispatchEvent(new Event('trigger-controls-loaded'));
  }
  
  // Set up toggle listeners
  function setupToggleListeners() {
    document.querySelectorAll('.toggle-input').forEach(toggle => {
      toggle.addEventListener('change', function() {
        saveTriggerState();
        
        // Award XP when enabling a trigger
        if (this.checked && window.socket?.connected) {
          window.socket.emit('award-xp', {
            username: document.body.getAttribute('data-username'),
            amount: 3,
            action: 'trigger_used'
          });
        }
      });
    });
  }
  
  // Set up action buttons
  function setupActionButtons() {
    const selectAll = document.getElementById('select-all-triggers');
    const clearAll = document.getElementById('clear-all-triggers');
    const activateAll = document.getElementById('activate-all');
    const playTriggers = document.getElementById('play-triggers');
      if (activateAll) {
      activateAll.addEventListener('click', function() {
        const toggles = document.querySelectorAll('.toggle-input');
        const anyChecked = Array.from(toggles).some(t => t.checked);
        toggles.forEach(t => t.checked = !anyChecked);
        saveTriggerState();
      });
    }
    
    if (selectAll) {
      selectAll.addEventListener('click', function() {
        document.querySelectorAll('.toggle-input').forEach(t => t.checked = true);
        saveTriggerState();
      });
    }
    
    if (clearAll) {
      clearAll.addEventListener('click', function() {
        document.querySelectorAll('.toggle-input').forEach(t => t.checked = false);
        saveTriggerState();
      });
    }
    
    if (playTriggers) {
      playTriggers.addEventListener('click', function() {
        if (window.bambiAudio?.playRandomPlaylist) {
          window.bambiAudio.playRandomPlaylist();
        }
      });
    }
  }
  
  // Load saved triggers
  function loadSavedTriggers() {
    // Get triggers from system state
    let triggers = [];
    
    if (window.bambiSystem?.state?.triggers) {
      triggers = window.bambiSystem.state.triggers;
    } else {      // Fallback to localStorage
      try {
        const saved = localStorage.getItem('bambiActiveTriggers');
        if (saved && saved !== 'null' && saved !== '[object Object]') {
          const parsed = JSON.parse(saved);
          triggers = Array.isArray(parsed) ? parsed : [];
        }
      } catch (e) {
        console.error('Error loading triggers', e);
      }
    }
    
    // Apply to UI
    if (triggers.length > 0) {
      document.querySelectorAll('.toggle-input').forEach(toggle => {
        const name = toggle.getAttribute('data-trigger');
        if (name) {
          // Check if trigger name exists in the array
          const found = triggers.find(t => 
            (typeof t === 'string' && t === name) || 
            (t.name === name)
          );
          
          if (found) toggle.checked = true;
        }
      });
    }
  }
  
  // Save trigger state
  function saveTriggerState() {
    const triggers = [];
    document.querySelectorAll('.toggle-input:checked').forEach(toggle => {
      const name = toggle.getAttribute('data-trigger');
      const desc = toggle.getAttribute('data-description') || 'Trigger effect';
      
      if (name) triggers.push({name, description: desc});
    });
    
    // Save to localStorage
    const triggerNames = triggers.map(t => t.name);
    localStorage.setItem('bambiActiveTriggers', JSON.stringify(triggerNames));
    
    // Send to server
    if (window.socket?.connected) {
      const username = document.body.getAttribute('data-username');
      if (username) {
        window.socket.emit('triggers', {
          triggerNames: triggerNames,
          triggerDetails: triggers,
          username
        });
      }
    }
  }
  
  // Start initialization
  init();
});