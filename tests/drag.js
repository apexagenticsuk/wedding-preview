const {chromium}=require('playwright');
const BASE=process.argv[2]||'http://localhost:8765';
const res=[];const ok=(n,c,x)=>{res.push([n,!!c]);console.log((c?'PASS ':'FAIL ')+n+(x?' '+x:''));};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
async function open(mobile){const ctx=await b.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:1400,height:900}});
 await ctx.addInitScript(()=>{try{if(!sessionStorage.getItem('x')){localStorage.clear();localStorage.setItem('dy-mode','demo');sessionStorage.setItem('x','1');}}catch(e){}});
 const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/favicon|404|compute-pressure/.test(m.text()))p.errs.push(m.text())});
 await p.goto(BASE+'/admin/?page=index');await p.waitForFunction(()=>window.DYE&&window.DYE.state().content&&document.querySelector('#frame').contentWindow.DYI);await p.waitForTimeout(400);return p;}
const F=p=>p.frame({url:/edit=1/});
async function ready(p){await p.waitForFunction(()=>{try{return !!document.querySelector('#frame').contentWindow.DYI&&document.querySelector('#frame').contentDocument.readyState==='complete';}catch(e){return false}});await F(p).evaluate(()=>Promise.all([...document.images].map(i=>{i.loading='eager';return i.complete?0:new Promise(r=>{i.onload=i.onerror=r;});})));await p.waitForTimeout(900);}
const st=p=>p.evaluate(()=>JSON.parse(JSON.stringify(window.DYE.state().content)));
const hist=p=>p.evaluate(()=>!document.querySelector('#undo').disabled);
async function box(p,sel,i=0){const h=(await F(p).$$(sel))[i];await h.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(100);return await h.boundingBox();}
async function mdrag(p,from,to,steps=15,hold=0){await p.mouse.move(from.x,from.y);await p.waitForTimeout(60);await p.mouse.down();for(let i=1;i<=steps;i++){await p.mouse.move(from.x+(to.x-from.x)*i/steps,from.y+(to.y-from.y)*i/steps);await p.waitForTimeout(16);}if(hold)await p.waitForTimeout(hold);await p.mouse.up();await p.waitForTimeout(150);}
async function tdrag(p,from,to,long=0,steps=15,hold=0,mid=null){const c=await p.context().newCDPSession(p);p._cdp=c;const t=(type,pt)=>c.send('Input.dispatchTouchEvent',{type,touchPoints:pt?[{x:pt.x,y:pt.y}]:[]});
 await t('touchStart',from);if(long)await p.waitForTimeout(long);for(let i=1;i<=steps;i++){await t('touchMove',{x:from.x+(to.x-from.x)*i/steps,y:from.y+(to.y-from.y)*i/steps});await p.waitForTimeout(16);}if(hold)await p.waitForTimeout(hold);if(mid)await mid();await t('touchEnd');await p.waitForTimeout(150);}
const ctr=r=>({x:r.x+r.width/2,y:r.y+r.height/2});
async function undo(p){await p.click('#undo');await ready(p);}
async function hover(p,sel,i=0){const r=await box(p,sel,i);await p.mouse.move(r.x+20,r.y+20);await p.waitForTimeout(200);}

