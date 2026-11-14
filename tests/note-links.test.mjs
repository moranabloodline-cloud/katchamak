import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>').window;
globalThis.window=dom;globalThis.document=dom.document;
const {contentText,indexText,rangeForMatch,scanLinks,rebaseChoices,noteMatches,backlinks}=await import('../src/lib/kachamak/note-links.ts');
const {useKachamak,isUsableBackup}=await import('../src/lib/kachamak/store.ts');
const {findNode}=await import('../src/lib/kachamak/utils.ts');
const {manuscriptHtml,manuscriptMarkdown}=await import('../src/lib/kachamak/manuscript-export.ts');
const s=useKachamak.getState();s.createNovel('Link regression','Tester');
const id=s.addNode('codex',null,'doc','Černobog');s.updateNode('codex',id,{aliases:['Cernobog',' Černobog ','CB','cb'],content:'<p>Character profile</p>'});
const place=s.addNode('codex',null,'doc','Old Gate');s.updateNode('codex',place,{aliases:['Gate']});
const person=s.addNode('codex',null,'doc','Gatekeeper');s.updateNode('codex',person,{aliases:['Gate']});
const chapter=s.addNode('binder',null,'doc','Chapter One');const scene=s.addNode('binder',chapter,'doc','Meeting');
const novel=()=>useKachamak.getState().novels[0], node=()=>findNode(novel().sections.binder,scene);
const html='<p><strong>Černo</strong>bog met Cernobog at Old Gate. Gate and Gatehouse.</p><p><a href="https://example.com">Gate</a> <code>Gate</code></p>';
s.updateNode('binder',scene,{content:html});
assert.deepEqual(findNode(novel().sections.codex,id).aliases,['Cernobog','CB']);
let m=noteMatches(novel(),node());assert.deepEqual(m.map(x=>[x.text,x.targetId]),[['Černobog',id],['Cernobog',id],['Old Gate',place],['Gate',null]]);
const root=document.createElement('div');root.innerHTML=html;const indexed=indexText(root);assert.equal(rangeForMatch(indexed.parts,m[0]).toString(),'Černobog');assert.equal(root.innerHTML,html,'Detection never changes manuscript markup');
assert.equal(scanLinks(contentText('<p>Old</p><p>Gate</p>'),[findNode(novel().sections.codex,place)]).some(x=>x.text==='Old Gate'),false);
// Ambiguity is per occurrence, and editing before it must move only that choice.
s.updateNode('binder',scene,{content:'<p>Gate, then Gate.</p>'});m=noteMatches(novel(),node());
s.updateNode('binder',scene,{linkChoices:[{start:m[0].start,end:m[0].end,text:m[0].text,targetId:person}]});
s.updateNode('binder',scene,{content:'<p>Before: Gate, then Gate.</p>'});m=noteMatches(novel(),node());assert.equal(m[0].targetId,person);assert.equal(m[1].targetId,null);assert.equal(m[1].explicit,false);
s.updateNode('binder',scene,{linkChoices:[...node().linkChoices,{start:m[1].start,end:m[1].end,text:m[1].text,targetId:null}]});
assert.equal(backlinks(novel(),person)[0].matches.length,1);assert.equal(backlinks(novel(),place).length,0);
s.updateNode('codex',person,{title:'The Warden',aliases:[]});assert.equal(noteMatches(novel(),node())[0].targetId,person,'Rename keeps selected identity');
s.deleteNode('codex',person);assert.equal(noteMatches(novel(),node())[0].missing,true,'Deleted targets never silently retarget to same-named notes');
s.restoreFromTrash(novel().trash[0].id);assert.equal(noteMatches(novel(),node())[0].missing,false);
assert.deepEqual(rebaseChoices('Gate','Changed',[{start:0,end:4,text:'Gate',targetId:person}]),[]);
// Pin old unambiguous links before a target rename or duplicate.
s.updateNode('binder',scene,{content:'<p>Old Gate</p>'});s.updateNode('codex',place,{title:'New Gate'});assert.equal(noteMatches(novel(),node())[0].targetId,place);
// Tabs are views, not copied content. Closing cannot delete source notes.
s.openNoteTab(chapter);assert.equal(useKachamak.getState().activeTab,`note:${chapter}`);s.updateNode('binder',scene,{content:'<p>Final <em>manuscript</em>.</p>',synopsis:'PRIVATE SYNOPSIS',notes:'PRIVATE NOTES'});s.closeTab(`note:${chapter}`);assert.ok(node());assert.deepEqual(novel().openNoteTabs,[]);s.closeTab('research');assert.ok(novel().hiddenSections.includes('research'));s.showSection('research');assert.deepEqual(novel().hiddenSections,[]);s.closeTab('binder');assert.ok(!novel().hiddenSections.includes('binder'));
s.setTimeline({compact:true,detail:'titles',rootId:chapter});const roundtrip=JSON.parse(JSON.stringify(novel()));assert.equal(roundtrip.timeline.rootId,chapter);assert.equal(roundtrip.sections.binder[0].children[0].content,node().content);
const md=manuscriptMarkdown(novel());assert.match(md,/Final [_*]manuscript[_*]/);assert.ok(!md.includes('PRIVATE'));assert.ok(!md.includes('Character profile'));assert.ok(manuscriptHtml(novel(),true).includes('Character profile'));s.updateNode('binder',scene,{content:'<p onclick="bad()">Safe</p><script>alert(1)</script>'});assert.ok(!/onclick|<script/.test(manuscriptHtml(novel())));
console.log('Codex links passed: aliases, Unicode boundaries, inline formatting, excluded anchors/code, ambiguity per occurrence, edits, renaming, trash/restore, incoming links, tab safety, timeline metadata, and clean manuscript exports.');
