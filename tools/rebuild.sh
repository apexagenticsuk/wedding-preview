#!/usr/bin/env bash
# Rebuild step after changing page HTML or content.json: strips ids, bakes shared content into the pages, re-assigns ids.
# Usage: tools/rebuild.sh [port]   (needs playwright and Chrome; serves the site itself)
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${1:-8799}"
PAGES="index videos testimonials faqs blog contact page"
for p in $PAGES; do sed -i 's/ data-dy="[^"]*"//g' "$p.html"; done
python3 tools/imgdims.py
python3 -m http.server "$PORT" >/dev/null 2>&1 & SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
sleep 1
node tools/prerender.js . "$PORT" $PAGES
node tools/assign-ids.js . "$PORT" $PAGES
