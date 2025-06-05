let triggerData = []; // Will hold the data from triggers.json
const audioCache = {};
let audioLoadAttempts = {};
const MAX_LOAD_ATTEMPTS = 2;

// Static fallback trigger data if JSON fails to load
const fallbackTriggerData = [
  { name: "BAMBI SLEEP", description: "Primary conditioning trigger for Bambi personality" },
  { name: "GOOD GIRL", description: "Makes you feel pleasure when obeying commands" },
  { name: "BAMBI RESET", description: "Resets Bambi to default programming state" },
  { name: "BIMBO DOLL", description: "Turns you into a mindless, giggly bimbo doll" },
  { name: "BAMBI FREEZE", description: "Locks you in place, unable to move" }
];

const textElements = [
  document.getElementById("eyeCursorText"),
  document.getElementById("eyeCursorText2"),
  document.getElementById("eyeCursorText3"),
  document.getElementById("eyeCursorText4")
].filter(element => element !== null);

// Load trigger data from JSON file with error handling
function loadTriggerData() {
  fetch('/config/triggers.json')
    .then(response => {
      if (!response.ok) throw new Error('Failed to load trigger data');
      return response.json();
    })
    .then(data => {
      triggerData = data.triggers;
      createToggleButtons();
      preloadSelectedAudio();
    })
    .catch(error => {
      console.log('Error loading trigger data, using fallback:', error);
      
      // Use fallback trigger data
      triggerData = fallbackTriggerData;
      createToggleButtons();
      
      // Try loading from localStorage if available
      try {
        const storedTriggers = localStorage.getItem('bambiActiveTriggers');
        if (storedTriggers) {
          const parsedTriggers = JSON.parse(storedTriggers);
          if (Array.isArray(parsedTriggers) && parsedTriggers.length > 0) {
            console.log('Loaded triggers from localStorage:', parsedTriggers);
            updateTriggerToggles(parsedTriggers);
          }
        }
      } catch (storageError) {
        console.error('Error loading from localStorage:', storageError);
      }
    });
}

// Create toggle buttons for each trigger
function createToggleButtons() {
  const container = document.getElementById('trigger-list');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Check if we have active triggers in localStorage
  let activeTriggerNames = [];
  try {
    const storedActiveTriggers = localStorage.getItem('bambiActiveTriggers');
    if (storedActiveTriggers) {
      activeTriggerNames = JSON.parse(storedActiveTriggers);
      // Ensure it's an array
      if (!Array.isArray(activeTriggerNames)) {
        activeTriggerNames = storedActiveTriggers.split(',').map(t => t.trim());
      }
    }
  } catch (error) {
    console.log('Error loading active triggers from localStorage:', error);
  }
  
  // Ensure we actually have trigger data to display
  if (!triggerData || triggerData.length === 0) {
    container.innerHTML = '<p>No triggers available. Please refresh the page.</p>';
    return;
  }
  
  triggerData.forEach(trigger => {
    const toggleItem = document.createElement('div');
    toggleItem.className = 'trigger-toggle-item';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'toggle-input';
    input.id = `trigger-${trigger.name.replace(/\s+/g, '-').toLowerCase()}`;
    input.dataset.triggerName = trigger.name;
    
    // Check the toggle if this trigger is active
    if (Array.isArray(activeTriggerNames) && activeTriggerNames.includes(trigger.name)) {
      input.checked = true;
    }
    
    const label = document.createElement('label');
    label.className = 'toggle-label';
    label.htmlFor = input.id;
    label.textContent = trigger.name;
    label.title = trigger.description || '';
    
    toggleItem.appendChild(input);
    toggleItem.appendChild(label);
    container.appendChild(toggleItem);
  });
  
  // Setup toggle listeners
  setupToggleListeners();

  // Dispatch event to notify that triggers have been loaded
  document.dispatchEvent(new CustomEvent('triggers-loaded', { 
    detail: { triggers: triggerData } 
  }));
}

