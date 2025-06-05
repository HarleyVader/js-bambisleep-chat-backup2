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

function spiral(step, ang, color, baseWidth) {
  const c = color(color[0], color[1], color[2], 255 * opacityLevel);
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

// Simple parameter update functions
function updateSpiralParams(w1, w2, s1, s2) {
  spiral1Width = w1 || spiral1Width;
  spiral2Width = w2 || spiral2Width;
  spiral1Speed = s1 || spiral1Speed;
  spiral2Speed = s2 || spiral2Speed;
}

function updateSpiralColors(c1, c2) {
  if (c1) spiral1Color = c1;
  if (c2) spiral2Color = c2;
}

function updateSpiralOpacity(opacity) {
  opacityLevel = Math.max(0.1, Math.min(1.0, opacity || 1.0));
}

// Export functions globally
window.updateSpiralParams = updateSpiralParams;
window.updateSpiralColors = updateSpiralColors;
window.updateSpiralOpacity = updateSpiralOpacity;
