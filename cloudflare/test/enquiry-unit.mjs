// Unit tests of POST /api/enquiry with fake Turnstile and Resend (no network, no real email): node cloudflare/test/enquiry-unit.mjs
import {makeWorker,safeName,validateEnquiry,buildEmail} from '../_worker.js';
import {fakeKV,fakeAssets} from './fake.mjs';
import fs from 'fs';
const res=[];const ok=(n,c,x)=>{res.push(!!c);console.log((c?'PASS ':'FAIL ')+n+(x&&!c?' '+String(x).slice(0,200):''));};
const SRC=fs.readFileSync(new URL('../_worker.js',import.meta.url),'utf8');
const TO=/ENQUIRY_DEFAULT_TO = '([^']+)'/.exec(SRC)[1];
const EXTRA=eval(/const ENQUIRY_EXTRA = (\[[^;]*\]);/.exec(SRC)[1]);
const KEY='re_unit_secret_key_123456',TSS='ts-unit-secret-123456';
const mk=(over={},fx={})=>{const calls={ts:[],rs:[]};const clock={t:1800000000000};
 const fetch=async(url,o)=>{if(/siteverify/.test(url)){calls.ts.push({url,o});if(fx.tsDown)throw new Error('down');return new Response(JSON.stringify({success:fx.tsFail?false:true}),{status:fx.tsStatus||200});}
  calls.rs.push({url,o,body:JSON.parse(o.body)});if(fx.rsThrow)throw new Error('net');return new Response(JSON.stringify({id:'x'}),{status:fx.rsStatus||200});};
 const w=makeWorker({now:()=>clock.t,fetch});
 const env=Object.assign({CONTENT:fakeKV(),RESEND_API_KEY:KEY,TURNSTILE_SECRET:TSS,TURNSTILE_SITEKEY:'1x00000000000000000000AA',ENQUIRY_FROM:'enquiries@send.example.test',EDITOR_PASSCODE:'unit-test-passcode-Abc234',ASSETS:fakeAssets({})},over);
 const call=(path,o={})=>w.fetch(new Request('https://x.test'+path,{method:o.method||'GET',headers:Object.assign({'CF-Connecting-IP':o.ip||'203.0.113.7'},o.headers||{}),body:o.body}),env);
 const stamp=async()=>(await (await call('/api/enquiry-config')).json()).stamp;
 const good=async(x={})=>{const st=await stamp();clock.t+=4000;const f={};EXTRA.forEach(e=>{f[e.label]=e.required?'2027-06-12':'Dublin';});return Object.assign({name:'Aoife Murphy',email:'aoife@example.com',phone:'087 123 4567',message:'Hello there.\nSecond line.',fields:f,website:'',stamp:st,token:'tok-pass-12345'},x);};
 const post=(b,o={})=>call('/api/enquiry',Object.assign({method:'POST',headers:Object.assign({'Content-Type':'application/json'},o.headers||{}),body:typeof b==='string'?b:JSON.stringify(b),ip:o.ip},{}));
 return {call,post,good,calls,env,clock,stamp};};
