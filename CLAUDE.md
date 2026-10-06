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

Product card with second-image crossfade on hover, heart (wishlist) and eye (quick view) top-right, and a full-width Add to bag bar that slides up on hover (always visible on touch); one shared quick-view dialog; animated cart drawer; wishlist heart toggle; image gallery with swipe and zoom; sticky add-to-cart bar on mobile; filter drawer; skeleton loading in `sand`; toast confirmations; animated order-progress steps; marquee-free, calm hero.

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
- **Responsive rule:** the page must never be wider than the screen. `html, body { overflow-x: clip }` is only a safety net; fix overflow at its source. Grid/flex children that hold forms or pickers need `min-w-0` (fieldsets especially, they do not shrink by default). The header must fit 320-430px: wordmark shrinks below 430px, search icon hidden below 380px. Verified on 19 storefront pages and 14 admin pages at 320-1280px, plus menu, bag drawer and quick view open.
