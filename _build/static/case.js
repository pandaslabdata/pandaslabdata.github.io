// Pandas Lab — Case pages: language memory, language sheet, reveal, stamps, counters, swipe dots, reading thread.
(function(){
  var html=document.documentElement;
  // 1) language: same localStorage key as the rest of the site ("pl_lang")
  var alt={}; try{alt=JSON.parse(document.getElementById('pl-alt').textContent)}catch(e){}
  document.querySelectorAll('[data-setlang]').forEach(function(a){ a.addEventListener('click',function(){ try{localStorage.setItem('pl_lang',a.dataset.setlang)}catch(e){} }); });
  // only the English (default) address follows a language chosen earlier; a shared /it/ or /de/ link is never redirected
  if(html.dataset.default==='1'){
    var saved=null; try{saved=localStorage.getItem('pl_lang')}catch(e){}
    if(saved && saved!=='en' && alt[saved]){ location.replace(alt[saved]+location.hash); return; }
  }
  try{localStorage.setItem('pl_lang',html.lang)}catch(e){}

  var sh=document.querySelector('.sheet-lang');
  if(sh){
    var close=function(){sh.classList.remove('open');sh.setAttribute('aria-hidden','true')};
    document.querySelectorAll('.tabbar .lg').forEach(function(b){ b.addEventListener('click',function(){sh.classList.add('open');sh.setAttribute('aria-hidden','false')}); });
    sh.querySelector('.bg').addEventListener('click',close);
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') close(); });
  }

  // 2) reveal + stamps
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting) return;
      var el=e.target; el.classList.add('in'); io.unobserve(el);
      el.querySelectorAll('.stamp.anim').forEach(function(s,i){ setTimeout(function(){ s.classList.add('in'); },300+i*180); });
    });
  },{threshold:0,rootMargin:'0px 0px -10% 0px'});
  document.querySelectorAll('.rv,.chart,.cover').forEach(function(el){ io.observe(el); });

  // 3) counters on real numbers: animate, then put back the exact server text (locale format)
  var co=new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting) return; co.unobserve(e.target);
      var el=e.target, to=parseFloat(el.dataset.to), dec=(el.dataset.dec|0), ds=el.dataset.ds||'.', fin=el.textContent, t0=performance.now();
      (function f(t){ var k=Math.min(1,(t-t0)/1200); k=1-Math.pow(1-k,3);
        if(k<1){ el.textContent=(to*k).toFixed(dec).replace('.',ds); requestAnimationFrame(f); } else el.textContent=fin; })(t0);
    });
  },{threshold:.6});
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches) document.querySelectorAll('[data-to]').forEach(function(el){ co.observe(el); });

  // 4) swipe rails: position dots
  document.querySelectorAll('.rail').forEach(function(r){
    var hint=r.previousElementSibling; if(!hint||!hint.classList.contains('swipe-hint')) return;
    var dots=hint.querySelector('.dots'), kids=[].slice.call(r.children);
    kids.forEach(function(){ dots.appendChild(document.createElement('i')); });
    function upd(){ var c=r.scrollLeft+r.clientWidth/2,best=0,bd=1e9;
      kids.forEach(function(k,i){ var d=Math.abs(k.offsetLeft+k.offsetWidth/2-c); if(d<bd){bd=d;best=i;} });
      [].forEach.call(dots.children,function(d,i){ d.classList.toggle('on',i===best); }); }
    r.addEventListener('scroll',function(){ requestAnimationFrame(upd); },{passive:true}); upd();
  });

  // 4b) home: pin the evidence once the room is loaded; the desk moves with the scroll (depth), the board with the pointer
  var room=document.querySelector('[data-room]');
  if(room){
    var start=function(){ room.classList.add('on'); };
    var bg=new Image(); bg.onload=start; bg.onerror=start; bg.src=getComputedStyle(room).backgroundImage.replace(/^url\(["']?|["']?\)$/g,'');
    setTimeout(start,1800);
    var calm=matchMedia('(prefers-reduced-motion: reduce)').matches, desk=room.querySelector('.desk'), cork=room.querySelector('.cork');
    if(!calm){
      var mx=0,my=0,ticking=false;
      var draw=function(){ ticking=false; var r=room.getBoundingClientRect(), k=Math.max(-1,Math.min(1,-r.top/r.height));
        if(desk) desk.style.transform='translate3d('+(mx*-10)+'px,'+(k*70)+'px,0) scale('+(1+k*.04)+')';
        if(cork) cork.style.transform='translate3d('+(mx*6)+'px,'+(my*4+k*-18)+'px,0)'; };
      var ask=function(){ if(!ticking){ ticking=true; requestAnimationFrame(draw); } };
      window.addEventListener('scroll',ask,{passive:true});
      room.addEventListener('pointermove',function(e){ if(e.pointerType!=='mouse') return; var r=room.getBoundingClientRect(); mx=(e.clientX-r.left)/r.width-.5; my=(e.clientY-r.top)/r.height-.5; ask(); });
      room.addEventListener('pointerleave',function(){ mx=my=0; ask(); });
    }
  }

  // 4c) stories: topic tabs (also from the address: /stories.html#dino opens that drawer)
  var tabs=document.querySelectorAll('.ftab');
  if(tabs.length){
    var pick=function(t){ tabs.forEach(function(b){ b.classList.toggle('on',b.dataset.t===t); });
      document.querySelectorAll('.dfile').forEach(function(f){ f.classList.toggle('hide', t!=='all' && (' '+f.dataset.tags+' ').indexOf(' '+t+' ')<0); }); };
    tabs.forEach(function(b){ b.addEventListener('click',function(){ pick(b.dataset.t); history.replaceState(null,'',b.dataset.t==='all'?location.pathname:'#'+b.dataset.t); }); });
    var h=location.hash.slice(1); if(h && document.querySelector('.ftab[data-t="'+h+'"]')) pick(h);
  }

  // 5) table of contents follows the reading + red thread under the header
  var toc=document.querySelector('.toc');
  if(toc){
    var links=[].slice.call(toc.querySelectorAll('a')), bar=toc.querySelector('.read-thread i'), row=toc.querySelector('.wrap'), last=-1;
    var secs=links.map(function(a){ return document.querySelector(a.getAttribute('href')); });
    var spy=function(){
      var y=window.scrollY+150, cur=0;
      secs.forEach(function(s,i){ if(s && s.offsetTop<=y) cur=i; });
      if(cur!==last){ last=cur; links.forEach(function(a,i){ a.classList.toggle('on',i===cur); });
        if(row.scrollWidth>row.clientWidth){ var on=links[cur]; row.scrollTo({left:on.offsetLeft-row.clientWidth/2+on.offsetWidth/2,behavior:'smooth'}); } }
      var h=document.documentElement.scrollHeight-window.innerHeight; if(bar) bar.style.width=(h>0?Math.min(100,window.scrollY/h*100):0)+'%';
    };
    var tick=false; window.addEventListener('scroll',function(){ if(!tick){ tick=true; requestAnimationFrame(function(){ tick=false; spy(); }); } },{passive:true}); spy();
  }
})();
