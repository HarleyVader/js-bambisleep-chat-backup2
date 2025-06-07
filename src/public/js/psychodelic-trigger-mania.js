// Clean Psychedelic Spiral Implementation
let eyeCursor;
let canvas;
let width, height;

// Control parameters - simplified
let spiral1Width = 5.0;
let spiral2Width = 3.0;
let spiral1Speed = 20;
let spiral2Speed = 15;
let spiral1Color = [0, 128, 128]; // Teal
let spiral2Color = [255, 20, 147]; // Barbie Pink
let opacityLevel = 1.0;

// Performance settings - minimal approach
const ITERATIONS = 400;

function setup() {
  eyeCursor = document.querySelector("#eyeCursor");
  
  if (!eyeCursor) {
    console.warn('eyeCursor element not found');
    return;
  }
  
  width = eyeCursor.clientWidth || window.innerWidth;
  height = eyeCursor.clientHeight || window.innerHeight;

  canvas = createCanvas(width, height);
  canvas.parent("eyeCursor");

  window.addEventListener("resize", onWindowResize);
}

function draw() {
  clear();
  translate(width / 2, height / 2);
  
  // Simple wave patterns
  const a = map(sin(frameCount / spiral1Speed), -1, 1, 0.5, 1.5);
  const b = map(cos(frameCount / spiral2Speed), -1, 1, 1, 1.5);

  rotate(frameCount / 5);
  spiral(a, 1, spiral1Color, spiral1Width);
  spiral(b, 0.3, spiral2Color, spiral2Width);
}

function onWindowResize() {
  if (!eyeCursor) return;
  
  width = eyeCursor.clientWidth || window.innerWidth;
  height = eyeCursor.clientHeight || window.innerHeight;
  resizeCanvas(width, height);
}

function spiral(step, ang, colorArray, baseWidth) {
  const c = color(colorArray[0], colorArray[1], colorArray[2], 255 * opacityLevel);
  fill(c);
  stroke(c);
  
  let r1 = 0;
  let r2 = 2;
  let spiralWidth = baseWidth;
  const dw = spiralWidth / (ITERATIONS * 0.8);
  
  beginShape(TRIANGLE_STRIP);
  for (let i = 0; i < ITERATIONS; i++) {
    r1 += step;
    spiralWidth -= dw;
    r2 = r1 + spiralWidth;
    
    const r1x = r1 * sin(ang * i);
    const r1y = r1 * cos(ang * i);
    const r2x = r2 * sin(ang * i);
    const r2y = r2 * cos(ang * i);
    
    vertex(r1x, r1y);
    vertex(r2x, r2y);
  }
  endShape();
}

// Color presets for easy switching
const COLOR_PRESETS = {
  'BAMBI_CLASSIC': {
    spiral1: [0, 128, 128],      // Teal
    spiral2: [255, 20, 147]      // Barbie Pink
  },
  'DEEP_TRANCE': {
    spiral1: [75, 0, 130],       // Indigo
    spiral2: [138, 43, 226]      // Blue Violet
  },
  'HYPNO_PINK': {
    spiral1: [255, 105, 180],    // Hot Pink
    spiral2: [255, 182, 193]     // Light Pink
  },
  'MIND_MELT': {
    spiral1: [255, 0, 255],      // Magenta
    spiral2: [0, 255, 255]       // Cyan
  },
  'DREAM_STATE': {
    spiral1: [147, 0, 211],      // Dark Violet
    spiral2: [186, 85, 211]      // Medium Orchid
  },
  'SUBMISSIVE_BLUE': {
    spiral1: [30, 144, 255],     // Dodger Blue
    spiral2: [0, 191, 255]       // Deep Sky Blue
  }
};

// Enhanced parameter update functions
function updateSpiralParams(w1, w2, s1, s2) {
  spiral1Width = w1 || spiral1Width;
  spiral2Width = w2 || spiral2Width;
  spiral1Speed = s1 || spiral1Speed;
  spiral2Speed = s2 || spiral2Speed;
  
  // Send update to network control system
  if (window.bambiControlNetwork) {
    window.bambiControlNetwork.processControlSignal('SPIRAL_CONTROL_UPDATE', {
      type: 'PARAMS_UPDATE',
      spiral1Width, spiral2Width, spiral1Speed, spiral2Speed
    }, 'CLIENT_SPIRAL_CONTROL');
  }
}

function updateSpiralColors(c1, c2) {
  if (c1) spiral1Color = c1;
  if (c2) spiral2Color = c2;
  
  // Send update to network control system
  if (window.bambiControlNetwork) {
    window.bambiControlNetwork.processControlSignal('SPIRAL_CONTROL_UPDATE', {
      type: 'COLOR_UPDATE',
      spiral1Color, spiral2Color
    }, 'CLIENT_SPIRAL_CONTROL');
  }
}

function updateSpiralOpacity(opacity) {
  opacityLevel = Math.max(0.1, Math.min(1.0, opacity || 1.0));
  
  // Send update to network control system
  if (window.bambiControlNetwork) {
    window.bambiControlNetwork.processControlSignal('SPIRAL_CONTROL_UPDATE', {
      type: 'OPACITY_UPDATE',
      opacityLevel
    }, 'CLIENT_SPIRAL_CONTROL');
  }
}

// New enhanced color control functions
function setColorPreset(presetName) {
  const preset = COLOR_PRESETS[presetName];
  if (preset) {
    updateSpiralColors(preset.spiral1, preset.spiral2);
    console.log(`🎨 Color preset applied: ${presetName}`);
  }
}

function fadeOpacity(targetOpacity, duration = 2000) {
  const startOpacity = opacityLevel;
  const startTime = Date.now();
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const currentOpacity = startOpacity + (targetOpacity - startOpacity) * progress;
    updateSpiralOpacity(currentOpacity);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }
  
  animate();
}

function pulseOpacity(minOpacity = 0.3, maxOpacity = 1.0, period = 3000) {
  let startTime = Date.now();
  
  function pulse() {
    const elapsed = (Date.now() - startTime) % period;
    const progress = elapsed / period;
    const opacity = minOpacity + (maxOpacity - minOpacity) * (0.5 + 0.5 * Math.sin(progress * Math.PI * 2));
    
    updateSpiralOpacity(opacity);
    requestAnimationFrame(pulse);
  }
  
  pulse();
}

// Network control integration
function initializeNetworkControl() {
  // Create a simple network control interface for spiral effects
  window.bambiControlNetwork = window.bambiControlNetwork || {
    processControlSignal: function(signalType, signalData, sourceId) {
      console.log(`🎛️ Network Control Signal: ${signalType}`, signalData);
      
      // Process incoming network control signals
      if (signalType === 'SPIRAL_CONTROL_UPDATE') {
        switch(signalData.type) {
          case 'COLOR_PRESET':
            setColorPreset(signalData.preset);
            break;
          case 'FADE_OPACITY':
            fadeOpacity(signalData.targetOpacity, signalData.duration);
            break;
          case 'PULSE_OPACITY':
            pulseOpacity(signalData.minOpacity, signalData.maxOpacity, signalData.period);
            break;
        }
      }
    }
  };
}

// Initialize network control when page loads
if (typeof window !== 'undefined') {
  initializeNetworkControl();
}

// Export functions globally
window.updateSpiralParams = updateSpiralParams;
window.updateSpiralColors = updateSpiralColors;
window.updateSpiralOpacity = updateSpiralOpacity;
window.setColorPreset = setColorPreset;
window.fadeOpacity = fadeOpacity;
window.pulseOpacity = pulseOpacity;
window.COLOR_PRESETS = COLOR_PRESETS;
