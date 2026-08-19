const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal pure-JS PNG encoder
function createPNG(width, height, getPixel) {
  // getPixel(x, y) returns [r, g, b, a]
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  function crc32(buf) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[i] = c;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function renderKindleIcon(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;

  // Background transparent
  let r = 0, g = 0, b = 0, a = 0;

  // Outer Kindle Body (rect with rounded corners)
  const padX = 0.12;
  const padY = 0.08;
  if (nx >= padX && nx <= (1 - padX) && ny >= padY && ny <= (1 - padY)) {
    // Kindle outer casing - #0284c7 to #0369a1
    r = 2; g = 132; b = 199; a = 255;

    // E-Ink Screen area
    const screenPadX = 0.20;
    const screenPadY = 0.16;
    if (nx >= screenPadX && nx <= (1 - screenPadX) && ny >= screenPadY && ny <= (1 - screenPadY)) {
      // E-Ink screen background (white/off-white)
      r = 250; g = 250; b = 252; a = 255;

      // Title line
      if (ny >= 0.24 && ny <= 0.28 && nx >= 0.26 && nx <= 0.74) {
        r = 15; g = 23; b = 42;
      }
      // Divider
      else if (ny >= 0.35 && ny <= 0.36 && nx >= 0.26 && nx <= 0.74) {
        r = 203; g = 213; b = 225;
      }
      // Content lines
      else if (ny >= 0.42 && ny <= 0.45 && nx >= 0.26 && nx <= 0.74) {
        r = 51; g = 65; b = 85;
      }
      else if (ny >= 0.50 && ny <= 0.53 && nx >= 0.26 && nx <= 0.74) {
        r = 51; g = 65; b = 85;
      }
      else if (ny >= 0.58 && ny <= 0.61 && nx >= 0.26 && nx <= 0.65) {
        r = 51; g = 65; b = 85;
      }
      else if (ny >= 0.66 && ny <= 0.69 && nx >= 0.26 && nx <= 0.74) {
        r = 51; g = 65; b = 85;
      }
      else if (ny >= 0.74 && ny <= 0.77 && nx >= 0.26 && nx <= 0.55) {
        r = 51; g = 65; b = 85;
      }
    }
  }

  // Accent badge in bottom right (Paper airplane / send indicator)
  const badgeCx = 0.76;
  const badgeCy = 0.78;
  const dist = Math.sqrt((nx - badgeCx) * (nx - badgeCx) + (ny - badgeCy) * (ny - badgeCy));
  if (dist <= 0.16) {
    r = 245; g = 158; b = 11; a = 255; // Amber badge

    // Airplane shape inside
    if (dist <= 0.09) {
      if (nx >= (badgeCx - 0.05) && ny >= (badgeCy - 0.05) && (nx + ny) <= (badgeCx + badgeCy + 0.05)) {
        r = 255; g = 255; b = 255;
      }
    }
  }

  return [r, g, b, a];
}

const sizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

sizes.forEach(size => {
  const pngBuffer = createPNG(size, size, renderKindleIcon);
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, pngBuffer);
  console.log(`Generated ${outPath} (${size}x${size})`);
});
