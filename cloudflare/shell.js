/* Visual editor shell: draft, history, pages, pickers, preview and publishing. The page itself is edited in the iframe (inline.js). */
(function(){
/* Cloudflare Pages edition: publishes through the site's own Function (/api/*), protected by a passcode login. No keys, no GitHub. */
var MK='dy-mode',uploaded={},note='';
var $=function(s){return document.querySelector(s);};
var LIB=window.DY_LIB,BUILTIN=LIB.BUILTIN,RESERVED=BUILTIN.concat(['page','admin','content','assets','style','site','robots','weddings','404','tools']);
var mode=localStorage.getItem(MK)==='demo'?'demo':'';
var base=null,c=null,uploads={},hist=[],pos=-1,page='index',frame=$('#frame'),scrollKeep=null,focusId=null;
var DK=function(){return 'dy2-draft-'+mode;};
function clone(x){return JSON.parse(JSON.stringify(x));}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
function toast(t,ms){var e=$('#toast');e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(function(){e.hidden=true;},ms||3500);}
function api(path,opt){opt=opt||{};opt.credentials='same-origin';opt.headers=Object.assign({'X-DY-Editor':'1'},opt.headers||{});
  return fetch(path,opt).then(function(r){return r.text().then(function(t){var j;try{j=t?JSON.parse(t):{};}catch(e){j={};}if(!r.ok||j.ok===false){var e=new Error((j&&j.error)||('HTTP '+r.status));e.status=r.status;throw e;}return j;});});}
function norm(x){x=x||{};x.site=x.site||{};x.pages=x.pages||{};x.theme=x.theme||{accent:'rose'};x.contact=x.contact||{};x.socials=x.socials||[];x.contactSocials=x.contactSocials||[];return x;}

/* ---- pages ---- */
function navOf(x){return (x||c).nav||LIB.DEFAULT_NAV;}
function ensureNav(x){if(!x.nav)x.nav=clone(LIB.DEFAULT_NAV);return x.nav;}
function allPages(){var out=[],seen={};navOf().forEach(function(n){if(!n.href&&!seen[n.key]){seen[n.key]=1;out.push({key:n.key,label:n.label});}});
  Object.keys(c.custom||{}).forEach(function(k){if(!seen[k]){seen[k]=1;out.push({key:k,label:c.custom[k].title});}});BUILTIN.forEach(function(k){if(!seen[k])out.push({key:k,label:k});});return out;}
function exists(k){return BUILTIN.indexOf(k)>-1||!!(c.custom||{})[k];}
function pagePath(k,q){var cu=(c.custom||{})[k];if(!cu)return '../'+k+'.html?'+q;return cu.base?'../'+cu.base+'.html?'+q+'&as='+encodeURIComponent(k):'../page.html?'+q+'&p='+encodeURIComponent(k);}
function renderPicker(){var s=$('#page');s.innerHTML=allPages().map(function(p){return '<option value="'+esc(p.key)+'">'+esc(p.label)+((c.custom||{})[p.key]?' ✦':'')+'</option>';}).join('')+'<option value="__new">+ New page…</option>';s.value=page;}

/* ---- in-app dialog (replaces alert/confirm/prompt) ---- */
function dialog(o){return new Promise(function(done){var m=$('#dlg');$('#dlg-t').textContent=o.title||'';$('#dlg-x').textContent=o.text||'';$('#dlg-x').hidden=!o.text;$('#dlg-e').textContent='';
  var f=$('#dlg-f');f.innerHTML='';var ins={};(o.fields||[]).forEach(function(fd){var l=document.createElement('label');l.textContent=fd.label;var i=document.createElement('input');i.value=fd.value||'';if(fd.max)i.maxLength=fd.max;i.dataset.k=fd.key;ins[fd.key]=i;f.appendChild(l);f.appendChild(i);
    i.onkeydown=function(e){if(e.key==='Enter')go(true);};});
  if(o.list){var ul=document.createElement('ul');ul.className='dlglist';o.list.forEach(function(t){var li=document.createElement('li');li.textContent=t;ul.appendChild(li);});f.appendChild(ul);}
  var b=$('#dlg-b');b.innerHTML='';
  function go(ok){var v={};Object.keys(ins).forEach(function(k){v[k]=ins[k].value.trim();});if(ok&&o.validate){var er=o.validate(v);if(er){$('#dlg-e').textContent=er;return;}}m.hidden=true;document.removeEventListener('keydown',esck,true);done({ok:ok,values:v});}
  function esck(e){if(e.key==='Escape'&&!m.hidden){e.preventDefault();go(false);}}
  var ok=document.createElement('button');ok.className='btn '+(o.danger?'danger':'red');ok.id='dlg-ok';ok.textContent=o.ok||'OK';ok.onclick=function(){go(true);};b.appendChild(ok);
  if(o.cancel!==false){var cn=document.createElement('button');cn.className='btn ghost';cn.id='dlg-cancel';cn.textContent=o.cancel||'Cancel';cn.onclick=function(){go(false);};b.appendChild(cn);}
  (o.extra||[]).forEach(function(x){var e=document.createElement('button');e.className='btn ghost';e.textContent=x.label;e.onclick=function(){m.hidden=true;done({ok:false,extra:x.key});};b.appendChild(e);});
  m.hidden=false;document.addEventListener('keydown',esck,true);setTimeout(function(){var first=f.querySelector('input');(first||ok).focus();if(first)first.select();},30);});}
/* ---- side panel + selection bar (filled by the page in the frame) ---- */
var panelClose=null;
var panelOpener=null;
function activeEl(){var a=document.activeElement;try{if(a===frame&&frame.contentDocument.activeElement&&frame.contentDocument.activeElement!==frame.contentDocument.body)a=frame.contentDocument.activeElement;}catch(e){}return a;}
function hideModals(except){document.querySelectorAll('.modal').forEach(function(m){if(m!==except&&m.id!=='dlg'&&!m.hidden){m.hidden=true;if(m.id==='pickm')closePick();}});}
function panel(title,onClose){hideModals();closePanel(true);panelOpener=activeEl();$('#sidet').textContent=title;var b=$('#sideb');b.innerHTML='';b.scrollTop=0;$('#side').hidden=false;panelClose=onClose||null;
  setTimeout(function(){var f=$('#sideb').querySelector('input:not([type=hidden]),textarea,select,button');if(f&&!$('#side').hidden&&!(document.activeElement&&$('#side').contains(document.activeElement)))try{f.focus({preventScroll:true});}catch(e){}},60);return b;}
function closePanel(silent){var cb=panelClose;panelClose=null;var was=!$('#side').hidden;var inside=was&&$('#side').contains(document.activeElement);$('#side').hidden=true;$('#sideb').innerHTML='';if(cb&&was)cb(silent);
  if(was&&!silent&&inside&&panelOpener){try{panelOpener.focus({preventScroll:true});}catch(e){}}panelOpener=null;}
$('#sidex').onclick=function(){closePanel();};
/* ---- API used by the page inside the frame ---- */
window.DYE={
  state:function(){return {content:c,uploads:uploads};},
  page:function(){return page;},
  resolve:function(p){return uploads[p]||p;},
  change:function(fn,opt){fn(c);record();if(opt&&opt.focus)focusId=opt.focus;if(opt&&opt.reload)reload();},
  noRestore:function(){scrollKeep=null;},takeFocus:function(){var f=focusId;focusId=null;return f;},
  upload:function(file,maxW){return new Promise(function(ok,bad){var r=new FileReader();r.onerror=bad;r.onload=function(){var im=new Image();im.onerror=function(){bad(new Error('That file is not a picture we can read. Try a JPG or PNG.'));};
    im.onload=function(){var s=Math.min(1,(maxW||1600)/im.width),cv=document.createElement('canvas');cv.width=Math.round(im.width*s);cv.height=Math.round(im.height*s);cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);
      var path='assets/uploads/img-'+new Date().toISOString().replace(/\D/g,'').slice(0,14)+'-'+Math.random().toString(36).slice(2,6)+'.jpg';uploads[path]=cv.toDataURL('image/jpeg',0.85);ok(path);};im.src=r.result;};r.readAsDataURL(file);});},
  toast:toast,
  goPage:function(p){if(exists(p))setPage(p);else toast('That page doesn\u2019t exist yet.');},
  pick:pick,dialog:dialog,panel:panel,closePanel:closePanel,escape:function(){return DYE_escape?DYE_escape():false;},doc:document,
  selbar:function(){return $('#selbar');},
  pages:function(){return allPages();},
  pageSettings:function(){pageSettings(page);},
  openPages:function(){pagesModal();},
  keyUndo:function(e){if(DYE_keyUndo)DYE_keyUndo(e);}
};

/* ---- block / section picker ---- */
var SK={hero:'<b class="r" style="height:100%"></b>',textImage:'<span style="display:grid;grid-template-columns:1fr 1.4fr;gap:4px;height:100%"><b></b><span style="display:grid;gap:3px"><b class="r"></b><b></b><b></b></span></span>',cards:'<span style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;height:100%"><b></b><b></b><b></b></span>',gallery:'<span style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px;height:100%"><b></b><b></b><b></b><b></b></span>',testimonials:'<span style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;height:100%"><b class="g"></b><b class="g"></b><b class="g"></b></span>',dates:'<b></b><b></b><b></b>',cta:'<b class="r" style="height:100%"></b>',faq:'<b></b><b></b><b></b>',blank:'<b class="r" style="width:60%"></b><b></b><b></b>',empty:'<span style="display:block;height:100%;border:2px dashed #555;border-radius:6px"></span>'};
var pickCb=null,DYE_keyUndo=null,DYE_escape=null;
function pick(kind){return new Promise(function(ok){pickCb=ok;var g=$('#pickg');g.innerHTML='';var isSec=kind==='section',L=isSec?LIB.SECTIONS:LIB.BLOCKS;
  $('#pickt').textContent=isSec?'Add a section':'Add a block';$('#pickh').textContent=isSec?'Pick a ready-made layout. You can change all the words and pictures afterwards.':'Pick what to add. Everything uses the site’s own fonts and colours.';
  Object.keys(L).forEach(function(k){if(L[k].hidden)return;var t=document.createElement('button');t.type='button';t.className='tile';t.dataset.k=k;t.innerHTML=(isSec?'<span class="sk">'+(SK[k]||'<b></b>')+'</span>':'<i>'+L[k].icon+'</i>')+'<span>'+esc(L[k].label)+'</span>';
    t.onclick=function(){$('#pickm').hidden=true;var cb=pickCb;pickCb=null;cb&&cb(k);};if(!isSec)pickDrag(t,k);g.appendChild(t);});$('#pickm').hidden=false;});}
/* drag a block from the picker straight onto a spot on the page (mouse: just drag; touch: hold, then drag) */
function pickDrag(t,k){t.oncontextmenu=function(e){e.preventDefault();};t.title='Click to add, or drag it onto the page';t.addEventListener('pointerdown',function(e){if(e.button>0)return;DYDrag.press(e,function(ev){var FI=null;try{FI=frame.contentWindow.DYI;}catch(_){}if(!FI)return;
  $('#pickm').hidden=true;var off=function(){var r=frame.getBoundingClientRect();return {x:r.left+frame.clientLeft,y:r.top+frame.clientTop};};
  DYDrag.begin({e:ev,doc:document,win:frame.contentWindow,off:off,label:'+ '+LIB.BLOCKS[k].label,
    noText:'Drop it on the page',refuse:function(m){FI.refuse(m);$('#pickm').hidden=false;},
    pick:function(lx,ly){var w=frame.contentWindow;if(lx<0||ly<0||lx>w.innerWidth||ly>w.innerHeight)return null;return FI.blockPick(lx,ly);},
    drop:function(d){var cb=pickCb;pickCb=null;FI.dropNew(k,d);cb&&cb(null);},cancel:function(){$('#pickm').hidden=false;toast('Drop it on the page where the yellow line shows.');}});});});}
function closePick(){if(pickCb){var cb=pickCb;pickCb=null;cb(null);}}

/* ---- draft, history, status ---- */
function used(){var s=JSON.stringify(c),o={};Object.keys(uploads).forEach(function(p){if(s.indexOf(p)>-1)o[p]=uploads[p];});return o;}
function dirty(){return c&&base&&JSON.stringify(c)!==JSON.stringify(base);}
function persist(){try{if(dirty())localStorage.setItem(DK(),JSON.stringify({content:c,uploads:used(),base:base.version}));else localStorage.removeItem(DK());}catch(e){toast('This device is out of space for unpublished pictures. Publish, or use smaller photos.',6000);}}
function record(){var s=JSON.stringify(c);if(hist[pos]===s)return;hist=hist.slice(0,pos+1);hist.push(s);if(hist.length>200)hist.shift();pos=hist.length-1;persist();ui();}
function ui(){var d=dirty(),p=$('#pill');$('#publish').classList.toggle('ready',!!d);p.className='pill'+(d?' dirty':'');if(d)note='';p.textContent=d?'● You have unpublished changes':(note||'✓ Everything is published');
  if(mode==='demo')p.textContent=d?'● Demo changes (this device only)':'Demo: nothing changed yet';
  $('#undo').disabled=$('#pundo').disabled=pos<=0;$('#redo').disabled=$('#predo').disabled=pos>=hist.length-1;renderPicker();}
function after(){persist();ui();if(!exists(page)){page='index';history.replaceState(null,'','?page=index');}renderPicker();reload();if(!$('#pagesm').hidden)pagesModal();}
function lostPages(from,to){var a=Object.keys((from||{}).custom||{}),b=(to||{}).custom||{};return a.filter(function(k){return !b[k];});}
function stepTo(n){c=JSON.parse(hist[n]);pos=n;after();}
function undo(){if(pos<=0)return;var gone=lostPages(c,JSON.parse(hist[pos-1]));
  if(!gone.length){stepTo(pos-1);return;}
  dialog({title:'Undo will remove a page',text:'Going back one step removes the page you made: '+gone.map(function(k){return '“'+labelOf(k)+'”';}).join(', ')+'. You can bring it back with Redo. Go back anyway?',ok:'Go back',cancel:'Keep it'}).then(function(r){if(r.ok&&pos>0)stepTo(pos-1);});}
function redo(){if(pos>=hist.length-1)return;stepTo(pos+1);}
function keyUndo(e){var t=e.target,ed=t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));if(ed||!(e.ctrlKey||e.metaKey)||String(e.key).toLowerCase()!=='z')return;e.preventDefault();if(e.shiftKey)redo();else undo();}
document.addEventListener('keydown',keyUndo);DYE_keyUndo=keyUndo;
window.addEventListener('pagehide',function(){persist();});
window.addEventListener('beforeunload',function(e){try{if(frame.contentWindow.__dyTyping){e.preventDefault();e.returnValue='';}}catch(x){}});

