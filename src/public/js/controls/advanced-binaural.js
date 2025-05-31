// Advanced binaural pattern controls
document.addEventListener('DOMContentLoaded', function() {
  // Skip if panel doesn't exist
  if (!document.getElementById('advanced-binaural-panel')) return;
  
  // Core elements
  const canvas = document.getElementById('pattern-visualization');
  const patternSelect = document.getElementById('pattern-select');
  const durationSlider = document.getElementById('pattern-duration');
  const durationValue = document.getElementById('pattern-duration-value');
  const transitionSlider = document.getElementById('transition-time');
  const transitionValue = document.getElementById('transition-time-value');
  const playBtn = document.getElementById('play-advanced-binaural');
  const stopBtn = document.getElementById('stop-advanced-binaural');
  const saveBtn = document.getElementById('save-advanced-binaural');
  const enableToggle = document.getElementById('advanced-binaural-enable');
  const addSegmentBtn = document.getElementById('add-segment');
  const customContainer = document.getElementById('custom-pattern-container');
  const descElement = document.getElementById('pattern-description');
  
  // Audio context for advanced patterns
  let audioCtx = null;
  let isPlaying = false;
  let currentPattern = null;
  
  // Brainwave data
  const brainwaves = {
    delta: { freq: 2, color: '#4a148c' },
    theta: { freq: 6, color: '#7b1fa2' },
    alpha: { freq: 10, color: '#e91e63' },
    beta: { freq: 20, color: '#ff5722' }
  };
  
  const descriptions = {
    descent: 'Descent pattern gradually moves from alert Alpha waves down through Theta into deep Delta, creating a natural descent into trance.',
    ascent: 'Ascent pattern starts from deep Delta relaxation, rises through Theta, and ends with alert Alpha waves for gentle awakening.',
    focus: 'Focus cycle alternates between relaxed Alpha and alert Beta waves, enhancing concentration and mental clarity.',
    trance: 'Deep trance pattern focuses on Alpha-Theta states, ideal for deep hypnotic experiences and meditation.',
    custom: 'Custom pattern allows you to create your own sequence of brainwave states and durations.'
  };
  
  // Initialize
  init();
  
  function init() {
    setupSliders();
    setupButtons();
    setupPatternSelect();
    loadSettings();
    drawVisualization();
  }
  
  // Setup slider event listeners
  function setupSliders() {
    if (durationSlider && durationValue) {
      durationSlider.addEventListener('input', function() {
        durationValue.textContent = this.value + ' minutes';
        drawVisualization();
      });
    }
    
    if (transitionSlider && transitionValue) {
      transitionSlider.addEventListener('input', function() {
        transitionValue.textContent = this.value + ' seconds';
        drawVisualization();
      });
    }
  }
  
  // Setup button handlers
  function setupButtons() {
    if (playBtn) {
      playBtn.addEventListener('click', playPattern);
    }
    
    if (stopBtn) {
      stopBtn.addEventListener('click', stopPattern);
    }
    
    if (saveBtn) {
      saveBtn.addEventListener('click', saveSettings);
    }
    
    if (addSegmentBtn) {
      addSegmentBtn.addEventListener('click', addCustomSegment);
    }
  }
  
  // Setup pattern selection
  function setupPatternSelect() {
    if (patternSelect) {
      patternSelect.addEventListener('change', function() {
        updateDescription();
        toggleCustomEditor();
        drawVisualization();
      });
    }
  }
  
  // Update pattern description
  function updateDescription() {
    if (!patternSelect || !descElement) return;
    descElement.textContent = descriptions[patternSelect.value] || '';
  }
  
  // Toggle custom pattern editor
  function toggleCustomEditor() {
    if (!patternSelect || !customContainer) return;
    customContainer.style.display = patternSelect.value === 'custom' ? 'block' : 'none';
  }
  
  // Add custom segment
  function addCustomSegment() {
    const segmentsContainer = document.querySelector('.pattern-segments');
    if (!segmentsContainer) return;
    
    const segment = document.createElement('div');
    segment.className = 'pattern-segment';
    segment.innerHTML = `
      <select class="segment-wave">
        <option value="alpha">Alpha</option>
        <option value="theta">Theta</option>
        <option value="delta">Delta</option>
        <option value="beta">Beta</option>
      </select>
      <input type="number" class="segment-duration" min="1" max="60" value="5"> mins
      <button class="remove-segment">×</button>
    `;
    
    segmentsContainer.appendChild(segment);
    
    // Add listeners to new segment
    segment.querySelector('.segment-wave').addEventListener('change', drawVisualization);
    segment.querySelector('.segment-duration').addEventListener('input', drawVisualization);
    segment.querySelector('.remove-segment').addEventListener('click', () => {
      segment.remove();
      drawVisualization();
    });
    
    drawVisualization();
  }
  
  // Get pattern segments
  function getPatternSegments() {
    if (!patternSelect) return [];
    
    const pattern = patternSelect.value;
    const duration = parseInt(durationSlider?.value || 20);
    
    switch (pattern) {
      case 'descent':
        return [
          { type: 'alpha', duration: duration * 0.3 },
          { type: 'theta', duration: duration * 0.4 },
          { type: 'delta', duration: duration * 0.3 }
        ];
      case 'ascent':
        return [
          { type: 'delta', duration: duration * 0.3 },
          { type: 'theta', duration: duration * 0.4 },
          { type: 'alpha', duration: duration * 0.3 }
        ];
      case 'focus':
        return [
          { type: 'alpha', duration: duration * 0.4 },
          { type: 'beta', duration: duration * 0.2 },
          { type: 'alpha', duration: duration * 0.4 }
        ];
      case 'trance':
        return [
          { type: 'alpha', duration: duration * 0.25 },
          { type: 'theta', duration: duration * 0.5 },
          { type: 'alpha', duration: duration * 0.25 }
        ];
      case 'custom':
        return getCustomSegments();
      default:
        return [];
    }
  }
  
  // Get custom segments from UI
  function getCustomSegments() {
    const segments = [];
    document.querySelectorAll('.pattern-segment').forEach(segment => {
      const wave = segment.querySelector('.segment-wave')?.value;
      const duration = parseInt(segment.querySelector('.segment-duration')?.value);
      if (wave && duration) {
        segments.push({ type: wave, duration: duration });
      }
    });
    return segments;
  }
  
  // Draw visualization - simplified
  function drawVisualization() {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const segments = getPatternSegments();
    if (segments.length === 0) return;
    
    drawGrid(ctx, width, height);
    drawSegments(ctx, segments, width, height);
  }
  
  // Draw background grid
  function drawGrid(ctx, width, height) {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    // Horizontal frequency lines
    const freqLines = [5, 10, 15, 20, 25];
    freqLines.forEach(freq => {
      const y = height - ((freq / 30) * height);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      
      // Frequency labels
      ctx.fillStyle = '#999';
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`${freq}Hz`, 5, y - 2);
    });
    
    // Vertical time lines
    const duration = parseInt(durationSlider?.value || 20);
    const timeStep = Math.max(1, Math.floor(duration / 10));
    for (let i = 0; i <= duration; i += timeStep) {
      const x = (i / duration) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      
      // Time labels
      ctx.fillStyle = '#999';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${i}m`, x, height - 5);
    }
  }
  
  // Draw segments - simplified
  function drawSegments(ctx, segments, width, height) {
    const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0);
    const pixelsPerMinute = width / totalDuration;
    
    let currentX = 0;
    
    segments.forEach(segment => {
      const segmentWidth = segment.duration * pixelsPerMinute;
      const brainwave = brainwaves[segment.type];
      if (!brainwave) return;
      
      const freq = brainwave.freq;
      const y = height - ((freq / 30) * height);
      
      // Draw segment
      ctx.fillStyle = brainwave.color + '40';
      ctx.fillRect(currentX, y - 10, segmentWidth, 20);
      
      ctx.strokeStyle = brainwave.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(currentX, y - 10, segmentWidth, 20);
      
      // Add label
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${freq}Hz`, currentX + segmentWidth / 2, y - 15);
      
      currentX += segmentWidth;
    });
  }
  
  // Play pattern
  function playPattern() {
    if (!enableToggle?.checked) {
      alert('Enable Advanced Patterns first');
      return;
    }
    
    if (isPlaying) return;
    
    // Initialize audio context
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    isPlaying = true;
    playBtn.disabled = true;
    stopBtn.disabled = false;
    
    // Start pattern playback
    runPattern();
    
    // Award XP for advanced feature use
    if (window.socket?.connected) {
      window.socket.emit('award-xp', {
        username: document.body.getAttribute('data-username'),
        amount: 25,
        action: 'advanced_binaural'
      });
    }
  }
  
  // Stop pattern
  function stopPattern() {
    if (!isPlaying) return;
    
    isPlaying = false;
    playBtn.disabled = false;
    stopBtn.disabled = true;
    
    if (currentPattern) {
      clearTimeout(currentPattern);
      currentPattern = null;
    }
    
    // Stop all audio
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
  }
  
  // Run pattern sequence
  function runPattern() {
    const segments = getPatternSegments();
    if (segments.length === 0) return;
    
    let segmentIndex = 0;
    
    function playSegment() {
      if (!isPlaying || segmentIndex >= segments.length) {
        stopPattern();
        return;
      }
      
      const segment = segments[segmentIndex];
      const brainwave = brainwaves[segment.type];
      if (!brainwave) return;
      
      // Play binaural beat for this segment
      playBinauralBeat(brainwave.freq, segment.duration * 60 * 1000);
      
      // Schedule next segment
      currentPattern = setTimeout(() => {
        segmentIndex++;
        playSegment();
      }, segment.duration * 60 * 1000);
    }
    
    playSegment();
  }
  
  // Play binaural beat
  function playBinauralBeat(beatFreq, duration) {
    if (!audioCtx) return;
    
    const carrierFreq = 200; // Base carrier frequency
    const leftFreq = carrierFreq - beatFreq / 2;
    const rightFreq = carrierFreq + beatFreq / 2;
    
    // Create oscillators
    const leftOsc = audioCtx.createOscillator();
    const rightOsc = audioCtx.createOscillator();
    const leftGain = audioCtx.createGain();
    const rightGain = audioCtx.createGain();
    const merger = audioCtx.createChannelMerger(2);
    
    // Setup oscillators
    leftOsc.frequency.value = leftFreq;
    rightOsc.frequency.value = rightFreq;
    leftOsc.type = 'sine';
    rightOsc.type = 'sine';
    
    // Setup gain
    const volume = 0.1; // Low volume for binaural beats
    leftGain.gain.value = volume;
    rightGain.gain.value = volume;
    
    // Connect audio graph
    leftOsc.connect(leftGain);
    rightOsc.connect(rightGain);
    leftGain.connect(merger, 0, 0);
    rightGain.connect(merger, 0, 1);
    merger.connect(audioCtx.destination);
    
    // Start and schedule stop
    leftOsc.start();
    rightOsc.start();
    leftOsc.stop(audioCtx.currentTime + duration / 1000);
    rightOsc.stop(audioCtx.currentTime + duration / 1000);
  }
  
  // Save settings
  function saveSettings() {
    const settings = {
      enabled: enableToggle?.checked || false,
      pattern: patternSelect?.value || 'descent',
      duration: parseInt(durationSlider?.value || 20),
      transitionTime: parseInt(transitionSlider?.value || 30),
      customSegments: getCustomSegments()
    };
    
    // Save through system
    if (window.bambiSendSettings) {
      window.bambiSendSettings('advancedBinaural', settings);
    } else if (window.socket?.connected) {
      window.socket.emit('update-system-controls', {
        username: document.body.getAttribute('data-username'),
        advancedBinauralEnabled: settings.enabled,
        binauralPattern: settings.pattern,
        patternDuration: settings.duration,
        transitionTime: settings.transitionTime
      });
    }
    
    // Visual feedback
    saveBtn.textContent = 'Saved!';
    setTimeout(() => {
      saveBtn.textContent = 'Save Settings';
    }, 2000);
  }
  
  // Load saved settings
  function loadSettings() {
    if (window.bambiSystem?.state?.advancedBinaural) {
      const settings = window.bambiSystem.state.advancedBinaural;
      
      if (enableToggle) enableToggle.checked = settings.enabled;
      if (patternSelect) patternSelect.value = settings.pattern || 'descent';
      if (durationSlider) durationSlider.value = settings.duration || 20;
      if (transitionSlider) transitionSlider.value = settings.transitionTime || 30;
      
      // Update displays
      if (durationValue) durationValue.textContent = (settings.duration || 20) + ' minutes';
      if (transitionValue) transitionValue.textContent = (settings.transitionTime || 30) + ' seconds';
      
      updateDescription();
      toggleCustomEditor();
    }
  }
});