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
await p.goto(BASE+'/admin/?page=index');await p.waitForFunction(()=>window.DYE&&window.DYE.state().content&&document.querySelector('#frame').contentWindow.DYI);await ready();
const txt=()=>F().evaluate(()=>document.body.innerText);
const hide=()=>p.evaluate(()=>document.querySelector('#sharedm').hidden=true);
// 1 clicking a shared region opens its panel
await F().evaluate(()=>document.querySelector('[data-dy-cms=testimonials]').scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(200);
await tap('[data-dy-cms=testimonials] .rev');await p.waitForSelector('#sharedm:not([hidden])');
ok(M+': clicking testimonials on Home opens Shared content on Testimonials',await p.evaluate(()=>document.querySelector('#sharedm .shtab.on').textContent==='Testimonials'));
// 2 edit once; it shows
const first=await p.evaluate(()=>DYE.state().content.testimonials.find(t=>t.place==='home').who);
await p.evaluate(()=>{const d=[...document.querySelectorAll('#sharedm details.shrow')].find(d=>d.querySelector('select').value==='home');d.open=true;d.setAttribute('data-t','1');});
const row=p.locator('#sharedm details.shrow[data-t="1"]');const ta=row.locator('textarea');await ta.fill('SHARED EDIT ONE');await ta.dispatchEvent('change');await ready();
ok(M+': testimonial edit shows on Home',/SHARED EDIT ONE/.test(await txt()));
ok(M+': edit is one undoable step',await p.evaluate(()=>!document.querySelector('#undo').disabled));
// 3 move it to the Testimonials page
await p.evaluate(()=>{const d=[...document.querySelectorAll('#sharedm details.shrow')].find(d=>/SHARED EDIT ONE/.test(d.querySelector('textarea').value));d.open=true;d.setAttribute('data-t','2');});
await p.locator('#sharedm details.shrow[data-t="2"] select').first().selectOption('page');await ready();
ok(M+': moving it removes it from Home',!/SHARED EDIT ONE/.test(await txt()));
await hide();await go('testimonials');
ok(M+': ...and it shows on the Testimonials page (once)',(await txt()).split('SHARED EDIT ONE').length===2);
// 4 contact email changes the footer/contact on every page
await p.evaluate(()=>DYE.openShared('contact'));await p.waitForSelector('#sharedm:not([hidden])');
const em=p.locator('#sharedm .shbody label.shf:has(span:text-is("Email")) input').first();await em.fill('hello@example.ie');await em.dispatchEvent('change');await ready();
for(const pg of ['index','videos','testimonials','faqs','blog','contact']){await hide();await go(pg);
 ok(M+': new email appears on '+pg,await F().evaluate(()=>[...document.querySelectorAll('a[href^=mailto]')].some(a=>/hello@example\.ie/.test(a.href))&&![...document.querySelectorAll('a[href^=mailto]')].some(a=>/theweddingcomedian\.ie/.test(a.href))));}
// 5 add and delete a video
await p.evaluate(()=>DYE.openShared('clips'));await p.waitForSelector('#sharedm:not([hidden])');const n0=await p.locator('#sharedm details.shrow').count();
await p.locator('#sharedm .shbody > button:has-text("+ Add")').click();await ready();
ok(M+': add a video row',(await p.locator('#sharedm details.shrow').count())===n0+1);
await p.locator('#sharedm details.shrow').last().locator('[data-del]').click();await p.waitForSelector('#dlg:not([hidden])');await p.click('#dlg-ok');await ready();
ok(M+': delete it again',(await p.locator('#sharedm details.shrow').count())===n0);
// 7 typed date on a blog post
await p.evaluate(()=>DYE.openShared('posts'));await p.waitForSelector('#sharedm:not([hidden])');
await p.evaluate(()=>{document.querySelector('#sharedm details.shrow').open=true;});
const de=p.locator('#sharedm details.shrow').first().locator('label.shf:has(span:text-is("Date")) input').first();
if(await de.count()){await de.fill('4 Oct 2017');await de.dispatchEvent('change');await ready();const d=await p.evaluate(()=>DYE.state().content.posts.filter(x=>x.date==='2017-10-04').length+' / '+DYE.state().content.posts.map(x=>x.date).join());ok(M+': typed date is accepted and normalised',/^[1-9]/.test(d),d);}else ok(M+': post date field present',false);
// 7 undo reverts shared edits
await p.evaluate(()=>document.querySelector('#sharedm').hidden=true);
for(let i=0;i<30&&await p.evaluate(()=>!document.querySelector('#undo').disabled);i++){await p.click('#undo');await p.waitForTimeout(250);}await ready();
const c=await p.evaluate(()=>JSON.parse(JSON.stringify(DYE.state().content)));
ok(M+': undo restores the original shared content',await p.evaluate(()=>{const c=DYE.state().content;return c.contact.email==='info@theweddingcomedian.ie'&&!c.deposit&&!c.testimonials.some(t=>/SHARED EDIT/.test(t.text));}));
ok(M+': no JS errors',errs.length===0,JSON.stringify(errs));
await ctx.close();}
await b.close();console.log('SUMMARY',res.filter(r=>r[1]).length+'/'+res.length);process.exit(res.every(r=>r[1])?0:1);})().catch(e=>{console.error('CRASH',e.message);process.exit(1);});