/* ---- frame ---- */
function src(){return new URL(pagePath(page,'edit=1'),location.href).href;}
function clearBars(){closePanel(true);var sb=$('#selbar');if(sb){sb.innerHTML='';sb.hidden=true;}}
function setPage(p){clearBars();hideErr();page=p;history.replaceState(null,'','?page='+encodeURIComponent(p));scrollKeep=null;renderPicker();frame.src=src();watchFrame();}
function reload(){clearBars();hideErr();try{scrollKeep=frame.contentWindow.scrollY;}catch(e){scrollKeep=null;}try{frame.contentWindow.location.replace(src());}catch(e){frame.src=src();}watchFrame();}
/* offline / failed page loads: Chrome's own error page (the dinosaur) must never show in the canvas */
var guard=null;
function showErr(){clearTimeout(guard);clearBars();var e=$('#frameerr');if(e){e.hidden=false;var b=$('#frameretry');if(b)b.focus();}}
function hideErr(){clearTimeout(guard);var e=$('#frameerr');if(e)e.hidden=true;}
function frameOk(){try{var w=frame.contentWindow;void w.document.title;return !!w.DYI;}catch(x){return false;}}
function watchFrame(){clearTimeout(guard);guard=setTimeout(function(){if(!frameOk())showErr();},12000);}
frame.addEventListener('load',function(){try{void frame.contentWindow.document.title;}catch(x){showErr();return;}if(navigator.onLine===false&&!frameOk())showErr();});
function retryFrame(){hideErr();frame.src=src();watchFrame();}
if($('#frameretry'))$('#frameretry').onclick=retryFrame;
window.addEventListener('online',function(){var e=$('#frameerr');if(e&&!e.hidden)retryFrame();});
window.addEventListener('offline',function(){if(!frameOk())showErr();});
/* put the page back exactly where it was (instant, not smooth), and again once late images/fonts have settled */
frame.addEventListener('load',function(){if(scrollKeep==null)return;var y=scrollKeep,w=frame.contentWindow,moved=false;scrollKeep=null;
  function go(){if(moved)return;try{if(Math.abs(w.scrollY-y)>1)w.scrollTo({top:y,behavior:'instant'});}catch(e){}}
  try{['wheel','touchstart','keydown','pointerdown'].forEach(function(t){w.addEventListener(t,function(){moved=true;},{once:true,capture:true});});}catch(e){}
  go();w.requestAnimationFrame(go);setTimeout(go,120);});

