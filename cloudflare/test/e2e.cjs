// Editor against a local Pages dev server (serve.sh, throwaway passcode). Usage: node cloudflare/test/e2e.cjs [base]
// Passcode: PASS env var, default is the local throwaway one.
const {chromium}=require('playwright');
const KIND=process.env.SITE||'dave';
const CFG={dave:{f:'phone',val:'087 555 0142',undo:'087 000 1111',page:'/live',old:'087 261 6317',gal:null},
 wedding:{f:'tagline',val:'Cloudflare test tagline one',undo:'Cloudflare test tagline two',page:'/contact',old:'Available for your wedding in Ireland',gal:'/'},
 marta:{f:'tagline',val:'Cloudflare test tagline one',undo:'Cloudflare test tagline two',page:'/contact',old:"Fun, interactive shows for children",gal:'/gallery'}}[KIND];
const BASE=process.argv[2]||'http://localhost:8788';const PASS=process.env.PASS||'local-test-passcode-0001';
const res=[];const ok=(n,c,x)=>{res.push(!!c);console.log((c?'PASS ':'FAIL ')+n+(x&&!c?' '+x:''));};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
const mk=async()=>{const ctx=await b.newContext({viewport:{width:1400,height:900}});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));return {ctx,p};};
const ready=async p=>p.waitForFunction(()=>{try{return !!document.querySelector('#frame').contentWindow.DYI&&document.querySelector('#frame').contentDocument.readyState==='complete';}catch(e){return false;}},null,{timeout:20000});
const pubClick=async p=>{await p.click('#publish');await p.waitForSelector('#dlg:not([hidden])');await p.click('#dlg .btn.red, #dlg #dlg-ok',{timeout:3000}).catch(async()=>{await p.evaluate(()=>{[...document.querySelectorAll('#dlg button')].find(x=>/^Publish$/.test(x.textContent)).click();});});};
// 1. no session: sign-in box, wrong passcode refused, demo still works
{const {ctx,p}=await mk();await p.goto(BASE+'/admin/');await p.waitForSelector('#login:not([hidden])');
 ok('without a session the editor shows "Enter your passcode"',/Enter your passcode/.test(await p.textContent('#login'))&&await p.isVisible('#pass'));
 ok('no GitHub or key wording in the sign-in card',!/github|token|editor key/i.test(await p.textContent('#login')));
 await p.fill('#pass','definitely-wrong-passcode');await p.click('#signin');await p.waitForFunction(()=>/did not work/.test(document.querySelector('#loginmsg').textContent),null,{timeout:10000});
 ok('wrong passcode gives a plain message and the editor stays closed',await p.isHidden('#app')&&(await p.inputValue('#pass'))==='');
 ok('publish call from the page without a session is refused (401)',await p.evaluate(()=>fetch('/api/publish',{method:'POST',headers:{'X-DY-Editor':'1'},body:'{}'}).then(r=>r.status===401)));
 ok('export without a session is refused (401)',await p.evaluate(()=>fetch('/api/export',{headers:{'X-DY-Editor':'1'}}).then(r=>r.status===401)));
 await p.click('#demo');await p.waitForSelector('#app:not([hidden])');ok('demo mode still works',await p.isVisible('#demobadge'));await ctx.close();}
// 2. sign in with the passcode: edit, upload, publish
const {ctx,p}=await mk();
await p.goto(BASE+'/admin/');await p.waitForSelector('#login:not([hidden])');await p.fill('#pass',PASS);await p.click('#signin');await p.waitForSelector('#app:not([hidden])',{timeout:15000});
const ck=(await ctx.cookies()).find(c=>/dy_session/.test(c.name));
ok('session cookie is HttpOnly, Secure, SameSite=Strict, about 12 hours',!!ck&&ck.httpOnly&&ck.secure&&ck.sameSite==='Strict'&&Math.abs((ck.expires-Date.now()/1000)-43200)<120,JSON.stringify(ck&&{h:ck.httpOnly,s:ck.secure,ss:ck.sameSite}));
ok('the passcode is not in localStorage or sessionStorage and the box is cleared',await p.evaluate(pw=>JSON.stringify(localStorage)+JSON.stringify(sessionStorage)+document.getElementById('pass').value+document.cookie).then(x=>!x.includes(PASS)&&true,PASS).catch(()=>false)||false);
await p.goto(BASE+'/admin/?page=index');await p.waitForFunction(()=>window.DYE&&window.DYE.state().content&&document.querySelector('#frame').contentWindow.DYI,null,{timeout:20000});await ready(p);
ok('after signing in the editor opens in live mode (no DEMO badge, Sign out shown)',!(await p.isVisible('#demobadge'))&&/Sign out/.test(await p.textContent('#out')));
ok('no key, token or passcode item is stored in the browser',await p.evaluate(()=>!Object.keys(localStorage).concat(Object.keys(sessionStorage)).some(k=>/key|token|pass/i.test(k))));
const PH=CFG.val,F=CFG.f;
await p.evaluate(([ph,f])=>DYE.change(x=>{x.contact[f]=ph;},{reload:true}),[PH,F]);await ready(p);
if(CFG.gal){await p.evaluate(()=>DYE.change(x=>{x.posts[0].title='Cloudflare post title';x.gallery[0].alt='Cloudflare gallery alt';}));}
const up=await p.evaluate(async()=>{const cv=document.createElement('canvas');cv.width=40;cv.height=30;cv.getContext('2d').fillRect(0,0,40,30);const bl=await new Promise(r=>cv.toBlob(r,'image/png'));const path=await DYE.upload(new File([bl],'t.png',{type:'image/png'}),1600);DYE.change(x=>{x.clips[0].thumb=path;});return path;});
ok('picture upload made a local draft path',/^assets\/uploads\/img-/.test(up),up);
await pubClick(p);await p.waitForFunction(()=>/Saved\./.test(document.querySelector('#toast').textContent),null,{timeout:15000});
ok('success text is exactly: Saved. Your site updates within a minute.',(await p.textContent('#toast'))==='Saved. Your site updates within a minute.',await p.textContent('#toast'));
// 3. the public site (no session) shows it straight away
const pub=await mk();
await pub.p.goto(BASE+'/');const cj=await pub.p.evaluate(()=>fetch('/content.json',{cache:'no-store'}).then(r=>r.json()));
ok('public /content.json has the new text',cj.contact[F]===PH,cj.contact[F]);
const thumb=cj.clips[0].thumb;ok('picture path in saved content was swapped to /uploads/…',/^\/uploads\/img-[a-z0-9]+\.jpg$/.test(thumb),thumb);
const ir=await pub.p.evaluate(u=>fetch(u).then(r=>[r.status,r.headers.get('content-type')]),thumb);ok('uploaded picture is served publicly as an image',ir[0]===200&&ir[1]==='image/jpeg',ir.join(' '));
if(CFG.gal){await pub.p.goto(BASE+'/blog');await pub.p.waitForFunction(()=>document.body.innerText.indexOf('Cloudflare post title')>-1,null,{timeout:10000}).catch(()=>{});ok('blog page text shows the edited post title from saved content',(await pub.p.evaluate(()=>document.body.innerText)).indexOf('Cloudflare post title')>-1);
 await pub.p.goto(BASE+CFG.gal);await pub.p.waitForFunction(()=>!!document.querySelector('img[alt="Cloudflare gallery alt"]'),null,{timeout:10000}).catch(()=>{});ok('gallery picture shows the edited alt text from saved content',await pub.p.evaluate(()=>!!document.querySelector('img[alt="Cloudflare gallery alt"]')));}
