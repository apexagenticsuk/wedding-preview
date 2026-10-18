// Full-screen mobile menu: open/close, scroll lock, focus, Escape, tap size, anchors, reduced motion, desktop unchanged, no-JS. node tests/menu.js <base> [shotdir]
const {chromium}=require('playwright');const base=process.argv[2].replace(/\/$/,'');const shots=process.argv[3]||'';const name=process.env.SITE||'site';
const res=[];const ok=(n,c,x)=>{res.push(!!c);console.log((c?'PASS ':'FAIL ')+n+(x&&!c?' '+String(x).slice(0,260):''));};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
for(const W of [320,360,390,430,768]){const H=W<500?800:1000;const ctx=await b.newContext({viewport:{width:W,height:H},hasTouch:true,isMobile:W<500});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
 await p.goto(base+'/index.html');await p.waitForTimeout(900);
 const S=(n)=>p.evaluate(n);const T=async sel=>{const r=await p.locator(sel).first().boundingBox();await p.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);};
 const st0=await S(()=>{const n=document.getElementById('mnav'),h=document.querySelector('button.ham');return {nd:getComputedStyle(n).display,ae:h.getAttribute('aria-expanded'),cl:getComputedStyle(document.querySelector('.mclose')).display,hd:getComputedStyle(h).display,sh:document.documentElement.scrollHeight,items:n.querySelectorAll('a').length,brand:document.querySelector('.brand').getBoundingClientRect().top};});
 ok(W+': closed at load, button says collapsed, no close button visible, no onclick left',st0.nd==='none'&&st0.ae==='false'&&st0.cl==='none'&&st0.hd!=='none'&&await S(()=>!document.querySelector('button.ham').hasAttribute('onclick')),JSON.stringify(st0));
 await p.evaluate(()=>scrollTo({top:500,behavior:'instant'}));await p.waitForTimeout(400);const y0=await S(()=>scrollY);
 await T('button.ham');await p.waitForTimeout(300);
 const o=await S(()=>{const n=document.getElementById('mnav'),r=n.getBoundingClientRect(),c=document.querySelector('.mclose').getBoundingClientRect(),h=document.querySelector('button.ham');const as=[...n.querySelectorAll('a')].map(a=>{const q=a.getBoundingClientRect();return {t:q.top,b:q.bottom,l:q.left,r:q.right,h:q.height}});const sk=document.querySelector('.sticky');return {l:r.left,t:r.top,w:r.width,h:r.height,role:n.getAttribute('role'),lab:n.getAttribute('aria-label'),ae:h.getAttribute('aria-expanded'),fa:document.activeElement.className,inNav:n.contains(document.activeElement)||document.activeElement.classList.contains('mclose'),pos:document.body.style.position,top:document.body.style.top,sy:scrollY,cl:{w:c.width,h:c.height,l:c.left,t:c.top,r:c.right},as,sticky:sk?getComputedStyle(sk).display:'none',mainInert:!!document.querySelector('main').inert,ih:innerHeight,iw:innerWidth,topEl:document.elementFromPoint(innerWidth/2,innerHeight-5)&&document.elementFromPoint(innerWidth/2,innerHeight-5).closest('#mnav')!==null};});
 ok(W+': opens as a full-screen overlay (covers the whole window)',o.l===0&&o.t===0&&o.w>=o.iw-1&&o.h>=o.ih-1,JSON.stringify([o.l,o.t,o.w,o.h,o.iw,o.ih]));
 ok(W+': dialog semantics, label, aria-expanded true',o.role==='dialog'&&!!o.lab&&o.ae==='true');
 ok(W+': focus moved into the menu (on the close button)',o.inNav&&/mclose/.test(o.fa),o.fa);
 ok(W+': clear X close button, ≥48px, on screen',o.cl.w>=48&&o.cl.h>=48&&o.cl.r<=o.iw&&o.cl.t>=0);
 ok(W+': '+o.as.length+' menu links all ≥48px tall, inside the screen, gaps ≥8px',o.as.length===st0.items&&o.as.every(a=>a.h>=48&&a.l>=0&&a.r<=o.iw)&&o.as.every((a,i)=>i===0||a.t-o.as[i-1].b>=8),JSON.stringify(o.as.map(a=>[Math.round(a.h),Math.round(a.t)])));
 ok(W+': page behind is locked (fixed body keeps position) and inert; sticky call bar hidden',o.pos==='fixed'&&o.top==='-'+y0+'px'&&o.mainInert&&o.sticky==='none',JSON.stringify([o.pos,o.top,y0,o.mainInert,o.sticky]));
 await p.mouse.wheel(0,800);await p.waitForTimeout(150);ok(W+': scrolling the wheel/touch does not move the page behind',await S(()=>document.body.style.top)==='-'+y0+'px');
 if(shots&&W===390){await p.screenshot({path:shots+'/'+name+'-menu-open-390.png'});}
 if(shots&&W===768){await p.screenshot({path:shots+'/'+name+'-menu-open-768.png'});}
 // tab trap
 let trapped=true;for(let i=0;i<st0.items+3;i++){await p.keyboard.press('Tab');if(!await S(()=>{const n=document.getElementById('mnav');return n.contains(document.activeElement)||document.activeElement.classList.contains('mclose');}))trapped=false;}
 for(let i=0;i<3;i++){await p.keyboard.press('Shift+Tab');if(!await S(()=>{const n=document.getElementById('mnav');return n.contains(document.activeElement)||document.activeElement.classList.contains('mclose');}))trapped=false;}
 ok(W+': Tab and Shift+Tab stay inside the menu',trapped);
 await p.keyboard.press('Escape');await p.waitForTimeout(200);
 const c1=await S(()=>({nd:getComputedStyle(document.getElementById('mnav')).display,ae:document.querySelector('button.ham').getAttribute('aria-expanded'),f:document.activeElement.className,pos:document.body.style.position,sy:scrollY,inert:!!document.querySelector('main').inert,sh:document.documentElement.scrollHeight}));
 ok(W+': Escape closes, focus returns to the Menu button, scroll position restored, page usable again',c1.nd==='none'&&c1.ae==='false'&&/ham/.test(c1.f)&&c1.pos===''&&Math.abs(c1.sy-y0)<=1&&!c1.inert,JSON.stringify(c1));
 ok(W+': no layout shift from opening and closing (page height unchanged)',c1.sh===st0.sh,c1.sh+' vs '+st0.sh);
 await T('button.ham');await p.waitForTimeout(200);await T('.mclose');await p.waitForTimeout(200);
 ok(W+': the X button closes it and restores scroll',await S(()=>getComputedStyle(document.getElementById('mnav')).display==='none'&&scrollY>0&&document.activeElement.classList.contains('ham')));
 // anchor link
 await p.evaluate(()=>{scrollTo({top:0,behavior:'instant'});const a=document.createElement('a');a.href='#main';a.textContent='Skip test';a.id='__anch';document.getElementById('mnav').appendChild(a);});
 await T('button.ham');await p.waitForTimeout(200);await p.evaluate(()=>document.getElementById('__anch').scrollIntoView());await T('#__anch');await p.waitForTimeout(300);
 ok(W+': tapping an anchor link closes the menu and goes to the anchor',await S(()=>getComputedStyle(document.getElementById('mnav')).display==='none'&&location.hash==='#main'&&document.body.style.position===''));
 await p.evaluate(()=>document.getElementById('__anch').remove());
 // page link
 await T('button.ham');await p.waitForTimeout(200);const hrefs=await S(()=>[...document.querySelectorAll('#mnav a')].map(a=>[a.getAttribute('href'),a.target]));const first=hrefs.find(x=>/\.html$/.test(x[0])&&!x[1]&&!/index/.test(x[0]));
 if(first){await Promise.all([p.waitForNavigation({timeout:8000}).catch(()=>{}),T('#mnav a[href="'+first[0]+'"]')]);await p.waitForTimeout(500);ok(W+': tapping a page link goes there with the menu closed and the page scrollable',p.url().indexOf(first[0])>-1&&await S(()=>getComputedStyle(document.getElementById('mnav')).display==='none'&&document.body.style.position===''),p.url());}
 ok(W+': no page errors',errs.length===0,errs.join());
 await ctx.close();}
