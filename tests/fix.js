const {chromium}=require('playwright');
const BASE=process.argv[2]||'http://localhost:8765';
const res=[];const ok=(n,c,x)=>{res.push([n,!!c]);console.log((c?'PASS ':'FAIL ')+n+(x?' '+x:''));};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
async function open(mobile){const ctx=await b.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:1400,height:900}});
 await ctx.addInitScript(()=>{try{if(!sessionStorage.getItem('x')){localStorage.clear();localStorage.setItem('dy-mode','demo');sessionStorage.setItem('x','1');}}catch(e){}});
 const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/favicon|404|compute-pressure/.test(m.text()))p.errs.push(m.text())});
 await p.goto(BASE+'/admin/?page=index');await p.waitForFunction(()=>window.DYE&&window.DYE.state().content&&document.querySelector('#frame').contentWindow.DYI);await p.waitForTimeout(400);return p;}
const F=p=>p.frame({url:/edit=1/});
async function ready(p){await p.waitForFunction(()=>{try{return !!document.querySelector('#frame').contentWindow.DYI&&document.querySelector('#frame').contentDocument.readyState==='complete';}catch(e){return false}});await p.waitForTimeout(900);}
const st=p=>p.evaluate(()=>JSON.parse(JSON.stringify(window.DYE.state().content)));
const hist=p=>p.evaluate(()=>!document.querySelector('#undo').disabled);
async function box(p,sel,i=0){const h=(await F(p).$$(sel))[i];await h.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(100);return await h.boundingBox();}
async function mdrag(p,from,to,steps=15,hold=0,mid=null){await p.mouse.move(from.x,from.y);await p.waitForTimeout(60);await p.mouse.down();for(let i=1;i<=steps;i++){await p.mouse.move(from.x+(to.x-from.x)*i/steps,from.y+(to.y-from.y)*i/steps);await p.waitForTimeout(16);}if(hold)await p.waitForTimeout(hold);if(mid)await mid();await p.mouse.up();await p.waitForTimeout(150);}
async function tdrag(p,from,to,long=0,steps=15,hold=0,mid=null){const c=await p.context().newCDPSession(p);p._cdp=c;const t=(type,pt)=>c.send('Input.dispatchTouchEvent',{type,touchPoints:pt?[{x:pt.x,y:pt.y}]:[]});
 await t('touchStart',from);if(long)await p.waitForTimeout(long);for(let i=1;i<=steps;i++){await t('touchMove',{x:from.x+(to.x-from.x)*i/steps,y:from.y+(to.y-from.y)*i/steps});await p.waitForTimeout(16);}if(hold)await p.waitForTimeout(hold);if(mid)await mid();await t('touchEnd');await p.waitForTimeout(150);}
const ctr=r=>({x:r.x+r.width/2,y:r.y+r.height/2});
async function undo(p){await p.click('#undo');await ready(p);}
async function hover(p,sel,i=0){const r=await box(p,sel,i);await p.mouse.move(r.x+20,r.y+20);await p.waitForTimeout(200);}


const fy=p=>F(p).evaluate(()=>scrollY);
const line=p=>async()=>{const v=await F(p).evaluate(()=>{const i=document.querySelector('.dyd-ind');return !!i&&!i.hidden&&i.offsetWidth>=6&&i.offsetHeight>=6;}).catch(()=>false);const v2=await p.evaluate(()=>{const i=document.querySelector('#frame').contentDocument.querySelector('.dyd-ind');return !!i&&!i.hidden;});p._lines.push(v||v2);};
const nb=async(p,sel,i=0)=>(await F(p).$$(sel))[i].boundingBox();
const center=(p,sel,i=0)=>F(p).evaluate(([s,i])=>document.querySelectorAll(s)[i].scrollIntoView({block:'center',behavior:'instant'}),[sel,i]).then(()=>p.waitForTimeout(150));
async function setup(p){await p.evaluate(()=>{const L=window.DY_LIB;window.DYE.change(c=>{const P=c.pages.index=c.pages.index||{};P.secs={};
  P.secs.nA={blocks:[L.makeBlock(['heading','Section A']),L.makeBlock('text')]};const G=L.makeBlock('gallery');G.images=[1,2,3,4,5,6].map(n=>({src:'assets/gallery_'+n+'.jpg',alt:'g'+n,caption:''}));P.secs.nG={blocks:[G]};
  const Q=L.makeBlock('faq');P.secs.nF={blocks:[Q]};
  const o=[...(document.querySelector('#frame').contentDocument.querySelector('body>main')||document.querySelector('#frame').contentDocument.body).children].filter(e=>e.classList.contains('dy-sec')).map(e=>e.getAttribute('data-dy').split(' ')[0]);o.splice(2,0,'nA','nG','nF');P.order=o;},{reload:true});});await ready(p);}
