/* On-page editing inside the editor frame. All changes go through parent.DYE (draft, undo, publish).
   Toolbars and panels live in the editor shell (selection bar under the toolbar, side panel on the right),
   so nothing floats over the page itself. */
(function(){
var R=window.DY.R,DYE=window.parent.DYE,PAGE=R.page,D=document,PD=DYE.doc,LIB=window.DY_LIB;
function C(){return DYE.state().content;}
function E(c,sc){if(sc==='site'){c.site=c.site||{};return c.site;}c.pages=c.pages||{};c.pages[PAGE]=c.pages[PAGE]||{};return c.pages[PAGE];}
function bag(o,k){return o[k]=o[k]||{};}
function mk(tag,cls,html){var e=D.createElement(tag);e.className='dy-ui '+(cls||'');if(html!=null)e.innerHTML=html;return e;}
function pk(tag,cls,html){var e=PD.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
function getP(o,p){return String(p).split('.').reduce(function(x,k){return x==null?x:x[k];},o);}
function setP(o,p,v){var ks=String(p).split('.'),x=o;ks.slice(0,-1).forEach(function(k){x=x[k]=x[k]||{};});x[ks[ks.length-1]]=v;}
function abs(p){return new URL(DYE.resolve(p),D.baseURI).href;}
function clone(x){return JSON.parse(JSON.stringify(x));}
function findBlock(c,bid){var P=E(c,'page'),g;for(g in P.ins||{}){var L=P.ins[g];for(var i=0;i<L.length;i++)if(L[i].id===bid)return {list:L,i:i,b:L[i],group:'ins:'+g};}
  for(g in P.secs||{}){var M=P.secs[g].blocks||[];for(var j=0;j<M.length;j++)if(M[j].id===bid)return {list:M,i:j,b:M[j],group:'sec:'+g};}return null;}
function cleanIns(P){Object.keys(P.ins||{}).forEach(function(k){if(!P.ins[k].length)delete P.ins[k];});}
function ask(o){finishEdit();return DYE.dialog(o).then(function(r){return r.ok;});}
var RK='dy-reopen';function reopenNext(o){try{sessionStorage.setItem(RK,JSON.stringify(o));}catch(e){}}
D.body.classList.add('dy-editing');

/* ---------- mark editable things ---------- */
var NAVSEL='nav.main a:not(.btn), #mnav a, footer .flinks a';
R.ids.forEach(function(o,el){if(!el.isConnected||el.closest(NAVSEL))return;if(o.t)el.setAttribute('data-dy-t','');if(o.i)el.setAttribute('data-dy-i','');});
D.querySelectorAll(NAVSEL).forEach(function(a){a.setAttribute('data-dy-nav','');a.title='Click to see options for this menu link';});
function secs(){return [].slice.call((D.querySelector('body>main')||D.body).children).filter(function(e){return R.secId.has(e);});}
secs().forEach(function(s){s.classList.add('dy-sec');if(s.classList.contains('dy-hidden'))s.appendChild(mk('div','dy-hidlab','Hidden section · click it, then “Show”'));});
D.querySelectorAll('[data-cms="socials"]').forEach(function(s){s.setAttribute('data-dy-soc','');});
var CMSLAB={testimonials:'Testimonials',clips:'Videos',faqs:'FAQs',praise:'Quotes about Dave',gallery:'Photo gallery',galleryintro:'Gallery intro',posts:'Blog posts',facts:'Key facts',contact:'Contact details',deposit:'Deposit',actions:'Enquire and deposit buttons',enquiry:'Contact details',say:'Contact details'},CMSKEY={galleryintro:'gallery',actions:'deposit',enquiry:'contact',say:'contact'};
D.querySelectorAll('[data-cms]').forEach(function(s){var k=s.getAttribute('data-cms');if(CMSLAB[k]){s.setAttribute('data-dy-cms',CMSKEY[k]||k);s.setAttribute('data-dy-label','Shared: '+CMSLAB[k]+'. Click to edit everywhere');}});
D.querySelectorAll('.blk-video').forEach(function(v){v.appendChild(mk('div','dy-vidcover','<span>▶ Video · click to select, then “Change video”</span>'));});
function isNew(s){return !!(s&&s.hasAttribute('data-nsec'));}
/* + Add section insert points: inside the top of the next section (never over the header/menu) */
function addSecBars(){var list=secs(),foot=D.querySelector('body>footer');
  for(var i=0;i<=list.length;i++){(function(at){var b=mk('div','dy-addsec'+(at===list.length?' last':''),'<button title="Add a new section here">+ Add section here</button>');b.querySelector('button').onclick=function(e){e.stopPropagation();addSection(at);};
    if(at<list.length)list[at].before(b);else if(D.querySelector('body>main'))D.querySelector('body>main').appendChild(b);else if(foot)foot.before(b);else D.body.appendChild(b);})(i);}
  if(!list.length){var em=mk('div','dy-emptypage','<h2>This page is empty</h2><p>Tap <b>+ Add section here</b> to start building it from ready-made layouts.</p>');if(foot)foot.before(em);}}
addSecBars();

/* ---------- selection, selection bar (in the shell), + point ---------- */
var SB=DYE.selbar(),plus=mk('button','dy-plus','+'),sel=null,editing=null;plus.title='Add a block below';plus.hidden=true;D.body.appendChild(plus);
function clearSel(){D.querySelectorAll('.dy-secsel').forEach(function(x){x.classList.remove('dy-secsel');});if(sel)sel.classList.remove('dy-sel');sel=null;plus.hidden=true;SB.hidden=true;SB.innerHTML='';}
function select(el,target){if(sel)sel.classList.remove('dy-sel');D.querySelectorAll('.dy-secsel').forEach(function(x){x.classList.remove('dy-secsel');});sel=el;el.classList.add('dy-sel');var ss=sectionOf(el);if(ss)ss.classList.add('dy-secsel');buildBar(target||el);}
function sectionOf(el){for(var p=el;p&&p!==D.body;p=p.parentElement)if(R.secId.has(p)&&(p.parentElement===D.body||p.parentElement.matches('body>main')))return p;return null;}
function itemOf(el){for(var p=el;p&&p!==D.body;p=p.parentElement)if(R.listOf.has(p)&&p.isConnected&&!p.closest('[data-cms],[data-bid]'))return p;return null;}
function linkOf(el){var a=el.closest('a');if(!a||a.closest('[data-dy-nav]'))return null;if(a.hasAttribute('data-bl'))return a;return R.ids.get(a)&&R.ids.get(a).a?a:null;}
function blockOf(el){return el.closest('[data-bid]');}
function eid(el){var o=R.ids.get(el);return o&&o.scope==='page'&&o.e?o.e:null;}
/* where "+ Add below" puts a new block: always full width of the section's content column */
function anchorFor(el){var s=sectionOf(el);if(!s||el===s||el.closest('[data-bid]'))return null;var c=el;while(c.parentElement&&c.parentElement!==s)c=c.parentElement;
  if(c.classList.contains('wrap')){var cs=getComputedStyle(c);if(!/grid|flex/.test(cs.display)&&c!==el){var k=el;while(k.parentElement!==c)k=k.parentElement;if(eid(k)&&!R.listOf.has(k)&&!k.closest('[data-cms]'))return k;}}
  return eid(c)?c:null;}
function nameOf(t){if(t.tagName==='IMG')return 'Picture';if(t.closest('.blk-video'))return 'Video';if(t.tagName==='A')return t.classList.contains('btn')?'Button':'Link';if(/^H\d$/.test(t.tagName))return 'Heading';if(t.tagName==='P')return 'Text';return 'Text';}
function btn(g,label,fn,title,cls){var x=pk('button',cls||'',label);x.type='button';if(title)x.title=title;x.onmousedown=function(e){e.preventDefault();};x.onclick=function(e){e.stopPropagation();finishEdit(true);fn(x,e);};g.appendChild(x);return x;}
function grp(lab){var g=pk('div','sg');if(lab)g.appendChild(pk('span','sl',lab));SB.appendChild(g);return g;}
var curBar=null;
function buildBar(t){curBar=t;SB.innerHTML='';plus.hidden=true;var g,addBelow=null;
  var a=linkOf(t),bl=blockOf(t),s=sectionOf(t),it=!bl&&itemOf(t);
  if(editing&&editing===t){g=grp('Text');g.appendChild(pk('span','sh','Type to change it. Enter to finish, Shift+Enter for a new line.'));}
  if(a&&a!==t){g=g||grp(nameOf(t));btn(g,'🔗 Edit link',function(){linkPanel(a);},'Change where this goes');}
  if(t.tagName==='IMG'){g=grp('Picture');btn(g,'📷 Change picture',function(){imgPanel(t);});}
  if(bl){var bid=bl.dataset.bid,f=findBlock(C(),bid);g=grp('Block');
    btn(g,'↑ Move up',function(){moveBlock(bid,-1);});btn(g,'↓ Move down',function(){moveBlock(bid,1);});btn(g,'⇅ Reorder…',function(){reorderBlocks(bid);},'Drag blocks into a new order');
    btn(g,'⧉ Copy',function(){dupBlock(bid);},'Make a copy below');if(f&&OPTS[f.b.type])btn(g,f.b.type==='video'?'▶ Change video':'⚙ Options',function(){optsPanel(bid);});btn(g,'🗑 Delete',function(){delBlock(bid);},'Delete this block','del');
    addBelow=function(){pickInto(function(c){var r=findBlock(c,bid);return {list:r.list,at:r.i+1};});};}
  if(it){g=grp('Item');btn(g,'← Earlier',function(){moveItem(it,-1);});btn(g,'→ Later',function(){moveItem(it,1);});btn(g,'⧉ Copy',function(){dupItem(it);});btn(g,'🗑 Delete',function(){delItem(it);},'','del');}
  if(!bl&&s&&t!==s){var an=anchorFor(t);if(an){var aid=eid(an);addBelow=function(){pickInto(function(c){var P=E(c,'page');P.ins=P.ins||{};P.ins[aid]=P.ins[aid]||[];return {list:P.ins[aid],at:0};});};}}
  if(s){var hid=s.classList.contains('dy-hidden'),nw=isNew(s);g=grp('Section');
    btn(g,'↑ Move up',function(){moveSec(s,-1);},'Move this section up');btn(g,'↓ Move down',function(){moveSec(s,1);},'Move this section down');btn(g,'⇅ Reorder…',function(){reorderSecs(s);},'Drag sections into a new order');
    (function(){var hi=s.querySelector('.hero img[data-dy-i],.bhero img[data-dy-i],.hero img[data-bi],.bhero img[data-bi]')||(s.matches('.hero,.bhero')&&s.querySelector('img[data-dy-i],img[data-bi]'));if(hi)btn(g,'🖼 Change picture',function(){imgPanel(hi);},'Replace the banner photo');})();
    btn(g,hid?'👁 Show':'🙈 Hide',function(){hideSec(s,!hid);},hid?'Show this section on the website again':'Hide this section from the website (you can bring it back)');
    btn(g,'+ Add block',function(){addToSection(s);},'Add a block at the end of this section');
    if(nw){btn(g,'🎨 Background',function(){secBgPanel(s);});btn(g,'⧉ Copy',function(){dupSec(s);},'Copy this section');btn(g,'🗑 Delete',function(){delSec(s);},'Delete this section','del');}}
  if(addBelow){var g0=pk('div','sg');btn(g0,'+ Add below',addBelow,'Add a new block below this','add');SB.prepend(g0);
    plus.onclick=function(e){e.stopPropagation();finishEdit(true);addBelow();};plus.hidden=false;var tgt=bl||anchorFor(t)||t,r=tgt.getBoundingClientRect();plusFor=tgt;plus.style.left=(r.left+window.scrollX+r.width/2-17)+'px';plus.style.top=(r.bottom+window.scrollY-17)+'px';}
  var x=pk('div','sg end');btn(x,'✕ Done',function(){clearSel();DYE.closePanel();},'Deselect');SB.appendChild(x);
  SB.hidden=false;}

/* ---------- reorder lists in the side panel (smooth drag + buttons) ---------- */
function reorderPanel(title,items,cur,done){var b=openPanel(title);b.appendChild(pk('p','hint','Drag a row by its handle, or use the arrows. The page updates when you let go.'));var ul=pk('div','rlist');b.appendChild(ul);
  items.forEach(function(it){var r=pk('div','ritem'+(it.id===cur?' cur':''),'<span class="rh" title="Drag">⠿</span><span class="rt"></span><button type="button" data-d="-1" title="Up">↑</button><button type="button" data-d="1" title="Down">↓</button>');r.querySelector('.rt').textContent=it.label;r.dataset.id=it.id;ul.appendChild(r);});
  function order(){return [].map.call(ul.children,function(r){return r.dataset.id;});}
  var start=order().join();function commit(){var o=order();if(o.join()!==start){start=o.join();done(o);}}
  ul.addEventListener('click',function(e){var bt=e.target.closest('button');if(!bt)return;var r=bt.closest('.ritem'),d=+bt.dataset.d;if(d<0&&r.previousElementSibling)r.previousElementSibling.before(r);if(d>0&&r.nextElementSibling)r.nextElementSibling.after(r);commit();});
  ul.addEventListener('pointerdown',function(e){var h=e.target.closest('.rh');if(!h)return;e.preventDefault();var r=h.closest('.ritem'),rect=r.getBoundingClientRect(),off=e.clientY-rect.top,ph=pk('div','ritem ph');ph.style.height=rect.height+'px';
    r.classList.add('drag');r.style.width=rect.width+'px';r.style.left=rect.left+'px';r.style.top=rect.top+'px';r.after(ph);PD.body.appendChild(r);
    function mv(ev){r.style.top=(ev.clientY-off)+'px';var y=ev.clientY,before=null;[].some.call(ul.children,function(x){if(x===ph)return false;var q=x.getBoundingClientRect();if(y<q.top+q.height/2){before=x;return true;}});if(before){if(ph.nextElementSibling!==before)before.before(ph);}else ul.appendChild(ph);}
    function up(){PD.removeEventListener('pointermove',mv);PD.removeEventListener('pointerup',up);r.classList.remove('drag');r.style.cssText='';ph.replaceWith(r);commit();}
    PD.addEventListener('pointermove',mv);PD.addEventListener('pointerup',up);});}
function textLabel(el,fb){var h=el.querySelector('h1,h2,h3,[data-bf],p');var t=(h?h.textContent:el.textContent||'').replace(/\s+/g,' ').trim();return (t.slice(0,60)||fb);}
function reorderSecs(s){var list=secs();reorderPanel('Reorder sections',list.map(function(x,i){return {id:R.secId.get(x),label:(i+1)+'. '+textLabel(x,'Section')+(x.classList.contains('dy-hidden')?' (hidden)':'')};}),R.secId.get(s),function(o){reopenNext({k:'rsec',id:R.secId.get(s)});DYE.change(function(c){E(c,'page').order=o;},{reload:true});});}
function reorderBlocks(bid){var f=findBlock(C(),bid);reorderPanel('Reorder blocks',f.list.map(function(b){var el=D.querySelector('[data-bid="'+b.id+'"]');return {id:b.id,label:(LIB.BLOCKS[b.type]||{label:b.type}).label+(el?': '+textLabel(el,''):'')};}),bid,function(o){reopenNext({k:'rblk',id:bid});
  DYE.change(function(c){var g=findBlock(c,bid),copy=g.list.slice();g.list.length=0;o.forEach(function(id){copy.forEach(function(b){if(b.id===id)g.list.push(b);});});},{reload:true});});}

/* ---------- block operations ---------- */
function pickInto(where){finishEdit(true);DYE.pick('block').then(function(key){if(!key)return;var nb=LIB.makeBlock(key);
  DYE.change(function(c){var w=where(c);w.list.splice(w.at,0,nb);},{reload:true,focus:nb.id});});}
function moveBlock(bid,d){DYE.change(function(c){var f=findBlock(c,bid),j=f.i+d;if(j<0||j>=f.list.length)return;f.list.splice(j,0,f.list.splice(f.i,1)[0]);},{reload:true,focus:bid});}
function dupBlock(bid){var nid=LIB.uid('b');DYE.change(function(c){var f=findBlock(c,bid),n=clone(f.b);n.id=nid;f.list.splice(f.i+1,0,n);},{reload:true,focus:nid});DYE.toast('Block copied.');}
function delBlock(bid){ask({title:'Delete this block?',text:'You can undo this with the ↶ button.',ok:'Delete',danger:true}).then(function(ok){if(ok)DYE.change(function(c){var f=findBlock(c,bid);f.list.splice(f.i,1);cleanIns(E(c,'page'));},{reload:true});});}
function addToSection(s){var id=R.secId.get(s);if(isNew(s)){pickInto(function(c){var L=E(c,'page').secs[id].blocks;return {list:L,at:L.length};});return;}
  var last=endAnchor(s);
  if(!last){DYE.toast('Blocks can\u2019t be added to this section. Add a new section below it instead.');return;}
  var aid=eid(last);pickInto(function(c){var P=E(c,'page');P.ins=P.ins||{};P.ins[aid]=P.ins[aid]||[];return {list:P.ins[aid],at:P.ins[aid].length};});}

function endAnchor(s){var w=s.querySelector('.wrap')||s,last=null;if(w.parentElement===s&&/grid|flex/.test(getComputedStyle(w).display)&&eid(w))last=w;else [].slice.call(w.children).forEach(function(x){if(eid(x)&&!x.classList.contains('dy-ui')&&!x.classList.contains('blk-ins'))last=x;});return last;}

/* ---------- side panels ---------- */
function openPanel(t){var b=DYE.panel(t);if(PD.defaultView.innerWidth<=760&&sel){var el=sel;setTimeout(function(){var r=el.getBoundingClientRect();window.scrollBy(0,r.top-10);},40);}return b;}
function field(lab,html){return '<label class="pl">'+lab+'</label>'+html;}
function seg(key,vals,cur){return '<div class="pseg" data-k="'+key+'">'+vals.map(function(v){return '<button type="button" data-v="'+v[0]+'"'+(String(cur)===String(v[0])?' class="on"':'')+'>'+v[1]+'</button>';}).join('')+'</div>';}
function wireSeg(b,fn){b.querySelectorAll('.pseg').forEach(function(sg){sg.querySelectorAll('button').forEach(function(x){x.onclick=function(){sg.querySelectorAll('button').forEach(function(y){y.classList.toggle('on',y===x);});fn(sg.dataset.k,x.dataset.v);};});});}
var OPTS={heading:1,text:1,imageText:1,button:1,video:1,gallery:1,logos:1,quotes:1,cards:1,faq:1,divider:1};
var BSTYLES=[['red','Main colour'],['gold','Gold'],['ghost','Outline'],['call','White']];
function optsPanel(bid){var f=findBlock(C(),bid);if(!f)return;var b=f.b,h='',T=(LIB.BLOCKS[b.type]||{label:'Block'}).label;
  if(b.type==='heading')h+=field('Size',seg('size',[['big','Big'],['small','Small']],b.size||'big'));
  if(b.type==='text')h+=field('Text size',seg('style',[['normal','Normal'],['big','Large']],b.style||'normal'));
  if(b.type==='imageText')h+=field('Picture on the',seg('side',[['left','Left'],['right','Right']],b.side||'left'))+'<label class="pchk"><input type="checkbox" data-btn'+(b.btnLabel?' checked':'')+'> Show a button (click the button on the page to change its words and link)</label>';
  if(b.type==='button')h+='<p class="hint">To change the words, link or colour, click the button itself on the page.</p>';
  if(b.type==='divider')h+=field('Type',seg('kind',[['space','Empty space'],['line','Line']],b.kind||'space'));
  if(b.type==='cards')h+=field('Columns',seg('cols',[[2,'2'],[3,'3']],b.cols===2?2:3));
  if(b.type==='video'){var id=window.DY.ytId(b.url);h+=(id?'<div class="pthumb"><img src="https://i.ytimg.com/vi/'+id+'/hqdefault.jpg" alt=""></div>':'')+field('Change video','<input class="pin" data-vid value="'+esc(b.url)+'" placeholder="Paste a YouTube link">')+'<p class="hint">Any YouTube link works: youtube.com/watch?v=…, youtu.be/…, Shorts, Live, the “Share” link or the embed code.</p><p class="perr" data-err></p><div class="prow2"><button type="button" class="pbtn red" data-vsave>Change video</button></div>';}
  var arr=b.images?'images':b.items?'items':null;
  if(arr){h+=field(arr==='images'?'Pictures':'Items','<div class="pitems">'+b[arr].map(function(x,i){return '<div class="pitm">'+(x.src?'<img src="'+esc(abs(x.src))+'">':'<span>'+esc(String(x.title||x.q||x.text||'Item').replace(/<[^>]+>/g,'')).slice(0,40)+'</span>')+'<button type="button" data-mv="'+i+'" data-d="-1" title="Move up">↑</button><button type="button" data-mv="'+i+'" data-d="1" title="Move down">↓</button><button type="button" data-rm="'+i+'" class="del" title="Remove">✕</button></div>';}).join('')+'</div>');
    h+=arr==='images'?'<label class="pfile">📷 Add pictures<input type="file" accept="image/*" multiple data-add></label><p class="hint">Click a caption on the page to type it.</p>':'<button type="button" class="padd">+ Add item</button>';}
  h+='<div class="prow2"><button type="button" class="pbtn" data-done>Done</button></div>';
  var p=openPanel(T==='Video (YouTube)'?'Video':T);p.innerHTML=h;
  function set(fn){reopenNext({k:'opts',id:bid});DYE.change(function(c){fn(findBlock(c,bid).b);},{reload:true,focus:bid});}
  wireSeg(p,function(k,v){if(k==='cols')v=+v;set(function(bb){bb[k]=v;});});
  var cb=p.querySelector('[data-btn]');if(cb)cb.onchange=function(){var on=cb.checked;set(function(bb){if(on){bb.btnLabel=bb.btnLabel||'Find out more';bb.btnUrl=bb.btnUrl||'book.html';}else bb.btnLabel='';});};
  var vi=p.querySelector('[data-vid]');if(vi){var vs=function(){var v=vi.value.trim();if(!window.DY.ytId(v)){p.querySelector('[data-err]').textContent='That doesn\u2019t look like a YouTube link. Open the video on YouTube, tap Share, copy the link and paste it here.';return;}if(v===b.url)return;set(function(bb){bb.url=v;});DYE.toast('Video changed.');};
    p.querySelector('[data-vsave]').onclick=vs;vi.onkeydown=function(e){if(e.key==='Enter')vs();};setTimeout(function(){vi.focus();vi.select();},50);}
  p.querySelectorAll('[data-mv]').forEach(function(x){x.onclick=function(){var i=+x.dataset.mv,j=i+(+x.dataset.d);set(function(bb){var L=bb[arr];if(j<0||j>=L.length)return;L.splice(j,0,L.splice(i,1)[0]);});};});
  p.querySelectorAll('[data-rm]').forEach(function(x){x.onclick=function(){if(b[arr].length<2){DYE.toast('Keep at least one. Delete the whole block instead.');return;}set(function(bb){bb[arr].splice(+x.dataset.rm,1);});};});
  var ad=p.querySelector('.padd');if(ad)ad.onclick=function(){set(function(bb){var L=bb[arr],n=clone(L[L.length-1]);L.push(n);});};
  var fi=p.querySelector('[data-add]');if(fi)fi.onchange=function(){var fs=[].slice.call(fi.files);DYE.toast('Preparing pictures…');Promise.all(fs.map(function(x){return DYE.upload(x,1600);})).then(function(ps){set(function(bb){ps.forEach(function(q){bb.images.push({src:q,alt:'',caption:''});});});}).catch(function(e){DYE.toast(e.message);});};
  p.querySelector('[data-done]').onclick=function(){DYE.closePanel();};}

/* ---------- text ---------- */
function startEdit(el){if(editing===el)return;finishEdit();editing=el;el.setAttribute('contenteditable','true');el.focus();
  try{var r=D.createRange();r.selectNodeContents(el);r.collapse(false);var s=window.getSelection();s.removeAllRanges();s.addRange(r);}catch(e){}}
function saveText(el,html){
  if(el.hasAttribute('data-bf')){var bl=blockOf(el);if(!bl)return;var bid=bl.dataset.bid,path=el.dataset.bf;if(!/\S/.test(html.replace(/<br>/g,'')))html='';el.innerHTML=html;
    DYE.change(function(c){var f=findBlock(c,bid);if(f)setP(f.b,path,html);});return;}
  var o=R.ids.get(el);if(!o||!o.t)return;var orig=R.orig[o.scope][o.t];if(html.replace(/\s+/g,' ').trim()===''){html=orig;el.innerHTML=orig;DYE.toast('Text can\u2019t be empty, so it was put back. To remove something, hide its section or delete the item.');}
  DYE.change(function(c){var t=bag(E(c,o.scope),'text');if(html===orig)delete t[o.t];else t[o.t]=html;});}
function finishEdit(keepBar){var el=editing;if(!el)return;editing=null;el.removeAttribute('contenteditable');saveText(el,window.DY_clean(el.innerHTML));if(!keepBar&&sel===el&&curBar===el)buildBar(el);}
D.addEventListener('keydown',function(e){if(!editing)return;if(e.key==='Enter'){e.preventDefault();if(e.shiftKey)D.execCommand('insertLineBreak');else editing.blur();}if(e.key==='Escape')editing.blur();},true);
D.addEventListener('paste',function(e){if(!editing)return;e.preventDefault();var t=(e.clipboardData||window.clipboardData).getData('text/plain');D.execCommand('insertText',false,t.replace(/\s*\n\s*/g,' '));},true);
D.addEventListener('focusout',function(e){if(editing&&e.target===editing)setTimeout(function(){if(editing===e.target)finishEdit();},0);},true);
window.addEventListener('blur',function(){if(editing)finishEdit();});
D.addEventListener('drop',function(e){if(editing)e.preventDefault();},true);

/* ---------- buttons & links ---------- */
function pagesList(){return DYE.pages();}
function kindOf(h){if(/^tel:/i.test(h))return 'phone';if(/^mailto:/i.test(h))return 'email';var m=/^([\w-]+)\.html(#.*)?$/.exec(h||'');if(m&&pagesList().some(function(p){return p.key===m[1];}))return 'page';if(!h||h==='#')return 'page';return 'web';}
function labelEl(a){if(a.hasAttribute('data-bf'))return a;var o=R.ids.get(a);if(o&&o.t)return a;var k=a.querySelector('[data-dy-t]');return k&&k.closest('a')===a?k:null;}
function linkPanel(a){finishEdit(true);if(sel!==a)select(a);var blk=a.hasAttribute('data-bl'),o=R.ids.get(a)||{},isBtn=a.classList.contains('btn'),bid=blk&&blockOf(a).dataset.bid;
  var le=labelEl(a),href=a.getAttribute('href')||'',k=kindOf(href),pm=/^([\w-]+)\.html/.exec(href),cs=BSTYLES.filter(function(s){return a.classList.contains(s[0]);})[0];
  var canStyle=isBtn&&(blk?!!a.dataset.bs:!!o.a);
  var h=(le?field(isBtn?'Words on the button':'Words','<input class="pin" data-label value="'+esc(le.textContent.replace(/\s+/g,' ').trim())+'">'):'')+
    field('When someone clicks it, go to',seg('kind',[['page','One of my pages'],['web','A web address'],['phone','Call a phone'],['email','Send an email']],k))+
    '<div data-for="page">'+field('Page','<select class="pin" data-page>'+pagesList().map(function(p){return '<option value="'+esc(p.key)+'">'+esc(p.label)+'</option>';}).join('')+'</select>')+'</div>'+
    '<div data-for="web">'+field('Web address','<input class="pin" data-web placeholder="https://www.example.com" value="'+(k==='web'?esc(href):'')+'">')+'<p class="hint">Opens in a new tab.</p></div>'+
    '<div data-for="phone">'+field('Phone number','<input class="pin" data-phone type="tel" placeholder="087 123 4567" value="'+(k==='phone'?esc(href.replace(/^tel:/i,'')):'')+'">')+'</div>'+
    '<div data-for="email">'+field('Email address','<input class="pin" data-email type="email" placeholder="name@example.com" value="'+(k==='email'?esc(href.replace(/^mailto:/i,'').split('?')[0]):'')+'">')+'</div><p class="perr" data-err></p>'+
    (canStyle?field('Colour',seg('style',BSTYLES,cs?cs[0]:'red')):'')+
    '<div class="prow2"><button type="button" class="pbtn red" data-save>Save</button><button type="button" class="pbtn" data-done>Close</button></div>';
  var p=openPanel(isBtn?'Button':'Link');p.innerHTML=h;var kind=k;
  function show(){p.querySelectorAll('[data-for]').forEach(function(d){d.hidden=d.dataset.for!==kind;});}show();
  var ps=p.querySelector('[data-page]');ps.value=pm&&kind==='page'?pm[1]:(pagesList()[0]||{}).key;
  function hrefNow(){var err=p.querySelector('[data-err]');err.textContent='';
    if(kind==='page')return ps.value+'.html';
    if(kind==='web'){var v=p.querySelector('[data-web]').value.trim();if(/^\s*(javascript|data):/i.test(v)){err.textContent='That address is not allowed.';return null;}if(!v){err.textContent='Please type a web address.';return null;}if(!/^https?:\/\//i.test(v))v='https://'+v.replace(/^\/+/,'');return v;}
    if(kind==='phone'){var t=p.querySelector('[data-phone]').value.trim();if(!/\d{6,}/.test(t.replace(/\D/g,''))){err.textContent='Please type a phone number.';return null;}return 'tel:'+window.DY.telOf(t);}
    var m=p.querySelector('[data-email]').value.trim();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)){err.textContent='Please type an email address like name@example.com.';return null;}return 'mailto:'+m;}
  function saveHref(v){if(v==null||v===a.getAttribute('href'))return v!=null;a.setAttribute('href',v);if(/^https?:/.test(v)){a.target='_blank';a.rel='noopener';}else a.removeAttribute('target');
    if(blk){var pth=a.dataset.bl;DYE.change(function(c){var f=findBlock(c,bid);if(f)setP(f.b,pth,v);});}else DYE.change(function(c){bag(E(c,o.scope),'link')[o.a]=v;});return true;}
  function saveLabel(){var li=p.querySelector('[data-label]');if(!li||!le)return;var v=li.value.trim();if(v===le.textContent.replace(/\s+/g,' ').trim())return;if(!v){DYE.toast('The button needs some words.');return;}le.textContent=v;saveText(le,esc(v));}
  wireSeg(p,function(key,v){if(key==='kind'){kind=v;show();var f=p.querySelector('[data-for="'+v+'"] input');if(f)f.focus();else saveHref(hrefNow());return;}
    if(key==='style'){var o0=R.origStyle(a);if(!a.dataset.dyOs)a.dataset.dyOs=o0;BSTYLES.forEach(function(s){a.classList.remove(s[0]);});a.classList.add(v);
      if(blk){var sp=a.dataset.bs;DYE.change(function(c){var f=findBlock(c,bid);if(f)setP(f.b,sp,v);});}else DYE.change(function(c){var st=bag(E(c,o.scope),'style');if(v===o0)delete st[o.a];else st[o.a]=v;});}});
  ps.onchange=function(){saveHref(hrefNow());};
  var li=p.querySelector('[data-label]');if(li){li.onchange=saveLabel;li.onkeydown=function(e){if(e.key==='Enter')saveLabel();};setTimeout(function(){li.focus();li.select();},50);}
  p.querySelectorAll('[data-web],[data-phone],[data-email]').forEach(function(i){i.onkeydown=function(e){if(e.key==='Enter'&&saveHref(hrefNow()))DYE.toast('Link saved.');};});
  p.querySelector('[data-save]').onclick=function(){saveLabel();if(saveHref(hrefNow())){DYE.toast('Saved.');}};
  p.querySelector('[data-done]').onclick=function(){saveLabel();var v=hrefNow();if(v!=null)saveHref(v);DYE.closePanel();};}
R.origStyle=function(a){if(a.dataset.dyOs)return a.dataset.dyOs;var s0=BSTYLES.filter(function(s){return a.classList.contains(s[0]);})[0];return s0?s0[0]:'red';};
function navPanel(a){finishEdit(true);clearSel();var k=navKey(a.getAttribute('href')),lab=a.textContent.trim();var p=openPanel('Menu link');
  p.innerHTML='<p>“'+esc(lab)+'” is a link in the menu. Menu names, order and which pages appear are set in <b>Pages</b>.</p><div class="prow2 col">'+(k?'<button type="button" class="pbtn red" data-open>Open this page in the editor</button>':'')+'<button type="button" class="pbtn" data-pages>Rename or reorder in Pages</button>'+(k?'<button type="button" class="pbtn" data-set>Page settings</button>':'')+'</div>';
  var o=p.querySelector('[data-open]');if(o)o.onclick=function(){DYE.closePanel();DYE.goPage(k);};p.querySelector('[data-pages]').onclick=function(){DYE.closePanel();DYE.openPages();};
  var s=p.querySelector('[data-set]');if(s)s.onclick=function(){DYE.closePanel();if(k===PAGE)DYE.pageSettings();else DYE.goPage(k);};}
function fixedPanel(a){clearSel();select(a);var p=openPanel('Button');p.innerHTML='<p>This button rings your phone number. To change the number everywhere, open <b>Style</b> and edit <b>Phone number</b>.</p><div class="prow2"><button type="button" class="pbtn red" data-st>Open Style</button></div>';p.querySelector('[data-st]').onclick=function(){DYE.closePanel();DYE.openSocials();};}

/* ---------- images ---------- */
function imgPanel(img){finishEdit(true);if(sel!==img)select(img);var blk=img.hasAttribute('data-bi'),o=R.ids.get(img),bid=blk&&blockOf(img).dataset.bid,path=blk&&img.dataset.bi;
  function save(v,rl){DYE.change(function(c){if(blk){var f=findBlock(c,bid);setP(f.b,path,Object.assign({},getP(f.b,path)||{},v));}else{var b=bag(E(c,o.scope),'img');b[o.i]=Object.assign({},b[o.i],v);}},rl?{reload:true}:null);}
  var p=openPanel('Picture');p.innerHTML='<div class="pthumb"><img src="'+esc(img.src)+'"></div><label class="pfile">📷 Replace picture<input type="file" accept="image/*"></label>'+field('Describe it (for blind visitors and Google)','<input class="pin" data-alt value="'+esc(img.getAttribute('alt'))+'">')+'<div class="prow2"><button type="button" class="pbtn" data-done>Done</button>'+(blk?'':'<button type="button" class="pbtn" data-reset>Original picture</button>')+'</div>';
  p.querySelector('input[type=file]').onchange=function(){var f=this.files[0];if(!f)return;DYE.toast('Preparing picture…');
    DYE.upload(f,Math.max(1200,Math.min(2000,img.naturalWidth*2||1600))).then(function(q){img.setAttribute('src',DYE.resolve(q));img.removeAttribute('srcset');window.DY.heroBg();p.querySelector('.pthumb img').src=abs(q);save({src:q});DYE.toast('Picture replaced.');}).catch(function(e){DYE.toast(e.message);});};
  var alt=p.querySelector('[data-alt]');alt.onchange=function(){img.setAttribute('alt',alt.value);save({alt:alt.value});};
  p.querySelector('[data-done]').onclick=function(){if(alt.value!==(img.getAttribute('alt')||''))alt.onchange();DYE.closePanel();};
  var rs=p.querySelector('[data-reset]');if(rs)rs.onclick=function(){DYE.closePanel();DYE.change(function(c){delete bag(E(c,o.scope),'img')[o.i];},{reload:true});};}

/* ---------- lists (repeated blocks in built pages) ---------- */
function keysOf(L){var e=(C().pages[PAGE]||{}).lists||{};return e[L]?e[L].slice():R.items[L].map(function(_,i){return String(i);});}
function moveItem(it,d){var L=R.listOf.get(it),k=R.itemKey.get(it),ks=keysOf(L),i=ks.indexOf(k),j=i+d;if(j<0||j>=ks.length)return;ks.splice(j,0,ks.splice(i,1)[0]);DYE.change(function(c){bag(E(c,'page'),'lists')[L]=ks;},{reload:true});}
function delItem(it){var L=R.listOf.get(it),k=R.itemKey.get(it),ks=keysOf(L);if(ks.length<2){DYE.toast('This is the last one, so it can\u2019t be deleted. You can hide the whole section instead.');return;}
  ask({title:'Delete this item?',text:'You can undo this with the ↶ button.',ok:'Delete',danger:true}).then(function(ok){if(!ok)return;ks.splice(ks.indexOf(k),1);DYE.change(function(c){bag(E(c,'page'),'lists')[L]=ks;},{reload:true});});}
function dupItem(it){var L=R.listOf.get(it),k=R.itemKey.get(it),ks=keysOf(L),base=k.split('~')[0],n=1;
  ks.forEach(function(x){var m=x.split('~');if(m[0]===base&&m[1])n=Math.max(n,+m[1]+1);});var nk=base+'~'+n;ks.splice(ks.indexOf(k)+1,0,nk);
  var all=[it].concat([].slice.call(it.querySelectorAll('*')));
  DYE.change(function(c){var ed=E(c,'page');bag(ed,'lists')[L]=ks;all.forEach(function(x){var o=R.ids.get(x);if(!o||o.scope!=='page')return;
    [['t','text'],['i','img'],['a','link'],['a','style']].forEach(function(p){var id=o[p[0]];if(!id)return;var nid=id.split('@')[0]+'@'+L+':'+nk,v=(ed[p[1]]||{})[id];if(v!=null)bag(ed,p[1])[nid]=clone(v);});});},{reload:true});
  DYE.toast('Copied. Now click the copy to change it.');}

/* ---------- sections ---------- */
function secOrder(){return secs().map(function(s){return R.secId.get(s);});}
function addSection(at){finishEdit(true);DYE.pick('section').then(function(key){if(!key)return;var id=LIB.uid('n'),s=LIB.makeSection(key),o=secOrder();o.splice(at,0,id);
  DYE.change(function(c){var P=E(c,'page');P.secs=P.secs||{};P.secs[id]=s;P.order=o;},{reload:true,focus:id});});}
function moveSec(s,d){var o=secOrder(),id=R.secId.get(s),i=o.indexOf(id),j=i+d;if(j<0||j>=o.length){DYE.toast(d<0?'This is already the first section.':'This is already the last section.');return;}o.splice(j,0,o.splice(i,1)[0]);DYE.change(function(c){E(c,'page').order=o;},{reload:true,focus:id});}
function hideSec(s,h){var id=R.secId.get(s);DYE.change(function(c){var e=E(c,'page'),l=(e.hidden||[]).filter(function(x){return x!==id;});if(h)l.push(id);e.hidden=l;},{reload:true,focus:id});DYE.toast(h?'Section hidden. It stays faded here so you can show it again.':'Section shown.');}
function dupSec(s){var id=R.secId.get(s),nid=LIB.uid('n'),o=secOrder();o.splice(o.indexOf(id)+1,0,nid);
  DYE.change(function(c){var P=E(c,'page'),n=clone(P.secs[id]);(n.blocks||[]).forEach(function(b){b.id=LIB.uid('b');});P.secs[nid]=n;P.order=o;},{reload:true,focus:nid});DYE.toast('Section copied.');}
function delSec(s){ask({title:'Delete this whole section?',text:'Everything in it will be removed. You can undo this with the ↶ button.',ok:'Delete section',danger:true}).then(function(ok){if(!ok)return;var id=R.secId.get(s);DYE.change(function(c){var P=E(c,'page');delete P.secs[id];P.order=(P.order||[]).filter(function(x){return x!==id;});P.hidden=(P.hidden||[]).filter(function(x){return x!==id;});},{reload:true});});}
function secBgPanel(s){var id=R.secId.get(s),cur=(E(C(),'page').secs[id]||{}).bg||'plain';var p=openPanel('Section background');
  p.innerHTML=field('Background',seg('bg',[['plain','Black'],['panel','Dark grey'],['red','Accent colour']],cur))+'<p class="hint">The accent colour is set in Style.</p><div class="prow2"><button type="button" class="pbtn" data-done>Done</button></div>';
  wireSeg(p,function(k,v){reopenNext({k:'bg',id:id});DYE.change(function(c){E(c,'page').secs[id].bg=v;},{reload:true,focus:id});});p.querySelector('[data-done]').onclick=function(){DYE.closePanel();};}

/* ---------- shows ---------- */
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function sortShows(c){c.shows=c.shows.map(function(s,i){return [s,i];}).sort(function(x,y){var a=x[0].date||'9999',b=y[0].date||'9999';return a<b?-1:a>b?1:x[1]-y[1];}).map(function(x){return x[0];});}
function setupShows(box){
  [].slice.call(box.querySelectorAll('.show')).forEach(function(r,i){r._i=i;r.classList.add('dy-showrow');var t=mk('div','dy-rowtools');var s=C().shows[i];
    t.innerHTML='<span class="dy-rl">This show:</span><button class="dy-ed" title="Change date, venue or tickets">✎ Edit</button><label class="dy-sold"><input type="checkbox"'+(s.soldOut?' checked':'')+'> Sold out</label><button class="dy-drag" title="Drag this show up or down">⠿ Drag</button><button class="dy-x" title="Delete this show">🗑 Delete</button>';
    t.querySelector('input').onchange=function(e){var v=e.target.checked;DYE.change(function(c){c.shows[i].soldOut=v;});rerender();};
    t.querySelector('.dy-ed').onclick=function(e){e.stopPropagation();showPanel(r,i);};
    t.querySelector('.dy-x').onclick=function(e){e.stopPropagation();ask({title:'Delete this show?',text:(s.venue||'This show')+(s.date?' on '+ukDate(s.date):'')+' will be removed.',ok:'Delete show',danger:true}).then(function(ok){if(!ok)return;DYE.closePanel();DYE.change(function(c){c.shows.splice(i,1);});rerender();});};
    var h=t.querySelector('.dy-drag');rowDrag(h,r,box);r.appendChild(t);});
  var add=mk('button','dy-add','+ Add show');add.onclick=function(e){e.stopPropagation();var last=C().shows[C().shows.length-1]||{};
    DYE.change(function(c){c.shows.push({date:'',venue:'New venue',note:'',town:'Town',time:last.time||'8pm',ticketUrl:'',ticketSite:'',phone:'',soldOut:false});});rerender();
    var rs=box.querySelectorAll('.show');var nr=rs[rs.length-1];if(nr){nr.scrollIntoView({block:'center'});showPanel(nr,C().shows.length-1);}};
  box.after(add);}
function rowDrag(h,item,box){h.style.touchAction='none';h.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();finishEdit(true);var sib=function(){return [].slice.call(box.querySelectorAll('.show'));},start=sib();
  item.classList.add('dy-dragging');var lastY=e.clientY,tick=setInterval(function(){var sp=lastY<70?-(14+(70-Math.max(0,lastY))):lastY>window.innerHeight-70?(14+(lastY-window.innerHeight+70)):0;if(sp){window.scrollBy(0,sp);place2();}},40);
  function place2(){var rs=sib().filter(function(x){return x!==item;}),before=null;for(var k=0;k<rs.length;k++){var b=rs[k].getBoundingClientRect();if(lastY<b.top+b.height/2){before=rs[k];break;}}
    if(before){if(item.nextElementSibling!==before)before.before(item);}else if(rs.length&&rs[rs.length-1].nextElementSibling!==item)rs[rs.length-1].after(item);}
  var mv=function(ev){lastY=ev.clientY;place2();};
  var up=function(){clearInterval(tick);D.removeEventListener('pointermove',mv);D.removeEventListener('pointerup',up);item.classList.remove('dy-dragging');var now=sib();
    if(now.some(function(x,i){return x!==start[i];})){var order=now.map(function(x){return x._i;});DYE.change(function(c){c.shows=order.map(function(k){return c.shows[k];});});rerender();DYE.toast('Order changed. Tip: shows also sort themselves by date when you change a date.',5000);}};
  D.addEventListener('pointermove',mv);D.addEventListener('pointerup',up);});}
function ukDate(iso){var m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(iso||'');return m?m[3]+'/'+m[2]+'/'+m[1]:'';}
function rerender(){D.querySelectorAll('.dy-add').forEach(function(a){a.remove();});clearSel();
  D.querySelectorAll('[data-cms="shows"]').forEach(function(b){b.innerHTML=C().shows.map(window.DY.showHTML).join('');setupShows(b);});}
function showPanel(row,i){var s=C().shows[i];if(!s)return;finishEdit(true);clearSel();sel=row;row.classList.add('dy-sel');var obj=s;
  var F=function(k,lab,ph,type){return '<div>'+field(lab,'<input class="pin" data-f="'+k+'" type="'+(type||'text')+'" value="'+esc(s[k])+'" placeholder="'+(ph||'')+'">')+'</div>';};
  var m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(s.date||''),y0=new Date().getFullYear(),yrs=[];for(var y=Math.min(y0-1,m?+m[1]:y0);y<=Math.max(y0+3,m?+m[1]:y0);y++)yrs.push(y);
  var opt=function(v,l,cur){return '<option value="'+v+'"'+(cur===v?' selected':'')+'>'+l+'</option>';};
  var dd='<div class="pdate"><select class="pin" data-d="d" aria-label="Day"><option value="">Day</option>'+Array.apply(null,{length:31}).map(function(_,k){var v=('0'+(k+1)).slice(-2);return opt(v,String(k+1),m&&m[3]);}).join('')+'</select>'+
    '<select class="pin" data-d="m" aria-label="Month"><option value="">Month</option>'+MON.map(function(n,k){var v=('0'+(k+1)).slice(-2);return opt(v,n,m&&m[2]);}).join('')+'</select>'+
    '<select class="pin" data-d="y" aria-label="Year"><option value="">Year</option>'+yrs.map(function(v){return opt(String(v),String(v),m&&m[1]);}).join('')+'</select></div>';
  var p=openPanel('Show');p.innerHTML=field('Date (day / month / year)',dd)+'<p class="hint" data-dh>'+(m?'':'Pick a day, month and year.')+'</p><div class="p2">'+F('time','Time','8pm')+F('town','Town','Clonee')+'</div>'+F('venue','Venue','The Grasshopper Inn')+F('ticketUrl','Ticket link','https://www.eventbrite.ie/…','url')+
    '<div class="p2">'+F('ticketSite','Ticket website name','Eventbrite')+F('phone','…or booking phone','045 531 012','tel')+'</div>'+F('note','Little label (optional)','Sold out')+'<p class="hint">Shows are sorted by date automatically.</p><div class="prow2"><button type="button" class="pbtn" data-done>Done</button></div>';
  function idx(){return C().shows.indexOf(obj);}
  function redraw(){var j=idx(),rows=D.querySelectorAll('[data-cms=shows] .show'),r=rows[j];if(!r)return;var tmp=D.createElement('div');tmp.innerHTML=window.DY.showHTML(C().shows[j]);var tools=r.querySelector('.dy-rowtools');r.innerHTML=tmp.firstChild.innerHTML;if(tools)r.appendChild(tools);}
  p.querySelectorAll('[data-f]').forEach(function(inp){inp.oninput=inp.onchange=function(){var k=inp.dataset.f,v=inp.value;DYE.change(function(c){c.shows[idx()][k]=v;});redraw();};});
  p.querySelectorAll('[data-d]').forEach(function(se){se.onchange=function(){var g=function(k){return p.querySelector('[data-d='+k+']').value;},d=g('d'),mo=g('m'),yy=g('y'),hint=p.querySelector('[data-dh]');
    if(!d||!mo||!yy){hint.textContent='Pick a day, month and year.';return;}var dt=new Date(+yy,+mo-1,+d);if(dt.getMonth()!==+mo-1){hint.textContent=MON[+mo-1]+' '+yy+' doesn\u2019t have a day '+d+'.';return;}
    var iso=yy+'-'+mo+'-'+d,before=idx();hint.textContent=dt.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    DYE.change(function(c){c.shows[c.shows.indexOf(obj)].date=iso;obj.date=iso;sortShows(c);});
    /* the same object stays in the list, so find it again after sorting */
    var after=idx();rerender();var rows=D.querySelectorAll('[data-cms=shows] .show');if(rows[after]){sel=rows[after];rows[after].classList.add('dy-sel');if(after!==before){rows[after].scrollIntoView({block:'center',behavior:'smooth'});DYE.toast('Moved into date order.');}}};});
  p.querySelector('[data-done]').onclick=function(){DYE.closePanel();rerender();};}

/* ---------- clicks ---------- */
function navKey(h){var m;if((m=/[?&]p=([^&]+)/.exec(h))||(m=/[?&]as=([^&]+)/.exec(h)))return decodeURIComponent(m[1]);m=/^([\w-]+)\.html/.exec(h||'');return m?m[1]:null;}
D.addEventListener('click',function(e){var t=e.target;if(Date.now()-(window.__dydEnd||0)<600){e.preventDefault();e.stopPropagation();return;}if(t.closest('.dy-ui:not(.dy-vidcover)'))return;
  if(t.closest('a,button,form,input,label,select,summary'))e.preventDefault();
  if(editing&&editing.contains(t))return;
  var nv=t.closest('[data-dy-nav]');if(nv){navPanel(nv);return;}
  var row=t.closest('[data-cms=shows] .show');if(row){showPanel(row,[].slice.call(row.parentNode.querySelectorAll('.show')).indexOf(row));return;}
  var cm=t.closest('[data-dy-cms]');if(cm){finishEdit();clearSel();DYE.toast('Opening Shared content: '+(CMSLAB[cm.getAttribute('data-cms')]||'this list')+' appear on more than one page, so you edit them once, here.');DYE.openShared(cm.getAttribute('data-dy-cms'));return;}
  if(t.closest('[data-dy-soc]')){finishEdit();var sb=blockOf(t);if(sb)select(sb);DYE.openSocials();return;}
  var vb=t.closest('.blk-video');if(vb){finishEdit();select(vb);optsPanel(vb.dataset.bid);return;}
  var img=t.closest('img[data-bi],img[data-dy-i]');if(img){imgPanel(img);return;}
  var tb=t.closest('[data-bf],[data-dy-t]'),a=t.closest('a:not([data-dy-nav])');
  if(tb&&(tb.tagName==='A'||(a&&tb.contains(a)&&a!==tb&&linkOf(a)&&a.classList.contains('btn')))){var la=tb.tagName==='A'?tb:a;if(linkOf(la)){linkPanel(la);return;}}
  if(tb&&!(a&&!a.contains(tb)&&tb.contains(a)&&a.classList.contains('btn'))){DYE.closePanel();if(editing!==tb){select(tb);startEdit(tb);buildBar(tb);}return;}
  if(a){var lk=linkOf(a);if(lk){linkPanel(lk);return;}if(a.classList.contains('btn')&&/^tel:/.test(a.getAttribute('href')||'')){fixedPanel(a);return;}}
  finishEdit();DYE.closePanel();var bh=t.closest('.bhero,.hero');if(bh){var bim=bh.querySelector('img[data-bi],img[data-dy-i]');if(bim){var hs=sectionOf(bh)||bh;if(hs.classList.contains('dy-secsel')){imgPanel(bim);return;}select(hs,t);return;}}var bl=blockOf(t);if(bl){select(bl);return;}var s=sectionOf(t);if(s)select(s,t);else clearSel();},true);
D.addEventListener('submit',function(e){e.preventDefault();},true);
D.addEventListener('keydown',function(e){if(e.key==='Escape'&&!editing){clearSel();DYE.closePanel();}if(!editing&&DYE.keyUndo)DYE.keyUndo(e);});
var plusFor=null;window.addEventListener('resize',function(){if(!plus.hidden&&plusFor){var r=plusFor.getBoundingClientRect();plus.style.left=(r.left+window.scrollX+r.width/2-17)+'px';plus.style.top=(r.bottom+window.scrollY-17)+'px';}});
window.addEventListener('unload',function(){SB.hidden=true;SB.innerHTML='';});


/* ---------- drag & drop on the page (engine: admin/drag.js). Every drop is one DYE.change, so one ↶ Undo step. ---------- */
var DG=window.parent.DYDrag;DG.css(D);
var VOID=/^(IMG|BR|HR|INPUT|SOURCE|VIDEO|IFRAME)$/;
function live(el){return el.isConnected&&!el.closest('.dyd-ghost');}
function handle(host,cls,title,txt,start){var h=mk('button','dy-dh '+cls,txt||'⠿');h.type='button';h.title=title;h.setAttribute('aria-label',title);
  if(getComputedStyle(host).position==='static')host.classList.add('dy-rel');
  h.addEventListener('pointerdown',function(e){if(e.button>0)return;e.preventDefault();e.stopPropagation();finishEdit(true);start(e,h);});
  h.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();});host.appendChild(h);return h;}
function full(z){return {x1:0,x2:window.innerWidth,y1:z.y1,y2:z.y2,data:z.data};}
function keep(){try{sessionStorage.setItem('dy-keep','1');}catch(e){}}
/* sections: drop above a section when over its top half, below it when over its bottom half */
function secPick(lx,ly){var z=DG.halves(secs(),lx,ly);if(z){z.x1=0;z.x2=window.innerWidth;}return z;}
function dropSec(s,at){var o=secOrder(),id=R.secId.get(s),i=o.indexOf(id);if(!DG.moveIdx(o,i,at))return;keep();DYE.change(function(c){E(c,'page').order=o;},{reload:true,focus:id});DYE.toast('Section moved. ↶ Undo puts it back.');}
secs().forEach(function(s){handle(s,'sec','Drag to move this section','⠿ Drag',function(e){DG.begin({e:e,doc:D,label:'Moving: '+textLabel(s,'Section'),pick:secPick,drop:function(at){dropSec(s,at);}});});});
secs().forEach(function(s,i,all){var w=mk('div','dy-mv dy-ui'),up=mk('button','','▲ Move up'),dn=mk('button','','▼ Move down');up.type=dn.type='button';up.title='Move this section up';dn.title='Move this section down';
  up.setAttribute('aria-label','Move this section up');dn.setAttribute('aria-label','Move this section down');up.disabled=i===0;dn.disabled=i===all.length-1;
  [up,dn].forEach(function(b){b.addEventListener('pointerdown',function(e){e.stopPropagation();});});
  up.onclick=function(e){e.preventDefault();e.stopPropagation();finishEdit(true);moveSec(s,-1);};dn.onclick=function(e){e.preventDefault();e.stopPropagation();finishEdit(true);moveSec(s,1);};
  w.appendChild(up);w.appendChild(dn);s.appendChild(w);});
/* blocks: within a section, between sections, into empty sections and into built sections (after their content).
   The section under the pointer decides where the block goes, so a drop always lands where you let go. */
function listFor(P,g){var k=g.slice(4);if(g.indexOf('sec:')===0){P.secs[k].blocks=P.secs[k].blocks||[];return P.secs[k].blocks;}P.ins=P.ins||{};P.ins[k]=P.ins[k]||[];return P.ins[k];}
var NOPOSTER='The banner can\u2019t hold blocks. Drop it in the section below.';
function blockSlots(){var groups={},order=[],out=[];[].slice.call(D.querySelectorAll('[data-bid]')).filter(live).forEach(function(b){var g=b.dataset.bgroup;if(!groups[g]){groups[g]=[];order.push(g);}groups[g].push(b);});
  order.forEach(function(g){var sec=sectionOf(groups[g][0]);DG.between(groups[g],'y').forEach(function(z){z.data={g:g,at:z.data};z.sec=sec;out.push(z);});});
  secs().forEach(function(s){var r;if(isNew(s)){if(!s.querySelector('[data-bid]')){r=(s.querySelector('.wrap')||s).getBoundingClientRect();out.push({x1:r.left,x2:r.right,y1:r.top+r.height/2,y2:r.top+r.height/2,sec:s,data:{g:'sec:'+R.secId.get(s),at:0}});}return;}
    r=s.getBoundingClientRect();var an=s.classList.contains('hero')?null:endAnchor(s);
    if(!an){out.push({x1:r.left+20,x2:r.right-20,y1:r.top+r.height/2,y2:r.top+r.height/2,sec:s,no:true,msg:s.classList.contains('hero')?NOPOSTER:'Blocks can\u2019t go in this section. Drop it in a section above or below.'});return;}
    var aid=eid(an);if(groups['ins:'+aid])return;var ar=an.getBoundingClientRect();if(!ar.height)return;out.push({x1:ar.left,x2:ar.right,y1:ar.bottom+6,y2:ar.bottom+6,sec:s,data:{g:'ins:'+aid,at:0}});});
  return out;}
function secAt(lx,ly){var L=secs();for(var i=0;i<L.length;i++){var r=L[i].getBoundingClientRect();if(ly>=r.top&&ly<=r.bottom)return L[i];}return null;}
function blockPick(lx,ly){var all=blockSlots(),s=secAt(lx,ly),pool=s?all.filter(function(z){return z.sec===s;}):[];if(!pool.length)pool=all;var best=null,bd=1e9;
  pool.forEach(function(z){var dx=z.x2-z.x1,dy=z.y2-z.y1,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((lx-z.x1)*dx+(ly-z.y1)*dy)/l)):0,d=Math.hypot(lx-z.x1-t*dx,ly-z.y1-t*dy);if(d<bd){bd=d;best=z;}});return best;}