/* ===== desktop, mouse ===== */
let p=await open(false);
const order0=(await F(p).evaluate(()=>[...(document.querySelector('body>main')||document.body).children].filter(e=>e.classList.contains('dy-sec')).map(e=>e.getAttribute('data-dy').split(' ')[0])));
// 1 section drag: 2nd section below the 4th
const PI=await F(p).evaluate(()=>{const S=[...document.querySelectorAll('.dy-sec')];for(let i=1;i<S.length-1;i++){const a=S[i].getBoundingClientRect(),b=S[i+1].getBoundingClientRect();if(b.bottom-a.top<640)return i;}return 1;});
await F(p).evaluate(i=>{const s=document.querySelectorAll('.dy-sec')[i];scrollTo({top:s.getBoundingClientRect().top+scrollY-30,behavior:'instant'});},PI);await p.waitForTimeout(200);
let h=await (await F(p).$$('.dy-sec >.dy-dh.sec'))[PI+1].boundingBox();let tgt=await (await F(p).$$('.dy-sec'))[PI].boundingBox();await p.mouse.move(h.x+5,h.y+5);await p.waitForTimeout(150);
await mdrag(p,ctr(h),{x:700,y:tgt.y+5});await ready(p);
let c=await st(p);ok('mouse: drag section on the page',c.pages.index&&c.pages.index.order&&c.pages.index.order.join()!==order0.join(),JSON.stringify(c.pages.index&&c.pages.index.order));
await undo(p);c=await st(p);ok('undo section drag',!(c.pages.index&&c.pages.index.order)||c.pages.index.order.join()===order0.join());
// 2 auto-scroll: hold near the bottom edge
await F(p).evaluate(()=>scrollTo({top:0,behavior:'instant'}));await p.waitForTimeout(100);await hover(p,'.dy-sec',1);h=await box(p,'.dy-sec >.dy-dh.sec',1);const fb=await (await p.$('#frame')).boundingBox();
const y0=await F(p).evaluate(()=>scrollY);await mdrag(p,ctr(h),{x:700,y:fb.y+fb.height-8},10,2500);await ready(p);
c=await st(p);const yAfter=c.pages.index&&c.pages.index.order?c.pages.index.order.indexOf(order0[1]):-1;ok('auto-scroll near the edge while dragging (section moved down past the screen)',yAfter>2,'new index '+yAfter);
await undo(p);
// 3 built list items (live page: the three 'xmas' bullets): drag 1st to end
await p.evaluate(()=>DYE.goPage('live'));await ready(p);
await hover(p,'.xmasl > li',0);h=await box(p,'.xmasl > li > .dy-dh.itm',0);let last=await (await F(p).$$('.xmasl > li'))[2].boundingBox();
await mdrag(p,ctr(h),{x:last.x+last.width/2,y:last.y+last.height-2});await ready(p);c=await st(p);
ok('mouse: reorder list items on a built page',c.pages.live&&c.pages.live.lists&&JSON.stringify(Object.values(c.pages.live.lists)).includes('"1","2","0"'),JSON.stringify(c.pages.live&&c.pages.live.lists));
await undo(p);await p.evaluate(()=>DYE.goPage('index'));await ready(p);
// 4 picker drag: open picker via + Add block on a section, drag "Text" tile onto the page
await F(p).click('#live h2');await p.waitForTimeout(200);await p.click('#selbar button:has-text("Add below")');await p.waitForSelector('#pickm:not([hidden])');
let tile=await (await p.$('#pickg .tile[data-k="text"]')).boundingBox();let dest=await box(p,'.aboutt h2');
await mdrag(p,ctr(tile),{x:dest.x+50,y:dest.y+dest.height+200},20);await ready(p);c=await st(p);
const ins=c.pages.index&&c.pages.index.ins||{};const nIns=Object.values(ins).flat().length;ok('mouse: drag a new block from the picker onto the page',nIns===1&&Object.values(ins).flat()[0].type==='text',JSON.stringify(Object.keys(ins)));
await undo(p);c=await st(p);ok('undo picker drop',!Object.values((c.pages.index||{}).ins||{}).flat().length);
// setup: small sections A and B (heading + text each) and C (cards, testimonials, gallery)
await p.evaluate(()=>{const L=window.DY_LIB;window.DYE.change(c=>{const P=c.pages.index=c.pages.index||{};P.secs=P.secs||{};
 P.secs.nA={blocks:[L.makeBlock(['heading','Section A']),L.makeBlock('text')]};P.secs.nB={blocks:[L.makeBlock(['heading','Section B']),L.makeBlock('text')]};
 const C=L.makeSection('cards');const Q=L.makeBlock('quotes');Q.items.forEach((q,i)=>q.who='Person '+(i+1));C.blocks.push(Q,L.makeBlock('gallery'));P.secs.nC=C;
 const o=[...(document.querySelector('#frame').contentDocument.querySelector('body>main')||document.querySelector('#frame').contentDocument.body).children].filter(e=>e.classList.contains('dy-sec')).map(e=>e.getAttribute('data-dy').split(' ')[0]);o.splice(3,0,'nA','nB','nC');P.order=o;},{reload:true});});
