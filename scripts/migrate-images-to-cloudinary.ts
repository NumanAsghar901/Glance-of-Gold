/**
 * Copies every product photo from Supabase Storage to Cloudinary and records the Cloudinary public_id on its row.
 *
 *   npm run migrate-images-to-cloudinary                dry run: checks every photo, uploads nothing, changes nothing
 *   npm run migrate-images-to-cloudinary -- --apply     copies the photos and updates the rows
 *   npm run migrate-images-to-cloudinary -- --apply --limit 3   the same, for the first 3 photos only (a trial)
 *
 * Safe by design:
 *   - Nothing is ever deleted from Supabase: no file, no row. The `url` column keeps pointing at the original.
 *   - Safe to run again: photos that already have a public_id are skipped, and each photo always gets the same
 *     public_id, so a photo copied but not recorded (for example the run was stopped) is simply copied again.
 *   - Every photo, success or failure, is written to a log file in ./logs, and failures are printed at the end.
 *
 * Needs, in .env.local: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (always), and for --apply also
 * NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET. Run the SQL migration
 * 20261031000001_product_images_cloudinary.sql in the Supabase SQL editor first.
 */
import { createHash } from "node:crypto";
import { mkdirSync, appendFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: CLOUD_NAME,
  CLOUDINARY_API_KEY: API_KEY,
  CLOUDINARY_API_SECRET: API_SECRET,
} = process.env;

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const limitAt = args.indexOf("--limit");
const limit = limitAt === -1 ? Infinity : Number(args[limitAt + 1]);
if (!Number.isFinite(limit) && limitAt !== -1) {
  console.error("--limit needs a number, for example --limit 3");
  process.exit(1);
}

if (apply && !(CLOUD_NAME && API_KEY && API_SECRET)) {
  console.error(
    "Missing Cloudinary keys. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env.local before --apply.",
  );
  process.exit(1);
}

// Keep these two in step with src/lib/cloudinary.ts.
const FOLDER = "little-luxe-glow/products";
const INCOMING_TRANSFORMATION = "c_limit,w_2000,h_2000";
const AT_ONCE = 4;
const BUCKET_MARKER = "/storage/v1/object/public/product-images/";

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