function refuse(m){if(m)DYE.toast(m,5000);}
function dropBlock(bid,d){var f=findBlock(C(),bid);if(!f)return;if(f.group===d.g&&(d.at===f.i||d.at===f.i+1))return;keep();
  DYE.change(function(c){var f=findBlock(c,bid),P=E(c,'page'),T=listFor(P,d.g);if(T===f.list)DG.moveIdx(T,f.i,d.at);else{var b=f.list.splice(f.i,1)[0];T.splice(Math.min(d.at,T.length),0,b);}cleanIns(P);},{reload:true,focus:bid});DYE.toast('Block moved. ↶ Undo puts it back.');}
D.querySelectorAll('[data-bid]').forEach(function(bl){handle(bl,'blk','Drag to move this block','⠿',function(e){DG.begin({e:e,doc:D,ghostFrom:bl,pick:blockPick,refuse:refuse,drop:function(d){dropBlock(bl.dataset.bid,d);}});});});
/* items inside blocks: gallery pictures, logos, cards, testimonials, questions. Left/top half of a target = before it, right/bottom half = after it */
var ARR={gallery:['figure','images'],logos:['.lg','images'],cards:['.card','items'],quotes:['.tcard','items'],faq:['details','items']};
function itemDrag(kids,cls,commit){kids.forEach(function(k,i){if(VOID.test(k.tagName))return;k.classList.add('dy-ihost');
  handle(k,'itm'+(cls?' '+cls:''),'Drag to reorder','⠿',function(e){DG.begin({e:e,doc:D,ghostFrom:k,pick:function(lx,ly){return DG.halves(kids.filter(live),lx,ly);},drop:function(at){commit(i,at);}});});});}
