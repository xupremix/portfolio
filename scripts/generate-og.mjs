#!/usr/bin/env node
// Renders public/og.png (1200×630 social card) from an inline SVG via sharp.
// Re-run after changing the design:  node scripts/generate-og.mjs
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'og.png');

// Colors mirror src/styles/global.css tokens.
const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.5" fill="#cdd6f4" fill-opacity="0.07"/>
    </pattern>
    <radialGradient id="glow" cx="20%" cy="25%" r="70%">
      <stop offset="0%" stop-color="#cba6f7" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#cba6f7" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#cba6f7"/>
      <stop offset="100%" stop-color="#89b4fa"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="#1e1e2e"/>
  <rect width="1200" height="630" fill="url(#dots)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <text x="96" y="200" font-family="monospace" font-size="30" font-weight="600" fill="#cba6f7">~/filippo-lollato</text>

  <text x="92" y="300" font-family="sans-serif" font-size="84" font-weight="700" fill="#cdd6f4">Filippo Lollato</text>

  <text x="96" y="370" font-family="sans-serif" font-size="34" fill="#a6adc8">Systems ML · Rust · Multi-agent AI</text>
  <text x="96" y="418" font-family="sans-serif" font-size="34" fill="#a6adc8">ML student — University of Trento</text>

  <rect x="96" y="470" width="220" height="6" rx="3" fill="url(#bar)"/>

  <text x="96" y="546" font-family="monospace" font-size="24" fill="#a6adc8">
    <tspan fill="#cba6f7" font-weight="600">81.5%</tspan> RMSE ↓ KITTI   <tspan fill="#cba6f7" font-weight="600">0.9765</tspan> intent acc ATIS   <tspan fill="#cba6f7" font-weight="600">incin</tspan> compile-time ML
  </text>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
console.log(`wrote ${out}`);
