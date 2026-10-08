const $=s=>document.querySelector(s),N=x=>Math.round(x).toLocaleString('en-US'),P=x=>(x*100).toFixed(1)+'%',D1=x=>(+x).toFixed(1);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const T={quick:['مكاسب سريعة','#2563eb'],content:['فرص محتوى','#7c3aed'],ctr:['فرص تحسين CTR','#b45309'],link:['فرص روابط داخلية','#0d9488'],cannibal:['تكرار المنافسة (Cannibalization)','#dc2626'],low:['صفحات ضعيفة الأداء','#64748b']};
const PR={high:'عالية',med:'متوسطة',low:'منخفضة'};
const PW={ctr:'الصفحة ظاهرة فعلًا في الصفحة الأولى، فتحسين العنوان والوصف لا يتطلب تغيير الترتيب.',quick:'الكلمات قريبة من الصفحة الأولى أو أعلاها، وتحسينات المحتوى الموجّهة غالبًا أقل تكلفة من إنشاء صفحات جديدة.',content:'هناك طلب بحث ظاهر لكن الموقع ضعيف في النتائج، مما يشير لفجوة في تغطية النية.',link:'صفحات تظهر لعدة استعلامات بمتوسط ترتيب متوسط وقد تستفيد من دعم داخلي.',cannibal:'تعدد الصفحات لنفس الاستعلام يشتت الإشارات ويصعّب على Google اختيار الصفحة الأنسب.',low:'ظهور بلا نقرات تقريبًا: إما أن المحتوى لا يطابق النية أو أن الصفحة لا تستحق الاستثمار.'};
const PA={ctr:'اختبر عناوين ووصفًا أكثر توافقًا مع نية البحث وراقب CTR 2–4 أسابيع.',quick:'حدّث المحتوى وعمّقه، حسّن H1، وأضف روابط داخلية بنص مرتبط بالكلمة.',content:'راجع أعلى النتائج للكلمة وأنشئ أو وسّع المحتوى ليغطي النية بالكامل.',link:'أضف روابط داخلية من صفحات قوية وذات صلة بنص وصفي.',cannibal:'حدد صفحة رئيسية لكل استعلام ثم ادمج أو فرّق نية بقية الصفحات.',low:'قيّم الصفحة: حسّنها، أو ادمجها مع صفحة أقوى، أو فكّر في إزالتها بحذر.'};
let ITEMS=[],VIEW=[],pageNo=1,TOT={},SZ=20,fname='';

/* ---------- قراءة الملفات ---------- */
function parseCSV(t){t=t.replace(/^\uFEFF/,'');const f=t.split('\n')[0],d=[',',';','\t'].map(x=>[x,f.split(x).length]).sort((a,b)=>b[1]-a[1])[0][0];
 const rows=[];let r=[],c='',q=false;
 for(let i=0;i<t.length;i++){const ch=t[i];
  if(q){if(ch=='"'){if(t[i+1]=='"'){c+='"';i++}else q=false}else c+=ch}
  else if(ch=='"')q=true;else if(ch==d){r.push(c);c=''}
  else if(ch=='\n'){r.push(c.replace(/\r$/,''));rows.push(r);r=[];c=''}else c+=ch}
 if(c||r.length){r.push(c.replace(/\r$/,''));rows.push(r)}
 return rows.filter(r=>r.some(x=>String(x).trim()!==''))}
function toNum(v){if(typeof v=='number')return v;let s=String(v).trim().replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/٫/g,'.').replace(/[٬\s%]/g,'');
 s=/^-?\d+,\d{1,2}$/.test(s)?s.replace(',','.'):s.replace(/,/g,'');return parseFloat(s)}
