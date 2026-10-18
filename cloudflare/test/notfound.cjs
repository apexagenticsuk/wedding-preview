// Unknown paths return a real 404 (styled, noindex); known pages and custom pages saved in the editor still return 200. Usage: node cloudflare/test/notfound.cjs [base]
const fs=require('fs');const BASE=process.argv[2]||'http://localhost:8792';const PASS=process.env.PASS||'local-test-passcode-0001';
const res=[];const ok=(n,c,x)=>{res.push(!!c);console.log((c?'PASS ':'FAIL ')+n+(x&&!c?' '+String(x).slice(0,200):''));};
const H={'X-DY-Editor':'1','Content-Type':'application/json',Origin:BASE};
(async()=>{
 const f=fs.readFileSync(__dirname+'/../../404.html','utf8');
 ok('404.html is in the repo, noindex, with the site header and a way home',/name="robots" content="noindex/.test(f)&&/<header/.test(f)&&/Page\s*<span class="r">not found/.test(f)&&/href="index.html"/.test(f));
 ok('404.html resolves its files from the site root whatever the depth (base)',/<base href=/.test(f)&&/document\.write/.test(f));
 for(const u of ['/nope','/a/b/c/d','/about.png','/sitemap.xml','/sitemap_index.xml','/privacyy','/uploads/none.webp','/admin/nothing']){const r=await fetch(BASE+u,{redirect:'manual'});const t=await r.text();
  ok('unknown path '+u+' returns status 404 with the styled noindex page',r.status===404&&(/Page\s*<span class="r">not found/.test(t)||u.startsWith('/uploads'))&&(u.startsWith('/uploads')||/noindex/.test(t))&&/noindex/.test(r.headers.get('x-robots-tag')||''),r.status+' '+t.slice(0,60));}
 for(const u of ['/','/videos','/testimonials','/faqs','/blog','/contact','/privacy','/robots.txt','/content.json','/style.css','/admin/']){const r=await fetch(BASE+u,{redirect:'follow'});ok('known path '+u+' still 200',r.status===200,r.status);}
 const lr=await fetch(BASE+'/api/login',{method:'POST',headers:H,body:JSON.stringify({passcode:PASS})});const ck=(lr.headers.get('set-cookie')||'').split(';')[0];const A=Object.assign({},H,{Cookie:ck});
 const orig=(await (await fetch(BASE+'/api/export',{headers:A})).json()).content;const c=JSON.parse(JSON.stringify(orig));
 c.custom=Object.assign({},c.custom,{nftest:{base:'page',title:'NF test'}});c.version=new Date().toISOString().replace(/\.\d+Z$/,'Z');
 const pr=await fetch(BASE+'/api/publish',{method:'POST',headers:A,body:JSON.stringify(c)});ok('publish with a custom page accepted',pr.status===200,pr.status);
 const r1=await fetch(BASE+'/nftest');const t1=await r1.text();ok('a custom page saved in the editor is 200 (not 404) and noindex',r1.status===200&&/NF test/.test(t1)&&/noindex/.test(t1),r1.status);
 const r2=await fetch(BASE+'/nftest.html',{redirect:'follow'});ok('the custom page also answers on .html',r2.status===200,r2.status);
 for(let i=0;i<2;i++){const o=Object.assign({},orig,{version:new Date(Date.now()+1000*(i+1)).toISOString().replace(/\.\d+Z$/,'Z')});await fetch(BASE+'/api/publish',{method:'POST',headers:A,body:JSON.stringify(o)});}
 const r3=await fetch(BASE+'/nftest');ok('after restoring, the custom page is gone: 404 again',r3.status===404,r3.status);
 const k=res.filter(Boolean).length;console.log('SUMMARY '+k+'/'+res.length);process.exit(k===res.length?0:1);})().catch(e=>{console.error(e.message);process.exit(1);});
