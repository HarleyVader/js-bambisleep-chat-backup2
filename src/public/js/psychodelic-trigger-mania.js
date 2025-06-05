let eyeCursor;
let canvas;
let width, height;

// Control parameters for spirals
let spiral1Width = 5.0;
let spiral2Width = 3.0;
let spiral1Speed = 20; // Speed for first spiral
let spiral2Speed = 15; // Speed for second spiral (slightly different)
let spiral1Color = [0, 128, 128]; // Teal color
let spiral2Color = [255, 20, 147]; // Barbie Pink color
let wavePatternInverted = false; // Whether to invert the wave pattern
let opacityLevel = 1.0; // Opacity level for spirals
let performanceMode = 'balanced'; // minimal, balanced, or quality

// Performance settings
const QUALITY_SETTINGS = {
  'minimal': { iterations: 250, complexity: 0.7 },
  'balanced': { iterations: 450, complexity: 1.0 },
  'quality': { iterations: 600, complexity: 1.3 }
};

// For FPS monitoring
let lastFrameTime = 0;
let frameRate = 0;
let frameCount = 0;
let frameCountStart = 0;
let showFPS = false; // Set to true to show FPS counter

function setup() {
  eyeCursor = document.querySelector("#eyeCursor");
  
  // Check if eyeCursor is not null
  if (!eyeCursor) {
    console.error("Element with id 'eyeCursor' not found.");
    return;
  }
  
  width = eyeCursor.clientWidth;
  height = eyeCursor.clientHeight;

  // Create a canvas with the size of the #eyeCursor element
  canvas = createCanvas(width, height);

  // Append the canvas to the #eyeCursor div
  canvas.parent("eyeCursor");

  // Add event listener for window resize
  window.addEventListener("resize", onWindowResize);
  
  // Set initial performance mode
  updatePerformanceMode('balanced');
  
  // Start FPS monitoring
  frameCountStart = Date.now();
}

function draw() {
  clear();
  translate(width / 2, height / 2);
  
  // Calculate wave patterns with potential inversion
  let waveFunction = wavePatternInverted ? cos : sin;
  let a = map(waveFunction(frameCount / spiral1Speed), -1, 1, 0.5, 1.5);
  let b = map(waveFunction(frameCount / spiral2Speed), -1, 1, 1, 1.5);

  rotate(frameCount / 5);
  spiral(a, 1, spiral1Color, spiral1Width, opacityLevel);
  spiral(b, 0.3, spiral2Color, spiral2Width, opacityLevel);
  
  // Calculate and display frame rate if enabled
  if (showFPS) {
    const now = Date.now();
    const elapsed = now - frameCountStart;
    
    if (elapsed > 1000) { // Update every second
      frameRate = frameCount / (elapsed / 1000);
      frameCount = 0;
      frameCountStart = now;
    }
    
    // Display FPS
    push();
    resetMatrix();
    fill(255);
    noStroke();
    textSize(14);
    textAlign(LEFT, TOP);
    text(`FPS: ${frameRate.toFixed(1)}`, 10, 10);
    pop();
  }
  
  frameCount++;
}

function onWindowResize() {
  // Check if eyeCursor exists
  if (!eyeCursor) return;
  
  // Update the canvas size
  width = eyeCursor.clientWidth;
  height = eyeCursor.clientHeight;
  resizeCanvas(width, height);
}

function spiral(a, x, d, baseWidth, opacity = 1.0) {
  // Apply opacity to the color
  const c = color(d[0], d[1], d[2], 255 * opacity);
  fill(c);
  stroke(c);
  
  let r1 = 0, r2 = 2, step = a;
  let spiralWidth = baseWidth;
  
  // Get performance settings
  const perfSettings = QUALITY_SETTINGS[performanceMode] || QUALITY_SETTINGS.balanced;
  const iterations = perfSettings.iterations;
  const complexity = perfSettings.complexity;
  
  // Calculate width reduction per step
  let dw = (spiralWidth / (iterations * 0.8)) * complexity;
  
  beginShape(TRIANGLE_STRIP);
  for (let i = 0; i < iterations; i++) {
    r1 += step;
    spiralWidth -= dw;
    r2 = r1 + spiralWidth;
    const ang = x;
    const r1x = r1 * sin(ang * i);
    const r1y = r1 * cos(ang * i);
    const r2x = r2 * sin(ang * i);
    const r2y = r2 * cos(ang * i);
    vertex(r1x, r1y);
    vertex(r2x, r2y);
  }
  endShape();
}

// Function to update spiral parameters
function updateSpiralParams(spiral1WidthValue, spiral2WidthValue, speedValue1, speedValue2) {
  spiral1Width = spiral1WidthValue;
  spiral2Width = spiral2WidthValue;
  spiral1Speed = speedValue1;
  spiral2Speed = speedValue2;
}

// Function to update spiral colors
function updateSpiralColors(color1, color2) {
  spiral1Color = color1;
  spiral2Color = color2;
}

// Function to invert wave pattern
function invertSpiralWavePattern(inverted) {
  wavePatternInverted = inverted;
}

// Function to update performance mode
function updatePerformanceMode(mode) {
  if (QUALITY_SETTINGS[mode]) {
    performanceMode = mode;
    console.log(`Spiral performance mode set to: ${mode}`);
  }
}

// Function to update opacity
function updateSpiralOpacity(opacity) {
  opacityLevel = Math.max(0.1, Math.min(1.0, opacity));
}

// Function to toggle FPS display
function toggleFPSDisplay(show) {
  showFPS = show;
}

// Make functions globally accessible
window.updateSpiralParams = updateSpiralParams;
window.updateSpiralColors = updateSpiralColors;
window.invertSpiralWavePattern = invertSpiralWavePattern;
window.updatePerformanceMode = updatePerformanceMode;
window.updateSpiralOpacity = updateSpiralOpacity;
window.toggleFPSDisplay = toggleFPSDisplay;