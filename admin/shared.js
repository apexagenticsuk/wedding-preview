/* Shared content editor: one place to edit content that appears on several pages. Edits go through DYE.change, so undo, drafts, preview and publish treat them like any other change. */
(function(){
var D=document,$=function(s){return D.querySelector(s);};
var PLACES=[['home','Home page'],['page','Testimonials page']];
var CLIPPLACES=[['home','Home: A little taste'],['fun','Home: It’s all about the fun'],['videos','Videos page']];
var SAY=function(n){return {id:n+Date.now().toString(36)};};
var DEFS={
 testimonials:{title:'Testimonials',note:'Each testimonial is written once and shows on one page: the Home page (a few) or the Testimonials page (the rest).',path:'testimonials',kind:'list',label:function(t){return (t.who||'New testimonial')+(t.role?' · '+t.role:'');},blank:function(){return {id:'t'+Date.now().toString(36),place:'page',who:'',role:'',text:'',img:'',source:''};},
  fields:[['place','Shows on','select',PLACES],['who','Who said it','text'],['role','Role (for example Bride & Groom)','text'],['text','What they said (a new line starts a new paragraph)','area'],['img','Round photo','img'],['pos','Face position in the circle (x% y%, e.g. 50% 30%; 0% = left or top, 100% = right or bottom)','text'],['source','Small credit line (optional)','text']]},
 clips:{title:'Videos',note:'YouTube videos. Visitors only load YouTube after they press play. Paste the code from the link (the part after v=).',path:'clips',kind:'list',label:function(k){return k.title||'New video';},blank:function(){return {id:'c'+Date.now().toString(36),vid:'',title:'New video',cap:'',thumb:'',place:'videos'};},
  fields:[['vid','Video ID (the code in the link)','text'],['title','Title','text'],['cap','Short description','area'],['thumb','Thumbnail picture','img'],['place','Shown on','select',CLIPPLACES]]},
 faqs:{title:'FAQs',note:'Questions and answers on the FAQs page. In an answer you can type {set.length}, {set.kit}, {set.regions}, {contact.phone}, {contact.email} or {contact.base} and the real value is filled in.',path:'faqs',kind:'list',label:function(q){return q.q||'New question';},blank:function(){return {q:'New question',a:'Answer'};},
  fields:[['q','Question','area'],['a','Answer (a new line starts a new paragraph)','area']]},
 praise:{title:'Quotes about Dave',note:'The “There’s something about Dave!” strip on the Home page.',path:'praise',kind:'list',label:function(p){return p.name||'New quote';},blank:function(){return {id:'p'+Date.now().toString(36),name:'Name',text:'',img:''};},
  fields:[['name','Name','text'],['text','Quote','area'],['img','Photo','img'],['shape','Photo shape','select',[['','Round'],['wide','Wide (for a group photo, shows all of it)']]],['pos','Face position in the circle (x% y%, e.g. 50% 30%; 0% = left or top, 100% = right or bottom)','text']]},
 gallery:{title:'Photo gallery',note:'“Say Hello to my little friends…” on the Home page.',path:'gallery',kind:'list',label:function(g){return (g.cap||'New photo').slice(0,50);},blank:function(){return {img:'',alt:'',cap:'',pos:'50% 50%'};},
  fields:[['img','Photo','img'],['alt','Picture description','text'],['cap','Caption','area'],['pos','Focus point (x% y%, e.g. 50% 0%; 0% = left or top, 100% = right or bottom). Only matters where a photo is cropped; faces are tested in tests/gallery.js','text']],
  extra:{title:'Gallery intro (picture and words)',path:'galleryIntro',fields:[['img','Picture','img'],['alt','Picture description','text'],['text','Words','area'],['pos','Focus point (x% y%, e.g. 50% 30%)','text']]}},
 posts:{title:'Blog posts',note:'All blog posts, newest first. Type the date any normal way, for example 4 Oct 2017 or 04/10/2017.',path:'posts',kind:'list',sort:'date',desc:true,label:function(p){return (p.title||'⚠ No title yet')+(p.date?' · '+p.date:'');},blank:function(){return {id:'post'+Date.now().toString(36),title:'New post',by:'The Wedding Comedian',date:'',img:'',alt:'',body:''};},
  fields:[['title','Title','text'],['date','Date','date'],['by','Written by','text'],['img','Picture (optional)','img'],['alt','Picture description','text'],['body','Text (a new line starts a new paragraph)','area']]},
 facts:{title:'Key facts strip',note:'The four facts under the Home banner. Use {set.length}, {set.kit}, {set.regions} so each fact is only ever written once.',path:'facts',kind:'list',label:function(f){return f.k||'New fact';},blank:function(){return {k:'Label',v:''};},fields:[['k','Label','text'],['v','Value','text']]},
 set:{title:'The set',note:'Used by the key facts and the FAQs.',path:'set',kind:'object',fields:[['length','How long the show is','text'],['kit','Sound and lighting','text'],['regions','Where Dave travels','text']]},
 contact:{title:'Contact details',note:'Used by the header buttons, the footer on every page, the Contact page and the structured data.',path:'contact',kind:'object',fields:[['phone','Phone','text'],['email','Email','text'],['org','Company name','text'],['brand','Brand name','text'],['person','Performer','text'],['base','Based in','text'],['tagline','Contact box line','text'],['website','Website','text'],['sayhello','Closing line on Contact','text']]},
};
var OPEN={},GEN=0;
var ORDER=['testimonials','clips','faqs','praise','gallery','posts','facts','set','contact'],cur='testimonials',modal=null;
function get(o,p){return p.split('.').reduce(function(a,k){return a==null?a:a[k];},o);}
function put(o,p,v){var a=p.split('.'),l=a.pop();a.forEach(function(k){o=o[k]=o[k]||{};});o[l]=v;}
function root(c,p){var a=p.split('.'),o=c;for(var i=0;i<a.length;i++){if(o[a[i]]==null)o[a[i]]=(i===a.length-1&&DEFS[cur]&&DEFS[cur].kind==='list')?[]:{};o=o[a[i]];}return o;}
function C(){return DYE.state().content;}
function IMG(p){var r=DYE.resolve(p);return /^(https?:|data:|blob:|\/|\.\.\/)/.test(r)?r:'../'+r;}
var MONS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
/* typed dates: 2026-12-10, 10/12/2026, 10 Dec 2026, 10th December, Dec 10 2026 (no year = the year of the old date, else this year). Returns YYYY-MM-DD or '' */
function parseDate(t,old){t=String(t||'').trim().toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g,'$1').replace(/[,.]/g,' ').replace(/\s+/g,' ').trim().replace(/^(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[a-z]*\.? /,'').replace(/ (mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[a-z]*$/,'');var y=null,m=null,d=null,r;
  if((r=t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))){y=+r[1];m=+r[2];d=+r[3];}
  else if((r=t.match(/^(\d{1,2})[\/\- ](\d{1,2})(?:[\/\- ](\d{2,4}))?$/))){d=+r[1];m=+r[2];y=r[3]?+r[3]:null;}
  else if((r=t.match(/^(?:[a-z]+day )?(\d{1,2}) ([a-z]{3,9})(?: (\d{2,4}))?$/))){d=+r[1];m=MONS.indexOf(r[2].slice(0,3))+1;y=r[3]?+r[3]:null;}
  else if((r=t.match(/^(?:[a-z]+day )?([a-z]{3,9}) (\d{1,2})(?: (\d{2,4}))?$/))){m=MONS.indexOf(r[1].slice(0,3))+1;d=+r[2];y=r[3]?+r[3]:null;}
  else return '';
  if(y!=null&&y<100)y+=2000;if(y==null)y=/^\d{4}/.test(old||'')?+old.slice(0,4):new Date().getFullYear();
  if(!(m>=1&&m<=12&&d>=1&&d<=31))return '';var dt=new Date(Date.UTC(y,m-1,d));if(dt.getUTCMonth()!==m-1)return '';return y+'-'+(m<10?'0':'')+m+'-'+(d<10?'0':'')+d;}
window.DYE.parseDate=parseDate;
function el(t,cls,h){var e=D.createElement(t);if(cls)e.className=cls;if(h!=null)e.innerHTML=h;return e;}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
function build(){modal=el('div','modal');modal.id='sharedm';modal.hidden=true;modal.innerHTML='<div class="mc wide"><button class="x" data-sclose aria-label="Close">✕</button><h2>Shared content</h2><p class="hint">Things that show on more than one page are edited here once. Changes appear everywhere they are used.</p><div class="shtabs" role="tablist"></div><div class="shbody"></div><div class="row"><button class="btn red" data-sclose>Done</button></div></div>';
  D.body.appendChild(modal);modal.onclick=function(e){if(e.target===modal||e.target.closest('[data-sclose]'))modal.hidden=true;};
  D.addEventListener('keydown',function(e){if(e.key==='Escape'&&modal&&!modal.hidden)modal.hidden=true;});}
function fieldEl(def,f,obj,onSet){var k=f[0],lab=f[1],ty=f[2],wrap=el('label','shf'),v=get(obj,k),inp;wrap.appendChild(el('span','',lab));
  if(ty==='bool'){inp=el('input');inp.type='checkbox';inp.checked=!!v;inp.onchange=function(){onSet(k,inp.checked);};wrap.className='shf chk';wrap.insertBefore(inp,wrap.firstChild);return wrap;}
  if(ty==='select'){inp=el('select');f[3].forEach(function(o){var op=el('option','',esc(o[1]));op.value=o[0];inp.appendChild(op);});inp.value=v||f[3][0][0];inp.onchange=function(){onSet(k,inp.value);};wrap.appendChild(inp);return wrap;}
  if(ty==='area'||ty==='lines'){inp=el('textarea');inp.maxLength=12000;inp.rows=ty==='lines'?6:3;inp.value=ty==='lines'?(v||[]).map(function(x){return (x.home?'*':'')+x.t;}).join('\n'):(v||'');
    inp.onchange=function(){onSet(k,ty==='lines'?inp.value.split('\n').map(function(l){return l.trim();}).filter(Boolean).map(function(l){var h=l.charAt(0)==='*';return {t:h?l.slice(1).trim():l,home:h};}):inp.value);};wrap.appendChild(inp);return wrap;}
  if(ty==='img'){var row=el('div','shimg'),im=el('img');im.alt='';im.src=v?IMG(v):'';im.hidden=!v;inp=el('input');inp.type='text';inp.value=v||'';inp.placeholder='assets/…';var up=el('button','btn ghost sm','Choose picture…');up.type='button';
    var fi=el('input');fi.type='file';fi.accept='image/*';fi.hidden=true;up.onclick=function(){fi.click();};fi.onchange=function(){if(!fi.files[0])return;DYE.upload(fi.files[0],1400).then(function(p){inp.value=p;im.src=IMG(p);im.hidden=false;onSet(k,p);}).catch(function(e){DYE.toast(e.message);});};
    inp.onchange=function(){im.src=inp.value?IMG(inp.value):'';im.hidden=!inp.value;onSet(k,inp.value.trim());};row.appendChild(im);row.appendChild(inp);row.appendChild(up);row.appendChild(fi);wrap.appendChild(row);return wrap;}
  if(ty==='date'){var drow=el('div','shdate'),pick=el('input'),msg=el('small','shmsg','');inp=el('input');inp.type='text';inp.value=v||'';inp.placeholder='e.g. Fri 4th Dec, 4 Dec 2026 or 04/12/2026';inp.setAttribute('aria-label',lab);pick.type='date';pick.value=/^\d{4}-\d\d-\d\d$/.test(v||'')?v:'';pick.title='Pick from a calendar';pick.setAttribute('aria-label',lab+' calendar');
    inp.onchange=function(){var iso=parseDate(inp.value,v);if(!iso){msg.textContent='I couldn’t read that date. Try Fri 4th Dec, 4 Dec 2026 or 04/12/2026.';msg.className='shmsg err';return;}msg.textContent=iso!==inp.value.trim()?'Saved as '+iso:'';msg.className='shmsg';inp.value=iso;pick.value=iso;v=iso;onSet(k,iso);};
    pick.onchange=function(){if(pick.value){inp.value=pick.value;inp.onchange();}};drow.appendChild(inp);drow.appendChild(pick);wrap.appendChild(drow);wrap.appendChild(msg);return wrap;}
  inp=el('input');inp.maxLength=ty==='url'?500:(f[3]||160);inp.type=ty==='url'?'url':'text';inp.value=ty==='csv'?(v||[]).join(', '):(v||'');
  inp.onchange=function(){onSet(k,ty==='csv'?inp.value.split(',').map(function(s){return s.trim();}).filter(Boolean):inp.value.trim());};wrap.appendChild(inp);return wrap;}
function render(keepIdx){var def=DEFS[cur],tabs=modal.querySelector('.shtabs'),body=modal.querySelector('.shbody');tabs.innerHTML='';var sc=modal.scrollTop,os=OPEN[cur]=OPEN[cur]||[],myGen=++GEN;
  ORDER.forEach(function(k){var b=el('button','shtab'+(k===cur?' on':''),esc(DEFS[k].title));b.type='button';b.setAttribute('role','tab');b.onclick=function(){cur=k;render();};tabs.appendChild(b);});
  body.innerHTML='';body.appendChild(el('p','hint',esc(def.note)));
  function change(fn){DYE.change(function(c){fn(c);},{reload:true});}
  function set(path,idx,k,v,sort){if(myGen!==GEN)return; /* a stale row (already re-drawn after a re-sort) must never edit another show */var ni=idx;
    change(function(c){var arr=idx==null?null:root(c,path),o=idx==null?root(c,path):arr[idx];put(o,k,v);
      if(sort&&k===sort&&arr){var dir=def.desc?-1:1,t=arr.map(function(x,n){return {x:x,n:n};});
        t.sort(function(a,b){var ka=String(a.x[sort]||(def.desc?'':'9999')),kb=String(b.x[sort]||(def.desc?'':'9999'));return ka<kb?-dir:ka>kb?dir:a.n-b.n;});
        t.forEach(function(e,n){arr[n]=e.x;});ni=arr.indexOf(o);}});
    if(sort&&k===sort&&idx!=null){if(ni!==idx)os.splice(ni,0,!!os.splice(idx,1)[0]);for(var q=0;q<os.length;q++)os[q]=false;os[ni]=true;render(ni);}}
  if(def.kind==='object'){var o=get(C(),def.path)||{},card=el('div','shrow');def.fields.forEach(function(f){card.appendChild(fieldEl(def,f,o,function(k,v){set(def.path,null,k,v);}));});body.appendChild(card);return;}
  var list=get(C(),def.path)||[];
  list.forEach(function(it,i){var d=el('details','shrow'),sm=el('summary','',esc(def.label(it)));d.open=!!os[i];d.addEventListener('toggle',function(){os[i]=d.open;});d.appendChild(sm);var tools=el('div','shtools','<button type="button" data-up title="Move up">↑</button><button type="button" data-dn title="Move down">↓</button><button type="button" data-del title="Delete">Delete</button>');
    d.appendChild(tools);def.fields.forEach(function(f){d.appendChild(fieldEl(def,f,it,function(k,v){set(def.path,i,k,v,def.sort);sm.textContent=def.label(get(C(),def.path)[i]||it);if(k==='title'&&!String(v||'').trim())DYE.toast('This one has no title yet. Please type one before you publish.',5000);}));});
    tools.querySelector('[data-up]').onclick=function(){if(i>0){change(function(c){var a=root(c,def.path);a.splice(i-1,0,a.splice(i,1)[0]);});os.splice(i-1,0,!!os.splice(i,1)[0]);render();}};
    tools.querySelector('[data-dn]').onclick=function(){if(i<list.length-1){change(function(c){var a=root(c,def.path);a.splice(i+1,0,a.splice(i,1)[0]);});os.splice(i+1,0,!!os.splice(i,1)[0]);render();}};
    tools.querySelector('[data-del]').onclick=function(){DYE.dialog({title:'Delete this?',text:'“'+def.label(it)+'” will be removed everywhere it is used.',ok:'Delete',cancel:'Keep it'}).then(function(r){if(r.ok){change(function(c){root(c,def.path).splice(i,1);});os.splice(i,1);render();}});};
    body.appendChild(d);});
  var add=el('button','btn gold sm','+ Add');add.type='button';add.onclick=function(){var n0=list.length;change(function(c){root(c,def.path).push(def.blank());});os[n0]=true;render();var ds=body.querySelectorAll('details');if(ds.length)ds[ds.length-1].scrollIntoView({block:'nearest'});};body.appendChild(add);modal.scrollTop=sc;if(keepIdx!=null){var kd=body.querySelectorAll('details')[keepIdx];if(kd){try{kd.scrollIntoView({block:'nearest'});var fi=kd.querySelector('input,textarea');}catch(e){}}}
  if(def.extra){var ex=def.extra,o2=get(C(),ex.path)||{},card=el('div','shrow');card.appendChild(el('h3','',esc(ex.title)));ex.fields.forEach(function(f){card.appendChild(fieldEl(def,f,o2,function(k,v){change(function(c){put(root(c,ex.path),k,v);});}));});body.appendChild(card);}}
window.DYE.openShared=function(key){if(!modal)build();if(key&&DEFS[key])cur=key;render();modal.hidden=false;};
window.DYE.sharedDefs=DEFS;
D.addEventListener('DOMContentLoaded',function(){var b=$('#sharedb');if(b)b.onclick=function(){DYE.openShared();};});
})();
