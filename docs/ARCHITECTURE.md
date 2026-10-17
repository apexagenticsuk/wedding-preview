# Architecture

Static site, no build server. Same family as dave-preview.

- `content.json` is the single source of facts (contact, set, nav, FAQs, testimonials, videos, gallery, posts). Tokens like `{set.length}` are replaced at render time, so each fact is written once.
- `content.js` renders every `[data-cms]` region from `content.json`; `tools/prerender.js` bakes the same output into the HTML so pages work before JS runs.
- `tools/rebuild.sh`: strip ids, write image sizes (`imgdims.py`), prerender, re-assign stable `data-dy` ids (`assign-ids.js`).
- `admin/`: visual editor (drag, shared content, move up/down, undo/redo, typed dates). Demo mode (`localStorage dy-mode=demo`) needs no key.
- `ui.js`: header state, reveal-on-scroll, click-to-play video (YouTube is only requested after a click).
- Every page has `noindex, nofollow`; `robots.txt` is `Disallow: /`.
- Tests (`tests/*.js`, Playwright): snap, drag, fix, shared, editor2, dupes, links. Run against a local `python3 -m http.server`.


## v4 notes (17 Oct 2026)
- Gallery photos have a per-image focus point `pos` ("x% y%") in `content.json` (`gallery[]`, `galleryIntro`), applied as `object-position` and editable in Shared content > Photo gallery. Gallery pictures show at their own aspect, so `pos` only matters if a frame crops them. `tests/focus.js` (static) and `tests/gallery.js` (rendered, phone + desktop) check every detected face (`tests/faces.json`). Heads clipped by Dave's own 770x338 Wix uploads are listed in `faces.json` `_srcCut`; a new clipped head fails the test.
- Buttons: `btns.js` (label ink centring at 320/390/768/1280) and `contrast.js` (>= 4.5:1). No baked banner icons on this site (socials are SVG icons in the footer), so no hotspot work was needed.
