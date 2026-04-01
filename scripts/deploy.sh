#!/bin/bash
set -e
echo "Deploying audit tool..."
wrangler d1 execute audit-db --file=shared/d1-schema.sql
wrangler deploy
echo "Done."