mkdirSync("logs", { recursive: true });
const logFile = `logs/cloudinary-migration-${apply ? "apply" : "dry-run"}-${new Date().toISOString().replace(/[:.]/g, "-")}.log`;
const record = (entry: Record<string, unknown>) => appendFileSync(logFile, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(2)} MB`;

function sign(params: Record<string, string>) {
  const text = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(text + API_SECRET).digest("hex");
}

type Photo = {
  id: number;
  product_id: number;
  url: string;
  width?: number | null;
  height?: number | null;
  cloudinary_public_id?: string | null;
};

type Outcome = "copied" | "would copy" | "skipped" | "failed";

async function migrate(photo: Photo): Promise<{ outcome: Outcome; note: string }> {
  // Built-in sample pictures live in /public, not in Supabase: nothing to copy.
  if (!photo.url.includes(BUCKET_MARKER)) return { outcome: "skipped", note: "not stored in Supabase (built-in sample picture)" };

  // The same photo always gets the same public_id, which is what makes a second run harmless.
  const publicId = `${FOLDER}/p${photo.product_id}-i${photo.id}`;

  // Is the original still there, and how big is it?
  const head = await fetch(photo.url, { method: "HEAD" });
  if (!head.ok) throw new Error(`the Supabase file is not reachable (HTTP ${head.status})`);
  const size = Number(head.headers.get("content-length") ?? 0);
  const type = head.headers.get("content-type") ?? "unknown type";
  if (!apply) return { outcome: "would copy", note: `${type}, ${size ? mb(size) : "size unknown"} -> ${publicId}` };

  // Cloudinary fetches the photo from Supabase itself, so nothing is downloaded or re-sent from here.
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signed = { overwrite: "true", public_id: publicId, timestamp, transformation: INCOMING_TRANSFORMATION };
  const body = new FormData();
  body.append("file", photo.url);
  body.append("api_key", API_KEY!);
  body.append("signature", sign(signed));
  for (const [k, v] of Object.entries(signed)) body.append(k, v);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body });
  const json = (await res.json()) as { public_id?: string; width?: number; height?: number; bytes?: number; error?: { message?: string } };
  if (!res.ok || !json.public_id) throw new Error(`Cloudinary refused it: ${json.error?.message ?? `HTTP ${res.status}`}`);

  // Record it. `url` is left alone, so the Supabase original stays referenced and can be restored by clearing this column.
  const patch: Record<string, unknown> = { cloudinary_public_id: json.public_id };
  if ("width" in photo && json.width && json.height) Object.assign(patch, { width: json.width, height: json.height });
  const { error } = await supabase.from("product_images").update(patch).eq("id", photo.id).is("cloudinary_public_id", null);
  if (error) throw new Error(`copied to Cloudinary as ${json.public_id}, but the row was not updated: ${error.message}`);

  return { outcome: "copied", note: `${json.width} x ${json.height}, ${json.bytes ? mb(json.bytes) : "?"} -> ${json.public_id}` };
}

async function main() {
  console.log(apply ? "APPLY: copying photos to Cloudinary. Nothing is deleted from Supabase." : "DRY RUN: nothing will be uploaded or changed.");

  // `select *` so the script also works before the width/height columns exist.
  const { data, error } = await supabase.from("product_images").select("*").order("id");
  if (error) throw new Error(error.message);
  const rows = data as Photo[];

  const columnMissing = rows.length > 0 && !("cloudinary_public_id" in rows[0]);
  if (columnMissing) {
    const message = "The cloudinary_public_id column does not exist yet. Run supabase/migrations/20261031000001_product_images_cloudinary.sql in the Supabase SQL editor first.";
    if (apply) throw new Error(message);
    console.warn(`\nNote: ${message}\n`);
  }

  const already = rows.filter((r) => r.cloudinary_public_id);
  const todo = rows.filter((r) => !r.cloudinary_public_id).slice(0, limit);
  console.log(`${rows.length} photos in the database, ${already.length} already on Cloudinary, ${todo.length} to go through.\n`);

  const counts: Record<Outcome, number> = { copied: 0, "would copy": 0, skipped: 0, failed: 0 };
  const failures: string[] = [];
  const queue = [...todo];

  await Promise.all(
    Array.from({ length: Math.min(AT_ONCE, queue.length) }, async () => {
      for (let photo = queue.shift(); photo; photo = queue.shift()) {
        const label = `Photo ${photo.id} (product ${photo.product_id})`;
        try {
          const { outcome, note } = await migrate(photo);
          counts[outcome]++;
          console.log(`${label}: ${outcome}, ${note}`);
          record({ photo: photo.id, product: photo.product_id, outcome, note });
        } catch (e) {
          const note = e instanceof Error ? e.message : String(e);
          counts.failed++;
          failures.push(`${label}: ${note}`);
          console.error(`${label}: FAILED, ${note}`);
          record({ photo: photo.id, product: photo.product_id, outcome: "failed", note });
        }
      }
    }),
  );

  console.log(
    `\n${apply ? "Copied" : "Would copy"} ${apply ? counts.copied : counts["would copy"]}, skipped ${counts.skipped}, failed ${counts.failed}.`,
  );
  if (failures.length) {
    console.error(`\n${failures.length} failure${failures.length === 1 ? "" : "s"}:\n- ${failures.join("\n- ")}`);
    console.error("Run the command again to retry only the photos that failed.");
  }
  if (!apply) console.log("Nothing was changed. Run again with -- --apply to copy the photos.");
  console.log(`Log: ${logFile}`);
  if (failures.length) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