await ready(p);
const nb=async(sel,i=0)=>(await F(p).$$(sel))[i].boundingBox();
const types=c=>k=>c.pages.index.secs[k].blocks.map(x=>x.type).join();
await F(p).evaluate(()=>document.querySelector('[data-nsec="nA"]').scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(150);
// 5 block within a section: A's text above A's heading
await p.mouse.move((await nb('[data-nsec="nA"] [data-bid]',1)).x+30,(await nb('[data-nsec="nA"] [data-bid]',1)).y+10);await p.waitForTimeout(150);
h=await nb('[data-nsec="nA"] [data-bid] > .dy-dh.blk',1);let first=await nb('[data-nsec="nA"] [data-bid]',0);
await mdrag(p,ctr(h),{x:first.x+first.width/2,y:first.y+2});await ready(p);c=await st(p);
ok('mouse: drag a block within its section',types(c)('nA')==='text,heading',types(c)('nA')+JSON.stringify(c.pages.index.ins)+JSON.stringify([h,first]));
// 6 block between sections: A's heading (now 2nd) into B between its heading and text
await F(p).evaluate(()=>{document.querySelector('[data-nsec="nA"]').scrollIntoView({block:'start',behavior:'instant'});scrollBy({top:60,behavior:'instant'});});await p.waitForTimeout(200);await p.waitForTimeout(150);
let hb2=await nb('[data-nsec="nA"] [data-bid]',1);await p.mouse.move(hb2.x+30,hb2.y+10);await p.waitForTimeout(150);h=await nb('[data-nsec="nA"] [data-bid] > .dy-dh.blk',1);
let bt=await nb('[data-nsec="nB"] [data-bid]',1);await mdrag(p,ctr(h),{x:bt.x+bt.width/2,y:bt.y+2});await ready(p);c=await st(p);
ok('mouse: drag a block into another section',types(c)('nA')==='text'&&types(c)('nB')==='heading,heading,text',types(c)('nA')+' | '+types(c)('nB'));
await undo(p);c=await st(p);ok('undo block move between sections',types(c)('nA')==='text,heading'&&types(c)('nB')==='heading,text');
// 7 gallery pictures, 8 cards, 9 testimonials in blocks
for(const [name,blk,item,arr] of [['gallery pictures','.blk-gallery','figure','images'],['cards','.blk-cards','.card','items'],['testimonials (block)','.blk-quotes','.tcard','items']]){
 const before=JSON.stringify((await st(p)).pages.index.secs);await F(p).evaluate(s=>document.querySelector(s).scrollIntoView({block:'center',behavior:'instant'}),blk);await p.waitForTimeout(150);
 let i0=await nb(`${blk} > ${item}`,0);await p.mouse.move(i0.x+40,i0.y+40);await p.waitForTimeout(150);h=await nb(`${blk} > ${item} > .dy-dh.itm`,0);let l2=await nb(`${blk} > ${item}`,2);
 await mdrag(p,ctr(h),{x:l2.x+l2.width-2,y:l2.y+l2.height/2});await ready(p);const after=JSON.stringify((await st(p)).pages.index.secs);ok('mouse: reorder '+name,before!==after,await F(p).evaluate(b=>document.querySelectorAll(b+' .dy-dh.itm').length,blk));}
// 10 menu link drag (desktop header)
await F(p).evaluate(()=>scrollTo({top:0,behavior:'instant'}));await p.waitForTimeout(150);
let n0=(await st(p)).nav;let links=await F(p).$$('nav.main a:not(.btn)');let a0=await links[0].boundingBox(),a3=await links[3].boundingBox();
await mdrag(p,ctr(a0),{x:a3.x+a3.width-2,y:a3.y+a3.height/2});await ready(p);c=await st(p);ok('mouse: drag menu links in the header',c.nav&&JSON.stringify(c.nav)!==JSON.stringify(n0),c.nav&&c.nav.map(x=>x.key).join());
await undo(p);c=await st(p);ok('undo menu drag',JSON.stringify(c.nav)===JSON.stringify(n0));
// 11 pages modal drag
await p.click('#pagesb');await p.waitForSelector('#pagesm:not([hidden])');let rows=await p.$$('#plist .prow');let ph=await (await rows[1].$('.ph')).boundingBox();let r4=await rows[4].boundingBox();
await mdrag(p,ctr(ph),{x:r4.x+r4.width/2,y:r4.y+r4.height-3});await p.waitForTimeout(500);c=await st(p);ok('mouse: drag pages in Pages & menu',c.nav&&c.nav.map(x=>x.key).join()!==(n0||[]).map(x=>x.key).join(),c.nav&&c.nav.map(x=>x.key).join());
await p.click('#pagesm [data-close]');await ready(p);
const saved=await st(p);require('fs').writeFileSync(require('os').tmpdir()+'/saved_desktop.json',JSON.stringify(saved,null,1));
ok('desktop editor: no JS errors',!p.errs.length,JSON.stringify(p.errs));await p.context().close();

/* ===== phone, touch ===== */
p=await open(true);
const mo0=(await F(p).evaluate(()=>[...(document.querySelector('body>main')||document.body).children].filter(e=>e.classList.contains('dy-sec')).map(e=>e.getAttribute('data-dy').split(' ')[0])));
await F(p).evaluate(()=>document.querySelectorAll('.dy-sec > .dy-dh.sec')[2].scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(200);
h=await (await F(p).$$('.dy-sec >.dy-dh.sec'))[2].boundingBox();await tdrag(p,ctr(h),{x:200,y:ctr(h).y-260},0,12);await ready(p);
c=await st(p);ok('touch: drag section with handle (no scroll fight)',c.pages.index&&c.pages.index.order&&c.pages.index.order.join()!==mo0.join());
await undo(p);
// touch: block + items need content
await p.evaluate(()=>{const L=window.DY_LIB;window.DYE.change(c=>{const P=c.pages.index=c.pages.index||{};P.secs={nA:L.makeSection('gallery')};P.secs.nA.blocks.push(L.makeBlock('text'));const o=[...(document.querySelector('#frame').contentDocument.querySelector('body>main')||document.querySelector('#frame').contentDocument.body).children].filter(e=>e.classList.contains('dy-sec')).map(e=>e.getAttribute('data-dy').split(' ')[0]);o.splice(2,0,'nA');P.order=o;},{reload:true});});await ready(p);
const nbm=async(sel,i=0)=>(await F(p).$$(sel))[i].boundingBox();
await F(p).evaluate(()=>document.querySelectorAll('[data-nsec="nA"] [data-bid]')[2].scrollIntoView({block:'end',behavior:'instant'}));await p.waitForTimeout(200);
h=await nbm('[data-nsec="nA"] [data-bid] > .dy-dh.blk',2);first=await nbm('[data-nsec="nA"] [data-bid]',1);
await tdrag(p,ctr(h),{x:first.x+first.width/2,y:first.y+3});await ready(p);c=await st(p);ok('touch: drag a block',c.pages.index.secs.nA.blocks.map(x=>x.type).join()==='heading,gallery,text',c.pages.index.secs.nA.blocks.map(x=>x.type).join());
// touch items: tap section to select, then drag gallery figure handle
await F(p).evaluate(()=>document.querySelector('.blk-gallery').scrollIntoView({block:'center',behavior:'instant'}));await F(p).tap('.blk-gallery figure figcaption');await p.waitForTimeout(300);
await F(p).evaluate(()=>document.querySelector('.blk-gallery').scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(200);
ok('touch: tapping a section shows its item handles',await F(p).evaluate(()=>getComputedStyle(document.querySelector('.blk-gallery .dy-dh.itm')).opacity==='1'));
await F(p).evaluate(()=>{window.DYD_DEBUG=1});p.on('console',m=>{if(/END|commit/.test(m.text()))console.log('PC',m.text())});console.log('ORDER-BEFORE',JSON.stringify((await st(p)).pages.index.order));const gb=JSON.stringify((await st(p)).pages.index.secs.nA.blocks.find(x=>x.type==='gallery').images);
await F(p).evaluate(()=>document.querySelector('.blk-gallery').scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(200);
await F(p).evaluate(()=>{window._lg=[];['pointerdown','pointercancel','pointerup'].forEach(t=>document.addEventListener(t,e=>_lg.push(t+':'+e.target.className),true));});
h=await nbm('.blk-gallery > figure > .dy-dh.itm',0);let l2=await nbm('.blk-gallery > figure',2);await p.waitForTimeout(300);h=await nbm('.blk-gallery > figure > .dy-dh.itm',0);l2=await nbm('.blk-gallery > figure',2);await tdrag(p,ctr(h),{x:l2.x+l2.width-5,y:l2.y+l2.height/2},0,15,0,async()=>console.log('MID',await F(p).evaluate(()=>{const i=document.querySelector('.dyd-ind');return [!!i,i&&i.hidden,i&&i.style.left,i&&i.style.top,scrollY,!!document.querySelector('.dyd-ghost')]})));await ready(p);
{const ga=JSON.stringify((await st(p)).pages.index.secs.nA.blocks.find(x=>x.type==='gallery').images);ok('touch: reorder gallery pictures',ga!==gb,JSON.stringify((await st(p)).pages.index.order)+JSON.stringify(p.errs)+await p.evaluate(()=>document.querySelector('#toast').textContent)+JSON.stringify([h,l2])+ga+await F(p).evaluate(()=>JSON.stringify(window._lg)).catch(e=>'nolog'));}
// touch: long-press a picker tile and drop on page
await F(p).evaluate(()=>document.querySelector('[data-nsec="nA"] .blk-text p').scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(150);await F(p).tap('[data-nsec="nA"] .blk-text p');await p.waitForTimeout(200);await p.tap('#selbar button:has-text("Add below")');await p.waitForSelector('#pickm:not([hidden])');
tile=await (await p.$('#pickg .tile[data-k="heading"]')).boundingBox();await p.waitForTimeout(100);
const nb0=JSON.stringify((await st(p)).pages.index);const frb=await (await p.$('#frame')).boundingBox();await F(p).evaluate(()=>document.querySelector('[data-nsec="nA"] .blk-text p').scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(400);const tp=await nbm('[data-nsec="nA"] .blk-text p',0);tile=await (await p.$('#pickg .tile[data-k="heading"]')).boundingBox();await tdrag(p,ctr(tile),{x:195,y:tp.y+tp.height/2},600,20,500,async()=>{for(let k=0;k<8;k++){const q=await nbm('[data-nsec="nA"] .blk-text p',0);const fr=await (await p.$('#frame')).boundingBox();const y=Math.min(fr.y+fr.height-120,Math.max(fr.y+120,q.y+q.height/2));await p._cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:195,y}]});await p.waitForTimeout(350);const okk=await F(p).evaluate(()=>{const i=document.querySelector('.dyd-ind');return !!i&&!i.hidden&&!i.classList.contains('no');});if(okk&&Math.abs(y-(q.y+q.height/2))<q.height)break;}});await ready(p);c=await st(p);
const allB=Object.values(c.pages.index.secs).flatMap(s=>s.blocks).concat(Object.values(c.pages.index.ins||{}).flat());ok('touch: long-press a picker tile and drop it on the page',allB.filter(x=>x.type==='heading').length>=2,allB.length+' '+JSON.stringify(allB.map(x=>x.type))+await p.evaluate(()=>document.querySelector('#toast').textContent+JSON.stringify(document.querySelector('#frame').getBoundingClientRect())));
await undo(p);ok('touch: undo picker drop',JSON.stringify((await st(p)).pages.index)===nb0);
ok('phone editor: no JS errors',!p.errs.length,JSON.stringify(p.errs));
await p.context().close();await b.close();
console.log('SUMMARY',res.filter(r=>r[1]).length+'/'+res.length);})().catch(e=>{console.error('CRASH',e);process.exit(1);});
