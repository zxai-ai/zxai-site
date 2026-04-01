# Dispatch Prompt -- Lane 5: Admin Dashboard

## What You Are Building
A simple Cloudflare Pages dashboard that reads from D1 and shows: all orders, their statuses, revenue total, and links to generated reports. This is for Anthony only. No auth needed (will be access-restricted by Cloudflare Access later).

## Read First
- `shared/types.ts` -- `Order` types
- `shared/d1-schema.sql` -- all three tables

## What to Build

### 1. Admin Page (`src/pages/admin/index.html`)
Single HTML file with inline JS that fetches from the admin API Worker.

Sections:
- **Revenue bar**: Total revenue, orders this week, orders today
- **Orders table**: ID, email, URL, status, created_at, link to PDF (if delivered)
- **Status filter**: Show all / pending / delivered / failed
- Auto-refresh every 30 seconds

Style: Minimal. Same color scheme as landing page. Table-based. No framework.

### 2. Admin API Worker (`src/workers/admin-api.ts`)
Simple read-only API for the dashboard.

Endpoints:
- `GET /api/admin/orders` -- returns all orders with report status, supports `?status=` filter
- `GET /api/admin/stats` -- returns `{ total_revenue, orders_today, orders_this_week, orders_total, delivered_count, failed_count }`

Both pull from D1. Read-only. No mutations.

## Validation
- [ ] Dashboard renders and shows test order data
- [ ] Revenue calculation is correct (orders * $99)
- [ ] Status filter works
- [ ] PDF links are clickable for delivered orders
- [ ] Auto-refresh works
- [ ] Page loads in under 2 seconds

## Output Files
```
src/pages/admin/index.html
src/workers/admin-api.ts
```

## Completion Signal
When done, update ORCHESTRATION.md: set Lane 5 status to `complete`.
