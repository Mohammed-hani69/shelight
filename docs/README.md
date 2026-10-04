# SHE LIGHT — Project Documentation

Premium Egyptian dermocosmetics brand. Monorepo: **Next.js 16 frontend** (TypeScript + Tailwind v4, storefront + admin console) + **Flask 3 backend** (REST API). UI is Arabic-first (RTL); backend returns camelCase JSON.

---

## 1. Monorepo layout

```
shelite/
├─ frontend/          # Next.js 16 App Router (TypeScript, Tailwind v4)
│  └─ src/
│     ├─ app/
│     │  ├─ (storefront)/   # home, shop, categories/[slug], products/[slug], bundles,
│     │  │                  #   cart, wishlist, checkout, account/*, login, register
│     │  ├─ (marketing)/    # about, contact, journal (blog)
│     │  └─ admin/          # login (public) + (dashboard) group guarded by AdminGuard:
│     │                     #   overview, products (+ new, [id]/edit), categories,
│     │                     #   bundles, journal, orders, coupons, customers, analytics
│     ├─ components/     # navigation/, marketing/, product/, cart/, common/, ui/
│     ├─ features/       # account/, admin/, auth/, cart/, checkout/, orders/, products/, reviews/, bundles/, journal/, coupons/, tracking/
│     ├─ store/          # Zustand: auth (shelight-auth), admin (shelight-admin), cart, wishlist, ui
│     ├─ lib/            # api client, endpoints, backend-mappers, errors, utils, i18n
│     └─ types/          # product, cart, order, review, auth, admin, ...
├─ backend/           # Flask app (see backend/README.md)
│  └─ app/
│     ├─ modules/        # auth, customers, products, reviews, cart, wishlist,
│     │                  #   orders, coupons, bundles, journal, tracking, analytics, admin
│     │                  #   (routes + services + schemas)
│     ├─ core/           # security, pagination, errors, response, i18n, queries, validation
│     ├─ models.py       # SQLAlchemy models
│     ├─ seeds.py        # sample data + admin/demo accounts
│     ├─ migrations/     # Alembic (head: a1b2c3d4e5f6)
│     └─ tests/          # pytest suite (127 tests)
├─ docs/              # this documentation
├─ package.json       # npm workspaces (frontend) + root scripts
└─ README.md          # root quickstart
```

---

## 2. How to run

### Frontend

```bash
cd frontend
copy .env.example .env.local      # Windows · API URL + USE_REMOTE_API + TRACKING_ENABLED
npm run dev                       # http://localhost:3000
```

### Backend

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
flask --app run.py db upgrade
flask --app run.py seed
python run.py                     # http://127.0.0.1:5000/api/v1
```

> SQLite by default (`DATABASE_URL=sqlite:///dev.db`). Override for PostgreSQL/MySQL in production.

### Demo accounts (seeded)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@shelight.com` | `admin12345` |
| Customer | `demo@shelight.com` | `password123` |

---

## 3. Frontend ↔ Backend integration

All domain calls go through `lib/api/client.ts` (single base URL, JSON envelope, JWT header, error normalization). Endpoint paths are centralized in `lib/api/endpoints.ts`. Response normalization lives in `lib/api/backend-mappers.ts`.

