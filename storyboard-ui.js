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
 async function post(body){await flushSave();await replaceEpisode(await api(`/api/episodes/${state.episode.id}/storyboard`,{method:'POST',body:{...body,revision:state.episode.revision}}));}
 async function save(){const shot=board()?.shots.find(s=>s.id===current);if(!shot)return;const changes={};document.querySelectorAll('[data-shot-field]').forEach(el=>{if(el.value!==shot[el.dataset.shotField])changes[el.dataset.shotField]=el.value;});if(Object.keys(changes).length)await post({operation:'edit',id:current,changes});}
 actions['refine-storyboard']=async()=>{await save();await api('/api/tasks',{method:'POST',body:{episodeId:state.episode.id,revision:state.episode.revision,kind:'storyboard',idempotency:crypto.randomUUID()}});state.tasks=await api('/api/tasks');workspace();toast('AI镜头细化已提交，保留对白与顺序');};
 const oldOpenAssets=actions['open-assets'];actions['open-assets']=async()=>{if(state.tab==='storyboard')await save();await oldOpenAssets();};
 actions['open-storyboard']=async()=>{await saveAsset();await flushSave();state.tab='storyboard';workspace();};actions['prepare-storyboard']=async()=>{await post({operation:'prepare'});toast('已按场次与对白建立初始分镜，请逐镜检查');};actions['select-shot']=async el=>{
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
};actions['save-shot']=async()=>{await save();toast('镜头已保存');};actions['confirm-storyboard']=async()=>{await save();await post({operation:'confirm'});toast('分镜顺序与当前镜头内容已确认');};actions['shot-image-info']=async()=>{
   await save();
   if(!board().confirmed){
     modal(`<h2>先确认分镜稿</h2><p>当前分镜稿处于待检查状态。确认后即可为 ${esc(current)} 再生成候选图。</p><div class="modal-actions"><button data-action="close-modal">返回检查</button><button class="primary" data-action="confirm-before-shot-image">确认分镜稿并继续</button></div>`);
     return;
   }
   modal(`<h2>生成 ${esc(current)} 分镜图</h2><p>Kling Image 3.0 Omni · 2K · 16:9 · 1 张 · 预计 ¥0.20</p><p>本镜固定版本的参考图会上传到百炼临时存储，用于生成这一镜。</p><div class="modal-actions"><button data-action="close-modal">取消</button><button class="primary" data-action="submit-shot-image" data-id="${esc(current)}">生成 1 张</button></div>`);
 };
 actions['confirm-before-shot-image']=async()=>{
   await actions['confirm-storyboard']();
   await actions['close-modal']();
   await actions['shot-image-info']();
 };
 actions['submit-shot-image']=async el=>{
   if(submitting)return;
   submitting=true;
   el.disabled=true;
   try {
     await api('/api/tasks',{method:'POST',body:{episodeId:state.episode.id,revision:state.episode.revision,kind:'storyboard-image',shotId:el.dataset.id,idempotency:crypto.randomUUID()}});
     await actions['close-modal']();
     state.tasks=await api('/api/tasks');
     workspace();
     toast('本镜生图已提交');
   } finally {submitting=false;el.disabled=false;}
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
 actions['batch-shot-info']=async()=>{
   await save();
   const shots=selectedBatchShots();
   if(!shots.length)throw Error('请先勾选要生成的镜头');
   if(!board().confirmed){
     modal(`<h2>先确认分镜稿</h2><p>确认后可继续为所选的 ${shots.length} 镜准备出图。</p><div class="modal-actions"><button data-action="close-modal">返回检查</button><button class="primary" data-action="confirm-before-shot-batch">确认分镜稿并继续</button></div>`);
     return;
   }
   batchDraft={episodeId:state.episode.id,revision:state.episode.revision,shotIds:shots.map(shot=>shot.id),idempotency:crypto.randomUUID()};
   modal(`<h2>生成所选分镜图</h2><p>${shots.length} 镜各生成 1 张候选图，2K · 16:9，预计 ¥${(shots.length*.20).toFixed(2)}。</p><p>${shots.map(shot=>esc(shot.id)).join('、')}</p><p>按分镜顺序生成，可在任务记录取消排队项。</p><div class="modal-actions"><button data-action="close-modal">返回</button><button class="primary" data-action="submit-shot-batch">提交生成</button></div>`);
 };
 actions['confirm-before-shot-batch']=async()=>{
   await actions['confirm-storyboard']();
   await actions['batch-shot-info']();
 };
 actions['submit-shot-batch']=async el=>{
   if(submitting)return;
   if(!batchDraft||batchDraft.episodeId!==state.episode.id||batchDraft.revision!==state.episode.revision)throw Error('分镜已变化，请重新预览');
   submitting=true;
   el.disabled=true;
   try{
     const tasks=await api('/api/tasks',{method:'POST',body:{kind:'storyboard-image',...batchDraft}});
     batchDraft=null;
     selectedShots.clear();
     await actions['close-modal']();
     await actions['tasks']();
     workspace();
     toast(`已提交 ${tasks.length} 镜生图任务`);
   }finally{submitting=false;el.disabled=false;}
 };
 actions['share-shot-info']=async()=>{
   await save();
   const shots=selectedListShots(), all=board().shots, first=all.indexOf(shots[0]);
   if(shots.length<2||shots.some((shot,index)=>shot.sceneId!==shots[0].sceneId||all[first+index]!==shot))throw Error('请勾选同一场景的相邻镜头');
   const sources=shots.filter(shot=>!shot.sharedImage&&shot.imageCandidates?.some(image=>image.id===shot.confirmedImageId));
   if(!sources.length)throw Error('请先在所选镜头中确认一张独立分镜图');
   modal(`<h2>共用分镜图</h2><p>${shots.map(shot=>esc(shot.id)).join('、')}将共用一张已确认图。各镜的对白和时间点仍分别保留。</p><label class="field">选择来源镜头<select id="share-shot-source">${sources.map(shot=>`<option value="${esc(shot.id)}">${esc(shot.id)} · ${esc(shot.title)}</option>`).join('')}</select></label><div class="modal-actions"><button data-action="close-modal">返回</button><button class="primary" data-action="share-shot-submit">确认共用</button></div>`);
 };
 actions['share-shot-submit']=async()=>{
   const sourceId=document.querySelector('#share-shot-source').value;
   await post({operation:'share-image',shotIds:selectedListShots().map(shot=>shot.id),sourceId});
   selectedShots.clear();
   await actions['close-modal']();
   workspace();
   toast('已设置共用分镜图');
 };
 actions['unshare-shot-image']=async()=>{
   const id=current;
   await save();
   await post({operation:'unshare-image',id});
   toast('已解除本镜共用');
 };
 function sharedImageView(shot,busy){
   const image=shot.sharedImage;
   return `<div class="shot-image-results"><button class="shot-image-preview" data-action="preview-shot-image" aria-label="查看共用分镜大图"><img src="${esc(image.image)}" alt="共用分镜图"></button>
     <div class="shot-image-selection">${badge('共用 '+image.sourceShotId+' 的分镜图')}<button class="small" data-action="unshare-shot-image" ${busy?'disabled':''}>解除共用</button></div></div>`;
 }

 actions['export-storyboard']=async()=>{
   await save();
   await flushSave();
   const link=document.createElement('a');
   link.href=`/api/episodes/${encodeURIComponent(state.episode.id)}/storyboard-export`;
   link.download='分镜包.zip';
   link.click();
 };
 actions['refresh-shot-references']=async()=>{
   await save();
   const revision=state.episode.revision;
   await post({operation:'refresh-references'});
   toast(state.episode.revision===revision?'已是最新确认资产':'已同步本集镜头引用的确认资产');
 };
 actions['choose-shot-image']=async el=>{
   const candidateId=el.dataset.id, shotId=current;
   await save();
   const shot=board().shots.find(item=>item.id===shotId);
   const cancel=shot.confirmedImageId===candidateId;
   await post({operation:cancel?'unconfirm-image':'confirm-image',id:shotId,candidateId});
   toast(cancel?'已取消确认，候选图仍保留':'已确认本镜使用这张图');
 };
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












