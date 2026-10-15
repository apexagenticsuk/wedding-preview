// Computes stable element ids (same rules/numbering the runtime used before) and writes them into the HTML as data-dy="...".
// Usage: node assign_ids.js <siteDir> <port> page1 page2 ...   (site served on localhost:<port>)
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const [dir,port,...pages]=process.argv.slice(2);const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const p=await b.newPage();
await p.route('**/content.js',r=>r.abort());
for(const pg of pages){await p.goto(`http://localhost:${port}/${pg}.html`);
 const list=await p.evaluate(()=>{const n={site:{t:0,i:0,a:0,L:0,e:0},page:{t:0,i:0,a:0,L:0,e:0}},ids=new Map(),blocks=new Set(),secs=new Set();let s=0;
  const add=(el,id)=>{if(!ids.has(el))ids.set(el,[]);ids.get(el).push(id);};
  [...((document.querySelector('body>main')||document.body).children)].forEach(e=>{if(e.matches('header,footer,.proto,.sticky,script,nav'))return;add(e,'s'+(s++));secs.add(e);});
  const inBlock=el=>{for(let q=el.parentElement;q;q=q.parentElement)if(blocks.has(q))return true;return false;};
  document.body.querySelectorAll('*').forEach(el=>{
   if(el.closest('svg')||el.closest('.proto,script,style')||(el.closest('[data-cms]')&&!el.matches('[data-cms]')))return;
   const sc=el.closest('header.top,footer,.sticky')?'site':'page',c=n[sc];
   add(el,'e'+(c.e++));
   if(el.closest('video'))return;
   if(el.tagName==='IMG')add(el,'i'+(c.i++));
   if(el.tagName==='A')add(el,'a'+(c.a++));
   if(!el.matches('[data-cms]')&&!inBlock(el)&&[...el.childNodes].some(k=>k.nodeType===3&&/\S/.test(k.nodeValue))){add(el,'t'+(c.t++));blocks.add(el);}
   const ch=el.children;
   if(sc==='page'&&!el.matches('[data-cms]')&&ch.length>=2&&!secs.has(el)){const sig=ch[0].tagName+'.'+ch[0].className;let same=true;for(let j=1;j<ch.length;j++)if(ch[j].tagName+'.'+ch[j].className!==sig){same=false;break;}
     if(same&&!/^(I|BR|SOURCE|OPTION)$/.test(ch[0].tagName))add(el,'L'+(c.L++));}
  });
  return [...document.querySelectorAll('*')].filter(el=>!el.hasAttribute('data-gen')).map(el=>[el.tagName.toLowerCase(),(ids.get(el)||[]).join(' ')]);});
 let src=fs.readFileSync(`${dir}/${pg}.html`,'utf8');if(src.includes('data-dy="'))throw new Error(pg+' already has ids');
 let k=0,bad=0;src=src.replace(/<([a-zA-Z][a-zA-Z0-9-]*)(?=[\s>\/])/g,(m,tag)=>{const e=list[k++];if(!e||e[0]!==tag.toLowerCase()){bad++;return m;}return e[1]?`${m} data-dy="${e[1]}"`:m;});
 if(bad||k!==list.length)throw new Error(`${pg}: tag mismatch bad=${bad} k=${k} list=${list.length}`);
 fs.writeFileSync(`${dir}/${pg}.html`,src);console.log(pg,'ok',list.filter(x=>x[1]).length,'elements');}
await b.close();})().catch(e=>{console.error(e.message);process.exit(1);});
