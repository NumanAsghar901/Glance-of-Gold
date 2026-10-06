# Glance of Gold

@AGENTS.md

E-commerce site for **Glance of Gold**, a Pakistani jewellery brand.

**Stack:** Next.js 16 (App Router, TypeScript), Tailwind CSS v4, Framer Motion, Supabase, Nodemailer. shadcn/ui is configured but its generated components use a neutral theme with dark variants, so restyle or rewrite them to the tokens below before use.

**Next.js 16 note:** APIs differ from older versions. Read the matching guide in `node_modules/next/dist/docs/` before using one. Known changes: `middleware.ts` is now `proxy.ts`; caching has a new Cache Components model (`use cache`, `cacheLife`) alongside the previous model. Decide which one to use before building data fetching, then follow it everywhere.

## Design principles

Light, elegant, modern, professional. **Never dark mode.** No `dark:` variants, no `prefers-color-scheme: dark`; set `color-scheme: light` on `:root`.

- Generous whitespace, large photography, thin gold hairlines (1px), subtle motion only.
- Never use: purple gradients, generic AI-looking layouts (centered hero + three identical feature cards), emoji as icons.
- Signature motif: the **arch** (a mehrab niche) with an offset gold hairline arch behind it, via `ArchFrame` in `components/ui/arch.tsx`. Used for the home story and the About page only, so it stays recognisable. The home hero is now a full-bleed banner carousel (below), not an arch. Do not scatter the arch.
- Typography rules: sentence case for buttons, nav, labels and badges. No tracked all-caps labels (the logo wordmark is the only exception), no eyebrow label above every heading, no arrow appended to buttons, no `a · b · c` meta strings (use commas or separate elements). Section headings are a title plus a full-width hairline (`SectionHeading`).
- Icons: `lucide-react` with a thin stroke (1.25-1.5), or custom SVG.
- Corners: small radius (2-4px) on buttons and cards, so it reads as refined jewellery rather than a SaaS dashboard.
- Copy tone: warm, understated, confident. No exclamation marks, no hype.

### Colour tokens

Define once as CSS variables in `globals.css`, map into the Tailwind theme, and never hard-code hex values in components.

| Token | Hex | Use |
|---|---|---|
| `background` | `#FBF8F3` | Page background |
| `surface` | `#FFFFFF` | Cards, inputs, modals |
| `sand` | `#F3ECE1` | Alternate sections, skeletons, subtle fills |
| `text` | `#2A2622` | Body and headings |
| `muted` | `#7A7066` | Secondary text, captions, placeholders |
| `gold` | `#B8935A` | Accent, hairlines, primary buttons |
| `gold-hover` | `#8F6E3B` | Hover/active state of gold |
| `blush` | `#EBD9D0` | Soft highlights, badges, sale/new tags |

Tailwind classes: `bg-background`, `bg-surface`, `bg-sand`, `text-foreground` (the `text` token), `text-muted-foreground`, `bg-gold`, `bg-gold-hover`, `bg-blush`, `border-border` (gold hairline). Fonts: `font-sans`, `font-heading`.

Contrast: `muted` on `background` and white text on `gold` fall below WCAG AA for small text. Use `text` for anything under 18px that carries meaning. Gold buttons use `text` labels on `gold`; on hover they switch to `gold-hover` with white labels.

### Typography

- Headings: **Cormorant Garamond** (500/600). Large, tight tracking, generous line height.
- Body/UI: **Inter** (400/500).
- Load both with `next/font/google` (self-hosted, `display: swap`, subset `latin`). No `<link>` to Google Fonts.
- Fluid type scale with `clamp()`; never fixed px headings that break at 320px.

## Responsiveness

Fully responsive across all devices. Mobile-first.

- Design and test at 320, 375, 414, 768, 1024, 1280, 1536 widths.
- No horizontal scroll at any width. Touch targets >= 44x44px.
- Most Pakistani traffic is mid/low-end Android on mobile data. Treat that as the primary target, desktop second.
- Use `dvh` not `vh` for full-height sections. Respect safe-area insets on sticky bars.
- Mobile: bottom-reachable primary actions (sticky add-to-cart, sticky checkout button).

## Motion and interactivity

The site should feel highly interactive and polished while every animation stays **subtle and fast**.