const srcs=c=>c.pages.index.secs.nG.blocks[0].images.map(x=>x.alt).join();

for(const mobile of (process.env.ONLY==='phone'?[true]:process.env.ONLY==='desktop'?[false]:[false,true])){const M=mobile?'touch':'mouse';
let p=await open(mobile);p._lines=[];const drag=(a,b,o={})=>mobile?tdrag(p,a,b,o.long||0,15,o.hold||0,o.mid):mdrag(p,a,b,15,o.hold||0,o.mid);
await setup(p);
// 1 scroll kept after a block drop and after undo
await center(p,'[data-nsec="nA"]');let y0=await fy(p);if(!mobile){let r=await nb(p,'[data-nsec="nA"] [data-bid]',1);await p.mouse.move(r.x+30,r.y+10);}
let h=await nb(p,'[data-nsec="nA"] [data-bid] > .dy-dh.blk',1),t=await nb(p,'[data-nsec="nA"] [data-bid]',0);
await drag(ctr(h),{x:t.x+t.width/2,y:t.y+3},{mid:line(p)});await ready(p);await p.waitForTimeout(300);let y1=await fy(p);let c=await st(p);
ok(M+' 1: block drop applied',c.pages.index.secs.nA.blocks[0].type==='text');ok(M+' 1: scroll kept after drop',Math.abs(y1-y0)<6,y0+'→'+y1);
await undo(p);await p.waitForTimeout(300);let y2=await fy(p);ok(M+' 1: scroll kept after undo',Math.abs(y2-y0)<6,y0+'→'+y2);
// 1b section drop keeps scroll
await center(p,'[data-nsec="nG"]');y0=await fy(p);if(!mobile){let r=await nb(p,'[data-nsec="nG"]');await p.mouse.move(r.x+r.width-30,r.y+20);await p.waitForTimeout(150);}
h=await nb(p,'[data-nsec="nG"] > .dy-dh.sec');let s3=await nb(p,'[data-nsec="nA"]');let yd=null;await drag(ctr(h),{x:200,y:Math.max(60,s3.y+s3.height*0.3)},{hold:mobile?0:0,mid:async()=>{await line(p)();yd=await fy(p);}});y0=yd;await ready(p);await p.waitForTimeout(300);y1=await fy(p);
ok(M+' 1: section drop keeps scroll',Math.abs(y1-y0)<(mobile?130:6)&&(await st(p)).pages.index.order.join()!==c.pages.index.order.join(),y0+'→'+y1);await undo(p);
// 2 block onto the poster banner: refused with message; onto the Christmas party (image) section: accepted
await F(p).evaluate(()=>scrollTo({top:0,behavior:'instant'}));await p.waitForTimeout(150);
await center(p,'[data-nsec="nA"]');
// drag A's text up to the hero with auto-scroll, hold over the hero
if(!mobile){let r=await nb(p,'[data-nsec="nA"] [data-bid]',1);await p.mouse.move(r.x+30,r.y+10);}
h=await nb(p,'[data-nsec="nA"] [data-bid] > .dy-dh.blk',1);let fb=await (await p.$('#frame')).boundingBox();let before=JSON.stringify((await st(p)).pages.index);
let tipSeen=false;await drag(ctr(h),{x:fb.x+fb.width/2,y:fb.y+90},{hold:2500,mid:async()=>{if(mobile){const c=p._cdp;const mv=y=>c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:fb.x+fb.width/2,y}]});await mv(fb.y+6);await p.waitForTimeout(2500);const hr=await nb(p,'.hero.full');await mv(Math.max(fb.y+40,hr.y+hr.height/2));await p.waitForTimeout(600);}tipSeen=await p.evaluate(()=>{const fd=document.querySelector('#frame').contentDocument,t=fd.querySelector('.dyd-tip'),i=fd.querySelector('.dyd-ind.no');return !!(t&&!t.hidden&&i);});}});await ready(p);
console.log('DBG',tipSeen,JSON.stringify((await st(p)).pages.index)===before,await p.evaluate(()=>document.querySelector('#toast').textContent));ok(M+' 2: poster banner refuses with a red line + message',tipSeen&&JSON.stringify((await st(p)).pages.index)===before&&/poster/i.test(await p.evaluate(()=>document.querySelector('#toast').textContent)));
await center(p,'[data-nsec="nA"]');if(!mobile){let r=await nb(p,'[data-nsec="nA"] [data-bid]',1);await p.mouse.move(r.x+30,r.y+10);}
h=await nb(p,'[data-nsec="nA"] [data-bid] > .dy-dh.blk',1);
const party=await F(p).evaluate(()=>{const s=document.querySelector('section.aboutt');return [...(document.querySelector('body>main')||document.body).children].filter(e=>e.classList.contains('dy-sec')).indexOf(s);});
// put the party section right under A so both are on screen
await p.evaluate(i=>{window.DYE.change(c=>{const P=c.pages.index;const o=P.order.filter(x=>x!=='nA');const pid=o[i>2?i-1:i];o.splice(o.indexOf(pid),0,'nA');P.order=o;},{reload:true});},party);await ready(p);
await center(p,'[data-nsec="nA"]');if(!mobile){let r=await nb(p,'[data-nsec="nA"] [data-bid]',1);await p.mouse.move(r.x+30,r.y+10);}
h=await nb(p,'[data-nsec="nA"] [data-bid] > .dy-dh.blk',1);let pr=await nb(p,'section.aboutt img');
await drag(ctr(h),{x:pr.x+pr.width/2,y:Math.min(pr.y+pr.height/2,fb.y+fb.height-90)},{mid:line(p)});await ready(p);c=await st(p);
ok(M+' 2: block dropped on the image (Home bio teaser) section lands in it',Object.values(c.pages.index.ins||{}).flat().length===1&&c.pages.index.secs.nA.blocks.length===1);await undo(p);
// 3 FAQ handle sits on the right, away from the open/close arrow; FAQ reorder works
await center(p,'.blk-faq');if(!mobile){let r=await nb(p,'.blk-faq > details',0);await p.mouse.move(r.x+r.width/2,r.y+10);await p.waitForTimeout(150);}else{await F(p).tap('.blk-faq details:nth-child(2) p').catch(()=>{});await center(p,'.blk-faq');}
const geo=await F(p).evaluate(()=>{const d=document.querySelector('.blk-faq > details'),h=d.querySelector('.dy-dh.itm').getBoundingClientRect(),r=d.getBoundingClientRect();return h.left>r.left+r.width/2;});ok(M+' 3: FAQ handle away from the arrow (right side)',geo);
let fq0=JSON.stringify((await st(p)).pages.index.secs.nF.blocks[0].items.map(x=>x.q));h=await nb(p,'.blk-faq > details > .dy-dh.itm',0);let d2=await nb(p,'.blk-faq > details',2);
await drag(ctr(h),{x:d2.x+d2.width/2,y:d2.y+d2.height-3},{mid:line(p)});await ready(p);
ok(M+' 3: FAQ reorder',JSON.stringify((await st(p)).pages.index.secs.nF.blocks[0].items.map(x=>x.q))!==fq0);
// 9 gallery halves: left half of a target = before it, right half = after it (rows of 3 on desktop, 2 on phone)
for(const [side,exp] of [['left',null],['right',null]]){await center(p,'.blk-gallery');if(!mobile){let r=await nb(p,'.blk-gallery > figure',0);await p.mouse.move(r.x+40,r.y+40);await p.waitForTimeout(150);}else{await F(p).tap('.blk-gallery figure:nth-child(1) figcaption');await p.waitForTimeout(300);await center(p,'.blk-gallery');}
  const g0=srcs(await st(p));h=await nb(p,'.blk-gallery > figure > .dy-dh.itm',0);const T=await nb(p,'.blk-gallery > figure',3);
  await drag(ctr(h),{x:side==='left'?T.x+T.width*0.25:T.x+T.width*0.75,y:T.y+T.height/2},{mid:line(p)});await ready(p);const g1=srcs(await st(p)).split(',');const a0=g0.split(',');
  const want=a0.slice(1);want.splice(side==='left'?2:3,0,a0[0]);ok(M+' 9: gallery drop on '+side+' half of the 4th picture',g1.join()===want.join(),g0+' → '+g1.join());await undo(p);}
