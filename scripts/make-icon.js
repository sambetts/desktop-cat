// Generates assets/icon.png (a simple paw print). Run: node scripts/make-icon.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const N = 64;
const px = Buffer.alloc(N * N * 4);
const circles = [[32, 42, 13], [14, 26, 7], [26, 14, 7], [38, 14, 7], [50, 26, 7]];
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  if (circles.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r)) {
    const i = (y * N + x) * 4; px[i] = 232; px[i + 1] = 160; px[i + 2] = 90; px[i + 3] = 255;
  }
}
const raw = Buffer.alloc((N * 4 + 1) * N);
for (let y = 0; y < N; y++) px.copy(raw, y * (N * 4 + 1) + 1, y * N * 4, (y + 1) * N * 4);
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
fs.mkdirSync(path.join(__dirname, '..', 'assets'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'assets', 'icon.png'), png);
