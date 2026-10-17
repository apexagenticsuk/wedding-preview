#!/usr/bin/env bash
# Builds the Cloudflare Pages deploy copy: site files only + Function + Cloudflare editor. Usage: cloudflare/build.sh <outdir>
# The repo itself (and the GitHub Pages copy) is never changed. No secrets or settings are written here.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:?outdir}"
rm -rf "$OUT"; mkdir -p "$OUT"
tar --exclude=.git --exclude=node_modules --exclude=tests --exclude=docs --exclude=tools --exclude=cloudflare --exclude=package.json --exclude=package-lock.json --exclude='*.md' --exclude=.gitignore --exclude=.nojekyll --exclude=README.md -cf - . | tar -xf - -C "$OUT"
cp cloudflare/shell.js "$OUT/admin/shell.js"
cp cloudflare/admin-index.html "$OUT/admin/index.html"
cp cloudflare/_worker.js "$OUT/_worker.js"
printf '/*\n  X-Robots-Tag: noindex, nofollow\n' > "$OUT/_headers"
echo "built $OUT"
