export function assetUI({state,esc,icon,badge,api,modal,closeModal,toast,workspace,replaceEpisode,flushSave,actions,shell}){
 let mobileOpen=null;
 const onMobile=()=>document.body.classList.contains('mobile-entry');
 let selected=null,filter='all',tier='core',checks=new Set();
 const tiers={core:'核心资产',optional:'按需准备',inline:'随镜生成'};
 const labels={character:'人物',scene:'场景',prop:'道具'};
 const pack=()=>state.episode?.data.assetPack;
 const current=()=>pack()?.items.find(a=>a.id===selected);
 async function saveDetail(){}
 actions['open-assets']=async()=>{await flushSave();state.tab='assets';workspace();};
 actions['asset-select']=async el=>{
  const id=el.dataset.id, previousTop=el.getBoundingClientRect().top;
  await saveDetail();
  selected=id;
  if(onMobile()){
   const key=state.episode.id+':'+id;
   mobileOpen=mobileOpen===key?null:key;
  }
  workspace();
  if(onMobile()){
   const row=document.querySelector(`[data-action="asset-select"][data-id="${CSS.escape(id)}"]`);
   if(row)window.scrollBy(0,row.getBoundingClientRect().top-previousTop);
  }
 };
 actions['collapse-asset-detail']=async()=>{
  const id=selected;
  await saveDetail();
  mobileOpen=null;
  workspace();
  document.querySelector(`[data-action="asset-select"][data-id="${CSS.escape(id)}"]`)?.scrollIntoView({block:'center'});
 };
 actions['asset-tier-filter']=async el=>{await saveDetail();tier=el.dataset.tier;checks.clear();workspace();};
 actions['asset-filter']=async el=>{await saveDetail();filter=el.dataset.filter;workspace();};
 const styleLabels={realistic:'真人写实',guoman:'国漫古风',aidrama:'AI漫剧（半写实）',pixar:'皮克斯式三维',anime2d:'二维动漫',stylized3d:'三维动画',ink:'国风插画'};
 actions['asset-enlarge']=async el=>{const a=current(),c=a.candidates?.find(c=>c.id===el.dataset.candidate),url=c?.image||a.image;if(!url)return;modal(`<div class="asset-lightbox-head"><h2>${esc(a.name)} · 图片预览</h2><button data-action="close-modal" aria-label="关闭图片预览">${icon('close')}</button></div><div class="asset-lightbox-image"><img src="${esc(url)}" alt="${esc(a.name)}大图"></div><p class="help">点击弹窗外或按Esc关闭；查看图片不会改变选用状态。</p>`,true,'asset-lightbox');};
 function assetDetail(a,p){return `<section class="asset-detail" ${a?`id="asset-detail-${esc(a.id)}"`:''}>${a?`<div class="asset-detail-heading"><span class="asset-thumb">${a.image?`<img src="${esc(a.image)}" alt="">`:icon('image')}</span><div><h3>${esc(a.name)}</h3><span class="muted">${labels[a.type]} · 用于 ${a.sceneIds.join('、')}</span></div></div><div class="asset-detail-scroll"><div class="asset-preparation"><strong>${tiers[a.preparation?.tier]||'待分类'}</strong><p>${esc(a.preparation?.reason||'可点击智能精简清单，判断准备方式')}</p><div>${Object.entries(tiers).map(([key,label])=>`<button class="small ${a.preparation?.tier===key?'active':''}" data-action="asset-change-tier" data-tier="${key}">${label}</button>`).join('')}</div>${a.preparation?.tier==='inline'?'<p>默认不单独生图，后续随镜头提示词生成；不要求上传或确认。</p>':''}</div><label class="field">资产描述<textarea id="asset-description" rows="4">${esc(a.description)}</textarea></label><label class="field">一致性与设定备注<textarea id="asset-notes" rows="3" placeholder="需保持一致的外观、服装、布局等">${esc(a.notes??'')}</textarea></label><div class="section-head"><h3>${a.preparation?.tier==='core'?'参考图':'参考图（可选）'}</h3>${badge(a.confirmed?'固定版本 v'+a.confirmed.version:'待确认')}</div><button class="asset-preview" data-action="${a.image?'asset-enlarge':'asset-upload'}" title="${a.image?'点击查看大图':'上传参考图'}">${a.image?`<img src="${esc(a.image)}" alt="${esc(a.name)}参考图">`:`${icon('upload')}<span>上传资产参考图</span><small>PNG / JPG / WebP · 10MB以内</small>`}</button><input type="file" id="asset-file" accept="image/png,image/jpeg,image/webp" hidden><div class="asset-candidate-heading"><strong>候选图 · ${a.candidates?.length||0}</strong><small>点图放大，单独选用</small></div><div class="asset-candidates">${(a.candidates||[]).map((c,index)=>`<article class="asset-candidate-card ${a.image===c.image?'selected':''}"><button class="asset-candidate-view" data-action="asset-enlarge" data-candidate="${esc(c.id)}" aria-label="放大候选图${index+1}"><img src="${esc(c.image)}" alt="${esc(a.name)}候选图${index+1}"><span>查看大图 ↗</span></button><button class="small" data-action="asset-choose" data-candidate="${esc(c.id)}" ${![3,4].includes(c.promptVersion)||c.formatCheck&&!c.formatCheck.passed?'disabled':''}>${![3,4].includes(c.promptVersion)?'旧规格 · 仅查看':c.formatCheck&&!c.formatCheck.passed?'比例不合格':a.image===c.image?'取消选用':'选用此图'}</button></article>`).join('')}</div>${a.image?'<button class="text" data-action="asset-clear-selection">取消当前选用</button>':''}<div class="asset-image-actions"><button data-action="asset-upload">${icon('upload')}${a.image?'更换图片':'上传图片'}</button><button data-action="asset-reference">${icon('folder')}从库中选择</button><button class="primary" data-action="asset-model">${icon('plus')}生成候选图 · ¥0.20</button></div>${a.reference?'<p class="help">已引用素材库固定版本。编辑后需重新确认。</p>':''}</div>${!a.image?'<p class="asset-confirm-hint">先上传图片或选用候选图，再确认资产。</p>':''}<footer class="asset-detail-footer">${onMobile()?'<button class="small" data-action="collapse-asset-detail">↑ 收起</button>':''}<button class="ghost small" data-action="asset-save">保存</button><button class="primary" data-action="asset-model">预览提示词</button><label class="asset-style-select-wrap" title="全剧画风：本项目各集的人物、场景和道具共用"><select id="asset-global-style" aria-label="全剧画风"><option value="">全剧画风</option>${Object.entries(styleLabels).map(([key,label])=>`<option value="${key}" ${p.styleProfile?.preset===key?'selected':''}>${label}</option>`).join('')}</select></label><button class="ghost small" data-action="asset-style-settings" aria-label="画风详细设定" title="地域时代与色彩设定" ${p.styleProfile?'':'disabled'}>${icon('settings')}</button><button title="${a.image?'确认当前选用图片':'请先上传图片或选用一张候选图'}" class="primary" data-action="asset-confirm" ${a.image?'':'disabled'}>确认资产 ${icon('arrow')}</button></footer>`:'<div class="empty">选择左侧资产查看详情</div>'}</section>`;}
 function view(){const p=pack(),confirmed=state.episode.data.manuscriptConfirmed;if(!p)return `<section class="panel"><h2>资产准备</h2><div class="empty">${icon('folder')}<h3>${confirmed?'从确认剧本建立资产清单':'先确认本集剧本'}</h3><p>按场次整理人物、场景与道具，确认后的图片可跨项目复用。</p><button class="primary" data-action="${confirmed?'prepare-assets':'asset-to-script'}">${confirmed?'整理资产需求':'返回本集剧本'} ${icon('arrow')}</button></div></section>`;
 checks=new Set([...checks].filter(id=>p.items.some(a=>a.id===id)));const list=p.items.filter(a=>(filter==='all'||a.type===filter)&&(!p.policyVersion||a.preparation?.tier===tier));if(!list.some(a=>a.id===selected))selected=list[0]?.id;const a=current(),core=p.items.filter(a=>a.preparation?.tier==='core'),done=core.filter(a=>a.confirmed).length;
 const mobile=onMobile();
 return `<section class="panel asset-panel"><div class="panel-top"><div><h2>资产准备</h2><p>优先准备需要一致的核心资产，其余按需准备或随镜生成。</p></div>${badge(`核心已确认 ${done} / ${core.length}`)}</div><div class="asset-source">${icon('script')}<span>依据：已确认剧本 v${p.scriptVersion}</span><button class="text" data-action="asset-to-script">查看剧本 ›</button><button class="small" data-action="prepare-assets">同步确认剧本需求</button></div>${state.tasks.some(t=>t.episode_id===state.episode.id&&t.kind==='asset-image'&&['running','queued'].includes(t.status))?'<div class="asset-image-progress"><span class="spinner"></span>正在生成资产候选图 · 完成后在对应资产下选图</div>':''}<div class="asset-columns"><section class="asset-list-pane"><div class="asset-list-head"><h3>本集准备清单</h3><div class="asset-tier-tabs">${Object.entries(tiers).map(([key,label])=>`<button class="small ${tier===key?'active':''}" data-action="asset-tier-filter" data-tier="${key}">${label} <b>${p.items.filter(i=>i.preparation?.tier===key).length}</b></button>`).join('')}</div>${!p.policyVersion?'<div class="notice">清单可进一步精简。<button class="small" data-action="asset-classify">智能精简清单</button></div>':''}<div class="asset-filters">${[['all','全部'],...Object.entries(labels)].map(([k,v])=>`<button class="small ${filter===k?'active':''}" data-action="asset-filter" data-filter="${k}">${v}</button>`).join('')}</div></div><div class="asset-list">${list.map(i=>{
 const expanded=mobile&&i.id===selected&&mobileOpen===state.episode.id+':'+i.id;
 return `<article class="asset-row ${(mobile?expanded:i.id===selected)?'selected':''}"><input type="checkbox" data-asset-check="${esc(i.id)}" aria-label="选择${esc(i.name)}" ${checks.has(i.id)?'checked':''}><button class="asset-row-main" ${mobile?`aria-expanded="${expanded}"${expanded?` aria-controls="asset-detail-${esc(i.id)}"`:''}`:''} data-action="asset-select" data-id="${esc(i.id)}"><span class="asset-thumb">${i.image?`<img src="${esc(i.image)}" alt="">`:icon(i.type==='scene'?'image':'folder')}</span><span><strong>${esc(i.name)}</strong><small>${labels[i.type]} · ${i.sceneIds.join('、')}</small></span></button>${badge(i.confirmed?(i.reference?'已引用':'已确认')+' v'+i.confirmed.version:i.image?'待确认':i.preparation?.tier==='inline'?'随镜生成':i.preparation?.tier==='optional'?'按需准备':'待准备',i.confirmed?'green':'')}</article>${expanded?assetDetail(i,p):''}`;}).join('')||'<div class="empty">该分类无需单独准备资产</div>'}</div><footer class="asset-list-footer"><span>已选 <b id="asset-check-count">${checks.size}</b> 项</span><button class="small" data-action="asset-batch-preview" ${checks.size?'':'disabled'}>生成所选资产</button><button class="primary small" data-action="asset-confirm-selected" ${checks.size?'':'disabled'}>确认所选资产</button></footer></section>${mobile?'':assetDetail(a,p)}</div><div class="asset-next-row"><button class="primary" data-action="open-storyboard">进入分镜设计 →</button></div><p class="help asset-next">资产未齐也可编辑分镜；生图条件按具体镜头检查。</p></section>`;
 }
 actions['asset-to-script']=async()=>{await saveDetail();state.tab='manuscript';workspace();};
 async function library(){const lib=await api('/api/assets');shell(`<div class="welcome"><div><h1>资产与素材库</h1><p>已确认的固定版本，可在项目资产准备中引用。</p></div></div><div class="asset-library-grid">${lib.map(v=>`<article class="panel asset-library-card"><img src="${esc(v.image)}" alt="${esc(v.name)}"><h3>${esc(v.name)} ${badge('v'+v.version)}</h3><p>${labels[v.type]} · ${esc(v.description)}</p></article>`).join('')||`<div class="empty">${icon('image')}<h3>还没有确认资产</h3><p>进入项目的资产包，上传图片并确认后，资产会出现在这里。</p><a href="#projects">前往项目中心 →</a></div>`}</div>`);}
 return {view,library,saveDetail};
}





