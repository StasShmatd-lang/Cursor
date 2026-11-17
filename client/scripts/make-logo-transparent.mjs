import sharp from "sharp";
import { writeFile } from "fs/promises";

const input = "/cursor/stores/self/media/logo-shmidt.jpg";
const outputs = [
  "/agent/client/public/brand/logo-shmidt.png",
  "/cursor/stores/self/media/logo-shmidt.png",
];

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  // Drop white / pale peach background; keep gold signature
  if (lum > 235 || (lum > 200 && chroma < 45)) {
    data[i + 3] = 0;
  }
}

const png = await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toBuffer();

for (const out of outputs) {
  await writeFile(out, png);
  console.log("wrote", out);
}