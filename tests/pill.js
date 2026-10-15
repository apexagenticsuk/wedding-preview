const {chromium}=require('playwright');(async()=>{const B=process.argv[2]||'http://localhost:8765';const b=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
const W=+(process.env.W||1400),H=+(process.env.H||900);
for(const pg of (process.argv[3]||'index,videos,testimonials,faqs,blog,contact').split(',')){
const c=await b.newContext({viewport:{width:W,height:H}});await c.addInitScript(()=>{if(!sessionStorage.x){localStorage.clear();localStorage.setItem('dy-mode','demo');sessionStorage.x=1}});
const p=await c.newPage();await p.goto(B+'/admin/?page='+pg);await p.waitForFunction(()=>{try{return document.querySelector('#frame').contentWindow.DYI}catch(e){}});await p.waitForTimeout(1500);
const F=()=>p.frame({url:/edit=1/});const order=()=>F().evaluate(()=>[...document.querySelectorAll('main>.dy-sec')].map(e=>e.getAttribute('data-dy').split(' ')[0]).join());
const n=await F().locator('main>.dy-sec').count();const res=[];
const up=pg==='blog';for(let i=up?1:0;i<(up?2:n-1);i++){const o0=await order();await F().evaluate(i=>{const s=document.querySelectorAll('main>.dy-sec')[i];scrollTo(0,s.getBoundingClientRect().top+scrollY-110)},i);await p.waitForTimeout(200);
await F().locator('main>.dy-sec').nth(i).hover({position:{x:200,y:30},force:true});await p.waitForTimeout(200);
const h=await F().locator('main>.dy-sec').nth(i).locator(':scope>.dy-dh.sec').boundingBox();
await p.mouse.move(h.x+h.width/2,h.y+h.height/2);await p.mouse.down();await p.mouse.move(h.x+h.width/2,h.y+30,{steps:4});await p.mouse.move(h.x-200,up?70:H-25,{steps:20});await p.waitForTimeout(1800);
const ind=await F().evaluate(()=>{const i=document.querySelector('.dyd-ind');return !!i&&!i.hidden});await p.mouse.up();await p.waitForTimeout(1300);const o1=await order();
res.push(i+':'+(o0!==o1?'moved':'SAME')+(ind?'':'/noind'));
if(o0!==o1){await p.click('#undo');await p.waitForTimeout(1200);}}
console.log((res.every(r=>/moved/.test(r))?'PASS ':'FAIL ')+'pill drag moves every section on '+pg+' '+res.join(' '));if(!res.every(r=>/moved/.test(r)))process.exitCode=1;await c.close();}await b.close()})();
