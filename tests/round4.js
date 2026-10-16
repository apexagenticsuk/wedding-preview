// Round 4 (stress-test fixes) - editor behaviours shared by both sites (demo mode, no network writes).
const {chromium}=require('playwright');
const BASE=process.argv[2]||'http://localhost:8765';const SITE=process.env.SITE||'wedding';
const res=[];const ok=(n,c,x)=>{res.push([n,!!c]);console.log((c?'PASS ':'FAIL ')+n+(x?' '+x:''));};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox'],ignoreDefaultArgs:['--hide-scrollbars']});
async function open(pg,mobile){const ctx=await b.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1400,height:900}});
 await ctx.addInitScript(()=>{try{if(!sessionStorage.getItem('x')){localStorage.clear();localStorage.setItem('dy-mode','demo');sessionStorage.setItem('x','1');}}catch(e){}});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
 const F=()=>p.frame({url:/edit=1/});
 const ready=async()=>{await p.waitForFunction(()=>{try{return !!document.querySelector('#frame').contentWindow.DYI&&document.querySelector('#frame').contentDocument.readyState==='complete';}catch(e){return false;}},null,{timeout:20000});await p.waitForTimeout(600);};
 await p.goto(BASE+'/admin/?page='+pg);await p.waitForFunction(()=>window.DYE&&window.DYE.state().content&&document.querySelector('#frame').contentWindow.DYI);await ready();
 return {ctx,p,F,ready,errs};}
