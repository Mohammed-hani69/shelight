# SHE LIGHT — Backend

Flask 3 REST API for SHE LIGHT. Arabic UI copy, camelCase JSON over `/api/v1`, JWT auth, SQLAlchemy + Alembic, SQLite (Postgres/MySQL via `DATABASE_URL`).

## Quickstart

```bash
python -m venv .venv
.venv\Scripts\activate              # Windows
pip install -r requirements.txt
copy .env.example .env              # Windows (or: cp .env.example .env)
flask --app run.py db upgrade       # apply all migrations
flask --app run.py seed             # sample data
python run.py                       # http://127.0.0.1:5000/api/v1
```

`run.py` reads `HOST`/`PORT`/`FLASK_DEBUG` from the environment. `FLASK_DEBUG=1` enables the Werkzeug auto-reloader.

## Demo accounts (seeded)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@shelight.com` | `admin12345` |
| Customer | `demo@shelight.com` | `password123` |

## Structure

```
app/
  core/          security, pagination, errors, response envelope, i18n (localized), validation
  modules/       auth, customers, products, reviews, cart, wishlist, orders, coupons, bundles, journal, tracking, analytics, admin
  models.py      SQLAlchemy models (Product, Customer, Order, Coupon, Bundle, JournalArticle, AnonymousVisitor, VisitSession, TrackingEvent, JourneyCart, JourneyCartItem, CheckoutSession, ...)
  seeds.py       sample catalog, coupons, categories, journal posts, admin + demo users
  config.py      app factory + configuration
  migrations/    Alembic revision chain
  tests/         pytest suite (127 tests)
```

## Key conventions

- Every response is `{ "success": true, "data": ..., "meta"?: { page, pageSize, total, totalPages, hasNextPage } }`.
- JSON keys are camelCase (`firstName`, `isActive`); internal models use snake_case.
- Localized fields (`name`, `description`, `shortDescription`, `alt`) switch by `?lang=ar|en` (default `ar`).
- All mutations use `load_json_or_400(Schema(), partial=False)`; partial updates pass `partial=True`.
- Identity: `current_customer_id()` (optional), `require_active_customer()` (returns `Customer`, for protected routes), `admin_required()` (DB-authoritative `is_admin`).

## Admin API (`/api/v1/admin/*`)

`POST /admin/login` → `{ accessToken, refreshToken, customer }`. Every other route requires `Authorization: Bearer` + `is_admin`:

| Area | Routes |
|---|---|
| Dashboard | `GET /admin/dashboard` (orders, pending, revenue, products, low stock, customers counts) |
| Products | `GET/POST /admin/products`, `GET/PUT/DELETE /admin/products/<id>` (DELETE = soft hide) |
| Categories | `GET/POST /admin/categories`, `GET/PUT/PATCH/DELETE /admin/categories/<id>`, `POST /admin/categories/<id>/move` |
| Bundles | `GET/POST /admin/bundles`, `GET/PUT/PATCH/DELETE /admin/bundles/<id>`, `POST /admin/bundles/<id>/move` |
| Journal | `GET/POST /admin/journal`, `GET/PUT/PATCH/DELETE /admin/journal/<id>` (PATCH toggles isFeatured/isPublished) |
| Orders | `GET /admin/orders`, `GET/PATCH /admin/orders/<orderNumber>` (status + paymentStatus) |
| Coupons | `GET/POST /admin/coupons`, `PATCH/DELETE /admin/coupons/<id>` |
| Customers | `GET /admin/customers`, `PATCH /admin/customers/<id>` (isActive, loyaltyPoints) |
| Analytics | `GET /admin/analytics/overview|funnel|abandoned-carts|visitors`, `GET /admin/analytics/customers/<id>/timeline`, `GET /admin/analytics/visitors/<id>/timeline`, `POST /admin/analytics/run-abandonment` |

Admin order payloads use `OrderAdminOut`, which adds a read-only `shipment`
block (`provider`, `shipmentId`, `trackingNumber`, `status`, `updatedAt`) for
the shipment panel in the order detail page. The storefront `OrderOut` does
**not** include it — carrier internals are not customer-facing.

## Shipping webhooks (`/api/webhooks/*`)

`POST /api/webhooks/bosta` sits outside `/api/v1` and outside the admin
blueprint, so it needs no JWT: the caller is Bosta's server, not a dashboard
user. Authentication is the official Bosta mechanism — a custom header whose
name *and* value the merchant sets in the Bosta dashboard
(Settings → API Integration → Set Up Your Webhook). Bosta does **not** send an
HMAC signature, so none is invented here.

| Env | Purpose |
|---|---|
| `BOSTA_WEBHOOK_AUTH_HEADER` | Header name as registered in Bosta (suggested default `X-Bosta-Webhook-Token`) |
| `BOSTA_WEBHOOK_AUTH_TOKEN` | The shared secret value |

Behavior:

