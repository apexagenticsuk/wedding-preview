// Links + images: every internal href/src must return 200 (incl. #anchors resolving); external links are
// probed and reported (warn only, third-party sites may block bots). Usage: node tests/links.js [base]
const {chromium}=require('playwright');
const BASE=(process.argv[2]||'http://localhost:8765').replace(/\/$/,'')+'/';
const PAGES=['index','live','about','book','corporate','contact','clips','magician','page'];
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--no-sandbox']});
const ctx=await b.newContext();const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
const seen=new Map(),ext=new Map();let fail=0,ok=0;
for(const pg of PAGES){await p.goto(BASE+pg+'.html',{waitUntil:'networkidle'});
 await p.evaluate(()=>document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager'));await p.waitForTimeout(400);
 const d=await p.evaluate(()=>({
  a:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')),
  s:[...document.querySelectorAll('img[src],source[src],script[src],link[href]')].map(e=>e.getAttribute('src')||e.getAttribute('href')),
  bad:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src),
  ids:[...document.querySelectorAll('[id]')].map(e=>e.id)}));
 d.bad.forEach(u=>{console.log('FAIL broken image',pg,u);fail++});
 for(const h of [...d.a,...d.s]){if(!h||/^(mailto:|tel:|javascript:|data:)/.test(h))continue;
  if(h[0]==='#'){if(h.length>1&&!d.ids.includes(h.slice(1))){console.log('FAIL anchor',pg,h);fail++}else ok++;continue}
  if(/^https?:/.test(h)&&!h.startsWith(BASE)){ext.set(h,pg);continue}
  const u=new URL(h,BASE+pg+'.html');u.hash='';const k=u.href;if(seen.has(k))continue;
  const r=await ctx.request.get(k).catch(e=>({status:()=>0}));seen.set(k,r.status());
  if(r.status()!==200){console.log('FAIL',r.status(),k,'on',pg);fail++}else ok++;}}
let w=0;for(const [u,pg] of ext){const r=await ctx.request.get(u,{timeout:15000,maxRedirects:5}).catch(e=>null);const s=r?r.status():0;
 if(s>=400||!s){console.log('WARN external',s||'ERR',u,'(first seen on '+pg+')');w++}}
console.log(`internal ok ${ok}, unique internal urls ${seen.size}, external probed ${ext.size}, external warn ${w}, js errors ${errs.length}`);
console.log(fail||errs.length?'LINKS FAIL':'LINKS PASS');await b.close();process.exit(fail||errs.length?1:0)})();
