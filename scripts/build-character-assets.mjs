// scripts/build-character-assets.mjs
// Builds the AI guide's web assets from its source art (design/character/,
// PUBLIC-REDESIGN-PLAN §3a): WebP at the canvas size for the rig and the pose
// frames, and a round face crop for the docked launcher. Deterministic — run
// again after replacing a source image: `node scripts/build-character-assets.mjs`.

import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const SRC = "design/character";
const OUT = "public/character";

// The rig's canvas matches the master (1024×1536); the rig maps features in these pixels.
const FULL = [
  ["master-anime-2d.png", "guide-master.webp"],
  ["pose-wave.png", "guide-wave.webp"],
  ["pose-point.png", "guide-point.webp"],
  ["pose-thinking.png", "guide-thinking.webp"],
];

// The master's face, measured on the 1024×1536 canvas (see components/guide/rig.ts).
const FACE = { left: 330, top: 70, width: 360, height: 360 };

await mkdir(OUT, { recursive: true });
for (const [from, to] of FULL) {
  const info = await sharp(`${SRC}/${from}`).webp({ quality: 88, alphaQuality: 90, effort: 6 }).toFile(`${OUT}/${to}`);
  console.log(`${to}: ${info.width}x${info.height}, ${Math.round(info.size / 1024)} KB`);
}

const circle = Buffer.from(`<svg width="256" height="256"><circle cx="128" cy="128" r="128" fill="#fff"/></svg>`);
const face = await sharp(`${SRC}/master-anime-2d.png`)
  .extract(FACE)
  .resize(256, 256)
  .composite([{ input: circle, blend: "dest-in" }])
  .webp({ quality: 90 })
  .toFile(`${OUT}/guide-face.webp`);
console.log(`guide-face.webp: ${face.width}x${face.height}, ${Math.round(face.size / 1024)} KB`);
