import assert from 'node:assert/strict';
import { readOnlyDemo } from '../scripts/read-only-demo.mjs';
import { calendarPreset, dateToMinute } from '../src/lib/kachamak/story-calendar.ts';

const app = 'https://app.draftopus.com';
const objectKey = 'shared-demos/morrigans-ocean/00000000-0000-4000-8000-000000000001/project.json';
const calendar = calendarPreset('gregorian');
const eventStart = dateToMinute(calendar, {year:2026,month:0,day:17,hour:10,minute:30});
const demo = {
  title: 'Morrigan’s Ocean',
  demo: { key: 'morrigans-ocean', version: 2 },
  cover: { image: 'gallery:cover' },
  gallery: [{ id: 'cover', kind: 'image', image: 'data:image/png;base64,aGVsbG8=' }],
  author: 'private author field',
  trash: [{ title: 'private deleted note' }],
  timeline: { calendar },
  homepage: { title: 'Public Atlas', blocks: [{ title: 'A harbour', text: 'On the coast.' }] },
  homePages: [{ title: 'Scene board', storyBoard: { scenes: [{ title: 'The voyage', synopsis: 'An open scene.' }] } }],
  sections: {
    binder: [{ title: 'Part I', kind: 'folder', children: [{
      title: 'First chapter <sample>',
      content: '<p>Opening &amp; light</p><p>Another <em>line</em>.</p>' +
        '<script>private script</script><img src="https://example.test/unexpected-image">' +
        '<p>&lt;literal&gt;</p>',
      notes: 'private editorial note',
    }]}],
    codex: [{ title: 'The lighthouse', synopsis: 'A Codex entry.' }, {title:'private hidden lore',hidden:true}],
    timeline: [{title:'Voyage begins',synopsis:'The crew departs.',event:{start:eventStart,precision:'time'}}],
    research: [{ title: 'private research note' }],
  },
};

const readEnvironment = (novel = demo, key = objectKey, version = 2) => {
  const bucketReads = [];
  return {
    DB: {
      prepare(statement) {
        assert.equal(statement, 'SELECT object_key,version FROM demo_catalog WHERE demo_key=?');
        return { bind(value) {
          assert.equal(value, 'morrigans-ocean');
          return { first: async () => ({ object_key: key, version }) };
        }};
      },
    },
    BUCKET: { async get(key) {
      bucketReads.push(key);
      return { text: async () => JSON.stringify(novel) };
    }},
    bucketReads,
  };
};

const env = readEnvironment();
const response = await readOnlyDemo(new Request(app + '/demo'), env);
assert.equal(response.status, 200);
assert.match(response.headers.get('Content-Security-Policy'), /default-src 'none'/);
assert.match(response.headers.get('Cache-Control'), /no-store/);
const html = await response.text();
assert.match(html, /Read-only demo/);
assert.match(html, /<h1>First chapter &lt;sample&gt;<\/h1>/);
assert.match(html, /<p>Opening &amp; light<\/p><p>Another line\.<\/p><p>&lt;literal&gt;<\/p>/);
assert.match(html, /href="\/demo\?tab=binder&amp;note=2"/);
assert.match(html, /src="data:image\/png;base64,aGVsbG8="/);
assert.doesNotMatch(html, /private |unexpected-image|<script|contenteditable|<form|>Save</i);

const codexResponse = await readOnlyDemo(new Request(app + '/demo?tab=codex&note=1'), env);
const codex = await codexResponse.text();
assert.match(codex, /href="\/demo\?tab=codex" aria-current="page">Codex/);
assert.match(codex, /<h1>The lighthouse<\/h1>/);
assert.match(codex, /<p>A Codex entry\.<\/p>/);
assert.doesNotMatch(codex, /Opening &amp; light|private hidden lore/);
assert.deepEqual(env.bucketReads, [objectKey, objectKey]);

const timeline = await (await readOnlyDemo(new Request(app + '/demo?tab=timeline'), env)).text();
assert.match(timeline, /<h1>Voyage begins<\/h1>/);
assert.match(timeline, /<p class="date">[^<]*January[^<]*10:30<\/p>/);
assert.match(timeline, /The crew departs\./);
const canvas = await (await readOnlyDemo(new Request(app + '/demo?tab=canvas&note=2'), env)).text();
assert.match(canvas, /<h1>Scene board<\/h1>/);
assert.match(canvas, /<h2>The voyage<\/h2>/);
assert.match(canvas, /<p>An open scene\.<\/p>/);
const noCanvas = readEnvironment({...demo,homepage:undefined,homePages:[]});
assert.match(await (await readOnlyDemo(new Request(app + '/demo?tab=canvas'), noCanvas)).text(),
  /href="https:\/\/draftopus\.com\/#tour\/canvas\/home"/);

const fallback = /href="https:\/\/draftopus\.com\/reader">Open public reader/;
assert.match(await (await readOnlyDemo(new Request(app + '/demo'), {})).text(), fallback);
assert.match(await (await readOnlyDemo(new Request(app + '/demo'), readEnvironment({
  ...demo, demo: { ...demo.demo, source: true },
}))).text(), fallback);
const privateObject = readEnvironment(demo, 'accounts/private/library/project.json');
assert.match(await (await readOnlyDemo(new Request(app + '/demo'), privateObject)).text(), fallback);
assert.deepEqual(privateObject.bucketReads, []);

const post = await readOnlyDemo(new Request(app + '/demo', { method: 'POST' }), {});
assert.equal(post.status, 405);
assert.equal(post.headers.get('Allow'), 'GET');
assert.equal((await readOnlyDemo(new Request(app + '/demo/media/example'), {})).status, 404);
console.log('Read-only demo passed: Binder, Codex, Timeline, and Canvas, with safe output and no writes.');
