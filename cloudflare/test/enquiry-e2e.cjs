// Enquiry form end to end: real browser, local wrangler dev, stub sender, Cloudflare's official Turnstile TEST keys.
// Usage: SITE=wedding|marta node cloudflare/test/enquiry-e2e.cjs <passBase> <failBase> <unconfiguredBase> <stubPort> [staticBase]
const {chromium}=require('playwright');const http=require('http');const fs=require('fs');
const SITE=process.env.SITE||'marta';const [PASSB,FAILB,UNCB,STUB,STATIC]=[process.argv[2],process.argv[3],process.argv[4],+process.argv[5],process.argv[6]];
const CFG={wedding:{to:'info@theweddingcomedian.ie',extra:{'Wedding date':'2027-06-12','Wedding location':'Galway'}},marta:{to:'info@martasmagic.com',extra:{'Location':'Dublin','Date of your event':'12 June'}}}[SITE];
const res=[];const ok=(n,c,x)=>{res.push(!!c);console.log((c?'PASS ':'FAIL ')+n+(x&&!c?' '+String(x).slice(0,300):''));};
const info=m=>console.log('INFO '+m);
const sent=[];let mode='ok';
const srv=http.createServer((q,r)=>{let b='';q.on('data',d=>b+=d);q.on('end',()=>{if(q.url==='/emails'&&q.method==='POST'){let j=null;try{j=JSON.parse(b);}catch(e){}sent.push({auth:q.headers.authorization,body:j});if(mode==='ok'){r.writeHead(200,{'content-type':'application/json'});r.end('{"id":"stub"}');}else{r.writeHead(mode==='422'?422:500,{'content-type':'application/json'});r.end('{"message":"stub failure"}');}}else{r.writeHead(404);r.end();}});});
const PRIV=fs.readFileSync(__dirname+'/../../content.js','utf8').match(/var ENQ_PRIVACY="((?:[^"\\]|\\.)*)";/)[1].replace(/\\"/g,'"');
const norm=s=>s.replace(/\s+/g,' ').trim();
const MSG="Hello! We'd love to book you.\nSecond line <b>bold?</b> & more.";
async function fillForm(p,extra){await p.fill('form.enq [name="Name"]','Aoife Murphy');await p.fill('form.enq [name="Email"]','aoife@example.com');await p.fill('form.enq [name="Phone"]','087 123 4567');
 for(const k of Object.keys(CFG.extra))await p.fill('form.enq [name="'+k+'"]',CFG.extra[k]);await p.fill('form.enq [name="Message"]',MSG);}
