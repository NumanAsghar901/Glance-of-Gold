-- Product photos move from Supabase Storage to Cloudinary. The Cloudinary public_id is what the store renders
-- from; `url` keeps the original address (for photos copied across, the Supabase file, which stays untouched).
-- Photos without a public_id keep working from `url` until `npm run migrate-images-to-cloudinary` has copied them.
alter table public.product_images
  add column if not exists cloudinary_public_id text check (cloudinary_public_id is null or length(cloudinary_public_id) between 1 and 200);

-- One Cloudinary asset belongs to one photo row; also makes the copy script safe to run twice.
create unique index if not exists product_images_cloudinary_public_id_idx
  on public.product_images (cloudinary_public_id) where cloudinary_public_id is not null;
