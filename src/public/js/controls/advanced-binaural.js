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
  
  if (addSegmentBtn) {
    addSegmentBtn.addEventListener('click', addCustomSegment);
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
  
  // Initialize
  updateDescription();
  toggleCustomEditor();
  drawVisualization();
});