/* Shared drag engine for the editor (used by the shell and by the page in the frame).
   Pointer events only, so mouse, pen and touch behave the same. Drop targets are "slots": short lines
   (x1,y1)-(x2,y2) in the target window's viewport. The nearest slot to the pointer gets the drop indicator.
   Nothing is changed until the pointer is released; the caller then makes ONE change (= one undo step). */
(function(){
function dist(px,py,s){var dx=s.x2-s.x1,dy=s.y2-s.y1,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((px-s.x1)*dx+(py-s.y1)*dy)/l)):0,x=s.x1+t*dx,y=s.y1+t*dy;return Math.hypot(px-x,py-y);}
/* o: {e, doc (where the pointer and ghost are), win (window that scrolls; default doc's), off() -> {x,y} of win's viewport inside doc,
       label, ghostFrom (element to copy for the ghost), slots() -> [{x1,y1,x2,y2,data}], drop(data), cancel(), max (px, nearest slot limit)} */
function begin(o){var doc=o.doc||document,W=doc.defaultView,win=o.win||W,e=o.e,id=e.pointerId,src=e.target;
  var off=o.off||function(){return {x:0,y:0};};
  try{src.setPointerCapture(id);}catch(_){}
  var gh=doc.createElement('div');gh.className='dy-ui dyd-ghost';
  if(o.ghostFrom){var r=o.ghostFrom.getBoundingClientRect(),w=Math.min(r.width,360),c=o.ghostFrom.cloneNode(true);c.removeAttribute('id');[].slice.call(c.querySelectorAll('iframe,video,script,.dy-ui')).forEach(function(k){k.remove();});[c].concat([].slice.call(c.querySelectorAll('*'))).forEach(function(k){['id','data-bid','data-nsec','data-dy','data-bgroup','data-cms'].forEach(function(a){k.removeAttribute(a);});});gh.appendChild(c);gh.style.width=r.width+'px';gh.style.transform='scale('+(w/r.width)+')';gh.dataset.sc=w/r.width;gh._dx=Math.min(e.clientX-r.left,w)*(r.width/w);gh._dy=Math.min(e.clientY-r.top,140);}
  else{gh.classList.add('lab');gh.textContent=o.label||'Move';gh._dx=-14;gh._dy=-14;}
  var ind=win.document.createElement('div');ind.className='dy-ui dyd-ind';ind.hidden=true;win.document.body.appendChild(ind);doc.body.appendChild(gh);
  var tip=doc.createElement('div');tip.className='dy-ui dyd-tip';tip.hidden=true;doc.body.appendChild(tip);function placeTip(){tip.style.left=(x+16)+'px';tip.style.top=(y+18)+'px';}
  doc.documentElement.classList.add('dyd-on');if(win.document!==doc)win.document.documentElement.classList.add('dyd-on');
  if(o.ghostFrom)o.ghostFrom.classList.add('dyd-src');
  var x=e.clientX,y=e.clientY,x0=x,y0=y,moved=false,cur=null,raf=0,done=false,pd=function(t){t.preventDefault();};doc.addEventListener('touchmove',pd,{passive:false,capture:true});
  function place(){var sc=+gh.dataset.sc||1;gh.style.left=(x-gh._dx*sc)+'px';gh.style.top=(y-gh._dy*sc)+'px';
    var p=off(),lx=x-p.x,ly=y-p.y,best=null,bd=1e9;if(o.pick)best=o.pick(lx,ly);else (o.slots(lx,ly)||[]).forEach(function(s){var d=dist(lx,ly,s);if(d<bd){bd=d;best=s;}});
    if(best&&o.max&&bd>o.max)best=null;cur=best;gh.classList.toggle('no',!best||!!best.no);
    if(!best){ind.hidden=true;tip.textContent=o.noText||'Can\u2019t drop here';tip.hidden=false;placeTip();return;}ind.hidden=false;ind.classList.toggle('no',!!best.no);tip.hidden=!best.no;if(best.no){tip.textContent=best.msg||'Can\u2019t drop here';placeTip();}var sx=win.scrollX,sy=win.scrollY,v=best.x1===best.x2;
    ind.classList.toggle('v',v);ind.style.left=(Math.min(best.x1,best.x2)+sx-(v?3:0))+'px';ind.style.top=(Math.min(best.y1,best.y2)+sy-(v?0:3))+'px';
    ind.style.width=(v?6:Math.max(40,Math.abs(best.x2-best.x1)))+'px';ind.style.height=(v?Math.max(30,Math.abs(best.y2-best.y1)):6)+'px';}
  function tick(){raf=0;if(done)return;var p=off(),ly=y-p.y,h=win.innerHeight,E=Math.min(70,h/6),sp=0;
    if(ly<E)sp=-Math.ceil((E-Math.max(ly,0))/2);else if(ly>h-E)sp=Math.ceil((ly-(h-E))/2);
    if(sp){win.scrollBy({top:Math.max(-45,Math.min(45,sp)),behavior:'instant'});place();}raf=W.requestAnimationFrame(tick);}
  function mv(ev){if(ev.pointerId!==id)return;ev.preventDefault();x=ev.clientX;y=ev.clientY;if(Math.hypot(x-x0,y-y0)>4)moved=true;place();}
  function end(ev){if(ev.pointerId!==id)return;done=true;doc.removeEventListener('pointermove',mv,true);doc.removeEventListener('pointerup',end,true);doc.removeEventListener('pointercancel',end,true);doc.removeEventListener('touchmove',pd,{passive:false,capture:true});
    if(raf)W.cancelAnimationFrame(raf);gh.remove();ind.remove();tip.remove();W.__dydEnd=Date.now();try{win.__dydEnd=Date.now();}catch(_){}doc.documentElement.classList.remove('dyd-on');win.document.documentElement.classList.remove('dyd-on');if(o.ghostFrom)o.ghostFrom.classList.remove('dyd-src');
    try{src.releasePointerCapture(id);}catch(_){}
    /* swallow the click that follows a drag */
    var sw=function(c){c.stopPropagation();c.preventDefault();};doc.addEventListener('click',sw,true);setTimeout(function(){doc.removeEventListener('click',sw,true);},0);
    if(ev.type==='pointerup'&&cur&&moved&&!cur.no)o.drop(cur.data);else if(ev.type==='pointerup'&&moved&&o.refuse)o.refuse(cur&&cur.msg);else if(o.cancel)o.cancel();}
  doc.addEventListener('pointermove',mv,true);doc.addEventListener('pointerup',end,true);doc.addEventListener('pointercancel',end,true);
  place();raf=W.requestAnimationFrame(tick);}