const RX=[['ctr',/ctr|نسبةالنقر|معدلالنقر/],['clicks',/click|^النقرات$|^نقرات$|^عددالنقرات$/],['impr',/impression|ظهور|انطباع/],['pos',/position|موضع|ترتيب|المركز/],['page',/page|url|landing|صفح|رابط/],['query',/quer|keyword|استعلام|كلمة|عبارة/]];
function detect(h){const m={};h.forEach((x,i)=>{const n=String(x).toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g,'');for(const[k,r]of RX)if(!(k in m)&&r.test(n)){m[k]=i;break}});return m}
function toRows(sheets){let best,bs=-1;
 for(const tb of sheets){const m=detect(tb[0]||[]);const s=['query','page','impr','pos','clicks'].filter(k=>k in m).length+(('query'in m&&'page'in m)?3:0);if(s>bs){bs=s;best={tb,m}}}
 const{tb,m}=best;
 if(!('impr'in m)||!('pos'in m)||!('query'in m||'page'in m))throw new Error('لم أتعرف على الأعمدة المطلوبة. يجب أن يحتوي الملف على: الاستعلام أو الصفحة، مع مرات الظهور ومتوسط الترتيب (Position).');
 const rows=tb.slice(1).map(r=>({q:'query'in m?String(r[m.query]).trim():'(غير محدد)',p:'page'in m?String(r[m.page]).trim():'',c:'clicks'in m?(toNum(r[m.clicks])||0):0,i:toNum(r[m.impr]),pos:toNum(r[m.pos])})).filter(r=>r.i>0&&isFinite(r.pos));
 if(!rows.length)throw new Error('لا توجد صفوف صالحة (مرات الظهور والترتيب يجب أن تكون أرقامًا).');
 return rows}

