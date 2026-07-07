/* ============ PEOPLE — force-directed network ============ */
BX.views.net = {
  ERAS: [
    ['Creation & Patriarchs', -5000, -1700, '#b48ead'],
    ['Egypt & Exodus',        -1700, -1100, '#7aa2f7'],
    ['United Kingdom',        -1100,  -930, '#4fd6be'],
    ['Divided Kingdom',        -930,  -586, '#9ece6a'],
    ['Exile & Return',         -586,   -50, '#d8ab4e'],
    ['New Testament',           -50,   200, '#f7768e'],
  ],
  init(){
    const P = BX.d.people;
    this.P = P;
    this.cv = $('#netCv'); this.ctx = this.cv.getContext('2d');
    this.tip = $('#netTip');
    this.godIdx = P.findIndex(p=>p.n==='God');
    this.jesusIdx = P.reduce((best,p,i)=>p.n==='Jesus' && (best<0||p.vc>P[best].vc)?i:best, -1);
    // full adjacency (family + co) for BFS paths
    this.fullAdj = Array.from({length:P.length},()=>[]);
    const addE=(a,b)=>{ if(a!==b){ this.fullAdj[a].push(b); this.fullAdj[b].push(a); } };
    this.famEdges=[];
    P.forEach((p,i)=>{
      if(p.f!=null){ this.famEdges.push([i,p.f]); }
      if(p.m!=null){ this.famEdges.push([i,p.m]); }
      (p.sp||[]).forEach(s=>{ if(s>i) this.famEdges.push([i,s]); });
    });
    this.famEdges.forEach(([a,b])=>addE(a,b));
    BX.d.coEdges.forEach(([a,b])=>addE(a,b));
    // rank by verse count
    this.rank = [...P.keys()].sort((a,b)=>P[b].vc-P[a].vc);
    this.pinned = new Set();
    this.sel=-1; this.hov=-1;
    this.tx=0; this.ty=0; this.scale=1;
    // controls
    const leg = this.ERAS.map(e=>`<span><i style="background:${e[3]}"></i>${e[0]}</span>`).join('')+`<span><i style="background:#5c617a"></i>undated</span>`;
    $('#npLeg').innerHTML = leg;
    $('#npN').oninput = ()=>{ $('#npNv').textContent = fmt(+$('#npN').value)+' people'; };
    $('#npN').onchange = ()=>this.rebuild(true);
    $('#npNv').textContent = fmt(+$('#npN').value)+' people';
    $('#npFam').onchange = ()=>this.rebuild(false);
    $('#npCo').onchange = ()=>this.rebuild(false);
    $('#npGod').onchange = ()=>this.rebuild(true);
    $('#npFind').addEventListener('keydown',e=>{
      if(e.key!=='Enter') return;
      const q=e.target.value.trim().toLowerCase(); if(!q) return;
      const i=this.rank.find(i=>P[i].n.toLowerCase().startsWith(q)) ?? this.rank.find(i=>P[i].dt.toLowerCase().includes(q));
      if(i!=null){ this.pinned.add(i); this.rebuild(false); this.select(i, true); }
    });
    $('#pcard .x').onclick=()=>{ this.sel=-1; $('#pcard').style.display='none'; this.draw(); };
    // canvas interaction
    this.cv.addEventListener('mousedown', e=>this.down(e));
    window.addEventListener('mousemove', e=>this.move(e));
    window.addEventListener('mouseup', ()=>{ this.dragN=-1; this.panning=false; });
    this.cv.addEventListener('wheel', e=>{
      e.preventDefault();
      const r=this.cv.getBoundingClientRect(), mx=e.clientX-r.left, my=e.clientY-r.top;
      const f = Math.exp(-e.deltaY*0.0012);
      const ns = Math.min(6, Math.max(.2, this.scale*f));
      this.tx = mx-(mx-this.tx)*ns/this.scale; this.ty = my-(my-this.ty)*ns/this.scale;
      this.scale=ns; this.draw();
    },{passive:false});
    window.addEventListener('resize', ()=>{ clearTimeout(this._rt); this._rt=setTimeout(()=>{ this.size(); this.draw(); },200); });
    this.size();
    this.rebuild(true);
    this.select(this.jesusIdx, false);
  },
  onshow(){ this.size(); this.draw(); },
  size(){
    const dpr=window.devicePixelRatio||1;
    this.W=this.cv.clientWidth; this.H=this.cv.clientHeight;
    this.cv.width=this.W*dpr; this.cv.height=this.H*dpr; this.dpr=dpr;
  },
  eraColor(p){
    if(p.y==null) return '#5c617a';
    for(const e of this.ERAS) if(p.y>=e[1] && p.y<e[2]) return e[3];
    return p.y>=200 ? '#f7768e' : '#5c617a';
  },
  radius(p){ return Math.min(26, 2.4 + Math.sqrt(p.vc)*0.85); },
  rebuild(reseed){
    const P=this.P, N=+$('#npN').value;
    const inc = new Set(this.pinned);
    let added=0;
    for(const i of this.rank){
      if(added>=N) break;
      if(i===this.godIdx && !$('#npGod').checked) continue;
      inc.add(i); added++;
    }
    if(!$('#npGod').checked && !this.pinned.has(this.godIdx)) inc.delete(this.godIdx);
    this.vis = [...inc];
    this.vidx = new Map(this.vis.map((p,i)=>[p,i]));
    // edges within subset
    this.edges=[];
    if($('#npFam').checked) this.famEdges.forEach(([a,b])=>{
      if(this.vidx.has(a)&&this.vidx.has(b)) this.edges.push([this.vidx.get(a),this.vidx.get(b),3,1]);
    });
    if($('#npCo').checked) BX.d.coEdges.forEach(([a,b,w])=>{
      if(this.vidx.has(a)&&this.vidx.has(b)) this.edges.push([this.vidx.get(a),this.vidx.get(b),w,0]);
    });
    const n=this.vis.length;
    const ox=this.px, oi=this.oldVidx;
    this.px=new Float32Array(n); this.py=new Float32Array(n);
    this.vx=new Float32Array(n); this.vy=new Float32Array(n);
    for(let i=0;i<n;i++){
      const gi=this.vis[i];
      if(!reseed && oi && oi.has(gi)){ const o=oi.get(gi); this.px[i]=ox[o]; this.py[i]=this._oy[o]; }
      else{
        const p=this.P[gi];
        // seed x by era, y random — helps the timeline read left→right
        const t = p.y==null ? Math.random() : Math.min(1,Math.max(0,(p.y+4100)/4300));
        this.px[i]=(t*0.8+0.1)*this.W + (Math.random()-.5)*60;
        this.py[i]=this.H*(0.2+Math.random()*0.6);
      }
    }
    this.oldVidx=this.vidx; this._oy=this.py;
    this.deg=new Int32Array(n);
    this.edges.forEach(([a,b])=>{ this.deg[a]++; this.deg[b]++; });
    this.heat(1);
  },
  heat(a){ this.alpha=Math.max(this.alpha||0, a); if(!this._anim) this.loop(); },
  loop(){
    this._anim=true;
    const step=()=>{
      if(this.alpha>0.004 && document.getElementById('view-net').classList.contains('on')){
        this.tick(); this.alpha*=0.985;
        this.draw();
        requestAnimationFrame(step);
      } else { this._anim=false; this.draw(); }
    };
    requestAnimationFrame(step);
  },
  tick(){
    const n=this.vis.length, a=this.alpha;
    const cell=64, grid=new Map();
    const key=(x,y)=>((x&0xffff)<<16)|(y&0xffff);
    for(let i=0;i<n;i++){
      const k=key(this.px[i]/cell|0, this.py[i]/cell|0);
      let arr=grid.get(k); if(!arr){arr=[];grid.set(k,arr);} arr.push(i);
    }
    // repulsion (grid-local)
    for(let i=0;i<n;i++){
      const gx=this.px[i]/cell|0, gy=this.py[i]/cell|0;
      let fx=0, fy=0;
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
        const arr=grid.get(key(gx+dx,gy+dy)); if(!arr) continue;
        for(const j of arr){
          if(j===i) continue;
          let ddx=this.px[i]-this.px[j], ddy=this.py[i]-this.py[j];
          let d2=ddx*ddx+ddy*ddy;
          if(d2<1) { ddx=Math.random()-.5; ddy=Math.random()-.5; d2=1; }
          if(d2>cell*cell*2.3) continue;
          const f=900/d2;
          fx+=ddx*f; fy+=ddy*f;
        }
      }
      this.vx[i]+=fx*a; this.vy[i]+=fy*a;
    }
    // springs
    for(const [a1,b1,w] of this.edges){
      const dx=this.px[b1]-this.px[a1], dy=this.py[b1]-this.py[a1];
      const d=Math.sqrt(dx*dx+dy*dy)||1;
      const rest=46+8*Math.min(6,this.deg[a1]+this.deg[b1])/2;
      const f=(d-rest)*0.012*Math.min(2,0.6+Math.log(1+w)*0.3)*a;
      this.vx[a1]+=dx/d*f; this.vy[a1]+=dy/d*f;
      this.vx[b1]-=dx/d*f; this.vy[b1]-=dy/d*f;
    }
    // gravity + integrate
    const cx=this.W/2, cy=this.H/2;
    for(let i=0;i<n;i++){
      if(i===this.dragN) { this.vx[i]=0; this.vy[i]=0; continue; }
      this.vx[i]+=(cx-this.px[i])*0.0016*a;
      this.vy[i]+=(cy-this.py[i])*0.0016*a;
      this.vx[i]*=0.82; this.vy[i]*=0.82;
      this.px[i]+=Math.max(-14,Math.min(14,this.vx[i]));
      this.py[i]+=Math.max(-14,Math.min(14,this.vy[i]));
    }
  },
  draw(){
    const ctx=this.ctx, dpr=this.dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle='#0d0e12'; ctx.fillRect(0,0,this.W,this.H);
    ctx.setTransform(dpr*this.scale,0,0,dpr*this.scale,this.tx*dpr,this.ty*dpr);
    const selG = this.sel>=0 ? this.vidx.get(this.sel) : -1;
    const nbr = new Set();
    if(selG!=null && selG>=0) this.edges.forEach(([a,b])=>{ if(a===selG)nbr.add(b); if(b===selG)nbr.add(a); });
    // edges
    for(const [a,b,w,fam] of this.edges){
      const on = selG>=0 && (a===selG||b===selG);
      if(fam){ ctx.strokeStyle=on?'rgba(240,201,108,.9)':'rgba(216,171,78,.30)'; ctx.lineWidth=on?1.6:0.9; }
      else{ ctx.strokeStyle=on?'rgba(122,162,247,.85)':`rgba(120,130,160,${Math.min(.4,.06+Math.log(1+w)*.05)})`; ctx.lineWidth=on?1.4:0.7; }
      ctx.beginPath(); ctx.moveTo(this.px[a],this.py[a]); ctx.lineTo(this.px[b],this.py[b]); ctx.stroke();
    }
    // nodes
    for(let i=0;i<this.vis.length;i++){
      const p=this.P[this.vis[i]], r=this.radius(p);
      ctx.beginPath(); ctx.arc(this.px[i],this.py[i],r,0,7);
      ctx.fillStyle=this.eraColor(p);
      ctx.globalAlpha = selG>=0 && i!==selG && !nbr.has(i) ? 0.35 : 1;
      ctx.fill();
      ctx.globalAlpha=1;
      if(i===selG){ ctx.strokeStyle='#f0c96c'; ctx.lineWidth=2.4/this.scale; ctx.stroke(); }
      else if(i===this.hov){ ctx.strokeStyle='#e9e7de'; ctx.lineWidth=1.6/this.scale; ctx.stroke(); }
      else { ctx.strokeStyle='rgba(13,14,18,.85)'; ctx.lineWidth=1; ctx.stroke(); }
    }
    // labels
    ctx.textAlign='center'; ctx.fillStyle='#d6d9e6';
    const lblMin = this.scale>1.6?0: this.scale>0.9?7:10;
    for(let i=0;i<this.vis.length;i++){
      const p=this.P[this.vis[i]], r=this.radius(p);
      if(r<lblMin && i!==selG && i!==this.hov && !nbr.has(i)) continue;
      const fs=Math.max(9,Math.min(15,r*1.15))/Math.sqrt(this.scale);
      ctx.font=`${fs}px system-ui`;
      ctx.strokeStyle='rgba(13,14,18,.9)'; ctx.lineWidth=3;
      ctx.strokeText(p.n,this.px[i],this.py[i]-r-3);
      ctx.fillText(p.n,this.px[i],this.py[i]-r-3);
    }
  },
  pick(mx,my){
    const x=(mx-this.tx)/this.scale, y=(my-this.ty)/this.scale;
    let best=-1,bd=1e9;
    for(let i=0;i<this.vis.length;i++){
      const r=this.radius(this.P[this.vis[i]])+4;
      const dx=this.px[i]-x, dy=this.py[i]-y, d=dx*dx+dy*dy;
      if(d<r*r && d<bd){bd=d;best=i;}
    }
    return best;
  },
  down(e){
    const r=this.cv.getBoundingClientRect(), mx=e.clientX-r.left, my=e.clientY-r.top;
    const i=this.pick(mx,my);
    if(i>=0){ this.dragN=i; this._moved=false; }
    else { this.panning=true; this._px=mx; this._py=my; this._moved=false; }
  },
  move(e){
    if(!this.cv.isConnected) return;
    const r=this.cv.getBoundingClientRect(), mx=e.clientX-r.left, my=e.clientY-r.top;
    if(this.dragN>=0 && this.dragN!==-1 && e.buttons){
      this._moved=true;
      this.px[this.dragN]=(mx-this.tx)/this.scale; this.py[this.dragN]=(my-this.ty)/this.scale;
      this.heat(0.12); this.draw();
      return;
    }
    if(this.panning && e.buttons){
      this._moved=true;
      this.tx+=mx-this._px; this.ty+=my-this._py; this._px=mx; this._py=my; this.draw();
      return;
    }
    if(e.target!==this.cv) return;
    const i=this.pick(mx,my);
    if(i!==this.hov){ this.hov=i; this.draw(); }
    if(i>=0){
      const p=this.P[this.vis[i]];
      this.tip.innerHTML=`<b>${esc(p.dt)}</b><div class="m">${p.vc} verses${p.y!=null?' · '+yearFmt(p.y):''}</div>`;
      this.tip.style.display='block';
      this.tip.style.left=Math.min(this.W-180,mx+14)+'px';
      this.tip.style.top=(my+14)+'px';
      this.cv.style.cursor='pointer';
    } else { this.tip.style.display='none'; this.cv.style.cursor='default'; }
  },
  select(gi, center){
    if(gi<0) return;
    if(!this.vidx.has(gi)){ this.pinned.add(gi); this.rebuild(false); }
    this.sel=gi;
    const i=this.vidx.get(gi);
    if(center && i!=null){
      this.tx=this.W/2-this.px[i]*this.scale; this.ty=this.H/2-this.py[i]*this.scale;
    }
    this.card(gi);
    this.draw();
  },
  path(from,to){
    if(from===to) return [from];
    const prev=new Map([[from,-1]]);
    let q=[from];
    while(q.length){
      const nq=[];
      for(const u of q) for(const v of this.fullAdj[u]){
        if(prev.has(v)) continue;
        prev.set(v,u);
        if(v===to){ const path=[v]; let c=u; while(c!==-1){path.push(c);c=prev.get(c);} return path.reverse(); }
        nq.push(v);
      }
      q=nq;
      if(prev.size>20000) break;
    }
    return null;
  },
  card(gi){
    const p=this.P[gi], P=this.P;
    const link=(idx)=>`<span class="chip" data-p="${idx}">${esc(P[idx].n)}</span>`;
    let h=`<div class="pname">${esc(p.dt)}</div>
      <div class="psub">${p.g===1?'♂':p.g===2?'♀':''} ${p.y!=null?yearFmt(p.y):''} · appears in ${fmt(p.vc)} verse${p.vc===1?'':'s'}</div>`;
    if(p.ak) h+=`<div class="psub">also called: ${esc(p.ak)}</div>`;
    const fam=[];
    if(p.f!=null) fam.push('<b style="color:var(--dim)">father</b> '+link(p.f));
    if(p.m!=null) fam.push('<b style="color:var(--dim)">mother</b> '+link(p.m));
    if(p.sp&&p.sp.length) fam.push('<b style="color:var(--dim)">spouse</b> '+p.sp.map(link).join(''));
    if(p.ch&&p.ch.length) fam.push('<b style="color:var(--dim)">children</b> '+p.ch.slice(0,14).map(link).join('')+(p.ch.length>14?` <span class="psub">+${p.ch.length-14}</span>`:''));
    if(fam.length) h+=`<div class="sec"><b>FAMILY</b>${fam.map(f=>`<div style="margin:3px 0">${f}</div>`).join('')}</div>`;
    if(gi!==this.jesusIdx && this.jesusIdx>=0){
      const path=this.path(gi,this.jesusIdx);
      if(path) h+=`<div class="sec"><b>${path.length-1} STEP${path.length===2?'':'S'} TO JESUS</b>${path.map(link).join('<span style="color:var(--dim)"> → </span>')}</div>`;
    }
    if(p.vs&&p.vs.length){
      h+=`<div class="sec"><b>APPEARS IN</b>${p.vs.slice(0,12).map(v=>`<span class="chip gold" data-v="${v}">${refAbbr(v)}</span>`).join('')}${p.vc>12?`<span class="psub"> +${fmt(p.vc-12)} more</span>`:''}</div>`;
    }
    $('#pbody').innerHTML=h;
    $('#pcard').style.display='block';
    $('#pbody').onclick=e=>{
      const pc=e.target.closest('[data-p]'); if(pc){ this.select(+pc.dataset.p, true); return; }
      const vc=e.target.closest('[data-v]'); if(vc){ gotoVerse(+vc.dataset.v); }
    };
  }
};
$('#netCv')?.addEventListener('click', function(e){
  const V=BX.views.net;
  if(V._moved || V.dragN>=0) return;
  const r=this.getBoundingClientRect();
  const i=V.pick(e.clientX-r.left, e.clientY-r.top);
  if(i>=0) V.select(V.vis[i], false);
});
/*EOF:net*/
