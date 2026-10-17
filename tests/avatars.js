// Item 2: every avatar (quotes about Dave, testimonials) is a true circle: square box, 50% radius, object-fit cover (no stretching), no "wide" rectangle.
const {chromium}=require('playwright');const B=process.argv[2]||'http://localhost:8765';let bad=0,n=0;
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
for(const w of [390,1280]){const c=await b.newContext({viewport:{width:w,height:900},isMobile:w<700});
 for(const pg of ['index','testimonials']){const p=await c.newPage();await p.goto(B+'/'+pg+'.html',{waitUntil:'networkidle'});await p.evaluate(()=>document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager'));await p.waitForTimeout(500);
  const r=await p.evaluate(()=>[...document.querySelectorAll('.pr img,.rev img')].map(i=>{const q=i.getBoundingClientRect(),cs=getComputedStyle(i);return {src:i.getAttribute('src'),w:q.width,h:q.height,rad:parseFloat(cs.borderTopLeftRadius),fit:cs.objectFit,wide:i.classList.contains('wide')}}));
  for(const a of r){n++;const circle=Math.abs(a.w-a.h)<0.6&&a.rad>=a.w/2-0.6&&a.fit==='cover'&&!a.wide;if(!circle){bad++;console.log('FAIL @'+w+' '+pg+' avatar not a circle',JSON.stringify(a))}}
  await p.close()}
 await c.close()}
await b.close();console.log((bad?'FAIL':'PASS')+' avatars: '+n+' avatars are circles');process.exit(bad?1:0)})();
