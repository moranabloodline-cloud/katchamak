import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { Database } from 'bun:sqlite';
import { Window } from 'happy-dom';
import { accountApi } from '../scripts/accounts-runtime.mjs';
import { cloudLibraryApi, validCloudLibrary } from '../scripts/cloud-library-runtime.mjs';
import { newNovel } from '../src/lib/kachamak/seed';
import { calendarPreset } from '../src/lib/kachamak/story-calendar';
import { isUsableBackup, normalizeNovelSections, useKachamak } from '../src/lib/kachamak/store';

// All storage, accounts and manuscripts in this test are synthetic and in memory.
globalThis.accountApi = accountApi;
const sql = new Database(':memory:');
for (const file of readdirSync('drizzle').filter(f => f.endsWith('.sql')).sort()) {
  for (const statement of readFileSync('drizzle/' + file, 'utf8').split('--> statement-breakpoint')) if (statement.trim()) sql.exec(statement);
}
const DB = { prepare(query) { let values = []; const statement = {
  bind(...v) { values = v; return statement; },
  async run() { return { meta: { changes: sql.query(query).run(...values).changes } }; },
  async first() { return sql.query(query).get(...values); },
  async all() { return { results: sql.query(query).all(...values) }; },
}; return statement; } };
const objects = new Map(); let writes = 0;
const BUCKET = {
  async put(key, data) { writes++; objects.set(key, data); },
  async get(key) { return objects.has(key) ? { text: async () => objects.get(key) } : null; },
  async delete(key) { objects.delete(key); },
};
const user = 'validation@test.local', origin = 'https://test.local';
const env = { DB, BUCKET, KATCHAMAK_ADMIN_EMAIL: user };
let handler = cloudLibraryApi;
if (process.env.KATCHAMAK_TEST_PACKAGED_VALIDATION === '1') {
  const source = readFileSync('dist/server/index.js', 'utf8');
  const { default: worker } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  handler = (request, bindings) => worker.fetch(request, bindings);
}
async function call(path = '/api/library', method = 'GET', body) {
  const headers = { 'oai-authenticated-user-id': user, 'oai-authenticated-user-email': user, 'X-Katchamak-Account': user, Origin: origin, 'Content-Type': 'application/json' };
  const request = new Request(origin + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return path === '/api/account' ? accountApi(request, env) : handler(request, env);
}
const node = (id, extra = {}) => ({ id, kind: 'doc', title: id, content: '<p>Čuvaj <strong>svaku reč</strong> &amp; link.</p>', children: [], ...extra });
const modern = newNovel('Validation fixture', 'Synthetic author');
modern.sections.binder = [node('chapter', { children: [node('child')], aliases: ['Alias'], linkChoices: [{start: 0, end: 5, text: 'Čuvaj', targetId: null}], customField: {keep: ['everything']} })];
modern.sections.timeline = [node('period', {timelineKind: 'period', event: {type: 'period', start: -100, end: 100, precision: 'year'}, children: [node('outside-legacy', {event: {start: 101, end: 101, precision: 'day'}})]})];
modern.timeline = { rootId: null, detail: 'synopsis', compact: false, calendar: calendarPreset('gregorian') };
modern.trash = [{ id: 'trash', section: 'binder', node: node('deleted', {children: [node('deleted-child')]}), deletedAt: 1 }];
modern.hiddenInspectorTabs = ['info','details','mentions','family'];
modern.hiddenSections = ['planning']; modern.openNoteTabs = ['chapter']; modern.extension = { retained: true };
const wrap = novel => ({ novels: [novel], collections: [] });
const clone = value => JSON.parse(JSON.stringify(value));
const clientAccepts = value => { try { return isUsableBackup(value); } catch { return false; } };
assert.equal((await call('/api/library', 'POST', {revision: 0, snapshot: wrap(modern)})).status, 200);

const invalidCases = [
  ['zero-day month', n => n.timeline.calendar.months[0].days = 0],
  ['invalid trash content', n => n.trash[0].node.content = 42],
  ['nested trash content', n => n.trash[0].node.children[0].content = {}],
  ['trash section', n => n.trash[0].section = 'missing'],
  ['trash tree', n => n.trash[0].node.children = null],
  ['trash shape', n => n.trash = {}],
  ['blank title', n => n.title = '  '],
  ['cover fields', n => delete n.cover.bg],
  ['note kind', n => delete n.sections.binder[0].kind],
  ['note metadata', n => n.sections.binder[0].synopsis = 4],
  ['link choices', n => n.sections.binder[0].linkChoices[0].end = 0],
  ['custom section', n => n.sections.custom = [node('custom', {notes: 1})]],
  ['statuses', n => n.statuses = [3]],
  ['labels', n => n.labels = [{id: 'x', name: 'x'}]],
  ['open tabs', n => n.openNoteTabs = [3]],
  ['hidden sections', n => n.hiddenSections = ['binder']],
  ['unknown inspector tab', n => n.hiddenInspectorTabs = ['timeline']],
  ['duplicate inspector tab', n => n.hiddenInspectorTabs = ['info','info']],
  ['timeline shape', n => n.timeline = null],
  ['timeline root', n => n.timeline.rootId = 3],
  ['timeline detail', n => n.timeline.detail = 'invalid'],
  ['timeline scope', n => n.timeline.eventScope = 'invalid'],
  ['timeline compact', n => n.timeline.compact = 'true'],
  ['timeline display', n => n.timeline.display = 'invalid'],
  ['calendar shape', n => n.timeline.calendar = null],
  ['weekdays', n => n.timeline.calendar.weekdays = []],
  ['leap rules', n => n.timeline.calendar.leap.every = 0],
  ['calendar eras', n => n.timeline.calendar.eras = [{id:'x', name:'X', abbreviation:'X', startYear:0}]],
  ['calendar range', n => n.timeline.calendar.range = {start:10, end:1}],
  ['calendar moon', n => n.timeline.calendar.moons = [{id:'x', name:'X', period:0, offset:0, color:'#123456'}]],
  ['timeline groups', n => n.timeline.groups = [{id:'x', name:'X', color:'invalid'}]],
  ['hidden groups', n => n.timeline.hiddenGroups = [3]],
  ['timeline span', n => n.timeline.span = 0],
  ['timeline center', n => n.timeline.center = 9e15],
  ['event group', n => n.sections.timeline[0].event.groupId = 3],
];
const saved = await (await call()).json(), savedObjects = [...objects], savedWrites = writes;
for (const [label, mutate] of invalidCases) {
  const invalid = clone(modern); mutate(invalid);
  assert.equal(clientAccepts(invalid), false, label + ': existing reader rejects');
  assert.equal(validCloudLibrary(wrap(invalid)), false, label + ': cloud rejects');
  assert.equal((await call('/api/library', 'POST', {revision:saved.revision, snapshot:wrap(invalid)})).status, 400, label);
  assert.deepEqual(await (await call()).json(), saved, label + ': saved revision and content preserved');
  assert.equal(writes, savedWrites, label + ': no snapshot writes');
  assert.deepEqual([...objects], savedObjects, label + ': no old snapshot removed');
}

const legacy = clone(modern);
for (const key of ['timeline','trash','statuses','labels','openNoteTabs','hiddenSections','hiddenInspectorTabs']) delete legacy[key];
delete legacy.sections.timeline;
legacy.sections.binder[0].kind = 'scene'; // Historical note kinds remain legal.
const custom = clone(modern);
custom.timeline.calendar = calendarPreset('uniform');
Object.assign(custom.timeline.calendar, {yearZero:true, eras:[{id:'second', name:'Second Age', abbreviation:'SA', startYear:2}], moons:[{id:'moon', name:'Moon', period:7, offset:0, color:'#123456'}]});
custom.timeline.eventScope = 'book';
const partial = clone(legacy); partial.sections = {binder: partial.sections.binder}; delete partial.author;
partial.codex = [{id:'category', name:'Characters', children:[], entries:[{id:'person', title:'Person', content:'<p>Legacy Codex text.</p>', aliases:[], entryType:'', status:'', createdAt:1, updatedAt:1}]}];
assert.equal(isUsableBackup(partial), true, 'Pre-unification backup remains readable');
const imported = useKachamak.getState().importNovel(JSON.stringify({format:'katchamak-project', version:1, storeVersion:7, novel:partial}));
assert.equal(imported.ok, true, 'Existing desktop wrapper and legacy import still work');
const migrated = clone(useKachamak.getState().novels[0]);
assert.equal(migrated.sections.codex[0].children[0].content, '<p>Legacy Codex text.</p>');
const oldTimeline = clone(legacy);
oldTimeline.timeline = {rootId:null, detail:'titles', compact:true}; // Before custom calendars existed.
const validProjects = [modern, legacy, oldTimeline, custom, migrated];
for (const project of validProjects) {
  const before = clone(project);
  assert.equal(isUsableBackup(project), true);
  assert.equal(validCloudLibrary(wrap(project)), true);
  assert.deepEqual(project, before, 'Neither validator mutates or strips fields');
}
// Save all supported forms, then exercise the real client's read/edit/save/reload path.
validProjects.forEach((project, i) => project.id = 'fixture-' + i);
assert.equal((await call('/api/library', 'POST', {revision:saved.revision, snapshot:{novels:validProjects,collections:[]}})).status, 200);
assert.deepEqual((await (await call()).json()).snapshot.novels, validProjects);
const dom = new Window({url:origin}); globalThis.window = dom; globalThis.document = dom.document;
globalThis.fetch = (path, init={}) => call(path, init.method || 'GET', init.body ? JSON.parse(init.body) : undefined);
useKachamak.setState({novels:[], activeNovelId:null});
const cloud = await import('../src/lib/kachamak/cloud-library');
await cloud.initializeWebLibrary();
const expected = clone(validProjects); expected.forEach(normalizeNovelSections);
assert.deepEqual(useKachamak.getState().novels, expected, 'All formats load using existing normalization');
useKachamak.setState({activeNovelId:'fixture-0',activeTab:'binder',selectedNodeId:'chapter'});
useKachamak.getState().updateNode('binder','chapter',{content:'<p>Nova rečenica — čćšđž.</p>'});
const edited = clone(useKachamak.getState().novels);
await cloud.saveWebLibrary();
await cloud.reloadWebLibrary();
assert.deepEqual(useKachamak.getState().novels, edited, 'Save/reload preserves every project field and exact manuscript HTML');
assert.equal(cloud.useWebLibrary.getState().pending, false);
// A rejected save must also retain the new text in the open client for repair/retry.
const beforeFailure = await (await call()).json();
useKachamak.getState().updateNode('binder','chapter',{content:'<p>Unsaved text must survive validation failure.</p>'});
const brokenCalendar = clone(modern.timeline.calendar); brokenCalendar.months[0].days = 0;
useKachamak.getState().setTimeline({calendar:brokenCalendar});
await assert.rejects(() => cloud.saveWebLibrary(), /Invalid library/);
assert.equal(cloud.useWebLibrary.getState().pending, true);
assert.equal(useKachamak.getState().novels[0].sections.binder[0].content, '<p>Unsaved text must survive validation failure.</p>');
assert.deepEqual(await (await call()).json(), beforeFailure, 'Validation failure keeps the last good server snapshot');
useKachamak.getState().setTimeline({calendar:clone(modern.timeline.calendar)});
await cloud.saveWebLibrary(); await cloud.reloadWebLibrary();
assert.equal(useKachamak.getState().novels[0].sections.binder[0].content, '<p>Unsaved text must survive validation failure.</p>');
// Exercise the actual Dashboard/Settings importer, not only store.importNovel.
const missingAuthor = clone(modern); delete missingAuthor.author;
for (const [label, source] of [['current', modern], ['missing author', missingAuthor], ['legacy defaults and Codex', partial]]) {
  for (const wrapped of [false, true]) {
    const beforeImport = clone(useKachamak.getState().novels);
    const input = wrapped ? {format:'katchamak-project', version:1, storeVersion:7, novel:source} : source;
    await cloud.importWebProject(JSON.stringify(input), null);
    const importedId = useKachamak.getState().activeNovelId;
    assert.ok(importedId && importedId !== source.id && !beforeImport.some(n => n.id === importedId), label + ': new copy, never replace');
    const expectedImport = {...clone(source), id:importedId, author:source.author??'', trash:clone(source.trash??[]), statuses:clone(source.statuses??[]), labels:clone(source.labels??[])};
    normalizeNovelSections(expectedImport);
    const savedImport = (await (await call()).json()).snapshot.novels;
    if (source.codex) {
      // The existing Codex migration creates IDs and folder timestamps. Compare
      // all source-derived fields, then verify those generated values survive reload.
      const stableCodex = nodes => nodes.map(({id, ...n}) => {
        if (n.kind === 'folder') { delete n.createdAt; delete n.updatedAt; }
        return {...n, children:stableCodex(n.children)};
      });
      assert.deepEqual(stableCodex(savedImport.at(-1).sections.codex), stableCodex(expectedImport.sections.codex));
      expectedImport.sections.codex = clone(savedImport.at(-1).sections.codex);
    }
    assert.deepEqual(savedImport, [...beforeImport, expectedImport], label + ': exact cloud content and all existing projects preserved');
    await cloud.reloadWebLibrary();
    assert.deepEqual(useKachamak.getState().novels, [...beforeImport, expectedImport], label + ': same fields, text, links and nested notes after reload');
    assert.equal(cloud.useWebLibrary.getState().pending, false, label + ': fully saved');
  }
}
const beforeInvalidImport = clone(useKachamak.getState().novels), savedBeforeInvalidImport = await (await call()).json();
await assert.rejects(() => cloud.importWebProject(JSON.stringify({...modern, author:42}), null), /Not a Katchamak project/);
assert.deepEqual(useKachamak.getState().novels, beforeInvalidImport, 'Invalid author is rejected before changing the open library');
assert.deepEqual(await (await call()).json(), savedBeforeInvalidImport, 'Invalid author leaves saved library and revision unchanged');
console.log(`Cloud validation passed: ${invalidCases.length} rejected cases without writes; modern/legacy/custom/imported formats; real client save/reload; six active JSON/desktop imports with library preservation${process.env.KATCHAMAK_TEST_PACKAGED_VALIDATION === '1' ? ' against packaged Worker' : ''}.`);
