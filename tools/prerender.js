// Bakes every [data-cms] region (and the event JSON-LD) into the page HTML so pages work without script.
// Usage: node tools/prerender.js <siteDir> <port> page1 page2 ...   (site served on localhost:<port>)
const {chromium}=require('playwright');const fs=require('fs');
function regions(src){const out=[],re=/<(div|section)\b[^>]*\bdata-cms="[^"]*"[^>]*>/g;let m;
 while((m=re.exec(src))){const tag=m[1],start=m.index+m[0].length,rt=new RegExp('<(/?)'+tag+'\\b[^>]*>','g');rt.lastIndex=start;let depth=1,t;
  while((t=rt.exec(src))){depth+=t[1]?-1:1;if(!depth){out.push([start,t.index]);break;}}}
 return out;}
(async()=>{const [dir,port,...pages]=process.argv.slice(2);const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const p=await b.newPage();
await p.route('**/ui.js',r=>r.abort());
for(const pg of pages){await p.goto(`http://localhost:${port}/${pg}.html`,{waitUntil:'networkidle'});
 const got=await p.evaluate(()=>({cms:[...document.querySelectorAll('[data-cms]')].map(e=>e.innerHTML),ld:(document.getElementById('dy-ld')||{}).textContent||''}));
 let src=fs.readFileSync(`${dir}/${pg}.html`,'utf8');const rg=regions(src);
 if(rg.length!==got.cms.length)throw new Error(`${pg}: ${rg.length} regions in source, ${got.cms.length} rendered`);
 for(let i=rg.length-1;i>=0;i--)src=src.slice(0,rg[i][0])+got.cms[i]+src.slice(rg[i][1]);
 src=src.replace(/<script type="application\/ld\+json" id="dy-ld">[\s\S]*?<\/script>/,'');
 if(got.ld)src=src.replace('</head>',`<script type="application/ld+json" id="dy-ld">${got.ld.replace(/</g,'\\u003c')}</script></head>`);
 fs.writeFileSync(`${dir}/${pg}.html`,src);console.log(pg,'baked',rg.length,'regions',got.ld?'+ld':'');}
await b.close();})().catch(e=>{console.error(e.message);process.exit(1);});