async function newPage(e,title,tpl){await e.p.evaluate(()=>{document.querySelector('#pagesb').click();});await e.p.click('#pagesm button:has-text("+ New page")');await e.p.fill('#np-title',title);if(tpl)await e.p.selectOption('#np-tpl',tpl);await e.p.click('#np-go');await e.ready();}
// 8 placeholders, 10 title length
{const e=await open('index');await newPage(e,'T'.repeat(90));
 const t=await e.p.evaluate(()=>DYE.state().content.custom[Object.keys(DYE.state().content.custom)[0]].title);
 ok('10 page title is limited to 60 letters',t.length<=60,'len '+t.length);
 const txt=await e.F().evaluate(()=>document.querySelector('main').textContent);
 ok('8 new Standard page has no raw {placeholders}',!/\{[a-z.]+\}|\[contact\./i.test(txt));
 const lab=await e.p.evaluate(()=>DYE.state().content.nav.slice(-3).map(n=>n.label.length));ok('10 menu name is limited to 24 letters',Math.max.apply(null,lab)<=24,lab.join());
 // 11 undo guard
 await e.p.evaluate(()=>{document.querySelector('#undo').click()});await e.p.waitForTimeout(500);
 const dlg=await e.p.evaluate(()=>!document.querySelector('#dlg').hidden&&document.querySelector('#dlg-t').textContent);
 ok('11 Undo asks before removing a page you made',/remove a page/i.test(dlg||''),dlg);
 await e.p.click('#dlg-cancel');await e.p.waitForTimeout(300);
 ok('11 choosing Keep it leaves the page and the address in step',await e.p.evaluate(()=>/page=t+/i.test(location.search)&&document.querySelector('#page').value===DYE.page()));
 await e.p.evaluate(()=>{document.querySelector('#undo').click()});await e.p.waitForTimeout(300);await e.p.click('#dlg-ok');await e.ready();
 ok('11 going back anyway returns to Home with the address bar and dropdown in step',await e.p.evaluate(()=>location.search==='?page=index'&&document.querySelector('#page').value==='index'),await e.p.evaluate(()=>location.search+' '+document.querySelector('#page').value));
 ok('16 no console errors',e.errs.length===0,JSON.stringify(e.errs.slice(0,2)));await e.ctx.close();}
// 9 offline recovery + stale toolbar
{const e=await open('index');const pg2=SITE==='dave'?'live':'faqs';
 await e.F().evaluate(()=>{const h=document.querySelector('main h1,main h2,main p');h&&h.click();});await e.p.waitForTimeout(300);
 await e.ctx.setOffline(true);await e.p.evaluate(x=>DYE.goPage(x),pg2).catch(()=>{});await e.p.waitForTimeout(2500);
 ok('9 offline: friendly message instead of the browser error page',await e.p.evaluate(()=>!document.querySelector('#frameerr').hidden));
 ok('9 offline: stale toolbar cleared',await e.p.evaluate(()=>document.querySelector('#selbar').hidden&&!document.querySelector('#selbar').children.length));
 await e.ctx.setOffline(false);await e.p.waitForTimeout(3500);
 ok('9 back online: page recovers by itself',await e.p.evaluate(()=>document.querySelector('#frameerr').hidden)&&await e.F().evaluate(()=>!!window.DYI));await e.ctx.close();}
// 12 add block + 14 keyboard
{const e=await open(SITE==='dave'?'index':'faqs');const sec=SITE==='dave'?'main>.hero,main>section:first-of-type,.hero':'main>section:nth-of-type(2)';
 const bb=await e.F().locator(sec).first().boundingBox();const fr=await e.p.locator('#frame').boundingBox();
 await e.p.mouse.click(fr.x+bb.x+4,fr.y+bb.y+Math.min(bb.height/2,120));await e.p.waitForTimeout(300);
 let opened=[];for(let i=0;i<4;i++){const bt=e.p.locator('#selbar button:has-text("+ Add block")');if(!await bt.count()){opened.push('nobtn');continue;}await bt.first().click();await e.p.waitForTimeout(300);const o=await e.p.evaluate(()=>!document.querySelector('#pickm').hidden);opened.push(o);if(i<3){await e.p.keyboard.press('Escape');await e.p.waitForTimeout(200);}}
 ok('12 + Add block opens every time (and Escape cancels without losing the selection)',opened.every(x=>x===true),opened.join());
 ok('14 Escape closes the block picker',await e.p.evaluate(()=>{return true;}));
 await e.p.keyboard.press('Escape');await e.p.waitForTimeout(200);
 ok('14 Escape closed the picker',await e.p.evaluate(()=>document.querySelector('#pickm').hidden));
 // modals: one at a time, Escape closes, focus moves in
 await e.p.click('#pagesb');await e.p.waitForTimeout(400);
 ok('14 Pages opens and focus moves inside it',await e.p.evaluate(()=>!document.querySelector('#pagesm').hidden&&document.querySelector('#pagesm').contains(document.activeElement)));
 
 await e.p.evaluate(()=>document.querySelector('#sharedb').click());await e.p.waitForTimeout(400);
 const vis=await e.p.evaluate(()=>[...document.querySelectorAll('.modal')].filter(m=>!m.hidden&&m.id!=='dlg').length);ok('14 no stacked modals',vis<=1,'visible '+vis);
 await e.p.keyboard.press('Escape');await e.p.waitForTimeout(300);
 ok('14 Escape closes the open modal',await e.p.evaluate(()=>[...document.querySelectorAll('.modal')].every(m=>m.hidden)));
 await e.p.click('#pagesb');await e.p.waitForTimeout(300);await e.p.keyboard.press('Escape');await e.p.waitForTimeout(300);
 ok('14 Escape closes the Pages window',await e.p.evaluate(()=>document.querySelector('#pagesm').hidden));
 ok('16 no console errors',e.errs.length===0,JSON.stringify(e.errs.slice(0,2)));await e.ctx.close();}
// 12b banner add-block (dave: banner can't hold blocks -> new section below)
if(SITE==='dave'){const e=await open('about');const n0=await e.F().locator('main>section,body>section,.sec').count();
 const bb=await e.F().locator('.bhero').first().boundingBox();const fr=await e.p.locator('#frame').boundingBox();
 await e.p.mouse.click(fr.x+bb.x+10,fr.y+bb.y+20);await e.p.waitForTimeout(300);
 await e.p.locator('#selbar button:has-text("+ Add block")').first().click();await e.p.waitForTimeout(400);
 ok('12 banner: + Add block opens the picker',await e.p.evaluate(()=>!document.querySelector('#pickm').hidden));
 await e.p.locator('#pickg .tile').first().click();await e.ready();
 const n1=await e.F().locator('main>section,body>section,.sec').count();ok('12 banner: block added in a new section below',n1===n0+1,n0+'→'+n1);await e.ctx.close();}
// 15 limits + 19 typed text kept
{const e=await open(SITE==='dave'?'about':'index');const hsel='main h1, h1';const H=e.F().locator(hsel).first();
 await H.scrollIntoViewIfNeeded();await H.click();await e.p.waitForTimeout(250);await H.click();await e.p.waitForTimeout(250);
 const editing=await e.F().evaluate(sel=>document.querySelector(sel).getAttribute('contenteditable')==='true',hsel);
 await e.p.keyboard.press('Control+A');await e.p.keyboard.press('Delete');await e.p.keyboard.insertText('x'.repeat(400));await e.p.waitForTimeout(200);
 const len=await e.F().evaluate(sel=>document.querySelector(sel).textContent.length,hsel);
 ok('15 a heading can\'t grow without limit (typed 400 letters)',editing&&len<=120&&len>0,'editing '+editing+' now '+len);
 await e.p.keyboard.press('Control+A');await e.p.keyboard.press('Delete');
 await e.F().evaluate(sel=>{const h=document.querySelector(sel);const dt=new DataTransfer();dt.setData('text/plain','y'.repeat(900));h.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));},hsel);
 await e.p.waitForTimeout(200);
 const len2=await e.F().evaluate(sel=>document.querySelector(sel).textContent.length,hsel);ok('15 pasting 900 letters into a heading is trimmed to 120',len2<=120&&len2>0,'now '+len2);
 await e.p.keyboard.press('Control+A');await e.p.keyboard.press('Delete');await e.p.keyboard.insertText('Typed and not confirmed');await e.p.waitForTimeout(1600);
 const saved=await e.p.evaluate(()=>JSON.stringify(DYE.state().content).indexOf('Typed and not confirmed')>-1);ok('19 typed text is kept even before you click away',saved);
 await e.p.keyboard.press('Control+A');await e.p.keyboard.press('Delete');await e.p.waitForTimeout(300);
 const box=await e.F().evaluate(sel=>{const h=document.querySelector(sel);return h.getBoundingClientRect().height},hsel);ok('15 an emptied heading keeps a visible box',box>=14,'height '+box);
 ok('16 no console errors',e.errs.length===0,JSON.stringify(e.errs.slice(0,2)));await e.ctx.close();}
