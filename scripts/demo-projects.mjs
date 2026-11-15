const MORRIGAN_DEMO_KEY='morrigans-ocean';
const demoSections=['binder','codex','planning','research','templates','prompts'];
export function prepareMorriganDemo(source,version=Date.now()) {
  const novel=structuredClone(source);novel.trash=[];novel.archived=false;
  novel.title='Morrigan’s Ocean — Demo';novel.demo={key:MORRIGAN_DEMO_KEY,version};
  const groups=[],chapterIds=[];let position=0;
  const visit=(nodes,act)=>{for(const node of nodes){const parent=/^Act\s+\d/i.test(node.title)?node:act;
    if(/^(?:Ch|Chapter)\s*\d+\s*[-–—]/i.test(node.title)){
      const groupId='demo-'+(parent?.id||'story');let group=groups.find(g=>g.id===groupId);
      const first=!group;if(!group){group={id:groupId,name:parent?.title||'Story sequence',color:parent?.color||['#ad76ef','#ed75bf','#f18a38'][groups.length%3]};groups.push(group);}
      node.event={start:position++*1440,precision:'day',groupId,...(first&&source.cover?.image?{banner:source.cover.image}:{})};chapterIds.push(node.id);
    }visit(node.children,parent);
  }};visit(novel.sections.binder,null);
  if(!position)throw new Error('The selected novel has no numbered chapters to demonstrate.');
  novel.timeline={rootId:null,detail:'synopsis',compact:false,display:'chronicle',eventScope:'book',groups,hiddenGroups:[],center:Math.round((position-1)*720),span:(position+2)*1440,calendar:{name:'Demo sequence — not canonical story dates',months:[{name:'Sequence',days:Math.max(31,position)}],weekdays:['Step'],epochWeekday:0,hoursPerDay:24,minutesPerHour:60,eraName:'DE',beforeEraName:'Before',leap:null,dateFormat:'[Step] D',timeFormat:'24h'}};
  const now=Date.now();novel.sections.planning.push({id:crypto.randomUUID(),title:'Start here — demo guide',kind:'doc',content:'<h1>Morrigan’s Ocean — Demo</h1><p>This is your own editable copy of the complete novel and its notes. Changes here never affect the author’s original or another account.</p><h2>Try the Timeline</h2><p>Open Timeline and switch between Cards, Timeline, Calendar and Outline. The '+position+' chapter events follow manuscript order and are grouped by act. Step 1, Step 2 and the following steps are illustrative positions, not dates asserted by the novel. A banner is included on the first card of each act; use Edit event to change or remove it.</p><h2>Explore connected notes</h2><p>Read in Binder, explore people and places in Codex, and use Mentions to see where a selected note is referenced. You can edit or delete this demo like any project.</p>',synopsis:'A complete, independent demo. Timeline positions illustrate chapter order, not canonical dates.',notes:'',status:'',label:'',children:[],links:chapterIds.slice(0,1),icon:'info',createdAt:now,updatedAt:now});
  novel.hiddenSections=(novel.hiddenSections||[]).filter(s=>s!=='planning');return {novel,chapterCount:position};
}
export function cloneDemoNovel(template) {
  const ids=new Map([[template.id,crypto.randomUUID()]]);
  const visit=nodes=>nodes.forEach(n=>{ids.set(n.id,crypto.randomUUID());visit(n.children);});
  demoSections.forEach(s=>visit(template.sections[s]||[]));
  const remap=value=>typeof value==='string'?[...ids].reduce((text,[old,id])=>text.replaceAll(old,id),value):Array.isArray(value)?value.map(remap):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,remap(v)])):value;
  const novel=remap(template);novel.createdAt=novel.updatedAt=Date.now();return novel;
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
    if(!source||source.demo||!/morrigan/i.test(source.title))return json({error:'Choose the original Morrigan’s Ocean project from your library.'},400);
    const version=Date.now(),{novel,chapterCount}=prepareMorriganDemo(source,version);
    const base=`shared-demos/${MORRIGAN_DEMO_KEY}/${crypto.randomUUID()}/`;
    await copyDemoFiles(env.BUCKET,prefix+'files/'+source.id+'/',base+'files/');
    await env.BUCKET.put(base+'project.json',JSON.stringify(novel),{httpMetadata:{contentType:'application/json'}});
    await q('INSERT INTO demo_catalog (demo_key,object_key,title,version) VALUES (?,?,?,?) ON CONFLICT(demo_key) DO UPDATE SET object_key=excluded.object_key,title=excluded.title,version=excluded.version',MORRIGAN_DEMO_KEY,base+'project.json',novel.title,version).run();
    await q('INSERT INTO account_audit (id,actor,target,action,detail,created_at) VALUES (?,?,?,?,?,?)',crypto.randomUUID(),account.id,MORRIGAN_DEMO_KEY,'demo.publish',JSON.stringify({version,chapterCount}),Date.now()).run();
    return json({published:true,title:novel.title,chapterCount,version});
  }
  if(path!=='/api/library/demo/install')return json({error:'Not found.'},404);
  const snapshot=await readSnapshot();
  const result=()=>({revision,snapshot});
  if(!catalog)return json(result());
  const received=await q('SELECT project_id FROM account_demos WHERE account_id = ? AND demo_key = ?',account.id,MORRIGAN_DEMO_KEY).first();
  if(received)return json(result());
  const existing=snapshot.novels.find(n=>n.demo?.key===MORRIGAN_DEMO_KEY);
  if(existing){await q('INSERT INTO account_demos (account_id,demo_key,project_id,created_at) VALUES (?,?,?,?) ON CONFLICT(account_id,demo_key) DO NOTHING',account.id,MORRIGAN_DEMO_KEY,existing.id,Date.now()).run();return json(result());}
  const object=await env.BUCKET.get(catalog.object_key);if(!object)throw new Error('The demo could not be read.');
  const novel=cloneDemoNovel(JSON.parse(await object.text()));
  snapshot.novels.push(novel);
  if(new TextEncoder().encode(JSON.stringify(snapshot)).length>20*1024*1024)return json({...result(),demoUnavailable:'The demo cannot fit within this library’s save limit. Your projects were preserved.'});
  await copyDemoFiles(env.BUCKET,catalog.object_key.slice(0,-'project.json'.length)+'files/',prefix+'files/'+novel.id+'/');
  const saved=await writeSnapshot(snapshot,revision);
  if(!saved)return json({error:'Another window saved newer changes. Retry opening the library.',conflict:true},409);
  await q('INSERT INTO account_demos (account_id,demo_key,project_id,created_at) VALUES (?,?,?,?) ON CONFLICT(account_id,demo_key) DO NOTHING',account.id,MORRIGAN_DEMO_KEY,novel.id,Date.now()).run();
  return json({...saved,snapshot,installed:true,projectId:novel.id});
}
