// XP progress module for handling XP progress bar and level display

(function() {
  // Store XP requirements
  const xpRequirements = [1000, 2500, 4500, 7000, 12000,36000, 112000, 332000];

  // Initialize module
  function init() {
    // Make XP requirements globally available
    window.xpRequirements = xpRequirements;
    
    // Set up socket listeners for XP updates if socket exists
    if (typeof socket !== 'undefined') {
      // Listen for profile-update events
      socket.on('profile-update', function(data) {
        updateXPDisplay(data);
      });
      
      // Listen for xp:update events
      socket.on('xp:update', function(data) {
        updateXPDisplay(data);
        if (window.bambiXP && typeof window.bambiXP.showXPNotification === 'function') {
          window.bambiXP.showXPNotification(data.xpEarned);
        }
      });
      
      // Listen for level-up events
      socket.on('level-up', function(data) {
        if (window.bambiXP && typeof window.bambiXP.showLevelUpNotification === 'function') {
          window.bambiXP.showLevelUpNotification(data.level);
        }
        
        // Update UI for new level instead of reloading
        updateUIForLevelUp(data.level);
      });
    }
  }
  
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
    updateUIForLevelUp
  };
  
  // Auto-initialize on load
  document.addEventListener('DOMContentLoaded', init);
})();