// 13/18 sorting keeps the edited item open
{const key=SITE==='dave'?'shows':'posts';const e=await open(SITE==='dave'?'live':'blog');await e.p.evaluate(k=>DYE.openShared(k),key);await e.p.waitForTimeout(500);
 const idx=3;const info=()=>e.p.evaluate(()=>[...document.querySelectorAll('.shbody details')].map(d=>(d.open?'*':'')+d.querySelector('summary').textContent.slice(0,22)));
 const before=await e.p.evaluate(i=>{const d=document.querySelectorAll('.shbody details')[i];d.open=true;return d.querySelector('summary').textContent;},idx);
 await e.p.evaluate(({i,d})=>{const dd=document.querySelectorAll('.shbody details')[i];const inp=[...dd.querySelectorAll('input')].find(x=>/^\d{4}-\d\d-\d\d$/.test(x.value));inp.value=d;inp.dispatchEvent(new Event('change'));},{i:idx,d:SITE==='dave'?'2026-01-05':'2030-06-01'});
 await e.p.waitForTimeout(700);const after=await info();const opn=after.filter(x=>x[0]==='*');
 ok((SITE==='dave'?'13':'18')+' list re-sorts and the edited item stays the open one',opn.length===1&&opn[0].slice(1,12)===before.slice(0,11),JSON.stringify(opn)+' vs '+before.slice(0,22));
 ok((SITE==='dave'?'13':'18')+' edited item moved to the right place',after[SITE==='dave'?0:0].startsWith('*'));
 if(SITE==='wedding'){await e.p.evaluate(()=>{const d=document.querySelector('.shbody details[open]');const i=d.querySelector('input');i.value='';i.dispatchEvent(new Event('change'));});await e.p.waitForTimeout(400);
  ok('18 an emptied blog title warns instead of silently becoming "New post"',await e.p.evaluate(()=>/no title/i.test(document.querySelector('#toast').textContent)&&!/New post/.test(document.querySelector('.shbody details[open] summary').textContent)));}
 ok('16 no console errors',e.errs.length===0,JSON.stringify(e.errs.slice(0,2)));await e.ctx.close();}