await pub.p.goto(BASE+CFG.page);await pub.p.waitForFunction(ph=>document.body.innerText.indexOf(ph)>-1||document.documentElement.innerHTML.indexOf(ph.replace(/ /g,''))>-1,PH,{timeout:10000}).catch(()=>{});
const html=await pub.p.evaluate(()=>document.documentElement.innerHTML);const txt=await pub.p.evaluate(()=>document.body.innerText);
ok('visible page text shows the new text on the live page (overlay over the prerendered HTML)',txt.indexOf(PH)>-1&&txt.indexOf(CFG.old)<0,txt.slice(0,200));
ok('page has no JS errors',pub.p.errs.length===0,pub.p.errs.join('|'));
// flash measure: first paint of old phone before overlay?
await pub.ctx.close();
// 4. reload editor: shows the saved version; undo via Go back
await p.reload();await p.waitForFunction(()=>window.DYE&&window.DYE.state().content,null,{timeout:20000});
ok('editor reopens with the published content',await p.evaluate(([ph,f])=>DYE.state().content.contact[f]===ph,[PH,F]));
await p.click('#helpb');ok('Go back button is visible in live mode',await p.isVisible('#restore'));
const noPrev=await p.evaluate(()=>fetch('/api/export',{headers:{'X-DY-Editor':'1'}}).then(r=>r.json()).then(j=>j.hasPrevious));
// publish a second change so there is something to go back to
await p.click('#helpm [data-close]');
await p.evaluate(([f,v])=>DYE.change(x=>{x.contact[f]=v;}),[F,CFG.undo]);await pubClick(p);await p.waitForFunction(()=>/Saved\./.test(document.querySelector('#toast').textContent),null,{timeout:15000});
await p.waitForTimeout(3600);await p.click('#helpb');await p.click('#restore');await p.waitForSelector('#dlg:not([hidden])');await p.evaluate(()=>{[...document.querySelectorAll('#dlg button')].find(x=>/^Go back$/.test(x.textContent)).click();});
await p.waitForFunction(()=>/Saved\./.test(document.querySelector('#toast').textContent),null,{timeout:15000});
const after=await p.evaluate(()=>fetch('/content.json',{cache:'no-store'}).then(r=>r.json()));ok('Go back restores the previous published version',after.contact[F]===PH,after.contact[F]);
ok('editor shows the restored content after going back',await p.evaluate(([ph,f])=>DYE.state().content.contact[f]===ph,[PH,F]));
// 5. refused cases plain
const r1=await p.evaluate(()=>fetch('/api/publish',{method:'POST',headers:{'X-DY-Editor':'1'},body:'{nope'}).then(async r=>[r.status,(await r.json()).error]));ok('broken JSON refused plainly (400)',r1[0]===400,r1.join(' '));
const r2=await p.evaluate(()=>fetch('/api/upload',{method:'POST',headers:{'X-DY-Editor':'1'},body:'not an image'}).then(r=>r.status));ok('non-image upload refused (415)',r2===415);
ok('no page errors in the editor',p.errs.length===0,p.errs.join('|'));
// 6. sign out
await p.click('#out');await p.waitForSelector('#login:not([hidden])',{timeout:10000});ok('Sign out returns to the passcode box and ends the session',await p.evaluate(()=>fetch('/api/session').then(r=>r.json()).then(j=>j.signedIn===false)));
// 7. response headers
const h=await p.evaluate(()=>fetch('/content.json').then(r=>r.headers.get('x-robots-tag')));ok('Function responses carry X-Robots-Tag noindex, nofollow',h==='noindex, nofollow',h);
await b.close();const n=res.length,k=res.filter(Boolean).length;console.log('SUMMARY '+k+'/'+n);process.exit(k===n?0:1);})().catch(e=>{console.error(e.message);process.exit(1);});