async function token(p){await p.waitForFunction(()=>{const t=document.querySelector('form.enq [name="cf-turnstile-response"]');return t&&t.value&&t.value.length>10;},null,{timeout:40000});}
async function open(b,base,path){const ctx=await b.newContext({viewport:{width:900,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));await p.goto(base+(path||'/contact'));p._t0=Date.now();p._errs=errs;return {ctx,p};}
(async()=>{await new Promise(r=>srv.listen(STUB,'127.0.0.1',r));
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
// 1. enhanced form, storage, full send
{const {ctx,p}=await open(b,PASSB);await p.waitForSelector('form.enq[data-enq-ok]',{timeout:15000});
 const e=await p.evaluate(()=>{const f=document.querySelector('form.enq');const hp=f.querySelector('.enq-hp input');return {hp:!!hp&&hp.tabIndex===-1&&hp.getAttribute('autocomplete')==='off'&&f.querySelector('.enq-hp').getAttribute('aria-hidden')==='true',hpOff:hp&&hp.getBoundingClientRect().right<0,fine:f.querySelector('.fine').textContent,link:(f.querySelector('.fine a')||{}).getAttribute&&f.querySelector('.fine a').getAttribute('href'),emailReq:f.querySelector('[name=Email]').required,msg:!!f.querySelector('.enq-msg')&&f.querySelector('.enq-msg').hidden,checked:[...f.querySelectorAll('input[type=checkbox]')].length,labels:[...f.querySelectorAll('input:not([tabindex="-1"]),textarea')].every(x=>x.closest('label')),ts:!!f.querySelector('.enq-ts')};});
 ok('form is upgraded: honeypot hidden from people and screen readers, Email required, status area ready',e.hp&&e.hpOff&&e.emailReq&&e.msg&&e.ts,JSON.stringify(e));
 ok('privacy text beside the form is Ben\'s text, word for word, followed by the link',norm(e.fine).startsWith(norm(PRIV))&&e.link==='privacy.html',e.fine.slice(0,80));
 ok('no pre-ticked boxes (there are no checkboxes) and every field has a label',e.checked===0&&e.labels);
 const before=await ctx.cookies();const ls0=await p.evaluate(()=>[Object.keys(localStorage),Object.keys(sessionStorage)]);
 const frames0=p.frames().filter(f=>/challenges\.cloudflare/.test(f.url())).length;
 ok('Turnstile is NOT loaded just by opening the page (only when the visitor clicks into the form)',frames0===0&&!(await p.evaluate(()=>!!window.turnstile)));
 info('storage before clicking into the form: cookies='+JSON.stringify(before.map(c=>c.name+'@'+c.domain))+' localStorage/sessionStorage='+JSON.stringify(ls0));
 await p.click('form.enq [name="Name"]');await token(p);await fillForm(p);
 const after=await ctx.cookies();const ls1=await p.evaluate(()=>[Object.keys(localStorage),Object.keys(sessionStorage)]);
 const fr=p.frames().filter(f=>/challenges\.cloudflare/.test(f.url()));let frs=[];for(const f of fr){try{frs.push(await f.evaluate(()=>({o:location.origin,ls:Object.keys(localStorage),ss:Object.keys(sessionStorage)})));}catch(e){frs.push('unreadable: '+String(e.message).slice(0,60));}}
 info('storage after Turnstile ran: cookies='+JSON.stringify(after.map(c=>({n:c.name,d:c.domain,path:c.path,exp:c.expires>0?Math.round((c.expires-Date.now()/1000)/60)+'min':'session',httpOnly:c.httpOnly,secure:c.secure,sameSite:c.sameSite})))+' page localStorage/sessionStorage='+JSON.stringify(ls1)+' turnstile frames='+JSON.stringify(frs));
 info('requests to third parties: see network list below');
 const wait=3600-(Date.now()-p._t0);if(wait>0)await p.waitForTimeout(wait);
 await p.click('form.enq button[type=submit]');await p.waitForSelector('.enq-thanks',{timeout:15000});
 const th=await p.evaluate(()=>({t:document.querySelector('.enq-thanks').textContent,focus:document.activeElement===document.querySelector('.enq-thanks'),role:document.querySelector('.enq-thanks').getAttribute('role'),formKept:!!document.querySelector('form.enq')}));
 ok('thank-you shows the exact wording and takes focus',th.t==="Thank you, your message has been sent. We'll reply by email."&&th.focus&&th.role==='status',JSON.stringify(th));
 ok('exactly one email reached the stub sender',sent.length===1);
 const m=sent[0]&&sent[0].body;
 ok('stub got the bearer key, From=verified sender, To=site inbox, Reply-To=enquirer',sent[0]&&sent[0].auth==='Bearer re_local_stub_key_000000'&&/enquiries@send\.example\.test/.test(m.from)&&m.to[0]===CFG.to&&m.reply_to==='aoife@example.com',JSON.stringify(m&&{f:m.from,t:m.to,r:m.reply_to}));
 ok('subject is built by the Function',m.subject==='Website enquiry from Aoife Murphy',m.subject);
 ok('every form field arrived, message kept as typed',/Phone: 087 123 4567/.test(m.text)&&Object.keys(CFG.extra).every(k=>m.text.indexOf(k+': '+CFG.extra[k])>-1)&&m.text.indexOf(MSG)>-1,m.text);
 ok('HTML in the message is escaped in the HTML email',m.html.indexOf('<b>bold?</b>')<0&&m.html.indexOf('&lt;b&gt;bold?&lt;/b&gt;')>-1);
 ok('no page errors',p._errs.length===0,p._errs.join());await ctx.close();}
// 2. honeypot: looks like success, sends nothing
{const n0=sent.length;const {ctx,p}=await open(b,PASSB);await p.waitForSelector('form.enq[data-enq-ok]');await p.click('form.enq [name="Name"]');await token(p);await fillForm(p);await p.evaluate(()=>{document.querySelector('form.enq [name=website]').value='http://spam.example';});
 const w=3600-(Date.now()-p._t0);if(w>0)await p.waitForTimeout(w);await p.click('form.enq button[type=submit]');await p.waitForSelector('.enq-thanks',{timeout:15000});
 ok('honeypot filled: the bot sees the thank-you, nothing is sent',sent.length===n0);await ctx.close();}
// 3. resend failing: honest error, text kept, then retry works
{const n0=sent.length;mode='500';const {ctx,p}=await open(b,PASSB);await p.waitForSelector('form.enq[data-enq-ok]');await p.click('form.enq [name="Name"]');await token(p);await fillForm(p);
 const w=3600-(Date.now()-p._t0);if(w>0)await p.waitForTimeout(w);await p.click('form.enq button[type=submit]');await p.waitForSelector('.enq-msg.err:not([hidden])',{timeout:15000});
 const e=await p.evaluate(()=>{const m=document.querySelector('.enq-msg');return {t:m.textContent,focus:document.activeElement===m,role:m.getAttribute('role'),href:m.querySelector('a')&&m.querySelector('a').getAttribute('href'),thanks:!!document.querySelector('.enq-thanks'),name:document.querySelector('[name=Name]').value,msg:document.querySelector('[name=Message]').value,dis:document.querySelector('form.enq button[type=submit]').disabled,desc:document.querySelector('textarea').getAttribute('aria-describedby')===m.id,id:m.id};});
 ok('Resend error: exact honest message with a mailto link, never a thank-you',e.t==='Sorry, your message could not be sent. Please try again, or email '+CFG.to+' directly.'&&e.href==='mailto:'+CFG.to&&!e.thanks,JSON.stringify(e));
 ok('error takes focus, is role=alert and is linked to the message box with aria-describedby',e.focus&&e.role==='alert'&&e.desc);
 ok('typed text is kept and the Send button works again',e.name==='Aoife Murphy'&&e.msg===MSG&&!e.dis);
 ok('the failed attempt did reach the sender (so it was a real send error)',sent.length===n0+1);
 mode='ok';await token(p);await p.click('form.enq button[type=submit]');await p.waitForSelector('.enq-thanks',{timeout:15000});ok('after the sender recovers, pressing Send again works (new spam-check token)',sent.length===n0+2);await ctx.close();}
// 4. Turnstile failing (official always-fail test secret)
{const n0=sent.length;const {ctx,p}=await open(b,FAILB);await p.waitForSelector('form.enq[data-enq-ok]');await p.click('form.enq [name="Name"]');await token(p);await fillForm(p);
 const w=3600-(Date.now()-p._t0);if(w>0)await p.waitForTimeout(w);await p.click('form.enq button[type=submit]');await p.waitForSelector('.enq-msg.err:not([hidden])',{timeout:15000});
 const e=await p.evaluate(()=>({t:document.querySelector('.enq-msg').textContent,thanks:!!document.querySelector('.enq-thanks'),msg:document.querySelector('[name=Message]').value}));
 ok('failed spam check: honest error, no thank-you, nothing sent, text kept',/could not be sent/.test(e.t)&&!e.thanks&&sent.length===n0&&e.msg===MSG,JSON.stringify(e));await ctx.close();}
// 5. validation error is specific and linked
{const {ctx,p}=await open(b,PASSB);await p.waitForSelector('form.enq[data-enq-ok]');await p.click('form.enq [name="Name"]');await token(p);await fillForm(p);await p.evaluate(()=>{const e=document.querySelector('[name=Email]');e.type='text';e.value='not-an-email';});
 const w=3600-(Date.now()-p._t0);if(w>0)await p.waitForTimeout(w);const n0=sent.length;await p.click('form.enq button[type=submit]');await p.waitForSelector('.enq-msg.err:not([hidden])',{timeout:15000});
 const e=await p.evaluate(()=>({t:document.querySelector('.enq-msg').textContent,inv:document.querySelector('[name=Email]').getAttribute('aria-invalid'),d:document.querySelector('[name=Email]').getAttribute('aria-describedby')===document.querySelector('.enq-msg').id}));
 ok('bad email from the server: plain message, field marked aria-invalid and linked',e.t==='Please check your email address.'&&e.inv==='true'&&e.d&&sent.length===n0,JSON.stringify(e));await ctx.close();}
// 6. Function present but not set up yet: honest error + mailto link, never success
{const {ctx,p}=await open(b,UNCB);await p.waitForSelector('form.enq[data-enq-ok]',{timeout:15000});await fillForm(p);await p.waitForTimeout(3600);const n0=sent.length;await p.click('form.enq button[type=submit]');await p.waitForSelector('.enq-msg.err:not([hidden])',{timeout:15000});
 const e=await p.evaluate(()=>({t:document.querySelector('.enq-msg').textContent,h:document.querySelector('.enq-msg a').getAttribute('href'),thanks:!!document.querySelector('.enq-thanks'),n:document.querySelector('[name=Name]').value,ts:!!window.turnstile}));
 ok('not set up (503): honest error with mailto link, no thank-you, Turnstile never loaded, nothing sent',/could not be sent/.test(e.t)&&e.h==='mailto:'+CFG.to&&!e.thanks&&!e.ts&&sent.length===n0&&e.n==='Aoife Murphy',JSON.stringify(e));await ctx.close();}
// 7. GitHub Pages style copy (no Function): original mailto behaviour
if(STATIC){const ctx=await b.newContext();const p=await ctx.newPage();await p.goto(STATIC+'/contact.html');await p.waitForTimeout(1500);
 const e=await p.evaluate(()=>({ok:!!document.querySelector('form.enq[data-enq-ok]'),hp:!!document.querySelector('.enq-hp'),fine:document.querySelector('form.enq .fine').textContent}));
 ok('static copy: form not upgraded, original mailto wording kept',!e.ok&&!e.hp&&/Sending opens your email app/.test(e.fine),JSON.stringify(e));
 const cdp=await ctx.newCDPSession(p);await cdp.send('Page.enable');const navs=[];cdp.on('Page.frameRequestedNavigation',x=>navs.push(x.url));
 await fillForm(p);await p.click('form.enq button[type=submit]');await p.waitForTimeout(1500);
 ok('static copy: Send still opens the email app (mailto with the details)',navs.some(u=>u.startsWith('mailto:'+CFG.to)&&/Aoife%20Murphy/.test(u)),JSON.stringify(navs).slice(0,200));await ctx.close();}
// 8. editor: the form inside the editor is not upgraded
{const ctx=await b.newContext({viewport:{width:1100,height:800}});const p=await ctx.newPage();await p.goto(PASSB+'/admin/?page=contact');await p.fill('#pass','local-test-passcode-0001');await p.click('#signin');await p.waitForSelector('#app:not([hidden])');
 await p.goto(PASSB+'/admin/?page=contact');await p.waitForFunction(()=>window.DYE&&document.querySelector('#frame').contentWindow.DYI&&document.querySelector('#frame').contentDocument.readyState==='complete',null,{timeout:30000});await p.waitForTimeout(1500);
 const e=await p.evaluate(()=>{const d=document.querySelector('#frame').contentDocument;return {form:!!d.querySelector('form.enq'),up:!!d.querySelector('form.enq[data-enq-ok]'),hp:!!d.querySelector('.enq-hp'),turn:!!document.querySelector('#frame').contentWindow.turnstile};});
 ok('in the editor the enquiry form is shown as before (not upgraded, no spam check loaded)',e.form&&!e.up&&!e.hp&&!e.turn,JSON.stringify(e));await ctx.close();}
// 9. privacy page
{const {ctx,p}=await open(b,PASSB,'/privacy');const r=await (await ctx.request.get(PASSB+'/privacy')).text();
 const t=await p.evaluate(()=>document.querySelector('main').innerText);
 ok('/privacy page carries Ben\'s text word for word',norm(t).indexOf(norm(PRIV))>-1,norm(t).slice(0,120));
 ok('/privacy keeps the placeholders visible and marked',(await p.locator('mark.ph').count())>=2&&/\[contact email\]/.test(t)&&/\[Dave Young \/ business name, address, email\]/.test(t));
 const hd=await ctx.request.get(PASSB+'/privacy');ok('/privacy is noindex (header and meta) and has the site header and footer',/noindex/.test(hd.headers()['x-robots-tag']||'')&&/name="robots" content="noindex/.test(r)&&await p.locator('header.top').count()===1&&await p.locator('footer').count()===1);
 ok('/privacy has no page errors',p._errs.length===0,p._errs.join());await ctx.close();}
await b.close();srv.close();const n=res.length,pp=res.filter(Boolean).length;console.log('SUMMARY '+pp+'/'+n);process.exit(pp===n?0:1);})().catch(e=>{console.log('FAIL error '+String(e.stack||e).slice(0,500));process.exit(1);});
