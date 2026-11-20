import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://test.local' }).window;
for (const key of ['window','document','Document','DocumentFragment','DOMRect','HTMLElement','HTMLInputElement','Element','Node','NodeFilter','Event','MouseEvent','KeyboardEvent','CustomEvent','MutationObserver','getComputedStyle','navigator']) {
  Object.defineProperty(globalThis,key,{configurable:true,value:key==='window'?dom:typeof dom[key]==='function'&&!/^[A-Z]/.test(key)?dom[key].bind(dom):dom[key]});
}
globalThis.requestAnimationFrame=callback=>setTimeout(callback,0);
globalThis.cancelAnimationFrame=clearTimeout;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.matchMedia=()=>({matches:false});
const React = await import('react');
const {createRoot} = await import('react-dom/client');
const {useKachamak} = await import('../src/lib/kachamak/store.ts');
const {findNode} = await import('../src/lib/kachamak/utils.ts');
const {NoteTree} = await import('../src/components/kachamak/NoteTree.tsx');
const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
useKachamak.getState().createNovel('Binder placement regression','Tester');
const actions=useKachamak.getState();
const act1=actions.addNode('binder',null,'act','Act 1 — The Fall');
const chapter1=actions.addNode('binder',act1,'chapter','Chapter 1');
const chapter2=actions.addNode('binder',act1,'chapter','Chapter 2');
const act2=actions.addNode('binder',null,'act','Act 2');
await React.act(async()=>root.render(React.createElement(NoteTree,{section:'binder'})));
const createFromTree=async(parentId,label='Create note')=>{
  const target=parentId?container.querySelector(`[data-note-id="${parentId}"]`):container.querySelector('[role="tree"]');
  assert.ok(target);
  await React.act(async()=>target.dispatchEvent(new dom.MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2})));
  const action=[...document.querySelectorAll('[role="menuitem"]')].find(el=>el.textContent.trim()===label);
  assert.ok(action,label);
  await React.act(async()=>action.click());
  return useKachamak.getState().selectedNodeId;
};
await React.act(async()=>{actions.select(act1);actions.updateNode('binder',act1,{collapsed:true});});
const added=await createFromTree(act1);
let novel=useKachamak.getState().novels[0], parent=findNode(novel.sections.binder,act1);
assert.deepEqual(novel.sections.binder.map(n=>n.id),[act1,act2],'Row menu must not append to the section root when an act is selected');
assert.deepEqual(parent.children.map(n=>n.id),[chapter1,chapter2,added],'New note follows Chapter 2 inside the selected Act 1');
assert.equal(parent.collapsed,false,'Parent expands to show its newly appended note');
const {NOTE_ICONS} = await import('../src/lib/kachamak/icons.tsx');
const fileIcon = NOTE_ICONS.find(icon=>icon.label==='File').key;
assert.equal(findNode(novel.sections.binder,added).icon,fileIcon);
assert.ok(container.querySelector(`[data-note-id="${added}"] [aria-label="Change icon"] svg.lucide-file`),'The tree shows the plain File icon immediately');
assert.equal(findNode(novel.sections.binder,added).content,'','New note starts empty');
assert.equal(findNode(novel.sections.binder,added).bodyFontSize,undefined,'New notes inherit the current note typography');
assert.equal(findNode(novel.sections.binder,added).hiddenDetailBlocks,undefined,'Children keep the existing Details layout');
assert.equal(findNode(novel.sections.binder,added).title,'Untitled','No automatic chapter numbering');
assert.equal(useKachamak.getState().renamingNodeId,added,'New note is ready for naming');
await React.act(async()=>actions.select(chapter1));
const nested=await createFromTree(chapter1);
assert.deepEqual(findNode(useKachamak.getState().novels[0].sections.binder,chapter1).children.map(n=>n.id),[nested],'Selecting a note also appends inside that note');
await React.act(async()=>actions.select(null));
const top=await createFromTree(null,'Create top-level note');
const topNote=findNode(useKachamak.getState().novels[0].sections.binder,top);
assert.deepEqual(topNote.hiddenDetailBlocks,['image','aliases','codex','timeline']);
assert.equal(topNote.bodyFontSize,undefined);
assert.equal(topNote.icon,fileIcon);
assert.equal(topNote.content,'');
assert.deepEqual(useKachamak.getState().novels[0].sections.binder.map(n=>n.id),[act1,act2,top],'No selected item appends at section root');
// A selection from another section must not capture the new note.
await React.act(async()=>{actions.select(chapter2);root.render(React.createElement(NoteTree,{section:'codex'}));});
const codex=await createFromTree(null,'Create top-level note');
assert.equal(useKachamak.getState().novels[0].sections.codex[0].id,codex);
assert.equal(findNode(useKachamak.getState().novels[0].sections.binder,chapter2).children.length,0);
// A folder tab must never add a note outside that folder, even if an old editor selection remains.
await React.act(async()=>{actions.select(act2);root.render(React.createElement(NoteTree,{section:'binder',rootId:act1}));});
const scoped=await createFromTree(null);
assert.ok(findNode(findNode(useKachamak.getState().novels[0].sections.binder,act1).children,scoped));
assert.equal(findNode(useKachamak.getState().novels[0].sections.binder,act2).children.length,0);
// Timeline reads and writes the active section, and a folder tab stays scoped.
const {TimelineView}=await import('../src/components/kachamak/TimelineView.tsx');
const event={type:'event',start:0,precision:'day'};
await React.act(async()=>{
  actions.updateNode('codex',codex,{title:'Codex timeline target',event});
  actions.updateNode('binder',chapter1,{event});
  actions.updateNode('binder',act2,{event});
  actions.select(null);
  root.render(React.createElement(TimelineView,{section:'codex'}));
});
assert.ok(container.textContent.includes('Codex timeline target'));
assert.ok(!container.textContent.includes('Chapter 1'));
async function addEventFromOptions() {
  await React.act(async()=>container.querySelector('button[aria-label="Select timeline root"]').click());
  const menu=document.querySelector('[aria-label="Timeline root notes"]');
  const add=[...menu.querySelectorAll('button')].find(button=>button.textContent==='Add event');
  assert.ok(add,'The Timeline menu offers Add event');
  await React.act(async()=>add.click());
  return useKachamak.getState().selectedNodeId;
}
await React.act(async()=>actions.select(codex));
const codexEvent=await addEventFromOptions();
const codexChildren=findNode(useKachamak.getState().novels[0].sections.codex,codex).children;
assert.deepEqual(codexChildren.map(n=>n.id),[codexEvent]);
assert.equal(codexChildren[0].timelineKind,'event');
assert.equal(codexChildren[0].icon,undefined,'Add event uses the Timeline event symbol');
await React.act(async()=>{
  actions.select(act2);
  root.render(React.createElement(TimelineView,{section:'binder',rootId:act1}));
});
assert.ok(!container.textContent.includes('Act 2'));
assert.ok(container.textContent.includes('Chapter 1'));
const binderEvent=await addEventFromOptions();
const binder=useKachamak.getState().novels[0].sections.binder;
assert.deepEqual(findNode(binder,act1).children.map(n=>n.id),[chapter1,chapter2,added,scoped,binderEvent]);
assert.equal(findNode(binder,act2).children.length,0);
// Insert Template uses notes from the active book and the chosen insertion point.
await React.act(async()=>{
  actions.select(chapter2);
  root.render(React.createElement(NoteTree,{section:'binder'}));
});
const dialog=()=>document.querySelector('[role="dialog"]');
const pickButton=(name,path)=>[...dialog().querySelectorAll('button')].find(b=>
  b.textContent===name+path);