- Durations 150-350ms. Ease: `[0.22, 1, 0.36, 1]` (ease-out). Springs only for tiny UI (cart badge, toggles).
- Animate only `transform` and `opacity`. Never animate `width`, `height`, `top`, `left`, `box-shadow` blur, or `filter` on large areas.
- Respect `prefers-reduced-motion`: wrap with Framer Motion `MotionConfig reducedMotion="user"` and disable parallax/stagger.
- Use `LazyMotion` + `m` components with `domAnimation` to keep the bundle small. No `layout` animations on long lists.
- Scroll reveals: `whileInView` with `once: true`, small translate (12-16px) + fade. No scroll-jacking, no heavy parallax.
- Low-end phones: no autoplay video above the fold, no per-frame JS animation, no blur/backdrop-filter on scrolling surfaces, cap simultaneous animated elements.
- Page transitions: quick fade only.

### Buttons

Elegant, restrained hover states. Every interactive element has distinct `hover`, `focus-visible`, `active`, and `disabled` states.

- **Primary:** gold fill; on hover darkens to `gold-hover` with a 1-2px lift (`translateY(-1px)`), arrow icon nudges 2-3px right. Active presses back down.
- **Secondary/outline:** 1px gold border, transparent fill; on hover a gold fill sweeps in left-to-right via `scaleX` on a pseudo-element, text colour flips.
- **Text links:** thin gold underline that draws in from the left (`scaleX` origin-left).
- **Icon buttons:** soft `sand` circle fades in on hover.
- Use `@media (hover: hover)` for hover effects so touch devices do not get stuck hover states; give touch a quick `active` scale (0.98).
- Focus ring: 2px gold with 2px offset. Never remove outlines without a replacement.

### Motion in practice

- Home hero: `HeroBanner` (client) crossfades slides (opacity only), drifts the photo (transform only), autoplays every 6.5s and pauses on hover/focus/hidden tab/reduced motion; swipe, arrows and progress lines to control it. Slides come from Admin > Home banners (wide + optional tall phone photo); until any exist, `src/lib/hero-defaults.ts` supplies three built-in slides using generated artwork in `public/banners/`. About hero enters with CSS keyframes; the story arch is unveiled once by `RevealCover` (Framer Motion, lazy-loaded, transform only).
- Scroll: `.reveal` elements are animated by `ScrollReveal` (Web Animations API: slide up 28px + fade, 440ms, 55ms stagger, never edits attributes so hydration stays clean; above-the-fold stays visible; keep it off LCP images). `SmoothScroll` (Lenis) runs only on desktop mouse/trackpad, never for reduced motion, and ignores dialogs and `[data-lenis-prevent]`.
- Everything else answers an action: hover image swap, quick add, drawer slide, gift picker, button hover states. No fade-up on every section.
- Framer Motion is used sparingly on purpose (low-end phones). Prefer CSS; reach for it only for state-driven or scroll-triggered effects.

### Interactive patterns to use (keep light)

Product card with second-image crossfade on hover, heart (wishlist) and eye (quick view) top-right, and a full-width Add to cart bar that slides up on hover (always visible on touch); one shared quick-view dialog; animated cart drawer; wishlist heart toggle; image gallery with swipe and zoom; sticky add-to-cart bar on mobile; filter drawer; skeleton loading in `sand`; toast confirmations; animated order-progress steps; marquee-free, calm hero.

## Performance

"Fast fetching" is a requirement, not a nice-to-have.

- Server Components by default; `"use client"` only for interactive leaves.
- Data fetching on the server with Supabase. Product listing and detail pages are cached and revalidated on demand when admin changes data (follow the caching model chosen per the Next.js 16 note above).
- Use `Suspense` boundaries with skeletons, `loading.tsx` per route, and `next/link` prefetch.
- Paginate or infinite-scroll product lists (12-24 per page). Select only needed columns. Index every column used in filters/sorts.
- Budget: LCP < 2.5s on 4G mid-range Android, CLS < 0.1, INP < 200ms, JS < 170KB gzipped on first load per route. Check with `next build` output and Lighthouse mobile.
- Lazy-load below-the-fold components with `next/dynamic`. Do not import whole icon/animation libraries.

## Images

Photography carries this brand, so optimise without making it look cheap.

