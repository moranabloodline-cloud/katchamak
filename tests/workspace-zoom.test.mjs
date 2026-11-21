import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const {window} = new JSDOM('', {url: 'https://test.local'});
Object.assign(globalThis, {window, document: window.document});
const {useKachamak} = await import('../src/lib/kachamak/store');
const {currentPanelZoom} = await import('../src/lib/kachamak/workspace-zoom');

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
console.log('Verified zoom isolation by project, tab and pane, legacy defaults and bounds.');
