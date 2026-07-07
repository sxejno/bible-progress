'use strict';
/* ============ Bible Explorer — core ============ */
const BX = { views:{}, inited:{} };
const $ = s => document.querySelector(s);
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmt = n => n.toLocaleString('en-US');
const TAGRE = /\[([HG]\d+)\]/g, EMRE = /<\/?em>/g;
const yearFmt = y => y==null ? '' : (y<0 ? (-y)+' BC' : 'AD '+y);

/* ---------- data load ---------- */
async function loadData(){
  const st = $('#lstat'), bar = $('#lbar i');
  const set = (t,p)=>{ st.textContent=t; if(p!=null) bar.style.width=p+'%'; };
  try{
    set('decoding 31,102 verses…', 12);
    await new Promise(r=>setTimeout(r,30));
    const b64 = document.getElementById('BXDATA').textContent.trim();
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) u8[i] = bin.charCodeAt(i);
    set('inflating…', 34);
    if(!window.DecompressionStream) throw new Error('This app needs a modern browser (Chrome 80+, Edge, Firefox 113+, Safari 16.4+).');
    const ds = new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'));
    const txt = await new Response(ds).text();
    set('parsing…', 62);
    await new Promise(r=>setTimeout(r,30));
    BX.d = JSON.parse(txt);
    set('indexing…', 78);
    await new Promise(r=>setTimeout(r,30));
    buildIndexes();
    set('ready', 100);
  }catch(e){
    st.className='err'; st.textContent = e.message || String(e);
    throw e;
  }
}

/* ---------- indexes ---------- */
function buildIndexes(){
  const d = BX.d, B = d.books;
  const NV = d.text.length;
  BX.NV = NV;
  // chapters
  BX.ch = [];               // {b, c, v0, nv}
  BX.bookCh0 = [];          // first global chapter index of book
  BX.vidCh = new Int32Array(NV);   // vid -> global chapter idx
  BX.vidV  = new Int32Array(NV);   // vid -> verse number
  let vid = 0;
  for(let b=0;b<B.length;b++){
    BX.bookCh0.push(BX.ch.length);
    for(let c=1;c<=B[b].c.length;c++){
      const nv = B[b].c[c-1], ci = BX.ch.length;
      BX.ch.push({b, c, v0:vid, nv});
      for(let v=1;v<=nv;v++){ BX.vidCh[vid]=ci; BX.vidV[vid]=v; vid++; }
    }
  }
  // plain text
  BX.plain = new Array(NV); BX.lower = new Array(NV);
  for(let i=0;i<NV;i++){
    const p = d.text[i].replace(TAGRE,'').replace(EMRE,'').replace(/\s+/g,' ').trim();
    BX.plain[i]=p; BX.lower[i]=p.toLowerCase();
  }
  // book alias map for reference parsing
  BX.alias = {};
  const addA=(s,b)=>{ BX.alias[s.toLowerCase().replace(/[^a-z0-9]/g,'')]=b; };
  B.forEach((bk,i)=>{ addA(bk.n,i); addA(bk.a,i); });
  [['gn',0],['ex',1],['lv',2],['nm',3],['dt',4],['jsh',5],['jdg',6],['ru',7],['1sm',8],['2sm',9],
   ['1kg',10],['2kg',11],['1ch',12],['2ch',13],['ne',15],['est',16],['jb',17],['psa',18],['psalm',18],
   ['pr',19],['prv',19],['ec',20],['sos',21],['song',21],['is',22],['jr',23],['lm',24],['ezk',25],
   ['dn',26],['ho',27],['jl',28],['am',29],['ob',30],['jnh',31],['mc',32],['na',33],['hb',34],['zp',35],
   ['hg',36],['zc',37],['ml',38],['mt',39],['mk',40],['mrk',40],['lk',41],['jn',42],['jhn',42],['ac',43],
   ['ro',44],['rm',44],['1co',45],['2co',46],['ga',47],['ep',48],['php',49],['col',50],['1th',51],['2th',52],
   ['1ti',53],['2ti',54],['tit',55],['phm',56],['hb',57],['heb',57],['jas',58],['jm',58],['1pe',59],['2pe',60],
   ['1jn',61],['2jn',62],['3jn',63],['jud',64],['rv',65],['re',65]].forEach(([s,b])=>{ if(!(s in BX.alias)) BX.alias[s]=b; });
  // xref map
  BX.xr = d.xrefV;
}
const chOf = vid => BX.ch[BX.vidCh[vid]];
function refStr(vid){ const ch=chOf(vid); return BX.d.books[ch.b].n+' '+ch.c+':'+BX.vidV[vid]; }
function refAbbr(vid){ const ch=chOf(vid); return BX.d.books[ch.b].a+' '+ch.c+':'+BX.vidV[vid]; }

