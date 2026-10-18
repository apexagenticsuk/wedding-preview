// Enquiry form in a real browser: opens the email app (mailto) with the right subject/body, makes no network call, shows the fallback line.
// Usage: node tests/mailto.js <base> [page=/contact.html]   (CHROME env = browser path)
const {chromium}=require('playwright');
const base=process.argv[2];const page0=process.argv[3]||'/contact.html';
const res=[];const ok=(n,c,x)=>{res.push(!!c);console.log((c?'PASS ':'FAIL ')+n+(x&&!c?' '+String(x).slice(0,300):''));};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:900,height:900},permissions:['clipboard-read','clipboard-write']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.goto(base+page0);await p.waitForSelector('form.enq .enq-fallback');await p.waitForTimeout(800);
const to=await p.getAttribute('form.enq','data-mailto');
const e=await p.evaluate(()=>{const f=document.querySelector('form.enq');const q=s=>f.querySelector(s);const vis=el=>{if(!el)return false;const r=el.getBoundingClientRect(),st=getComputedStyle(el);return r.width>0&&r.height>0&&st.visibility!=='hidden'&&st.display!=='none';};
 return {note:q('.enq-note')&&q('.enq-note').textContent,notelink:q('.enq-note a')&&q('.enq-note a').getAttribute('href'),addr:q('.enq-addr')&&q('.enq-addr').textContent,addrHref:q('.enq-addr')&&q('.enq-addr').getAttribute('href'),addrVis:vis(q('.enq-addr')),copy:q('.enq-copy')&&q('.enq-copy').getBoundingClientRect().height,copyType:q('.enq-copy')&&q('.enq-copy').type,sel:q('.enq-addr')&&getComputedStyle(q('.enq-addr')).userSelect,hp:!!f.querySelector('.enq-hp,[name=website]'),ts:!!document.querySelector('.cf-turnstile,.enq-ts,iframe[src*=challenges]'),action:f.getAttribute('action'),checks:f.querySelectorAll('input[type=checkbox]').length,msgHidden:f.querySelector('.enq-msg').hidden};});
ok('privacy note beside the form is the short mailto wording with a privacy link',/^This opens your email app; nothing is stored on this site\. Your email is handled by your own email provider and the business\./.test(e.note)&&e.notelink==='privacy.html',e.note);
ok('fallback line shows the address as selectable text and a mailto link',e.addr===to&&e.addrHref==='mailto:'+to&&e.addrVis&&e.sel!=='none',JSON.stringify(e));
ok('small Copy button is there and is at least 44px high',e.copyType==='button'&&e.copy>=44,e.copy);
ok('no honeypot, no Turnstile, no form action, no checkboxes',!e.hp&&!e.ts&&e.action===null&&e.checks===0);
ok('status area is hidden until needed',e.msgHidden);
// fill everything
const NAME='Zoë "Z" O\'Brien & <Co>';const MSG='Hi!\nLine two: 100% sure #1 =x ?y\r\nLast line 😀';
const fill=async(msg)=>{for(const el of await p.$$('form.enq input:not([type=hidden]),form.enq textarea')){const n=await el.getAttribute('name'),t=await el.getAttribute('type');
  let v='Test '+n;if(n==='Name')v=NAME;else if(n==='Email')v='zoe@example.com';else if(n==='Phone')v='087 123 4567';else if(n==='Message')v=msg;else if(t==='date')v='2027-06-12';await el.fill(v);}};
await fill(MSG);
const cdp=await ctx.newCDPSession(p);await cdp.send('Page.enable');const navs=[];cdp.on('Page.frameRequestedNavigation',x=>navs.push(x.url));
const reqs=[];p.on('request',r=>{if(/^https?:/.test(r.url()))reqs.push(r.method()+' '+r.url());});
await p.click('form.enq button[type=submit]');await p.waitForTimeout(1200);
const u=navs.find(x=>x.startsWith('mailto:'));ok('Send opens a mailto link to the site address',!!u&&u.startsWith('mailto:'+to+'?subject='),JSON.stringify(navs).slice(0,200));
const m=u&&/^mailto:([^?]*)\?subject=([^&]*)&body=(.*)$/.exec(u);const subject=m&&decodeURIComponent(m[2]),body=m&&decodeURIComponent(m[3]);
ok('subject carries the form subject and the typed name',m&&/ - Zoë "Z" O'Brien & <Co>$/.test(subject)&&/nquiry/.test(subject),subject);
ok('body has every field with its label and the message with CRLF breaks',m&&body.indexOf('Name: '+NAME)>-1&&body.indexOf('Email: zoe@example.com')>-1&&body.indexOf('Phone: 087 123 4567')>-1&&body.indexOf('Message:\r\nHi!\r\nLine two: 100% sure #1 =x ?y\r\nLast line 😀')>-1,JSON.stringify(body));
ok('the URL itself has no raw space, quote, angle bracket or newline',u&&!/[\s"<>]/.test(u));
ok('no network request was made by pressing Send (no /api, no third party)',!reqs.some(r=>/\/api\/|challenges\.cloudflare|resend/.test(r))&&reqs.length===0,reqs.join());
ok('page stayed where it was and shows no error state',p.url().indexOf(page0.replace('.html',''))>-1&&!(await p.locator('text=could not be sent').count()));
// long message
navs.length=0;await fill('word '.repeat(2000));await p.click('form.enq button[type=submit]');await p.waitForTimeout(1000);
const u2=navs.find(x=>x.startsWith('mailto:'));const vis=await p.evaluate(()=>{const m=document.querySelector('form.enq .enq-msg');return !m.hidden&&m.textContent;});
ok('very long message: link length-safe and the visitor is told it was shortened',u2&&u2.length<=1900&&/shortened/.test(vis),(u2&&u2.length)+' '+vis);
// copy button
await p.click('form.enq .enq-copy');await p.waitForTimeout(500);const cp=await p.evaluate(async()=>({msg:document.querySelector('form.enq .enq-msg').textContent,clip:await navigator.clipboard.readText().catch(()=>null)}));
ok('Copy button copies the address and says so',cp.clip===to&&/copied/i.test(cp.msg),JSON.stringify(cp));
ok('no page errors',errs.length===0,errs.join());
await b.close();const n=res.length,pp=res.filter(Boolean).length;console.log('SUMMARY '+pp+'/'+n);process.exit(pp===n?0:1);})().catch(e=>{console.log('FAIL error '+String(e.stack||e).slice(0,400));process.exit(1);});