function start(){
  $('#login').hidden=true;$('#app').hidden=false;$('#demobadge').hidden=mode!=='demo';
  var pub=$('#publish');pub.title=mode==='live'?'Put your changes on the real website':'Demo mode: shows what publishing would do';
  $('#out').textContent=mode==='live'?'Sign out':'Exit demo';var rb=$('#restorebox');if(rb)rb.remove();if(mode==='live'){var hm=$('#helpm .mc'),bx=document.createElement('div');bx.id='restorebox';bx.innerHTML='<button class="btn ghost" id="restore">Go back one version</button>';hm.insertBefore(bx,hm.querySelector('.steps')||hm.lastChild);$('#restore').onclick=goBack;}
  var p=$('#pill');p.textContent='Loading…';
  (mode==='live'?api('/api/export').then(function(j){if(!j.content)throw new Error('no content');return j.content;}):fetch('../content.json',{cache:'no-store'}).then(function(r){return r.json();}))
  .then(function(pub){base=norm(pub);var d=null;try{d=JSON.parse(localStorage.getItem(DK())||'null');}catch(e){}
    /* a draft made from an older website version would bring back old text (an old date placeholder): drop it */
    if(d&&d.content&&String(d.base)!==String(base.version)){localStorage.removeItem(DK());d=null;setTimeout(function(){toast('The website was updated since your last visit, so older unpublished changes on this device were cleared.',7000);},300);}
    c=d&&d.content?norm(d.content):clone(base);uploads=d&&d.uploads||{};hist=[JSON.stringify(base)];pos=0;if(JSON.stringify(c)!==hist[0]){hist.push(JSON.stringify(c));pos=1;}
    var q=new URLSearchParams(location.search).get('page');page=q&&exists(q)?q:'index';
    ui();frame.src=src();if(d&&d.content&&dirty())toast('Welcome back: your unpublished changes are still here.');})
  .catch(function(e){p.className='pill err';p.textContent='Could not load the website: '+explain(e);});
}

