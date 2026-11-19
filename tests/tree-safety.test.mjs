import assert from 'node:assert/strict';
import { useKachamak } from '../src/lib/kachamak/store.ts';
import { newNovel } from '../src/lib/kachamak/seed.ts';
import { findNode } from '../src/lib/kachamak/utils.ts';
import { validCloudLibrary } from '../scripts/cloud-library-runtime.mjs';

const state = useKachamak.getState;
const book = () => state().novels[0];
const note = (id, children = []) => ({
  id, title:id, kind:'doc', children, content:'<p>Text for ' + id + '</p>', synopsis:'', notes:'',
  label:'', status:'', createdAt:1, updatedAt:1,
});
const chain = length => Array.from({length}, (_,i) => 'level-' + (i+1))
  .reduceRight((children,id) => [note(id,children)], []);
const first = newNovel('First test book','Tester');
first.sections.binder = chain(97);
first.sections.planning = [note('branch',[note('leaf')])];
const second = newNovel('Second test book','Tester');
useKachamak.setState({novels:[first,second],activeNovelId:first.id});
const validate = () => assert.ok(validCloudLibrary({novels:JSON.parse(JSON.stringify(state().novels)),collections:[]}));
state().moveNodeTo('planning','branch','binder','level-97');
assert.ok(findNode(book().sections.binder,'level-97').children.some(n=>n.id==='branch'));
validate();
const before = JSON.stringify(book());
assert.equal(state().addNode('binder','leaf','doc','Too deep'),null);
assert.equal(JSON.stringify(book()),before);
state().moveNodeTo('binder','branch','planning',null);
const sibling = state().addNode('binder','level-97','doc','Last parent');
const end = state().addNode('binder',sibling,'doc','Last allowed');
assert.ok(end);
const beforeMove = JSON.stringify(book());
state().moveNodeTo('planning','branch','binder',sibling);
assert.equal(JSON.stringify(book()),beforeMove,'Moving a whole branch too deep is atomic');
state().moveNodeTo('planning','branch','binder','missing-parent');
assert.equal(JSON.stringify(book()),beforeMove,'A vanished parent cannot redirect a move');

const folder = state().addNode('binder',null,'doc','Folder');
state().moveNodeTo('planning','branch','binder',folder);
state().deleteNode('binder','branch');
const deleted = book().trash[0].id;
// The parent still exists, but now there is only one level below it.
state().moveNodeTo('binder',folder,'binder','level-97');
const beforeRestore = JSON.stringify(book());
assert.match(state().restoreFromTrash(deleted),/deep/i);
assert.equal(JSON.stringify(book()),beforeRestore,'Failed restore keeps the entire Trash item');
state().moveNodeTo('binder',folder,'binder',null);
assert.equal(state().restoreFromTrash(deleted),undefined);
assert.equal(findNode(book().sections.binder,'leaf').content,'<p>Text for leaf</p>');
validate();
state().deleteNode('binder','branch');
const confirmed = new Set(book().trash.map(item=>item.id));
const isolated = structuredClone(book().trash);
second.trash = structuredClone(isolated); // Imported projects may share Trash IDs.
useKachamak.setState({activeNovelId:second.id});
state().deleteForever(isolated[0].id,first.id);
assert.deepEqual(second.trash,isolated);
assert.equal(state().emptyTrash(first.id,confirmed),false);
assert.deepEqual(second.trash,isolated);
useKachamak.setState({activeNovelId:first.id});
state().deleteNode('binder',end);
const pending = structuredClone(book().trash);
assert.equal(state().emptyTrash(first.id,confirmed),false);
assert.deepEqual(book().trash,pending);
assert.ok(state().emptyTrash(first.id,new Set(pending.map(item=>item.id))));
assert.deepEqual(book().trash,[]);
assert.deepEqual(second.trash,isolated);
validate();
console.log('Tree placement, restore, stale Trash confirmations, cross-book isolation and cloud readability passed.');
process.env.NEXT_PUBLIC_KATCHAMAK_DESKTOP = '1';
const deepest = state().addNode('binder',sibling,'doc','Offline level 99');
assert.ok(state().addNode('binder',deepest,'doc','Offline level 100'),'Offline editing retains its existing depth support');
