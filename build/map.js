/* ============ MAP — the biblical world & journeys ============ */
BX.views.map = {
  init(){
    const G = BX.d.geo;
    this.cv=$('#mapCv'); this.ctx=this.cv.getContext('2d');
    this.tip=$('#mapTip');
    this.P=BX.d.places;
    this.J=BX.d.journeys;
    this.jSel=-1; this.jT=0; this.playing=false;
    this.hov=-1; this.selPlace=-1;
    this.COS=Math.cos(35*Math.PI/180);
    // world coords
    this.wx=lo=>lo*this.COS; this.wy=la=>-la;
    // journey chips
    $('#jchips').innerHTML = this.J.map((j,i)=>
      `<button class="jchip" data-j="${i}"><i style="background:${j.c}"></i>${esc(j.n)}</button>`).join('');
    $('#jchips').onclick=e=>{
      const c=e.target.closest('.jchip'); if(!c) return;
      const i=+c.dataset.j;
      this.setJourney(this.jSel===i?-1:i);
    };
    $('#jPlay').onclick=()=>{ this.playing=!this.playing; $('#jPlay').textContent=this.playing?'❚❚':'▶'; if(this.playing) this.animate(); };
    $('#jSlider').oninput=e=>{ this.playing=false; $('#jPlay').textContent='▶'; this.jT=+e.target.value/100*(this.J[this.jSel].legs.length-1); this.station(); this.draw(); };
    $('#jRef').onclick=()=>{ const l=this.curLeg(); if(l&&l.v!=null) gotoVerse(l.v); };
    $('#mcard .x').onclick=()=>{ this.selPlace=-1; $('#mcard').style.display='none'; this.draw(); };
    // interactions
    this.cv.addEventListener('mousedown',e=>{ this.panning=true; this._moved=false; this._px=e.clientX; this._py=e.clientY; });
    window.addEventListener('mousemove',e=>this.move(e));
    window.addEventListener('mouseup',()=>{ this.panning=false; });
    this.cv.addEventListener('click',e=>{
      if(this._moved) return;
      const r=this.cv.getBoundingClientRect();
      const i=this.pick(e.clientX-r.left,e.clientY-r.top);
      if(i>=0) this.placeCard(i);
    });
    this.cv.addEventListener('wheel',e=>{
      e.preventDefault();
      const r=this.cv.getBoundingClientRect(), mx=e.clientX-r.left, my=e.clientY-r.top;
      const f=Math.exp(-e.deltaY*0.0013), ns=Math.min(60,Math.max(0.7,this.k*f));
      this.tx=mx-(mx-this.tx)*ns/this.k; this.ty=my-(my-this.ty)*ns/this.k;
      this.k=ns; this.draw();
    },{passive:false});
    window.addEventListener('resize',()=>{ clearTimeout(this._rt); this._rt=setTimeout(()=>{ this.size(); this.draw(); },200); });
    this.size(); this.fit(G.bbox[0],G.bbox[1],G.bbox[2],G.bbox[3]); this.draw();
  },
  onshow(){ this.size(); this.draw(); },
  size(){
    const dpr=window.devicePixelRatio||1;
    this.W=this.cv.clientWidth; this.H=this.cv.clientHeight;
    this.cv.width=this.W*dpr; this.cv.height=this.H*dpr; this.dpr=dpr;
  },
  fit(lo0,la0,lo1,la1){
    const x0=this.wx(lo0), x1=this.wx(lo1), y0=this.wy(la1), y1=this.wy(la0);
    const k=Math.min(this.W/(x1-x0), this.H/(y1-y0))*0.94;
    this.k=k;
    this.tx=(this.W-(x0+x1)*k)/2; this.ty=(this.H-(y0+y1)*k)/2;
  },
  sx(lo){ return this.wx(lo)*this.k+this.tx; },
  sy(la){ return this.wy(la)*this.k+this.ty; },
  zoomLevel(){ return this.k/((this.W/45)/this.COS||1); },
  path(ctx, arr, close){
    ctx.beginPath();
    for(let i=0;i<arr.length;i+=2){
      const x=this.sx(arr[i]), y=this.sy(arr[i+1]);
      i?ctx.lineTo(x,y):ctx.moveTo(x,y);
    }
    if(close) ctx.closePath();
  },
  visThr(){
    const z=this.zoomLevel();
    return z<1.3?18 : z<2.2?8 : z<4?3 : z<7?1 : 0;
  },
  draw(){
    const ctx=this.ctx, dpr=this.dpr, G=BX.d.geo;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle='#0b1420'; ctx.fillRect(0,0,this.W,this.H);   // sea
    // land
    ctx.fillStyle='#141824'; ctx.strokeStyle='#2b3450'; ctx.lineWidth=1;
    for(const ring of G.land){ this.path(ctx,ring,true); ctx.fill(); ctx.stroke(); }
    // lakes
    ctx.fillStyle='#0b1420'; ctx.strokeStyle='#22304a';
    for(const ring of G.lakes){ this.path(ctx,ring,true); ctx.fill(); ctx.stroke(); }
    // rivers
    ctx.strokeStyle='rgba(72,110,160,.55)'; ctx.lineWidth=0.8;
    for(const ln of G.rivers){ this.path(ctx,ln,false); ctx.stroke(); }
    // places
    const thr=this.visThr();
    const jOn=this.jSel>=0;
    ctx.textAlign='left';
    this.visible=[];
    for(let i=0;i<this.P.length;i++){
      const p=this.P[i];
      if(p.vc<thr && i!==this.selPlace) continue;
      const x=this.sx(p.lo), y=this.sy(p.la);
      if(x<-20||y<-20||x>this.W+20||y>this.H+20) continue;
      this.visible.push(i);
      const r=Math.max(2,Math.min(11,1.6+Math.sqrt(p.vc)*0.55));
      ctx.beginPath(); ctx.arc(x,y,r,0,7);
      ctx.fillStyle = i===this.selPlace?'#f0c96c': jOn?'rgba(216,171,78,.30)':'rgba(216,171,78,.78)';
      ctx.fill();
      if(i===this.hov||i===this.selPlace){ ctx.strokeStyle='#e9e7de'; ctx.lineWidth=1.4; ctx.stroke(); }
      const lblThr = Math.max(thr*3, 12/Math.max(1,this.zoomLevel()/2));
      if(!jOn && (p.vc>=lblThr || i===this.hov || i===this.selPlace)){
        ctx.font='10.5px system-ui'; ctx.fillStyle='#aab0c4';
        ctx.strokeStyle='rgba(11,20,32,.9)'; ctx.lineWidth=3;
        ctx.strokeText(p.n,x+r+3,y+3); ctx.fillText(p.n,x+r+3,y+3);
      }
    }
    // journey
    if(jOn) this.drawJourney(ctx);
  },
  legPts(j){
    return j.legs.map(l=>[this.sx(l.lo),this.sy(l.la)]);
  },
  curve(ctx,a,b){
    const mx=(a[0]+b[0])/2, my=(a[1]+b[1])/2;
    const dx=b[0]-a[0], dy=b[1]-a[1], d=Math.sqrt(dx*dx+dy*dy)||1;
    const off=Math.min(30,d*0.14);
    const cx=mx-dy/d*off, cy=my+dx/d*off;
    ctx.quadraticCurveTo(cx,cy,b[0],b[1]);
    return [cx,cy];
  },
  qpoint(a,c,b,t){
    const u=1-t;
    return [u*u*a[0]+2*u*t*c[0]+t*t*b[0], u*u*a[1]+2*u*t*c[1]+t*t*b[1]];
  },
  drawJourney(ctx){
    const j=this.J[this.jSel], pts=this.legPts(j);
    // full route (faint)
    ctx.strokeStyle=j.c+'55'; ctx.lineWidth=1.6; ctx.setLineDash([5,4]);
    ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
    const ctrls=[];
    for(let i=1;i<pts.length;i++){ ctx.moveTo(pts[i-1][0],pts[i-1][1]); ctrls.push(this.curve(ctx,pts[i-1],pts[i])); }
    ctx.stroke(); ctx.setLineDash([]);
    // progress route (solid)
    const t=this.jT, full=Math.floor(t);
    ctx.strokeStyle=j.c; ctx.lineWidth=2.6;
    ctx.beginPath();
    for(let i=1;i<=full;i++){ ctx.moveTo(pts[i-1][0],pts[i-1][1]); this.curve(ctx,pts[i-1],pts[i]); }
    ctx.stroke();
    if(full<pts.length-1){
      const frac=t-full, a=pts[full], b=pts[full+1], c=ctrls[full];
      ctx.beginPath(); ctx.moveTo(a[0],a[1]);
      // draw partial curve via sampling
      for(let s=1;s<=24;s++){ const q=this.qpoint(a,c,b,frac*s/24); ctx.lineTo(q[0],q[1]); }
      ctx.stroke();
      var mk=this.qpoint(a,c,b,frac);
    } else var mk=pts[pts.length-1];
    // stations
    ctx.font='10px system-ui';
    j.legs.forEach((l,i)=>{
      const [x,y]=pts[i];
      const done=i<=t;
      ctx.beginPath(); ctx.arc(x,y,i===Math.round(t)?7:5,0,7);
      ctx.fillStyle=done?j.c:'#2a3046'; ctx.fill();
      ctx.strokeStyle='#0b1420'; ctx.lineWidth=1.6; ctx.stroke();
      ctx.fillStyle='#0b1420'; ctx.textAlign='center';
      ctx.font='bold 8px system-ui'; ctx.fillText(String(i+1),x,y+2.8);
      ctx.font='10.5px system-ui'; ctx.fillStyle=done?'#e9e7de':'#6b7085';
      ctx.strokeStyle='rgba(11,20,32,.9)'; ctx.lineWidth=3;
      ctx.strokeText(l.n,x+9,y-6); ctx.fillText(l.n,x+9,y-6);
      ctx.textAlign='left';
    });
    // moving marker
    ctx.beginPath(); ctx.arc(mk[0],mk[1],5.4,0,7);
    ctx.fillStyle='#fff'; ctx.fill();
    ctx.strokeStyle=j.c; ctx.lineWidth=2.6; ctx.stroke();
  },
  setJourney(i){
    this.jSel=i; this.jT=0; this.playing=false; $('#jPlay').textContent='▶';
    document.querySelectorAll('.jchip').forEach((c,ci)=>c.classList.toggle('on',ci===i));
    $('#jinfo').style.display = i<0?'none':'flex';
    if(i>=0){
      const j=this.J[i];
      let lo0=99,la0=99,lo1=-99,la1=-99;
      j.legs.forEach(l=>{ lo0=Math.min(lo0,l.lo);la0=Math.min(la0,l.la);lo1=Math.max(lo1,l.lo);la1=Math.max(la1,l.la); });
      this.fit(lo0-1.5,la0-1.5,lo1+1.5,la1+2.5);
      $('#jSlider').value=0;
      this.station();
    }
    this.draw();
  },
  curLeg(){ return this.jSel<0?null:this.J[this.jSel].legs[Math.round(this.jT)]; },
  station(){
    const l=this.curLeg(); if(!l) return;
    $('#jName').textContent=(Math.round(this.jT)+1)+'. '+l.n;
    $('#jRef').textContent = l.v!=null? refAbbr(l.v):'';
    $('#jSnip').textContent = l.v!=null? BX.plain[l.v] : '';
  },
  animate(){
    if(!this.playing || this.jSel<0) return;
    const n=this.J[this.jSel].legs.length-1;
    const step=()=>{
      if(!this.playing) return;
      this.jT+=0.011;
      if(this.jT>=n){ this.jT=n; this.playing=false; $('#jPlay').textContent='▶'; }
      $('#jSlider').value=this.jT/n*100;
      this.station(); this.draw();
      if(this.playing) requestAnimationFrame(step);
    };
    if(this.jT>=n) this.jT=0;
    requestAnimationFrame(step);
  },
  pick(mx,my){
    let best=-1,bd=144;
    for(const i of this.visible||[]){
      const p=this.P[i];
      const dx=this.sx(p.lo)-mx, dy=this.sy(p.la)-my, d=dx*dx+dy*dy;
      if(d<bd){bd=d;best=i;}
    }
    return best;
  },
  move(e){
    const r=this.cv.getBoundingClientRect();
    const mx=e.clientX-r.left, my=e.clientY-r.top;
    if(this.panning && e.buttons){
      this._moved=true;
      this.tx+=e.clientX-this._px; this.ty+=e.clientY-this._py;
      this._px=e.clientX; this._py=e.clientY;
      this.draw(); return;
    }
    if(e.target!==this.cv) return;
    const i=this.pick(mx,my);
    if(i!==this.hov){ this.hov=i; this.draw(); }
    if(i>=0){
      const p=this.P[i];
      this.tip.innerHTML=`<b>${esc(p.n)}</b><div class="m">${p.ft?esc(p.ft)+' · ':''}${fmt(p.vc)} verse${p.vc===1?'':'s'}</div>`;
      this.tip.style.display='block';
      this.tip.style.left=Math.min(this.W-190,mx+13)+'px';
      this.tip.style.top=(my+13)+'px';
      this.cv.style.cursor='pointer';
    } else { this.tip.style.display='none'; this.cv.style.cursor=this.panning?'grabbing':'grab'; }
  },
  placeCard(i){
    const p=this.P[i]; this.selPlace=i;
    let h=`<div class="pname">${esc(p.n)}</div>
      <div class="psub">${p.ft?esc(p.ft)+' · ':''}${p.la.toFixed(2)}°N ${p.lo.toFixed(2)}°E · ${fmt(p.vc)} verse${p.vc===1?'':'s'}</div>`;
    if(p.vs&&p.vs.length){
      h+=`<div class="sec" style="margin-top:8px"><b style="font-size:11px;letter-spacing:.14em;color:var(--dim);display:block;margin-bottom:5px">MENTIONED IN</b>`+
        p.vs.slice(0,14).map(v=>`<span class="chip gold" data-v="${v}">${refAbbr(v)}</span>`).join('')+
        (p.vc>14?`<span class="psub"> +${fmt(p.vc-14)} more</span>`:'')+`</div>`;
    }
    $('#mbody').innerHTML=h;
    $('#mcard').style.display='block';
    $('#mbody').onclick=e=>{ const vc=e.target.closest('[data-v]'); if(vc) gotoVerse(+vc.dataset.v); };
    this.draw();
  }
};
/*EOF:map*/
