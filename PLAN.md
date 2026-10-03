# Glance of Gold - Build Plan

Status: approved by owner on 2026-10-03. Update this file when decisions change.

## Decisions

| Area | Decision |
|---|---|
| Hosting | Vercel (domain added later) |
| Backend | Supabase project `gold of glance` (`krxgnyiqytkvbjemfxhj`, ap-southeast-1) |
| Language / currency | English only, PKR only, Pakistan-only shipping |
| Customers | Guest checkout only; order tracking via order number + phone |
| Admin | Custom `/admin` inside the site, Supabase Auth email + password |
| Catalogue | 50-300 products, variants with per-variant stock |
| Payments | COD first; manual JazzCash / Easypaisa / Bank Transfer with proof upload. No gateway. |
| Shipping | Flat Rs. 100 everywhere, free when subtotal >= Rs. 2,000 (before coupon). Courier: Leopards. Values live in `settings`. |
| Stock | Reserved at order time, released when an order is cancelled. Unverified transfer orders are cancelled manually by admin. |
| Marketing | Admin-generated coupons, floating announcement strip, "buy 2, choose 1 free gift" offer, Meta Pixel + Conversions API |
| Email | Nodemailer over Gmail SMTP with an app password |
| Contact | Helpline 03166568142, Glanceofgold@gmail.com |
| Not in v1 | Reviews, size guide, Instagram section, accounts/wishlist, gift wrap, Urdu |

## Pages

### Storefront
| Route | Notes |
|---|---|
| `/` | Announcement strip, hero, category tiles, new arrivals, bestsellers, brand story, free-delivery/gift offer band |
| `/shop`, `/collections/[slug]` | Filters (category, price, material), sort, paginated grid, filter drawer on mobile |
| `/product/[slug]` | Gallery (swipe/zoom), variants, stock state, sticky add-to-cart on mobile, WhatsApp enquiry, related items |
| `/search` | Postgres full-text search |
| `/cart` + cart drawer | Coupon field, free-delivery progress bar, free-gift picker when the offer threshold is met |
| `/checkout` | Single page: contact + address, payment method, order summary |
| `/order/[orderNumber]/confirmed` | Summary, WhatsApp confirm button, transfer instructions + proof upload |
| `/track` | Order number + phone lookup |
| `/about`, `/contact`, `/faq`, `/care-guide` | Static |
| `/returns-exchange`, `/terms`, `/privacy` | Owner-supplied text, rebranded (see Policy copy) |

### Admin (`/admin`, role-checked)
Dashboard, orders (status, payment verification, courier tracking number, WhatsApp-confirmed flag), products + variants + images, categories, coupons, gift offers, announcements, banners, payment accounts, settings.

## Supabase schema

All money is `integer` PKR (whole rupees). All tables have RLS on. Admin check via `public.is_admin()` (security definer, reads `profiles`).

**Enums:** `order_status` (pending, confirmed, processing, shipped, delivered, cancelled, returned), `payment_method` (cod, jazzcash, easypaisa, bank_transfer), `payment_status` (unpaid, awaiting_verification, paid, failed, refunded), `discount_type` (percent, fixed).

**Catalogue**
- `categories` (id, slug unique, name, description, image_url, sort, is_active)
- `products` (id, slug unique, name, description, category_id, price, compare_at_price, material, tags text[], is_active, is_featured, is_gift_eligible, search tsvector (generated, GIN), created_at)
- `product_images` (id, product_id, url, alt, sort, blur_data_url)
- `product_variants` (id, product_id, sku unique, name, price_override, stock >= 0, is_active). Every product has at least one variant; stock lives here.

**Commerce**
- `orders` (id, order_number unique from sequence e.g. `GG-10001`, customer_name, phone, email, province, city, address, landmark, notes, subtotal, discount, shipping_fee, total, coupon_code, payment_method, payment_status, order_status, courier, tracking_number, whatsapp_confirmed_at, cancel_reason, stock_released, meta_event_id, created_at)
- `order_items` (id, order_id, product_id, variant_id, name, variant_name, image_url, unit_price, qty, is_gift) - snapshot of what was sold; gifts are Rs. 0 lines
- `order_events` (order_id, status, note, created_at) - history shown on `/track`
- `payment_accounts` (id, method, account_title, account_number, iban, bank_name, instructions, is_active)
- `payment_proofs` (id, order_id, transaction_id, screenshot_path, verified_by, verified_at)
- `email_log` (id, order_id, kind, to_email, status, error, attempts, created_at)

