import assert from 'node:assert/strict';
import { indexedDB, IDBObjectStore } from 'fake-indexeddb';
import { Window } from 'happy-dom';
import { newNovel } from '../src/lib/kachamak/seed.ts';
const dom = new Window({url:'https://synthetic.invalid'});
globalThis.window=dom;globalThis.document=dom.document;globalThis.indexedDB=indexedDB;
const source=newNovel('Synthetic manuscript','Synthetic author');
source.sections.binder.push({id:'note',title:'Note',content:'<p>Cloud original</p>',children:[],kind:'doc',synopsis:'',notes:'',status:'',label:'',createdAt:1,updatedAt:1});
const libraries=new Map(['a','b'].map(id=>[id,{revision:0,snapshot:{novels:[{...structuredClone(source),id:'project-'+id}],collections:[]}}]));
let user='a',failSave=false,failIdentity=false,failLibrary=false,writes=0,holdSave=null;
globalThis.fetch=async(path,init={})=>{
  const identity=user;
  if(!identity)return Response.json({error:'Sign in required'},{status:401});
  if(path==='/api/account'){if(failIdentity)throw new TypeError('Synthetic identity unavailable');return Response.json({id:identity,email:identity+'@synthetic.invalid',displayName:identity});}
  if(new Headers(init.headers).get('X-Katchamak-Account')!==identity)return Response.json({accountChanged:true},{status:409});
  const stored=libraries.get(identity);
  if(failLibrary)return Response.json({error:'Synthetic library unavailable'},{status:503});
  if(path==='/api/library'&&init.method==='POST'){
    if(holdSave)await holdSave();
    if(failSave)return Response.json({error:'Synthetic outage'},{status:503});
    const body=JSON.parse(init.body);if(body.revision!==stored.revision)return Response.json({conflict:true,error:'Concurrent edit'},{status:409});
    libraries.set(identity,{revision:stored.revision+1,snapshot:body.snapshot});writes++;
    return Response.json({revision:stored.revision+1});
  }
  return Response.json(stored);
};
const bundle=await Bun.build({entrypoints:['tests/fixtures/local-recovery-window.ts'],target:'browser'});
assert.equal(bundle.success,true);const code=await bundle.outputs[0].text();let next=0;
async function openWindow(){const w=await import('data:text/javascript;base64,'+Buffer.from(code+'\n// window '+(++next)).toString('base64'));await w.initializeWebLibrary();return w;}
const edit=(w,text)=>{w.useKachamak.setState({activeNovelId:'project-a'});w.useKachamak.getState().updateNode('binder','note',{content:text});};
const a=await openWindow();edit(a,'<p>Draft before crash</p>');await a.checkpointLocalDraft();
const [original]=await a.draftStorage.list('a');assert.ok(original);assert.match(original.snapshot,/Draft before crash/);
a.useWebLibrary.setState({ready:false}); // abrupt process loss: no successful Save/cleanup
const reload=await openWindow();
assert.equal(reload.useKachamak.getState().novels[0].sections.binder[0].content,'<p>Cloud original</p>','Reload never applies the draft automatically');
assert.equal(reload.useLocalRecovery.getState().drafts.length,1);assert.equal(writes,0);

user='b';const b=await openWindow();assert.deepEqual(b.useLocalRecovery.getState().drafts,[],'Other account gets neither draft list nor content');
await assert.rejects(()=>b.exportLocalDraft(original),/changed/);assert.equal(b.useKachamak.getState().novels[0].id,'project-b');
await assert.rejects(()=>reload.exportLocalDraft(original),/account changed/);assert.equal(reload.useLocalRecovery.getState().owner,null);assert.deepEqual(reload.useLocalRecovery.getState().drafts,[]);
user='a';await reload.initializeWebLibrary();
user=null;await assert.rejects(()=>reload.refreshLocalDrafts(),/Sign in/);assert.equal(reload.useWebLibrary.getState().ready,false);assert.equal(reload.useLocalRecovery.getState().owner,null);
assert.equal((await a.draftStorage.list('a')).length,1,'Expiry never deletes the draft');
user='a';await reload.initializeWebLibrary();

// A remembered identity cannot unlock offline. A separately verified identity
// can still reach its drafts when only the cloud library is unavailable.
failIdentity=true;await assert.rejects(()=>reload.exportLocalDraft(original),/identity unavailable/);
assert.equal(reload.useLocalRecovery.getState().owner,null);assert.deepEqual(reload.useLocalRecovery.getState().drafts,[]);
failIdentity=false;failLibrary=true;await assert.rejects(()=>reload.initializeWebLibrary(),/library unavailable/);
assert.equal(reload.useWebLibrary.getState().ready,false);assert.equal(reload.useLocalRecovery.getState().drafts.length,1);
await reload.exportLocalDraft(original);assert.ok(await a.draftStorage.get('a',original.id),'Export does not delete recovery');
failLibrary=false;await reload.initializeWebLibrary();

// A different cloud version remains untouched when recovery is chosen.
const remote=libraries.get('a');remote.snapshot.novels[0].sections.binder[0].content='<p>Other window version</p>';remote.revision++;
await reload.refreshWebLibrary();const cloudOriginal=structuredClone(libraries.get('a').snapshot.novels[0]);
await reload.recoverLocalDraft(reload.useLocalRecovery.getState().drafts[0]);
const saved=libraries.get('a').snapshot;
assert.deepEqual(saved.novels[0],cloudOriginal);assert.equal(saved.novels[1].sections.binder[0].content,'<p>Draft before crash</p>');
assert.notEqual(saved.novels[1].id,saved.novels[0].id);assert.ok(saved.collections[0].name.startsWith('Recovered'));
assert.deepEqual(await a.draftStorage.list('a'),[],'Only acknowledged recovered copies remove their source draft');

