const Jimp = require('jimp');
const path = require('path');

async function generateIcon() {
  const size = 256;

  // Create a new image with purple gradient background
  const image = new Jimp(size, size, 0x6366f1ff); // Purple color

  // Add a simple "M" letter pattern using pixels
  const centerX = size / 2;
  const centerY = size / 2;
  const letterColor = 0xffffffff; // White

  // Draw "M" shape
  const thickness = 20;
  const height = 140;
  const width = 120;
  const startX = centerX - width/2;
  const startY = centerY - height/2;

  // Left vertical bar
  for (let y = startY; y < startY + height; y++) {
    for (let x = startX; x < startX + thickness; x++) {
      if (x >= 0 && x < size && y >= 0 && y < size) {
        image.setPixelColor(letterColor, x, y);
      }
    }
  }

  // Right vertical bar
  for (let y = startY; y < startY + height; y++) {
    for (let x = startX + width - thickness; x < startX + width; x++) {
      if (x >= 0 && x < size && y >= 0 && y < size) {
        image.setPixelColor(letterColor, x, y);
      }
    }
  }

  // Left diagonal
  for (let i = 0; i < height/2; i++) {
    const x = startX + thickness + Math.floor(i * (width/2 - thickness) / (height/2));
    const y = startY + i;
    for (let t = 0; t < thickness; t++) {
      if (x + t >= 0 && x + t < size && y >= 0 && y < size) {
        image.setPixelColor(letterColor, x + t, y);
      }
    }
  }

  // Right diagonal
  for (let i = 0; i < height/2; i++) {
    const x = startX + width - thickness - Math.floor(i * (width/2 - thickness) / (height/2));
    const y = startY + i;
    for (let t = -thickness; t < 0; t++) {
      if (x + t >= 0 && x + t < size && y >= 0 && y < size) {
        image.setPixelColor(letterColor, x + t, y);
      }
    }
  }

  // Add rounded corners effect (make corners transparent)
  const cornerRadius = 40;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Top-left corner
      if (x < cornerRadius && y < cornerRadius) {
        const dist = Math.sqrt(Math.pow(cornerRadius - x, 2) + Math.pow(cornerRadius - y, 2));
        if (dist > cornerRadius) {
          image.setPixelColor(0x00000000, x, y);
        }
      }
      // Top-right corner
      if (x >= size - cornerRadius && y < cornerRadius) {
        const dist = Math.sqrt(Math.pow(x - (size - cornerRadius), 2) + Math.pow(cornerRadius - y, 2));
        if (dist > cornerRadius) {
          image.setPixelColor(0x00000000, x, y);
        }
      }
      // Bottom-left corner
      if (x < cornerRadius && y >= size - cornerRadius) {
        const dist = Math.sqrt(Math.pow(cornerRadius - x, 2) + Math.pow(y - (size - cornerRadius), 2));
        if (dist > cornerRadius) {
          image.setPixelColor(0x00000000, x, y);
        }
      }
      // Bottom-right corner
      if (x >= size - cornerRadius && y >= size - cornerRadius) {
        const dist = Math.sqrt(Math.pow(x - (size - cornerRadius), 2) + Math.pow(y - (size - cornerRadius), 2));
        if (dist > cornerRadius) {
          image.setPixelColor(0x00000000, x, y);
        }
      }
    }
  }

  // Save as PNG
  const outputPath = path.join(__dirname, '../public/icon.png');
  await image.writeAsync(outputPath);
  console.log('Icon generated at:', outputPath);

  // Generate ICO from PNG using png-to-ico
  const pngToIco = require('png-to-ico');
  const fs = require('fs');

  const pngBuffer = fs.readFileSync(outputPath);
  const icoBuffer = await pngToIco(pngBuffer);
  const icoPath = path.join(__dirname, '../public/icon.ico');
  fs.writeFileSync(icoPath, icoBuffer);
  console.log('ICO generated at:', icoPath);
}

generateIcon().catch(console.error);