// 4 menu handle visible; dragging it does not open the side panel (desktop header only)
if(!mobile){await F(p).evaluate(()=>scrollTo({top:0,behavior:'instant'}));await p.waitForTimeout(150);
  const vis=await F(p).evaluate(()=>[...document.querySelectorAll('nav.main a .dy-dh.nav')].map(h=>+getComputedStyle(h).opacity));ok('mouse 4: every menu link has a visible handle',vis.length>=6&&vis.every(v=>v>=.8),vis.join());
  const n0=JSON.stringify((await st(p)).nav);h=await nb(p,'nav.main a .dy-dh.nav',0);let a3=await nb(p,'nav.main a:not(.btn)',3);
  await drag(ctr(h),{x:a3.x+a3.width*0.75,y:a3.y+a3.height/2},{mid:line(p)});await p.waitForTimeout(400);await ready(p);
  ok('mouse 4: menu handle drag reorders',JSON.stringify((await st(p)).nav)!==n0);ok('mouse 4: side panel stays closed after menu drag',await p.evaluate(()=>document.querySelector('#side').hidden));
  let l0=await nb(p,'nav.main a:not(.btn)',0);a3=await nb(p,'nav.main a:not(.btn)',4);await drag({x:l0.x+l0.width/2,y:l0.y+l0.height/2+4},{x:a3.x+a3.width*0.75,y:a3.y+a3.height/2});await p.waitForTimeout(400);await ready(p);
  ok('mouse 4: dragging the link itself also keeps the panel closed',await p.evaluate(()=>document.querySelector('#side').hidden));
  await undo(p);await undo(p);
  // 8 phone preview frame taller
  await p.click('#vphone');await p.waitForTimeout(300);const ph=(await (await p.$('#frame')).boundingBox()).height;ok('8: phone preview frame is taller',ph>=760,'height '+ph+' in a 900px window (was 794 max-844, now fills the stage)');await p.click('#vdesk');}