// Load audio for a specific trigger with better error handling
function loadTriggerAudio(trigger) {
  if (!trigger || !trigger.name) return null;
  
  // Return cached audio if available
  if (audioCache[trigger.name]) return audioCache[trigger.name];
  
  // Track load attempts
  if (!audioLoadAttempts[trigger.name]) {
    audioLoadAttempts[trigger.name] = 0;
  }
  
  // Don't try loading again if we've exceeded max attempts
  if (audioLoadAttempts[trigger.name] >= MAX_LOAD_ATTEMPTS) {
    return null;
  }
  
  audioLoadAttempts[trigger.name]++;
  
  const audio = new Audio();
  
  // Try multiple file patterns for better compatibility
  let audioLocations = [];
  
  // Use filename from trigger data if available
  if (trigger.filename) {
    audioLocations.push(`/audio/${trigger.filename}`);
  } 
  
  // Add standard naming patterns
  const formattedName = trigger.name.replace(/\s+/g, '-');
  audioLocations.push(`/audio/${formattedName}.mp3`);
  audioLocations.push(`/audio/${formattedName}.wav`);
  audioLocations.push(`/audio/${formattedName.toLowerCase()}.mp3`);
  
  // Try camel case variant
  const camelCase = formattedName.replace(/-([a-z])/g, g => g[1].toUpperCase());
  audioLocations.push(`/audio/${camelCase}.mp3`);
  
  // Use the first location for initial attempt
  audio.src = audioLocations[0];
  
  // Cache audio reference
  audioCache[trigger.name] = audio;
  
  // Track the current location attempt
  let currentLocationIndex = 0;
  
  // Handle errors - try next location pattern on failure
  audio.addEventListener('error', () => {
    currentLocationIndex++;
    
    if (currentLocationIndex < audioLocations.length) {
      // Try the next location
      audio.src = audioLocations[currentLocationIndex];
    } else {
      // All locations failed
      if (window.errorHandler) {
        window.errorHandler.handleAudioError(audio.src, trigger.name);
      } else {
        console.log(`Failed to load audio: ${trigger.name}`);
      }
    }
  });
  
  return audio;
}

// Only preload selected trigger audio files (don't play them)
function preloadSelectedAudio() {
  const selectedTriggers = getSelectedTriggers();
  
  if (!selectedTriggers.length) return;
  
  selectedTriggers.forEach(trigger => {
    // Just load the audio, don't play it
    loadTriggerAudio(trigger);
  });
}

// Add a global variable to track playback speed
let playbackSpeedFactor = 1.0;

// Function to update playback speed
function updatePlaybackSpeed(speedFactor) {
  playbackSpeedFactor = speedFactor;
}

// Add this after the playbackSpeedFactor variable
let playbackVolumeFactor = 1.0;

// Add this function after updatePlaybackSpeed
function updatePlaybackVolume(volumeFactor) {
  playbackVolumeFactor = volumeFactor;
}

// Modified function to play trigger sound with error handling and volume control
function playTriggerSound(triggerName) {
  const trigger = triggerData.find(t => t.name === triggerName);
  
  // Load audio if not already loaded
  if (trigger && !audioCache[triggerName]) {
    loadTriggerAudio(trigger);
  }
  
  // Check if audio is available
  if (!audioCache[triggerName]) {
    console.log(`No audio found for trigger: ${triggerName}`);
    return Promise.resolve();
  }
  
  const audio = audioCache[triggerName];
  
  // Apply volume control
  audio.volume = playbackVolumeFactor;
  
  // Reset audio to start
  try {
    audio.currentTime = 0;
  } catch (e) {
    // Some browsers throw errors if audio isn't loaded yet
    console.log(`Error resetting audio position for ${triggerName}`);
  }
  
  return new Promise(resolve => {
    const onEnd = () => {
      audio.removeEventListener('ended', onEnd);
      resolve();
    };
    
    audio.addEventListener('ended', onEnd);
    
    // Add error handling to the play method
    audio.play().catch(e => {
      console.log(`Error playing audio: ${triggerName}`, e);
      resolve(); // Resolve the promise anyway to continue sequence
    });
  });
}

// Display trigger text and return a promise
async function displayTriggerText(triggerName, element) {
  // Find all eye cursor text elements
  const textElements = [
    document.getElementById("eyeCursorText"),
    document.getElementById("eyeCursorText2"),
    document.getElementById("eyeCursorText3"),
    document.getElementById("eyeCursorText4")
  ].filter(el => el !== null);
  
  if (!textElements.length) return Promise.resolve();
  
  // Display the trigger name in all text elements
  textElements.forEach(el => {
    el.textContent = triggerName;
    // Faster transition speed
    el.style.transition = `opacity ${Math.random() * 1 + 1}s`;
    el.style.opacity = 1;
  });
  
  // Shorter duration for display
  const duration = Math.random() * 1 + 1;
  
  // Wait for fade in (shorter wait)
  await new Promise(resolve => setTimeout(resolve, duration * 500));
  
  // Fade out all elements
  textElements.forEach(el => {
    el.style.opacity = 0;
  });
  
  // Shorter wait before resolving
  return new Promise(resolve => setTimeout(resolve, duration * 500));
}

