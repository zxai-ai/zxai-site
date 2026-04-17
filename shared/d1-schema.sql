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

-- Front Desk demo sessions (one row per browser, created on first call)
CREATE TABLE IF NOT EXISTS demo_sessions (
  id TEXT PRIMARY KEY,                          -- UUID set by browser cookie
  created_at TEXT DEFAULT (datetime('now')),
  last_seen_at TEXT DEFAULT (datetime('now')),
  page TEXT,                                    -- page widget was on
  ip_hash TEXT,
  user_agent TEXT,
  call_count INTEGER DEFAULT 1,
  booked INTEGER DEFAULT 0,                     -- 1 once a booking completes
  confirmation_id TEXT                          -- set on booking
);

CREATE INDEX IF NOT EXISTS idx_demo_sessions_created ON demo_sessions(created_at);

-- Front Desk demo bookings (Katie)
CREATE TABLE IF NOT EXISTS demo_bookings (
  id TEXT PRIMARY KEY,
  created_at TEXT DEFAULT (datetime('now')),
  session_id TEXT REFERENCES demo_sessions(id), -- ties booking to browser session
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  slot_iso TEXT NOT NULL,
  slot_label TEXT NOT NULL,
  calendar_event_id TEXT,
  ip_hash TEXT,
  user_agent TEXT
);

-- Front Desk demo token mint counter (for daily cap + rate limit)
CREATE TABLE IF NOT EXISTS demo_token_mints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  minted_at TEXT DEFAULT (datetime('now')),
  ip_hash TEXT NOT NULL,
  day TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_demo_token_mints_day ON demo_token_mints(day);
CREATE INDEX IF NOT EXISTS idx_demo_token_mints_ip_day ON demo_token_mints(ip_hash, day);

-- Agent Demo Suite analytics. One row per client event.
-- Populated by POST /api/demo-events (batched from the browser).
CREATE TABLE IF NOT EXISTS demo_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent TEXT NOT NULL,          -- 'reactivation', 'retention', 'prior-auth', etc.
  event_type TEXT NOT NULL,     -- see src/workers/demo-events.ts for taxonomy
  turn_index INTEGER,           -- 0-based turn in a scripted call, NULL for visual demos
  branch_chosen TEXT,           -- button label, NULL where not applicable
  session_id TEXT,              -- zxai_sid cookie
  ip_hash TEXT,
  user_agent TEXT,
  metadata TEXT,                -- JSON blob for demo-specific extras
  client_ts TEXT,               -- client-reported timestamp
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_demo_events_agent ON demo_events(agent, created_at);
CREATE INDEX IF NOT EXISTS idx_demo_events_session ON demo_events(session_id);
CREATE INDEX IF NOT EXISTS idx_demo_events_type ON demo_events(event_type, created_at);

-- Email captures from demos (primary source: Web/SEO mini-audit).
CREATE TABLE IF NOT EXISTS demo_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  source TEXT NOT NULL,         -- 'web-seo-audit', etc.
  ip_hash TEXT,
  metadata TEXT,                -- JSON
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_demo_leads_email ON demo_leads(email);
CREATE INDEX IF NOT EXISTS idx_demo_leads_source ON demo_leads(source, created_at);

-- Web/SEO mini-audit rate-limit + history table.
CREATE TABLE IF NOT EXISTS demo_webseo_audits (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  email TEXT,
  ip_hash TEXT,
  score_seo INTEGER,
  score_ai_search INTEGER,
  score_local INTEGER,
  score_content INTEGER,
  report_html TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_demo_webseo_ip_day ON demo_webseo_audits(ip_hash, created_at);