const openPicker=parent=>createFromTree(parent,'Insert Template');
await openPicker(null);
assert.match(dialog().textContent,/Add a note to the Templates tab/);
await React.act(async()=>dialog().querySelector('[data-slot="dialog-close"]').click());
const fields={content:'<h2>Character brief</h2><p><strong>Goal</strong></p>',
  synopsis:'A synopsis',notes:'Private notes',aliases:['Alias'],links:[codex],
  bodyFontSize:14,color:'#12aabb',icon:'user',hiddenDetailBlocks:['image']};
let templateId;
await React.act(async()=>{
  for (const name of ['Novel','Series']) {
    const folder=actions.addNode('templates',null,'doc',name);
    const id=actions.addNode('templates',folder,'doc','Character');
    if (name==='Series') {
      templateId=id;
      actions.updateNode('templates',id,fields);
      actions.addNode('templates',id,'doc','Nested template');
    }
  }
  const hidden=actions.addNode('templates',null,'doc','Hidden folder');
  actions.addNode('templates',hidden,'doc','Hidden template');
  actions.updateNode('templates',hidden,{hidden:true});
  actions.select(chapter2);
});
const templates=useKachamak.getState().novels[0].sections.templates;
const original=structuredClone(templates);
await openPicker(null);
assert.ok(pickButton('Character','Novel'));
assert.ok(pickButton('Character','Series'));
assert.ok(!dialog().textContent.includes('Hidden template'));
await React.act(async()=>pickButton('Character','Series').click());
const copyId=useKachamak.getState().selectedNodeId;
const copy=useKachamak.getState().novels[0].sections.binder.find(n=>n.id===copyId);
assert.ok(copy && copy.id!==templateId);
assert.equal(copy.title,'Character');
assert.deepEqual(copy.children,[]);
for (const [key,value] of Object.entries(fields)) assert.deepEqual(copy[key],value,key);
assert.notEqual(copy.aliases,findNode(templates,templateId).aliases);
await React.act(async()=>actions.updateNode('binder',copyId,{content:'<p>Edited copy</p>'}));
await openPicker(chapter2);
await React.act(async()=>pickButton('Character','Series').click());
const second=findNode(binder,chapter2).children.at(-1);
assert.notEqual(second.id,copyId);
assert.equal(second.content,fields.content);
assert.deepEqual(templates,original);
await openPicker(null);
await React.act(async()=>actions.createNovel('Another synthetic book','Tester'));
assert.equal(dialog(),null);
assert.equal(actions.addNode('binder',null,{templateId}),null);
await openPicker(null);
assert.match(dialog().textContent,/Add a note to the Templates tab/);
await React.act(async()=>root.unmount());dom.close();
console.log('Tree creation menus passed: append after the selected act’s last chapter, nested notes, expansion, blank content, root fallback and section isolation.');
