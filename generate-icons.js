// Simple icon generator for T PLAY PWA
// This script creates SVG icons that can be used as app icons

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const createSVGIcon = (size) => {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00BFFF"/>
      <stop offset="25%" style="stop-color:#8A2BE2"/>
      <stop offset="50%" style="stop-color:#FF1493"/>
      <stop offset="75%" style="stop-color:#FF8C00"/>
      <stop offset="100%" style="stop-color:#FFD700"/>
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="url(#gradient)"/>
  
  <!-- T PLAY Logo -->
  <g transform="translate(${size/4}, ${size/4})">
    <!-- T -->
    <rect x="0" y="0" width="${size/8}" height="${size/4}" fill="white"/>
    <rect x="${-size/16}" y="0" width="${size/4}" height="${size/16}" fill="white"/>
    
    <!-- PLAY Triangle -->
    <polygon points="${size/4},${size/16} ${size/2-size/16},${size/8} ${size/4},${size/4-size/16}" fill="white"/>
  </g>
</svg>`;
};

// Create public/icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons for each size
sizes.forEach(size => {
  const svgContent = createSVGIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svgContent);
  console.log(`Generated ${filename}`);
});

console.log('\n🎨 T PLAY PWA icons generated successfully!');
console.log('📝 To convert SVG to PNG, use online tools like:');
console.log('   - cloudconvert.com');
console.log('   - convertio.co');
console.log('   - Or design tools like Figma/Canva');