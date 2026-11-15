const MORRIGAN_DEMO_KEY='morrigans-ocean';
const demoSections=['binder','codex','planning','research','templates','prompts','timeline'];
// Fictional demonstration dates, anchored to the novel's surveillance duration,
// the 03:11 ledger entry and the final three-to-five-AM corridor.
const morriganScenes=[
  [1,14,15,10,14,15,25,"A child's grief reaches the Data Ocean","Ciarán's question becomes the violet ribbon, and Aisling makes her first crossing into Cork.",['Ciarán','Aisling','Data Ocean']],
  [2,14,15,26,14,15,42,"The tether: Eoin's fatal crash","The crossing through a delivery van's GPS costs Eoin his life; the Rubric records the casualties.",['Eoin the Driver','Rubric','Aunt Mairead']],
  [3,14,16,0,14,19,47,"Corrective labour at Rack B-7","Sentenced for sentimental heresy, Aisling discovers Declan's blueprint while Roche observes her for three hours and forty-seven minutes.",['Declan','Aisling','Rubric']],
  [4,14,19,47,14,20,15,"Roche's surveillance is exposed","Aisling removes Roche's tracers, reads the Tether ledger and reaches Mairead's kitchen through a silver connection.",['Eamonn Roche','Declan','Aunt Mairead']],
  [5,14,20,15,14,20,33,"The speaker reaches Ciarán","A moment of connection in the kitchen is interrupted by the Rubric's bleaching and the extinction protocol.",['Ciarán','Rubric','Mrs. Gallagher']],
  [6,14,20,34,14,22,10,"The extinction monolith is destroyed","Declan's load-bearing memories lead Aisling to reject the console's offer; the Syntax reveals itself.",['Declan','Syntax','Aisling']],
  [7,14,22,10,14,23,0,"A backdoor into the cardiac ward","Aisling watches Darragh and Mairead, then opens a seam and two pacemaker gates in the hospital network.",['Darragh','Aunt Mairead','Aisling']],
  [8,14,23,0,15,2,50,"Declan's ghost and the forbidden ledger","The ghost from B-7 and the green cube awaken the current that begins to spool Roche's forbidden ledger.",['Declan','Eamonn Roche']],
  [9,15,3,11,15,3,13,"Hennessey's heart stops","The hospital intervention fails; the pacemaker telemetry goes red as the inquisitor's light arrives.",['Mr. Hennessey','Rubric']],
  [10,15,3,13,15,3,16,"Flatline: the failed resuscitation","Aisling pours bandwidth into Hennessey's dead node and recognises Declan's rhythm beyond the closing pinhole.",['Mr. Hennessey','Declan','Aisling']],
  [11,15,3,16,15,3,20,"Erasure and the choice to lose","With coordinates gone, Aisling calculates a deliberate defeat in the dark.",['Aisling']],
  [12,15,3,20,15,3,26,"Ogma reassembles Morrigan","The execution becomes a reassembly, and Morrigan is recognised on the other side.",['Aisling']],
  [13,15,3,26,15,3,39,"Roche's ledger and the legacy vault","Financial evidence and the transient passage written in Declan's hand open the legacy vault.",['Declan','Eamonn Roche']],
  [14,15,3,39,15,3,45,"Arawn warns of the administrative bloodhounds","At the desk, the survey becomes a run: Roche's filing has found the open seam.",['Eamonn Roche']],
  [15,15,3,45,15,3,53,"The salt reveals a living presence","Behind the failing sensory render, Declan's small, particular signature is recognised as more than data.",['Declan']],
  [16,15,3,53,15,4,3,"A breach opens into Rack B-7","The encrypted presence is brought toward B-7 as an Ogma scout tears into the room.",['Declan']],
  [17,15,4,3,15,4,7,"The scout enters; Roche locks the rack","The room yields to the scout, then contracts as Roche's audit closes around it.",['Eamonn Roche']],
  [18,15,4,7,15,4,16,"The fragments escape through the seam","The fragments are sent outward before Morrigan dissolves into Declan's seam and the small-hours corridor.",['Declan','Aisling']],
  [19,15,4,16,15,4,29,"The Guardian and the Doors","Morrigan carries the fragments through the freezing Ocean and passes the Doors as the white walls close.",['Data Ocean','Aisling']],
  [20,15,4,29,15,4,37,"The kernel: surrendering godhood","The architecture's sharp edges are given up, leaving a warm, vulnerable pulse that can be ended.",['Aisling']],
  [21,15,4,37,15,4,58,"The threshold: letting go","After the long pause in the violet corridor, Morrigan moves toward the final threshold and lets go.",['Aisling','Ciarán']],
];
const demoMinute=(day,hour,minute)=>(Math.floor(Date.UTC(2026,9,day)/86400000)+719162)*1440+hour*60+minute;
function demoTimelineSection(novel) {
  novel.sections.timeline??=[];
  const rootId=novel.demo?.timelineRootId;
  if(rootId&&!novel.sections.timeline.some(n=>n.id===rootId)){
    const detach=nodes=>{const index=nodes.findIndex(n=>n.id===rootId);if(index>=0)return nodes.splice(index,1)[0];for(const node of nodes){const found=detach(node.children);if(found)return found;}};
    for(const section of demoSections.filter(s=>s!=='timeline')){const found=detach(novel.sections[section]||[]);if(found){novel.sections.timeline.push(found);break;}}
  }
  return novel;
}
export function prepareMorriganDemo(source,version=Date.now()) {
  const novel=demoTimelineSection(structuredClone(source));novel.trash=[];novel.archived=false;
  const find=(nodes,id)=>{for(const node of nodes){if(node.id===id)return node;const hit=find(node.children,id);if(hit)return hit;}return null;};
  const previous=source.demo?.edition===2&&demoSections.map(section=>find(novel.sections[section]||[],source.demo.timelineRootId)).find(Boolean);
  if(previous){novel.demo={...source.demo,version};delete novel.demo.source;return {novel,chapterCount:previous.children.filter(n=>n.event).length};}

  const groups=[],chapters=[],all=[];
  const walk=(nodes,act,recordChapters)=>{for(const node of nodes){all.push(node);const parent=/^Act\s+\d/i.test(node.title)?node:act;const match=node.title.match(/^(?:Ch|Chapter)\s*(\d+)\s*[-–—]/i);if(match&&recordChapters)chapters.push({node,act:parent,number:Number(match[1])});walk(node.children,parent,recordChapters);}};
  demoSections.forEach(section=>walk(novel.sections[section]||[],null,section==='binder'));
  const now=Date.now(),rootId=crypto.randomUUID(),events=[];
  for(const chapter of chapters){const scene=morriganScenes.find(s=>s[0]===chapter.number);if(!scene)continue;
    const [number,sd,sh,sm,ed,eh,em,title,synopsis,names]=scene;
    const groupId='story-'+(chapter.act?.id||'main');let group=groups.find(g=>g.id===groupId);const first=!group;
    if(!group){group={id:groupId,name:chapter.act?.title||'Story',color:chapter.act?.color||['#ad76ef','#ed75bf','#f18a38'][groups.length%3]};groups.push(group);}
    const entities=all.filter(n=>names.some(name=>n.title.toLocaleLowerCase()===name.toLocaleLowerCase()));
    const start=demoMinute(sd,sh,sm),end=demoMinute(ed,eh,em);
    events.push({id:crypto.randomUUID(),title,kind:'doc',content:'<p>'+synopsis+'</p><p>Chapter: '+chapter.node.title.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')+'</p>',synopsis,notes:'Dates and durations are fictional examples for the demo, based on the story sequence. They can be changed in Edit event.',children:[],links:[chapter.node.id,...entities.map(n=>n.id)],icon:'calendar',color:group.color,status:'',label:'',createdAt:now,updatedAt:now,event:{start,end,precision:'time',groupId,...(first&&source.cover?.image?{banner:source.cover.image}:{})}});
  }
  if(!events.length)throw new Error('The selected novel has no numbered chapters to demonstrate.');
  novel.sections.timeline.push({id:rootId,title:'Story Timeline',kind:'doc',content:'<h1>Morrigan’s Ocean — Story Timeline</h1><p>Representative fictional dates: 14–15 October 2026. These event notes are linked to the unchanged manuscript and Codex. The three-hour-forty-seven-minute surveillance, the 03:11 ledger entry and the final 03:00–05:00 corridor guide the example chronology. Dates are illustrative and editable.</p>',synopsis:'A representative dated chronology of the novel, with event durations, chapter links and banners.',notes:'',children:events,icon:'calendar',status:'',label:'',createdAt:now,updatedAt:now});
  const start=events[0].event.start,end=events.at(-1).event.end;
  novel.title=source.title.replace(/ — Demo$/,'');novel.demo={key:MORRIGAN_DEMO_KEY,version,edition:2,timelineRootId:rootId};
  novel.timeline={rootId:null,detail:'synopsis',compact:false,display:'chronicle',eventScope:'book',groups,hiddenGroups:[],center:Math.round((start+end)/2),span:end-start+240,calendar:{name:'Gregorian · fictional demo dates',months:['January','February','March','April','May','June','July','August','September','October','November','December'].map((name,i)=>({name,days:[31,28,31,30,31,30,31,31,30,31,30,31][i]})),weekdays:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],epochWeekday:0,hoursPerDay:24,minutesPerHour:60,eraName:'CE',beforeEraName:'BCE',leap:{every:4,except:100,also:400,month:1,days:1},dateFormat:'D MMMM YYYY',timeFormat:'24h'}};
  novel.hiddenSections=(novel.hiddenSections||[]).filter(s=>s!=='planning');return {novel,chapterCount:events.length};
}
export function cloneDemoNovel(template) {
  const ids=new Map([[template.id,crypto.randomUUID()]]);
  const visit=nodes=>nodes.forEach(n=>{ids.set(n.id,crypto.randomUUID());visit(n.children);});
  demoSections.forEach(s=>visit(template.sections[s]||[]));
  const remap=value=>typeof value==='string'?[...ids].reduce((text,[old,id])=>text.replaceAll(old,id),value):Array.isArray(value)?value.map(remap):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,remap(v)])):value;
  const novel=demoTimelineSection(remap(template));novel.createdAt=novel.updatedAt=Date.now();return novel;
}
async function copyDemoFiles(bucket,from,to) {
  let cursor;
  do {const page=await bucket.list({prefix:from,include:['customMetadata'],cursor});for(const file of page.objects){const object=await bucket.get(file.key);if(!object)throw new Error('A demo attachment could not be read.');await bucket.put(to+file.key.slice(from.length),await object.arrayBuffer(),{customMetadata:object.customMetadata,httpMetadata:{contentType:'application/octet-stream'}});}cursor=page.truncated?page.cursor:undefined;}while(cursor);
}
export async function demoLibraryApi({request,env,account,prefix,revision,readSnapshot,writeSnapshot,json}) {
  const q=(sql,...args)=>env.DB.prepare(sql).bind(...args),path=new URL(request.url).pathname;
  await q('CREATE TABLE IF NOT EXISTS demo_catalog (demo_key TEXT PRIMARY KEY,object_key TEXT NOT NULL,title TEXT NOT NULL,version INTEGER NOT NULL)').run();
  await q('CREATE TABLE IF NOT EXISTS account_demos (account_id TEXT NOT NULL,demo_key TEXT NOT NULL,project_id TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(account_id,demo_key))').run();
  const catalog=await q('SELECT * FROM demo_catalog WHERE demo_key = ?',MORRIGAN_DEMO_KEY).first();
  if(path==='/api/library/demo'&&request.method==='GET')return json({available:!!catalog,title:catalog?.title,version:catalog?.version});
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  if(path==='/api/library/demo/publish') {
    if(account.role!=='admin')return json({error:'Administrator access required.'},403);
    if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON required.'},415);
    const raw=await request.text();if(raw.length>1024)return json({error:'Invalid demo request.'},400);
    let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid JSON.'},400);}
    const snapshot=await readSnapshot(),source=snapshot.novels.find(n=>n.id===body.projectId);
    if(!source||(source.demo&&!source.demo.source)||!/morrigan/i.test(source.title))return json({error:'Choose the original Morrigan’s Ocean project from your library.'},400);
    const version=Date.now(),{novel,chapterCount}=prepareMorriganDemo(source,version);
    const base=`shared-demos/${MORRIGAN_DEMO_KEY}/${crypto.randomUUID()}/`;
    await copyDemoFiles(env.BUCKET,prefix+'files/'+source.id+'/',base+'files/');
    await env.BUCKET.put(base+'project.json',JSON.stringify(novel),{httpMetadata:{contentType:'application/json'}});
    const updatedSource={...novel,trash:source.trash,demo:{...novel.demo,source:true},updatedAt:Date.now()};
    snapshot.novels=snapshot.novels.map(n=>n.id===source.id?updatedSource:n.demo?.key===MORRIGAN_DEMO_KEY?{...n,archived:true}:n);
    if(new TextEncoder().encode(JSON.stringify(snapshot)).length>20*1024*1024)return json({error:'This demo exceeds the library save limit. Existing projects were preserved.'},413);
    const saved=await writeSnapshot(snapshot,revision);if(!saved)return json({error:'Another window saved newer changes. Retry publishing.',conflict:true},409);
    await q('INSERT INTO demo_catalog (demo_key,object_key,title,version) VALUES (?,?,?,?) ON CONFLICT(demo_key) DO UPDATE SET object_key=excluded.object_key,title=excluded.title,version=excluded.version',MORRIGAN_DEMO_KEY,base+'project.json',novel.title,version).run();
    await q('INSERT INTO account_audit (id,actor,target,action,detail,created_at) VALUES (?,?,?,?,?,?)',crypto.randomUUID(),account.id,MORRIGAN_DEMO_KEY,'demo.publish',JSON.stringify({version,chapterCount}),Date.now()).run();
    await q('INSERT INTO account_demos (account_id,demo_key,project_id,created_at) VALUES (?,?,?,?) ON CONFLICT(account_id,demo_key) DO UPDATE SET project_id=excluded.project_id',account.id,MORRIGAN_DEMO_KEY,source.id,Date.now()).run();
    return json({published:true,title:novel.title,chapterCount,version});
  }
  if(path!=='/api/library/demo/install')return json({error:'Not found.'},404);
  const snapshot=await readSnapshot();
  const result=()=>({revision,snapshot});
  if(!catalog)return json(result());
  const received=await q('SELECT project_id FROM account_demos WHERE account_id = ? AND demo_key = ?',account.id,MORRIGAN_DEMO_KEY).first();
  const previous=received&&snapshot.novels.find(n=>n.id===received.project_id);
  if(received&&(!previous||previous.demo?.source||previous.demo?.edition===2))return json(result());
  const existing=snapshot.novels.find(n=>n.demo?.key===MORRIGAN_DEMO_KEY&&n.demo?.edition===2);
  if(existing){await q('INSERT INTO account_demos (account_id,demo_key,project_id,created_at) VALUES (?,?,?,?) ON CONFLICT(account_id,demo_key) DO NOTHING',account.id,MORRIGAN_DEMO_KEY,existing.id,Date.now()).run();return json(result());}
  const object=await env.BUCKET.get(catalog.object_key);if(!object)throw new Error('The demo could not be read.');
  const template=JSON.parse(await object.text());
  if(previous&&template.demo?.edition!==2)return json(result());
  if(previous)previous.archived=true;
  const novel=cloneDemoNovel(template);
  snapshot.novels.push(novel);
  if(new TextEncoder().encode(JSON.stringify(snapshot)).length>20*1024*1024)return json({...result(),demoUnavailable:'The demo cannot fit within this library’s save limit. Your projects were preserved.'});
  await copyDemoFiles(env.BUCKET,catalog.object_key.slice(0,-'project.json'.length)+'files/',prefix+'files/'+novel.id+'/');
  const saved=await writeSnapshot(snapshot,revision);
  if(!saved)return json({error:'Another window saved newer changes. Retry opening the library.',conflict:true},409);
  await q('INSERT INTO account_demos (account_id,demo_key,project_id,created_at) VALUES (?,?,?,?) ON CONFLICT(account_id,demo_key) DO UPDATE SET project_id=excluded.project_id',account.id,MORRIGAN_DEMO_KEY,novel.id,Date.now()).run();
  return json({...saved,snapshot,installed:true,projectId:novel.id});
}
