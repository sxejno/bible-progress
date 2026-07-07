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
