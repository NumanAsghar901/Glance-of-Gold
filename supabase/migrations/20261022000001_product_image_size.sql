-- The real pixel size of each product photo, so the store can draw every card and gallery in the shape of its
-- own photo (no cropping and no empty bands around it). Filled in when a photo is uploaded; photos uploaded
-- earlier are filled in once by `npm run backfill-image-sizes`. Both columns are optional: a photo without a
-- size is drawn in a standard portrait frame.
alter table public.product_images
  add column if not exists width int check (width is null or width > 0),
  add column if not exists height int check (height is null or height > 0);
