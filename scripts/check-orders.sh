#!/bin/bash
# Quick admin check. Run: ./scripts/check-orders.sh
npx wrangler d1 execute audit-db --command "SELECT id, email, url, status, created_at FROM orders ORDER BY created_at DESC LIMIT 20;"