/* ---- pages modal ---- */
function slugify(s){return String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50);}
function pagesModal(){var box=$('#plist');box.innerHTML='';var nav=navOf();
  nav.forEach(function(n,i){var cu=(c.custom||{})[n.key],ext=!!n.href,d=document.createElement('div');d.className='prow';
    d.innerHTML='<div class="mv"><span class="ph" title="Drag to change the menu order">⠿</span><button data-a="up" title="Move up in the menu">▲</button><button data-a="down" title="Move down in the menu">▼</button></div>'+
      '<div><input data-f="label" value="'+esc(n.label)+'" aria-label="Menu name"><small>'+(ext?'Link to '+esc(n.href):(cu?'Your page · '+esc(n.key)+'.html':'Built-in page · '+esc(n.key)+'.html'))+'</small></div>'+
      '<select data-f="show"><option value="menu">Menu</option><option value="footer">Footer only</option><option value="none">Hidden</option></select>'+
      '<div class="acts">'+(ext?'':'<button data-a="open">Open</button><button data-a="seo">Settings</button><button data-a="dup">Copy</button>')+(cu?'<button data-a="title">Rename</button><button data-a="del" class="del">Delete</button>':'')+'</div>';
    d.querySelector('select').value=n.show||'menu';
    d.querySelector('[data-f=label]').onchange=function(){var v=this.value.trim()||n.label;DYE.change(function(x){ensureNav(x)[i].label=v;},{reload:true});};
    d.querySelector('[data-f=show]').onchange=function(){var v=this.value;if(n.key==='index'&&v!=='menu'){toast('The home page always stays in the menu.');this.value='menu';return;}DYE.change(function(x){ensureNav(x)[i].show=v;},{reload:true});};
    d.querySelector('.acts').onclick=function(e){var a=e.target.dataset.a;if(!a)return;
      if(a==='open'){$('#pagesm').hidden=true;setPage(n.key);}
      if(a==='seo')pageSettings(n.key);
      if(a==='dup')newPage(n.key);
      if(a==='title')renamePage(n.key).then(function(){if(!$('#pagesm').hidden)pagesModal();});
      if(a==='del')dialog({title:'Delete this page?',text:'“'+n.label+'” ('+n.key+'.html) will disappear from the website and the menu when you publish. You can undo this until then.',ok:'Delete page',danger:true}).then(function(r){if(!r.ok)return;
        DYE.change(function(x){delete x.custom[n.key];x.nav=ensureNav(x).filter(function(z){return z.key!==n.key;});delete x.pages[n.key];if(x.seo)delete x.seo[n.key];});if(page===n.key)setPage('index');else reload();pagesModal();toast('Page deleted.');});};
    d.querySelector('.mv').onclick=function(e){var a=e.target.dataset.a;if(!a)return;var j=i+(a==='up'?-1:1);if(j<0||j>=nav.length)return;DYE.change(function(x){var L=ensureNav(x);L.splice(j,0,L.splice(i,1)[0]);},{reload:true});pagesModal();};
    d.querySelector('.ph').addEventListener('pointerdown',function(e){if(e.button>0)return;e.preventDefault();DYDrag.begin({e:e,doc:document,ghostFrom:d,pick:function(lx,ly){return DYDrag.halves([].slice.call(box.children),lx,ly);},
      drop:function(at){if(at===i||at===i+1)return;DYE.change(function(x){DYDrag.moveIdx(ensureNav(x),i,at);},{reload:true});pagesModal();toast('Menu order changed. ↶ Undo puts it back.');}});});
    box.appendChild(d);});
  $('#pagesm').hidden=false;}
