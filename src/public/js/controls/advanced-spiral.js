// Advanced spiral controls that communicate with the spirals worker
document.addEventListener('DOMContentLoaded', function() {
  // Core elements
  const saveBtn = document.getElementById('save-advanced-spirals');
  const enableToggle = document.getElementById('advanced-spirals-enable');
  const colorModeSelect = document.getElementById('spiral-color-mode');
  const performanceSelect = document.getElementById('spiral-performance-mode');
  const invertWaveToggle = document.getElementById('spiral-invert-wave');  const rainbowSpeedSlider = document.getElementById('rainbow-speed');
  const opacitySlider = document.getElementById('spiral-opacity');
  const showFpsToggle = document.getElementById('show-fps');
  const pulseButton = document.getElementById('spiral-pulse-start');
  const rainbowButton = document.getElementById('spiral-rainbow-start');
  const transButton = document.getElementById('spiral-trans-start');
  const stopButton = document.getElementById('spiral-animation-stop');
  
  // Skip if no advanced spirals panel
  if (!document.getElementById('advanced-spirals-panel')) return;
  
  // WebSocket connection
  let socket = null;
  
  // Current settings
  let currentSettings = {
    spiral1Width: 5.0,
    spiral2Width: 3.0,
    spiral1Speed: 20,
    spiral2Speed: 15,
    wavePatternInverted: false,
    colorMode: 'default',
    pulseRate: 0,
    performanceMode: 'balanced',
    rainbowSpeed: 5,
    opacityLevel: 1.0
  };
  
  // Initialize
  function init() {
    // Connect to WebSocket
    connectSocket();
    
    // Setup event listeners once elements are confirmed to exist
    setupListeners();
    
    // Request current settings
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'getSettings' }));
    }
  }
  
  // Connect to spirals WebSocket
  function connectSocket() {
    // Get username from data attribute or cookie
    const username = document.body.getAttribute('data-username') || 
                    document.cookie.split(';').find(c => c.trim().startsWith('bambiname='))?.split('=')[1] ||
                    'anonymous';
    
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/spirals?username=${encodeURIComponent(username)}`;
    
    socket = new WebSocket(wsUrl);
    
    // WebSocket event handlers
    socket.onopen = function() {
      console.log('Connected to spirals worker');
      
      // Request current settings
      socket.send(JSON.stringify({ action: 'getSettings' }));
      
      // Enable UI
      if (enableToggle) enableToggle.disabled = false;
      if (saveBtn) saveBtn.disabled = false;
    };
    
    socket.onmessage = function(event) {
      try {
        const data = JSON.parse(event.data);
        
        if (data.action === 'settings') {
          // Update current settings
          currentSettings = data.settings;
          
          // Update UI to reflect current settings
          updateUI();
        } 
        else if (data.action === 'updateAnimation') {
          // Apply animation updates to the spirals
          applyAnimationUpdate(data.params);
        }
      } catch (error) {
        console.error('Error processing spirals message:', error);
      }
    };
    
    socket.onclose = function() {
      console.log('Disconnected from spirals worker');
      
      // Disable UI
      if (enableToggle) enableToggle.disabled = true;
      if (saveBtn) saveBtn.disabled = true;
      
      // Try to reconnect after delay
      setTimeout(connectSocket, 5000);
    };
    
    socket.onerror = function(error) {
      console.error('Spirals WebSocket error:', error);
    };
  }
  
  // Setup event listeners
  function setupListeners() {
    // Only setup if elements exist
    if (saveBtn) {
      saveBtn.addEventListener('click', saveSettings);
    }
    
    if (enableToggle) {
      enableToggle.addEventListener('change', function() {
        updateSettings({ enabled: this.checked });
      });
    }
    
    if (colorModeSelect) {
      colorModeSelect.addEventListener('change', function() {
        updateSettings({ colorMode: this.value });
      });
    }
    
    if (performanceSelect) {
      performanceSelect.addEventListener('change', function() {
        updateSettings({ performanceMode: this.value });
      });
    }
    
    if (invertWaveToggle) {
      invertWaveToggle.addEventListener('change', function() {
        updateSettings({ wavePatternInverted: this.checked });
      });
    }
    
    if (rainbowSpeedSlider) {
      rainbowSpeedSlider.addEventListener('input', function() {
        const rainbowSpeedValue = document.getElementById('rainbow-speed-value');
        if (rainbowSpeedValue) {
          rainbowSpeedValue.textContent = this.value;
        }
      });
      
      rainbowSpeedSlider.addEventListener('change', function() {
        updateSettings({ rainbowSpeed: parseInt(this.value) });
      });
    }
    
    if (opacitySlider) {
      opacitySlider.addEventListener('input', function() {
        const opacityValue = document.getElementById('spiral-opacity-value');
        if (opacityValue) {
          opacityValue.textContent = this.value;
        }
      });
      
      opacitySlider.addEventListener('change', function() {
        updateSettings({ opacityLevel: parseFloat(this.value) });      });
    }
    
    if (showFpsToggle) {
      showFpsToggle.addEventListener('change', function() {
        if (typeof window.toggleFPSDisplay === 'function') {
          window.toggleFPSDisplay(this.checked);
        }
      });
    }
    
    // Animation buttons
    if (pulseButton) {
      pulseButton.addEventListener('click', function() {
        startAnimation('pulse');
      });
    }
    
    if (rainbowButton) {
      rainbowButton.addEventListener('click', function() {
        startAnimation('rainbow');
      });
    }
    
    if (transButton) {
      transButton.addEventListener('click', function() {
        startAnimation('trans');
      });
    }
    
    if (stopButton) {
      stopButton.addEventListener('click', function() {
        stopAnimation();
      });
    }
  }
  
  // Update UI to match current settings
  function updateUI() {
    if (!currentSettings) return;
      // Update checkbox states
    if (enableToggle) {
      enableToggle.checked = currentSettings.enabled || false;
    }
    
    if (invertWaveToggle) {
      invertWaveToggle.checked = currentSettings.wavePatternInverted || false;
    }
    
    if (showFpsToggle) {
      showFpsToggle.checked = currentSettings.showFPS || false;
    }
    
    // Update select values
    if (colorModeSelect) {
      colorModeSelect.value = currentSettings.colorMode || 'default';
    }
    
    if (performanceSelect) {
      performanceSelect.value = currentSettings.performanceMode || 'balanced';
    }
    
    // Update slider values
    if (rainbowSpeedSlider) {
      rainbowSpeedSlider.value = currentSettings.rainbowSpeed || 5;
      const rainbowSpeedValue = document.getElementById('rainbow-speed-value');
      if (rainbowSpeedValue) {
        rainbowSpeedValue.textContent = currentSettings.rainbowSpeed || 5;
      }
    }
    
    if (opacitySlider) {
      opacitySlider.value = currentSettings.opacityLevel || 1.0;
      const opacityValue = document.getElementById('spiral-opacity-value');
      if (opacityValue) {
        opacityValue.textContent = currentSettings.opacityLevel || 1.0;
      }
    }
  }
  
  // Save current settings
  function saveSettings() {
    // Get form values and update settings
    const newSettings = { ...currentSettings };
    
    if (enableToggle) {
      newSettings.enabled = enableToggle.checked;
    }
    
    if (colorModeSelect) {
      newSettings.colorMode = colorModeSelect.value;
    }
    
    if (performanceSelect) {
      newSettings.performanceMode = performanceSelect.value;
    }
      if (invertWaveToggle) {
      newSettings.wavePatternInverted = invertWaveToggle.checked;
    }
    
    if (showFpsToggle) {
      newSettings.showFPS = showFpsToggle.checked;
    }
    
    if (rainbowSpeedSlider) {
      newSettings.rainbowSpeed = parseInt(rainbowSpeedSlider.value);
    }
    
    if (opacitySlider) {
      newSettings.opacityLevel = parseFloat(opacitySlider.value);
    }
    
    // Send updated settings to server
    updateSettings(newSettings);
    
    // Notify user
    showMessage('Advanced spiral settings saved!');
    
    // Save to bambiSystem if available
    if (window.bambiSystem?.saveState) {
      window.bambiSystem.saveState('advancedSpirals', newSettings);
    }
  }
  
  // Update settings via WebSocket
  function updateSettings(settings) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        action: 'updateSettings',
        settings: settings
      }));
    } else {
      console.warn('WebSocket not connected, could not update settings');
    }
  }
  
  // Start an animation
  function startAnimation(type) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        action: 'startAnimation',
        type: type
      }));
      
      // Update UI button states
      setAnimationButtonStates(type);
    }
  }
  
  // Stop animations
  function stopAnimation() {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        action: 'stopAnimation'
      }));
      
      // Reset button states
      setAnimationButtonStates(null);
    }
  }
  
  // Update button states based on active animation
  function setAnimationButtonStates(activeType) {
    const buttons = [pulseButton, rainbowButton, transButton];
    const stopBtnElement = stopButton;
    
    buttons.forEach(btn => {
      if (btn) {
        btn.disabled = activeType !== null;
      }
    });
    
    if (stopBtnElement) {
      stopBtnElement.disabled = activeType === null;
    }
  }
  
  // Apply animation updates from server
  function applyAnimationUpdate(params) {
    // If window.updateSpiralParams exists, call it with the new parameters
    if (typeof window.updateSpiralParams === 'function') {
      if (params.spiral1Speed && params.spiral2Speed) {
        window.updateSpiralParams(
          currentSettings.spiral1Width,
          currentSettings.spiral2Width,
          params.spiral1Speed,
          params.spiral2Speed
        );
      }
    }
    
    // For color updates, we need a different approach
    if (params.spiral1Color && params.spiral2Color) {
      if (typeof window.updateSpiralColors === 'function') {
        window.updateSpiralColors(params.spiral1Color, params.spiral2Color);
      }
    }
    
    // For wave pattern inversion
    if (params.wavePatternInverted !== undefined) {
      if (typeof window.invertSpiralWavePattern === 'function') {
        window.invertSpiralWavePattern(params.wavePatternInverted);
      }
      
      // Update the UI if needed
      if (invertWaveToggle) {
        invertWaveToggle.checked = params.wavePatternInverted;
      }
    }
  }
  
  // Show message
  function showMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'success-message';
    msg.textContent = text;
    msg.style.position = 'absolute';
    msg.style.bottom = '10px';
    msg.style.left = '50%';
    msg.style.transform = 'translateX(-50%)';
    msg.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
    msg.style.color = '#00ff00';
    msg.style.padding = '5px 10px';
    msg.style.borderRadius = '4px';
    
    const panel = document.getElementById('advanced-spirals-panel');
    if (panel) {
      panel.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);
    }
  }
  
  // Start initialization
  init();
});
