/**
 * Copies every image the store keeps in Supabase Storage to Cloudinary and points the database at the copies.
 *
 *   npm run migrate-images-to-cloudinary                dry run: checks everything, uploads nothing, changes nothing
 *   npm run migrate-images-to-cloudinary -- --apply     step 1: copies the images and records each product photo's public_id.
 *                                                       Pages already live keep working: nothing they read is changed.
 *   npm run migrate-images-to-cloudinary -- --apply --switch   step 2, after the new site is deployed: points categories,
 *                                                       banners, product photo addresses and past orders at Cloudinary
 *   add --limit 3 to either to try only the first 3 images of each kind
 *
 * What it moves, in this order:
 *   1. product photos        (product_images: cloudinary_public_id is set and url now points at Cloudinary)
 *   2. category photos       (categories.image_url)
 *   3. banner photos         (banners.image_url and mobile_image_url)
 *   4. order lines of past orders (order_items.image_url, matched to the product photo that was copied)
 *   5. payment screenshots   (payment_proofs.screenshot_path, copied as private files)
 *   6. the story photo       (public/story/glance-story.jpg, shown on the home and About pages)
 *
 * Safe by design:
 *   - Nothing is ever deleted from Supabase: no file, no row. Supabase keeps every original.
 *   - Safe to run again: images already on Cloudinary are skipped, and each image always gets the same public_id,
 *     so one copied but not recorded (for example the run was stopped) is simply copied again.
 *   - Every change is written to a log file in ./logs with the old and the new address, so any row can be put back.
 *
 * Needs, in .env.local: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (always), and for --apply also
 * NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET. Run the SQL migration
 * 20261031000001_product_images_cloudinary.sql in the Supabase SQL editor first.
 */
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
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
const switchOver = args.includes("--switch");
if (switchOver && !apply) {
  console.error("--switch changes the database, so it needs --apply as well: npm run migrate-images-to-cloudinary -- --apply --switch");
  process.exit(1);
}
const limitAt = args.indexOf("--limit");
const limit = limitAt === -1 ? Infinity : Number(args[limitAt + 1]);
if (limitAt !== -1 && !Number.isFinite(limit)) {
  console.error("--limit needs a number, for example --limit 3");
  process.exit(1);
}

if (apply && !(CLOUD_NAME && API_KEY && API_SECRET)) {
  console.error(
    "Missing Cloudinary keys. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env.local before --apply.",
  );
  process.exit(1);
}

// Keep these in step with src/lib/cloudinary.ts.
const FOLDERS = {
  product: "little-luxe-glow/products",
  category: "little-luxe-glow/categories",
  banner: "little-luxe-glow/banners",
  proof: "little-luxe-glow/payment-proofs",
  site: "little-luxe-glow/site",
};
const cloudinarySrc = (publicId: string) => `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${publicId}`;
const limitTo = (edge: number) => `c_limit,w_${edge},h_${edge}`;
const AT_ONCE = 4;
const IMAGE_MARKER = "/storage/v1/object/public/product-images/";
const isSupabaseImage = (url: string | null | undefined): url is string => !!url && url.includes(IMAGE_MARKER);

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

