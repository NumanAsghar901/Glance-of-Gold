/**
 * Re-saves product photos that were uploaded as heavy PNG files as high quality JPEG, which is usually 5 to 10
 * times smaller and the same to the eye. Pages load faster and Next's image resizer stops timing out.
 *
 *   npm run optimize-images            shows what would change, changes nothing
 *   npm run optimize-images -- --apply converts, points each product photo at the new file, then deletes the PNG
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const apply = process.argv.includes("--apply");
const BUCKET = "product-images";
const MAX_EDGE = 3000;

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const pathOf = (url: string) => {
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
};
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(2)} MB`;

async function main() {
  const { data: photos, error } = await supabase
    .from("product_images")
    .select("id, product_id, url")
    .ilike("url", "%.png");
  if (error) throw new Error(error.message);

  let before = 0;
  let after = 0;
  let converted = 0;
  for (const photo of photos) {
    const oldPath = pathOf(photo.url);
    if (!oldPath) continue; // a built-in sample picture, not a stored file
    try {
      const res = await fetch(photo.url);
      if (!res.ok) throw new Error(`download failed (HTTP ${res.status})`);
      const original = Buffer.from(await res.arrayBuffer());
      const { data: body, info } = await sharp(original)
        .rotate()
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });

      before += original.length;
      after += body.length;
      console.log(`Photo ${photo.id} (product ${photo.product_id}): ${mb(original.length)} -> ${mb(body.length)}`);
      if (!apply) continue;

      const newPath = `${photo.product_id}/${randomUUID()}.jpg`;
      const up = await supabase.storage.from(BUCKET).upload(newPath, body, { contentType: "image/jpeg" });
      if (up.error) throw new Error(up.error.message);
      const newUrl = supabase.storage.from(BUCKET).getPublicUrl(newPath).data.publicUrl;
      const upd = await supabase.from("product_images").update({ url: newUrl, width: info.width, height: info.height }).eq("id", photo.id);
      if (upd.error) {
        await supabase.storage.from(BUCKET).remove([newPath]); // the row still points at the PNG, so drop the copy
        throw new Error(upd.error.message);
      }
      await supabase.storage.from(BUCKET).remove([oldPath]);
      converted++;
    } catch (e) {
      console.error(`Photo ${photo.id} skipped: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(
    `\n${apply ? `Converted ${converted} photo${converted === 1 ? "" : "s"}` : `${photos.length} PNG photo${photos.length === 1 ? "" : "s"} found`}: ` +
      `${mb(before)} -> ${mb(after)}.${apply ? "" : " Nothing was changed. Run again with -- --apply to convert them."}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
