(function(){var d=document,h=d.documentElement,hd;
var editing=false;try{editing=window.parent!==window&&!!window.parent.DYE;}catch(e){editing=/[?&]edit/.test(location.search);}
function bar(){hd=hd||d.querySelector('header.top');if(hd)hd.classList.toggle('scrolled',scrollY>8);}
addEventListener('scroll',bar,{passive:true});bar();
d.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.lite');if(!b||b.querySelector('iframe')||editing)return;var f=d.createElement('iframe');
 f.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(b.getAttribute('data-yt'))+'?autoplay=1&rel=0';f.title=b.getAttribute('data-title')||'Video';
 f.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';f.setAttribute('allowfullscreen','');f.referrerPolicy='strict-origin-when-cross-origin';b.appendChild(f);b.classList.add('on');});
/* Reveal-on-scroll is an enhancement only: nothing may stay hidden. Skipped for editing, reduced motion, no IntersectionObserver,
   very tall windows (full-page screenshots, big monitors); anything left over is shown on resize, load, print and after a timeout. */
if(editing||!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches||innerHeight>1500)return;
var io;try{io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{rootMargin:'0px 0px -6% 0px',threshold:0});}catch(e){return;}
h.classList.add('js-rv');
var n=0,t=0;
function showAll(){d.querySelectorAll('.rv:not(.in)').forEach(function(el){el.classList.add('in');});}
function showSeen(){d.querySelectorAll('.rv:not(.in)').forEach(function(el){var r=el.getBoundingClientRect();if(r.top<innerHeight*1.2)el.classList.add('in');});}
function tag(){t=0;d.querySelectorAll('main>section,main>.credits,main>.tagband,body>section,body>.credits,body>.tagband,.rcard,.svc,.tcard,.clip,.lite,.prod,.show,.card,.dchip').forEach(function(el){if(el.classList.contains('rv'))return;el.classList.add('rv');el.style.setProperty('--d',(n++%5)*70+'ms');io.observe(el);});}
tag();new MutationObserver(function(){if(!t)t=requestAnimationFrame(tag);}).observe(d.body,{childList:true,subtree:true});
addEventListener('resize',function(){setTimeout(showSeen,50);});addEventListener('load',function(){setTimeout(showSeen,300);});addEventListener('beforeprint',showAll);
setTimeout(showSeen,1500);setTimeout(showAll,9000);
})();
