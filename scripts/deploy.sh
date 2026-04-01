#!/bin/bash
set -e
echo "Deploying audit tool..."
npx wrangler d1 execute audit-db --file=shared/d1-schema.sql
npx wrangler deploy
echo "Done."