// Independent windows, exact-generation deletion, quota and aborted transactions.
const c=await openWindow();edit(reload,'<p>Window one</p>');edit(c,'<p>Window two</p>');
await Promise.all([reload.checkpointLocalDraft(),c.checkpointLocalDraft()]);
let drafts=await a.draftStorage.list('a');assert.equal(drafts.length,2);assert.notEqual(drafts[0].id,drafts[1].id);
const cDraft=drafts.find(d=>d.snapshot.includes('Window two'));
const newer={...cDraft,generation:crypto.randomUUID(),snapshot:cDraft.snapshot.replace('Window two','Newer window two')};
await a.draftStorage.put(newer);assert.equal(await a.draftStorage.remove('a',cDraft.id,cDraft.generation),false);assert.deepEqual(await a.draftStorage.get('a',cDraft.id),newer);
const put=IDBObjectStore.prototype.put;
IDBObjectStore.prototype.put=function(){throw new DOMException('Synthetic full disk','QuotaExceededError');};
edit(reload,'<p>Quota failure text</p>');await reload.checkpointLocalDraft();
assert.match(reload.useLocalRecovery.getState().error,/unavailable/);
assert.ok((await a.draftStorage.list('a')).some(d=>d.snapshot.includes('Window one')),'Failed write retains previous committed checkpoint');
assert.equal(reload.useKachamak.getState().novels[0].sections.binder[0].content,'<p>Quota failure text</p>');
IDBObjectStore.prototype.put=put;await reload.checkpointLocalDraft();
assert.equal(reload.useLocalRecovery.getState().error,null);
IDBObjectStore.prototype.put=function(...args){const r=put.apply(this,args);this.transaction.abort();return r;};
edit(reload,'<p>Aborted transaction text</p>');await reload.checkpointLocalDraft();assert.match(reload.useLocalRecovery.getState().error,/unavailable/);
IDBObjectStore.prototype.put=put;

failSave=true;await assert.rejects(()=>reload.saveWebLibrary(),/outage/);
assert.ok((await a.draftStorage.list('a')).some(d=>d.snapshot.includes('Aborted transaction text')),'Failed cloud save keeps the latest local draft');
failSave=false;await reload.saveWebLibrary();
assert.deepEqual(await a.draftStorage.get('a',newer.id),newer,'One window Save cannot remove another window draft');
assert.equal((await a.draftStorage.list('a')).length,1);

// Edits during a Save survive its older acknowledgement.
edit(reload,'<p>First save value</p>');let entered,release;
const inSave=new Promise(r=>entered=r), gate=new Promise(r=>release=r);let calls=0;
holdSave=async()=>{if(++calls===1){entered();await gate;}else{failSave=true;}};
const saving=reload.saveWebLibrary();await inSave;
edit(reload,'<p>Typed during save</p>');await reload.checkpointLocalDraft();release();
await assert.rejects(()=>saving,/outage/);
assert.ok((await a.draftStorage.list('a')).some(d=>d.snapshot.includes('Typed during save')),'Late ACK never deletes a newer checkpoint');
holdSave=null;failSave=false;await reload.saveWebLibrary();
assert.equal(libraries.get('a').snapshot.novels[0].sections.binder[0].content,'<p>Typed during save</p>');
await reload.refreshLocalDrafts();await reload.discardLocalDraft(reload.useLocalRecovery.getState().drafts[0]);
assert.deepEqual(await a.draftStorage.list('a'),[],'Explicit discard deletes only selected generation');
for(const w of [a,b,c,reload])w.useWebLibrary.setState({ready:false});

// Actual UI gate: no draft controls, list, or manuscript on the expired/other account screen.
for(const key of ['Document','HTMLElement','Element','Node','navigator','Event','MutationObserver'])Object.defineProperty(globalThis,key,{configurable:true,value:dom[key]});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=await import('react'),{createRoot}=await import('react-dom/client');
const ui=await import('../src/lib/kachamak/cloud-library.ts'),{useLocalRecovery}=await import('../src/lib/kachamak/local-recovery.ts');
const {WebLibraryStorage}=await import('../src/components/kachamak/WebLibraryStorage.tsx');
await a.draftStorage.put({...original,id:'ui-draft',generation:crypto.randomUUID()});
await ui.initializeWebLibrary();
const box=document.body.appendChild(document.createElement('div')),root=createRoot(box);
await React.act(async()=>root.render(React.createElement(WebLibraryStorage,null,React.createElement('p',null,'Private editor content'))));
assert.ok(box.textContent.includes('Recover as copies'));assert.ok(box.textContent.includes('unencrypted'));
user=null;await React.act(async()=>{await assert.rejects(()=>ui.refreshLocalDrafts(),/Sign in/);});
assert.ok(!box.textContent.includes('Recover as copies'));assert.ok(!box.textContent.includes('Private editor content'));assert.equal(useLocalRecovery.getState().owner,null);
user='b';await React.act(async()=>{await ui.initializeWebLibrary();});
assert.ok(!box.textContent.includes('Recover as copies'));assert.deepEqual(useLocalRecovery.getState().drafts,[]);
await React.act(async()=>root.unmount());dom.happyDOM.abort();
console.log('Local recovery passed: isolated windows/reload, manual recovery copies, expiry/account and UI isolation, conflict preservation, quota/abort, failed Save, late ACK, successful Save and explicit discard. Synthetic memory storage/server only.');