D.querySelectorAll('[data-bid]').forEach(function(bl){var bid=bl.dataset.bid,f=findBlock(C(),bid);if(!f||!ARR[f.b.type])return;var a=ARR[f.b.type],kids=[].slice.call(bl.children).filter(function(k){return k.matches(a[0]);});if(kids.length<2)return;
  itemDrag(kids,f.b.type==='faq'?'r':'',function(i,at){var L=clone(f.b[a[1]]);if(!DG.moveIdx(L,i,at))return;keep();DYE.change(function(c){findBlock(c,bid).b[a[1]]=L;},{reload:true,focus:bid});DYE.toast('Order changed. ↶ Undo puts it back.');});});
/* repeated items on built pages (testimonials, posters, logos, clips, lists) */
Object.keys(R.items).forEach(function(L){var par=R.by.page[L];if(!par||!par.isConnected||par.closest('[data-cms],[data-bid],header,footer,.sticky'))return;
  var kids=[].slice.call(par.children).filter(function(k){return R.listOf.get(k)===L;});if(kids.length<2)return;
  itemDrag(kids,kids[0].tagName==='DETAILS'?'r':'',function(i,at){var ks=kids.map(function(k){return R.itemKey.get(k);});if(!DG.moveIdx(ks,i,at))return;keep();DYE.change(function(c){bag(E(c,'page'),'lists')[L]=ks;},{reload:true});DYE.toast('Order changed. ↶ Undo puts it back.');});});
