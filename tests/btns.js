// Item 2: every .btn-style button has its label (and phone glyph) centred, with equal padding, at 320/390/768/1280.
// Method: flex centring is asserted from computed style; then the ACTUAL painted ink of each button is measured from a screenshot
// (text + glyph bounding box vs the button box), so a font or CSS change that shifts the label is caught.
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const B=process.argv[2]||'http://localhost:8765';const root=path.join(__dirname,'..');
const pages=(process.env.PAGES||fs.readdirSync(root).filter(f=>/\.html$/.test(f)).map(f=>f.replace('.html','')).join(',')).split(',');
const TOLX=2,TOLY=3,GLYPH_TOL=3.5;let bad=0,n=0;const fail=m=>{bad++;console.log('FAIL '+m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
for(const w of [320,390,768,1280]){const c=await b.newContext({viewport:{width:w,height:800},deviceScaleFactor:2,isMobile:w<700,hasTouch:w<700});
 for(const pg of pages){const p=await c.newPage();await p.goto(B+'/'+pg+'.html',{waitUntil:'networkidle'});
  await p.addStyleTag({content:'*,*:before,*:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}.__tt,.__tt:before,.__tt:after{color:transparent!important;text-shadow:none!important}'});
  const list=await p.evaluate(()=>{const out=[];document.querySelectorAll('.btn').forEach((e,i)=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);if(!r.width||cs.display==='none'||cs.visibility==='hidden'||e.closest('[hidden]'))return;e.setAttribute('data-bt',i);const pb=getComputedStyle(e,'::before');out.push({i,label:(e.textContent||'').trim().slice(0,30),cls:e.className,call:e.classList.contains('call'),disp:cs.display,jc:cs.justifyContent,ai:cs.alignItems,pl:parseFloat(cs.paddingLeft),pr:parseFloat(cs.paddingRight),pt:parseFloat(cs.paddingTop),pb:parseFloat(cs.paddingBottom),ta:cs.textAlign,glyph:pb.content&&pb.content!=='none'&&pb.content!=='normal'})});return out});
  for(const it of list){n++;const id=pg+' @'+w+' ['+it.label+' .'+it.cls.replace(/\s+/g,'.')+']';
   if(!/flex/.test(it.disp)||it.jc!=='center'||it.ai!=='center')fail(id+' not flex-centred ('+it.disp+','+it.jc+','+it.ai+')');
   if(Math.abs(it.pl-it.pr)>0.5||Math.abs(it.pt-it.pb)>0.5)fail(id+' unequal padding '+[it.pt,it.pr,it.pb,it.pl].join('/'));
   if(it.ta!=='center')fail(id+' text-align '+it.ta);
   await p.evaluate(i=>{const e=document.querySelector('[data-bt="'+i+'"]');document.querySelectorAll('.sticky,.proto,header.top,.top').forEach(h=>{h.style.visibility=h.contains(e)?'':'hidden'});e.scrollIntoView({block:'center',behavior:'instant'})},it.i);await p.waitForTimeout(400);
   const box=await p.evaluate(i=>{const e=document.querySelector('[data-bt="'+i+'"]');const r=e.getBoundingClientRect();const k=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {x:r.left,y:r.top,w:r.width,h:r.height,vis:!!k&&(e===k||e.contains(k))}},it.i);
   if(!box.vis){console.log('skip (not visible/covered) '+id);continue}
   const clip={x:box.x,y:box.y,width:box.w,height:box.h};const pngA=await p.screenshot({clip});await p.evaluate(i=>document.querySelector('[data-bt="'+i+'"]').classList.add('__tt'),it.i);const pngB=await p.screenshot({clip});await p.evaluate(i=>document.querySelector('[data-bt="'+i+'"]').classList.remove('__tt'),it.i);
   const r=await p.evaluate(async([b64,b64b])=>{const ld=async s=>{const img=new Image();img.src='data:image/png;base64,'+s;await img.decode();const cv=document.createElement('canvas');cv.width=img.width;cv.height=img.height;const x=cv.getContext('2d');x.drawImage(img,0,0);return x.getImageData(0,0,img.width,img.height).data};const dA=await ld(b64),dB=await ld(b64b);const probe=new Image();probe.src='data:image/png;base64,'+b64;await probe.decode();const H=probe.height,Wd=probe.width;const d=new Uint8ClampedArray(dA.length);for(let k=0;k<dA.length;k+=4){const df=Math.abs(dA[k]-dB[k])+Math.abs(dA[k+1]-dB[k+1])+Math.abs(dA[k+2]-dB[k+2]);d[k]=d[k+1]=d[k+2]=df>90?255:0}
    const W2=Wd;const dist=(a,b)=>d[(b*W2+a)*4]?300:0;
    const W=Wd;const mx=Math.round(H*0.28),my=Math.round(H*0.14);let x0=1e9,x1=-1,y0=1e9,y1=-1;const cols=new Array(W).fill(0);
    for(let b=my;b<H-my;b++)for(let a=mx;a<W-mx;a++)if(dist(a,b)>150){cols[a]=1;if(a<x0)x0=a;if(a>x1)x1=a;if(b<y0)y0=b;if(b>y1)y1=b}
    // first ink cluster (the phone glyph on call buttons): columns grouped with gaps >= 4 css px
    let g=null;if(x1>=0){const gap=8;let s=x0,e=x0,last=x0;for(let a=x0;a<=x1;a++){if(cols[a]){if(a-last>gap)break;last=a;e=a}}let gy0=1e9,gy1=-1;for(let b=my;b<H-my;b++)for(let a=s;a<=e;a++)if(dist(a,b)>150){if(b<gy0)gy0=b;if(b>gy1)gy1=b}
     let ty0=1e9,ty1=-1;for(let b=my;b<H-my;b++)for(let a=e+gap+1;a<=x1;a++)if(dist(a,b)>150){if(b<ty0)ty0=b;if(b>ty1)ty1=b}g={gc:(gy0+gy1)/2,tc:(ty0+ty1)/2,gw:e-s}}
    return {W:Wd,H,x0,x1,y0,y1,g}},[pngA.toString('base64'),pngB.toString('base64')]);
   if(r.x1<0){fail(id+' no label ink found');continue}
   const dx=(r.x0-(r.W-1-r.x1))/2/2,dy=(r.y0-(r.H-1-r.y1))/2/2; // css px offset of ink centre from box centre
   if(Math.abs(dx)>TOLX/1)fail(id+' label off-centre horizontally by '+dx.toFixed(1)+'px');
   if(Math.abs(dy)>TOLY/1)fail(id+' label off-centre vertically by '+dy.toFixed(1)+'px');
   if(it.call&&r.g&&r.g.tc>0){const off=Math.abs(r.g.gc-r.g.tc)/2;if(off>GLYPH_TOL)fail(id+' phone glyph misaligned with text by '+off.toFixed(1)+'px')}
   if(process.env.V)console.log(id,'dx',dx.toFixed(2),'dy',dy.toFixed(2),r.g&&('glyph '+(Math.abs(r.g.gc-r.g.tc)/2).toFixed(1)));}
  await p.close();}
 await c.close();}
await b.close();console.log((bad?'FAIL':'PASS')+' btns: '+n+' buttons measured, '+bad+' problems');process.exit(bad?1:0)})();