| Env var | Default | Effect |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api/v1` | Flask API base URL |

| Area | Service | Endpoints |
|---|---|---|
| Auth (login/register/me) | `features/auth/services/auth-api.ts` | `/auth/*` |
| Catalog + detail + search | `features/products/services/product-api.ts` | `/products`, `/categories` (supports `?featured=true`) |
| Bundles | `features/bundles/services/bundle-service.ts` | `/bundles` |
| Journal (blog) | `features/journal/services/journal-service.ts` | `/journal` |
| Cart (per-account) | `features/cart/services/cart-api.ts` | `/cart` |
| Wishlist | `store/wishlist-store.ts` | `/wishlist` |
| Checkout + history | `features/orders/services/orders-api.ts` | `/orders/checkout`, `/orders` |
| Reviews | `services/review-service.ts` | `/products/:slug/reviews` |
| Admin console | `features/admin/services/admin-api.ts` | `/admin/*` |

### Graceful degradation
Server-rendered pages (shop, category, product) keep mock fallbacks negotiated in `product-service.ts` / `catalog-service.ts`, so the site renders even if the API is down. Transactional routes require the API.

---

## 4. Auth flow

### Storefront
- `/login` + `/register` under the storefront layout. JWT lives in the Zustand `shelight-auth` persist store and is auto-injected by `lib/api/client.ts`.
- `account/*` routes are wrapped in `AuthGuard` → redirects to `/login`.

### Admin console (`/admin/*`)
- `/admin/login` posts to `POST /admin/login` (backend rejects non-admin accounts with 403).
- Its token lives in a **separate** persist store `shelight-admin` so an admin is never mistaken for a storefront customer.
- `admin/layout.tsx` wraps all pages in `AdminGuard` (redirects to `/admin/login`, clears the token when `is_admin` is false or the token is invalid).
- `AdminShell` renders the sidebar navigation (overview, products, categories, bundles, journal, orders, coupons, customers) + storefront link + logout.

---

## 5. Admin console capabilities

| Page | Reads | Writes |
|---|---|---|
| Overview | `GET /admin/dashboard` | — |
| Products | `GET /admin/products` (search, pagination) | create `POST`, edit `PUT`, soft-hide `DELETE` |
| Categories | `GET /admin/categories` (full tree w/ productsCount) | create `POST`, edit `PUT`, quick toggles `PATCH` (isFeatured/isActive), reorder `POST /admin/categories/<id>/move`, soft-hide `DELETE` |
| Bundles | `GET /admin/bundles` (active + hidden, w/ members) | create `POST`, edit `PUT`, quick toggles `PATCH` (isActive), reorder `POST /admin/bundles/<id>/move`, soft-hide `DELETE` |
| Journal | `GET /admin/journal` (published + hidden) | create `POST`, edit `PUT`, quick toggles `PATCH` (isFeatured/isPublished), soft-hide `DELETE` |
| Orders | `GET /admin/orders` (status filter) | `PATCH /admin/orders/<orderNumber>` — status + paymentStatus |
| Coupons | `GET /admin/coupons` | `POST`, `PATCH` (partial), `DELETE`, toggle active |
| Customers | `GET /admin/customers` (search) | `PATCH` — isActive, loyaltyPoints |
| Analytics | `GET /admin/analytics/overview|funnel|abandoned-carts|visitors`, `GET /admin/analytics/{customers|visitors}/<id>/timeline` | `POST /admin/analytics/run-abandonment` (idempotent) |

**Journey tracking drives the analytics dashboard**: a first-party, config-gated tracker (`TRACKING_ENABLED`, `ABANDONED_CART_THRESHOLD_MINUTES`, `TRACKING_CURRENCY`, `TRACKING_MAX_BATCH`) records `page_view → product_view → add_to_cart → begin_checkout → purchase` and never uses IP. The anonymous visitor id lives in `localStorage` and travels in `X-Anonymous-Id` (or `anonymousId` in the batch body); `POST /tracking/identify` links it to the customer after login/signup and backfills prior events. Cart state is a **projection** separate from the transactional `cart_items` (`ACTIVE/ABANDONED/RECOVERED/CONVERTED/EXPIRED`); abandonment is a threshold-based idempotent job, and `purchase` is recorded server-side only (`event_id = "purchase-<orderNumber>"`) so the funnel never double-counts. The admin `/admin/analytics` page (no chart library — hand-rolled bars) shows overview metrics, the funnel, abandoned carts and per-visitor/customer timelines.

**Category management drives the storefront**: `Category.is_featured` (migration `f5a2e9c7b4d3`) selects which active roots appear in the homepage «الأقسام» grid (`GET /categories?featured=true`, with fallback to all active roots when none are featured). The desktop nav and footer categories column are rendered from `GET /categories` too, so hiding a category removes it site-wide (including from `GET /products?category=`).

**Bundle management drives the storefront**: `POST/PUT /admin/bundles` take the members (`items: [{productSlug, quantity}]`) plus the advertised `price`, and the backend recomputes `compare_at_price` (member-sum) and **syncs a matching fixed coupon** (`_sync_bundle_coupon`) so checkout charges exactly the advertised `price` (verified by pytest + live smoke test). Blank `couponCode` keeps the existing code or auto-generates `BUNDLE-<SLUG>`; blank price discount → the bundle coupon is deactivated. Hiding a bundle (`PATCH`/`DELETE`) removes it from `GET /bundles` and disables its coupon.

**Journal management drives the blog**: `JournalArticle` (migration `e9d2a1f4c8b6`) stores bilingual fields (`title/excerpt/content_*` — content is a JSON list of paragraphs) plus `category`, `author`, `read_time`, `publish_date`, `image_url`, `is_featured` and `is_published`. `GET /journal` returns only published posts (featured first, then newest) with the language negotiated via `?lang=ar|en`; `GET /journal/<slug>` serves the detail page. The admin `POST/PUT /admin/journal[/<id>]` accept camelCase payloads, `PATCH` toggles `isFeatured/isPublished`, and `DELETE` is a soft-hide. The storefront `/journal` and `/journal/<slug>` pages are server-rendered **dynamically** (`export const dynamic = 'force-dynamic'`) so admin edits appear immediately.

Product write payload (camelCase): `slug, sku, name_en, name_ar, short_description_en/ar, description_en/ar, price (string), compare_at_price, stock, tags, category_slug, concerns (slugs), images [{url, alt_en, alt_ar}], benefits, ingredients, howToUse, suitableFor, faqs, variants, isFeatured, isBestseller, isNew, isActive`. The admin product list/detail additionally returns raw `nameEn/nameAr/descriptionEn/Ar/shortDescriptionEn/Ar/sku/isActive/categorySlug/concernSlugs` for the edit form.

---

## 6. Testing

```bash
# Frontend unit tests (Vitest)
cd frontend && npm run test

# Frontend quality gates
npm run typecheck:frontend && npm run lint:frontend && npm run build:frontend   # from repo root

# Backend (pytest — 127 tests)
cd backend && .venv\Scripts\Activate.ps1 && python -m pytest -q
```

---

## 7. Known notes

- The app targets the **live API** (`.env.local` sets `NEXT_PUBLIC_USE_REMOTE_API=true`); mock fallbacks exist only for resilience.
- Admin orders list is un-paginated beyond the default 12/page meta; use the status filter for large order sets.
- Card payment is UI-only; wire the SHE LIGHT payment gateway in `app/(storefront)/checkout/checkout-form.tsx`.
- Product images in `docs/`/seed data are remote CDN URLs; `next/image` is used with `unoptimized` in the admin thumbnails (no remote-pattern lock-in) and configured patterns for `images.unsplash.com` elsewhere.
