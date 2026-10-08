const $=s=>document.querySelector(s),N=x=>Math.round(x).toLocaleString('en-US'),P=x=>(x*100).toFixed(1)+'%',D1=x=>(+x).toFixed(1);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const T={quick:['مكاسب سريعة','#2563eb'],content:['فرص محتوى','#7c3aed'],ctr:['فرص تحسين CTR','#b45309'],link:['فرص روابط داخلية','#0d9488'],cannibal:['تكرار المنافسة (Cannibalization)','#dc2626'],low:['صفحات ضعيفة الأداء','#64748b']};
const PR={high:'عالية',med:'متوسطة',low:'منخفضة'};
const PW={ctr:'الصفحة ظاهرة فعلًا في الصفحة الأولى، فتحسين العنوان والوصف لا يتطلب تغيير الترتيب.',quick:'الكلمات قريبة من الصفحة الأولى أو أعلاها، وتحسينات المحتوى الموجّهة غالبًا أقل تكلفة من إنشاء صفحات جديدة.',content:'هناك طلب بحث ظاهر لكن الموقع ضعيف في النتائج، مما يشير لفجوة في تغطية النية.',link:'صفحات تظهر لعدة استعلامات بمتوسط ترتيب متوسط وقد تستفيد من دعم داخلي.',cannibal:'تعدد الصفحات لنفس الاستعلام يشتت الإشارات ويصعّب على Google اختيار الصفحة الأنسب.',low:'ظهور بلا نقرات تقريبًا: إما أن المحتوى لا يطابق النية أو أن الصفحة لا تستحق الاستثمار.'};
const PA={ctr:'اختبر عناوين ووصفًا أكثر توافقًا مع نية البحث وراقب CTR 2–4 أسابيع.',quick:'حدّث المحتوى وعمّقه، حسّن H1، وأضف روابط داخلية بنص مرتبط بالكلمة.',content:'راجع أعلى النتائج للكلمة وأنشئ أو وسّع المحتوى ليغطي النية بالكامل.',link:'أضف روابط داخلية من صفحات قوية وذات صلة بنص وصفي.',cannibal:'حدد صفحة رئيسية لكل استعلام ثم ادمج أو فرّق نية بقية الصفحات.',low:'قيّم الصفحة: حسّنها، أو ادمجها مع صفحة أقوى، أو فكّر في إزالتها بحذر.'};
let ROWS=[],TITLES={},ITEMS=[],VIEW=[],pageNo=1,TOT={},SZ=20,fname='';

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
const RX=[['title',/title|عنوانالصفحة|^العنوان$/],['ctr',/ctr|نسبةالنقر|معدلالنقر/],['clicks',/click|^النقرات$|^نقرات$|^عددالنقرات$/],['impr',/impression|ظهور|انطباع/],['pos',/position|موضع|ترتيب|المركز/],['page',/page|url|landing|صفح|رابط/],['query',/quer|keyword|استعلام|كلمة|عبارة/]];
function detect(h){const m={};h.forEach((x,i)=>{const n=String(x).toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g,'');for(const[k,r]of RX)if(!(k in m)&&r.test(n)){m[k]=i;break}});return m}
function toRows(sheets){let best,bs=-1;
 for(const tb of sheets){const m=detect(tb[0]||[]);const s=['query','page','impr','pos','clicks'].filter(k=>k in m).length+(('query'in m&&'page'in m)?3:0);if(s>bs){bs=s;best={tb,m}}}
 const{tb,m}=best;
 if(!('impr'in m)||!('pos'in m)||!('query'in m||'page'in m))throw new Error('لم أتعرف على الأعمدة المطلوبة. يجب أن يحتوي الملف على: الاستعلام أو الصفحة، مع مرات الظهور ومتوسط الترتيب (Position).');
 const rows=tb.slice(1).map(r=>({q:'query'in m?String(r[m.query]).trim():'(غير محدد)',p:'page'in m?String(r[m.page]).trim():'',t:'title'in m?String(r[m.title]).trim():'',c:'clicks'in m?(toNum(r[m.clicks])||0):0,i:toNum(r[m.impr]),pos:toNum(r[m.pos])})).filter(r=>r.i>0&&isFinite(r.pos));
 if(!rows.length)throw new Error('لا توجد صفوف صالحة (مرات الظهور والترتيب يجب أن تكون أرقامًا).');
 return rows}

