import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const {window} = new JSDOM('', {url: 'https://test.local'});
Object.assign(globalThis, {window, document: window.document});
const {useKachamak} = await import('../src/lib/kachamak/store');
const {currentPanelZoom, registerZoomReset, resetZoomUnderPointer} = await import('../src/lib/kachamak/workspace-zoom');

function open(book, tab, view = 'write') {
  useKachamak.setState({activeNovelId: book, activeTab: tab, view});
}
const value = panel => currentPanelZoom(useKachamak.getState(), panel);
const set = (panel, level) => useKachamak.getState().setPanelZoom(panel, level);
useKachamak.setState({leftZoom: 1, midZoom: 1.05, rightZoom: 1, paneAZoom: null, paneBZoom: null});

open('book-a', 'binder');
set('left', 1.2);
set('mid', 1.4);
assert.equal(value('right'), 1);
open('book-a', 'binder', 'split');
assert.equal(value('paneA'), 1.4);
set('paneA', 1.6);
set('paneB', 0.9);
assert.equal(value('mid'), 1.4);
for (const [book, tab] of [['book-a', 'codex'], ['book-a', 'note:custom'], ['book-b', 'binder']]) {
  open(book, tab);
  assert.equal(value('left'), 1);
  assert.equal(value('mid'), 1.05);
  assert.equal(value('paneA'), 1.05);
}
open('book-a', 'binder', 'homepage');
set('mid', 1.3);
open('book-a', 'codex', 'homepage');
assert.equal(value('mid'), 1.3);
open('book-a', 'binder', 'split');
assert.deepEqual(['left', 'mid', 'right', 'paneA', 'paneB'].map(value), [1.2, 1.4, 1, 1.6, 0.9]);
set('right', 9);
assert.equal(value('right'), 2);
set('right', 0);
set('right', NaN);
assert.equal(value('right'), 0.5);
// JSDOM has no pointing device. Supply the browser's hovered ancestor chain
// while real keyboard events originate from the focus in the other pane.
document.body.innerHTML = '<main><section><input id="a"></section><section><input id="b"></section></main>';
const a = document.getElementById('a'), b = document.getElementById('b');
a.focus();
const removeMain = registerZoomReset(document.querySelector('main'), () => set('mid', 1));
const removePane = registerZoomReset(b.parentElement, () => set('paneB', 1));
const query = document.querySelectorAll.bind(document);
document.querySelectorAll = selector => selector === ':hover' ? [document.body, document.querySelector('main'), b.parentElement, b] : query(selector);
window.addEventListener('keydown', resetZoomUnderPointer, true);
function press(key, options) {
  const event = new window.KeyboardEvent('keydown', {key, bubbles:true, cancelable:true, ...options});
  a.dispatchEvent(event);
  return event.defaultPrevented;
}
assert.equal(press('0', {}), false);
assert.equal(press('0', {ctrlKey:true, shiftKey:true}), false);
assert.equal(press('0', {ctrlKey:true, altKey:true}), false);
assert.equal(press('0', {ctrlKey:true, isComposing:true}), false);
assert.equal(press('Insert', {ctrlKey:true, code:'Numpad0'}), false);
assert.equal(value('paneB'), 0.9);
assert.equal(press('0', {ctrlKey:true, code:'Numpad0'}), true);
assert.equal(value('paneB'), 1);
assert.equal(value('paneA'), 1.6);
assert.equal(value('mid'), 1.4);
assert.equal(document.activeElement, a);
removePane();
removeMain();
set('paneB', 1.2);
press('0', {ctrlKey:true});
assert.equal(value('paneB'), 1.2);
window.removeEventListener('keydown', resetZoomUnderPointer, true);
delete document.querySelectorAll;
console.log('Verified independent zoom and Ctrl+0 targeting the hovered pane across keyboard focus.');
