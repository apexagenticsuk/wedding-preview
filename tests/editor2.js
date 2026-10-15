// Editor usability checks (v3): Undo/Redo words, Publish apart from Preview, Shared list stays open, typed dates,
// section Move up/down buttons, no console errors / 404s while browsing pages and the Shared editor, no sideways scroll,
// no text-selection while dragging, no layout shift between preview and editing (classic scrollbars).
const {chromium}=require('playwright');
const BASE=process.argv[2]||'http://localhost:8765';
const res=[];const ok=(n,c,x)=>{res.push([n,!!c]);console.log((c?'PASS ':'FAIL ')+n+(x?' '+x:''));};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox'],ignoreDefaultArgs:['--hide-scrollbars']});
for(const mobile of (process.env.ONLY==='phone'?[true]:process.env.ONLY==='desktop'?[false]:[false,true])){const M=mobile?'phone':'desktop';
const ctx=await b.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1400,height:900}});
await ctx.addInitScript(()=>{try{if(!sessionStorage.getItem('x')){localStorage.clear();localStorage.setItem('dy-mode','demo');sessionStorage.setItem('x','1');}}catch(e){}});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text()+' '+(m.location().url||''));});p.on('response',r=>{if(r.status()>=400&&!/yt3?\.|ytimg|googleusercontent|fonts\./.test(r.url()))errs.push('HTTP '+r.status()+' '+r.url());});
const F=()=>p.frame({url:/edit=1/});
const ready=async()=>{await p.waitForFunction(()=>{try{return !!document.querySelector('#frame').contentWindow.DYI&&document.querySelector('#frame').contentDocument.readyState==='complete';}catch(e){return false;}});await p.waitForTimeout(700);};
const go=async pg=>{await p.evaluate(x=>DYE.goPage(x),pg);await ready();};
await p.goto(BASE+'/admin/?page=index');await p.waitForFunction(()=>window.DYE&&window.DYE.state().content&&document.querySelector('#frame').contentWindow.DYI);await ready();
// toolbar
ok(M+': Undo and Redo are labelled with words',await p.evaluate(()=>/Undo/.test(document.querySelector('#undo').textContent)&&/Redo/.test(document.querySelector('#redo').textContent)));
const bx=await p.evaluate(()=>{const r=id=>{const q=document.querySelector(id).getBoundingClientRect();return {x:q.x,y:q.y,w:q.width,h:q.height}};return {pre:r('#preview'),pub:r('#publish')};});
const gx=Math.max(bx.pub.x-(bx.pre.x+bx.pre.w),bx.pre.x-(bx.pub.x+bx.pub.w)),gy=Math.max(bx.pub.y-(bx.pre.y+bx.pre.h),bx.pre.y-(bx.pub.y+bx.pub.h));
ok(M+': Publish is set apart from Preview (not adjacent)',Math.max(gx,gy)>=20||(mobile&&bx.pub.y+bx.pub.h<=bx.pre.y),JSON.stringify(bx));
ok(M+': toolbar stays compact',await p.evaluate(m=>document.querySelector('header.tb').getBoundingClientRect().height<=(m?130:70),mobile),'');
// Shared list stays open
await p.evaluate(()=>DYE.openShared('posts'));await p.waitForSelector('#sharedm:not([hidden])');
await p.evaluate(()=>{document.querySelectorAll('#sharedm details.shrow')[1].open=true;document.querySelectorAll('#sharedm details.shrow')[1].dispatchEvent(new Event('toggle'));});
const ven=p.locator('#sharedm details.shrow').nth(1).locator('label.shf:has(span:text-is("Title")) input').first();await ven.fill('Ball Alley edited');await ven.dispatchEvent('change');await ready();
ok(M+': Shared row stays open after an edit',await p.evaluate(()=>document.querySelectorAll('#sharedm details.shrow')[1].open&&!document.querySelector('#sharedm').hidden));
// typed date
const dt=p.locator('#sharedm details.shrow').nth(1).locator('.shdate input[type=text]');
await dt.fill('Dec 11 2026');await dt.dispatchEvent('change');await ready();
ok(M+': typed date “Dec 11 2026” is accepted',await p.evaluate(()=>DYE.state().content.posts.some(s=>s.title==='Ball Alley edited'&&s.date==='2026-12-11')));
ok(M+': ...and the row is still open after the list re-sorts',await p.evaluate(()=>[...document.querySelectorAll('#sharedm details.shrow')].some(d=>d.open&&/Ball Alley edited/.test(d.textContent))));
const dt2=p.locator('#sharedm details.shrow[open] .shdate input[type=text]').first();await dt2.fill('10/12/2026');await dt2.dispatchEvent('change');await ready();
ok(M+': typed date 10/12/2026 is accepted',await p.evaluate(()=>DYE.state().content.posts.some(s=>s.title==='Ball Alley edited'&&s.date==='2026-12-10')));
await dt2.fill('not a date');await dt2.dispatchEvent('change');
ok(M+': nonsense date is refused with a message',await p.evaluate(()=>DYE.state().content.posts.some(s=>s.title==='Ball Alley edited'&&s.date==='2026-12-10')&&/couldn/i.test(document.querySelector('#sharedm .shmsg.err').textContent)));
await dt2.fill('FRI 4th Dec');await dt2.dispatchEvent('change');await ready();
ok(M+': “FRI 4th Dec” is accepted (weekday ignored)',await p.evaluate(()=>DYE.state().content.posts.some(s=>s.title==='Ball Alley edited'&&/^\d{4}-12-04$/.test(s.date))));
ok(M+': date error message shows an example',await p.evaluate(()=>{const f=document.querySelector('#sharedm .shdate input[type=text]');return /Fri 4th Dec/.test(f.placeholder);}));
ok(M+': date field also has a calendar picker',await p.evaluate(()=>!!document.querySelector('#sharedm .shdate input[type=date]')));
await p.evaluate(()=>document.querySelector('#sharedm').hidden=true);
for(let i=0;i<8&&await p.evaluate(()=>!document.querySelector('#undo').disabled);i++){await p.click('#undo');await p.waitForTimeout(200);}await ready();
// section move buttons
const order=()=>F().evaluate(()=>[...document.querySelectorAll('main>.dy-sec')].map(e=>e.getAttribute('data-dy').split(' ')[0]));
const o0=await order();
ok(M+': every section has Move up / Move down buttons',await F().evaluate(n=>document.querySelectorAll('main>.dy-sec>.dy-mv').length===n,o0.length));
await F().evaluate(()=>{const s=document.querySelectorAll('main>.dy-sec')[3];scrollTo({top:s.getBoundingClientRect().top+scrollY-120,behavior:'instant'});});await p.waitForTimeout(300);
const btn=F().locator('main>.dy-sec').nth(3).locator('.dy-mv button',{hasText:'Move down'});
if(mobile){await F().locator('main>.dy-sec').nth(3).tap({position:{x:6,y:6}});await p.waitForTimeout(300);await btn.tap();}else{await F().locator('main>.dy-sec').nth(3).hover({position:{x:200,y:30}});await btn.click();}
await ready();const o1=await order();
ok(M+': Move down swaps the section with the one below',o1[3]===o0[4]&&o1[4]===o0[3],o0.join()+' -> '+o1.join());
await p.click('#undo');await ready();ok(M+': ...and Undo puts it back',(await order()).join()===o0.join());
const first=F().locator('main>.dy-sec').first().locator('.dy-mv button',{hasText:'Move up'});
ok(M+': Move up is disabled on the first section',await first.isDisabled());
// no text selection / sideways scroll
ok(M+': no text selection while editing (outside typing)',await F().evaluate(()=>getComputedStyle(document.body).userSelect==='none'));
// browse all pages + Shared tabs
for(const pg of ['videos','testimonials','faqs','blog','contact','index']){await go(pg);
 ok(M+': no sideways scroll in the editor on '+pg,await F().evaluate(()=>{const d=document.documentElement;return d.scrollWidth<=d.clientWidth+1;}));}
