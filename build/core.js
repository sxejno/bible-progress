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
    if(single ? (L.indexOf(ql)>=0 && re && re.test(L)) : L.indexOf(ql)>=0) hits.push(i);
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