/* ---------- التحليل ---------- */
const EX=[.28,.15,.11,.08,.065,.05,.04,.032,.027,.023];
function ectr(p){if(p<=1)return EX[0];if(p>=10)return Math.max(.003,.023*Math.exp(-(p-10)/8));const i=Math.floor(p),f=p-i;return EX[i-1]+(EX[i]-EX[i-1])*f}
const posS=p=>p<=3?4:p<=10?20:p<=15?16:p<=20?11:p<=30?6:2;
function analyze(rows){
 const hasP=rows.some(r=>r.p),hasQ=rows.some(r=>r.q!=='(غير محدد)'),si=rows.map(r=>r.i).sort((a,b)=>a-b),thr=Math.max(20,si[si.length>>1]||0);
 const pg={},qg={},out=[],can=new Set();
 rows.forEach(r=>{const a=pg[r.p]||(pg[r.p]={u:r.p,i:0,c:0,w:0,n:0,top:r});a.i+=r.i;a.c+=r.c;a.w+=r.pos*r.i;a.n++;if(r.i>a.top.i)a.top=r;(qg[r.q.toLowerCase()]||(qg[r.q.toLowerCase()]=[])).push(r)});
 rows.forEach(r=>{if(r.i<thr)return;const ctr=r.c/r.i,ex=ectr(r.pos);let t,g;
  if(r.pos<=10&&ctr<.7*ex){t='ctr';g=r.i*(ex-ctr)*.5}
  else if(r.pos>4&&r.pos<=20){t='quick';g=r.i*Math.max(0,ectr(r.pos>10?8:Math.max(1,Math.round(r.pos)-2))-ctr)*.5}
  else if(r.pos>20){t='content';g=r.i*Math.max(0,ectr(10)-ctr)*.3}else return;
  out.push({t,q:r.q,u:r.p,pos:r.pos,i:r.i,c:r.c,ctr,gain:g,ex,rel:pg[r.p].n>=3?3:0})});
 if(hasP)Object.values(pg).forEach(a=>{if(!a.u)return;const w=a.w/a.i,ctr=a.c/a.i,ex=ectr(w),b={q:a.top.q,u:a.u,pos:w,i:a.i,c:a.c,ctr,ex,n:a.n};
  if(a.n>=3&&w>=5&&w<=20&&a.i>=thr*2)out.push({...b,t:'link',gain:a.i*Math.max(0,ectr(Math.max(1,w-3))-ctr)*.3,rel:3});
  if(a.i>=thr&&a.c<=Math.max(1,a.i*.003)&&w>12)out.push({...b,t:'low',gain:a.i*Math.max(0,ectr(10)-ctr)*.15,rel:0})});
 if(hasP&&hasQ)Object.entries(qg).forEach(([k,a])=>{const ps={};a.forEach(r=>{const x=ps[r.p]||(ps[r.p]={u:r.p,i:0,c:0,w:0});x.i+=r.i;x.c+=r.c;x.w+=r.pos*r.i});
  const L=Object.values(ps),Tt=L.reduce((s,x)=>s+x.i,0),big=L.filter(x=>x.i>=Math.max(5,Tt*.1));if(big.length<2||Tt<thr)return;
  big.sort((x,y)=>y.c-x.c||y.i-x.i);const c=L.reduce((s,x)=>s+x.c,0),w=L.reduce((s,x)=>s+x.w,0)/Tt,best=Math.min(...big.map(x=>x.w/x.i));
  can.add(k);out.push({t:'cannibal',q:a[0].q,u:big[0].u,urls:big.map(x=>x.u),pos:w,i:Tt,c,ctr:c/Tt,gain:Tt*Math.max(0,ectr(Math.max(1,best-1))-c/Tt)*.5,ex:ectr(w),rel:5})});
 out.forEach(o=>{if(o.t!='cannibal'&&can.has(o.q.toLowerCase()))o.rel=Math.min(5,o.rel+2)});
 const M={i:1,g:1,c:1};out.forEach(o=>{M.i=Math.max(M.i,o.i);M.g=Math.max(M.g,o.gain);M.c=Math.max(M.c,o.c)});
 out.forEach(o=>{const l=Math.log1p;
  o.score=Math.round(Math.min(100,l(o.i)/l(M.i)*25+l(o.gain)/l(M.g)*30+posS(o.pos)+(o.pos<=20?Math.max(0,Math.min(1,(o.ex-o.ctr)/o.ex))*15:0)+l(o.c)/l(M.c)*5+o.rel));
  o.pr=o.score>=60?'high':o.score>=35?'med':'low';
  const s=`المركز ${D1(o.pos)}`;
  o.why={ctr:`الكلمة في ${s} وتحصل على ${N(o.i)} ظهور، لكن CTR الحالي ${P(o.ctr)} أقل من المعدل التقريبي المتوقع لهذا المركز (~${P(o.ex)}).`,
   quick:`الكلمة في ${s} مع ${N(o.i)} ظهور؛ قريبة من الصفحة الأولى أو من أعلاها، وتحسين موجّه قد يحسّن الظهور الفعلي.`,
   content:`${N(o.i)} ظهور لكن في ${s} (بعد الصفحة الثانية)؛ غالبًا لا تغطي الصفحة النية بشكل كافٍ.`,
   link:`الصفحة تظهر لـ ${o.n} استعلامات بمتوسط ${s} ومجموع ${N(o.i)} ظهور؛ الدعم الداخلي قد يساعدها.`,
   cannibal:`الاستعلام تظهر له ${(o.urls||[]).length} صفحات من موقعك بمتوسط ${s}، فتتوزع الإشارات بينها.`,
   low:`الصفحة حصلت على ${N(o.i)} ظهور و${N(o.c)} نقرة فقط بمتوسط ${s}.`}[o.t];
  o.act=PA[o.t]+(o.t=='link'?` (نص الرابط المقترح: «${o.q}»)`:'')});
 out.sort((a,b)=>b.score-a.score);
 const qs=new Set(rows.map(r=>r.q.toLowerCase())),pgs=new Set(rows.map(r=>r.p).filter(Boolean)),ci=rows.reduce((s,r)=>s+r.i,0),cc=rows.reduce((s,r)=>s+r.c,0);
 TOT={k:qs.size,p:pgs.size,c:cc,i:ci,ctr:cc/ci,pos:rows.reduce((s,r)=>s+r.pos*r.i,0)/ci,n:out.length,h:out.filter(o=>o.pr=='high').length,thr};
 return out}

