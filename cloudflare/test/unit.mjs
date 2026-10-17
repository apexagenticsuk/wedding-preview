// Unit tests of the Worker (passcode login): node cloudflare/test/unit.mjs
import {makeWorker} from '../_worker.js';
import {fakeKV,fakeAssets} from './fake.mjs';
import fs from 'fs';
const res=[];const ok=(n,c,x)=>{res.push(!!c);console.log((c?'PASS ':'FAIL ')+n+(x&&!c?' '+x:''));};
const base=JSON.parse(fs.readFileSync(new URL('../../content.json',import.meta.url),'utf8'));
const PASS='unit-test-passcode-Abc234';
const mk=(over={},clock={t:1800000000000})=>{const kv=fakeKV();const env=Object.assign({CONTENT:kv,EDITOR_PASSCODE:PASS,ASSETS:fakeAssets({'/content.json':JSON.stringify(base),'/index':'<html>index</html>','/page':'<html><head><title>x</title></head><body class="p"><a class="cur"></a></body></html>'})},over);
 const sleeps=[];const w=makeWorker({now:()=>clock.t,sleep:async ms=>{sleeps.push(ms);}});
 const call=(path,o={})=>{const h=Object.assign({},o.headers||{});if(o.cookie)h.Cookie=o.cookie;if(o.method==='POST'&&o.ed!==false)h['X-DY-Editor']='1';if(o.ed&&o.method!=='POST')h['X-DY-Editor']='1';
  return w.fetch(new Request('https://x.test'+path,{method:o.method||'GET',headers:h,body:o.body}),o.env||env);};
 const login=async(pw=PASS)=>{const r=await call('/api/login',{method:'POST',body:JSON.stringify({passcode:pw})});const sc=r.headers.get('Set-Cookie');return {r,cookie:sc?sc.split(';')[0]:null,sc};};
 return {kv,env,w,call,login,sleeps,clock};};
const jpg=()=>{const b=new Uint8Array(1000);b[0]=0xFF;b[1]=0xD8;b[2]=0xFF;return b;};
const png=()=>{const b=new Uint8Array(100);[0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A].forEach((v,i)=>b[i]=v);return b;};
const webp=()=>{const b=new Uint8Array(100);'RIFF'.split('').forEach((c,i)=>b[i]=c.charCodeAt(0));'WEBP'.split('').forEach((c,i)=>b[8+i]=c.charCodeAt(0));return b;};
const P=(c,cookie)=>({method:'POST',cookie,body:typeof c==='string'?c:JSON.stringify(c)});
let t=mk(),r,j;
// static fall-through
r=await t.call('/content.json');ok('content.json falls through to static when nothing saved',r.status===200&&r.headers.get('x-static')==='1');
r=await t.call('/index');ok('other pages fall through to static',(await r.text())==='<html>index</html>');
ok('every Worker response has X-Robots-Tag noindex, nofollow',r.headers.get('X-Robots-Tag')==='noindex, nofollow');
// not configured
for(const [lab,over] of [['missing',{EDITOR_PASSCODE:undefined}],['empty',{EDITOR_PASSCODE:''}],['11 characters (too short)',{EDITOR_PASSCODE:'12345678901'}],['no KV',{CONTENT:undefined}]]){
 const u=mk(over);r=await u.call('/api/login',{method:'POST',body:JSON.stringify({passcode:over.EDITOR_PASSCODE||'x'})});j=await r.json();ok('passcode '+lab+': login refused with the plain not-set-up message (503)',r.status===503&&j.error==='The saving service is not set up yet.');
 r=await u.call('/api/export',{ed:true});ok('passcode '+lab+': every API call refused (503)',r.status===503);
 r=await u.call('/index');ok('passcode '+lab+': static site still works',(await r.text())==='<html>index</html>');}
