import assert from 'node:assert/strict';
import {useKachamak,stepWorkspaceHistory as step} from '../src/lib/kachamak/store.ts';
import 'fake-indexeddb/auto';
import {historyAvailable,setHistoryOwner,flushBookHistories} from '../src/lib/kachamak/workspace-history.ts';
import {SECTION_KEYS} from '../src/lib/kachamak/types.ts';
import {findNode} from '../src/lib/kachamak/utils.ts';
import {validHomepage} from '../src/lib/kachamak/homepage.ts';

const state=useKachamak.getState;
setHistoryOwner('writer-one');
state().createNovel('History fixture','Tester');
const id=state().activeNovelId,book=()=>state().novels.find(n=>n.id===id);
const turn=()=>Promise.resolve();
for(const section of SECTION_KEYS){
  state().setTab(section);
  const note=state().addNode(section,null,'doc','One');
  await turn();
  state().updateNode(section,note,{title:'Two'});
  assert.equal(step('undo'),true);assert.equal(findNode(book().sections[section],note).title,'One');
  assert.equal(step('redo'),true);assert.equal(findNode(book().sections[section],note).title,'Two');
  state().deleteNode(section,note);
  await turn();
  assert.ok(book().trash.some(t=>t.node.id===note));assert.ok(step('undo'));
  assert.ok(findNode(book().sections[section],note));assert.ok(!book().trash.some(t=>t.node.id===note));
}
state().editGallery(id,{type:'add',entries:[{id:'maps',kind:'folder',name:'Maps',parentId:null}]});
await turn();
state().editGallery(id,{type:'rename',id:'maps',name:'Atlas'});
state().setRightPanelOpen(false);state().setTab('binder');
assert.ok(step('undo'));assert.equal(book().gallery.find(e=>e.id==='maps').name,'Maps');
assert.ok(step('redo'));assert.equal(book().gallery.find(e=>e.id==='maps').name,'Atlas');
await turn();
state().createHomePage(id,null,'Board','canvas');
const pageId=state().activeHomePageId;
const blocks=()=>book().homePages.find(p=>p.id===pageId).blocks;
const change=action=>state().changeHomepage(id,action,pageId,true);
const note={id:'alpha',layout:'note',title:'Alpha',text:'test',width:'standard',at:{x:10,y:20}};
await turn();assert.ok(change({type:'add',block:note}));
await turn();assert.ok(change({type:'boardMove',id:note.id,at:{x:50,y:60}}));
assert.ok(step('undo'));assert.deepEqual(blocks()[0].at,note.at);
assert.ok(step('redo'));assert.deepEqual(blocks()[0].at,{x:50,y:60});
assert.ok(change({type:'removeBoardItem',original:blocks()[0],positions:{}}));await turn();
assert.equal(blocks().length,0);assert.ok(step('undo'));assert.equal(blocks()[0].id,'alpha');
assert.ok(validHomepage(book().homePages.find(p=>p.id===pageId)));
state().updateNovelSettings(id,{financeCurrency:'GBP'});
assert.equal(historyAvailable('redo'),false);assert.ok(step('undo'));assert.notEqual(book().financeCurrency,'GBP');
assert.ok(step('redo'));assert.equal(book().financeCurrency,'GBP');
await turn();
const noteId=state().addNode('timeline',null,'doc','Event');state().updateNode('timeline',noteId,{color:'#fcb852'});
await turn();
assert.ok(step('undo'));assert.equal(findNode(book().sections.timeline,noteId),null);
assert.ok(step('redo'));assert.equal(findNode(book().sections.timeline,noteId).color,'#fcb852');
// The persisted cursor can have work on both sides. Each book also branches independently.
const open=id=>state().openNovel(id);
const waitFor=async(predicate)=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,10));}assert.ok(predicate());};
assert.ok(step('undo'));
await flushBookHistories();
const first=structuredClone(book());
state().createNovel('Another book','Tester');
const secondId=state().activeNovelId;
assert.equal(step('undo'),false);
state().renameNovel('Second draft');
await turn();state().renameNovel('Second revised');await turn();assert.ok(step('undo'));
await flushBookHistories();
const second=structuredClone(state().novels.find(n=>n.id===secondId));
open(id);assert.ok(step('redo'));assert.equal(findNode(book().sections.timeline,noteId).color,'#fcb852');
assert.ok(step('undo'));await flushBookHistories();
open(secondId);assert.ok(step('redo'));assert.equal(state().novels.find(n=>n.id===secondId).title,'Second revised');
assert.ok(step('undo'));await flushBookHistories();

// Discard all in-memory journals, install the saved library and load both books from IndexedDB.
state().closeNovel();setHistoryOwner(null);setHistoryOwner('writer-one');
useKachamak.setState({novels:structuredClone([first,second])});
open(id);await waitFor(()=>historyAvailable('redo'));
assert.ok(historyAvailable('undo'));assert.ok(step('redo'));assert.ok(findNode(book().sections.timeline,noteId));
assert.ok(step('undo'));state().renameNovel('First branch');assert.equal(step('redo'),false);
open(secondId);await waitFor(()=>historyAvailable('redo'));assert.ok(step('redo'));
assert.equal(state().novels.find(n=>n.id===secondId).title,'Second revised');assert.ok(step('undo'));
await flushBookHistories();
state().closeNovel();setHistoryOwner('other-account');open(secondId);await new Promise(r=>setTimeout(r,30));
assert.equal(step('undo'),false);assert.equal(step('redo'),false);

// An externally modified copy with the same ID cannot replay edits from a different manuscript.
state().closeNovel();setHistoryOwner('writer-one');
useKachamak.setState({novels:[{...second,title:'Changed elsewhere'}]});
open(secondId);await new Promise(r=>setTimeout(r,30));
assert.equal(step('redo'),false);assert.equal(step('undo'),false);
// An image captured by multiple edits is stored once and still restores byte-for-byte.
const {writeBookHistory,readBookHistory}=await import('../src/lib/kachamak/history-storage.ts');
const image='data:image/png;base64,'+'abcd'.repeat(2048);
const place={selectedNodeId:null,paneAId:null,paneBId:null,activeHomePageId:'home'};
const imageHistory={version:1,past:[{start:place,end:place,changes:[{path:['gallery'],before:[{data:image}],after:[{data:image},{data:image}]}]}],future:[]};
await writeBookHistory('writer-one','art-test',{digest:'image-revision',history:imageHistory});
assert.deepEqual(await readBookHistory('writer-one','art-test','image-revision'),imageHistory);
await writeBookHistory('writer-one','art-test');
assert.equal(await readBookHistory('writer-one','art-test','image-revision'),undefined);

// A permanent purge removes all matching disk checkpoints for this book, including older content.
const purged=state().addNode('binder',null,'doc','Remove permanently');
await turn();state().deleteNode('binder',purged);await flushBookHistories();
const beforePurge=structuredClone(state().novels.find(n=>n.id===secondId));
state().deleteForever(beforePurge.trash.find(t=>t.node.id===purged).id,secondId);
assert.equal(historyAvailable('undo'),false);await flushBookHistories();
state().closeNovel();setHistoryOwner(null);setHistoryOwner('writer-one');
useKachamak.setState({novels:[beforePurge]});open(secondId);await new Promise(r=>setTimeout(r,30));
assert.equal(historyAvailable('undo'),false);assert.equal(historyAvailable('redo'),false);
console.log('Book history passed workspace actions, persistent undo and redo, independent branches, account isolation and divergent content.');
