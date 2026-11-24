import group1 from './shot-images-1.js';
import group2 from './shot-images-2.js';
import group3 from './shot-images-3.js';
import group4 from './shot-images-4.js';
import group5 from './shot-images-5.js';
import group6 from './shot-images-6.js';
import source from './case-source.js?v=3';
const shotImages={...group1,...group2,...group3,...group4,...group5,...group6};
const image=id=>'./assets/'+id+'.svg';
const [story,production]=source.markdown.split(/^## 制作剧本\s*$/m);
const [scriptText,assetText]=production.split(/^## 资产需求\s*$/m);
const assetSections=[...assetText.matchAll(/^### (\w+) · (.+)\r?\n([^\n]+)\r?\n([^\n]+)/gm)];
const confirmed=new Map(source.assets.map(a=>[a.id,a]));
const assets=assetSections.map(([,id,name,kind,description])=>{
 const type=kind.split(' · ')[0].trim(), reference=confirmed.get(id), tier=reference?'core':'optional';
 return {id,name,type,description,required:kind.includes('必需'),sceneIds:[],candidates:[],preparation:{tier,reason:reference?'已确认原项目参考图':'原剧本资产需求'},...(reference?{image:image(id),confirmed:{version:reference.version}}:{})};
});
const names=new Map(assets.map(a=>[a.name,a.id]));
const resolve=name=>names.get(name)||name;
const scenes=scriptText.split(/^### /m).slice(1).map(section=>{
 const [heading,timing,...rows]=section.trim().split(/\r?\n/);
 const [id,title]=heading.split(' · ');
 const [,start,end,location,time]=timing.match(/^([\d.]+)[–-]([\d.]+)秒 · (.+) · (.+)$/);
 const get=key=>rows.find(row=>row.startsWith(key+'：'))?.split('：').slice(1).join('：')||'';
 const metadata=new Set(['人物','场次目的','动作','表演','道具','关联段落','旁白','字幕','画内文字','sfx','bgm','ambience']);
 const dialogue=[],sounds=[];
 for(const row of rows){
  const colon=row.indexOf('：');if(colon<0)continue;
  const key=row.slice(0,colon),text=row.slice(colon+1);
  if(['sfx','bgm','ambience'].includes(key))sounds.push({kind:key,description:text});
  else if(!metadata.has(key))dialogue.push({speaker_id:resolve(key),text});
 }
 const scene={id,title,start:Number(start),end:Number(end),location_asset_id:resolve(location),time_of_day:time,
  character_ids:get('人物').split('、').filter(Boolean).map(resolve),prop_ids:get('道具').split('、').filter(Boolean).map(resolve),
  purpose:get('场次目的'),action:get('动作'),performance:get('表演'),dialogue,sounds,voiceover:[],subtitles:[]};
 for(const a of assets)if([scene.location_asset_id,...scene.character_ids,...scene.prop_ids].includes(a.id))a.sceneIds.push(id);
 return scene;
});
const manuscript={title:'吃苦改造计划',expanded:true,ready:true,productionAudit:{ready:true},productionScript:{assets,scenes},
 storyText:story.replace(/^# .+\r?\n|^Confirmed revision \d+\r?\n/gm,'').trim(),
 dimensions:{'角色与对象':'父亲老周、女儿小周，以及她在不同工作中遇到的人。','剧情与时间线':'从成绩单引出的吃苦教育，逐次升级，最后以纸箱装置艺术回收伏笔。'}};
const shots=Object.entries(source.shots).map(([id,text])=>{
 const section=heading=>text.match(new RegExp('(?:^|\\n)'+heading+'\\r?\\n([^\\r\\n]*)'))?.[1]||'';
 const [,start,end]=text.match(/计划时间：([\d.]+)[–-]([\d.]+)/);
 return {id,title:text.split(/\r?\n/)[0].split(' · ')[1],sceneId:text.match(/场次：(\w+)/)?.[1],
  start:Number(start),end:Number(end),action:section('画面动作'),framing:section('景别'),angle:section('机位'),
  movement:section('运镜'),performance:section('表演'),dialogue:section('对白'),refs:[],
  confirmedImageId:id,imageCandidates:[{id,image:shotImages[id]??image(id)}]};
});
const episode={id:'sample-episode',name:'第 1 集',revision:38,stage:'分镜设计',data:{
 inspiration:{idea:'父亲想让女儿吃苦，她却把每件苦差事做出了成绩。'},
 manuscript,manuscriptConfirmed:{version:38,data:manuscript},
 assetPack:{scriptVersion:38,policyVersion:1,styleProfile:{preset:'realistic',context:'当代家庭喜剧',palette:'自然生活色调'},items:assets},
 storyboard:{confirmed:{version:1},shots}}};
const project={id:'sample',name:'忆苦思甜复刻',type:'single',description:'《吃苦改造计划》 · 第 38 版剧本与原项目资产、分镜节选',
 cover:image('SH001'),episodes:[{id:episode.id,name:episode.name,stage:episode.stage}],episode_count:1,updated:'2026-11-24T00:00:00Z'};
const status={fields:{'角色与对象':[]},models:{},budget:{estimated:0,limit:0,reserved:0,available:0},aiEnabled:false};
const routes={'/api/status':status,'/api/projects':[project],'/api/projects/sample':project,'/api/episodes/sample-episode':episode,
 '/api/tasks':[],'/api/trash':[],'/api/assets':assets.filter(a=>a.confirmed).map(a=>({...a,version:a.confirmed.version}))};
export async function demoApi(url,{method='GET'}={}){
 if(method!=='GET')throw Error('公开展示版为只读。');
 return structuredClone(routes[url]??[]);
}
