import assert from 'node:assert/strict';
import { newNovel } from '../src/lib/kachamak/seed.ts';
import { SECTION_KEYS } from '../src/lib/kachamak/types.ts';
import { novelWords } from '../src/lib/kachamak/utils.ts';

function note(id, kind, content, children = []) {
  return { id, title: 'Title outside the manuscript', kind, content, children,
    synopsis: 'Synopsis in the inspector', notes: 'Private notes in the inspector' };
}

const book = newNovel('Manuscript count', 'Test');
const scene = note('scene', 'scene', '<p>One <em>two</em></p><p>three<br>four</p>');
const folder = note('folder', 'folder', '', [scene]);
const chapter = note('chapter', 'chapter', '<p>Five six</p>', [folder]);
const document = note('document', 'doc', '<p>Seven</p><img src="cover.png" alt="Book cover">');

for (const section of SECTION_KEYS) {
  book.sections[section] = section === 'binder' ? [] : [note(section, 'doc', 'Reference material')];
}
assert.equal(novelWords(book), 0);
book.sections.binder = [note('act', 'act', '<p>Eight</p>', [chapter]), document];
assert.equal(novelWords(book), 8, 'Count the body of every Binder node once, including parents');

book.publishManuscript = { included: [document.id], order: [document.id, scene.id] };
scene.notes = 'A much longer comment about this scene';
book.sections.codex.push(note('copy', 'doc', scene.content));
assert.equal(novelWords(book), 8, 'Export choices, inspector fields and reference copies are independent');

scene.content += '<p>Nine&nbsp;ten</p>';
assert.equal(novelWords(book), 10, 'Recalculate the total after editing a scene');
folder.children = [];
book.trash.push({ id: scene.id, node: scene, section: 'binder', parentId: folder.id, deletedAt: 1 });
assert.equal(novelWords(book), 4, 'Exclude scenes removed from the Binder');
folder.children.push(book.trash.pop().node);
assert.equal(novelWords(book), 10, 'Count restored scenes once');