function navItem(k){return navOf().filter(function(n){return n.key===k;})[0];}
function labelOf(k){var n=navItem(k),cu=(c.custom||{})[k];return n?n.label:(cu?cu.title:k);}
function renamePage(k){var cu=(c.custom||{})[k],n=navItem(k);return dialog({title:'Rename page',text:'This changes the page title and its name in the menu. The web address stays '+k+'.html so links keep working.',
  fields:(cu?[{key:'title',label:'Page title (up to 60 letters)',value:cu.title,max:60}]:[]).concat([{key:'label',label:'Name in the menu (up to 24 letters)',value:n?n.label:'',max:24}]),ok:'Rename',
  validate:function(v){if(cu&&!v.title)return 'Please type a title.';if(!v.label)return 'Please type a name for the menu.';}}).then(function(r){if(!r.ok)return;
  DYE.change(function(x){if(cu){var old=x.custom[k].title;x.custom[k].title=r.values.title;x.seo=x.seo||{};var s=x.seo[k]||{};if(!s.title||s.title===old+' | The Wedding Comedian')s.title=r.values.title+' | The Wedding Comedian';x.seo[k]=s;}
    var it=ensureNav(x).filter(function(z){return z.key===k;})[0];if(it)it.label=r.values.label;else x.nav.push({key:k,label:r.values.label,show:'none'});},{reload:true});ui();toast('Renamed to “'+r.values.label+'”.');});}
function pageSettings(k){var s=(c.seo||{})[k]||{},cu=(c.custom||{})[k],n=navItem(k);$('#seo-for').textContent='For the page “'+labelOf(k)+'” (web address: '+k+'.html).';
  var t=s.title;if(!t&&!cu){try{t=(frame.contentDocument&&page===k)?frame.contentDocument.title:'';}catch(e){t='';}}
  $('#ps-custom').hidden=!cu;$('#ps-title').value=cu?cu.title:'';$('#ps-label').value=n?n.label:labelOf(k);$('#ps-show').value=n?(n.show||'menu'):'none';$('#ps-show').disabled=k==='index';
  $('#seo-title').value=t||(cu?cu.title+' | The Wedding Comedian':'');$('#seo-desc').value=s.description||'';$('#seom').hidden=false;
  $('#seo-save').onclick=function(){var v={title:$('#seo-title').value.trim(),description:$('#seo-desc').value.trim()},lab=$('#ps-label').value.trim(),sh=$('#ps-show').value,ti=$('#ps-title').value.trim();
    if(cu&&!ti){toast('Please give the page a title.');return;}
    DYE.change(function(x){x.seo=x.seo||{};x.seo[k]=v;if(cu)x.custom[k].title=ti;var it=ensureNav(x).filter(function(z){return z.key===k;})[0];if(!it){it={key:k,label:lab||k,show:'none'};x.nav.push(it);}if(lab)it.label=lab;if(k!=='index')it.show=sh;},{reload:true});
    $('#seom').hidden=true;ui();if(!$('#pagesm').hidden)pagesModal();toast('Page settings saved.');};}
