// What a visitor WITHOUT JavaScript (curl, search engines, link previews) gets after Publish: the Function writes the saved
// text, picture, footer text and link edits into the page HTML. Usage: node cloudflare/test/nojs.cjs <base> (PASS env or the local test passcode)
const fs=require('fs');
const BASE=(process.argv[2]||'http://localhost:8792').replace(/\/$/,'');const PASS=process.env.PASS||'local-test-passcode-0001';
const res=[];const ok=(n,c,x)=>{res.push(!!c);console.log((c?'PASS ':'FAIL ')+n+(x&&!c?' '+String(x).replace(PASS,'***').slice(0,200):''));};
const BUILTIN=eval(/const BUILTIN = (\[[^\]]*\])/.exec(fs.readFileSync(__dirname+'/../_worker.js','utf8'))[1]).filter(k=>k!=='page');
const bodyOf=h=>{const a=Math.max(h.indexOf('<main'),h.indexOf('</header>')),b=h.indexOf('<footer');return h.slice(a,b>a?b:undefined);};
const H={'X-DY-Editor':'1','Content-Type':'application/json',Origin:BASE};
(async()=>{
 const lr=await fetch(BASE+'/api/login',{method:'POST',headers:H,body:JSON.stringify({passcode:PASS})});const ck=(lr.headers.get('set-cookie')||'').split(';')[0];
 ok('login for the no-JS test',lr.status===200&&!!ck);const A=Object.assign({},H,{Cookie:ck});
 const orig=(await (await fetch(BASE+'/api/export',{headers:A})).json()).content;const c=JSON.parse(JSON.stringify(orig));
 c.pages=c.pages||{};c.site=c.site||{};c.site.text=c.site.text||{};
 const get=async(k,extra)=>fetch(BASE+(k==='index'?'/':'/'+k),{headers:extra||{},redirect:'follow'});
 const plan=[];const stamp='NOJS'+Date.now().toString(36);
 for(const k of BUILTIN){const r=await get(k);if(r.status!==200)continue;const h=await r.text();if(!/data-dy=/.test(h))continue;
  const body=bodyOf(h);const toks=[];(body.match(/data-dy="[^"]*"/g)||[]).forEach(x=>x.slice(9,-1).split(' ').forEach(t=>toks.push(t)));const uniq=t=>toks.filter(x=>x===t).length===1;
  const pick=(re,kind)=>{let m,r=new RegExp(re.source,'g');while((m=r.exec(body))){const id=m[1].split(' ').find(x=>new RegExp('^'+kind+'\\d+$').test(x));if(id&&uniq(id))return id;}};
  const tt=pick(/data-dy="([^"]*)"/,'t'),iid=pick(/<img[^>]*data-dy="([^"]*)"/,'i'),lid=pick(/<a[^>]*data-dy="([^"]*)"/,'a');
  const p={k,tt,iid,lid,mark:stamp+'-'+k};const P=c.pages[k]=c.pages[k]||{};
  if(tt){P.text=P.text||{};P.text[tt]='Heading <span class="r">'+p.mark+'</span> <script>x()</script>';}
  if(iid){P.img=P.img||{};P.img[iid]={src:'assets/'+p.mark+'.webp',alt:'alt '+p.mark};}
  if(lid){P.link=P.link||{};P.link[lid]='https://example.com/'+p.mark;}
  plan.push(p);}
 const first=await get(plan[0].k);const fh=await first.text();const ft=fh.slice(fh.indexOf('<footer'));const fid=(/data-dy="([^"]*\bt\d+[^"]*)"/.exec(ft)||[])[1];const ftoks=(ft.match(/data-dy="[^"]*"/g)||[]).join(' ');const ftt=fid&&fid.split(' ').find(x=>/^t\d+$/.test(x));
 if(ftt)c.site.text[ftt]='Footer '+stamp;
 ok('found pages with editable text to test',plan.length>=3&&plan.every(p=>p.tt),JSON.stringify(plan.map(p=>p.k)));
 const before=await get(plan[0].k);const et=before.headers.get('etag');
 c.version=new Date().toISOString().replace(/\.\d+Z$/,'Z');
 const pr=await fetch(BASE+'/api/publish',{method:'POST',headers:A,body:JSON.stringify(c)});const pj=await pr.json();ok('publish accepted',pr.status===200&&!!pj.savedAt,pr.status);
 for(const p of plan){const r=await get(p.k);const h=await r.text();
  ok(p.k+': saved heading text is in the HTML a no-JS visitor gets',h.indexOf('<span class="r">'+p.mark+'</span>')>-1);
  ok(p.k+': the script in the saved text is not in the HTML',h.indexOf('x()')<0);
  if(p.iid){const t=new RegExp('<img[^>]*data-dy="[^"]*\\b'+p.iid+'\\b[^"]*"[^>]*>').exec(bodyOf(h));ok(p.k+': picture src and alt are the saved ones in the HTML',t&&t[0].indexOf('assets/'+p.mark+'.webp')>-1&&t[0].indexOf('alt '+p.mark)>-1&&!/srcset/.test(t[0]),t&&t[0]);}
  if(p.lid){const t=new RegExp('<a[^>]*data-dy="[^"]*\\b'+p.lid+'\\b[^"]*"[^>]*>').exec(bodyOf(h));ok(p.k+': link href is the saved one in the HTML',t&&t[0].indexOf('https://example.com/'+p.mark)>-1,t&&t[0]);}
  ok(p.k+': noindex header and meta kept',/noindex/.test(r.headers.get('x-robots-tag')||'')&&/name="robots" content="noindex/.test(h));
  ok(p.k+': served with no-cache and the saved time',/no-cache/.test(r.headers.get('cache-control')||'')&&r.headers.get('x-content-saved-at')===pj.savedAt,r.headers.get('x-content-saved-at'));
  const other=plan.find(q=>q.k!==p.k);ok(p.k+': another page\'s edit does not leak in',h.indexOf(other.mark)<0);}
 if(ftt){const r=await get(plan[0].k);const h=await r.text();ok('shared footer text edit is in the HTML',h.indexOf('Footer '+stamp)>-1);}
 const r304=await get(plan[0].k,et?{'If-None-Match':et}:{});ok('a browser revalidating an old copy gets the new page, not a 304',r304.status===200&&(await r304.text()).indexOf(plan[0].mark)>-1);
 const hd=await fetch(BASE+(plan[0].k==='index'?'/':'/'+plan[0].k),{method:'HEAD'});ok('HEAD works',hd.status===200&&hd.headers.get('x-content-saved-at')===pj.savedAt);
 const ad=await fetch(BASE+'/admin/');ok('admin page is not rewritten and stays no-store',ad.status===200&&/no-store/.test(ad.headers.get('cache-control')||'')&&!ad.headers.get('x-content-saved-at'));
 const as=await fetch(BASE+'/style.css');ok('css is untouched',as.status===200&&/css/.test(as.headers.get('content-type')||'')&&!as.headers.get('x-content-saved-at'));
 for(let i=1;i<=2;i++){const o=Object.assign({},orig,{version:orig.version});await fetch(BASE+'/api/publish',{method:'POST',headers:A,body:JSON.stringify(o)});}
 const back=await (await get(plan[0].k)).text();ok('after restoring the original, the HTML no longer carries the edit',back.indexOf(plan[0].mark)<0);
 const n=res.length,p=res.filter(Boolean).length;console.log('SUMMARY '+p+'/'+n);process.exit(p===n?0:1);
})().catch(e=>{console.log('FAIL error '+String(e.message).replace(PASS,'***'));process.exit(1);});
