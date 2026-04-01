#!/bin/bash
# AI Visibility Audit Tool -- Worktree Setup
# Run from the root of your repo (e.g., ~/code/zxai-audit-tool)
#
# This script:
# 1. Creates shared artifacts on main
# 2. Creates a worktree + branch for each parallel lane
# 3. Copies shared artifacts into each worktree
#
# Prerequisites: git repo initialized, on main branch, clean working tree

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
PARENT_DIR=$(dirname "$REPO_ROOT")
REPO_NAME=$(basename "$REPO_ROOT")

echo "=== AI Visibility Audit Tool -- Worktree Setup ==="
echo "Repo: $REPO_ROOT"
echo ""

# Step 1: Create shared artifacts on main
echo "[1/4] Creating shared artifacts on main..."

mkdir -p shared/brand
mkdir -p src/workers
mkdir -p src/pages

# D1 Schema
cat > shared/d1-schema.sql << 'SQL'
-- AI Visibility Audit Tool -- D1 Schema
-- Run: wrangler d1 execute audit-db --file=shared/d1-schema.sql

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  url TEXT NOT NULL,
  stripe_payment_id TEXT,
  status TEXT DEFAULT 'pending',  -- pending | scraping | analyzing | generating | delivered | failed
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS raw_data (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  firecrawl_data TEXT,   -- JSON blob from Firecrawl
  places_data TEXT,      -- JSON blob from Google Places
  scraped_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  report_json TEXT,      -- Structured analysis from Claude
  pdf_url TEXT,          -- R2 URL for generated PDF
  score_overall INTEGER, -- 0-100 composite score
  delivered_at TEXT
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_email ON orders(email);
SQL

# Report JSON Schema
cat > shared/report-schema.json << 'JSON'
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AuditReport",
  "type": "object",
  "required": ["practice", "scores", "sections", "recommendations"],
  "properties": {
    "practice": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "url": { "type": "string" },
        "location": { "type": "string" }
      }
    },
    "scores": {
      "type": "object",
      "properties": {
        "overall": { "type": "integer", "minimum": 0, "maximum": 100 },
        "seo": { "type": "integer", "minimum": 0, "maximum": 100 },
        "geo_ai": { "type": "integer", "minimum": 0, "maximum": 100 },
        "local_presence": { "type": "integer", "minimum": 0, "maximum": 100 },
        "content": { "type": "integer", "minimum": 0, "maximum": 100 },
        "competitor_gap": { "type": "integer", "minimum": 0, "maximum": 100 }
      }
    },
    "sections": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "score": { "type": "integer" },
          "findings": { "type": "array", "items": { "type": "string" } },
          "impact": { "type": "string" }
        }
      }
    },
    "recommendations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "priority": { "type": "integer", "minimum": 1, "maximum": 5 },
          "action": { "type": "string" },
          "expected_impact": { "type": "string" },
          "difficulty": { "type": "string", "enum": ["easy", "medium", "hard"] }
        }
      }
    },
    "cta": {
      "type": "object",
      "properties": {
        "headline": { "type": "string" },
        "body": { "type": "string" },
        "booking_url": { "type": "string" }
      }
    }
  }
}
JSON

# Shared TypeScript types
cat > shared/types.ts << 'TS'
// Shared types across all Workers

export interface Order {
  id: string;
  email: string;
  url: string;
  stripe_payment_id?: string;
  status: 'pending' | 'scraping' | 'analyzing' | 'generating' | 'delivered' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface RawData {
  order_id: string;
  firecrawl_data: FirecrawlResult;
  places_data: PlacesResult;
  scraped_at: string;
}

export interface FirecrawlResult {
  markdown: string;
  metadata: {
    title?: string;
    description?: string;
    language?: string;
    ogImage?: string;
  };
  links: string[];
}

export interface PlacesResult {
  name: string;
  rating?: number;
  review_count?: number;
  address?: string;
  phone?: string;
  hours?: string[];
  categories?: string[];
}

export interface ReportData {
  practice: { name: string; url: string; location: string };
  scores: {
    overall: number;
    seo: number;
    geo_ai: number;
    local_presence: number;
    content: number;
    competitor_gap: number;
  };
  sections: Array<{
    title: string;
    score: number;
    findings: string[];
    impact: string;
  }>;
  recommendations: Array<{
    priority: number;
    action: string;
    expected_impact: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
  cta: {
    headline: string;
    body: string;
    booking_url: string;
  };
}

export interface Env {
  DB: D1Database;
  AUDIT_KV: KVNamespace;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  FIRECRAWL_API_KEY: string;
  GOOGLE_PLACES_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  RESEND_API_KEY: string;
  R2_BUCKET: R2Bucket;
}
TS

echo "  Created: shared/d1-schema.sql"
echo "  Created: shared/report-schema.json"
echo "  Created: shared/types.ts"

# Commit shared artifacts
git add shared/
git commit -m "Add shared artifacts: D1 schema, report schema, shared types"

# Step 2: Create worktrees
echo ""
echo "[2/4] Creating worktrees..."

LANES=("checkout" "pipeline" "analysis" "report" "admin")

for LANE in "${LANES[@]}"; do
  BRANCH="lane/$LANE"
  WORKTREE="$PARENT_DIR/$REPO_NAME-lane-$LANE"

  echo "  Creating: $WORKTREE (branch: $BRANCH)"
  git branch "$BRANCH" 2>/dev/null || true
  git worktree add "$WORKTREE" "$BRANCH"
done

echo ""
echo "[3/4] Worktrees created:"
git worktree list

# Step 3: Print status
echo ""
echo "[4/4] Setup complete."
echo ""
echo "Next steps:"
echo "  1. Add API keys to .dev.vars in each worktree (or use wrangler secret)"
echo "  2. Open each worktree in a separate terminal/editor"
echo "  3. Run the dispatch prompt for each lane"
echo "  4. When lanes are done, squash-merge to main in any order"
echo "  5. Create lane/integration worktree after all merges"
echo ""
echo "To merge a lane:"
echo "  cd $REPO_ROOT"
echo "  git merge --squash lane/checkout"
echo "  git commit -m 'Lane 1: Checkout flow'"
echo "  git worktree remove $PARENT_DIR/$REPO_NAME-lane-checkout"
echo ""
echo "To create integration worktree (after all lanes merged):"
echo "  git branch lane/integration"
echo "  git worktree add $PARENT_DIR/$REPO_NAME-lane-integration lane/integration"
