// Every round photo (praise + testimonials) must show its main face(s) fully inside the square crop at the stored focal point (content.json pos).
// Face boxes come from tests/faces.json (detected once with a face detector and checked by eye). Hero and gallery images are not cropped (natural aspect).
const fs=require('fs');const C=JSON.parse(fs.readFileSync(__dirname+'/../content.json','utf8'));const F=JSON.parse(fs.readFileSync(__dirname+'/faces.json','utf8'));
let bad=0,n=0;
for(const it of [...C.praise,...C.testimonials]){const f=F[it.img];if(!f){console.log('NO FACE DATA',it.img);bad++;continue;}
 const m=/^(\d+)% (\d+)%$/.exec(it.pos||'50% 50%');if(!m){console.log('FAIL bad pos',it.id,it.pos);bad++;continue;}
 const d=C.dims[it.img];const W=d?d[0]:f.size[0],H=d?d[1]:f.size[1];const s=Math.min(W,H);const x0=(W-s)*m[1]/100/W,y0=(H-s)*m[2]/100/H,x1=x0+s/W,y1=y0+s/H;
 for(const [x,y,w,h] of f.main){n++;const ok=x>=x0-0.005&&x+w<=x1+0.005&&y>=y0-0.005&&y+h<=y1+0.005;if(!ok){bad++;console.log('FAIL face cut',it.id,it.pos,JSON.stringify([x,y,w,h]));}}}
console.log((bad?'FAIL ':'PASS ')+'focus: '+n+' main faces fully inside their crops');process.exit(bad?1:0);
