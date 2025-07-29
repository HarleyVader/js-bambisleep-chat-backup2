// Enhanced XP progress module with realtime stats and analytics

(function() {
  // Store XP requirements
  const xpRequirements = [1000, 2500, 4500, 7000, 12000, 36000, 112000, 332000];
  
  // Realtime stats tracking
  let realtimeStats = {
    sessionXP: 0,
    sessionStartTime: Date.now(),
    xpPerHour: 0,
    lastXPAward: null,
    activityCount: {
      messages: 0,
      triggers: 0,
      audio: 0
    }
  };

  // Initialize module
  function init() {
    // Make XP requirements globally available
    window.xpRequirements = xpRequirements;
    
    // Initialize realtime stats display
    initRealtimeStatsDisplay();
    
    // Set up socket listeners for XP updates if socket exists
    if (typeof socket !== 'undefined') {
      setupSocketListeners();
    }
    
    // Start periodic updates
    startPeriodicUpdates();
  }

  // Setup socket event listeners for realtime updates
  function setupSocketListeners() {
    // Enhanced XP update with realtime stats
    socket.on('stats:xp:update', function(data) {
      updateXPDisplay(data);
      updateRealtimeStats(data);
      
      if (window.bambiXP && typeof window.bambiXP.showXPNotification === 'function') {
        window.bambiXP.showXPNotification(data.amount, data.reason);
      }
    });

    // Activity tracking updates
    socket.on('stats:activity:update', function(data) {
      updateActivityStats(data);
    });

    // Session ended
    socket.on('session:ended', function(data) {
      showSessionSummary(data);
    });
    
    // Legacy support for existing events
    socket.on('profile-update', function(data) {
      updateXPDisplay(data);
    });
    
    socket.on('xp:update', function(data) {
      updateXPDisplay(data);
      if (window.bambiXP && typeof window.bambiXP.showXPNotification === 'function') {
        window.bambiXP.showXPNotification(data.xpEarned);
      }
    });
    
    socket.on('level-up', function(data) {
      if (window.bambiXP && typeof window.bambiXP.showLevelUpNotification === 'function') {
        window.bambiXP.showLevelUpNotification(data.level);
      }
      updateUIForLevelUp(data.level);
    });
  }
  
  // Initialize realtime stats display
  function initRealtimeStatsDisplay() {
    createRealtimeStatsPanel();
    realtimeStats.sessionStartTime = Date.now();
  }

  // Create realtime stats panel
  function createRealtimeStatsPanel() {
    // Check if stats panel already exists
    if (document.getElementById('realtime-stats-panel')) return;
    
    const statsPanel = document.createElement('div');
    statsPanel.id = 'realtime-stats-panel';
    statsPanel.className = 'realtime-stats-panel';
    statsPanel.innerHTML = `
      <div class="stats-header">
        <h4>📊 Live Session Stats</h4>
        <button class="toggle-stats" onclick="window.bambiXPProgress.toggleStatsPanel()">−</button>
      </div>
      <div class="stats-content">
        <div class="stat-row">
          <span class="stat-label">Session XP:</span>
          <span class="stat-value" id="session-xp">0</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">XP/Hour:</span>
          <span class="stat-value" id="xp-per-hour">0</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Session Time:</span>
          <span class="stat-value" id="session-time">0m</span>
        </div>
        <div class="activity-stats">
          <div class="activity-row">
            <span class="activity-label">💬 Messages:</span>
            <span class="activity-value" id="messages-count">0</span>
          </div>
          <div class="activity-row">
            <span class="activity-label">⚡ Triggers:</span>
            <span class="activity-value" id="triggers-count">0</span>
          </div>
          <div class="activity-row">
            <span class="activity-label">🔊 Audio:</span>
            <span class="activity-value" id="audio-count">0</span>
          </div>
        </div>
        <div class="last-xp-award" id="last-xp-award" style="display: none;">
          <span class="award-text"></span>
        </div>
      </div>
    `;
    
    // Insert after XP progress container or at beginning of body
    const xpContainer = document.querySelector('.xp-progress-container');
    if (xpContainer && xpContainer.parentNode) {
      xpContainer.parentNode.insertBefore(statsPanel, xpContainer.nextSibling);
    } else {
      document.body.appendChild(statsPanel);
    }
  }

  // Update realtime stats from websocket data
  function updateRealtimeStats(data) {
    realtimeStats.sessionXP = data.sessionXP || realtimeStats.sessionXP;
    realtimeStats.xpPerHour = data.xpPerHour || 0;
    realtimeStats.lastXPAward = {
      amount: data.amount,
      reason: data.reason,
      timestamp: Date.now()
    };
    
    updateStatsDisplay();
    showLastXPAward(data.amount, data.reason);
  }

  // Update activity stats
  function updateActivityStats(data) {
    if (data.sessionStats && data.sessionStats.activities) {
      realtimeStats.activityCount = data.sessionStats.activities;
      updateStatsDisplay();
    }
  }

  // Update stats display elements
  function updateStatsDisplay() {
    const sessionXPEl = document.getElementById('session-xp');
    const xpPerHourEl = document.getElementById('xp-per-hour');
    const sessionTimeEl = document.getElementById('session-time');
    const messagesEl = document.getElementById('messages-count');
    const triggersEl = document.getElementById('triggers-count');
    const audioEl = document.getElementById('audio-count');
    
    if (sessionXPEl) sessionXPEl.textContent = realtimeStats.sessionXP;
    if (xpPerHourEl) xpPerHourEl.textContent = Math.round(realtimeStats.xpPerHour);
    
    // Update session time
    const sessionMinutes = Math.floor((Date.now() - realtimeStats.sessionStartTime) / 60000);
    if (sessionTimeEl) {
      if (sessionMinutes < 60) {
        sessionTimeEl.textContent = `${sessionMinutes}m`;
      } else {
        const hours = Math.floor(sessionMinutes / 60);
        const mins = sessionMinutes % 60;
        sessionTimeEl.textContent = `${hours}h ${mins}m`;
      }
    }
    
    // Update activity counts
    if (messagesEl) messagesEl.textContent = realtimeStats.activityCount.messages || 0;
    if (triggersEl) triggersEl.textContent = realtimeStats.activityCount.triggers || 0;
    if (audioEl) audioEl.textContent = realtimeStats.activityCount.audio || 0;
  }

  // Show last XP award notification in stats panel
  function showLastXPAward(amount, reason) {
    const lastXPEl = document.getElementById('last-xp-award');
    if (lastXPEl) {
      const awardText = lastXPEl.querySelector('.award-text');
      if (awardText) {
        awardText.textContent = `+${amount} XP (${reason})`;
        lastXPEl.style.display = 'block';
        lastXPEl.classList.add('flash-award');
        
        setTimeout(() => {
          lastXPEl.classList.remove('flash-award');
          setTimeout(() => {
            lastXPEl.style.display = 'none';
          }, 3000);
        }, 1000);
      }
    }
  }

  // Show session summary when session ends
  function showSessionSummary(data) {
    const summaryModal = document.createElement('div');
    summaryModal.className = 'session-summary-modal';
    summaryModal.innerHTML = `
      <div class="summary-content">
        <h3>🎉 Session Complete!</h3>
        <div class="summary-stats">
          <div class="summary-stat">
            <span class="stat-number">${data.xpEarned}</span>
            <span class="stat-label">XP Earned</span>
          </div>
          <div class="summary-stat">
            <span class="stat-number">${Math.round(data.duration / 60000)}</span>
            <span class="stat-label">Minutes</span>
          </div>
          <div class="summary-stat">
            <span class="stat-number">${Math.round(data.stats?.xpPerHour || 0)}</span>
            <span class="stat-label">XP/Hour</span>
          </div>
        </div>
        <div class="activity-summary">
          <p>💬 Messages: ${data.stats?.activities?.messages || 0}</p>
          <p>⚡ Triggers: ${data.stats?.activities?.triggers || 0}</p>
          <p>🔊 Audio: ${data.stats?.activities?.audio || 0}</p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()">Close</button>
      </div>
    `;
    
    document.body.appendChild(summaryModal);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (summaryModal.parentNode) {
        summaryModal.remove();
      }
    }, 10000);
  }

  // Start periodic updates for session time
  function startPeriodicUpdates() {
    setInterval(() => {
      updateStatsDisplay();
    }, 30000); // Update every 30 seconds
  }

  // Toggle stats panel visibility
  function toggleStatsPanel() {
    const panel = document.getElementById('realtime-stats-panel');
    const content = panel?.querySelector('.stats-content');
    const toggle = panel?.querySelector('.toggle-stats');
    
    if (content && toggle) {
      if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '−';
      } else {
        content.style.display = 'none';
        toggle.textContent = '+';
      }
    }
  }
    const xpLabel = document.getElementById('xp-progress-label');
    const xpFill = document.getElementById('xp-progress-fill');
    
    if (!xpLabel || !xpFill) return;
    
  
  // Update XP progress display  
  function updateXPDisplay(data) {
    const xpLabel = document.getElementById('xp-progress-label');
    const xpFill = document.getElementById('xp-progress-fill');
    
    if (!xpLabel || !xpFill) return;
    
    const level = data.level || 0;
    const xp = data.xp || 0;
    
    // Add animation class and then remove it
    xpLabel.classList.add('updating');
    setTimeout(() => xpLabel.classList.remove('updating'), 600);
    
    // Update the label text
    if (level < xpRequirements.length) {
      const nextLevelXP = xpRequirements[level];
      xpLabel.textContent = `Level ${level} • ${xp} XP / ${nextLevelXP} XP`;
      
      // Update progress bar width
      const percentage = Math.min(100, (xp / Math.max(1, nextLevelXP)) * 100);
      xpFill.style.width = `${percentage}%`;
    } else {
      xpLabel.textContent = `Level ${level} • ${xp} XP (MAX LEVEL)`;
      xpFill.style.width = '100%';
    }
  }
  
  // Update UI when user levels up
  function updateUIForLevelUp(newLevel) {
    // Update level-locked buttons
    const controlButtons = document.querySelectorAll('.control-btn.disabled');
    controlButtons.forEach(button => {
      const buttonText = button.textContent.trim();
      if (buttonText.includes('🔒')) {
        const featureName = buttonText.replace(' 🔒', '');
        
        // Determine which level this feature unlocks at
        let unlockLevel = 0;
        if (featureName === 'Triggers') unlockLevel = 1;
        else if (featureName === 'Collar') unlockLevel = 2;
        else if (featureName === 'Spirals') unlockLevel = 3;
        else if (featureName === 'Audios') unlockLevel = 4;
        else if (featureName === 'Brainwaves') unlockLevel = 5;
        else if (featureName === 'Advanced Binaural') unlockLevel = 6;
        
        // If new level unlocks this feature, update the button
        if (newLevel >= unlockLevel) {
          button.classList.remove('disabled');
          button.removeAttribute('title');
          button.textContent = featureName;
          button.setAttribute('data-target', `${featureName.toLowerCase().replace(' ', '-')}-panel`);
          
          // Create corresponding panel if it doesn't exist
          createFeaturePanel(featureName, unlockLevel);
        }
      }
    });
    
    // If we unlocked Triggers at level 1, remove the locked message
    if (newLevel >= 1) {
      const lockedMessage = document.querySelector('.locked-features-message');
      if (lockedMessage) {
        lockedMessage.style.display = 'none';
        
        // Show the trigger panel
        const triggerPanel = document.getElementById('trigger-panel');
        if (triggerPanel) {
          triggerPanel.classList.add('active');
        }
      }
    }
    
    // Dispatch event so other components can react to the level up
    document.dispatchEvent(new CustomEvent('bambi-level-up', {
      detail: { level: newLevel }
    }));
  }
  
  // Helper function to create feature panels for newly unlocked features
  function createFeaturePanel(featureName, level) {
    // This is just a basic implementation - actual panel creation would be more complex
    // and should probably be handled by the server providing new HTML
    
    const consolePanels = document.getElementById('console');
    if (!consolePanels) return;
    
    const panelId = `${featureName.toLowerCase().replace(' ', '-')}-panel`;
    
    // Don't create if panel already exists
    if (document.getElementById(panelId)) return;
    
    const panel = document.createElement('div');
    panel.id = panelId;
    panel.className = 'control-panel';
    
    const title = document.createElement('h3');
    title.textContent = `${featureName} Settings`;
    
    const message = document.createElement('p');
    message.textContent = `${featureName} feature has been unlocked! Refresh the page to see full functionality.`;
    message.style.color = '#00ffff';
    
    panel.appendChild(title);
    panel.appendChild(message);
    consolePanels.appendChild(panel);
  }
  
  // Export functions
  window.bambiXPProgress = {
    init,
    updateXPDisplay,
    updateUIForLevelUp,
    toggleStatsPanel
  };
  
  // Auto-initialize on load
  document.addEventListener('DOMContentLoaded', init);
})();