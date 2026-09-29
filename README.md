# Nimbus Store

A tiny storefront + admin panel running on **Cloudflare Workers**, **D1**, and **static assets**.

- Storefront: browse products, add to cart, Stripe-style checkout
- Admin panel (`#/admin`): add/delete products, view live carts, view/manage orders
- Admin password: `06142014Aa@`

## Setup

### 1. Prerequisites
- [Node.js 18+](https://nodejs.org)
- A Cloudflare account
- `wrangler` (installed locally via `npm install`)

```bash
npm install
npx wrangler login
```

### 2. Create the D1 database

```bash
npx wrangler d1 create nimbus-db
```

Copy the printed `database_id` into `wrangler.toml`.

### 3. Apply the schema

```bash
npm run db:init
```

### 4. Run locally

```bash
npm run db:init:local
npm run dev
```

Open http://localhost:8787

### 5. Deploy

```bash
npm run deploy
```

### 6. (Optional) Change the admin password

`wrangler.toml` already contains the password in `[vars]`, but for production
you should use a secret instead:

```bash
npx wrangler secret put ADMIN_PASSWORD
# then remove the ADMIN_PASSWORD line from [vars] in wrangler.toml
```

### 7. Connect GitHub to Cloudflare

If the dashboard shows *“Missing git connection”*:
1. Uninstall the **Cloudflare Workers and Pages** GitHub App at
   https://github.com/settings/installations
2. In Cloudflare → **Workers & Pages** → your Worker → **Settings** → **Builds**,
   reconnect Git and grant access **only to this repo**.

Alternatively, deploy via `npm run deploy` from CI or your laptop — no Git
integration required.

## API reference

| Method | Path                | Auth | Notes                            |
|--------|---------------------|------|----------------------------------|
| GET    | /api/products       | –    | List products                    |
| POST   | /api/products       | ✅   | Create product                   |
| DELETE | /api/products/:id   | ✅   | Delete product                   |
| GET    | /api/cart?id=       | –    | Fetch cart                       |
| POST   | /api/cart           | –    | Upsert cart                      |
| POST   | /api/checkout       | –    | Place order (computes totals)    |
| POST   | /api/admin/login    | –    | Password → session token         |
| GET    | /api/admin/stats    | ✅   | Dashboard stats                  |
| GET    | /api/admin/carts    | ✅   | All carts                        |
| GET    | /api/orders         | ✅   | All orders                       |
| GET    | /api/orders/:id     | ✅   | Order detail                     |
| PATCH  | /api/orders/:id     | ✅   | Update order status              |
