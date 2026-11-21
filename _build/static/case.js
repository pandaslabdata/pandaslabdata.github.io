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
    // red threads: the board is the menu. One thread from the middle (Pandas Lab) to every pinned item,
    // with a little sag like real string. Hover or keyboard focus: the rest dims, that thread lights up.
    var cork0=room.querySelector('[data-board]'), svgNS='http://www.w3.org/2000/svg';
    var anchor=function(el){ var a=el.querySelector('.pin')||el.querySelector('.tape')||el;
      return [el.offsetLeft+(a===el?el.offsetWidth/2:a.offsetLeft+a.offsetWidth/2), el.offsetTop+(a===el?0:a.offsetTop+a.offsetHeight*(a.classList.contains('pin')?.18:.5))]; };
    var drawYarn=function(){
      var svg=room.querySelector('.yarn'); if(!svg||!cork0) return;
      var hub=cork0.querySelector('[data-hub]'); if(!hub) return;
      svg.setAttribute('viewBox','0 0 '+cork0.clientWidth+' '+cork0.clientHeight);
      var c=[hub.offsetLeft+hub.offsetWidth/2, hub.offsetTop+hub.offsetHeight*.45];
      var items=[].slice.call(cork0.querySelectorAll('.node,.deco')).filter(function(el){ return el.offsetParent!==null; });
      while(svg.firstChild) svg.removeChild(svg.firstChild);
      items.forEach(function(el,i){ var q=anchor(el), dist=Math.hypot(q[0]-c[0],q[1]-c[1]);
        var p=document.createElementNS(svgNS,'path');
        p.setAttribute('d','M'+c[0].toFixed(1)+' '+c[1].toFixed(1)+' Q'+((c[0]+q[0])/2).toFixed(1)+' '+(Math.max(c[1],q[1])+dist*.1).toFixed(1)+' '+q[0].toFixed(1)+' '+q[1].toFixed(1));
        p.setAttribute('pathLength','1'); if(el.classList.contains('deco')) p.setAttribute('class','deco-line');
        svg.appendChild(p); el._yarn=p; });
    };
    if(cork0){
      var top=cork0.querySelector('.yarn-top');
      var hot=function(el,on){ cork0.classList.toggle('focus',on); el.classList.toggle('hot',on);
        if(top&&el._yarn){ top.setAttribute('viewBox',cork0.querySelector('.yarn').getAttribute('viewBox')); top.querySelector('path').setAttribute('d',on?el._yarn.getAttribute('d'):''); } };
      [].forEach.call(cork0.querySelectorAll('.node,.deco'),function(el){
        el.addEventListener('mouseenter',function(){ hot(el,true); }); el.addEventListener('mouseleave',function(){ hot(el,false); });
        el.addEventListener('focus',function(){ hot(el,true); }); el.addEventListener('blur',function(){ hot(el,false); }); });
    }
    drawYarn(); window.addEventListener('resize',function(){ requestAnimationFrame(drawYarn); });
    if(document.fonts&&document.fonts.ready) document.fonts.ready.then(drawYarn);
    window.addEventListener('load',drawYarn);
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

  var calm0=matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 4d) living photos, like the boiling glass in the videos: every photo moves the way its subject would.
  //     water = rippling refraction, fire = embers + flicker, stars = twinkling, dust = motes in the light, spin = slow galaxy turn
  (function(){
    var lives=[].slice.call(document.querySelectorAll('.live[data-fx]')); if(!lives.length||calm0) return;
    if(lives.some(function(l){return l.dataset.fx==='water';})){
      var d=document.createElement('div'); d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
      d.innerHTML='<svg width="0" height="0"><filter id="fx-water" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.045" numOctaves="2" seed="3" result="n"><animate attributeName="baseFrequency" dur="14s" values="0.012 0.045;0.016 0.052;0.012 0.045" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G"/></filter></svg>';
      document.body.appendChild(d);
    }
    var running=[];
    lives.forEach(function(box){
      var fx=box.dataset.fx; if(fx==='water'||fx==='spin') return;
      var cv=document.createElement('canvas'), cx=cv.getContext('2d'), P=[], on=false; box.appendChild(cv);
      var size=function(){ var r=box.getBoundingClientRect(), k=Math.min(2,window.devicePixelRatio||1); cv.width=Math.max(1,r.width*k); cv.height=Math.max(1,r.height*k); };
      var spawn=function(init){ var W=cv.width,H=cv.height;
        if(fx==='fire') return {x:W*(.25+Math.random()*.5),y:init?Math.random()*H:H*(.6+Math.random()*.4),r:(1+Math.random()*2.2)*(W/300),vy:-(.4+Math.random()*1.1)*(H/300),vx:(Math.random()-.5)*.6,l:1};
        if(fx==='stars') return {x:Math.random()*W,y:Math.random()*H,r:(.6+Math.random()*1.6)*(W/300),ph:Math.random()*6.3,sp:.02+Math.random()*.05};
        return {x:Math.random()*W,y:init?Math.random()*H:H+5,r:(.8+Math.random()*1.8)*(W/300),vy:-(.08+Math.random()*.25)*(H/300),vx:(Math.random()-.3)*.25,ph:Math.random()*6.3}; };
      var n=fx==='stars'?38:fx==='fire'?34:24;
      var frame=function(){ if(!on) return; var W=cv.width,H=cv.height; cx.clearRect(0,0,W,H);
        P.forEach(function(p,i){
          if(fx==='fire'){ p.x+=p.vx+Math.sin(p.y/18)*.4; p.y+=p.vy; p.l-=.006; if(p.y<0||p.l<=0) P[i]=spawn(false);
            cx.fillStyle='rgba(255,'+(140+Math.random()*80|0)+',60,'+(p.l*.9).toFixed(2)+')'; cx.beginPath(); cx.arc(p.x,p.y,p.r,0,7); cx.fill(); }
          else if(fx==='stars'){ p.ph+=p.sp; var a=Math.max(0,Math.sin(p.ph)); cx.fillStyle='rgba(255,236,190,'+(a*.9).toFixed(2)+')';
            cx.beginPath(); cx.arc(p.x,p.y,p.r*(.6+a*.6),0,7); cx.fill(); if(a>.92){ cx.fillRect(p.x-p.r*3,p.y-.5,p.r*6,1); cx.fillRect(p.x-.5,p.y-p.r*3,1,p.r*6); } }
          else { p.ph+=.02; p.x+=p.vx+Math.sin(p.ph)*.15; p.y+=p.vy; if(p.y<-5) P[i]=spawn(false);
            cx.fillStyle='rgba(255,226,170,'+(.35+Math.sin(p.ph)*.25).toFixed(2)+')'; cx.beginPath(); cx.arc(p.x,p.y,p.r,0,7); cx.fill(); } });
        requestAnimationFrame(frame); };
      new IntersectionObserver(function(es){ es.forEach(function(e){ var was=on; on=e.isIntersecting;
        if(on&&!was){ size(); if(!P.length) for(var i=0;i<n;i++) P.push(spawn(true)); requestAnimationFrame(frame); } }); }).observe(box);
    });
  })();

  // 4e) the evidence wall: the banner hangs on two pins tied to the first files; red thread from every file to the next,
  //     fainter threads between files of the same world. Point at a file: the rest dims and its threads light up.
  (function(){
    var wall=document.querySelector('[data-wall]'); if(!wall) return; var web=wall.querySelector('[data-web]'), NS='http://www.w3.org/2000/svg';
    var all=[].slice.call(wall.querySelectorAll('.clip')), band=wall.querySelector('[data-band]'), more=wall.querySelector('[data-more]');
    var vis=function(){ return all.filter(function(c){ return c.offsetParent!==null; }); };
    var pin=function(el,k){ var ps=el.querySelectorAll('.pin2'), p=ps[k||0]||ps[0], w=wall.getBoundingClientRect(), r=p.getBoundingClientRect(); return [r.left-w.left+r.width/2, r.top-w.top+5]; };
    var drawn=false;
    var draw=function(){ while(web.firstChild) web.removeChild(web.firstChild);
      web.setAttribute('width',wall.clientWidth); web.setAttribute('height',wall.clientHeight); web.setAttribute('viewBox','0 0 '+wall.clientWidth+' '+wall.clientHeight);
      var cl=vis(); all.forEach(function(c){ c._p=[]; }); if(band) band._p=[];
      var link=function(a,b,x,ka){ var A=pin(a,ka),B=pin(b),d=Math.hypot(B[0]-A[0],B[1]-A[1]);
        var p=document.createElementNS(NS,'path'); p.setAttribute('d','M'+A[0].toFixed(1)+' '+A[1].toFixed(1)+' Q'+((A[0]+B[0])/2).toFixed(1)+' '+(Math.max(A[1],B[1])+d*.05).toFixed(1)+' '+B[0].toFixed(1)+' '+B[1].toFixed(1));
        if(x) p.setAttribute('class','x'); if(!drawn&&!calm0){ p.classList.add('draw'); p.style.setProperty('--len',Math.ceil(d*1.2)); p.style.animationDelay=(Math.max(0,cl.indexOf(a))*.1)+'s'; }
        p._a=a; p._b=b; web.appendChild(p); a._p.push(p); b._p.push(p); };
      if(band&&cl.length>2&&band.offsetParent!==null){ link(band,cl[0],false,0); link(band,cl[2],false,1); }
      for(var i=0;i<cl.length-1;i++) link(cl[i],cl[i+1]);
      var g={}; cl.forEach(function(c){ (g[c.dataset.world]=g[c.dataset.world]||[]).push(c); });
      Object.keys(g).forEach(function(k){ var a=g[k]; for(var i=0;i+2<a.length;i+=2) link(a[i],a[i+2],true); });
      // handwritten notes hang halfway along a thread, in the gap between rows
      [].forEach.call(wall.querySelectorAll('.note2[data-at]'),function(n){ var c=cl[+n.dataset.at], c2=cl[+n.dataset.at+1]; var p=c&&c._p&&c._p.filter(function(q){ return q._a===c&&q._b===c2; })[0]; if(!p){ n.classList.remove('on'); return; }
        var L=p.getTotalLength(), m=p.getPointAtLength(L*.5); n.style.left=m.x+'px'; n.style.top=m.y+'px'; n.classList.add('on'); });
      drawn=true; };
    // the banner is as tall as its language needs: the files start just below it
    var fit=function(){ if(band) wall.style.paddingTop=(band.offsetHeight+34)+'px'; }; fit(); window.addEventListener('resize',fit);
    if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fit);
    var t; var later=function(){ clearTimeout(t); t=setTimeout(draw,140); };
    var seen=new IntersectionObserver(function(es){ if(es.some(function(e){return e.isIntersecting;})){ seen.disconnect();
      if(band) band.classList.add('in');
      all.forEach(function(c,i){ setTimeout(function(){ c.classList.add('in'); },150+i*110); });   // pinned one after the other
      setTimeout(draw,Math.min(all.length,7)*110+900); } },{threshold:.05}); seen.observe(wall);
    wall.addEventListener('transitionend',function(e){ if(drawn&&e.target.classList&&e.target.classList.contains('clip')) later(); });
    window.addEventListener('resize',function(){ if(drawn) later(); });
    if(more) more.addEventListener('click',function(){ wall.classList.add('all'); setTimeout(draw,60); setTimeout(draw,900); });
    var hot=function(c,on){ wall.classList.toggle('focus',on); web.classList.toggle('focus',on); c.classList.toggle('hot',on); (c._p||[]).forEach(function(p){ p.classList.toggle('hot',on); }); };
    all.forEach(function(c){ c.addEventListener('mouseenter',function(){ hot(c,true); }); c.addEventListener('mouseleave',function(){ hot(c,false); });
      c.addEventListener('focus',function(){ hot(c,true); }); c.addEventListener('blur',function(){ hot(c,false); }); });
  })();

  // 4f) Steve, exactly as approved (assets/steve/steve.webp): one whole figure, alive in code.
  //     He breathes and sways on his feet, blinks his button eyes, hops and greets you when he appears,
  //     leans towards the experiment you point at and says something, jumps when you poke him.
  (function(){
    var host=document.querySelector('[data-steve]'), bubble=document.querySelector('[data-bubble]'); if(!host) return;
    fetch('/assets/steve/steve.json').then(function(r){ return r.json(); }).then(function(S){
      var im=new Image(); im.src='/assets/steve/steve.webp'; im.alt=''; host.appendChild(im);
      var lids=S.eyes.map(function(e){ var l=document.createElement('span'); l.className='lid';
        l.style.cssText='left:'+e.cx+'%;top:'+e.cy+'%;width:'+(e.rx*2)+'%;height:'+(e.ry*2)+'%;background:'+S.lid; host.appendChild(l); return l; });
      var hop=0, lean=0, leanTo=0, nextBlink=performance.now()+2000;
      var blink=function(){ host.classList.add('blink'); setTimeout(function(){ host.classList.remove('blink'); },120); };
      var say=function(t){ if(!bubble) return; bubble.textContent=t; bubble.classList.add('pop'); setTimeout(function(){ bubble.classList.remove('pop'); },250); };
      var tick=function(t){
        if(!calm0){ var s=Math.sin(t/950), h=hop>0?Math.sin(hop):0; lean+=(leanTo-lean)*.08;
          host.style.transform='translateY('+(-h*46).toFixed(1)+'px) rotate('+(Math.sin(t/1600)*1.6+lean).toFixed(2)+'deg) scale('+(1-s*.006).toFixed(4)+','+(1+s*.012-h*.04).toFixed(4)+')';
          if(hop>0){ hop+=.12; if(hop>=Math.PI) hop=0; } }
        if(t>nextBlink){ blink(); if(Math.random()<.25) setTimeout(blink,220); nextBlink=t+2400+Math.random()*3200; }
        requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      new IntersectionObserver(function(es,o){ es.forEach(function(e){ if(e.isIntersecting){ hop=.01; o.disconnect(); } }); },{threshold:.5}).observe(host);
      document.querySelectorAll('.exp[data-say]').forEach(function(c,i){ var go=function(){ leanTo=c.getBoundingClientRect().left>host.getBoundingClientRect().left?5:-5; say(c.dataset.say); blink(); };
        c.addEventListener('mouseenter',go); c.addEventListener('focus',go); c.addEventListener('mouseleave',function(){ leanTo=0; }); });
      var poke=0; host.addEventListener('click',function(){ hop=.01; poke++; say(poke%2?host.dataset.click1:host.dataset.click2); });
    });
  })();

  // 4g) dust in the lamp light, on every page
  (function(){ var d=document.querySelector('.web-bg .dust'); if(!d||calm0) return;
    for(var i=0;i<22;i++){ var m=document.createElement('i'); m.style.left=(Math.random()*42)+'%'; m.style.top=(18+Math.random()*72)+'%';
      m.style.animationDuration=(9+Math.random()*12)+'s'; m.style.animationDelay=(-Math.random()*20)+'s'; d.appendChild(m); } })();

  // torn edges: every clipping and title sheet gets its own ragged outline
  document.querySelectorAll('[data-torn]').forEach(function(el,k){ var pts=[],n=14,s=k*97+11,j=function(){ s=(s*9301+49297)%233280; return s/233280; };
    for(var i=0;i<=n;i++) pts.push((i/n*100).toFixed(1)+'% '+(j()*3).toFixed(1)+'%');
    for(i=0;i<=8;i++) pts.push((100-j()*2.5).toFixed(1)+'% '+(i/8*100).toFixed(1)+'%');
    for(i=n;i>=0;i--) pts.push((i/n*100).toFixed(1)+'% '+(100-j()*3).toFixed(1)+'%');
    for(i=8;i>=0;i--) pts.push((j()*2.5).toFixed(1)+'% '+(i/8*100).toFixed(1)+'%');
    var cp='polygon('+pts.join(',')+')'; el.style.clipPath=cp; var sh=el.previousElementSibling; if(sh&&sh.classList.contains('shade')) sh.style.clipPath=cp; });

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
