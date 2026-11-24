export function storyboardUI({state,esc,icon,badge,api,actions,workspace,replaceEpisode,flushSave,modal,toast,saveAsset}){
 let current=null;
 let mobileOpen=null;
 const onMobile=()=>document.body.classList.contains('mobile-entry');
 let submitting=false;
 const selectedShots=new Set();
 const previewImages=new Map();
 let selectionEpisode=null;
 let batchDraft=null;
 const board=()=>state.episode.data.storyboard;
 async function save(){}
 const oldOpenAssets=actions['open-assets'];actions['open-assets']=async()=>{if(state.tab==='storyboard')await save();await oldOpenAssets();};
 actions['open-storyboard']=async()=>{await saveAsset();await flushSave();state.tab='storyboard';workspace();};actions['select-shot']=async el=>{
 const id=el.dataset.id;
 const scrollTop=document.querySelector('.shot-list')?.scrollTop;
 const previousTop=el.getBoundingClientRect().top;
 await save();
 current=id;
 if(onMobile()){
  const key=state.episode.id+':'+id;
  mobileOpen=mobileOpen===key?null:key;
 }
 workspace();
 const list=document.querySelector('.shot-list');
 if(!onMobile()&&list&&scrollTop!==undefined)list.scrollTop=scrollTop;
 if(onMobile()){
  const row=list?.querySelector(`[data-action="select-shot"][data-id="${CSS.escape(id)}"]`);
  if(row)window.scrollBy(0,row.getBoundingClientRect().top-previousTop);
 }
};
 function selectedListShots(){
   if(selectionEpisode!==state.episode.id){selectedShots.clear();selectionEpisode=state.episode.id;}
   return board().shots.filter(shot=>selectedShots.has(shot.id));
 }
 function selectedBatchShots(){
   return selectedListShots().filter(shot=>!shot.sharedImage&&!shot.refs.some(ref=>ref.required&&!ref.image));
 }
 function updateShotSelection(){
   const count=selectedListShots().length;
   const batchCount=selectedBatchShots().length;
   const busy=imageBusy();
   const batch=document.querySelector('[data-action="batch-shot-info"]');
   if(batch){
     batch.textContent=batchCount?`生成所选分镜图（${batchCount}）`:'生成所选分镜图';
     batch.disabled=busy||!batchCount;
   }
   const counter=document.querySelector('[data-shot-selection-count]');
   if(counter)counter.textContent='已选 '+count+' 镜';
   const share=document.querySelector('[data-action="share-shot-info"]');
   if(share)share.disabled=busy||count<2;
   const toggle=document.querySelector('[data-action="toggle-all-shots"]');
   if(toggle)toggle.textContent=count===board().shots.length?'取消全选':'全选';
 }
 document.addEventListener('change',event=>{
   const {dataset,checked}=event.target;
   if(!dataset?.shotCheck)return;
   if(checked)selectedShots.add(dataset.shotCheck);
   else selectedShots.delete(dataset.shotCheck);
   updateShotSelection();
 });
 actions['toggle-all-shots']=()=>{
   if(imageBusy())return;
   const shots=board().shots;
   const selectAll=selectedListShots().length!==shots.length;
   selectedShots.clear();
   if(selectAll)for(const shot of shots)selectedShots.add(shot.id);
   for(const input of document.querySelectorAll('[data-shot-check]'))input.checked=selectAll;
   updateShotSelection();
 };
 function sharedImageView(shot,busy){
   const image=shot.sharedImage;
   return `<div class="shot-image-results"><button class="shot-image-preview" data-action="preview-shot-image" aria-label="查看共用分镜大图"><img src="${esc(image.image)}" alt="共用分镜图"></button>
     <div class="shot-image-selection">${badge('共用 '+image.sourceShotId+' 的分镜图')}<button class="small" data-action="unshare-shot-image" ${busy?'disabled':''}>解除共用</button></div></div>`;
 }

 actions['preview-shot-image']=el=>{
   const shot=board()?.shots.find(s=>s.id===current);
   const candidate=shot?.sharedImage||shot?.imageCandidates?.find(c=>c.id===el.dataset.id);
   if(candidate)modal(`<h2>${esc(current)} 分镜图</h2><img class="shot-full-image" src="${esc(candidate.image)}" alt="分镜图"><div class="modal-actions"><button data-action="close-modal">关闭</button></div>`,true);
 };
 function imageChoice(image, confirmed, busy){
   const selected=image.id===confirmed;
   const label=selected?'取消确认':confirmed?'替换为此图':'确认此图';
   return `<button class="small" data-action="choose-shot-image" data-id="${esc(image.id)}" ${busy||(!selected&&image.formatCheck?.passed===false)?'disabled':''}>${label}</button>`;
 }
 function imageBusy(){
   return state.tasks.some(task=>task.episode_id===state.episode.id&&['queued','running'].includes(task.status));
 }
 function previewKey(shot){
   return state.episode.id+':'+shot.id;
 }
 function currentImage(shot,images){
   return images.find(image=>image.id===previewImages.get(previewKey(shot)))
     ||images.find(image=>image.id===shot.confirmedImageId)||images.at(-1);
 }
 actions['select-shot-image']=el=>{
   const shot=board()?.shots.find(item=>item.id===current);
   const images=shot?.imageCandidates||[];
   const image=images.find(item=>item.id===el.dataset.id);
   const gallery=el.closest('.shot-image-results');
   if(!image||!gallery)return;
   previewImages.set(previewKey(shot),image.id);
   const offset=gallery.querySelector('.shot-thumbnails').scrollLeft;
   gallery.outerHTML=imageResults(shot,board(),images,image,imageBusy());
   const thumbnails=document.querySelector('.shot-thumbnails');
   thumbnails.scrollLeft=offset;
   thumbnails.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
 };
 function imageResults(shot, board, images, selected, busy){
   const confirmed=shot.confirmedImageId;
   return `<div class="shot-image-results">
     <button class="shot-image-preview" data-action="preview-shot-image" data-id="${esc(selected.id)}" aria-label="查看分镜大图"><img src="${esc(selected.image)}" alt="当前预览的分镜图"></button>
     <div class="shot-thumbnails" role="group" aria-label="分镜候选图">${images.map((image,index)=>`<button type="button" class="shot-thumbnail" data-action="select-shot-image" data-id="${esc(image.id)}" aria-pressed="${image.id===selected.id}" aria-label="预览候选 ${index+1}${image.id===confirmed?'，已确认':''}">
       <img src="${esc(image.image)}" alt="" loading="lazy">
       <span>${image.id===confirmed?'已确认':`候选 ${index+1}`}</span>
     </button>`).join('')}</div>
     <div class="shot-image-selection">
       ${badge(selected.id===confirmed?'已确认分镜图':'当前预览')}
       ${imageChoice(selected,confirmed,busy)}
     </div>
     ${selected.referencesOutdated||selected.boardVersion!==board.confirmed?.version?'<p class="help">此图依据之前的分镜或参考图生成，可重新生成。</p>':''}
     ${selected.formatCheck?.passed===false?'<p class="notice amber">返回图片的尺寸或比例需要核对。</p>':''}
   </div>`;
 }
 function shotDetail(s,b,busy){
  const missing=s.refs.filter(ref=>ref.required&&!ref.image);
  const images=s.imageCandidates||[],latest=currentImage(s,images);
  return `<section class="shot-detail" id="shot-detail-${esc(s.id)}"><header><h3>${s.id} · ${esc(s.title)}</h3><span>${s.start}–${s.end}秒 · 顺序固定</span></header><div class="shot-scroll">${s.sharedImage?sharedImageView(s,busy):latest?imageResults(s,b,images,latest,busy):`<div class="shot-image-placeholder">${icon('film')}<strong>单张故事板预览</strong><span>${b.confirmed?'生成后可在这里查看大图':'确认分镜稿后可以生成'}</span></div>`}<div class="shot-camera">${[['framing','景别'],['angle','机位'],['movement','运镜']].map(([k,l])=>`<label>${l}<input data-shot-field="${k}" value="${esc(s[k])}"></label>`).join('')}</div>${[['action','画面动作'],['dialogue','对白'],['performance','表演'],['voiceover','旁白'],['audio','声音'],['subtitles','字幕']].map(([k,l])=>`<label class="field">${l}<textarea rows="3" data-shot-field="${k}">${esc(s[k])}</textarea></label>`).join('')}<div class="toolbar"><h3>镜头资产</h3><button class="small" data-action="refresh-shot-references">同步本集参考图</button></div><p class="help">资产确认后同步到引用它的镜头，候选资产图需先选用并确认。</p><div class="shot-assets">${s.refs.map(r=>`<div>${r.image?`<img src="${esc(r.image)}" alt="">`:icon('image')}<span>${esc(r.name)}<small>${r.versionId?'固定版本 '+esc(r.versionId.slice(0,8)):r.required?'必要参考待准备':'随镜生成'}</small></span></div>`).join('')}</div>${missing.length?`<p class="notice amber">本镜必要参考缺少：${missing.map(r=>esc(r.name)).join('、')}。可编辑，生图前需补齐。</p>`:''}</div><footer><button data-action="refine-storyboard" ${state.tasks.some(t=>t.episode_id===state.episode.id&&['running','queued'].includes(t.status))?'disabled':''}>AI细化镜头</button><button data-action="save-shot">保存本镜</button><button data-action="shot-image-info" ${s.sharedImage||missing.length||busy?'disabled':''}>${latest?'再生成一张':'生成本镜'} · ¥0.20</button><button class="primary" data-action="confirm-storyboard">确认分镜稿</button></footer></section>`;
 }
 function view(){const b=board();if(!b)return `<section class="panel"><h2>分镜设计</h2><div class="empty">${icon('film')}<h3>把确认剧本整理为顺序分镜</h3><p>保留场次和对白顺序，固定引用已确认资产；其他物件按描述随镜生成。</p><button class="primary" data-action="prepare-storyboard" ${state.episode.data.manuscriptConfirmed||state.episode.data.assetPack?'':'disabled'}>建立初始分镜稿（免费）</button></div></section>`;if(!b.shots.some(s=>s.id===current))current=b.shots[0]?.id;const s=b.shots.find(s=>s.id===current),mobile=onMobile(),batchCount=selectedBatchShots().length,busy=imageBusy();return `<section class="panel storyboard-panel"><div class="panel-top"><div><h2>分镜设计</h2><p>${b.origin==='ai_refined_draft'?'AI镜头细化稿，等待检查确认':'按场次对白规则初排，可点AI细化镜头'}；计划秒数未配音实测。</p></div><div class="toolbar">${badge(`${b.shots.length} 镜 · ${b.confirmed?'已确认':'待检查'}`)}<button class="primary" data-action="export-storyboard">导出分镜包</button></div></div>${state.episode.data.storyboardBasis&&!state.episode.data.manuscriptConfirmed?'<p class="notice">依据：资产对应的历史确认剧本。当前未确认草稿保持不变。</p>':''}<div class="storyboard-columns"><aside class="shot-rail"><header class="shot-rail-header"><strong>镜头列表</strong><div class="shot-rail-selection"><span data-shot-selection-count aria-live="polite">已选 ${selectedListShots().length} 镜</span><button class="text" data-action="toggle-all-shots" ${busy?'disabled':''}>${selectedListShots().length===b.shots.length?'取消全选':'全选'}</button></div></header><div class="shot-list">${b.shots.map((x,i)=>{
 const missingReference=x.refs.some(ref=>ref.required&&!ref.image);
 const expanded=mobile&&x.id===current&&mobileOpen===state.episode.id+':'+x.id;
 return `<div class="shot-selection-row ${x.id===current?'is-current':''}">
   <label class="shot-check" ${missingReference?'title="缺少必要参考图，可勾选共用分镜图"':''}>
     <input type="checkbox" data-shot-check="${esc(x.id)}" aria-label="勾选 ${esc(x.id)}" ${selectedShots.has(x.id)?'checked':''} ${busy?'disabled':''}>
   </label>
   <button class="shot-row-button" ${mobile?`aria-expanded="${expanded}"${expanded?` aria-controls="shot-detail-${esc(x.id)}"`:''}`:''} ${(!mobile&&x.id===current)||expanded?'aria-current="true"':''} data-action="select-shot" data-id="${esc(x.id)}">
     <b>${String(i+1).padStart(2,'0')} · ${esc(x.title)}</b>
     <small>${esc(x.sceneId)} · ${x.start}–${x.end}秒 · ${x.sharedImage?'共用图':esc(x.framing)}</small>
   </button>
 </div>${expanded?shotDetail(x,b,busy):''}`;
}).join('')}</div><footer class="shot-rail-footer"><button class="primary" data-action="batch-shot-info" ${busy||!batchCount?'disabled':''}>${batchCount?`生成所选分镜图（${batchCount}）`:'生成所选分镜图'}</button><button data-action="share-shot-info" ${busy||selectedListShots().length<2?'disabled':''}>共用分镜图</button></footer></aside>${mobile?'':shotDetail(s,b,busy)}</div></section>`;}
 return {view,save};
}












