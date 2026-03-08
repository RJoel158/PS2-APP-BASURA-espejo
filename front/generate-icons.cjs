// Script to generate PWA icons
// Run: node generate-icons.js

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'public', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate a simple green circle with "GB" text as SVG, then save as SVG for each size
// Since we can't use canvas natively, we'll create SVG files that browsers handle well
sizes.forEach(size => {
  const padding = Math.round(size * 0.1);
  const circleR = Math.round((size - padding * 2) / 2);
  const cx = size / 2;
  const cy = size / 2;
  const fontSize = Math.round(size * 0.32);
  const leafSize = Math.round(size * 0.15);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#198754"/>
      <stop offset="100%" style="stop-color:#0d6e3f"/>
    </linearGradient>
    <linearGradient id="leaf" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#28a745"/>
      <stop offset="100%" style="stop-color:#20c997"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="url(#bg)"/>
  <text x="${cx}" y="${cy + fontSize * 0.12}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">GB</text>
  <path d="M${cx + fontSize * 0.55} ${cy - fontSize * 0.55} Q${cx + fontSize * 0.85} ${cy - fontSize * 0.95} ${cx + fontSize * 0.65} ${cy - fontSize * 0.35}" stroke="#20c997" stroke-width="${Math.max(2, Math.round(size * 0.02))}" fill="none" stroke-linecap="round"/>
  <circle cx="${cx + fontSize * 0.65}" cy="${cy - fontSize * 0.35}" r="${Math.max(2, Math.round(size * 0.015))}" fill="#20c997"/>
</svg>`;

  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.svg`), svg);
  console.log(`Generated icon-${size}x${size}.svg`);
});

// Also generate a simple PNG-compatible approach using data URIs
// For actual PNG generation, we'll use the SVGs in the manifest and create PNG placeholders

// Create a simple HTML file that can be opened in browser to download PNGs
const converterHtml = `<!DOCTYPE html>
<html>
<head><title>Icon Converter</title></head>
<body>
<h2>Open this in a browser, right-click each icon and "Save as PNG"</h2>
<div id="icons"></div>
<script>
const sizes = [${sizes.join(',')}];
sizes.forEach(size => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Background
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#198754');
  grad.addColorStop(1, '#0d6e3f');
  
  const r = size * 0.18;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, r);
  ctx.fillStyle = grad;
  ctx.fill();
  
  // Text
  ctx.fillStyle = 'white';
  ctx.font = 'bold ' + (size * 0.32) + 'px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GB', size/2, size/2 + size*0.02);
  
  // Leaf accent
  const fx = size/2 + size*0.17;
  const fy = size/2 - size*0.17;
  ctx.beginPath();
  ctx.arc(fx, fy, size*0.015, 0, Math.PI*2);
  ctx.fillStyle = '#20c997';
  ctx.fill();
  
  const img = document.createElement('img');
  img.src = canvas.toDataURL('image/png');
  img.title = 'icon-' + size + 'x' + size + '.png';
  img.style.margin = '10px';
  
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'icon-' + size + 'x' + size + '.png';
  link.textContent = size + 'x' + size;
  link.style.display = 'block';
  
  const div = document.createElement('div');
  div.style.display = 'inline-block';
  div.style.textAlign = 'center';
  div.appendChild(img);
  div.appendChild(document.createElement('br'));
  div.appendChild(link);
  document.getElementById('icons').appendChild(div);
});
</script>
</body>
</html>`;

fs.writeFileSync(path.join(iconsDir, 'converter.html'), converterHtml);
console.log('\\nGenerated converter.html - open in browser to get PNGs');
console.log('For now, using SVG icons which are supported by most modern browsers.');
