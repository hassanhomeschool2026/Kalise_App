// Generates valid PNG icons without external native dependencies using Node zlib
import fs from 'fs';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = createCRC32Table();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function generatePNG(width, height, isMaskable = false) {
  // RGBA buffer: (width * 4 + 1) * height bytes with filter byte 0 per scanline
  const scanlineLength = width * 4 + 1;
  const rawData = Buffer.alloc(scanlineLength * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.38;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Deep tranquil slate/teal background
      let r = 15;
      let g = 23;
      let b = 42;
      let a = 255;

      // Radial subtle ambient background gradient
      const normDist = dist / (width * 0.7);
      r = Math.min(255, Math.floor(14 + (1 - normDist) * 16));
      g = Math.min(255, Math.floor(23 + (1 - normDist) * 35));
      b = Math.min(255, Math.floor(42 + (1 - normDist) * 45));

      // Organic 5-petal flower bloom equation
      // r_petal = radius * (0.65 + 0.35 * cos(5 * theta))
      const petalDist = radius * (0.65 + 0.32 * Math.cos(5 * angle));
      
      if (dist < petalDist) {
        const t = Math.max(0, Math.min(1, dist / radius));
        // Teal to lavender glow
        r = Math.floor(45 * (1 - t) + 129 * t);
        g = Math.floor(212 * (1 - t) + 140 * t);
        b = Math.floor(191 * (1 - t) + 248 * t);
        a = 255;
      }

      // Soft center glowing pearl
      if (dist < radius * 0.22) {
        const ct = dist / (radius * 0.22);
        r = Math.floor(240 * (1 - ct) + r * ct);
        g = Math.floor(250 * (1 - ct) + g * ct);
        b = Math.floor(255 * (1 - ct) + b * ct);
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: 6 (RGBA)
  ihdrData[10] = 0; // Compression: 0
  ihdrData[11] = 0; // Filter method: 0
  ihdrData[12] = 0; // Interlace: 0 (No interlace)
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT Chunk (compressed raw image data)
  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);

  // IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

if (!fs.existsSync('public')) {
  fs.mkdirSync('public', { recursive: true });
}

fs.writeFileSync('public/pwa-192x192.png', generatePNG(192, 192, false));
fs.writeFileSync('public/pwa-512x512.png', generatePNG(512, 512, false));
fs.writeFileSync('public/pwa-maskable-512x512.png', generatePNG(512, 512, true));
fs.writeFileSync('public/apple-touch-icon.png', generatePNG(180, 180, false));
fs.writeFileSync('public/favicon.ico', generatePNG(64, 64, false));

console.log('PWA and Apple touch icons generated successfully in public/');
