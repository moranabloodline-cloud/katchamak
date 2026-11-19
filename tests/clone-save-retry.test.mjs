import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import { Window } from 'happy-dom';
import { newNovel } from '../src/lib/kachamak/seed.ts';

const dom = new Window({url: 'https://clone.synthetic.invalid'});
globalThis.window = dom;
globalThis.document = dom.document;
globalThis.indexedDB = indexedDB;
const bundle = await Bun.build({entrypoints: ['tests/fixtures/local-recovery-window.ts'], target: 'browser'});
assert.ok(bundle.success);
const code = await bundle.outputs[0].text();
let windowId = 0, owner, remote, failure;
async function openWindow() {
  const module = await import('data:text/javascript;base64,' + Buffer.from(code + '\n// window ' + ++windowId).toString('base64'));
  await module.initializeWebLibrary();
  return module;
}
const note = (id, content) => ({id, title:id, kind:'doc', content, synopsis:'', notes:'', status:'', label:'', createdAt:1, updatedAt:1, children:[]});
const source = newNovel('Source', 'Synthetic'), destination = newNovel('Destination', 'Synthetic');
source.sections.prompts = [note('parent','<p><a href="#note/child">Čitaj dalje</a></p>')];
source.sections.prompts[0].children = [note('child','<p>Rukopis <b>ostaje</b>.</p>')];
destination.sections.research = [note('child','<p>Existing note in the destination</p>')];
const reset = id => {
  owner = id;
  failure = null;
  remote = {revision:1, snapshot:structuredClone({novels:[source,destination],collections:[]})};
};
globalThis.fetch = async (path, init = {}) => {
  if (path === '/api/account') return Response.json({id:owner,email:owner+'@synthetic.invalid'});
  assert.equal(new Headers(init.headers).get('X-Katchamak-Account'), owner);
  if (path === '/api/library' && init.method === 'POST') {
    if (failure === 'before') throw new TypeError('Synthetic disconnect');
    const body = JSON.parse(init.body);
    if (body.revision !== remote.revision) return Response.json({conflict:true},{status:409});
    remote = {revision:remote.revision+1, snapshot:body.snapshot};
    if (failure === 'after') throw new TypeError('Synthetic disconnect');
    return Response.json({revision:remote.revision});
  }
  return Response.json(remote);
};
const books = w => w.useKachamak.getState().novels;
const clone = w => w.saveWorkspaceClone(books(w)[0],'prompts',books(w)[1],'research').saving;
for (const failureAt of ['before','after']) {
  for (const retry of ['save','menu','reload']) {
    reset(failureAt+'-'+retry);
    let w = await openWindow();
    failure = failureAt;
    await assert.rejects(clone(w), /disconnect|network|reach/i);
    const expected = JSON.parse(JSON.stringify(books(w)));
    const folder = expected[1].sections.research[1], [parent] = folder.children;
    assert.equal(folder.title,'Sort This');
    assert.equal(parent.content,'<p><a href="#note/'+parent.children[0].id+'">Čitaj dalje</a></p>');
    assert.deepEqual(remote.snapshot.novels[0],source);
    assert.deepEqual(remote.snapshot.novels[1],failureAt==='before'?destination:expected[1]);
    failure = null;
    if (retry === 'save') await w.flushWebLibrary();
    if (retry === 'menu') await clone(w);
    if (retry === 'reload') {
      w = await openWindow();
      if (failureAt === 'before') {
        const [draft] = w.useLocalRecovery.getState().drafts;
        assert.ok(draft.retryClone);
        assert.deepEqual(books(w)[1],destination,'Refresh never uploads the draft automatically');
        // Lose the response to the manual recovery itself, then click the same action again.
        failure = 'after';
        await assert.rejects(w.recoverLocalDraft(draft));
        failure = null;
        await w.recoverLocalDraft(draft);
      }
    }
    w = await openWindow();
    assert.deepEqual(books(w),expected);
    assert.deepEqual(remote.snapshot.novels,expected);
    assert.deepEqual(await w.draftStorage.list(owner),[]);
    assert.equal(remote.revision,2,'Exactly one successful commit of the clone');
  }
}
reset('concurrent');
let w = await openWindow();
failure = 'before';
await assert.rejects(clone(w));
const expectedBook = JSON.parse(JSON.stringify(books(w)[1]));
failure = null;
// An unrelated source edit in another window must survive retry after refresh.
remote.snapshot.novels[0].sections.prompts[0].notes = '<p>Newer text in source</p>';
remote.revision++;
w = await openWindow();
assert.equal(w.useLocalRecovery.getState().drafts[0].retryClone,true);
await clone(w);
assert.deepEqual(remote.snapshot.novels[1],expectedBook);
assert.equal(remote.snapshot.novels[0].sections.prompts[0].notes,'<p>Newer text in source</p>');
for (const failureAt of ['before','after']) {
  for (const action of ['retry','reload']) {
    reset('two-windows-'+failureAt+'-'+action);
    const existingInbox = note('inbox','<p>Folder text</p>');
    existingInbox.title = 'Sort This';
    existingInbox.children = [note('previous','<p>Previous copy</p>')];
    remote.snapshot.novels[1].sections.research.push(existingInbox);
    let writer = await openWindow();
    const editor = await openWindow();
    failure = failureAt;
    await assert.rejects(clone(writer));
    const expectedInbox = structuredClone(books(writer)[1].sections.research[1]);
    failure = null;
    editor.useKachamak.setState({activeNovelId:destination.id});
    editor.useKachamak.getState().updateNode('research','previous',{
      content:'<p><b>Concurrent text</b> Čuvaj.</p>', notes:'New notes', synopsis:'New synopsis',
      linkChoices:[{start:0,end:10,text:'Concurrent',targetId:'child'}],
    });
    await editor.flushWebLibrary();
    const revisionAfterEdit = remote.revision;
    const edited = structuredClone(remote.snapshot.novels[1].sections.research[1].children[0]);
    assert.match(edited.content,/Concurrent text/);
    if (action === 'retry') await writer.flushWebLibrary();
    else {
      writer = await openWindow();
      const drafts = writer.useLocalRecovery.getState().drafts;
      if (failureAt === 'before') {
        assert.equal(drafts.length,1);
        assert.equal(drafts[0].retryClone,true);
        await writer.recoverLocalDraft(drafts[0]);
      } else assert.deepEqual(drafts,[]);
    }
    const reopened = await openWindow(), [original,updated] = books(reopened);
    assert.deepEqual(original,source);
    assert.equal(books(reopened).length,2);
    const [unrelated,inbox] = updated.sections.research;
    assert.equal(updated.sections.research.length,2);
    assert.deepEqual(unrelated,destination.sections.research[0]);
    assert.equal(inbox.id,'inbox');
    assert.deepEqual(inbox.children,[edited, ...JSON.parse(JSON.stringify(expectedInbox.children.slice(1)))]);
    assert.equal(inbox.children[1].content,'<p><a href="#note/'+inbox.children[1].children[0].id+'">Čitaj dalje</a></p>');
    assert.equal(remote.revision,revisionAfterEdit+(failureAt==='before'?1:0));
    assert.deepEqual(await writer.draftStorage.list(owner),[]);
  }
}
reset('structural-conflict');
w = await openWindow();
failure = 'before';
await assert.rejects(clone(w));
failure = null;
w = await openWindow();
const [stale] = w.useLocalRecovery.getState().drafts;
remote.snapshot.novels[1].sections.research[0].title = 'Concurrent rename';
remote.revision++;
const before = structuredClone(remote);
await assert.rejects(w.recoverLocalDraft(stale),/destination changed/);
assert.deepEqual(remote,before);
assert.equal(w.useLocalRecovery.getState().drafts[0].retryClone,false);
assert.equal((await w.draftStorage.list(owner)).length,1);
reset('competing-text');
const first = await openWindow(), second = await openWindow();
failure = 'after';
await assert.rejects(clone(first));
failure = null;
const third = await openWindow();
third.useKachamak.setState({activeNovelId:destination.id});
third.useKachamak.getState().updateNode('research','child',{content:'<p>Third window saved first</p>'});
await third.flushWebLibrary();
second.useKachamak.setState({activeNovelId:destination.id});
second.useKachamak.getState().updateNode('research','child',{content:'<p>Competing text</p>'});
const beforeConflict = structuredClone(remote);
await assert.rejects(second.flushWebLibrary(),/Another window changed/);
assert.deepEqual(remote,beforeConflict);
assert.equal(books(second)[1].sections.research[0].content,'<p>Competing text</p>');
reset('other-local-edits');
w = await openWindow();
w.useKachamak.setState({activeNovelId:source.id});
w.useKachamak.getState().updateNode('prompts','parent',{notes:'Unsaved text in another book'});
failure = 'before';
await assert.rejects(clone(w));
const [mixed] = await w.draftStorage.list(owner);
assert.equal(mixed.clone,undefined,'A clone-only retry must never discard other unsaved work');
assert.equal(JSON.parse(mixed.snapshot).novels[0].sections.prompts[0].notes,'Unsaved text in another book');
failure = null;
await w.flushWebLibrary();
assert.equal(remote.snapshot.novels[0].sections.prompts[0].notes,'Unsaved text in another book');
dom.happyDOM.abort();
console.log('Clone save retry passed: interruption before/after commit, repeat menu, reload, lost recovery response, stable links, source isolation and destination conflict.');
