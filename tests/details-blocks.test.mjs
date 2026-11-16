import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://test.local',pretendToBeVisual:true}).window;
for(const key of ['window','document','Document','DocumentFragment','HTMLElement','HTMLInputElement','HTMLButtonElement','Element','Node','NodeFilter','DOMParser','Event','MouseEvent','CustomEvent','KeyboardEvent','MutationObserver','getComputedStyle','navigator','requestAnimationFrame','cancelAnimationFrame'])Object.defineProperty(globalThis,key,{configurable:true,value:key==='window'?dom:typeof dom[key]==='function'&&!/^[A-Z]/.test(key)?dom[key].bind(dom):dom[key]});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=await import('react'),{createRoot}=await import('react-dom/client');
const {useKachamak,isUsableBackup}=await import('../src/lib/kachamak/store.ts');
const {findNodeInNovel}=await import('../src/lib/kachamak/utils.ts');
const {NoteConnections}=await import('../src/components/kachamak/NoteConnections.tsx');
const actions=useKachamak.getState();actions.createNovel('Block QA','Tester');
const target=actions.addNode('codex',null,'doc','Reference'),one=actions.addNode('research',null,'doc','One'),two=actions.addNode('binder',null,'doc','Two');
actions.updateNode('research',one,{content:'<p>Keep text</p>',image:'data:image/png;base64,aW1hZ2U=',aliases:['Alternate name'],links:[target]});actions.select(one);
const node=()=>findNodeInNovel(useKachamak.getState().novels[0],one).node;
const preserved=structuredClone(node());
const root=createRoot(document.body.appendChild(document.createElement('div')));
function App(){const state=useKachamak(),hit=findNodeInNovel(state.novels[0],state.selectedNodeId);return React.createElement(NoteConnections,{node:hit.node,section:hit.section,mode:'details'});}
await React.act(async()=>root.render(React.createElement(App)));
const blocks=()=>[...document.querySelectorAll('section[aria-label$=" block"]')].map(el=>el.getAttribute('aria-label'));
assert.deepEqual(blocks(),['Image block','Aliases block','Codex block']);
await React.act(async()=>actions.updateNode('research',one,{hiddenDetailBlocks:['aliases']}));
assert.deepEqual(blocks(),['Image block','Codex block']);
assert.ok([...document.querySelectorAll('button')].some(button=>button.textContent==='Codex'),'The link picker remains in its own block');
await React.act(async()=>actions.updateNode('research',one,{hiddenDetailBlocks:['image','aliases','codex']}));
assert.deepEqual(blocks(),[]);assert.ok([...document.querySelectorAll('button')].some(button=>button.textContent==='Add block'));
const {hiddenDetailBlocks,updatedAt,...rest}=node(),{updatedAt:originalTime,...original}=preserved;assert.deepEqual(rest,original,'Hiding all blocks preserves image, aliases, links and text');
const roundtrip=JSON.parse(JSON.stringify(useKachamak.getState().novels[0]));assert.ok(isUsableBackup(roundtrip));
await React.act(async()=>useKachamak.setState({novels:[roundtrip]}));assert.deepEqual(blocks(),[],'Visibility survives portable roundtrip');
await React.act(async()=>actions.select(two));assert.deepEqual(blocks(),['Image block','Aliases block','Codex block'],'Visibility belongs to one note');
await React.act(async()=>{actions.select(one);actions.updateNode('research',one,{hiddenDetailBlocks:[]});});
assert.equal(document.querySelector('textarea[aria-label=Aliases]').value,'Alternate name');assert.ok(document.querySelector('img'));
for(const value of [['unknown'],['image','image'],'aliases',null]){
 const invalid=structuredClone(roundtrip);invalid.sections.research[0].hiddenDetailBlocks=value;assert.equal(isUsableBackup(invalid),false);
 await React.act(async()=>actions.updateNode('research',one,{hiddenDetailBlocks:value}));assert.deepEqual(node().hiddenDetailBlocks,[],'Invalid visibility does not enter the live store');
}
const legacy=structuredClone(roundtrip);delete legacy.sections.research[0].hiddenDetailBlocks;
assert.deepEqual(useKachamak.persist.getOptions().migrate({novels:[legacy]},23).novels[0],legacy,'v24 migration preserves existing notes exactly');
await React.act(async()=>root.unmount());dom.close();
console.log('Details blocks passed: independent visibility, all-hidden restore entry, preserved content, per-note isolation, roundtrip and v24 validation/migration.');