- **Fail closed.** No token configured → `503 webhook_not_configured`, never `200`. Missing/wrong header → `401`. Only the configured header name is accepted; no invented fallback names.
- Verification runs **before** the body is read, so an unauthenticated caller learns nothing about payload parsing.
- Body capped at 64KB (`413`); unknown JSON fields are ignored so a future Bosta field cannot break ingestion.
- Both `_id` and `trackingNumber` identify the shipment; the order is matched on `shipping_provider_order_id` first, then `tracking_number`. Neither → `400`.
- `state` is required and must be numeric (`400` otherwise) — an event without a state describes nothing, and a `200` that silently skips the update would hide an integration bug.
- Unknown shipment or unknown state code → `200` with `outcome: unknown_shipment` / `unknown_status` and a stored `webhook_events` row. Retrying cannot help, and a non-2xx would make Bosta retry forever.
- **Idempotent** via a deterministic `event_id` over (provider, `_id`, tracking, state, timestamp) plus a unique index; duplicates return `200` without touching the order. Concurrent inserts are caught as `IntegrityError` → `duplicate`.
- Shipment status is **forward-only** along `pending → picked_up → out_for_delivery → delivered`; a late/stale event cannot drag a delivered shipment backwards. Exceptions (`exception`, `lost`, `damaged`, …) are still recorded, but never overwrite a completed delivery.
- Order status only advances (`pending|processing → shipped → delivered`). Cancelling/returning/lost **never** auto-cancel an order — that is a commercial decision with stock and refund consequences, so it stays with the dashboard. `payment_status` is never touched (cash-on-delivery settles manually).
- Secrets, headers, and full payloads are never logged; the schema-validation log records failing **field names** only, and marshmallow errors (which can echo values) are not dumped.

State codes come from the official table in
`app/modules/shipping/bosta/states.py` (no invented codes; unknown codes are
ignored rather than guessed). Code `41` is type-dependent by Bosta's own
documentation — `SEND`/`FXF_SEND` means out for delivery, `CRP`/`RTO`/`EXCHANGE`
means heading back to the merchant — so the mapper takes `state` **and** `type`.

## Journey tracking (`/api/v1/tracking/*`)

First-party, config-gated (`TRACKING_ENABLED`, `ABANDONED_CART_THRESHOLD_MINUTES`, `TRACKING_CURRENCY`, `TRACKING_MAX_BATCH`) and never IP-based. The anonymous visitor is identified by an `X-Anonymous-Id` header (or `anonymousId` in the batch body); after login/signup `POST /tracking/identify` links and backfills the visitor's prior events to the customer.

- `POST /tracking/events` — accepts a batch (`{ events: [...], anonymousId? }`); unknown event names are dropped, `event_id` makes ingestion idempotent; over-limit batches return `413 batch_too_large`; works for guests and authenticated customers.
- `POST /tracking/identify` — JWT-required; links the anonymous visitor to the current customer.
- Cart state is a **projection** separate from the transactional `cart_items`: `ACTIVE → ABANDONED → RECOVERED/CONVERTED/EXPIRED`. `detect_abandoned_carts()` is a threshold-based, idempotent conditional UPDATE; `purchase` is recorded server-side (`event_id = "purchase-<orderNumber>"`) so the funnel never double-counts.

## Migrations

```bash
# Current chain (oldest → newest):
#   7c3757b9e336 (initial)
#   b2f9c14a7d30 (customers.city)
#   c3a1b2d4e5f6 (bundles)
#   e4b7c9a1f023 (drop dead columns, query indexes)
#   7381b63ef5b8 (customers.is_admin + order_items index)
#   f5a2e9c7b4d3 (categories.is_featured)
#   d9b3f59c8a12 (shipping_provider_settings + orders.shipping_*)
#   e9d2a1f4c8b6 (journal_articles)
#   a1b2c3d4e5f6 (journey tracking tables)
#   b7c4d1e2f3a4 (contact leads)
#   c8d5e2f3a4b6 (contact_leads unique index)
#   c8d5e2f3a4b6 → d1e4b5c6a7f8 (banners)
#   f1c7a9d2e4b6 (phone accounts + customers.address, mergepoint)
#   c4e8a1b6d9f2 (merge: folds d9b3f59c8a12 into the main line)
#   b7d2e5f8a1c3 (webhook_events)
flask --app run.py db upgrade        # verify head: b7d2e5f8a1c3
flask --app run.py db current
```

Always branch a new revision off the current **head**, not off some earlier
revision — otherwise Alembic reports multiple heads, `db upgrade` refuses to
run, and the stranded branch silently never applies. After writing a revision,
confirm with `flask --app run.py db heads` that it prints a single head; if it
prints two, you need a merge revision whose `down_revision` is the tuple of
both heads.

SQLite note: `is_admin` uses `server_default` in the migration because SQLite rejects `ADD COLUMN ... NOT NULL` without a non-null default.

## Tests

```bash
.venv\Scripts\activate
python -m pytest -q
```