/* ---------- العرض ---------- */
function kpis(){const k=[['إجمالي الكلمات',N(TOT.k),'عدد الاستعلامات الفريدة في الملف.'],['إجمالي الصفحات',N(TOT.p),'عدد روابط الصفحات الفريدة.'],['إجمالي النقرات',N(TOT.c),'عدد المرات التي نقر فيها المستخدمون على نتائجك.'],['مرات الظهور',N(TOT.i),'عدد مرات ظهور نتائجك في البحث.'],
 ['متوسط CTR',P(TOT.ctr),'النقرات ÷ مرات الظهور (موزون).'],['متوسط الترتيب',D1(TOT.pos),'متوسط موقعك مرجّحًا بمرات الظهور؛ الأقل أفضل.'],['إجمالي الفرص',N(TOT.n),'عدد الفرص المكتشفة بقواعد هذا التطبيق.'],['فرص عالية الأولوية',N(TOT.h),'الفرص التي تبلغ درجتها 60 فأكثر.']];
 $('#kpis').innerHTML=k.map((x,i)=>`<div class="kpi${i==7?' h':''}"><span data-tip="${x[2]}" tabindex="0">${x[0]}</span><strong>${x[1]}</strong></div>`).join('')}
function apply(){const f={t:$('#fT').value,p:$('#fP').value,a:+$('#fA').value||0,b:+$('#fB').value||999,m:+$('#fM').value||0,u:$('#fU').value.toLowerCase(),q:$('#fQ').value.toLowerCase()},k=$('#fS').value;
 VIEW=ITEMS.filter(o=>(!f.t||o.t==f.t)&&(!f.p||o.pr==f.p)&&o.pos>=f.a&&o.pos<=f.b&&o.i>=f.m&&(!f.u||(o.u||'').toLowerCase().includes(f.u))&&(!f.q||o.q.toLowerCase().includes(f.q)));
 VIEW.sort((x,y)=>y[k=='score'?'score':k]-x[k=='score'?'score':k]);pageNo=1;render()}
function render(){const pgs=Math.max(1,Math.ceil(VIEW.length/SZ));pageNo=Math.min(pageNo,pgs);
 $('#cnt').textContent=`${N(VIEW.length)} فرصة مطابقة من أصل ${N(ITEMS.length)}`;$('#pg').textContent=`${pageNo} / ${pgs}`;$('#prev').disabled=pageNo<=1;$('#next').disabled=pageNo>=pgs;
 const s=VIEW.slice((pageNo-1)*SZ,pageNo*SZ);
 $('#list').innerHTML=s.length?s.map(o=>`<article class="item" style="--c:${T[o.t][1]}"><div class="ih"><div><div class="q">${esc(o.q)}</div><div class="u">${esc(o.u||'—')}</div></div>
 <div class="badges"><span class="b" style="--c:${T[o.t][1]}">${T[o.t][0]}</span><span class="b pr-${o.pr}">أولوية ${PR[o.pr]}</span><span class="sc" data-tip="درجة فرصة السيو (0–100): مقياس تقديري خاص بهذا التطبيق وليس مقياسًا رسميًا من Google." tabindex="0">${o.score}</span></div></div>
 <div class="m"><div><span>المركز الحالي</span>${D1(o.pos)}</div><div><span>مرات الظهور</span>${N(o.i)}</div><div><span>CTR</span>${P(o.ctr)}</div><div><span>النقرات</span>${N(o.c)}</div><div><span>مكسب نظري محتمل</span>~${N(o.gain)} نقرة</div></div>
 <p class="why"><b>لماذا فرصة؟</b> ${o.why}</p><p class="act"><b>الإجراء المقترح:</b> ${esc(o.act)}</p>${o.urls&&o.urls.length>1?`<div class="u">الصفحات المتنافسة: ${o.urls.map(esc).join(' | ')}</div>`:''}</article>`).join(''):'<div class="note">لا توجد فرص مطابقة للفلاتر الحالية. جرّب توسيع المعايير.</div>'}
