/**
 * Makes every logo file the site uses from the one original, brand/logo-source.png (the logo on a cream
 * background). Run `npm run make-logo-assets` after replacing that file.
 *
 *   public/brand/logo-wordmark.png   "Little Luxe Glow / Jewellery" (header, menu, admin, emails)
 *   public/brand/logo-full.png       the head and the wordmark together (footer, admin sign in)
 *   public/brand/logo-mark.png       the head only (empty product photo frames)
 *   src/app/icon.png                 favicon
 *   src/app/apple-icon.png           home screen icon
 *   src/app/opengraph-image.png      the picture shown when a link is shared (WhatsApp, Facebook)
 *
 * The cream background is removed properly (every pixel gets the least opacity that, laid over the background
 * colour, gives back the original pixel), so the gold lines keep their soft edges on any page colour.
 */
import { mkdirSync } from "node:fs";
import sharp, { type Sharp } from "sharp";

const SOURCE = "brand/logo-source.png";
const PAGE = { r: 251, g: 248, b: 243 }; // the site background (#FBF8F3), for icons and the link preview
/** The row where the head ends and the wordmark begins in the original (found by looking at where ink stops). */
const SPLIT_ROW = 415;

type Rgba = { data: Buffer; width: number; height: number };

async function cutOut(): Promise<Rgba> {
  const { data, info } = await sharp(SOURCE).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  // The background colour, measured along the border (it is flat: the spread is about 1).
  const bg = [0, 0, 0];
  let n = 0;
  const take = (x: number, y: number) => {
    for (let c = 0; c < 3; c++) bg[c] += data[(y * info.width + x) * 3 + c];
    n++;
  };
  for (let i = 0; i < 12; i++) {
    for (let x = 0; x < info.width; x++) {
      take(x, i);
      take(x, info.height - 1 - i);
    }
    for (let y = 0; y < info.height; y++) {
      take(i, y);
      take(info.width - 1 - i, y);
    }
  }
  const B = bg.map((v) => v / n);

  const out = Buffer.alloc(info.width * info.height * 4);
  for (let p = 0; p < info.width * info.height; p++) {
    let alpha = 0;
    const d = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
      d[c] = data[p * 3 + c] - B[c];
      // Differences of a few levels are noise in the flat background, not ink.
      if (Math.abs(d[c]) < 4) continue;
      alpha = Math.max(alpha, d[c] > 0 ? d[c] / (255 - B[c]) : -d[c] / B[c]);
    }
    if (alpha < 0.04) continue; // stays fully transparent
    for (let c = 0; c < 3; c++) out[p * 4 + c] = Math.max(0, Math.min(255, Math.round(B[c] + d[c] / alpha)));
    out[p * 4 + 3] = Math.round(Math.min(1, alpha) * 255);
  }
  despeckle(out, info.width, info.height);
  return { data: out, width: info.width, height: info.height };
}

/**
 * Removes stray specks left by noise in the original: only shapes of a real size are kept (with the soft edge
 * around them), everything else is made fully transparent.
 */
function despeckle(rgba: Buffer, width: number, height: number) {
  const SOLID = 40; // opacity (out of 255) that counts as part of a shape
  const MIN_PIXELS = 40; // smaller shapes are specks
  const label = new Int32Array(width * height); // 0 = none, else the shape number
  const sizes: number[] = [0];
  const stack: number[] = [];
  for (let start = 0; start < width * height; start++) {
    if (label[start] || rgba[start * 4 + 3] < SOLID) continue;
    const id = sizes.length;
    let size = 0;
    label[start] = id;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop()!;
      size++;
      const x = p % width;
      const y = (p - x) / width;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const q = ny * width + nx;
          if (!label[q] && rgba[q * 4 + 3] >= SOLID) {
            label[q] = id;
            stack.push(q);
          }
        }
      }
    }
    sizes.push(size);
  }
  // Keep the real shapes and a few pixels around them (their anti-aliased edge); clear the rest.
  const keep = new Uint8Array(width * height);
  const REACH = 3;
  for (let p = 0; p < width * height; p++) {
    if (!label[p] || sizes[label[p]] < MIN_PIXELS) continue;
    const x = p % width;
    const y = (p - x) / width;
    for (let dy = -REACH; dy <= REACH; dy++) {
      for (let dx = -REACH; dx <= REACH; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height) keep[ny * width + nx] = 1;
      }
    }
  }
  for (let p = 0; p < width * height; p++) if (!keep[p]) rgba.fill(0, p * 4, p * 4 + 4);
}

/** The box around everything that is not transparent, within the given rows. */
function inkBox(img: Rgba, fromRow = 0, toRow = img.height - 1) {
  let minX = img.width, maxX = -1, minY = img.height, maxY = -1;
  for (let y = fromRow; y <= toRow; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] > 12) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

const PAD = 6;
const png = (s: Sharp) => s.png({ palette: true, quality: 92, effort: 10, compressionLevel: 9 });

async function main() {
  mkdirSync("public/brand", { recursive: true });
  const img = await cutOut();
  const raw = { raw: { width: img.width, height: img.height, channels: 4 as const } };
  const trimmed = (box: ReturnType<typeof inkBox>) =>
    sharp(img.data, raw).extract(box).extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 0, g: 0, b: 0, alpha: 0 } });

  const full = inkBox(img);
  const head = inkBox(img, 0, SPLIT_ROW - 1);
  const word = inkBox(img, SPLIT_ROW);

  const files = {
    "public/brand/logo-full.png": trimmed(full),
    "public/brand/logo-wordmark.png": trimmed(word),
    "public/brand/logo-mark.png": trimmed(head),
  };
  for (const [path, s] of Object.entries(files)) {
    const info = await png(s).toFile(path);
    console.log(`${path}  ${info.width} x ${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
  }

  // Square icons: the head, centred on the page colour with room around it.
  const markBuf = await trimmed(head).png().toBuffer();
  const icon = async (size: number, path: string, fill: number) => {
    const inner = Math.round(size * fill);
    const mark = await sharp(markBuf).resize({ width: inner, height: inner, fit: "inside" }).toBuffer();
    const info = await png(
      sharp({ create: { width: size, height: size, channels: 3, background: PAGE } }).composite([{ input: mark, gravity: "centre" }]),
    ).toFile(path);
    console.log(`${path}  ${info.width} x ${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
  };
  await icon(512, "src/app/icon.png", 0.8);
  await icon(180, "src/app/apple-icon.png", 0.8);

  // The picture shown when a link is shared: the whole logo on the page colour.
  const fullBuf = await trimmed(full).png().toBuffer();
  const logo = await sharp(fullBuf).resize({ height: 460, fit: "inside" }).toBuffer();
  const og = await png(
    sharp({ create: { width: 1200, height: 630, channels: 3, background: PAGE } }).composite([{ input: logo, gravity: "centre" }]),
  ).toFile("src/app/opengraph-image.png");
  console.log(`src/app/opengraph-image.png  ${og.width} x ${og.height}  ${(og.size / 1024).toFixed(1)} KB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
