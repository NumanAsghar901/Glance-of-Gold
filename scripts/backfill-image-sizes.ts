/**
 * Measures product photos uploaded before photo sizes were stored, and saves each one's width and height.
 *
 *   npm run backfill-image-sizes
 *
 * Run it once, after the 20261022000001_product_image_size.sql migration. It only fills photos that have no
 * size yet, so it is safe to run again. Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: photos, error } = await supabase.from("product_images").select("id, url").is("width", null);
  if (error) {
    console.error(
      error.message.includes("width")
        ? "The width column does not exist yet. Run supabase/migrations/20261022000001_product_image_size.sql in the Supabase SQL editor first."
        : error.message,
    );
    process.exit(1);
  }

  let done = 0;
  let failed = 0;
  let samples = 0;
  for (const photo of photos) {
    // The built-in sample pictures live in /public (not in storage) and are all 800 x 1000, the standard frame.
    if (!/^https?:\/\//.test(photo.url)) {
      samples++;
      continue;
    }
    try {
      const res = await fetch(photo.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
      if (!meta.width || !meta.height) throw new Error("no size in file");
      // Phone cameras can store a photo turned on its side; the browser shows it upright, so swap.
      const turned = (meta.orientation ?? 1) >= 5;
      const { error: updateError } = await supabase
        .from("product_images")
        .update({ width: turned ? meta.height : meta.width, height: turned ? meta.width : meta.height })
        .eq("id", photo.id);
      if (updateError) throw new Error(updateError.message);
      done++;
    } catch (e) {
      failed++;
      console.error(`Photo ${photo.id} skipped: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(
    `Measured ${done} photo${done === 1 ? "" : "s"}` +
      (samples ? `, ${samples} built-in sample picture${samples === 1 ? "" : "s"} left as they are (already the standard shape)` : "") +
      (failed ? `, ${failed} could not be read` : "") +
      ".",
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