function plan(){const g={};ITEMS.forEach(o=>{const x=g[o.t]||(g[o.t]={t:o.t,n:0,gain:0,sc:0,ex:[]});x.n++;x.gain+=o.gain;x.sc+=o.score;if(x.ex.length<3)x.ex.push(o.q)});
 const L=Object.values(g).sort((a,b)=>(b.sc/b.n*Math.log1p(b.gain))-(a.sc/a.n*Math.log1p(a.gain)));
 $('#pPlan').innerHTML=L.length?L.map((x,i)=>`<div class="plan" style="--c:${T[x.t][1]}"><div class="n">${i+1}</div><dl><dt>ما الذي نصلحه أولًا</dt><dd><b>${T[x.t][0]}</b> — ${N(x.n)} عنصر، مثل: ${x.ex.map(e=>'«'+esc(e)+'»').join('، ')}</dd>
 <dt>لماذا</dt><dd>${PW[x.t]}</dd><dt>الفرصة المتوقعة</dt><dd>حتى ~${N(x.gain)} نقرة إضافية خلال فترة البيانات (تقدير نظري متحفظ، غير مضمون)</dd><dt>الإجراء الموصى به</dt><dd>${PA[x.t]}</dd></dl></div>`).join(''):'<div class="note">لم تُكتشف فرص كافية في هذه البيانات.</div>'}
function show(rows,name){ITEMS=analyze(rows);fname=name;kpis();plan();
 $('#fT').innerHTML='<option value="">الكل</option>'+Object.entries(T).map(([k,v])=>`<option value="${k}">${v[0]}</option>`).join('');
 $('#meta').textContent=`${name} — ${N(rows.length)} صف تم تحليله`;$('#hero').hidden=true;$('#app').hidden=false;apply();window.scrollTo(0,0)}

/* ---------- الإدخال ---------- */
const busy=(b,t)=>{$('#load').hidden=!b;if(t)$('#lt').textContent=t};
const tick=()=>new Promise(r=>setTimeout(r,40));
function fail(m){$('#err').textContent='⚠️ '+m;$('#err').hidden=false}
async function handle(file){if(!file)return;$('#err').hidden=true;busy(true,'جارٍ قراءة وتحليل الملف…');await tick();
 try{const ext=file.name.split('.').pop().toLowerCase();let sheets;
  if(ext=='xlsx'||ext=='xls'){if(typeof XLSX=='undefined')throw new Error('تعذّر تحميل مكتبة Excel (يلزم اتصال بالإنترنت لأول مرة). جرّب ملف CSV.');
   const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});sheets=wb.SheetNames.map(n=>XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:''}))}
  else if(['csv','txt'].includes(ext))sheets=[parseCSV(await file.text())];else throw new Error('صيغة غير مدعومة. استخدم .xlsx أو .xls أو .csv');
  show(toRows(sheets),file.name)}catch(e){fail(e.message||'حدث خطأ أثناء قراءة الملف.')}finally{busy(false)}}