// reduced motion
{const ctx=await b.newContext({viewport:{width:390,height:800},reducedMotion:'reduce'});const p=await ctx.newPage();await p.goto(base+'/index.html');await p.waitForTimeout(600);await p.click('button.ham');await p.waitForTimeout(100);
 ok('reduced motion: no animation on the menu',await p.evaluate(()=>getComputedStyle(document.getElementById('mnav')).animationName==='none'));await ctx.close();}
// desktop unchanged
{const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();await p.goto(base+'/index.html');await p.waitForTimeout(700);
 const d=await p.evaluate(()=>({ham:document.querySelector('button.ham').getClientRects().length?'shown':'none',mn:getComputedStyle(document.getElementById('mnav')).display,cl:getComputedStyle(document.querySelector('.mclose')).display,nav:getComputedStyle(document.querySelector('nav.main')).display,w:document.querySelector('nav.main').getBoundingClientRect().width}));
 ok('desktop 1440: classic nav shown, no menu button, no overlay, no close button',d.ham==='none'&&d.mn==='none'&&d.cl==='none'&&d.nav!=='none'&&d.w>200,JSON.stringify(d));await ctx.close();}
// no JS
{const ctx=await b.newContext({viewport:{width:390,height:800},javaScriptEnabled:false});const p=await ctx.newPage();await p.goto(base+'/index.html');
 const r=await p.evaluate(()=>[...document.querySelectorAll('#mnav a')].map(a=>{const q=a.getBoundingClientRect();return [q.height,q.width,getComputedStyle(a).display]}));
 ok('no JS at 390: menu links are visible and at least 48px tall',r.length>=4&&r.every(x=>x[0]>=48&&x[1]>0),JSON.stringify(r));await ctx.close();}
await b.close();const n=res.length,pp=res.filter(Boolean).length;console.log('SUMMARY '+pp+'/'+n);process.exit(pp===n?0:1);})().catch(e=>{console.log('FAIL error '+String(e.stack||e).slice(0,500));process.exit(1);});
