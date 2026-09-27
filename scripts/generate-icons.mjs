// One-off: renders apps/web/src/app/icon.svg into the PNG sizes the PWA
// manifest and iOS home screen need. Run with `node scripts/generate-icons.mjs`.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..', 'apps', 'web');
const svg = await readFile(resolve(root, 'src', 'app', 'icon.svg'));
const outDir = resolve(root, 'public', 'icons');
await mkdir(outDir, { recursive: true });

const render = (size) => sharp(svg, { density: 384 }).resize(size, size).png();

await render(192).toFile(resolve(outDir, 'icon-192.png'));
await render(512).toFile(resolve(outDir, 'icon-512.png'));
await render(180).toFile(resolve(root, 'src', 'app', 'apple-icon.png'));

// Maskable icons get cropped to a circle or squircle by the launcher, so the
// mark sits inside a 20% safe zone on a solid brand background.
const inner = await render(Math.round(512 * 0.6)).toBuffer();
await sharp({
  create: { background: '#b84a2b', channels: 4, height: 512, width: 512 },
})
  .composite([{ gravity: 'centre', input: inner }])
  .png()
  .toFile(resolve(outDir, 'icon-maskable-512.png'));

await writeFile(resolve(outDir, '.gitkeep'), '');
console.log('icons written to', outDir);
