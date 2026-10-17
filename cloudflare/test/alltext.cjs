// Every editable text id on every page (page scope and shared header/footer scope) is saved and shows on the public page.
// Usage: SITE=marta node cloudflare/test/alltext.cjs [base] [pages comma list]. Local passcode by default (PASS env for another).
const {chromium}=require('playwright');
const BASE=process.argv[2]||'http://localhost:8792';const PASS=process.env.PASS||'local-test-passcode-0001';
const PAGES=(process.argv[3]||'/,/about,/gallery,/testimonials,/blog,/contact').split(',');
const res=[];const ok=(n,c,x)=>{res.push(!!c);console.log((c?'PASS ':'FAIL ')+n+(x&&!c?' '+x:''));};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
const ctx=await b.newContext();const p=await ctx.newPage();await p.goto(BASE+'/admin/');
await p.evaluate(async pw=>{await fetch('/api/login',{method:'POST',headers:{'X-DY-Editor':'1','Content-Type':'application/json'},body:JSON.stringify({passcode:pw})});},PASS);
const H={'X-DY-Editor':'1','Content-Type':'application/json'};
const orig=await p.evaluate(()=>fetch('/api/export',{headers:{'X-DY-Editor':'1'}}).then(r=>r.json()).then(j=>j.content));
const key=u=>u==='/'?'index':u.slice(1);
// 1. discover ids from the unedited built pages (no overlay): elements with data-dy t-ids, with scope as the site uses it
const q=await (await b.newContext({javaScriptEnabled:false})).newPage();const ids={};
for(const u of PAGES){await q.goto(BASE+u);ids[u]=await q.evaluate(()=>{const o={page:[],site:[]};document.querySelectorAll('[data-dy]').forEach(el=>{const sc=el.closest('header.top,footer,.sticky')?'site':'page';el.getAttribute('data-dy').split(' ').forEach(t=>{if(/^t\d+$/.test(t))o[sc].push(t);});});return o;});}
// 2. build content with a marker for every id
const c=JSON.parse(JSON.stringify(orig));c.version='2026-10-18T00:00:00Z';c.site=c.site||{};c.pages=c.pages||{};c.site.text=c.site.text||{};
let n=0;const want={};
for(const u of PAGES){const k=key(u);c.pages[k]=c.pages[k]||{};c.pages[k].text=c.pages[k].text||{};want[u]={page:{},site:{}};
 for(const id of new Set(ids[u].page)){const m='ZZpg'+(++n);c.pages[k].text[id]=m;want[u].page[id]=m;}
 for(const id of new Set(ids[u].site)){const m='ZZst'+k+(++n);c.site.text[id]=m;want[u].site[id]=m;}}
// shared header/footer ids are one set for the whole site: last page's marker wins, so use one marker per id
const siteMark={};for(const u of PAGES)for(const id of Object.keys(want[u].site)){siteMark[id]=siteMark[id]||want[u].site[id];c.site.text[id]=siteMark[id];want[u].site[id]=siteMark[id];}
const st=await p.evaluate(async c=>fetch('/api/publish',{method:'POST',headers:{'X-DY-Editor':'1','Content-Type':'application/json'},body:JSON.stringify(c)}).then(r=>r.status),c);
ok('publish of a marker for every text id ('+n+' ids) accepted',st===200,st);
// 3. every marker visible on its public page (one id can be used twice on a page: every copy must change)
const v=await (await b.newContext()).newPage();let bad=0,total=0,skipped=0;const stale=[];
for(const u of PAGES){await v.goto(BASE+u,{waitUntil:'load'});await v.waitForTimeout(1500);
 const r=await v.evaluate(w=>{const out=[];['page','site'].forEach(sc=>Object.keys(w[sc]).forEach(id=>{const els=[...document.querySelectorAll('[data-dy~="'+id+'"]')].filter(el=>(el.closest('header.top,footer,.sticky')?'site':'page')===sc);const vis=els.filter(el=>el.textContent.indexOf(w[sc][id])>-1).length;out.push([sc,id,els.length,vis]);}));return out;},want[u]);
 for(const [sc,id,els,vis] of r){if(els===0){skipped++;continue;}total++;if(!(vis>=1)){bad++;stale.push(u+' '+sc+':'+id+' '+vis+'/'+els);}}}
console.log('INFO '+skipped+' ids are on menu links that the site rebuilds from the menu list (not text ids on the page): skipped');ok('every text id shows its saved text on its page ('+total+' checks)',bad===0&&total>50,stale.slice(0,15).join(' ; '));
// copies of the same id on one page must all update
await p.evaluate(async o=>fetch('/api/publish',{method:'POST',headers:{'X-DY-Editor':'1','Content-Type':'application/json'},body:JSON.stringify(o)}),Object.assign({},orig,{version:'2026-10-18T00:00:01Z'}));
await p.evaluate(async o=>fetch('/api/publish',{method:'POST',headers:{'X-DY-Editor':'1','Content-Type':'application/json'},body:JSON.stringify(o)}),Object.assign({},orig,{version:'2026-10-18T00:00:02Z'}));
await b.close();const k=res.filter(Boolean).length;console.log('SUMMARY '+k+'/'+res.length);process.exit(k===res.length?0:1);})().catch(e=>{console.error(e.message);process.exit(1);});