for(const k of ['posts','testimonials','clips','faqs','praise','gallery','facts','set','contact']){await p.evaluate(x=>DYE.openShared(x),k);await p.evaluate(()=>document.querySelectorAll('#sharedm details.shrow').forEach(d=>d.open=true));await p.waitForTimeout(250);}
ok(M+': no console errors or failed requests',errs.length===0,JSON.stringify(errs.slice(0,4)));
await ctx.close();}
// layout shift between plain preview and editing (classic scrollbars)
{const ctx=await b.newContext({viewport:{width:1400,height:900}});await ctx.addInitScript(()=>{localStorage.setItem('dy-mode','demo')});
const q=()=>{const h=document.querySelector('main .wrap h2, main h1');return Math.round(h.getBoundingClientRect().left)+'/'+document.documentElement.clientWidth};
for(const pg of ['index','faqs','contact']){const p=await ctx.newPage();await p.goto(BASE+'/admin/?page='+pg);await p.waitForTimeout(3000);const ed=await p.frame({url:/edit=1/}).evaluate(q);await p.close();
 const p2=await ctx.newPage();await p2.setViewportSize({width:1400,height:794});await p2.goto(BASE+'/'+pg+'.html');await p2.waitForTimeout(1200);const pv=await p2.evaluate(q);await p2.close();ok('no layout shift between preview and editing on '+pg,ed===pv,ed+' vs '+pv);}
await ctx.close();}
await b.close();console.log('SUMMARY',res.filter(r=>r[1]).length+'/'+res.length);process.exit(res.every(r=>r[1])?0:1);})().catch(e=>{console.error('CRASH',e.message);process.exit(1);});