// 6 undo while Pages dialog is open (button and Ctrl+Z)
await p.click('#pagesb').catch(()=>p.tap('#pagesb'));await p.waitForSelector('#pagesm:not([hidden])');let rows=await p.$$('#plist .prow');await rows[2].evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(150);let ph=await (await rows[1].$('.ph')).boundingBox();let r4=await rows[4].boundingBox();
const nn0=JSON.stringify((await st(p)).nav);await drag(ctr(ph),{x:r4.x+r4.width/2,y:r4.y+r4.height*0.75},{long:mobile?500:0,mid:async()=>{p._lines.push(await p.evaluate(()=>{const i=document.querySelector('.dyd-ind');return !!i&&!i.hidden;}));}});await p.waitForTimeout(500);
const moved=JSON.stringify((await st(p)).nav)!==nn0;console.log('DBG3',moved,JSON.stringify(ph),JSON.stringify(r4),await p.evaluate(()=>[document.querySelector('#pundo').disabled,innerHeight,document.querySelector('#pundo').getBoundingClientRect().top]));await p.screenshot({path:'/tmp/t/pm.png'});await (mobile?p.tap('#pundo'):p.click('#pundo'));await p.waitForTimeout(500);
ok(M+' 6: Undo button inside Pages dialog',moved&&JSON.stringify((await st(p)).nav)===nn0&&await p.evaluate(()=>!document.querySelector('#pagesm').hidden));
if(!mobile){await p.keyboard.press('Control+Shift+Z');await p.waitForTimeout(300);const r=JSON.stringify((await st(p)).nav)!==nn0;await p.keyboard.press('Control+Z');await p.waitForTimeout(300);ok('mouse 6: Ctrl+Z / Ctrl+Shift+Z work with the dialog open',r&&JSON.stringify((await st(p)).nav)===nn0);}
await p.evaluate(()=>document.querySelector('#pagesm .x').click());await ready(p);
// 7 blank section: add it from the section picker, then drop a block into it
await F(p).evaluate(()=>scrollTo({top:0,behavior:'instant'}));await p.waitForTimeout(150);
await F(p).evaluate(()=>document.querySelectorAll('.dy-addsec button')[3].click());await p.waitForSelector('#pickm:not([hidden])');
ok(M+' 7: "Blank section" offered',!!(await p.$('#pickg .tile[data-k="empty"]')));await (mobile?p.tap('#pickg .tile[data-k="empty"]'):p.click('#pickg .tile[data-k="empty"]'));await ready(p);
c=await st(p);const emp=Object.keys(c.pages.index.secs).find(k=>!['nA','nG','nF'].includes(k));ok(M+' 7: blank section created empty',emp&&c.pages.index.secs[emp].blocks.length===0);
await center(p,'[data-nsec="'+emp+'"]');let er=await nb(p,'[data-nsec="'+emp+'"]');
await F(p).evaluate(()=>document.querySelector('[data-nsec="nA"]').scrollIntoView({block:'center',behavior:'instant'}));
// open the block picker from A's text and drag the Image tile into the blank section
await center(p,'[data-nsec="nA"] .blk-text p');await (mobile?F(p).tap('[data-nsec="nA"] .blk-text p'):F(p).click('[data-nsec="nA"] .blk-text p'));await p.waitForTimeout(300);
await (mobile?p.tap('#selbar button:has-text("Add below")'):p.click('#selbar button:has-text("Add below")'));await p.waitForSelector('#pickm:not([hidden])');
await F(p).evaluate(k=>document.querySelector('[data-nsec="'+k+'"]').scrollIntoView({block:'center',behavior:'instant'}),emp);await p.waitForTimeout(150);er=await nb(p,'[data-nsec="'+emp+'"]');
let tile=await (await p.$('#pickg .tile[data-k="image"]')).boundingBox();
await drag(ctr(tile),{x:er.x+er.width/2,y:er.y+er.height/2},{long:mobile?600:0,mid:line(p)});await ready(p);c=await st(p);
ok(M+' 7: block from picker dropped into the blank section',c.pages.index.secs[emp].blocks.length===1&&c.pages.index.secs[emp].blocks[0].type==='image');
ok(M+' 5: drop line visible during every drag ('+p._lines.length+' checked)',p._lines.length>=6&&p._lines.every(Boolean),JSON.stringify(p._lines));
ok(M+' editor: no JS errors',!p.errs.length,JSON.stringify(p.errs));
await p.context().close();}

