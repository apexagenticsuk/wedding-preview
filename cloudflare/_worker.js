/* Cloudflare Pages "advanced mode" Function for wedding-preview. Single file, no imports.
   Saved site content lives in the KV namespace bound as CONTENT. The editor is protected by a passcode kept in the encrypted
   Pages secret EDITOR_PASSCODE (at least 12 characters). Login sets a signed, HttpOnly session cookie; optional SESSION_SECRET
   replaces the passcode as the cookie signing key. No secrets are stored in this file. */

/* ---- per-site settings (the only part that differs between the sites) ---- */
const SITE_NAME_SUFFIX = ' | The Wedding Comedian';
const BUILTIN = ['index', 'videos', 'testimonials', 'faqs', 'blog', 'contact', 'page'];
const REQUIRED_KEYS = ['version', '_help', 'siteUrl', 'theme', 'contact', 'set', 'socials', 'facts', 'faqs', 'testimonials', 'praise', 'gallery', 'galleryIntro', 'clips', 'posts', 'site', 'pages', 'dims'];
const OPTIONAL_KEYS = ['nav', 'custom', 'seo', 'contactSocials'];
const BSTY = ['rose', 'gold', 'ghost', 'call'];
/* ---- end of per-site settings ---- */
const RESERVED = BUILTIN.concat(['admin', 'content', 'assets', 'style', 'site', 'robots', 'weddings', '404', 'tools', 'api', 'uploads', 'cloudflare']);
const MAX_JSON = 1024 * 1024;
const MAX_IMG = 5 * 1024 * 1024;
const NAME_RE = /^img-[a-z0-9]{8,40}\.(jpg|png|webp)$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;


/* ---- passcode login and signed session cookie ---- */
const COOKIE = '__Host-dy_session';
const SESSION_SECONDS = 12 * 60 * 60;
const MIN_PASSCODE = 12;
const MAX_FAILS = 5, WINDOW_MS = 15 * 60 * 1000, LOCK_MS = 15 * 60 * 1000, MAX_PER_HOUR = 10;
function b64u(bytes) { let s = ''; bytes = new Uint8Array(bytes); for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64uToBytes(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
const enc = new TextEncoder();
function configured(env) { return !!(env && env.CONTENT && typeof env.EDITOR_PASSCODE === 'string' && env.EDITOR_PASSCODE.length >= MIN_PASSCODE); }
async function sha256(s) { return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s))); }
async function passcodeMatches(given, env) {
  const a = await sha256('dy-pass|' + String(given)), b = await sha256('dy-pass|' + env.EDITOR_PASSCODE);
  let d = 0; for (let i = 0; i < 32; i++) d |= a[i] ^ b[i];
  return d === 0;
}
async function signKey(env) {
  const raw = await sha256('dy-session-key-v1|' + (env.SESSION_SECRET && String(env.SESSION_SECRET).length >= MIN_PASSCODE ? env.SESSION_SECRET : env.EDITOR_PASSCODE));
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function makeSession(env, nowMs) {
  const id = Math.floor(nowMs).toString(36).padStart(9, '0') + b64u(crypto.getRandomValues(new Uint8Array(12))), exp = Math.floor(nowMs / 1000) + SESSION_SECONDS;
  const body = id + '.' + exp;
  const sig = await crypto.subtle.sign('HMAC', await signKey(env), enc.encode(body));
  return body + '.' + b64u(sig);
}
function readCookie(request, name) {
  const h = request.headers.get('Cookie') || '';
  for (const p of h.split(';')) { const i = p.indexOf('='); if (i > 0 && p.slice(0, i).trim() === name) return p.slice(i + 1).trim(); }
  return '';
}
async function sessionValid(request, env, nowMs) {
  if (!configured(env)) return false;
  const v = readCookie(request, COOKIE), parts = v.split('.');
  if (parts.length !== 3 || !/^[0-9a-z]{9}[A-Za-z0-9_-]{16}$/.test(parts[0]) || !/^\d{1,12}$/.test(parts[1])) return false;
  if (Number(parts[1]) <= Math.floor(nowMs / 1000)) return false;
  try {
    if (!(await crypto.subtle.verify('HMAC', await signKey(env), b64uToBytes(parts[2]), enc.encode(parts[0] + '.' + parts[1])))) return false;
    /* signing out revokes every session issued up to that second, even if a browser kept its cookie */
    const revoked = Number(await env.CONTENT.get('revoked')) || 0, issued = parseInt(parts[0].slice(0, 9), 36);
    return issued > revoked;
  } catch (e) { return false; }
}
function cookieHeader(value, maxAge) { return COOKIE + '=' + value + '; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=' + maxAge; }

/* ---- helpers ---- */
function withHeaders(res, extra) {
  const h = new Headers(res.headers);
  h.set('X-Robots-Tag', 'noindex, nofollow');
  if (extra) for (const k in extra) h.set(k, extra[k]);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}
function json(obj, status, extra) {
  return withHeaders(new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }), extra);
}
function err(status, msg) { return json({ ok: false, error: msg }, status); }
function sniff(b) {
  if (b.length > 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return ['jpg', 'image/jpeg'];
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 && b[4] === 0x0D && b[5] === 0x0A && b[6] === 0x1A && b[7] === 0x0A) return ['png', 'image/png'];
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return ['webp', 'image/webp'];
  return null;
}
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
function validate(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return 'The content is not a JSON object.';
  const keys = Object.keys(c);
  const missing = REQUIRED_KEYS.filter(k => keys.indexOf(k) < 0);
  if (missing.length) return 'Missing: ' + missing.join(', ');
  const extra = keys.filter(k => REQUIRED_KEYS.indexOf(k) < 0 && OPTIONAL_KEYS.indexOf(k) < 0);
  if (extra.length) return 'Unexpected: ' + extra.join(', ');
  if (typeof c.version !== 'string' && typeof c.version !== 'number') return 'version must be text or a number.';
  if (c.custom != null) {
    if (typeof c.custom !== 'object' || Array.isArray(c.custom)) return 'custom pages are not valid.';
    for (const k of Object.keys(c.custom)) if (!SLUG_RE.test(k) || RESERVED.indexOf(k) > -1) return 'The page address "' + k + '" is not allowed.';
  }
  return '';
}

