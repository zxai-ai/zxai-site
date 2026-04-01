#!/bin/bash
# AI Visibility Audit Tool -- Worktree Setup (Post-Elon: 3 lanes)
# Run from repo root. Requires clean working tree on main.

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
PARENT_DIR=$(dirname "$REPO_ROOT")
REPO_NAME=$(basename "$REPO_ROOT")

echo "=== Audit Tool -- Worktree Setup (3 lanes) ==="

# Step 1: Shared artifacts on main
echo "[1/3] Creating shared artifacts..."

mkdir -p shared src/pages src/workers src/lib scripts

# D1 Schema
cat > shared/d1-schema.sql << 'SQL'
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  url TEXT NOT NULL,
  stripe_payment_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS raw_data (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  firecrawl_data TEXT,
  places_data TEXT,
  scraped_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  report_json TEXT,
  score_overall INTEGER,
  delivered_at TEXT
);

CREATE INDEX idx_orders_status ON orders(status);
SQL

# Admin script (replaces dashboard)
cat > scripts/check-orders.sh << 'BASH'
#!/bin/bash
# Quick admin check. Run: ./scripts/check-orders.sh
wrangler d1 execute audit-db --command "SELECT id, email, url, status, created_at FROM orders ORDER BY created_at DESC LIMIT 20;"
BASH
chmod +x scripts/check-orders.sh

cat > scripts/deploy.sh << 'BASH'
#!/bin/bash
set -e
echo "Deploying audit tool..."
wrangler d1 execute audit-db --file=shared/d1-schema.sql
wrangler deploy
echo "Done."
BASH
chmod +x scripts/deploy.sh

git add shared/ scripts/
git commit -m "Add shared artifacts and admin scripts"

# Step 2: Create worktrees
echo "[2/3] Creating worktrees..."

for LANE in checkout pipeline report; do
  BRANCH="lane/$LANE"
  WORKTREE="$PARENT_DIR/$REPO_NAME-lane-$LANE"
  git branch "$BRANCH" 2>/dev/null || true
  git worktree add "$WORKTREE" "$BRANCH"
  echo "  Created: $WORKTREE"
done

echo ""
echo "[3/3] Done."
git worktree list
echo ""
echo "Next: open each worktree, run the matching dispatch prompt."
echo "Merge order: any lane first, integration wiring last on main."
