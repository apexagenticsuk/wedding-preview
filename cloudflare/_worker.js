/* Cloudflare Pages "advanced mode" Function for wedding-preview. Single file, no imports.
   Saved site content lives in the KV namespace bound as CONTENT. The editor is protected by a passcode kept in the encrypted
   Pages secret EDITOR_PASSCODE (at least 12 characters). Login sets a signed, HttpOnly session cookie; optional SESSION_SECRET
   replaces the passcode as the cookie signing key. No secrets are stored in this file. */

/* ---- per-site settings (the only part that differs between the sites) ---- */
const SITE_NAME_SUFFIX = ' | The Wedding Comedian';
const BUILTIN = ['index', 'videos', 'testimonials', 'faqs', 'blog', 'contact', 'page'];
const REQUIRED_KEYS = ['version', '_help', 'siteUrl', 'theme', 'contact', 'set', 'socials', 'facts', 'faqs', 'testimonials', 'praise', 'gallery', 'galleryIntro', 'clips', 'posts', 'site', 'pages', 'dims'];
const OPTIONAL_KEYS = ['nav', 'custom', 'seo', 'contactSocials'];
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
  const id = b64u(crypto.getRandomValues(new Uint8Array(16))), exp = Math.floor(nowMs / 1000) + SESSION_SECONDS;
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
  if (parts.length !== 3 || !/^[A-Za-z0-9_-]{16,32}$/.test(parts[0]) || !/^\d{1,12}$/.test(parts[1])) return false;
  if (Number(parts[1]) <= Math.floor(nowMs / 1000)) return false;
  try { return await crypto.subtle.verify('HMAC', await signKey(env), b64uToBytes(parts[2]), enc.encode(parts[0] + '.' + parts[1])); } catch (e) { return false; }
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
      if (path === '/api/logout') return json({ ok: true }, 200, { 'Set-Cookie': cookieHeader('', 0) });
      return await login(request, env);
    }
    if (!(await sessionValid(request, env, now()))) return err(401, 'You are not signed in.');
    if (!csrfOk(request)) return err(403, 'This request was refused.');

    if (path === '/api/export') {
      const cur = await currentJson(env);
      return json({ ok: true, content: cur ? JSON.parse(cur) : null, images: await listImages(env), hasPrevious: !!(await env.CONTENT.get('previous.json')) });
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
      const cur = await env.CONTENT.get('content.json');
      if (cur) await env.CONTENT.put('previous.json', cur);
      await env.CONTENT.put('content.json', JSON.stringify(c));
      return json({ ok: true, version: c.version });
    }
    if (path === '/api/restore') {
      const prev = await env.CONTENT.get('previous.json');
      if (!prev) return err(409, 'There is no earlier version to go back to.');
      const cur = await env.CONTENT.get('content.json');
      await env.CONTENT.put('content.json', prev);
      if (cur) await env.CONTENT.put('previous.json', cur); else await env.CONTENT.delete('previous.json');
      return json({ ok: true, content: JSON.parse(prev) });
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
            const saved = await env.CONTENT.get('content.json');
            if (saved) return withHeaders(new Response(request.method === 'HEAD' ? null : saved, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }));
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
      return withHeaders(await env.ASSETS.fetch(request));
    }
  };
}

export default makeWorker();
