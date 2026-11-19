import { flattenNotes } from './note-links';
import type { NoteNode, Novel, SectionKey } from './types';

const textFields = new Set(['content', 'synopsis', 'notes', 'linkChoices', 'updatedAt']);

// Only active note text can differ. Keep the complete hierarchy, IDs, trash,
// attachments and unknown metadata in the comparison.
export function cloneLayout(book: Novel) {
  const notes = new Set(flattenNotes(book).map(row => row.node));
  return JSON.stringify(book, function (key, value) {
    if ((this === book && key === 'updatedAt') || (notes.has(this) && textFields.has(key))) return undefined;
    return value;
  });
}

function prose(node: NoteNode) {
  return JSON.stringify([node.content, node.synopsis, node.notes, node.linkChoices]);
}

function latestTimestamp(a: number, b: number) {
  // Older backups can omit timestamps.
  return a == null ? b : b == null ? a : Math.max(a, b);
}

// Overlay text by ID. A clone already contains the source texts and stable
// link IDs for its new nodes, which have no counterpart in the older book.
export function withExistingTexts(clone: Novel, edited: Novel, base?: Novel): Novel | undefined {
  const existing = flattenNotes(edited);
  const edits = new Map(existing.map(({node}) => [node.id, node]));
  const arrived = flattenNotes(clone).map(row => row.node);
  const current = new Map(arrived.map(node => [node.id, node]));
  if (edits.size !== existing.length || current.size !== arrived.length) return;
  if (base) {
    // The editor may have started before the other window saved its clone.
    // Accept only local text edits and an actual addition under Sort This.
    if (cloneLayout(base) !== cloneLayout(edited)) return;
    if (!arrived.some(node => node.title === 'Sort This' && node.children.some(child => !edits.has(child.id)))) return;
    for (const {node} of flattenNotes(base)) {
      const edit = edits.get(node.id)!;
      const previousText = prose(node), editedText = prose(edit);
      if (editedText === previousText) {
        edits.delete(node.id);
        continue;
      }
      const target = current.get(node.id);
      if (!target) return;
      const currentText = prose(target);
      if (currentText !== previousText && currentText !== editedText) return;
    }
  }
  const visit = (node: NoteNode): NoteNode => {
    const edit = edits.get(node.id);
    const children = node.children.map(visit);
    if (!edit) return {...node, children};
    return {...node, children, content:edit.content, synopsis:edit.synopsis, notes:edit.notes,
      linkChoices:edit.linkChoices, updatedAt:latestTimestamp(node.updatedAt, edit.updatedAt)};
  };
  const sections = {...clone.sections};
  for (const section of Object.keys(sections) as SectionKey[]) sections[section] = sections[section].map(visit);
  return {...clone, sections, updatedAt:latestTimestamp(clone.updatedAt, edited.updatedAt)};
}
