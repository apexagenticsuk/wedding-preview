# Architecture

Static site, no build server. Same family as dave-preview.

- `content.json` is the single source of facts (contact, deposit, set, nav, FAQs, testimonials, videos, gallery, posts). Tokens like `{deposit.amount}` are replaced at render time, so each fact is written once.
- `content.js` renders every `[data-cms]` region from `content.json`; `tools/prerender.js` bakes the same output into the HTML so pages work before JS runs.
- `tools/rebuild.sh`: strip ids, write image sizes (`imgdims.py`), prerender, re-assign stable `data-dy` ids (`assign-ids.js`).
- `admin/`: visual editor (drag, shared content, move up/down, undo/redo, typed dates). Demo mode (`localStorage dy-mode=demo`) needs no key.
- `ui.js`: header state, reveal-on-scroll, click-to-play video (YouTube is only requested after a click).
- Every page has `noindex, nofollow`; `robots.txt` is `Disallow: /`.
- Tests (`tests/*.js`, Playwright): snap, drag, fix, shared, editor2, dupes, links. Run against a local `python3 -m http.server`.
- Deposit: no online payment exists on Dave's live site. `deposit.method.live/url` in content.json stay off until Dave supplies a real link; the placeholder is marked as not live.
