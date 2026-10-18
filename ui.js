(function(){var d=document,h=d.documentElement,hd;
var editing=false;try{editing=window.parent!==window&&!!window.parent.DYE;}catch(e){editing=/[?&]edit/.test(location.search);}
/* Full-screen mobile menu (own code): opens from the Menu button, close (X) button, scroll lock that keeps the scroll position (iOS safe), Escape, focus moves in/returns, Tab is trapped, rest of page is inert while open. Not used while editing (the editor works on the classic menu). */
(function(){var btn=d.querySelector('button.ham'),nav=d.getElementById('mnav'),b=d.body;if(!btn||!nav)return;
if(editing){h.classList.add('mclassic');return;}
btn.removeAttribute('onclick');nav.removeAttribute('onclick');
var cl=d.createElement('button');cl.type='button';cl.className='mclose';cl.setAttribute('aria-label','Close menu');cl.setAttribute('data-gen','');nav.parentNode.insertBefore(cl,nav.nextSibling);
nav.setAttribute('role','dialog');nav.setAttribute('aria-modal','true');nav.setAttribute('aria-label','Menu');
var isOpen=false,y=0,made=[];
function lock(){var sw=innerWidth-h.clientWidth;y=window.pageYOffset;b.style.position='fixed';b.style.top=-y+'px';b.style.left='0';b.style.right='0';b.style.width='100%';if(sw>0)b.style.paddingRight=sw+'px';}
function unlock(){b.style.position=b.style.top=b.style.left=b.style.right=b.style.width=b.style.paddingRight='';var sb=h.style.scrollBehavior;h.style.scrollBehavior='auto';window.scrollTo(0,y);h.style.scrollBehavior=sb;}
function inert(on){if(on){var hd=d.querySelector('header.top');[].slice.call(b.children).forEach(function(el){if(/^(SCRIPT|STYLE|LINK)$/.test(el.tagName))return;if(el===hd){[].slice.call(hd.children).forEach(function(c){if(c!==nav&&c!==cl&&!c.inert){c.inert=true;made.push(c);}});}else if(!el.inert){el.inert=true;made.push(el);}});}else{made.forEach(function(el){el.inert=false;});made=[];}}
function open(){if(isOpen)return;isOpen=true;lock();h.classList.add('menu-open');nav.classList.add('open');btn.setAttribute('aria-expanded','true');inert(true);cl.focus();}
function close(back){if(!isOpen)return;isOpen=false;inert(false);nav.classList.remove('open');h.classList.remove('menu-open');btn.setAttribute('aria-expanded','false');unlock();if(back!==false)btn.focus({preventScroll:true});}
btn.addEventListener('click',function(){isOpen?close():open();});cl.addEventListener('click',function(){close();});
nav.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a');if(a)close(false);});
d.addEventListener('keydown',function(e){if(!isOpen)return;if(e.key==='Escape'){e.preventDefault();close();return;}if(e.key!=='Tab')return;var f=[].slice.call(nav.querySelectorAll('a[href]')).concat([cl]),i=f.indexOf(d.activeElement);if(e.shiftKey&&(i<=0)){e.preventDefault();f[f.length-1].focus();}else if(!e.shiftKey&&(i===f.length-1||i<0)){e.preventDefault();f[0].focus();}});
addEventListener('resize',function(){if(isOpen&&getComputedStyle(btn).display==='none')close(false);});
addEventListener('pageshow',function(e){if(e.persisted&&isOpen)close(false);});
if(nav.classList.contains('open')&&!isOpen){nav.classList.remove('open');open();}
})();
function bar(){hd=hd||d.querySelector('header.top');if(hd)hd.classList.toggle('scrolled',scrollY>8);}
addEventListener('scroll',bar,{passive:true});bar();
d.addEventListener('keydown',function(e){if(e.key!=='Escape'||h.classList.contains('menu-open'))return;var m=d.getElementById('mnav'),b=d.querySelector('button.ham');if(m&&m.classList.contains('open')){m.classList.remove('open');if(b){b.setAttribute('aria-expanded','false');b.focus();}}});
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
function tag(){t=0;d.querySelectorAll('main>section,.rev,.pr,.vid,.post,.qa,.card,.tcard,.fact').forEach(function(el){if(el.classList.contains('rv'))return;el.classList.add('rv');el.style.setProperty('--d',(n++%5)*70+'ms');io.observe(el);});}
tag();new MutationObserver(function(){if(!t)t=requestAnimationFrame(tag);}).observe(d.body,{childList:true,subtree:true});
addEventListener('resize',function(){setTimeout(showSeen,50);});addEventListener('load',function(){setTimeout(showSeen,300);});addEventListener('beforeprint',showAll);
setTimeout(showSeen,1500);setTimeout(showAll,9000);
})();
