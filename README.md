# SHE LIGHT

Premium Egyptian dermocosmetics e-commerce monorepo.

- **frontend/** — Next.js 16 (App Router, TypeScript, Tailwind v4) storefront + admin console.
- **backend/** — Flask 3 REST API (SQLAlchemy + Alembic + JWT).
- **docs/README.md** — architecture, integration, and operations guide.

## Quickstart

```bash
# 1) Backend (Windows)
cd backend
python -m venv .venv; .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
flask db upgrade            # apply all migrations
flask seed                  # sample catalog + demo/admin accounts
python run.py               # http://localhost:5000/api/v1

# 2) Frontend
cd ..
npm install                 # hoisted to workspace root
cd frontend; copy .env.example .env.local
cd ..; npm run dev:frontend  # http://localhost:3000
```

### Demo accounts (seeded)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@shelight.com` | `admin12345` |
| Customer | `demo@shelight.com` | `password123` |

Admin console: **http://localhost:3000/admin** (login → dashboard, products, categories, bundles, journal, orders, coupons, customers, journey analytics).

## Quality gates

```bash
npm run typecheck:frontend   # tsc --noEmit
npm run lint:frontend        # eslint
npm run build:frontend       # next build
(cd frontend && npm run test)                 # Vitest
(cd backend && .venv\Scripts\Activate.ps1)    # then: python -m pytest -q
```

See **docs/README.md** for architecture, API contracts, and environment variables.