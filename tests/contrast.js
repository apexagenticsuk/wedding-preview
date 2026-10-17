// Item 3: filled buttons keep >= 4.5:1 label contrast, and the gold primary ("Book Dave") is clearly marked: filled, bordered, shadowed,
// and distinguishable from the red "Get tickets" next to it (both labels pass 4.5:1). Ghost (transparent) buttons are skipped: their contrast depends on the photo behind.
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const B=process.argv[2]||'http://localhost:8765';const root=path.join(__dirname,'..');
const pages=(process.env.PAGES||fs.readdirSync(root).filter(f=>/\.html$/.test(f)).map(f=>f.replace('.html','')).join(',')).split(',');let bad=0,n=0;
const fail=m=>{bad++;console.log('FAIL '+m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
for(const w of [390,1280]){const c=await b.newContext({viewport:{width:w,height:800},isMobile:w<700});
 for(const pg of pages){const p=await c.newPage();await p.goto(B+'/'+pg+'.html',{waitUntil:'networkidle'});await p.addStyleTag({content:'*{animation:none!important;transition:none!important}'});
  const r=await p.evaluate(()=>{const P=s=>{const m=/rgba?\(([^)]+)\)/.exec(s);if(!m)return null;const a=m[1].split(/[ ,\/]+/).map(Number);return {r:a[0],g:a[1],b:a[2],a:a.length>3?a[3]:1}};
   const L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};const CR=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
   return [...document.querySelectorAll('.btn')].filter(e=>{const q=e.getBoundingClientRect();return q.width&&getComputedStyle(e).display!=='none'}).map(e=>{const cs=getComputedStyle(e);const bg=P(cs.backgroundColor),fg=P(cs.color);return {label:e.textContent.trim().slice(0,24),cls:e.className,filled:bg&&bg.a>0.9,ratio:bg&&bg.a>0.9?CR(fg,bg):null,gold:/\bgold\b/.test(e.className),bw:parseFloat(cs.borderTopWidth),bs:cs.borderTopStyle,sh:cs.boxShadow!=='none',bc:cs.borderTopColor,bgc:cs.backgroundColor,sticky:!!e.closest('.sticky')}})});
  for(const it of r){n++;if(it.filled&&it.ratio<4.5)fail(pg+' @'+w+' ['+it.label+' '+it.cls+'] label contrast '+it.ratio.toFixed(2)+':1 < 4.5');
   if(it.gold){if(!it.filled)fail(pg+' @'+w+' gold button not filled');if(it.bw<2||it.bs==='none')fail(pg+' @'+w+' ['+it.label+'] gold button has no visible border');if(!it.sh)fail(pg+' @'+w+' ['+it.label+'] gold button has no shadow')}}
  const st=r.filter(x=>x.sticky);if(st.some(x=>x.gold)&&!st.some(x=>/\b(red|rose)\b/.test(x.cls)))fail(pg+' @'+w+' sticky bar should hold a red and a gold button');
  await p.close();}
 await c.close();}
await b.close();console.log((bad?'FAIL':'PASS')+' contrast: '+n+' buttons checked, '+bad+' problems');process.exit(bad?1:0)})();
