const cover = './assets/inspiration-cover.svg';
const assets = [
  {id:'C1',type:'character',name:'程禾',description:'灰色风衣、短发、站在长椅左边。'},
  {id:'C2',type:'character',name:'周远',description:'墨绿夹克、右袖湿透、站在长椅右边。'},
  {id:'L1',type:'scene',name:'公交站',description:'金属长椅与玻璃雨棚。'},
  {id:'P1',type:'prop',name:'蓝伞',description:'深蓝布面、木弯柄。'}
].map(asset=>({...asset,sceneIds:['S1'],candidates:[],preparation:{tier:'core',reason:'镜头连续性'}}));
const scenes=[{id:'S1',title:'雨中等车',location_asset_id:'L1',time_of_day:'傍晚',
 character_ids:['C1','C2'],prop_ids:['P1'],start:0,end:10,
 purpose:'通过误会引出两个人的第一次交流。',
 action:'程禾把长椅上的蓝伞往周远那边推。周远翻出湿袖口。末班车进站，两人同时伸手，又同时停住。',
 performance:'程禾先移开视线，周远低头笑一下；两人伸手后停一拍。',
 dialogue:[{speaker_id:'C1',text:'你的伞。'},{speaker_id:'C2',text:'我要是有伞，就不会这样了。'}],
 voiceover:[],subtitles:[],sounds:[{kind:'ambience',description:'雨落在站棚上。'}]}];
const manuscript={title:'雨停之前',expanded:true,ready:true,productionAudit:{ready:true},
 storyText:scenes[0].action,dimensions:{'角色与对象':'两名等车的陌生人、一把伞。','剧情与时间线':'推伞、误会、末班车进站。'},
 productionScript:{assets,scenes}};
const episode={id:'sample-episode',name:'第 1 集',revision:1,stage:'分镜设计',data:{
 inspiration:{idea:'两个陌生人都以为公交站里的伞属于对方。'},
 manuscript,manuscriptConfirmed:{version:1,data:manuscript},
 assetPack:{scriptVersion:1,policyVersion:1,styleProfile:{preset:"realistic",context:"当代城市雨天",palette:"冷蓝、湿地暖光"},items:assets},
 storyboard:{confirmed:{version:1},shots:[
 ['全景','两人分立长椅两侧，程禾把蓝伞往右推。','你的伞。'],
 ['近景','周远翻出湿透的袖口。','我要是有伞，就不会这样了。'],
 ['特写','两只手从画面两端伸入，在伞柄上方停住。','']
 ].map(([framing,action,dialogue],i)=>({id:'SH00'+(i+1),title:framing,sceneId:'S1',framing,action,dialogue,angle:'平视',movement:'固定',performance:'用视线和停顿表现犹豫。',start:i*3,end:i===2?10:(i+1)*3,refs:[],imageCandidates:[]}))}
}};
const project={id:'sample',name:'雨停之前',type:'single',description:'公开演示项目 · 公交站的一把蓝伞',cover,episodes:[{id:episode.id,name:episode.name,stage:episode.stage}],episode_count:1,updated:'2026-11-24T00:00:00Z'};
const status={fields:{'角色与对象':[]},models:{},budget:{estimated:0,limit:0,reserved:0,available:0},aiEnabled:false};
const routes={'/api/status':status,'/api/projects':[project],'/api/projects/sample':project,
 '/api/episodes/sample-episode':episode,'/api/tasks':[],'/api/trash':[],'/api/assets':[]};
export async function demoApi(url,{method='GET'}={}){
 if(method!=='GET')throw Error('公开展示版为只读。');
 return structuredClone(routes[url]??[]);
}
