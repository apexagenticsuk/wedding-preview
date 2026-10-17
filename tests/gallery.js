// Item 5 (rendered): on phone and desktop every gallery photo shows every detected face inside the visible part of the picture,
// using the REAL layout (displayed box, object-fit, object-position from content.json pos). Face boxes: tests/faces.json.
const {chromium}=require('playwright');const fs=require('fs');const B=process.argv[2]||'http://localhost:8765';
const F=JSON.parse(fs.readFileSync(__dirname+'/faces.json','utf8'));const C=JSON.parse(fs.readFileSync(__dirname+'/../content.json','utf8'));let bad=0,n=0;
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
for(const w of [390,1280]){const c=await b.newContext({viewport:{width:w,height:900},isMobile:w<700});const p=await c.newPage();await p.goto(B+'/index.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager'));await p.waitForTimeout(600);
 const imgs=await p.evaluate(()=>[...document.querySelectorAll('.gintro img,.ggrid img')].map(i=>{const r=i.getBoundingClientRect(),cs=getComputedStyle(i);return {src:i.getAttribute('src'),w:r.width,h:r.height,nw:i.naturalWidth,nh:i.naturalHeight,fit:cs.objectFit,pos:cs.objectPosition,attr:i.style.objectPosition}}));
 const want=[C.galleryIntro,...C.gallery];
 if(imgs.length!==want.length){console.log('FAIL @'+w+' gallery has '+imgs.length+' pictures, content.json has '+want.length);bad++}
 for(const im of imgs){const it=want.find(x=>x.img===im.src);const f=F[im.src];if(!f||!it){console.log('FAIL no face data/content for',im.src);bad++;continue}
  if(it.pos&&im.attr!==it.pos){console.log('FAIL @'+w+' '+im.src+' pos in content.json ('+it.pos+') not applied ('+im.attr+')');bad++}
  // visible rectangle of the natural image inside the displayed box
  let vx0=0,vy0=0,vx1=1,vy1=1;if(im.fit==='cover'){const s=Math.max(im.w/im.nw,im.h/im.nh);const cw=im.w/s/im.nw,ch=im.h/s/im.nh;const pp=im.pos.split(' ').map(v=>parseFloat(v)/100);vx0=(1-cw)*pp[0];vx1=vx0+cw;vy0=(1-ch)*pp[1];vy1=vy0+ch}
  let minHr=9;for(const [x,y,fw,fh] of f.main){n++;minHr=Math.min(minHr,(y-vy0)/fh);const ok=x>=vx0-0.005&&x+fw<=vx1+0.005&&y>=vy0-0.005&&y+fh<=vy1+0.005;if(!ok){console.log('FAIL @'+w+' face cut in',im.src,JSON.stringify([x,y,fw,fh]),'visible',[vx0,vy0,vx1,vy1].map(v=>+v.toFixed(2)).join(','));bad++}}
  // headroom: space above the face box (forehead + hair + a margin) must be at least 0.25 face-heights, unless the original upload itself is clipped (faces.json _srcCut) or noted fine (_headOk)
  const known=(F._srcCut&&F._srcCut[im.src])||(F._headOk&&F._headOk[im.src]);if(minHr<0.25){if(known){console.log('note @'+w+' '+im.src+' headroom '+minHr.toFixed(2)+' face-heights: '+known)}else{console.log('FAIL @'+w+' '+im.src+' too little headroom above the face: '+minHr.toFixed(2));bad++}}else if(process.env.V)console.log('headroom @'+w+' '+im.src+' '+minHr.toFixed(2));}
 await c.close()}
await b.close();console.log((bad?'FAIL':'PASS')+' gallery: '+n+' face checks over phone+desktop renders');process.exit(bad?1:0)})();