const u12=mk({EDITOR_PASSCODE:'123456789012'});const l12=await u12.login('123456789012');ok('exactly 12 characters is accepted',l12.r.status===200);
// login
t=mk();let L=await t.login('wrong');ok('wrong passcode refused (401) with no cookie',L.r.status===401&&!L.sc);ok('a delay is added after a wrong passcode',t.sleeps.length===1&&t.sleeps[0]>=500);
r=await t.call('/api/login',{method:'POST',body:'not json'});ok('login with a broken body refused (401)',r.status===401);
r=await t.call('/api/login',{method:'POST',body:JSON.stringify({passcode:''})});ok('empty passcode refused (401)',r.status===401);
r=await t.call('/api/login',{method:'POST',body:JSON.stringify({passcode:[PASS]})});ok('non-text passcode refused (401)',r.status===401);
r=await t.call('/api/login',{method:'POST',ed:false,body:JSON.stringify({passcode:PASS})});ok('login without the editor header refused (403)',r.status===403);
r=await t.call('/api/login',{method:'POST',headers:{Origin:'https://evil.test'},body:JSON.stringify({passcode:PASS})});ok('login from another origin refused (403)',r.status===403);
r=await t.call('/api/login',{method:'GET'});ok('GET on login refused (405)',r.status===405);
r=await t.call('/api/login',{method:'POST',headers:{'Content-Length':'5000'},body:'x'.repeat(5000)});ok('huge login body refused (413)',r.status===413);
L=await t.login();ok('right passcode accepted (200)',L.r.status===200&&!!L.cookie);
const sc=L.sc;ok('cookie is HttpOnly, Secure, SameSite=Strict, Path=/, Max-Age=43200',/HttpOnly/.test(sc)&&/Secure/.test(sc)&&/SameSite=Strict/.test(sc)&&/Path=\//.test(sc)&&/Max-Age=43200/.test(sc)&&/^__Host-dy_session=/.test(sc),sc);
ok('cookie value does not contain the passcode',!sc.includes(PASS));
ok('login response does not contain the passcode',!(JSON.stringify(await L.r.text())).includes(PASS));
const C=L.cookie;
r=await t.call('/api/session');j=await r.json();ok('/api/session says not signed in without a cookie',j.signedIn===false&&r.status===200);
r=await t.call('/api/session',{cookie:C});j=await r.json();ok('/api/session says signed in with the cookie',j.signedIn===true);
// refusals without session
for(const [p,o] of [['/api/publish',P(base)],['/api/upload',{method:'POST',body:jpg()}],['/api/restore',{method:'POST'}],['/api/export',{ed:true}]]){r=await t.call(p,o);ok('no cookie: '+p+' refused (401)',r.status===401);}
r=await t.call('/api/export',{ed:true,cookie:'__Host-dy_session=garbage'});ok('garbage cookie refused (401)',r.status===401);
r=await t.call('/api/export',{ed:true,cookie:C.replace(/.$/,x=>x==='A'?'B':'A')});ok('tampered signature refused (401)',r.status===401);
const parts=C.split('=')[1].split('.');
r=await t.call('/api/export',{ed:true,cookie:'__Host-dy_session='+parts[0]+'.'+(Number(parts[1])+99999)+'.'+parts[2]});ok('tampered expiry refused (401)',r.status===401);
const other=mk({EDITOR_PASSCODE:'another-secret-123456'});const oc=(await other.login('another-secret-123456')).cookie;
r=await t.call('/api/export',{ed:true,cookie:oc});ok('cookie from another secret refused (401)',r.status===401);
const sess=mk({SESSION_SECRET:'separate-session-secret-1'});const sk=(await sess.login()).cookie;r=await sess.call('/api/export',{ed:true,cookie:sk});ok('SESSION_SECRET (if set) signs cookies and they work',r.status===200);
const sess2=mk({SESSION_SECRET:'a-different-session-secret'});r=await sess2.call('/api/export',{ed:true,cookie:sk});ok('cookie signed with another SESSION_SECRET refused',r.status===401);
// expiry
t.clock.t+=12*3600*1000+2000;r=await t.call('/api/export',{ed:true,cookie:C});ok('expired cookie (after 12 hours) refused (401)',r.status===401);t.clock.t-=12*3600*1000+2000;
r=await t.call('/api/export',{ed:true,cookie:C});ok('cookie is fine again within 12 hours',r.status===200);
// changing the passcode invalidates sessions
const chg=Object.assign({},t.env,{EDITOR_PASSCODE:'a-new-passcode-998877'});r=await t.call('/api/export',{ed:true,cookie:C,env:chg});ok('changing the passcode secret invalidates existing sessions (401)',r.status===401);
// header / origin on authed
r=await t.call('/api/export',{cookie:C});ok('session without the editor header refused (403)',r.status===403);
r=await t.call('/api/export',{cookie:C,ed:true,headers:{Origin:'https://evil.test'}});ok('session from another origin refused (403)',r.status===403);
r=await t.call('/api/publish',{...P(base,C),ed:false});ok('publish without the editor header refused (403)',r.status===403);
r=await t.call('/api/publish',{...P(base,C),headers:{Origin:'https://evil.test'}});ok('publish from another origin refused (403)',r.status===403);
// logout
r=await t.call('/api/logout',{method:'POST',cookie:C});ok('logout clears the cookie (Max-Age=0)',r.status===200&&/Max-Age=0/.test(r.headers.get('Set-Cookie'))&&/^__Host-dy_session=;/.test(r.headers.get('Set-Cookie')));
r=await t.call('/api/logout',{method:'POST',ed:false});ok('logout without the editor header refused (403)',r.status===403);
// publish refusals with session
r=await t.call('/api/publish',P('{broken',C));ok('broken JSON refused (400)',r.status===400);
const w1=Object.assign({},base);delete w1.contact;r=await t.call('/api/publish',P(w1,C));ok('missing key refused (400)',r.status===400);
r=await t.call('/api/publish',P(Object.assign({},base,{evil:1}),C));ok('extra unknown key refused (400)',r.status===400);
r=await t.call('/api/publish',P([1,2],C));ok('JSON array refused (400)',r.status===400);
r=await t.call('/api/publish',P(Object.assign({},base,{custom:{'../x':{title:'x'}}}),C));ok('custom page with bad address refused (400)',r.status===400);
r=await t.call('/api/publish',P(Object.assign({},base,{custom:{contact:{title:'x'}}}),C));ok('custom page named like a built-in page refused (400)',r.status===400);
r=await t.call('/api/publish',P(Object.assign({},base,{_help:'x'.repeat(1024*1024)}),C));ok('over 1 MB refused (413)',r.status===413);
r=await t.call('/api/publish',{method:'GET',cookie:C});ok('GET on publish refused (405)',r.status===405);
ok('nothing was saved by the refusals',!t.kv.m.has('content.json'));
// publish good, undo, export
const v2=Object.assign({},base,{version:'2026-10-18T10:00:00Z',contact:Object.assign({},base.contact,{phone:'999'})});
r=await t.call('/api/publish',P(v2,C));ok('good publish accepted (200)',r.status===200);
r=await t.call('/content.json');j=await r.json();ok('saved content is served at /content.json straight away (no-store)',j.contact.phone==='999'&&r.headers.get('Cache-Control')==='no-store');
ok('first publish has no previous slot',!t.kv.m.has('previous.json'));
const v3=Object.assign({},v2,{version:'2026-10-18T11:00:00Z',contact:Object.assign({},base.contact,{phone:'111'})});
await t.call('/api/publish',P(v3,C));ok('second publish keeps the first as previous',JSON.parse(t.kv.m.get('previous.json').v).contact.phone==='999');
r=await t.call('/api/export',{ed:true,cookie:C});j=await r.json();ok('export returns current content, image list and previous flag',r.status===200&&j.content.contact.phone==='111'&&Array.isArray(j.images)&&j.hasPrevious===true);
r=await t.call('/api/restore',{method:'POST',cookie:C});j=await r.json();ok('undo (restore) brings the previous version back',r.status===200&&j.content.contact.phone==='999');
r=await t.call('/content.json');ok('after undo the live content is the previous version',(await r.json()).contact.phone==='999');
r=await t.call('/api/restore',{method:'POST',cookie:C});r=await t.call('/content.json');ok('undo again swaps forward (redo)',(await r.json()).contact.phone==='111');
const t0=mk();const C0=(await t0.login()).cookie;r=await t0.call('/api/restore',{method:'POST',cookie:C0});ok('undo with nothing saved is refused plainly (409)',r.status===409);
r=await t0.call('/api/export',{ed:true,cookie:C0});j=await r.json();ok('export before any publish returns the built-in content.json',j.content.version===base.version&&j.images.length===0);
// uploads
t=mk();const CU=(await t.login()).cookie;
r=await t.call('/api/upload',{method:'POST',body:jpg()});ok('upload refused without a session (401)',r.status===401);
r=await t.call('/api/upload',{method:'POST',cookie:CU,body:new TextEncoder().encode('<svg onload=alert(1)>')});ok('non-image refused (415)',r.status===415);
r=await t.call('/api/upload',{method:'POST',cookie:CU,headers:{'Content-Type':'image/jpeg'},body:new TextEncoder().encode('GIF89a not really')});ok('image/jpeg header on a non-image still refused (magic bytes checked)',r.status===415);
const big=new Uint8Array(5*1024*1024+1);big.set(jpg().slice(0,3));r=await t.call('/api/upload',{method:'POST',cookie:CU,body:big});ok('over 5 MB refused (413)',r.status===413);
const exact=new Uint8Array(5*1024*1024);exact.set(jpg().slice(0,3));r=await t.call('/api/upload',{method:'POST',cookie:CU,body:exact});ok('exactly 5 MB accepted',r.status===200);
const paths=[];for(const [n,f] of [['jpeg',jpg],['png',png],['webp',webp]]){r=await t.call('/api/upload',{method:'POST',cookie:CU,body:f()});j=await r.json();ok('good '+n+' accepted and gets a safe generated name',r.status===200&&/^\/uploads\/img-[a-z0-9]+\.(jpg|png|webp)$/.test(j.path),JSON.stringify(j));paths.push(j.path);}
r=await t.call(paths[1]);ok('uploaded PNG is served with image/png and nosniff, no session needed',r.status===200&&r.headers.get('Content-Type')==='image/png'&&r.headers.get('X-Content-Type-Options')==='nosniff'&&(await r.arrayBuffer()).byteLength===100);
r=await t.call('/api/export',{ed:true,cookie:CU});j=await r.json();ok('export lists the uploaded images',j.images.length===4,JSON.stringify(j.images));
for(const bad of ['/uploads/..%2Fcontent.json','/uploads/%2e%2e%2fprevious.json','/uploads/img-x.svg','/uploads/content.json','/uploads/','/uploads/img:abcdefgh.jpg','/uploads/previous.json','/uploads/rl']){r=await t.call(bad);ok('uploads path trick refused: '+bad,r.status===404,r.status);}
r=await t.call('/uploads/img-doesnotexist1.jpg');ok('missing upload is 404',r.status===404);
// custom page
await t.call('/api/publish',P(Object.assign({},base,{custom:{'new-show':{title:'New show <b>',base:null}},seo:{'new-show':{title:'New "show" | Dave',description:'d<>'}}}),CU));
r=await t.call('/new-show');let h=await r.text();ok('saved custom page is served from the page template with its title',r.status===200&&/<title>New &quot;show&quot; \| Dave<\/title>/.test(h)&&!/class="cur"/.test(h)&&/noindex/.test(h),h);
r=await t.call('/new-show.html');ok('custom page also answers on .html',r.status===200);
r=await t.call('/nope');ok('unknown page falls through to static',r.headers.get('x-static')==='fallback');
// rate limit
t=mk();const T0=t.clock.t;
for(let i=0;i<4;i++){r=await t.login('wrong'+i);}ok('4 wrong guesses are plain 401s',r.r.status===401);
r=await t.login('wrong5');j=await r.r.json();ok('5th wrong guess in 15 minutes locks with a plain message (429)',r.r.status===429&&/wait 15 minutes/.test(j.error));
r=await t.login(PASS);ok('during the lock even the right passcode is refused (429)',r.r.status===429&&!r.cookie);
const writes=[...t.kv.m.keys()].length;await t.login('x');ok('refusals during the lock do not write to KV',[...t.kv.m.keys()].length===writes&&JSON.stringify([...t.kv.m.entries()]).length>0);
t.clock.t=T0+14*60*1000;r=await t.login(PASS);ok('still locked after 14 minutes',r.r.status===429);
t.clock.t=T0+16*60*1000+1;r=await t.login(PASS);ok('after 15 minutes the right passcode works again',r.r.status===200&&!!r.cookie);
t=mk();for(let i=0;i<4;i++)await t.login('bad');t.clock.t+=16*60*1000;r=await t.login('bad');ok('old failures older than 15 minutes do not count (401, not locked)',r.r.status===401);
t=mk();for(let i=0;i<3;i++)await t.login('bad');r=await t.login(PASS);ok('a good login still works before the limit',r.r.status===200);
r=await t.login('bad');r=await t.login('bad');r=await t.login('bad');ok('a good login clears the failure count (3 more wrong is not a lock)',r.r.status===401);
t=mk();let hit=false;for(let i=0;i<30;i++){t.clock.t+=4*60*1000;r=await t.login('bad'+i);if(r.r.status===429){hit=true;break;}}ok('slow guessing is capped per hour (10 an hour then locked)',hit);
// no bypass in production entry
const real=(await import('../_worker.js')).default;
r=await real.fetch(new Request('https://x.test/api/export',{headers:{'X-DY-Editor':'1','Cf-Access-Jwt-Assertion':'good-token','Authorization':'Bearer test-ok'}}),{CONTENT:fakeKV(),EDITOR_PASSCODE:PASS,ASSETS:fakeAssets({})});ok('production entry has no bypass: made-up headers do not sign anyone in (401)',r.status===401);
ok('worker source has no Access code or test hooks left',!/ACCESS_|Cf-Access|cloudflareaccess|test-ok/.test(fs.readFileSync(new URL('../_worker.js',import.meta.url),'utf8')));
const n=res.length,p=res.filter(Boolean).length;console.log('SUMMARY '+p+'/'+n);process.exit(p===n?0:1);