/* ---- server-side overlay: saved text, pictures, links and button styles are written into the page HTML the Function serves,
   so curl, search engines, link previews and no-JS visitors see the same as the browser overlay (content.js) after publish.
   Structural edits (added/moved sections, lists, menus, shared collections) still need JavaScript. ---- */
const OK_TAGS = { SPAN: 1, B: 1, I: 1, EM: 1, STRONG: 1, SMALL: 1, BR: 1, A: 1, CITE: 1, SUP: 1 };
const OK_ATTRS = /^(class|href|target|rel|style|title)$/;
const DROP_TAGS = /^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|SVG|TEMPLATE|NOSCRIPT)$/;
function escAttr(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function decodeEntities(s) {
  return String(s).replace(/&#x([0-9a-f]+);?/gi, (m, h) => String.fromCodePoint(Math.min(parseInt(h, 16), 0x10ffff)))
    .replace(/&#(\d+);?/g, (m, d) => String.fromCodePoint(Math.min(parseInt(d, 10), 0x10ffff)))
    .replace(/&(colon|tab|newline);?/gi, (m, n) => ({ colon: ':', tab: '\t', newline: '\n' }[n.toLowerCase()]));
}
function unsafeUrl(v) { return /^(javascript|data|vbscript):/i.test(decodeEntities(v).replace(/[\u0000-\u0020\u007f-\u009f]+/g, '')); }
/* Same allow-list as content.js clean(): a few inline tags and attributes, everything else unwrapped or dropped. */
export function cleanHtml(html) {
  const src = String(html == null ? '' : html), re = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>|[^<]+|</g;
  let out = '', m, skip = null, depth = 0; const stack = [];
  while ((m = re.exec(src))) {
    const tok = m[0];
    if (tok.slice(0, 4) === '<!--') continue;
    if (!m[1]) { if (!skip) out += tok === '<' ? '&lt;' : tok.replace(/&(?!#?\w+;)/g, '&amp;').replace(/>/g, '&gt;'); continue; }
    const name = m[1].toUpperCase(), closing = tok.charAt(1) === '/';
    if (skip) { if (name === skip) { if (closing) { if (--depth === 0) skip = null; } else if (tok.slice(-2) !== '/>') depth++; } continue; }
    if (DROP_TAGS.test(name)) { if (!closing && tok.slice(-2) !== '/>') { skip = name; depth = 1; } continue; }
    if (!OK_TAGS[name]) continue;
    const tag = name.toLowerCase();
    if (closing) { const i = stack.lastIndexOf(tag); if (i > -1 && tag !== 'br') { while (stack.length > i) out += '</' + stack.pop() + '>'; } continue; }
    let attrs = '', am; const are = /([^\s=\/"'<>]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;
    while ((am = are.exec(m[2] || ''))) {
      const nm = am[1].toLowerCase(); let v = am[2] == null ? '' : am[2];
      if (v.charAt(0) === '"' || v.charAt(0) === "'") v = v.slice(1, -1);
      if (!OK_ATTRS.test(nm)) continue;
      if (nm === 'href' && unsafeUrl(v)) continue;
      if (nm === 'style' && /url\(|expression/i.test(decodeEntities(v))) continue;
      attrs += ' ' + nm + '="' + escAttr(decodeEntities(v)) + '"';
    }
    out += '<' + tag + attrs + '>';
    if (tag !== 'br') stack.push(tag);
  }
  while (stack.length) out += '</' + stack.pop() + '>';
  return out;
}
export function pageKeyFor(path) {
  const k = String(path || '/').replace(/^\/+/, '').replace(/\.html$/, '').replace(/\/$/, '') || 'index';
  return BUILTIN.indexOf(k) > -1 && k !== 'page' ? k : null;
}
function safeHref(u) { u = String(u == null ? '' : u); return /^\s*(javascript|data):/i.test(u) ? '#' : u; }
/* Which saved edits apply to which element, mirroring apply() in content.js for text, picture, link and button-style edits. */
export function overlayFor(c, pageKey) {
  const P = (c && c.pages && c.pages[pageKey]) || {}, S = (c && c.site) || {};
  const pick = (E, k) => (E && typeof E[k] === 'object' && E[k]) || {};
  const seo = (c && c.seo && c.seo[pageKey]) || {};
  return { site: { text: pick(S, 'text'), img: pick(S, 'img'), link: pick(S, 'link'), style: pick(S, 'style') },
    page: { text: pick(P, 'text'), img: pick(P, 'img'), link: pick(P, 'link'), style: pick(P, 'style') },
    hidden: Array.isArray(P.hidden) ? P.hidden : [], title: typeof seo.title === 'string' ? seo.title : '', description: typeof seo.description === 'string' ? seo.description : '' };
}
function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
export function rewriteWithContent(resp, c, pageKey, savedAt) {
  const ov = overlayFor(c, pageKey); let depth = 0;
  const rw = new HTMLRewriter()
    .on('header.top, footer, .sticky', { element(el) { depth++; if (el.onEndTag) el.onEndTag(() => { depth--; }); } })
    .on('[data-dy]', { element(el) {
      const E = depth > 0 ? ov.site : ov.page;
      const ids = String(el.getAttribute('data-dy') || '').split(' ').filter(Boolean);
      ids.forEach((id) => {
        if (id.charAt(0) === 's' && ov.hidden.indexOf(id) > -1) el.setAttribute('style', (el.getAttribute('style') ? el.getAttribute('style') + ';' : '') + 'display:none');
        if (has(E.text, id) && typeof E.text[id] === 'string') el.setInnerContent(cleanHtml(E.text[id]), { html: true });
        const im = E.img[id];
        if (im && typeof im === 'object') { if (im.src) { el.setAttribute('src', String(im.src)); el.removeAttribute('srcset'); } if (im.alt != null) el.setAttribute('alt', String(im.alt)); }
        if (has(E.link, id) && E.link[id] != null) { const h = String(E.link[id]); el.setAttribute('href', safeHref(h)); if (/^https?:/.test(h)) { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener'); } else el.removeAttribute('target'); }
        const st = E.style[id];
        if (typeof st === 'string' && BSTY.indexOf(st) > -1) el.setAttribute('class', (el.getAttribute('class') || '').split(/\s+/).filter((x) => x && BSTY.indexOf(x) < 0).concat(st).join(' '));
      });
    } });
  if (ov.title) rw.on('title', { element(el) { el.setInnerContent(ov.title); } });
  if (ov.description) rw.on('meta[name="description"]', { element(el) { el.setAttribute('content', ov.description); } });
  const h = new Headers(resp.headers);
  h.set('Cache-Control', 'no-cache'); h.set('X-Content-Saved-At', savedAt || '');
  return rw.transform(new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h }));
}

export function makeWorker(deps) {
  deps = deps || {};
  const now = deps.now || (() => Date.now());
  const sleep = deps.sleep || (ms => new Promise(r => setTimeout(r, ms)));

  function csrfOk(request) {
    const o = request.headers.get('Origin');
    if (o && o !== new URL(request.url).origin) return false;
    return request.headers.get('X-DY-Editor') === '1';
  }
  async function currentJson(env) {
    const saved = await env.CONTENT.get('content.json');
    if (saved) return saved;
    const r = await env.ASSETS.fetch(new Request(new URL('/content.json', 'https://assets.invalid')));
    return r.ok ? await r.text() : null;
  }
  async function listImages(env) {
    const out = []; let cursor;
    do { const l = await env.CONTENT.list({ prefix: 'img:', cursor }); l.keys.forEach(k => out.push('/uploads/' + k.name.slice(4))); cursor = l.list_complete ? null : l.cursor; } while (cursor);
    return out;
  }

  async function readLimits(env) {
    try { return JSON.parse((await env.CONTENT.get('rl')) || '{}'); } catch (e) { return {}; }
  }
  async function login(request, env) {
    const t = now();
    const rl = await readLimits(env);
    if (rl.lock && rl.lock > t) return err(429, 'Too many wrong passcodes. Please wait 15 minutes and try again.');
    const len = Number(request.headers.get('Content-Length') || 0);
    if (len > 2048) return err(413, 'That is too long.');
    let given = '';
    try { const j = JSON.parse(await request.text()); given = j && typeof j.passcode === 'string' ? j.passcode.slice(0, 256) : ''; } catch (e) { given = ''; }
    if (given && await passcodeMatches(given, env)) {
      if (rl.t && rl.t.length) await env.CONTENT.put('rl', JSON.stringify({ t: [], lock: 0, h: rl.h || {} }));
      const v = await makeSession(env, t);
      return json({ ok: true }, 200, { 'Set-Cookie': cookieHeader(v, SESSION_SECONDS) });
    }
    const fails = (rl.t || []).filter(x => x > t - WINDOW_MS); fails.push(t);
    const hb = String(Math.floor(t / 3600000)), h = {}; h[hb] = ((rl.h && rl.h[hb]) || 0) + 1;
    const lock = (fails.length >= MAX_FAILS || h[hb] >= MAX_PER_HOUR) ? t + LOCK_MS : 0;
    await env.CONTENT.put('rl', JSON.stringify({ t: fails, lock, h }));
    await sleep(800);
    if (lock) return err(429, 'Too many wrong passcodes. Please wait 15 minutes and try again.');
    return err(401, 'That passcode did not work.');
  }

  async function api(request, env, path) {
    if (!configured(env)) return err(503, 'The saving service is not set up yet.');
    const method = request.method;
    const want = { '/api/login': 'POST', '/api/logout': 'POST', '/api/session': 'GET', '/api/publish': 'POST', '/api/upload': 'POST', '/api/restore': 'POST', '/api/export': 'GET' }[path];
    if (!want) return err(404, 'Not found.');
    if (method !== want) return err(405, 'Method not allowed.');
    if (path === '/api/session') return json({ ok: true, signedIn: await sessionValid(request, env, now()) });
    if (path === '/api/login' || path === '/api/logout') {
      if (!csrfOk(request)) return err(403, 'This request was refused.');
      if (path === '/api/logout') {
        if (await sessionValid(request, env, now())) await env.CONTENT.put('revoked', String(Math.floor(now())));
        return json({ ok: true }, 200, { 'Set-Cookie': cookieHeader('', 0) });
      }
      return await login(request, env);
    }
    if (!(await sessionValid(request, env, now()))) return err(401, 'You are not signed in.');
    if (!csrfOk(request)) return err(403, 'This request was refused.');

    if (path === '/api/export') {
      const cur = await currentJson(env), now0 = await env.CONTENT.getWithMetadata('content.json'), prev0 = await env.CONTENT.getWithMetadata('previous.json');
      return json({ ok: true, content: cur ? JSON.parse(cur) : null, images: await listImages(env), hasPrevious: !!(prev0 && prev0.value),
        savedAt: (now0 && now0.metadata && now0.metadata.savedAt) || '', previousSavedAt: (prev0 && prev0.metadata && prev0.metadata.savedAt) || '' });
    }
    if (path === '/api/publish') {
      const len = Number(request.headers.get('Content-Length') || 0);
      if (len > MAX_JSON) return err(413, 'The content is too big.');
      const buf = new Uint8Array(await request.arrayBuffer());
      if (buf.length > MAX_JSON) return err(413, 'The content is too big.');
      let c; const text = new TextDecoder().decode(buf);
      try { c = JSON.parse(text); } catch (e) { return err(400, 'The content is not valid JSON.'); }
      const bad = validate(c);
      if (bad) return err(400, bad);
      const cur = await env.CONTENT.getWithMetadata('content.json');
      if (cur && cur.value) await env.CONTENT.put('previous.json', cur.value, { metadata: { savedAt: (cur.metadata && cur.metadata.savedAt) || '' } });
      const savedAt = new Date(now()).toISOString();
      await env.CONTENT.put('content.json', JSON.stringify(c), { metadata: { savedAt } });
      return json({ ok: true, version: c.version, savedAt });
    }
    if (path === '/api/restore') {
      const prev = await env.CONTENT.getWithMetadata('previous.json');
      if (!prev || !prev.value) return err(409, 'There is no earlier version to go back to.');
      const cur = await env.CONTENT.getWithMetadata('content.json');
      const pAt = (prev.metadata && prev.metadata.savedAt) || '';
      await env.CONTENT.put('content.json', prev.value, { metadata: { savedAt: pAt } });
      if (cur && cur.value) await env.CONTENT.put('previous.json', cur.value, { metadata: { savedAt: (cur.metadata && cur.metadata.savedAt) || '' } }); else await env.CONTENT.delete('previous.json');
      return json({ ok: true, content: JSON.parse(prev.value), savedAt: pAt, previousSavedAt: (cur && cur.metadata && cur.metadata.savedAt) || '' });
    }
    if (path === '/api/upload') {
      const len = Number(request.headers.get('Content-Length') || 0);
      if (len > MAX_IMG + 1024) return err(413, 'That picture is too big (5 MB at most).');
      const buf = new Uint8Array(await request.arrayBuffer());
      if (buf.length > MAX_IMG) return err(413, 'That picture is too big (5 MB at most).');
      const kind = sniff(buf);
      if (!kind) return err(415, 'Only JPEG, PNG or WebP pictures are allowed.');
      const rnd = Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b => b.toString(16).padStart(2, '0')).join('');
      const name = 'img-' + Date.now().toString(36) + rnd + '.' + kind[0];
      await env.CONTENT.put('img:' + name, buf, { metadata: { type: kind[1] } });
      return json({ ok: true, path: '/uploads/' + name });
    }
  }

  async function customPage(env, slug) {
    const raw = await env.CONTENT.get('content.json');
    if (!raw) return null;
    let c; try { c = JSON.parse(raw); } catch (e) { return null; }
    const cu = c.custom && c.custom[slug];
    if (!cu) return null;
    const base = cu.base && SLUG_RE.test(cu.base) ? cu.base : 'page';
    const r = await env.ASSETS.fetch(new Request(new URL(base === 'index' ? '/' : '/' + base, 'https://assets.invalid')));
    if (!r.ok) return null;
    let h = await r.text();
    const s = (c.seo && c.seo[slug]) || {};
    const title = s.title || (cu.title || slug) + SITE_NAME_SUFFIX, desc = s.description || '';
    h = h.replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(title) + '</title>');
    if (/<meta name="description"[^>]*>/.test(h)) h = h.replace(/<meta name="description"[^>]*>/, '<meta name="description" content="' + esc(desc) + '">');
    else h = h.replace('</title>', '</title><meta name="description" content="' + esc(desc) + '">');
    h = h.replace(/ class="cur"/g, '');
    if (!/name="robots" content="noindex/.test(h)) h = h.replace('<head>', '<head><meta name="robots" content="noindex, nofollow">');
    return withHeaders(new Response(h, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' } }));
  }

  return {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      const path = url.pathname;
      try {
        if (path.startsWith('/api/')) return await api(request, env, path);
        if (request.method === 'GET' || request.method === 'HEAD') {
          if (env.CONTENT && path === '/content.json') {
            const saved = await env.CONTENT.getWithMetadata('content.json');
            if (saved && saved.value) return withHeaders(new Response(request.method === 'HEAD' ? null : saved.value, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Saved-At': (saved.metadata && saved.metadata.savedAt) || '' } }));
          }
          if (path.startsWith('/uploads/')) {
            const name = path.slice(9);
            if (!env.CONTENT || !NAME_RE.test(name)) return withHeaders(new Response('Not found', { status: 404 }));
            const r = await env.CONTENT.getWithMetadata('img:' + name, { type: 'arrayBuffer' });
            if (!r || !r.value) return withHeaders(new Response('Not found', { status: 404 }));
            return withHeaders(new Response(request.method === 'HEAD' ? null : r.value, { headers: { 'Content-Type': (r.metadata && r.metadata.type) || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } }));
          }
          const m = /^\/([a-z0-9][a-z0-9-]*)(?:\.html)?$/.exec(path);
          if (m && env.CONTENT && RESERVED.indexOf(m[1]) < 0) {
            const r = await customPage(env, m[1]);
            if (r) return r;
          }
        }
      } catch (e) {
        return err(500, 'Something went wrong on the server.');
      }
      const pk = (request.method === 'GET' || request.method === 'HEAD') && env.CONTENT && typeof HTMLRewriter !== 'undefined' ? pageKeyFor(path) : null;
      if (pk) {
        try {
          const saved = await env.CONTENT.getWithMetadata('content.json');
          if (saved && saved.value) {
            const c = JSON.parse(saved.value), hd = new Headers(request.headers);
            hd.delete('If-None-Match'); hd.delete('If-Modified-Since');
            const page = await env.ASSETS.fetch(new Request(request, { headers: hd }));
            if (page.status === 200 && /text\/html/i.test(page.headers.get('Content-Type') || '')) {
              const out = rewriteWithContent(page, c, pk, (saved.metadata && saved.metadata.savedAt) || '');
              out.headers.delete('ETag'); out.headers.delete('Last-Modified');
              return withHeaders(out);
            }
            return withHeaders(page);
          }
        } catch (e) { /* fall through to the page exactly as built */ }
      }
      const asset = await env.ASSETS.fetch(request);
      if (path === '/admin' || path.startsWith('/admin/')) return withHeaders(asset, { 'Cache-Control': 'no-store' });
      return withHeaders(asset);
    }
  };
}

export default makeWorker();