- Always `next/image` with correct `sizes`, `fill` + aspect-ratio container (no layout shift), `priority` only on the single LCP image.
- AVIF/WebP via Next. Source uploads <= 2000px long edge, quality ~75-80.
- `placeholder="blur"` with a tiny blurDataURL (generate on upload) or a `sand` background.
- Supabase Storage for product images; configure `images.remotePatterns` for the project host only.
- Every image has meaningful `alt` text (product name + material/colour). Decorative images use `alt=""`.

## Accessibility

Target WCAG 2.1 AA.

- Semantic HTML (`header`, `nav`, `main`, `section`, `footer`, one `h1` per page). Use shadcn/Radix primitives for dialogs, drawers, menus, and selects so focus trapping and ARIA come for free.
- Full keyboard operation; visible focus; skip-to-content link.
- Form fields have visible labels, inline error messages tied via `aria-describedby`, `autocomplete` attributes.
- Colour is never the only signal. Meet contrast ratios (see colour note).
- Announce cart updates and toasts with `aria-live="polite"`.
- Respect `prefers-reduced-motion`.

## Business rules

Full plan and schema: see [PLAN.md](PLAN.md).

- Contact: helpline 03166568142, Glanceofgold@gmail.com. Courier: Leopards.
- Shipping: flat Rs. 100 everywhere, free at Rs. 2,000+ subtotal (before coupon). Read from the `settings` table, never hard-coded.
- Guest checkout only; customers track orders by order number + phone. Only admins have accounts.
- Stock is reserved when the order is placed and released on cancellation. Unverified transfer orders are cancelled manually by admin.
- Marketing: admin-generated coupons, rotating announcement strip, "buy 2, choose 1 free gift" offer (admin picks the gift pool), Meta Pixel + Conversions API.
- Not in v1: reviews, size guide, Instagram section, customer accounts, Urdu/RTL.
- Admin credentials live in `.env.local` only and are created by a script. Never write them into the repo, seeds or docs.
- Dummy products are placeholders until the owner adds real ones via admin. Mark them clearly as sample data.

## Checkout and orders

Payment is manual. **No payment gateway integration** in v1.

1. **Cash on Delivery (COD)** - the default and first option shown.
2. **Manual transfer** - JazzCash, Easypaisa, Bank Transfer. Customer sees the account details (from settings table, not hard-coded), transfers, then submits a transaction ID and optionally a payment screenshot. Order status stays `pending_payment` until an admin verifies it.

Flow:
- Guest checkout allowed. Cart persists (localStorage for guests, DB for logged-in users).
- Pakistan-specific address fields: full name, phone (03XX-XXXXXXX, validate `^(\+92|0)3\d{9}$`), province, city, full address, optional landmark, optional email.
- Prices in PKR, formatted `Rs. 12,500` (no decimals). Shipping from the settings/zone table. Server recalculates all totals; never trust client prices.
- Order creation happens in a server action / route handler using the service role, validated with Zod. Idempotent (guard against double submit).
- **WhatsApp order confirmation:** after placing an order, show a confirmation page with a "Confirm on WhatsApp" button that opens `https://wa.me/<number>?text=<encoded order summary>`. Business number comes from env/settings. Also store a `whatsapp_confirmed` flag/timestamp when an admin marks it.
- **Email (Nodemailer):** send an order confirmation email to the customer (if email given) and a new-order notification to the shop owner. SMTP via env vars, HTML template in brand colours (inline styles, table layout, no external CSS). Send asynchronously so email failure never blocks or fails the order; log failures and retry/flag in DB.

## Supabase

- Use `@supabase/ssr` for server/client clients. Anon key in browser, **service role only on the server**, never exposed.
- RLS enabled on every table. Public read for active catalogue data; orders are written server-side only; customers read only their own rows.
- All schema changes are SQL migrations in `supabase/migrations/`, never ad-hoc dashboard edits. Regenerate types into `src/types/database.ts` after each migration.
- Secrets live in `.env.local` (gitignored). Maintain `.env.example` with every variable name and no values.

## Code conventions

- TypeScript `strict`. No `any` without a comment explaining why.
- Validate all external input (forms, route handlers, webhooks) with Zod.
- Folder layout: `src/app` (routes), `src/components/ui` (shadcn), `src/components` (feature components), `src/lib` (supabase, email, utils, validators), `src/types`.
- Tailwind utility classes with design tokens; no inline hex values, no arbitrary colours.
- Small focused components; keep client components as leaves.
- Match existing patterns before introducing new ones.