function newPage(copyOf){var sel=$('#np-tpl');sel.innerHTML='<optgroup label="Ready-made layouts">'+Object.keys(LIB.PAGE_TEMPLATES).map(function(k){return '<option value="tpl:'+k+'">'+esc(LIB.PAGE_TEMPLATES[k].label)+'</option>';}).join('')+'</optgroup><optgroup label="Copy an existing page">'+allPages().map(function(p){return '<option value="copy:'+esc(p.key)+'">Copy of '+esc(p.label)+'</option>';}).join('')+'</optgroup>';
  sel.value=copyOf?'copy:'+copyOf:'tpl:standard';$('#newpt').textContent=copyOf?'Copy a page':'New page';
  var lab=copyOf?(allPages().filter(function(p){return p.key===copyOf;})[0]||{}).label:'';
  $('#np-title').value=copyOf?'Copy of '+lab:'';$('#np-label').value=copyOf?lab+' 2':'';$('#np-slug').value=copyOf?slugify(copyOf+'-copy'):'';$('#np-msg').textContent='';$('#np-base').textContent='…/wedding-preview/';
  var touched={label:!!copyOf,slug:!!copyOf};$('#np-label').oninput=function(){touched.label=true;};$('#np-slug').oninput=function(){touched.slug=true;};
  $('#np-title').oninput=function(){var t=this.value;if(!touched.label)$('#np-label').value=t.slice(0,24);if(!touched.slug)$('#np-slug').value=slugify(t);};
  $('#np-go').onclick=function(){var title=$('#np-title').value.trim().slice(0,60),label=($('#np-label').value.trim()||title).slice(0,24),slug=slugify($('#np-slug').value||title),m=$('#np-msg');
    if(!title){m.textContent='Please give the page a title.';return;}if(!slug){m.textContent='Please choose a web address.';return;}
    if(RESERVED.indexOf(slug)>-1||exists(slug)){m.textContent='The address “'+slug+'.html” is already used. Please pick another.';return;}
    var v=sel.value.split(':'),pg;
    DYE.change(function(x){x.custom=x.custom||{};x.pages=x.pages||{};x.seo=x.seo||{};ensureNav(x);
      if(v[0]==='copy'){var srcK=v[1],scu=(x.custom||{})[srcK];x.custom[slug]={title:title,base:scu?(scu.base||null):srcK};pg=clone(x.pages[srcK]||{});
        var map={};Object.keys(pg.secs||{}).forEach(function(id){map[id]=LIB.uid('n');});var ns={};Object.keys(pg.secs||{}).forEach(function(id){var s=pg.secs[id];(s.blocks||[]).forEach(function(b){b.id=LIB.uid('b');});ns[map[id]]=s;});if(pg.secs)pg.secs=ns;
        ['order','hidden'].forEach(function(k){if(pg[k])pg[k]=pg[k].map(function(id){return map[id]||id;});});Object.keys(pg.ins||{}).forEach(function(a){pg.ins[a].forEach(function(b){b.id=LIB.uid('b');});});}
      else{x.custom[slug]={title:title,base:null};pg={secs:{},order:[]};LIB.PAGE_TEMPLATES[v[1]].secs.forEach(function(k){var id=LIB.uid('n'),s=LIB.makeSection(k);pg.secs[id]=s;pg.order.push(id);});
        var first=pg.secs[pg.order[0]].blocks[0];if(first.type==='hero')first.title=esc(title);else if(first.type==='heading')first.text=esc(title);}
      x.pages[slug]=pg;x.seo[slug]={title:title+' | The Wedding Comedian',description:''};var at=x.nav.length;x.nav.forEach(function(n,i){if(n.key==='contact'&&v[0]!=='copy')at=i;if(v[0]==='copy'&&n.key===v[1])at=i+1;});x.nav.splice(at,0,{key:slug,label:label,show:'menu'});});
    $('#newpm').hidden=true;$('#pagesm').hidden=true;setPage(slug);toast('Page created. Click anything on it to change it.');};
  $('#newpm').hidden=false;$('#np-title').focus();}