/* menu links in the header: each has a visible ⠿ handle; the link itself can also be dragged (mouse) or held (touch) */
(function(){var links=[].slice.call(D.querySelectorAll('nav.main a:not(.btn)'));if(links.length<2)return;
  function go(ev,a,i){finishEdit(true);DYE.closePanel();DG.begin({e:ev,doc:D,ghostFrom:a,pick:function(lx,ly){return DG.halves(links,lx,ly);},drop:function(at){var nav=clone(C().nav||LIB.DEFAULT_NAV),vis=[];nav.forEach(function(n,j){if(n.show==='menu')vis.push(j);});
      if(vis.length!==links.length){DYE.toast('Use Pages to change the menu order.');return;}var it=vis.map(function(j){return nav[j];});if(!DG.moveIdx(it,i,at))return;var out=nav.slice();vis.forEach(function(j,k){out[j]=it[k];});
      keep();DYE.change(function(c){c.nav=out;},{reload:true});DYE.toast('Menu order changed. ↶ Undo puts it back.');}});}
  links.forEach(function(a,i){a.style.webkitTouchCallout='none';a.setAttribute('draggable','false');a.classList.add('dy-navh');
    handle(a,'nav','Drag to change the menu order','⠿',function(e){go(e,a,i);});
    a.addEventListener('pointerdown',function(e){if(e.button>0||e.target.closest('.dy-dh'))return;DG.press(e,function(ev){go(ev,a,i);});});});})();
