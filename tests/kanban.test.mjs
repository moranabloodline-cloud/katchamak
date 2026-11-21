import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {moveKanbanCard, moveKanbanColumn, newKanbanBoard, validKanban, cardEntry, recordCardActivity, updateKanbanCard} from '../src/lib/kachamak/kanban.ts';
import {useKachamak, stepWorkspaceHistory, isUsableBackup, normalizeNovelSections} from '../src/lib/kachamak/store.ts';
import {validCloudLibrary} from '../src/lib/kachamak/cloud-write-validation.mjs';
import {findNode} from '../src/lib/kachamak/utils.ts';

const state = useKachamak.getState;
const board = newKanbanBoard();
const card = id => ({id,title:id,description:'Keep this line.\nAnd this one.',priority:'High',due:'2027-02-01'});
board.columns[0].cards.push(card('a'),card('b'),card('c'));
const moved = moveKanbanCard(board,'a','doing');
assert.deepEqual(moved.columns[1].cards,[board.columns[0].cards[0]]);
assert.deepEqual(moved.columns[0].cards.map(c=>c.id),['b','c']);
assert.deepEqual(moveKanbanCard(moved,'a','todo','c').columns[0].cards.map(c=>c.id),['b','a','c']);
assert.deepEqual(moveKanbanCard(board,'a','todo').columns[0].cards.map(c=>c.id),['b','c','a']);
assert.equal(moveKanbanCard(board,'b','todo','c'),board);
assert.equal(moveKanbanCard(board,'a','missing'),board);
assert.equal(moveKanbanCard(board,'a','doing','b'),board);
assert.equal(moveKanbanCard(board,'a','todo','a'),board);
assert.deepEqual(moveKanbanColumn(moved,'doing',1).columns.map(c=>c.id),['todo','done','doing']);
assert.equal(moveKanbanColumn(moved,'todo',-1),moved);
assert.ok(validKanban(moved));
const duplicate = structuredClone(moved);
duplicate.columns[0].cards.push(card('a'));
assert.equal(validKanban(duplicate),false);
assert.equal(validKanban({columns:[null]}),false);

state().createNovel('Board integration','Tester');
const bookId=state().activeNovelId;
const book=()=>state().novels.find(n=>n.id===bookId);
state().setTab('kanban');
const root=state().addNode('kanban',null,'doc','First draft');
const child=state().addNode('kanban',root,'doc','Revision');
const other=state().addNode('kanban',null,'doc','Editorial');
const getBoard=id=>findNode(book().sections.kanban,id);
assert.equal(getBoard(root).children[0].id,child);
state().updateNode('kanban',child,{kanban:board});
await Promise.resolve();
state().updateNode('kanban',child,{kanban:moved});
assert.ok(stepWorkspaceHistory('undo'));
assert.deepEqual(getBoard(child).kanban,board);
assert.ok(stepWorkspaceHistory('redo'));
assert.deepEqual(getBoard(child).kanban,moved);
state().updateNode('kanban',child,{kanban:duplicate});
assert.deepEqual(getBoard(child).kanban,moved);
state().moveNodeTo('kanban',root,'kanban',child);
assert.ok(book().sections.kanban.some(n=>n.id===root));
state().moveNodeTo('kanban',child,'kanban',other);
assert.equal(getBoard(other).children[0].id,child);
assert.deepEqual(getBoard(other).kanban,newKanbanBoard());
assert.deepEqual(getBoard(child).kanban,moved);
const saved=JSON.parse(JSON.stringify(book()));
assert.ok(isUsableBackup(saved));
assert.ok(validCloudLibrary({novels:[saved],collections:[]}));
assert.deepEqual(findNode(saved.sections.kanban,child).kanban,moved);
findNode(saved.sections.kanban,child).kanban=duplicate;
assert.equal(validCloudLibrary({novels:[saved],collections:[]}),false);
delete saved.sections.kanban;
assert.ok(isUsableBackup(saved));
normalizeNovelSections(saved);
assert.deepEqual(saved.sections.kanban,[]);
const cover='gallery:illustration';
state().editGallery(bookId,{type:'add',entries:[{kind:'image',id:'illustration',parentId:null,name:'Cover',image:'data:image/png;base64,AAAA'}]});
const detailed=updateKanbanCard(moved,'a',current=>recordCardActivity({
  ...current, start:'2027-01-01', complete:true, labels:[{name:'Draft',color:'#879abc'}], members:['Mira'],
  checklists:[{id:'proof',title:'Proof',items:[{id:'read',text:'Read aloud',done:true}]}],
  feed:[cardEntry('comment','Mira','Written before the move')], cover,
},'Mira','completed this card'));
const withMove=moveKanbanCard(detailed,'a','done',null,'Mira');
const updated=withMove.columns[2].cards[0];
assert.equal(updated.feed.at(-1).text,'moved this card from In progress to Done');
assert.deepEqual(updated.feed.slice(0,-1),detailed.columns[1].cards[0].feed);
assert.equal(moveKanbanCard(withMove,'a','done',null,'Mira'),withMove);
for (const invalidPatch of [
  {members:['Mira','mira']}, {checklists:[{id:'x',title:'List'}]}, {complete:'yes'},
  {feed:[{kind:'comment',author:'Mira',text:'Hi',at:0}]}, {labels:[{name:'X',color:'invalid'}]},
  {start:'2030-01-01'}, {cover:'https://example.com/photo.png'},
]) {
  assert.equal(validKanban(updateKanbanCard(withMove,'a',c=>({...c,...invalidPatch}))),false);
}
state().updateNode('kanban',child,{kanban:withMove});
assert.deepEqual(getBoard(child).kanban,withMove);
await Promise.resolve();
state().updateNode('kanban',child,{kanban:updateKanbanCard(withMove,'a',c=>({...c,cover:'gallery:missing'}))});
assert.deepEqual(getBoard(child).kanban,withMove,'An unavailable cover must be rejected');
const restored=JSON.parse(JSON.stringify(book()));
assert.ok(validCloudLibrary({novels:[restored],collections:[]}));
assert.deepEqual(findNode(restored.sections.kanban,child).kanban.columns[2].cards[0],updated);
restored.gallery=[];
assert.equal(isUsableBackup(restored),false);
assert.throws(()=>state().editGallery(bookId,{type:'remove',id:'illustration'}),/in use/);
state().deleteNode('kanban',child);
assert.throws(()=>state().editGallery(bookId,{type:'remove',id:'illustration'}),/in use/);
state().createNovel('Another book','Tester');
assert.equal(state().novels.find(n=>n.id===state().activeNovelId).sections.kanban.length,0);
console.log('Kanban ordering, nesting, book isolation, undo/redo, cloud validation and backup round-trip passed.');
