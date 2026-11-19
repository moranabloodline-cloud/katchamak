import assert from 'node:assert/strict';
import {calendarPreset} from '../src/lib/kachamak/story-calendar.ts';
import { Database } from 'bun:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { Window } from 'happy-dom';
import { accountApi } from '../scripts/accounts-runtime.mjs';
import { cloudLibraryApi, validCloudLibrary } from '../scripts/cloud-library-runtime.mjs';
globalThis.accountApi = accountApi;
const sql = new Database(':memory:');
for (const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort()) for (const statement of readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint')) if (statement.trim()) sql.exec(statement);
const DB = { prepare(query) { let values=[]; const statement={bind(...v){values=v;return statement;},async run(){const r=sql.query(query).run(...values);return {meta:{changes:r.changes}};},async first(){return sql.query(query).get(...values);},async all(){return {results:sql.query(query).all(...values)};}};return statement;} };
const objects = new Map(); let failPut=false;
const BUCKET = {
 async put(key,data,options={}) { if(failPut)throw new Error('simulated outage'); objects.set(key,{data:typeof data==='string'?Buffer.from(data):Buffer.from(data),...options}); },
 async get(key) {const o=objects.get(key);return o?{...o,text:async()=>o.data.toString(),arrayBuffer:async()=>o.data.buffer.slice(o.data.byteOffset,o.data.byteOffset+o.data.byteLength)}:null;},
 async delete(key) {objects.delete(key);},
 async list({prefix}) {return {objects:[...objects].filter(([k])=>k.startsWith(prefix)).map(([key,o])=>({key,customMetadata:o.customMetadata,size:o.data.length})),truncated:false};}
};
const env={DB,BUCKET,KATCHAMAK_ADMIN_EMAIL:'owner@test.local'};
async function call(user,path='/api/library',method='GET',body,origin='https://test.local',expected=user) {
 const headers={'X-Katchamak-Account':expected}; if(user){headers['oai-authenticated-user-id']=user;headers['oai-authenticated-user-email']=user;}
 if(method!=='GET')headers.Origin=origin;
 if(body&&!(body instanceof FormData))headers['Content-Type']='application/json';
 const request=new Request('https://test.local'+path,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined});
 return cloudLibraryApi(request,env);
}
const a='owner@test.local',b='other@test.local';
assert.equal((await call(null)).status,401);
assert.deepEqual((await (await call(a)).json()).snapshot,{novels:[],collections:[]});
const {newNovel}=await import('../src/lib/kachamak/seed.ts');
const novel=newNovel('Cloud test','Tester');novel.sections.binder.push({id:'note-1',title:'First note',content:'<p>Saved text čćš</p>',children:[],kind:'doc',synopsis:'',notes:'',status:'',label:'',createdAt:1,updatedAt:1});
novel.series='Cloud Saga';novel.seriesIndex='Book 1';novel.archived=false;novel.cover.image='data:image/png;base64,aGVsbG8=';
novel.sections.timeline=[{...structuredClone(novel.sections.binder[0]),id:'cosmic-period',timelineKind:'period',event:{type:'period',start:-7258098600000000,end:1000,precision:'year',endPrecision:'day'},children:[{...structuredClone(novel.sections.binder[0]),id:'nested-period',timelineKind:'period',children:[]}]}];
const snapshot={novels:[novel],collections:[{id:'collection-1',name:'My collection',projectIds:[novel.id],parentId:null}]};
assert.equal((await call(a,'/api/library','POST',{revision:0,snapshot},'https://evil.local')).status,403);
assert.equal((await call(a,'/api/library','POST',{revision:0,snapshot})).status,200);
assert.deepEqual((await (await call(a)).json()).snapshot,snapshot);
assert.deepEqual((await (await call(b)).json()).snapshot,{novels:[],collections:[]});
assert.equal((await call(a,'/api/library','POST',{revision:0,snapshot})).status,409);
const badCover=structuredClone(snapshot);badCover.novels[0].cover.image='https://tracking.invalid/cover.svg';assert.equal((await call(a,'/api/library','POST',{revision:1,snapshot:badCover})).status,400);
const invalid=structuredClone(snapshot);invalid.collections[0].parentId='collection-1';
assert.equal((await call(a,'/api/library','POST',{revision:1,snapshot:invalid})).status,400);
failPut=true;const newer=structuredClone(snapshot);newer.novels[0].title='Unsaved';
assert.equal((await call(a,'/api/library','POST',{revision:1,snapshot:newer})).status,503);failPut=false;
assert.deepEqual((await (await call(a)).json()).snapshot,snapshot);
const data=new FormData();data.set('file',new File(['private attachment'],'test.txt'));
const attachment=await (await call(a,'/api/library/files/'+novel.id,'POST',data)).json();
assert.equal((await call(b,'/api/library/files/'+novel.id+'/'+attachment.id)).status,404);
const downloaded=await call(a,'/api/library/files/'+novel.id+'/'+attachment.id);
assert.equal(downloaded.headers.get('Content-Disposition'), "attachment; filename*=UTF-8''test.txt");
assert.equal(await downloaded.text(),'private attachment');
assert.deepEqual((await (await call(a)).json()).snapshot,snapshot,'Project JSON is unchanged by attachment upload; embedded cover stays in JSON');
assert.equal((await (await call(a,'/api/library/files/'+novel.id)).json()).files[0].name,'test.txt');
// A second account using the same project ID still has a separate private file namespace.
await call(b,'/api/library','POST',{revision:0,snapshot});
assert.equal((await call(b,'/api/library/files/'+novel.id+'/'+attachment.id)).status,404);
assert.equal((await call(b,'/api/library','GET',undefined,'https://test.local',a)).status,409,'A stale window cannot read another account library');
assert.equal((await call(b,'/api/library','POST',{revision:1,snapshot},'https://test.local',a)).status,409,'A stale window cannot copy the previous account library into the new account');
const dom=new Window({url:'https://test.local'});globalThis.window=dom;globalThis.document=dom.document;let browserStorageWrites=0;
globalThis.localStorage={getItem(){throw new DOMException('Storage denied','SecurityError');},setItem(){browserStorageWrites++;throw new DOMException('Storage full','QuotaExceededError');},removeItem(){throw new DOMException('Storage denied','SecurityError');}};
let browserUser=a;
globalThis.fetch=async(path,init={})=>{
 const body=init.body?JSON.parse(init.body):undefined;
 return path==='/api/account'?accountApi(new Request('https://test.local/api/account',{headers:{'oai-authenticated-user-id':browserUser,'oai-authenticated-user-email':browserUser}}),env):call(browserUser,path,init.method||'GET',body,'https://test.local',new Headers(init.headers).get('X-Katchamak-Account')||browserUser);
};
const cloud=await import('../src/lib/kachamak/cloud-library.ts');
const {useKachamak}=await import('../src/lib/kachamak/store.ts');
const {useCollections}=await import('../src/lib/kachamak/collections-store.ts');
await cloud.initializeWebLibrary();assert.equal(cloud.useWebLibrary.getState().ready,true,'Cloud library opens when browser storage is full and blocked');assert.equal(useKachamak.getState().novels[0].title,'Cloud test');
useKachamak.setState({activeNovelId:novel.id,activeTab:'binder',selectedNodeId:'note-1',paneAId:'note-1'});
useKachamak.getState().setView('write');
await cloud.saveWebLibrary();
assert.equal((await (await call(a)).json()).snapshot.view,'write');
// Cloud serialization is lazy: UI-only actions do no cloud work and a typing
// burst serializes once at Save, while edits made during a request are drained.
const stringify=JSON.stringify;let serializations=0;
JSON.stringify=function(value,...args){if(value?.novels===useKachamak.getState().novels&&value?.collections&&value?.navigation&&value?.location)serializations++;return stringify(value,...args);};
try {
 const beforeUI=(await (await call(a)).json()).revision;
 useKachamak.getState().setEditorSpellCheck(false);
 assert.equal(cloud.useWebLibrary.getState().pending,true,'Spelling changes schedule an authenticated preference save');
 await cloud.saveWebLibrary();assert.equal(serializations,1,'The spelling choice is serialized once at Save');
 assert.ok((await (await call(a)).json()).revision>beforeUI);
 assert.equal((await (await call(a)).json()).snapshot.editorAppearance.spellCheck,false,'Off is stored as false');
 const manuscriptBeforeFormat=JSON.stringify(useKachamak.getState().novels);
 useKachamak.getState().setEditorSize(18);
 useKachamak.getState().setPageFormat({indent:1.5,paragraphGap:0.5,width:60,layout:'stacked',colorizeAnnotations:false});
 assert.equal(cloud.useWebLibrary.getState().pending,true,'Page presentation preferences are saved to the authenticated library');
 assert.equal(JSON.stringify(useKachamak.getState().novels),manuscriptBeforeFormat,'Format never rewrites manuscript data');
 const concurrent=await (await call(a)).json();
 assert.equal((await call(a,'/api/library','POST',{revision:concurrent.revision,snapshot:{...concurrent.snapshot,view:'split'}})).status,200);
 await cloud.saveWebLibrary();
 const formatted=(await (await call(a)).json()).snapshot;
 assert.equal(formatted.editorAppearance.spellCheck,false,'Revision reconciliation preserves pending spelling choice');
 assert.equal(validCloudLibrary({...formatted,editorAppearance:{...formatted.editorAppearance,spellCheck:'false'}}),false,'Server rejects nonboolean spelling values');
 assert.equal(formatted.editorAppearance.size,18);assert.equal(formatted.editorAppearance.page.width,60,'A newer navigation revision cannot drop pending page preferences');
 assert.equal(validCloudLibrary({...formatted,editorAppearance:{...formatted.editorAppearance,page:{...formatted.editorAppearance.page,width:'invalid'}}}),false);
 serializations=0;
 for(let i=0;i<30;i++)useKachamak.getState().updateNode('binder','note-1',{content:`<p>Typing ${i}</p>`});
 assert.equal(serializations,0,'Typing does not serialize the whole cloud library');
 assert.equal(cloud.useWebLibrary.getState().pending,true);
 await cloud.saveWebLibrary();assert.equal(serializations,1,'One snapshot per saved typing burst');
 assert.equal((await (await call(a)).json()).snapshot.novels[0].sections.binder[0].content,'<p>Typing 29</p>');
 const stateBeforeNoop=useKachamak.getState();
 stateBeforeNoop.updateNode('binder','note-1',{content:'<p>Typing 29</p>'});
 assert.equal(useKachamak.getState(),stateBeforeNoop,'Blur with unchanged HTML does not update the project');
 const fetch=globalThis.fetch;let writes=0;
 globalThis.fetch=async(path,init)=>{
   const response=await fetch(path,init);
   if(path==='/api/library'&&init?.method==='POST'&&++writes===1)useKachamak.getState().updateNode('binder','note-1',{content:'<p>Typed during save</p>'});
   return response;
 };
 try{useKachamak.getState().updateNode('binder','note-1',{content:'<p>First save</p>'});await cloud.saveWebLibrary();}
 finally{globalThis.fetch=fetch;}
 assert.equal(writes,2,'Save drains a newer edit arriving during the first request');
 assert.equal((await (await call(a)).json()).snapshot.novels[0].sections.binder[0].content,'<p>Typed during save</p>');
 assert.equal(cloud.useWebLibrary.getState().pending,false);
}finally{JSON.stringify=stringify;}
cloud.useWebLibrary.setState({ready:false});
useKachamak.setState({view:'split',activeNovelId:null,activeTab:'codex',selectedNodeId:null,paneAId:null});
await cloud.initializeWebLibrary();
assert.equal(useKachamak.getState().view,'write','Reopening restores the saved Write view');
assert.equal(useKachamak.getState().editorSize,18,'Reopening restores page typography');
assert.equal(useKachamak.getState().pageFormat.layout,'stacked');
assert.equal(useKachamak.getState().editorSpellCheck,false,'Reopening restores spelling off');
useKachamak.getState().setEditorSpellCheck(true);await cloud.saveWebLibrary();cloud.useWebLibrary.setState({ready:false});useKachamak.setState({editorSpellCheck:false});await cloud.initializeWebLibrary();assert.equal(useKachamak.getState().editorSpellCheck,true,'Reload restores the last saved on choice');
assert.equal(useKachamak.getState().activeNovelId,novel.id);
assert.equal(useKachamak.getState().activeTab,'binder');
assert.equal(useKachamak.getState().selectedNodeId,'note-1');
assert.equal(useKachamak.getState().paneAId,'note-1');
useKachamak.getState().setView('list');
await cloud.saveWebLibrary();
await cloud.reloadWebLibrary();
assert.equal(useKachamak.getState().view,'list','Library reload preserves the current view');
// Reload immediately after navigation, before the debounce/cloud save completes.
const beforeRoute=(await (await call(a)).json()).revision;
useKachamak.getState().setView('write');
useKachamak.setState({activeNovelId:novel.id,activeTab:'binder',selectedNodeId:'note-1',paneAId:'note-1'});
assert.ok(window.location.hash.includes('project='+novel.id));
assert.equal((await (await call(a)).json()).revision,beforeRoute);
cloud.useWebLibrary.setState({ready:false});
useKachamak.setState({activeNovelId:null,selectedNodeId:null,paneAId:null,view:'split'});
await cloud.initializeWebLibrary();
assert.equal(useKachamak.getState().activeNovelId,novel.id,'URL restores project before a cloud navigation save');
assert.equal(useKachamak.getState().selectedNodeId,'note-1');
assert.equal(useKachamak.getState().view,'write');
// New workspace metadata must survive the same authenticated cloud save as prose.
const writer=useKachamak.getState();
writer.moveWorkspaceTab(novel.id,'research','binder');
const savedTabOrder=[...useKachamak.getState().novels[0].tabOrder];
writer.updateNode('binder','note-1',{image:'data:image/png;base64,aW1hZ2U='});
const documentTarget={amount:1200,unit:'words',minimum:800,allowance:200,showOverrun:true,showAllowance:true,notifications:true};
writer.updateNode('binder','note-1',{documentTarget});
writer.updateNode('binder','note-1',{hiddenDetailBlocks:['aliases','codex']});
writer.updateNode('binder','note-1',{detailBlockOrder:['codex','image','aliases'],collapsedDetailBlocks:['image']});
assert.equal(writer.updateNovelSettings(novel.id,{language:'en-US',genres:['Science Fiction','Thriller'],subgenres:['Cyberpunk','Near Future'],chapterCount:21,targetAudience:'Adult speculative fiction readers',tones:['Melancholic'],writingStyles:['Poetic'],plotTechniques:['Corruption Exposed'],sellingPoints:['Rich Worldbuilding'],explicitContent:true}),true);
const target=writer.addNode('codex',null,'doc','Černobog');
writer.updateNode('codex',target,{aliases:['Cernobog']});
const familyMember=writer.addNode('codex',null,'doc','Rowan');
const familyTree=writer.addNode('family',null,'doc','Rowan family');
writer.updateNode('family',familyTree,{familyMembers:[target,familyMember]});
const familyRelation={kind:'parent',from:target,to:familyMember};
assert.equal(writer.changeFamilyRelationship(novel.id,familyTree,familyRelation),null);
const customKin={kind:'custom',label:'Clan guardian',from:target,to:familyMember};
const godchild={kind:'godchild',from:familyMember,to:target};
assert.equal(writer.changeFamilyRelationship(novel.id,familyTree,customKin),null);
assert.equal(writer.changeFamilyRelationship(novel.id,familyTree,godchild),null);
const otherTarget=writer.addNode('codex',null,'doc','Portal');
writer.updateNode('binder','note-1',{content:'<p>Černobog arrived. Portal, then Portal.</p>'});
const {pendingLinkReview,mergeReviewChoices}=await import('../src/lib/kachamak/link-review.ts');
const reviewNovel=useKachamak.getState().novels.find(n=>n.id===novel.id),reviewSource=reviewNovel.sections.binder[0];
const reviewMatches=pendingLinkReview(reviewNovel,reviewSource);
writer.updateNode('binder','note-1',{linkChoices:mergeReviewChoices(reviewNovel,reviewSource,reviewSource.content,reviewMatches.map((m,i)=>({start:m.start,end:m.end,text:m.text,targetId:i===0?target:i===1?otherTarget:null})))});
const timelineRoot=writer.addNode('timeline',null,'doc','Timeline root'),timelineChild=writer.addNode('timeline',timelineRoot,'doc','Nested event');writer.updateNode('timeline',timelineChild,{content:'<p>Nested timeline prose.</p>',event:{type:'period',start:15,end:45,precision:'time',cardColor:'#a855f7',cardOpacity:.6,cardDetail:'dates',cardStyle:'color'}});writer.select('note-1');
const eraCalendar={...calendarPreset('uniform'),eras:[{id:'third-age',name:'Third Age',abbreviation:'TA',startYear:101,color:'#f0883e'}]};
const timelineLayout={detailBlockOrder:['codex','timeline','image','aliases'],hiddenDetailBlocks:['timeline'],collapsedDetailBlocks:['aliases','timeline']};
writer.updateNode('timeline',timelineChild,timelineLayout);
writer.openNoteTab('note-1');writer.setView('timeline');writer.setTimeline({detail:'titles',compact:true,display:'calendar',calendar:eraCalendar,groups:[{id:'history',name:'History',color:'#123456'}]});writer.updateNode('binder','note-1',{event:{start:-1440,end:2880,precision:'day',groupId:'history',banner:'data:image/png;base64,aGVsbG8='}});writer.closeTab('research');
await cloud.saveWebLibrary();
cloud.useWebLibrary.setState({ready:false});
useKachamak.setState({novels:[],activeNovelId:null,activeTab:'binder',view:'write'});
// Simulate a clean URL; persisted cloud navigation should be sufficient.
window.history.replaceState(null,'','/');
await cloud.initializeWebLibrary();
assert.equal(useKachamak.getState().activeTab,'note:note-1');
const restoredTimelineNote=useKachamak.getState().novels[0].sections.timeline.find(n=>n.id===timelineRoot).children[0];
for(const [key,expected] of Object.entries(timelineLayout))assert.deepEqual(restoredTimelineNote[key],expected);
assert.equal(useKachamak.getState().novels[0].sections.binder[0].image,'data:image/png;base64,aW1hZ2U=','Note images survive authenticated cloud save/reload');
assert.deepEqual(useKachamak.getState().novels[0].sections.binder[0].hiddenDetailBlocks,['aliases','codex'],'Block visibility survives cloud save/reload');
assert.deepEqual(useKachamak.getState().novels[0].tabOrder,savedTabOrder,'Tab order survives authenticated cloud save/reload');
assert.deepEqual(useKachamak.getState().novels[0].sections.binder[0].documentTarget,documentTarget,'Document targets survive authenticated cloud save/reload');
assert.deepEqual(useKachamak.getState().novels[0].sections.binder[0].detailBlockOrder,['codex','image','aliases']);assert.deepEqual(useKachamak.getState().novels[0].sections.binder[0].collapsedDetailBlocks,['image'],'Block order/collapse survive cloud save/reload');
assert.equal(useKachamak.getState().view,'timeline');
assert.equal(useKachamak.getState().novels[0].targetAudience,'Adult speculative fiction readers');assert.deepEqual(useKachamak.getState().novels[0].tones,['Melancholic']);assert.deepEqual(useKachamak.getState().novels[0].writingStyles,['Poetic']);assert.deepEqual(useKachamak.getState().novels[0].plotTechniques,['Corruption Exposed']);assert.deepEqual(useKachamak.getState().novels[0].sellingPoints,['Rich Worldbuilding']);assert.equal(useKachamak.getState().novels[0].explicitContent,true);
assert.equal(useKachamak.getState().novels[0].language,'en-US');assert.deepEqual(useKachamak.getState().novels[0].genres,['Science Fiction','Thriller']);assert.deepEqual(useKachamak.getState().novels[0].subgenres,['Cyberpunk','Near Future']);assert.equal(useKachamak.getState().novels[0].chapterCount,21);
assert.equal(useKachamak.getState().novels[0].timeline.detail,'titles');
assert.equal(useKachamak.getState().novels[0].timeline.display,'calendar');
assert.deepEqual(useKachamak.getState().novels[0].timeline.calendar,eraCalendar);
assert.deepEqual(useKachamak.getState().novels[0].sections.binder[0].event,{start:-1440,end:2880,precision:'day',groupId:'history',banner:'data:image/png;base64,aGVsbG8='});
assert.equal(useKachamak.getState().novels[0].timeline.groups[0].name,'History');
assert.equal(useKachamak.getState().novels[0].sections.timeline.find(node=>node.id===timelineRoot).id,timelineRoot);assert.equal(useKachamak.getState().novels[0].sections.timeline.find(node=>node.id===timelineRoot).children[0].content,'<p>Nested timeline prose.</p>');assert.deepEqual(useKachamak.getState().novels[0].sections.timeline.find(node=>node.id===timelineRoot).children[0].event,{type:'period',start:15,end:45,precision:'time',cardColor:'#a855f7',cardOpacity:.6,cardDetail:'dates',cardStyle:'color'});
assert.equal(useKachamak.getState().novels[0].sections.codex[0].aliases[0],'Cernobog');
assert.deepEqual(useKachamak.getState().novels[0].familyRelationships,[familyRelation,customKin,godchild]);
assert.deepEqual(useKachamak.getState().novels[0].sections.family[0].familyMembers,[target,familyMember]);
assert.equal(useKachamak.getState().novels[0].sections.binder[0].linkChoices[0].targetId,target);assert.equal(useKachamak.getState().novels[0].sections.binder[0].linkChoices[1].targetId,otherTarget);assert.equal(useKachamak.getState().novels[0].sections.binder[0].linkChoices[2].targetId,null);
assert.ok(useKachamak.getState().novels[0].hiddenSections.includes('research'));
const collection=await cloud.createWebCollection('From Preview',null);
const project=await cloud.createWebProject('Same account project','Tester',collection);
assert.ok((await (await call(a)).json()).snapshot.collections.some(c=>c.id===collection&&c.projectIds.includes(project)));
useKachamak.setState(s=>({novels:s.novels.map(n=>n.id===novel.id?{...n,title:'Edited in Preview'}:n)}));
await cloud.saveWebLibrary();
assert.equal((await (await call(a)).json()).snapshot.novels.find(n=>n.id===novel.id).title,'Edited in Preview');
const remote=await (await call(a)).json();remote.snapshot.novels[0].title='Edited in browser';
await call(a,'/api/library','POST',remote);
await cloud.refreshWebLibrary();assert.equal(useKachamak.getState().novels[0].title,'Edited in browser');
// Navigation-only saves in a second window must not strand real edits.
const navigateRemote=await (await call(a)).json();navigateRemote.snapshot.view='split';
await call(a,'/api/library','POST',navigateRemote);
useKachamak.setState(s=>({novels:s.novels.map((n,i)=>i===0?{...n,title:'Local content after remote navigation'}:n),view:'list'}));
await cloud.saveWebLibrary();
assert.equal((await (await call(a)).json()).snapshot.novels[0].title,'Local content after remote navigation');
assert.equal(useKachamak.getState().view,'list');assert.equal(cloud.useWebLibrary.getState().conflict,false);
// Conversely, a window that only navigated can adopt newer content safely.
const editRemote=await (await call(a)).json();editRemote.snapshot.novels[0].title='Remote content with local navigation';
await call(a,'/api/library','POST',editRemote);useKachamak.getState().setView('split');
await cloud.saveWebLibrary();
assert.equal(useKachamak.getState().novels[0].title,'Remote content with local navigation');
assert.equal(useKachamak.getState().view,'split');assert.equal(cloud.useWebLibrary.getState().pending,false);
// A completed write whose response was lost may already contain our exact edit.
useKachamak.setState(s=>({novels:s.novels.map((n,i)=>i===0?{...n,title:'Already saved edit'}:n)}));
const sameRemote=await (await call(a)).json();sameRemote.snapshot.novels[0].title='Already saved edit';await call(a,'/api/library','POST',sameRemote);
await cloud.saveWebLibrary();assert.equal(cloud.useWebLibrary.getState().conflict,false);
// Unsaved text must survive a concurrent remote save and an attempted conflicting write.
useKachamak.setState(s=>({novels:s.novels.map((n,i)=>i===0?{...n,title:'Unsaved local edit'}:n)}));
const other=await (await call(a)).json();other.snapshot.novels[0].title='Newer browser edit';await call(a,'/api/library','POST',other);
await cloud.refreshWebLibrary();assert.equal(useKachamak.getState().novels[0].title,'Unsaved local edit');
await assert.rejects(()=>cloud.saveWebLibrary(),/Another window/);
assert.equal(useKachamak.getState().novels[0].title,'Unsaved local edit');assert.ok(cloud.useWebLibrary.getState().conflict);
assert.equal((await (await call(a)).json()).snapshot.novels[0].title,'Newer browser edit');
await assert.rejects(()=>cloud.saveWebLibrary(),/Another window/,'Retry rechecks a genuine conflict without overwriting either edit');
assert.equal(useKachamak.getState().novels[0].title,'Unsaved local edit');
// Retry can recover if the other window subsequently contains the same content.
const resolved=await (await call(a)).json();resolved.snapshot.novels[0].title='Unsaved local edit';await call(a,'/api/library','POST',resolved);
await cloud.saveWebLibrary();assert.equal(cloud.useWebLibrary.getState().conflict,false);assert.equal(cloud.useWebLibrary.getState().error,null);
const restoredRemote=await (await call(a)).json();restoredRemote.snapshot.novels[0].title='Newer browser edit';await call(a,'/api/library','POST',restoredRemote);
await cloud.reloadWebLibrary(true);assert.equal(useKachamak.getState().novels[0].title,'Newer browser edit');
// Deletion is transactional: a failed cloud write restores the project and memberships.
failPut=true;await assert.rejects(()=>cloud.removeWebProject(project));failPut=false;
assert.ok(useKachamak.getState().novels.some(n=>n.id===project));
assert.ok(useCollections.getState().collections.find(c=>c.id===collection).projectIds.includes(project));
await cloud.reloadWebLibrary(true);await cloud.removeWebProject(project);
assert.ok(!(await (await call(a)).json()).snapshot.novels.some(n=>n.id===project));
assert.ok(useKachamak.getState().novels.some(n=>n.id===novel.id),'Deleting one project preserves the others');
assert.equal(browserStorageWrites,0,'Cloud startup, saving and refreshing work without browser storage writes');
// Replayed malformed acknowledgements and outages must preserve dirty edits and allow retry.
useKachamak.setState({activeNovelId:novel.id,activeTab:'binder'});await cloud.saveWebLibrary();
const realFetch = globalThis.fetch;
for (const broken of [() => new Response('<html>Gateway</html>'), () => Response.json({}), () => Response.json({revision:-1}), () => new Response('Unavailable',{status:503}), () => {throw new TypeError('Failed to fetch');}]) {
 useKachamak.getState().updateNode('binder','note-1',{content:'<p>Preserve failed request '+crypto.randomUUID()+'</p>'});
 const content=useKachamak.getState().novels[0].sections.binder[0].content;
 globalThis.fetch=async(path,init)=>path==='/api/library'&&init?.method==='POST'?broken():realFetch(path,init);
 await assert.rejects(()=>cloud.saveWebLibrary());
 assert.equal(cloud.useWebLibrary.getState().busy,false);assert.equal(cloud.useWebLibrary.getState().pending,true);
 assert.equal(useKachamak.getState().novels[0].sections.binder[0].content,content);
 globalThis.fetch=realFetch;await cloud.saveWebLibrary();
 assert.equal(cloud.useWebLibrary.getState().pending,false);
 assert.equal((await (await call(a)).json()).snapshot.novels[0].sections.binder[0].content,content);
}
// A slow background refresh cannot hold the Save button hostage.
let readCancelled=false,requests=[];
globalThis.fetch=async(path,init)=>{requests.push(path);if(path.startsWith('/api/library?revision=')){init.signal.addEventListener('abort',()=>{readCancelled=true;});return new Promise(()=>{});}return realFetch(path,init);};
const blockedRefresh=cloud.refreshWebLibrary().catch(()=>{});
await Promise.resolve();
useKachamak.getState().updateNode('binder','note-1',{content:'<p>Save while refresh is stalled</p>'});
await Promise.race([cloud.saveWebLibrary(),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Save was blocked by refresh')),1000);timer.unref();})]);
await blockedRefresh;assert.equal(readCancelled,true);assert.equal(cloud.useWebLibrary.getState().pending,false);
globalThis.fetch=async(path,init)=>{requests.push(path);return realFetch(path,init);};requests=[];
await cloud.refreshWebLibrary();assert.equal(requests.length,1);assert.match(requests[0],/^\/api\/library\?revision=/);
globalThis.fetch=realFetch;
// A lost response after a committed write recovers through revision reconciliation.
useKachamak.getState().updateNode('binder','note-1',{content:'<p>Committed before connection dropped</p>'});
globalThis.fetch=async(path,init)=>{const r=await realFetch(path,init);if(path==='/api/library'&&init?.method==='POST')throw new TypeError('Lost acknowledgement');return r;};
await assert.rejects(()=>cloud.saveWebLibrary());assert.equal(cloud.useWebLibrary.getState().pending,true);
globalThis.fetch=realFetch;await cloud.saveWebLibrary();assert.equal(cloud.useWebLibrary.getState().pending,false);
// Reload may only replace the snapshot that was present when the user requested it.
for(const discard of [false,true]) {
 let releaseRead,readStarted;
 const started=new Promise(resolve=>{readStarted=resolve;});
 globalThis.fetch=async(path,init)=>{const response=await realFetch(path,init);if(path==='/api/library'&&(!init?.method||init.method==='GET')){readStarted();await new Promise(resolve=>{releaseRead=resolve;});}return response;};
 const reload=cloud.reloadWebLibrary(discard);
 await started;
 const typed='<p>New text typed during delayed reload '+discard+'</p>';
 useKachamak.getState().updateNode('binder','note-1',{content:typed});
 releaseRead();
 await assert.rejects(reload,/changed while reloading/,'A delayed reload must refuse to replace a newer local edit');
 assert.equal(useKachamak.getState().novels[0].sections.binder[0].content,typed);
 assert.equal(cloud.useWebLibrary.getState().pending,true);
 globalThis.fetch=realFetch;await cloud.saveWebLibrary();
}
// Reauthentication in this same window must retain its unsaved manuscript.
useKachamak.getState().updateNode('binder','note-1',{content:'<p>Unsaved text before account interruption</p>'});
browserUser=b;await assert.rejects(()=>cloud.saveWebLibrary(),/account changed/);
assert.equal(cloud.useWebLibrary.getState().ready,false);
await assert.rejects(()=>cloud.initializeWebLibrary(),/Sign back in/,'A different account must never receive pending prose');
browserUser=a;await cloud.initializeWebLibrary();
assert.equal(useKachamak.getState().novels[0].sections.binder[0].content,'<p>Unsaved text before account interruption</p>');
await cloud.saveWebLibrary();
assert.equal((await (await call(a)).json()).snapshot.novels[0].sections.binder[0].content,'<p>Unsaved text before account interruption</p>');
// A genuine concurrent manuscript edit must remain a conflict even after signing back in.
useKachamak.getState().updateNode('binder','note-1',{content:'<p>Local manuscript kept through reauthentication</p>'});
browserUser=b;await assert.rejects(()=>cloud.saveWebLibrary(),/account changed/);
const competing=await (await call(a)).json();competing.snapshot.novels[0].sections.binder[0].content='<p>Text saved in another window</p>';
await call(a,'/api/library','POST',competing);
browserUser=a;await cloud.initializeWebLibrary();
assert.equal((await (await call(a)).json()).snapshot.novels[0].sections.binder[0].content,'<p>Text saved in another window</p>','Reauthentication does not automatically save pending changes');
await assert.rejects(()=>cloud.saveWebLibrary(),/Another window/);
assert.equal(useKachamak.getState().novels[0].sections.binder[0].content,'<p>Local manuscript kept through reauthentication</p>');
assert.equal((await (await call(a)).json()).snapshot.novels[0].sections.binder[0].content,'<p>Text saved in another window</p>');
assert.equal(cloud.useWebLibrary.getState().ready,true);assert.equal(cloud.useWebLibrary.getState().pending,true);assert.equal(cloud.useWebLibrary.getState().conflict,true);
await cloud.reloadWebLibrary(true); // Only this explicit discard may replace the pending version.
browserUser=b;
await assert.rejects(()=>cloud.refreshWebLibrary(),/account changed/);
assert.equal(cloud.useWebLibrary.getState().ready,false,'Account switch hides the old library before rendering the next account');
await assert.rejects(()=>cloud.saveWebLibrary(),/Open your account/);
console.log('Cloud storage passed: migrations, authenticated isolation, CSRF, nested library, Unicode manuscript roundtrip, attachments, failed-save recovery, two-view refresh and conflict preservation.');

const invalidBannerLibrary={novels:structuredClone(useKachamak.getState().novels),collections:[]};
invalidBannerLibrary.novels[0].sections.binder[0].event={start:0,precision:'day',banner:'data:image/svg+xml;base64,PHN2Zz4='};
assert.equal(validCloudLibrary(invalidBannerLibrary),false,'Server refuses non-raster event banners');
delete invalidBannerLibrary.novels[0].sections.binder[0].event;
invalidBannerLibrary.novels[0].sections.binder[0].image='data:image/svg+xml;base64,YQ==';
assert.equal(validCloudLibrary(invalidBannerLibrary),false,'Server refuses non-raster note images');
invalidBannerLibrary.novels[0].sections.binder[0].image='data:image/png;base64,'+'a'.repeat(700001);
assert.equal(validCloudLibrary(invalidBannerLibrary),false,'Server bounds note image size');
delete invalidBannerLibrary.novels[0].sections.binder[0].image;
for(const hiddenDetailBlocks of [['unknown'],['aliases','aliases'],'codex',null]){
 invalidBannerLibrary.novels[0].sections.binder[0].hiddenDetailBlocks=hiddenDetailBlocks;
 assert.equal(validCloudLibrary(invalidBannerLibrary),false,'Server validates block keys and uniqueness');
}
delete invalidBannerLibrary.novels[0].sections.binder[0].hiddenDetailBlocks;
for(const [key,values] of [['collapsedDetailBlocks',[['unknown'],['image','image'],'image',null]],['detailBlockOrder',[[],['image'],['image','image','codex'],['image','aliases','unknown'],'image',null]]])for(const value of values){
 const invalid=structuredClone(invalidBannerLibrary);invalid.novels[0].sections.binder[0][key]=value;assert.equal(validCloudLibrary(invalid),false,'Server validates Details layout keys');
}
