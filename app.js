'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n).toLocaleString('en-US');
const pct=n=>(n*100).toFixed(2)+'%';

/* Generic CTR-by-position curve (heuristic, not site specific) */
const EXP=[0,.28,.15,.10,.07,.055,.043,.035,.029,.024,.02];
function expCtr(p){
  if(p<=1)return EXP[1];
  if(p<=10){const a=Math.floor(p);return EXP[a]+(EXP[Math.min(a+1,10)]-EXP[a])*(p-a)}
  if(p<=20)return .02-(p-10)*.0012;
  if(p<=50)return Math.max(.003,.008-(p-20)*.00015);
  return .002;
}
const TYPES={
  quick:{label:'Quick Win',why:'Pages ranking just off the top spots already have relevance. Small improvements can move them into higher-CTR positions.',act:'Refresh the content, strengthen title/H1 alignment with intent, and add internal links to these pages.'},
  content:{label:'Content Opportunity',why:'Queries with real demand where you rank beyond page 2 usually need deeper or better-matched content.',act:'Review the SERP, expand coverage of subtopics and intent, or create a dedicated page.'},
  ctr:{label:'CTR Opportunity',why:'These rank well but earn fewer clicks than a generic curve suggests, which may point to weak snippets.',act:'Test clearer titles and meta descriptions, check rich-result eligibility and compare with competing snippets.'},
  link:{label:'Internal Link Opportunity',why:'These pages rank on page 1–2 for several queries, so topical relevance exists but authority signals may be thin.',act:'Add contextual internal links from relevant, stronger pages using descriptive anchor text.'},
  cannibal:{label:'Cannibalization',why:'Several of your URLs get impressions for the same query, which can split signals and clicks.',act:'Decide on a primary URL; consolidate, differentiate intent, or adjust internal links and canonicals.'},
  low:{label:'Low-Value Page',why:'These pages collect impressions but almost no clicks, so they may add little value in search.',act:'Check intent match and quality; improve, merge, redirect or noindex only after review.'}
};

