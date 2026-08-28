/**
 * Rasterizes the brand SVGs into the PNG icons referenced by the PWA manifest
 * and Apple touch icon. Run: `node scripts/generate-icons.mjs`
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brand = join(root, "public", "brand");
const outDir = join(root, "public", "icons");

await mkdir(outDir, { recursive: true });

const jobs = [
  { src: "mark.svg", size: 192, out: "icon-192.png" },
  { src: "mark.svg", size: 512, out: "icon-512.png" },
  { src: "mark-maskable.svg", size: 512, out: "icon-maskable-512.png" },
  { src: "mark.svg", size: 180, out: "apple-touch-icon.png" },
  { src: "mark.svg", size: 32, out: "favicon-32.png" },
];

for (const { src, size, out } of jobs) {
  await sharp(join(brand, src))
    .resize(size, size)
    .png()
    .toFile(join(outDir, out));
  console.log(`✓ ${out} (${size}×${size})`);
}

console.log("Icons generated.");