mkdirSync("logs", { recursive: true });
const logFile = `logs/cloudinary-migration-${apply ? "apply" : "dry-run"}-${new Date().toISOString().replace(/[:.]/g, "-")}.log`;
const record = (entry: Record<string, unknown>) => appendFileSync(logFile, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(2)} MB`;
const failures: string[] = [];
const totals = { copied: 0, wouldCopy: 0, repointed: 0, skipped: 0, failed: 0 };

function sign(params: Record<string, string>) {
  const text = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(text + API_SECRET).digest("hex");
}

type Uploaded = { public_id: string; width: number; height: number; bytes: number };

/**
 * Asks Cloudinary to fetch `source` (an address) itself and store it as `publicId`, or sends `source` (file bytes).
 * Nothing is downloaded or re-sent from here when the source is an address.
 */
async function upload(source: string | Buffer, publicId: string, edge: number, type: "upload" | "authenticated" = "upload"): Promise<Uploaded> {
  const signed: Record<string, string> = {
    overwrite: "true",
    public_id: publicId,
    timestamp: String(Math.floor(Date.now() / 1000)),
    transformation: limitTo(edge),
    ...(type === "authenticated" ? { type } : {}),
  };
  const body = new FormData();
  if (typeof source === "string") body.append("file", source);
  else body.append("file", new Blob([new Uint8Array(source)]), "image");
  body.append("api_key", API_KEY!);
  body.append("signature", sign(signed));
  for (const [k, v] of Object.entries(signed)) body.append(k, v);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body });
  const json = (await res.json()) as Partial<Uploaded> & { error?: { message?: string } };
  if (!res.ok || !json.public_id) throw new Error(`Cloudinary refused it: ${json.error?.message ?? `HTTP ${res.status}`}`);
  return json as Uploaded;
}

/** Is the original still there, and how big is it? Throws when it cannot be fetched. */
async function check(url: string) {
  const head = await fetch(url, { method: "HEAD" });
  if (!head.ok) throw new Error(`the Supabase file is not reachable (HTTP ${head.status})`);
  const size = Number(head.headers.get("content-length") ?? 0);
  return `${head.headers.get("content-type") ?? "unknown type"}, ${size ? mb(size) : "size unknown"}`;
}

/** Runs `work` over `items`, a few at a time, logging each result and collecting failures instead of stopping. */
async function each<T>(title: string, items: T[], label: (item: T) => string, work: (item: T) => Promise<{ outcome: "copied" | "would copy" | "repointed" | "skipped"; note: string }>) {
  const todo = items.slice(0, limit);
  console.log(`\n${title}: ${items.length} to go through${todo.length < items.length ? ` (trial: first ${todo.length})` : ""}`);
  const queue = [...todo];
  await Promise.all(
    Array.from({ length: Math.min(AT_ONCE, queue.length) }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        const name = label(item);
        try {
          const { outcome, note } = await work(item);
          if (outcome === "copied") totals.copied++;
          else if (outcome === "would copy") totals.wouldCopy++;
          else if (outcome === "repointed") totals.repointed++;
          else totals.skipped++;
          console.log(`  ${name}: ${outcome}, ${note}`);
          record({ phase: title, item: name, outcome, note });
        } catch (e) {
          const note = e instanceof Error ? e.message : String(e);
          totals.failed++;
          failures.push(`${title}, ${name}: ${note}`);
          console.error(`  ${name}: FAILED, ${note}`);
          record({ phase: title, item: name, outcome: "failed", note });
        }
      }
    }),
  );
}

type Photo = { id: number; product_id: number; url: string; width?: number | null; height?: number | null; cloudinary_public_id?: string | null };

async function main() {
  console.log(
    apply
      ? `APPLY${switchOver ? " + SWITCH" : ""}: copying images to Cloudinary${switchOver ? " and pointing the site at them" : ""}. Nothing is deleted from Supabase.`
      : "DRY RUN: nothing will be uploaded or changed.",
  );

  // 1. Product photos ------------------------------------------------------------------------------
  // `select *` so the script also works before the width/height columns exist.
  const { data: photoRows, error: photoError } = await supabase.from("product_images").select("*").order("id");
  if (photoError) throw new Error(photoError.message);
  const photos = photoRows as Photo[];
  if (photos.length && !("cloudinary_public_id" in photos[0])) {
    const message = "The cloudinary_public_id column does not exist yet. Run supabase/migrations/20261031000001_product_images_cloudinary.sql in the Supabase SQL editor first.";
    if (apply) throw new Error(message);
    console.warn(`\nNote: ${message}\n`);
  }

  // Old Supabase address -> public_id, so past orders can be matched to the copied photo (phase 4).
  const copiedAs = new Map<string, string>();
  photos.forEach((p) => {
    if (!isSupabaseImage(p.url)) return;
    if (p.cloudinary_public_id) copiedAs.set(p.url, p.cloudinary_public_id);
    // A dry run copies nothing, so it predicts the id each photo will get; a real run records it only once the copy has worked.
    else if (!apply) copiedAs.set(p.url, `${FOLDERS.product}/p${p.product_id}-i${p.id}`);
  });

  await each(
    "Product photos",
    photos.filter((p) => (!p.cloudinary_public_id && isSupabaseImage(p.url)) || (p.cloudinary_public_id && p.url !== cloudinarySrc(p.cloudinary_public_id) && (switchOver || !apply))),
    (p) => `Photo ${p.id} (product ${p.product_id})`,
    async (p) => {
      const publicId = p.cloudinary_public_id ?? `${FOLDERS.product}/p${p.product_id}-i${p.id}`;
      const patch: Record<string, unknown> = {};
      let note: string;
      let outcome: "copied" | "would copy" | "repointed";

      if (p.cloudinary_public_id) {
        outcome = apply ? "repointed" : "would copy";
        note = `already on Cloudinary, url -> ${publicId}`;
      } else {
        const facts = await check(p.url);
        if (!apply) return { outcome: "would copy", note: `${facts} -> ${publicId}` };
        const done = await upload(p.url, publicId, 2000);
        patch.cloudinary_public_id = done.public_id;
        if ("width" in p && done.width && done.height) Object.assign(patch, { width: done.width, height: done.height });
        outcome = "copied";
        note = `${done.width} x ${done.height}, ${mb(done.bytes)} -> ${done.public_id}`;
      }
      if (!apply) return { outcome, note };

      // The address pages read is only changed in step 2, so a site deployed before the new code keeps working.
      const finalId = (patch.cloudinary_public_id as string | undefined) ?? publicId;
      if (switchOver) patch.url = cloudinarySrc(finalId);
      const { error } = await supabase.from("product_images").update(patch).eq("id", p.id);
      if (error) throw new Error(`copied as ${finalId}, but the row was not updated: ${error.message}`);
      copiedAs.set(p.url, finalId);
      if (switchOver) record({ change: "product_images.url", id: p.id, from: p.url, to: patch.url });
      return { outcome, note };
    },
  );

  // 2. Category photos -----------------------------------------------------------------------------
  const { data: categories, error: catError } = await supabase.from("categories").select("id, name, image_url").order("id");
  if (catError) throw new Error(catError.message);
  await each(
    "Category photos",
    categories.filter((c) => isSupabaseImage(c.image_url)),
    (c) => `Category ${c.id} (${c.name})`,
    async (c) => {
      const publicId = `${FOLDERS.category}/c${c.id}`;
      const facts = await check(c.image_url!);
      if (!apply) return { outcome: "would copy", note: `${facts} -> ${publicId}` };
      const done = await upload(c.image_url!, publicId, 2000);
      if (!switchOver) return { outcome: "copied", note: `${done.width} x ${done.height}, ${mb(done.bytes)} -> ${done.public_id} (not switched yet)` };
      const { error } = await supabase.from("categories").update({ image_url: cloudinarySrc(done.public_id) }).eq("id", c.id);
      if (error) throw new Error(`copied as ${done.public_id}, but the row was not updated: ${error.message}`);
      record({ change: "categories.image_url", id: c.id, from: c.image_url, to: cloudinarySrc(done.public_id) });
      return { outcome: "copied", note: `${done.width} x ${done.height}, ${mb(done.bytes)} -> ${done.public_id}` };
    },
  );

  // 3. Banner photos -------------------------------------------------------------------------------
  const { data: banners, error: bannerError } = await supabase.from("banners").select("id, image_url, mobile_image_url").order("id");
  if (bannerError) throw new Error(bannerError.message);
  const bannerParts = banners.flatMap((b) => [
    ...(isSupabaseImage(b.image_url) ? [{ id: b.id, column: "image_url" as const, url: b.image_url, publicId: `${FOLDERS.banner}/b${b.id}-wide`, edge: 2560 }] : []),
    ...(isSupabaseImage(b.mobile_image_url) ? [{ id: b.id, column: "mobile_image_url" as const, url: b.mobile_image_url, publicId: `${FOLDERS.banner}/b${b.id}-tall`, edge: 2000 }] : []),
  ]);
  await each(
    "Banner photos",
    bannerParts,
    (b) => `Banner ${b.id} (${b.column === "image_url" ? "wide" : "tall"})`,
    async (b) => {
      const facts = await check(b.url);
      if (!apply) return { outcome: "would copy", note: `${facts} -> ${b.publicId}` };
      const done = await upload(b.url, b.publicId, b.edge);
      if (!switchOver) return { outcome: "copied", note: `${done.width} x ${done.height}, ${mb(done.bytes)} -> ${done.public_id} (not switched yet)` };
      const { error } = await supabase.from("banners").update({ [b.column]: cloudinarySrc(done.public_id) }).eq("id", b.id);
      if (error) throw new Error(`copied as ${done.public_id}, but the row was not updated: ${error.message}`);
      record({ change: `banners.${b.column}`, id: b.id, from: b.url, to: cloudinarySrc(done.public_id) });
      return { outcome: "copied", note: `${done.width} x ${done.height}, ${mb(done.bytes)} -> ${done.public_id}` };
    },
  );

  // 4. Past orders ---------------------------------------------------------------------------------
  // Each order line keeps a copy of the product photo's address from the day it was bought.
  const { data: lines, error: lineError } = await supabase.from("order_items").select("id, image_url").like("image_url", `%${IMAGE_MARKER}%`).order("id");
  if (lineError) throw new Error(lineError.message);
  await each(
    "Past order lines",
    lines,
    (l) => `Order line ${l.id}`,
    async (l) => {
      const publicId = copiedAs.get(l.image_url!);
      // The photo was removed from the product after the order, so there is nothing to point at.
      if (!publicId) return { outcome: "skipped", note: "no matching product photo any more (left as it is)" };
      if (!apply) return { outcome: "would copy", note: `url -> ${publicId}` };
      if (!switchOver) return { outcome: "skipped", note: "switched in step 2" };
      const { error } = await supabase.from("order_items").update({ image_url: cloudinarySrc(publicId) }).eq("id", l.id);
      if (error) throw new Error(error.message);
      record({ change: "order_items.image_url", id: l.id, from: l.image_url, to: cloudinarySrc(publicId) });
      return { outcome: "repointed", note: `-> ${publicId}` };
    },
  );

  // 5. Payment screenshots -------------------------------------------------------------------------
  const { data: proofs, error: proofError } = await supabase.from("payment_proofs").select("id, order_id, screenshot_path").not("screenshot_path", "is", null).order("id");
  if (proofError) throw new Error(proofError.message);
  await each(
    "Payment screenshots",
    proofs.filter((p) => !p.screenshot_path!.startsWith(`${FOLDERS.proof}/`)),
    (p) => `Screenshot ${p.id} (order ${p.order_id})`,
    async (p) => {
      const publicId = `${FOLDERS.proof}/${p.order_id}-${createHash("sha1").update(p.screenshot_path!).digest("hex").slice(0, 16)}`;
      // The bucket is private: a short-lived link lets Cloudinary fetch the file.
      const { data: link, error } = await supabase.storage.from("payment-proofs").createSignedUrl(p.screenshot_path!, 3600);
      if (error || !link) throw new Error(`the Supabase file is not reachable (${error?.message ?? "no link"})`);
      if (!apply) return { outcome: "would copy", note: `private file -> ${publicId}` };
      const done = await upload(link.signedUrl, publicId, 2600, "authenticated");
      if (!switchOver) return { outcome: "copied", note: `private, ${done.width} x ${done.height} -> ${done.public_id} (not switched yet)` };
      const update = await supabase.from("payment_proofs").update({ screenshot_path: done.public_id }).eq("id", p.id);
      if (update.error) throw new Error(`copied as ${done.public_id}, but the row was not updated: ${update.error.message}`);
      record({ change: "payment_proofs.screenshot_path", id: p.id, from: p.screenshot_path, to: done.public_id });
      return { outcome: "copied", note: `private, ${done.width} x ${done.height} -> ${done.public_id}` };
    },
  );

  // 6. The story photo -----------------------------------------------------------------------------
  const storyFile = "public/story/glance-story.jpg";
  await each(
    "Story photo",
    existsSync(storyFile) ? [storyFile] : [],
    (f) => f,
    async (f) => {
      const publicId = `${FOLDERS.site}/glance-story`;
      if (!apply) return { outcome: "would copy", note: `${mb(readFileSync(f).length)} -> ${publicId}` };
      const done = await upload(readFileSync(f), publicId, 2000);
      return { outcome: "copied", note: `${done.width} x ${done.height}, ${mb(done.bytes)} -> ${done.public_id}` };
    },
  );

  // Summary ----------------------------------------------------------------------------------------
  console.log(
    `\n${apply ? "Copied" : "Would copy"} ${apply ? totals.copied : totals.wouldCopy}` +
      `${switchOver ? `, pointed ${totals.repointed} rows at Cloudinary` : ""}, skipped ${totals.skipped}, failed ${totals.failed}.`,
  );
  if (failures.length) {
    console.error(`\n${failures.length} failure${failures.length === 1 ? "" : "s"}:\n- ${failures.join("\n- ")}`);
    console.error("Run the command again to retry only what failed.");
  }
  if (!apply) console.log("Nothing was changed. Run again with -- --apply to copy the images.");
  else if (!switchOver) console.log("The images are copied. Pages are unchanged until step 2: deploy the new site, then run again with -- --apply --switch.");
  console.log(`Log: ${logFile}`);
  if (failures.length) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
