
(()=>{'use strict';
const DB='studyspace_premium_v1', STORE='state', SNAPSHOT_STORE='snapshots', DRAFT_STORE='drafts', DB_VERSION=3, KEY='main', OLDKEY='so_tay_du_an_on_tap_v1';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const state={data:{version:3,projects:[],newsEntries:{},settings:{autoSpeak:false,rate:1,activeMode:'study'}},selected:null,page:'home',nodeTab:'notebook',newsDate:localDateKey(),newsMonth:localDateKey().slice(0,7),expanded:new Set(),query:'',modalSave:null,pendingImages:[],editImages:[],removeMedia:new Set(),db:null,flushNotebook:null};
const uid=()=>crypto?.randomUUID?.()||'id-'+Date.now().toString(36)+Math.random().toString(36).slice(2);
const MODE_META={work:{label:'Công việc',kicker:'WORKSPACE · CÔNG VIỆC',title:'Không gian công việc',desc:'Tổ chức công việc và theo dõi các dự án đang triển khai.',icon:'💼',color:'#3977df'},study:{label:'Học tập',kicker:'WORKSPACE · HỌC TẬP',title:'Không gian học tập',desc:'Tập trung vào môn học, ghi chú, câu hỏi và tiến độ ôn luyện.',icon:'📚',color:'#159b80'},fun:{label:'Giải trí',kicker:'WORKSPACE · GIẢI TRÍ',title:'Không gian giải trí',desc:'Lưu trữ sở thích, ý tưởng và những dự án sáng tạo.',icon:'✨',color:'#9366cf'},olympia:{label:'Olympia',kicker:'OLYMPIA 2026 · QUESTION STUDIO',title:'Không gian Olympia',desc:'Biên soạn, phân loại, luyện tập và kiểm định các bộ câu hỏi Olympia 2026.',icon:'🏆',color:'#9a70d6'}};
function activeRoots(){return state.data.projects.filter(n=>(n.mode||'study')===state.data.settings.activeMode);}
const now=()=>new Date();const iso=()=>new Date().toISOString();
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function toast(s){const el=$('#toast');el.textContent=s;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2600);}
function openDB(){return new Promise((resolve,reject)=>{if(!('indexedDB'in window))return reject(Error('IndexedDB unavailable'));const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function dbGet(){return new Promise((resolve,reject)=>{const tx=state.db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).get(KEY);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function dbPut(v){return new Promise((resolve,reject)=>{const tx=state.db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(v,KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
function normalizeQ(q){const created=q.createdAt||iso();const review=q.review?{step:q.review.step??-1,next:q.review.next||null,last:q.review.last||null,reviews:q.review.reviews||0,lapses:q.review.lapses||0}:{step:-1,next:null,last:null,reviews:0,lapses:0};if(review.step===-1&&!review.last&&!review.reviews&&!review.lapses)review.next=null;return {id:String(q.id||uid()),question:String(q.question||''),answer:String(q.answer||''),tags:Array.isArray(q.tags)?q.tags.map(String):[],language:q.language||'auto',images:Array.isArray(q.images)?q.images:[],audio:q.audio||null,createdAt:created,updatedAt:q.updatedAt||iso(),review};}
function normalizeNotePages(source){const fallback=String(source?.noteHTML||'');const raw=Array.isArray(source?.notePages)?source.notePages:null;const pages=(raw&&raw.length?raw:[{html:fallback}]).map(pg=>typeof pg==='string'?{html:pg,manualBreak:false,keepPage:false}:{html:String(pg?.html||''),manualBreak:!!pg?.manualBreak,keepPage:!!pg?.keepPage});return pages.length?pages:[{html:fallback,manualBreak:false,keepPage:false}];}
function normalizeNode(n){const notePages=normalizeNotePages(n);return {id:String(n.id||uid()),name:String(n.name||'Mục chưa đặt tên'),description:String(n.description||''),mode:['work','study','fun','olympia'].includes(n.mode)?n.mode:'study',children:Array.isArray(n.children)?n.children.map(normalizeNode):[],questions:Array.isArray(n.questions)?n.questions.map(normalizeQ):[],noteHTML:String(n.noteHTML||notePages.map(p=>p.html).join('')),notePages,paperStyle:['grid','ruled','dot'].includes(n.paperStyle)?n.paperStyle:'grid',paperTheme:['classic','botanical','vintage','lavender','minimal','rose','ocean','mint','sunset'].includes(n.paperTheme)?n.paperTheme:'classic',paperFrame:['double','floral','corners','dashed','minimal','none'].includes(n.paperFrame)?n.paperFrame:'double',noteUpdatedAt:n.noteUpdatedAt||null,createdAt:n.createdAt||iso(),updatedAt:n.updatedAt||iso()};}
function normalizeNewsEntry(entry,date){const notePages=normalizeNotePages(entry||{});return {date,noteHTML:String(entry?.noteHTML||notePages.map(p=>p.html).join('')),notePages,paperStyle:['grid','ruled','dot'].includes(entry?.paperStyle)?entry.paperStyle:'grid',paperTheme:['classic','botanical','vintage','lavender','minimal','rose','ocean','mint','sunset'].includes(entry?.paperTheme)?entry.paperTheme:'classic',paperFrame:['double','floral','corners','dashed','minimal','none'].includes(entry?.paperFrame)?entry.paperFrame:'double',noteUpdatedAt:entry?.noteUpdatedAt||null};}
function localDateKey(date=new Date()){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return `${y}-${m}-${d}`;}
function isValidDateKey(key){if(!/^\d{4}-\d{2}-\d{2}$/.test(key||''))return false;const [y,m,d]=key.split('-').map(Number),v=new Date(y,m-1,d);return v.getFullYear()===y&&v.getMonth()===m-1&&v.getDate()===d;}
function formatDateLong(key){const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});}
function dateKeyFromDMY(value){const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value||'');if(!m)return null;const d=Number(m[1]),mo=Number(m[2]),y=Number(m[3]),dt=new Date(y,mo-1,d);return dt.getFullYear()===y&&dt.getMonth()===mo-1&&dt.getDate()===d?`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`:null;}
let reviewMidnightTimer=null;
function scheduleReviewGateCheck(){
  clearTimeout(reviewMidnightTimer);
  const now=new Date(),next=new Date(now);next.setHours(24,0,1,0);
  reviewMidnightTimer=setTimeout(()=>{render();scheduleReviewGateCheck();},Math.max(1000,next-now));
}
async function init(){try{state.db=await openDB();let stored=await dbGet();if(stored){state.data=stored;}else{try{const old=JSON.parse(localStorage.getItem(OLDKEY)||'null');if(old?.projects||old?.newsEntries){state.data={version:3,projects:(old.projects||[]).map(normalizeNode),newsEntries:Object.fromEntries(Object.entries(old.newsEntries||{}).filter(([date])=>isValidDateKey(date)).map(([date,entry])=>[date,normalizeNewsEntry(entry,date)])),settings:old.settings||{autoSpeak:false,rate:1}};await save();toast('Đã chuyển dữ liệu cũ sang bộ lưu trữ mới.');}}catch(e){console.warn('Không có dữ liệu cũ để chuyển.',e);}}}catch(e){console.warn('IndexedDB không khả dụng, dùng localStorage.',e);try{const old=JSON.parse(localStorage.getItem('studyspace_fallback')||localStorage.getItem(OLDKEY)||'null');if(old?.projects||old?.newsEntries)state.data={version:3,projects:(old.projects||[]).map(normalizeNode),newsEntries:Object.fromEntries(Object.entries(old.newsEntries||{}).filter(([date])=>isValidDateKey(date)).map(([date,entry])=>[date,normalizeNewsEntry(entry,date)])),settings:old.settings||{autoSpeak:false,rate:1}};}catch(_){}}
state.data.settings ||= {autoSpeak:false,rate:1};state.data.newsEntries ||= {};state.data.projects=(state.data.projects||[]).map(normalizeNode);state.data.newsEntries=state.data.newsEntries&&typeof state.data.newsEntries==='object'?state.data.newsEntries:{};for(const [date,entry] of Object.entries(state.data.newsEntries)){if(isValidDateKey(date))state.data.newsEntries[date]=normalizeNewsEntry(entry,date);else delete state.data.newsEntries[date];}state.newsDate=isValidDateKey(state.data.settings.lastNewsDate)?state.data.settings.lastNewsDate:localDateKey();state.newsMonth=state.newsDate.slice(0,7);$('#autoSpeakSwitch').classList.toggle('on',!!state.data.settings.autoSpeak);$('#speechRate').value=String(state.data.settings.rate||1);render();}
async function save(){state.data.version=3;state.data.newsEntries ||= {};try{if(state.db)await dbPut(state.data);else localStorage.setItem('studyspace_fallback',JSON.stringify(state.data));$('#saveLabel').textContent='Đã lưu';return true;}catch(e){console.error(e);$('#saveLabel').textContent='Lỗi lưu';toast('Không lưu được. Có thể dung lượng trình duyệt đã đầy. Hãy xuất bản sao lưu.');return false;}}
function makeNode(name,description){return{id:uid(),name:name.trim(),description:description.trim(),icon:'📁',color:'',favorite:false,status:'active',children:[],questions:[],noteHTML:'',paperStyle:'grid',paperTheme:'classic',paperFrame:'double',noteUpdatedAt:null,createdAt:iso(),updatedAt:iso()};}
function formatStorageBytes(bytes){const n=Math.max(0,Number(bytes)||0);if(n<1024)return n+' B';if(n<1024*1024)return (n/1024).toFixed(1)+' KB';if(n<1024**3)return (n/1024**2).toFixed(1)+' MB';return (n/1024**3).toFixed(2)+' GB';}
async function updateStorageMeta(){
  try{if(navigator.storage?.estimate){const e=await navigator.storage.estimate();state.storageUsage=Number(e.usage)||0;state.storageQuota=Number(e.quota)||0;}}catch(_){state.storageUsage=null;state.storageQuota=null;}
  try{if(state.db){const list=await dbGetSnapshots();state.storageLastSnapshot=list[0]||null;state.storageSnapshotsCount=list.length;const lastAuto=list.find(x=>x.reason==='Tự động hằng ngày');state.storageLastAutoSnapshotAt=Date.parse(lastAuto?.createdAt||'')||0;}else{state.storageLastSnapshot=null;state.storageSnapshotsCount=0;}}catch(_){state.storageLastSnapshot=null;}
  const count=$('#storageSnapshotCount');if(count)count.textContent=String(state.storageSnapshotsCount||0);
  const autoAge=$('#storageAutoSnapshotInfo');if(autoAge){autoAge.textContent=state.storageLastAutoSnapshotAt?'Mốc tự động gần nhất: '+new Date(state.storageLastAutoSnapshotAt).toLocaleString('vi-VN'):'Chưa có mốc tự động';}
  const mini=$('#storageMiniLabel');if(mini){mini.textContent=state.storageFallbackActive?'Đang dùng bản dự phòng':!state.db?'Lưu dự phòng':state.storagePersistent===true?'Bảo vệ dài hạn':'IndexedDB · Đang lưu';}
  const pill=$('#storageCenter');if(pill)pill.dataset.state=state.storageFallbackActive?'warning':state.db?'ok':'error';
}
async function requestPersistentStorage(){
  if(!navigator.storage?.persist){toast('Trình duyệt này chưa hỗ trợ yêu cầu lưu trữ bền vững.');return;}
  try{const granted=await navigator.storage.persist();state.storagePersistent=!!granted;await updateStorageMeta();renderStorageManager();toast(granted?'Đã cấp quyền bảo vệ dữ liệu khỏi cơ chế dọn bộ nhớ thông thường.':'Trình duyệt chưa cấp quyền lưu trữ bền vững; hãy giữ các bản JSON sao lưu định kỳ.');}
  catch(err){console.warn(err);toast('Không thể yêu cầu quyền lưu trữ bền vững trên trình duyệt này.');}
}
async function renderStorageManager(){
  const modal=$('#storageModal');if(!modal)return;
  await updateStorageMeta();
  const persistent=$('#storagePersistentValue'),engine=$('#storageEngineValue'),usage=$('#storageUsageValue'),latest=$('#storageLatestValue'),listHost=$('#storageSnapshotList');
  if(engine)engine.textContent=state.db?(state.storageFallbackActive?'IndexedDB lỗi · đang dùng localStorage dự phòng':'IndexedDB · Kho chính'):'localStorage · Kho dự phòng';
  const count=$('#storageSnapshotCount');if(count)count.textContent=String(state.storageSnapshotsCount||0);
  if(persistent){persistent.textContent=state.storagePersistent===true?'Đã được cấp':state.storagePersistent===false?'Chưa được cấp':'Không xác định';persistent.dataset.state=state.storagePersistent===true?'good':state.storagePersistent===false?'warn':'neutral';}
  if(usage)usage.textContent=state.storageUsage!=null?`${formatStorageBytes(state.storageUsage)} / ${state.storageQuota?formatStorageBytes(state.storageQuota):'Không rõ giới hạn'}`:'Trình duyệt không cung cấp số liệu';
  if(latest)latest.textContent=state.storageLastSnapshot?`${state.storageLastSnapshot.reason} · ${new Date(state.storageLastSnapshot.createdAt).toLocaleString('vi-VN')}`:'Chưa có bản sao tự động';
  const historyTitle=$('.storage-history-heading h3');if(historyTitle)historyTitle.textContent='Lịch sử khôi phục · tối đa 50 mốc';
  if(!listHost)return;
  if(!state.db){listHost.innerHTML='<div class="storage-empty"><b>Chưa có kho IndexedDB.</b><span>Ứng dụng đang dùng bộ nhớ dự phòng của trình duyệt. Hãy xuất tệp JSON để giữ bản sao độc lập.</span></div>';return;}
  try{
    const list=await dbGetSnapshots();
    listHost.innerHTML=list.length?list.map((item,i)=>`<article class="storage-snapshot"><div class="storage-snapshot-icon ${item.reason==='Tự động hằng ngày'?'auto':''}">${item.reason==='Tự động hằng ngày'?'↻':'▣'}</div><div class="storage-snapshot-copy"><b>${esc(item.reason||'Bản sao lưu')}</b><small>${new Date(item.createdAt).toLocaleString('vi-VN')} · Phiên bản dữ liệu ${Number(item.revision)||0}</small></div><button type="button" class="btn plain tiny" data-restore-snapshot="${esc(item.id)}">Khôi phục</button></article>`).join(''):'<div class="storage-empty"><b>Chưa có bản sao.</b><span>Ứng dụng sẽ tạo bản đầu tiên sau lần lưu dữ liệu kế tiếp.</span></div>';
    $$('[data-restore-snapshot]',listHost).forEach(btn=>btn.onclick=()=>restoreStorageSnapshot(btn.dataset.restoreSnapshot));
  }catch(err){console.error(err);listHost.innerHTML='<div class="storage-empty"><b>Không đọc được lịch sử sao lưu.</b><span>Hãy tải lại ứng dụng trước khi thực hiện khôi phục.</span></div>';}
}
async function openStorageManager(){const modal=$('#storageModal');if(!modal)return;modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');document.body.classList.add('storage-open');await renderStorageManager();}
function closeStorageManager(){const modal=$('#storageModal');modal?.classList.remove('is-open');modal?.setAttribute('aria-hidden','true');document.body.classList.remove('storage-open');}
async function createStorageSnapshot(){
  if(state.storageIntegrityBlocked){toast('Chưa thể tạo bản sao từ dữ liệu chưa được xác minh. Hãy khôi phục trước.');return;}
  if(!(await flushBeforeLeave())){toast('Chưa thể sao lưu vì còn nội dung chưa lưu.');return;}
  if(!state.db){toast('IndexedDB không khả dụng. Hãy dùng nút Xuất JSON để tạo bản sao độc lập.');return;}
  try{await dbCreateSnapshot('Bản sao lưu thủ công',state.data);await updateStorageMeta();await renderStorageManager();toast('Đã tạo một mốc khôi phục thủ công.');}
  catch(err){console.error(err);toast('Không tạo được bản sao lưu. Hãy xuất JSON ngay để bảo vệ dữ liệu.');}
}
async function restoreStorageSnapshot(id){
  if(!state.db)return;
  const record=await dbGetSnapshot(id);if(!record?.data){toast('Bản sao lưu này không còn tồn tại.');await renderStorageManager();return;}
  if(!validSnapshotRecord(record)){toast('Mốc khôi phục có dấu hiệu hỏng dữ liệu; đã từ chối khôi phục để tránh ghi đè.');return;}
  if(!confirm(`Khôi phục dữ liệu từ “${record.reason}” lúc ${new Date(record.createdAt).toLocaleString('vi-VN')}? Dữ liệu đang có sẽ được lưu thành một mốc dự phòng trước khi khôi phục.`))return;
  const recoveringUntrusted=!!state.storageIntegrityBlocked;
  if(!recoveringUntrusted&&!(await flushBeforeLeave()))return;
  if(recoveringUntrusted){try{state.notebookDispose?.();}catch(_){}state.notebookDispose=null;state.flushNotebook=null;state.storeNotebookDraft=null;}
  if(!recoveringUntrusted){try{await dbCreateSnapshot('Trước khi khôi phục phiên bản cũ',state.data);}catch(err){console.error(err);toast('Không tạo được mốc bảo vệ dữ liệu hiện tại; đã hủy khôi phục.');return;}}
  const old=state.data,oldPage=state.page,oldSelected=state.selected,oldIntegrityBlocked=state.storageIntegrityBlocked;let restored;
  try{restored=normalizeData(record.data);const recoveryRevision=recoveringUntrusted?await currentStoredRevisionForRecovery():(Number(old._revision)||0);restored._revision=recoveryRevision;state.storageIntegrityBlocked=false;state.data=restored;state.page='home';state.selected=null;state.nodeTab='notebook';
    if(!await save()){state.data=old;state.page=oldPage;state.selected=oldSelected;state.storageIntegrityBlocked=oldIntegrityBlocked;render();toast('Khôi phục thất bại; dữ liệu hiện tại vẫn được giữ.');return;}
    state.newsDate=state.data.settings.lastNewsDate||localDateKey();state.newsMonth=state.newsDate.slice(0,7);render();closeStorageManager();toast('Đã khôi phục phiên bản dữ liệu đã chọn.');
  }catch(err){state.data=old;state.page=oldPage;state.selected=oldSelected;state.storageIntegrityBlocked=oldIntegrityBlocked;console.error(err);toast('Bản sao lưu không hợp lệ; dữ liệu hiện tại không thay đổi.');}
}
function bindStorageUI(){
  const center=$('#storageCenter'),modal=$('#storageModal');if(center)center.onclick=openStorageManager;
  $('#storageModalClose')?.addEventListener('click',closeStorageManager);
  $('#storageModalClose2')?.addEventListener('click',closeStorageManager);
  modal?.addEventListener('click',e=>{if(e.target===modal)closeStorageManager();});
  $('#storageSnapshotNow')?.addEventListener('click',createStorageSnapshot);
  $('#storageExportJSON')?.addEventListener('click',async()=>{if(await flushBeforeLeave()){await exportBackup();}});
  $('#storageRequestPersistent')?.addEventListener('click',requestPersistentStorage);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeStorageManager();});
}
function find(id,nodes=state.data.projects,parent=null){for(const n of nodes){if(n.id===id)return{node:n,parent,siblings:nodes};const x=find(id,n.children,n);if(x)return x;}return null;}
function pathOf(id){let found=[];function walk(ns,p=[]){for(const n of ns){const np=[...p,n];if(n.id===id){found=np;return true;}if(walk(n.children,np))return true;}return false;}walk(state.data.projects);return found;}
function folderSelectHTML(selectedId='',excludeNodeId=null,label='Thư mục cha'){
 const options=['<option value="">📁 Thư mục gốc</option>'];
 function walk(nodes,depth=0){for(const node of nodes){if(node.id===excludeNodeId)continue;options.push(`<option value="${esc(node.id)}" ${node.id===selectedId?'selected':''}>${'　'.repeat(depth)}📁 ${esc(node.name)}</option>`);walk(node.children,depth+1);}}
 walk(state.data.projects);
 return `<div class="field"><label for="parentId">${label}</label><select id="parentId" name="parentId">${options.join('')}</select></div>`;
}
function projectText(html){const box=document.createElement('div');box.innerHTML=String(html||'');return (box.textContent||'').replace(/\s+/g,' ').trim();}
function allProjectNodes(nodes=state.data.projects,out=[]){for(const node of nodes){out.push(node);allProjectNodes(node.children,out);}return out;}
function counts(nodes){let p=0,q=0,d=0;for(const n of nodes){p++;q+=n.questions.length;d+=n.questions.filter(x=>due(x)).length;const c=counts(n.children);p+=c.p;q+=c.q;d+=c.d;}return{p,q,d};}
function visitQuestions(nodes,out=[]){for(const n of nodes){for(const q of n.questions)out.push({q,node:n});visitQuestions(n.children,out);}return out;}
function due(q){return !!q.review?.next&&new Date(q.review.next).getTime()<=Date.now();}
function dueList(){const items=visitQuestions(activeRoots()).filter(x=>due(x.q));const groups=new Map();for(const item of items){if(!groups.has(item.node.id))groups.set(item.node.id,[]);groups.get(item.node.id).push(item);}for(const list of groups.values())list.sort((a,b)=>new Date(a.q.review.next)-new Date(b.q.review.next));const out=[];while([...groups.values()].some(list=>list.length)){for(const list of groups.values())if(list.length)out.push(list.shift());}return out;}
function addDays(date,n){const d=new Date(date);d.setDate(d.getDate()+n);return d.toISOString();}
function dateLabel(s){if(!s)return'Chưa lên lịch';return new Date(s).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});}
const intervals=[2,5,9,20,30,100,365];
function schedule(q){if(!q.review?.next)return 'Chưa có lịch ôn';if(due(q))return 'Đến hạn ôn tập';return 'Ôn tiếp: '+dateLabel(q.review.next);}
async function startCycle(q){q.review={step:0,next:addDays(iso(),2),last:iso(),reviews:q.review?.reviews||0,lapses:q.review?.lapses||0};await save();render();toast('Đã lên lịch ôn lần đầu sau 2 ngày.');}
async function remember(q){const r=q.review||{step:-1,reviews:0,lapses:0};const nextStep=Math.min(4,Math.max(0,(r.step??-1)+1));r.step=nextStep;r.next=addDays(iso(),intervals[nextStep]);r.last=iso();r.reviews=(r.reviews||0)+1;q.review=r;await save();render();toast('Đã ghi nhận. Lần ôn tiếp theo sau '+intervals[nextStep]+' ngày.');}
async function forgot(q){const r=q.review||{reviews:0,lapses:0};r.step=-1;r.next=addDays(iso(),1);r.last=iso();r.lapses=(r.lapses||0)+1;q.review=r;await save();render();toast('Đã ghi nhận câu chưa nhớ. Hẹn ôn lại ngày mai.');}
function render(){renderTree();renderMain();renderCrumb();$$('.mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.data.settings.activeMode));updateTopbarMenuState();$('#dueBadge').textContent=dueList().length;$('#newsBadge').textContent=Object.values(state.data.newsEntries||{}).filter(e=>hasNewsContent(e)).length;$('#projectCount').textContent=counts(activeRoots()).p;$('#autoSpeakSwitch').classList.toggle('on',!!state.data.settings.autoSpeak);$('#navHome').classList.toggle('active',state.page==='home'&&!state.selected);$('#navReview').classList.toggle('active',state.page==='review');$('#navNews').classList.toggle('active',state.page==='news');}
function globalSearchResults(query){const host=$('#globalSearchResults');if(!host)return;const q=(query||'').trim().toLocaleLowerCase('vi');if(q.length<2){host.classList.add('hidden');host.innerHTML='';return;}const results=[];const add=(kind,id,title,detail)=>results.push({kind,id,title,detail});
 function walk(nodes){for(const n of nodes){const path=pathOf(n.id).map(x=>x.name).join(' / ');if((n.name+' '+n.description).toLocaleLowerCase('vi').includes(q))add('project',n.id,'📁 '+n.name,path);(n.notePages||[]).forEach((pg,i)=>{const text=projectText(pg.html);if(text.toLocaleLowerCase('vi').includes(q))add('note',n.id,'📖 '+n.name+' · Trang '+(i+1),text.slice(0,130));});for(const qu of n.questions||[]){if((qu.question+' '+qu.answer+' '+(qu.tags||[]).join(' ')).toLocaleLowerCase('vi').includes(q))add('question',n.id,'❓ '+qu.question,path);}walk(n.children||[]);}}
 walk(activeRoots());
 for(const [date,entry] of Object.entries(state.data.newsEntries||{})){const text=(entry.notePages||[]).map(pg=>projectText(pg.html)).join(' ');if((date.split('-').reverse().join('/')+' '+text).toLocaleLowerCase('vi').includes(q))add('news',date,'🗓️ Tin tức · '+date.split('-').reverse().join('/'),text.slice(0,130));}
 host.innerHTML=results.length?results.slice(0,14).map(r=>`<button type="button" class="global-result" data-global-kind="${r.kind}" data-global-id="${esc(r.id)}"><b>${esc(r.title)}</b><small>${esc(r.detail||'')}</small></button>`).join(''):'<div class="global-search-empty">Không tìm thấy nội dung phù hợp.</div>';
 host.classList.remove('hidden');$$('[data-global-kind]',host).forEach(b=>b.onclick=async()=>{await state.flushNotebook?.();const kind=b.dataset.globalKind,id=b.dataset.globalId;if(kind==='news'){state.newsDate=id;state.newsMonth=id.slice(0,7);state.data.settings.lastNewsDate=id;await save();state.page='news';state.selected=null;}else{state.selected=id;state.page='home';state.nodeTab=kind==='question'?'questions':'notebook';}host.classList.add('hidden');$('#globalSearch').value='';render();});
}
function bindGlobalSearch(){const input=$('#globalSearch'),host=$('#globalSearchResults');if(!input)return;let searchTimer=null;input.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(async()=>{await state.flushNotebook?.();globalSearchResults(input.value);},180);});input.addEventListener('keydown',async e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(searchTimer);await state.flushNotebook?.();globalSearchResults(input.value);const first=$('[data-global-kind]',host);if(first)first.click();}if(e.key==='Escape'){host.classList.add('hidden');input.blur();}});document.addEventListener('click',e=>{if(!e.target.closest('.global-search-wrap'))host.classList.add('hidden');});document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();input.focus();input.select();}if(e.key==='Escape')host.classList.add('hidden');});}
function setupSidebarCollapse(){
  const app=$('#appShell'),sidebar=$('#sidebar'),button=$('#sidebarCollapse');if(!app||!sidebar||!button)return;
  let preferred=false;try{preferred=localStorage.getItem('studyspace_sidebar_collapsed')==='1';}catch(_){}
  const apply=(persist=true)=>{
    const compact=preferred&&window.innerWidth>980;
    app.classList.toggle('sidebar-collapsed',compact);sidebar.classList.toggle('collapsed',compact);
    button.setAttribute('aria-expanded',String(!compact));button.setAttribute('aria-label',compact?'Mở rộng thanh bên':'Thu gọn thanh bên');
    button.title=compact?'Mở rộng thanh bên':'Thu gọn thanh bên';button.innerHTML=compact?'<span>›</span>':'<span>‹</span>';
    if(persist)try{localStorage.setItem('studyspace_sidebar_collapsed',preferred?'1':'0');}catch(_){}
  };
  apply(false);
  button.onclick=()=>{preferred=!preferred;apply(true);};
  window.addEventListener('resize',()=>apply(false),{passive:true});
}

function renderCrumb(){const p=state.selected?pathOf(state.selected):[];const labels={tasks:'Kế hoạch',knowledge:'Bản đồ tri thức',ideas:'Không gian ý tưởng',stats:'Thống kê học tập',archive:'Lưu trữ & thùng rác',appearance:'Tùy chỉnh giao diện',practice:'Trung tâm luyện tập'};$('#crumb').innerHTML=state.page==='review'?'<b>Học tập</b><span>›</span><b>Lịch ôn tập</b>':state.page==='news'?'<b>StudySpace</b><span>›</span><b>Tin tức</b><span>›</span><span>'+esc(state.newsDate.split('-').reverse().join('/'))+'</span>':labels[state.page]?'<b>StudySpace</b><span>›</span><b>'+labels[state.page]+'</b>':!p.length?'<b>StudySpace</b><span>›</span><span>Tổng quan</span>':p.map((n,i)=>(i?'<span>›</span>':'')+(i===p.length-1?'<b>'+esc(n.name)+'</b>':'<span>'+esc(n.name)+'</span>')).join('');}
function renderTree(){
 const host=$('#tree');host.innerHTML='';const roots=activeRoots();if(!roots.length){host.innerHTML='<div class="tree-empty">Chưa có dự án trong chế độ này.</div>';return;}
 const seen=new Set();
 function build(nodes,depth=0){
  const frag=document.createDocumentFragment();if(depth>24)return frag;
  for(const n of nodes){if(!n||seen.has(n.id))continue;seen.add(n.id);
   const wrap=document.createElement('div'),row=document.createElement('div');row.className='tree-row';
   const toggle=document.createElement('button');toggle.className='tree-arrow';toggle.textContent=n.children.length?(state.expanded.has(n.id)?'⌄':'›'):'·';toggle.disabled=!n.children.length;toggle.onclick=()=>{state.expanded.has(n.id)?state.expanded.delete(n.id):state.expanded.add(n.id);renderTree();};
   const select=document.createElement('button');select.className='tree-select'+(state.selected===n.id&&state.page==='home'?' active':'');select.innerHTML='<span>📁</span><span class="tree-name"></span><span class="tree-num">'+(n.questions||[]).length+'</span>';$('.tree-name',select).textContent=n.name;
   select.onclick=async()=>{if(!(await flushBeforeLeave()))return;state.selected=n.id;state.page='home';state.nodeTab='notebook';render();$('#sidebar').classList.remove('open');};row.append(toggle,select);wrap.append(row);
   if(n.children.length&&state.expanded.has(n.id)){const sub=document.createElement('div');sub.className='tree-children';sub.append(build(n.children,depth+1));wrap.append(sub);}frag.append(wrap);
  }
  return frag;
 }
 host.append(build(roots));
}
function hero(title,desc,kicker='STUDYSPACE',buttons=''){return `<section class="hero"><div class="eyebrow">${kicker}</div><h1>${esc(title)}</h1><p>${esc(desc||'Xây dựng hệ thống kiến thức của riêng bạn, từng bước một.')}</p><div class="hero-buttons">${buttons}</div></section>`;}
function notebookToolbarMarkup(){return `<div class="paper-toolbar" aria-label="Công cụ trang vở">
 <div class="tool-group ink-tool-group"><span class="tool-caption">Viết tay & chọn nội dung</span><div class="tool-actions ink-actions"><button type="button" id="inkToggle" class="ink-toggle" aria-pressed="false" title="Bật/tắt chế độ viết tay bằng chuột hoặc bút cảm ứng">✍ Viết tay</button><button type="button" id="inkPen" title="Dùng bút vẽ">✎ Bút</button><button type="button" id="inkEraser" title="Tẩy các nét đã vẽ">⌫ Tẩy</button><button type="button" id="inkSelect" title="Chọn nội dung để áp dụng định dạng bằng thanh công cụ">☝ Chọn</button><label class="ink-color-label" title="Màu nét bút">Màu <input type="color" id="inkColor" value="#245fc7" aria-label="Màu nét bút"></label><select id="inkWidth" class="tool-select ink-width" title="Độ dày nét bút"><option value="2">Mảnh</option><option value="3.5" selected>Vừa</option><option value="5">Đậm</option><option value="8">Rất đậm</option></select></div><div class="tool-actions ink-actions"><button type="button" id="inkUndo" title="Hoàn tác nét vẽ cuối">↶ Nét cuối</button><button type="button" id="inkClear" title="Xóa toàn bộ nét vẽ trên trang hiện tại">Xóa nét trang</button></div><small class="ink-status" id="inkStatus">Tắt · Chọn “Viết tay” để vẽ trực tiếp lên giấy</small></div><i class="tool-sep"></i>
 <div class="tool-group"><span class="tool-caption">Chỉnh sửa</span><div class="tool-actions"><button data-cmd="undo" title="Hoàn tác">↶</button><button data-cmd="redo" title="Làm lại">↷</button></div></div><i class="tool-sep"></i>
 <div class="tool-group study-tool-entry"><span class="tool-caption">Học cụ đa lĩnh vực</span><div class="tool-actions"><button type="button" class="study-tools-launch" data-open-study-tools title="Mở bộ học cụ theo môn học">✦ Học cụ</button></div></div><i class="tool-sep"></i>
 <div class="tool-group paper-theme-group"><span class="tool-caption">Mẫu trang & viền vở</span><select id="paperTheme" class="tool-select decor-select" title="Chọn màu và phong cách giấy"><option value="classic">📘 Cổ điển xanh</option><option value="botanical">🌿 Lá xanh</option><option value="vintage">✿ Giấy vintage</option><option value="lavender">✧ Tím dịu</option><option value="minimal">◇ Tối giản</option><option value="rose">🌸 Hồng phấn</option><option value="ocean">🌊 Đại dương</option><option value="mint">🍃 Bạc hà</option><option value="sunset">🌅 Hoàng hôn</option></select><select id="paperFrame" class="tool-select decor-select" title="Chọn viền trang trí"><option value="double">✧ Viền đôi cổ điển</option><option value="floral">❀ Viền hoa mềm</option><option value="corners">✦ Góc trang trí</option><option value="dashed">┄ Viền nét đứt</option><option value="minimal">◇ Viền thanh mảnh</option><option value="none">Không viền</option></select><div class="paper-theme-swatches" aria-label="Chọn nhanh mẫu giấy">
 <button type="button" data-paper-theme="classic" title="Cổ điển xanh"><i class="swatch-classic"></i><span>Cổ điển</span></button><button type="button" data-paper-theme="botanical" title="Thiên nhiên"><i class="swatch-botanical"></i><span>Thiên nhiên</span></button><button type="button" data-paper-theme="vintage" title="Vintage"><i class="swatch-vintage"></i><span>Vintage</span></button><button type="button" data-paper-theme="lavender" title="Tím dịu"><i class="swatch-lavender"></i><span>Tím dịu</span></button><button type="button" data-paper-theme="minimal" title="Tối giản"><i class="swatch-minimal"></i><span>Tối giản</span></button><button type="button" data-paper-theme="rose" title="Hồng phấn"><i class="swatch-rose"></i><span>Hồng phấn</span></button><button type="button" data-paper-theme="ocean" title="Đại dương"><i class="swatch-ocean"></i><span>Đại dương</span></button><button type="button" data-paper-theme="mint" title="Bạc hà"><i class="swatch-mint"></i><span>Bạc hà</span></button><button type="button" data-paper-theme="sunset" title="Hoàng hôn"><i class="swatch-sunset"></i><span>Hoàng hôn</span></button>
</div><div class="paper-frame-swatches" aria-label="Chọn nhanh kiểu viền"><button type="button" data-paper-frame="double" title="Viền đôi"><i class="frame-double"></i><span>Đôi</span></button><button type="button" data-paper-frame="floral" title="Viền hoa"><i class="frame-floral">❀</i><span>Hoa</span></button><button type="button" data-paper-frame="corners" title="Góc trang trí"><i class="frame-corners">✦</i><span>Góc</span></button><button type="button" data-paper-frame="dashed" title="Nét đứt"><i class="frame-dashed"></i><span>Nét đứt</span></button><button type="button" data-paper-frame="minimal" title="Viền mảnh"><i class="frame-minimal"></i><span>Mảnh</span></button><button type="button" data-paper-frame="none" title="Không viền"><i class="frame-none"></i><span>Trơn</span></button></div><div class="tool-actions"><button type="button" id="insertTextBlock" title="Thêm một khối chữ qua hộp nhập, không gõ trực tiếp trên giấy">＋ Thêm chữ</button><button type="button" id="appendPageTool" title="Tạo thêm một trang vở mới">＋ Trang mới</button></div></div><i class="tool-sep"></i>
 <div class="tool-group"><span class="tool-caption">Kiểu chữ</span><div class="tool-actions"><select id="fontFamily" class="tool-select font-select" title="Phông chữ"><option value="Georgia">Georgia</option><option value="Arial">Arial</option><option value="'Times New Roman'">Times New Roman</option><option value="Cambria">Cambria</option><option value="Verdana">Verdana</option><option value="'Trebuchet MS'">Trebuchet</option></select><select id="fontSize" class="tool-select size-select" title="Cỡ chữ"><option value="3">Nhỏ</option><option value="4" selected>Vừa</option><option value="5">Lớn</option><option value="6">Rất lớn</option></select><button data-cmd="bold" title="In đậm"><b>B</b></button><button data-cmd="italic" title="In nghiêng"><i>I</i></button><button data-cmd="underline" title="Gạch chân"><u>U</u></button><button data-cmd="strikeThrough" title="Gạch ngang"><s>S</s></button><button data-cmd="superscript" title="Chỉ số trên">x²</button><button data-cmd="subscript" title="Chỉ số dưới">H₂</button><button type="button" id="insertMathSymbols" class="math-symbol-launch" title="Mở bảng ký hiệu toán học">∑ Toán</button><label class="color-tool" title="Màu chữ">A <input type="color" id="fontColor" value="#245fc7" aria-label="Màu chữ"></label></div></div><i class="tool-sep"></i>
 <div class="tool-group"><span class="tool-caption">Bố cục & căn chỉnh</span><div class="tool-actions"><select id="noteBlockStyle" class="tool-select" title="Kiểu đoạn văn"><option value="p">Văn bản</option><option value="h2">Tiêu đề</option><option value="h3">Đề mục</option><option value="blockquote">Trích dẫn</option></select><button data-block="h2" title="Tiêu đề lớn">H₁</button><button data-block="h3" title="Đề mục">H₂</button><button data-block="blockquote" title="Trích dẫn">❝</button><button data-cmd="insertUnorderedList" title="Danh sách">☷</button><button data-cmd="insertOrderedList" title="Danh sách đánh số">1.</button><button data-cmd="justifyLeft" title="Căn trái">⇤</button><button data-cmd="justifyCenter" title="Căn giữa">↔</button><button data-cmd="justifyRight" title="Căn phải">⇥</button><button type="button" id="insertChecklist" title="Chèn danh sách việc cần làm">☑ Việc</button><button type="button" id="insertRule" title="Chèn đường phân cách">― Đường</button><button type="button" id="insertLink" title="Chèn liên kết">🔗</button></div></div><i class="tool-sep"></i>
 <div class="tool-group"><span class="tool-caption">Đánh dấu</span><div class="tool-actions"><select id="highlightColor" class="tool-select" title="Màu tô sáng"><option value="#fff0a9">Vàng</option><option value="#ffdce5">Hồng</option><option value="#d8f3e9">Xanh ngọc</option><option value="#dceaff">Xanh dương</option><option value="#eadfff">Tím</option></select><button id="applyHighlight" title="Tô vùng chữ đang chọn">▰ Tô</button></div></div><i class="tool-sep"></i>
 <div class="tool-group"><span class="tool-caption">Trang trí</span><div class="tool-actions"><select id="decorChoice" class="tool-select decor-select" title="Chọn kiểu khung"><option value="memory">▣ Khung ghi nhớ</option><option value="idea">✦ Khung ý chính</option><option value="warning">⚑ Khung lưu ý</option><option value="formula">ƒ Khung công thức</option><option value="definition">◇ Định nghĩa</option><option value="example">✎ Ví dụ minh họa</option><option value="history">◷ Mốc thời gian</option><option value="compare">⇄ So sánh</option><option value="quote">❝ Trích dẫn nổi bật</option><option value="divider">— Đường phân cách</option><option value="theorem">∑ Định lý / mệnh đề</option><option value="steps">☷ Các bước giải</option><option value="flashcard">▣ Thẻ kiến thức</option><option value="timeline2">➜ Dòng thời gian</option></select><button id="insertDecor" title="Chèn khung đã chọn">＋ Chèn</button><details class="emoji-menu"><summary>😊 Emoji</summary><div class="emoji-pop"><div class="emoji-title">Chọn biểu tượng</div><div class="emoji-grid">${['⭐','🌟','✨','💫','🔥','💡','🧠','📌','📍','🎯','🏆','✅','❌','⚠️','❗','❓','📖','📚','📝','✏️','🖊️','📅','🗓️','⏳','⏰','🧪','🔬','⚗️','➗','📐','📊','📈','🌱','🌿','🌍','🧭','🏛️','🎨','🎵','💎','❤️','💙','💚','💜','🧡','🤔','🙌','👏','🚀','🔎'].map(x=>`<button type="button" data-emoji="${x}" title="${x}">${x}</button>`).join('')}</div></div></details><select id="stickerChoice" class="tool-select sticker-select" title="Chọn nhãn dán"><option value="⭐">⭐</option><option value="🏆">🏆</option><option value="💡">💡</option><option value="📌">📌</option><option value="🔥">🔥</option><option value="🌟">🌟</option><option value="✅">✅</option><option value="🎯">🎯</option><option value="🧠">🧠</option><option value="📚">📚</option></select><button type="button" id="insertSticker" title="Chèn nhãn dán">✦ Dán</button></div></div><i class="tool-sep"></i>
 <div class="tool-group inline-ref-tools"><span class="tool-caption">Kết nối nội dung</span><div class="tool-actions"><button type="button" id="insertInternalRef" class="internal-ref-tool" title="Gắn liên kết nội bộ tại vị trí con trỏ hoặc đoạn chữ đang chọn">⛓ Nội bộ</button><span class="inline-ref-tip">Bôi đen chữ trước khi chèn</span></div></div><i class="tool-sep"></i>
 <div class="tool-group"><span class="tool-caption">Chèn nội dung</span><div class="tool-actions"><label for="noteImage" title="Chèn ảnh từ máy">▧ Ảnh</label><input type="file" id="noteImage" accept="image/*" multiple hidden><label for="noteAudio" title="Chèn âm thanh">♫ Âm thanh</label><input type="file" id="noteAudio" accept="audio/*" hidden><button id="insertDate" title="Chèn ngày hôm nay">◷ Ngày</button><button id="insertTable" title="Chèn bảng">▦ Bảng</button><button id="clearFormat" title="Xóa định dạng chữ">Tx</button></div></div>
</div>`;}
function ensureNewsEntry(date){state.data.newsEntries ||= {};if(!state.data.newsEntries[date])state.data.newsEntries[date]=normalizeNewsEntry({notePages:[{html:''}]},date);return state.data.newsEntries[date];}
function hasNewsContent(entry){return !!(entry&&(entry.notePages||[]).some(p=>{const html=String(p.html||'');return html.replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').trim()||/<(img|audio|video|svg|table)\b/i.test(html);}));}
function newsMonthCalendar(dateKey){const [year,month]=state.newsMonth.split('-').map(Number);const first=new Date(year,month-1,1),offset=(first.getDay()+6)%7;const selected=dateKey;const cells=[];for(let i=0;i<42;i++){const d=new Date(year,month-1,1-offset+i),key=localDateKey(d),entry=state.data.newsEntries?.[key],outside=d.getMonth()!==month-1;cells.push(`<button type="button" class="calendar-day ${outside?'outside':''} ${key===selected?'selected':''} ${hasNewsContent(entry)?'has-entry':''}" data-news-date="${key}" title="${key.split('-').reverse().join('/')}"><span>${d.getDate()}</span><i></i></button>`);}return cells.join('');}
function renderNewsPage(view){
 const date=state.newsDate||localDateKey(),entry=ensureNewsEntry(date),[year,month]=state.newsMonth.split('-').map(Number),monthLabel=new Date(year,month-1,1).toLocaleDateString('vi-VN',{month:'long',year:'numeric'});
 const prev=new Date(year,month-2,1),next=new Date(year,month,1);
 view.innerHTML=`<div class="news-heading"><div><div class="title-context">SỔ TAY THEO NGÀY</div><h1>Tin tức</h1><p>Mỗi ngày là một trang vở riêng.</p></div><div class="news-head-actions"><button class="btn plain" id="newsPrevDay">‹ Ngày trước</button><button class="btn soft" id="newsToday">Hôm nay</button><button class="btn plain" id="newsNextDay">Ngày sau ›</button></div></div>
 <div class="news-layout"><aside class="news-calendar"><div class="news-calendar-top"><div class="calendar-month-row"><button type="button" id="newsPrevMonth" aria-label="Tháng trước">‹</button><b>${esc(monthLabel)}</b><button type="button" id="newsNextMonth" aria-label="Tháng sau">›</button></div><label class="date-jump"><span>Chọn ngày bất kỳ</span><input id="newsDatePicker" type="date" value="${date}"></label><div class="calendar-weekdays">${['T2','T3','T4','T5','T6','T7','CN'].map(x=>`<span>${x}</span>`).join('')}</div><div class="calendar-grid">${newsMonthCalendar(date)}</div><div class="calendar-legend"><i></i> Có ghi chép</div></div><div class="news-quick"><div class="news-quick-title">Ngày có ghi chép</div><div class="news-date-list">${Object.values(state.data.newsEntries||{}).filter(hasNewsContent).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8).map(e=>`<button type="button" data-news-date="${e.date}" class="${e.date===date?'active':''}"><span>${e.date.split('-').reverse().join('/')}</span><small>Đã lưu</small></button>`).join('')||'<span class="quiet-empty">Chưa có ghi chép</span>'}</div></div></aside>
 <section class="news-editor"><div class="news-day-title"><div class="news-day-icon">🗓️</div><div><div class="title-context">TRANG VỞ TRONG NGÀY</div><h2>${esc(formatDateLong(date))}</h2><span>${date.split('-').reverse().join('/')}</span></div><div class="news-day-spacer"></div><label class="paper-style-control"><span>Giấy</span><select id="paperStyle"><option value="grid" ${entry.paperStyle==='grid'?'selected':''}>Ô ly</option><option value="ruled" ${entry.paperStyle==='ruled'?'selected':''}>Kẻ ngang</option><option value="dot" ${entry.paperStyle==='dot'?'selected':''}>Chấm</option></select></label></div>
 <div class="notebook-shell news-notebook"><div id="notebookPane"><div class="notebook-layout">${notebookToolbarMarkup()}<div class="notebook-content"><div class="paper-wrap"><div class="paper-stack" id="paperPages">${(entry.notePages||[{html:entry.noteHTML||''}]).map((pg,i)=>`<div class="paper-page paper-${entry.paperStyle||'grid'} paper-theme-${entry.paperTheme||'classic'} paper-frame-${entry.paperFrame||'double'}" data-page="${i+1}" data-page-id="${esc(pg.id||'')}" data-first-written-at="${esc(pg.firstWrittenAt||'')}" ${pg.manualBreak?'data-manual-break="true"':''} ${pg.keepPage?'data-keep-page="true"':''} contenteditable="false" spellcheck="false" inputmode="none" tabindex="0">${pg.html||''}</div>`).join('')}</div></div><div class="paper-foot"><div class="paper-pager"><button type="button" id="pagePrev" title="Trang trước">‹</button><span id="pageIndicator">Trang 1 / 1</span><button type="button" id="pageNext" title="Trang sau">›</button><button type="button" id="deletePage" title="Xóa trang hiện tại" aria-label="Xóa trang hiện tại">×</button></div><div class="paper-page-insert"><span class="page-action-label">Chèn trang</span><button type="button" id="insertPageBefore">＋ Trước</button><button type="button" id="insertPageAfter">＋ Sau</button><button type="button" id="appendPage">＋ Trang cuối</button></div><span id="noteSaveState">${entry.noteUpdatedAt?'Đã lưu '+dateLabel(entry.noteUpdatedAt):'Đã lưu tự động'}</span><span><span id="noteWords">0</span> từ</span></div></div></div></div></section></div>`;
 bindNotebook(entry,{kind:'news',date});
 $('#newsDatePicker').onchange=e=>{if(e.target.value)changeNewsDate(e.target.value);};
 $('#newsToday').onclick=()=>changeNewsDate(localDateKey());
 $('#newsPrevDay').onclick=()=>changeNewsDate(localDateKey(new Date(new Date(date+'T12:00:00').getTime()-86400000)));
 $('#newsNextDay').onclick=()=>changeNewsDate(localDateKey(new Date(new Date(date+'T12:00:00').getTime()+86400000)));
 $('#newsPrevMonth').onclick=async()=>{if(!(await flushBeforeLeave()))return;state.newsMonth=`${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}`;render();};
 $('#newsNextMonth').onclick=async()=>{if(!(await flushBeforeLeave()))return;state.newsMonth=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`;render();};
 $$('[data-news-date]',view).forEach(b=>b.onclick=()=>changeNewsDate(b.dataset.newsDate));
}
async function changeNewsDate(date){if(!isValidDateKey(date))return;await state.flushNotebook?.();state.newsDate=date;state.newsMonth=date.slice(0,7);state.data.settings.lastNewsDate=date;await save();render();}
function openNewsDate(date){if(!isValidDateKey(date))return;state.newsDate=date;state.newsMonth=date.slice(0,7);state.data.settings.lastNewsDate=date;state.page='news';state.selected=null;save().then(render);}
function renderMain(){
 const view=$('#view');
 if(state.page==='review'){renderReviewPage(view);return;}
 if(state.page==='news'){renderNewsPage(view);return;}
 if(!state.selected){renderDashboard(view);return;}
 const found=find(state.selected);if(!found){state.selected=null;renderDashboard(view);return;}
 const n=found.node;
 view.innerHTML=`<div class="workspace-heading"><div class="title-block"><div class="title-context">${pathOf(n.id).slice(0,-1).map(x=>esc(x.name)).join(' / ')||'DỰ ÁN'}</div><h1>${esc(n.name)}</h1></div><div class="workspace-actions"><button class="btn plain project-data-btn project-export-btn" id="exportProject" title="Xuất riêng dự án này" aria-label="Xuất dự án">⇩</button><button class="btn plain project-data-btn project-import-btn" id="importProject" title="Nhập một dự án vào đây hoặc vào không gian khác" aria-label="Nhập dự án">⇧</button><button class="btn soft" id="addChild">＋ Mục con</button><button class="btn plain" id="editNode" title="Sửa tên và mô tả">✎</button><button class="btn plain danger" id="delNode" title="Xóa mục">⌫</button></div></div>
 ${n.description?`<section class="project-description"><span>🎯 MỤC TIÊU & PHẠM VI</span><p>${esc(n.description)}</p></section>`:''}
 <div class="notebook-shell"><div class="notebook-top"><div class="notebook-tabs"><button id="tabNotebook" class="${state.nodeTab==='notebook'?'active':''}">▤ Trang vở</button><button id="tabQuestions" class="${state.nodeTab==='questions'?'active':''}">☷ Câu hỏi <span class="tab-count">${n.questions.length}</span></button><button id="addQ" class="btn primary tiny">＋ Thêm câu hỏi</button></div><label class="paper-style-control" title="Chọn kiểu giấy" style="${state.nodeTab==='notebook'?'':'display:none'}"><span>Kiểu giấy</span><select id="paperStyle"><option value="grid" ${n.paperStyle==='grid'?'selected':''}>Ô ly</option><option value="ruled" ${n.paperStyle==='ruled'?'selected':''}>Kẻ ngang</option><option value="dot" ${n.paperStyle==='dot'?'selected':''}>Chấm</option></select></label></div>
 <div id="notebookPane" style="${state.nodeTab==='notebook'?'':'display:none'}"><div class="notebook-layout">${notebookToolbarMarkup()}<div class="notebook-content">
 <div class="paper-wrap"><div class="paper-stack" id="paperPages">${(Array.isArray(n.notePages)&&n.notePages.length?n.notePages:[{html:n.noteHTML||''}]).map((pg,i)=>`<div class="paper-page paper-${n.paperStyle||'grid'} paper-theme-${n.paperTheme||'classic'} paper-frame-${n.paperFrame||'double'}" data-page="${i+1}" data-page-id="${esc(pg.id||'')}" data-first-written-at="${esc(pg.firstWrittenAt||'')}" ${pg.manualBreak?'data-manual-break="true"':''} ${pg.keepPage?'data-keep-page="true"':''} contenteditable="false" spellcheck="false" inputmode="none" tabindex="0">${pg.html||''}</div>`).join('')}</div></div><div class="paper-foot"><div class="paper-pager"><button type="button" id="pagePrev" title="Trang trước" aria-label="Trang trước">‹</button><span id="pageIndicator">Trang 1 / 1</span><button type="button" id="pageNext" title="Trang sau" aria-label="Trang sau">›</button><button type="button" id="deletePage" title="Xóa trang hiện tại" aria-label="Xóa trang hiện tại">×</button></div><div class="paper-page-insert"><span class="page-action-label">Chèn trang</span><button type="button" id="insertPageBefore" title="Chèn một trang trước trang đang chọn">＋ Trước</button><button type="button" id="insertPageAfter" title="Chèn một trang sau trang đang chọn">＋ Sau</button><button type="button" id="appendPage" title="Thêm trang ở cuối vở">＋ Trang cuối</button></div><span id="noteSaveState">${n.noteUpdatedAt?'Đã lưu '+dateLabel(n.noteUpdatedAt):'Đã lưu tự động'}</span><span><span id="noteWords">0</span> từ</span></div></div></div></div>
 <div id="questionPane" style="${state.nodeTab==='questions'?'':'display:none'}"><div class="bank-toolbar"><div class="bank-title">Ngân hàng câu hỏi</div><div class="question-filters"><input id="qSearch" class="search" placeholder="Tìm câu hỏi..."><select id="qStatusFilter" class="filter" aria-label="Lọc trạng thái"><option value="all">Mọi trạng thái</option><option value="due">Đến hạn</option><option value="unmemorized">Chưa thuộc</option><option value="milestone30">Đã qua mốc 30 ngày</option></select><select id="qTagFilter" class="filter" aria-label="Lọc nhãn"><option value="all">Mọi nhãn</option>${[...new Set(n.questions.flatMap(q=>q.tags||[]))].sort((a,b)=>a.localeCompare(b,'vi')).map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('')}</select></div></div><div id="questionList" class="question-list-host"></div></div></div>
 ${n.children.length?`<div class="child-section"><div class="child-heading"><h2>Mục con</h2><button class="btn plain tiny" id="addChild2">＋ Thêm</button></div><div class="project-grid">${n.children.map(x=>`<article class="project-card"><button class="project-open" data-open="${x.id}"><div class="folder">📁</div><h3>${esc(x.name)}</h3><div class="meta"><span>▦ ${x.questions.length} câu</span><span>▣ ${x.children.length} mục con</span></div></button></article>`).join('')}</div></div>`:''}`;
 $('#addChild').onclick=()=>createNode(n.id);if($('#addChild2'))$('#addChild2').onclick=()=>createNode(n.id);$('#addQ').onclick=()=>questionModal(n.id);$('#editNode').onclick=()=>editNode(n.id);$('#delNode').onclick=()=>deleteNode(n.id);$('#exportProject').onclick=()=>exportProjectPackage(n.id);$('#importProject').onclick=()=>chooseProjectImportFile(n.id);
 $$('[data-open]').forEach(b=>b.onclick=async()=>{await state.flushNotebook?.();state.selected=b.dataset.open;state.page='home';state.nodeTab='notebook';render();});
 $('#tabNotebook').onclick=async()=>{await state.flushNotebook?.();state.nodeTab='notebook';render();};$('#tabQuestions').onclick=async()=>{await state.flushNotebook?.();state.nodeTab='questions';render();};
 if(state.nodeTab==='notebook')bindNotebook(n);else{const run=()=>renderQuestions(n,$('#qSearch').value,$('#qStatusFilter').value,$('#qTagFilter').value);$('#qSearch').oninput=run;$('#qStatusFilter').onchange=run;$('#qTagFilter').onchange=run;renderQuestions(n,'','all','all');}
}
function linkifyProjectDates(root){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){const parent=node.parentElement;if(!parent||parent.closest('a,.note-date-link,button,.paper-page-number'))return NodeFilter.FILTER_REJECT;return /\d{2}\/\d{2}\/\d{4}/.test(node.nodeValue||'')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}});const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const node of nodes){const text=node.nodeValue||'',re=/(^|\D)(\d{2}\/\d{2}\/\d{4})(?!\d)/g;let match,last=0,frag=document.createDocumentFragment(),changed=false;while((match=re.exec(text))){const date=dateKeyFromDMY(match[2]);if(!date)continue;const start=match.index+match[1].length;if(start>last)frag.append(document.createTextNode(text.slice(last,start)));const link=document.createElement('span');link.className='note-date-link';link.dataset.newsDate=date;link.title='Mở trang Tin tức ngày '+match[2];link.textContent=match[2];frag.append(link);last=start+match[2].length;changed=true;}if(changed){if(last<text.length)frag.append(document.createTextNode(text.slice(last)));node.parentNode.replaceChild(frag,node);}}}
function dateMentionAtPoint(event,root){let range=null;try{range=document.caretRangeFromPoint?.(event.clientX,event.clientY)||null;if(!range&&document.caretPositionFromPoint){const pos=document.caretPositionFromPoint(event.clientX,event.clientY);if(pos){range=document.createRange();range.setStart(pos.offsetNode,pos.offset);range.collapse(true);}}}catch(_){}if(!range||range.startContainer.nodeType!==Node.TEXT_NODE||!root.contains(range.startContainer))return null;const text=range.startContainer.nodeValue||'',offset=range.startOffset,re=/(^|\D)(\d{2}\/\d{2}\/\d{4})(?!\d)/g;let m;while((m=re.exec(text))){const start=m.index+m[1].length,end=start+m[2].length;if(offset>=start&&offset<=end){return dateKeyFromDMY(m[2]);}}return null;}
function bindNotebook(n,options={kind:'project'}){
 const wrap=$('#paperPages');
 if(!Array.isArray(n.notePages)||!n.notePages.length)n.notePages=normalizeNotePages(n);
 const stylePicker=$('#paperStyle');
 const applyPaperStyle=async style=>{const value=['grid','ruled','dot'].includes(style)?style:'grid';n.paperStyle=value;pages().forEach(p=>{p.classList.remove('paper-grid','paper-ruled','paper-dot');p.classList.add('paper-'+value);});if(stylePicker)stylePicker.value=value;await save();};
 const BASE_PAGE_HEIGHT=1220;
 let saveTimer=null,reflowTimer=null,lastActivePage=null,lastRange=null;
 const pages=()=>[...wrap.querySelectorAll('.paper-page')];
 const pageOf=node=>{const el=node?.nodeType===1?node:node?.parentElement;return el?.closest?.('.paper-page')||null;};
 const pageNodes=page=>[...page.childNodes].filter(x=>!(x.nodeType===1&&x.classList.contains('paper-page-number')));
 const ensurePageMarker=page=>{let marker=page.querySelector(':scope > .paper-page-number');if(!marker){marker=document.createElement('div');marker.className='paper-page-number';marker.contentEditable='false';page.append(marker);}return marker;};
  const pageDateText=key=>{if(!isValidDateKey(key))return'Thứ ..., Ngày ..., Tháng ..., Năm ...';const [y,m,d]=key.split('-').map(Number),date=new Date(y,m-1,d,12),weekday=date.getDay()===0?'Chủ nhật':'Thứ '+['Hai','Ba','Tư','Năm','Sáu','Bảy'][date.getDay()-1];return `${weekday}, Ngày ${String(d).padStart(2,'0')}, Tháng ${String(m).padStart(2,'0')}, Năm ${y}`;};
  const updatePageChrome=page=>{let head=page.querySelector(':scope > .paper-date-header');if(!head){head=document.createElement('div');head.className='paper-date-header';head.contentEditable='false';page.prepend(head);}head.innerHTML=`<span>${esc(pageDateText(page.dataset.firstWrittenAt||''))}</span><span class="paper-date-ornament">✦ ✧ ✦</span>`;let foot=page.querySelector(':scope > .paper-footer-decoration');if(!foot){foot=document.createElement('div');foot.className='paper-footer-decoration';foot.contentEditable='false';page.append(foot);}foot.innerHTML='<span>✧ STUDYSPACE · SỔ TAY KIẾN THỨC ✧</span><span class="paper-footer-stars">❦　✦　❦</span>';};
  const setFirstWrittenAt=page=>{if(!page)return; if(!isValidDateKey(page.dataset.firstWrittenAt||'')){page.dataset.firstWrittenAt=localDateKey();updatePageChrome(page);}};
 const updatePager=()=>{const list=pages();list.forEach((p,i)=>{p.dataset.page=String(i+1);ensurePageMarker(p).textContent=String(i+1);});const sel=window.getSelection();const selectionPage=sel&&sel.rangeCount?pageOf(sel.getRangeAt(0).startContainer):null;let current=selectionPage||pageOf(document.activeElement)||lastActivePage||list[0];let index=Math.max(0,list.indexOf(current));$('#pageIndicator').textContent=`Trang ${index+1} / ${list.length}`;$('#pagePrev').disabled=index<=0;$('#pageNext').disabled=index>=list.length-1;};
 const addPage=(opts={})=>{const p=document.createElement('div');p.className='paper-page paper-'+(n.paperStyle||'grid');p.contentEditable='true';p.spellcheck=true;p.dataset.page=String(pages().length+1);if(opts.keepPage)p.dataset.keepPage='true';if(opts.manualBreak)p.dataset.manualBreak='true';if(opts.keepPage)p.innerHTML='<p><br></p>';ensurePageMarker(p);if(opts.before)wrap.insertBefore(p,opts.before);else wrap.append(p);return p;};
 const serializePages=()=>pages().map(p=>{const box=document.createElement('div');pageNodes(p).forEach(node=>box.append(node.cloneNode(true)));return {html:box.innerHTML,manualBreak:p.dataset.manualBreak==='true',keepPage:p.dataset.keepPage==='true'};});
 const updateWords=()=>{const output=$('#noteWords');if(!wrap.isConnected||!output)return;const text=pages().map(p=>pageNodes(p).map(node=>node.textContent||'').join(' ')).join(' ');output.textContent=(text.trim().match(/\S+/g)||[]).length;};
 const persist=async()=>{const savedPages=serializePages();n.notePages=savedPages;n.noteHTML=savedPages.map(p=>p.html).join('');n.noteUpdatedAt=iso();await save();$('#noteSaveState').textContent='Đã tự lưu lúc '+new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});};
 const flush=async()=>{clearTimeout(saveTimer);clearTimeout(reflowTimer);if(options.kind!=='news')pages().forEach(linkifyProjectDates);reflowPages();updateWords();await persist();updatePager();if(state.flushNotebook===flush)state.flushNotebook=null;};
 state.flushNotebook=flush;
 const markChanged=()=>{updateWords();$('#noteSaveState').textContent='Đang lưu…';clearTimeout(reflowTimer);reflowTimer=setTimeout(()=>{reflowPages();updatePager();},100);clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{reflowPages();await persist();updatePager();},700);};
 function splitOversizedBlock(page,next,block){
  if(!block||block.nodeType!==1||!block.textContent?.trim())return false;
  const safeBottom=page.getBoundingClientRect().bottom-94;
  const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);
  let splitNode=null,splitOffset=0,node;
  while((node=walker.nextNode())){
   const re=/\S+\s*/g;let match;
   while((match=re.exec(node.nodeValue||''))){
    const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
    const rect=range.getBoundingClientRect();
    if(rect.height&&rect.bottom<=safeBottom){splitNode=node;splitOffset=match.index+match[0].length;}
   }
  }
  if(!splitNode||splitOffset<=0)return false;
  let charsBefore=0,scan=document.createTreeWalker(block,NodeFilter.SHOW_TEXT),scanNode,foundSplit=false;while((scanNode=scan.nextNode())){if(scanNode===splitNode){charsBefore+=splitOffset;foundSplit=true;break;}charsBefore+=(scanNode.nodeValue||'').length;}if(!foundSplit||charsBefore>=block.textContent.length)return false;
  try{
   const cut=document.createRange();cut.selectNodeContents(block);cut.setEnd(splitNode,splitOffset);
   const firstPart=cut.extractContents();const first=block.cloneNode(false);first.append(firstPart);
   if(!first.textContent?.trim())return false;
   page.insertBefore(first,block);
   const nextFirst=pageNodes(next)[0]||ensurePageMarker(next);next.insertBefore(block,nextFirst);
   const sel=window.getSelection();if(sel&&sel.rangeCount){const caret=sel.getRangeAt(0).cloneRange();const caretPage=pageOf(caret.startContainer);if(caretPage){lastActivePage=caretPage;caretPage.focus({preventScroll:true});sel.removeAllRanges();sel.addRange(caret);}}
   return true;
  }catch(err){console.warn('Không thể ngắt đoạn qua trang:',err);return false;}
 }
 function isEmptyPage(page){const clone=page.cloneNode(true);clone.querySelectorAll('.paper-page-number').forEach(x=>x.remove());return !clone.textContent.trim()&&!clone.querySelector('img,hr,table,svg,video,audio');}
 function reflowPages(){
  let list=pages();if(!list.length)list=[addPage()];
  // Reset pages to the standard sheet size before measuring overflow.
  list.forEach(p=>{p.style.height='';p.style.minHeight='';ensurePageMarker(p);updatePageChrome(p);});
  for(let i=0;i<list.length;i++){
   const page=list[i];
   let guard=0;
   while(page.scrollHeight>page.clientHeight+3&&guard++<200){
    const nodes=pageNodes(page);
    if(nodes.length>1){
     let next=list[i+1];if(!next){next=addPage();list=pages();}
     const tail=nodes[nodes.length-1],nextFirst=pageNodes(next)[0]||ensurePageMarker(next);
     next.insertBefore(tail,nextFirst);
     continue;
    }
    // A single long paragraph is split at the last complete word that fits on this sheet.
    const block=nodes[0],next=list[i+1]||addPage();list=pages();
    if(block&&splitOversizedBlock(page,next,block)){inheritPageDate(page,next);updatePageChrome(next);continue;}
    // A non-text block that cannot be split (for example a large image) gets extra height instead of being clipped.
    page.style.height=(page.scrollHeight+22)+'px';page.style.minHeight=page.style.height;break;
   }
  }
  // Refill unused space from the following sheet when the user is not actively editing that sheet.
  list=pages();const selNow=window.getSelection();const selectionPage=selNow&&selNow.rangeCount?pageOf(selNow.getRangeAt(0).startContainer):null;const editingPage=selectionPage||pageOf(document.activeElement)||lastActivePage;
  for(let i=0;i<list.length-1;i++){
   const page=list[i],next=list[i+1];if(editingPage===next||next.dataset.manualBreak==='true'||next.dataset.keepPage==='true'||parseFloat(page.style.height||BASE_PAGE_HEIGHT)>BASE_PAGE_HEIGHT+2)continue;
   let guard=0;
   while(pageNodes(next).length&&guard++<200){
    const first=pageNodes(next)[0],nextAfter=pageNodes(next)[1]||ensurePageMarker(next);next.removeChild(first);page.insertBefore(first,ensurePageMarker(page));
    if(page.scrollHeight>page.clientHeight+3){page.removeChild(first);next.insertBefore(first,nextAfter);break;}
   }
  }
  // Remove only auto-generated empty trailing sheets. Manually inserted sheets remain in place.
  list=pages();while(list.length>1&&isEmptyPage(list[list.length-1])&&list[list.length-1].dataset.keepPage!=='true'&&list[list.length-1].dataset.manualBreak!=='true'){list[list.length-1].remove();list=pages();}
  updatePager();
 }
 function getSelectionRange(){const sel=window.getSelection();if(!sel||!sel.rangeCount)return null;const r=sel.getRangeAt(0);return wrap.contains(r.commonAncestorContainer)?r.cloneRange():null;}
 function restoreRange(range){if(!range)return false;try{const p=pageOf(range.startContainer);if(p){lastActivePage=p;p.focus({preventScroll:true});}const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);return true;}catch(_){return false;}}
 function insertNodeAtCaret(node,range){let r=range;try{if(!r||!wrap.contains(r.commonAncestorContainer))throw Error('no caret');}catch(_){const p=lastActivePage||pages()[0];r=document.createRange();r.selectNodeContents(p);r.collapse(false);}try{r.deleteContents();r.insertNode(node);r.setStartAfter(node);r.collapse(true);const p=pageOf(node);if(p){lastActivePage=p;p.focus({preventScroll:true});}const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r);return r.cloneRange();}catch(err){console.warn('Không thể chèn nội dung tại vị trí con trỏ',err);return null;}}
 async function imageData(file){try{return await compressImage(file);}catch(err){return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});}}
 if(stylePicker)stylePicker.onchange=e=>{applyPaperStyle(e.target.value);};
 wrap.addEventListener('focusin',e=>{const p=pageOf(e.target);if(p){lastActivePage=p;updatePager();}});
 document.addEventListener('selectionchange',()=>{const r=getSelectionRange();if(r){lastRange=r;const p=pageOf(r.startContainer);if(p)lastActivePage=p;}});
 if(options.kind!=='news')pages().forEach(linkifyProjectDates);
 // Date links are created only after leaving a page; never replace live typing TextNodes during autosave.
 wrap.addEventListener('focusout',e=>{if(options.kind!=='news'){const p=pageOf(e.target);if(p){linkifyProjectDates(p);markChanged();}}});
 wrap.addEventListener('click',async e=>{if(options.kind==='news')return;const linked=e.target.closest?.('.note-date-link');const date=linked?.dataset.newsDate||dateMentionAtPoint(e,wrap);if(date){e.preventDefault();e.stopPropagation();await flush();openNewsDate(date);}});
 wrap.addEventListener('input',markChanged);
 wrap.addEventListener('paste',async e=>{
  const cd=e.clipboardData;if(!cd)return;
  let files=[...(cd.items||[])].filter(x=>x.kind==='file'&&x.type.startsWith('image/')).map(x=>x.getAsFile()).filter(Boolean);
  if(!files.length)files=[...(cd.files||[])].filter(f=>f.type.startsWith('image/'));
  // Some apps put copied screenshots into HTML as data URLs instead of image clipboard items.
  if(!files.length){const markup=cd.getData('text/html');if(markup&&/data:image\//i.test(markup)){const doc=new DOMParser().parseFromString(markup,'text/html');for(const img of doc.querySelectorAll('img[src^="data:image/"]')){try{const res=await fetch(img.src);const blob=await res.blob();files.push(new File([blob],'pasted-image.png',{type:blob.type||'image/png'}));}catch(_){}}}}
  if(!files.length)return;
  e.preventDefault();let range=getSelectionRange()||lastRange;
  try{for(const file of files){const src=await imageData(file);const img=document.createElement('img');img.src=src;img.alt='Ảnh ghi chú';img.draggable=true;range=insertNodeAtCaret(img,range);if(range){const spacer=document.createElement('br');range=insertNodeAtCaret(spacer,range);}}markChanged();}
  catch(err){console.error(err);toast('Không thể dán ảnh này.');}
 });
 wrap.addEventListener('dragover',e=>{if([...(e.dataTransfer?.items||[])].some(x=>x.type.startsWith('image/')))e.preventDefault();});
 wrap.addEventListener('drop',async e=>{const files=[...(e.dataTransfer?.files||[])].filter(f=>f.type.startsWith('image/'));if(!files.length)return;e.preventDefault();let range=null;try{if(document.caretRangeFromPoint)range=document.caretRangeFromPoint(e.clientX,e.clientY);else if(document.caretPositionFromPoint){const pos=document.caretPositionFromPoint(e.clientX,e.clientY);if(pos){range=document.createRange();range.setStart(pos.offsetNode,pos.offset);range.collapse(true);}}}catch(_){}for(const file of files){const img=document.createElement('img');img.src=await imageData(file);img.alt='Ảnh ghi chú';range=insertNodeAtCaret(img,range||lastRange);}markChanged();});
 const focusEditor=()=>{if(lastRange)restoreRange(lastRange);else{const p=lastActivePage||pages()[0];p?.focus();}};
 $$('[data-cmd]').forEach(b=>{b.addEventListener('mousedown',e=>e.preventDefault());b.onclick=()=>{focusEditor();noteCommand(b.dataset.cmd,false,b.dataset.value||null);markChanged();};});
 $$('[data-block]').forEach(b=>{b.addEventListener('mousedown',e=>e.preventDefault());b.onclick=()=>{focusEditor();noteCommand('formatBlock',false,b.dataset.block);markChanged();};});
 $('#fontFamily').onchange=e=>{focusEditor();noteCommand('fontName',false,e.target.value);markChanged();};
 $('#fontSize').onchange=e=>{focusEditor();noteCommand('fontSize',false,e.target.value);markChanged();};
 $('#fontColor').oninput=e=>{focusEditor();noteCommand('foreColor',false,e.target.value);markChanged();};
 $('#noteImage').onchange=async e=>{focusEditor();for(const f of [...e.target.files])if(f.type.startsWith('image/')){const src=await imageData(f);const img=document.createElement('img');img.src=src;img.alt='Ảnh ghi chú';insertNodeAtCaret(img,lastRange);}markChanged();e.target.value='';};
 $('#insertDate').onclick=()=>{focusEditor();const p=lastActivePage||pages()[0];const sel=window.getSelection();if(sel&&sel.rangeCount){noteCommand('insertText',false,new Date().toLocaleDateString('vi-VN'));markChanged();}else{const r=document.createRange();r.selectNodeContents(p);r.collapse(false);insertNodeAtCaret(document.createTextNode(new Date().toLocaleDateString('vi-VN')),r);markChanged();}};
 $('#clearFormat').onclick=()=>{focusEditor();noteCommand('removeFormat');markChanged();};
 $('#insertTable')?.addEventListener('mousedown',e=>e.preventDefault());
 $('#insertTable')?.addEventListener('click',()=>{const rowsRaw=prompt('Số hàng (1–12):','3');if(rowsRaw===null)return;const colsRaw=prompt('Số cột (1–8):','3');if(colsRaw===null)return;const rows=Math.max(1,Math.min(12,parseInt(rowsRaw,10)||1)),cols=Math.max(1,Math.min(8,parseInt(colsRaw,10)||1));focusEditor();let html='<table class="note-table"><tbody>';for(let r=0;r<rows;r++){html+='<tr>';for(let c=0;c<cols;c++)html+=`<${r===0?'th':'td'}><br></${r===0?'th':'td'}>`;html+='</tr>';}html+='</tbody></table><p><br></p>';noteCommand('insertHTML',false,html);markChanged();});
 $('#applyHighlight').onclick=()=>{focusEditor();const color=$('#highlightColor').value||'#fff0a9';document.execCommand('hiliteColor',false,color);markChanged();};
 const decorHTML={
  memory:'<div class="note-card note-card-blue"><p class="note-card-kicker">✦ GHI NHỚ</p><p>Nội dung quan trọng cần ghi lại…</p></div><p><br></p>',
  idea:'<div class="note-card note-card-mint"><p class="note-card-kicker">✧ Ý CHÍNH</p><p>Ghi ý chính tại đây…</p></div><p><br></p>',
  warning:'<div class="note-card note-card-amber"><p class="note-card-kicker">⚑ LƯU Ý</p><p>Điểm cần chú ý hoặc dễ nhầm lẫn…</p></div><p><br></p>',
  formula:'<div class="note-card note-card-violet"><p class="note-card-kicker">ƒ CÔNG THỨC</p><p>Nhập công thức và giải thích…</p></div><p><br></p>',
  definition:'<div class="note-card note-card-sky"><p class="note-card-kicker">◇ ĐỊNH NGHĨA</p><p>Ghi khái niệm và nội dung cốt lõi…</p></div><p><br></p>',
  example:'<div class="note-card note-card-mint"><p class="note-card-kicker">✎ VÍ DỤ MINH HỌA</p><p>Ghi ví dụ cụ thể tại đây…</p></div><p><br></p>',
  history:'<div class="note-card note-card-gold"><p class="note-card-kicker">◷ MỐC THỜI GIAN</p><div class="note-timeline"><p><b>Thời điểm:</b> Sự kiện / diễn biến…</p><p><b>Kết quả:</b> Ghi kết quả hoặc ý nghĩa…</p></div></div><p><br></p>',
  compare:'<div class="note-card note-card-violet"><p class="note-card-kicker">⇄ SO SÁNH</p><p><b>Điểm giống:</b> …</p><p><b>Điểm khác:</b> …</p></div><p><br></p>',
  quote:'<div class="note-card note-card-rose"><p class="note-card-kicker">❝ TRÍCH DẪN</p><p>“Ghi câu trích dẫn nổi bật tại đây…”</p><p><i>— Nguồn / tác giả</i></p></div><p><br></p>',
  divider:'<hr class="note-divider"><p><br></p>'
 };
 $('#insertDecor').addEventListener('mousedown',e=>e.preventDefault());
 $('#insertDecor').onclick=()=>{focusEditor();const kind=$('#decorChoice').value||'memory';document.execCommand('insertHTML',false,decorHTML[kind]||decorHTML.memory);markChanged();};
 $('#insertSticker')?.addEventListener('mousedown',e=>e.preventDefault());
 $('#insertSticker')?.addEventListener('click',()=>{focusEditor();const sticker=$('#stickerChoice')?.value||'⭐';document.execCommand('insertHTML',false,'<span class="note-sticker">'+sticker+'</span>&nbsp;');markChanged();});
 $$('.emoji-grid [data-emoji]').forEach(b=>{b.addEventListener('mousedown',e=>e.preventDefault());b.onclick=()=>{focusEditor();noteCommand('insertText',false,b.dataset.emoji+' ');markChanged();const menu=$('.emoji-menu');if(menu)menu.open=false;};});
 const emojiMenu=$('.emoji-menu');emojiMenu?.addEventListener('toggle',()=>{if(emojiMenu.open)document.addEventListener('mousedown',function closeEmoji(ev){if(!emojiMenu.contains(ev.target)){emojiMenu.open=false;document.removeEventListener('mousedown',closeEmoji);}});});
 $('#pagePrev').onclick=()=>movePage(-1);$('#pageNext').onclick=()=>movePage(1);$('#deletePage').onclick=deleteCurrentPage;
 $('#insertPageBefore').onclick=()=>insertManualPage('before');
 $('#insertPageAfter').onclick=()=>insertManualPage('after');
 $('#appendPage').onclick=()=>insertManualPage('end');
 function currentPage(){const selected=getSelectionRange();return (selected&&pageOf(selected.startContainer))||pageOf(document.activeElement)||lastActivePage||pages()[0];}
 function focusPageStart(page){if(!page||!wrap.isConnected||!page.isConnected)return;lastActivePage=page;page.scrollIntoView({behavior:'smooth',block:'center'});page.focus({preventScroll:true});const target=page.querySelector('p')||page;const r=document.createRange();r.selectNodeContents(target);r.collapse(true);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r);lastRange=r.cloneRange();updatePager();}
 function insertManualPage(where){const list=pages();const current=currentPage();const currentIndex=Math.max(0,list.indexOf(current));let insertAt=where==='before'?currentIndex:where==='after'?currentIndex+1:list.length;const reference=list[insertAt]||null;if(reference)reference.dataset.manualBreak='true';const p=addPage({before:reference,keepPage:true});focusPageStart(p);markChanged();toast(where==='end'?'Đã thêm trang ở cuối vở':where==='before'?'Đã chèn trang phía trước':'Đã chèn trang phía sau');}
 function movePage(delta){const list=pages(),current=currentPage(),index=Math.max(0,list.indexOf(current)),target=list[Math.min(list.length-1,Math.max(0,index+delta))];if(target)focusPageStart(target);}
 function deleteCurrentPage(){
  const list=pages(),current=currentPage();if(!current)return;
  if(list.length===1){if(!isEmptyPage(current)&&!confirm('Xóa toàn bộ nội dung của trang duy nhất này?'))return;pageNodes(current).forEach(node=>node.remove());current.dataset.manualBreak='';current.dataset.keepPage='';current.dataset.firstWrittenAt='';current.innerHTML='<p><br></p>';updatePageChrome(current);ensurePageMarker(current);ensureInkLayer(current);attachInkEvents(current);focusPageStart(current);markChanged();toast('Đã làm trống trang vở.');return;}
  if(!isEmptyPage(current)&&!confirm('Xóa trang hiện tại cùng toàn bộ nội dung trên trang?'))return;
  const index=list.indexOf(current),target=list[index+1]||list[index-1];current.remove();if(target)focusPageStart(target);markChanged();toast('Đã xóa trang vở.');
 }
 // Rebuild markers and split any saved long note into physical sheets on first open.
 pages().forEach(p=>ensurePageMarker(p));
 if(options.kind!=='news')pages().forEach(linkifyProjectDates);
 if(!pageNodes(pages()[0]).length)pages()[0].innerHTML='<p><br></p>';
 reflowPages();updateWords();updatePager();
}
function renderDashboard(view){
 const roots=activeRoots(),mode=MODE_META[state.data.settings.activeMode]||MODE_META.study,c=counts(roots),dueItems=dueList().slice(0,6),items=visitQuestions(roots),pct=c.q?Math.round((items.filter(x=>x.q.review?.step>=4).length/c.q)*100):0;
 view.innerHTML=`<div class="workspace-heading"><div class="title-block"><div class="title-context">${mode.kicker}</div><h1>${mode.title}</h1></div><div class="workspace-actions"><button class="btn plain project-data-btn project-import-btn" id="dashImportProject" title="Nhập một dự án vào không gian hiện tại" aria-label="Nhập dự án">⇧</button><button class="btn primary" id="dashAdd">＋ Dự án mới</button><button class="btn plain" id="goReview">◷ Lịch ôn <span class="tab-count">${c.d}</span></button></div></div>
 <div class="overview-stats"><div class="overview-stat"><span>Dự án</span><b>${c.p}</b></div><div class="overview-stat"><span>Câu hỏi</span><b>${c.q}</b></div><div class="overview-stat"><span>Đến hạn hôm nay</span><b>${c.d}</b></div><div class="overview-stat"><span>Đã qua mốc 30 ngày</span><b>${pct}%</b></div></div>
 <div class="dashboard-grid"><section class="panel"><div class="panel-heading"><h3>Đến hạn hôm nay</h3><button class="text-action" id="goReview2">Xem tất cả →</button></div>${dueItems.length?dueItems.map(x=>`<div class="due-item"><span class="due-mark">◷</span><button data-jump="${x.node.id}">${esc(x.q.question)}</button><small>${esc(x.node.name)}</small></div>`).join(''):'<div class="quiet-empty">Không có câu hỏi đến hạn.</div>'}</section><section class="panel"><div class="panel-heading"><h3>Chu kỳ ghi nhớ</h3><span class="progress-number">${pct}%</span></div><div class="intervals">${intervals.map(d=>`<span class="interval">${d} ngày</span>`).join('')}</div><div class="progress"><span style="width:${pct}%"></span></div></section></div>
 <div class="child-heading project-library-heading"><h2>Thư viện dự án</h2><span class="library-count">${roots.length} dự án</span></div>${roots.length?`<div class="project-grid">${roots.map(n=>`<article class="project-card"><button class="project-open" data-root="${n.id}"><div class="folder">📁</div><h3>${esc(n.name)}</h3>${n.description?`<p>${esc(n.description)}</p>`:''}<div class="meta"><span>▦ ${n.questions.length} câu</span><span>▣ ${n.children.length} mục con</span></div></button></article>`).join('')}</div>`:'<div class="empty-workspace"><div class="empty-symbol">＋</div><div>Chưa có dự án</div><button class="btn soft tiny" id="dashAddEmpty">Tạo dự án đầu tiên</button></div>'}`;
 $('#dashAdd').onclick=()=>createNode(null);if($('#dashAddEmpty'))$('#dashAddEmpty').onclick=()=>createNode(null);if($('#dashImportProject'))$('#dashImportProject').onclick=()=>chooseProjectImportFile(null);$('#goReview').onclick=$('#goReview2').onclick=async()=>{await state.flushNotebook?.();state.page='review';render();};
 $$('[data-root]').forEach(b=>b.onclick=async()=>{await state.flushNotebook?.();state.selected=b.dataset.root;state.page='home';state.nodeTab='notebook';render();});$$('[data-jump]').forEach(b=>b.onclick=async()=>{await state.flushNotebook?.();state.selected=b.dataset.jump;state.page='home';render();});
}
/* ===== Project-level export/import. Whole-system backup remains unchanged. ===== */
function projectTreeStats(root){
  let projects=0,questions=0,pages=0;
  const nodeIds=new Set();
  function walk(n){if(!n)return;projects++;if(n.id)nodeIds.add(String(n.id));questions+=(n.questions||[]).length;pages+=(n.notePages||[]).length;for(const q of n.questions||[]){}for(const child of n.children||[])walk(child);}
  walk(root);
  let externalRefs=0;const seen=new Set();
  function scanHTML(html){if(!html)return;const doc=new DOMParser().parseFromString(String(html),'text/html');doc.querySelectorAll('a[data-ss-ref="1"][data-ss-type="project"]').forEach(a=>{const id=a.getAttribute('data-ss-id')||'';if(id&&!nodeIds.has(id))seen.add(id);});}
  function scan(n){scanHTML(n.noteHTML);for(const p of n.notePages||[])scanHTML(p.html);for(const q of n.questions||[]){scanHTML(q.questionHTML);scanHTML(q.answerHTML);}for(const child of n.children||[])scan(child);}
  scan(root);externalRefs=seen.size;
  return {projects,questions,pages,externalRefs};
}
function projectPackageBase(node){
  return {app:'StudySpace',kind:'studyspace-project',formatVersion:1,sourceVersion:APP_VERSION,exportedAt:iso(),project:deepCopy(node)};
}
async function exportProjectPackage(projectId){
  if(!(await flushBeforeLeave())){toast('Chưa thể xuất dự án vì còn nội dung chưa lưu.');return;}
  const found=find(projectId);if(!found){toast('Không tìm thấy dự án cần xuất.');return;}
  const base=projectPackageBase(found.node);base.checksum=storageChecksum(base);
  const filename=(String(found.node.name||'du-an').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9-_]+/g,'_').replace(/^_+|_+$/g,'').slice(0,60)||'du-an');
  download(new Blob([JSON.stringify(base)],{type:'application/json'}),'StudySpace_project_'+filename+'_'+localDateKey()+'.json');
  const stats=projectTreeStats(found.node);
  toast(`Đã xuất dự án: ${stats.projects} mục, ${stats.questions} câu hỏi, ${stats.pages} trang vở.`);
}
function chooseProjectImportFile(preferredParentId=null){
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.style.display='none';document.body.append(input);
  input.onchange=async()=>{const file=input.files?.[0];input.remove();if(file)await openProjectImportDialog(file,preferredParentId);};
  input.click();
}
function projectDestinationOptions(preferredParentId=null){
  const currentMode=state.data.settings.activeMode||'study',currentMeta=MODE_META[currentMode]||MODE_META.study;
  const options=[`<option value="__root__" ${preferredParentId?'':'selected'}>＋ Dự án gốc · ${esc(currentMeta.label)}</option>`];
  for(const node of allProjectNodes()){
    const root=pathOf(node.id)[0],mode=root?.mode||'study',meta=MODE_META[mode]||MODE_META.study;
    const path=pathOf(node.id).map(x=>x.name).join(' / ');
    options.push(`<option value="${esc(node.id)}" ${node.id===preferredParentId?'selected':''}>${esc(meta.icon)} ${esc(meta.label)} · ${esc(path)}</option>`);
  }
  return options.join('');
}
function remapImportedProjectIds(rawProject,targetMode){
  const copy=deepCopy(rawProject),nodeMap=new Map(),pageMap=new Map(),questionMap=new Map();
  function collect(n){
    if(!n||typeof n!=='object')return;
    if(n.id)nodeMap.set(String(n.id),uid());
    for(const page of Array.isArray(n.notePages)?n.notePages:[])if(page&&page.id)pageMap.set(String(page.id),uid());
    for(const q of Array.isArray(n.questions)?n.questions:[])if(q&&q.id)questionMap.set(String(q.id),uid());
    for(const child of Array.isArray(n.children)?n.children:[])collect(child);
  }
  function rewriteHTML(html){
    if(!html)return '';
    const doc=new DOMParser().parseFromString(String(html),'text/html');
    doc.querySelectorAll('a[data-ss-ref="1"][data-ss-type="project"]').forEach(a=>{
      const oldNode=a.getAttribute('data-ss-id')||'',newNode=nodeMap.get(oldNode);
      if(newNode){a.setAttribute('data-ss-id',newNode);const oldPage=a.getAttribute('data-ss-page-id')||'',newPage=pageMap.get(oldPage);if(newPage)a.setAttribute('data-ss-page-id',newPage);}
    });
    return sanitizeRichHTML(doc.body.innerHTML);
  }
  function rewrite(n){
    if(!n||typeof n!=='object')return;
    const oldId=String(n.id||'');if(nodeMap.has(oldId))n.id=nodeMap.get(oldId);else n.id=uid();
    n.mode=targetMode;
    if(Array.isArray(n.notePages))n.notePages=n.notePages.map(p=>({...p,id:pageMap.get(String(p?.id||''))||uid(),html:rewriteHTML(p?.html||'')}));
    n.noteHTML=rewriteHTML(n.noteHTML||'');
    if(Array.isArray(n.questions))n.questions=n.questions.map(q=>({...q,id:questionMap.get(String(q?.id||''))||uid(),questionHTML:rewriteHTML(q?.questionHTML||''),answerHTML:rewriteHTML(q?.answerHTML||'')}));
    if(Array.isArray(n.children))n.children.forEach(rewrite);
  }
  collect(copy);rewrite(copy);
  return normalizeNode(copy,new Set(),new Set(),0,targetMode);
}
async function openProjectImportDialog(file,preferredParentId=null){
  if(file.size>150*1024*1024){toast('Tệp dự án vượt quá 150 MB.');return;}
  if(!(await flushBeforeLeave()))return;
  try{
    const payload=JSON.parse(await file.text());
    if(payload?.app!=='StudySpace'||payload?.kind!=='studyspace-project'||!payload.project||typeof payload.project!=='object'||!Array.isArray(payload.project.children)||!Array.isArray(payload.project.questions))throw Error('Đây không phải tệp xuất dự án StudySpace.');
    const check={...payload};delete check.checksum;
    if(!payload.checksum||payload.checksum!==storageChecksum(check))throw Error('Mã kiểm tra toàn vẹn không khớp. Tệp có thể đã bị thay đổi hoặc hỏng.');
    const stats=projectTreeStats(payload.project);
    const defaultParent=preferredParentId&&find(preferredParentId)?preferredParentId:null;
    const meta=MODE_META[payload.project.mode]||MODE_META.study;
    const summary=`<div class="project-import-summary"><div class="project-import-summary-icon">${esc(payload.project.icon||'📁')}</div><div><b>${esc(payload.project.name||'Dự án chưa đặt tên')}</b><small>${stats.projects} dự án · ${stats.questions} câu hỏi · ${stats.pages} trang vở</small><small>Nguồn: ${esc(meta.label)}${stats.externalRefs?` · ${stats.externalRefs} liên kết ngoài gói`:''}</small></div></div>`;
    const warning=stats.externalRefs?`<div class="project-import-warning">Lưu ý: ${stats.externalRefs} liên kết tới dự án bên ngoài gói sẽ giữ nguyên mã tham chiếu. Chúng chỉ mở được khi dự án đích cũng tồn tại trong BLOOM hiện tại.</div>`:'';
    const fields=summary+warning+`<div class="field"><label for="projectImportDestination">Vị trí nhập</label><select id="projectImportDestination" name="destination">${projectDestinationOptions(defaultParent)}</select><div class="hint">Chọn một dự án bất kỳ để nhập thành mục con, hoặc chọn thư mục gốc của chế độ hiện tại. Dữ liệu hiện có không bị ghi đè.</div></div>`;
    modal('Nhập dự án từ tệp JSON',fields,async form=>{
      const destinationId=String(form.get('destination')||'__root__');
      const destination=destinationId==='__root__'?null:find(destinationId);
      if(destinationId!=='__root__'&&!destination){toast('Dự án đích không còn tồn tại. Hãy chọn lại.');return false;}
      if(state.externalUpdate){toast('Dữ liệu đã thay đổi ở cửa sổ khác. Hãy tải lại trước khi nhập dự án.');return false;}
      if(!(await flushBeforeLeave()))return false;
      const targetMode=destination?(pathOf(destinationId)[0]?.mode||state.data.settings.activeMode):state.data.settings.activeMode;
      const imported=remapImportedProjectIds(payload.project,targetMode);
      const snapshot=deepCopy(state.data);
      if(destination){destination.node.children.push(imported);state.expanded.add(destinationId);}
      else state.data.projects.push(imported);
      state.data.settings.activeMode=targetMode;state.selected=imported.id;state.page='home';state.nodeTab='notebook';
      if(!await commitOrRollback(snapshot)){render();toast('Nhập dự án thất bại; dữ liệu trước đó vẫn được giữ.');return false;}
      for(const part of pathOf(imported.id).slice(0,-1))state.expanded.add(part.id);
      render();toast(`Đã nhập “${imported.name}” mà không ghi đè dự án hiện có.`);return true;
    },'Nhập dự án');
  }catch(err){console.error(err);toast(err?.message||'Không đọc được tệp dự án. Dữ liệu hiện tại không thay đổi.');}
}

function qCard(q,index,nodeId,reviewMode=false){const r=q.review||{step:-1,next:null};const imgs=(q.images||[]).map((src,i)=>`<img src="${esc(src)}" data-image="${q.id}" data-i="${i}" alt="Hình minh họa">`).join('');const audio=q.audio?`<audio class="audio-player" controls preload="none" src="${esc(q.audio.data)}"></audio>`:'';let status=!r.next?'Chưa lên lịch ôn':due(q)?'Đến hạn ôn tập':'Ôn tiếp: '+dateLabel(r.next);const controls=`${!r.next?`<button class="btn btn-start" data-start="${q.id}" data-node="${nodeId}">▶ Bắt đầu chu kỳ</button>`:''}<button class="btn btn-again" data-forgot="${q.id}" data-node="${nodeId}">↻ Chưa nhớ</button><button class="btn btn-memory" data-remember="${q.id}" data-node="${nodeId}">✓ Đã nhớ</button>`;return `<article class="q-card" data-q="${q.id}" data-node="${nodeId}"><div class="q-head"><div class="q-index">${String(index+1).padStart(2,'0')}</div><div class="q-main"><p class="q-text">${esc(q.question)}</p>${q.tags?.length?`<div class="q-tags">${q.tags.map(t=>`<button type="button" class="tag tag-button" data-filter-tag="${esc(t)}" title="Lọc nhãn ${esc(t)}">${esc(t)}</button>`).join('')}</div>`:''}</div><div class="q-tools"><button class="icon-btn" title="Đọc câu hỏi" data-speak="${q.id}" data-node="${nodeId}">🔊</button><button class="icon-btn" title="Đọc đáp án" data-speak-answer="${q.id}" data-node="${nodeId}">🗣</button><button class="icon-btn" title="Sửa" data-editq="${q.id}" data-node="${nodeId}">✎</button><button class="icon-btn" title="Xóa" data-delq="${q.id}" data-node="${nodeId}">×</button></div></div>${imgs||audio?`<div class="q-media">${imgs}${audio}</div>`:''}<button class="answer-toggle" aria-expanded="false" data-answer="${q.id}" data-node="${nodeId}"><span class="answer-title"><span>▣　ĐÁP ÁN</span><span>Hiện　⌄</span></span><div class="answer-body rich-answer-body">${answerMarkup}</div></button><div class="review-row"><span class="review-status">${status}${r.reviews?` · Đã ôn ${r.reviews} lần`:''}</span><div class="review-buttons">${controls}</div></div></article>`;}

function renderQuestions(n,query='',status='all',tag='all'){const needle=(query||'').toLocaleLowerCase('vi');const list=n.questions.filter(q=>{const text=(q.question+' '+q.answer+' '+(q.tags||[]).join(' ')).toLocaleLowerCase('vi');if(needle&&!text.includes(needle))return false;if(tag!=='all'&&!(q.tags||[]).includes(tag))return false;if(status==='due'&&!due(q))return false;if(status==='unmemorized'&&(q.review?.step??-1)>=4)return false;if(status==='milestone30'&&(q.review?.step??-1)<4)return false;return true;});$('#questionList').innerHTML=list.length?`<div class="q-list">${list.map((q,i)=>qCard(q,i,n.id)).join('')}</div>`:`<div class="quiet-empty">${query||status!=='all'||tag!=='all'?'Không tìm thấy câu hỏi phù hợp':'Chưa có câu hỏi'}</div>`;bindCards($('#questionList'));$$('[data-filter-tag]',$('#questionList')).forEach(b=>b.onclick=()=>{const filter=$('#qTagFilter');if(filter){filter.value=b.dataset.filterTag;$('#qSearch').value='';renderQuestions(n,'',$('#qStatusFilter').value,filter.value);}});}

function renderReviewPage(view){
 const all=visitQuestions(activeRoots()),dueQs=dueList(),done=all.filter(x=>x.q.review?.step>=4).length,scheduled=all.filter(x=>x.q.review?.next).length;
 view.innerHTML=`<div class="workspace-heading"><div class="title-block"><div class="title-context">GHI NHỚ DÀI HẠN</div><h1>Lịch ôn tập</h1></div><div class="workspace-actions"><button class="btn plain" id="backHome">⌂ Tổng quan</button></div></div>
 <div class="overview-stats"><div class="overview-stat"><span>Đến hạn</span><b>${dueQs.length}</b></div><div class="overview-stat"><span>Đang theo dõi</span><b>${scheduled}</b></div><div class="overview-stat"><span>Đạt mốc 30 ngày</span><b>${done}</b></div><div class="overview-stat"><span>Toàn bộ câu hỏi</span><b>${all.length}</b></div></div>
 <div class="interval-bar">${intervals.map((d,i)=>`<span><b>${d}</b><small>ngày</small></span>`).join('')}</div>
 <div class="review-section-heading"><h2>Phiên ôn hôm nay</h2><span>${dueQs.length} câu</span></div><div id="dueList">${dueQs.length?`<div class="q-list">${dueQs.map((x,i)=>qCard(x.q,i,x.node.id,true)).join('')}</div>`:'<div class="quiet-empty roomy">Bạn đã hoàn thành các câu hỏi đến hạn.</div>'}</div>
 <div class="review-section-heading upcoming-heading"><h2>Sắp đến hạn</h2><span>${all.filter(x=>x.q.review?.next&&!due(x.q)).length} câu</span></div><div class="upcoming-list">${all.filter(x=>x.q.review?.next&&!due(x.q)).sort((a,b)=>new Date(a.q.review.next)-new Date(b.q.review.next)).slice(0,18).map(x=>`<div class="upcoming-item"><button data-jump="${x.node.id}">${esc(x.q.question)}</button><span>${esc(x.node.name)}</span><time>${dateLabel(x.q.review.next)}</time></div>`).join('')||'<div class="quiet-empty">Chưa có câu hỏi sắp đến hạn.</div>'}</div>`;
 $('#backHome').onclick=async()=>{await state.flushNotebook?.();state.page='home';state.selected=null;render();};$$('[data-jump]').forEach(b=>b.onclick=async()=>{await state.flushNotebook?.();state.selected=b.dataset.jump;state.page='home';state.nodeTab='questions';render();});bindCards(view);
}
function bindCards(root){$$('[data-answer]',root).forEach(btn=>btn.onclick=()=>{const isOpen=btn.classList.toggle('open');btn.setAttribute('aria-expanded',String(isOpen));$('.answer-title span:last-child',btn).textContent=isOpen?'Ẩn　⌃':'Hiện　⌄';const q=findQuestion(btn.dataset.node,btn.dataset.answer);if(isOpen&&state.data.settings.autoSpeak&&q&&language(q)?.startsWith('en'))speak(q.question,language(q));});$$('[data-speak]',root).forEach(b=>b.onclick=()=>{const q=findQuestion(b.dataset.node,b.dataset.speak);if(q)speak(q.question,language(q));});$$('[data-speak-answer]',root).forEach(b=>b.onclick=()=>{const q=findQuestion(b.dataset.node,b.dataset.speakAnswer);if(q)speak(q.answer,language(q));});$$('[data-start]',root).forEach(b=>b.onclick=()=>{const q=findQuestion(b.dataset.node,b.dataset.start);if(q)startCycle(q);});$$('[data-remember]',root).forEach(b=>b.onclick=()=>{const q=findQuestion(b.dataset.node,b.dataset.remember);if(q)remember(q);});$$('[data-forgot]',root).forEach(b=>b.onclick=()=>{const q=findQuestion(b.dataset.node,b.dataset.forgot);if(q)forgot(q);});$$('[data-editq]',root).forEach(b=>b.onclick=()=>questionModal(b.dataset.node,b.dataset.editq));$$('[data-delq]',root).forEach(b=>b.onclick=()=>deleteQuestion(b.dataset.node,b.dataset.delq));$$('[data-image]',root).forEach(img=>img.onclick=()=>{const q=findQuestion(img.closest('[data-node]')?.dataset.node,img.dataset.image);const src=q?.images?.[Number(img.dataset.i)];if(src){$('#largeImage').src=src;$('#lightbox').classList.add('show');}});if(!$('#qTagFilter'))$$('[data-filter-tag]',root).forEach(b=>b.onclick=async()=>{const tag=b.dataset.filterTag,nodeId=b.closest('[data-node]')?.dataset.node;if(!nodeId)return;await state.flushNotebook?.();state.selected=nodeId;state.page='home';state.nodeTab='questions';render();if($('#qTagFilter')){$('#qTagFilter').value=tag;$('#qTagFilter').dispatchEvent(new Event('change'));}});}
function findQuestion(nodeId,qid){return find(nodeId)?.node.questions.find(q=>q.id===qid);}
function language(q){if(q.language==='en-US'||q.language==='en-GB'||q.language==='vi-VN')return q.language;if(q.language==='off')return null;const txt=q.question||'';return /[ăâđêôơưĂÂĐÊÔƠƯàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]/i.test(txt)?'vi-VN':'en-US';}
let speechVoiceCache=[];if('speechSynthesis'in window){const refreshSpeechVoices=()=>{speechVoiceCache=speechSynthesis.getVoices()||[];};refreshSpeechVoices();speechSynthesis.addEventListener?.('voiceschanged',refreshSpeechVoices);speechSynthesis.onvoiceschanged=refreshSpeechVoices;}
function speak(text,lang){if(!('speechSynthesis'in window)){toast('Trình duyệt này chưa hỗ trợ đọc văn bản.');return;}if(!lang){toast('Câu hỏi đang tắt chức năng phát âm.');return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(text||''));u.lang=lang;u.rate=Number(state.data.settings.rate||1);u.onerror=()=>toast('Không phát được giọng đọc trên thiết bị này.');let started=false;const startSpeaking=()=>{if(started)return;started=true;const voices=speechVoiceCache.length?speechVoiceCache:(speechVoiceCache=speechSynthesis.getVoices()||[]);const voice=voices.find(v=>v.lang.toLowerCase()===lang.toLowerCase())||voices.find(v=>v.lang.toLowerCase().startsWith(lang.slice(0,2).toLowerCase()));if(voice)u.voice=voice;speechSynthesis.speak(u);};if(!speechVoiceCache.length){speechSynthesis.addEventListener?.('voiceschanged',()=>{speechVoiceCache=speechSynthesis.getVoices()||[];startSpeaking();},{once:true});setTimeout(startSpeaking,450);}else startSpeaking();}

function formField(label,id,placeholder,value='',type='text',hint=''){return `<div class="field"><label for="${id}">${label}</label>${type==='textarea'?`<textarea id="${id}" name="${id}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`:`<input id="${id}" name="${id}" type="${type}" placeholder="${esc(placeholder)}" value="${esc(value)}">`}${hint?`<div class="hint">${hint}</div>`:''}</div>`;}
function modal(title,html,saveFn,submit='Lưu lại'){state.questionGridDispose?.();state.questionGridDispose=null;state.questionGridSerialize=null;state.questionEditorController?.abort();state.questionEditorController=null;$('#overlay').classList.remove('show','question-grid-overlay');$('#overlay .modal')?.classList.remove('question-grid-modal');$('#form').classList.remove('question-grid-form');$('#form').reset();state.modalSave=null;$('#modalTitle').textContent=title;$('#fields').innerHTML=html;$('#submit').textContent=submit;state.modalSave=saveFn;$('#overlay').classList.add('show');}
function closeModal(){state.questionGridDispose?.();state.questionGridDispose=null;state.questionGridSerialize=null;state.questionEditorController?.abort();state.questionEditorController=null;$('#overlay').classList.remove('show','question-grid-overlay');$('#overlay .modal')?.classList.remove('question-grid-modal');$('#form').classList.remove('question-grid-form');$('#form').reset();state.modalSave=null;state.pendingImages=[];state.removeMedia.clear();}
async function createNode(parent){await state.flushNotebook?.();modal(parent?'Tạo dự án con':'Tạo dự án mới',formField('Tên dự án','name','Ví dụ: Tiếng Anh 11')+formField('Mô tả / mục tiêu','desc','Phạm vi kiến thức, mục tiêu...', '', 'textarea'),async f=>{const name=f.get('name').trim();if(!name)return toast('Hãy nhập tên dự án.'),false;const n=makeNode(name,f.get('desc')||'');if(!parent)n.mode=state.data.settings.activeMode;if(parent){const p=find(parent);if(!p)return false;p.node.children.push(n);state.expanded.add(parent);}else state.data.projects.push(n);state.selected=n.id;state.page='home';await save();render();toast('Đã tạo dự án.');});}
async function editNode(id){
  if(!(await flushBeforeLeave()))return;const initial=find(id);if(!initial)return;const original=initial.node,currentParent=initial.parent?.id||'';
  modal('Chỉnh sửa dự án',formField('Tên dự án','name','Tên dự án',original.name)+formField('Mô tả / mục tiêu','desc','Mô tả...',original.description,'textarea')+folderSelectHTML(currentParent,id,'Di chuyển vào thư mục'),async f=>{
    const name=String(f.get('name')||'').trim();if(!name){toast('Tên không được để trống.');return false;}
    const current=find(id);if(!current){toast('Dự án không còn tồn tại.');return false;}
    const parentId=f.get('parentId')||'';if(!validateMoveNode(id,parentId)){toast('Không thể chuyển dự án vào chính nó hoặc thư mục con của nó.');return false;}
    const destination=parentId?find(parentId)?.node:null;if(parentId&&!destination){toast('Thư mục đích không còn tồn tại.');return false;}
    const snapshot=deepCopy(state.data),node=current.node,oldParent=current.parent?.id||'';
    node.name=name;node.description=String(f.get('desc')||'').trim();node.updatedAt=iso();
    if(parentId!==oldParent){current.siblings.splice(current.siblings.indexOf(node),1);if(destination){destination.children.push(node);state.expanded.add(destination.id);}else{node.mode=state.data.settings.activeMode;state.data.projects.push(node);}}
    state.selected=node.id;state.page='home';
    if(!await commitOrRollback(snapshot)){render();return false;}
    render();toast(parentId===oldParent?'Đã cập nhật dự án.':'Đã cập nhật và di chuyển dự án.');return true;
  });
}
async function deleteNode(id){await state.flushNotebook?.();const f=find(id);if(!f)return;if(!confirm('Xóa mục này cùng toàn bộ dự án con, hình ảnh và câu hỏi bên trong?'))return;f.siblings.splice(f.siblings.indexOf(f.node),1);state.selected=f.parent?.id||null;save().then(()=>{render();toast('Đã xóa mục.');});}
function questionRichEditorField(name,label,initialHTML,plainText){
  const safeHTML=sanitizeRichHTML(initialHTML||String(plainText||'').split(/\r?\n/).map(x=>esc(x)).join('<br>'));
  const id=name==='question'?'qQuestionEditor':'qAnswerEditor';
  const plainId=name==='question'?'qQuestionPlain':'qAnswerPlain';
  const htmlId=name==='question'?'qQuestionHTML':'qAnswerHTML';
  const emojis=['⭐','🌟','✨','💫','🔥','💡','🧠','📌','📍','🎯','🏆','✅','❌','⚠️','❗','❓','📖','📚','📝','✏️','🖊️','📅','🗓️','⏳','⏰','🧪','🔬','⚗️','➗','📐','📊','📈','🌱','🌿','🌍','🧭','🏛️','🎨','🎵','💎','❤️','💙','💚','💜','🧡','🤔','🙌','👏','🚀','🔎'];
  return `<div class="field q-rich-field"><label>${esc(label)}</label>
    <div class="q-rich-tools" data-q-toolbar="${name}" aria-label="Công cụ định dạng ${esc(label)}">
      <div class="q-tool-cluster"><button type="button" data-q-cmd="undo" title="Hoàn tác">↶</button><button type="button" data-q-cmd="redo" title="Làm lại">↷</button></div>
      <div class="q-tool-cluster"><select data-q-font title="Phông chữ"><option value="Georgia">Georgia</option><option value="Arial">Arial</option><option value="'Times New Roman'">Times New Roman</option><option value="Cambria">Cambria</option><option value="Verdana">Verdana</option><option value="'Trebuchet MS'">Trebuchet</option></select><select data-q-size title="Cỡ chữ"><option value="2">Nhỏ</option><option value="3" selected>Vừa</option><option value="4">Lớn</option><option value="5">Rất lớn</option></select></div>
      <div class="q-tool-cluster"><button type="button" data-q-cmd="bold" title="In đậm"><b>B</b></button><button type="button" data-q-cmd="italic" title="In nghiêng"><i>I</i></button><button type="button" data-q-cmd="underline" title="Gạch chân"><u>U</u></button><button type="button" data-q-cmd="strikeThrough" title="Gạch ngang"><s>S</s></button><button type="button" data-q-cmd="superscript" title="Chỉ số trên">x²</button><button type="button" data-q-cmd="subscript" title="Chỉ số dưới">H₂</button></div>
      <div class="q-tool-cluster"><select data-q-block title="Kiểu đoạn"><option value="p">Văn bản</option><option value="h2">Tiêu đề</option><option value="h3">Đề mục</option><option value="blockquote">Trích dẫn</option></select><button type="button" data-q-cmd="insertUnorderedList" title="Danh sách">☷</button><button type="button" data-q-cmd="insertOrderedList" title="Danh sách đánh số">1.</button><button type="button" data-q-cmd="justifyLeft" title="Căn trái">⇤</button><button type="button" data-q-cmd="justifyCenter" title="Căn giữa">↔</button><button type="button" data-q-cmd="justifyRight" title="Căn phải">⇥</button><button type="button" data-q-checklist title="Chèn danh sách việc cần làm">☑</button><button type="button" data-q-rule title="Chèn đường phân cách">―</button><button type="button" data-q-link title="Chèn liên kết web">🔗 Web</button><button type="button" data-q-internal-ref class="q-internal-ref" title="Gắn liên kết nội bộ tại đoạn chữ đang chọn">⛓ Nội bộ</button><button type="button" data-open-study-tools class="study-tools-launch" title="Chèn học cụ theo môn học">✦ Học cụ</button></div>
      <div class="q-tool-cluster"><label title="Màu chữ">A <input type="color" data-q-color value="#245fc7" aria-label="Màu chữ"></label><select data-q-highlight-select title="Màu tô sáng"><option value="#fff0a9">Tô vàng</option><option value="#ffdce5">Tô hồng</option><option value="#d8f3e9">Tô xanh ngọc</option><option value="#dceaff">Tô xanh dương</option><option value="#eadfff">Tô tím</option></select><button type="button" data-q-highlight="apply" title="Tô vùng chữ">▰ Tô</button></div>
      <div class="q-tool-cluster"><select data-q-template title="Mẫu trang trí"><option value="memory">▣ Ghi nhớ</option><option value="idea">✦ Ý chính</option><option value="warning">⚑ Lưu ý</option><option value="formula">ƒ Công thức</option><option value="definition">◇ Định nghĩa</option><option value="example">✎ Ví dụ</option><option value="history">◷ Mốc thời gian</option><option value="compare">⇄ So sánh</option><option value="quote">❝ Trích dẫn</option><option value="theorem">∑ Định lý</option><option value="steps">☷ Các bước giải</option><option value="flashcard">▣ Thẻ kiến thức</option><option value="timeline2">➜ Dòng thời gian</option><option value="divider">— Phân cách</option></select><button type="button" data-q-insert-template title="Chèn mẫu đã chọn">＋ Chèn</button></div>
      <div class="q-tool-cluster"><details class="q-emoji-menu"><summary>😊 Emoji</summary><div class="q-emoji-pop"><div class="q-emoji-grid">${emojis.map(x=>`<button type="button" data-q-emoji="${x}" title="${x}">${x}</button>`).join('')}</div></div></details><select data-q-sticker title="Nhãn dán"><option value="⭐">⭐</option><option value="🏆">🏆</option><option value="💡">💡</option><option value="📌">📌</option><option value="🔥">🔥</option><option value="🌟">🌟</option><option value="✅">✅</option><option value="🎯">🎯</option><option value="🧠">🧠</option><option value="📚">📚</option></select><button type="button" data-q-sticker-insert title="Chèn nhãn dán">✦ Dán</button></div>
      
      <div class="q-tool-cluster"><button type="button" data-q-table title="Chèn bảng">▦ Bảng</button><button type="button" data-q-date title="Chèn ngày">◷ Ngày</button><button type="button" data-q-insert-image title="Chèn ảnh vào nội dung">▧ Ảnh</button><button type="button" data-q-insert-audio title="Chèn âm thanh vào nội dung">♫ Âm thanh</button><button type="button" data-q-clear title="Xóa định dạng">Tx</button><input type="file" data-q-image-file accept="image/*" hidden><input type="file" data-q-audio-file accept="audio/*" hidden></div>
    </div>
    <div class="q-rich-editor" id="${id}" data-q-editor="${name}" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true">${safeHTML}</div>
    <input type="hidden" id="${plainId}" name="${name}" value="${esc(plainText||'')}"><input type="hidden" id="${htmlId}" name="${name}HTML" value="${esc(safeHTML)}">
    <small class="hint">Có thể định dạng, chèn khung kiến thức, công thức, bảng, Emoji và Sticker ngay trong nội dung.</small>
  </div>`;
}
function bindQuestionRichEditors(){
  state.questionEditorController?.abort();
  const controller=new AbortController();state.questionEditorController=controller;const signal=controller.signal;
  let active=null,lastRange=null;
  const editors=$$('[data-q-editor]',$('#form'));
  const sync=editor=>{if(!editor)return;const name=editor.dataset.qEditor,plain=$(`#q${name==='question'?'Question':'Answer'}Plain`,$('#form')),html=$(`#q${name==='question'?'Question':'Answer'}HTML`,$('#form'));if(plain)plain.value=(editor.innerText||editor.textContent||'').replace(/\u00a0/g,' ').trim();if(html)html.value=sanitizeRichHTML(editor.innerHTML);};
  const remember=()=>{const sel=window.getSelection();if(sel&&sel.rangeCount&&active){const r=sel.getRangeAt(0);if(active.contains(r.commonAncestorContainer))lastRange=r.cloneRange();}};
  const restore=editor=>{if(!editor)return;editor.focus({preventScroll:true});if(lastRange&&lastRange.startContainer.isConnected&&editor.contains(lastRange.commonAncestorContainer)){try{const sel=window.getSelection();sel.removeAllRanges();sel.addRange(lastRange);return;}catch(_){}}const range=document.createRange();range.selectNodeContents(editor);range.collapse(false);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);lastRange=range.cloneRange();};
  const templates={memory:'<div class="note-card note-card-blue"><p class="note-card-kicker">✦ GHI NHỚ</p><p>Nội dung quan trọng cần ghi lại…</p></div><p><br></p>',idea:'<div class="note-card note-card-mint"><p class="note-card-kicker">✧ Ý CHÍNH</p><p>Ghi ý chính tại đây…</p></div><p><br></p>',warning:'<div class="note-card note-card-amber"><p class="note-card-kicker">⚑ LƯU Ý</p><p>Điểm cần chú ý hoặc dễ nhầm lẫn…</p></div><p><br></p>',formula:'<div class="note-card note-card-violet"><p class="note-card-kicker">ƒ CÔNG THỨC</p><p>Nhập công thức và giải thích…</p></div><p><br></p>',definition:'<div class="note-card note-card-sky"><p class="note-card-kicker">◇ ĐỊNH NGHĨA</p><p>Ghi khái niệm và nội dung cốt lõi…</p></div><p><br></p>',example:'<div class="note-card note-card-mint"><p class="note-card-kicker">✎ VÍ DỤ MINH HỌA</p><p>Ghi ví dụ cụ thể tại đây…</p></div><p><br></p>',history:'<div class="note-card note-card-gold"><p class="note-card-kicker">◷ MỐC THỜI GIAN</p><p><b>Thời điểm:</b> …</p><p><b>Kết quả:</b> …</p></div><p><br></p>',compare:'<div class="note-card note-card-violet"><p class="note-card-kicker">⇄ SO SÁNH</p><p><b>Điểm giống:</b> …</p><p><b>Điểm khác:</b> …</p></div><p><br></p>',quote:'<div class="note-card note-card-rose"><p class="note-card-kicker">❝ TRÍCH DẪN</p><p>“Ghi câu trích dẫn nổi bật tại đây…”</p><p><i>— Nguồn / tác giả</i></p></div><p><br></p>',theorem:'<div class="note-card note-card-violet"><p class="note-card-kicker">∑ ĐỊNH LÝ / MỆNH ĐỀ</p><p><b>Phát biểu:</b> …</p><p><b>Điều kiện:</b> …</p><p><b>Hệ quả:</b> …</p></div><p><br></p>',steps:'<div class="note-card note-card-sky"><p class="note-card-kicker">☷ CÁC BƯỚC GIẢI</p><ol><li>Bước 1: …</li><li>Bước 2: …</li><li>Bước 3: …</li></ol></div><p><br></p>',flashcard:'<div class="note-card note-card-gold"><p class="note-card-kicker">▣ THẺ KIẾN THỨC</p><p><b>Khái niệm:</b> …</p><p><b>Từ khóa:</b> …</p><p><b>Ghi nhớ:</b> …</p></div><p><br></p>',timeline2:'<div class="note-card note-card-mint"><p class="note-card-kicker">➜ DÒNG THỜI GIAN</p><p><b>Mốc 1:</b> …</p><p><b>Mốc 2:</b> …</p><p><b>Mốc 3:</b> …</p></div><p><br></p>',divider:'<hr class="note-divider"><p><br></p>'};
  editors.forEach(editor=>{editor.addEventListener('focus',()=>{active=editor;},{signal});editor.addEventListener('input',()=>sync(editor),{signal});});
  document.addEventListener('selectionchange',remember,{signal});
  $$('.q-rich-tools',$('#form')).forEach(toolbar=>{
    toolbar.addEventListener('pointerdown',e=>{const editor=$(`[data-q-editor="${toolbar.dataset.qToolbar}"]`,$('#form'));if(editor&&active===editor)remember();const target=e.target.closest('button');if(target)e.preventDefault();},{signal});
    toolbar.addEventListener('click',e=>{
      const button=e.target.closest('button');if(!button)return;const editor=$(`[data-q-editor="${toolbar.dataset.qToolbar}"]`,$('#form'));if(!editor)return;active=editor;restore(editor);
      if(button.hasAttribute('data-q-internal-ref')){remember();const range=lastRange?.cloneRange()||null;const existingRef=inlineReferenceAtRange(range,editor);openInlineRefPicker({selectedText:range?.toString()||existingRef?.textContent||'',existingRef,onInsert:(html)=>{active=editor;if(existingRef&&existingRef.isConnected){existingRef.outerHTML=html;}else{restore(editor);document.execCommand('insertHTML',false,html);}remember();sync(editor);}});return;}
      else if(button.dataset.qCmd)document.execCommand(button.dataset.qCmd,false,null);
      else if(button.dataset.qBlock)document.execCommand('formatBlock',false,button.dataset.qBlock);
      else if(button.hasAttribute('data-q-insert-template'))document.execCommand('insertHTML',false,templates[toolbar.querySelector('[data-q-template]')?.value]||templates.memory);
      else if(button.dataset.qEmoji)document.execCommand('insertText',false,button.dataset.qEmoji+' ');
      else if(button.hasAttribute('data-q-sticker-insert'))document.execCommand('insertHTML',false,`<span class="note-sticker">${esc(toolbar.querySelector('[data-q-sticker]')?.value||'⭐')}</span>&nbsp;`);
      else if(button.hasAttribute('data-q-highlight'))document.execCommand('hiliteColor',false,toolbar.querySelector('[data-q-highlight-select]')?.value||'#fff0a9');
      else if(button.hasAttribute('data-q-table')){const r=prompt('Số hàng (1–12):','3');if(r===null)return;const c=prompt('Số cột (1–8):','3');if(c===null)return;const rows=Math.max(1,Math.min(12,parseInt(r,10)||1)),cols=Math.max(1,Math.min(8,parseInt(c,10)||1));let html='<table class="note-table"><tbody>';for(let y=0;y<rows;y++){html+='<tr>';for(let x=0;x<cols;x++)html+=`<${y===0?'th':'td'}><br></${y===0?'th':'td'}>`;html+='</tr>';}html+='</tbody></table><p><br></p>';document.execCommand('insertHTML',false,html);}
      else if(button.hasAttribute('data-q-checklist'))document.execCommand('insertHTML',false,'<ul class="note-checklist"><li>☐ Việc cần hoàn thành</li><li>☐ Việc tiếp theo</li></ul><p><br></p>');
      else if(button.hasAttribute('data-q-rule'))document.execCommand('insertHTML',false,'<hr class="note-divider"><p><br></p>');
      else if(button.hasAttribute('data-q-link')){const url=prompt('Nhập địa chỉ liên kết (https://...)');if(url&&/^https?:\/\//i.test(url.trim()))document.execCommand('createLink',false,url.trim());else if(url)toast('Liên kết phải bắt đầu bằng http:// hoặc https://.');}
      else if(button.hasAttribute('data-q-insert-image')){toolbar.querySelector('[data-q-image-file]')?.click();return;}
      else if(button.hasAttribute('data-q-insert-audio')){toolbar.querySelector('[data-q-audio-file]')?.click();return;}
      else if(button.hasAttribute('data-q-date'))document.execCommand('insertText',false,new Date().toLocaleDateString('vi-VN'));
      else if(button.hasAttribute('data-q-clear'))document.execCommand('removeFormat',false,null);
      remember();sync(editor);const menu=button.closest('.q-emoji-menu');if(menu)menu.open=false;
    },{signal});
    const imageInput=toolbar.querySelector('[data-q-image-file]');
    imageInput?.addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{const src=await compressImage(file);active=editor;restore(editor);document.execCommand('insertHTML',false,`<img src="${src}" alt="Hình minh họa" class="q-inline-media">`);sync(editor);remember();}catch(err){toast(err?.message||'Không thể chèn ảnh vào nội dung.');}},{signal});
    const audioInput=toolbar.querySelector('[data-q-audio-file]');
    audioInput?.addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{const media=await fileToData(file);active=editor;restore(editor);document.execCommand('insertHTML',false,`<audio controls preload="none" src="${media.data}"></audio><p><br></p>`);sync(editor);remember();}catch(err){toast(err?.message||'Không thể chèn âm thanh vào nội dung.');}},{signal});
    const applySelect=(selector,command,valueFn)=>{const select=toolbar.querySelector(selector);select?.addEventListener('change',e=>{const editor=$(`[data-q-editor="${toolbar.dataset.qToolbar}"]`,$('#form'));if(!editor)return;active=editor;restore(editor);document.execCommand(command,false,valueFn?valueFn(e.target.value):e.target.value);remember();sync(editor);},{signal});};
    applySelect('[data-q-font]','fontName');applySelect('[data-q-size]','fontSize');applySelect('[data-q-block]','formatBlock',v=>v);
    toolbar.querySelector('[data-q-color]')?.addEventListener('change',e=>{const editor=$(`[data-q-editor="${toolbar.dataset.qToolbar}"]`,$('#form'));if(editor){active=editor;restore(editor);document.execCommand('foreColor',false,e.target.value);remember();sync(editor);}},{signal});
    toolbar.querySelector('[data-q-highlight-select]')?.addEventListener('change',remember,{signal});
  });
  signal.addEventListener('abort',()=>{if(state.questionEditorController===controller)state.questionEditorController=null;},{once:true});
}
async function questionModal(nodeId,qid=null){
  if(!(await flushBeforeLeave()))return;
  const initialQuestion=qid?findQuestion(nodeId,qid):null;if(qid&&!initialQuestion){toast('Không tìm thấy câu hỏi cần sửa.');return;}
  state.pendingImages=[];state.editImages=[...(initialQuestion?.images||[])];state.removeMedia=new Set();
  const current=state.editImages.map((src,i)=>`<div class="preview-item"><img src="${esc(src)}" alt="Ảnh ${i+1}"><button type="button" data-remove-existing="${i}">×</button></div>`).join('');
  const audioInfo=initialQuestion?.audio?`<div class="existing-audio">Đã có âm thanh: ${esc(initialQuestion.audio.name||'tệp âm thanh')} <label><input type="checkbox" id="removeAudio"> Xóa tệp này khi lưu</label></div>`:'';
  const createdInfo=initialQuestion?`<div class="q-created-info">🗓 Câu hỏi được tạo ngày <b>${dateLabel(initialQuestion.createdAt)}</b>. Ngày tạo được giữ nguyên khi chỉnh sửa.</div>`:'<div class="q-created-info">🗓 Ngày tạo sẽ được lưu tự động. Lịch ôn đầu tiên được đặt sau 2 ngày.</div>';
  const fields=questionRichEditorField('question','Nội dung câu hỏi',initialQuestion?.questionHTML,initialQuestion?.question)+questionRichEditorField('answer','Đáp án',initialQuestion?.answerHTML,initialQuestion?.answer)+formField('Nhãn / chủ đề','tags','Ví dụ: Từ vựng, Mốc thời gian',initialQuestion?.tags?.join(', ')||'')+folderSelectHTML(nodeId,null,'Lưu câu hỏi trong thư mục')+createdInfo+`<div class="field"><label>Ngôn ngữ phát âm</label><select name="language" id="language"><option value="auto" ${!initialQuestion||initialQuestion.language==='auto'?'selected':''}>Tự nhận diện riêng câu hỏi và đáp án</option><option value="en-US" ${initialQuestion?.language==='en-US'?'selected':''}>English (US)</option><option value="en-GB" ${initialQuestion?.language==='en-GB'?'selected':''}>English (UK)</option><option value="vi-VN" ${initialQuestion?.language==='vi-VN'?'selected':''}>Tiếng Việt</option><option value="off" ${initialQuestion?.language==='off'?'selected':''}>Không phát âm</option></select></div><div class="field"><label>Hình ảnh minh họa (tối đa 8 ảnh)</label><div class="file-box"><input type="file" id="imageFiles" accept="image/*" multiple><div class="preview-list" id="imagePreview">${current}</div></div></div><div class="field"><label>Tệp âm thanh (tối đa 15 MB)</label><div class="file-box"><input type="file" id="audioFile" accept="audio/*">${audioInfo}</div></div>`;
  modal(initialQuestion?'Chỉnh sửa câu hỏi':'Thêm câu hỏi mới',fields,async f=>{
    const question=String(f.get('question')||'').trim();if(!question){toast('Hãy nhập nội dung câu hỏi.');return false;}
    const currentNode=find(nodeId);if(!currentNode){toast('Dự án ban đầu không còn tồn tại.');return false;}
    const latestQuestion=qid?findQuestion(nodeId,qid):null;if(qid&&!latestQuestion){toast('Câu hỏi không còn tồn tại trong dự án này.');return false;}
    const targetNodeId=f.get('parentId')||nodeId,destination=find(targetNodeId);if(!destination){toast('Thư mục đích không còn tồn tại.');return false;}
    if(state.editImages.length-state.removeMedia.size+state.pendingImages.length>8){toast('Mỗi câu hỏi tối đa 8 ảnh.');return false;}
    let audio=latestQuestion?.audio||null;try{if($('#removeAudio')?.checked)audio=null;if($('#audioFile')?.files?.[0])audio=await fileToData($('#audioFile').files[0]);}catch(err){toast(err.message||'Không đọc được tệp âm thanh.');return false;}
    const snapshot=deepCopy(state.data),images=state.editImages.filter((_,i)=>!state.removeMedia.has(i)).concat(state.pendingImages),createdAt=latestQuestion?.createdAt||iso(),createdDate=latestQuestion?.createdDate||reviewDateKey(createdAt)||localDateKey();
    const obj=latestQuestion||normalizeQ({createdAt,createdDate});
    obj.question=question;obj.answer=String(f.get('answer')||'').trim();obj.questionHTML=sanitizeRichHTML(String(f.get('questionHTML')||''));obj.answerHTML=sanitizeRichHTML(String(f.get('answerHTML')||''));
    obj.tags=[...new Set(String(f.get('tags')||'').split(',').map(x=>x.trim()).filter(Boolean))];obj.language=f.get('language')||'auto';obj.images=images;obj.audio=audio;obj.createdAt=createdAt;obj.createdDate=createdDate;obj.updatedAt=iso();
    if(!latestQuestion){const firstDue=addDays(createdAt,intervals[0]);obj.review={...normalizedReview(null),step:0,startedAt:createdAt,next:firstDue,last:null,lastReviewDate:null,reviews:0,lapses:0,retry:false,completed:false,completedAt:null,completedMilestones:[],milestoneDueDates:{},milestone30CompletedAt:null,milestone30DueDate:null};}
    if(latestQuestion&&targetNodeId!==nodeId){currentNode.node.questions=currentNode.node.questions.filter(x=>x.id!==latestQuestion.id);destination.node.questions.push(obj);}
    else if(!latestQuestion)destination.node.questions.push(obj);
    currentNode.node.updatedAt=iso();destination.node.updatedAt=iso();state.selected=targetNodeId;state.page='home';state.nodeTab='questions';state.questionFilters={nodeId:targetNodeId,query:'',status:'all',tag:'all'};
    if(!await commitOrRollback(snapshot)){render();return false;}
    render();toast(latestQuestion?(targetNodeId!==nodeId?'Đã cập nhật và di chuyển câu hỏi.':'Đã cập nhật câu hỏi.'):'Đã tạo câu hỏi và tự lên lịch ôn đầu tiên sau 2 ngày.');return true;
  },initialQuestion?'Lưu thay đổi':'Thêm câu hỏi');
  bindQuestionRichEditors();
  $('#imageFiles').onchange=async e=>{const files=[...e.target.files];const existing=state.editImages.length-state.removeMedia.size;if(existing+state.pendingImages.length+files.length>8){toast('Mỗi câu hỏi tối đa 8 ảnh.');e.target.value='';return;}for(const file of files){if(!file.type.startsWith('image/'))continue;try{state.pendingImages.push(await compressImage(file));}catch(err){console.error(err);toast('Không đọc được hình ảnh: '+file.name);}}renderPreview();e.target.value='';};
  $('#imagePreview').onclick=e=>{const b=e.target.closest('[data-remove-existing]');if(b){const i=Number(b.dataset.removeExisting);state.removeMedia.has(i)?state.removeMedia.delete(i):state.removeMedia.add(i);renderPreview();return;}const p=e.target.closest('[data-remove-new]');if(p){state.pendingImages.splice(Number(p.dataset.removeNew),1);renderPreview();}};renderPreview();
}
function renderPreview(){const host=$('#imagePreview');host.innerHTML=state.editImages.map((src,i)=>`<div class="preview-item" style="opacity:${state.removeMedia.has(i)?'.3':'1'}"><img src="${esc(src)}"><button type="button" data-remove-existing="${i}">${state.removeMedia.has(i)?'+':'×'}</button></div>`).join('')+state.pendingImages.map((src,i)=>`<div class="preview-item"><img src="${esc(src)}"><button type="button" data-remove-new="${i}">×</button></div>`).join('');}
function compressImage(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=reject;r.onload=()=>{const im=new Image();im.onerror=reject;im.onload=()=>{const scale=Math.min(1,1600/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.round(im.width*scale);c.height=Math.round(im.height*scale);c.getContext('2d').drawImage(im,0,0,c.width,c.height);resolve(c.toDataURL('image/webp',.82));};im.src=r.result;};r.readAsDataURL(file);});}
function fileToData(file){return new Promise((resolve,reject)=>{if(file.size>15*1024*1024){reject(Error('Audio quá lớn'));toast('Tệp âm thanh tối đa 15 MB.');return;}const r=new FileReader();r.onload=()=>resolve({name:file.name,type:file.type,data:r.result});r.onerror=reject;r.readAsDataURL(file);});}
function deleteQuestion(nodeId,qid){const f=find(nodeId);if(!f)return;if(!confirm('Xóa câu hỏi và tệp đính kèm?'))return;f.node.questions=f.node.questions.filter(q=>q.id!==qid);save().then(()=>{render();toast('Đã xóa câu hỏi.');});}
async function exportBackup(){await state.flushNotebook?.();const payload={app:'StudySpace',version:3,exportedAt:iso(),data:state.data};const blob=new Blob([JSON.stringify(payload)],{type:'application/json'});download(blob,'studyspace_backup_'+new Date().toISOString().slice(0,10)+'.json');toast('Đã tạo bản sao lưu.');}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function importBackup(file){if(!file)return;const r=new FileReader();r.onload=async()=>{try{const x=JSON.parse(r.result),data=x.data||x;if(!Array.isArray(data.projects))throw Error('Không đúng cấu trúc');if(!confirm('Nhập dữ liệu sẽ thay thế toàn bộ dữ liệu hiện tại. Bạn đã sao lưu dữ liệu cũ chưa?'))return;await state.flushNotebook?.();state.data={version:3,projects:data.projects.map(normalizeNode),newsEntries:{},settings:data.settings||{autoSpeak:false,rate:1}};for(const [date,entry] of Object.entries(data.newsEntries||{})){if(isValidDateKey(date))state.data.newsEntries[date]=normalizeNewsEntry(entry,date);}state.selected=null;state.page='home';await save();render();toast('Đã khôi phục dữ liệu.');}catch(e){alert('Tệp sao lưu không hợp lệ.');}};r.readAsText(file);}

/* =========================
   StudySpace Core Rebuild v4
   State-safe editing, durable saves, guarded review cycles and navigation.
   ========================= */
Object.assign(state,{
  questionFilters:{nodeId:null,query:'',status:'all',tag:'all'},
  openAnswers:new Set(),
  reviewBusy:new Set(),
  revealQuestionId:null,
  reviewRevealedId:null,
  reviewGateActive:false,
  jumpToPage:null,
  externalUpdate:false,
  saveChain:Promise.resolve(),
  notebookController:null,
  notebookDispose:null,
  storeNotebookDraft:null,
  activeDraftKey:null,
  draftWarningShown:false,
  tabId:uid(),
  storagePersistent:null,storageUsage:null,storageQuota:null,storageLastSnapshot:null,storageFallbackActive:false,storageFallbackLoadedAt:0,storageSnapshotsCount:0,storageLastAutoSnapshotAt:0,storageIntegrityBlocked:false,snapshotWarningShown:false
});

const APP_VERSION=17;
const DRAFT_KEY='studyspace_unsaved_note_v1';
const SYNC_CHANNEL='studyspace_sync_v1';
let syncChannel=null;
const deepCopy=value=>JSON.parse(JSON.stringify(value));
// FNV-1a fingerprint detects accidental truncation/corruption; it is not a security signature.
function storageChecksum(value){
  const copy=deepCopy(value);
  if(copy&&typeof copy==='object')delete copy._checksum;
  const raw=JSON.stringify(copy);let hash=2166136261;
  for(let i=0;i<raw.length;i++){hash^=raw.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return 'fnv1a32-'+(hash>>>0).toString(16).padStart(8,'0');
}
function validStoredPayload(value){return !value||!value._checksum||String(value._checksum)===storageChecksum(value);}
function validSnapshotRecord(record){return !record?.checksum||String(record.checksum)===storageChecksum(record.data);}
function setSaveLabel(text,kind='ok'){
  const el=$('#saveLabel');if(!el)return;
  el.textContent=text;el.dataset.state=kind;
  el.title=kind==='error'?'Có thay đổi chưa được lưu':kind==='warning'?'Dữ liệu đang dùng kho dự phòng hoặc cần đối chiếu':'Click để xem tình trạng lưu trữ';
  const dot=el.closest('.storage-center')?.querySelector('.dot')||el.parentElement?.querySelector('.dot');
  if(dot){dot.style.background=kind==='error'?'#e45b68':kind==='warning'?'#e0a12d':'#36bd90';dot.style.boxShadow=kind==='error'?'0 0 0 4px rgba(228,91,104,.14)':kind==='warning'?'0 0 0 4px rgba(224,161,45,.15)':'0 0 0 4px rgba(54,189,144,.14)';}
  const mini=$('#storageMiniLabel');if(mini){mini.textContent=kind==='error'?'Cần kiểm tra':state.storageFallbackActive?'Đang dùng bản dự phòng':kind==='warning'?'Đang đối chiếu':state.db?(state.storagePersistent===true?'Được bảo vệ dài hạn':'IndexedDB · Đang lưu'):'Lưu dự phòng';}
  const pill=el.closest('.storage-center');if(pill){pill.dataset.state=kind;pill.setAttribute('aria-label',`${text}. ${mini?.textContent||''}. Mở trung tâm lưu trữ`);}
}
function sanitizeRichHTML(html){
  const parser=new DOMParser(),doc=parser.parseFromString(String(html||''),'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,form,input,button,textarea,select,meta,link,base,foreignObject').forEach(el=>el.remove());
  for(const el of [...doc.body.querySelectorAll('*')]){
    for(const attr of [...el.attributes]){
      const name=attr.name.toLowerCase(),value=attr.value.trim();
      if(name.startsWith('on')||name==='srcset'||name==='formaction'||name==='xlink:href'){el.removeAttribute(attr.name);continue;}
      if(name==='href'||name==='src'){
        const v=value.toLowerCase();
        const audioData=(el.tagName==='AUDIO'||el.tagName==='SOURCE')&&v.startsWith('data:audio/');const ok=name==='href'?(v.startsWith('https://')||v.startsWith('http://')||v.startsWith('mailto:')||v.startsWith('#')):(audioData||v.startsWith('https://')||v.startsWith('http://')||v.startsWith('data:image/png')||v.startsWith('data:image/jpeg')||v.startsWith('data:image/webp')||v.startsWith('data:image/gif'));
        if(!ok)el.removeAttribute(attr.name);
      }
      if(name==='style'&&/(url\s*\(|expression\s*\(|@import|behavior\s*:)/i.test(value))el.removeAttribute(attr.name);
    }
    if(el.tagName==='A'&&el.getAttribute('href')&&!el.hasAttribute('data-ss-ref')){el.setAttribute('rel','noopener noreferrer');el.setAttribute('target','_blank');}
  }
  return doc.body.innerHTML;
}
function normalizedReview(raw){
  const r=raw&&typeof raw==='object'?raw:{};
  const step=Number.isInteger(Number(r.step))?Math.max(-1,Math.min(intervals.length-1,Number(r.step))):-1;
  const allowed=new Set(intervals);
  const completedMilestones=[...new Set((Array.isArray(r.completedMilestones)?r.completedMilestones:[]).map(Number).filter(x=>allowed.has(x)))];
  if(r.milestone30CompletedAt&&!completedMilestones.includes(30))completedMilestones.push(30);
  const milestoneDueDates=r.milestoneDueDates&&typeof r.milestoneDueDates==='object'?Object.fromEntries(Object.entries(r.milestoneDueDates).filter(([k,v])=>allowed.has(Number(k))&&isValidDateKey(String(v))).map(([k,v])=>[String(Number(k)),String(v)])):{};
  if(step===4&&r.next&&!milestoneDueDates['30'])milestoneDueDates['30']=reviewDateKey(r.milestone30DueDate||r.next)||'';
  if(milestoneDueDates['30']==='')delete milestoneDueDates['30'];
  // Repair records written by the previous build: it scheduled the next
  // interval but accidentally kept the previous step index. The due-date map
  // identifies the active interval without mistaking completed history for a
  // newly restarted cycle. Never infer through a pending retry.
  let normalizedStep=step;
  if(!r.retry&&r.next){
    const activeDue=reviewDateKey(r.next);
    const mapped=Object.entries(milestoneDueDates)
      .filter(([days,date])=>date===activeDue&&intervals.includes(Number(days)))
      .map(([days])=>intervals.indexOf(Number(days)))
      .filter(index=>index>=0);
    if(mapped.length)normalizedStep=Math.max(normalizedStep,...mapped);
  }
  const completed=!!r.completed;
  if(completed&&!completedMilestones.includes(365))completedMilestones.push(365);
  completedMilestones.sort((a,b)=>a-b);
  const lastReviewDate=reviewDateKey(r.lastReviewDate);
  let nextDate=reviewDateKey(r.next);
  // A damaged/imported record must never make a question due again on the same
  // day it was already assessed. Move a contradictory next date to tomorrow.
  if(nextDate&&lastReviewDate&&nextDate<=lastReviewDate)nextDate=addDays(lastReviewDate,1);
  const timestamp=value=>{const parsed=Date.parse(value||'');return Number.isFinite(parsed)?new Date(parsed).toISOString():null;};
  return {
    step:normalizedStep,
    next:completed?null:nextDate,
    last:timestamp(r.last),
    startedAt:timestamp(r.startedAt),
    lastReviewDate,
    reviews:Math.max(0,Math.floor(Number(r.reviews)||0)),
    lapses:Math.max(0,Math.floor(Number(r.lapses)||0)),
    retry:!!r.retry,
    completed,
    completedAt:timestamp(r.completedAt||(completed?r.last:null)),
    completedMilestones,
    milestoneDueDates,
    milestone30CompletedAt:timestamp(r.milestone30CompletedAt||(completedMilestones.includes(30)?(r.completedAt||null):null)),
    milestone30DueDate:reviewDateKey(r.milestone30DueDate)||(milestoneDueDates['30']||null)
  };
}
function normalizeQ(q={},seenIds=new Set()){
  q=q&&typeof q==='object'?q:{};
  let id=String(q.id||uid());if(seenIds.has(id))id=uid();seenIds.add(id);
  const createdAt=q.createdAt||iso();
  const createdDate=isValidDateKey(q.createdDate)?q.createdDate:(reviewDateKey(createdAt)||localDateKey());
  const images=(Array.isArray(q.images)?q.images:[]).filter(x=>typeof x==='string'&&(x.startsWith('data:image/')||/^https?:\/\//i.test(x))).slice(0,8);
  let audio=null;if(q.audio&&typeof q.audio==='object'&&typeof q.audio.data==='string'&&q.audio.data.startsWith('data:audio/'))audio={name:String(q.audio.name||'Âm thanh'),type:String(q.audio.type||'audio/mpeg'),data:q.audio.data};
  const questionHTML=sanitizeRichHTML(q.questionHTML||''),answerHTML=sanitizeRichHTML(q.answerHTML||'');
  const plain=(html)=>{const d=new DOMParser().parseFromString(String(html||''),'text/html');return (d.body.textContent||'').trim();};
  const plainQuestion=plain(questionHTML),plainAnswer=plain(answerHTML);
  let review=normalizedReview(q.review);
  // One-time compatibility migration: questions that predate automatic scheduling
  // and have never had a review are enrolled from their recorded creation date.
  if(!review.next&&!review.last&&!review.startedAt&&!review.reviews&&!review.lapses&&!review.completed){
    review={...review,step:0,startedAt:createdAt,next:addDays(createdDate,intervals[0])};
  }
  return {id,question:String(plainQuestion||q.question||''),answer:String(plainAnswer||q.answer||''),questionHTML,answerHTML,tags:[...new Set((Array.isArray(q.tags)?q.tags:[]).map(x=>String(x).trim()).filter(Boolean))],language:['auto','en-US','en-GB','vi-VN','off'].includes(q.language)?q.language:'auto',images,audio,createdAt,createdDate,updatedAt:q.updatedAt||iso(),review};
}
function normalizeNotePages(source={}){
  const fallback=String(source.noteHTML||'');
  const raw=Array.isArray(source.notePages)&&source.notePages.length?source.notePages:[{html:fallback}];
  const seenPageIds=new Set();
  const pages=raw.slice(0,500).map(pg=>{
    const item=typeof pg==='string'?{html:pg}:pg||{};
    let id=String(item.id||uid());if(seenPageIds.has(id))id=uid();seenPageIds.add(id);
    const firstWrittenAt=String(item.firstWrittenAt||item.createdAt||'');
    return {id,html:sanitizeRichHTML(item.html||''),manualBreak:!!item.manualBreak,keepPage:!!item.keepPage,firstWrittenAt:reviewDateKey(firstWrittenAt)||null};
  });
  return pages.length?pages:[{id:uid(),html:'<p><br></p>',manualBreak:false,keepPage:false,firstWrittenAt:null}];
}
function normalizeNode(raw={},seenNodes=new Set(),seenQuestions=new Set(),depth=0,inheritedMode='study'){
  if(depth>24)return null;
  raw=raw&&typeof raw==='object'?raw:{};
  let id=String(raw.id||uid());if(seenNodes.has(id))id=uid();seenNodes.add(id);
  const notePages=normalizeNotePages(raw);
  // The Olympia 2026 template is a dedicated workspace; assign its mode before
  // descending so every child inherits the same root workspace consistently.
  const validModes=['work','study','fun','olympia'];
  const isOlympiaTemplate=depth===0&&/^olympia\s*2026$/i.test(String(raw.name||'').trim());
  const mode=depth===0?(isOlympiaTemplate?'olympia':(validModes.includes(raw.mode)?raw.mode:(validModes.includes(inheritedMode)?inheritedMode:'study'))):(validModes.includes(inheritedMode)?inheritedMode:'study');
  const questions=(Array.isArray(raw.questions)?raw.questions:[]).slice(0,10000).map(q=>normalizeQ(q,seenQuestions));
  const children=(Array.isArray(raw.children)?raw.children:[]).slice(0,2000).map(child=>normalizeNode(child,seenNodes,seenQuestions,depth+1,mode)).filter(Boolean);
  return {id,name:String(raw.name||'Mục chưa đặt tên'),description:String(raw.description||''),mode,icon:String(raw.icon||'📁'),color:String(raw.color||''),favorite:!!raw.favorite,status:['planned','active','paused','done'].includes(raw.status)?raw.status:'active',children,questions,noteHTML:String(raw.noteHTML||notePages.map(x=>x.html).join('')),notePages,paperStyle:['grid','ruled','dot'].includes(raw.paperStyle)?raw.paperStyle:'grid',paperTheme:['classic','botanical','vintage','lavender','minimal','rose','ocean','mint','sunset'].includes(raw.paperTheme)?raw.paperTheme:'classic',paperFrame:['double','floral','corners','dashed','minimal','none'].includes(raw.paperFrame)?raw.paperFrame:'double',noteUpdatedAt:raw.noteUpdatedAt||null,createdAt:raw.createdAt||iso(),updatedAt:raw.updatedAt||iso()};
}
function normalizeNewsEntry(entry,date){const notePages=normalizeNotePages(entry||{});return {date,noteHTML:String(entry?.noteHTML||notePages.map(p=>p.html).join('')),notePages,paperStyle:['grid','ruled','dot'].includes(entry?.paperStyle)?entry.paperStyle:'grid',paperTheme:['classic','botanical','vintage','lavender','minimal','rose','ocean','mint','sunset'].includes(entry?.paperTheme)?entry.paperTheme:'classic',paperFrame:['double','floral','corners','dashed','minimal','none'].includes(entry?.paperFrame)?entry.paperFrame:'double',noteUpdatedAt:entry?.noteUpdatedAt||null};}
function normalizeFeatureCollections(rawFeatures={},activeMode='study',seenNodes=new Set(),seenQuestions=new Set()){
  const f=rawFeatures&&typeof rawFeatures==='object'?rawFeatures:{};
  const validModes=new Set(['work','study','fun','olympia']);
  const ids=new Set();
  const uniqueId=value=>{let id=String(value||uid());if(ids.has(id))id=uid();ids.add(id);return id;};
  const text=(value,max=100000)=>String(value??'').slice(0,max);
  const mode=value=>value==null||value===''?'':(validModes.has(value)?value:activeMode); // Empty mode means a legacy/global record visible in every workspace.
  const timestamp=value=>{const n=Date.parse(value||'');return Number.isFinite(n)?new Date(n).toISOString():iso();};
  const tasks=(Array.isArray(f.tasks)?f.tasks:[]).slice(0,20000).filter(x=>x&&typeof x==='object').map(x=>({
    id:uniqueId(x.id),title:text(x.title,500).trim()||'Nhiệm vụ chưa đặt tên',
    due:isValidDateKey(String(x.due||''))?String(x.due):'',note:text(x.note,20000),
    done:!!x.done,mode:mode(x.mode),createdAt:timestamp(x.createdAt),updatedAt:x.updatedAt?timestamp(x.updatedAt):null
  }));
  const events=(Array.isArray(f.events)?f.events:[]).slice(0,20000).filter(x=>x&&typeof x==='object').map(x=>({
    id:uniqueId(x.id),title:text(x.title,500).trim()||'Sự kiện chưa đặt tên',
    date:isValidDateKey(String(x.date||''))?String(x.date):'',time:text(x.time,100),
    note:text(x.note,20000),mode:mode(x.mode),createdAt:timestamp(x.createdAt),updatedAt:x.updatedAt?timestamp(x.updatedAt):null
  }));
  const ideas=(Array.isArray(f.ideas)?f.ideas:[]).slice(0,20000).filter(x=>x&&typeof x==='object').map(x=>({
    id:uniqueId(x.id),title:text(x.title,500).trim()||'Ý tưởng chưa đặt tên',
    body:text(x.body,100000),tag:text(x.tag||'Ý tưởng',120).trim()||'Ý tưởng',
    icon:text(x.icon||'✦',12),mode:mode(x.mode),createdAt:timestamp(x.createdAt),updatedAt:x.updatedAt?timestamp(x.updatedAt):null
  }));
  const links=[],linkKeys=new Set();
  for(const x of (Array.isArray(f.links)?f.links:[]).slice(0,30000)){
    if(!x||typeof x!=='object')continue;
    const from=text(x.from,160),to=text(x.to,160);if(!from||!to||from===to)continue;
    const pair=JSON.stringify([from,to].sort());if(linkKeys.has(pair))continue;linkKeys.add(pair);
    links.push({id:uniqueId(x.id),from,to,fromName:text(x.fromName,500),toName:text(x.toName,500),
      fromMode:mode(x.fromMode),toMode:mode(x.toMode),note:text(x.note,5000),createdAt:timestamp(x.createdAt)});
  }
  const normalizeBucket=(key)=>{
    const list=Array.isArray(f[key])?f[key]:[];
    return list.slice(0,10000).filter(x=>x&&typeof x==='object'&&x.node&&typeof x.node==='object').map(x=>{
      const recMode=mode(x.mode)||mode(x.node.mode)||activeMode;
      const node=normalizeNode(x.node,seenNodes,seenQuestions,0,recMode);
      if(!node)return null;
      return {id:uniqueId(x.id),deletedAt:timestamp(x.deletedAt),mode:recMode,parentId:x.parentId?text(x.parentId,160):null,node};
    }).filter(Boolean);
  };
  return {tasks,events,ideas,links,trash:normalizeBucket('trash'),archive:normalizeBucket('archive')};
}
function normalizeData(raw={}){
  if(!raw||typeof raw!=='object'||!Array.isArray(raw.projects))throw Error('Cấu trúc dữ liệu không hợp lệ.');
  const seenNodes=new Set(),seenQuestions=new Set();
  const projects=raw.projects.slice(0,5000).filter(n=>n&&typeof n==='object'&&!Array.isArray(n)).map(n=>normalizeNode(n,seenNodes,seenQuestions,0)).filter(Boolean);
  const newsEntries={};
  if(raw.newsEntries&&typeof raw.newsEntries==='object')for(const [date,entry] of Object.entries(raw.newsEntries)){if(isValidDateKey(date))newsEntries[date]=normalizeNewsEntry(entry,date);}
  const settings=raw.settings&&typeof raw.settings==='object'?raw.settings:{};
  const activeMode=['work','study','fun','olympia'].includes(settings.activeMode)?settings.activeMode:'study';
  // Normalize every auxiliary collection at the boundary: malformed imports cannot
  // leak invalid dates, duplicate IDs, unsupported modes or arbitrary object shapes.
  const features=normalizeFeatureCollections(raw.features,activeMode,seenNodes,seenQuestions);
  return {version:APP_VERSION,_revision:Math.max(0,Number(raw._revision)||0),updatedAt:raw.updatedAt||null,projects,newsEntries,features,settings:{autoSpeak:!!settings.autoSpeak,rate:Math.min(1.3,Math.max(.7,Number(settings.rate)||1)),activeMode,lastNewsDate:isValidDateKey(settings.lastNewsDate)?settings.lastNewsDate:null,accent:['blue','teal','violet','amber','rose'].includes(settings.accent)?settings.accent:'blue',density:['comfortable','compact','spacious'].includes(settings.density)?settings.density:'comfortable'}};
}
function openDB(){return new Promise((resolve,reject)=>{
  if(!('indexedDB'in window))return reject(Error('IndexedDB không khả dụng'));
  const req=indexedDB.open(DB,DB_VERSION);
  req.onupgradeneeded=()=>{const db=req.result;
    if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);
    if(!db.objectStoreNames.contains(SNAPSHOT_STORE))db.createObjectStore(SNAPSHOT_STORE,{keyPath:'id'});
    if(!db.objectStoreNames.contains(DRAFT_STORE))db.createObjectStore(DRAFT_STORE,{keyPath:'key'});
  };
  req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{db.close();if(state.db===db){state.db=null;setSaveLabel('Cần tải lại','warning');}};resolve(db);};
  req.onerror=()=>reject(req.error||Error('Không mở được IndexedDB'));
  req.onblocked=()=>reject(Error('IndexedDB đang bị chặn bởi cửa sổ khác'));
});}
function dbGet(){return new Promise((resolve,reject)=>{if(!state.db)return reject(Error('Chưa mở IndexedDB'));const tx=state.db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(KEY);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error('Không đọc được dữ liệu'));tx.onabort=()=>reject(tx.error||Error('Giao dịch đọc bị hủy'));});}
async function currentStoredRevisionForRecovery(){
  if(state.db){const current=await dbGet();return Math.max(0,Number(current?._revision)||0);}
  try{
    const raw=localStorage.getItem('studyspace_fallback');
    if(!raw)return 0;
    try{const current=JSON.parse(raw);return Math.max(0,Number(current?._revision)||0);}
    catch(_){
      // Explicitly confirmed recovery may replace an unreadable fallback record.
      // The next save still writes a checksummed payload and preserves race checks.
      localStorage.setItem('studyspace_fallback','null');
      return 0;
    }
  }catch(err){throw Error('Không đọc được revision của kho dự phòng: '+(err?.message||'lỗi lưu trữ'));}
}
function dbPutIfRevision(snapshot,expected){return new Promise((resolve,reject)=>{
  if(!state.db)return reject(Error('IndexedDB chưa sẵn sàng'));
  let tx;try{tx=state.db.transaction([STORE],'readwrite');}catch(err){reject(err);return;}
  const main=tx.objectStore(STORE),get=main.get(KEY);let conflict=false;
  get.onsuccess=()=>{
    const current=get.result,revision=Math.max(0,Number(current?._revision)||0);
    if(revision!==expected){conflict=true;try{tx.abort();}catch(_){}return;}
    main.put(snapshot,KEY);
  };
  get.onerror=()=>{try{tx.abort();}catch(_){};};
  tx.oncomplete=()=>resolve({saved:true});
  tx.onabort=()=>reject(conflict?Object.assign(Error('Dữ liệu đã được cập nhật ở một cửa sổ khác.'),{code:'CONFLICT'}):tx.error||Error('Không thể hoàn tất giao dịch lưu'));
  tx.onerror=()=>{};
});}

async function dbCreateSnapshot(reason='Bản sao lưu thủ công',data=state.data){
  if(!state.db)throw Error('IndexedDB chưa sẵn sàng');
  const cloned=deepCopy(data),record={id:(reason==='Tự động hằng ngày'?'auto-':'backup-')+Date.now()+'-'+uid(),createdAt:iso(),reason:String(reason),revision:Number(data?._revision)||0,checksum:storageChecksum(cloned),data:cloned};
  await new Promise((resolve,reject)=>{
    let tx;try{tx=state.db.transaction(SNAPSHOT_STORE,'readwrite');}catch(err){reject(err);return;}
    const store=tx.objectStore(SNAPSHOT_STORE);store.put(record);const all=store.getAll();
    all.onsuccess=()=>{
      const list=(all.result||[]).filter(x=>x.id!==record.id).concat(record).sort((a,b)=>(Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0));
      const automatic=list.filter(x=>x.reason==='Tự động hằng ngày').slice(0,35);
      const manual=list.filter(x=>x.reason!=='Tự động hằng ngày').slice(0,15);
      const keep=new Set([...automatic,...manual].map(x=>x.id));
      for(const old of list)if(!keep.has(old.id))store.delete(old.id);
    };
    all.onerror=()=>{try{tx.abort();}catch(_){};};
    tx.oncomplete=()=>resolve(record);tx.onabort=()=>reject(tx.error||Error('Không tạo được mốc khôi phục'));
  });
  if(reason==='Tự động hằng ngày')state.storageLastAutoSnapshotAt=Date.parse(record.createdAt)||Date.now();
  state.storageLastSnapshot=record;
  return record;
}
async function ensureDailySnapshot(data=state.data){
  if(!state.db)return null;
  const useful=(Array.isArray(data.projects)&&data.projects.length>0)||Object.keys(data.newsEntries||{}).length>0;
  if(!useful)return null;
  const nowAt=Date.now();
  if(state.storageLastAutoSnapshotAt&&nowAt-state.storageLastAutoSnapshotAt<24*60*60*1000)return null;
  const list=await dbGetSnapshots();
  const last=list.find(x=>x.reason==='Tự động hằng ngày');
  const lastAt=Date.parse(last?.createdAt||'')||0;
  state.storageLastAutoSnapshotAt=lastAt;
  if(lastAt&&nowAt-lastAt<24*60*60*1000)return null;
  return dbCreateSnapshot('Tự động hằng ngày',data);
}

function dbGetSnapshots(){return new Promise((resolve,reject)=>{if(!state.db)return reject(Error('IndexedDB chưa sẵn sàng'));const tx=state.db.transaction(SNAPSHOT_STORE,'readonly'),req=tx.objectStore(SNAPSHOT_STORE).getAll();req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>(Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0)));req.onerror=()=>reject(req.error||Error('Không đọc được danh sách bản sao lưu'));tx.onabort=()=>reject(tx.error||Error('Không thể đọc bản sao lưu'));});}
function dbGetSnapshot(id){return new Promise((resolve,reject)=>{if(!state.db)return reject(Error('IndexedDB chưa sẵn sàng'));const tx=state.db.transaction(SNAPSHOT_STORE,'readonly'),req=tx.objectStore(SNAPSHOT_STORE).get(id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error||Error('Không đọc được bản sao lưu'));});}
function dbGetLatestSnapshot(){return dbGetSnapshots().then(list=>list[0]||null);}
function dbPutDraft(key,payload){return new Promise((resolve,reject)=>{if(!state.db)return reject(Error('IndexedDB chưa sẵn sàng'));const tx=state.db.transaction(DRAFT_STORE,'readwrite');tx.objectStore(DRAFT_STORE).put({key,...deepCopy(payload),savedAt:Date.now()});tx.oncomplete=()=>resolve(true);tx.onabort=()=>reject(tx.error||Error('Không lưu được bản nháp'));tx.onerror=()=>{};});}
function dbGetDraft(key){return new Promise((resolve,reject)=>{if(!state.db)return resolve(null);const tx=state.db.transaction(DRAFT_STORE,'readonly'),req=tx.objectStore(DRAFT_STORE).get(key);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error||Error('Không đọc được bản nháp'));});}
function dbDeleteDraft(key){return new Promise((resolve,reject)=>{if(!state.db)return resolve(false);const tx=state.db.transaction(DRAFT_STORE,'readwrite');tx.objectStore(DRAFT_STORE).delete(key);tx.oncomplete=()=>resolve(true);tx.onabort=()=>reject(tx.error||Error('Không xóa được bản nháp'));tx.onerror=()=>{};});}
function setupCrossTabSync(){
  if('BroadcastChannel'in window){try{syncChannel=new BroadcastChannel(SYNC_CHANNEL);syncChannel.onmessage=e=>handleRemoteSave(e.data);}catch(_){syncChannel=null;}}
  window.addEventListener('storage',e=>{if(e.key==='studyspace_sync_ping'&&e.newValue){try{handleRemoteSave(JSON.parse(e.newValue));}catch(_){}}});
  const label=$('#saveLabel');if(label)label.addEventListener('click',()=>{if(state.externalUpdate&&confirm('Một cửa sổ khác đã cập nhật dữ liệu. Tải lại StudySpace để nhận phiên bản mới nhất? Bản nháp chưa lưu sẽ được giữ nếu trình duyệt cho phép.'))location.reload();});
}
function handleRemoteSave(message){
  if(!message||message.tabId===state.tabId||Number(message.revision)<=Number(state.data._revision||0))return;
  state.externalUpdate=true;state.storeNotebookDraft?.();setSaveLabel('Có thay đổi ở cửa sổ khác','warning');
  toast('StudySpace vừa được cập nhật ở cửa sổ khác. Hãy tải lại trang trước khi tiếp tục chỉnh sửa.');
}
async function init(){
  let dbRaw=null,raw=null,loadedFromFallback=false,fallbackRaw=null,legacyRaw=null;
  state.storageFallbackActive=false;state.storageFallbackLoadedAt=0;state.storageIntegrityBlocked=false;
  try{state.db=await openDB();dbRaw=await dbGet();}catch(err){console.warn('Không dùng được IndexedDB:',err);state.db=null;}
  try{const candidate=JSON.parse(localStorage.getItem('studyspace_fallback')||'null');const data=candidate?.data||candidate;if(data&&(Array.isArray(data.projects)||data.newsEntries)&&typeof data==='object')fallbackRaw=data;}catch(err){console.warn('Bản lưu dự phòng cục bộ không đọc được:',err);}
  const dbAt=Date.parse(dbRaw?.updatedAt||'')||0,fallbackAt=Date.parse(fallbackRaw?.updatedAt||'')||0;
  if(fallbackRaw&&(!dbRaw||fallbackAt>dbAt)){raw=fallbackRaw;loadedFromFallback=true;state.storageFallbackLoadedAt=fallbackAt;}
  else if(dbRaw)raw=dbRaw;
  if(!raw){try{const old=JSON.parse(localStorage.getItem(OLDKEY)||'null');if(old&&(Array.isArray(old.projects)||old.newsEntries)){legacyRaw=old;raw=old;loadedFromFallback=true;}}catch(err){console.warn('Bản dữ liệu cũ không đọc được:',err);}}
  // Never normalize or overwrite a record whose checksum fails. Prefer the other
  // valid copy, then the newest valid recovery point; otherwise open read-only.
  if(raw&&!validStoredPayload(raw)){
    let recovered=null;
    const alternative=raw===dbRaw?fallbackRaw:dbRaw;
    if(alternative&&alternative!==raw&&validStoredPayload(alternative)){recovered=alternative;loadedFromFallback=true;state.storageFallbackLoadedAt=Date.parse(alternative.updatedAt||'')||0;}
    if(!recovered&&state.db){try{const snapshots=await dbGetSnapshots();const good=snapshots.find(x=>x.data&&validSnapshotRecord(x));if(good){recovered=good.data;loadedFromFallback=true;}}catch(err){console.warn('Không đọc được mốc phục hồi:',err);}}
    if(recovered){raw=recovered;toast('Phát hiện bản dữ liệu có dấu hiệu hỏng; đã chuyển sang bản hợp lệ gần nhất. Hãy xuất JSON để kiểm tra.');}
    else{state.storageIntegrityBlocked=true;raw={version:APP_VERSION,projects:[],newsEntries:{},settings:{}};toast('Không xác minh được dữ liệu hiện có. Ứng dụng đang khóa ghi để tránh ghi đè dữ liệu có thể phục hồi. Hãy nhập bản sao lưu hợp lệ.');}
  }
  try{state.data=normalizeData(raw||{projects:[],newsEntries:{},settings:{}});}catch(err){
    console.error('Không thể chuẩn hóa dữ liệu:',err);let recovered=null;
    try{if(state.db){const snapshots=await dbGetSnapshots();const good=snapshots.find(x=>x.data&&validSnapshotRecord(x));if(good)recovered=normalizeData(good.data);}}catch(snapshotErr){console.error('Không đọc được mốc khôi phục:',snapshotErr);}
    if(recovered){state.data=recovered;loadedFromFallback=true;toast('Dữ liệu chính không đọc được; đã mở mốc khôi phục gần nhất. Hãy xuất JSON kiểm tra trước khi tiếp tục.');}
    else{state.data=normalizeData({projects:[],newsEntries:{},settings:{}});state.storageIntegrityBlocked=true;toast('Dữ liệu cũ không hợp lệ; chế độ ghi đã khóa để tránh ghi đè. Hãy nhập bản sao lưu JSON.');}
  }
  // Preserve a clean pre-upgrade recovery point before migrating an older or fallback copy.
  if(state.db&&!state.storageIntegrityBlocked&&raw&&((state.data.projects||[]).length||Object.keys(state.data.newsEntries||{}).length)&&(loadedFromFallback||!dbRaw||Number(raw.version||0)<APP_VERSION)){
    try{const existing=await dbGetSnapshots();if(!existing.length)await dbCreateSnapshot('Mốc bảo vệ trước nâng cấp',state.data);}
    catch(err){console.warn('Chưa tạo được mốc trước nâng cấp; vẫn giữ dữ liệu chính để tiếp tục:',err);}
  }
  if(state.db&&loadedFromFallback&&!state.storageIntegrityBlocked){
    state.data._revision=Math.max(0,Number(dbRaw?._revision)||0);
    const ok=await save();
    if(ok&&!state.storageFallbackActive){try{localStorage.removeItem('studyspace_fallback');if(legacyRaw)localStorage.removeItem(OLDKEY);state.storageFallbackLoadedAt=0;}catch(_){} }
  }else if(state.db&&(!dbRaw||Number(raw?.version||0)<APP_VERSION)&&!state.storageIntegrityBlocked){
    state.data._revision=Math.max(0,Number(dbRaw?._revision)||0);await save();
  }else if(!state.db&&raw){state.storageFallbackActive=true;state.data._revision=Math.max(0,Number(raw?._revision)||0);}
  if(dbRaw&&fallbackRaw&&fallbackAt<=dbAt){try{localStorage.removeItem('studyspace_fallback');}catch(_){} }
  if(state.db&&!state.storageIntegrityBlocked&&((state.data.projects||[]).length||Object.keys(state.data.newsEntries||{}).length)){
    try{const snapshots=await dbGetSnapshots();if(!snapshots.length)await dbCreateSnapshot('Mốc bảo vệ đầu tiên',state.data);await ensureDailySnapshot(state.data);}catch(err){console.warn('Không tạo được mốc bảo vệ ban đầu:',err);}
  }
  state.newsDate=isValidDateKey(state.data.settings.lastNewsDate)?state.data.settings.lastNewsDate:localDateKey();state.newsMonth=state.newsDate.slice(0,7);
  $('#speechRate').value=String(state.data.settings.rate||1);setupSidebarCollapse();setupCrossTabSync();
  // Check persistence status without triggering a browser permission prompt.
  try{if(navigator.storage?.persisted)state.storagePersistent=await navigator.storage.persisted();}catch(err){console.warn('Không kiểm tra được quyền lưu trữ bền vững:',err);}
  await updateStorageMeta();bindStorageUI();setSaveLabel(state.storageIntegrityBlocked?'Cần kiểm tra dữ liệu':state.storageFallbackActive?'Đã lưu dự phòng':'Đã lưu',state.storageIntegrityBlocked||state.storageFallbackActive?'warning':'ok');
  state.persistedDataSnapshot=deepCopy(state.data);
  render();scheduleReviewGateCheck();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();scheduleReviewGateCheck();}});
  window.addEventListener('pagehide',()=>{try{state.storeNotebookDraft?.();}catch(_){}},{capture:true});
}

async function save(){
  if(state.storageIntegrityBlocked){setSaveLabel('Dữ liệu cần kiểm tra','error');toast('Đang khóa ghi vì dữ liệu cũ chưa được xác minh. Hãy nhập bản sao lưu hợp lệ hoặc khôi phục mốc an toàn.');return false;}
  if(state.externalUpdate){setSaveLabel('Có thay đổi ở cửa sổ khác','warning');return false;}
  const snapshot=deepCopy(state.data);snapshot.version=APP_VERSION;snapshot.updatedAt=iso();
  const task=async()=>{
    const expected=Math.max(0,Number(state.data._revision)||0);snapshot._revision=expected+1;snapshot._checksum=storageChecksum(snapshot);
    try{
      if(state.db&&!state.storageFallbackActive){
        try{
          await dbPutIfRevision(snapshot,expected);
          state.storageFallbackActive=false;state.storageFallbackLoadedAt=0;
          try{const fallback=JSON.parse(localStorage.getItem('studyspace_fallback')||'null');if(!fallback||(Date.parse(fallback.updatedAt)||0)<=(Date.parse(snapshot.updatedAt)||0))localStorage.removeItem('studyspace_fallback');}catch(_){try{localStorage.removeItem('studyspace_fallback');}catch(__){}}
          // A recovery snapshot is secondary: quota pressure here must never roll back
          // the already-committed primary state record.
          try{await ensureDailySnapshot(snapshot);}catch(snapshotErr){console.warn('Dữ liệu chính đã lưu nhưng chưa tạo được mốc tự động:',snapshotErr);if(!state.snapshotWarningShown){state.snapshotWarningShown=true;toast('Nội dung đã lưu. Chưa tạo được mốc khôi phục tự động do giới hạn dung lượng; hãy xuất JSON.');}}
        }catch(dbErr){
          if(dbErr.code==='CONFLICT')throw dbErr;
          console.warn('IndexedDB không ghi được, chuyển sang lưu dự phòng:',dbErr);
          try{
            const current=JSON.parse(localStorage.getItem('studyspace_fallback')||'null');
            const currentRevision=Math.max(0,Number(current?._revision)||0);
            const sameLoadedFallback=!!(current&&state.storageFallbackLoadedAt&&Math.abs((Date.parse(current.updatedAt)||0)-state.storageFallbackLoadedAt)<10);
            if(current&&currentRevision!==expected&&!sameLoadedFallback)throw Object.assign(Error('Dữ liệu dự phòng đã thay đổi ở cửa sổ khác.'),{code:'CONFLICT'});
            if(sameLoadedFallback){snapshot._revision=currentRevision+1;snapshot._checksum=storageChecksum(snapshot);}
            localStorage.setItem('studyspace_fallback',JSON.stringify(snapshot));
            state.storageFallbackActive=true;state.storageFallbackLoadedAt=Date.parse(snapshot.updatedAt)||Date.now();
          }catch(fallbackErr){if(fallbackErr.code==='CONFLICT')throw fallbackErr;throw Object.assign(Error('Cả IndexedDB và bộ nhớ dự phòng đều không ghi được: '+(fallbackErr?.message||'không đủ dung lượng')),{cause:dbErr});}
        }
      }else{
        const current=JSON.parse(localStorage.getItem('studyspace_fallback')||'null');
        const currentRevision=Math.max(0,Number(current?._revision)||0);
        const sameLoadedFallback=!!(current&&state.storageFallbackLoadedAt&&Math.abs((Date.parse(current.updatedAt)||0)-state.storageFallbackLoadedAt)<10);
        if(current&&currentRevision!==expected&&!sameLoadedFallback)throw Object.assign(Error('Dữ liệu dự phòng đã thay đổi ở cửa sổ khác.'),{code:'CONFLICT'});
        if(sameLoadedFallback){snapshot._revision=currentRevision+1;snapshot._checksum=storageChecksum(snapshot);}
        localStorage.setItem('studyspace_fallback',JSON.stringify(snapshot));
        state.storageFallbackActive=true;state.storageFallbackLoadedAt=Date.parse(snapshot.updatedAt)||Date.now();
      }
      state.data._revision=snapshot._revision;state.data.updatedAt=snapshot.updatedAt;state.data._checksum=snapshot._checksum;
      state.persistedDataSnapshot=deepCopy(snapshot);
      setSaveLabel(state.storageFallbackActive?'Đã lưu dự phòng':'Đã lưu',state.storageFallbackActive?'warning':'ok');
      const message={type:'saved',tabId:state.tabId,revision:snapshot._revision,at:snapshot.updatedAt};
      try{syncChannel?.postMessage(message);localStorage.setItem('studyspace_sync_ping',JSON.stringify(message));}catch(_){}
      if(state.storageFallbackActive&&!state.fallbackNoticeShown){state.fallbackNoticeShown=true;toast('Đã lưu vào bộ nhớ dự phòng. Hãy xuất JSON và kiểm tra dung lượng trình duyệt.');}
      return true;
    }catch(err){
      console.error('Lỗi lưu StudySpace:',err);
      if(err.code==='CONFLICT'){state.externalUpdate=true;setSaveLabel('Xung đột dữ liệu','warning');toast('Không ghi đè dữ liệu mới từ cửa sổ khác. Hãy tải lại trang.');}
      else{setSaveLabel('Chưa lưu được','error');toast('Không ghi được dữ liệu vào IndexedDB hoặc bộ nhớ dự phòng. Hãy xuất JSON ngay.');}
      return false;
    }
  };
  setSaveLabel('Đang lưu…','warning');const job=state.saveChain.then(task,task);state.saveChain=job.catch(()=>false);return job;
}

function find(id,nodes=state.data.projects,parent=null){
  if(!id)return null;const stack=[];for(let i=nodes.length-1;i>=0;i--)stack.push({node:nodes[i],parent,siblings:nodes});const seen=new Set();
  while(stack.length){const item=stack.pop(),n=item.node;if(!n||seen.has(n.id))continue;seen.add(n.id);if(n.id===id)return item;const children=Array.isArray(n.children)?n.children:[];for(let i=children.length-1;i>=0;i--)stack.push({node:children[i],parent:n,siblings:children});}
  return null;
}
function pathOf(id){const found=find(id);if(!found)return[];const path=[found.node];let parent=found.parent,guard=0;while(parent&&guard++<30){path.unshift(parent);parent=find(parent.id)?.parent||null;}return path;}
function descendantsOf(id){const root=find(id)?.node;if(!root)return new Set();const ids=new Set([id]),stack=[...(root.children||[])];while(stack.length){const n=stack.pop();if(!n||ids.has(n.id))continue;ids.add(n.id);for(const child of n.children||[])stack.push(child);}return ids;}
function folderSelectHTML(selectedId='',excludeNodeId=null,label='Thư mục cha'){
  const options=['<option value="">📁 Thư mục gốc</option>'],excluded=excludeNodeId?descendantsOf(excludeNodeId):new Set();
  function walk(nodes,depth=0){for(const node of nodes){if(excluded.has(node.id))continue;options.push(`<option value="${esc(node.id)}" ${node.id===selectedId?'selected':''}>${'　'.repeat(Math.min(depth,12))}📁 ${esc(node.name)}</option>`);walk(node.children||[],depth+1);}}
  walk(state.data.projects);return `<div class="field"><label for="parentId">${esc(label)}</label><select id="parentId" name="parentId">${options.join('')}</select></div>`;
}
function allProjectNodes(nodes=state.data.projects,out=[]){const stack=[...nodes].reverse(),seen=new Set();while(stack.length){const n=stack.pop();if(!n||seen.has(n.id))continue;seen.add(n.id);out.push(n);const ch=n.children||[];for(let i=ch.length-1;i>=0;i--)stack.push(ch[i]);}return out;}
function counts(nodes){let p=0,q=0,d=0;const stack=[...nodes],seen=new Set();while(stack.length){const n=stack.pop();if(!n||seen.has(n.id))continue;seen.add(n.id);p++;q+=(n.questions||[]).length;d+=(n.questions||[]).filter(due).length;for(const child of n.children||[])stack.push(child);}return{p,q,d};}
function visitQuestions(nodes,out=[]){const stack=[...nodes].reverse(),seen=new Set();while(stack.length){const node=stack.pop();if(!node||seen.has(node.id))continue;seen.add(node.id);for(const q of node.questions||[])out.push({q,node});const ch=node.children||[];for(let i=ch.length-1;i>=0;i--)stack.push(ch[i]);}return out;}
function reviewDateKey(value){if(!value)return null;const raw=String(value).trim();if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return isValidDateKey(raw)?raw:null;if(/^\d{4}-\d{2}-\d{2}(?:T|\s)/.test(raw)){const prefix=raw.slice(0,10);if(!isValidDateKey(prefix))return null;}const d=new Date(raw);return Number.isNaN(d.getTime())?null:localDateKey(d);}
function due(q){const key=reviewDateKey(q?.review?.next);return !!key&&key<=localDateKey();}
function dueList(){return visitQuestions(activeRoots()).filter(x=>due(x.q)).sort((a,b)=>(reviewDateKey(a.q.review.next)||'').localeCompare(reviewDateKey(b.q.review.next)||''));}
function addDays(value,n){const key=reviewDateKey(value)||localDateKey(),[y,m,d]=key.split('-').map(Number),date=new Date(y,m-1,d+Number(n));return localDateKey(date);}
function dateLabel(value){const key=reviewDateKey(value);if(!key)return'Chưa lên lịch';const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d,12).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});}
function hasCompletedMilestone(q,days){return !!q?.review?.completedMilestones?.includes(days)||(days===30&&!!q?.review?.milestone30CompletedAt);}
function hasCompleted30(q){return hasCompletedMilestone(q,30);}
function completedMilestoneLabel(q){return (q?.review?.completedMilestones||[]).filter(d=>[30,100,365].includes(d)).sort((a,b)=>a-b).map(d=>d+' ngày').join(' · ');}
function schedule(q){const r=q.review||{};if(r.completed)return'Đã hoàn thành chu kỳ 365 ngày';if(!r.next)return'Chưa bắt đầu chu kỳ';if(due(q))return'Đến hạn ôn tập';return'Ôn tiếp: '+dateLabel(r.next);}
async function reviewMutation(q,kind){
  if(!q||state.reviewBusy.has(q.id))return false;
  const r=normalizedReview(q.review),today=localDateKey();
  if(kind==='start'&&r.next){toast('Câu hỏi này đã có lịch ôn.');return false;}
  if((kind==='remember'||kind==='forgot')&&!due(q)){toast('Câu hỏi chưa đến hạn.');return false;}
  if((kind==='remember'||kind==='forgot')&&r.lastReviewDate===today){toast('Câu hỏi này đã được ghi nhận hôm nay.');return false;}
  if((kind==='remember'||kind==='forgot')&&state.page==='review'&&state.reviewGateActive&&state.reviewRevealedId!==q.id){toast('Hãy mở đáp án trước khi đánh giá câu hỏi.');return false;}
  const snapshot=deepCopy(state.data);state.reviewBusy.add(q.id);
  try{
    if(kind==='start'){
      q.review={...r,step:0,retry:false,startedAt:iso(),next:addDays(today,intervals[0]),last:null,lastReviewDate:null,completed:false,completedAt:null,completedMilestones:[...(r.completedMilestones||[])],milestoneDueDates:{},milestone30CompletedAt:r.milestone30CompletedAt||null,milestone30DueDate:null};
    }else if(kind==='remember'){
      const currentStep=Math.max(0,Math.min(intervals.length-1,r.step??0));
      const milestoneDueDates={...(r.milestoneDueDates||{})};
      if(r.retry){
        // A failed recall is retried tomorrow, but that retry does not complete
        // the original spaced interval. Repeat the same interval after success.
        const retryNext=addDays(today,intervals[currentStep]);
        milestoneDueDates[String(intervals[currentStep])]=retryNext;
        q.review={...r,step:currentStep,retry:false,last:iso(),lastReviewDate:today,reviews:(r.reviews||0)+1,next:retryNext,completed:false,completedAt:null,milestoneDueDates,milestone30DueDate:currentStep===4?retryNext:(r.milestone30DueDate||null)};
      }else{
        const completedDays=intervals[currentStep];
        const completedMilestones=[...new Set([...(r.completedMilestones||[]),completedDays])].sort((a,b)=>a-b);
        const nextStep=currentStep+1,completedAt=nextStep>=intervals.length?iso():null;
        if(nextStep<intervals.length)milestoneDueDates[String(intervals[nextStep])]=addDays(today,intervals[nextStep]);
        q.review={...r,step:nextStep<intervals.length?nextStep:currentStep,retry:false,last:iso(),lastReviewDate:today,reviews:(r.reviews||0)+1,next:nextStep<intervals.length?addDays(today,intervals[nextStep]):null,completed:nextStep>=intervals.length,completedAt,completedMilestones,milestoneDueDates,milestone30CompletedAt:completedDays===30?iso():(r.milestone30CompletedAt||null),milestone30DueDate:milestoneDueDates['30']||null};
      }
    }else{
      const currentStep=Math.max(0,Math.min(intervals.length-1,r.step??0)),tomorrow=addDays(today,1),milestoneDueDates={...(r.milestoneDueDates||{})};
      milestoneDueDates[String(intervals[currentStep])]=tomorrow;
      q.review={...r,step:currentStep,retry:true,last:iso(),lastReviewDate:today,lapses:(r.lapses||0)+1,next:tomorrow,completed:false,completedAt:null,milestoneDueDates,milestone30DueDate:currentStep===4?tomorrow:(r.milestone30DueDate||null)};
    }
    const ok=await save();if(!ok){state.data=snapshot;return false;}
    state.reviewRevealedId=null;
    const scroll=window.scrollY;render();requestAnimationFrame(()=>window.scrollTo({top:scroll,behavior:'instant'}));
    if(kind==='start')toast('Đã bắt đầu chu kỳ. Lần ôn đầu tiên sau 2 ngày.');
    else if(kind==='remember')toast(q.review.completed?'Đã hoàn thành chu kỳ ôn tập 365 ngày!':'Đã ghi nhận. Lần ôn tiếp theo sau '+(r.retry?intervals[Math.max(0,r.step??0)]:intervals[Math.min(intervals.length-1,(r.step??0)+1)])+' ngày.');
    else toast('Đã ghi nhận chưa nhớ. Câu hỏi sẽ quay lại vào ngày mai.');
    return true;
  }finally{state.reviewBusy.delete(q.id);}
}
async function startCycle(q){return reviewMutation(q,'start');}
async function remember(q){return reviewMutation(q,'remember');}
async function forgot(q){return reviewMutation(q,'forgot');}
function render(){
  const outstanding=dueList();
  if(outstanding.length){
    if(!state.reviewGateActive){state.reviewRevealedId=null;closeModal();}
    state.reviewGateActive=true;state.page='review';state.selected=null;
  }else if(state.reviewGateActive&&state.page!=='review'){state.page='review';state.selected=null;}
  $('#appShell').classList.toggle('review-locked',state.reviewGateActive);
  renderTree();renderMain();renderCrumb();window.BLOOM_FEATURES?.applyAppearance();updateTopbarMenuState();
  $('#dueBadge').textContent=outstanding.length;
  $('#newsBadge').textContent=Object.values(state.data.newsEntries||{}).filter(hasNewsContent).length;
  $('#projectCount').textContent=counts(activeRoots()).p;
  $('#autoSpeakSwitch').classList.toggle('on',!!state.data.settings.autoSpeak);
  $('#navHome').classList.toggle('active',state.page==='home'&&!state.selected);
  $('#navReview').classList.toggle('active',state.page==='review');$('#navNews').classList.toggle('active',state.page==='news');
  $$('[data-bloom-page]').forEach(b=>b.classList.toggle('active',b.dataset.bloomPage===state.page));
  $('#navReview').classList.toggle('nav-required',outstanding.length>0);
}
function globalSearchResults(query){
  const host=$('#globalSearchResults');if(!host)return;
  const term=(query||'').trim().toLocaleLowerCase('vi');
  if(term.length<2){host.classList.add('hidden');host.innerHTML='';return;}
  const results=[];const add=(kind,id,title,detail,sub='')=>results.push({kind,id,title,detail,sub});
  for(const n of allProjectNodes()){
    const root=pathOf(n.id)[0],modeLabel=MODE_META[root?.mode||'study']?.label||'Học tập',path=modeLabel+' · '+pathOf(n.id).map(x=>x.name).join(' / ');
    if((n.name+' '+n.description).toLocaleLowerCase('vi').includes(term))add('project',n.id,'📁 '+n.name,path);
    (n.notePages||[]).forEach((pg,i)=>{const text=projectText(pg.html);if(text.toLocaleLowerCase('vi').includes(term))add('note',n.id,'📖 '+n.name+' · Trang '+(i+1),text.slice(0,130),String(i));});
    for(const q of n.questions||[])if((q.question+' '+q.answer+' '+(q.tags||[]).join(' ')).toLocaleLowerCase('vi').includes(term))add('question',n.id,'❓ '+q.question,path,q.id);
  }
  for(const [date,entry] of Object.entries(state.data.newsEntries||{})){const text=(entry.notePages||[]).map(pg=>projectText(pg.html)).join(' ');if((date.split('-').reverse().join('/')+' '+text).toLocaleLowerCase('vi').includes(term))add('news',date,'🗓️ Tin tức · '+date.split('-').reverse().join('/'),text.slice(0,130));}
  host.innerHTML=results.length?results.slice(0,20).map(r=>`<button type="button" class="global-result" data-global-kind="${r.kind}" data-global-id="${esc(r.id)}" data-global-sub="${esc(r.sub)}"><b>${esc(r.title)}</b><small>${esc(r.detail||'')}</small></button>`).join(''):'<div class="global-search-empty">Không tìm thấy nội dung phù hợp.</div>';
  host.classList.remove('hidden');
  $$('[data-global-kind]',host).forEach(b=>b.onclick=async()=>{
    if(!(await flushBeforeLeave()))return;
    const kind=b.dataset.globalKind,id=b.dataset.globalId,sub=b.dataset.globalSub;
    if(kind==='news'){
      const previous=state.data.settings.lastNewsDate;state.data.settings.lastNewsDate=id;
      if(!await save()){state.data.settings.lastNewsDate=previous;return;}
      state.newsDate=id;state.newsMonth=id.slice(0,7);state.page='news';state.selected=null;
    }else{state.selected=id;state.page='home';state.nodeTab=kind==='question'?'questions':'notebook';if(kind==='note')state.jumpToPage=Math.max(0,Number(sub)||0);if(kind==='question'){state.revealQuestionId=sub;state.questionFilters={nodeId:id,query:'',status:'all',tag:'all'};}}
    host.classList.add('hidden');$('#globalSearch').value='';render();
  });
}
function bindGlobalSearch(){
  const input=$('#globalSearch'),host=$('#globalSearchResults');if(!input)return;let timer=null;
  input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>globalSearchResults(input.value),160);});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(timer);globalSearchResults(input.value);const first=$('[data-global-kind]',host);if(first)first.click();}if(e.key==='Escape'){host.classList.add('hidden');input.blur();}});
  document.addEventListener('click',e=>{if(!e.target.closest('.global-search-wrap'))host.classList.add('hidden');});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();input.focus();input.select();}if(e.key==='Escape')host.classList.add('hidden');});
}
function validateMoveNode(nodeId,parentId){if(!parentId)return true;if(parentId===nodeId)return false;return !descendantsOf(nodeId).has(parentId)&&!!find(parentId);}
async function flushBeforeLeave(){if(typeof state.flushNotebook!=='function')return true;try{return (await state.flushNotebook())!==false;}catch(err){console.error(err);toast('Chưa lưu được trang vở. Hãy thử lại trước khi chuyển trang.');return false;}}
function setProjectTreeMode(node,mode){if(!node)return;node.mode=mode;for(const child of node.children||[])setProjectTreeMode(child,mode);}
async function changeActiveMode(mode){
  if(!['work','study','fun','olympia'].includes(mode))return false;
  if(mode===(state.data.settings.activeMode||'study'))return true;
  const previous=state.data.settings.activeMode||'study';state.data.settings.activeMode=mode;
  if(!await save()){state.data.settings.activeMode=previous;return false;}
  return true;
}
async function commitOrRollback(snapshot){const ok=await save();if(!ok){state.data=snapshot;if(state.selected&&!find(state.selected)){state.selected=null;if(state.page==='home')state.nodeTab='notebook';}state.revealQuestionId=null;return false;}return true;}
async function createNode(parent){if(!(await flushBeforeLeave()))return;modal(parent?'Tạo dự án con':'Tạo dự án mới',formField('Tên dự án','name','Ví dụ: Tiếng Anh 11')+formField('Mô tả / mục tiêu','desc','Phạm vi kiến thức, mục tiêu...', '', 'textarea'),async f=>{
  const name=String(f.get('name')||'').trim();if(!name){toast('Hãy nhập tên dự án.');return false;}const snapshot=deepCopy(state.data);const node=makeNode(name,f.get('desc')||'');
   if(parent){const dest=find(parent);if(!dest){toast('Thư mục cha không còn tồn tại.');return false;}node.mode=pathOf(parent)[0]?.mode||state.data.settings.activeMode;dest.node.children.push(node);state.expanded.add(parent);}else{node.mode=state.data.settings.activeMode;state.data.projects.push(node);}
  state.selected=node.id;state.page='home';if(!await commitOrRollback(snapshot)){render();return false;}render();toast('Đã tạo dự án.');return true;
});}
async function editNode(id){
  if(!(await flushBeforeLeave()))return;const initial=find(id);if(!initial)return;const original=initial.node,currentParent=initial.parent?.id||'',rootMode=pathOf(id)[0]?.mode||'study';
  const modeField=!initial.parent?`<div class="field"><label for="nodeMode">Không gian chính</label><select id="nodeMode" name="nodeMode">${[['work','💼 Công việc'],['study','📚 Học tập'],['fun','✨ Giải trí'],['olympia','🏆 Olympia']].map(([v,l])=>`<option value="${v}" ${rootMode===v?'selected':''}>${l}</option>`).join('')}</select><small>Dự án vẫn có thể liên kết với nội dung ở mọi không gian khác.</small></div>`:'';
  modal('Chỉnh sửa dự án',formField('Tên dự án','name','Tên dự án',original.name)+formField('Mô tả / mục tiêu','desc','Mô tả...',original.description,'textarea')+modeField+folderSelectHTML(currentParent,id,'Di chuyển vào thư mục'),async f=>{
    const name=String(f.get('name')||'').trim();if(!name){toast('Tên không được để trống.');return false;}
    const current=find(id);if(!current){toast('Dự án không còn tồn tại.');return false;}
    const parentId=f.get('parentId')||'';if(!validateMoveNode(id,parentId)){toast('Không thể chuyển dự án vào chính nó hoặc thư mục con của nó.');return false;}
    const destination=parentId?find(parentId)?.node:null;if(parentId&&!destination){toast('Thư mục đích không còn tồn tại.');return false;}
    const snapshot=deepCopy(state.data),node=current.node,oldParent=current.parent?.id||'';
    node.name=name;node.description=String(f.get('desc')||'').trim();node.updatedAt=iso();
    const destinationMode=parentId?(pathOf(destination.id)[0]?.mode||destination.mode||rootMode):(initial.parent?rootMode:String(f.get('nodeMode')||rootMode));
    setProjectTreeMode(node,destinationMode);
    if(parentId!==oldParent){current.siblings.splice(current.siblings.indexOf(node),1);if(destination){destination.children.push(node);state.expanded.add(destination.id);}else state.data.projects.push(node);}
    state.selected=node.id;state.page='home';
    if(!await commitOrRollback(snapshot)){render();return false;}
    render();toast(parentId===oldParent?'Đã cập nhật dự án.':'Đã cập nhật và di chuyển dự án.');return true;
  });
}
async function deleteNode(id){if(!(await flushBeforeLeave()))return;const found=find(id);if(!found)return;if(!confirm('Chuyển mục này cùng toàn bộ mục con, câu hỏi và tệp đính kèm vào Thùng rác? Bạn có thể khôi phục sau.'))return;const snapshot=deepCopy(state.data);state.data.features ||= {tasks:[],events:[],ideas:[],links:[],trash:[],archive:[]};state.data.features.trash ||= [];found.siblings.splice(found.siblings.indexOf(found.node),1);state.data.features.trash.push({id:uid(),deletedAt:iso(),mode:pathOf(id)[0]?.mode||found.node.mode||state.data.settings.activeMode,parentId:found.parent?.id||null,node:deepCopy(found.node)});state.selected=found.parent?.id||null;if(!await commitOrRollback(snapshot)){render();return;}render();toast('Đã chuyển dự án vào Thùng rác.');}
function findQuestion(nodeId,qid){return find(nodeId)?.node.questions.find(q=>q.id===qid)||null;}
const SS_MATH_GROUPS=[
 {id:'basic',label:'Cơ bản',symbols:['+','−','±','∓','×','·','÷','/','=','≠','≈','≡','≢','<','>','≤','≥','≪','≫','∝','∞','∴','∵','!','%','‰','∠','°']},
 {id:'algebra',label:'Đại số',symbols:['√','∛','∜','|x|','‖x‖','x²','x³','xⁿ','a₁','a₂','aₙ','x₀','x′','f′(x)','Δ','δ','∣','∤','⌊x⌋','⌈x⌉','∓','∔','⊕','⊗']},
 {id:'greek',label:'Hy Lạp',symbols:['α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ','ν','ξ','ο','π','ρ','σ','τ','υ','φ','χ','ψ','ω','Γ','Δ','Θ','Λ','Ξ','Π','Σ','Φ','Ψ','Ω']},
 {id:'calculus',label:'Giải tích',symbols:['∑','∏','∐','∫','∬','∭','∮','∯','∰','∂','∇','lim','d/dx','dx','dy','Δx','Δy','ẋ','ẍ','→','↦','∞','∝','∼']},
 {id:'geometry',label:'Hình học',symbols:['∠','∡','°','′','″','⊥','∥','∦','△','▲','□','◇','○','◎','⊙','⌒','≅','≃','∼','⟂','∣','∣∣','π','r²']},
 {id:'sets',label:'Tập hợp & logic',symbols:['∈','∉','∋','∌','⊂','⊆','⊃','⊇','∪','∩','∅','ℕ','ℤ','ℚ','ℝ','ℂ','∀','∃','∄','¬','∧','∨','⇒','⇔','⊕','⊗','⊢','⊨']},
 {id:'stats',label:'Xác suất',symbols:['x̄','ȳ','μ','σ','σ²','s²','n','P(A)','P(B)','P(A∩B)','P(A∪B)','P(A|B)','∑xᵢ','x̄±s','ρ','r','Σ','√n']},
 {id:'vectors',label:'Vectơ & ma trận',symbols:['→','↔','⇀','⟶','a⃗','u⃗','v⃗','i⃗','j⃗','k⃗','Aᵀ','A⁻¹','Iₙ','det(A)','tr(A)','‖a⃗‖','a⃗·b⃗','a⃗×b⃗','λ','⟨a,b⟩']},
 {id:'physics',label:'Vật lí & đơn vị',symbols:['Δ','λ','ν','ω','Ω','μ','ρ','φ','θ','η','°C','K','mol','m/s','m/s²','N','J','W','Pa','V','A','C','F','T','Hz','eV','⇌']},
 {id:'templates',label:'Mẫu công thức',symbols:['√(□)','∛(□)','∫ₐᵇ f(x) dx','∑ᵢ₌₁ⁿ aᵢ','limₓ→ₐ f(x)','Δ = b² − 4ac','x = (−b ± √Δ)/(2a)','a² + b² = c²','v = Δs/Δt','F = ma','E = mc²','P(A|B) = P(A∩B)/P(B)','S = πr²','V = lwh','sin²x + cos²x = 1']}
];
function openMathSymbolPalette(anchor,onInsert){
 document.querySelectorAll('.ss-math-palette').forEach(x=>x.remove());
 const panel=document.createElement('section');panel.className='ss-math-palette';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Bảng ký hiệu toán học');
 panel.innerHTML=`<div class="ss-math-head"><div class="ss-math-title"><span class="ss-math-badge">∑</span><span><b>Ký hiệu toán học</b><small>Chèn trực tiếp tại vị trí con trỏ</small></span></div><button type="button" class="ss-math-close" aria-label="Đóng bảng ký hiệu">×</button></div><div class="ss-math-search"><input type="search" placeholder="Tìm ký hiệu hoặc công thức…" aria-label="Tìm ký hiệu toán học"></div><div class="ss-math-tabs" role="tablist"></div><div class="ss-math-main"><div class="ss-math-section-label"></div><div class="ss-math-grid"></div></div><div class="ss-math-foot"><span><b>Chạm / bấm</b> một ký hiệu để chèn</span><span>Esc · Đóng</span></div>`;
 document.body.append(panel);
 const tabs=panel.querySelector('.ss-math-tabs'),grid=panel.querySelector('.ss-math-grid'),label=panel.querySelector('.ss-math-section-label'),search=panel.querySelector('input');
 let active='basic';
 const renderTabs=()=>{tabs.innerHTML=SS_MATH_GROUPS.map(g=>`<button type="button" role="tab" aria-selected="${active===g.id}" class="${active===g.id?'active':''}" data-math-group="${g.id}">${g.label}</button>`).join('');};
 const renderGrid=()=>{const term=search.value.trim().toLocaleLowerCase('vi');let group=SS_MATH_GROUPS.find(g=>g.id===active)||SS_MATH_GROUPS[0];let items=term?SS_MATH_GROUPS.flatMap(g=>g.symbols.map(symbol=>({symbol,group:g.label,id:g.id}))).filter(x=>(x.symbol+' '+x.group).toLocaleLowerCase('vi').includes(term)):group.symbols.map(symbol=>({symbol,group:group.label,id:group.id}));label.textContent=term?'KẾT QUẢ TÌM KIẾM':group.label.toUpperCase();grid.innerHTML=items.length?items.map(x=>`<button type="button" data-math-symbol="${esc(x.symbol)}" title="${esc(x.symbol)} · ${esc(x.group)}">${esc(x.symbol)}</button>`).join(''):'<div class="ss-math-empty">Không tìm thấy ký hiệu phù hợp.</div>';};
 const close=()=>{panel.remove();document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',onKey,true);};
 const outside=e=>{if(!panel.contains(e.target)&&!anchor.contains(e.target))close();};
 const onKey=e=>{if(e.key==='Escape'){close();anchor.focus?.({preventScroll:true});}};
 tabs.addEventListener('click',e=>{const b=e.target.closest('[data-math-group]');if(!b)return;active=b.dataset.mathGroup;renderTabs();renderGrid();});
 search.addEventListener('input',renderGrid);
 // Keep native pointer/click activation; the source editor range is captured before the palette opens.
 panel.addEventListener('click',e=>{if(e.target.closest('.ss-math-close')){close();return;}const b=e.target.closest('[data-math-symbol]');if(!b)return;const value=b.dataset.mathSymbol;close();onInsert?.(value);});
 renderTabs();renderGrid();
 const rect=anchor.getBoundingClientRect(),width=Math.min(448,innerWidth-20),height=Math.min(570,innerHeight-24);let left=Math.max(10,Math.min(innerWidth-width,rect.left+rect.width/2-width/2));let top=rect.bottom+8;if(top+Math.min(height,420)>innerHeight-10)top=Math.max(10,rect.top-Math.min(height,420)-8);panel.style.left=left+'px';panel.style.top=top+'px';
 requestAnimationFrame(()=>search.focus({preventScroll:true}));document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',onKey,true);
}

function questionGridCellHTML(html,plain){
  const fallback=String(plain||'').split(/\r?\n/).map(x=>esc(x)).join('<br>');
  return sanitizeRichHTML(html||fallback);
}
function questionGridRowMarkup(row,index){
  const qHtml=questionGridCellHTML(row.questionHTML,row.question),aHtml=questionGridCellHTML(row.answerHTML,row.answer);
  return `<div class="q-grid-row" data-q-row="${esc(row.rowId)}" data-existing-qid="${esc(row.existingQid||'')}">
    <div class="q-grid-index"><span>${String(index+1).padStart(2,'0')}</span><small>DÒNG</small></div>
    <section class="q-grid-cell q-grid-question"><div class="q-grid-cell-heading"><b>CÂU HỎI</b><small>Question</small></div><div class="q-grid-editor q-rich-editor" data-grid-editor="question" data-row-id="${esc(row.rowId)}" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true" data-placeholder="Nhập câu hỏi tại đây…">${qHtml}</div></section>
    <section class="q-grid-cell q-grid-answer"><div class="q-grid-cell-heading"><b>ĐÁP ÁN</b><small>Answer</small></div><div class="q-grid-editor q-rich-editor" data-grid-editor="answer" data-row-id="${esc(row.rowId)}" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true" data-placeholder="Nhập đáp án / lời giải tại đây…">${aHtml}</div></section>
    <section class="q-grid-cell q-grid-tag-cell"><label for="qTags-${esc(row.rowId)}">CHỦ ĐỀ / NHÃN</label><input id="qTags-${esc(row.rowId)}" data-grid-tags="${esc(row.rowId)}" value="${esc((row.tags||[]).join(', '))}" placeholder="Ví dụ: Cơ học, VDC…"><small>Ngăn cách bằng dấu phẩy</small></section>
    <div class="q-grid-row-actions"><button type="button" class="q-grid-remove" data-grid-remove="${esc(row.rowId)}" ${row.existingQid?'disabled title="Không thể bỏ câu đang chỉnh sửa khỏi biểu mẫu"':'title="Xóa dòng này"'}>×</button></div>
  </div>`;
}
function bindQuestionGridStudio(nodeId,initialQuestion,rowsHost,mediaMap){
  state.questionEditorController?.abort();
  const controller=new AbortController(),signal=controller.signal;state.questionEditorController=controller;
  let activeEditor=null,lastRange=null,activeRowId=rowsHost.querySelector('.q-grid-row')?.dataset.qRow||null;
  const form=$('#form'),toolbar=$('#qGridToolbar'),attachHost=$('#qGridAttachmentDock');
  const getActiveRow=()=>activeRowId?rowsHost.querySelector(`[data-q-row="${CSS.escape(activeRowId)}"]`):null;
  const remember=()=>{const sel=window.getSelection();if(sel?.rangeCount&&activeEditor){const r=sel.getRangeAt(0);if(activeEditor.contains(r.commonAncestorContainer))lastRange=r.cloneRange();}};
  const restore=editor=>{
    if(!editor)return;editor.focus({preventScroll:true});
    if(lastRange&&lastRange.startContainer.isConnected&&editor.contains(lastRange.commonAncestorContainer)){
      try{const sel=window.getSelection();sel.removeAllRanges();sel.addRange(lastRange);return;}catch(_){}
    }
    const range=document.createRange();range.selectNodeContents(editor);range.collapse(false);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);lastRange=range.cloneRange();
  };
  const rowElements=()=>[...rowsHost.querySelectorAll('.q-grid-row')];
  const collectRows=()=>rowElements().map(row=>{
    const q=row.querySelector('[data-grid-editor="question"]'),a=row.querySelector('[data-grid-editor="answer"]');
    return {rowId:row.dataset.qRow,existingQid:row.dataset.existingQid||'',questionHTML:sanitizeRichHTML(q?.innerHTML||''),answerHTML:sanitizeRichHTML(a?.innerHTML||''),question:projectText(q?.innerHTML||''),answer:projectText(a?.innerHTML||''),tags:String(row.querySelector('[data-grid-tags]')?.value||'').split(',').map(x=>x.trim()).filter(Boolean)};
  });
  const syncHidden=()=>{const hidden=$('#qRowsJSON');if(hidden)hidden.value=JSON.stringify(collectRows());const count=collectRows().filter(r=>r.question||r.answer).length;const label=$('#qGridRowCount');if(label)label.textContent=`${count} ${count===1?'câu':'câu hỏi'} đã nhập`;};
  const updateIndices=()=>rowElements().forEach((row,i)=>{const n=row.querySelector('.q-grid-index span');if(n)n.textContent=String(i+1).padStart(2,'0');});
  const renderAttach=()=>{
    const row=getActiveRow();if(!row||!attachHost)return;
    const rowId=row.dataset.qRow,media=mediaMap.get(rowId)||{images:[],removedImages:new Set(),pendingImages:[],audio:null,removeAudio:false};
    mediaMap.set(rowId,media);
    const previews=[...media.images.map((src,i)=>({src,existing:true,index:i,removed:media.removedImages.has(i)})),...media.pendingImages.map((src,i)=>({src,existing:false,index:i,removed:false}))];
    const previewHTML=previews.map(p=>`<div class="q-grid-media-preview" style="opacity:${p.removed?'.28':'1'}"><img src="${p.src}" alt="Tệp minh họa"><button type="button" data-grid-media-remove="${p.existing?'old':'new'}:${p.index}" title="${p.removed?'Giữ lại ảnh':'Bỏ ảnh'}">${p.removed?'↶':'×'}</button></div>`).join('');
    const audioHTML=media.audio?`<div class="q-grid-audio-chip"><span>♫ ${esc(media.audio.name||'Âm thanh đã đính kèm')}</span><button type="button" data-grid-audio-remove>${media.removeAudio?'↶ Giữ lại':'× Bỏ âm thanh'}</button></div>`:'<span class="q-grid-no-audio">Chưa có âm thanh đính kèm</span>';
    const index=rowElements().indexOf(row)+1;
    attachHost.innerHTML=`<div class="q-grid-attach-heading"><div><span class="q-grid-mini-kicker">TƯ LIỆU ĐÍNH KÈM</span><b>Dòng ${index}</b><small>Ảnh và âm thanh sẽ được lưu cùng câu hỏi ở dòng này.</small></div><div class="q-grid-attach-actions"><label class="q-grid-file-btn">▧ Thêm ảnh<input type="file" id="qGridImageFiles" accept="image/*" multiple hidden></label><label class="q-grid-file-btn audio">♫ Thêm âm thanh<input type="file" id="qGridAudioFile" accept="audio/*" hidden></label></div></div><div class="q-grid-media-strip">${previewHTML||'<span class="q-grid-no-images">Chưa có ảnh minh họa</span>'}</div><div class="q-grid-audio-row">${audioHTML}</div>`;
    $('#qGridImageFiles')?.addEventListener('change',async e=>{
      const files=[...e.target.files];e.target.value='';if(!files.length)return;
      const existing=media.images.length-media.removedImages.size+media.pendingImages.length;
      if(existing+files.length>8){toast('Mỗi câu hỏi tối đa 8 ảnh.');return;}
      for(const file of files){try{media.pendingImages.push(await compressImage(file));}catch(err){toast(err?.message||'Không đọc được ảnh.');}}
      renderAttach();syncHidden();
    },{signal});
    $('#qGridAudioFile')?.addEventListener('change',async e=>{
      const file=e.target.files?.[0];e.target.value='';if(!file)return;
      try{media.audio=await fileToData(file);media.removeAudio=false;renderAttach();syncHidden();}catch(err){toast(err?.message||'Không đọc được âm thanh.');}
    },{signal});
  };
  const activate=editor=>{
    if(!editor)return;activeEditor=editor;activeRowId=editor.dataset.rowId||activeRowId;
    rowsHost.querySelectorAll('.q-grid-row').forEach(r=>r.classList.toggle('is-active',r.dataset.qRow===activeRowId));
    renderAttach();
  };
  rowsHost.addEventListener('focusin',e=>{const editor=e.target.closest('[data-grid-editor]');if(editor){activate(editor);remember();}else{const row=e.target.closest('.q-grid-row');if(row){activeRowId=row.dataset.qRow;rowsHost.querySelectorAll('.q-grid-row').forEach(r=>r.classList.toggle('is-active',r===row));renderAttach();}}},{signal});
  rowsHost.addEventListener('input',e=>{if(e.target.matches('[data-grid-editor]')){activate(e.target);syncHidden();}else if(e.target.matches('[data-grid-tags]'))syncHidden();},{signal});
  rowsHost.addEventListener('click',e=>{
    const remove=e.target.closest('[data-grid-remove]');if(!remove)return;
    const row=remove.closest('.q-grid-row');if(!row||row.dataset.existingQid){toast('Câu đang chỉnh sửa được giữ nguyên.');return;}
    if(rowElements().length<=1){toast('Cần giữ lại ít nhất một dòng để nhập câu hỏi.');return;}
    const id=row.dataset.qRow;row.remove();mediaMap.delete(id);updateIndices();syncHidden();const first=rowElements()[0];if(first){activeRowId=first.dataset.qRow;activate(first.querySelector('[data-grid-editor="question"]'));}
  },{signal});
  attachHost.addEventListener('click',e=>{
    const remove=e.target.closest('[data-grid-media-remove]');if(remove){const [kind,indexText]=remove.dataset.gridMediaRemove.split(':'),media=mediaMap.get(activeRowId);if(!media)return;const index=Number(indexText);if(kind==='old'){media.removedImages.has(index)?media.removedImages.delete(index):media.removedImages.add(index);}else media.pendingImages.splice(index,1);renderAttach();syncHidden();return;}
    if(e.target.closest('[data-grid-audio-remove]')){const media=mediaMap.get(activeRowId);if(media){media.removeAudio=!media.removeAudio;renderAttach();syncHidden();}}
  },{signal});
  $('#qGridAddRow').onclick=()=>{
    const id=uid(),row={rowId:id,existingQid:'',questionHTML:'',answerHTML:'',tags:[]};
    rowsHost.insertAdjacentHTML('beforeend',questionGridRowMarkup(row,rowElements().length));mediaMap.set(id,{images:[],removedImages:new Set(),pendingImages:[],audio:null,removeAudio:false});
    const el=rowsHost.querySelector(`[data-q-row="${CSS.escape(id)}"]`);updateIndices();syncHidden();activate(el.querySelector('[data-grid-editor="question"]'));el.querySelector('[data-grid-editor="question"]')?.focus({preventScroll:true});
  };
  const command=(cmd,value=null)=>{if(!activeEditor){toast('Hãy chọn ô câu hỏi hoặc đáp án trước.');return;}restore(activeEditor);document.execCommand(cmd,false,value);activeEditor.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'formatContent'}));remember();syncHidden();};
  toolbar?.addEventListener('pointerdown',e=>{if(e.target.closest('button')){remember();e.preventDefault();}},{signal});
  toolbar?.addEventListener('click',e=>{
    const button=e.target.closest('button');if(!button)return;
    const editor=activeEditor;if(!editor){toast('Hãy chọn ô câu hỏi hoặc đáp án trước.');return;}
    if(button.hasAttribute('data-grid-math')){
      remember();const savedEditor=editor,savedRange=lastRange?.cloneRange()||null;
      openMathSymbolPalette(button,symbol=>{
        if(!savedEditor.isConnected)return;activeEditor=savedEditor;savedEditor.focus({preventScroll:true});
        const sel=window.getSelection();
        if(savedRange&&savedRange.startContainer.isConnected&&savedEditor.contains(savedRange.commonAncestorContainer)){sel.removeAllRanges();sel.addRange(savedRange);}
        else{const r=document.createRange();r.selectNodeContents(savedEditor);r.collapse(false);sel.removeAllRanges();sel.addRange(r);}
        document.execCommand('insertText',false,symbol);
        savedEditor.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:symbol}));remember();syncHidden();
      });return;
    }
    if(button.hasAttribute('data-grid-internal-ref')){
      restore(editor);remember();const range=lastRange?.cloneRange()||null,existingRef=inlineReferenceAtRange(range,editor);
      openInlineRefPicker({selectedText:range?.toString()||existingRef?.textContent||'',existingRef,onInsert:html=>{if(existingRef&&existingRef.isConnected)existingRef.outerHTML=html;else{restore(editor);document.execCommand('insertHTML',false,html);}editor.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));remember();syncHidden();}});return;
    }
    if(button.dataset.gridCmd){command(button.dataset.gridCmd);return;}
    if(button.hasAttribute('data-grid-web-link')){restore(editor);const url=prompt('Nhập địa chỉ liên kết (https://...)');if(url&&/^https?:\/\//i.test(url.trim()))command('createLink',url.trim());else if(url)toast('Liên kết phải bắt đầu bằng http:// hoặc https://.');return;}
    if(button.hasAttribute('data-grid-template')){const val=$('#qGridTemplate')?.value||'idea',templates={idea:'<div class="note-card note-card-mint"><p class="note-card-kicker">✦ Ý CHÍNH</p><p>Ghi ý chính tại đây…</p></div><p><br></p>',formula:'<div class="note-card note-card-violet"><p class="note-card-kicker">ƒ CÔNG THỨC</p><p>Nội dung công thức…</p></div><p><br></p>',steps:'<div class="note-card note-card-sky"><p class="note-card-kicker">☷ CÁC BƯỚC GIẢI</p><ol><li>Bước 1…</li><li>Bước 2…</li><li>Bước 3…</li></ol></div><p><br></p>',quote:'<blockquote><p>Trích dẫn / dữ kiện…</p></blockquote><p><br></p>'};command('insertHTML',templates[val]||templates.idea);return;}
    if(button.hasAttribute('data-grid-rule')){command('insertHTML','<hr class="note-divider"><p><br></p>');return;}
    if(button.hasAttribute('data-grid-checklist')){command('insertHTML','<ul class="note-checklist"><li>☐ Việc cần hoàn thành</li><li>☐ Việc tiếp theo</li></ul><p><br></p>');return;}
    if(button.hasAttribute('data-grid-emoji')){command('insertText',($('#qGridEmoji')?.value||'💡')+' ');return;}
    if(button.hasAttribute('data-grid-sticker')){command('insertHTML',`<span class="note-sticker">${esc($('#qGridEmoji')?.value||'⭐')}</span>&nbsp;`);return;}
    if(button.hasAttribute('data-grid-date')){command('insertText',new Date().toLocaleDateString('vi-VN'));return;}
    if(button.hasAttribute('data-grid-clear')){command('removeFormat');return;}
    if(button.hasAttribute('data-grid-table')){const r=prompt('Số hàng của bảng (1–12):','3');if(r===null)return;const c=prompt('Số cột của bảng (1–8):','2');if(c===null)return;const rows=Math.max(1,Math.min(12,parseInt(r,10)||1)),cols=Math.max(1,Math.min(8,parseInt(c,10)||1));let html='<table class="note-table"><tbody>';for(let y=0;y<rows;y++){html+='<tr>';for(let x=0;x<cols;x++)html+=`<${y===0?'th':'td'}><br></${y===0?'th':'td'}>`;html+='</tr>';}html+='</tbody></table><p><br></p>';command('insertHTML',html);return;}
    if(button.hasAttribute('data-grid-inline-image')){toolbar.querySelector('[data-grid-image-file]')?.click();return;}
    if(button.hasAttribute('data-grid-inline-audio')){toolbar.querySelector('[data-grid-audio-file]')?.click();return;}
  },{signal});
  toolbar?.querySelector('[data-grid-block]')?.addEventListener('change',e=>command('formatBlock',e.target.value),{signal});
  toolbar?.querySelector('[data-grid-font]')?.addEventListener('change',e=>command('fontName',e.target.value),{signal});
  toolbar?.querySelector('[data-grid-size]')?.addEventListener('change',e=>command('fontSize',e.target.value),{signal});
  toolbar?.querySelector('[data-grid-color]')?.addEventListener('change',e=>command('foreColor',e.target.value),{signal});
  toolbar?.querySelector('[data-grid-highlight]')?.addEventListener('change',e=>command('hiliteColor',e.target.value),{signal});
  toolbar?.querySelector('[data-grid-image-file]')?.addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file||!activeEditor)return;try{const src=await compressImage(file);restore(activeEditor);command('insertHTML',`<img src="${src}" alt="Hình minh họa" class="q-inline-media">`);}catch(err){toast(err?.message||'Không thể chèn ảnh vào nội dung.');}},{signal});
  toolbar?.querySelector('[data-grid-audio-file]')?.addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file||!activeEditor)return;try{const media=await fileToData(file);restore(activeEditor);command('insertHTML',`<audio controls preload="none" src="${media.data}"></audio><p><br></p>`);}catch(err){toast(err?.message||'Không thể chèn âm thanh vào nội dung.');}},{signal});
  document.addEventListener('selectionchange',remember,{signal});
  // Study tools locate the current .q-rich-editor selection themselves.
  state.questionGridSerialize=()=>{syncHidden();return true;};
  state.questionGridDispose=()=>{controller.abort();state.questionGridSerialize=null;state.questionGridDispose=null;state.questionEditorController=null;};
  const first=rowsHost.querySelector('.q-grid-row');if(first){activate(first.querySelector('[data-grid-editor="question"]'));}
  syncHidden();
}
async function questionModal(nodeId,qid=null){
  if(!(await flushBeforeLeave()))return;
  const initialQuestion=qid?findQuestion(nodeId,qid):null;if(qid&&!initialQuestion){toast('Không tìm thấy câu hỏi cần sửa.');return;}
  const rowId=uid(),initialRow={rowId,existingQid:initialQuestion?.id||'',questionHTML:initialQuestion?.questionHTML||'',answerHTML:initialQuestion?.answerHTML||'',question:initialQuestion?.question||'',answer:initialQuestion?.answer||'',tags:[...(initialQuestion?.tags||[])]};
  const mediaMap=new Map([[rowId,{images:[...(initialQuestion?.images||[])],removedImages:new Set(),pendingImages:[],audio:initialQuestion?.audio||null,removeAudio:false}]]);
  const createdInfo=initialQuestion?`<span class="q-sheet-meta-pill">◷ Tạo ngày <b>${dateLabel(initialQuestion.createdDate||initialQuestion.createdAt)}</b></span><span class="q-sheet-meta-pill">Lịch ôn được giữ nguyên khi chỉnh sửa</span>`:`<span class="q-sheet-meta-pill">◷ Tự ghi nhận ngày tạo</span><span class="q-sheet-meta-pill">Câu mới bắt đầu ôn sau 2 ngày</span>`;
  const fields=`<section class="q-sheet-intro"><div class="q-sheet-intro-mark">✦</div><div class="q-sheet-intro-copy"><span> BLOOM · QUESTION WORKSPACE</span><h3>${initialQuestion?'Chỉnh sửa câu hỏi':'Soạn ngân hàng câu hỏi'}</h3><p>Mỗi hàng là một câu hỏi hoàn chỉnh. Nhập câu hỏi và đáp án song song như một bảng làm việc; có thể thêm nhiều hàng trong cùng một lần lưu.</p></div><div class="q-sheet-live-count"><b id="qGridRowCount">0 câu hỏi đã nhập</b><small>Hàng trống sẽ được bỏ qua</small></div></section>
    <section class="q-sheet-toolbar-panel"><div class="q-sheet-toolbar-heading"><b>ĐỊNH DẠNG NỘI DUNG</b><small>Chọn ô câu hỏi hoặc đáp án trước khi dùng công cụ</small></div><div class="q-grid-toolbar" id="qGridToolbar">
      <div class="q-grid-tool-group"><button type="button" data-grid-cmd="undo" title="Hoàn tác">↶</button><button type="button" data-grid-cmd="redo" title="Làm lại">↷</button></div>
      <div class="q-grid-tool-group"><select data-grid-font title="Phông chữ"><option value="Georgia">Georgia</option><option value="Arial">Arial</option><option value="'Times New Roman'">Times</option><option value="Cambria">Cambria</option></select><select data-grid-size title="Cỡ chữ"><option value="2">Nhỏ</option><option value="3" selected>Vừa</option><option value="4">Lớn</option><option value="5">Rất lớn</option></select></div>
      <div class="q-grid-tool-group"><button type="button" data-grid-cmd="bold" title="In đậm"><b>B</b></button><button type="button" data-grid-cmd="italic" title="In nghiêng"><i>I</i></button><button type="button" data-grid-cmd="underline" title="Gạch chân"><u>U</u></button><button type="button" data-grid-cmd="superscript" title="Chỉ số trên">x²</button><button type="button" data-grid-cmd="subscript" title="Chỉ số dưới">H₂</button><button type="button" data-grid-math class="math-symbol-launch" title="Mở bảng ký hiệu toán học">∑ Toán</button></div>
      <div class="q-grid-tool-group"><select data-grid-block title="Kiểu đoạn"><option value="p">Văn bản</option><option value="h2">Tiêu đề</option><option value="h3">Đề mục</option><option value="blockquote">Trích dẫn</option></select><button type="button" data-grid-cmd="insertUnorderedList" title="Danh sách">☷</button><button type="button" data-grid-cmd="insertOrderedList" title="Danh sách số">1.</button><button type="button" data-grid-cmd="justifyLeft" title="Căn trái">⇤</button><button type="button" data-grid-cmd="justifyCenter" title="Căn giữa">↔</button><button type="button" data-grid-cmd="justifyRight" title="Căn phải">⇥</button></div>
      <div class="q-grid-tool-group"><label title="Màu chữ">A <input type="color" data-grid-color value="#2864df"></label><select data-grid-highlight title="Màu tô sáng"><option value="#fff0a9">Vàng</option><option value="#ffdce5">Hồng</option><option value="#d8f3e9">Ngọc</option><option value="#dceaff">Lam</option><option value="#eadfff">Tím</option></select><button type="button" data-grid-cmd="hiliteColor" title="Tô vùng chữ">▰</button></div>
      <div class="q-grid-tool-group"><select id="qGridTemplate" title="Mẫu nội dung"><option value="idea">✦ Ý chính</option><option value="formula">ƒ Công thức</option><option value="steps">☷ Các bước giải</option><option value="quote">❝ Trích dẫn</option></select><button type="button" data-grid-template title="Chèn mẫu">＋ Mẫu</button><button type="button" data-grid-checklist title="Danh sách việc cần làm">☑</button><button type="button" data-grid-rule title="Phân cách">―</button></div>
      <div class="q-grid-tool-group"><select id="qGridEmoji" title="Emoji"><option value="💡">💡</option><option value="⭐">⭐</option><option value="🧠">🧠</option><option value="📌">📌</option><option value="🧪">🧪</option><option value="📚">📚</option><option value="⚠️">⚠️</option><option value="🎯">🎯</option><option value="✨">✨</option><option value="✅">✅</option></select><button type="button" data-grid-emoji>＋ Emoji</button><button type="button" data-grid-sticker title="Chèn nhãn dán">✦ Dán</button></div>
      <div class="q-grid-tool-group"><button type="button" data-grid-table title="Chèn bảng con">▦ Bảng</button><button type="button" data-grid-date title="Chèn ngày">◷ Ngày</button><button type="button" data-grid-clear title="Xóa định dạng">Tx</button><button type="button" data-grid-inline-image title="Chèn ảnh vào nội dung">▧ Ảnh</button><button type="button" data-grid-inline-audio title="Chèn âm thanh vào nội dung">♫ Âm thanh</button><input type="file" data-grid-image-file accept="image/*" hidden><input type="file" data-grid-audio-file accept="audio/*" hidden></div>
      <div class="q-grid-tool-group"><button type="button" data-grid-web-link>↗ Web</button><button type="button" data-grid-internal-ref class="internal">⛓ Nội bộ</button><button type="button" data-open-study-tools class="study-tools-launch">✦ Học cụ</button></div>
    </div></section>
    <section class="q-grid-sheet"><div class="q-grid-sheet-heading"><div><span>QUESTION BANK</span><h4>Bảng nhập câu hỏi – đáp án</h4></div><div class="q-grid-sheet-tip">✧ Một dòng = một câu hỏi</div></div><div class="q-grid-table-wrap"><div class="q-grid-table-head"><span>#</span><span>NỘI DUNG CÂU HỎI</span><span>ĐÁP ÁN / LỜI GIẢI</span><span>CHỦ ĐỀ / NHÃN</span><span></span></div><div id="qGridRows">${questionGridRowMarkup(initialRow,0)}</div></div><div class="q-grid-add-row-wrap"><button type="button" id="qGridAddRow" class="q-grid-add-row">＋ Thêm hàng câu hỏi</button><span>Nhập bao nhiêu hàng tùy ý, các hàng trống không được lưu.</span></div></section>
    <section class="q-grid-bottom-grid"><div class="q-grid-settings"><div class="q-grid-panel-title"><span>⚙</span><div><b>Thiết lập ngân hàng</b><small>Áp dụng cho các câu hỏi trong lần lưu này</small></div></div>${folderSelectHTML(nodeId,null,'Lưu câu hỏi trong dự án / mục con')}<div class="field q-grid-language"><label for="language">Ngôn ngữ phát âm</label><select name="language" id="language"><option value="auto" ${!initialQuestion||initialQuestion.language==='auto'?'selected':''}>Tự nhận diện riêng câu hỏi và đáp án</option><option value="en-US" ${initialQuestion?.language==='en-US'?'selected':''}>English (US)</option><option value="en-GB" ${initialQuestion?.language==='en-GB'?'selected':''}>English (UK)</option><option value="vi-VN" ${initialQuestion?.language==='vi-VN'?'selected':''}>Tiếng Việt</option><option value="off" ${initialQuestion?.language==='off'?'selected':''}>Không phát âm</option></select></div><div class="q-grid-created">${createdInfo}<small>Mỗi câu mới tự động được đưa vào lịch ôn: 2 · 5 · 9 · 20 · 30 · 100 · 365 ngày.</small></div></div><div class="q-grid-attachment" id="qGridAttachmentDock" aria-live="polite"></div></section>
    <input type="hidden" name="rowsJSON" id="qRowsJSON" value="">`;
  modal(initialQuestion?'Chỉnh sửa câu hỏi':'Thêm câu hỏi vào ngân hàng',fields,async f=>{
    let rows=[];try{rows=JSON.parse(String(f.get('rowsJSON')||'[]'));}catch(_){toast('Không đọc được bảng câu hỏi. Hãy thử lại.');return false;}
    rows=rows.filter(r=>r.question||r.answer);
    if(!rows.length){toast('Hãy nhập ít nhất một câu hỏi và đáp án.');return false;}
    const invalid=rows.findIndex(r=>!r.question.trim()||!r.answer.trim());if(invalid>=0){toast(`Dòng ${invalid+1}: cần nhập cả câu hỏi và đáp án.`);return false;}
    const currentNode=find(nodeId);if(!currentNode){toast('Dự án ban đầu không còn tồn tại.');return false;}
    const targetNodeId=String(f.get('parentId')||nodeId),destination=find(targetNodeId);if(!destination){toast('Thư mục đích không còn tồn tại.');return false;}
    const prepared=[];
    for(const row of rows){
      const media=mediaMap.get(row.rowId)||{images:[],removedImages:new Set(),pendingImages:[],audio:null,removeAudio:false};
      const images=media.images.filter((_,i)=>!media.removedImages.has(i)).concat(media.pendingImages);
      if(images.length>8){toast(`Dòng ${prepared.length+1}: mỗi câu hỏi tối đa 8 ảnh.`);return false;}
      prepared.push({...row,images,audio:media.removeAudio?null:media.audio});
    }
    const snapshot=deepCopy(state.data),now=iso();let updated=0,added=0;
    for(const row of prepared){
      const latest=row.existingQid?findQuestion(nodeId,row.existingQid):null;
      if(row.existingQid&&!latest){toast('Câu hỏi đang chỉnh sửa không còn tồn tại.');return false;}
      const questionHTML=sanitizeRichHTML(row.questionHTML),answerHTML=sanitizeRichHTML(row.answerHTML);
      const question=projectText(questionHTML),answer=projectText(answerHTML);
      if(!question||!answer){toast('Mỗi hàng cần có câu hỏi và đáp án dạng văn bản.');return false;}
      const createdAt=latest?.createdAt||now,createdDate=latest?.createdDate||reviewDateKey(createdAt)||localDateKey();
      const obj=latest||normalizeQ({createdAt,createdDate,language:f.get('language')||'auto'});
      obj.question=question;obj.answer=answer;
      obj.questionHTML=questionHTML;obj.answerHTML=answerHTML;
      obj.tags=[...new Set((row.tags||[]).map(x=>String(x).trim()).filter(Boolean))];obj.language=f.get('language')||'auto';obj.images=row.images;obj.audio=row.audio;obj.createdAt=createdAt;obj.createdDate=createdDate;obj.updatedAt=now;
      if(!latest){const firstDue=addDays(createdDate,2);obj.review={...normalizedReview(null),step:0,startedAt:createdAt,next:firstDue,last:null,lastReviewDate:null,reviews:0,lapses:0,retry:false,completed:false,completedAt:null,completedMilestones:[],milestoneDueDates:{},milestone30CompletedAt:null,milestone30DueDate:null};destination.node.questions.push(obj);added++;}
      else{if(targetNodeId!==nodeId){currentNode.node.questions=currentNode.node.questions.filter(q=>q.id!==latest.id);destination.node.questions.push(obj);}updated++;}
    }
    currentNode.node.updatedAt=now;destination.node.updatedAt=now;state.selected=targetNodeId;state.page='home';state.nodeTab='questions';state.questionFilters={nodeId:targetNodeId,query:'',status:'all',tag:'all'};
    if(!await commitOrRollback(snapshot)){render();return false;}
    render();toast(`${updated?`Đã cập nhật ${updated} câu. `:''}${added?`Đã thêm ${added} câu mới vào ngân hàng.`:''}`.trim());return true;
  },initialQuestion?'Lưu thay đổi':'Lưu vào ngân hàng');
  const shell=$('#overlay .modal');shell?.classList.add('question-grid-modal');$('#overlay').classList.add('question-grid-overlay');$('#form').classList.add('question-grid-form');
  bindQuestionGridStudio(nodeId,initialQuestion,$('#qGridRows'),mediaMap);
}
function renderPreview(){const host=$('#imagePreview');if(!host)return;host.innerHTML=state.editImages.map((src,i)=>`<div class="preview-item" style="opacity:${state.removeMedia.has(i)?'.35':'1'}"><img src="${esc(src)}" alt="Ảnh ${i+1}"><button type="button" data-remove-existing="${i}">${state.removeMedia.has(i)?'+':'×'}</button></div>`).join('')+state.pendingImages.map((src,i)=>`<div class="preview-item"><img src="${esc(src)}" alt="Ảnh mới ${i+1}"><button type="button" data-remove-new="${i}">×</button></div>`).join('');}
function compressImage(file){return new Promise((resolve,reject)=>{if(!file||!file.type.startsWith('image/'))return reject(Error('Tệp không phải hình ảnh'));if(file.size>30*1024*1024)return reject(Error('Ảnh vượt quá 30 MB. Hãy chọn ảnh nhỏ hơn.'));const reader=new FileReader();reader.onerror=()=>reject(reader.error||Error('Không đọc được hình ảnh'));reader.onload=()=>{const image=new Image();image.onerror=()=>reject(Error('Ảnh bị lỗi hoặc không được hỗ trợ'));image.onload=()=>{try{const scale=Math.min(1,1800/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const ctx=canvas.getContext('2d');if(!ctx)throw Error('Không khởi tạo được bộ xử lý ảnh');ctx.drawImage(image,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/webp',.84);resolve(data.startsWith('data:image/webp')?data:canvas.toDataURL('image/png'));}catch(err){reject(err);}};image.src=reader.result;};reader.readAsDataURL(file);});}
function fileToData(file){return new Promise((resolve,reject)=>{if(!file||!file.type.startsWith('audio/'))return reject(Error('Tệp không phải âm thanh'));if(file.size>15*1024*1024)return reject(Error('Tệp âm thanh vượt quá 15 MB'));const reader=new FileReader();reader.onload=()=>resolve({name:file.name,type:file.type||'audio/mpeg',data:reader.result});reader.onerror=()=>reject(reader.error||Error('Không đọc được âm thanh'));reader.readAsDataURL(file);});}
async function deleteQuestion(nodeId,qid){const found=find(nodeId);if(!found)return;if(!confirm('Xóa câu hỏi và toàn bộ hình ảnh/âm thanh đính kèm?'))return;const snapshot=deepCopy(state.data);found.node.questions=found.node.questions.filter(q=>q.id!==qid);if(!await commitOrRollback(snapshot)){render();return;}state.openAnswers.delete(qid);render();toast('Đã xóa câu hỏi.');}
async function exportBackup(){if(state.storageIntegrityBlocked){toast('Chưa thể xuất dữ liệu vì bản đang mở chưa được xác minh. Hãy khôi phục từ bản sao lưu hợp lệ trước.');return;}if(!(await flushBeforeLeave())){toast('Chưa thể sao lưu vì còn nội dung chưa lưu.');return;}const data=deepCopy(state.data),payload={app:'StudySpace',version:APP_VERSION,exportedAt:iso(),checksum:storageChecksum(data),data};const blob=new Blob([JSON.stringify(payload)],{type:'application/json'});download(blob,'StudySpace_backup_'+localDateKey()+'.json');toast('Đã tạo bản sao lưu JSON có mã kiểm tra toàn vẹn.');}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
async function importBackup(file){
  if(!file)return;
  if(file.size>150*1024*1024){toast('Tệp sao lưu vượt quá 150 MB.');return;}
  try{
    const text=await file.text(),payload=JSON.parse(text),raw=payload.data||payload;
    if(payload.checksum&&payload.checksum!==storageChecksum(raw))throw Error('Mã kiểm tra toàn vẹn không khớp');
    const newData=normalizeData(raw);
    if(!confirm('Nhập dữ liệu sẽ thay thế toàn bộ nội dung hiện tại. Bạn đã xuất bản sao lưu dữ liệu đang có chưa?'))return;
    if(state.externalUpdate){toast('Dữ liệu đã thay đổi ở cửa sổ khác. Hãy tải lại trước khi nhập bản sao lưu.');return;}
    const recoveringUntrusted=!!state.storageIntegrityBlocked;
    if(!recoveringUntrusted&&!(await flushBeforeLeave()))return;
    if(recoveringUntrusted){
      // Do not let an untrusted/empty in-memory placeholder block recovery.
      // The chosen backup is authoritative only after its checksum/shape validation above.
      try{state.notebookDispose?.();}catch(_){}
      state.notebookDispose=null;state.flushNotebook=null;state.storeNotebookDraft=null;
    }
    if(state.db&&!recoveringUntrusted){
      try{await dbCreateSnapshot('Trước khi nhập bản sao lưu',state.data);}
      catch(err){console.error(err);toast('Không tạo được mốc khôi phục trước khi nhập. Thao tác nhập đã bị hủy để bảo vệ dữ liệu hiện tại.');return;}
    }
    const old=state.data,oldPage=state.page,oldSelected=state.selected,oldIntegrityBlocked=state.storageIntegrityBlocked;
    // Resolve the expected revision before unlocking writes. If reading the
    // damaged store fails, the application must remain read-only.
    const recoveryRevision=recoveringUntrusted?await currentStoredRevisionForRecovery():Math.max(0,Number(old._revision)||0);
    newData._revision=recoveryRevision;
    newData.updatedAt=old.updatedAt||null;
    state.storageIntegrityBlocked=false;
    state.data=newData;state.selected=null;state.page='home';state.nodeTab='notebook';state.questionFilters={nodeId:null,query:'',status:'all',tag:'all'};
    if(!await save()){
      state.data=old;state.page=oldPage;state.selected=oldSelected;state.storageIntegrityBlocked=oldIntegrityBlocked;render();
      toast('Khôi phục thất bại; dữ liệu cũ vẫn được giữ.');return;
    }
    state.openAnswers.clear();state.expanded.clear();state.newsDate=state.data.settings.lastNewsDate||localDateKey();state.newsMonth=state.newsDate.slice(0,7);render();toast(recoveringUntrusted?'Đã khôi phục từ bản sao lưu hợp lệ và mở khóa lưu dữ liệu.':'Đã khôi phục và kiểm tra cấu trúc dữ liệu.');
  }catch(err){console.error(err);toast('Tệp sao lưu không hợp lệ hoặc không thể khôi phục. Dữ liệu hiện tại không thay đổi.');}
}

function qCard(q,index,nodeId,reviewMode=false){
  const r=q.review||normalizedReview(null),isDue=due(q),isOpen=state.openAnswers.has(q.id);
  const imgs=(q.images||[]).map((src,i)=>`<img src="${esc(src)}" data-image="${esc(q.id)}" data-i="${i}" alt="Hình minh họa">`).join('');
  const audio=q.audio?`<audio class="audio-player" controls preload="none" src="${esc(q.audio.data)}"></audio>`:'';
  const status=r.completed?'Đã hoàn thành chu kỳ 365 ngày':!r.next?'Chưa bắt đầu chu kỳ':isDue?'Đến hạn ôn tập':'Ôn tiếp: '+dateLabel(r.next);
  const controls=!r.next?`<button class="btn btn-start" data-start="${esc(q.id)}" data-node="${esc(nodeId)}">${r.completed?'↻ Bắt đầu chu kỳ mới':'▶ Bắt đầu chu kỳ'}</button>`:isDue?`<button class="btn btn-again" data-forgot="${esc(q.id)}" data-node="${esc(nodeId)}">↻ Chưa nhớ</button><button class="btn btn-memory" data-remember="${esc(q.id)}" data-node="${esc(nodeId)}">✓ Đã nhớ</button>`:`<span class="review-wait">Còn ${Math.max(0,Math.ceil((new Date(reviewDateKey(r.next)+'T12:00:00')-new Date(localDateKey()+'T12:00:00'))/86400000))} ngày</span>`;
  const tags=(q.tags||[]).map(t=>`<button type="button" class="tag tag-button" data-filter-tag="${esc(t)}" title="Lọc nhãn ${esc(t)}">${esc(t)}</button>`).join('');
  const questionMarkup=q.questionHTML?sanitizeRichHTML(q.questionHTML):esc(q.question).replace(/\n/g,'<br>');
  const answerMarkup=q.answerHTML?sanitizeRichHTML(q.answerHTML):esc(q.answer||'Chưa nhập đáp án.').replace(/\n/g,'<br>');
  return `<article class="q-card ${state.revealQuestionId===q.id?'q-card-revealed':''}" data-q="${esc(q.id)}" data-node="${esc(nodeId)}"><div class="q-head"><div class="q-index">${String(index+1).padStart(2,'0')}</div><div class="q-main"><div class="q-text rich-question-text">${questionMarkup}</div><div class="q-created-date">Tạo ngày ${dateLabel(q.createdDate||q.createdAt)}</div>${tags?`<div class="q-tags">${tags}</div>`:''}</div><div class="q-tools"><button class="icon-btn" title="Đọc câu hỏi" data-speak="${esc(q.id)}" data-node="${esc(nodeId)}">🔊</button><button class="icon-btn" title="Đọc đáp án" data-speak-answer="${esc(q.id)}" data-node="${esc(nodeId)}">🗣</button><button class="icon-btn" title="Sửa" data-editq="${esc(q.id)}" data-node="${esc(nodeId)}">✎</button><button class="icon-btn" title="Xóa" data-delq="${esc(q.id)}" data-node="${esc(nodeId)}">×</button></div></div>${imgs||audio?`<div class="q-media">${imgs}${audio}</div>`:''}<button type="button" class="answer-toggle ${isOpen?'open':''}" aria-expanded="${isOpen}" data-answer="${esc(q.id)}" data-node="${esc(nodeId)}"><span class="answer-title"><span>▣　ĐÁP ÁN</span><span>${isOpen?'Ẩn　⌃':'Hiện　⌄'}</span></span><div class="answer-body rich-answer-body">${answerMarkup}</div></button><div class="review-row"><span class="review-status">${status}${r.reviews?` · Đã ôn ${r.reviews} lần`:''}${r.lapses?` · Chưa nhớ ${r.lapses} lần`:''}${completedMilestoneLabel(q)?' · ✦ Mốc '+completedMilestoneLabel(q):''}</span><div class="review-buttons">${controls}</div></div></article>`;
}
function renderQuestions(n,query='',status='all',tag='all'){
  const filters=state.questionFilters;if(filters.nodeId!==n.id){state.questionFilters={nodeId:n.id,query:'',status:'all',tag:'all'};}
  const f=state.questionFilters;query=query??f.query;status=status||f.status;tag=tag||f.tag;
  f.query=query;f.status=status;f.tag=tag;
  const needle=(query||'').toLocaleLowerCase('vi');
  const list=(n.questions||[]).filter(q=>{
    const text=(q.question+' '+q.answer+' '+(q.tags||[]).join(' ')).toLocaleLowerCase('vi');
    if(needle&&!text.includes(needle))return false;
    if(tag!=='all'&&!(q.tags||[]).includes(tag))return false;
    if(status==='due'&&!due(q))return false;
    if(status==='unmemorized'&&q.review?.completed)return false;
    if(status==='milestone30'&&!hasCompletedMilestone(q,30))return false;
    if(status==='milestone100'&&!hasCompletedMilestone(q,100))return false;
    if(status==='milestone365'&&!hasCompletedMilestone(q,365))return false;
    if(status==='unscheduled'&&q.review?.next)return false;
    return true;
  });
  const host=$('#questionList');if(!host)return;
  host.innerHTML=list.length?`<div class="q-list">${list.map((q,i)=>qCard(q,i,n.id)).join('')}</div>`:`<div class="quiet-empty">${query||status!=='all'||tag!=='all'?'Không tìm thấy câu hỏi phù hợp.':'Chưa có câu hỏi trong dự án này.'}</div>`;
  bindCards(host);
  $$('[data-filter-tag]',host).forEach(b=>b.onclick=()=>{state.questionFilters.tag=b.dataset.filterTag;state.questionFilters.query='';$('#qTagFilter').value=b.dataset.filterTag;$('#qSearch').value='';renderQuestions(n,'',$('#qStatusFilter').value,b.dataset.filterTag);});
  if(state.revealQuestionId){const target=$(`[data-q="${CSS.escape(state.revealQuestionId)}"]`,host);if(target){target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.add('q-card-revealed');}state.revealQuestionId=null;}
}
function bindCards(root){
  $$('[data-answer]',root).forEach(btn=>btn.onclick=()=>{const isOpen=!btn.classList.contains('open');btn.classList.toggle('open',isOpen);btn.setAttribute('aria-expanded',String(isOpen));$('.answer-title span:last-child',btn).textContent=isOpen?'Ẩn　⌃':'Hiện　⌄';isOpen?state.openAnswers.add(btn.dataset.answer):state.openAnswers.delete(btn.dataset.answer);});
  $$('[data-speak]',root).forEach(b=>b.onclick=()=>{const q=findQuestion(b.dataset.node,b.dataset.speak);if(q)speak(q.question,language(q,q.question));});
  $$('[data-speak-answer]',root).forEach(b=>b.onclick=()=>{const q=findQuestion(b.dataset.node,b.dataset.speakAnswer);if(q)speak(q.answer,language(q,q.answer));});
  $$('[data-start]',root).forEach(b=>b.onclick=()=>{const q=findQuestion(b.dataset.node,b.dataset.start);if(q)startCycle(q);});
  $$('[data-remember]',root).forEach(b=>b.onclick=()=>{const q=findQuestion(b.dataset.node,b.dataset.remember);if(q)remember(q);});
  $$('[data-forgot]',root).forEach(b=>b.onclick=()=>{const q=findQuestion(b.dataset.node,b.dataset.forgot);if(q)forgot(q);});
  $$('[data-editq]',root).forEach(b=>b.onclick=()=>questionModal(b.dataset.node,b.dataset.editq));
  $$('[data-delq]',root).forEach(b=>b.onclick=()=>deleteQuestion(b.dataset.node,b.dataset.delq));
  $$('[data-image]',root).forEach(img=>img.onclick=()=>{const q=findQuestion(img.closest('[data-node]')?.dataset.node,img.dataset.image),src=q?.images?.[Number(img.dataset.i)];if(src){$('#largeImage').src=src;$('#lightbox').classList.add('show');}});
  if(!$('#qTagFilter'))$$('[data-filter-tag]',root).forEach(b=>b.onclick=async()=>{const tag=b.dataset.filterTag,nodeId=b.closest('[data-node]')?.dataset.node;if(!nodeId)return;if(!(await flushBeforeLeave()))return;state.selected=nodeId;state.page='home';state.nodeTab='questions';state.questionFilters={nodeId,query:'',status:'all',tag};render();});
}
function language(q,text=''){if(q?.language==='en-US'||q?.language==='en-GB'||q?.language==='vi-VN')return q.language;if(q?.language==='off')return null;const txt=String(text||'');if(/[ăâđêôơưĂÂĐÊÔƠƯàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]/i.test(txt))return'vi-VN';const ascii=txt.match(/[A-Za-z]/g)||[];return ascii.length?'en-US':'vi-VN';}
if('speechSynthesis'in window){const refreshSpeechVoices=()=>{speechVoiceCache=speechSynthesis.getVoices()||[];};refreshSpeechVoices();speechSynthesis.addEventListener?.('voiceschanged',refreshSpeechVoices);}
function speak(text,lang){if(!('speechSynthesis'in window)){toast('Trình duyệt này chưa hỗ trợ đọc văn bản.');return;}if(!lang){toast('Câu hỏi đang tắt chức năng phát âm.');return;}const content=String(text||'').trim();if(!content)return toast('Không có nội dung để đọc.');speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(content);utterance.lang=lang;utterance.rate=Number(state.data.settings.rate||1);utterance.onerror=()=>toast('Không phát được giọng đọc trên thiết bị này.');let started=false;const begin=()=>{if(started)return;const voices=speechVoiceCache.length?speechVoiceCache:(speechVoiceCache=speechSynthesis.getVoices()||[]);if(!voices.length)return;started=true;const voice=voices.find(v=>v.lang.toLowerCase()===lang.toLowerCase())||voices.find(v=>v.lang.toLowerCase().startsWith(lang.slice(0,2).toLowerCase()));if(voice)utterance.voice=voice;speechSynthesis.speak(utterance);};if(speechVoiceCache.length)begin();else{const onReady=()=>{speechVoiceCache=speechSynthesis.getVoices()||[];if(speechVoiceCache.length){speechSynthesis.removeEventListener?.('voiceschanged',onReady);begin();}};speechSynthesis.addEventListener?.('voiceschanged',onReady);setTimeout(()=>{speechVoiceCache=speechSynthesis.getVoices()||[];if(speechVoiceCache.length)begin();else{speechSynthesis.removeEventListener?.('voiceschanged',onReady);begin();}},1500);}}
function renderDashboard(view){
  if(window.BLOOM_FEATURES){window.BLOOM_FEATURES.renderHome(view);return;}
}

function renderReviewPage(view){
  const all=visitQuestions(activeRoots()),dueQs=dueList(),today=localDateKey();
  const reviewedToday=all.filter(x=>x.q.review?.lastReviewDate===today).length;
  const scheduled=all.filter(x=>x.q.review?.next).length;
  const done30=all.filter(x=>hasCompletedMilestone(x.q,30)).length;
  const done100=all.filter(x=>hasCompletedMilestone(x.q,100)).length;
  const done365=all.filter(x=>hasCompletedMilestone(x.q,365)).length;
  const intervalMarkup=intervals.map(d=>`<span class="${[30,100,365].includes(d)?'long-interval':''}"><b>${d}</b><small>ngày</small></span>`).join('');
  if(dueQs.length){
    const current=dueQs[0],q=current.q,node=current.node,path=pathOf(node.id).map(x=>x.name).join(' / ');
    const revealed=state.reviewRevealedId===q.id;
    const imgs=(q.images||[]).slice(0,4).map((src,i)=>`<img src="${esc(src)}" data-session-image="${i}" alt="Hình minh họa">`).join('');
    const audio=q.audio?`<audio class="audio-player" controls preload="none" src="${esc(q.audio.data)}"></audio>`:'';
    const progressTotal=Math.max(reviewedToday+dueQs.length,1),progress=Math.min(100,Math.round(reviewedToday/progressTotal*100));
    view.innerHTML=`<section class="mandatory-review-page">
      <div class="mandatory-review-top"><div><div class="title-context">PHIÊN HỌC TOÀN HỆ THỐNG</div><h1>Đến lịch ôn tập</h1><p>StudySpace đã gom tất cả câu hỏi đến hạn từ mọi dự án và bộ câu hỏi. Hoàn thành toàn bộ phiên này để tiếp tục sử dụng các khu vực khác.</p></div><span class="mandatory-badge">● BẮT BUỘC</span></div>
      <div class="mandatory-progress"><div class="progress-caption"><b>Tiến độ phiên hôm nay</b><span>${reviewedToday} / ${progressTotal} câu</span></div><div class="progress-track"><i style="width:${progress}%"></i></div><div class="progress-sub">Còn ${dueQs.length} câu cần ôn · Tất cả dự án đều được tính chung</div></div>
      <div class="review-stage-card"><div class="review-stage-head"><span class="review-stage-index">${String(reviewedToday+1).padStart(2,'0')}</span><div><b>${esc(node.name)}</b><small>${esc(path||node.name)}</small></div><span class="review-stage-due">Đến hạn ${dateLabel(q.review.next)}</span></div>
        <div class="review-stage-question">${q.questionHTML?sanitizeRichHTML(q.questionHTML):esc(q.question)}</div>
        ${q.tags?.length?`<div class="review-stage-tags">${q.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`:''}
        ${imgs||audio?`<div class="review-stage-media">${imgs}${audio}</div>`:''}
        <div class="review-stage-actions"><button type="button" class="btn soft" id="revealDueAnswer">${revealed?'✓ Đáp án đã mở':'👁 Hiện đáp án để ôn'}</button><button type="button" class="btn plain" id="speakDueQuestion">🔊 Nghe câu hỏi</button>${revealed?`<button type="button" class="btn plain" id="speakDueAnswer">🗣 Nghe đáp án</button>`:''}</div>
        <div class="review-stage-answer ${revealed?'shown':''}" id="dueAnswerPanel" aria-live="polite">${revealed?`<div class="review-answer-label">ĐÁP ÁN / NỘI DUNG CẦN NHỚ</div><div>${q.answerHTML?sanitizeRichHTML(q.answerHTML):esc(q.answer||'Câu hỏi này chưa có đáp án.')}</div>`:'<span>Đáp án đang được giữ kín. Hãy tự nhớ lại trước, sau đó mở đáp án để đối chiếu.</span>'}</div>
        <div class="review-grade"><div><b>Đánh giá mức độ ghi nhớ</b><small>${revealed?'Chọn kết quả sau khi đã đối chiếu đáp án.':'Hai lựa chọn chỉ mở khóa sau khi bạn xem đáp án.'}</small></div><div class="review-grade-buttons"><button type="button" class="btn btn-again" id="gradeForgot" ${revealed?'':'disabled'}>↻ Chưa nhớ</button><button type="button" class="btn btn-memory" id="gradeRemember" ${revealed?'':'disabled'}>✓ Đã nhớ</button></div></div>
      </div>
      <div class="mandatory-footnote"><span>🔒 Các mục Tổng quan, Tin tức và thư viện dự án sẽ mở lại sau khi bạn xử lý hết ${dueQs.length} câu đến hạn.</span><span>Chu kỳ: 2 · 5 · 9 · 20 · 30 · 100 · 365 ngày</span></div>
    </section>`;
    $('#revealDueAnswer').onclick=()=>{state.reviewRevealedId=q.id;renderReviewPage(view);};
    $('#speakDueQuestion').onclick=()=>speak(q.question,language(q,q.question));
    if($('#speakDueAnswer'))$('#speakDueAnswer').onclick=()=>speak(q.answer,language(q,q.answer));
    $$('[data-session-image]',view).forEach(img=>img.onclick=()=>{const src=q.images?.[Number(img.dataset.sessionImage)];if(src){$('#largeImage').src=src;$('#lightbox').classList.add('show');}});
    $('#gradeForgot').onclick=()=>forgot(findQuestion(node.id,q.id));
    $('#gradeRemember').onclick=()=>remember(findQuestion(node.id,q.id));
    return;
  }
  if(state.reviewGateActive){
    view.innerHTML=`<section class="review-complete"><div class="review-complete-icon">✓</div><div class="title-context">PHIÊN ÔN TẬP ĐÃ HOÀN THÀNH</div><h1>Hôm nay bạn đã xử lý hết câu hỏi đến hạn.</h1><p>Không còn câu hỏi nào đang chờ ôn trên toàn bộ StudySpace. Bây giờ bạn có thể tự do học, ghi chép hoặc cập nhật thư viện.</p><div class="review-complete-stats"><div><b>${reviewedToday}</b><span>Câu đã xử lý hôm nay</span></div><div><b>${done30}</b><span>Đạt mốc 30 ngày</span></div><div><b>${done100}</b><span>Đạt mốc 100 ngày</span></div><div><b>${done365}</b><span>Đạt mốc 365 ngày</span></div></div><button class="btn primary" id="finishMandatoryReview">Mở khóa StudySpace　→</button></section>`;
    $('#finishMandatoryReview').onclick=()=>{state.reviewGateActive=false;state.reviewRevealedId=null;state.page='home';state.selected=null;render();};
    return;
  }
  const upcoming=all.filter(x=>x.q.review?.next&&!due(x.q)).sort((a,b)=>(reviewDateKey(a.q.review.next)||'').localeCompare(reviewDateKey(b.q.review.next)||'')).slice(0,30);
  view.innerHTML=`<div class="workspace-heading"><div class="title-block"><div class="title-context">GHI NHỚ DÀI HẠN</div><h1>Lịch ôn tập</h1><p class="workspace-subtitle">Lịch ôn được tổng hợp xuyên suốt mọi dự án và bộ câu hỏi.</p></div><div class="workspace-actions"><button class="btn plain" id="backHome">⌂ Tổng quan</button></div></div>
    <div class="overview-stats"><div class="overview-stat"><span>Đến hạn toàn hệ thống</span><b>0</b></div><div class="overview-stat"><span>Đang theo dõi</span><b>${scheduled}</b></div><div class="overview-stat"><span>Hoàn thành mốc 100 ngày</span><b>${done100}</b></div><div class="overview-stat"><span>Hoàn thành mốc 365 ngày</span><b>${done365}</b></div></div>
    <div class="interval-bar">${intervalMarkup}</div>
    <div class="review-idle"><div class="review-idle-icon">☀</div><div><b>Hiện chưa có câu hỏi đến hạn</b><p>Khi đến ngày ôn, StudySpace sẽ tự chuyển bạn vào phiên ôn chung và yêu cầu hoàn thành tất cả câu hỏi đến hạn từ mọi bộ.</p></div></div>
    <div class="review-section-heading upcoming-heading"><h2>Lịch ôn sắp tới</h2><span>${upcoming.length} câu hiển thị</span></div>
    <div class="upcoming-list">${upcoming.map(x=>`<div class="upcoming-item"><button data-jump="${esc(x.node.id)}">${esc(x.q.question)}</button><span>${esc(x.node.name)}</span><time>${dateLabel(x.q.review.next)}</time></div>`).join('')||'<div class="quiet-empty">Chưa có câu hỏi nào được lên lịch.</div>'}</div>
    <div class="review-milestone-summary"><span>Đã đạt mốc 30 ngày: <b>${done30}</b></span><span>100 ngày: <b>${done100}</b></span><span>365 ngày: <b>${done365}</b></span></div>`;
  $('#backHome').onclick=async()=>{if(!(await flushBeforeLeave()))return;state.page='home';state.selected=null;render();};
  $$('[data-jump]',view).forEach(b=>b.onclick=async()=>{if(!(await flushBeforeLeave()))return;state.selected=b.dataset.jump;state.page='home';state.nodeTab='questions';render();});
}
function renderMain(){
  const view=$('#view');
  if(window.BLOOM_FEATURES && window.BLOOM_FEATURES.renderPage(state.page,view))return;
  const expectedDraft=state.page==='news'?`news:${state.newsDate}`:(state.page==='home'&&state.selected&&state.nodeTab==='notebook'?`project:${state.selected}`:null);
  if(state.notebookController&&state.activeDraftKey!==expectedDraft)state.notebookDispose?.();
  if(state.page==='review'){renderReviewPage(view);return;}if(state.page==='news'){renderNewsPage(view);return;}if(!state.selected){renderDashboard(view);return;}
  const found=find(state.selected);if(!found){state.selected=null;renderDashboard(view);return;}const n=found.node;
  view.innerHTML=`<div class="workspace-heading"><div class="title-block"><div class="title-context">${pathOf(n.id).slice(0,-1).map(x=>esc(x.name)).join(' / ')||'DỰ ÁN'}</div><h1>${esc(n.name)}</h1></div><div class="workspace-actions"><button class="btn plain project-data-btn project-export-btn" id="exportProject" title="Xuất riêng dự án này" aria-label="Xuất dự án">⇩</button><button class="btn plain project-data-btn project-import-btn" id="importProject" title="Nhập dự án vào mục này hoặc vị trí khác" aria-label="Nhập dự án">⇧</button><button class="btn soft" id="addChild">＋ Mục con</button><button class="btn plain" id="editNode" title="Sửa tên và mô tả">✎</button><button class="btn plain danger" id="delNode" title="Xóa mục">⌫</button></div></div>${n.description?`<section class="project-description"><span>🎯 MỤC TIÊU & PHẠM VI</span><p>${esc(n.description)}</p></section>`:''}<div class="notebook-shell"><div class="notebook-top"><div class="notebook-tabs"><button id="tabNotebook" class="${state.nodeTab==='notebook'?'active':''}">▤ Trang vở</button><button id="tabQuestions" class="${state.nodeTab==='questions'?'active':''}">☷ Câu hỏi <span class="tab-count">${n.questions.length}</span></button><button id="addQ" class="btn primary tiny">＋ Thêm câu hỏi</button></div><label class="paper-style-control" title="Chọn kiểu giấy" style="${state.nodeTab==='notebook'?'':'display:none'}"><span>Kiểu giấy</span><select id="paperStyle"><option value="grid" ${n.paperStyle==='grid'?'selected':''}>Ô ly</option><option value="ruled" ${n.paperStyle==='ruled'?'selected':''}>Kẻ ngang</option><option value="dot" ${n.paperStyle==='dot'?'selected':''}>Chấm</option></select></label></div><div id="notebookPane" style="${state.nodeTab==='notebook'?'':'display:none'}"><div class="notebook-layout">${notebookToolbarMarkup()}<div class="notebook-content"><div class="paper-wrap"><div class="paper-stack" id="paperPages">${(Array.isArray(n.notePages)&&n.notePages.length?n.notePages:[{html:n.noteHTML||''}]).map((pg,i)=>`<div class="paper-page paper-${n.paperStyle||'grid'} paper-theme-${n.paperTheme||'classic'}" data-page="${i+1}" data-page-id="${esc(pg.id||'')}" data-first-written-at="${esc(pg.firstWrittenAt||'')}" ${pg.manualBreak?'data-manual-break="true"':''} ${pg.keepPage?'data-keep-page="true"':''} contenteditable="false" spellcheck="false" inputmode="none">${pg.html||''}</div>`).join('')}</div></div><div class="paper-foot"><div class="paper-pager"><button type="button" id="pagePrev" title="Trang trước">‹</button><span id="pageIndicator">Trang 1 / 1</span><button type="button" id="pageNext" title="Trang sau">›</button><button type="button" id="deletePage" title="Xóa trang hiện tại">×</button></div><div class="paper-page-insert"><span class="page-action-label">Chèn trang</span><button type="button" id="insertPageBefore">＋ Trước</button><button type="button" id="insertPageAfter">＋ Sau</button><button type="button" id="appendPage">＋ Trang cuối</button></div><span id="noteSaveState">${n.noteUpdatedAt?'Đã lưu '+dateLabel(n.noteUpdatedAt):'Sẵn sàng ghi chép'}</span><span><span id="noteWords">0</span> từ</span></div></div></div></div><div id="questionPane" style="${state.nodeTab==='questions'?'':'display:none'}"><div class="bank-toolbar"><div class="bank-title">Ngân hàng câu hỏi</div><div class="question-filters"><input id="qSearch" class="search" placeholder="Tìm câu hỏi..." aria-label="Tìm câu hỏi"><select id="qStatusFilter" class="filter" aria-label="Lọc trạng thái"><option value="all">Mọi trạng thái</option><option value="due">Đến hạn</option><option value="unmemorized">Chưa hoàn thành</option><option value="milestone30">Hoàn thành mốc 30 ngày</option><option value="milestone100">Hoàn thành mốc 100 ngày</option><option value="milestone365">Hoàn thành mốc 365 ngày</option><option value="unscheduled">Chưa bắt đầu</option></select><select id="qTagFilter" class="filter" aria-label="Lọc nhãn"><option value="all">Mọi nhãn</option>${[...new Set(n.questions.flatMap(q=>q.tags||[]))].sort((a,b)=>a.localeCompare(b,'vi')).map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('')}</select></div></div><div id="questionList" class="question-list-host"></div></div></div>${n.children.length?`<div class="child-section"><div class="child-heading"><h2>Mục con</h2><button class="btn plain tiny" id="addChild2">＋ Thêm</button></div><div class="project-grid">${n.children.map(x=>`<article class="project-card"><button class="project-open" data-open="${esc(x.id)}"><div class="folder">📁</div><h3>${esc(x.name)}</h3><div class="meta"><span>▦ ${x.questions.length} câu</span><span>▣ ${x.children.length} mục con</span></div></button></article>`).join('')}</div></div>`:''}`;
  $('#addChild').onclick=()=>createNode(n.id);if($('#addChild2'))$('#addChild2').onclick=()=>createNode(n.id);$('#addQ').onclick=()=>questionModal(n.id);$('#editNode').onclick=()=>editNode(n.id);$('#delNode').onclick=()=>deleteNode(n.id);
  $('#exportProject')?.addEventListener('click',()=>exportProjectPackage(n.id));$('#importProject')?.addEventListener('click',()=>chooseProjectImportFile(n.id));
  $$('[data-open]').forEach(b=>b.onclick=async()=>{if(!(await flushBeforeLeave()))return;state.selected=b.dataset.open;state.page='home';state.nodeTab='notebook';render();});
  $('#tabNotebook').onclick=async()=>{if(!(await flushBeforeLeave()))return;state.nodeTab='notebook';render();};$('#tabQuestions').onclick=async()=>{if(!(await flushBeforeLeave()))return;state.nodeTab='questions';render();};
  if(state.nodeTab==='notebook')bindNotebook(n,{kind:'project',id:n.id});else{
    if(state.questionFilters.nodeId!==n.id)state.questionFilters={nodeId:n.id,query:'',status:'all',tag:'all'};
    $('#qSearch').value=state.questionFilters.query;$('#qStatusFilter').value=state.questionFilters.status;$('#qTagFilter').value=state.questionFilters.tag;
    const run=()=>{state.questionFilters={nodeId:n.id,query:$('#qSearch').value,status:$('#qStatusFilter').value,tag:$('#qTagFilter').value};renderQuestions(n,state.questionFilters.query,state.questionFilters.status,state.questionFilters.tag);};
    $('#qSearch').oninput=run;$('#qStatusFilter').onchange=run;$('#qTagFilter').onchange=run;renderQuestions(n,state.questionFilters.query,state.questionFilters.status,state.questionFilters.tag);
  }
}
function bindNotebook(n,options={kind:'project'}){
  state.notebookDispose?.();
  const controller=new AbortController();state.notebookController=controller;const signal=controller.signal;
  const wrap=$('#paperPages'),shell=wrap?.closest('.notebook-shell');if(!wrap){controller.abort();state.notebookController=null;return;}
  state.flushNotebook=null;const stylePicker=$('#paperStyle');
  const targetId=options.kind==='news'?String(options.date):String(options.id||n.id||'');const draftId=options.kind+':'+targetId;const draftKey=DRAFT_KEY+':'+encodeURIComponent(draftId);state.activeDraftKey=draftId;
  let saveTimer=null,draftTimer=null,resizeTimer=null,lastActivePage=null,lastRange=null,dirty=false,flushPromise=null,reflowing=false,editRevision=0;
  let inkMode=false,inkTool='pen',activeStroke=null,inkMutated=false,allowProgrammaticInput=false,keyboardWriteNotice=false;const inkLayersBound=new WeakSet();
  const pages=()=>[...wrap.querySelectorAll('.paper-page')];
  const pageOf=node=>{const el=node?.nodeType===1?node:node?.parentElement;return el?.closest?.('.paper-page')||null;};
  const pageNodes=page=>[...page.childNodes].filter(x=>!(x.nodeType===1&&(x.classList.contains('paper-page-number')||x.matches('[data-ink-layer],.paper-date-header,.paper-footer-decoration'))));
  const ensurePageMarker=page=>{let marker=page.querySelector(':scope > .paper-page-number');if(!marker){marker=document.createElement('div');marker.className='paper-page-number';marker.contentEditable='false';page.append(marker);}return marker;};
  const pageDateText=key=>{if(!isValidDateKey(key))return'Thứ ..., Ngày ..., Tháng ..., Năm ...';const [y,m,d]=key.split('-').map(Number),date=new Date(y,m-1,d,12),weekday=date.getDay()===0?'Chủ nhật':'Thứ '+['Hai','Ba','Tư','Năm','Sáu','Bảy'][date.getDay()-1];return `${weekday}, Ngày ${String(d).padStart(2,'0')}, Tháng ${String(m).padStart(2,'0')}, Năm ${y}`;};
  const updatePageChrome=page=>{if(!page)return;let head=page.querySelector(':scope > .paper-date-header');if(!head){head=document.createElement('div');head.className='paper-date-header';head.contentEditable='false';page.prepend(head);}head.innerHTML=`<span>${esc(pageDateText(page.dataset.firstWrittenAt||''))}</span><span class="paper-date-ornament">✦ ✧ ✦</span>`;let foot=page.querySelector(':scope > .paper-footer-decoration');if(!foot){foot=document.createElement('div');foot.className='paper-footer-decoration';foot.contentEditable='false';page.append(foot);}const theme=page.className.match(/paper-theme-([a-z]+)/)?.[1]||'classic';const footer=theme==='botanical'?'❧ GHI CHÉP · NUÔI DƯỠNG TRI THỨC ❧':theme==='vintage'?'✿ SỔ TAY TRI THỨC · TỪNG NGÀY ✿':theme==='lavender'?'✧ STUDYSPACE · LEARN WITH CALM ✧':theme==='rose'?'🌸 STUDYSPACE · GÓC HỌC TẬP DỊU ÊM 🌸':theme==='ocean'?'≈ STUDYSPACE · DEEP BLUE STUDY ≈':theme==='mint'?'🍃 STUDYSPACE · GÓC GHI CHÉP XANH 🍃':theme==='sunset'?'☼ STUDYSPACE · NHỮNG Ý TƯỞNG RỰC RỠ ☼':'✧ STUDYSPACE · SỔ TAY KIẾN THỨC ✧';foot.innerHTML=`<span>${footer}</span><span class="paper-footer-stars">❦　✦　❦</span>`;};
  const setFirstWrittenAt=page=>{if(!page)return;if(!isValidDateKey(page.dataset.firstWrittenAt||'')){page.dataset.firstWrittenAt=localDateKey();updatePageChrome(page);}};
  const inheritPageDate=(from,to)=>{if(!to)return;if(!isValidDateKey(to.dataset.firstWrittenAt||'')&&isValidDateKey(from?.dataset.firstWrittenAt||'')){to.dataset.firstWrittenAt=from.dataset.firstWrittenAt;updatePageChrome(to);}};
  function ensureInkLayer(page){let svg=page.querySelector(':scope > svg[data-ink-layer]');if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('data-ink-layer','true');svg.setAttribute('viewBox','0 0 1000 1400');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('role','img');svg.setAttribute('aria-label','Lớp nét viết tay');svg.setAttribute('contenteditable','false');svg.classList.add('paper-ink-layer');page.append(svg);}svg.setAttribute('focusable','false');return svg;}
  const updatePager=()=>{const indicator=$('#pageIndicator'),prev=$('#pagePrev'),next=$('#pageNext');if(!wrap.isConnected||!indicator||!prev||!next)return;const list=pages();list.forEach((p,i)=>{p.dataset.page=String(i+1);ensurePageMarker(p).textContent=String(i+1);});const sel=window.getSelection(),selected=sel&&sel.rangeCount?pageOf(sel.getRangeAt(0).startContainer):null,current=selected||pageOf(document.activeElement)||lastActivePage||list[0],index=Math.max(0,list.indexOf(current));indicator.textContent=`Trang ${index+1} / ${list.length}`;prev.disabled=index<=0;next.disabled=index>=list.length-1;};
  const addPage=(opts={})=>{const p=document.createElement('div');p.className='paper-page paper-'+(n.paperStyle||'grid')+' paper-theme-'+(n.paperTheme||'classic')+' paper-frame-'+(n.paperFrame||'double');p.contentEditable=inkMode?'false':'true';p.spellcheck=!inkMode;p.setAttribute('inputmode',inkMode?'none':'text');p.tabIndex=0;p.dataset.pageId=uid();p.dataset.firstWrittenAt='';if(opts.keepPage)p.dataset.keepPage='true';if(opts.manualBreak)p.dataset.manualBreak='true';p.innerHTML=opts.keepPage?'<p><br></p>':'';ensurePageMarker(p);updatePageChrome(p);if(opts.before)wrap.insertBefore(p,opts.before);else wrap.append(p);ensureInkLayer(p);attachInkEvents(p);return p;};
  const serializePages=()=>pages().map(p=>{const box=document.createElement('div');pageNodes(p).forEach(node=>box.append(node.cloneNode(true)));const ink=p.querySelector(':scope > svg[data-ink-layer]');if(ink&&ink.querySelector('path.ink-stroke'))box.append(ink.cloneNode(true));return{id:p.dataset.pageId||uid(),html:sanitizeRichHTML(box.innerHTML),manualBreak:p.dataset.manualBreak==='true',keepPage:p.dataset.keepPage==='true',firstWrittenAt:isValidDateKey(p.dataset.firstWrittenAt||'')?p.dataset.firstWrittenAt:null};});
  const updateWords=()=>{const output=$('#noteWords');if(!wrap.isConnected||!output)return;const text=pages().map(p=>pageNodes(p).map(node=>node.textContent||'').join(' ')).join(' ');output.textContent=(text.trim().match(/\S+/g)||[]).length;};
  const removeDraft=()=>{try{localStorage.removeItem(draftKey);const legacy=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');if(legacy?.target===draftId)localStorage.removeItem(DRAFT_KEY);}catch(_){}dbDeleteDraft(draftId).catch(err=>console.warn('Không xóa được bản nháp IndexedDB:',err));};
  const storeDraft=()=>{if(!dirty)return;const payload={target:draftId,at:Date.now(),paperStyle:n.paperStyle,paperTheme:n.paperTheme||'classic',paperFrame:n.paperFrame||'double',pages:serializePages()};try{localStorage.setItem(draftKey,JSON.stringify(payload));}catch(err){if(!state.draftWarningShown){state.draftWarningShown=true;toast('Bản nháp cục bộ vượt dung lượng; IndexedDB vẫn đang thử lưu bản nháp dài hạn.');}}if(state.db)dbPutDraft(draftId,payload).catch(err=>{console.warn('Không ghi được bản nháp IndexedDB:',err);if(!state.draftWarningShown){state.draftWarningShown=true;toast('Không lưu được bản nháp dài hạn. Hãy chờ trạng thái Đã lưu hoặc xuất JSON.');}});};
  state.storeNotebookDraft=storeDraft;
  let recoveredDraftAt=0,recoveredLocalDraft=null;
  try{const savedAt=Date.parse(n.noteUpdatedAt||'')||0;let draft=null;for(const candidateKey of [draftKey,DRAFT_KEY]){const candidate=JSON.parse(localStorage.getItem(candidateKey)||'null');if(candidate?.target===draftId&&Number(candidate.at)>savedAt&&Array.isArray(candidate.pages)&&(!draft||Number(candidate.at)>Number(draft.at)))draft=candidate;}if(draft){recoveredLocalDraft=draft;recoveredDraftAt=Number(draft.at)||0;n.notePages=draft.pages.map(pg=>({id:String(pg.id||uid()),html:sanitizeRichHTML(pg.html||''),manualBreak:!!pg.manualBreak,keepPage:!!pg.keepPage,firstWrittenAt:isValidDateKey(pg.firstWrittenAt||'')?pg.firstWrittenAt:null}));n.noteHTML=n.notePages.map(pg=>pg.html).join('');n.paperStyle=['grid','ruled','dot'].includes(draft.paperStyle)?draft.paperStyle:n.paperStyle;n.paperTheme=['classic','botanical','vintage','lavender','minimal','rose','ocean','mint','sunset'].includes(draft.paperTheme)?draft.paperTheme:(n.paperTheme||'classic');n.paperFrame=['double','floral','corners','dashed','minimal','none'].includes(draft.paperFrame)?draft.paperFrame:(n.paperFrame||'double');dirty=true;toast('Đã khôi phục bản nháp chưa kịp lưu.');}}catch(err){console.warn('Không đọc được bản nháp:',err);}
  if(recoveredLocalDraft){
    const picker=$('#paperStyle');if(picker)picker.value=n.paperStyle;
    wrap.replaceChildren();
    for(const pg of n.notePages.slice(0,500)){
      const page=document.createElement('div');page.className='paper-page paper-'+n.paperStyle+' paper-theme-'+(n.paperTheme||'classic')+' paper-frame-'+(n.paperFrame||'double');
      page.contentEditable=inkMode?'false':'true';page.spellcheck=!inkMode;page.setAttribute('inputmode',inkMode?'none':'text');page.tabIndex=0;
      page.dataset.pageId=String(pg.id||uid());page.dataset.manualBreak=pg.manualBreak?'true':'';page.dataset.keepPage=pg.keepPage?'true':'';page.dataset.firstWrittenAt=pg.firstWrittenAt||'';
      page.innerHTML=sanitizeRichHTML(pg.html||'<p><br></p>');wrap.append(page);ensurePageMarker(page);updatePageChrome(page);ensureInkLayer(page);
    }
  }
  // IndexedDB is the durable draft store. Restore only if it is newer than the
  // committed note and any synchronous local draft, and only before the user edits.
  if(state.db)dbGetDraft(draftId).then(candidate=>{
    const committedAt=Date.parse(n.noteUpdatedAt||'')||0,startRevision=editRevision;
    if(!candidate||!Array.isArray(candidate.pages)||Number(candidate.at||0)<=Math.max(committedAt,recoveredDraftAt)||!wrap.isConnected||state.activeDraftKey!==draftId)return;
    requestAnimationFrame(()=>{
      if(!wrap.isConnected||state.activeDraftKey!==draftId||editRevision!==startRevision)return;
      n.paperStyle=['grid','ruled','dot'].includes(candidate.paperStyle)?candidate.paperStyle:n.paperStyle;
      n.paperTheme=['classic','botanical','vintage','lavender','minimal','rose','ocean','mint','sunset'].includes(candidate.paperTheme)?candidate.paperTheme:(n.paperTheme||'classic');
      n.paperFrame=['double','floral','corners','dashed','minimal','none'].includes(candidate.paperFrame)?candidate.paperFrame:(n.paperFrame||'double');
      const stylePicker=$('#paperStyle');if(stylePicker)stylePicker.value=n.paperStyle;
      wrap.replaceChildren();
      for(const pg of candidate.pages.slice(0,500)){
        const page=document.createElement('div');page.className='paper-page paper-'+n.paperStyle+' paper-theme-'+n.paperTheme+' paper-frame-'+n.paperFrame;
        page.contentEditable=inkMode?'false':'true';page.spellcheck=!inkMode;page.setAttribute('inputmode',inkMode?'none':'text');page.tabIndex=0;
        page.dataset.pageId=String(pg.id||uid());page.dataset.manualBreak=pg.manualBreak?'true':'';page.dataset.keepPage=pg.keepPage?'true':'';page.dataset.firstWrittenAt=isValidDateKey(pg.firstWrittenAt||'')?pg.firstWrittenAt:'';
        page.innerHTML=sanitizeRichHTML(pg.html||'<p><br></p>');wrap.append(page);ensurePageMarker(page);updatePageChrome(page);ensureInkLayer(page);attachInkEvents(page);
      }
      if(!pages().length)addPage({keepPage:true});
      dirty=true;editRevision++;reflowPages();updateWords();updatePager();
      const status=$('#noteSaveState');if(status)status.textContent='Đã khôi phục bản nháp từ bộ nhớ dài hạn';
      toast('Đã khôi phục bản nháp từ IndexedDB.');
    });
  }).catch(err=>console.warn('Không đọc được bản nháp IndexedDB:',err));
  const persist=async()=>{const revision=editRevision,saved=serializePages();n.notePages=saved;n.noteHTML=saved.map(p=>p.html).join('');n.noteUpdatedAt=iso();const ok=await save(),status=$('#noteSaveState');if(ok&&revision===editRevision){dirty=false;removeDraft();if(status)status.textContent='Đã tự lưu lúc '+new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});return true;}dirty=true;if(status)status.textContent=ok?'Có thay đổi mới chưa lưu':'Chưa lưu được';storeDraft();return false;};
  function splitOversizedBlock(page,next,block){
    if(!block||block.nodeType!==1||!block.textContent?.trim()||block.matches('table,ul,ol,blockquote'))return false;
    const safeBottom=page.getBoundingClientRect().bottom-92,walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);let splitNode=null,splitOffset=0,node;
    while((node=walker.nextNode())){const re=/\S+\s*/g;let match;while((match=re.exec(node.nodeValue||''))){const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);const rect=range.getBoundingClientRect();if(rect.height&&rect.bottom<=safeBottom){splitNode=node;splitOffset=match.index+match[0].length;}}}
    if(!splitNode||splitOffset<=0)return false;
    let chars=0,scan=document.createTreeWalker(block,NodeFilter.SHOW_TEXT),scanNode,found=false;while((scanNode=scan.nextNode())){if(scanNode===splitNode){chars+=splitOffset;found=true;break;}chars+=(scanNode.nodeValue||'').length;}if(!found||chars>=block.textContent.length)return false;
    try{const cut=document.createRange();cut.selectNodeContents(block);cut.setEnd(splitNode,splitOffset);const firstPart=cut.extractContents(),first=block.cloneNode(false);first.append(firstPart);if(!first.textContent?.trim())return false;page.insertBefore(first,block);const nextFirst=pageNodes(next)[0]||ensurePageMarker(next);next.insertBefore(block,nextFirst);return true;}catch(err){console.warn('Không thể ngắt đoạn:',err);return false;}
  }
  function isEmptyPage(page){const clone=page.cloneNode(true);clone.querySelectorAll('.paper-page-number,.paper-date-header,.paper-footer-decoration').forEach(x=>x.remove());clone.querySelectorAll('svg[data-ink-layer]').forEach(x=>{if(!x.querySelector('path.ink-stroke'))x.remove();});return !clone.textContent.trim()&&!clone.querySelector('img,hr,table,svg,video,audio');}
  function reflowPages(){
    if(reflowing)return;const beforeLayout=JSON.stringify(serializePages());reflowing=true;wrap.classList.add('is-reflowing');let list=pages();if(!list.length)list=[addPage()];
    try{
      list.forEach(p=>{p.style.height='';p.style.minHeight='';ensurePageMarker(p);});
      for(let i=0;i<list.length;i++){
        const page=list[i];let guard=0;
        while(page.scrollHeight>page.clientHeight+3&&guard++<250){const nodes=pageNodes(page);if(nodes.length>1){let next=list[i+1];if(!next){next=addPage();list=pages();}const tail=nodes[nodes.length-1],nextFirst=pageNodes(next)[0]||ensurePageMarker(next);inheritPageDate(page,next);next.insertBefore(tail,nextFirst);updatePageChrome(next);continue;}
          const block=nodes[0],next=list[i+1]||addPage();list=pages();if(block&&splitOversizedBlock(page,next,block)){inheritPageDate(page,next);updatePageChrome(next);continue;}page.style.height=(page.scrollHeight+28)+'px';page.style.minHeight=page.style.height;break;
        }
      }
      list=pages();for(let i=0;i<list.length-1;i++){const page=list[i],next=list[i+1];if(next.dataset.manualBreak==='true'||next.dataset.keepPage==='true'||parseFloat(page.style.height||0)>page.clientHeight+2)continue;let guard=0;while(pageNodes(next).length&&guard++<250){const first=pageNodes(next)[0],after=pageNodes(next)[1]||ensurePageMarker(next);next.removeChild(first);inheritPageDate(next,page);page.insertBefore(first,ensurePageMarker(page));updatePageChrome(page);if(page.scrollHeight>page.clientHeight+3){page.removeChild(first);next.insertBefore(first,after);updatePageChrome(next);break;}}}
      list=pages();while(list.length>1&&isEmptyPage(list[list.length-1])&&list[list.length-1].dataset.keepPage!=='true'&&list[list.length-1].dataset.manualBreak!=='true'){list.pop().remove();}
    }finally{wrap.classList.remove('is-reflowing');reflowing=false;updatePager();if(beforeLayout!==JSON.stringify(serializePages()))dirty=true;}
  }
  function saveSelection(){const sel=window.getSelection();if(sel&&sel.rangeCount){const r=sel.getRangeAt(0);if(wrap.contains(r.commonAncestorContainer))lastRange=r.cloneRange();}}
  function getSelectionRange(){const sel=window.getSelection();if(!sel||!sel.rangeCount)return null;const range=sel.getRangeAt(0);return wrap.contains(range.commonAncestorContainer)?range.cloneRange():null;}
  function restoreRange(range){if(!range)return false;try{if(!range.startContainer.isConnected||!wrap.contains(range.startContainer))return false;const page=pageOf(range.startContainer);if(page){lastActivePage=page;page.focus({preventScroll:true});}const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);lastRange=range.cloneRange();return true;}catch(_){return false;}}
  function insertNodeAtCaret(node,range){let r=range;if(!r||!r.startContainer.isConnected||!wrap.contains(r.commonAncestorContainer)){const page=lastActivePage||pages()[0];r=document.createRange();r.selectNodeContents(page);r.collapse(false);}try{r.deleteContents();r.insertNode(node);r.setStartAfter(node);r.collapse(true);const page=pageOf(node);if(page){lastActivePage=page;page.focus({preventScroll:true});}const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r);lastRange=r.cloneRange();return r.cloneRange();}catch(err){console.warn('Không thể chèn nội dung tại vị trí con trỏ:',err);return null;}}
  const focusEditor=()=>{if(inkMode)setInkMode(false,'pen');if(lastRange&&restoreRange(lastRange))return;const p=lastActivePage||pages()[0];p?.focus({preventScroll:true});if(p){const r=document.createRange();r.selectNodeContents(p);r.collapse(false);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r);lastRange=r.cloneRange();}};
  const noteCommand=(command,show=null,value=null)=>{allowProgrammaticInput=true;try{return document.execCommand(command,show,value);}finally{allowProgrammaticInput=false;}};

  // Mouse/stylus handwriting is stored as sanitized SVG paths inside each page.
  const inkPage=()=>pageOf(document.activeElement)||lastActivePage||pages()[0];
  const inkPoint=(event,page)=>{const rect=page.getBoundingClientRect();return{x:Math.max(0,Math.min(1000,(event.clientX-rect.left)/Math.max(1,rect.width)*1000)),y:Math.max(0,Math.min(1400,(event.clientY-rect.top)/Math.max(1,rect.height)*1400))};};
  const updateInkUI=()=>{shell.classList.toggle('is-drawing',inkMode);pages().forEach(p=>{const svg=ensureInkLayer(p);svg.classList.toggle('is-active',inkMode);svg.style.pointerEvents=inkMode?'auto':'none';});const toggle=$('#inkToggle'),status=$('#inkStatus');if(toggle){toggle.classList.toggle('active',inkMode);toggle.setAttribute('aria-pressed',String(inkMode));toggle.textContent=inkMode?'✓ Đang viết':'✍ Viết tay';}if(status)status.textContent=!inkMode?'Đã tắt bút · Chọn “Viết tay” để vẽ · Không nhận gõ phím':(inkTool==='pen'?'Đang viết bằng chuột/bút · Không gõ phím trực tiếp':'Đang tẩy nét viết tay · Không gõ phím trực tiếp');const pen=$('#inkPen'),eraser=$('#inkEraser');pen?.classList.toggle('active',inkMode&&inkTool==='pen');eraser?.classList.toggle('active',inkMode&&inkTool==='eraser');};
  const eraseInkAt=(event,svg)=>{let hit=null;for(const el of document.elementsFromPoint(event.clientX,event.clientY)){const path=el.closest?.('path.ink-stroke');if(path&&path.ownerSVGElement===svg){hit=path;break;}}if(hit){hit.remove();inkMutated=true;return true;}return false;};
  const finishInkStroke=()=>{const changedPage=activeStroke?.page||lastActivePage;if(activeStroke){activeStroke=null;}if(inkMutated){inkMutated=false;setFirstWrittenAt(changedPage);markChanged(changedPage);}};
  const attachInkEvents=page=>{const svg=ensureInkLayer(page);if(inkLayersBound.has(svg))return;inkLayersBound.add(svg);svg.style.pointerEvents=inkMode?'auto':'none';svg.style.touchAction='none';
    svg.addEventListener('pointerdown',event=>{if(!inkMode)return;if(event.pointerType==='mouse'&&event.button!==0)return;event.preventDefault();event.stopPropagation();lastActivePage=page;try{svg.setPointerCapture(event.pointerId);}catch(_){}if(inkTool==='eraser'){eraseInkAt(event,svg);return;}const point=inkPoint(event,page),path=document.createElementNS('http://www.w3.org/2000/svg','path');path.classList.add('ink-stroke');path.setAttribute('fill','none');path.setAttribute('stroke',$('#inkColor')?.value||'#245fc7');path.setAttribute('stroke-width',$('#inkWidth')?.value||'3.5');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');path.setAttribute('vector-effect','non-scaling-stroke');path.setAttribute('pointer-events','stroke');path.setAttribute('d',`M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`);svg.append(path);activeStroke={page,svg,path,pointerId:event.pointerId,last:point};}, {signal});
    svg.addEventListener('pointermove',event=>{if(!inkMode)return;if(inkTool==='eraser'&&event.buttons){eraseInkAt(event,svg);return;}if(!activeStroke||activeStroke.pointerId!==event.pointerId||activeStroke.svg!==svg)return;event.preventDefault();const point=inkPoint(event,page),prev=activeStroke.last;const midX=(prev.x+point.x)/2,midY=(prev.y+point.y)/2;const d=activeStroke.path.getAttribute('d')+` Q ${prev.x.toFixed(1)} ${prev.y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;activeStroke.path.setAttribute('d',d);activeStroke.last=point;inkMutated=true;}, {signal});
    const finish=event=>{if(inkMode){event.preventDefault();event.stopPropagation();}if(activeStroke&&activeStroke.pointerId===event.pointerId&&activeStroke.svg===svg){const point=inkPoint(event,page),prev=activeStroke.last;activeStroke.path.setAttribute('d',activeStroke.path.getAttribute('d')+` L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`);inkMutated=true;finishInkStroke();}else if(inkMutated)finishInkStroke();};
    svg.addEventListener('pointerup',finish,{signal});svg.addEventListener('pointercancel',finish,{signal});svg.addEventListener('lostpointercapture',finish,{signal});
  };
  const setInkMode=(enabled,tool=inkTool)=>{inkMode=!!enabled;inkTool=tool==='eraser'?'eraser':'pen';pages().forEach(p=>{p.contentEditable=inkMode?'false':'true';p.spellcheck=!inkMode;p.setAttribute('inputmode',inkMode?'none':'text');attachInkEvents(p);});updateInkUI();};
  pages().forEach(p=>{const hasContent=pageNodes(p).some(node=>(node.textContent||'').trim()||node.querySelector?.('img,table,.note-card,audio,video')||node.matches?.('img,table,audio,video'));const hasInk=!!p.querySelector(':scope > svg[data-ink-layer] path.ink-stroke');if(!isValidDateKey(p.dataset.firstWrittenAt||'')&&(hasContent||hasInk)){p.dataset.firstWrittenAt=reviewDateKey(n.noteUpdatedAt||n.createdAt)||localDateKey();}p.classList.remove('paper-theme-classic','paper-theme-botanical','paper-theme-vintage','paper-theme-lavender','paper-theme-minimal','paper-theme-rose','paper-theme-ocean','paper-theme-mint','paper-theme-sunset');p.classList.add('paper-theme-'+(n.paperTheme||'classic'));p.classList.remove('paper-frame-double','paper-frame-floral','paper-frame-corners','paper-frame-dashed','paper-frame-minimal','paper-frame-none');p.classList.add('paper-frame-'+(n.paperFrame||'double'));p.contentEditable='false';p.spellcheck=false;p.setAttribute('inputmode','none');p.tabIndex=0;updatePageChrome(p);ensurePageMarker(p);ensureInkLayer(p);attachInkEvents(p);});
  $('#inkToggle')?.addEventListener('click',()=>setInkMode(!inkMode,'pen'),{signal});
  $('#inkPen')?.addEventListener('click',()=>setInkMode(true,'pen'),{signal});
  $('#inkEraser')?.addEventListener('click',()=>setInkMode(true,'eraser'),{signal});
  $('#inkSelect')?.addEventListener('click',()=>setInkMode(false,'pen'),{signal});
  $('#inkUndo')?.addEventListener('click',()=>{const svg=inkPage()?.querySelector(':scope > svg[data-ink-layer]');const path=svg?.querySelector('path.ink-stroke:last-of-type');if(path){path.remove();markChanged();}else toast('Trang này chưa có nét viết tay.');},{signal});
  $('#inkClear')?.addEventListener('click',()=>{const svg=inkPage()?.querySelector(':scope > svg[data-ink-layer]');if(!svg?.querySelector('path.ink-stroke')){toast('Trang này chưa có nét viết tay.');return;}if(!confirm('Xóa toàn bộ nét viết tay trên trang hiện tại?'))return;svg.querySelectorAll('path.ink-stroke').forEach(x=>x.remove());markChanged();},{signal});
  setInkMode(false,'pen');
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&inkMode){setInkMode(false,'pen');toast('Đã tắt chế độ viết tay.');}},{signal});

  const updateStatus=()=>{const noteStatus=$('#noteSaveState');if(wrap.isConnected&&noteStatus)noteStatus.textContent='Đang lưu…';if(wrap.isConnected)setSaveLabel('Có thay đổi chưa lưu','warning');};
  const markChanged=(targetPage=null)=>{if(!wrap.isConnected)return;const page=targetPage||pageOf(window.getSelection()?.anchorNode)||lastActivePage||pages()[0];const hasWrittenContent=page&&pageNodes(page).some(node=>!!(node.textContent||'').replace(/\u00a0/g,' ').trim()||node.querySelector?.('img,table,hr,.note-card,audio,video')||node.matches?.('img,table,hr,audio,video'));if(hasWrittenContent)setFirstWrittenAt(page);editRevision++;dirty=true;updateWords();updateStatus();clearTimeout(saveTimer);clearTimeout(draftTimer);draftTimer=setTimeout(storeDraft,280);saveTimer=setTimeout(async()=>{await persist();},520);};
  const flush=()=>{
    if(flushPromise)return flushPromise;
    flushPromise=(async()=>{clearTimeout(saveTimer);clearTimeout(draftTimer);if(state.externalUpdate){storeDraft();setSaveLabel('Có thay đổi ở cửa sổ khác','warning');return false;}reflowPages();updateWords();if(dirty||!n.noteUpdatedAt){const ok=await persist();updatePager();return ok;}updatePager();return true;})().finally(()=>{flushPromise=null;});
    return flushPromise;
  };
  state.flushNotebook=flush;
  const syncNotebookStickyOffset=()=>{const bar=$('.topbar');if(bar){const h=Math.ceil(bar.getBoundingClientRect().height);document.documentElement.style.setProperty('--ss-topbar-height',Math.max(58,h)+'px');}};
  syncNotebookStickyOffset();const stickyObserver=window.ResizeObserver?new ResizeObserver(syncNotebookStickyOffset):null;if(stickyObserver&&$('.topbar'))stickyObserver.observe($('.topbar'));
  const applyPaperStyle=async style=>{const value=['grid','ruled','dot'].includes(style)?style:'grid';const old=n.paperStyle;n.paperStyle=value;pages().forEach(p=>{p.classList.remove('paper-grid','paper-ruled','paper-dot');p.classList.add('paper-'+value);});if(stylePicker)stylePicker.value=value;const ok=await save();if(!ok){n.paperStyle=old;pages().forEach(p=>{p.classList.remove('paper-grid','paper-ruled','paper-dot');p.classList.add('paper-'+old);});if(stylePicker)stylePicker.value=old;}};
  if(stylePicker)stylePicker.onchange=e=>applyPaperStyle(e.target.value);
  const themePicker=$('#paperTheme');const applyPaperTheme=async theme=>{const value=['classic','botanical','vintage','lavender','minimal','rose','ocean','mint','sunset'].includes(theme)?theme:'classic',old=n.paperTheme||'classic';n.paperTheme=value;pages().forEach(p=>{p.classList.remove('paper-theme-classic','paper-theme-botanical','paper-theme-vintage','paper-theme-lavender','paper-theme-minimal','paper-theme-rose','paper-theme-ocean','paper-theme-mint','paper-theme-sunset');p.classList.add('paper-theme-'+value);updatePageChrome(p);});if(themePicker)themePicker.value=value;if(!await save()){n.paperTheme=old;pages().forEach(p=>{p.classList.remove('paper-theme-'+value);p.classList.add('paper-theme-'+old);updatePageChrome(p);});if(themePicker)themePicker.value=old;toast('Không thể lưu mẫu trang trí.');}};if(themePicker){themePicker.value=n.paperTheme||'classic';themePicker.onchange=e=>applyPaperTheme(e.target.value);}const framePicker=$('#paperFrame');const applyPaperFrame=async frame=>{const choices=['double','floral','corners','dashed','minimal','none'],value=choices.includes(frame)?frame:'double',old=n.paperFrame||'double';n.paperFrame=value;pages().forEach(p=>{p.classList.remove(...choices.map(x=>'paper-frame-'+x));p.classList.add('paper-frame-'+value);});if(framePicker)framePicker.value=value;if(!await save()){n.paperFrame=old;pages().forEach(p=>{p.classList.remove('paper-frame-'+value);p.classList.add('paper-frame-'+old);});if(framePicker)framePicker.value=old;toast('Không thể lưu kiểu viền.');}};if(framePicker){framePicker.value=n.paperFrame||'double';framePicker.onchange=e=>applyPaperFrame(e.target.value);}$$('[data-paper-theme]').forEach(button=>{button.classList.toggle('active',(n.paperTheme||'classic')===button.dataset.paperTheme);button.addEventListener('click',async()=>{await applyPaperTheme(button.dataset.paperTheme);$$('[data-paper-theme]').forEach(x=>x.classList.toggle('active',x===button));},{signal});});$$('[data-paper-frame]').forEach(button=>{button.classList.toggle('active',(n.paperFrame||'double')===button.dataset.paperFrame);button.addEventListener('click',async()=>{await applyPaperFrame(button.dataset.paperFrame);$$('[data-paper-frame]').forEach(x=>x.classList.toggle('active',x===button));},{signal});});
  $('#appendPageTool')?.addEventListener('click',()=>insertManualPage('end'),{signal});
  $('#insertTextBlock')?.addEventListener('click',()=>{const text=prompt('Nhập nội dung cần chèn vào trang vở (xuống dòng được):');if(text===null||!text.trim())return;focusEditor();const safe=esc(text).replace(/\r?\n/g,'<br>');const node=document.createElement('div');node.className='note-inserted-text';node.innerHTML=safe;const range=lastRange||null;insertNodeAtCaret(node,range);markChanged(pageOf(node));},{signal});
  wrap.addEventListener('focusin',e=>{const p=pageOf(e.target);if(p){lastActivePage=p;updatePager();}},{signal});
  wrap.addEventListener('pointerdown',event=>{if(inkMode||event.button!==0)return;const page=pageOf(event.target);if(!page)return;const decoration=event.target===page||event.target.closest?.('.paper-date-header,.paper-footer-decoration,.paper-page-number');if(!decoration)return;event.preventDefault();lastActivePage=page;page.focus({preventScroll:true});let target=[...page.querySelectorAll('p,li,blockquote,h2,h3,div')].reverse().find(el=>el.isContentEditable&&!el.matches('.paper-date-header,.paper-footer-decoration,.paper-page-number,.note-card'));if(!target){target=document.createElement('p');target.innerHTML='<br>';page.insertBefore(target,ensurePageMarker(page));}const range=document.createRange();range.selectNodeContents(target);range.collapse(false);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);lastRange=range.cloneRange();updatePager();},{signal});
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(shell?.contains(document.activeElement))return;reflowPages();if(dirty){clearTimeout(saveTimer);saveTimer=setTimeout(()=>persist(),320);}},180);},{signal});
  document.addEventListener('selectionchange',saveSelection,{signal});
  wrap.addEventListener('focusout',e=>{if(shell?.contains(e.relatedTarget))return;setTimeout(()=>{if(!shell?.contains(document.activeElement))flush();},0);},{signal});
  wrap.addEventListener('click',async e=>{if(options.kind==='news')return;const linked=e.target.closest?.('.note-date-link');const date=linked?.dataset.newsDate||dateMentionAtPoint(e,wrap);if(date){e.preventDefault();e.stopPropagation();pages().forEach(p=>p.blur());if(await flush())openNewsDate(date);}},{signal});
  wrap.addEventListener('input',e=>markChanged(pageOf(e.target)),{signal});
  // The paper itself is handwriting-first: block direct keyboard entry. Sidebar tools remain available.
  wrap.addEventListener('keydown',e=>{const page=pageOf(e.target)||pageOf(document.activeElement);if(!page||e.target.closest?.('button,input,select,textarea')||!inkMode)return;if(e.ctrlKey||e.metaKey||e.altKey){if(['a','c'].includes(e.key.toLowerCase()))return;e.preventDefault();return;}if(e.key.length===1||['Enter','Backspace','Delete','Tab'].includes(e.key)){e.preventDefault();if(!keyboardWriteNotice){keyboardWriteNotice=true;toast('Trang vở dùng bút/chuột để viết. Hãy chọn “Thêm chữ” trên thanh công cụ nếu cần chèn văn bản.');setTimeout(()=>keyboardWriteNotice=false,2200);}}},{capture:true,signal});
  wrap.addEventListener('beforeinput',e=>{if(!inkMode||allowProgrammaticInput)return;if(/^(insertText|insertCompositionText|insertParagraph|insertLineBreak|insertFromPaste|insertFromDrop)$/.test(e.inputType||'')){e.preventDefault();}},{signal});
  wrap.addEventListener('paste',e=>{e.preventDefault();toast('Không thể dán trực tiếp vào trang vở. Hãy dùng công cụ chèn ảnh hoặc “Thêm chữ”.');},{signal});
  wrap.addEventListener('dragover',e=>{if([...(e.dataTransfer?.items||[])].some(x=>x.type.startsWith('image/')))e.preventDefault();},{signal});
  wrap.addEventListener('drop',async e=>{const files=[...(e.dataTransfer?.files||[])].filter(f=>f.type.startsWith('image/'));if(!files.length)return;e.preventDefault();let range=null;try{const caret=document.caretRangeFromPoint?.(e.clientX,e.clientY);if(caret)range=caret.cloneRange();else if(document.caretPositionFromPoint){const pos=document.caretPositionFromPoint(e.clientX,e.clientY);if(pos){range=document.createRange();range.setStart(pos.offsetNode,pos.offset);range.collapse(true);}}}catch(_){}try{for(const file of files){const img=document.createElement('img');img.src=await compressImage(file);img.alt='Ảnh ghi chú';range=insertNodeAtCaret(img,range||lastRange);}markChanged();}catch(err){toast('Không thể thêm ảnh kéo thả.');}},{signal});
  $$('[data-cmd]').forEach(b=>{b.addEventListener('mousedown',e=>e.preventDefault(),{signal});b.onclick=()=>{focusEditor();noteCommand(b.dataset.cmd,false,b.dataset.value||null);markChanged();};});
  $$('[data-block]').forEach(b=>{b.addEventListener('mousedown',e=>e.preventDefault(),{signal});b.onclick=()=>{focusEditor();noteCommand('formatBlock',false,b.dataset.block);markChanged();};});
  $('#noteBlockStyle')?.addEventListener('change',e=>{focusEditor();noteCommand('formatBlock',false,e.target.value||'p');markChanged();},{signal});
  $('#fontFamily').onchange=e=>{focusEditor();noteCommand('fontName',false,e.target.value);markChanged();};$('#fontSize').onchange=e=>{focusEditor();noteCommand('fontSize',false,e.target.value);markChanged();};$('#fontColor').onchange=e=>{focusEditor();noteCommand('foreColor',false,e.target.value);markChanged();};
  $('#insertMathSymbols')?.addEventListener('pointerdown',e=>{saveSelection();e.preventDefault();},{signal});
  $('#insertMathSymbols')?.addEventListener('click',e=>{saveSelection();const anchor=e.currentTarget,savedRange=lastRange?.cloneRange()||null;openMathSymbolPalette(anchor,symbol=>{if(savedRange&&restoreRange(savedRange)){}else focusEditor();noteCommand('insertText',false,symbol);markChanged();});},{signal});
  $('#noteImage').onchange=async e=>{try{focusEditor();for(const file of [...e.target.files])if(file.type.startsWith('image/')){const img=document.createElement('img');img.src=await compressImage(file);img.alt='Ảnh ghi chú';insertNodeAtCaret(img,lastRange);}markChanged();}catch(err){toast('Không thể chèn ảnh.');}finally{e.target.value='';}};
  $('#insertDate').onclick=()=>{focusEditor();noteCommand('insertText',false,new Date().toLocaleDateString('vi-VN'));markChanged();};
  $('#insertChecklist')?.addEventListener('mousedown',e=>e.preventDefault(),{signal});
  $('#insertChecklist')?.addEventListener('click',()=>{focusEditor();noteCommand('insertHTML',false,'<ul class="note-checklist"><li>☐ Việc cần hoàn thành</li><li>☐ Việc tiếp theo</li></ul><p><br></p>');markChanged();},{signal});
  $('#insertRule')?.addEventListener('mousedown',e=>e.preventDefault(),{signal});
  $('#insertRule')?.addEventListener('click',()=>{focusEditor();noteCommand('insertHTML',false,'<hr class="note-divider"><p><br></p>');markChanged();},{signal});
  $('#insertLink')?.addEventListener('mousedown',e=>e.preventDefault(),{signal});
  $('#insertLink')?.addEventListener('click',()=>{const url=prompt('Nhập địa chỉ liên kết (https://...)');if(!url)return;if(!/^https?:\/\//i.test(url.trim())){toast('Liên kết phải bắt đầu bằng http:// hoặc https://.');return;}focusEditor();noteCommand('createLink',false,url.trim());markChanged();},{signal});
  $('#noteAudio')?.addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{const data=await fileToData(file);focusEditor();const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src=data.data;audio.setAttribute('data-note-audio',data.name||'');insertNodeAtCaret(audio,lastRange);markChanged(pageOf(audio));toast('Đã chèn âm thanh vào trang vở.');}catch(err){toast(err.message||'Không thể chèn âm thanh.');}},{signal});
  $('#clearFormat').onclick=()=>{focusEditor();noteCommand('removeFormat');markChanged();};
  $('#insertTable')?.addEventListener('mousedown',e=>e.preventDefault(),{signal});
  $('#insertTable')?.addEventListener('click',()=>{const rowText=prompt('Số hàng (1–12):','3');if(rowText===null)return;const colText=prompt('Số cột (1–8):','3');if(colText===null)return;const rows=Math.max(1,Math.min(12,parseInt(rowText,10)||1)),cols=Math.max(1,Math.min(8,parseInt(colText,10)||1));focusEditor();let html='<table class="note-table"><tbody>';for(let r=0;r<rows;r++){html+='<tr>';for(let c=0;c<cols;c++){const cell=r===0?'th':'td';html+=`<${cell}><br></${cell}>`;}html+='</tr>';}html+='</tbody></table><p><br></p>';noteCommand('insertHTML',false,html);markChanged();},{signal});
  $('#applyHighlight').onclick=()=>{focusEditor();noteCommand('hiliteColor',false,$('#highlightColor').value||'#fff0a9');markChanged();};
  const decorHTML={memory:'<div class="note-card note-card-blue"><p class="note-card-kicker">✦ GHI NHỚ</p><p>Nội dung quan trọng cần ghi lại…</p></div><p><br></p>',idea:'<div class="note-card note-card-mint"><p class="note-card-kicker">✧ Ý CHÍNH</p><p>Ghi ý chính tại đây…</p></div><p><br></p>',warning:'<div class="note-card note-card-amber"><p class="note-card-kicker">⚑ LƯU Ý</p><p>Điểm cần chú ý hoặc dễ nhầm lẫn…</p></div><p><br></p>',formula:'<div class="note-card note-card-violet"><p class="note-card-kicker">ƒ CÔNG THỨC</p><p>Nhập công thức và giải thích…</p></div><p><br></p>',definition:'<div class="note-card note-card-sky"><p class="note-card-kicker">◇ ĐỊNH NGHĨA</p><p>Ghi khái niệm và nội dung cốt lõi…</p></div><p><br></p>',example:'<div class="note-card note-card-mint"><p class="note-card-kicker">✎ VÍ DỤ MINH HỌA</p><p>Ghi ví dụ cụ thể tại đây…</p></div><p><br></p>',history:'<div class="note-card note-card-gold"><p class="note-card-kicker">◷ MỐC THỜI GIAN</p><div class="note-timeline"><p><b>Thời điểm:</b> Sự kiện / diễn biến…</p><p><b>Kết quả:</b> Ghi kết quả hoặc ý nghĩa…</p></div></div><p><br></p>',compare:'<div class="note-card note-card-violet"><p class="note-card-kicker">⇄ SO SÁNH</p><p><b>Điểm giống:</b> …</p><p><b>Điểm khác:</b> …</p></div><p><br></p>',quote:'<div class="note-card note-card-rose"><p class="note-card-kicker">❝ TRÍCH DẪN</p><p>“Ghi câu trích dẫn nổi bật tại đây…”</p><p><i>— Nguồn / tác giả</i></p></div><p><br></p>',theorem:'<div class="note-card note-card-violet"><p class="note-card-kicker">∑ ĐỊNH LÝ / MỆNH ĐỀ</p><p><b>Phát biểu:</b> …</p><p><b>Điều kiện:</b> …</p><p><b>Hệ quả:</b> …</p></div><p><br></p>',steps:'<div class="note-card note-card-sky"><p class="note-card-kicker">☷ CÁC BƯỚC GIẢI</p><ol><li>Bước 1: …</li><li>Bước 2: …</li><li>Bước 3: …</li></ol></div><p><br></p>',flashcard:'<div class="note-card note-card-gold"><p class="note-card-kicker">▣ THẺ KIẾN THỨC</p><p><b>Khái niệm:</b> …</p><p><b>Từ khóa:</b> …</p><p><b>Ghi nhớ:</b> …</p></div><p><br></p>',timeline2:'<div class="note-card note-card-mint"><p class="note-card-kicker">➜ DÒNG THỜI GIAN</p><p><b>Mốc 1:</b> …</p><p><b>Mốc 2:</b> …</p><p><b>Mốc 3:</b> …</p></div><p><br></p>',divider:'<hr class="note-divider"><p><br></p>'};
  $('#insertDecor').addEventListener('mousedown',e=>e.preventDefault(),{signal});$('#insertDecor').onclick=()=>{focusEditor();noteCommand('insertHTML',false,decorHTML[$('#decorChoice').value]||decorHTML.memory);markChanged();};
  $('#insertSticker')?.addEventListener('mousedown',e=>e.preventDefault(),{signal});$('#insertSticker')?.addEventListener('click',()=>{focusEditor();const sticker=$('#stickerChoice')?.value||'⭐';noteCommand('insertHTML',false,'<span class="note-sticker">'+esc(sticker)+'</span>&nbsp;');markChanged();},{signal});
  $('#insertInternalRef')?.addEventListener('mousedown',e=>e.preventDefault(),{signal});$('#insertInternalRef')?.addEventListener('click',()=>{saveSelection();const range=lastRange?.cloneRange()||null,existingRef=inlineReferenceAtRange(range,wrap);openInlineRefPicker({selectedText:range?.toString()||existingRef?.textContent||'',existingRef,onInsert:(html)=>{if(existingRef&&existingRef.isConnected){existingRef.outerHTML=html;markChanged(pageOf(existingRef));}else{focusEditor();noteCommand('insertHTML',false,html);markChanged();}}});},{signal});
  $$('.emoji-grid [data-emoji]').forEach(b=>{b.addEventListener('mousedown',e=>e.preventDefault(),{signal});b.onclick=()=>{focusEditor();noteCommand('insertText',false,b.dataset.emoji+' ');markChanged();const menu=$('.emoji-menu');if(menu)menu.open=false;};});
  const emojiMenu=$('.emoji-menu');emojiMenu?.addEventListener('toggle',()=>{if(emojiMenu.open)document.addEventListener('mousedown',function closeEmoji(ev){if(!emojiMenu.contains(ev.target)){emojiMenu.open=false;document.removeEventListener('mousedown',closeEmoji);}}, {once:true,signal});},{signal});
  $('#pagePrev').onclick=()=>movePage(-1);$('#pageNext').onclick=()=>movePage(1);$('#deletePage').onclick=deleteCurrentPage;$('#insertPageBefore').onclick=()=>insertManualPage('before');$('#insertPageAfter').onclick=()=>insertManualPage('after');$('#appendPage').onclick=()=>insertManualPage('end');
  function currentPage(){const selected=getSelectionRange();return(selected&&pageOf(selected.startContainer))||pageOf(document.activeElement)||lastActivePage||pages()[0];}
  function focusPageStart(page){if(!page||!wrap.isConnected||!page.isConnected)return;lastActivePage=page;page.scrollIntoView({behavior:'smooth',block:'center'});page.focus({preventScroll:true});const target=page.querySelector('p')||page,r=document.createRange();r.selectNodeContents(target);r.collapse(true);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r);lastRange=r.cloneRange();updatePager();}
  function insertManualPage(where){const list=pages(),current=currentPage(),index=Math.max(0,list.indexOf(current)),insertAt=where==='before'?index:where==='after'?index+1:list.length,reference=list[insertAt]||null;if(reference)reference.dataset.manualBreak='true';const page=addPage({before:reference,keepPage:true,manualBreak:false});focusPageStart(page);markChanged();toast(where==='end'?'Đã thêm trang ở cuối vở':where==='before'?'Đã chèn trang phía trước':'Đã chèn trang phía sau');}
  function movePage(delta){const list=pages(),current=currentPage(),index=Math.max(0,list.indexOf(current)),target=list[Math.min(list.length-1,Math.max(0,index+delta))];if(target)focusPageStart(target);}
  function deleteCurrentPage(){const list=pages(),current=currentPage();if(!current)return;if(list.length===1){if(!isEmptyPage(current)&&!confirm('Xóa toàn bộ nội dung của trang duy nhất này?'))return;pageNodes(current).forEach(node=>node.remove());current.dataset.manualBreak='';current.dataset.keepPage='';current.dataset.firstWrittenAt='';current.innerHTML='<p><br></p>';updatePageChrome(current);ensurePageMarker(current);ensureInkLayer(current);attachInkEvents(current);focusPageStart(current);markChanged();toast('Đã làm trống trang vở.');return;}if(!isEmptyPage(current)&&!confirm('Xóa trang hiện tại cùng toàn bộ nội dung trên trang?'))return;const index=list.indexOf(current),next=list[index+1]||null,target=next||list[index-1];current.remove();if(next)next.dataset.manualBreak='';if(target)focusPageStart(target);markChanged();toast('Đã xóa trang vở.');}
  pages().forEach(p=>{ensurePageMarker(p);ensureInkLayer(p);attachInkEvents(p);});if(!pages().length)addPage();if(!pageNodes(pages()[0]).length)pages()[0].innerHTML='<p><br></p>';
  // Reflow first, then restore a precise search target in the final page stack.
  const requestedPage=Number.isInteger(state.jumpToPage)?state.jumpToPage:null,requestedPageId=state.jumpToPageId||null;state.jumpToPage=null;state.jumpToPageId=null;
  reflowPages();updateWords();updatePager();
  if(requestedPageId||requestedPage!==null){const foundPage=requestedPageId?pages().find(p=>p.dataset.pageId===requestedPageId):null;const idx=foundPage?pages().indexOf(foundPage):Math.min(pages().length-1,Math.max(0,requestedPage??0));requestAnimationFrame(()=>focusPageStart(pages()[idx]));}
  if(dirty){storeDraft();saveTimer=setTimeout(()=>persist(),100);}
  const pagehide=()=>{if(dirty)storeDraft();};window.addEventListener('pagehide',pagehide,{signal});window.addEventListener('beforeunload',pagehide,{signal});
  const dispose=()=>{
    if(state.notebookController!==controller)return;
    clearTimeout(saveTimer);clearTimeout(draftTimer);clearTimeout(resizeTimer);
    if(dirty)storeDraft();
    stickyObserver?.disconnect();controller.abort();state.notebookController=null;state.notebookDispose=null;
    state.flushNotebook=null;state.storeNotebookDraft=null;state.activeDraftKey=null;
  };
  state.notebookDispose=dispose;
}
async function changeNewsDate(date){if(!isValidDateKey(date))return;if(!(await flushBeforeLeave()))return;const previous=state.newsDate,oldSetting=state.data.settings.lastNewsDate;state.newsDate=date;state.newsMonth=date.slice(0,7);state.data.settings.lastNewsDate=date;if(!await save()){state.newsDate=previous;state.newsMonth=previous.slice(0,7);state.data.settings.lastNewsDate=oldSetting;return;}render();}
async function openNewsDate(date){if(!isValidDateKey(date)||!(await flushBeforeLeave()))return;const previous={date:state.newsDate,page:state.page,selected:state.selected,last:state.data.settings.lastNewsDate};state.newsDate=date;state.newsMonth=date.slice(0,7);state.data.settings.lastNewsDate=date;state.page='news';state.selected=null;if(!await save()){state.newsDate=previous.date;state.newsMonth=(previous.date||localDateKey()).slice(0,7);state.data.settings.lastNewsDate=previous.last;state.page=previous.page;state.selected=previous.selected;return;}render();}


/* ===== Inline internal references: links live in the selected content ===== */
function inlineReferenceAtRange(range,root){
  if(!range)return null;
  const node=range.commonAncestorContainer,el=node.nodeType===1?node:node.parentElement;
  const anchor=el?.closest?.('a[data-ss-ref]');
  return anchor&&(!root||root.contains(anchor))?anchor:null;
}
function inlineRefEscape(value){return esc(String(value??''));}
function inlineRefPages(type,id){
  if(type==='project')return find(id)?.node?.notePages||[];
  if(type==='news')return state.data.newsEntries?.[id]?.notePages||ensureNewsEntry(id).notePages||[];
  return [];
}
function inlineRefPath(type,id){
  if(type==='news')return 'Tin tức · '+String(id).split('-').reverse().join('/');
  const p=pathOf(id);return p.length?p.map(x=>x.name).join(' / '):'Dự án không còn tồn tại';
}
function inlineRefPageSnippet(html){
  const box=document.createElement('div');box.innerHTML=sanitizeRichHTML(html||'');
  return (box.textContent||'').replace(/\s+/g,' ').trim().slice(0,46);
}
let pendingInlineReference=null;
function populateInlineRefPages(){
  const type=$('#ssRefType')?.value||'project';
  const id=type==='news'?$('#ssRefDate')?.value:$('#ssRefProject')?.value;
  const select=$('#ssRefPage');if(!select)return;
  const pages=id?inlineRefPages(type,id):[];
  let options=type==='project'?'<option value="__overview__" data-page="0">Tổng quan dự án</option>':'';
  options+=pages.map((pg,i)=>{const snippet=inlineRefPageSnippet(pg.html);return `<option value="${inlineRefEscape(pg.id)}" data-page="${i+1}">Trang ${i+1}${snippet?' · '+inlineRefEscape(snippet):' · Chưa có nội dung'}</option>`;}).join('');
  if(!pages.length&&type==='news')options='<option value="">Chưa có trang vở</option>';
  select.innerHTML=options;
}
function openInlineRefPicker(options={}){
  const overlay=$('#ssRefPicker');if(!overlay){toast('Không mở được công cụ liên kết nội bộ.');return;}
  pendingInlineReference={onInsert:options.onInsert,existingRef:options.existingRef||null};
  const preferredType=options.existingRef?.dataset.ssType||'project';
  const preferredId=options.existingRef?.dataset.ssId||'';
  $('#ssRefType').value=preferredType;
  $('#ssRefProject').innerHTML=allProjectNodes().map(n=>`<option value="${inlineRefEscape(n.id)}">${inlineRefEscape(pathOf(n.id).map(x=>x.name).join(' / '))}</option>`).join('')||'<option value="">Chưa có dự án</option>';
  $('#ssRefProjectWrap').hidden=preferredType==='news';
  $('#ssRefDateWrap').hidden=preferredType!=='news';
  if(preferredType==='project')$('#ssRefProject').value=preferredId||state.selected||allProjectNodes()[0]?.id||'';
  $('#ssRefDate').value=preferredType==='news'?(options.existingRef?.dataset.ssId||state.newsDate||localDateKey()):(state.newsDate||localDateKey());
  $('#ssRefLabel').value=options.selectedText||options.existingRef?.textContent||'';
  $('#ssRefTargetNote').textContent='Chọn một dự án/dự án con hoặc ngày Tin tức, sau đó chọn trang cần mở.';
  populateInlineRefPages();
  if(options.existingRef){
    const ref=options.existingRef, type=ref.dataset.ssType||'project', id=ref.dataset.ssId||'';
    $('#ssRefType').value=type;
    $('#ssRefProjectWrap').hidden=type==='news';$('#ssRefDateWrap').hidden=type!=='news';
    if(type==='project')$('#ssRefProject').value=id;else $('#ssRefDate').value=id;
    populateInlineRefPages();
    const pageId=ref.dataset.ssPageId||'';
    if(pageId)$('#ssRefPage').value=pageId;else if(Number(ref.dataset.ssPage)===0)$('#ssRefPage').value='__overview__';
  }
  overlay.classList.add('is-open');overlay.setAttribute('aria-hidden','false');
  requestAnimationFrame(()=>$('#ssRefLabel')?.focus());
}
function closeInlineRefPicker(){const overlay=$('#ssRefPicker');if(!overlay)return;overlay.classList.remove('is-open');overlay.setAttribute('aria-hidden','true');pendingInlineReference=null;}
function makeInlineReferenceHTML(label,type,id,page,pageId){
  const path=inlineRefPath(type,id),pageLabel=page?` · Trang ${page}`:' · Tổng quan';
  return `<a href="#" class="ss-inline-ref" data-ss-ref="1" data-ss-type="${inlineRefEscape(type)}" data-ss-id="${inlineRefEscape(id)}" data-ss-page="${Number(page)||0}" data-ss-page-id="${inlineRefEscape(pageId||'')}" title="Mở ${inlineRefEscape(path+pageLabel)}">${inlineRefEscape(label)}</a>`;
}
function commitInlineReference(){
  if(!pendingInlineReference)return;
  const type=$('#ssRefType').value;
  const id=type==='news'?$('#ssRefDate').value:$('#ssRefProject').value;
  const pageOption=$('#ssRefPage').selectedOptions[0];
  const label=$('#ssRefLabel').value.trim();
  if(!id){toast(type==='news'?'Hãy chọn ngày Tin tức.':'Hãy chọn dự án đích.');return;}
  if(!label){toast('Hãy nhập hoặc bôi đen đoạn chữ sẽ mang liên kết.');$('#ssRefLabel').focus();return;}
  if(!pageOption||!pageOption.value){toast('Nội dung đích chưa có trang để liên kết.');return;}
  const page=Number(pageOption.dataset.page)||0;
  const pageId=pageOption.value==='__overview__'?'':pageOption.value;
  const targetPages=inlineRefPages(type,id);
  if(page>0&&!targetPages.some(pg=>pg.id===pageId)){toast('Trang đích không còn tồn tại. Hãy chọn lại trang.');populateInlineRefPages();return;}
  const html=makeInlineReferenceHTML(label,type,id,page,pageId);
  const pending=pendingInlineReference;
  closeInlineRefPicker();
  try{pending.onInsert?.(html,{type,id,page,pageId});toast('Đã gắn liên kết ngay trong nội dung.');}
  catch(err){console.error(err);toast('Không thể chèn liên kết tại vị trí đã chọn.');}
}
function resolveInlineReference(raw){
  const type=raw?.type==='news'?'news':raw?.type==='project'?'project':null;
  const id=String(raw?.id||'').trim();if(!type||!id)return null;
  if(type==='news'&&!isValidDateKey(id))return null;
  if(type==='project'&&!find(id))return null;
  const pages=inlineRefPages(type,id);
  let index=Number(raw.page)||0;
  const pageId=String(raw.pageId||'');
  if(pageId){index=pages.findIndex(pg=>pg.id===pageId)+1;if(index<1)return null;}
  if(index<0||index>pages.length)return null;
  if(type==='news'&&index===0)index=1;
  return {type,id,pages,index,pageId:index>0?(pages[index-1]?.id||''):'',path:inlineRefPath(type,id)};
}
let activeInlineReferenceWindow=null;
async function openInlineReferenceWindow(raw){
  const ep=resolveInlineReference(raw);
  if(!ep){toast('Không tìm thấy nội dung đích hoặc trang đã bị xóa.');return;}
  // Flush the current note without changing the app's current route; the reader stays in place.
  if(state.flushNotebook){const ok=await state.flushNotebook();if(ok===false){toast('Không mở liên kết vì trang hiện tại chưa lưu được.');return;}}
  const fresh=resolveInlineReference(raw);if(!fresh){toast('Trang đích không còn tồn tại.');return;}
  activeInlineReferenceWindow=fresh;renderInlineReferenceWindow();
}
function renderInlineReferenceWindow(){
  const ep=activeInlineReferenceWindow;if(!ep)return;
  const isProject=ep.type==='project',node=isProject?find(ep.id)?.node:null;
  const title=isProject?(node?.name||'Dự án'):('Tin tức · '+ep.id.split('-').reverse().join('/'));
  const index=ep.index,pages=ep.pages;
  $('#ssRefWindowTitle').textContent=title;
  $('#ssRefWindowPath').textContent=ep.path;
  $('#ssRefWindowCounter').textContent=index>0?`Trang ${index} / ${pages.length}`:'Tổng quan dự án';
  $('#ssRefWindowPrev').disabled=index<=1;
  $('#ssRefWindowNext').disabled=index>=pages.length;
  $('#ssRefWindowPrev').hidden=index===0;
  $('#ssRefWindowNext').hidden=index===0;
  const body=$('#ssRefWindowBody');
  if(index===0&&node){
    const childList=(node.children||[]).map(child=>`<li>${inlineRefEscape(child.name)}</li>`).join('');
    body.innerHTML=`<div class="ss-ref-overview"><span class="ss-ref-overview-kicker">TỔNG QUAN DỰ ÁN</span><h2>${inlineRefEscape(node.name)}</h2><p>${inlineRefEscape(node.description||'Dự án chưa có mô tả.')}</p><div class="ss-ref-overview-stats"><span><b>${(node.questions||[]).length}</b><small>Câu hỏi</small></span><span><b>${pages.length}</b><small>Trang vở</small></span><span><b>${(node.children||[]).length}</b><small>Mục con</small></span></div>${childList?`<div class="ss-ref-overview-children"><b>Các mục con</b><ul>${childList}</ul></div>`:''}</div>`;
  }else{
    const pg=pages[index-1];
    if(!pg){body.innerHTML='<div class="ss-ref-missing">Không tìm thấy trang đích.</div>';}
    else{
      const safe=sanitizeRichHTML(pg.html||'<p>Trang này chưa có nội dung.</p>');
      body.innerHTML=`<div class="ss-ref-target-sheet paper-${isProject?(node?.paperStyle||'grid'):(state.data.newsEntries?.[ep.id]?.paperStyle||'grid')} paper-theme-${isProject?(node?.paperTheme||'classic'):(state.data.newsEntries?.[ep.id]?.paperTheme||'classic')}"><div class="ss-ref-target-date">${isProject?'TRANG VỞ DỰ ÁN':'SỔ TAY TIN TỨC'} · ${isProject?inlineRefEscape(node?.name||''):ep.id.split('-').reverse().join('/')}</div><div class="ss-ref-target-content">${safe}</div></div>`;
    }
  }
  const overlay=$('#ssRefWindow');overlay.classList.add('is-open');overlay.setAttribute('aria-hidden','false');
}
function closeInlineReferenceWindow(){const overlay=$('#ssRefWindow');if(overlay){overlay.classList.remove('is-open');overlay.setAttribute('aria-hidden','true');}activeInlineReferenceWindow=null;}
function stepInlineReferenceWindow(delta){const ep=activeInlineReferenceWindow;if(!ep||ep.index===0)return;const next=Math.max(1,Math.min(ep.pages.length,ep.index+delta));if(next===ep.index)return;ep.index=next;ep.pageId=ep.pages[next-1]?.id||'';renderInlineReferenceWindow();}
function bindInlineReferenceUI(){
  $('#ssRefType').addEventListener('change',()=>{
    const news=$('#ssRefType').value==='news';$('#ssRefProjectWrap').hidden=news;$('#ssRefDateWrap').hidden=!news;populateInlineRefPages();
  });
  $('#ssRefProject').addEventListener('change',populateInlineRefPages);
  $('#ssRefDate').addEventListener('change',populateInlineRefPages);
  $('#ssRefConfirm').addEventListener('click',commitInlineReference);
  $('#ssRefCancel').addEventListener('click',closeInlineRefPicker);
  $('#ssRefCancel2').addEventListener('click',closeInlineRefPicker);
  $('#ssRefPicker').addEventListener('click',e=>{if(e.target===$('#ssRefPicker'))closeInlineRefPicker();});
  $('#ssRefWindowClose').addEventListener('click',closeInlineReferenceWindow);
  $('#ssRefWindowPrev').addEventListener('click',()=>stepInlineReferenceWindow(-1));
  $('#ssRefWindowNext').addEventListener('click',()=>stepInlineReferenceWindow(1));
  $('#ssRefWindow').addEventListener('click',e=>{if(e.target===$('#ssRefWindow'))closeInlineReferenceWindow();});
  document.addEventListener('click',e=>{
    const anchor=e.target.closest?.('a[data-ss-ref]');if(!anchor)return;
    e.preventDefault();e.stopPropagation();
    openInlineReferenceWindow({type:anchor.dataset.ssType,id:anchor.dataset.ssId,page:Number(anchor.dataset.ssPage)||0,pageId:anchor.dataset.ssPageId||''});
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('#ssRefPicker').classList.contains('is-open'))closeInlineRefPicker();else if($('#ssRefWindow').classList.contains('is-open'))closeInlineReferenceWindow();}});
}

$$('.mode-btn').forEach(btn=>btn.onclick=async()=>{const next=btn.dataset.mode;if(next===state.data.settings.activeMode)return;if(!(await flushBeforeLeave()))return;if(!(await changeActiveMode(next)))return;state.selected=null;state.page='home';state.expanded.clear();render();});
$('#newProject').onclick=()=>{if(innerWidth<=980){$('#sidebar').classList.remove('open');document.body.classList.remove('sidebar-mobile-open');$('#menuBtn')?.setAttribute('aria-expanded','false');}createNode(null);};$('#backupTop').onclick=exportBackup;$('#importTop').onclick=()=>$('#importFile').click();$('#importFile').onchange=async e=>{const file=e.target.files[0];e.target.value='';await importBackup(file);};$('#navHome').onclick=async()=>{if(!(await flushBeforeLeave()))return;state.page='home';state.selected=null;render();};$('#homeQuickBtn').onclick=()=>$('#navHome')?.click();$('#navReview').onclick=async()=>{if(!(await flushBeforeLeave()))return;state.page='review';render();};$('#navNews').onclick=async()=>{if(!(await flushBeforeLeave()))return;state.page='news';state.selected=null;state.newsDate=state.data.settings.lastNewsDate||localDateKey();state.newsMonth=state.newsDate.slice(0,7);render();};/* Mobile menu is bound by setupBloomMobileSidebar(); keep its scrim and ARIA logic. */$('#autoSpeakSwitch').onclick=async()=>{const old=state.data.settings.autoSpeak;state.data.settings.autoSpeak=!old;if(!await save())state.data.settings.autoSpeak=old;render();toast(state.data.settings.autoSpeak?'Đã bật tự đọc tiếng Anh.':'Đã tắt tự đọc.');};$('#speechRate').onchange=async e=>{const old=state.data.settings.rate;state.data.settings.rate=Number(e.target.value);if(!await save()){state.data.settings.rate=old;e.target.value=String(old||1);}};$('#closeModal').onclick=$('#cancel').onclick=closeModal;$('#overlay').onclick=e=>{if(e.target===$('#overlay'))closeModal();};$('#form').onsubmit=async e=>{e.preventDefault();if(!state.modalSave||$('#submit').disabled)return;if(state.questionGridSerialize&&$('#qRowsJSON'))state.questionGridSerialize();const q=$('#qQuestionEditor'),a=$('#qAnswerEditor');if(q){$('#qQuestionPlain').value=(q.innerText||q.textContent||'').replace(/\u00a0/g,' ').trim();$('#qQuestionHTML').value=sanitizeRichHTML(q.innerHTML);}if(a){$('#qAnswerPlain').value=(a.innerText||a.textContent||'').replace(/\u00a0/g,' ').trim();$('#qAnswerHTML').value=sanitizeRichHTML(a.innerHTML);}const submit=$('#submit');submit.disabled=true;submit.textContent='Đang lưu…';try{const result=await state.modalSave(new FormData(e.currentTarget));if(result!==false)closeModal();}catch(err){console.error(err);toast(err?.message||'Thao tác chưa hoàn tất. Dữ liệu chưa được xác nhận lưu.');}finally{submit.disabled=false;submit.textContent='Lưu lại';}};$('#closeLightbox').onclick=()=>$('#lightbox').classList.remove('show');$('#ssRefWindowClose2').onclick=closeInlineReferenceWindow;bindInlineReferenceUI();bindGlobalSearch();$('#lightbox').onclick=e=>{if(e.target===$('#lightbox'))$('#lightbox').classList.remove('show');};document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();$('#lightbox').classList.remove('show');$('#sidebar').classList.remove('open');closeStorageManager();}});
/* ===== Theme toggle (dark / light) ===== */
(function(){
  var THEME_KEY='studyspace_theme_v1';
  function apply(t){
    var theme=(t==='dark')?'dark':'light';
    document.documentElement.setAttribute('data-theme',theme);
    try{localStorage.setItem(THEME_KEY,theme);}catch(_){}
    var icon=document.getElementById('themeToggleIcon');
    var label=document.querySelector('.theme-toggle-label');
    if(icon)icon.textContent=theme==='dark'?'☀':'☾';
    if(label)label.textContent=theme==='dark'?'Sáng':'Tối';
    var meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content',theme==='dark'?'#0f141c':'#183b83');
  }
  var saved='light';
  try{saved=localStorage.getItem(THEME_KEY)||'light';}catch(_){}
  apply(saved);
  document.addEventListener('click',function(e){
    var btn=e.target.closest('#themeToggle');
    if(!btn)return;
    var cur=document.documentElement.getAttribute('data-theme')||'light';
    apply(cur==='dark'?'light':'dark');
  });
})();

/* ===== BLOOM v7: subject-aware study tools, safe insertion and mobile sidebar ===== */
function setupBloomStudyTools(){
 const modal=$('#studyToolsModal'),grid=$('#studyToolsGrid'),catsHost=$('#studyToolsCategories'),search=$('#studyToolsSearch'),intro=$('#studyToolsIntro'),count=$('#studyToolsCount');
 if(!modal||!grid||!catsHost||!search)return;
 const categories=[
  {id:'all',label:'Tất cả',icon:'✦',desc:'Bộ công cụ học tập tổng hợp cho nhiều môn học và kiểu ghi chép.'},
  {id:'math',label:'Toán & Tin',icon:'∑',desc:'Giải toán, chứng minh, thuật toán và tư duy tính toán.'},
  {id:'physics',label:'Vật lí',icon:'⚛',desc:'Phân tích đại lượng, định luật, thí nghiệm và sai số.'},
  {id:'chem',label:'Hóa học',icon:'⚗',desc:'Phản ứng, hiện tượng, mol, bảo toàn và thực hành.'},
  {id:'bio',label:'Sinh học',icon:'🧬',desc:'Cấu trúc, chức năng, quá trình và quan hệ sinh học.'},
  {id:'lit',label:'Ngữ văn',icon:'✒',desc:'Đọc hiểu thơ/văn xuôi, phân tích và lập luận nghị luận.'},
  {id:'history',label:'Lịch sử',icon:'🏛',desc:'Bối cảnh, nguyên nhân, diễn biến, kết quả và nhân vật.'},
  {id:'geo',label:'Địa lí',icon:'🌍',desc:'Đọc bảng số liệu, biểu đồ, bản đồ và vùng địa lí.'},
  {id:'language',label:'Ngoại ngữ',icon:'文',desc:'Từ vựng, ngữ pháp, cụm từ và luyện kỹ năng.'},
  {id:'social',label:'Kinh tế – XH',icon:'◇',desc:'Khái niệm, cơ chế, quan hệ nguyên nhân – kết quả.'},
  {id:'research',label:'Phương pháp học',icon:'🧠',desc:'Cornell, thẻ nhớ, kiểm chứng nguồn và tự đánh giá.'},
  {id:'symbols',label:'Ký hiệu học thuật',icon:'π',desc:'Chèn nhanh ký hiệu toán học, khoa học và đơn vị phổ biến.'}
 ];
 const block=(tone,kicker,content)=>`<div class="note-card note-card-${tone}"><p class="note-card-kicker">${kicker}</p>${content}</div><p><br></p>`;
 const row=(a,b)=>`<tr><th>${a}</th><td>${b}</td></tr>`;
 const items=[
  {cat:'math',icon:'∑',title:'Khung giải bài toán',desc:'Giả thiết – yêu cầu – phương pháp – lời giải – kiểm tra.',html:block('blue','∑ PHÂN TÍCH BÀI TOÁN',`<p><b>1. Dữ kiện đã cho:</b> …</p><p><b>2. Yêu cầu cần tìm/chứng minh:</b> …</p><p><b>3. Kiến thức hoặc phương pháp:</b> …</p><p><b>4. Các bước giải:</b></p><ol><li>…</li><li>…</li><li>…</li></ol><p><b>5. Kiểm tra kết quả:</b> điều kiện, đơn vị, tính hợp lí.</p>`)},
  {cat:'math',icon:'△',title:'Khung chứng minh',desc:'Mệnh đề, giả thiết, lập luận và kết luận.',html:block('violet','△ CHỨNG MINH',`<p><b>Điều cần chứng minh:</b> …</p><p><b>Giả thiết:</b> …</p><p><b>Chiến lược:</b> trực tiếp / phản chứng / quy nạp / tương đương.</p><ol><li>Cơ sở lập luận: …</li><li>Suy luận tiếp theo: …</li><li>Hoàn tất chứng minh: …</li></ol><p><b>Kết luận:</b> …</p>`)},
  {cat:'math',icon:'⌘',title:'Thiết kế thuật toán',desc:'Đầu vào, đầu ra, ý tưởng, giả mã và độ phức tạp.',html:block('sky','⌘ THIẾT KẾ THUẬT TOÁN',`<p><b>Bài toán:</b> …</p><p><b>Đầu vào (Input):</b> …</p><p><b>Đầu ra (Output):</b> …</p><p><b>Ý tưởng:</b> …</p><p><b>Giả mã:</b></p><pre>BEGIN
  …
END</pre><p><b>Độ phức tạp dự kiến:</b> thời gian … · bộ nhớ …</p><p><b>Ca kiểm thử:</b> …</p>`)},
  {cat:'physics',icon:'⚛',title:'Giải bài tập Vật lí',desc:'Đổi đơn vị, mô hình hóa, chọn định luật và kiểm tra thứ nguyên.',html:block('blue','⚛ QUY TRÌNH GIẢI VẬT LÍ',`<p><b>Tóm tắt:</b> …</p><p><b>Đổi đơn vị SI:</b> …</p><p><b>Đại lượng cần tìm:</b> …</p><p><b>Mô hình / định luật sử dụng:</b> …</p><p><b>Biến đổi và tính toán:</b></p><p>…</p><p><b>Kiểm tra:</b> đơn vị · thứ nguyên · giới hạn vật lí.</p><p><b>Kết luận:</b> …</p>`)},
  {cat:'physics',icon:'🧪',title:'Báo cáo thí nghiệm',desc:'Mục tiêu, dụng cụ, biến số, kết quả, sai số và kết luận.',html:block('mint','🧪 PHIẾU THÍ NGHIỆM',`<p><b>Mục tiêu:</b> …</p><p><b>Dụng cụ và bố trí:</b> …</p><p><b>Biến độc lập:</b> … · <b>Biến phụ thuộc:</b> …</p><p><b>Các bước tiến hành:</b></p><ol><li>…</li><li>…</li><li>…</li></ol><p><b>Bảng số liệu:</b> …</p><p><b>Nguồn sai số:</b> …</p><p><b>Kết luận và đề xuất cải thiện:</b> …</p>`)},
  {cat:'physics',icon:'📐',title:'Bản đồ công thức',desc:'Công thức, ý nghĩa đại lượng, điều kiện áp dụng và đơn vị.',html:`<table class="note-table"><thead><tr><th>Công thức</th><th>Đại lượng</th><th>Điều kiện / đơn vị</th></tr></thead><tbody><tr><td>…</td><td>…</td><td>…</td></tr><tr><td>…</td><td>…</td><td>…</td></tr><tr><td>…</td><td>…</td><td>…</td></tr></tbody></table><p><br></p>`},
  {cat:'chem',icon:'⚗',title:'Phân tích phản ứng hóa học',desc:'Chất tham gia, sản phẩm, điều kiện, hiện tượng và bản chất.',html:block('mint','⚗ PHÂN TÍCH PHẢN ỨNG',`<p><b>Phương trình:</b> …</p><p><b>Chất tham gia:</b> …</p><p><b>Sản phẩm:</b> …</p><p><b>Điều kiện phản ứng:</b> nhiệt độ / xúc tác / môi trường …</p><p><b>Hiện tượng quan sát:</b> màu sắc, khí, kết tủa, nhiệt …</p><p><b>Bản chất:</b> …</p><p><b>Lưu ý nhận biết / ngoại lệ:</b> …</p>`)},
  {cat:'chem',icon:'n',title:'Khung tính toán hóa học',desc:'Số mol, phương trình, tỉ lệ, chất giới hạn và kết luận.',html:block('violet','n KHUNG TÍNH TOÁN HÓA HỌC',`<p><b>Dữ kiện:</b> …</p><p><b>Đổi về số mol:</b> …</p><p><b>Phương trình phản ứng:</b> …</p><p><b>Tỉ lệ mol:</b> …</p><p><b>Xác định chất hết / chất dư:</b> …</p><p><b>Tính đại lượng yêu cầu:</b> …</p><p><b>Kiểm tra:</b> bảo toàn nguyên tố / khối lượng / điện tích.</p>`)},
  {cat:'chem',icon:'▦',title:'Bảng nhận biết chất',desc:'Thuốc thử, dấu hiệu và phương trình ion/hiện tượng.',html:`<table class="note-table"><thead><tr><th>Chất / ion</th><th>Thuốc thử</th><th>Hiện tượng</th><th>Kết luận</th></tr></thead><tbody>${row('…','… · … · …')}${row('…','… · … · …')}${row('…','… · … · …')}</tbody></table><p><br></p>`},
  {cat:'bio',icon:'🧬',title:'Mô tả quá trình sinh học',desc:'Vị trí, nguyên liệu, diễn biến, sản phẩm và vai trò.',html:block('mint','🧬 QUÁ TRÌNH SINH HỌC',`<p><b>Khái niệm:</b> …</p><p><b>Nơi diễn ra:</b> …</p><p><b>Nguyên liệu / điều kiện:</b> …</p><p><b>Các giai đoạn:</b></p><ol><li>Giai đoạn 1: …</li><li>Giai đoạn 2: …</li><li>Giai đoạn 3: …</li></ol><p><b>Sản phẩm:</b> …</p><p><b>Ý nghĩa sinh học:</b> …</p>`)},
  {cat:'bio',icon:'⇄',title:'So sánh cấu trúc – chức năng',desc:'Đặt hai đối tượng trong cùng tiêu chí so sánh.',html:`<table class="note-table"><thead><tr><th>Tiêu chí</th><th>Đối tượng A</th><th>Đối tượng B</th></tr></thead><tbody>${row('Cấu tạo','… · …')}${row('Vị trí','… · …')}${row('Chức năng','… · …')}${row('Điểm giống','…')}${row('Điểm khác / ý nghĩa','…')}</tbody></table><p><br></p>`},
  {cat:'lit',icon:'✒',title:'Đọc hiểu và phân tích thơ',desc:'Chủ thể trữ tình, hình tượng, mạch cảm xúc và nghệ thuật.',html:block('rose','✒ PHÂN TÍCH THƠ',`<p><b>Tác giả – tác phẩm – hoàn cảnh:</b> …</p><p><b>Chủ thể trữ tình / điểm nhìn:</b> …</p><p><b>Hình tượng và từ ngữ then chốt:</b> …</p><p><b>Mạch cảm xúc / cấu tứ:</b> …</p><p><b>Đặc sắc nghệ thuật:</b> thể thơ, nhịp, vần, hình ảnh, biện pháp tu từ, giọng điệu…</p><p><b>Nhận xét nội dung và tư tưởng:</b> …</p>`)},
  {cat:'lit',icon:'📖',title:'Phân tích nhân vật / văn xuôi',desc:'Hoàn cảnh, hành động, lời nói, tâm lí và nghệ thuật xây dựng.',html:block('amber','📖 PHÂN TÍCH NHÂN VẬT',`<p><b>Vị trí và hoàn cảnh nhân vật:</b> …</p><p><b>Phẩm chất / tính cách nổi bật:</b></p><ul><li>Chi tiết, hành động, lời nói: …</li><li>Diễn biến tâm lí: …</li><li>Mối quan hệ với nhân vật khác: …</li></ul><p><b>Nghệ thuật xây dựng:</b> tình huống, điểm nhìn, ngôn ngữ, miêu tả…</p><p><b>Ý nghĩa hình tượng:</b> …</p>`)},
  {cat:'lit',icon:'✍',title:'Đoạn văn nghị luận văn học',desc:'Luận điểm – dẫn chứng – phân tích – đánh giá – liên hệ.',html:block('rose','✍ TRIỂN KHAI LUẬN ĐIỂM',`<p><b>Nhận định / luận điểm:</b> …</p><p><b>Dẫn chứng tiêu biểu:</b> …</p><p><b>Phân tích từ ngữ, hình ảnh, chi tiết:</b> …</p><p><b>Đánh giá nội dung và nghệ thuật:</b> …</p><p><b>Liên hệ / mở rộng:</b> …</p>`)},
  {cat:'history',icon:'🏛',title:'Phân tích một sự kiện lịch sử',desc:'Bối cảnh, nguyên nhân, diễn biến, kết quả, ý nghĩa và đánh giá.',html:block('gold','🏛 HỒ SƠ SỰ KIỆN LỊCH SỬ',`<p><b>Thời gian – địa điểm:</b> …</p><p><b>Bối cảnh:</b> trong nước / quốc tế …</p><p><b>Nguyên nhân:</b> trực tiếp / sâu xa …</p><p><b>Diễn biến chính:</b></p><ol><li>…</li><li>…</li><li>…</li></ol><p><b>Kết quả:</b> …</p><p><b>Ý nghĩa / tác động:</b> …</p><p><b>Nhận xét và bài học:</b> …</p>`)},
  {cat:'history',icon:'⌛',title:'Dòng thời gian lịch sử',desc:'Hệ thống mốc theo trật tự và quan hệ trước – sau.',html:`<table class="note-table"><thead><tr><th>Thời gian</th><th>Sự kiện</th><th>Nhân vật / lực lượng</th><th>Kết quả / ý nghĩa</th></tr></thead><tbody>${row('…','… · … · …')}${row('…','… · … · …')}${row('…','… · … · …')}${row('…','… · … · …')}</tbody></table><p><br></p>`},
  {cat:'history',icon:'👤',title:'Hồ sơ nhân vật lịch sử',desc:'Xuất thân, hoạt động, đóng góp, hạn chế và đánh giá.',html:block('gold','👤 NHÂN VẬT LỊCH SỬ',`<p><b>Thời đại / bối cảnh:</b> …</p><p><b>Xuất thân và vai trò:</b> …</p><p><b>Hoạt động / sự kiện tiêu biểu:</b> …</p><p><b>Đóng góp:</b> …</p><p><b>Đánh giá:</b> dựa trên bối cảnh và tư liệu lịch sử …</p>`)},
  {cat:'geo',icon:'📊',title:'Đọc bảng số liệu / biểu đồ',desc:'Nhận xét tổng quan, so sánh, biến động và giải thích.',html:block('sky','📊 PHÂN TÍCH SỐ LIỆU ĐỊA LÍ',`<p><b>Đơn vị – thời gian – phạm vi:</b> …</p><p><b>Nhận xét khái quát:</b> xu hướng chung …</p><p><b>So sánh:</b> cao nhất / thấp nhất / chênh lệch …</p><p><b>Biến động:</b> tăng / giảm / tốc độ / cơ cấu …</p><p><b>Giải thích:</b> điều kiện tự nhiên, kinh tế – xã hội, chính sách …</p><p><b>Kết luận:</b> …</p>`)},
  {cat:'geo',icon:'🧭',title:'Hồ sơ vùng / địa phương',desc:'Vị trí, tự nhiên, dân cư, kinh tế, thế mạnh và thách thức.',html:block('mint','🧭 HỒ SƠ ĐỊA LÍ VÙNG',`<p><b>Vị trí và phạm vi:</b> …</p><p><b>Điều kiện tự nhiên:</b> địa hình, khí hậu, đất, nước, sinh vật …</p><p><b>Dân cư – xã hội:</b> …</p><p><b>Các ngành kinh tế:</b> …</p><p><b>Thế mạnh:</b> …</p><p><b>Khó khăn / thách thức:</b> …</p><p><b>Định hướng phát triển:</b> …</p>`)},
  {cat:'language',icon:'🔤',title:'Thẻ từ vựng',desc:'Từ, phiên âm, từ loại, nghĩa, kết hợp từ và câu ví dụ.',html:block('violet','🔤 VOCABULARY CARD',`<p><b>Word / Phrase:</b> …</p><p><b>IPA:</b> … · <b>Part of speech:</b> …</p><p><b>Meaning:</b> …</p><p><b>Collocations:</b> …</p><p><b>Example:</b> …</p><p><b>Translation:</b> …</p><p><b>Word family / Synonyms:</b> …</p>`)},
  {cat:'language',icon:'文',title:'Hệ thống ngữ pháp',desc:'Cấu trúc, cách dùng, dấu hiệu, ví dụ đúng/sai.',html:block('sky','文 GRAMMAR NOTE',`<p><b>Chủ điểm:</b> …</p><p><b>Cấu trúc:</b> …</p><p><b>Cách dùng:</b> …</p><p><b>Dấu hiệu nhận biết:</b> …</p><p><b>Ví dụ:</b> …</p><p><b>Lỗi thường gặp:</b> …</p><p><b>Phân biệt với:</b> …</p>`)},
  {cat:'social',icon:'◇',title:'Phân tích một khái niệm / cơ chế',desc:'Định nghĩa, chủ thể, điều kiện, cơ chế và hệ quả.',html:block('amber','◇ PHÂN TÍCH KHÁI NIỆM',`<p><b>Định nghĩa:</b> …</p><p><b>Chủ thể liên quan:</b> …</p><p><b>Điều kiện hình thành:</b> …</p><p><b>Cơ chế vận hành:</b> …</p><p><b>Tác động / hệ quả:</b> …</p><p><b>Ví dụ thực tiễn:</b> …</p><p><b>Giới hạn / ngoại lệ:</b> …</p>`)},
  {cat:'social',icon:'⇢',title:'Chuỗi nguyên nhân – kết quả',desc:'Tách nguyên nhân gốc, cơ chế trung gian và hệ quả.',html:block('rose','⇢ CAUSAL ANALYSIS',`<p><b>Vấn đề cần giải thích:</b> …</p><p><b>Nguyên nhân trực tiếp:</b> …</p><p><b>Nguyên nhân nền tảng:</b> …</p><p><b>Cơ chế trung gian:</b> …</p><p><b>Kết quả trước mắt:</b> …</p><p><b>Tác động dài hạn:</b> …</p><p><b>Yếu tố khác có thể tác động:</b> …</p>`)},
  {cat:'research',icon:'🧠',title:'Ghi chép Cornell',desc:'Câu hỏi gợi nhớ, ghi chép chính và tóm tắt.',html:`<table class="note-table"><tbody><tr><th style="width:28%">Câu hỏi / từ khóa</th><th>Ghi chép chính</th></tr><tr><td>…</td><td>…</td></tr><tr><td>…</td><td>…</td></tr><tr><td>…</td><td>…</td></tr><tr><th colspan="2">TÓM TẮT SAU BUỔI HỌC</th></tr><tr><td colspan="2">…</td></tr></tbody></table><p><br></p>`},
  {cat:'research',icon:'🗂',title:'Phiếu đánh giá nguồn',desc:'Tác giả, thời điểm, bằng chứng, mục đích và giới hạn.',html:block('blue','🗂 KIỂM CHỨNG NGUỒN',`<p><b>Tên nguồn / tác giả:</b> …</p><p><b>Ngày xuất bản / cập nhật:</b> …</p><p><b>Loại nguồn:</b> sơ cấp / thứ cấp / nghiên cứu / báo chí …</p><p><b>Bằng chứng được cung cấp:</b> …</p><p><b>Mục đích / đối tượng:</b> …</p><p><b>Điểm mạnh và giới hạn:</b> …</p><p><b>Nguồn đối chiếu độc lập:</b> …</p>`)},
  {cat:'research',icon:'▣',title:'Thẻ tự kiểm tra',desc:'Câu hỏi gợi nhớ, đáp án ngắn và mức độ chắc chắn.',html:block('gold','▣ ACTIVE RECALL CARD',`<p><b>Câu hỏi:</b> …</p><p><b>Đáp án ngắn:</b> …</p><p><b>Vì sao?</b> …</p><p><b>Ví dụ / phản ví dụ:</b> …</p><p><b>Mức độ chắc chắn:</b> Chưa chắc / Tạm ổn / Đã nắm vững.</p>`)},
  {cat:'symbols',icon:'π',title:'Bảng ký hiệu toán học',desc:'Chèn nhanh ký hiệu logic, đại số, giải tích và tập hợp.',symbols:['±','×','÷','≈','≠','≤','≥','∞','π','√','∑','∏','∫','∂','∆','∇','∈','∉','⊂','⊆','∪','∩','∅','∀','∃','⇒','⇔','∝']},
  {cat:'symbols',icon:'⚛',title:'Bảng ký hiệu khoa học',desc:'Chèn chữ cái Hy Lạp, đơn vị và ký hiệu thường dùng.',symbols:['α','β','γ','θ','λ','μ','ρ','σ','τ','φ','ω','Ω','Δ','Σ','ν','°C','K','mol','m/s²','N','J','W','Pa','V','A','pH','→','⇌']}
 ];
 let activeCategory='all',context=null;
 const renderCategories=()=>{catsHost.innerHTML=categories.map(c=>`<button type="button" role="tab" aria-selected="${activeCategory===c.id}" class="study-tools-chip ${activeCategory===c.id?'active':''}" data-study-category="${c.id}"><span>${c.icon}</span>${c.label}</button>`).join('');};
 const renderGrid=()=>{
  const term=(search.value||'').trim().toLocaleLowerCase('vi');
  const visible=items.filter(item=>(activeCategory==='all'||item.cat===activeCategory)&&(!term||(item.title+' '+item.desc+' '+(categories.find(c=>c.id===item.cat)?.label||'')).toLocaleLowerCase('vi').includes(term)));
  const cat=categories.find(c=>c.id===activeCategory)||categories[0];intro.innerHTML=`<span>${cat.icon}</span><div><b>${cat.label==='Tất cả'?'Chọn học cụ phù hợp':cat.label}</b><small>${cat.desc}</small></div>`;
  count.textContent=`${visible.length} mẫu`;
  grid.innerHTML=visible.length?visible.map((item)=>`<button type="button" class="study-tool-card" data-study-tool="${items.indexOf(item)}"><span class="study-tool-card-icon">${item.icon}</span><span class="study-tool-card-body"><b>${item.title}</b><small>${item.desc}</small><em>Chèn vào nội dung <span>↗</span></em></span></button>`).join(''):'<div class="study-tools-empty"><span>⌕</span><b>Chưa tìm thấy học cụ</b><small>Thử từ khóa khác hoặc chọn “Tất cả”.</small></div>';
 };
 const close=()=>{modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('study-tools-open');context=null;};
 const open=(root,range)=>{
  if(!root){toast('Hãy đặt con trỏ trong trang vở hoặc ô nội dung câu hỏi trước.');return;}
  if(root.matches('.paper-page')&&root.contentEditable!=='true'){toast('Hãy chuyển sang chế độ Chọn để chèn học cụ vào trang vở.');return;}
  context={root,range:range&&root.contains(range.commonAncestorContainer)?range.cloneRange():null};
  activeCategory='all';search.value='';renderCategories();renderGrid();
  modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');document.body.classList.add('study-tools-open');
  setTimeout(()=>search.focus({preventScroll:true}),70);
 };
 const findRoot=()=>{
  const sel=window.getSelection();if(sel?.rangeCount){const r=sel.getRangeAt(0),el=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement;const root=el?.closest?.('.paper-page,.q-rich-editor');if(root)return {root,range:r.cloneRange()};}
  const active=document.activeElement?.closest?.('.paper-page,.q-rich-editor');return active?{root:active,range:null}:null;
 };
 document.addEventListener('pointerdown',e=>{
  if(!e.target.closest('[data-open-study-tools]'))return;
  const found=findRoot();if(found)context={root:found.root,range:found.range};
  e.preventDefault();
 },true);
 document.addEventListener('click',e=>{
  const launch=e.target.closest?.('[data-open-study-tools]');if(!launch)return;
  const found=findRoot();const root=found?.root||context?.root;const range=context?.range||found?.range||null;
  open(root,range);
 });
 catsHost.addEventListener('click',e=>{const b=e.target.closest('[data-study-category]');if(!b)return;activeCategory=b.dataset.studyCategory;renderCategories();renderGrid();});
 search.addEventListener('input',renderGrid);
 grid.addEventListener('click',e=>{
  const card=e.target.closest('[data-study-tool]');if(!card||!context?.root)return;
  const item=items[Number(card.dataset.studyTool)];if(!item)return;
  const root=context.root,range=context.range&&root.contains(context.range.commonAncestorContainer)?context.range.cloneRange():null;
  if(item.symbols){
   close();const symbols=item.symbols.map(s=>`<button type="button" class="study-symbol-insert" data-study-symbol="${esc(s)}">${esc(s)}</button>`).join('');
   const holder=document.createElement('div');holder.className='study-symbol-popover';holder.innerHTML=`<div class="study-symbol-pop-head"><b>${item.title}</b><button type="button" aria-label="Đóng">×</button></div><div class="study-symbol-grid">${symbols}</div><small>Chọn một ký hiệu để chèn tại vị trí con trỏ.</small>`;
   document.body.append(holder);const rect=document.activeElement?.getBoundingClientRect?.();holder.style.top=Math.max(12,Math.min(innerHeight-220,(rect?.top||innerHeight/2)-100))+'px';holder.style.left='50%';holder.style.transform='translateX(-50%)';
   holder.addEventListener('click',ev=>{if(ev.target.matches('.study-symbol-pop-head button')){holder.remove();return;}const s=ev.target.closest('[data-study-symbol]')?.dataset.studySymbol;if(s){insertContent(root,range,esc(s)+' ');holder.remove();}});return;
  }
  insertContent(root,range,item.html);
 });
 function insertContent(root,range,html){
  if(!root?.isConnected){toast('Vị trí chèn không còn tồn tại.');return;}
  try{
   root.focus({preventScroll:true});
   let r=range&&root.contains(range.commonAncestorContainer)?range.cloneRange():null;
   if(!r){r=document.createRange();r.selectNodeContents(root);r.collapse(false);}
   const fragment=r.createContextualFragment(html),last=fragment.lastChild;
   r.deleteContents();r.insertNode(fragment);
   if(last&&last.isConnected){r.setStartAfter(last);r.collapse(true);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r);}
   root.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertFromPaste',data:null}));
   if(root.matches('.paper-page'))toast('Đã chèn học cụ vào vở.');else toast('Đã chèn học cụ vào nội dung.');
  }catch(err){console.error('Không thể chèn học cụ:',err);toast('Không thể chèn tại vị trí này. Hãy thử đặt lại con trỏ.');}
  close();
 }
 $('#studyToolsClose').onclick=close;$('#studyToolsCancel').onclick=close;
 modal.addEventListener('click',e=>{if(e.target===modal)close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('is-open'))close();});
}
function setupBloomMobileSidebar(){
 const sidebar=$('#sidebar'),scrim=$('#sidebarScrim'),menu=$('#menuBtn'),collapse=$('#sidebarCollapse');if(!sidebar||!scrim)return;
 const setCloseAffordance=()=>{if(collapse){collapse.innerHTML='<span>×</span>';collapse.title='Đóng thanh bên';collapse.setAttribute('aria-label','Đóng thanh bên');}};
 const close=()=>{sidebar.classList.remove('open');document.body.classList.remove('sidebar-mobile-open');menu?.setAttribute('aria-expanded','false');if(collapse){if(innerWidth<=980){collapse.innerHTML='<span>×</span>';collapse.title='Đóng thanh bên';collapse.setAttribute('aria-label','Đóng thanh bên');}else{const compact=sidebar.classList.contains('collapsed')||$('#appShell')?.classList.contains('sidebar-collapsed');collapse.innerHTML=compact?'<span>›</span>':'<span>‹</span>';collapse.title=compact?'Mở rộng thanh bên':'Thu gọn thanh bên';collapse.setAttribute('aria-label',collapse.title);}}};
 const open=()=>{sidebar.classList.add('open');document.body.classList.add('sidebar-mobile-open');menu?.setAttribute('aria-expanded','true');setCloseAffordance();};
 if(menu)menu.onclick=()=>sidebar.classList.contains('open')?close():open();
 scrim.onclick=close;
 // On mobile, the same visible toggle becomes an explicit close button. Capture
 // the click before setupSidebarCollapse's desktop preference handler runs.
 document.addEventListener('click',e=>{const btn=e.target.closest?.('#sidebarCollapse');if(btn&&innerWidth<=980){e.preventDefault();e.stopImmediatePropagation();close();}},true);
 document.addEventListener('click',e=>{if(e.target.closest('#tree .tree-select,#navHome,#navReview,#navNews'))close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 window.addEventListener('resize',()=>{if(innerWidth>980){close();if(collapse){collapse.innerHTML='<span>‹</span>';collapse.title='Thu gọn thanh bên';collapse.setAttribute('aria-label','Thu gọn thanh bên');}}},{passive:true});
}

// BLOOM v14 feature layer — additive; legacy notebook/question/review engines remain intact.
window.BLOOM_FEATURES=(()=>{
 const F=()=>{state.data.features ||= {tasks:[],events:[],ideas:[],links:[],trash:[],archive:[]};const f=state.data.features;for(const k of ['tasks','events','ideas','links','trash','archive'])if(!Array.isArray(f[k]))f[k]=[];return f;};
 const modeName=()=>({work:'Công việc',study:'Học tập',fun:'Giải trí',olympia:'Olympia'}[state.data.settings.activeMode]||'Học tập');
 const roots=()=>activeRoots();
 const all=()=>allProjectNodes(roots());
 const go=async page=>{if(!(await flushBeforeLeave()))return;state.page=page;state.selected=null;render();};
 const panel=(title,sub,actions='')=>`<div class="workspace-heading"><div class="title-block"><div class="title-context">BLOOM WORKSPACE</div><h1>${title}</h1><p>${sub||''}</p></div><div class="workspace-actions">${actions}</div></div>`;
 const empty=(icon,title,desc)=>`<div class="bloom-empty"><span>${icon}</span><b>${title}</b><small>${desc}</small></div>`;
 const btn=(label,action,cls='soft')=>`<button class="btn ${cls}" data-action="${action}">${label}</button>`;
 const escapeText=x=>esc(String(x??''));
 const saveAndRender=async(msg='Đã lưu thay đổi.')=>{
  if(await save()){render();if(msg)toast(msg);return true;}
  // A failed save must not leave a phantom mutation on screen that disappears on reload.
  if(state.persistedDataSnapshot)state.data=deepCopy(state.persistedDataSnapshot);
  applyAppearance();render();toast('Không lưu được. Thay đổi vừa rồi đã được hoàn tác; dữ liệu đã lưu trước đó vẫn được giữ.');return false;
 };
 const createOlympia=async(kind)=>{
  if(state.data.settings.activeMode!=='olympia'){toast('Hãy chuyển sang chế độ Olympia để tạo bộ câu hỏi.');return;}
  const existing=state.data.projects.find(n=>n.mode==='olympia'&&/^olympia\s*2026$/i.test(n.name.trim()));if(existing){state.selected=existing.id;state.page='home';state.nodeTab='notebook';render();toast('Bộ khung Olympia 2026 đã có sẵn.');return;}
  const specs={olympia:{name:'Olympia 2026',desc:'Không gian quản lý các bộ câu hỏi, bộ đề và tư liệu phục vụ Đường lên đỉnh Olympia 2026.',children:[['Ngân hàng câu hỏi theo lĩnh vực', [['Văn học'],['Lịch sử'],['Địa lí'],['Toán học'],['Vật lí'],['Hóa học'],['Sinh học'],['Tiếng Anh'],['Văn hóa – Nghệ thuật'],['Thể thao – Đời sống']]],['Bộ câu hỏi theo vòng thi', [['Khởi động'],['Vượt chướng ngại vật'],['Tăng tốc'],['Về đích']]],['Bộ đề và phiên luyện tập', [['Đề tổng hợp'],['Đề theo lĩnh vực'],['Đề mô phỏng']]],['Kiểm định câu hỏi', [['Cần kiểm chứng'],['Đã kiểm định'],['Nguồn tham khảo']]]]}};
  const spec=specs[kind];if(!spec)return;const root=makeNode(spec.name,spec.desc);root.mode='olympia';root.icon='🏆';root.color='violet';
  for(const [group,subs] of spec.children){const parent=makeNode(group,'');parent.icon='📚';for(const [name] of subs){const child=makeNode(name,'');child.icon='📁';parent.children.push(child);}root.children.push(parent);}state.data.projects.push(root);state.selected=root.id;state.page='home';state.nodeTab='notebook';const ok=await saveAndRender('Đã tạo mẫu '+spec.name+'. Bạn có thể nhập câu hỏi vào từng bộ riêng.');if(!ok){state.selected=null;state.page='home';render();}
 };
 const projectCards=(items=roots())=>items.map(n=>`<article class="bloom-project"><button class="bloom-fav" data-fav="${escapeText(n.id)}" title="${n.favorite?'Bỏ yêu thích':'Đánh dấu yêu thích'}" aria-label="${n.favorite?'Bỏ yêu thích':'Đánh dấu yêu thích'}">${n.favorite?'★':'☆'}</button><button class="bloom-project-open" data-project="${escapeText(n.id)}"><span class="bloom-project-icon">${escapeText(n.icon||'📁')}</span><b>${escapeText(n.name)}</b><small>${escapeText(n.description||'Chưa có mô tả')}</small><span class="bloom-project-meta">${(n.questions||[]).length} câu hỏi · ${(n.children||[]).length} mục con</span></button></article>`).join('');
 const renderHome=view=>{
  const mode=state.data.settings.activeMode,allRoots=state.data.projects,active=roots(),c=counts(active),f=F(),tasks=f.tasks.filter(t=>!t.done&&(!t.mode||t.mode===mode)),dueItems=visitQuestions(active).filter(x=>due(x.q));
  const modeKeys=['work','study','fun','olympia'],modeLabels=['Công việc','Học tập','Giải trí','Olympia'],modeIcons=['💼','📚','✨','🏆'];
  const allCounts=Object.fromEntries(modeKeys.map(m=>[m,counts(state.data.projects.filter(p=>p.mode===m))]));
  const rootFor=id=>pathOf(id)[0]||null;
  const crossLinks=f.links.map(l=>({link:l,a:find(l.from)?.node,b:find(l.to)?.node,ar:rootFor(l.from),br:rootFor(l.to)})).filter(x=>x.a&&x.b&&x.ar&&x.br&&x.ar.mode!==x.br.mode&&(x.ar.mode===mode||x.br.mode===mode)).slice(0,4);
  const fav=active.filter(x=>x.favorite),recent=[...active].sort((a,b)=>(Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0)).slice(0,4);
  const olympiaRoot=state.data.projects.find(n=>n.mode==='olympia'&&/^olympia\s*2026$/i.test(n.name.trim()));
  const templates=mode==='olympia'?`<section class="bloom-panel bloom-olympia-panel"><div class="bloom-olympia-copy"><div class="bloom-panel-head"><div><span class="bloom-olympia-kicker">OLYMPIA · TRI THỨC · BỨT PHÁ</span><h2>🏆 Bộ khung câu hỏi Olympia 2026</h2><p>Ngân hàng theo lĩnh vực, bộ câu hỏi theo vòng thi, đề mô phỏng và khu vực kiểm định nguồn.</p></div></div>${olympiaRoot?`<button class="bloom-template-open" data-project="${escapeText(olympiaRoot.id)}"><b>Tiếp tục bộ khung Olympia 2026</b><span>Mở ngân hàng và các bộ câu hỏi đã tạo →</span></button>`:`<div class="bloom-template-grid"><button data-template="olympia"><b>Tạo bộ khung Olympia 2026</b><small>Tạo cấu trúc dự án thực tế, sẵn sàng để thêm và phân loại câu hỏi.</small></button></div>`}</div><div class="bloom-olympia-art-stack"><img class="bloom-olympia-banner" src="assets/olympia-banner.webp" alt="Biểu trưng Olympia với vòng nguyệt quế, quyển sách và dấu hỏi" width="1254" height="1254" loading="lazy" decoding="async"><div class="bloom-olympia-mini-art"><img src="assets/olympia-torch.webp" alt="Ngọn đuốc tri thức Olympia" width="1254" height="1254" loading="lazy" decoding="async"><img src="assets/olympia-question.webp" alt="Biểu trưng câu hỏi và tri thức Olympia" width="1254" height="1254" loading="lazy" decoding="async"></div></div></section>`:'';
  const crossLinksHTML=`<section class="bloom-panel bloom-connections-panel"><div class="bloom-panel-head"><div><h2>Liên kết giữa các chế độ</h2><p>Các dự án vẫn thuộc không gian chính, nhưng có thể kết nối và mở qua lại ở mọi chế độ.</p></div><button class="text-action" data-open-knowledge>Quản lý liên kết →</button></div>${crossLinks.length?`<div class="bloom-cross-links">${crossLinks.map(({link,a,b,ar,br})=>`<div class="bloom-cross-link"><button data-open-connected="${escapeText(a.id)}"><small data-mode="${escapeText(ar.mode)}">${MODE_META[ar.mode]?.icon||'📁'} ${MODE_META[ar.mode]?.label||'Không gian'}</small><b>${escapeText(a.name)}</b></button><span class="bloom-cross-link-arrow">↔</span><button data-open-connected="${escapeText(b.id)}"><small data-mode="${escapeText(br.mode)}">${MODE_META[br.mode]?.icon||'📁'} ${MODE_META[br.mode]?.label||'Không gian'}</small><b>${escapeText(b.name)}</b></button><em>${escapeText(link.note||'Có liên kết')}</em></div>`).join('')}</div>`:empty('⛓','Chưa có liên kết khác chế độ','Dùng Bản đồ tri thức để kết nối dự án giữa Công việc, Học tập, Giải trí và Olympia.')}</section>`;
  view.innerHTML=`<section class="bloom-welcome"><div><span class="bloom-kicker">KHÔNG GIAN CÁ NHÂN</span><h1>Không gian của bạn</h1><p>Bốn chế độ, một nền dữ liệu liên kết. Đang xem nhanh ${modeName()}.</p></div><div class="bloom-welcome-mark"><img src="assets/studyspace-globe.webp" alt="Biểu trưng StudySpace BLOOM" width="112" height="112" decoding="async"></div></section><div class="bloom-mode-summary">${modeKeys.map((m,i)=>`<button data-switch-mode="${m}" data-mode="${m}" class="bloom-mode-tile ${mode===m?'current':''}"><span>${modeIcons[i]}</span><b>${modeLabels[i]}</b><strong>${allCounts[m].p}</strong><small>dự án</small></button>`).join('')}</div><div class="bloom-kpi-grid"><article><small>Dự án trong chế độ hiện tại</small><b>${c.p}</b></article><article><small>Câu hỏi</small><b>${c.q}</b></article><article><small>Việc chưa hoàn thành</small><b>${tasks.length}</b></article><article><small>Câu hỏi đến hạn</small><b>${dueItems.length}</b></article></div><div class="bloom-home-grid"><section class="bloom-panel"><div class="bloom-panel-head"><div><h2>Tiếp tục gần đây</h2><p>Mở nhanh những dự án thuộc ${modeName()}.</p></div><div class="bloom-head-actions"><button class="btn plain project-data-btn project-import-btn" data-action="import-project" title="Nhập dự án vào không gian hiện tại" aria-label="Nhập dự án">⇧</button>${btn('＋ Dự án mới','new-project','primary')}</div></div>${recent.length?`<div class="bloom-project-grid">${projectCards(recent)}</div>`:empty('📂','Chưa có dự án','Tạo dự án đầu tiên trong chế độ này.')}</section><section class="bloom-panel"><div class="bloom-panel-head"><div><h2>Việc cần chú ý</h2><p>Các nhiệm vụ chưa hoàn thành trong chế độ hiện tại.</p></div>${btn('Mở kế hoạch','open-tasks')}</div>${tasks.slice(0,5).map(t=>`<div class="bloom-list-row"><span>○</span><div><b>${escapeText(t.title)}</b><small>${escapeText(t.due||'Chưa đặt hạn')}</small></div></div>`).join('')||empty('✓','Chưa có nhiệm vụ tồn đọng','Bạn có thể tạo kế hoạch khi cần.')}</section></div>${templates}${crossLinksHTML}<section class="bloom-panel"><div class="bloom-panel-head"><div><h2>Dự án yêu thích</h2><p>Ghim những dự án thường xuyên sử dụng.</p></div></div>${fav.length?`<div class="bloom-favorite-list">${fav.map(n=>`<button data-project="${escapeText(n.id)}">★ ${escapeText(n.name)}</button>`).join('')}</div>`:empty('☆','Chưa có mục yêu thích','Nhấn ☆ trên thẻ dự án để ghim.')}</section><section class="bloom-panel bloom-library-manager"><div class="bloom-panel-head"><div><h2>Quản lý thư viện</h2><p>Chọn dự án trong chế độ hiện tại để thao tác cùng lúc.</p></div><div class="bloom-bulk-actions"><span class="bloom-bulk-count" id="bulkSelectedCount">0 đã chọn</span><button class="btn plain tiny" data-bulk="archive" disabled>Lưu trữ</button><button class="btn danger tiny" data-bulk="trash" disabled>Thùng rác</button></div></div><div class="bloom-bulk-toolbar"><label><input type="checkbox" id="bulkSelectAll"> <span>Chọn tất cả</span></label><small>${active.length} dự án trong ${modeName()}</small></div><div class="bloom-bulk-list">${active.map(n=>`<label class="bloom-bulk-item"><input type="checkbox" data-bulk-project="${escapeText(n.id)}"><span class="bloom-bulk-item-icon">${escapeText(n.icon||'📁')}</span><span class="bloom-bulk-item-copy"><b>${escapeText(n.name)}</b><small>${(n.questions||[]).length} câu hỏi · ${(n.children||[]).length} mục con</small></span><span class="bloom-bulk-item-arrow">›</span></label>`).join('')||empty('📁','Thư viện trống','Tạo dự án trong chế độ này để quản lý tại đây.')}</div></section>`;
  view.querySelectorAll('[data-project]').forEach(b=>b.onclick=async()=>{if(!(await flushBeforeLeave()))return;const id=b.dataset.project,root=pathOf(id)[0];if(!root)return;if(!(await changeActiveMode(root.mode||'study')))return;state.selected=id;state.page='home';state.nodeTab='notebook';render();});
  view.querySelectorAll('[data-open-connected]').forEach(b=>b.onclick=async()=>{if(!(await flushBeforeLeave()))return;const id=b.dataset.openConnected,root=pathOf(id)[0];if(!root)return;if(!(await changeActiveMode(root.mode||'study')))return;state.selected=id;state.page='home';state.nodeTab='notebook';render();});
  view.querySelector('[data-open-knowledge]')?.addEventListener('click',()=>go('knowledge'));
  view.querySelectorAll('[data-switch-mode]').forEach(b=>b.onclick=async()=>{const m=b.dataset.switchMode;if(!(await flushBeforeLeave()))return;if(!(await changeActiveMode(m)))return;state.selected=null;state.page='home';render();});
  view.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>createOlympia(b.dataset.template));
  view.querySelector('[data-action="new-project"]')?.addEventListener('click',()=>createNode(null));view.querySelector('[data-action="import-project"]')?.addEventListener('click',()=>chooseProjectImportFile(null));view.querySelector('[data-action="open-tasks"]')?.addEventListener('click',()=>go('tasks'));
  view.querySelectorAll('[data-fav]').forEach(b=>b.onclick=async()=>{const n=find(b.dataset.fav)?.node;if(!n)return;n.favorite=!n.favorite;await saveAndRender(n.favorite?'Đã ghim yêu thích.':'Đã bỏ yêu thích.');});
  const bulkChecks=[...view.querySelectorAll('[data-bulk-project]')],bulkSelectAll=view.querySelector('#bulkSelectAll'),bulkCount=view.querySelector('#bulkSelectedCount'),bulkButtons=[...view.querySelectorAll('[data-bulk]')];
  const syncBulkSelection=()=>{const count=bulkChecks.filter(x=>x.checked).length;if(bulkCount)bulkCount.textContent=count+' đã chọn';bulkButtons.forEach(b=>b.disabled=count===0);if(bulkSelectAll){bulkSelectAll.checked=count>0&&count===bulkChecks.length;bulkSelectAll.indeterminate=count>0&&count<bulkChecks.length;}};
  bulkChecks.forEach(x=>x.addEventListener('change',syncBulkSelection));
  if(bulkSelectAll)bulkSelectAll.addEventListener('change',()=>{bulkChecks.forEach(x=>x.checked=bulkSelectAll.checked);syncBulkSelection();});
  syncBulkSelection();
  bulkButtons.forEach(b=>b.onclick=async()=>{const ids=bulkChecks.filter(x=>x.checked).map(x=>x.dataset.bulkProject);if(!ids.length)return toast('Hãy chọn ít nhất một dự án.');const action=b.dataset.bulk;if(action==='trash'&&!confirm('Đưa '+ids.length+' dự án đã chọn vào thùng rác? Bạn vẫn có thể khôi phục sau đó.'))return;const f=F();for(const id of ids){const found=find(id);if(!found||found.parent)continue;const index=found.siblings.indexOf(found.node);if(index<0)continue;const [node]=found.siblings.splice(index,1);f[action==='archive'?'archive':'trash'].push({id:uid(),deletedAt:iso(),mode:node.mode||state.data.settings.activeMode,parentId:null,node:deepCopy(node)});}state.selected=null;await saveAndRender(action==='archive'?'Đã lưu trữ dự án đã chọn.':'Đã chuyển dự án vào thùng rác.');});
 };
 const renderPage=(page,view)=>{if(!['tasks','knowledge','ideas','stats','archive','appearance','practice'].includes(page))return false;const f=F();
  if(page==='tasks'){
   const mode=state.data.settings.activeMode,ts=f.tasks.filter(x=>!x.mode||x.mode===mode),events=f.events.filter(x=>!x.mode||x.mode===mode);
   view.innerHTML=panel('Kế hoạch & thời khóa biểu','Quản lý nhiệm vụ và lịch học/công việc trong chế độ hiện tại.',btn('＋ Nhiệm vụ','add-task','primary')+btn('＋ Sự kiện','add-event'))+`<div class="bloom-tabs"><button class="active" data-task-tab="tasks">Nhiệm vụ (${ts.length})</button><button data-task-tab="calendar">Lịch & thời khóa biểu (${events.length})</button></div><div id="bloomTaskContent"></div>`;
   const host=view.querySelector('#bloomTaskContent');let tab=state.taskTab==='calendar'?'calendar':'tasks';const draw=()=>{const today=localDateKey(),orderedTasks=ts.slice().sort((a,b)=>{if(a.done!==b.done)return a.done?1:-1;if(a.due&&b.due)return a.due.localeCompare(b.due);if(a.due)return -1;if(b.due)return 1;return (Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0);}),orderedEvents=events.slice().sort((a,b)=>{const ap=a.date&&a.date<today?1:0,bp=b.date&&b.date<today?1:0;return ap-bp||(a.date||'9999-99-99').localeCompare(b.date||'9999-99-99')||(a.time||'').localeCompare(b.time||'');});host.innerHTML=tab==='tasks'?`${orderedTasks.length?orderedTasks.map(t=>`<div class="bloom-task-row"><input type="checkbox" data-task-done="${escapeText(t.id)}" ${t.done?'checked':''}><div><b>${escapeText(t.title)}</b><small>${escapeText(t.note||'')}${t.due?' · Hạn '+escapeText(t.due)+(t.due<today&&!t.done?' · Quá hạn':''):''}</small></div><button class="icon-btn" data-task-edit="${escapeText(t.id)}" aria-label="Sửa nhiệm vụ" title="Sửa">✎</button><button class="icon-btn" data-task-delete="${escapeText(t.id)}" aria-label="Xóa nhiệm vụ" title="Xóa">×</button></div>`).join(''):empty('☑','Chưa có nhiệm vụ','Tạo nhiệm vụ để bắt đầu lập kế hoạch.')}`:`${orderedEvents.length?orderedEvents.map(e=>`<div class="bloom-task-row"><span class="bloom-date-chip">${escapeText(e.date||'—')}</span><div><b>${escapeText(e.title)}</b><small>${escapeText(e.time||'Cả ngày')} · ${escapeText(e.note||'')}${e.date&&e.date<today?' · Đã qua':''}</small></div><button class="icon-btn" data-event-edit="${escapeText(e.id)}" aria-label="Sửa sự kiện" title="Sửa">✎</button><button class="icon-btn" data-event-delete="${escapeText(e.id)}" aria-label="Xóa sự kiện" title="Xóa">×</button></div>`).join(''):empty('▦','Chưa có lịch','Thêm lịch học, lịch kiểm tra hoặc mốc quan trọng.')}`;host.querySelectorAll('[data-task-done]').forEach(x=>x.onchange=async()=>{const t=f.tasks.find(t=>t.id===x.dataset.taskDone);if(t){t.done=x.checked;await saveAndRender('Đã cập nhật nhiệm vụ.');}});host.querySelectorAll('[data-task-edit]').forEach(x=>x.onclick=()=>{const t=f.tasks.find(t=>t.id===x.dataset.taskEdit);if(!t)return;modal('Chỉnh sửa nhiệm vụ',formField('Tên nhiệm vụ','title','Tên nhiệm vụ',t.title)+formField('Hạn hoàn thành','due','',t.due||'','date')+formField('Ghi chú','note','Nội dung cần thực hiện...',t.note||'','textarea'),async form=>{const title=String(form.get('title')||'').trim(),dueValue=String(form.get('due')||'');if(!title){toast('Hãy nhập tên nhiệm vụ.');return false;}if(dueValue&&!isValidDateKey(dueValue)){toast('Ngày hạn không hợp lệ.');return false;}t.title=title;t.due=dueValue;t.note=String(form.get('note')||'').trim();t.updatedAt=iso();return await saveAndRender('Đã cập nhật nhiệm vụ.');},'Lưu nhiệm vụ');});host.querySelectorAll('[data-task-delete]').forEach(x=>x.onclick=async()=>{if(!confirm('Xóa nhiệm vụ này?'))return;f.tasks=f.tasks.filter(t=>t.id!==x.dataset.taskDelete);await saveAndRender('Đã xóa nhiệm vụ.');});host.querySelectorAll('[data-event-edit]').forEach(x=>x.onclick=()=>{const ev=f.events.find(e=>e.id===x.dataset.eventEdit);if(!ev)return;modal('Chỉnh sửa sự kiện',formField('Tên sự kiện / buổi học','title','Tên sự kiện',ev.title)+formField('Ngày','date','',ev.date||localDateKey(),'date')+formField('Thời gian','time','Ví dụ: 19:00–20:30',ev.time||'')+formField('Ghi chú','note','Phòng học, nội dung chuẩn bị...',ev.note||'','textarea'),async form=>{const title=String(form.get('title')||'').trim(),date=String(form.get('date')||'');if(!title||!isValidDateKey(date)){toast('Hãy nhập tên sự kiện và một ngày hợp lệ.');return false;}ev.title=title;ev.date=date;ev.time=String(form.get('time')||'').trim();ev.note=String(form.get('note')||'').trim();ev.updatedAt=iso();return await saveAndRender('Đã cập nhật sự kiện.');},'Lưu sự kiện');});host.querySelectorAll('[data-event-delete]').forEach(x=>x.onclick=async()=>{if(!confirm('Xóa sự kiện này?'))return;f.events=f.events.filter(t=>t.id!==x.dataset.eventDelete);await saveAndRender('Đã xóa sự kiện.');});};draw();view.querySelectorAll('[data-task-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.taskTab;state.taskTab=tab;view.querySelectorAll('[data-task-tab]').forEach(x=>x.classList.toggle('active',x===b));draw();});view.querySelector('[data-action="add-task"]').onclick=()=>{state.taskTab='tasks';modal('Tạo nhiệm vụ',formField('Tên nhiệm vụ','title','Ví dụ: Ôn tập chương Dao động')+formField('Hạn hoàn thành','due','',localDateKey(),'date')+formField('Ghi chú','note','Nội dung cần thực hiện...','','textarea'),async form=>{const title=String(form.get('title')||'').trim(),dueValue=String(form.get('due')||'');if(!title){toast('Hãy nhập tên nhiệm vụ.');return false;}if(dueValue&&!isValidDateKey(dueValue)){toast('Ngày hạn không hợp lệ.');return false;}f.tasks.push({id:uid(),title,due:dueValue,note:String(form.get('note')||'').trim(),done:false,mode:state.data.settings.activeMode,createdAt:iso()});return await saveAndRender('Đã thêm nhiệm vụ.');},'Tạo nhiệm vụ');};view.querySelector('[data-action="add-event"]').onclick=()=>{state.taskTab='calendar';modal('Thêm vào lịch',formField('Tên sự kiện / buổi học','title','Ví dụ: Kiểm tra Vật lí')+formField('Ngày','date','',localDateKey(),'date')+formField('Thời gian','time','Ví dụ: 19:00–20:30')+formField('Ghi chú','note','Phòng học, nội dung chuẩn bị...','','textarea'),async form=>{const title=String(form.get('title')||'').trim(),date=String(form.get('date')||'');if(!title||!isValidDateKey(date)){toast('Hãy nhập tên sự kiện và một ngày hợp lệ.');return false;}f.events.push({id:uid(),title,date,time:String(form.get('time')||'').trim(),note:String(form.get('note')||'').trim(),mode:state.data.settings.activeMode});return await saveAndRender('Đã thêm vào lịch.');},'Thêm sự kiện');};return true;
  }
  if(page==='ideas'){
   view.innerHTML=panel('Không gian ý tưởng','Lưu những ý tưởng, tư liệu và cảm hứng cá nhân.',btn('＋ Ý tưởng mới','add-idea','primary'))+`<div class="bloom-idea-grid">${f.ideas.filter(x=>!x.mode||x.mode===state.data.settings.activeMode).map(i=>`<article class="bloom-idea"><div><span>${escapeText(i.icon||'✦')}</span><span class="bloom-idea-actions"><button data-idea-edit="${escapeText(i.id)}" aria-label="Sửa ý tưởng" title="Sửa">✎</button><button data-idea-del="${escapeText(i.id)}" aria-label="Xóa ý tưởng" title="Xóa">×</button></span></div><h3>${escapeText(i.title)}</h3><p>${escapeText(i.body)}</p><small>${escapeText(i.tag||'Chưa phân loại')}</small></article>`).join('')||empty('✦','Chưa có ý tưởng','Tạo thẻ đầu tiên để lưu lại điều bạn muốn phát triển.')}</div>`;
   view.querySelector('[data-action="add-idea"]').onclick=()=>modal('Tạo thẻ ý tưởng',formField('Tên ý tưởng','title','Ví dụ: Xây dựng bộ câu hỏi mới')+formField('Nội dung','body','Ghi lại ý tưởng, tư liệu hoặc điều cần phát triển...','','textarea')+formField('Nhãn phân loại','tag','Ví dụ: Sáng tạo','Ý tưởng'),async form=>{const title=String(form.get('title')||'').trim();if(!title){toast('Hãy nhập tên ý tưởng.');return false;}f.ideas.push({id:uid(),title,body:String(form.get('body')||'').trim(),tag:String(form.get('tag')||'Ý tưởng').trim()||'Ý tưởng',icon:'✦',mode:state.data.settings.activeMode,createdAt:iso()});return await saveAndRender('Đã lưu ý tưởng.');},'Lưu ý tưởng');view.querySelectorAll('[data-idea-edit]').forEach(b=>b.onclick=()=>{const idea=f.ideas.find(x=>x.id===b.dataset.ideaEdit);if(!idea)return;modal('Chỉnh sửa ý tưởng',formField('Tên ý tưởng','title','Tên ý tưởng',idea.title)+formField('Nội dung','body','Ghi lại ý tưởng...',idea.body||'','textarea')+formField('Nhãn phân loại','tag','Ví dụ: Sáng tạo',idea.tag||'Ý tưởng'),async form=>{const title=String(form.get('title')||'').trim();if(!title){toast('Hãy nhập tên ý tưởng.');return false;}idea.title=title;idea.body=String(form.get('body')||'').trim();idea.tag=String(form.get('tag')||'Ý tưởng').trim()||'Ý tưởng';idea.updatedAt=iso();return await saveAndRender('Đã cập nhật ý tưởng.');},'Lưu ý tưởng');});view.querySelectorAll('[data-idea-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Xóa ý tưởng này?'))return;f.ideas=f.ideas.filter(x=>x.id!==b.dataset.ideaDel);await saveAndRender('Đã xóa ý tưởng.');});return true;
  }
  if(page==='knowledge'){
   const nodes=allProjectNodes();const modeOf=id=>{const r=pathOf(id)[0];return r?.mode||'study';};const modeLabel=id=>MODE_META[modeOf(id)]||MODE_META.study;
   view.innerHTML=panel('Bản đồ tri thức','Kết nối dự án, môn học, câu hỏi và bộ sưu tập giữa cả bốn chế độ.',btn('＋ Tạo liên kết','add-link','primary'))+`<div class="bloom-panel bloom-connections-panel"><div class="bloom-panel-head"><div><h2>Mạng lưới liên kết toàn BLOOM</h2><p>Chọn nội dung ở bất kỳ chế độ nào. Liên kết không di chuyển hay sao chép dữ liệu gốc.</p></div><span class="bloom-link-total">${f.links.length} liên kết</span></div>${f.links.map(l=>{const a=find(l.from)?.node,b=find(l.to)?.node,am=modeLabel(l.from),bm=modeLabel(l.to);return `<div class="bloom-link-row bloom-cross-link-row"><button class="bloom-link-end" data-open-linked="${escapeText(l.from)}"><small data-mode="${modeOf(l.from)}">${am.icon} ${am.label}</small><b>${escapeText(a?.name||l.fromName||'Nguồn đã lưu trữ')}</b></button><span class="bloom-link-connector">↔</span><button class="bloom-link-end" data-open-linked="${escapeText(l.to)}"><small data-mode="${modeOf(l.to)}">${bm.icon} ${bm.label}</small><b>${escapeText(b?.name||l.toName||'Đích đã lưu trữ')}</b></button><small class="bloom-link-note">${escapeText(l.note||'')}</small><button class="icon-btn bloom-link-delete" title="Xóa liên kết" data-link-del="${escapeText(l.id)}">×</button></div>`;}).join('')||empty('⛓','Chưa có liên kết','Tạo liên kết đầu tiên để kết nối dự án giữa Công việc, Học tập, Giải trí và Olympia.')}</div>`;
   view.querySelector('[data-action="add-link"]').onclick=()=>{if(nodes.length<2)return toast('Cần ít nhất hai dự án trong BLOOM.');const options=nodes.map(n=>{const root=pathOf(n.id)[0],meta=MODE_META[root?.mode||'study']||MODE_META.study;return `<option value="${escapeText(n.id)}">${meta.icon} ${meta.label} · ${escapeText(n.name)}</option>`;}).join('');const source=`<div class="field"><label for="linkFrom">Nội dung nguồn</label><select id="linkFrom" name="from">${options}</select></div>`,target=`<div class="field"><label for="linkTo">Nội dung liên quan</label><select id="linkTo" name="to">${options}</select></div>`;modal('Tạo liên kết toàn BLOOM',source+target+formField('Mối liên hệ','note','Ví dụ: Kiến thức nền cho / liên quan đến / cùng chủ đề với...'),async form=>{const from=String(form.get('from')||''),to=String(form.get('to')||'');if(!from||!to||from===to){toast('Hãy chọn hai nội dung khác nhau.');return false;}if(f.links.some(link=>(link.from===from&&link.to===to)||(link.from===to&&link.to===from))){toast('Hai nội dung này đã được liên kết. Hãy chỉnh sửa hoặc xóa liên kết cũ trước.');return false;}const a=pathOf(from)[0],b=pathOf(to)[0];f.links.push({id:uid(),from,to,fromMode:a?.mode||'study',toMode:b?.mode||'study',note:String(form.get('note')||'').trim(),createdAt:iso()});return await saveAndRender('Đã tạo liên kết giữa các chế độ.');},'Tạo liên kết');};
   view.querySelectorAll('[data-open-linked]').forEach(b=>b.onclick=async()=>{if(!(await flushBeforeLeave()))return;const id=b.dataset.openLinked,root=pathOf(id)[0];if(!root)return;if(!(await changeActiveMode(root.mode||'study')))return;state.selected=id;state.page='home';state.nodeTab='notebook';render();});
   view.querySelectorAll('[data-link-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Xóa mối liên kết này? Dự án và dữ liệu gốc không bị xóa.'))return;f.links=f.links.filter(l=>l.id!==b.dataset.linkDel);await saveAndRender('Đã xóa liên kết.');});return true;
  }
  if(page==='stats'){
   const c=counts(roots()),items=visitQuestions(roots()),today=localDateKey(),reviewed=items.filter(x=>x.q.review?.lastReviewDate===today).length,done30=items.filter(x=>hasCompletedMilestone(x.q,30)).length,done100=items.filter(x=>hasCompletedMilestone(x.q,100)).length,done365=items.filter(x=>hasCompletedMilestone(x.q,365)).length,doneTasks=f.tasks.filter(t=>(!t.mode||t.mode===state.data.settings.activeMode)&&t.done).length,totalTasks=f.tasks.filter(t=>!t.mode||t.mode===state.data.settings.activeMode).length;
   view.innerHTML=panel('Thống kê học tập & hoạt động','Chỉ số được tính từ dữ liệu hiện có trong chế độ '+modeName()+'.')+`<div class="bloom-kpi-grid"><article><small>Dự án</small><b>${c.p}</b></article><article><small>Câu hỏi</small><b>${c.q}</b></article><article><small>Đã ôn hôm nay</small><b>${reviewed}</b></article><article><small>Nhiệm vụ hoàn thành</small><b>${doneTasks}/${totalTasks}</b></article></div><div class="bloom-panel"><div class="bloom-panel-head"><div><h2>Các mốc ghi nhớ</h2><p>Thống kê theo trạng thái chu kỳ ôn tập hiện có, không thay đổi thuật toán.</p></div></div><div class="bloom-milestones"><div><b>${done30}</b><small>Mốc 30 ngày</small></div><div><b>${done100}</b><small>Mốc 100 ngày</small></div><div><b>${done365}</b><small>Mốc 365 ngày</small></div></div><div class="bloom-note">Số liệu phản ánh dữ liệu đang lưu; BLOOM không suy đoán thời gian học nếu chưa được ghi nhận.</div></div>`;return true;
  }
  if(page==='archive'){
   const renderBucket=(key,title)=>`<section class="bloom-panel"><div class="bloom-panel-head"><div><h2>${title}</h2><p>${f[key].length} mục</p></div></div>${f[key].map(r=>`<div class="bloom-task-row"><span>${escapeText(r.node?.icon||'📁')}</span><div><b>${escapeText(r.node?.name||'Dự án')}</b><small>${escapeText(r.mode||'study')} · ${escapeText(r.deletedAt||'')}</small></div><button class="btn plain tiny" data-restore="${key}:${escapeText(r.id)}">Khôi phục</button><button class="icon-btn" data-purge="${key}:${escapeText(r.id)}">×</button></div>`).join('')||empty(key==='trash'?'🗑':'▤',key==='trash'?'Thùng rác trống':'Chưa có dự án lưu trữ',key==='trash'?'Dự án bị xóa sẽ xuất hiện tại đây.':'Lưu trữ dự án không còn sử dụng thường xuyên.')}</section>`;
   view.innerHTML=panel('Lưu trữ & thùng rác','Quản lý dự án đã cất hoặc đã xóa.')+renderBucket('archive','Kho lưu trữ')+renderBucket('trash','Thùng rác');view.querySelectorAll('[data-restore]').forEach(b=>b.onclick=async()=>{const [key,id]=b.dataset.restore.split(':');const ix=f[key].findIndex(x=>x.id===id);if(ix<0)return;const rec=f[key][ix];if(!rec.node)return;const parent=rec.parentId?find(rec.parentId):null;if(parent&&validateMoveNode(rec.node.id,parent.node.id)){setProjectTreeMode(rec.node,pathOf(parent.node.id)[0]?.mode||parent.node.mode||rec.mode||state.data.settings.activeMode);parent.node.children.push(rec.node);}else{setProjectTreeMode(rec.node,rec.mode||state.data.settings.activeMode);state.data.projects.push(rec.node);}f[key].splice(ix,1);await saveAndRender('Đã khôi phục dự án.');});view.querySelectorAll('[data-purge]').forEach(b=>b.onclick=async()=>{const [key,id]=b.dataset.purge.split(':');if(!confirm('Xóa vĩnh viễn mục này? Thao tác không thể hoàn tác.'))return;const record=f[key].find(x=>x.id===id),purgedIds=new Set();const collect=node=>{if(!node||purgedIds.has(node.id))return;purgedIds.add(node.id);for(const child of node.children||[])collect(child);};collect(record?.node);f[key]=f[key].filter(x=>x.id!==id);if(purgedIds.size)f.links=f.links.filter(link=>!purgedIds.has(link.from)&&!purgedIds.has(link.to));await saveAndRender('Đã xóa vĩnh viễn.');});return true;
  }
  if(page==='appearance'){
   const s=state.data.settings;view.innerHTML=panel('Tùy chỉnh giao diện','Điều chỉnh màu sắc và mật độ hiển thị. Các lựa chọn được lưu cùng dữ liệu BLOOM.')+`<div class="bloom-panel"><h2>Màu nhấn</h2><div class="bloom-swatches">${[['blue','Xanh dương'],['teal','Xanh ngọc'],['violet','Tím'],['amber','Vàng'],['rose','Hồng']].map(([v,l])=>`<button class="bloom-swatch ${s.accent===v?'active':''}" data-accent="${v}"><i class="swatch-${v}"></i>${l}</button>`).join('')}</div><h2>Mật độ bố cục</h2><div class="bloom-choice-row">${[['comfortable','Thoáng vừa phải'],['compact','Gọn'],['spacious','Rộng rãi']].map(([v,l])=>`<button class="btn ${s.density===v?'primary':'plain'}" data-density="${v}">${l}</button>`).join('')}</div><div class="bloom-note">Màu nhấn và mật độ chỉ thay đổi phần giao diện BLOOM; không tác động đến màu sắc và định dạng trang vở đã lưu.</div></div>`;view.querySelectorAll('[data-accent]').forEach(b=>b.onclick=async()=>{s.accent=b.dataset.accent;applyAppearance();await saveAndRender('Đã đổi màu giao diện.');});view.querySelectorAll('[data-density]').forEach(b=>b.onclick=async()=>{s.density=b.dataset.density;applyAppearance();await saveAndRender('Đã đổi mật độ giao diện.');});return true;
  }
  if(page==='practice'){
   const items=visitQuestions(roots()),dueItems=items.filter(x=>due(x.q)),done=items.filter(x=>hasCompletedMilestone(x.q,30)).length;view.innerHTML=panel('Trung tâm luyện tập','Tổ chức đường vào các công cụ luyện tập hiện có, giữ nguyên chu kỳ và quy tắc đánh giá.')+`<div class="bloom-kpi-grid"><article><small>Tổng câu hỏi</small><b>${items.length}</b></article><article><small>Đến hạn</small><b>${dueItems.length}</b></article><article><small>Đã đạt mốc 30 ngày</small><b>${done}</b></article><article><small>Chưa bắt đầu</small><b>${items.filter(x=>!x.q.review?.next).length}</b></article></div><div class="bloom-panel"><div class="bloom-panel-head"><div><h2>Luyện tập theo dự án</h2><p>Chọn dự án để mở ngân hàng câu hỏi gốc.</p></div><button class="btn primary" id="practiceReview">Mở lịch ôn tập</button></div>${roots().map(n=>`<button class="bloom-practice-project" data-practice-project="${escapeText(n.id)}"><b>${escapeText(n.name)}</b><small>${(n.questions||[]).length} câu hỏi trực tiếp · ${escapeText(n.description||'')}</small><span>→</span></button>`).join('')||empty('📚','Chưa có ngân hàng câu hỏi','Tạo dự án rồi thêm câu hỏi để luyện tập.')}</div>`;view.querySelector('#practiceReview').onclick=()=>go('review');view.querySelectorAll('[data-practice-project]').forEach(b=>b.onclick=async()=>{state.selected=b.dataset.practiceProject;state.page='home';state.nodeTab='questions';if(await flushBeforeLeave())render();});return true;
  }
  return false;
 };
 const applyAppearance=()=>{const s=state.data.settings,root=document.documentElement;root.dataset.accent=s.accent||'blue';root.dataset.density=s.density||'comfortable';};
 const bind=()=>{
  document.querySelectorAll('[data-bloom-page]').forEach(b=>b.onclick=()=>go(b.dataset.bloomPage));
  const oldHome=$('#navHome');if(oldHome)oldHome.onclick=()=>go('home');
  const oldReview=$('#navReview');if(oldReview)oldReview.onclick=()=>go('review');
 };
 applyAppearance();document.addEventListener('DOMContentLoaded',bind);setTimeout(bind,0);
 return {renderPage,renderHome,applyAppearance,bind};
})();

function closeTopbarMenus(except=null){
  document.querySelectorAll('.top-dropdown').forEach(w=>{
    if(w===except)return;
    w.classList.remove('open');
    const b=w.querySelector('.topbar-icon-btn'),m=w.querySelector('.topbar-dropdown');
    if(b)b.setAttribute('aria-expanded','false');
    if(m)m.hidden=true;
  });
}
function updateTopbarMenuState(){
  const mode=state.data.settings.activeMode||'study';
  const meta=MODE_META[mode]||MODE_META.study;
  const btn=$('#spaceMenuBtn');
  if(btn){btn.dataset.activeMode=mode;btn.title='Không gian hiện tại: '+meta.label;btn.setAttribute('aria-label','Không gian hiện tại: '+meta.label+'. Mở để chuyển chế độ.');}
  document.documentElement.dataset.activeMode=mode;
  const chip=$('#activeModeChip'),symbol=$('#activeModeSymbol'),label=$('#activeModeLabel');
  if(chip){chip.dataset.mode=mode;chip.title='Bạn đang ở chế độ '+meta.label;}if(symbol)symbol.textContent=meta.icon;if(label)label.textContent=meta.label;
  const activePage=state.page;
  $$('#toolsMenu [data-bloom-page]').forEach(b=>b.classList.toggle('active',b.dataset.bloomPage===activePage));
}
function setupTopbarMenus(){
  const pairs=[['spaceMenuBtn','spaceDropdown','spaceMenu'],['toolsMenuBtn','toolsDropdown','toolsMenu']];
  pairs.forEach(([buttonId,wrapId,menuId])=>{
    const button=$('#'+buttonId),wrap=$('#'+wrapId),menu=$('#'+menuId);if(!button||!wrap||!menu)return;
    button.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      const willOpen=menu.hidden;closeTopbarMenus(willOpen?wrap:null);
      menu.hidden=!willOpen;wrap.classList.toggle('open',willOpen);button.setAttribute('aria-expanded',String(willOpen));
    });
  });
  document.addEventListener('click',e=>{
    if(e.target.closest('.top-dropdown')){
      if(e.target.closest('.mode-btn,[data-bloom-page]'))closeTopbarMenus();
      return;
    }
    closeTopbarMenus();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeTopbarMenus();});
  updateTopbarMenuState();
}

/* ===================== BLOOM V20 COMMAND CENTER ===================== */
function bloomV20Fold(value){return String(value??'').toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');}
function bloomV20ModeLabel(mode){return (MODE_META[mode]||MODE_META.study).label;}
function globalSearchResults(query){
 const host=$('#globalSearchResults');if(!host)return;
 const term=String(query||'').trim(),folded=bloomV20Fold(term);
 if(folded.length<2){host.classList.add('hidden');host.innerHTML='';state.globalSearchItems=[];return;}
 const results=[],features=state.data.features||{};
 const add=(kind,id,title,detail='',sub='',mode='study',extra='')=>{
  const hay=bloomV20Fold([title,detail,extra].join(' '));if(!hay.includes(folded))return;
  const titleFold=bloomV20Fold(title);let score=0;
  if(titleFold===folded)score+=100;if(titleFold.startsWith(folded))score+=55;else if(titleFold.includes(folded))score+=30;
  if(bloomV20Fold(detail).includes(folded))score+=10;
  results.push({kind,id:String(id??''),title:String(title||''),detail:String(detail||''),sub:String(sub||''),mode,score});
 };
 // Projects, notebook pages and the complete question bank across all modes.
 for(const n of allProjectNodes()){
  const root=pathOf(n.id)[0],mode=root?.mode||n.mode||'study',path=bloomV20ModeLabel(mode)+' · '+pathOf(n.id).map(x=>x.name).join(' / ');
  add('project',n.id,'📁 '+n.name,path,'',mode,n.description||'');
  (n.notePages||[]).forEach((pg,i)=>add('note',n.id,'📖 '+n.name+' · Trang '+(i+1),path+' · '+projectText(pg.html).slice(0,145),String(i),mode,projectText(pg.html)));
  for(const q of n.questions||[])add('question',n.id,'❓ '+(q.question||'Câu hỏi'),path+' · '+(q.tags||[]).join(', '),q.id,mode,q.answer||'');
 }
 // Personal workflow records that were not indexed by the original search.
 for(const t of features.tasks||[])add('task',t.id,'☑ '+t.title,bloomV20ModeLabel(t.mode||state.data.settings.activeMode||'study')+' · '+(t.done?'Đã hoàn thành':'Chưa hoàn thành')+(t.due?' · Hạn '+t.due:''),'',t.mode||state.data.settings.activeMode||'study',t.note||'');
 for(const ev of features.events||[])add('event',ev.id,'▦ '+ev.title,bloomV20ModeLabel(ev.mode||state.data.settings.activeMode||'study')+' · '+(ev.date||'Chưa đặt ngày')+(ev.time?' · '+ev.time:''),'',ev.mode||state.data.settings.activeMode||'study',ev.note||'');
 for(const idea of features.ideas||[])add('idea',idea.id,'✦ '+idea.title,bloomV20ModeLabel(idea.mode||state.data.settings.activeMode||'study')+' · '+(idea.tag||'Ý tưởng'),' ',idea.mode||state.data.settings.activeMode||'study',idea.body||'');
 for(const link of features.links||[]){const a=find(link.from)?.node,b=find(link.to)?.node;const label=(a?.name||link.fromName||'Nguồn')+' ↔ '+(b?.name||link.toName||'Đích');add('link',link.id,'⛓ '+label,'Bản đồ tri thức · '+(link.note||'Liên kết giữa các nội dung'),'',state.data.settings.activeMode||'study',link.note||'');}
 for(const [date,entry] of Object.entries(state.data.newsEntries||{})){const text=(entry.notePages||[]).map(pg=>projectText(pg.html)).join(' ');add('news',date,'🗓️ Tin tức · '+date.split('-').reverse().join('/'),text.slice(0,150),'',state.data.settings.activeMode||'study',text);}
 for(const bucket of ['archive','trash'])for(const rec of features[bucket]||[]){
  const node=rec.node;if(!node)continue;
  const mode=rec.mode||node.mode||'study';
  const visit=(item,isRoot=false)=>{add(bucket,rec.id,(bucket==='trash'?'🗑 ':'▤ ')+item.name,bloomV20ModeLabel(mode)+' · '+(bucket==='trash'?'Thùng rác':'Kho lưu trữ'),item.id,mode,item.description||'');for(const child of item.children||[])visit(child,false);};visit(node,true);
 }
 results.sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title,'vi'));
 state.globalSearchItems=results.slice(0,30);
 const labels={project:'Dự án',note:'Trang vở',question:'Câu hỏi',task:'Nhiệm vụ',event:'Lịch',idea:'Ý tưởng',link:'Liên kết',news:'Tin tức',archive:'Lưu trữ',trash:'Thùng rác'};
 host.innerHTML=state.globalSearchItems.length?state.globalSearchItems.map((r,i)=>`<button type="button" class="global-result" data-global-index="${i}" aria-selected="${i===0?'true':'false'}"><b>${esc(r.title)}<span class="b20-search-kind">${labels[r.kind]||'Nội dung'}</span></b><small>${esc(r.detail||'')}</small></button>`).join(''):'<div class="global-search-empty">Không tìm thấy nội dung phù hợp trong BLOOM.</div>';
 host.classList.remove('hidden');host.setAttribute('role','listbox');host.setAttribute('aria-label','Kết quả tìm kiếm');
}
async function bloomV20OpenSearchResult(index){
 const r=state.globalSearchItems?.[index];if(!r)return;
 if(!(await flushBeforeLeave()))return;
 const oldMode=state.data.settings.activeMode||'study';
 if(r.mode&&r.mode!==oldMode){if(!(await changeActiveMode(r.mode)))return;}
 if(r.kind==='news'){
  const previous=state.data.settings.lastNewsDate;state.data.settings.lastNewsDate=r.id;
  if(!await save()){state.data.settings.lastNewsDate=previous;return;}
  state.newsDate=r.id;state.newsMonth=r.id.slice(0,7);state.page='news';state.selected=null;
 }else if(['project','note','question'].includes(r.kind)){
  state.selected=r.id;state.page='home';state.nodeTab=r.kind==='question'?'questions':'notebook';
  if(r.kind==='note')state.jumpToPage=Math.max(0,Number(r.sub)||0);
  if(r.kind==='question'){state.revealQuestionId=r.sub;state.questionFilters={nodeId:r.id,query:'',status:'all',tag:'all'};}
 }else if(r.kind==='task'||r.kind==='event'){
  state.selected=null;state.page='tasks';state.taskTab=r.kind==='event'?'calendar':'tasks';state.bloomV20Highlight={kind:r.kind,id:r.id};
 }else if(r.kind==='idea'){
  state.selected=null;state.page='ideas';state.bloomV20Highlight={kind:'idea',id:r.id,title:r.title.replace(/^✦\s*/, '')};
 }else if(r.kind==='link'){
  state.selected=null;state.page='knowledge';state.bloomV20Highlight={kind:'link',id:r.id};
 }else if(r.kind==='archive'||r.kind==='trash'){
  state.selected=null;state.page='archive';state.bloomV20Highlight={kind:r.kind,id:r.id};
 }
 const input=$('#globalSearch'),host=$('#globalSearchResults');if(host){host.classList.add('hidden');host.innerHTML='';}if(input)input.value='';
 render();
 const mark=()=>{
  const h=state.bloomV20Highlight;if(!h)return;let el=null;
  if(h.kind==='task')el=[...document.querySelectorAll('[data-task-done]')].find(x=>x.dataset.taskDone===h.id)?.closest('.bloom-task-row');
  if(h.kind==='event'){
   document.querySelector('[data-task-tab="calendar"]')?.click();
   el=[...document.querySelectorAll('[data-event-delete]')].find(x=>x.dataset.eventDelete===h.id)?.closest('.bloom-task-row');
  }
  if(h.kind==='idea')el=[...document.querySelectorAll('.bloom-idea')].find(x=>x.querySelector('h3')?.textContent===h.title);
  if(h.kind==='link')el=[...document.querySelectorAll('[data-link-del]')].find(x=>x.dataset.linkDel===h.id)?.closest('.bloom-link-row');
  if(h.kind==='archive'||h.kind==='trash')el=[...document.querySelectorAll('[data-restore],[data-purge]')].find(x=>x.dataset.restore?.endsWith(':'+h.id)||x.dataset.purge?.endsWith(':'+h.id))?.closest('.bloom-task-row');
  if(el){el.classList.add('b20-search-hit');el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});}
  state.bloomV20Highlight=null;
 };
 if(r.kind==='event')setTimeout(mark,60);else setTimeout(mark,0);
}
function bindGlobalSearch(){
 const input=$('#globalSearch'),host=$('#globalSearchResults');if(!input||!host)return;let timer=null,active=-1;
 input.setAttribute('aria-controls','globalSearchResults');input.setAttribute('aria-expanded','false');input.placeholder='Tìm dự án, trang vở, câu hỏi, lịch…  Ctrl K';
 const sync=()=>{const rows=$$('[data-global-index]',host);rows.forEach((b,i)=>{b.classList.toggle('b20-search-active',i===active);b.setAttribute('aria-selected',String(i===active));});const selected=rows[active];selected?.scrollIntoView({block:'nearest'});};
 input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{globalSearchResults(input.value);active=state.globalSearchItems?.length?0:-1;sync();input.setAttribute('aria-expanded',String(!host.classList.contains('hidden')));},120);});
 input.addEventListener('keydown',async e=>{
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
   const rows=$$('[data-global-index]',host);if(!rows.length)return;e.preventDefault();active=(active+(e.key==='ArrowDown'?1:-1)+rows.length)%rows.length;sync();
  }else if(e.key==='Enter'){
   e.preventDefault();clearTimeout(timer);if(host.classList.contains('hidden'))globalSearchResults(input.value);const rows=$$('[data-global-index]',host);const idx=active>=0?active:0;if(rows[idx])await bloomV20OpenSearchResult(idx);
  }else if(e.key==='Escape'){host.classList.add('hidden');input.setAttribute('aria-expanded','false');input.blur();}
 });
 host.addEventListener('mousemove',e=>{const row=e.target.closest('[data-global-index]');if(row){active=Number(row.dataset.globalIndex);sync();}});
 host.addEventListener('click',async e=>{const row=e.target.closest('[data-global-index]');if(row)await bloomV20OpenSearchResult(Number(row.dataset.globalIndex));});
 document.addEventListener('click',e=>{if(!e.target.closest('.global-search-wrap')){host.classList.add('hidden');input.setAttribute('aria-expanded','false');}});
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='k'){e.preventDefault();input.focus();input.select();}if(e.key==='Escape'&&!document.querySelector('#bloomCommandCenter:not([hidden])')){host.classList.add('hidden');input.setAttribute('aria-expanded','false');}});
}
function setupBloomV20CommandCenter(){
 if($('#bloomCommandCenter'))return;
 const top=document.querySelector('.toolbar-utility-group')||document.querySelector('.top-actions');if(top){const command=document.createElement('button');command.id='bloomCommandBtn';command.type='button';command.title='Bảng lệnh nhanh · Ctrl + Alt + P';command.setAttribute('aria-label','Mở bảng lệnh nhanh');command.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h7M4 17h10M15 7h5M18 4l3 3-3 3M11 14l3 3-3 3"/></svg><span class="b20-btn-label">Lệnh nhanh</span>';const focus=document.createElement('button');focus.id='bloomFocusToggle';focus.type='button';focus.title='Bật chế độ tập trung · Ctrl + Alt + F';focus.setAttribute('aria-label','Bật chế độ tập trung');focus.setAttribute('aria-pressed','false');focus.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/><path d="M8 8h8v8H8z"/></svg><span class="b20-btn-label">Tập trung</span>';const theme=$('#themeToggle');if(theme&&theme.parentElement===top)top.insertBefore(focus,theme),top.insertBefore(command,focus);else top.append(command,focus);command.addEventListener('click',()=>window.BLOOM_V20_COMMANDS?.open?.());focus.addEventListener('click',toggleBloomV20Focus);}
 const dialog=document.createElement('div');dialog.id='bloomCommandCenter';dialog.hidden=true;dialog.innerHTML=`<section class="b20-command-panel" role="dialog" aria-modal="true" aria-label="Bảng lệnh nhanh"><header class="b20-command-head"><div class="b20-command-kicker"><i></i> STUDYSPACE BLOOM · COMMAND CENTER</div><h2 class="b20-command-title">Bạn muốn làm gì tiếp theo?</h2><label class="b20-command-search"><span>⌕</span><input id="bloomCommandSearch" type="search" placeholder="Tìm lệnh hoặc chức năng…" autocomplete="off" aria-label="Tìm lệnh"><kbd>ESC</kbd></label></header><div id="bloomCommandList" class="b20-command-list" role="listbox"></div><footer class="b20-command-foot"><span><kbd>↑</kbd><kbd>↓</kbd> Di chuyển</span><span><kbd>↵</kbd> Mở lệnh</span><span><kbd>ESC</kbd> Đóng</span></footer></section>`;document.body.append(dialog);
 const commands=[
  {id:'new-project',group:'Tạo nhanh',icon:'＋',title:'Tạo dự án mới',desc:'Tạo một không gian nội dung trong chế độ hiện tại.',key:'Ctrl Alt N'},
  {id:'new-child',group:'Tạo nhanh',icon:'📂',title:'Tạo mục con',desc:'Thêm thư mục con trong dự án đang mở.',enabled:()=>!!state.selected},
  {id:'new-question',group:'Tạo nhanh',icon:'❓',title:'Soạn câu hỏi',desc:'Mở bảng nhập câu hỏi – đáp án theo hàng.',key:'Ctrl Alt Q',enabled:()=>!!state.selected},
  {id:'new-task',group:'Tạo nhanh',icon:'☑',title:'Tạo nhiệm vụ',desc:'Ghi một việc cần hoàn thành vào kế hoạch.'},
  {id:'new-event',group:'Tạo nhanh',icon:'▦',title:'Thêm lịch / sự kiện',desc:'Ghi lịch học, lịch kiểm tra hoặc mốc quan trọng.'},
  {id:'new-idea',group:'Tạo nhanh',icon:'✦',title:'Ghi ý tưởng',desc:'Lưu nhanh một ý tưởng hoặc tư liệu.'},
  {id:'home',group:'Điều hướng',icon:'⌂',title:'Tổng quan',desc:'Trở về bảng điều khiển của chế độ hiện tại.'},
  {id:'review',group:'Điều hướng',icon:'◷',title:'Lịch ôn tập',desc:'Mở hàng đợi ôn tập và các câu đến hạn.'},
  {id:'practice',group:'Điều hướng',icon:'✎',title:'Trung tâm luyện tập',desc:'Mở ngân hàng câu hỏi theo dự án.'},
  {id:'tasks',group:'Điều hướng',icon:'☷',title:'Kế hoạch & thời khóa biểu',desc:'Quản lý nhiệm vụ và lịch.'},
  {id:'ideas',group:'Điều hướng',icon:'✧',title:'Không gian ý tưởng',desc:'Xem các ý tưởng đã lưu.'},
  {id:'knowledge',group:'Điều hướng',icon:'⛓',title:'Bản đồ tri thức',desc:'Mở các liên kết giữa dự án và chế độ.'},
  {id:'stats',group:'Điều hướng',icon:'▥',title:'Thống kê',desc:'Xem số liệu câu hỏi, ôn tập và nhiệm vụ.'},
  {id:'archive',group:'Điều hướng',icon:'▤',title:'Lưu trữ & thùng rác',desc:'Khôi phục hoặc dọn dẹp dự án.'},
  {id:'appearance',group:'Điều hướng',icon:'◐',title:'Tùy chỉnh giao diện',desc:'Màu nhấn, mật độ và chế độ hiển thị.'},
  {id:'mode-work',group:'Chuyển không gian',icon:'💼',title:'Không gian Công việc',desc:'Chuyển sang các dự án và dữ liệu Công việc.'},
  {id:'mode-study',group:'Chuyển không gian',icon:'📚',title:'Không gian Học tập',desc:'Chuyển sang các dự án và dữ liệu Học tập.'},
  {id:'mode-fun',group:'Chuyển không gian',icon:'✨',title:'Không gian Giải trí',desc:'Chuyển sang các dự án và dữ liệu Giải trí.'},
  {id:'mode-olympia',group:'Chuyển không gian',icon:'🏆',title:'Không gian Olympia',desc:'Chuyển sang ngân hàng và bộ đề Olympia.'},
  {id:'focus',group:'Hệ thống',icon:'⛶',title:'Bật / tắt chế độ tập trung',desc:'Ẩn thanh bên để mở rộng vùng làm việc.',key:'Ctrl Alt F'},
  {id:'backup',group:'Hệ thống',icon:'⇩',title:'Sao lưu toàn hệ thống',desc:'Xuất tệp JSON có mã kiểm tra toàn vẹn.'},
  {id:'storage',group:'Hệ thống',icon:'◉',title:'Trung tâm lưu trữ',desc:'Kiểm tra dung lượng, bản sao lưu và điểm khôi phục.'}
 ];
 let visible=[],active=0,lastFocus=null;
 const list=$('#bloomCommandList'),search=$('#bloomCommandSearch');
 const draw=()=>{
  const q=bloomV20Fold(search.value.trim());visible=commands.filter(c=>(!c.enabled||c.enabled())&&(!q||bloomV20Fold([c.title,c.desc,c.group].join(' ')).includes(q)));active=Math.min(active,Math.max(0,visible.length-1));
  let last='';let html='';visible.forEach((c,i)=>{if(c.group!==last){last=c.group;html+=`<div class="b20-command-group">${esc(last)}</div>`;}html+=`<button type="button" class="b20-command-item ${i===active?'active':''}" data-command-index="${i}" role="option" aria-selected="${i===active}"><span class="b20-command-icon">${c.icon}</span><span class="b20-command-copy"><b>${esc(c.title)}</b><small>${esc(c.desc)}</small></span>${c.key?`<kbd>${esc(c.key)}</kbd>`:''}</button>`;});
  list.innerHTML=html||'<div class="b20-command-empty">Không có lệnh phù hợp. Thử từ khóa khác nhé.</div>';
 };
 const close=()=>{dialog.hidden=true;lastFocus?.focus?.();};
 const navigate=async(page)=>{if(!(await flushBeforeLeave()))return false;state.page=page;state.selected=null;render();return true;};
 const switchMode=async(mode)=>{if(!(await flushBeforeLeave()))return;if(!(await changeActiveMode(mode)))return;state.page='home';state.selected=null;state.expanded.clear();render();};
 const action=async id=>{
  close();
  if(id==='new-project')return createNode(null);
  if(id==='new-child')return state.selected?createNode(state.selected):toast('Hãy mở một dự án trước.');
  if(id==='new-question')return state.selected?questionModal(state.selected):toast('Hãy mở dự án cần nhập câu hỏi trước.');
  if(id==='new-task'||id==='new-event'||id==='new-idea'){
   const page=id==='new-idea'?'ideas':'tasks';if(!(await navigate(page)))return;
   const selector=id==='new-task'?'[data-action="add-task"]':id==='new-event'?'[data-action="add-event"]':'[data-action="add-idea"]';document.querySelector('#view '+selector)?.click();return;
  }
  if(['home','review','practice','tasks','ideas','knowledge','stats','archive','appearance'].includes(id))return navigate(id);
  if(id.startsWith('mode-'))return switchMode(id.slice(5));
  if(id==='focus')return toggleBloomV20Focus();
  if(id==='backup')return exportBackup();
  if(id==='storage')return typeof openStorageManager==='function'?openStorageManager():toast('Trung tâm lưu trữ chưa sẵn sàng.');
 };
 const open=()=>{lastFocus=document.activeElement;dialog.hidden=false;search.value='';active=0;draw();search.focus();};
 dialog.addEventListener('click',e=>{if(e.target===dialog)close();const item=e.target.closest('[data-command-index]');if(item)action(visible[Number(item.dataset.commandIndex)]?.id);});
 search.addEventListener('input',()=>{active=0;draw();});
 search.addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(visible.length){active=(active+(e.key==='ArrowDown'?1:-1)+visible.length)%visible.length;draw();list.querySelector('[data-command-index="'+active+'"]')?.scrollIntoView({block:'nearest'});}}
  else if(e.key==='Enter'){e.preventDefault();if(visible[active])action(visible[active].id);}
  else if(e.key==='Escape'){e.preventDefault();close();}
 });
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!dialog.hidden){e.preventDefault();close();return;}
  if((e.ctrlKey||e.metaKey)&&e.altKey&&!e.shiftKey&&e.key.toLowerCase()==='p'){e.preventDefault();open();return;}
 });
 window.BLOOM_V20_COMMANDS={open,close,draw,action};
}
function toggleBloomV20Focus(){
 const on=document.body.classList.toggle('bloom-focus-mode'),btn=$('#bloomFocusToggle');
 if(btn){btn.innerHTML=on?'<span aria-hidden="true">↙</span><span class="b20-btn-label">Thoát tập trung</span>':'<span aria-hidden="true">⛶</span><span class="b20-btn-label">Tập trung</span>';btn.title=on?'Thoát chế độ tập trung · Ctrl + Alt + F':'Bật chế độ tập trung · Ctrl + Alt + F';btn.setAttribute('aria-label',on?'Thoát chế độ tập trung':'Bật chế độ tập trung');btn.setAttribute('aria-pressed',String(on));}
 toast(on?'Đã bật chế độ tập trung. Thanh bên được ẩn để mở rộng vùng làm việc.':'Đã thoát chế độ tập trung.');
}
function setupBloomV20Shortcuts(){
 document.addEventListener('keydown',e=>{
  if(!(e.ctrlKey||e.metaKey)||!e.altKey||e.shiftKey)return;
  const key=e.key.toLowerCase(),target=e.target,typing=target&&(target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
  if(typing)return;
  if(key==='f'){e.preventDefault();toggleBloomV20Focus();}
  else if(key==='n'){e.preventDefault();$('#newProject')?.click();}
  else if(key==='q'){e.preventDefault();if(state.selected)questionModal(state.selected);else toast('Hãy mở một dự án trước khi tạo câu hỏi.');}
 });
}
setupBloomV20CommandCenter();
setupBloomV20Shortcuts();
/* =================== END BLOOM V20 COMMAND CENTER =================== */

setupTopbarMenus();
setupBloomStudyTools();
setupBloomMobileSidebar();
init();
window.__ss={state,find,dueList,visitQuestions,save,remember,forgot,render,normalizeData,openInlineReferenceWindow,resolveInlineReference,dbGet,dbGetSnapshots,dbGetDraft,dbCreateSnapshot,restoreStorageSnapshot,updateStorageMeta,dbPutIfRevision,dbPutDraft,dbDeleteDraft};
})();
