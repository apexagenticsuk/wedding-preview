const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:1400,height:900}});await c.addInitScript(()=>{if(!sessionStorage.x){localStorage.clear();localStorage.setItem('dy-mode','demo');sessionStorage.x=1}});
const p=await c.newPage();await p.goto('http://localhost:8765/admin/?page=index');await p.waitForFunction(()=>{try{return document.querySelector('#frame').contentWindow.DYI}catch(e){}});await p.waitForTimeout(1500);
const F=()=>p.frame({url:/edit=1/});
for(const [i,lab] of [[6,'Move up'],[6,'Move down'],[3,'Move up']]){
await F().evaluate(i=>{const s=document.querySelectorAll('main>.dy-sec')[i];scrollTo(0,s.getBoundingClientRect().top+scrollY-110)},i);await p.waitForTimeout(500);
const id=await F().evaluate(i=>document.querySelectorAll('main>.dy-sec')[i].getAttribute('data-dy').split(' ')[0],i);
await F().locator('main>.dy-sec').nth(i).hover({position:{x:200,y:30},force:true});
await F().locator('main>.dy-sec').nth(i).locator('.dy-mv button',{hasText:lab}).click();await p.waitForTimeout(2200);
const r=await F().evaluate(id=>{const s=[...document.querySelectorAll('main>.dy-sec')].find(e=>e.getAttribute('data-dy').split(' ')[0]===id);const r=s.getBoundingClientRect();return 'top='+Math.round(r.top)+' bottom='+Math.round(r.bottom)+' vh='+innerHeight+' scrollY='+Math.round(scrollY)},id);const top=+/top=(-?\d+)/.exec(r)[1];console.log((top>=0&&top<700?'PASS ':'FAIL ')+'view follows '+lab+' of section '+i+' '+r);if(!(top>=0&&top<700))process.exitCode=1;}
await b.close()})();
