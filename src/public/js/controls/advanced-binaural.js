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
  const descElement = document.getElementById('pattern-description');
  const customContainer = document.getElementById('custom-pattern-container');
  const addSegmentBtn = document.getElementById('add-segment');
  
  // Audio control elements
  const playBtn = document.getElementById('play-advanced-binaural');
  const stopBtn = document.getElementById('stop-advanced-binaural');
  const saveBtn = document.getElementById('save-advanced-binaural');
  const volumeSlider = document.getElementById('advanced-binaural-volume');
  const volumeValue = document.getElementById('advanced-binaural-volume-value');
  const carrierSlider = document.getElementById('carrier-frequency-advanced');
  const carrierValue = document.getElementById('carrier-frequency-advanced-value');
  
  // Audio context variables
  let audioCtx = null;
  let leftOsc = null;
  let rightOsc = null;
  let gainNode = null;
  let isPlaying = false;
  let patternTimeout = null;
  
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
  
  // Setup event listeners
  if (patternSelect) {
    patternSelect.addEventListener('change', updateUI);
  }
  
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
  
  if (volumeSlider && volumeValue) {
    volumeSlider.addEventListener('input', function() {
      volumeValue.textContent = this.value + '%';
      if (gainNode) gainNode.gain.value = this.value / 100;
    });
  }
  
  if (carrierSlider && carrierValue) {
    carrierSlider.addEventListener('input', function() {
      carrierValue.textContent = this.value + ' Hz';
    });
  }
  
  if (addSegmentBtn) {
    addSegmentBtn.addEventListener('click', addCustomSegment);
  }
  
  if (playBtn) {
    playBtn.addEventListener('click', playPattern);
  }
  
  if (stopBtn) {
    stopBtn.addEventListener('click', stopPattern);
  }
  
  if (saveBtn) {
    saveBtn.addEventListener('click', saveSettings);
  }
  
  function updateUI() {
    updateDescription();
    toggleCustomEditor();
    drawVisualization();
  }
  
  function updateDescription() {
    if (patternSelect && descElement) {
      descElement.textContent = descriptions[patternSelect.value] || '';
    }
  }
  
  function toggleCustomEditor() {
    if (patternSelect && customContainer) {
      customContainer.style.display = patternSelect.value === 'custom' ? 'block' : 'none';
    }
  }
  
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
    
    segment.querySelector('.segment-wave').addEventListener('change', drawVisualization);
    segment.querySelector('.segment-duration').addEventListener('input', drawVisualization);
    segment.querySelector('.remove-segment').addEventListener('click', () => {
      segment.remove();
      drawVisualization();
    });
    
    drawVisualization();
  }
  
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
        const segments = [];
        document.querySelectorAll('.pattern-segment').forEach(segment => {
          const wave = segment.querySelector('.segment-wave')?.value;
          const dur = parseInt(segment.querySelector('.segment-duration')?.value);
          if (wave && dur) {
            segments.push({ type: wave, duration: dur });
          }
        });
        return segments;
      default:
        return [];
    }
  }
  
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
  
  function drawGrid(ctx, width, height) {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    // Frequency lines
    [5, 10, 15, 20, 25].forEach(freq => {
      const y = height - ((freq / 30) * height);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      
      ctx.fillStyle = '#999';
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`${freq}Hz`, 5, y - 2);
    });
    
    // Time lines
    const duration = parseInt(durationSlider?.value || 20);
    const timeStep = Math.max(1, Math.floor(duration / 10));
    for (let i = 0; i <= duration; i += timeStep) {
      const x = (i / duration) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      
      ctx.fillStyle = '#999';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${i}m`, x, height - 5);
    }
  }
  
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
      
      // Label
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${freq}Hz`, currentX + segmentWidth / 2, y - 15);
      
      currentX += segmentWidth;
    });
  }
  
  // Audio playback functions
  function playPattern() {
    if (isPlaying) return;
    
    try {
      // Create audio context
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create gain node for volume control
      gainNode = audioCtx.createGain();
      gainNode.gain.value = (volumeSlider?.value || 50) / 100;
      gainNode.connect(audioCtx.destination);
      
      // Start the pattern sequence
      const segments = getPatternSegments();
      if (segments.length === 0) {
        showMessage('No pattern segments found', true);
        return;
      }
      
      isPlaying = true;
      playBtn.disabled = true;
      stopBtn.disabled = false;
      
      playPatternSequence(segments, 0);
      showMessage('Advanced binaural pattern started');
      
    } catch (error) {
      console.error('Error starting advanced binaural pattern:', error);
      showMessage('Failed to start audio', true);
    }
  }
  
  function playPatternSequence(segments, index) {
    if (!isPlaying || index >= segments.length) {
      if (isPlaying) {
        // Pattern completed, stop
        stopPattern();
      }
      return;
    }
    
    const segment = segments[index];
    const brainwave = brainwaves[segment.type];
    if (!brainwave) {
      playPatternSequence(segments, index + 1);
      return;
    }
    
    // Create oscillators for this segment
    leftOsc = audioCtx.createOscillator();
    rightOsc = audioCtx.createOscillator();
    
    // Create stereo channel merger
    const merger = audioCtx.createChannelMerger(2);
    leftOsc.connect(merger, 0, 0);
    rightOsc.connect(merger, 0, 1);
    merger.connect(gainNode);
    
    // Set frequencies
    const carrierFreq = parseFloat(carrierSlider?.value || 200);
    const binauralFreq = brainwave.freq;
    
    leftOsc.frequency.value = carrierFreq;
    rightOsc.frequency.value = carrierFreq + binauralFreq;
    
    // Start oscillators
    leftOsc.start();
    rightOsc.start();
    
    // Schedule next segment
    const segmentDuration = segment.duration * 60 * 1000; // Convert minutes to milliseconds
    const transitionTime = parseFloat(transitionSlider?.value || 30) * 1000; // Convert seconds to milliseconds
    
    patternTimeout = setTimeout(() => {
      // Stop current oscillators
      if (leftOsc) leftOsc.stop();
      if (rightOsc) rightOsc.stop();
      leftOsc = null;
      rightOsc = null;
      
      // Play next segment after transition time
      setTimeout(() => {
        playPatternSequence(segments, index + 1);
      }, transitionTime);
      
    }, segmentDuration - transitionTime);
  }
  
  function stopPattern() {
    if (!isPlaying) return;
    
    isPlaying = false;
    playBtn.disabled = false;
    stopBtn.disabled = true;
    
    // Clear timeout
    if (patternTimeout) {
      clearTimeout(patternTimeout);
      patternTimeout = null;
    }
    
    // Stop oscillators
    if (leftOsc) {
      leftOsc.stop();
      leftOsc = null;
    }
    if (rightOsc) {
      rightOsc.stop();
      rightOsc = null;
    }
    
    // Close audio context
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
    
    showMessage('Advanced binaural pattern stopped');
  }
  
  function saveSettings() {
    const settings = {
      enabled: true,
      pattern: patternSelect?.value || 'descent',
      duration: parseInt(durationSlider?.value || 20),
      transition: parseInt(transitionSlider?.value || 30),
      volume: parseInt(volumeSlider?.value || 50),
      carrier: parseInt(carrierSlider?.value || 200),
      custom: []
    };
    
    // Save custom segments if pattern is custom
    if (settings.pattern === 'custom') {
      document.querySelectorAll('.pattern-segment').forEach(segment => {
        const wave = segment.querySelector('.segment-wave')?.value;
        const duration = parseInt(segment.querySelector('.segment-duration')?.value);
        if (wave && duration) {
          settings.custom.push({ type: wave, duration: duration });
        }
      });
    }
    
    if (window.bambiSystem?.saveState) {
      window.bambiSystem.saveState('advanced', settings);
      showMessage('Advanced binaural settings saved');
    } else {
      localStorage.setItem('bambiAdvancedBinaural', JSON.stringify(settings));
      showMessage('Settings saved to local storage');
    }
  }
  
  function showMessage(message, isError = false) {
    // Create or update message element
    let messageEl = document.getElementById('advanced-binaural-message');
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = 'advanced-binaural-message';
      messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        border-radius: 4px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(messageEl);
    }
    
    messageEl.textContent = message;
    messageEl.style.backgroundColor = isError ? '#f44336' : '#4CAF50';
    messageEl.style.opacity = '1';
    
    setTimeout(() => {
      messageEl.style.opacity = '0';
    }, 3000);
  }
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', function() {
    if (isPlaying) stopPattern();
  });
  
  // Initialize
  updateDescription();
  toggleCustomEditor();
  drawVisualization();
});