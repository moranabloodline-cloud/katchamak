import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://test.local', pretendToBeVisual: true }).window;
for (const key of ['window', 'document', 'Document', 'DocumentFragment', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'NodeFilter', 'DOMParser', 'Event', 'MouseEvent', 'CustomEvent', 'MutationObserver', 'getComputedStyle', 'navigator']) {
  const value = key === 'window' ? dom : key === 'getComputedStyle' ? dom.getComputedStyle.bind(dom) : dom[key];
  Object.defineProperty(globalThis, key, { configurable: true, value });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.requestAnimationFrame = dom.requestAnimationFrame.bind(dom);
globalThis.cancelAnimationFrame = dom.cancelAnimationFrame.bind(dom);
dom.matchMedia = () => ({ matches: false });
dom.HTMLElement.prototype.scrollIntoView = () => {};
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { NotesSection } = await import('../src/components/kachamak/NotesSection.tsx');
const { useKachamak } = await import('../src/lib/kachamak/store.ts');
const { newNovel } = await import('../src/lib/kachamak/seed.ts');

const note = (id, kind, content, children = []) => ({
  id, title: id, kind, content, children, synopsis: 'Private synopsis', notes: 'Private notes',
  status: '', label: '', createdAt: 1, updatedAt: 1,
});
const scene = note('Scene', 'scene', '<p>The lamp flickered.</p>');
const chapter = note('Chapter', 'chapter', '<p>Day broke.</p>', [
  scene, note('Folder', 'folder', '', [note('Second scene', 'scene', '<p>Footsteps crossed the bridge.</p>')]),
]);
const book = newNovel('Split test', 'Test');
book.sections.binder = [chapter, note('Outside', 'doc', 'Outside the chapter')];
useKachamak.setState({ novels: [book], activeNovelId: book.id, activeTab: 'binder', view: 'split',
  paneAId: chapter.id, paneBId: scene.id, activePane: 'a', selectedNodeId: scene.id });
const root = createRoot(document.body.appendChild(document.createElement('div')));
await React.act(async () => root.render(React.createElement(NotesSection, { section: 'binder' })));
const editor = side => document.querySelector(`[data-pane="${side}"] [contenteditable="true"]`);
const count = () => document.querySelector('[aria-label="View mode"]').parentElement.querySelector(':scope > span').textContent.trim();
async function clickPane(side, expected) {
  await React.act(async () => editor(side).dispatchEvent(new dom.MouseEvent('pointerdown', { bubbles: true })));
  assert.equal(useKachamak.getState().activePane, side);
  assert.equal(count(), expected);
}

try {
  assert.equal(count(), '9 words', 'Restored Split follows the left chapter even with a stale tree selection');
  await clickPane('a', '9 words');
  await clickPane('b', '3 words');
  await React.act(async () => useKachamak.getState().updateNode('binder', scene.id, {
    content: '<p>The lamp flickered twice.</p>', notes: 'More private notes', synopsis: 'A longer private synopsis',
  }));
  assert.equal(count(), '4 words');
  await clickPane('a', '10 words');
  await React.act(async () => document.querySelector('[data-pane="b"] input[aria-label="Title"]').focus());
  assert.equal(count(), '4 words', 'Keyboard focus follows the same pane as a click');
  assert.equal(editor('a').dataset.noteId, chapter.id);
  assert.equal(editor('b').dataset.noteId, scene.id);
  await React.act(async () => useKachamak.setState({ paneBId: null }));
  assert.equal(count(), '0 words', 'An empty active pane does not inherit the chapter or book total');
} finally {
  await React.act(async () => root.unmount());
  dom.close();
}