**Marketing**
- `coupons` (id, code unique case-insensitive, discount_type, value, min_subtotal, max_discount, usage_limit, used_count, free_shipping, starts_at, expires_at, is_active)
- `coupon_redemptions` (coupon_id, order_id, phone)
- `gift_offers` (id, name, min_items default 2, is_active, starts_at, ends_at)
- `gift_offer_products` (offer_id, product_id, variant_id, sort) - the pool the customer picks one free item from
- `announcements` (id, message, link_url, coupon_code, sort, is_active, starts_at, ends_at) - floating strip, rotating
- `banners` (id, image_url, mobile_image_url, heading, subheading, cta_label, cta_url, sort, is_active)

**System**
- `profiles` (id references auth.users, full_name, role: `admin`)
- `settings` (key, value jsonb): shipping_flat, free_shipping_threshold, whatsapp_number, helpline, contact_email, courier

**Functions**
- `create_order(payload jsonb)` - security definer, executable by service role only. In one transaction: re-prices every line from the DB, checks stock and decrements it, validates the coupon and gift offer, computes shipping, inserts order + items + event. Prices are never taken from the client.
- `cancel_order(order_id, reason)` - restores stock once, writes an event.
- `search_products(q)` - ranked full-text search.

**Policies and storage**
- Public `select` on active categories, products, images, variants, banners, announcements, coupons not exposed (validated server-side only).
- `orders`, `order_items`, `payment_*`, `email_log`: no public access. Writes go through server actions with the service role. `/track` lookup is server-side and rate-limited.
- Admins: full access via `is_admin()`.
- Storage: `product-images` (public read, admin write), `payment-proofs` (private, signed URLs, admin read, server-side upload).

## Meta Pixel + Conversions API
- Pixel loads with `next/script` `lazyOnload` so it never blocks low-end phones.
- Events: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase. Browser and server events share `event_id` (`orders.meta_event_id`) for deduplication.
- Purchase is also sent server-side from order creation. Phone/email are SHA-256 hashed before sending.
- Needs `NEXT_PUBLIC_META_PIXEL_ID` and `META_CAPI_TOKEN` (owner supplies later).

## Policy copy
Owner supplied text from another store. Rules for adapting it:
- Replace store name, email and phone with Glance of Gold's (helpline 03166568142, Glanceofgold@gmail.com). Replace every stray reference to the other store, including the "Nafees Jewellery" mention in Terms section 3.
- Terms section 4 and Privacy "Payment Method" say COD only. Rewrite to match the site: COD plus manual JazzCash / Easypaisa / Bank Transfer.
- Keep the owner's wording otherwise. Suggest a legal read before launch.

## Secrets (never committed)
`.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SMTP_USER`, `SMTP_APP_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `META_CAPI_TOKEN`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_WHATSAPP_NUMBER`.
The admin account is created by `scripts/create-admin.ts` from env values, never hard-coded in the repo.

## Build order (commit after each)
1. Scaffold: Next.js, Tailwind tokens, fonts, shadcn, layout, header/footer, logo, announcement strip shell
2. Supabase migrations, RLS, storage buckets, seed dummy products, generated types, admin creation script
3. Home, shop, product detail, search
4. Cart drawer, coupons, free-delivery bar, free-gift picker
5. Checkout, `create_order`, order confirmation page, WhatsApp button, Nodemailer emails
6. Payment proof upload, `/track`, static and policy pages
7. Admin: orders and payment verification first, then products, coupons, gift offers, announcements, banners
8. Meta Pixel + CAPI, SEO (metadata, sitemap, JSON-LD)
9. Performance and accessibility pass, deploy to Vercel