// Handle playing of triggers one by one
async function triggerTriggers(triggers) {
  if (!Array.isArray(triggers) || triggers.length === 0) {
    console.log("No triggers to display.");
    return;
  }

  // Process triggers with delay between them
  for (const trigger of triggers) {
    await playTriggerWithDisplay(trigger);
    
    // Random delay between triggers (1-3 seconds)
    const delay = Math.random() * 2000 + 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

// Play single trigger with synchronized display
async function playTriggerWithDisplay(trigger) {
  // Start audio playback
  const audioPromise = playTriggerSound(trigger.name);
  
  // Display trigger text simultaneously with audio
  await displayTriggerText(trigger.name);
  
  // Wait for audio to finish
  return audioPromise;
}

// Toggle all trigger checkboxes
function toggleAllToggles() {
  const toggleInputs = document.getElementsByClassName("toggle-input");
  for (let i = 0; i < toggleInputs.length; i++) {
    toggleInputs[i].checked = !toggleInputs[i].checked;
  }
  
  // Save the toggle states
  saveToggleStatesToLocalStorage();
}

// Get all selected triggers
function getSelectedTriggers() {
  const selectedTriggers = [];
  const toggleInputs = document.getElementsByClassName("toggle-input");
  
  for (let i = 0; i < toggleInputs.length; i++) {
    if (toggleInputs[i].checked) {
      const triggerName = toggleInputs[i].dataset.triggerName || toggleInputs[i].dataset.trigger;
      const trigger = triggerData.find(t => t.name === triggerName);
      if (trigger) {
        selectedTriggers.push(trigger);
      }
    }
  }
  
  return selectedTriggers;
}

function saveToggleStatesToLocalStorage() {
  try {
    const selectedTriggers = getSelectedTriggers();
    const triggerNames = selectedTriggers.map(t => t.name);
    localStorage.setItem('bambiActiveTriggers', JSON.stringify(triggerNames));
    
    // Create trigger descriptions object
    const triggerDescriptions = {};
    selectedTriggers.forEach(trigger => {
      if (trigger.name && trigger.description) {
        triggerDescriptions[trigger.name] = trigger.description;
      }
    });
    
    localStorage.setItem('bambiTriggerDescriptions', JSON.stringify(triggerDescriptions));
    
    console.log('Active triggers saved:', triggerNames);
    
    // Send updates to the server
    if (window.socket && window.socket.connected) {
      const username = document.body.getAttribute('data-username');
      if (username) {
        window.socket.emit('triggers', {
          triggerNames: triggerNames,
          triggerDetails: selectedTriggers,
          username: username
        });
      }
    }
    
    // Sync with other pages if the sync function exists
    if (typeof window.syncTriggersWithPages === 'function') {
      window.syncTriggersWithPages(triggerNames);
    }
  } catch (error) {
    console.log('Error saving trigger selection to localStorage:', error);
  }
}

// Create and play a random playlist from selected triggers
function playRandomPlaylist() {
  const selectedTriggers = getSelectedTriggers();
  
  if (selectedTriggers.length === 0) {
    console.log("No triggers selected");
    
    // Show notification if available
    if (typeof window.showNotification === 'function') {
      window.showNotification('No triggers selected. Please select triggers first.');
    }
    return;
  }
  
  // Load audio for selected triggers
  selectedTriggers.forEach(trigger => {
    loadTriggerAudio(trigger);
  });
  
  // Shuffle the selected triggers
  const shuffledTriggers = [...selectedTriggers].sort(() => Math.random() - 0.5);
  
  // Start playing the random playlist
  triggerTriggers(shuffledTriggers);
  
  // Send triggers to server if socket is available
  if (typeof socket !== "undefined" && socket.connected) {
    const triggerNames = shuffledTriggers.map(t => t.name);
    socket.emit("triggers", { 
      triggerNames: triggerNames,
      triggerDetails: shuffledTriggers.map(t => ({ 
        name: t.name, 
        description: t.description || '' 
      }))
    });
  }
}

// Update the toggle input event handler with improved localStorage support
function setupToggleListeners() {
  const toggleInputs = document.getElementsByClassName("toggle-input");
  
  for (let i = 0; i < toggleInputs.length; i++) {
    toggleInputs[i].addEventListener("change", function() {
      // Don't handle loop toggle itself
      if (this.id === "loop-toggle") return;
      
      // Save toggle states
      saveToggleStatesToLocalStorage();
      
      // If continuous playback is active, restart it with new selection
      if (continuousPlaybackActive) {
        // Stop current loop
        continuousPlaybackActive = false;
        
        // Brief delay before restarting with new selection
        setTimeout(() => {
          // Only restart if toggle is still checked
          const loopToggle = document.getElementById("loop-toggle");
          if (loopToggle && loopToggle.checked) {
            playContinuousTriggers();
          }
        }, 100);
      }
      
      // Load audio for newly checked trigger
      if (this.checked && this.dataset.triggerName) {
        const triggerName = this.dataset.triggerName;
        const trigger = triggerData.find(t => t.name === triggerName);
        loadTriggerAudio(trigger);
      }
    });
  }
}

// Handle specific trigger activation with error handling
function activateTrigger(trigger) {
  // Handle null or undefined triggers
  if (!trigger) {
    console.log('Null or undefined trigger provided to activateTrigger');
    return;
  }
  
  // If trigger is a string, find the matching trigger data
  if (typeof trigger === 'string') {
    const triggerObj = triggerData.find(t => t.name === trigger);
    if (triggerObj) {
      console.log(`Activating trigger: ${triggerObj.name}`);
      playTriggerWithDisplay(triggerObj);    } else {
      console.log(`Trigger not found: ${trigger}`);
      
      // Create a temporary trigger object for display
      const tempTrigger = { name: trigger };
      
      // Show text even if we don't have audio
      displayTriggerText(tempTrigger.name);
    }
  } 
  // If trigger is an object, use it directly
  else if (typeof trigger === 'object' && trigger.name) {
    console.log(`Activating trigger: ${trigger.name}`);
    playTriggerWithDisplay(trigger);
  }
  else {
    console.error('Invalid trigger type provided to activateTrigger:', typeof trigger);
  }
}

// Set up socket event listener if socket exists
function setupSocketListener() {
  if (typeof socket !== "undefined") {
    // Clean up any existing listeners to avoid duplicates
    socket.off("trigger:audio");
    
    // Add listener for trigger audio events
    socket.on("trigger:audio", (triggerName) => {
      if (!triggerName) return;
      activateTrigger(triggerName);
    });
    
    // Listen for active triggers from server/other tabs
    socket.on("active-triggers", (data) => {
      if (data && Array.isArray(data.activeTriggers)) {
        updateTriggerToggles(data.activeTriggers);
      }
    });
  }
}

// Update trigger toggles based on received active triggers
function updateTriggerToggles(activeTriggers) {
  if (!Array.isArray(activeTriggers)) {
    // Try to convert to array if it's a string
    if (typeof activeTriggers === 'string') {
      activeTriggers = activeTriggers.split(',').map(t => t.trim());
    } else {
      return;
    }
  }
  
  const toggleInputs = document.getElementsByClassName("toggle-input");
  
  for (let i = 0; i < toggleInputs.length; i++) {
    const triggerName = toggleInputs[i].dataset.triggerName;
    if (triggerName) {
      toggleInputs[i].checked = activeTriggers.includes(triggerName);
    }
  }
  
  // Save changes to localStorage
  saveToggleStatesToLocalStorage();
}

let continuousPlaybackActive = false;

// Play selected triggers in a continuous loop until stopped
function playContinuousTriggers() {
  if (continuousPlaybackActive) {
    console.log("Continuous playback already active");
    return;
  }

  let selectedTriggers = getSelectedTriggers();
  
  if (selectedTriggers.length === 0) {
    console.log("No triggers selected for continuous playback");
    // Show notification if available
    if (typeof window.showNotification === 'function') {
      window.showNotification('Please select at least one trigger for continuous playback', 'warning');
    }
    
    // Make sure toggle is unchecked if no triggers selected
    const loopToggle = document.getElementById("loop-toggle");
    if (loopToggle) {
      loopToggle.checked = false;
    }
    return;
  }
  
  // Ensure toggle is checked when playback starts
  const loopToggle = document.getElementById("loop-toggle");
  if (loopToggle) {
    loopToggle.checked = true;
  }
  
  continuousPlaybackActive = true;
  
  // Function to check if trigger selection has changed
  function hasSelectionChanged(originalSelection) {
    const currentSelection = getSelectedTriggers();
    
    // Different number of triggers means selection changed
    if (currentSelection.length !== originalSelection.length) {
      return true;
    }
    
    // Check if all current triggers were in original selection
    return !currentSelection.every(current => 
      originalSelection.some(original => original.name === current.name)
    );
  }
  
  // Recursive function to keep playing until stopped
  async function playLoop(initialSelection) {
    // Stop if continuous playback was deactivated or selection changed
    if (!continuousPlaybackActive || hasSelectionChanged(initialSelection)) {
      console.log("Continuous playback stopped");
      continuousPlaybackActive = false;
      return;
    }
    
    // Shuffle the triggers again for each loop
    const shuffledTriggers = [...initialSelection].sort(() => Math.random() - 0.5);
    
    // Play all triggers in the shuffled array
    for (const trigger of shuffledTriggers) {
      // Stop loop if selection changed during playback
      if (!continuousPlaybackActive || hasSelectionChanged(initialSelection)) {
        console.log("Continuous playback stopped mid-sequence");
        continuousPlaybackActive = false;
        return;
      }
      
      await playTriggerWithDisplay(trigger);
      
      // Delay between triggers adjusted by speed factor
      const baseDelay = Math.random() * 200 + 100;
      const adjustedDelay = baseDelay * playbackSpeedFactor;
      await new Promise(resolve => setTimeout(resolve, adjustedDelay));
    }
    
    // Continue with next loop
    playLoop(initialSelection);
  }
  
  // Preload audio for all selected triggers
  selectedTriggers.forEach(trigger => {
    loadTriggerAudio(trigger);
  });
  
  // Start the continuous playback loop
  playLoop(selectedTriggers);
}

// Stop continuous playback
function stopContinuousPlayback() {
  continuousPlaybackActive = false;
  
  // Uncheck the toggle when stopping playback
  const loopToggle = document.getElementById("loop-toggle");
  if (loopToggle) {
    loopToggle.checked = false;
  }
}

// Initialize when window loads with improved error handling
window.onload = function () {
  // Add global audio cache for other scripts to access
  window.audioCache = audioCache;
  
  // Load trigger data
  loadTriggerData();

  // Connect Play Triggers button in profile-system-controls.ejs
  const playTriggersBtn = document.getElementById("play-triggers");
  if (playTriggersBtn) {
    playTriggersBtn.addEventListener("click", playRandomPlaylist);
  }
  
  // Connect toggle all button in profile-system-controls.ejs
  const activateAllBtn = document.getElementById("activate-all");
  if (activateAllBtn) {
    activateAllBtn.addEventListener("click", toggleAllToggles);
  }
  
  // Add event listener for the loop toggle
  const loopToggle = document.getElementById("loop-toggle");
  if (loopToggle) {
    loopToggle.addEventListener("change", function() {
      if (this.checked) {
        playContinuousTriggers();
      } else {
        stopContinuousPlayback();
      }
    });
  }
  
  // Add event listener for the play button (in either file)
  const playButton = document.getElementById("play-playlist");
  if (playButton) {
    playButton.addEventListener("click", playRandomPlaylist);
  }
  
  // Add event listener for toggle all button
  const toggleAllButton = document.getElementById("toggle-all");
  if (toggleAllButton) {
    toggleAllButton.addEventListener("click", toggleAllToggles);
  }
  
  // Setup toggle listeners
  setupToggleListeners();
  
  // Add a retry button for audio loading if we have error handler
  if (typeof window.errorHandler !== 'undefined') {
    const retryButton = document.getElementById('retry-audio');
    if (retryButton) {
      retryButton.addEventListener('click', function() {
        window.errorHandler.clearAllFailedResources();
        preloadSelectedAudio();
      });
    }
  }
  
  // Setup socket listener with delay to ensure socket is initialized
  setTimeout(setupSocketListener, 1000);
};

// Handle DOM content loaded for both files
document.addEventListener('DOMContentLoaded', function() {
  // This runs when the document is ready but before resources are loaded
  console.log('DOM Content Loaded - setting up trigger integrations');
  
  // Create an observer to watch for dynamically loaded trigger panels
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node.id === 'trigger-panel' || (node.querySelector && node.querySelector('#trigger-panel'))) {
            console.log('Trigger panel detected, initializing');
            loadTriggerData();
            observer.disconnect();
            return;
          }
        }
      }
    });
  });
  
  // Start observing the document body for added nodes
  observer.observe(document.body, { childList: true, subtree: true });

  // Initialize volume and speed controls
  const volumeSlider = document.getElementById('loop-volume');
  const volumeValue = document.getElementById('volume-value');
  
  if (volumeSlider && volumeValue) {
    // Initialize with stored value or default
    const storedVolume = localStorage.getItem('bambiAudioVolume');
    if (storedVolume !== null) {
      const volume = parseFloat(storedVolume);
      volumeSlider.value = volume * 10; // Convert 0-1 to 0-10 for slider
      volumeValue.textContent = Math.round(volume * 100) + '%';
      
      // Apply volume if audio API is available
      if (window.bambiAudio && typeof window.bambiAudio.updatePlaybackVolume === 'function') {
        window.bambiAudio.updatePlaybackVolume(volume);
      } else {
        // Store for when API becomes available
        updatePlaybackVolume(volume);
      }
    }
    
    // Update volume when slider changes
    volumeSlider.addEventListener('input', function() {
      const volumeFactor = this.value / 10; // Convert 0-10 to 0-1 for volume
      volumeValue.textContent = Math.round(volumeFactor * 100) + '%';
      
      // Store in localStorage
      localStorage.setItem('bambiAudioVolume', volumeFactor);
      
      // Update audio volume
      updatePlaybackVolume(volumeFactor);
    });
  }
  
  // Speed control
  const speedSlider = document.getElementById('loop-speed');
  const speedValue = document.getElementById('speed-value');
  
  if (speedSlider && speedValue) {
    // Initialize with stored value or default
    const storedSpeed = localStorage.getItem('bambiAudioSpeed');
    if (storedSpeed !== null) {
      speedSlider.value = storedSpeed;
      updateSpeedLabel(storedSpeed);
      
      // Apply speed if audio API is available
      const speedFactor = getSpeedFactor(storedSpeed);
      updatePlaybackSpeed(speedFactor);
    }
    
    // Update speed when slider changes
    speedSlider.addEventListener('input', function() {
      updateSpeedLabel(this.value);
      
      // Store in localStorage
      localStorage.setItem('bambiAudioSpeed', this.value);
      
      // Update audio speed
      const speedFactor = getSpeedFactor(this.value);
      updatePlaybackSpeed(speedFactor);
    });
  }
  
  // Helper function for speed label
  function updateSpeedLabel(value) {
    const speedVal = parseInt(value);
    if (speedVal === 5) {
      speedValue.textContent = 'Normal';
    } else if (speedVal < 5) {
      speedValue.textContent = 'Slower ' + (5 - speedVal) + 'x';
    } else {
      speedValue.textContent = 'Faster ' + (speedVal - 5) + 'x';
    }
  }
  
  // Helper function to convert slider value to speed factor
  function getSpeedFactor(value) {
    const speedVal = parseInt(value);
    if (speedVal === 5) return 1.0;
    if (speedVal < 5) return 1.0 + ((5 - speedVal) * 0.5); // Slower = higher number
    return 1.0 - ((speedVal - 5) * 0.1); // Faster = lower number
  }
});

