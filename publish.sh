#!/bin/bash
set -e

# Usage: ./publish.sh "commit message"
# Stages all changes, commits, pushes to main, and pings Google + Bing to re-crawl the sitemap.

MESSAGE="${1:-update site}"

echo "📦 Staging changes..."
git add -A

echo "✏️  Committing: $MESSAGE"
git commit -m "$MESSAGE"

echo "🚀 Pushing to Cloudflare via GitHub..."
git push origin main

echo "📡 Pinging Google sitemap..."
curl -s "https://www.google.com/ping?sitemap=https://zxai.ai/sitemap.xml" > /dev/null
echo "   ✓ Google pinged"

echo "📡 Pinging Bing/IndexNow sitemap..."
curl -s "https://www.bing.com/ping?sitemap=https://zxai.ai/sitemap.xml" > /dev/null
echo "   ✓ Bing pinged"

echo ""
echo "✅ Done. Site is live and search engines notified."
