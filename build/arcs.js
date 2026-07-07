/* ============ ARCS — cross-reference visualization ============ */
BX.views.arcs = {
  init(){
    this.cv = $('#arcCv');
    this.ctx = this.cv.getContext('2d');
    this.tip = $('#arcTip');
    this.hover = -1;
    this.arcs = BX.d.arcs;                    // [c1,c2,w] sorted desc by w
    this.adj = Array.from({length:BX.ch.length},()=>[]);
    this.deg = new Float64Array(BX.ch.length);
    this.arcs.forEach((a,i)=>{ this.adj[a[0]].push(i); this.adj[a[1]].push(i); this.deg[a[0]]+=a[2]; this.deg[a[1]]+=a[2]; });
    this.maxW = this.arcs[0] ? this.arcs[0][2] : 1;
    window.addEventListener('resize', ()=>{ clearTimeout(this._rt); this._rt=setTimeout(()=>this.layout(true),200); });
    this.cv.addEventListener('mousemove', e=>this.onMove(e));
    this.cv.addEventListener('mouseleave', ()=>{ this.hover=-1; this.tip.style.display='none'; this.compose(); });
    this.cv.addEventListener('click', ()=>{ if(this.hover>=0) gotoChapter(this.hover); });
    this.layout(true);
  },
  onshow(){ if(this.W!==this.cv.clientWidth) this.layout(true); },
  layout(render){
    const dpr = window.devicePixelRatio||1;
    const W = this.W = this.cv.clientWidth, H = this.H = this.cv.clientHeight;
    if(!W||!H) return;
    this.cv.width = W*dpr; this.cv.height = H*dpr;
    this.dpr = dpr;
    // chapter x positions weighted by verse count
    const ML=34, MR=24;
    const total = BX.ch.reduce((s,c)=>s+c.nv,0);
    const span = W-ML-MR;
    this.xs = new Float32Array(BX.ch.length);       // center x
    this.bounds = new Float32Array(BX.ch.length+1); // cell edges
    let acc=0;
    for(let i=0;i<BX.ch.length;i++){
      this.bounds[i] = ML + acc/total*span;
      const w = BX.ch[i].nv/total*span;
      this.xs[i] = this.bounds[i]+w/2;
      acc += BX.ch[i].nv;
    }
    this.bounds[BX.ch.length] = ML+span;
    this.baseY = Math.round(H*0.74);
    this.maxNv = Math.max(...BX.ch.map(c=>c.nv));
    if(render) this.render();
  },
  arcColor(a,b,alpha){
    const d = Math.abs(this.xs[b]-this.xs[a])/(this.W||1);
    const hue = 258 - 258*Math.min(1,d*1.25);
    return `hsla(${hue},72%,60%,${alpha})`;
  },
  drawArc(ctx, i, alpha, lw){
    const [a,b] = this.arcs[i];
    const x1=this.xs[a], x2=this.xs[b];
    const rx=(x2-x1)/2, cx=x1+rx;
    const ry=Math.min(Math.abs(rx), this.baseY-26);
    ctx.strokeStyle = this.arcColor(a,b,alpha);
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(cx, this.baseY, Math.abs(rx), ry, 0, Math.PI, Math.PI*2, false);
    ctx.stroke();
  },
  render(){
    // pre-render arcs to offscreen in chunks (light->heavy so strong arcs sit on top)
    const dpr=this.dpr;
    this.base = document.createElement('canvas');
    this.base.width=this.cv.width; this.base.height=this.cv.height;
    const c = this.base.getContext('2d');
    c.scale(dpr,dpr);
    c.fillStyle='#0d0e12'; c.fillRect(0,0,this.W,this.H);
    this.drawBars(c, -1);
    const order = [...this.arcs.keys()].reverse();  // ascending weight
    let p=0;
    const chunk = ()=>{
      const t0 = performance.now();
      while(p<order.length && performance.now()-t0<14){
        for(let k=0;k<600 && p<order.length;k++,p++){
          const i=order[p], w=this.arcs[i][2];
          const alpha = Math.min(.30, .05 + Math.log(1+w)*.022);
          this.drawArc(c, i, alpha, 0.6);
        }
      }
      $('#arcStatus').textContent = p<order.length
        ? `weaving ${fmt(p)} / ${fmt(order.length)} chapter connections…`
        : `${fmt(BX.d.stats.xrefCount)} cross-references · ${fmt(order.length)} chapter arcs · ${fmt(BX.ch.length)} chapters`;
      if(p<order.length){ requestAnimationFrame(chunk); }
      this.compose();
    };
    requestAnimationFrame(chunk);
  },
  drawBars(c, hover){
    const H=this.H;
    for(let i=0;i<BX.ch.length;i++){
      const ch=BX.ch[i];
      const x=this.bounds[i], w=Math.max(0.4, this.bounds[i+1]-x-0.25);
      const h=6 + ch.nv/this.maxNv*(H-this.baseY-26);
      if(i===hover) c.fillStyle='#f0c96c';
      else c.fillStyle = BX.d.books[ch.b].t===0 ? '#4c5878' : '#8a6f4d';
      c.fillRect(x, this.baseY+2, w, h);
    }
    // book boundaries + labels
    c.fillStyle='#565b70'; c.font='10px system-ui'; c.textAlign='center';
    for(let b=0;b<66;b++){
      const c0=BX.bookCh0[b], c1=(b<65?BX.bookCh0[b+1]:BX.ch.length);
      const x0=this.bounds[c0], x1=this.bounds[c1===BX.ch.length?BX.ch.length:c1];
      c.fillStyle='rgba(90,95,120,.35)';
      c.fillRect(x0, this.baseY+2, 0.6, this.H-this.baseY-16);
      if(x1-x0>30){
        c.fillStyle='#7a8098';
        c.fillText(BX.d.books[b].a, (x0+x1)/2, this.H-6);
      }
    }
  },
  compose(){
    const ctx=this.ctx, dpr=this.dpr;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.drawImage(this.base,0,0);
    if(this.hover<0) return;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    // dim
    ctx.fillStyle='rgba(13,14,18,.84)';
    ctx.fillRect(0,0,this.W,this.baseY+1);
    // highlight this chapter's arcs
    const list=this.adj[this.hover];
    for(const i of list){
      const w=this.arcs[i][2];
      this.drawArc(ctx, i, Math.min(.95,.45+Math.log(1+w)*.08), 1.1);
    }
    this.drawBars(ctx, this.hover);
    // partner ticks
    ctx.fillStyle='#f0c96c';
    for(const i of list){
      const [a,b]=this.arcs[i];
      const o = a===this.hover?b:a;
      ctx.fillRect(this.xs[o]-0.75, this.baseY-3, 1.5, 5);
    }
  },
  chapterAt(x){
    let lo=0, hi=BX.ch.length-1;
    if(x<this.bounds[0]||x>this.bounds[BX.ch.length]) return -1;
    while(lo<hi){ const mid=(lo+hi+1)>>1; if(this.bounds[mid]<=x) lo=mid; else hi=mid-1; }
    return lo;
  },
  onMove(e){
    if(!this.base) return;
    const r=this.cv.getBoundingClientRect();
    const x=e.clientX-r.left, y=e.clientY-r.top;
    const ci=this.chapterAt(x);
    if(ci!==this.hover){
      this.hover=ci; this.compose();
      $('#arcHint').style.opacity=0;
    }
    if(ci>=0){
      const ch=BX.ch[ci];
      this.tip.innerHTML=`<b>${BX.d.books[ch.b].n} ${ch.c}</b><div class="m">${ch.nv} verses · ${this.adj[ci].length} linked chapters · weight ${fmt(Math.round(this.deg[ci]))}</div><div class="m">click to read</div>`;
      this.tip.style.display='block';
      const tw=this.tip.offsetWidth;
      this.tip.style.left=Math.min(this.W-tw-10, Math.max(6,x-tw/2))+'px';
      this.tip.style.top=Math.min(y+18, this.H-70)+'px';
      this.cv.style.cursor='pointer';
    } else { this.tip.style.display='none'; this.cv.style.cursor='default'; }
  }
};
/*EOF:arcs*/
