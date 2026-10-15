const {chromium}=require('playwright');
const [base,out]=process.argv.slice(2);const fs=require('fs');const pages=['index','videos','testimonials','faqs','blog','contact','page'];
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
for(const [w,tag] of [[1280,'d'],[768,'t'],[390,'m']]){const ctx=await b.newContext({viewport:{width:w,height:900},isMobile:w<600,hasTouch:w<600});
for(const pg of pages){const p=await ctx.newPage();const errs=[];p.on('console',m=>{if(m.type()==='error'&&!/compute-pressure/.test(m.text()))errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));
const r=await p.goto(`${base}/${pg}.html`,{waitUntil:'networkidle'});await p.waitForTimeout(300);
const ni=await p.evaluate(()=>!!document.querySelector('meta[name=robots][content*=noindex]'));
if(out)await p.screenshot({path:`${out}/${tag}_${pg}.png`,fullPage:true});console.log(tag,pg,r.status(),'noindex',ni,'errors',JSON.stringify(errs));await p.close();}
await ctx.close();}await b.close();})();