/* stale drafts: an old demo draft (made before this content.json version) must not bring back DATE TBC */
{const ctx=await b.newContext({viewport:{width:1280,height:900}});const base=await (await fetch(BASE+'/content.json?x='+Date.now())).json();
 const old=JSON.parse(JSON.stringify(base));old.shows[0].note='DATE TBC';delete old.version;
 await ctx.addInitScript(o=>{if(!sessionStorage.getItem('y')){sessionStorage.setItem('y',1);localStorage.clear();localStorage.setItem('dy-mode','demo');localStorage.setItem('dy2-draft-demo',JSON.stringify({content:o,uploads:{}}));}},old);
 const p=await ctx.newPage();await p.goto(BASE+'/admin/?page=live');await p.waitForFunction(()=>{try{return document.querySelector('#frame').contentWindow.DYI}catch(e){}});await p.waitForTimeout(800);
 const txt=await p.frame({url:/edit=1/}).evaluate(()=>document.querySelector('[data-cms=shows] .show').innerText);
 ok('stale draft without the current version is dropped (no DATE TBC on Lucan)',!/TBC/.test(txt)&&await p.evaluate(()=>!localStorage.getItem('dy2-draft-demo')||JSON.parse(localStorage.getItem('dy2-draft-demo')).base),txt.replace(/\n/g,' '));
 // a current draft is kept
 await p.evaluate(()=>window.DYE.change(c=>{c.shows[0].note='KEEP ME';}));await p.reload();await p.waitForTimeout(2000);
 ok('a draft made from the current version is kept',/KEEP ME/.test(await p.frame({url:/edit=1/}).evaluate(()=>document.querySelector('[data-cms=shows] .show').innerText)));await ctx.close();}
await b.close();console.log('SUMMARY',res.filter(r=>r[1]).length+'/'+res.length);})().catch(e=>{console.error('CRASH',e);process.exit(1);});
