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
