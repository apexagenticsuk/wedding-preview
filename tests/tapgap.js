// Item 5: adjacent tap targets (links, buttons, form controls) are >= 10px apart at 360/390/430 on every page.
// Excluded: links inside running text (they wrap with the text), the banner hotspots (their own 8px rule in hotspots.js, they sit on a picture),
// controls inside position:fixed bars versus page content (they overlay, never sit beside it), and anything scrolled out sideways in a carousel.
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const B=process.argv[2]||'http://localhost:8765';const root=path.join(__dirname,'..');const MIN=+(process.env.MIN||10);
const pages=(process.env.PAGES||fs.readdirSync(root).filter(f=>/\.html$/.test(f)).map(f=>f.replace('.html','')).join(',')).split(',');let bad=0,n=0;
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
for(const w of [360,390,430]){const c=await b.newContext({viewport:{width:w,height:800},isMobile:true,hasTouch:true});
 for(const pg of pages){const p=await c.newPage();await p.goto(B+'/'+pg+'.html',{waitUntil:'networkidle'});await p.addStyleTag({content:'*,*:before,*:after{animation:none!important;transition:none!important}'});await p.waitForTimeout(300);
  const r=await p.evaluate(()=>{const W=document.documentElement.clientWidth;const fixed=e=>{for(let x=e;x&&x!==document.body;x=x.parentElement)if(getComputedStyle(x).position==='fixed')return true;return false};
   const els=[...document.querySelectorAll('a,button,summary,input:not([type=hidden]),select,textarea,[role=button]')].filter(e=>{const s=getComputedStyle(e),q=e.getBoundingClientRect();if(!q.width||!q.height||s.display==='none'||s.visibility==='hidden'||e.closest('[hidden]')||e.matches('.skip,.hot'))return false;if(q.right<0||q.left>W)return false;if(e.matches('a')&&[...e.parentNode.childNodes].some(t=>t.nodeType===3&&t.textContent.trim().length>2))return false;return true}).map(e=>({e,q:e.getBoundingClientRect(),f:fixed(e)}));
   let worst=[];for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){const a=els[i],b=els[j];if(a.f!==b.f)continue;if(a.e.contains(b.e)||b.e.contains(a.e))continue;const x=a.q,y=b.q;const dx=Math.max(x.left-y.right,y.left-x.right),dy=Math.max(x.top-y.bottom,y.top-x.bottom);if(dx<0&&dy<0)continue;const g=dx<0?dy:dy<0?dx:Math.hypot(dx,dy);if(g<9999&&((dx<0&&dy<120)||(dy<0&&dx<120)||Math.hypot(Math.max(dx,0),Math.max(dy,0))<30)){const nm=e=>((e.textContent||'').trim()||e.getAttribute('aria-label')||(e.tagName+'.'+e.className)).slice(0,22);worst.push({g:Math.round(g*10)/10,a:nm(a.e),b:nm(b.e)})}}
   worst.sort((p,q)=>p.g-q.g);return {n:els.length,worst:worst.slice(0,6)}});
  n+=r.n;const tight=r.worst.filter(x=>x.g<MIN-0.2);if(tight.length){bad++;console.log('FAIL '+pg+' @'+w+' gap<'+MIN+'px: '+tight.map(t=>t.g+' ['+t.a+' | '+t.b+']').join('; '))}
  await p.close();}
 await c.close();}
await b.close();console.log((bad?'FAIL':'PASS')+' tapgap: '+n+' targets, min gap '+MIN+'px, '+bad+' page/width combos with a tight pair');process.exit(bad?1:0)})();