## Workflow rules

- **Commit after each working feature**, small and focused, imperative messages (`Add product card with hover image swap`). Do not commit broken builds. Never commit `.env*` files.
- Before calling a feature done: `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass; the feature is checked at 375px and 1280px widths.
- Plan before code for any new area; confirm assumptions with the owner rather than guessing (especially business details: prices, shipping, policies, bank account info).
- Do not invent product data, testimonials, reviews, or policy text and present it as real. Use clearly marked placeholders.

## Architecture notes and lessons

- **Layout:** route groups. `src/app/(store)` has the storefront chrome (announcement bar, header, footer, cart drawer, Meta Pixel). `src/app/admin` has its own layout; `admin/login` is outside the `(panel)` group.
- **Caching (previous model, no Cache Components):** all public reads live in `src/lib/data/*` wrapped in `unstable_cache` with tags `catalog`, `settings`, `marketing`. Admin server actions call `updateTag(...)` so edits show immediately. Product pages are pre-rendered with `generateStaticParams` (resilient: returns `[]` if the DB is unreachable at build).
- **Supabase clients:** `createPublicClient` (anon, no cookies, cacheable), `createSessionClient` (admin session), `createServiceClient` (service role, server only). Admin pages and actions start with `requireAdmin()` (cached per request, verifies via `getClaims`). `src/proxy.ts` is only a first gate.
- **Orders:** created only by the `create_order` RPC via the service client in `placeOrder`. Emails and the Meta CAPI event run in `after()`; request cookies and headers are captured before it.
- **New tables:** Supabase does not auto-grant privileges. Every migration that adds a table must grant to `authenticated` (admins) and, if public, `anon`, explicitly. `service_role` gets access through default privileges (migration 6).
- **React 19 resets uncontrolled form fields after every server action.** For forms that can fail validation: echo submitted values back and use them as `defaultValue`; keep `<select>` controlled (or `key` it); never keep per-attempt state in a hidden input (checkout builds `submissionId` inside the form action).
- **Page files may only export Next's reserved names** (`default`, `metadata`, `generateStaticParams`, ...). Share helpers from `components/` or `lib/`.
- **`Date.now()` in a server component trips the purity lint:** use `currentTime()` from `lib/utils`.
- **Shell quoting:** very long bash heredocs with mixed quotes can fail to parse. Write files with the file tools instead.
- **Rate limiter** (`lib/rate-limit.ts`) is in memory per instance. Restart the dev server to clear it while testing.
- Admin dates are entered and shown in Pakistan time (`lib/datetime.ts`). Admin links use `prefetch={false}`.
- Placeholder artwork is generated, not photographed: `public/placeholders/*.svg`. Replace through the admin panel; delete sample products with one click on the Products page.
- Owner-supplied policy text (Returns, Terms, Privacy) is rebranded; the Privacy page also mentions Meta advertising tools because the pixel is used.

## Added in the second build pass
- **Header:** logo left, main menu centre, search / wishlist / bag / three-line menu right. `SiteMenu` is the slide-over with search, categories (from the DB) and help links; there is no separate mobile nav.
- **Wishlist:** `lib/wishlist-store.ts` (localStorage slugs), heart on cards, quick view and product page, `/wishlist` page fetches fresh data via `actions/catalog.ts`.
- **Quick view:** `lib/quick-view-store.ts` + one `QuickViewDialog` mounted in the store layout.
- **Contact form:** `/contact` emails the owner (`sendContactMessage`), honeypot + rate limit, no database table needed.
- **Image storage sync rule:** every admin path that replaces, removes or deletes an image must also delete the stored file, using `lib/admin/storage.ts` (`removeStoredImages`, `uploadPublicImage`). Covered: product photo delete, product delete, category photo replace/remove/delete, banner (wide and tall) replace/remove/delete. Verified by counting real objects in the `product-images` bucket. Keep this true for any new image field.
- **Supabase project was migrated** to a new account by running `supabase/setup.sql` (all migrations combined). Keep `setup.sql` in sync with `supabase/migrations/` when adding migrations.
- Windows `.next/cache` can go stale and break `next build` (font module errors); delete `.next` and rebuild.

- **Never run `npm run build` (or delete `.next`) while `next dev` is running.** It overwrites the dev server's folder and every button silently stops working (links still work). For automated builds use `NEXT_DIST_DIR=.next-prod npm run build` and `NEXT_DIST_DIR=.next-prod npx next start -p 3100`.
- `allowedDevOrigins` in `next.config.ts` lets the dev server be opened by IP or from a phone. On plain http `crypto.randomUUID` does not exist, so client code must use `uuid()` from `lib/utils`.
- Do not mutate React-owned DOM (classes, styles, attributes) from effects that can run before hydration finishes; it causes "tree hydrated but some attributes ... didn't match". Use the Web Animations API or React state instead.

## Third build pass: emails, reviews, sold counts
- **Status emails:** `sendStatusEmail` (lib/email/send-order.ts) + `statusEmail` template. Admin order updates email the customer on confirmed / processing / shipped (with tracking) / delivered / cancelled / returned, unless the "Email the customer" box is unticked; a verified transfer sends "payment received". Logged in `email_log` as `status_*`. Emails use transactional headers and a plain-text part. Inbox placement ultimately depends on sender reputation: for best results use a domain you own with SPF/DKIM/DMARC through a mail provider (`SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM_EMAIL` in `.env.local`; no code change).
- **Reviews and sold counts need `supabase/migrations/20261005000001_reviews_and_sold_counts.sql`** (also appended to `setup.sql`). It adds `reviews`, `products.rating_avg/rating_count/sold_count`, triggers that keep ratings in sync, and replaces `create_order` / `handle_order_status` so orders bump sold counts and cancelling takes them back. A new customer review adds +1 sold; sample reviews do not. Code probes for the columns (`statsAvailable` in lib/data/catalog.ts) and `lib/data/reviews.ts` returns empty on error, so the store works before the migration is applied.
- **Sample reviews are placeholders** (`reviews.is_sample`). Admin > Reviews has Add / Delete sample reviews (lib/sample-reviews.ts: 1-10 per product, about 65% female names, sold count 5-15 for products with none). They must be deleted before launch; never present invented reviews as real.
- **Home marquee:** `ReviewsMarquee` scrolls right to left, pauses on pointer enter / touch / focus, resumes on leave. Hidden when there are no reviews.
- Footer credit: "Developed by Numan Asghar" (centre) links to the developer portfolio.
- Order confirmation page has Continue shopping.
- **Site URLs:** `site.url` (canonical, sitemap) defaults to the live store `https://glance-of-gold.vercel.app`, never localhost. All links inside emails use `site.emailUrl` (`EMAIL_SITE_URL`, same default) so a customer clicking an email always lands on the hosted site, even for orders placed on a local dev copy. When a custom domain is connected, set `NEXT_PUBLIC_SITE_URL` and `EMAIL_SITE_URL` to it.
- Header must fit 320px wide screens: below 360px the search icon is hidden (search lives in the menu) and the wordmark tightens.
- **Shop filters wrap, they never scroll sideways:** category and price chips (`shop-view.tsx`) use `flex-wrap` with `min-h-11` chips. Do not bring back `overflow-x-auto` rows for filters; only the product gallery and the reviews marquee are meant to scroll sideways.
- **Floating WhatsApp button:** `WhatsAppButton` (`components/layout/whatsapp-button.tsx`, mounted in the store layout) sits bottom right as the original WhatsApp logo in brand green (the `whatsapp` / `whatsapp-hover` tokens, the one place a non-gold accent is allowed). It drifts via the `.wa-fab` CSS keyframes (transform and opacity only, off for reduced motion) and opens `wa.me` with `settings.whatsapp`. It lifts above the sticky add-to-bag bar on product pages and is hidden on `/checkout`.
- **Speed (fourth pass):** the Supabase project is in Sydney (`ap-southeast-2`), so `vercel.json` pins the functions to `syd1`. Without it they ran in Washington DC and every database call crossed the ocean, which made admin pages take 1-2s. Keep functions and database in the same region, and count sequential round trips before adding a query. `requireAdmin` remembers the admin role for 60s per instance (RLS still re-checks `is_admin()` in the database). `getClaims` is local (ES256 keys), so only the profile lookup and the page's own queries hit the database. Client code must never import `lib/validators.ts` (it pulls in all of Zod, about 94 KB gzipped); shared constants for the browser live in `lib/pakistan.ts`.
- **Click feedback:** `LinkPending` (`components/ui/link-pending.tsx`, uses `useLinkStatus`) draws a gold line on a tapped link until the next page arrives; put it inside a `relative` `<Link>`. Admin has `(panel)/loading.tsx` and the store has `(store)/loading.tsx` skeletons.
- **Save messages sit under the Save button:** `ActionForm` (`components/admin/action-form.tsx`) renders its "Product saved." or error notice after the submit button of that same form, not above the fields, and scrolls it into view if it lands near the edge. Keep any new admin form on `ActionForm` so every form behaves the same.
- **Admin on phones:** tables use the `stack-table` class and `data-label` on each `<td>` so rows become cards below 768px (never `min-w-[...]` plus a sideways scroller). Lists that can grow are paginated with `Pager` (reviews are 25 per page). `AdminMobileMenu` is the phone menu; it closes itself when the route changes.
- **Reviews:** any length is accepted (1-800 characters). Run `supabase/migrations/20261006000001_reviews_any_length.sql` once in the Supabase SQL editor; until then the database still rejects reviews under 5 characters.
- **Size and design shown separately (ninth pass):** on the product page the pickers are separate blocks in the order colour, size, design, with a hairline between them (`divide-y` in `VariantPicker`; `ALL_DIMS` in `use-variant-selection.ts` sets the order). A variant's name is always built as colour, size, design and labelled (`composeVariantName`: a bare "6" becomes "Size 6", "1" becomes "Design 1"; text that already says size or design is kept), so the cart, orders and emails never show an ambiguous "6, 1". The storefront rebuilds the name from the separate values (so it is right even before the database is updated); `20261006000004_variant_names.sql` rewrites the saved names, which future orders snapshot. `variantLines(name)` splits a name into lines; the cart, checkout summary, order page, admin order page and HTML emails show each part on its own line (plain-text emails and WhatsApp keep one line, "Size 6, Design 1"). The admin form asks what the product comes in (tick Sizes, Designs, Colours): only those boxes appear on each variant and in "Add several at once".
- **Size and design are independent (tenth pass):** a customer may choose only a size, only a design, or both; a kind left out means "any". With both a size and a design to choose from, nothing is preselected, the button says "Select a size or design", and a chosen chip can be tapped again to clear it (`canSkip` in `useVariantSelection`). Unavailable mixes are greyed (`isDisabled`) and choices a new pick makes impossible are dropped (`prune`). One cart line per distinct mix of the chosen values; stock and price come from the matching variant with the most in stock (the "representative"), but the line, the WhatsApp text and the order show only what was chosen (`label`, `parts`; `composeChosenName` in `lib/variant-name.ts`). The cart line carries `parts`; `placeOrder` sends them and `applyChosenNames` (`actions/checkout.ts`) rewrites `order_items.variant_name` from the variant's own values (never from browser text) before the emails go out. The product page says "You chose Size 7", the stock line follows the choice ("for Size 7"), and the mobile bar shows it.
- **Product options (fifth and seventh pass):** needs `20261006000002_product_options.sql` then `20261006000003_variant_design_size.sql` (both also in `setup.sql`). Each `product_variants` row is one buyable thing (a mix of colour, design and size) with its own stock and price. Columns: `color`, `design`, `size` on variants (all optional) and `products.allow_multiple` (customer may pick several designs or sizes at once, each with its own quantity; the price is the total). `products.option_label` is no longer used. A variant's `name` always holds the full label ("Gold, Design A, Size 6"), built by `composeVariantName` in `lib/variant-name.ts`, so the cart, orders, emails and the admin order page show it with no other change. Colour, design and size are separate pickers on the product page, each shown only when it has more than one value; one value is shown as plain text. The picker is `useVariantSelection` + `VariantPicker` (product page via `PurchaseProvider`/`LivePrice`, and the quick view). With several allowed, designs and sizes multiply into lines (Design A x Size 6, ...), colour stays one choice. Catalog queries probe for the columns (`columnAvailable` in `lib/data/catalog.ts`) and products saved before the design/size migration are sorted into design or size in code (`legacyAttributes`, same rules as the SQL), so the store works before and after. The admin form has Colour, Design and Size boxes per variant plus "Add several at once" (makes every mix); before the migration it falls back to one name box and shows a notice.
- **Photo sharpness (eighth pass):** blur comes from photos smaller than the place they are shown, which the browser stretches (measured: the 495 x 619 phone banner was stretched 3.3x on a 3x phone; a 1493 x 2000 photo was never stretched). Code cannot add detail, so the rules live in `lib/image-specs.ts` (`IMAGE_SPECS`: recommended and minimum pixels per slot: product, category, banner-wide 2400 x 1200, banner-tall 1080 x 1920) and are enforced twice: in the browser by `PhotoInput` (`components/admin/photo-input.tsx`: shows the size verdict at once, shrinks huge originals to a compact JPEG, blocks too-small ones with `setCustomValidity`, and caps a form's photos at about 4 MB together because the live site accepts about 4.5 MB per request) and on the server by `imageProblem` / `uploadPublicImage` in `lib/admin/storage.ts` (sharp: refuses below the minimum, reduces above `maxEdge`; EXIF rotation is respected). `ImageSizeNote` flags photos already uploaded. Use `PhotoInput` for every new admin photo field and pass its slot. Large images (hero, gallery, quick view, story, about) use `quality={85}`; thumbnails and cards stay at 60 or 75 (`images.qualities` in `next.config.ts`).
- **Story photo:** `public/story/glance-story.jpg` (resized to 2000px, from the owner's photograph) fills the arch in the home story and the About hero, replacing the generated placeholders.
- **Quantities per size:** when a product allows several, each chosen size or design gets its own quantity (+ and −, capped at stock and `MAX_QTY_PER_LINE`; − at 1 removes it, like the bag), and the price is the total of every line. Everything that describes an order reads through `lib/order-text.ts` (`quantityLine`, `orderBreakdownLines`, `confirmOrderMessage`, `messageToCustomer`): each line says "3 x Rs. 1,450 = Rs. 4,350", with the piece count and the subtotal, discount, delivery and total. Use it for any new WhatsApp text or plain-text email so they never drift apart. The HTML emails, bag, checkout summary, order page and admin order page show "Qty 3, Rs. 1,450 each" and "Subtotal (5 pieces)".
- **Product page info (sixth pass):** under the free-delivery line there is a live stock line (`StockLeft`: "Only 28 items left in stock", worked out from the size or colour picked, or the whole product, exact count up to `SHOW_STOCK_COUNT_UP_TO` = 50 then "In stock") and a delivery pill (`DeliveryEstimate`: "Delivery in 3 to 5 days, get by Oct 9 – Oct 11"). The days come from Settings (`delivery_days_min` / `delivery_days_max`, defaults 3 and 5, edited in Admin > Settings; no migration, settings are key/value rows). Product pages are cached, so the dates are computed in the browser in Pakistan time and the server HTML has no dates. The description no longer sits under the price: it is the first dropdown, "Product information" (open by default, also lists finish, category, colours and sizes), followed by Delivery, Payment and Returns. Copy stays free of "Hurry up!" style hype and exclamation marks. `--success` is the green token for the delivery dot.
- **Settings cache key is versioned** (`["settings-v3"]` in `lib/data/site.ts`), same reason as the catalog keys.
- **Stock tags:** `LOW_STOCK_THRESHOLD` (10) in `lib/stock.ts`. `StockTag` shows "Low stock" at 10 or fewer pieces across all variants and "Out of stock" at 0, on cards, the product page and the quick view. The selected variant also says "Only N left in stock".
- **Cache keys are versioned** (`["products-v2"]` etc. in `lib/data/catalog.ts`). The data cache survives deployments, so bump the suffix whenever the shape of a cached product changes, or new code receives old-shaped objects.
- **Card icons:** the heart and eye on product cards are 32px on phones with a larger invisible tap area (`compactBtn` in `card-actions.tsx`), 40px from `sm` up.
- **Responsive rule:** the page must never be wider than the screen. `html, body { overflow-x: clip }` is only a safety net; fix overflow at its source. Grid/flex children that hold forms or pickers need `min-w-0` (fieldsets especially, they do not shrink by default). The header must fit 320-430px: wordmark shrinks below 430px, search icon hidden below 380px. Verified on 19 storefront pages and 14 admin pages at 320-1280px, plus menu, bag drawer and quick view open.
