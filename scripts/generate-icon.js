/**
 * Generates app icon PNG files from the VJMonogram design.
 * Output: assets/icon.png (1024x1024) and assets/adaptive-icon.png (1024x1024 with padding)
 */
const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

const DARK   = '#0D0A08';
const WHITE  = 'rgba(255,255,255,1)';
const WHITE4 = 'rgba(255,255,255,0.4)';
const GOLD   = '#D4A45E';
const WHITE6 = 'rgba(255,255,255,0.6)';

function drawMonogram(ctx, cx, cy, R) {
  const OUTER_R  = R;
  const INNER_R  = R * (78 / 92);

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, OUTER_R, 0, Math.PI * 2);
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = R * (2.5 / 92);
  ctx.stroke();

  // Inner ring
  ctx.beginPath();
  ctx.arc(cx, cy, INNER_R, 0, Math.PI * 2);
  ctx.strokeStyle = WHITE4;
  ctx.lineWidth = R * (1.2 / 92);
  ctx.stroke();

  // Diamond (top)
  const ds = R / 92; // scale factor
  ctx.beginPath();
  ctx.moveTo(cx,          cy - OUTER_R + 16 * ds);
  ctx.lineTo(cx + 6 * ds, cy - OUTER_R + 24 * ds);
  ctx.lineTo(cx,          cy - OUTER_R + 32 * ds);
  ctx.lineTo(cx - 6 * ds, cy - OUTER_R + 24 * ds);
  ctx.closePath();
  ctx.fillStyle = GOLD;
  ctx.fill();

  // Horizontal line (bottom)
  const lineY = cy + OUTER_R - 30 * ds;
  ctx.beginPath();
  ctx.moveTo(cx - 24 * ds, lineY);
  ctx.lineTo(cx + 24 * ds, lineY);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = R * (1.2 / 92);
  ctx.lineCap = 'round';
  ctx.stroke();

  // "VJ" text
  const fontSize = Math.round(R * (62 / 92));
  ctx.font = `italic bold ${fontSize}px Georgia, serif`;
  ctx.fillStyle = WHITE;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('VJ', cx, cy + fontSize * 0.35);

  // "EST · MMXXIII" text
  const smallSize = Math.round(R * (7 / 92));
  ctx.font = `${smallSize}px Georgia, serif`;
  ctx.fillStyle = WHITE6;
  ctx.letterSpacing = `${smallSize * 0.4}px`;
  ctx.fillText('EST · MMXXIII', cx, cy + OUTER_R - 40 * ds);
}

function generateIcon(size, filename, padding = 0) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = DARK;
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const R  = (size / 2) * (1 - padding);

  drawMonogram(ctx, cx, cy, R);

  const buf = canvas.toBuffer('image/png');
  const outPath = path.join(OUT, filename);
  fs.writeFileSync(outPath, buf);
  console.log(`✓ ${filename} (${size}×${size}) → ${outPath}`);
}

// Main icon: 1024×1024, fills the frame
generateIcon(1024, 'icon.png', 0.08);

// Adaptive icon foreground: 1024×1024 with extra safe-zone padding (Android crops to circle/squircle)
generateIcon(1024, 'adaptive-icon.png', 0.18);

// Splash icon: 200×200 (Expo splash uses a centered image)
generateIcon(200, 'splash-icon.png', 0.06);

console.log('\nDone. Update app.json:');
console.log('  "icon": "./assets/icon.png"');
console.log('  android.adaptiveIcon.foregroundImage: "./assets/adaptive-icon.png"');