/* the shell uses these when a block is dragged out of the "Add a block" picker */
window.DYI={blockSlots:blockSlots,blockPick:blockPick,refuse:refuse,dropNew:function(key,d){var nb=LIB.makeBlock(key);keep();DYE.change(function(c){var T=listFor(E(c,'page'),d.g);T.splice(Math.min(d.at,T.length),0,nb);},{reload:true,focus:nb.id});DYE.toast('Block added. ↶ Undo removes it.');}};
D.querySelectorAll('[data-cms="shows"]').forEach(setupShows);
var re=null;try{re=JSON.parse(sessionStorage.getItem(RK)||'null');sessionStorage.removeItem(RK);}catch(e){}
var fid=DYE.takeFocus&&DYE.takeFocus();
if(re&&(re.k==='rsec'||re.k==='bg')){var se=R.by.page[re.id]||D.querySelector('[data-nsec="'+re.id+'"]');if(se){setTimeout(function(){select(se);if(re.k==='rsec')reorderSecs(se);else secBgPanel(se);},60);fid=null;}}
if(re&&re.k==='rblk'){var be=D.querySelector('[data-bid="'+re.id+'"]');if(be){if(offscreen(be))be.scrollIntoView({block:'center',behavior:'instant'});setTimeout(function(){select(be);reorderBlocks(re.id);},60);fid=null;}}
var KEEP=false;try{KEEP=sessionStorage.getItem('dy-keep')==='1';sessionStorage.removeItem('dy-keep');}catch(e){}
function offscreen(el){var r=el.getBoundingClientRect();return r.bottom<0||r.top>window.innerHeight;}
if(fid){var fe=D.querySelector('[data-bid="'+fid+'"]')||R.by.page[fid];if(fe){if(!KEEP){var fr=fe.getBoundingClientRect(),isSec=R.secId.has(fe);if(isSec||offscreen(fe)){DYE.noRestore&&DYE.noRestore();fe.scrollIntoView({block:isSec?'start':'center',behavior:'instant'});if(isSec)window.scrollBy({top:-90,behavior:'instant'});}}setTimeout(function(){select(fe);if(re&&re.k==='opts'&&re.id===fid)optsPanel(fid);},60);}}
})();
