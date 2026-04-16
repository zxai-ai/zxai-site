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