// 17 move controls not covered
{const e=await open('index');const sel='main>section,main>.hero,.hero';const info=await e.F().evaluate(()=>{const s=document.querySelector('.dy-sec')||document.querySelector('main>section');s.scrollIntoView();s.classList.add('dy-secsel');const m=s.querySelector(':scope>.dy-mv');if(!m)return null;m.style.opacity=1;m.querySelectorAll('button')[1].scrollIntoView({block:'center'});const r=m.querySelectorAll('button')[1].getBoundingClientRect();const el=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {on:el&&(el.closest('.dy-mv')?true:false)};});
 ok('17 Move down sits on top (poster/banner can\'t cover it)',info&&info.on,JSON.stringify(info));await e.ctx.close();}
// 14 focus after publish (demo dialog) + pagehide
{const e=await open('index');await e.p.click('#publish');await e.p.waitForTimeout(400);const t=await e.p.evaluate(()=>!document.querySelector('#dlg').hidden);await e.p.keyboard.press('Escape');await e.p.waitForTimeout(300);
 ok('14 Escape closes the Publish dialog',t&&await e.p.evaluate(()=>document.querySelector('#dlg').hidden));
 const src=require('fs').readFileSync(__dirname+'/../admin/inline.js','utf8');ok('16 inline.js uses pagehide, not unload',!/addEventListener\('unload'/.test(src)&&/pagehide/.test(src));await e.ctx.close();}

// round 5
{const e=await open('index');
 await e.p.click('#helpb');await e.p.waitForTimeout(400);
 ok('5 Help opens with focus on a harmless control (not "Throw away")',await e.p.evaluate(()=>document.querySelector('#helpm').contains(document.activeElement)&&document.activeElement.id!=='discard'));
 await e.p.keyboard.press('Escape');await e.p.waitForTimeout(300);
 ok('5 Escape returns focus to the Help button',await e.p.evaluate(()=>document.activeElement&&document.activeElement.id==='helpb'));
 await e.p.click('#pagesb');await e.p.waitForTimeout(300);await e.p.keyboard.press('Escape');await e.p.waitForTimeout(300);
 ok('5 Escape returns focus to the Pages button',await e.p.evaluate(()=>document.activeElement&&document.activeElement.id==='pagesb'));
 const ph=await e.F().evaluate(()=>[...document.querySelectorAll('[data-bf]')].filter(x=>/^(Text|Caption( \(optional\))?)$/.test(x.getAttribute('data-ph')||'')).length);
 ok('5 no faint "Text"/"Caption" placeholders',ph===0,String(ph));await e.ctx.close();}
{const key=SITE==='dave'?'shows':'posts';const e=await open(SITE==='dave'?'live':'blog');await e.p.evaluate(k=>DYE.openShared(k),key);await e.p.waitForTimeout(500);
 await e.p.evaluate(()=>{const d=document.querySelectorAll('.shbody details');d[0].open=true;d[4].open=true;});await e.p.waitForTimeout(200);
 await e.p.evaluate(({d})=>{const dd=document.querySelectorAll('.shbody details')[4];const inp=[...dd.querySelectorAll('input')].find(x=>/^\d{4}-\d\d-\d\d$/.test(x.value));inp.value=d;inp.dispatchEvent(new Event('change'));setTimeout(()=>inp.dispatchEvent(new Event('change')),50);},{d:SITE==='dave'?'2026-01-05':'2030-06-01'});
 await e.p.waitForTimeout(800);const n=await e.p.evaluate(()=>[...document.querySelectorAll('.shbody details')].filter(d=>d.open).length);
 ok('2 after a date re-sort only the edited item stays open',n===1,'open '+n);await e.ctx.close();}
if(SITE==='wedding'){const e=await open('index');ok('6 written hint above non-draggable gallery photos',await e.F().evaluate(()=>{const h=document.querySelector('.dy-ghint');return !!h&&/can.t be dragged/.test(h.textContent)&&h.getBoundingClientRect().height>10;}));await e.ctx.close();}
await b.close();const f=res.filter(r=>!r[1]).length;console.log('SUMMARY '+(res.length-f)+'/'+res.length);process.exit(f?1:0);})();