/* ---- preview & publish ---- */
function preview(){try{localStorage.setItem('dy-preview',JSON.stringify({content:c,uploads:used()}));}catch(e){toast('Not enough space on this device to preview these pictures.');return;}window.open(pagePath(page,'preview=1'),'_blank');}
function problems(){var o=[];(c.posts||[]).forEach(function(p,n){var w='Blog post '+(n+1)+(p.title?' ('+p.title+')':'');if(!p.date)o.push(w+' has no date.');if(!p.title)o.push(w+' has no title.');});(c.clips||[]).forEach(function(k,n){if(!k.vid)o.push('Video '+(n+1)+' has no video ID.');});if(!(c.contact||{}).email)o.push('The contact email is empty.');  c.socials.concat(c.contactSocials).forEach(function(s){if(s.url&&!/^https?:\/\//.test(s.url))o.push('Social link "'+s.url+'" should start with https://');});
  Object.keys(c.custom||{}).forEach(function(k){if(!/^[a-z0-9][a-z0-9-]*$/.test(k)||RESERVED.indexOf(k)>-1)o.push('The page address "'+k+'" is not allowed.');});return o;}
function publish(){
  if(mode!=='live'){dialog({title:'Demo mode',text:'This is a practice copy, so Publish doesn’t change the real website. Your demo changes stay on this device. To publish for real, open the editor after signing in.',ok:'Keep practising',cancel:false,extra:[{key:'in',label:'Sign in to publish'}]}).then(function(r){if(r.extra==='in'){persist();localStorage.removeItem(MK);location.reload();}});return;}
  var pr=problems();if(pr.length){dialog({title:'Please fix these first',list:pr,ok:'OK',cancel:false});return;}
  if(!dirty()){toast('Nothing to publish: everything is already live.');return;}
  dialog({title:'Publish now?',text:'Your changes will go on the website. It updates in about a minute.',ok:'Publish'}).then(function(r){if(r.ok)doPublish();});}
function doPublish(){
  var btn=$('#publish');btn.disabled=true;btn.textContent='Publishing…';
  c.version=new Date().toISOString().replace(/\.\d+Z$/,'Z');var imgs=used(),paths=Object.keys(imgs).filter(function(p){return !uploaded[p];});
  Promise.all(paths.map(function(p){return fetch(imgs[p]).then(function(r){return r.blob();}).then(function(bl){return api('/api/upload',{method:'POST',headers:{'Content-Type':bl.type||'image/jpeg'},body:bl});}).then(function(j){uploaded[p]=j.path;});}))
  .then(function(){var json=JSON.stringify(c);Object.keys(uploaded).forEach(function(p){json=json.split(p).join(uploaded[p]);});return api('/api/publish',{method:'POST',headers:{'Content-Type':'application/json'},body:json});})
  .then(function(){base=clone(c);localStorage.removeItem(DK());ui();toast('Saved. Your site updates within a minute.',6000);watchLive(c.version);
  }).catch(function(e){dialog({title:'Publishing failed',text:explain(e),ok:'OK',cancel:false});}).then(function(){btn.disabled=false;btn.textContent='Publish';try{btn.focus({preventScroll:true});}catch(e){}});
}
function watchLive(want){var n=0;(function poll(){n++;fetch('/content.json?nocache='+Date.now(),{cache:'no-store'}).then(function(r){return r.json();}).then(function(j){
  if(String(j.version)===String(want)){toast('Your site is updated.',6000);}else if(n<30)setTimeout(poll,3000);}).catch(function(){if(n<30)setTimeout(poll,3000);});})();}
function niceTime(iso){if(!iso)return '';var d=new Date(iso);if(isNaN(d))return '';try{return d.toLocaleString('en-IE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}catch(e){return d.toString();}}
function goBack(){api('/api/export').then(function(j){
  if(!j.hasPrevious){dialog({title:'Go back one version',text:'There is no earlier version to go back to yet.',ok:'OK',cancel:false});return;}
  var when=niceTime(j.previousSavedAt);
  dialog({title:'Go back one version?',text:'Go back to the version saved before your last publish?'+(when?' It was saved '+when+'.':'')+' Pressing Go back again later puts the newer version back.',ok:'Go back'}).then(function(r){if(!r.ok)return;
    api('/api/restore',{method:'POST'}).then(function(rs){localStorage.removeItem(DK());$('#helpm').hidden=true;note='Went back one version. Your site updates within a minute.';toast(note+' Press Go back again to put the newer version back.',8000);start();watchLive(rs.content&&rs.content.version);})
    .catch(function(e){dialog({title:'Could not go back',text:explain(e),ok:'OK',cancel:false});});});
}).catch(function(e){dialog({title:'Could not go back',text:explain(e),ok:'OK',cancel:false});});}
function explain(e){var s=e.status;if(s===401||s===403)return 'your session has ended. Reload this page and enter your passcode again.';if(s===413)return 'something is too big. Pictures can be up to 5 MB.';if(s===415)return 'a picture is not a JPEG, PNG or WebP.';if(s===400)return 'the website did not accept these changes ('+e.message+'). Please tell your web person.';if(s===409)return e.message;if(s===404||s===405||s===503)return 'publishing is not available on this address.';return 'something went wrong. Check your internet connection and try again.';}

/* ---- sign in ---- */
function openEditor(){mode='live';start();}
function probe(){var m=$('#loginmsg');
  return api('/api/session').then(function(j){if(j.signedIn){openEditor();return;}$('#login').hidden=false;$('#pass').focus();}).catch(function(e){$('#login').hidden=false;
    m.className='msg err';m.textContent=e.status===503?'The saving service is not set up yet.':'The live editor is not available on this address. You can still look around in demo mode.';});}
function signin(){var pw=$('#pass'),m=$('#loginmsg'),v=pw.value;if(!v){m.className='msg err';m.textContent='Please enter your passcode first.';return;}
  m.className='msg';m.textContent='Checking…';$('#signin').disabled=true;
  api('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({passcode:v})}).then(function(){pw.value='';m.textContent='';openEditor();})
  .catch(function(e){pw.value='';m.className='msg err';m.textContent=(e.status===401||e.status===429||e.status===503)?e.message:'The live editor is not available on this address. You can still look around in demo mode.';})
  .then(function(){$('#signin').disabled=false;});}

/* ---- style modal ---- */
var NAMES={rose:'Rose and gold',plum:'Plum',sage:'Sage',navy:'Navy'};
function styleModal(){var A=window.DY_ACCENTS||{},box=$('#accents');box.innerHTML='';
  Object.keys(A).forEach(function(k){var b=document.createElement('button');b.innerHTML='<i style="background:'+A[k][0]+'"></i>'+NAMES[k];if((c.theme.accent||'rose')===k)b.className='on';
    b.onclick=function(){DYE.change(function(x){x.theme.accent=k;},{reload:true});styleModal();};box.appendChild(b);});
  $('#mphone').value=c.contact.phone||'';renderSocs();$('#stylem').hidden=false;}
$('#mphone').onchange=function(){var v=$('#mphone').value.trim();DYE.change(function(x){x.contact.phone=v;},{reload:true});};
function renderSocs(){[['socials','#socs'],['contactSocials','#csocs']].forEach(function(p){var key=p[0],box=$(p[1]);if(!box)return;box.innerHTML='';var I=window.DY_ICONS||{};
  c[key].forEach(function(s,i){var d=document.createElement('div');d.className='socrow';d.innerHTML='<select>'+Object.keys(I).map(function(n){return '<option value="'+n+'">'+I[n].title+'</option>';}).join('')+'</select><input type="url" placeholder="https://…"><button title="Remove">✕</button>';
    var se=d.querySelector('select'),inp=d.querySelector('input');se.value=s.network;inp.value=s.url||'';
    se.onchange=function(){DYE.change(function(x){x[key][i].network=se.value;},{reload:true});};inp.onchange=function(){DYE.change(function(x){x[key][i].url=inp.value.trim();},{reload:true});};
    d.querySelector('button').onclick=function(){DYE.change(function(x){x[key].splice(i,1);},{reload:true});renderSocs();};box.appendChild(d);});});}
DYE.openSocials=styleModal;
$('#addsoc').onclick=function(){c.socials.push({network:'instagram',url:''});renderSocs();};
$('#addcsoc').onclick=function(){c.contactSocials.push({network:'instagram',url:''});renderSocs();};

/* ---- keyboard: Escape closes the top-most thing; one overlay at a time; focus moves in and back ---- */
function escapeTop(){
  if(!$('#dlg').hidden)return true; /* the dialog handles its own Escape */
  var pk=$('#pickm');if(pk&&!pk.hidden){pk.hidden=true;closePick();return true;}
  var open=[].slice.call(document.querySelectorAll('.modal')).filter(function(m){return !m.hidden;});
  if(open.length){var top=open[open.length-1];top.hidden=true;return true;}
  if(!$('#side').hidden){closePanel();return true;}
  return false;}
DYE_escape=escapeTop;
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!e.defaultPrevented){if(escapeTop())e.preventDefault();}});
(function(){var lastFocus=null,openers=new Map(),seen=new WeakSet();
  function onOpen(t){var keep=(t.id==='newpm'||t.id==='seom')?$('#pagesm'):null;
    document.querySelectorAll('.modal').forEach(function(m){if(m!==t&&m!==keep&&m.id!=='dlg'&&!m.hidden){m.hidden=true;if(m.id==='pickm')closePick();}});
    closePanel(true);openers.set(t,lastFocus);var f=t.querySelector('input:not([type=hidden]),textarea,select,.btn:not(#discard):not(.red):not(.danger),button:not(.x):not(#discard):not(.danger)')||t.querySelector('.x');
    setTimeout(function(){if(!t.hidden&&f&&!t.contains(document.activeElement))try{f.focus({preventScroll:true});}catch(e){}},40);}
  function onClose(t){var o=openers.get(t);openers.delete(t);setTimeout(function(){var a=document.activeElement;if(o&&o.isConnected&&(!a||a===document.body||t.contains(a)))try{o.focus({preventScroll:true});}catch(e){}},30);}
  var mo=new MutationObserver(function(ms){ms.forEach(function(r){var t=r.target;if(t.id==='dlg')return;if(t.hidden)onClose(t);else onOpen(t);});});
  function attach(){document.querySelectorAll('.modal').forEach(function(m){if(seen.has(m))return;seen.add(m);mo.observe(m,{attributes:true,attributeFilter:['hidden']});if(!m.hidden&&m.id!=='dlg')onOpen(m);});}
  attach();new MutationObserver(attach).observe(document.body,{childList:true});
  document.addEventListener('focusin',function(e){if(!e.target.closest('.modal'))lastFocus=e.target;},true);
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('button,a,[tabindex]');if(b&&!b.closest('.modal'))lastFocus=b;},true);})();
/* ---- wiring ---- */
document.querySelectorAll('[data-close]').forEach(function(b){b.onclick=function(){b.closest('.modal').hidden=true;if(b.closest('#pickm'))closePick();};});
document.querySelectorAll('.modal').forEach(function(m){m.onclick=function(e){if(e.target===m){m.hidden=true;if(m.id==='pickm')closePick();}};});
$('#page').onchange=function(){if(this.value==='__new'){this.value=page;newPage();return;}setPage(this.value);};
$('#pagesb').onclick=pagesModal;$('#newpb').onclick=function(){newPage();};
$('#vdesk').onclick=function(){$('#stage').classList.remove('phone');this.classList.add('on');$('#vphone').classList.remove('on');};
$('#vphone').onclick=function(){$('#stage').classList.add('phone');this.classList.add('on');$('#vdesk').classList.remove('on');};
$('#undo').onclick=undo;$('#redo').onclick=redo;$('#pundo').onclick=undo;$('#predo').onclick=redo;$('#preview').onclick=preview;$('#publish').onclick=publish;
$('#helpb').onclick=function(){$('#helpm').hidden=false;};$('#style').onclick=styleModal;
$('#discard').onclick=function(){if(!dirty()){toast('There is nothing unpublished to throw away.');return;}dialog({title:'Throw away changes?',text:'All changes that are not published yet will be removed.',ok:'Throw away',danger:true}).then(function(r){if(!r.ok)return;c=clone(base);uploads={};record();localStorage.removeItem(DK());$('#helpm').hidden=true;if(!exists(page))page='index';reload();});};
$('#out').onclick=function(){if(mode==='live'){persist();var ob=$('#out');ob.disabled=true;api('/api/logout',{method:'POST'}).then(function(){location.reload();}).catch(function(){ob.disabled=false;toast('Could not sign out. Please try again.');});return;}localStorage.removeItem(MK);location.reload();};
$('#psettings').onclick=function(){pageSettings(page);};
$('#signin').onclick=signin;$('#pass').onkeydown=function(e){if(e.key==='Enter')signin();};
$('#demo').onclick=function(){mode='demo';localStorage.setItem(MK,'demo');start();};

if(mode==='demo')start();else probe();
window.addEventListener('pageshow',function(e){if(e.persisted)location.reload();});
})();
