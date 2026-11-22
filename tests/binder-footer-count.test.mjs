import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { WorkspaceWordCount } from '../src/components/kachamak/WorkspaceWordCount.tsx';
import { newNovel } from '../src/lib/kachamak/seed.ts';

const note = (id, kind, content, children = []) => ({
  id, kind, title: 'Title does not count', content, children,
  synopsis: 'Two extras', notes: 'Another extra',
});
const annotation = note('nested', 'doc', 'Four five');
const scene = note('scene', 'scene', '<p>One <em>two</em><br>three</p>', [annotation]);
const second = note('second', 'scene', 'Six seven');
const nested = note('folder', 'folder', '', [second]);
const chapter = note('chapter', 'chapter', '<p>Eight</p>', [scene, nested]);
const other = note('other', 'chapter', 'Outside the chapter');
const legacy = note('legacy', 'doc', '', [note('old-scene', 'doc', 'Legacy scene')]);
const codex = note('codex', 'doc', 'Reference');
const book = newNovel('Footer test', 'Test');
book.sections.binder = [chapter, other, legacy];
book.sections.codex = [codex];

function footer(view, selected, overrides = {}) {
  const props = { novel: book, view, selected, section: 'binder', selectedSection: 'binder', ...overrides };
  const html = renderToStaticMarkup(createElement(WorkspaceWordCount, props));
  return JSDOM.fragment(html).firstElementChild.textContent.trim();
}
for (const view of ['write', 'continuous', 'split', 'list', 'corkboard']) {
  assert.equal(footer(view, scene), '3 words', 'A scene counts only its body, including when it has children');
  assert.equal(footer(view, chapter), '8 words', 'A chapter counts all descendants once, excluding siblings');
  assert.equal(footer(view, legacy), '2 words', 'Imported chapters can be ordinary parent notes');
  assert.equal(footer(view, null), '13 words');
}
second.content += ' added';
second.hidden = true;
assert.equal(footer('write', chapter), '9 words');
assert.equal(footer('continuous', chapter), '9 words', 'Hiding a descendant does not change the chapter length');
assert.equal(footer('continuous', scene, { rootId: other.id }), '3 words', 'Folder tabs respect their own scope');
assert.equal(footer('write', scene, { section: 'codex' }), '7 words', 'A different active tab retains its note counter');
assert.equal(footer('write', codex, { selectedSection: 'codex' }), '5 words', 'Retained Codex notes keep their original count');
assert.equal(footer('continuous', codex, { section: 'codex', selectedSection: 'codex' }), '1 word');
chapter.documentTarget = { amount: 120, unit: 'characters' };
assert.equal(footer('write', chapter), '9 words', 'An individual character target cannot replace the manuscript count');