function demo(){const D=[['افضل لابتوب للبرمجة','/blog/best-laptop-programming',7.2,18500,.45],['افضل لابتوب للبرمجة','/reviews/laptops',11.4,2600,1],['سعر ايفون 15 في مصر','/prices/iphone-15',5.3,22000,.6],['مقارنة ايفون و سامسونج','/compare/iphone-vs-samsung',9.8,9400,.4],
 ['كيف اتعلم السيو','/guides/seo-basics',12.6,7800,1],['دورة سيو مجانية','/guides/seo-basics',14.1,4200,1],['ما هو السيو','/guides/seo-basics',8.9,6100,1],['اساسيات السيو للمبتدئين','/guides/seo-basics',16.3,3300,1],['كيف اتعلم السيو','/courses/seo',15.2,1800,1],
 ['افضل سماعات بلوتوث','/blog/best-headphones',3.1,15000,1],['اصلاح بطء الكمبيوتر','/tips/fix-slow-pc',18.4,5200,1],['طريقة عمل سيرة ذاتية','/blog/cv-guide',6.5,12800,.5],['نماذج سيرة ذاتية جاهزة','/templates/cv',4.4,11000,1.1],
 ['برنامج تحرير الفيديو مجانا','/software/free-video-editor',24.6,8700,1],['افضل شاشة للالعاب','/blog/gaming-monitor',27.3,6400,1],['تحميل برنامج ويندوز 11','/downloads/windows-11',33.5,3900,1],['ما هو الذكاء الاصطناعي','/blog/what-is-ai',9.2,14500,.55],
 ['seo audit checklist','/blog/seo-audit',6.8,5400,.5],['كيف تزيد سرعة الموقع','/guides/site-speed',10.7,4700,1],['تحسين سرعة ووردبريس','/guides/site-speed',13.2,2900,1],['استضافة ووردبريس','/hosting/wordpress',19.8,2400,1],
 ['اخبار التكنولوجيا اليوم','/news/tech-archive-2021',41.2,900,1],['اسعار الذهب','/old/gold-2020',46.8,1200,1],['وصفة كيك الشوكولاتة','/recipes/chocolate-cake',2.4,8000,1],['طريقة عمل بيتزا','/recipes/pizza',5.9,9700,.9],['افضل vpn','/reviews/vpn',8.1,6800,.55]];
 let s=7;const rnd=()=>(s=(s*9301+49297)%233280)/233280;
 show(D.map(d=>({q:d[0],p:'https://example.com'+d[1],pos:d[2],i:d[3],c:Math.round(d[3]*ectr(d[2])*d[4]*(.85+.3*rnd()))})),'بيانات تجريبية (Demo)')}
const drop=$('#drop');
drop.onclick=()=>$('#file').click();drop.onkeydown=e=>{if(e.key=='Enter'||e.key==' '){e.preventDefault();$('#file').click()}};
$('#file').onchange=e=>{handle(e.target.files[0]);e.target.value=''};
['dragenter','dragover'].forEach(v=>drop.addEventListener(v,e=>{e.preventDefault();drop.classList.add('on')}));
['dragleave','drop'].forEach(v=>drop.addEventListener(v,e=>{e.preventDefault();drop.classList.remove('on')}));
drop.addEventListener('drop',e=>handle(e.dataTransfer.files[0]));
$('#demo').onclick=async()=>{busy(true);await tick();try{demo()}finally{busy(false)}};
$('#reset').onclick=()=>{$('#app').hidden=true;$('#hero').hidden=false};
$('#prev').onclick=()=>{pageNo--;render();window.scrollTo(0,200)};$('#next').onclick=()=>{pageNo++;render();window.scrollTo(0,200)};
let dt;['fT','fP','fS'].forEach(i=>$('#'+i).onchange=apply);['fA','fB','fM','fU','fQ'].forEach(i=>$('#'+i).oninput=()=>{clearTimeout(dt);dt=setTimeout(apply,250)});
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.setAttribute('aria-selected',x==b));$('#pTop').hidden=b.dataset.t!='top';$('#pPlan').hidden=b.dataset.t!='plan'});
$('#exp').onclick=()=>{const h=['الاستعلام','الرابط','المركز','مرات الظهور','CTR','النقرات','درجة الفرصة','نوع الفرصة','الأولوية','السبب','الإجراء المقترح','مكسب نظري محتمل (نقرات)'];
 const q=v=>'"'+String(v).replace(/"/g,'""').replace(/^([=+\-@])/,"'$1")+'"';
 const rows=VIEW.map(o=>[o.q,o.u,D1(o.pos),Math.round(o.i),P(o.ctr),Math.round(o.c),o.score,T[o.t][0],PR[o.pr],o.why,o.act,Math.round(o.gain)].map(q).join(','));
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+h.map(q).join(',')+'\n'+rows.join('\n')],{type:'text/csv;charset=utf-8'}));a.download='seo-opportunities.csv';a.click();URL.revokeObjectURL(a.href)};
