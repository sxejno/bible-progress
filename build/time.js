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