// Expose the API globally for use by other scripts
window.bambiAudio = {
  playTrigger: activateTrigger,
  playRandomPlaylist: playRandomPlaylist,
  startContinuousPlayback: playContinuousTriggers,
  stopContinuousPlayback: stopContinuousPlayback,
  updatePlaybackSpeed: updatePlaybackSpeed,
  updatePlaybackVolume: updatePlaybackVolume,
  getSelectedTriggers: getSelectedTriggers,
  loadTriggerAudio: loadTriggerAudio,
  getAllTriggers: () => triggerData,
  refreshTriggers: loadTriggerData,
  toggleAllTriggers: toggleAllToggles,
  refreshTriggerUI: function() {
    try {
      const storedTriggers = localStorage.getItem('bambiActiveTriggers');
      if (storedTriggers) {
        const activeTriggerNames = JSON.parse(storedTriggers);
        
        // Update all toggle inputs based on stored trigger names
        const toggleInputs = document.getElementsByClassName("toggle-input");
        for (let i = 0; i < toggleInputs.length; i++) {
          const triggerName = toggleInputs[i].dataset.triggerName || toggleInputs[i].dataset.trigger;
          toggleInputs[i].checked = activeTriggerNames.includes(triggerName);
        }
        
        console.log('Trigger UI refreshed with stored triggers:', activeTriggerNames);
      }
    } catch (error) {
      console.log('Error refreshing trigger UI:', error);
    }
  }
};