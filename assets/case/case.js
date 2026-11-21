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
        if(fx==='glint'||fx==='prism') return {x:Math.random()*W,y:Math.random()*H,r:(1.2+Math.random()*2)*(W/300),ph:Math.random()*6.3,sp:.03+Math.random()*.05};
        if(fx==='leaves') return {x:Math.random()*W,y:init?Math.random()*H:-5,r:(1.4+Math.random()*2.4)*(W/300),vy:(.12+Math.random()*.3)*(H/300),vx:(Math.random()-.5)*.5,ph:Math.random()*6.3,c:Math.random()<.5?'rgba(190,230,90,':'rgba(255,200,80,'};
        if(fx==='pulse') return {x:W*(.15+Math.random()*.5),y:H*(.2+Math.random()*.5),r:(.8+Math.random()*1.4)*(W/300),ph:Math.random()*6.3,sp:.05+Math.random()*.08};
        return {x:Math.random()*W,y:init?Math.random()*H:H+5,r:(.8+Math.random()*1.8)*(W/300),vy:-(.08+Math.random()*.25)*(H/300),vx:(Math.random()-.3)*.25,ph:Math.random()*6.3}; };
      var n=fx==='stars'?38:fx==='fire'?34:fx==='glint'?10:fx==='prism'?8:fx==='pulse'?16:24;
      var frame=function(){ if(!on) return; var W=cv.width,H=cv.height; cx.clearRect(0,0,W,H);
        P.forEach(function(p,i){
          if(fx==='fire'){ p.x+=p.vx+Math.sin(p.y/18)*.4; p.y+=p.vy; p.l-=.006; if(p.y<0||p.l<=0) P[i]=spawn(false);
            cx.fillStyle='rgba(255,'+(140+Math.random()*80|0)+',60,'+(p.l*.9).toFixed(2)+')'; cx.beginPath(); cx.arc(p.x,p.y,p.r,0,7); cx.fill(); }
          else if(fx==='stars'){ p.ph+=p.sp; var a=Math.max(0,Math.sin(p.ph)); cx.fillStyle='rgba(255,236,190,'+(a*.9).toFixed(2)+')';
            cx.beginPath(); cx.arc(p.x,p.y,p.r*(.6+a*.6),0,7); cx.fill(); if(a>.92){ cx.fillRect(p.x-p.r*3,p.y-.5,p.r*6,1); cx.fillRect(p.x-.5,p.y-p.r*3,1,p.r*6); } }
          else if(fx==='glint'||fx==='prism'||fx==='pulse'){ p.ph+=p.sp; var g=Math.pow(Math.max(0,Math.sin(p.ph)),fx==='pulse'?2:8);
            cx.fillStyle=(fx==='pulse'?'rgba(255,215,120,':'rgba(255,245,210,')+(g*.95).toFixed(2)+')'; cx.beginPath(); cx.arc(p.x,p.y,p.r*(.5+g),0,7); cx.fill();
            if(g>.6&&fx!=='pulse'){ cx.fillRect(p.x-p.r*4*g,p.y-.6,p.r*8*g,1.2); cx.fillRect(p.x-.6,p.y-p.r*4*g,1.2,p.r*8*g); }
            if(g<.01&&Math.random()<.02) P[i]=spawn(true); }
          else if(fx==='leaves'){ p.ph+=.03; p.x+=p.vx+Math.sin(p.ph)*.6; p.y+=p.vy; if(p.y>H+5) P[i]=spawn(false);
            cx.fillStyle=p.c+'.75)'; cx.beginPath(); cx.ellipse(p.x,p.y,p.r,p.r*.45,p.ph,0,7); cx.fill(); }
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

  // 4h) the comet that burns forever: the flames ripple (moving turbulence on the layer), embers peel off the trail,
  //     the light on the Earth breathes. Plate and layer come from the same GPT set, so they line up by construction.
  (function(){
    var win=document.querySelector('[data-comet]'); if(!win) return;
    var d=document.createElement('div'); d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
    d.innerHTML='<svg width="0" height="0"><filter id="fx-flame" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.018 0.05" numOctaves="2" seed="7" result="n"><animate attributeName="seed" dur="1.2s" values="1;2;3;4;5;6;7;8;9;10" repeatCount="indefinite"/><animate attributeName="baseFrequency" dur="6s" values="0.018 0.05;0.024 0.06;0.018 0.05" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G"/></filter></svg>';
    document.body.appendChild(d);
    if(calm0) return;
    var cv=win.querySelector('.c-embers'), cx=cv.getContext('2d'), E=[], on=false;
    var size=function(){ var r=win.getBoundingClientRect(), k=Math.min(2,window.devicePixelRatio||1); cv.width=r.width*k; cv.height=r.height*k; };
    var HX=.60, HY=.40;   // the comet head, as a fraction of the photo (trail runs to the top-left corner)
    var spawn=function(){ var W=cv.width,H=cv.height,t=Math.random(); var x=W*(HX-t*.55)+(Math.random()-.5)*W*.05, y=H*(HY-t*.38)+(Math.random()-.5)*H*.08;
      return {x:x,y:y,vx:-(0.3+Math.random()*1.4)*(W/600),vy:-(0.1+Math.random()*.9)*(H/600),r:(.8+Math.random()*2.2)*(W/600),l:1,d:.008+Math.random()*.014}; };
    var frame=function(){ if(!on) return; var W=cv.width,H=cv.height; cx.clearRect(0,0,W,H);
      if(E.length<50&&Math.random()<.6) E.push(spawn());
      E.forEach(function(p,i){ p.x+=p.vx; p.y+=p.vy+Math.sin(p.x/30)*.2; p.l-=p.d; if(p.l<=0){ E[i]=spawn(); return; }
        cx.fillStyle='rgba(255,'+(120+p.l*120|0)+','+(40+p.l*40|0)+','+(p.l*.9).toFixed(2)+')'; cx.beginPath(); cx.arc(p.x,p.y,p.r*(.6+p.l*.6),0,7); cx.fill(); });
      requestAnimationFrame(frame); };
    new IntersectionObserver(function(es){ es.forEach(function(e){ var was=on; on=e.isIntersecting; if(on&&!was){ size(); requestAnimationFrame(frame); } }); }).observe(win);
    window.addEventListener('resize',function(){ if(on) size(); });
  })();

  // 4i) open a world: the clicked clipping lights up, a red thread runs from its pin down to the world's banner,
  //     and that world's files are pinned below (or the "coming soon" note). Click another world: the thread moves.
  (function(){
    var stage=document.querySelector('[data-stage]'); if(!stage) return;
    var lw=stage.querySelector('[data-longweb]'), path=lw&&lw.querySelector('path'), cur=null;
    var pos=function(el){ var s=stage.getBoundingClientRect(), r=el.getBoundingClientRect(); return [r.left-s.left+r.width/2, r.top-s.top+6]; };
    var tie=function(from,to,anim){ if(!path) return; lw.setAttribute('viewBox','0 0 '+stage.clientWidth+' '+stage.clientHeight);
      var A=pos(from), B=pos(to), mx=(A[0]+B[0])/2+(B[0]>A[0]?-60:60);
      path.setAttribute('d','M'+A[0].toFixed(1)+' '+A[1].toFixed(1)+' C'+A[0].toFixed(1)+' '+(A[1]+140).toFixed(1)+' '+mx.toFixed(1)+' '+(B[1]-160).toFixed(1)+' '+B[0].toFixed(1)+' '+B[1].toFixed(1));
      if(anim){ var L=path.getTotalLength(); path.style.setProperty('--len',Math.ceil(L)); path.classList.remove('run'); void path.getBBox(); path.classList.add('run'); } };
    var open=function(key,scroll){
      var c=stage.querySelector('.wclip[data-open="'+key+'"]'), pnl=stage.querySelector('[data-panel="'+key+'"]'); if(!c||!pnl) return;
      [].forEach.call(stage.querySelectorAll('[data-panel]'),function(x){ x.hidden=(x!==pnl); });
      [].forEach.call(stage.querySelectorAll('.wclip'),function(x){ x.classList.toggle('on',x===c); });
      cur={c:c,a:pnl.querySelector('[data-anchor]')};
      [].forEach.call(pnl.querySelectorAll('.rv'),function(x){ x.classList.add('in'); });
      requestAnimationFrame(function(){ tie(cur.c.querySelector('.pin2'),cur.a,true);
        if(scroll) setTimeout(function(){ pnl.scrollIntoView({behavior:calm0?'auto':'smooth',block:'start'}); },380); });
      try{ history.replaceState(null,'','#w-'+key); }catch(e){} };
    [].forEach.call(stage.querySelectorAll('.wclip[data-open]'),function(c){ c.addEventListener('click',function(e){ e.preventDefault(); open(c.dataset.open,true); }); });
    window.addEventListener('resize',function(){ if(cur) tie(cur.c.querySelector('.pin2'),cur.a,false); });
    var h=(location.hash||'').match(/^#w-([a-z]+)$/); if(h) setTimeout(function(){ open(h[1],true); },900);
  })();

  // world names on the clippings: as big as the paper allows, never broken inside a word
  (function(){ var hs=[].slice.call(document.querySelectorAll('.wc-head')); if(!hs.length) return;
    var fit=function(){ hs.forEach(function(h){ var b=h.querySelector('b'), i=h.querySelector('i'), f=24; b.style.fontSize=f+'px';
      while(f>9&&(b.scrollWidth>h.clientWidth+1||h.scrollHeight>h.clientHeight+1||b.offsetHeight+(i?i.offsetHeight+6:0)>h.clientHeight+2)){ f-=.5; b.style.fontSize=f+'px'; } }); };
    fit(); window.addEventListener('resize',fit); if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fit); window.addEventListener('load',fit); })();
  // 4j) the creatures on the world clippings: the volcano smokes, the T. rex blinks, the chameleon shoots its tongue.
  //     Coordinates are pixels of the 900 px clipping image (measured on the GPT clippings), placed in % of the clipping.
  (function(){
    var clip=function(k){ var c=document.querySelector('.wclip[data-open="'+k+'"] .sway'); return c; };
    var pct=function(x,y,w,h,W,H){ return 'left:'+(x/W*100)+'%;top:'+(y/H*100)+'%;width:'+(w/W*100)+'%;height:'+(h/H*100)+'%'; };
    var watch=function(el,cb){ var on=false; new IntersectionObserver(function(es){ es.forEach(function(e){ var was=on; on=e.isIntersecting; cb(on,was); }); }).observe(el); return function(){ return on; }; };
    if(!document.getElementById('fx-smoke')){ var d=document.createElement('div'); d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
      d.innerHTML='<svg width="0" height="0"><filter id="fx-smoke" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.011 0.017" numOctaves="2" seed="4" result="n"><animate attributeName="baseFrequency" dur="9s" values="0.011 0.017;0.015 0.022;0.012 0.014;0.011 0.017" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G"><animate attributeName="scale" dur="6s" values="12;20;12" repeatCount="indefinite"/></feDisplacementMap></filter></svg>';
      document.body.appendChild(d); }

    // the volcano: the plume billows (a moving warp of the plume itself), puffs of smoke rise from the crater, steam off the sea
    var e=clip('earth');
    if(e){ var W=900,H=517, img=e.querySelector('.wc-img').getAttribute('src');
      var R=[515,58,365,150], wp=document.createElement('span'); wp.className='cr-warp';
      wp.style.cssText=pct(R[0],R[1],R[2],R[3],W,H)+';background-image:url('+img+');background-size:'+(W/R[2]*100)+'% '+(H/R[3]*100)+'%;background-position:'+(R[0]/W/(1-R[2]/W)*100)+'% '+(R[1]/H/(1-R[3]/H)*100)+'%';
      e.appendChild(wp);
      if(!calm0){ var cv=document.createElement('canvas'); cv.className='cr-canvas'; cv.style.cssText=pct(437,62,437,372,W,H); e.appendChild(cv);
        var cx=cv.getContext('2d'), P=[], S=[];
        var sz=function(){ var r=cv.getBoundingClientRect(),k=Math.min(2,window.devicePixelRatio||1); cv.width=r.width*k; cv.height=r.height*k; };
        // crater ~ (690,185) and steam ~ (492,262) in image px -> fractions of the canvas
        var CX=(690-437)/437, CY=(185-62)/372, SX=(492-437)/437, SY=(262-62)/372;
        var puff=function(init){ var w=cv.width,h=cv.height; return {x:w*(CX+(Math.random()-.5)*.08),y:h*CY,r:w*(.02+Math.random()*.03),vx:w*(.0004+Math.random()*.0009),vy:-h*(.0012+Math.random()*.0016),l:init?Math.random():1,d:.0035+Math.random()*.003,g:90+Math.random()*60|0}; };
        var steam=function(){ var w=cv.width,h=cv.height; return {x:w*(SX+(Math.random()-.5)*.06),y:h*SY,r:w*(.01+Math.random()*.015),vx:w*(Math.random()-.3)*.0006,vy:-h*(.0008+Math.random()*.001),l:1,d:.006+Math.random()*.005}; };
        var blob=function(x,y,r,c,a){ var g=cx.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,c+a+')'); g.addColorStop(1,c+'0)'); cx.fillStyle=g; cx.beginPath(); cx.arc(x,y,r,0,7); cx.fill(); };
        var live;
        var fr=function(){ if(!live()) return; var w=cv.width,h=cv.height; cx.clearRect(0,0,w,h);
          while(P.length<26) P.push(puff(P.length<20)); while(S.length<10) S.push(steam());
          P.forEach(function(q,i){ q.x+=q.vx; q.y+=q.vy; q.r*=1.006; q.l-=q.d; if(q.l<=0||q.y<-q.r){ P[i]=puff(false); return; }
            var a=Math.min(1,q.l*1.6)*Math.min(1,(1-q.l)*5)*.6; blob(q.x,q.y,q.r,'rgba('+q.g+','+(q.g-6)+','+(q.g-12)+',',a.toFixed(3)); });
          S.forEach(function(q,i){ q.x+=q.vx+Math.sin(q.y/12)*.3; q.y+=q.vy; q.r*=1.01; q.l-=q.d; if(q.l<=0){ S[i]=steam(); return; }
            blob(q.x,q.y,q.r,'rgba(235,240,245,',(q.l*(1-q.l)*1.1).toFixed(3)); });
          requestAnimationFrame(fr); };
        live=watch(e,function(on,was){ if(on&&!was){ sz(); requestAnimationFrame(fr); } });
        window.addEventListener('resize',function(){ if(live()) sz(); }); } }

    // the T. rex: felt eyelid that closes now and then (sometimes twice)
    var r=clip('prehistory');
    if(r){ var lid=document.createElement('span'); lid.className='cr-lid'; lid.style.cssText=pct(773.5,116.5,18,16,900,518); r.appendChild(lid);
      if(!calm0){ var blink=function(){ lid.classList.remove('shut'); void lid.offsetWidth; lid.classList.add('shut');
          if(Math.random()<.3) setTimeout(function(){ lid.classList.remove('shut'); void lid.offsetWidth; lid.classList.add('shut'); },330);
          setTimeout(blink,2600+Math.random()*3400); };
        setTimeout(blink,1500+Math.random()*1500); } }

    // the chameleon: a fly buzzes in front of it; the tongue shoots out, catches it, and the fly comes back later
    var c=clip('life');
    if(c&&!calm0){ var NS='http://www.w3.org/2000/svg', sv=document.createElementNS(NS,'svg'); sv.setAttribute('class','cr-svg'); sv.setAttribute('viewBox','0 0 900 516'); sv.setAttribute('preserveAspectRatio','none');
      sv.innerHTML='<defs><clipPath id="cr-ph"><rect x="437" y="64" width="437" height="368"/></clipPath><linearGradient id="cr-tg" x1="0" x2="1"><stop offset="0" stop-color="#c9566b"/><stop offset="1" stop-color="#ec8a98"/></linearGradient></defs>'
        +'<g clip-path="url(#cr-ph)"><g class="cr-fly"><ellipse cx="0" cy="0" rx="3.4" ry="2.4" fill="#1d1a17"/><circle cx="2.8" cy="-.6" r="1.6" fill="#2b241f"/><ellipse class="cr-wing" cx="-1" cy="-3" rx="3.2" ry="1.6" fill="rgba(220,235,255,.75)"/><ellipse class="cr-wing b" cx="-1.5" cy="-2.4" rx="2.8" ry="1.4" fill="rgba(220,235,255,.55)"/></g>'
        +'<line class="cr-tongue" x1="799" y1="202" x2="799" y2="202" stroke="url(#cr-tg)" stroke-width="9" stroke-linecap="round"/><circle class="cr-tip" cx="799" cy="202" r="0" fill="#e0708a"/></g>';
      c.appendChild(sv);
      var fly=sv.querySelector('.cr-fly'), tg=sv.querySelector('.cr-tongue'), tip=sv.querySelector('.cr-tip'), MX=799, MY=202;
      var F={x:852,y:170,show:true,t:0}, shot=null, nextShot=performance.now()+2500+Math.random()*2000, liveC;
      var fr2=function(now){ if(!liveC()) return; F.t+=.05;
        if(!shot){ var fx=852+Math.sin(F.t*1.3)*12+Math.sin(F.t*3.1)*4, fy=168+Math.cos(F.t*1.7)*10+Math.sin(F.t*4.3)*3; F.x=fx; F.y=fy; }
        fly.setAttribute('transform','translate('+F.x.toFixed(1)+' '+F.y.toFixed(1)+') scale(1.9)'); fly.style.opacity=F.show?1:0;
        if(!shot&&F.show&&now>nextShot) shot={t0:now,x:F.x,y:F.y};
        var k=0;
        if(shot){ var dt=now-shot.t0;
          if(dt<110) k=dt/110; else if(dt<190) k=1; else if(dt<480) k=1-(dt-190)/290; else { shot=null; F.show=false; setTimeout(function(){ F.show=true; },1600+Math.random()*1800); nextShot=now+3800+Math.random()*3000; }
          if(shot&&dt>=110){ F.show=false; }
          if(shot){ var X=MX+(shot.x-MX)*k, Y=MY+(shot.y-MY)*k; tg.setAttribute('x2',X.toFixed(1)); tg.setAttribute('y2',Y.toFixed(1)); tip.setAttribute('cx',X.toFixed(1)); tip.setAttribute('cy',Y.toFixed(1)); tip.setAttribute('r',k>0?7.5:0);
            if(dt>=110&&dt<480){ fly.style.opacity=1; fly.setAttribute('transform','translate('+X.toFixed(1)+' '+Y.toFixed(1)+') scale(1.5)'); } } }
        if(!shot){ tg.setAttribute('x2',MX); tg.setAttribute('y2',MY); tip.setAttribute('r',0); }
        requestAnimationFrame(fr2); };
      liveC=watch(c,function(on,was){ if(on&&!was) requestAnimationFrame(fr2); }); }
  })();

  // 4l) the living newspaper: like the moving photos of a wizard's newspaper, every site image that has them gets
  //     eyelids that blink (per face, at its own pace), rippling water, dust drifting in the light, rolling smoke.
  //     Measurements live in /assets/alive.json (in % of the image), so the same image is alive on every page.
  (function(){
    if(!window.fetch) return;
    fetch('/assets/alive.json').then(function(r){ return r.json(); }).then(function(A){
      var defs=document.createElement('div'); defs.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
      defs.innerHTML='<svg width="0" height="0"><filter id="al-water" x="-5%" y="-10%" width="110%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.008 0.07" numOctaves="2" seed="5" result="n"><animate attributeName="baseFrequency" dur="11s" values="0.008 0.07;0.011 0.085;0.008 0.07" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G"/></filter>'
        +'<filter id="al-smoke" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="9" result="n"><animate attributeName="baseFrequency" dur="10s" values="0.012 0.02;0.016 0.026;0.012 0.02" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="14" xChannelSelector="R" yChannelSelector="G"/></filter></svg>';
      document.body.appendChild(defs);
      var pct=function(r){ return 'left:'+r[0]+'%;top:'+r[1]+'%;width:'+r[2]+'%;height:'+r[3]+'%'; };
      var warp=function(inner,src,r,fid){ var s=document.createElement('span'); s.className='al-warp';
        s.style.cssText=pct(r)+';background-image:url("'+src+'");background-size:'+(10000/r[2])+'% '+(10000/r[3])+'%;background-position:'+(r[2]>=99.9?0:r[0]/(100-r[2])*100)+'% '+(r[3]>=99.9?0:r[1]/(100-r[3])*100)+'%;filter:url(#'+fid+')';
        inner.appendChild(s); };
      var dust=function(inner,r){ var cv=document.createElement('canvas'); cv.className='al-dust'; cv.style.cssText=pct(r); inner.appendChild(cv);
        var cx=cv.getContext('2d'), M=[], on=false;
        var size=function(){ var b=cv.getBoundingClientRect(), k=Math.min(2,window.devicePixelRatio||1); cv.width=Math.max(1,b.width*k); cv.height=Math.max(1,b.height*k); M=[];
          for(var i=0;i<12;i++) M.push({x:Math.random()*cv.width,y:Math.random()*cv.height,r:(.6+Math.random()*1.1)*k*Math.max(1,b.width/260),vx:(Math.random()-.5)*.12*k,vy:(Math.random()-.6)*.1*k,ph:Math.random()*6.3}); };
        var fr=function(){ if(!on) return; cx.clearRect(0,0,cv.width,cv.height);
          M.forEach(function(m){ m.ph+=.012; m.x+=m.vx+Math.sin(m.ph)*.08; m.y+=m.vy+Math.cos(m.ph*.7)*.05;
            if(m.x<0) m.x+=cv.width; if(m.x>cv.width) m.x-=cv.width; if(m.y<0) m.y+=cv.height; if(m.y>cv.height) m.y-=cv.height;
            cx.fillStyle='rgba(255,226,170,'+(.22+.18*Math.sin(m.ph*.5)).toFixed(3)+')'; cx.beginPath(); cx.arc(m.x,m.y,m.r,0,7); cx.fill(); });
          requestAnimationFrame(fr); };
        new IntersectionObserver(function(es){ es.forEach(function(e){ var was=on; on=e.isIntersecting; if(on&&!was){ size(); requestAnimationFrame(fr); } }); }).observe(cv); };
      var face=function(inner,eyes){ var lids=eyes.map(function(e){ var s=document.createElement('span'); s.className='al-lid';
          s.style.cssText='left:'+(e[0]-e[2])+'%;top:'+(e[1]-e[3])+'%;width:'+(e[2]*2)+'%;height:'+(e[3]*2)+'%;background:radial-gradient(80% 70% at 50% 25%,'+e[4]+','+e[5]+' 85%);box-shadow:inset 0 -1px 0 '+e[5];
          inner.appendChild(s); return s; });
        if(calm0) return;
        var blink=function(){ lids.forEach(function(l){ l.classList.remove('shut'); void l.offsetWidth; l.classList.add('shut'); }); };
        var loop=function(){ blink(); if(Math.random()<.25) setTimeout(blink,340); setTimeout(loop,2400+Math.random()*4200); };
        setTimeout(loop,600+Math.random()*3000); };
      [].forEach.call(document.images,function(img){ var path; try{ path=new URL(img.getAttribute('src'),location.href).pathname; }catch(e){ return; }
        var a=A[path]; if(!a||img.dataset.alive) return; img.dataset.alive='1';
        var host=img.parentElement; if(getComputedStyle(host).position==='static') host.style.position='relative';
        var clip=document.createElement('span'); clip.className='al-clip'; var inner=document.createElement('span'); inner.className='al-in'; clip.appendChild(inner);
        img.insertAdjacentElement('afterend',clip);
        var place=function(){ var cw=img.offsetWidth, ch=img.offsetHeight; if(!cw||!ch) return; var fit=getComputedStyle(img).objectFit, dw=cw, dh=ch;
          if(fit==='cover'||fit==='contain'){ var s=(fit==='cover'?Math.max:Math.min)(cw/a.w,ch/a.h); dw=a.w*s; dh=a.h*s; }
          clip.style.cssText='left:'+img.offsetLeft+'px;top:'+img.offsetTop+'px;width:'+cw+'px;height:'+ch+'px';
          inner.style.cssText='left:'+((cw-dw)/2)+'px;top:'+((ch-dh)/2)+'px;width:'+dw+'px;height:'+dh+'px'; };
        place(); if(window.ResizeObserver) new ResizeObserver(place).observe(img); window.addEventListener('resize',place);
        if(!calm0){ (a.water||[]).forEach(function(r){ warp(inner,img.src,r,'al-water'); }); (a.smoke||[]).forEach(function(r){ warp(inner,img.src,r,'al-smoke'); });
          (a.dust||[]).forEach(function(r){ dust(inner,r); }); }
        (a.faces||[]).forEach(function(f){ face(inner,f); }); });
    }).catch(function(){});
  })();

  // 4m) titles underline themselves: a red marker stroke draws under each title when it comes into view,
  //     then now and then lifts and is drawn again, a little differently each time. (World names stay clean: their stamp sits right under them.)
  (function(){
    var SEL='.band h2, .wall-band h2, .lab-band h2, .wp-band h2, h1.slab, h2.slab, .headline em, h1.page-h1', HOV='.no-hover-underline';
    var NS='http://www.w3.org/2000/svg', seed=7, rnd=function(){ seed=(seed*9301+49297)%233280; return seed/233280; };
    var line=function(el){ var sv=el.querySelector(':scope > .ul-svg'); if(sv) sv.style.display='none'; var r=document.createRange(); r.selectNodeContents(el); var rs=[].slice.call(r.getClientRects()).filter(function(q){ return q.width>1; }); if(sv) sv.style.display=''; if(!rs.length) return null;
      var b=el.getBoundingClientRect(), last=rs[rs.length-1], y=last.bottom, L=Infinity, R=-Infinity;
      rs.forEach(function(q){ if(Math.abs(q.bottom-y)<4){ L=Math.min(L,q.left); R=Math.max(R,q.right); } });
      var k=el.offsetWidth/Math.max(1,b.width); return {x0:(L-b.left)*k, x1:(R-b.left)*k, y:(y-b.top)*k}; };
    var mk=function(el){ if(el.querySelector(':scope > .ul-svg')) return el.querySelector(':scope > .ul-svg');
      if(getComputedStyle(el).position==='static') el.style.position='relative';
      var s=document.createElementNS(NS,'svg'); s.setAttribute('class','ul-svg'); s.setAttribute('aria-hidden','true'); s.innerHTML='<path/><path class="b"/>'; el.appendChild(s); return s; };
    var shape=function(el,s){ var g=line(el); if(!g||g.x1<=g.x0) return 0; var fs=parseFloat(getComputedStyle(el).fontSize)||24, w=Math.max(2,fs*.085);
      var x0=g.x0-fs*.08-rnd()*fs*.1, x1=g.x1+fs*.05+rnd()*fs*.15, y=g.y-fs*.02, d='M'+x0.toFixed(1)+' '+(y+rnd()*3-1.5).toFixed(1);
      var n=3, prev=x0; for(var i=1;i<=n;i++){ var x=x0+(x1-x0)*i/n, cx=(prev+x)/2; d+=' Q'+cx.toFixed(1)+' '+(y+(rnd()-.5)*fs*.16).toFixed(1)+' '+x.toFixed(1)+' '+(y+(rnd()-.5)*fs*.06).toFixed(1); prev=x; }
      s.setAttribute('style','left:0;top:0;width:'+el.offsetWidth+'px;height:'+el.offsetHeight+'px');
      var p=s.querySelectorAll('path'); p[0].setAttribute('d',d); p[0].setAttribute('stroke-width',w.toFixed(1));
      p[1].setAttribute('d',d); p[1].setAttribute('stroke-width',(w*.45).toFixed(1)); p[1].setAttribute('transform','translate('+(fs*.04).toFixed(1)+' '+(w*.5).toFixed(1)+')');
      var L=Math.ceil(p[0].getTotalLength()+20); [].forEach.call(p,function(q){ q.style.strokeDasharray=L; }); return L; };
    var draw=function(el,anim){ var s=mk(el), L=shape(el,s); if(!L) return; var p=s.querySelectorAll('path');
      [].forEach.call(p,function(q,i){ q.style.transition='none'; q.style.strokeDashoffset=anim?L:0; });
      if(!anim) return; void s.getBoundingClientRect();
      [].forEach.call(p,function(q,i){ q.style.transition='stroke-dashoffset '+(.75+i*.2)+'s cubic-bezier(.5,.05,.3,1) '+(i*.12)+'s'; q.style.strokeDashoffset=0; }); };
    var lift=function(el){ var s=el.querySelector(':scope > .ul-svg'); if(!s) return; s.classList.add('off'); setTimeout(function(){ s.classList.remove('off'); draw(el,!calm0); },520); };
    var els=[].slice.call(document.querySelectorAll(SEL));
    var go=function(){
      els.forEach(function(el){ var seen=false, timer=0;
        new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting&&!seen){ seen=true; setTimeout(function(){ draw(el,!calm0); },350);
            if(!calm0){ var again=function(){ timer=setTimeout(function(){ if(el.offsetWidth) lift(el); again(); },9000+Math.random()*9000); }; again(); } } }); },{threshold:.6}).observe(el);
        if(window.ResizeObserver) new ResizeObserver(function(){ if(seen) draw(el,false); }).observe(el); });
      [].forEach.call(document.querySelectorAll(HOV),function(el){ var c=el.closest('.wclip'); if(!c) return;
        var on=function(){ draw(el,!calm0); el.classList.add('ul-on'); }, off=function(){ if(!c.classList.contains('on')) el.classList.remove('ul-on'); };
        c.addEventListener('mouseenter',on); c.addEventListener('focus',on); c.addEventListener('mouseleave',off); c.addEventListener('click',function(){ setTimeout(function(){
          [].forEach.call(document.querySelectorAll(HOV),function(o){ if(o!==el&&!o.closest('.wclip').classList.contains('on')) o.classList.remove('ul-on'); }); el.classList.add('ul-on'); },30); }); }); };
    (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(go);
  })();

  // 4n) the lamp flickers: on every page with the lamp background, the bulb hums with a faint shimmer and,
  //     every few seconds, stutters (the light cone dims and comes back in quick, uneven steps).
  (function(){
    var stages=[].slice.call(document.querySelectorAll('.stage')); if(!stages.length) return;
    var L=stages.map(function(s){ var d=document.createElement('div'); d.className='lamp-fx'; d.setAttribute('aria-hidden','true');
      d.innerHTML='<i class="lf-dark"></i><i class="lf-glow"></i>'; s.insertBefore(d,s.firstChild); return d; });
    if(calm0) return;
    var I=1, burst=[], next=performance.now()+1500+Math.random()*2500, last=0;
    var set=function(v){ var g=Math.max(0,Math.min(1,.28+(v-1)*4)), k=Math.max(0,Math.min(.92,(1-v)*1.15));
      L.forEach(function(d){ d.firstChild.style.opacity=k.toFixed(3); d.lastChild.style.opacity=g.toFixed(3); }); };
    var tick=function(now){
      if(!burst.length&&now>next){ var n=4+Math.random()*9|0; for(var i=0;i<n;i++) burst.push({v:.15+Math.random()*.8,d:35+Math.random()*90}); burst.push({v:1.08,d:120}); next=now+2800+Math.random()*6500; last=now; }
      if(burst.length){ if(now-last>burst[0].d){ last=now; burst.shift(); } I=burst.length?burst[0].v:1; }
      else I=1+Math.sin(now/90)*.012+Math.sin(now/37)*.01+(Math.random()-.5)*.02;
      set(I); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
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
      document.querySelectorAll('.dfile,.sfile').forEach(function(f){ f.classList.toggle('hide', t!=='all' && (' '+f.dataset.tags+' ').indexOf(' '+t+' ')<0); }); };
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
