// Every round photo (praise + testimonials) must show its main face(s) fully inside the square crop at the stored focal point (content.json pos).
// Face boxes come from tests/faces.json (detected once with a face detector and checked by eye). Hero and gallery images are not cropped (natural aspect).
const fs=require('fs');const C=JSON.parse(fs.readFileSync(__dirname+'/../content.json','utf8'));const F=JSON.parse(fs.readFileSync(__dirname+'/faces.json','utf8'));
let bad=0,n=0;
for(const it of [...C.praise,...C.testimonials]){const f=F[it.img];if(!f){console.log('NO FACE DATA',it.img);bad++;continue;}
 const m=/^(\d+)% (\d+)%$/.exec(it.pos||'50% 50%');if(!m){console.log('FAIL bad pos',it.id,it.pos);bad++;continue;}
 const d=C.dims[it.img];const W=d?d[0]:f.size[0],H=d?d[1]:f.size[1];const a=it.shape==='wide'?116/83:1;let cw=Math.min(W,H*a),ch=cw/a;const x0=(W-cw)*m[1]/100/W,y0=(H-ch)*m[2]/100/H,x1=x0+cw/W,y1=y0+ch/H;
 for(const [x,y,w,h] of f.main){n++;let ok=x>=x0-0.005&&x+w<=x1+0.005&&y>=y0-0.005&&y+h<=y1+0.005;if(ok&&a===1){let circ=true;const R=cw/2,cxp=(x0*W+x1*W)/2,cyp=(y0*H+y1*H)/2;const fx=(x+w/2)*W,fy=(y+h/2)*H,fr=0.5*Math.max(w*W,h*H);circ=Math.hypot(fx-cxp,fy-cyp)+fr*0.9<=R*1.02;if(!circ){if(f.circle){ok=false}else{console.log('note: round crop trims the edge of a face (not failing, square crop is complete)',it.id)}}}if(!ok){bad++;console.log('FAIL face cut',it.id,it.pos,JSON.stringify([x,y,w,h]));}}}

// Gallery photos (home page gallery + intro): every item has a valid per-image focus point in content.json, and every detected face stays inside the displayed picture.
// Gallery pictures are shown at their own aspect (no crop), so the visible area is the whole file; the focus point only applies if a frame crops them.
// A head can only be cut by the FILE itself (Wix serves Dave's gallery uploads as 770x338 strips): those are listed in faces.json _srcCut and reported, anything new fails.
const gal=[...C.gallery.map((g,i)=>[g,'gallery['+i+']']),[C.galleryIntro,'galleryIntro']];let g0=0,warn=0;
for(const [it,id] of gal){const f=F[it.img];if(!f){console.log('NO FACE DATA',it.img);bad++;continue;}
 const m=/^(\d{1,3})% (\d{1,3})%$/.exec(it.pos||'');if(!m||+m[1]>100||+m[2]>100){console.log('FAIL gallery needs a per-image pos "x% y%" in content.json',id,it.pos);bad++;continue;}
 for(const [x,y,w,h] of f.main){g0++;
  if(x<-0.005||y<-0.005||x+w>1.005||y+h>1.005){console.log('FAIL gallery face outside picture',id,JSON.stringify([x,y,w,h]));bad++;}
  const headTop=y-0.25*h;if(headTop<0){const known=F._srcCut&&F._srcCut[it.img];if(F._headOk&&F._headOk[it.img]){}else if(known){warn++;}else{console.log('FAIL head cut by the photo file itself (not in _srcCut)',id,it.img,JSON.stringify([x,y,w,h]));bad++;}}}}
console.log('gallery: '+g0+' faces checked in '+gal.length+' pictures; '+warn+' heads clipped by the original upload (known, listed in faces.json _srcCut: '+Object.keys(F._srcCut||{}).join(', ')+')');
console.log((bad?'FAIL ':'PASS ')+'focus: '+n+' main faces fully inside their crops');process.exit(bad?1:0);