/* Start a drag only after a long press (touch) or a small move (mouse), so normal taps, clicks and scrolling still work. */
function press(e,start){var doc=e.target.ownerDocument,id=e.pointerId,x0=e.clientX,y0=e.clientY,touch=e.pointerType!=='mouse',t=null,go=false;
  function stop(){clearTimeout(t);doc.removeEventListener('pointermove',mv,true);doc.removeEventListener('pointerup',stop,true);doc.removeEventListener('pointercancel',stop,true);}
  function fire(ev){if(go)return;go=true;stop();start(ev||e);}
  function mv(ev){if(ev.pointerId!==id)return;var d=Math.hypot(ev.clientX-x0,ev.clientY-y0);if(touch){if(d>10)stop();}else if(d>6)fire(ev);}
  if(touch)t=setTimeout(function(){if(navigator.vibrate)try{navigator.vibrate(15);}catch(_){}fire(e);},420);
  doc.addEventListener('pointermove',mv,true);doc.addEventListener('pointerup',stop,true);doc.addEventListener('pointercancel',stop,true);}
/* slots between a list of elements laid out top-to-bottom (axis y) or in a row/grid (axis x) */
function between(els,axis){var out=[];els.forEach(function(el,i){var r=el.getBoundingClientRect();if(!r.width&&!r.height)return;
  if(axis==='x'){out.push({x1:r.left-3,y1:r.top,x2:r.left-3,y2:r.bottom,data:i});if(i===els.length-1)out.push({x1:r.right+3,y1:r.top,x2:r.right+3,y2:r.bottom,data:i+1});}
  else{out.push({x1:r.left,y1:r.top-3,x2:r.right,y2:r.top-3,data:i});if(i===els.length-1)out.push({x1:r.left,y1:r.bottom+3,x2:r.right,y2:r.bottom+3,data:i+1});}});return out;}
function halves(els,lx,ly){var best=-1,bd=1e9,R=null;els.forEach(function(el,i){var r=el.getBoundingClientRect();if(!r.width&&!r.height)return;var dx=Math.max(r.left-lx,0,lx-r.right),dy=Math.max(r.top-ly,0,ly-r.bottom),d=Math.hypot(dx,dy);if(d<bd){bd=d;best=i;R=r;}});if(best<0)return null;
  var row=els.length>1&&axisOf(els)==='x',after=row?lx>R.left+R.width/2:ly>R.top+R.height/2;
  return row?{x1:after?R.right+3:R.left-3,x2:after?R.right+3:R.left-3,y1:R.top,y2:R.bottom,data:best+(after?1:0)}:{x1:R.left,x2:R.right,y1:after?R.bottom+3:R.top-3,y2:after?R.bottom+3:R.top-3,data:best+(after?1:0)};}
function axisOf(els){if(els.length<2)return 'y';var a=els[0].getBoundingClientRect(),b=els[1].getBoundingClientRect();return Math.abs(a.top-b.top)<Math.min(a.height,b.height)/2?'x':'y';}
/* move item at index from to slot index at (slot index counts gaps before items) */
function moveIdx(list,from,at){if(at===from||at===from+1)return false;var it=list.splice(from,1)[0];list.splice(at>from?at-1:at,0,it);return true;}
var CSS='.dyd-ghost{position:fixed;z-index:2147483646;pointer-events:none;transform-origin:0 0;opacity:.85;box-shadow:0 12px 40px rgba(0,0,0,.6);border-radius:10px;overflow:hidden;max-height:420px;background:#111}'+
 '.dyd-ghost.lab{background:#f6c343;color:#111;font:800 14px Inter,sans-serif;padding:8px 14px;border-radius:999px;max-height:none}'+
 '.dyd-ind{position:absolute;z-index:2147483645;background:#f6c343;border-radius:4px;pointer-events:none;box-shadow:0 0 0 2px rgba(0,0,0,.6),0 0 14px rgba(246,195,67,.9);transition:left .08s,top .08s,width .08s,height .08s}'+
 '.dyd-ind.no{background:#ff5050;box-shadow:0 0 0 2px rgba(0,0,0,.6),0 0 14px rgba(255,80,80,.9)}.dyd-ghost.no{opacity:.5;filter:grayscale(1)}.dyd-tip{position:fixed;z-index:2147483647;pointer-events:none;background:#ff5050;color:#fff;font:800 13px Inter,sans-serif;padding:6px 10px;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.5)}'+
 '.dyd-on,.dyd-on *{cursor:grabbing!important;user-select:none!important;-webkit-user-select:none!important}.dyd-src{opacity:.35!important}';
function css(doc){if(doc.getElementById('dyd-css'))return;var s=doc.createElement('style');s.id='dyd-css';s.textContent=CSS;doc.head.appendChild(s);}
css(document);
window.DYDrag={halves:halves,begin:begin,press:press,between:between,axisOf:axisOf,moveIdx:moveIdx,css:css};
})();