/* ---------- CSV ---------- */
function parseCSV(t){
  t=t.replace(/^\uFEFF/,'');
  const h=t.slice(0,t.search(/\r?\n|$/));
  const d=(h.match(/;/g)||[]).length>(h.match(/,/g)||[]).length?';':(!h.includes(',')&&h.includes('\t')?'\t':',');
  const rows=[];let r=[],f='',q=false;
  for(let i=0;i<t.length;i++){const c=t[i];
    if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
    else if(c==='"')q=true;
    else if(c===d){r.push(f);f=''}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;r.push(f);f='';if(r.length>1||r[0]!=='')rows.push(r);r=[]}
    else f+=c}
  if(f!==''||r.length){r.push(f);rows.push(r)}
  return{rows,comma:d===';'};
}
const AL={query:['query','queries','topqueries','searchquery','keyword','keywords'],page:['page','pages','toppages','url','landingpage'],clicks:['clicks'],impressions:['impressions'],position:['position','avgposition','averageposition','avgpos']};
const num=(s,c)=>{s=String(s||'').replace(/[%\s]/g,'');s=c?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');return parseFloat(s)};
function toRecords(text){
  const{rows,comma}=parseCSV(text);
  if(rows.length<2)throw new Error('The file has no data rows. Export a Performance report from Search Console and try again.');
  const head=rows[0].map(x=>x.toLowerCase().replace(/[^a-z]/g,''));
  const col={};for(const k in AL)col[k]=head.findIndex(x=>AL[k].includes(x));
  const miss=['clicks','impressions','position'].filter(k=>col[k]<0);
  if(col.query<0&&col.page<0)miss.unshift('query or page');
  if(miss.length)throw new Error('Missing column(s): '+miss.join(', ')+'. Found: '+rows[0].join(', ')+'.');
  const out=[];
  for(let i=1;i<rows.length;i++){const r=rows[i];
    const c=num(r[col.clicks],comma),im=num(r[col.impressions],comma),p=num(r[col.position],comma);
    if(!(im>0)||isNaN(p))continue;
    out.push({q:col.query>=0?(r[col.query]||'').trim():'(all queries)',u:col.page>=0?(r[col.page]||'').trim():'(all pages)',c:isNaN(c)?0:c,i:im,p});
  }
  if(!out.length)throw new Error('No valid rows found. Check that Impressions and Position contain numbers.');
  return out;
}

/* ---------- Analysis ---------- */
function analyze(raw){
  const m=new Map();
  for(const r of raw){const k=r.q+'\u0001'+r.u,e=m.get(k);
    if(e){e.c+=r.c;e.i+=r.i;e.pw+=r.p*r.i}else m.set(k,{q:r.q,u:r.u,c:r.c,i:r.i,pw:r.p*r.i})}
  const rows=[...m.values()].map(r=>({q:r.q,u:r.u,c:r.c,i:r.i,p:r.pw/r.i,ctr:r.c/r.i}));
  const T=rows.reduce((a,r)=>(a.c+=r.c,a.i+=r.i,a.pw+=r.p*r.i,a),{c:0,i:0,pw:0});
  const sorted=rows.map(r=>r.i).sort((a,b)=>a-b);
  const thr=Math.max(10,sorted[Math.floor(sorted.length*.4)]||10);
  const opps=[];
  const add=(type,o)=>{if(o.gain>0.5||type==='low')opps.push({type,...o})};
  const pages=new Map(),queries=new Map();
  for(const r of rows){
    (pages.get(r.u)||pages.set(r.u,[]).get(r.u)).push(r);
    (queries.get(r.q)||queries.set(r.q,[]).get(r.q)).push(r);
    if(r.i<thr)continue;
    const e=expCtr(r.p),g=(t)=>r.i*t-r.c;
    if(r.p<=10&&r.ctr<.7*e)add('ctr',{q:r.q,u:r.u,p:r.p,i:r.i,c:r.c,ctr:r.ctr,gain:g(e),gap:1-r.ctr/e,rel:0,
      why:`Ranks at position ${r.p.toFixed(1)} with ${fmt(r.i)} impressions, but CTR is ${pct(r.ctr)} versus roughly ${pct(e)} typical for this position.`,
      act:'Test a more intent-aligned title and meta description; check the live SERP for competing features.'});
    else if(r.p>=4&&r.p<=15)add('quick',{q:r.q,u:r.u,p:r.p,i:r.i,c:r.c,ctr:r.ctr,gain:g(expCtr(Math.max(3,Math.ceil(r.p)-3))),gap:Math.max(0,1-r.ctr/e),rel:0,
      why:`Ranks at position ${r.p.toFixed(1)} with ${fmt(r.i)} impressions. A move up a few places could lift CTR from ${pct(r.ctr)}.`,
      act:'Improve on-page alignment with intent (title, H1, headings), add depth and internal links.'});
    else if(r.p>15&&r.p<=40)add('content',{q:r.q,u:r.u,p:r.p,i:r.i,c:r.c,ctr:r.ctr,gain:g(expCtr(Math.max(10,r.p-10))),gap:0,rel:0,
      why:`Gets ${fmt(r.i)} impressions at position ${r.p.toFixed(1)}, so demand exists but the page is likely too weak or off-intent to compete.`,
      act:'Audit the SERP for intent, expand or rewrite the content, or build a dedicated page.'});
  }
  for(const[u,rs]of pages){
    const pi=rs.reduce((s,r)=>s+r.i,0),pc=rs.reduce((s,r)=>s+r.c,0);
    const mid=rs.filter(r=>r.p>=5&&r.p<=20&&r.i>=thr/2);
    if(mid.length>=3&&pi>=thr){
      const top=mid.reduce((a,b)=>b.i>a.i?b:a);
      const gain=.5*mid.reduce((s,r)=>s+r.i*expCtr(Math.max(3,Math.ceil(r.p)-3))-r.c,0);
      add('link',{q:top.q,u,p:top.p,i:mid.reduce((s,r)=>s+r.i,0),c:mid.reduce((s,r)=>s+r.c,0),ctr:top.ctr,gain,gap:0,rel:.8,
        why:`This page ranks in positions 5–20 for ${mid.length} queries (top: “${top.q}”), which signals topical relevance that internal links may reinforce.`,
        act:'Add contextual internal links from relevant, stronger pages using varied descriptive anchors.'});
    }
    const pctr=pc/pi,pp=rs.reduce((s,r)=>s+r.p*r.i,0)/pi;
    if(rs.length>0&&u!=='(all pages)'&&pi>=thr*2&&pctr<.01&&pc<=Math.max(5,pi*.01))
      add('low',{q:rs.reduce((a,b)=>b.i>a.i?b:a).q,u,p:pp,i:pi,c:pc,ctr:pctr,gain:pi*.005,gap:Math.max(0,1-pctr/expCtr(pp)),rel:.3,
        why:`The page earned ${fmt(pi)} impressions across ${rs.length} queries but only ${fmt(pc)} clicks (${pct(pctr)}), at average position ${pp.toFixed(1)}.`,
        act:'Check search intent and content quality. Improve, merge or consolidate; avoid removal before reviewing links and conversions.'});
  }
  for(const[q,rs]of queries){
    const qi=rs.reduce((s,r)=>s+r.i,0);
    const comp=rs.filter(r=>r.i>=Math.max(qi*.05,thr/2));
    if(comp.length>=2&&qi>=thr&&q!=='(all queries)'){
      const best=comp.reduce((a,b)=>a.p<b.p?a:b),qc=rs.reduce((s,r)=>s+r.c,0);
      const gain=Math.max(qi*expCtr(best.p)-qc,qi*.01);
      add('cannibal',{q,u:best.u,p:best.p,i:qi,c:qc,ctr:qc/qi,gain,gap:0,rel:1,
        why:`${comp.length} URLs compete for this query (best at position ${best.p.toFixed(1)}). Others: ${comp.filter(r=>r!==best).slice(0,2).map(r=>r.u.replace(/^https?:\/\/[^/]+/,'')).join(', ')}.`,
        act:'Pick one primary URL. Consolidate or differentiate the others, and align internal links and canonicals.'});
    }
  }
  const mx=k=>Math.max(1,...opps.map(o=>o[k]));
  const mI=mx('i'),mG=mx('gain'),mC=mx('c');
  const L=(v,m)=>Math.log(1+v)/Math.log(1+m);
  for(const o of opps){
    const ps=o.p>3&&o.p<=10?18:o.p<=15?14:o.p<=20?10:o.p<=30?5:o.p<=3?4:2;
    o.score=Math.round(Math.min(100,25*L(o.i,mI)+30*L(Math.max(0,o.gain),mG)+ps+10*o.gap+7*L(o.c,mC)+10*o.rel));
    o.pri=o.score>=70?'High':o.score>=45?'Medium':'Low';
  }
  opps.sort((a,b)=>b.score-a.score||b.gain-a.gain);
  return{opps,kpi:{kw:queries.size,pg:pages.size,c:T.c,i:T.i,ctr:T.c/T.i,pos:T.pw/T.i,n:opps.length,hi:opps.filter(o=>o.pri==='High').length},thr};
}

/* ---------- UI ---------- */
let S=null,filtered=[],shown=30;
const show=(id,v)=>$(id).hidden=!v;
function load(getRaw,name){
  show('#intro',0);show('#results',0);show('#error',0);show('#loading',1);
  setTimeout(()=>{try{
    S=analyze(getRaw());S.name=name;render();
  }catch(e){show('#loading',0);show('#intro',1);$('#error').textContent=e.message;show('#error',1)}},30);
}
function readFile(f){
  if(!f)return;
  if(!/\.csv$/i.test(f.name)&&!/csv|text/.test(f.type)){$('#error').textContent='Please upload a .csv file exported from Google Search Console.';show('#error',1);return}
  $('#loadMsg').textContent='Reading '+f.name+'…';
  const rd=new FileReader();
  rd.onerror=()=>{$('#error').textContent='Could not read the file.';show('#error',1)};
  rd.onload=()=>load(()=>toRecords(rd.result),f.name);
  rd.readAsText(f);
}
function render(){
  show('#loading',0);show('#results',1);
  const k=S.kpi;
  $('#srcName').textContent=S.name;
  const K=[['Keywords',fmt(k.kw),'Unique queries in the file.'],['Pages',fmt(k.pg),'Unique URLs in the file.'],['Clicks',fmt(k.c),'Total clicks in the export period.'],['Impressions',fmt(k.i),'Times your pages appeared in results.'],['Avg. CTR',pct(k.ctr),'Total clicks ÷ total impressions.'],['Avg. position',k.pos.toFixed(1),'Impression-weighted average position.'],['Opportunities',fmt(k.n),'Items flagged by this tool’s heuristics.'],['High priority',fmt(k.hi),'Opportunities scoring 70 or more.']];
  $('#kpis').innerHTML=K.map((x,n)=>`<div class="kpi${n>5?' em':''}"><span class="kl" tabindex="0" data-tip="${esc(x[2])}">${x[0]}</span><b>${x[1]}</b></div>`).join('');
  const g={};for(const o of S.opps){const e=g[o.type]||(g[o.type]={n:0,hi:0,gain:0,s:0});e.n++;e.gain+=o.gain;e.s+=o.score;if(o.pri==='High')e.hi++}
  const plan=Object.entries(g).sort((a,b)=>b[1].s-a[1].s);
  $('#plan').innerHTML=plan.length?plan.map(([t,e],n)=>`<div class="step"><h3>${n+1}. ${TYPES[t].label}: ${e.n} item${e.n>1?'s':''}, ${e.hi} high priority</h3>
    <p><b>Why:</b> ${TYPES[t].why}</p><p><b>Expected opportunity:</b> roughly ${fmt(e.gain)} additional clicks per export period if fully realised (heuristic estimate, no guarantee).</p>
    <p style="grid-column:1/-1"><b>Recommended action:</b> ${TYPES[t].act}</p></div>`).join(''):'<div class="empty">No opportunities detected with the current thresholds.</div>';
  $('#fType').innerHTML='<option value="">All types</option>'+Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('');
  filter();
}
function filter(){
  const v=id=>$(id).value.trim(),t=v('#fType'),p=v('#fPri'),pn=parseFloat(v('#fPmin')),px=parseFloat(v('#fPmax')),im=parseFloat(v('#fImp')),q=v('#fQ').toLowerCase(),u=v('#fU').toLowerCase();
  filtered=S.opps.filter(o=>(!t||o.type===t)&&(!p||o.pri===p)&&(isNaN(pn)||o.p>=pn)&&(isNaN(px)||o.p<=px)&&(isNaN(im)||o.i>=im)&&(!q||o.q.toLowerCase().includes(q))&&(!u||o.u.toLowerCase().includes(u)));
  shown=30;list();
}
function list(){
  $('#count').textContent=`(${fmt(filtered.length)} of ${fmt(S.opps.length)})`;
  $('#list').innerHTML=filtered.length?filtered.slice(0,shown).map(o=>`<article class="opp"><div><h3>${esc(o.q)}</h3><div class="url">${esc(o.u)}</div>
    <div class="tags"><span class="tag">${TYPES[o.type].label}</span><span class="tag ${o.pri}">${o.pri} priority</span></div></div>
    <div class="score" data-tip="SEO Opportunity Score: a proprietary heuristic from 0–100, not a Google metric." tabindex="0"><b>${o.score}</b><small>score</small><div class="bar2"><i style="width:${o.score}%"></i></div></div>
    <div class="mets"><span>Position <b>${o.p.toFixed(1)}</b></span><span>Impressions <b>${fmt(o.i)}</b></span><span>CTR <b>${pct(o.ctr)}</b></span><span>Clicks <b>${fmt(o.c)}</b></span><span>Est. gain <b>+${fmt(o.gain)}</b></span></div>
    <p class="txt"><b>Why:</b> ${esc(o.why)}</p><p class="txt"><b>Action:</b> ${esc(o.act)}</p></article>`).join(''):'<div class="empty">No opportunities match these filters. Try widening them.</div>';
  show('#moreBtn',filtered.length>shown);
}
function exportCSV(){
  const cell=s=>{s=String(s);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
  const H=['Query','URL','Position','Impressions','CTR','Clicks','Opportunity Score','Opportunity Type','Priority','Estimated Click Gain','Why','Recommended Action'];
  const L=filtered.map(o=>[o.q,o.u,o.p.toFixed(2),Math.round(o.i),(o.ctr*100).toFixed(2)+'%',Math.round(o.c),o.score,TYPES[o.type].label,o.pri,Math.round(o.gain),o.why,o.act].map(cell).join(','));
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['\uFEFF'+H.join(',')+'\n'+L.join('\n')],{type:'text/csv'}));
  a.download='seo-opportunities.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

/* ---------- Demo data (synthetic, deterministic) ---------- */
function demo(){
  let s=11;const R=()=>(s=s*16807%2147483647)/2147483647;
  const base='https://www.example.com',topics=[['technical seo','/blog/technical-seo-checklist'],['keyword research','/blog/keyword-research-guide'],['link building','/blog/link-building-strategies'],['meta description','/blog/meta-description-best-practices'],['core web vitals','/blog/core-web-vitals-guide'],['schema markup','/blog/schema-markup-guide'],['seo audit','/blog/seo-audit-template'],['internal linking','/blog/internal-linking-seo'],['local seo','/services/local-seo'],['content strategy','/blog/content-strategy-framework'],['canonical tag','/blog/canonical-tags-explained'],['site speed','/blog/improve-site-speed']];
  const mods=['','checklist','guide','template','examples','tools','for beginners','best practices','how to','tips','free','audit','mistakes','vs','2026','strategy','tutorial','services','cost','software'];
  const out=[];
  topics.forEach(([t,u],ti)=>mods.forEach(m=>{
    if(R()<.25)return;
    const q=(m==='how to'?'how to do ':'')+t+(m&&m!=='how to'?' '+m:'');
    const p=1.2+Math.pow(R(),1.4)*40,im=Math.floor(Math.exp(3+R()*6)*(28/(p+6)));
    if(im<8)return;
    const c=Math.round(im*expCtr(p)*(.4+R()*1.1));
    out.push({q,u:base+u,c,i:im,p});
    if(R()<.14){const o=topics[(ti+1+Math.floor(R()*5))%topics.length][1],p2=p+2+R()*8,i2=Math.floor(im*(.3+R()*.5));out.push({q,u:base+o,c:Math.round(i2*expCtr(p2)),i:i2,p:p2})}
  }));
  return out;
}

/* ---------- Events ---------- */
const drop=$('#drop'),fi=$('#file');
drop.onclick=()=>fi.click();
drop.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fi.click()}};
fi.onchange=()=>{readFile(fi.files[0]);fi.value=''};
['dragenter','dragover'].forEach(n=>drop.addEventListener(n,e=>{e.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(n=>drop.addEventListener(n,e=>{e.preventDefault();drop.classList.remove('over')}));
drop.addEventListener('drop',e=>readFile(e.dataTransfer.files[0]));
$('#demoBtn').onclick=()=>{$('#loadMsg').textContent='Analyzing demo data…';load(demo,'Demo data (synthetic example.com)')};
$('#resetBtn').onclick=()=>{show('#results',0);show('#intro',1)};
$('#exportBtn').onclick=exportCSV;
$('#moreBtn').onclick=()=>{shown+=30;list()};
let tm;const deb=()=>{clearTimeout(tm);tm=setTimeout(filter,200)};
['#fType','#fPri'].forEach(i=>$(i).onchange=filter);
['#fPmin','#fPmax','#fImp','#fQ','#fU'].forEach(i=>$(i).oninput=deb);
