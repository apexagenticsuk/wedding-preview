# Cloudflare Pages edition (wedding-preview-b6y.pages.dev)

GitHub Pages is unchanged: it still uses `admin/shell.js` and the GitHub publish flow. This folder only builds the Cloudflare copy.

- `_worker.js`: the Pages Function (advanced mode). Serves saved content and uploads from KV (binding `CONTENT`), and `/api/publish|upload|export|restore`, all behind a passcode login (encrypted Pages secret `EDITOR_PASSCODE`, at least 12 characters; signed HttpOnly session cookie, 12 hours; wrong guesses rate-limited via KV). 
- `shell.js`, `admin-index.html`: the editor for that copy (no key box, no GitHub). `build.sh <outdir>` overlays them on the site files.
- Tests: `node cloudflare/test/unit.mjs`; `cloudflare/test/serve.sh 8788` then `node cloudflare/test/e2e.cjs http://localhost:8788` (the test server uses a throwaway test passcode; there is no bypass in the Function).
- Deploy: `cloudflare/build.sh /workspace/cf-deploy/wedding-preview` then `wrangler pages deploy ... --project-name wedding-preview --branch main`. Bindings and secrets are set on the Pages project, not in files. Set the secret first, then deploy.