/* ---------- التحليل ---------- */
const EX=[.28,.15,.11,.08,.065,.05,.04,.032,.027,.023];
function ectr(p){if(p<=1)return EX[0];if(p>=10)return Math.max(.003,.023*Math.exp(-(p-10)/8));const i=Math.floor(p),f=p-i;return EX[i-1]+(EX[i]-EX[i-1])*f}
const posS=p=>p<=3?4:p<=10?20:p<=15?16:p<=20?11:p<=30?6:2;
function analyze(rows){
 const hasP=rows.some(r=>r.p),hasQ=rows.some(r=>r.q!=='(غير محدد)'),si=rows.map(r=>r.i).sort((a,b)=>a-b),thr=Math.max(20,si[si.length>>1]||0);
 const pg={},qg={},out=[],can=new Set();
 rows.forEach(r=>{const a=pg[r.p]||(pg[r.p]={u:r.p,i:0,c:0,w:0,n:0,t:'',top:r});a.i+=r.i;a.c+=r.c;a.w+=r.pos*r.i;a.n++;if(!a.t&&r.t)a.t=r.t;if(r.i>a.top.i)a.top=r;(qg[r.q.toLowerCase()]||(qg[r.q.toLowerCase()]=[])).push(r)});
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
 out.forEach(o=>{const a=pg[o.u];o.ti=(a&&a.t)||'';o.tsrc=o.ti?'file':'url';if(!o.ti)o.ti=slugTitle(o.u);if(!o.n)o.n=a?a.n:1});
 const M={i:1,g:1,c:1};out.forEach(o=>{M.i=Math.max(M.i,o.i);M.g=Math.max(M.g,o.gain);M.c=Math.max(M.c,o.c)});
 out.forEach(o=>{const l=Math.log1p;
  o.score=Math.round(Math.min(100,l(o.i)/l(M.i)*25+l(o.gain)/l(M.g)*30+posS(o.pos)+(o.pos<=20?Math.max(0,Math.min(1,(o.ex-o.ctr)/o.ex))*15:0)+l(o.c)/l(M.c)*5+o.rel));
  o.pr=o.score>=60?'high':o.score>=35?'med':'low';
  enrich(o)});
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
const INT={'معلوماتي':'المستخدم يبحث عن شرح أو إجابة؛ يفضّل أن تظهر الإجابة المباشرة في أول الصفحة ثم التفاصيل.','تجاري / شرائي':'المستخدم قريب من قرار الشراء أو التحميل؛ يهمه السعر والمواصفات والثقة وخطوة الإجراء التالية.','مقارنة / اكتشاف':'المستخدم يقارن الخيارات؛ يحتاج معايير واضحة وفروقًا ملموسة وترشيحًا حسب الحالة.','عام':'النية غير واضحة من الصياغة؛ راجع نتائج البحث الفعلية لتحديد نوع الصفحة المتوقع.'};
function intent(q){q=q.toLowerCase();if(/كيف|ما هو|ما هي|ماهو|ماهي|طريقة|شرح|لماذا|ليه|دليل|تعلم|اتعلم|how|what|why|guide|tutorial/.test(q))return'معلوماتي';if(/سعر|اسعار|أسعار|شراء|اشتري|تحميل|عروض|خصم|كوبون|price|buy|cheap|discount|download/.test(q))return'تجاري / شرائي';if(/افضل|أفضل|مقارنة|مراجعة|ضد|\bvs\b|best|top|review|compare/.test(q))return'مقارنة / اكتشاف';return'عام'}
function slugTitle(u){let p=String(u||'').replace(/^https?:\/\/[^\/]+/,'').split(/[?#]/)[0].split('/').filter(Boolean).pop();if(!p)return'الصفحة الرئيسية';try{p=decodeURIComponent(p)}catch(e){}return p.replace(/\.\w{2,5}$/,'').replace(/[-_+]+/g,' ').trim()||'الصفحة الرئيسية'}
function sugg(o){const q=o.q.trim();if(!q||q==='(غير محدد)')return null;const y=new Date().getFullYear(),I=o.it;
 const t={'معلوماتي':[`${q}: دليل شامل خطوة بخطوة (${y})`,`${q}؟ الشرح الكامل مع أمثلة عملية`,`كل ما تحتاج معرفته عن ${q}`],
 'تجاري / شرائي':[`${q} | السعر والمواصفات (${y})`,`${q}: ما يجب معرفته قبل القرار`,`${q} — دليل الشراء والمقارنة`],
 'مقارنة / اكتشاف':[`${q} (${y}): مقارنة وترشيحات`,`${q}: المزايا والعيوب والسعر`,`${q} — كيف تختار الأنسب لك`],
 'عام':[`${q}: كل ما تحتاج معرفته (${y})`,`${q} | دليل عملي مختصر`,`${q} — معلومات وأسئلة شائعة`]}[I];
 const m={'معلوماتي':`${q}: شرح مبسّط يوضّح الفكرة والخطوات الأساسية والأخطاء الشائعة مع أمثلة عملية. اقرأ الدليل وطبّق ما يناسبك.`,'تجاري / شرائي':`تعرّف على ${q}: السعر والمواصفات وأهم النقاط قبل اتخاذ القرار. راجع التفاصيل واختر الأنسب لاحتياجك.`,'مقارنة / اكتشاف':`قارن بين الخيارات المتاحة لـ ${q} من حيث المزايا والعيوب والسعر، واعرف أيها يناسب حالتك.`,'عام':`كل ما يخص ${q} في صفحة واحدة: معلومات واضحة وأمثلة وإجابات عن الأسئلة الشائعة.`}[I];
 return{t,m}}
function diag(t,q){const r=[],l=[...t].length;r.push(l>60?[`طويل (${l} حرفًا) وقد يُقتطع في النتائج`,1]:l<25?[`قصير (${l} حرفًا) ولا يستغل المساحة`,1]:[`الطول مناسب (${l} حرفًا)`,0]);
 const w=q.toLowerCase().split(/\s+/).filter(x=>x.length>2),h=w.filter(x=>t.toLowerCase().includes(x)).length;
 if(w.length)r.push(h/w.length<.6?['لا يتضمن معظم كلمات الاستعلام',1]:['يتضمن كلمات الاستعلام',0]);return r}
function steps(o){const q=o.q,s=D1(o.pos),I=o.it;return{
 ctr:[`افتح نتيجة البحث الفعلية للاستعلام «${q}» وقارن عنوانك ووصفك بأعلى 3 نتائج: ما الذي يَعِد به كل منهم وما الذي ينقصك؟`,`اجعل العنوان يبدأ بالاستعلام أو معناه القريب وبطول ~55–60 حرفًا (راجع العناوين المقترحة).`,`أعد كتابة الوصف (~140–155 حرفًا): فائدة واضحة + دعوة لإجراء، بشرط أن يطابق محتوى الصفحة فعلًا.`,`غيّر عنصرًا واحدًا في كل مرة (العنوان أو الوصف) لتعرف سبب أي تغيّر.`,`سجّل الوضع الحالي قبل التعديل (CTR ${P(o.ctr)} ونقرات ${N(o.c)}) وتاريخ التعديل.`,`قارن بعد 3–4 أسابيع على فترة زمنية مماثلة؛ إن لم يتحسن CTR جرّب صياغة أخرى.`],
 quick:[`تأكد أن الصفحة المستهدفة هي الأنسب لهذا الاستعلام (النية: ${I}).`,`قارن محتواك بالنتائج الأعلى: ما الأقسام والأسئلة التي يغطونها وتنقصك؟`,`أضف أو وسّع الأقسام الناقصة، وضع إجابة مباشرة في أول الصفحة.`,`حدّث H1 والعنوان ليتوافقا مع الاستعلام (المركز الحالي ${s}).`,`أضف 3–5 روابط داخلية من صفحات ذات صلة بنص رابط وصفي مثل «${q}».`,`حدّث المعلومات القديمة (تواريخ/أرقام/صور) ثم اطلب إعادة الفهرسة من Search Console.`,`راقب المركز والنقرات بعد 4–6 أسابيع قبل أي استنتاج.`],
 content:[`افحص نتائج الصفحة الأولى للاستعلام «${q}» وحدد نوع المحتوى الغالب (دليل، قائمة، منتج، مقارنة…).`,`قرر: هل صفحتك الحالية من النوع الصحيح؟ إن لم تكن، فالأفضل صفحة مخصصة للاستعلام.`,`ابنِ مخططًا يغطي الأسئلة الفرعية التي تظهر في النتائج والأسئلة ذات الصلة.`,`أضف قيمة فريدة (أمثلة، بيانات، صور أصلية، خبرة مباشرة) بدل إعادة صياغة ما هو موجود.`,`اربط الصفحة داخليًا من 3 صفحات قوية على الأقل.`,`اطلب الفهرسة وراقب 6–8 أسابيع؛ هذا النوع أبطأ نتيجةً وأعلى جهدًا.`],
 link:[`اختر 5–10 صفحات قوية وذات صلة بموضوع الصفحة المستهدفة.`,`أضف رابطًا من كل صفحة بنص وصفي مثل «${q}» مع تنويع الصياغة وعدم التكرار الحرفي المفرط.`,`ضع الروابط داخل سياق المحتوى لا في الفوتر فقط.`,`تأكد أن الصفحة ليست «يتيمة» وأن عمق النقر من الرئيسية قليل.`,`راجع عنوان الصفحة ومحتواها ليخدم الاستعلامات الأخرى التي تظهر لها (${o.n} استعلامات).`,`قِس التغير بعد 4–6 أسابيع.`],
 cannibal:[`الصفحة الرئيسية المقترحة للاستعلام: ${o.u} (الأعلى نقرات/ظهورًا).`,`افتح كل صفحة متنافسة (${(o.urls||[]).slice(1).join(' ، ')||'—'}) وحدد: هل تخدم نية مختلفة فعلًا؟`,`إن كانت متشابهة: ادمج المحتوى النافع في الصفحة الرئيسية ثم حوّل الأخرى بـ 301.`,`إن كانت مختلفة: فرّق العناوين وH1 والمحتوى ليستهدف كل صفحة نية واضحة.`,`حدّث الروابط الداخلية لتشير إلى الصفحة الرئيسية بنص «${q}».`,`راقب 4–8 أسابيع عبر تقرير الأداء بفلتر الاستعلام وعرض الصفحات.`],
 low:[`تحقق من أن الصفحة مفهرسة وليست مكررة أو ضعيفة المحتوى.`,`افحص إن كانت لها قيمة أخرى (روابط خارجية، تحويلات، زيارات من قنوات أخرى).`,`إن كان موضوعها مهمًا: حدّث المحتوى وحسّن العنوان وأضف روابط داخلية.`,`إن كانت قديمة أو مكررة: ادمجها في صفحة أقوى مع 301.`,`إن لم تكن لها قيمة: فكّر في noindex أو الحذف مع تحويل مناسب بعد المراجعة.`,`لا تتخذ قرار الحذف من فترة بيانات قصيرة؛ استخدم 3 أشهر على الأقل.`]}[o.t]}
function enrich(o){const s=`المركز ${D1(o.pos)}`,exC=o.i*o.ex,gap=Math.max(0,exC-o.c);o.it=intent(o.q);
 o.eff={ctr:'منخفض',quick:'متوسط',content:'عالٍ',link:'منخفض',cannibal:'متوسط',low:'متوسط'}[o.t];
 o.why={ctr:`الكلمة في ${s} وتحصل على ${N(o.i)} ظهور، لكن CTR الحالي ${P(o.ctr)} أقل من المعدل التقريبي المتوقع (~${P(o.ex)}).`,quick:`الكلمة في ${s} مع ${N(o.i)} ظهور؛ قريبة من الصفحة الأولى أو من أعلاها، وتحسين موجّه قد يحسّن الظهور الفعلي.`,content:`${N(o.i)} ظهور لكن في ${s} (بعد الصفحة الثانية)؛ غالبًا لا تغطي الصفحة النية بشكل كافٍ.`,link:`الصفحة تظهر لـ ${o.n} استعلامات بمتوسط ${s} ومجموع ${N(o.i)} ظهور؛ الدعم الداخلي قد يساعدها.`,cannibal:`الاستعلام تظهر له ${(o.urls||[]).length} صفحات من موقعك بمتوسط ${s}، فتتوزع الإشارات بينها.`,low:`الصفحة حصلت على ${N(o.i)} ظهور و${N(o.c)} نقرة فقط بمتوسط ${s}.`}[o.t];
 o.det=[o.why,`الأرقام: ${N(o.i)} ظهور، ${N(o.c)} نقرة، CTR ${P(o.ctr)} عند ${s}.`];
 if(o.pos<=20)o.det.push(`المقارنة: المعدل التقريبي لهذا المركز ~${P(o.ex)} أي نحو ${N(exC)} نقرة متوقعة مقابل ${N(o.c)} فعلية${gap>0?` (فجوة ≈ ${N(gap)} نقرة)`:' (لا فجوة واضحة)'}. مرجع تقريبي وليس رقمًا رسميًا؛ يختلف حسب شكل النتيجة وميزات البحث.`);
 o.det.push(`نية البحث المرجّحة: ${o.it}. ${INT[o.it]}`,`المكسب المحتمل: ~${N(o.gain)} نقرة خلال فترة البيانات في سيناريو متحفظ. تقدير نظري وليس وعدًا.`,o.i<200?'مستوى الثقة: منخفض نسبيًا (حجم الظهور صغير)؛ اختبر بحذر وتحقق على فترة أطول.':'مستوى الثقة: جيد، حجم الظهور كافٍ لاستنتاج أولي.',`الجهد المتوقع: ${o.eff}.`);
 o.st=steps(o);o.act=o.st.join(' | ')}
function copy(t){try{navigator.clipboard.writeText(t)}catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove()}}
function render(){const pgs=Math.max(1,Math.ceil(VIEW.length/SZ));pageNo=Math.min(pageNo,pgs);
 $('#cnt').textContent=`${N(VIEW.length)} فرصة مطابقة من أصل ${N(ITEMS.length)}`;$('#pg').textContent=`${pageNo} / ${pgs}`;$('#prev').disabled=pageNo<=1;$('#next').disabled=pageNo>=pgs;
 const s=VIEW.slice((pageNo-1)*SZ,pageNo*SZ);
 $('#list').innerHTML=s.length?s.map(o=>{const own=TITLES[o.u],known=own||o.tsrc=='file',ttl=own||o.ti,sg=sugg(o),row=x=>`<div class="sr"><span>${esc(x)}</span><small>${[...x].length} حرف</small><button class="btn" data-copy="${esc(x)}">نسخ</button></div>`;
 return `<article class="item" style="--c:${T[o.t][1]}"><div class="ih"><div><div class="q">${esc(o.q)}</div><div class="u">${esc(o.u||'—')}</div></div>
 <div class="badges"><span class="b" style="--c:${T[o.t][1]}">${T[o.t][0]}</span><span class="b pr-${o.pr}">أولوية ${PR[o.pr]}</span><span class="b" style="--c:#475569">نية: ${o.it}</span><span class="b" style="--c:#475569">جهد: ${o.eff}</span><span class="sc" data-tip="درجة فرصة السيو (0–100): مقياس تقديري خاص بهذا التطبيق وليس مقياسًا رسميًا من Google." tabindex="0">${o.score}</span></div></div>
 <div class="m"><div><span>المركز الحالي</span>${D1(o.pos)}</div><div><span>مرات الظهور</span>${N(o.i)}</div><div><span>CTR</span>${P(o.ctr)}</div><div><span>النقرات</span>${N(o.c)}</div><div><span>مكسب نظري محتمل</span>~${N(o.gain)} نقرة</div></div>
 <div class="tb"><div class="tl">عنوان الصفحة الحالي <em>(${own?'أدخلته أنت':o.tsrc=='file'?'من الملف':'مستنتج من الرابط — غير مؤكد'})</em></div><div class="tt">${esc(ttl)}</div>
 <div class="chips">${known?diag(ttl,o.q).map(c=>`<span class="ch ${c[1]?'w':'g'}">${c[1]?'⚠':'✓'} ${c[0]}</span>`).join(''):'<span class="ch">ملفات Search Console لا تتضمن عناوين الصفحات، فهذا الاسم مستنتج من الرابط. أدخل العنوان الفعلي لتشخيصه:</span>'}</div>
 <input class="ti" data-u="${esc(o.u)}" placeholder="الصق عنوان الصفحة الفعلي (title) هنا ثم اضغط Enter" value="${esc(own||'')}"></div>
 ${sg?`<div class="sg"><div class="tl">عناوين مقترحة للاختبار</div>${sg.t.map(row).join('')}<div class="tl">وصف (Meta description) مقترح</div>${row(sg.m)}<div class="priv">قوالب مبنية على الاستعلام ونيته: عدّلها لتطابق محتوى الصفحة فعلًا، وأضف السنة فقط إذا كان المحتوى محدّثًا فعلًا.</div></div>`:''}
 <div class="tl">لماذا هذه فرصة؟</div><ul class="dl">${o.det.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
 <div class="tl">الإجراء المقترح — خطوات تفصيلية</div><ol class="dl act">${o.st.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>${o.urls&&o.urls.length>1?`<div class="u">الصفحات المتنافسة: ${o.urls.map(esc).join(' | ')}</div>`:''}</article>`}).join(''):'<div class="note">لا توجد فرص مطابقة للفلاتر الحالية. جرّب توسيع المعايير.</div>'}
$('#list').addEventListener('click',e=>{const b=e.target.closest('[data-copy]');if(b){copy(b.dataset.copy);b.textContent='تم ✓';setTimeout(()=>b.textContent='نسخ',1200)}});
$('#list').addEventListener('change',e=>{if(e.target.classList.contains('ti')){const v=e.target.value.trim();if(v)TITLES[e.target.dataset.u]=v;else delete TITLES[e.target.dataset.u];render()}});
function overview(){const B=[['1–3',0,3],['4–10',3,10],['11–20',10,20],['21–50',20,50],['+50',50,1e9]].map(([l,a,b])=>{const r=ROWS.filter(x=>x.pos>a&&x.pos<=b||(a==0&&x.pos<=b));return{l,i:r.reduce((s,x)=>s+x.i,0),c:r.reduce((s,x)=>s+x.c,0)}}),mx=Math.max(1,...B.map(x=>x.i));
 const bar=(l,v,m,t,c)=>`<div class="br"><span>${l}</span><i><b style="width:${Math.max(2,v/m*100)}%;background:${c}"></b></i><em>${t}</em></div>`;
 const g={};ITEMS.forEach(o=>g[o.t]=(g[o.t]||0)+o.gain);const gm=Math.max(1,...Object.values(g)),mid=B[1].i+B[2].i;
 $('#pOv').innerHTML=`<div class="kpi" style="margin-bottom:12px"><span>منطقة الفرص (المراكز 4–20)</span><strong>${P(mid/TOT.i)} من إجمالي الظهور</strong><span>هذه المراكز عادةً أكثر قابلية للتحسين من التركيز على الصفحات الأولى فقط.</span></div>
 <div class="ov"><div class="kpi"><h2>الظهور والنقرات حسب المركز</h2>${B.map(x=>bar(x.l,x.i,mx,`${N(x.i)} ظهور · ${N(x.c)} نقرة`,'var(--acc)')).join('')}</div>
 <div class="kpi"><h2>المكسب النظري حسب نوع الفرصة</h2>${Object.keys(g).sort((a,b)=>g[b]-g[a]).map(k=>bar(T[k][0],g[k],gm,`~${N(g[k])} نقرة`,T[k][1])).join('')||'لا توجد فرص'}<span class="priv">تقديرات نظرية متحفظة وليست وعدًا.</span></div></div>`}
function plan(){const g={};ITEMS.forEach(o=>{const x=g[o.t]||(g[o.t]={t:o.t,n:0,gain:0,sc:0,ex:[]});x.n++;x.gain+=o.gain;x.sc+=o.score;if(x.ex.length<3)x.ex.push(o.q)});
 const L=Object.values(g).sort((a,b)=>(b.sc/b.n*Math.log1p(b.gain))-(a.sc/a.n*Math.log1p(a.gain)));
 $('#pPlan').innerHTML=L.length?L.map((x,i)=>`<div class="plan" style="--c:${T[x.t][1]}"><div class="n">${i+1}</div><dl><dt>ما الذي نصلحه أولًا</dt><dd><b>${T[x.t][0]}</b> — ${N(x.n)} عنصر، مثل: ${x.ex.map(e=>'«'+esc(e)+'»').join('، ')}</dd>
 <dt>لماذا</dt><dd>${PW[x.t]}</dd><dt>الفرصة المتوقعة</dt><dd>حتى ~${N(x.gain)} نقرة إضافية خلال فترة البيانات (تقدير نظري متحفظ، غير مضمون)</dd><dt>الإجراء الموصى به</dt><dd>${PA[x.t]}</dd></dl></div>`).join(''):'<div class="note">لم تُكتشف فرص كافية في هذه البيانات.</div>'}
function show(rows,name){ITEMS=analyze(rows);fname=name;TITLES={};ROWS=rows;kpis();plan();overview();
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
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.setAttribute('aria-selected',x==b));[['top','pTop'],['plan','pPlan'],['ov','pOv']].forEach(([k,id])=>$('#'+id).hidden=b.dataset.t!=k)});
$('#exp').onclick=()=>{const h=['الاستعلام','الرابط','عنوان الصفحة الحالي','مصدر العنوان','عنوان مقترح 1','عنوان مقترح 2','عنوان مقترح 3','وصف مقترح','المركز','مرات الظهور','CTR','النقرات','درجة الفرصة','نوع الفرصة','الأولوية','نية البحث','الجهد','لماذا فرصة','خطوات الإجراء','مكسب نظري محتمل (نقرات)'];
 const q=v=>'"'+String(v).replace(/"/g,'""').replace(/^([=+\-@])/,"'$1")+'"';
 const rows=VIEW.map(o=>{const sg=sugg(o)||{t:['','',''],m:''},own=TITLES[o.u];return[o.q,o.u,own||o.ti,own?'أدخله المستخدم':o.tsrc=='file'?'الملف':'مستنتج من الرابط',...sg.t,sg.m,D1(o.pos),Math.round(o.i),P(o.ctr),Math.round(o.c),o.score,T[o.t][0],PR[o.pr],o.it,o.eff,o.det.join(' | '),o.st.map((x,i)=>(i+1)+'. '+x).join(' | '),Math.round(o.gain)].map(q).join(',')});
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+h.map(q).join(',')+'\n'+rows.join('\n')],{type:'text/csv;charset=utf-8'}));a.download='seo-opportunities.csv';a.click();URL.revokeObjectURL(a.href)};