let t,r,j,b;
// config
t=mk();r=await t.call('/api/enquiry-config');j=await r.json();
ok('config says configured and gives the site key and a signed stamp',j.ok&&j.configured===true&&j.sitekey==='1x00000000000000000000AA'&&/^[0-9a-z]+\.[\w-]+$/.test(j.stamp)&&/no-store/.test(r.headers.get('cache-control'))&&/noindex/.test(r.headers.get('x-robots-tag')));
ok('config never contains a secret',!JSON.stringify(j).includes(KEY)&&!JSON.stringify(j).includes(TSS));
for(const miss of ['RESEND_API_KEY','TURNSTILE_SECRET','TURNSTILE_SITEKEY','ENQUIRY_FROM']){t=mk({[miss]:undefined});j=await (await t.call('/api/enquiry-config')).json();ok('config says not configured when '+miss+' is missing',j.ok&&j.configured===false&&!j.stamp&&!j.sitekey);}
// valid send
t=mk();b=await t.good();r=await t.post(b);j=await r.json();
ok('valid enquiry is accepted (200 ok)',r.status===200&&j.ok===true,JSON.stringify(j));
ok('Turnstile verified once with the secret and the token, from the official URL',t.calls.ts.length===1&&t.calls.ts[0].url==='https://challenges.cloudflare.com/turnstile/v0/siteverify'&&t.calls.ts[0].o.body.get('secret')===TSS&&t.calls.ts[0].o.body.get('response')==='tok-pass-12345'&&t.calls.ts[0].o.body.get('remoteip')==='203.0.113.7');
const m=t.calls.rs[0];
ok('one email goes to Resend\'s API with the bearer key',t.calls.rs.length===1&&m.url==='https://api.resend.com/emails'&&m.o.headers.Authorization==='Bearer '+KEY);
ok('From is the verified sender, To is the site inbox, Reply-To is the enquirer',/enquiries@send\.example\.test/.test(m.body.from)&&m.body.to.length===1&&m.body.to[0]===TO&&m.body.reply_to==='aoife@example.com');
ok('subject is built by the Function from a safe name',m.body.subject==='Website enquiry from Aoife Murphy');
ok('plain-text body has every field and the message',/Name: Aoife Murphy/.test(m.body.text)&&/Email: aoife@example.com/.test(m.body.text)&&/Phone: 087 123 4567/.test(m.body.text)&&/Hello there\.\nSecond line\./.test(m.body.text)&&EXTRA.every(e=>m.body.text.indexOf(e.label+': ')>-1));
ok('HTML body is present',/<table/.test(m.body.html)&&/Hello there\./.test(m.body.html));
ok('response carries no-store and noindex',/no-store/.test(r.headers.get('cache-control'))&&/noindex/.test(r.headers.get('x-robots-tag')));
ok('the secret key is not in any response',!JSON.stringify(j).includes(KEY));
// phone optional
t=mk();b=await t.good({phone:''});r=await t.post(b);ok('phone is optional',r.status===200&&!/Phone:/.test(t.calls.rs[0].body.text));
// honeypot
t=mk();b=await t.good({website:'http://spam.example'});r=await t.post(b);j=await r.json();ok('honeypot: pretends success, sends nothing and does not even call Turnstile',r.status===200&&j.ok===true&&t.calls.rs.length===0&&t.calls.ts.length===0);
// time trap
t=mk();b=await t.good();b.stamp=await t.stamp();t.clock.t+=1000;r=await t.post(b);j=await r.json();ok('time trap: under 3 s is rejected, nothing sent',r.status===400&&j.error==='too_fast'&&t.calls.rs.length===0&&t.calls.ts.length===0);
t=mk();b=await t.good();t.clock.t+=3600*1000*25;r=await t.post(b);j=await r.json();ok('a stamp older than 24 hours asks for a reload',r.status===400&&j.error==='stamp');
t=mk();b=await t.good({stamp:'zzzzzz.AAAAAAAAAAAAAAAAAAAAAAAA'});r=await t.post(b);ok('a forged stamp is refused',r.status===400&&(await r.json()).error==='stamp'&&t.calls.rs.length===0);
t=mk();b=await t.good({stamp:undefined});r=await t.post(b);ok('a missing stamp is refused',r.status===400&&t.calls.rs.length===0);
// turnstile
t=mk({},{tsFail:true});b=await t.good();r=await t.post(b);j=await r.json();ok('bad Turnstile token: refused, nothing sent',r.status===400&&j.error==='verification'&&t.calls.rs.length===0);
t=mk();b=await t.good({token:''});r=await t.post(b);ok('missing Turnstile token: refused before calling Turnstile',r.status===400&&t.calls.ts.length===0&&t.calls.rs.length===0);
t=mk({},{tsDown:true});b=await t.good();r=await t.post(b);j=await r.json();ok('Turnstile unreachable: honest 502, never success',r.status===502&&j.ok===false&&t.calls.rs.length===0);
// resend errors
for(const code of [401,422,429,500,503]){t=mk({},{rsStatus:code});b=await t.good();r=await t.post(b);j=await r.json();ok('Resend '+code+' gives an honest 502, never success',r.status===502&&j.ok===false&&j.error==='send_failed');}
t=mk({},{rsThrow:true});b=await t.good();r=await t.post(b);ok('Resend network error gives an honest 502',r.status===502&&(await r.json()).ok===false);
// injection
for(const [f,v] of [['name','Bob\r\nBcc: evil@example.com'],['name','Bob\nSubject: x'],['email','a@example.com\r\nBcc: e@example.com'],['phone','087 111 2222\n1']]){t=mk();b=await t.good({[f]:v});r=await t.post(b);ok('CR/LF in '+f+' is rejected (header injection), nothing sent',r.status===400&&t.calls.rs.length===0);}
t=mk();b=await t.good();b.fields[EXTRA[0].label]='x\r\nBcc: e@example.com';r=await t.post(b);ok('CR/LF in an extra field is rejected',r.status===400&&t.calls.rs.length===0);
ok('safeName strips control characters, angle brackets and caps the length',safeName('A\u0000B<script>')==='ABscript'&&safeName('x'.repeat(100)).length===40&&safeName('  ')==='a visitor'&&safeName('A   B')==='A B');
// escaping
t=mk();b=await t.good({name:'<b>Eve</b> & Co',message:'<script>alert(1)</script> "quoted" & <img src=x onerror=1>'});r=await t.post(b);const e2=t.calls.rs[0].body;
ok('HTML body escapes all user text',r.status===200&&!/<script|<img|<b>Eve/.test(e2.html)&&/&lt;script&gt;/.test(e2.html)&&/&amp; Co/.test(e2.html));
ok('plain-text body keeps the raw text and the subject has no angle brackets',/<script>alert\(1\)<\/script>/.test(e2.text)&&!/[<>]/.test(e2.subject));
// size and shape
t=mk();b=await t.good({message:'x'.repeat(5001)});r=await t.post(b);ok('over-long message (5001) is refused',r.status===400&&t.calls.rs.length===0);
t=mk();b=await t.good({message:'x'.repeat(5000)});r=await t.post(b);ok('message of exactly 5000 is accepted',r.status===200);
t=mk();b=await t.good({name:'n'.repeat(101)});r=await t.post(b);ok('over-long name is refused',r.status===400);
t=mk();r=await t.post('x'.repeat(30000));ok('oversize body is refused (413)',r.status===413&&t.calls.rs.length===0);
t=mk();r=await t.post('not json');ok('malformed JSON is refused (400)',r.status===400);
t=mk();r=await t.post('[1,2]');ok('a JSON array is refused (400)',r.status===400);
for(const e of ['nope','a@b','a b@example.com','<a@example.com>','a@example','@example.com']){t=mk();b=await t.good({email:e});r=await t.post(b);ok('bad email "'+e+'" is refused',r.status===400&&(await r.json()).field==='Email');}
t=mk();b=await t.good({name:'  '});r=await t.post(b);ok('blank name is refused',r.status===400&&(await r.json()).field==='Name');
t=mk();b=await t.good({message:''});r=await t.post(b);ok('blank message is refused',r.status===400&&(await r.json()).field==='Message');
t=mk();b=await t.good({name:{a:1}});r=await t.post(b);ok('a non-text name is refused',r.status===400);
const req=EXTRA.find(e=>e.required);if(req){t=mk();b=await t.good();b.fields[req.label]='';r=await t.post(b);ok('required extra field "'+req.label+'" is enforced',r.status===400&&(await r.json()).field===req.label);}
// method, origin, type
t=mk();r=await t.call('/api/enquiry');ok('GET /api/enquiry is 405',r.status===405);
t=mk();b=await t.good();r=await t.post(b,{headers:{Origin:'https://evil.example'}});ok('cross-origin POST is refused (403)',r.status===403&&t.calls.rs.length===0);
t=mk();b=await t.good();r=await t.post(b,{headers:{Origin:'https://x.test'}});ok('same-origin POST is fine',r.status===200);
t=mk();b=await t.good();r=await t.call('/api/enquiry',{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(b)});ok('non-JSON content type is refused (415)',r.status===415);
// missing secrets
for(const miss of ['RESEND_API_KEY','TURNSTILE_SECRET','TURNSTILE_SITEKEY','ENQUIRY_FROM']){t=mk({[miss]:undefined});r=await t.post({name:'a'});j=await r.json();ok('missing '+miss+' gives 503 not_set_up, never success, nothing called',r.status===503&&j.ok===false&&j.error==='not_set_up'&&t.calls.rs.length===0&&t.calls.ts.length===0);}
t=mk({RESEND_API_KEY:'short'});r=await t.post({name:'a'});ok('a too-short key counts as not set up',r.status===503);
// rate limit
t=mk();let codes=[];for(let i=0;i<7;i++){b=await t.good();r=await t.post(b);codes.push(r.status);}ok('rate limit: 5 sends per hour per IP, then 429',codes.join()==='200,200,200,200,200,429,429'&&t.calls.rs.length===5,codes.join());
t=mk();for(let i=0;i<5;i++){b=await t.good();await t.post(b);}b=await t.good();r=await t.post(b,{ip:'198.51.100.9'});ok('another IP is not limited',r.status===200);
t=mk();for(let i=0;i<5;i++){b=await t.good();await t.post(b);}t.clock.t+=3700*1000;b=await t.good();r=await t.post(b);ok('the limit resets after the hour',r.status===200);
t=mk();for(let i=0;i<5;i++){b=await t.good();await t.post(b);}ok('KV holds only counters under hashed keys: no IP, name or message',[...t.env.CONTENT.m.keys()].filter(k=>k.startsWith('enq:')).every(k=>/^enq:[0-9a-f]{16}:\d+$/.test(k)&&!k.includes('203'))&&[...t.env.CONTENT.m.values()].every(v=>!String(v.v).includes('Aoife')));
t=mk({CONTENT:undefined});for(let i=0;i<6;i++){b=await t.good();r=await t.post(b);}ok('without KV the limit still works in memory',r.status===429);
t=mk();for(let i=0;i<5;i++){b=await t.good({token:''});await t.post(b);}b=await t.good();r=await t.post(b);ok('refused (invalid) attempts do not use up the allowance',r.status===200);
// failed resend counts? it must not lock out forever
t=mk({},{rsStatus:500});for(let i=0;i<3;i++){b=await t.good();await t.post(b);}ok('KV write per accepted attempt only (3 attempts = 3 counter increments of one key)',[...t.env.CONTENT.m.keys()].filter(k=>k.startsWith('enq:')).length===1);
// no logging, no secrets in source
{const logs=[];const o=console.log,oe=console.error,ow=console.warn;console.log=console.error=console.warn=(...a)=>logs.push(a.join(' '));t=mk();b=await t.good({message:'SECRET-MESSAGE-TEXT'});await t.post(b);t=mk({},{rsStatus:500});b=await t.good({message:'SECRET-MESSAGE-TEXT'});await t.post(b);console.log=o;console.error=oe;console.warn=ow;ok('nothing is logged while handling enquiries',logs.length===0);}
ok('worker source holds no key, secret or console logging for the enquiry',!/console\.(log|error|warn)/.test(SRC)&&!/re_[A-Za-z0-9]{20,}/.test(SRC));
// existing routes unharmed
t=mk();r=await t.call('/api/export');ok('admin API still refuses without a session',r.status===401||r.status===403);
t=mk();r=await t.call('/privacy');ok('/privacy is not treated as a custom page',r.status===200&&r.headers.get('x-static')==='fallback');
// pure helpers
ok('buildEmail wraps a bare From address with the site name',/website <enquiries@send/.test(buildEmail({name:'A',email:'a@b.co',phone:'',message:'m',fields:[]},{ENQUIRY_FROM:'enquiries@send.x.ie'}).from));
ok('buildEmail keeps a From that already has a name',buildEmail({name:'A',email:'a@b.co',phone:'',message:'m',fields:[]},{ENQUIRY_FROM:'Dave <enquiries@send.x.ie>'}).from==='Dave <enquiries@send.x.ie>');
// privacy text: one constant in content.js, the same words on /privacy
{const js=fs.readFileSync(new URL('../../content.js',import.meta.url),'utf8'),pv=fs.readFileSync(new URL('../../privacy.html',import.meta.url),'utf8');
 const T=js.match(/var ENQ_PRIVACY="((?:[^"\\]|\\.)*)";/)[1].replace(/\\"/g,'"');const main=pv.slice(pv.indexOf('<main'),pv.indexOf('</main>')).replace(/<!--[\s\S]*?-->/g,'').replace(/<(p|h1|section|div)[^>]*>/g,' ').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/\s+/g,' ');
 ok('privacy.html contains the ENQ_PRIVACY text from content.js word for word',main.indexOf(T.replace(/\s+/g,' ').trim())>-1);
 ok('privacy text still has its two placeholders (not silently filled)',/\[contact email\]/.test(T)&&/\[Dave Young \/ business name, address, email\]/.test(T));
 ok('privacy.html is noindex and has a comment marking the placeholders',/name="robots" content="noindex/.test(pv)&&/PLACEHOLDERS/.test(pv));}
const n=res.length,p=res.filter(Boolean).length;console.log('SUMMARY '+p+'/'+n);process.exit(p===n?0:1);
