#!/usr/bin/env node
// Renders public/favicon.svg into favicon.ico (32px PNG-in-ICO) and
// apple-touch-icon.png (180px). Re-run after editing the SVG:
//   node scripts/generate-icons.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pub = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const svg = fs.readFileSync(path.join(pub, 'favicon.svg'));

const png32 = await sharp(svg, { density: 288 }).resize(32, 32).png().toBuffer();
await sharp(svg, { density: 288 }).resize(180, 180).png().toFile(path.join(pub, 'apple-touch-icon.png'));

// ICO container with a single embedded PNG (valid since Windows Vista).
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // count
const dir = Buffer.alloc(16);
dir.writeUInt8(32, 0); // width
dir.writeUInt8(32, 1); // height
dir.writeUInt8(0, 2); // palette
dir.writeUInt8(0, 3); // reserved
dir.writeUInt16LE(1, 4); // planes
dir.writeUInt16LE(32, 6); // bpp
dir.writeUInt32LE(png32.length, 8); // size
dir.writeUInt32LE(22, 12); // offset
fs.writeFileSync(path.join(pub, 'favicon.ico'), Buffer.concat([header, dir, png32]));
console.log('wrote favicon.ico + apple-touch-icon.png');
