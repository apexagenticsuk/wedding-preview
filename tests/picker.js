// Page dropdown must show the current page after Undo/Redo (was blank).
const {chromium}=require('playwright');const B=process.argv[2]||'http://localhost:8765';
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:1400,height:900}});await c.addInitScript(()=>{if(!sessionStorage.x){localStorage.clear();localStorage.setItem('dy-mode','demo');sessionStorage.x=1}});
const p=await c.newPage();await p.goto(B+'/admin/?page=faqs');await p.waitForFunction(()=>{try{return document.querySelector('#frame').contentWindow.DYI}catch(e){}});await p.waitForTimeout(1200);
let ok=true;const chk=async(n)=>{const r=await p.evaluate(()=>{const s=document.querySelector('#page');return [s.value,s.selectedOptions[0]&&s.selectedOptions[0].textContent]});const g=r[0]==='faqs'&&/FAQ/i.test(r[1]||'');console.log((g?'PASS ':'FAIL ')+'page picker after '+n+' '+JSON.stringify(r));ok=ok&&g;};
await p.evaluate(()=>DYE.change(c=>{c.faqs[0].q='PICKER TEST';},{reload:true}));await p.waitForTimeout(1500);await chk('edit');
await p.click('#undo');await p.waitForTimeout(1500);await chk('Undo');await p.click('#redo');await p.waitForTimeout(1500);await chk('Redo');
await b.close();process.exit(ok?0:1)})();
