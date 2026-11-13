import assert from 'node:assert/strict';
import { Database } from 'bun:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { Window } from 'happy-dom';
import { accountApi } from '../scripts/accounts-runtime.mjs';
import { cloudLibraryApi } from '../scripts/cloud-library-runtime.mjs';
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
async function call(user,path='/api/library',method='GET',body,origin='https://test.local') {
 const headers={}; if(user){headers['oai-authenticated-user-id']=user;headers['oai-authenticated-user-email']=user;}
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
const snapshot={novels:[novel],collections:[{id:'collection-1',name:'My collection',projectIds:[novel.id],parentId:null}]};
assert.equal((await call(a,'/api/library','POST',{revision:0,snapshot},'https://evil.local')).status,403);
assert.equal((await call(a,'/api/library','POST',{revision:0,snapshot})).status,200);
assert.deepEqual((await (await call(a)).json()).snapshot,snapshot);
assert.deepEqual((await (await call(b)).json()).snapshot,{novels:[],collections:[]});
assert.equal((await call(a,'/api/library','POST',{revision:0,snapshot})).status,409);
const invalid=structuredClone(snapshot);invalid.collections[0].parentId='collection-1';
assert.equal((await call(a,'/api/library','POST',{revision:1,snapshot:invalid})).status,400);
failPut=true;const newer=structuredClone(snapshot);newer.novels[0].title='Unsaved';
assert.equal((await call(a,'/api/library','POST',{revision:1,snapshot:newer})).status,503);failPut=false;
assert.deepEqual((await (await call(a)).json()).snapshot,snapshot);
const data=new FormData();data.set('file',new File(['private attachment'],'test.txt'));
const attachment=await (await call(a,'/api/library/files/'+novel.id,'POST',data)).json();
assert.equal((await call(b,'/api/library/files/'+novel.id+'/'+attachment.id)).status,404);
assert.equal(await (await call(a,'/api/library/files/'+novel.id+'/'+attachment.id)).text(),'private attachment');
assert.equal((await (await call(a,'/api/library/files/'+novel.id)).json()).files[0].name,'test.txt');
// A second account using the same project ID still has a separate private file namespace.
await call(b,'/api/library','POST',{revision:0,snapshot});
assert.equal((await call(b,'/api/library/files/'+novel.id+'/'+attachment.id)).status,404);
const dom=new Window({url:'https://test.local'});globalThis.window=dom;globalThis.document=dom.document;globalThis.localStorage=dom.localStorage;
globalThis.fetch=async(path,init={})=>{
 const body=init.body?JSON.parse(init.body):undefined;
 return path==='/api/account'?accountApi(new Request('https://test.local/api/account',{headers:{'oai-authenticated-user-id':a,'oai-authenticated-user-email':a}}),env):call(a,path,init.method||'GET',body);
};
const cloud=await import('../src/lib/kachamak/cloud-library.ts');
const {useKachamak}=await import('../src/lib/kachamak/store.ts');
const {useCollections}=await import('../src/lib/kachamak/collections-store.ts');
await cloud.initializeWebLibrary();assert.equal(useKachamak.getState().novels[0].title,'Cloud test');
const collection=await cloud.createWebCollection('From Preview',null);
const project=await cloud.createWebProject('Same account project','Tester',collection);
assert.ok((await (await call(a)).json()).snapshot.collections.some(c=>c.id===collection&&c.projectIds.includes(project)));
useKachamak.setState(s=>({novels:s.novels.map(n=>n.id===novel.id?{...n,title:'Edited in Preview'}:n)}));
await cloud.saveWebLibrary();
assert.equal((await (await call(a)).json()).snapshot.novels.find(n=>n.id===novel.id).title,'Edited in Preview');
const remote=await (await call(a)).json();remote.snapshot.novels[0].title='Edited in browser';
await call(a,'/api/library','POST',remote);
await cloud.refreshWebLibrary();assert.equal(useKachamak.getState().novels[0].title,'Edited in browser');
// Unsaved text must survive a concurrent remote save and an attempted conflicting write.
useKachamak.setState(s=>({novels:s.novels.map((n,i)=>i===0?{...n,title:'Unsaved local edit'}:n)}));
const other=await (await call(a)).json();other.snapshot.novels[0].title='Newer browser edit';await call(a,'/api/library','POST',other);
await cloud.refreshWebLibrary();assert.equal(useKachamak.getState().novels[0].title,'Unsaved local edit');
await assert.rejects(()=>cloud.saveWebLibrary(),/Another window/);
assert.equal(useKachamak.getState().novels[0].title,'Unsaved local edit');assert.ok(cloud.useWebLibrary.getState().conflict);
assert.equal((await (await call(a)).json()).snapshot.novels[0].title,'Newer browser edit');
await cloud.reloadWebLibrary(true);assert.equal(useKachamak.getState().novels[0].title,'Newer browser edit');
assert.ok(![...Array(localStorage.length)].map((_,i)=>localStorage.key(i)).includes('kachamak-store-v1'));
console.log('Cloud storage passed: migrations, authenticated isolation, CSRF, nested library, Unicode manuscript roundtrip, attachments, failed-save recovery, two-view refresh and conflict preservation.');
