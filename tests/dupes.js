const {chromium}=require(process.env.PW||'playwright');
const base=process.argv[2]||'http://localhost:8765';
const pages=(process.argv[3]||'index,live,about,book,clips,corporate,contact,magician').split(',');
const norm=s=>s.replace(/\s+/g,' ').trim().toLowerCase();
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const seen={};
for(const pg of pages){const p=await b.newPage();await p.goto(`${base}/${pg}.html`,{waitUntil:'networkidle'});
const blocks=await p.evaluate(()=>{const out=[];document.querySelectorAll('main *, body>section *, body>div *').forEach(e=>{if(e.closest('header,footer,nav,script,style,.proto,[data-cms]'))return;
 if(!/^(P|H1|H2|H3|H4|BLOCKQUOTE|LI|SPAN|B|CITE|A|SUMMARY|DIV)$/.test(e.tagName))return;
 if([...e.children].some(c=>/^(P|H1|H2|H3|H4|DIV|BLOCKQUOTE|LI)$/.test(c.tagName)))return;
 const t=e.innerText&&e.innerText.trim();if(t&&t.length>=28)out.push(t);});return out;});
for(const t of new Set(blocks.map(norm)))(seen[t]=seen[t]||[]).push(pg);await p.close();}
const shared={};
// (4) a topic (Christmas parties, 30 years, the bio blurb) is told in ONE place: body text outside pointer cards/buttons may mention it on one page only
const TOPICS={'Christmas parties':/christmas part(y|ies)|xmas part/i,'30 years':/\b30 years\b/i,'bio blurb':/professionally unhinged|agent of chaos/i,'weddings pitch':/best man become part/i};
const topicPages={};
for(const pg of pages){const p=await b.newPage();await p.goto(`${base}/${pg}.html`,{waitUntil:'networkidle'});
 const txt=await p.evaluate(()=>[...document.querySelectorAll('main p, main h1, main h2, main h3, main .big30, main .lead')].filter(e=>!e.closest('.svc,.pk,.btn,.ctabar,.tcard,.pickrow,.chip,.chips,.enq,.opts,.seeall')&&!e.querySelector('.btn')).map(e=>e.innerText.replace(/\s+/g,' ')));
 for(const [k,re] of Object.entries(TOPICS))if(txt.some(t=>re.test(t)))(topicPages[k]=topicPages[k]||[]).push(pg);await p.close();}
let topicBad=0;for(const [k,ps] of Object.entries(topicPages))if(ps.length>1){topicBad++;console.log('TOPIC REPEATED',k,'on',ps.join('+'));}
// extra checks: (1) the same image used twice on one page, (2) collection items (reviews, credits, service cards, date rows) repeated across pages,
// (3) the same collection region rendered with identical text on two pages
let extra=topicBad;const items={},regions={};
for(const pg of pages){const p=await b.newPage();await p.goto(`${base}/${pg}.html`,{waitUntil:'networkidle'});
 const d=await p.evaluate(()=>{const n=s=>s.replace(/\s+/g,' ').trim().toLowerCase();const imgs={};
  document.querySelectorAll('main img').forEach(i=>{if(i.closest('.lg,.logos,footer,.socials,.faces,.gal'))return;const k=(i.getAttribute('src')||'').replace(/\?.*/,'');if(k)imgs[k]=(imgs[k]||0)+1;});
  const it=[...document.querySelectorAll('main .tcard, main .cg li, main .svc, main .show, main .clip, main .prod')].map(e=>n(e.innerText)).filter(t=>t.length>12);
  const rg=[...document.querySelectorAll('main [data-cms]')].filter(e=>e.children.length>2).map(e=>e.getAttribute('data-cms')+'|'+n(e.innerText));
  return {imgs:Object.entries(imgs).filter(([k,v])=>v>1).map(([k])=>k),it,rg};});
 d.imgs.forEach(k=>{extra++;console.log('IMAGE USED TWICE on',pg,'|',k);});
 new Set(d.it).forEach(t=>(items[t]=items[t]||[]).push(pg));new Set(d.rg).forEach(t=>(regions[t]=regions[t]||[]).push(pg));await p.close();}
for(const [t,ps] of Object.entries(items))if(ps.length>1){extra++;console.log('ITEM REPEATED',ps.join('+'),'|',t.slice(0,90));}
for(const [t,ps] of Object.entries(regions))if(ps.length>1){extra++;console.log('REGION REPEATED',ps.join('+'),'|',t.slice(0,90));}
let n=0;for(const [t,ps] of Object.entries(seen))if(ps.length>1){n++;console.log(ps.join('+'),'|',t.slice(0,110));}
console.log('DUPLICATED BLOCKS',n,'EXTRA',extra);await b.close();process.exit(n||extra?1:0);})();