/* ---------- router ---------- */
function showView(name){
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on', t.dataset.v===name));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on', v.id==='view-'+name));
  if(!BX.inited[name]){ BX.inited[name]=true; BX.views[name].init(); }
  else if(BX.views[name].onshow) BX.views[name].onshow();
}
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>showView(t.dataset.v)));

/* ============ READER ============ */
BX.reader = { b:42, c:3, inter:false, target:null };
BX.views.read = {
  init(){
    this.buildNav();
    $('#rPrev').onclick = ()=>BX.views.read.step(-1);
    $('#rNext').onclick = ()=>BX.views.read.step(1);
    $('#ilTog').onclick = ()=>{
      BX.reader.inter = !BX.reader.inter;
      $('#ilTog').classList.toggle('on', BX.reader.inter);
      BX.views.read.renderChapter();
    };
    $('#spanel .x').onclick = ()=>{ $('#spanel').style.display='none'; };
    this.renderChapter();
  },
  onshow(){},
  buildNav(){
    const nav = $('#rnav'); let h='';
    const grp = (t0,t1,label)=>{
      h += `<div class="bh">${label}</div>`;
      BX.d.books.forEach((bk,i)=>{ if(bk.t===t0) h+=`<button class="bk" data-b="${i}">${bk.n}</button>`; });
    };
    h += `<div class="bh">OLD TESTAMENT</div>`;
    BX.d.books.forEach((bk,i)=>{ if(bk.t===0) h+=`<button class="bk" data-b="${i}">${bk.n}</button>`; });
    h += `<div class="bh">NEW TESTAMENT</div>`;
    BX.d.books.forEach((bk,i)=>{ if(bk.t===1) h+=`<button class="bk" data-b="${i}">${bk.n}</button>`; });
    nav.innerHTML = h;
    nav.addEventListener('click',e=>{
      const bk = e.target.closest('.bk'); if(!bk) return;
      const b = +bk.dataset.b;
      if(BX.reader.b===b && $('#chgrid')){ $('#chgrid').remove(); this._chB=null; return; }
      this.showChapters(b, bk);
    });
  },
  showChapters(b, bkEl){
    const old = $('#chgrid'); if(old) old.remove();
    const n = BX.d.books[b].c.length;
    const g = document.createElement('div'); g.id='chgrid';
    for(let c=1;c<=n;c++){
      const btn=document.createElement('button'); btn.textContent=c;
      if(BX.reader.b===b && BX.reader.c===c) btn.className='on';
      btn.onclick=()=>{ BX.reader.b=b; BX.reader.c=c; BX.reader.target=null; this.renderChapter(); };
      g.appendChild(btn);
    }
    bkEl.after(g);
    this._chB=b;
  },
  step(dir){
    const r = BX.reader, B = BX.d.books;
    r.c += dir;
    if(r.c < 1){ r.b = (r.b+65)%66; r.c = B[r.b].c.length; }
    if(r.c > B[r.b].c.length){ r.b = (r.b+1)%66; r.c = 1; }
    r.target=null; this.renderChapter();
  },
  verseHTML(vid){
    const raw = BX.d.text[vid];
    if(!BX.reader.inter){
      let h = esc(raw.replace(TAGRE,''));
      h = h.replace(/&lt;em&gt;/g,'<em>').replace(/&lt;\/em&gt;/g,'</em>');
      return h;
    }
    // interlinear: attach tags to preceding word chunk
    let h='', re=/([^\[]+?)((?:\[[HG]\d+\])+)|([^\[]+)/g, m;
    while((m=re.exec(raw))){
      if(m[3]!=null){ h+=esc(m[3]); continue; }
      const tags = m[2].match(/[HG]\d+/g).join(',');
      h += `<span class="tw" data-s="${tags}">${esc(m[1])}</span>`;
    }
    h = h.replace(/&lt;em&gt;/g,'<em>').replace(/&lt;\/em&gt;/g,'</em>');
    return h;
  },
  renderChapter(){
    const r = BX.reader, bk = BX.d.books[r.b];
    const ci = BX.bookCh0[r.b] + r.c - 1, ch = BX.ch[ci];
    $('#rTitle').textContent = bk.n+' '+r.c;
    document.querySelectorAll('#rnav .bk').forEach(el=>el.classList.toggle('on', +el.dataset.b===r.b));
    if(this._chB!==r.b){ const bkEl=document.querySelector(`#rnav .bk[data-b="${r.b}"]`); if(bkEl) this.showChapters(r.b,bkEl); }
    else document.querySelectorAll('#chgrid button').forEach((el,i)=>el.classList.toggle('on', i+1===r.c));
    const wrap = $('#verses'); let h='';
    for(let v=0;v<ch.nv;v++){
      const vid = ch.v0+v, xr = BX.xr[vid];
      h += `<div class="vrow" id="v${vid}"><span class="vn">${v+1}</span><span class="vtext">${this.verseHTML(vid)}</span>`;
      if(xr) h += `<button class="xb" data-v="${vid}" title="cross references">⇄ ${xr.length}</button>`;
      h += `</div>`;
    }
    wrap.innerHTML = h;
    wrap.onclick = e=>{
      const tw = e.target.closest('.tw');
      if(tw){ openStrong(tw.dataset.s.split(','), tw.textContent.trim()); return; }
      const xb = e.target.closest('.xb');
      if(xb){ this.toggleXrefs(xb); return; }
    };
    if(r.target!=null){
      const el = document.getElementById('v'+r.target);
      if(el){ el.classList.add('flash'); setTimeout(()=>el.scrollIntoView({block:'center'}),40); }
      r.target=null;
    } else $('#rmain').scrollTop=0;
  },
  toggleXrefs(btn){
    const vid = +btn.dataset.v, row = btn.parentElement;
    const nxt = row.nextElementSibling;
    if(nxt && nxt.classList.contains('xlist')){ nxt.remove(); return; }
    document.querySelectorAll('.xlist').forEach(x=>x.remove());
    const div = document.createElement('div'); div.className='xlist';
    div.innerHTML = BX.xr[vid].map(t=>{
      const snip = BX.plain[t].length>110 ? BX.plain[t].slice(0,110)+'…' : BX.plain[t];
      return `<button class="xitem" data-v="${t}"><b>${refAbbr(t)}</b>${esc(snip)}</button>`;
    }).join('');
    div.onclick = e=>{ const it=e.target.closest('.xitem'); if(it) gotoVerse(+it.dataset.v); };
    row.after(div);
  }
};
function gotoVerse(vid){
  const ch = chOf(vid);
  BX.reader.b = ch.b; BX.reader.c = ch.c; BX.reader.target = vid;
  showView('read');
  BX.views.read.renderChapter();
}
function gotoChapter(ci){
  const ch = BX.ch[ci];
  BX.reader.b = ch.b; BX.reader.c = ch.c; BX.reader.target=null;
  showView('read');
  BX.views.read.renderChapter();
}

/* ---------- Strong's panel ---------- */
function openStrong(nums, word){
  const p = $('#spanel'), b = $('#sbody');
  let h = word ? `<div class="snum">“${esc(word)}”</div>` : '';
  nums.forEach((n,i)=>{
    const e = BX.d.dict[n]; if(!e) return;
    if(i>0) h+='<hr>';
    h += `<div class="snum">STRONG'S ${n} · ${n[0]==='H'?'HEBREW':'GREEK'}</div>
    <div class="slem">${esc(e.l||'')}</div>
    <div class="strn">${esc(e.t||'')}</div>`;
    if(e.d) h += `<div class="sdef">${esc(e.d)}</div>`;
    if(e.k) h += `<div class="skjv"><b>KJV:</b> ${esc(e.k)}</div>`;
    h += `<button class="occ" data-n="${n}">every occurrence of ${n} →</button>`;
  });
  b.innerHTML = h;
  b.onclick = e=>{ const o=e.target.closest('.occ'); if(o) strongSearch(o.dataset.n); };
  p.style.display='block';
}
function strongSearch(num){
  const needle = '['+num+']';
  const hits = [];
  for(let i=0;i<BX.NV;i++) if(BX.d.text[i].indexOf(needle)>=0) hits.push(i);
  const e = BX.d.dict[num]||{};
  showResults({
    title:`${num} · ${e.t||''}`,
    meta:`${fmt(hits.length)} verse${hits.length===1?'':'s'} contain this word`,
    vids:hits, hl:null
  });
}

/* ============ SEARCH ============ */
function parseRef(q){
  const m = q.trim().toLowerCase().match(/^([1-3]?\s*[a-z][a-z .]+?)\s*(\d+)(?:\s*[:.]\s*(\d+))?$/);
  if(!m) return null;
  const key = m[1].replace(/[^a-z0-9]/g,'');
  let b = BX.alias[key];
  if(b==null){ // prefix match on full names
    const names = BX.d.books.map((bk,i)=>[bk.n.toLowerCase().replace(/[^a-z0-9]/g,''),i]);
    const hit = names.find(([n])=>n.startsWith(key));
    if(hit) b = hit[1];
  }
  if(b==null) return null;
  const c = +m[2];
  if(c<1 || c>BX.d.books[b].c.length) return null;
  const v = m[3] ? +m[3] : null;
  const ci = BX.bookCh0[b]+c-1;
  if(v!=null){
    if(v<1 || v>BX.ch[ci].nv) return {ci, vid:null};
    return {ci, vid:BX.ch[ci].v0+v-1};
  }
  return {ci, vid:null};
}
function runSearch(q){
  q = q.trim();
  if(!q) return;
  const sm = q.match(/^([HG])\s*(\d+)$/i);
  if(sm){ strongSearch(sm[1].toUpperCase()+ +sm[2]); return; }
  const ref = parseRef(q);
  if(ref){ hideResults(); if(ref.vid!=null) gotoVerse(ref.vid); else gotoChapter(ref.ci); return; }
  // text search
  const ql = q.toLowerCase();
  const single = !/\s/.test(ql);
  let re = null;
  if(single){ try{ re = new RegExp('\\b'+ql.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b'); }catch(e){} }
  const hits=[];
  for(let i=0;i<BX.NV;i++){
    const L = BX.lower[i];
    if(single ? (L.indexOf(ql)>=0 && (re?re.test(L):true)) : L.indexOf(ql)>=0) hits.push(i);
    if(hits.length>=8000) break;
  }
  showResults({ title:`“${q}”`, meta:`${fmt(hits.length)} verse${hits.length===1?'':'s'}${hits.length>=8000?' (capped)':''}`, vids:hits, hl:ql });
}
function showResults({title, meta, vids, hl}){
  const p = $('#sres');
  // distribution per book
  const per = new Array(66).fill(0);
  vids.forEach(v=>per[chOf(v).b]++);
  const mx = Math.max(1,...per);
  const dist = per.map((n,b)=>`<i style="height:${Math.max(n?2:1,Math.round(n/mx*18))}px; opacity:${n?0.8:0.15}" title="${BX.d.books[b].n}: ${n}"></i>`).join('');
  const items = vids.slice(0,400).map(v=>{
    let t = esc(BX.plain[v].length>150 ? BX.plain[v].slice(0,150)+'…' : BX.plain[v]);
    if(hl){ try{ t = t.replace(new RegExp('('+hl.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig'),'<mark>$1</mark>'); }catch(e){} }
    return `<button class="sitem" data-v="${v}"><b>${refAbbr(v)}</b>${t}</button>`;
  }).join('');
  p.innerHTML = `<div class="shead"><b>${esc(title)}</b> <span class="m">— ${meta}</span></div>
    <div id="sdist">${dist}</div>
    <div id="slist">${items || '<div style="padding:14px;color:var(--dim)">no matches</div>'}</div>`;
  p.style.display='block';
  $('#slist').onclick = e=>{ const it=e.target.closest('.sitem'); if(it){ gotoVerse(+it.dataset.v); } };
}
function hideResults(){ $('#sres').style.display='none'; }
$('#sbox').addEventListener('keydown',e=>{
  if(e.key==='Enter') runSearch(e.target.value);
  if(e.key==='Escape'){ hideResults(); e.target.blur(); }
});
document.addEventListener('click',e=>{
  if(!e.target.closest('#sres') && !e.target.closest('#sbox') && !e.target.closest('.occ')) hideResults();
});
/*EOF:core*/

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
  if(!V.vis || V._moved) return;
  const r=this.getBoundingClientRect();
  const i=V.pick(e.clientX-r.left, e.clientY-r.top);
  if(i>=0) V.select(V.vis[i], false);
});
/*EOF:net*/

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

/* ============ TIMELINE — lifespans & reigns ============ */
BX.views.time = {
  init(){
    const L=BX.d.life, w=$('#twrap');
    let h='';
    h+=`<h2>Overlapping lives: Adam to Joseph</h2>
    <div class="sub">traditional (Ussher) chronology — hover a life to see everyone alive at the same time.
    Adam and Methuselah overlap by 243 years; Methuselah dies the year of the Flood.</div>
    <div class="tl-scroll" id="patChart"></div>`;
    h+=`<h2>Kings & prophets of Israel and Judah</h2>
    <div class="sub">Thiele's chronology (dates approximate; coregencies overlap) · click any bar to search that name — prophets shown in teal</div>
    <div class="legend"><span><i style="background:#7aa2f7"></i>united kingdom</span><span><i style="background:#d8ab4e"></i>Judah</span><span><i style="background:#f7768e"></i>Israel</span><span><i style="background:#4fd6be"></i>prophets</span></div>
    <div class="tl-scroll" id="kingChart"></div>
    <div class="note">Patriarch dates follow the traditional Ussher reckoning used by the Theographic dataset; kings follow Thiele's widely used chronology. Scholarly datings vary — treat years as a guide, not gospel.</div>`;
    w.innerHTML=h;
    this.patriarchs(); this.kings();
  },
  patriarchs(){
    const L=BX.d.life, P=L.pats;
    const Y0=-4050, Y1=-1580, W=1180, LBL=96, PW=W-LBL-14, RH=24, H=P.length*RH+56;
    const x=y=>LBL+(y-Y0)/(Y1-Y0)*PW;
    let s=`<svg width="${W}" height="${H}" font-family="system-ui" font-size="11">`;
    // grid every 250y
    for(let y=-4000;y<=-1750;y+=250){
      s+=`<line x1="${x(y)}" y1="16" x2="${x(y)}" y2="${H-30}" stroke="#20243466"/>
          <text x="${x(y)}" y="${H-16}" fill="#6b7085" text-anchor="middle" font-size="10">${-y} BC</text>`;
    }
    // flood
    s+=`<line x1="${x(L.flood)}" y1="10" x2="${x(L.flood)}" y2="${H-30}" stroke="#f7768e" stroke-dasharray="4 3" stroke-width="1.2"/>
        <text x="${x(L.flood)+5}" y="20" fill="#f7768e" font-size="10.5">the Flood · ${-L.flood} BC</text>`;
    P.forEach((p,i)=>{
      const y=26+i*RH;
      const bx=x(p.b), bw=Math.max(2,x(p.d)-bx);
      const age=p.d-p.b;
      const enoch=p.n==='Enoch';
      s+=`<text x="${LBL-8}" y="${y+11}" fill="#9095a8" text-anchor="end">${p.n}</text>`;
      s+=`<g class="patg" data-i="${i}">
        <rect class="tlbar patbar" data-i="${i}" x="${bx}" y="${y}" width="${bw}" height="15" rx="7.5"
          fill="${enoch?'#b48ead':'#8a6d2f'}" stroke="#d8ab4e55">
          <title>${p.n} — ${-p.b}–${-p.d} BC · ${age} years${enoch?' · “and he was not; for God took him”':''}${p.n==='Methuselah'?' · dies the year of the Flood':''}</title>
        </rect>
        <text x="${bx+bw+6}" y="${y+11.5}" fill="#565b70" font-size="9.5">${age}${enoch?' ↑':''}</text>
      </g>`;
    });
    s+=`</svg>`;
    const el=$('#patChart'); el.innerHTML=s;
    const svg=el.querySelector('svg');
    svg.addEventListener('mouseover',e=>{
      const r=e.target.closest('.patbar'); if(!r) return;
      const i=+r.dataset.i, me=P[i];
      svg.querySelectorAll('.patg').forEach((g,gi)=>{
        const o=P[gi];
        const overlap = o.b<me.d && me.b<o.d;
        g.style.opacity = overlap?1:0.22;
      });
    });
    svg.addEventListener('mouseleave',()=>{ svg.querySelectorAll('.patg').forEach(g=>g.style.opacity=1); });
    svg.addEventListener('click',e=>{
      const r=e.target.closest('.patbar'); if(!r) return;
      const p=P[+r.dataset.i];
      if(p.p>=0){ showView('net'); BX.views.net.select(p.p,true); }
      else { $('#sbox').value=p.n; runSearch(p.n); }
    });
  },
  kings(){
    const L=BX.d.life;
    const Y0=-1075, Y1=-410, W=1180, LBL=10, PW=W-LBL-14;
    const x=y=>LBL+(y-Y0)/(Y1-Y0)*PW;
    const lanes=[["UNITED KINGDOM",L.united,'#7aa2f7',34],["JUDAH",L.judah,'#d8ab4e',34],["ISRAEL (NORTH)",L.israel,'#f7768e',34],["PROPHETS",L.prophets,'#4fd6be',52]];
    let H=70;
    lanes.forEach(l=>H+=l[3]+30);
    let s=`<svg width="${W}" height="${H}" font-family="system-ui" font-size="10.5">`;
    for(let y=-1050;y<=-450;y+=100){
      s+=`<line x1="${x(y)}" y1="14" x2="${x(y)}" y2="${H-40}" stroke="#20243466"/>
          <text x="${x(y)}" y="${H-26}" fill="#6b7085" text-anchor="middle" font-size="10">${-y} BC</text>`;
    }
    // events
    L.events.forEach(([y,n])=>{
      s+=`<line x1="${x(y)}" y1="14" x2="${x(y)}" y2="${H-40}" stroke="#f7768e88" stroke-dasharray="3 3"/>
          <text x="${x(y)+4}" y="${H-44}" fill="#cf6a79" font-size="9.5" transform="rotate(-38 ${x(y)+4} ${H-44})">${n} · ${-y}</text>`;
    });
    let yy=26;
    lanes.forEach(([name,list,col,laneH])=>{
      s+=`<text x="${LBL}" y="${yy-4}" fill="#565b70" font-size="9.5" letter-spacing="2">${name}</text>`;
      // greedy row packing within lane for overlaps (coregencies / prophets)
      const rows=[];
      list.forEach(k=>{
        let ri=rows.findIndex(end=>k.d0>=end-1);
        if(ri<0){ rows.push(k.d1); ri=rows.length-1; } else rows[ri]=k.d1;
        k._r=ri;
      });
      const rh=Math.max(1,rows.length), bh=Math.min(16,(laneH)/rh-2);
      list.forEach((k,ki)=>{
        const bx=x(k.d0), bw=Math.max(2.5,x(k.d1)-bx);
        const by=yy+k._r*(bh+2);
        const yrs=k.d1-k.d0;
        s+=`<rect class="tlbar" data-n="${esc(k.n)}" data-p="${k.p}" x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="2.5" fill="${col}" fill-opacity="${0.72+0.28*(ki%2)}">
          <title>${k.lbl} — ${-k.d0}–${-k.d1} BC${yrs>0?' · '+yrs+' yrs':''}</title></rect>`;
        if(bw>34) s+=`<text x="${bx+3}" y="${by+bh-2.5}" fill="#0d0e12" font-size="${Math.min(9.5,bh-2)}" font-weight="600">${k.n}</text>`;
      });
      yy+=laneH+30;
    });
    s+=`</svg>`;
    const el=$('#kingChart'); el.innerHTML=s;
    el.querySelector('svg').addEventListener('click',e=>{
      const r=e.target.closest('.tlbar'); if(!r) return;
      const p=+r.dataset.p;
      if(p>=0){ showView('net'); BX.views.net.select(p,true); }
      else { $('#sbox').value=r.dataset.n; runSearch(r.dataset.n); }
    });
  }
};
/*EOF:time*/

/* ============ DASHBOARD ============ */
BX.views.dash = {
  init(){
    const S=BX.d.stats, B=BX.d.books, w=$('#dwrap');
    const bookAbbr=i=>B[i].a;
    const readMins=Math.round(S.totalWords/200);
    let h='';
    /* hero */
    h+=`<h2>The whole book, in numbers</h2><div class="sub">King James Version · every figure computed from the raw text</div>
    <div class="cards">
      ${[[S.totalWords,'words'],[S.totalVerses,'verses'],[S.totalChapters,'chapters'],[66,'books'],
         [S.uniqueWords,'distinct words'],[S.hapaxCount,'words used exactly once'],[S.xrefCount,'cross-references'],
         [S.peopleCount,'named people'],[S.questions,'questions asked'],[Math.round(readMins/60)+' h','to read aloud (~200 wpm)']]
        .map(([n,c])=>`<div class="card"><div class="n">${typeof n==='number'?fmt(n):n}</div><div class="c">${c}</div></div>`).join('')}
    </div>`;
    /* records */
    const rv=(t,vid,extra)=>{
      const txt=BX.plain[vid];
      return `<div class="rcard" data-v="${vid}"><div class="t">${t}</div>
        <div class="q">“${esc(txt.length>140?txt.slice(0,140)+'…':txt)}”</div>
        <div class="r">${refStr(vid)}${extra?' · '+extra:''}</div></div>`;
    };
    const lc=S.longChapter, sc=S.shortChapter;
    const lcCi=BX.bookCh0[lc[0]]+lc[1]-1, scCi=BX.bookCh0[sc[0]]+sc[1]-1;
    h+=`<h2>Records</h2><div class="sub">click any card to read it in place</div><div class="rcards">
      ${rv('LONGEST VERSE',S.longVerse, BX.plain[S.longVerse].split(/\s+/).length+' words')}
      ${rv('SHORTEST VERSE',S.shortVerse,'2 words')}
      ${rv('THE MIDDLE VERSE OF THE BIBLE',S.middleVerse,'verse '+fmt(S.middleVerse+1)+' of '+fmt(S.totalVerses))}
      <div class="rcard" data-c="${lcCi}"><div class="t">LONGEST CHAPTER</div><div class="q">${B[lc[0]].n} ${lc[1]}</div><div class="r">${fmt(lc[2])} words · ${BX.ch[lcCi].nv} verses</div></div>
      <div class="rcard" data-c="${scCi}"><div class="t">SHORTEST CHAPTER</div><div class="q">${B[sc[0]].n} ${sc[1]}</div><div class="r">${fmt(sc[2])} words · ${BX.ch[scCi].nv} verses</div></div>
    </div>`;
    /* sentiment */
    h+=`<h2>The emotional shape of every book</h2>
    <div class="sub">AFINN sentiment of each book's text (green = brighter language, red = darker). Click a bar to see its chapter-by-chapter arc.</div>
    <div class="chart" id="sentChart"></div>
    <div class="chart" id="sentBook" style="margin-top:10px"></div>`;
    /* themes */
    h+=`<h2>Where the themes live</h2>
    <div class="sub">occurrences per 1,000 words, brightened per theme · hover for exact counts · click a cell to search that word in the book</div>
    <div class="chart" id="themeChart"></div>`;
    /* god names */
    h+=`<h2>The names of God across 66 books</h2>
    <div class="sub">mentions per 1,000 words — watch “LORD” (Jehovah) give way to “Jesus” at Matthew</div>
    <div class="legend" id="godLeg"></div><div class="chart" id="godChart"></div>`;
    /* top words */
    h+=`<h2>Most frequent words</h2><div class="sub">stop-words removed · click to search</div>
    <div class="chart wordbars" id="topWords"></div>`;
    /* hapax */
    h+=`<h2>Said once, never again</h2>
    <div class="sub">${fmt(S.hapaxCount)} words appear exactly one time in the whole KJV — a sampler (click to find the verse)</div>
    <div class="chart hxwrap" id="hapax"></div>
    <div class="note">Sources: KJV text (scrollmapper / kaiserlik, public domain) · cross-references from OpenBible.info (CC-BY) · people graph from Theographic Bible Metadata (CC-BY-SA) · Strong's dictionaries (Open Scriptures, public domain). Built as a single offline file.</div>`;
    w.innerHTML=h;
    w.addEventListener('click',e=>{
      const rc=e.target.closest('.rcard');
      if(rc){ if(rc.dataset.v) gotoVerse(+rc.dataset.v); else if(rc.dataset.c) gotoChapter(+rc.dataset.c); return; }
    });
    this.sentiment(); this.themes(); this.gods(); this.words();
  },
  bookSent(i){ const s=BX.d.stats.books[i].s; return s.reduce((a,b)=>a+b,0)/s.length; },
  sentiment(){
    const S=BX.d.stats, B=BX.d.books;
    const W=Math.max(920,66*14), H=170, mid=H/2;
    const vals=B.map((_,i)=>this.bookSent(i));
    const mx=Math.max(...vals.map(Math.abs));
    let s=`<svg width="${W}" height="${H+30}" font-family="system-ui" font-size="9">`;
    s+=`<line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="#272b3d"/>`;
    vals.forEach((v,i)=>{
      const x=i*(W/66)+2, bw=W/66-3;
      const bh=Math.abs(v)/mx*(mid-14);
      const y=v>=0?mid-bh:mid;
      const col=v>=0?'#7dbb72':'#cf6a79';
      s+=`<rect class="sb" data-b="${i}" x="${x}" y="${y}" width="${bw}" height="${Math.max(1.5,bh)}" fill="${col}" rx="1.5" style="cursor:pointer"><title>${B[i].n}: ${v.toFixed(2)} (avg per 100 words)</title></rect>`;
      if((W/66)>=13) s+=`<text x="${x+bw/2}" y="${H+10}" fill="${B[i].t?'#8a6f4d':'#565b70'}" text-anchor="middle" transform="rotate(45 ${x+bw/2} ${H+10})">${B[i].a}</text>`;
    });
    s+=`</svg>`;
    $('#sentChart').innerHTML=s;
    $('#sentChart').addEventListener('click',e=>{
      const r=e.target.closest('.sb'); if(r) this.sentBook(+r.dataset.b);
    });
    this.sentBook(17); // Job
  },
  sentBook(b){
    const st=BX.d.stats.books[b], B=BX.d.books;
    const n=st.s.length, W=Math.max(600,Math.min(1000,n*18)), H=150, mid=H/2;
    const mx=Math.max(1,...st.s.map(Math.abs));
    const pts=st.s.map((v,i)=>`${(i+0.5)*(W/n)},${mid-v/mx*(mid-12)}`).join(' ');
    let s=`<div style="color:var(--mut);font-size:12.5px;margin-bottom:8px"><b style="color:var(--gold2);font-family:Georgia,serif;font-size:15px">${B[b].n}</b> — chapter-by-chapter sentiment (${n} chapter${n===1?'':'s'})</div>`;
    s+=`<svg width="${W}" height="${H}" font-size="9">
      <line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="#272b3d"/>
      <polyline points="${pts}" fill="none" stroke="#d8ab4e" stroke-width="1.8" stroke-linejoin="round"/>`;
    st.s.forEach((v,i)=>{
      s+=`<circle cx="${(i+0.5)*(W/n)}" cy="${mid-v/mx*(mid-12)}" r="2.6" fill="${v>=0?'#7dbb72':'#cf6a79'}"><title>${B[b].n} ${i+1}: ${v.toFixed(1)}</title></circle>`;
    });
    s+=`</svg>`;
    $('#sentBook').innerHTML=s;
  },
  themes(){
    const S=BX.d.stats, B=BX.d.books, T=S.themes;
    const cw=Math.max(11,Math.min(15, 940/66)), chh=20, lw=64;
    const W=lw+66*cw+8, H=T.length*chh+34;
    // rate per 1000 words
    const rate=(ti,bi)=>S.books[bi].th[ti]/Math.max(1,S.books[bi].w)*1000;
    let s=`<svg width="${W}" height="${H}" font-family="system-ui" font-size="10">`;
    T.forEach((t,ti)=>{
      const mx=Math.max(...B.map((_,bi)=>rate(ti,bi)))||1;
      s+=`<text x="${lw-8}" y="${ti*chh+14}" fill="#9095a8" text-anchor="end">${t}</text>`;
      B.forEach((bk,bi)=>{
        const r=rate(ti,bi), a=Math.pow(r/mx,0.6);
        s+=`<rect class="tc" data-t="${t}" data-b="${bi}" x="${lw+bi*cw}" y="${ti*chh+3}" width="${cw-1.5}" height="${chh-5}" rx="2" fill="rgba(216,171,78,${(a*0.92+0.015).toFixed(3)})" style="cursor:pointer"><title>${t} in ${bk.n}: ${S.books[bi].th[ti]}× (${r.toFixed(1)}/1000 words)</title></rect>`;
      });
    });
    for(let bi=0;bi<66;bi+=1){
      if(cw>=13 || bi%2===0)
        s+=`<text x="${lw+bi*cw+cw/2}" y="${T.length*chh+12}" fill="${B[bi].t?'#8a6f4d':'#565b70'}" text-anchor="middle" font-size="8.4" transform="rotate(55 ${lw+bi*cw+cw/2} ${T.length*chh+12})">${B[bi].a}</text>`;
    }
    s+=`</svg>`;
    $('#themeChart').innerHTML=s;
    $('#themeChart').addEventListener('click',e=>{
      const c=e.target.closest('.tc'); if(!c) return;
      $('#sbox').value=c.dataset.t; runSearch(c.dataset.t);
    });
  },
  gods(){
    const S=BX.d.stats, B=BX.d.books, G=S.godNames;
    const cols=['#d8ab4e','#7aa2f7','#f7768e','#e0876a','#4fd6be'];
    $('#godLeg').innerHTML=G.map((g,i)=>`<span><i style="background:${cols[i]}"></i>${g}</span>`).join('');
    const cw=Math.max(12,940/66), H=190, W=66*cw+10;
    const totals=B.map((_,bi)=>G.reduce((s2,_g,gi)=>s2+S.books[bi].g[gi],0)/Math.max(1,S.books[bi].w)*1000);
    const mx=Math.max(...totals);
    let s=`<svg width="${W}" height="${H+34}" font-size="8.4" font-family="system-ui">`;
    B.forEach((bk,bi)=>{
      let y=H;
      const per1k=gi=>S.books[bi].g[gi]/Math.max(1,S.books[bi].w)*1000;
      G.forEach((g,gi)=>{
        const h2=per1k(gi)/mx*(H-10);
        if(h2>0.4){ y-=h2; s+=`<rect x="${bi*cw+2}" y="${y}" width="${cw-3}" height="${h2}" fill="${cols[gi]}" rx="1"><title>${g} in ${bk.n}: ${S.books[bi].g[gi]}× (${per1k(gi).toFixed(1)}/1000w)</title></rect>`; }
      });
      if(cw>=13 || bi%2===0) s+=`<text x="${bi*cw+cw/2}" y="${H+12}" fill="${bk.t?'#8a6f4d':'#565b70'}" text-anchor="middle" transform="rotate(55 ${bi*cw+cw/2} ${H+12})">${bk.a}</text>`;
    });
    s+=`</svg>`;
    $('#godChart').innerHTML=s;
  },
  words(){
    const S=BX.d.stats;
    const top=S.topWords.slice(0,26);
    const mx=top[0][1];
    $('#topWords').innerHTML=top.map(([w,c])=>
      `<div class="wb" data-w="${w}" style="cursor:pointer"><div class="ww">${w}</div><div class="wt"><div class="wf" style="width:${(c/mx*100).toFixed(1)}%"></div></div><div class="wc">${fmt(c)}</div></div>`).join('');
    $('#topWords').addEventListener('click',e=>{
      const b=e.target.closest('.wb'); if(b){ $('#sbox').value=b.dataset.w; runSearch(b.dataset.w); }
    });
    $('#hapax').innerHTML=S.hapaxSample.map(w2=>`<span class="chip" data-w="${w2}">${w2}</span>`).join('');
    $('#hapax').addEventListener('click',e=>{
      const c=e.target.closest('.chip'); if(c){ $('#sbox').value=c.dataset.w; runSearch(c.dataset.w); }
    });
  }
};

/* ============ BOOT ============ */
(async function(){
  try{
    await loadData();
  }catch(e){ console.error(e); return; }
  document.getElementById('loader').style.display='none';
  BX.inited.arcs = true;
  BX.views.arcs.init();
})();
/*EOF:dash*/
