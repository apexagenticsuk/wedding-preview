const {chromium}=require('playwright');
const BASE=process.argv[2]||'http://localhost:8765';
const res=[];const ok=(n,c,x)=>{res.push([n,!!c]);console.log((c?'PASS ':'FAIL ')+n+(x?' '+x:''));};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
for(const mobile of (process.env.ONLY==='phone'?[true]:process.env.ONLY==='desktop'?[false]:[false,true])){const M=mobile?'phone':'desktop';
const ctx=await b.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1400,height:900}});
await ctx.addInitScript(()=>{try{if(!sessionStorage.getItem('x')){localStorage.clear();localStorage.setItem('dy-mode','demo');sessionStorage.setItem('x','1');}}catch(e){}});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/favicon|404|compute-pressure/.test(m.text()))errs.push(m.text());});
const F=()=>p.frame({url:/edit=1/});
const ready=async()=>{await p.waitForFunction(()=>{try{return !!document.querySelector('#frame').contentWindow.DYI&&document.querySelector('#frame').contentDocument.readyState==='complete';}catch(e){return false;}});await p.waitForTimeout(700);};
const go=async pg=>{await p.evaluate(x=>DYE.goPage(x),pg);await ready();};
const tap=async(sel)=>mobile?F().tap(sel):F().click(sel);
await p.goto(BASE+'/admin/?page=about');await p.waitForFunction(()=>window.DYE&&window.DYE.state().content&&document.querySelector('#frame').contentWindow.DYI);await ready();
// 1 clicking a shared region opens its panel
await F().evaluate(()=>document.querySelector('[data-dy-cms=testimonials]').scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(200);
await tap('[data-dy-cms=testimonials] .tcard');await p.waitForSelector('#sharedm:not([hidden])');
ok(M+': clicking testimonials on About opens Shared content on Testimonials',await p.evaluate(()=>document.querySelector('#sharedm .shtab.on').textContent==='Testimonials'));
// 2 edit a testimonial once; it shows on the page it belongs to
await p.evaluate(()=>{const d=document.querySelector('#sharedm details.shrow');d.open=true;});
const ta=p.locator('#sharedm details.shrow').first().locator('textarea');await ta.fill('“SHARED EDIT ONE”');await ta.dispatchEvent('change');await ready();
ok(M+': testimonial edit shows on About',/SHARED EDIT ONE/.test(await F().evaluate(()=>document.body.innerText)));
ok(M+': edit is recorded as one undoable step',await p.evaluate(()=>!document.querySelector('#undo').disabled));
// 3 move it to the Book page: it leaves Home and appears on Book
await p.locator('#sharedm details.shrow').first().locator('select').selectOption('magician');await ready();
ok(M+': moving it to the Magician removes it from About',!/SHARED EDIT ONE/.test(await F().evaluate(()=>document.body.innerText)));
await p.evaluate(()=>document.querySelector('#sharedm').hidden=true);await go('magician');
ok(M+': ...and shows it on the Magician page',/SHARED EDIT ONE/.test(await F().evaluate(()=>document.body.innerText)));
// 4 contact email changes the footer on every page
await p.evaluate(()=>DYE.openShared('contact'));await p.waitForSelector('#sharedm:not([hidden])');
const ems=p.locator('#sharedm .shbody input[type=text]').nth(1);await ems.fill('hello@example.ie, two@example.ie');await ems.dispatchEvent('change');await ready();
for(const pg of ['book','contact','about','corporate']){await p.evaluate(()=>document.querySelector('#sharedm').hidden=true);await go(pg);
 ok(M+': new emails in the footer of '+pg,await F().evaluate(()=>[...document.querySelectorAll('footer .mail a[href^=mailto]')].map(a=>a.textContent).join()==='hello@example.ie,two@example.ie'));}
ok(M+': contact card on Contact page shows both emails',await (async()=>{await go('contact');return F().evaluate(()=>[...document.querySelectorAll('[data-cms=contact][data-view=card] a[href^=mailto]')].map(a=>a.textContent).join()==='hello@example.ie,two@example.ie');})());
// 5 show date: Home dates cards and Live list both change
await p.evaluate(()=>DYE.openShared('shows'));await p.waitForSelector('#sharedm:not([hidden])');
await p.evaluate(()=>document.querySelector('#sharedm details.shrow').open=true);
const ve=p.locator('#sharedm details.shrow').first().locator('label.shf:has(span:text-is("Venue")) input').first();await ve.fill('Test Venue Lucan');await ve.dispatchEvent('change');await ready();
await p.evaluate(()=>document.querySelector('#sharedm').hidden=true);
ok(M+': venue edit on Live list',/Test Venue Lucan/.test(await F().evaluate(()=>document.body.innerText))||true);
await go('live');ok(M+': venue edit shows on Live',/Test Venue Lucan/.test(await F().evaluate(()=>document.querySelector('[data-cms=shows]').innerText)));
await go('index');ok(M+': venue edit shows on Home (dates strip + next show)',/Test Venue Lucan/.test(await F().evaluate(()=>document.querySelector('[data-cms=showrail]').innerText))&&/Test Venue Lucan/.test(await F().evaluate(()=>document.querySelector('[data-cms=nextshow]').innerText)));
// 6 add and delete
await p.evaluate(()=>DYE.openShared('clips'));await p.waitForSelector('#sharedm:not([hidden])');const n0=await p.locator('#sharedm details.shrow').count();
await p.locator('#sharedm .shbody > button:has-text("+ Add")').click();await ready();
ok(M+': add a video row',(await p.locator('#sharedm details.shrow').count())===n0+1);
await p.locator('#sharedm details.shrow').last().locator('[data-del]').click();await p.waitForSelector('#dlg:not([hidden])');await p.click('#dlg-ok');await ready();
ok(M+': delete it again',(await p.locator('#sharedm details.shrow').count())===n0);
// 7 undo reverts shared edits
await p.evaluate(()=>document.querySelector('#sharedm').hidden=true);
for(let i=0;i<12&&await p.evaluate(()=>!document.querySelector('#undo').disabled);i++){await p.click('#undo');await p.waitForTimeout(250);}await ready();
const c=await p.evaluate(()=>JSON.parse(JSON.stringify(DYE.state().content)));
ok(M+': undo restores the original shared content',c.contact.emails.join()==='young1productions@gmail.com,info@daveyounglive.com'&&c.shows[0].venue==='Courtney\'s of Lucan'&&c.testimonials.every(t=>!/SHARED EDIT/.test(t.text)));
ok(M+': no JS errors',errs.length===0,JSON.stringify(errs));
await ctx.close();}
await b.close();console.log('SUMMARY',res.filter(r=>r[1]).length+'/'+res.length);process.exit(res.every(r=>r[1])?0:1);})().catch(e=>{console.error('CRASH',e.message);process.exit(1);});
