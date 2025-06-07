// Central state manager for all bambi system controls
window.bambiSystem = (function() {
  // Core state storage for all control features
  const state = {
    triggers: [],
    collar: { enabled: false, text: '' },
    spirals: {
      enabled: false,
      spiral1Width: 5.0,
      spiral2Width: 3.0,
      spiral1Speed: 20,
      spiral2Speed: 15
    },
    brainwaves: {
      enabled: false,
      mode: 'alpha',
      frequency: 10,
      carrier: 200,
      volume: 50
    },
    advanced: {
      enabled: false,
      pattern: 'descent',
      custom: [],
      duration: 20,
      transition: 30
    },
    streaming: {
      enabled: false
    }
  };

  // Initialize system
  function init() {
    loadState();
    listenForEvents();
  }

  // Load saved state from storage
  function loadState() {
    try {
      const saved = localStorage.getItem('bambiSystemState');
      if (saved) Object.assign(state, JSON.parse(saved));
    } catch (e) {
      console.error('Error loading system state:', e);
    }
  }

  // Save section state
  function saveState(section, data) {
    if (!section || !data) return;
    
    if (section === 'triggers') {
      state.triggers = Array.isArray(data.triggers) ? data.triggers : [];
    } else {
      state[section] = {...state[section], ...data};
    }

    // Save to storage
    localStorage.setItem('bambiSystemState', JSON.stringify(state));
    
    // Notify components
    document.dispatchEvent(new CustomEvent('system-update', {
      detail: { section, data: state[section] }
    }));
  }

  // Setup event listeners
  function listenForEvents() {
    document.addEventListener('session-loaded', e => {
      if (!e.detail?.session) return;
      const session = e.detail.session;
      
      // Update state with session data
      if (session.activeTriggers) {
        saveState('triggers', {triggers: session.activeTriggers});
      }
      
      if (session.collarSettings) {
        saveState('collar', session.collarSettings);
      }
      
      if (session.spiralSettings) {
        saveState('spirals', session.spiralSettings);
      }
      
      if (session.brainwaveSettings) {
        saveState('brainwaves', session.brainwaveSettings);
      }
    });
    
    // Listen for component loads
    document.addEventListener('DOMContentLoaded', () => {
      loadLastTab();
      setupStreamingControls();
    });
  }

  // Load last active tab
  function loadLastTab() {
    const lastTab = localStorage.getItem('bambiLastTab');
    if (lastTab) {
      const tabButton = document.querySelector(`.control-btn[data-target="${lastTab}"]`);
      if (tabButton && !tabButton.classList.contains('disabled')) {
        tabButton.click();
      }
    }
  }

  // Setup streaming controls
  function setupStreamingControls() {
    const streamingToggle = document.getElementById('streaming-enable');
    if (streamingToggle) {
      // Initialize with current state
      streamingToggle.checked = state.streaming?.enabled || false;
      
      // Listen for changes
      streamingToggle.addEventListener('change', () => {
        saveState('streaming', { enabled: streamingToggle.checked });
        
        // Notify window streaming handler
        if (window.streamingHandler) {
          window.streamingHandler.toggleEnabled(streamingToggle.checked);
        }
        
        // Update the user's session metadata
        updateSystemSettings();
      });
    }
  }
  // Get settings for external use
  function getSettings() {
    return JSON.parse(JSON.stringify(state)); // Return a copy
  }

  // Load profile data
  function loadProfile(profile) {
    if (!profile?.systemControls) return;
    
    // Map profile data to state sections
    const controls = profile.systemControls;
    
    // Triggers
    if (controls.activeTriggers) {
      state.triggers = controls.activeTriggers.map(name => ({
        name, description: 'Trigger effect'
      }));
    }
    
    // Collar
    if (controls.collarEnabled !== undefined) {
      state.collar = {
        enabled: controls.collarEnabled,
        text: controls.collarText || ''
      };
    }
    
    // Spirals
    if (controls.spiralsEnabled !== undefined) {
      state.spirals = {
        enabled: controls.spiralsEnabled,
        spiral1Width: controls.spiral1Width || 5.0,
        spiral2Width: controls.spiral2Width || 3.0,
        spiral1Speed: controls.spiral1Speed || 20,
        spiral2Speed: controls.spiral2Speed || 15
      };
    }
    
    // Brainwaves
    if (controls.brainwaveEnabled !== undefined) {
      state.brainwaves = {
        enabled: controls.brainwaveEnabled,
        mode: controls.brainwaveMode || 'alpha',
        frequency: controls.customFrequency || 10,
        carrier: controls.carrierFrequency || 200,
        volume: controls.brainwaveVolume || 50
      };
    }
    
    // Streaming
    if (controls.useStreaming !== undefined) {
      state.streaming = {
        enabled: !!controls.useStreaming
      };
    }
    
    // Advanced binaural
    if (controls.advancedBinauralEnabled !== undefined) {
      state.advanced = {
        enabled: controls.advancedBinauralEnabled,
        pattern: controls.binauralPattern || 'descent',
        duration: controls.patternDuration || 20,
        transition: controls.transitionTime || 30,
        custom: controls.customPattern || []
      };
    }
    
    // Save state
    localStorage.setItem('bambiSystemState', JSON.stringify(state));
  }
  // Public API
  return {
    init,
    saveState,
    getSettings,
    loadProfile,
    state // For direct access when needed
  };
})();

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  window.bambiSystem.init();
  socket.emit('system-settings', window.bambiSystem.getSettings());
});