// PWA用アイコンを依存なしで生成する(数独の盤面モチーフ)
// 使い方: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, pixels) {
  // pixels: RGBA Uint8Array(size*size*4)
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const BG = [0x2f, 0x6f, 0xdb, 255]; // アクセントブルー
const LINE = [255, 255, 255, 255];
const FILL = [0xb9, 0xd2, 0xf7, 255]; // 薄い青(埋まったセル)

// 埋めるセル(行, 列)— 数独らしい散らばり
const FILLED = [
  [0, 4], [1, 1], [1, 7], [2, 3], [3, 0], [3, 5], [4, 2], [4, 6],
  [5, 3], [5, 8], [6, 5], [7, 1], [7, 7], [8, 4],
];

function drawIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, c) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const o = (y * size + x) * 4;
    px[o] = c[0];
    px[o + 1] = c[1];
    px[o + 2] = c[2];
    px[o + 3] = c[3];
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) set(x, y, BG);
  }
  // 盤面領域(中央にサイズの76%)
  const board = Math.round(size * 0.76);
  const origin = Math.round((size - board) / 2);
  const cell = board / 9;
  const thin = Math.max(1, Math.round(size / 170));
  const thick = Math.max(2, Math.round(size / 56));

  // 埋まったセル
  for (const [row, col] of FILLED) {
    const x0 = Math.round(origin + col * cell);
    const x1 = Math.round(origin + (col + 1) * cell);
    const y0 = Math.round(origin + row * cell);
    const y1 = Math.round(origin + (row + 1) * cell);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) set(x, y, FILL);
    }
  }
  // 格子線
  for (let i = 0; i <= 9; i++) {
    const w = i % 3 === 0 ? thick : thin;
    const p = Math.round(origin + i * cell) - Math.floor(w / 2);
    for (let t = 0; t < w; t++) {
      const start = origin - Math.floor(thick / 2);
      const end = origin + board + Math.ceil(thick / 2);
      for (let s = start; s < end; s++) {
        set(p + t, s, LINE); // 縦線
        set(s, p + t, LINE); // 横線
      }
    }
  }
  return encodePng(size, px);
}

for (const [name, size] of [
  ['icon-512.png', 512],
  ['icon-192.png', 192],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(new URL(`../public/${name}`, import.meta.url), drawIcon(size));
  console.log('generated', name);
}
