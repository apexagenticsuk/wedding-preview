// Round 4 site fixes (wedding): skip link target, https-safe form, focus ring, dock never steals a click, 44px targets, absolute og:image, Westlife shape.
const {chromium}=require('playwright');const B=process.argv[2]||'http://localhost:8765';const res=[];const ok=(n,c,x)=>{res.push([n,!!c]);console.log((c?'PASS ':'FAIL ')+n+(x?' '+x:''));};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:800},isMobile:true,hasTouch:true});const p=await ctx.newPage();const msgs=[];p.on('console',m=>msgs.push(m.type()+': '+m.text()));
for(const pg of ['index','videos','testimonials','faqs','blog','contact']){await p.goto(B+'/'+pg+'.html',{waitUntil:'networkidle'});
 const r=await p.evaluate(()=>({tab:document.getElementById('main').getAttribute('tabindex'),og:document.querySelector('meta[property="og:image"]').content,rob:document.querySelector('meta[name=robots]').content}));
 ok(pg+': #main is focusable (skip link lands on it)',r.tab==='-1');ok(pg+': og:image is absolute',/^https:\/\//.test(r.og),r.og);ok(pg+': noindex,nofollow',/noindex/.test(r.rob)&&/nofollow/.test(r.rob));
 const small=await p.evaluate(()=>[...document.querySelectorAll('a')].filter(a=>{const r=a.getBoundingClientRect(),cs=getComputedStyle(a);return r.width&&cs.visibility!=='hidden'&&!a.matches('.skip')&&(r.height<43.5||r.width<43.5);}).map(a=>a.textContent.trim().slice(0,20)+' '+Math.round(a.getBoundingClientRect().width)+'x'+Math.round(a.getBoundingClientRect().height)));
 ok(pg+': every link is at least 44px high and wide',small.length===0,small.slice(0,4).join('; '));}
// skip link really moves focus
await p.goto(B+'/index.html');await p.keyboard.press('Tab');await p.keyboard.press('Enter');await p.waitForTimeout(200);ok('skip link moves focus to #main',await p.evaluate(()=>document.activeElement&&document.activeElement.id==='main'));
// form
await p.goto(B+'/contact.html',{waitUntil:'networkidle'});
const f=await p.evaluate(()=>{const f=document.querySelector('form.enq');return {action:f.getAttribute('action'),mt:f.getAttribute('data-mailto'),vis:!!document.querySelector('form.enq .fine a[href^="mailto:"]')};});
ok('form has no insecure action attribute',f.action===null,String(f.action));ok('visible mailto link next to the form',f.vis&&/@/.test(f.mt||''));
ok('no mixed-content / insecure form console warnings',!msgs.some(m=>/mixed|insecure|not secure/i.test(m)),msgs.join(' | ').slice(0,200));
const em=p.locator('form.enq input[name=Email]');await em.focus();await p.keyboard.press('Shift+Tab');await p.keyboard.press('Tab');
const ring=await p.evaluate(()=>{const e=document.querySelector('form.enq input[name=Email]');const cs=getComputedStyle(e);return {w:parseFloat(cs.outlineWidth),st:cs.outlineStyle,focused:document.activeElement===e};});ok('email field shows a visible focus ring',ring.focused&&ring.w>=2&&ring.st!=='none',JSON.stringify(ring));
// submit builds a mailto without leaving the page
await p.evaluate(()=>{window.__nav=null;const d=Object.getOwnPropertyDescriptor(Location.prototype,'href');});
await p.fill('form.enq input[name=Name]','Test Person');await p.fill('form.enq input[name="Wedding date"]','2027-06-05');await p.fill('form.enq textarea','Hello');
const [req]=await Promise.all([p.waitForEvent('framenavigated',{timeout:1500}).catch(()=>null),p.click('form.enq button[type=submit]')]);await p.waitForTimeout(300);
ok('Send keeps the page where it is (opens the email app only)',/contact\.html/.test(p.url())&&!/\?Name=/.test(p.url()),p.url());
// FAQ: click each question at the bottom of the screen; dock must not steal the click
await p.goto(B+'/faqs.html',{waitUntil:'networkidle'});let stolen=0,n=await p.locator('summary').count();
for(let i=0;i<n;i++){const s=p.locator('summary').nth(i);await s.scrollIntoViewIfNeeded();const r=await s.boundingBox();await p.evaluate(y=>scrollBy(0,y),Math.max(0,r.y+r.height-(800-70)));const bb=await s.boundingBox();await p.touchscreen.tap(bb.x+30,bb.y+bb.height/2);await p.waitForTimeout(120);if(!/faqs\.html/.test(p.url())){stolen++;break;}}
ok('FAQ questions near the bottom edge never trigger the sticky dock',stolen===0,'questions '+n);
// westlife avatar is a circle like the others (item 2, round 6)
await p.goto(B+'/index.html',{waitUntil:'networkidle'});const w=await p.evaluate(()=>{const i=document.querySelector('.pr img[src*=av_westlife]');if(!i)return null;const r=i.getBoundingClientRect();const cs=getComputedStyle(i);return {w:r.width,h:r.height,rad:parseFloat(cs.borderTopLeftRadius),fit:cs.objectFit,cls:i.className};});
ok('Westlife avatar is a round circle crop (square box, 50% radius, cover)',w&&Math.abs(w.w-w.h)<0.6&&w.rad>=w.w/2-0.6&&w.fit==='cover'&&!/wide/.test(w.cls),JSON.stringify(w));

// round 5: menu Escape, 320px, 12px subtext, 8px gaps between taps
{const c2=await b.newContext({viewport:{width:320,height:700},isMobile:true,hasTouch:true});const q=await c2.newPage();
 for(const pg of ['index','videos','faqs','blog','contact']){await q.goto(B+'/'+pg+'.html',{waitUntil:'networkidle'});
  const r=await q.evaluate(()=>{const de=document.documentElement;const small=getComputedStyle(document.querySelector('.brand small')).fontSize;
   const els=[...document.querySelectorAll('footer a, header a, header button')].filter(e=>e.offsetParent!==null&&!e.matches('.skip')&&getComputedStyle(e).position!=='fixed');let min=99;
   for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){const a=els[i],b=els[j];if(a.contains(b)||b.contains(a))continue;const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();const dx=Math.max(x.left-y.right,y.left-x.right),dy=Math.max(x.top-y.bottom,y.top-x.bottom);if(dx<0&&dy<0)continue;const g=dx<0?dy:dy<0?dx:Math.max(dx,dy);if(g<min)min=g;}
   return {sw:de.scrollWidth-de.clientWidth,small:parseFloat(small),min};});
  ok(pg+' @320: no sideways scroll',r.sw<=0,'+'+r.sw);ok(pg+': logo subtext is 12px or more',r.small>=12,String(r.small));ok(pg+' @320: header/footer links are 8px+ apart',r.min>=7.5,String(r.min));}
 await q.goto(B+'/index.html',{waitUntil:'networkidle'});await q.click('button.ham');await q.keyboard.press('Escape');await q.waitForTimeout(200);
 const m=await q.evaluate(()=>({e:document.querySelector('button.ham').getAttribute('aria-expanded'),f:document.activeElement.className}));ok('Escape closes the menu with Menu button focused',m.e==='false',JSON.stringify(m));
 await q.click('button.ham');await q.focus('button.ham');await q.keyboard.press('Escape');await q.waitForTimeout(200);ok('Escape closes the menu (focus on button)',await q.evaluate(()=>document.querySelector('button.ham').getAttribute('aria-expanded'))==='false');
 await c2.close();}
await b.close();const bad=res.filter(r=>!r[1]).length;console.log('SUMMARY '+(res.length-bad)+'/'+res.length);process.exit(bad?1:0);})();
