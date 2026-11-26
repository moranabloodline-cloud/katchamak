// A save of existing notes can reuse the confirmed project structure at the same revision.
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
const reservedFields = new Set(['id', 'children', '__proto__', 'constructor', 'prototype']);
const editableField = key => typeof key === 'string' && !reservedFields.has(key);

function sameOrder(before, after) {
  return before.length === after.length && before.every((key, index) => key === after[index]);
}

function sameJson(before, after) {
  if (before === after) return true;
  if (Array.isArray(before)) {
    return Array.isArray(after) && before.length === after.length &&
      before.every((item, index) => sameJson(item, after[index]));
  }
  if (!isRecord(before) || !isRecord(after)) return false;
  const keys = Object.keys(before);
  return sameOrder(keys, Object.keys(after)) && keys.every(key => sameJson(before[key], after[key]));
}

function diffNotes(before, after, projectId, notes) {
  if (before === after) return true;
  if (!Array.isArray(before) || !Array.isArray(after) || before.length !== after.length) return false;
  for (let index = 0; index < before.length; index++) {
    const oldNote = before[index];
    const newNote = after[index];
    if (!isRecord(oldNote) || !isRecord(newNote) || !isId(oldNote.id) || oldNote.id !== newNote.id) return false;
    const oldKeys = Object.keys(oldNote);
    const newKeys = Object.keys(newNote);
    const update = newKeys.filter(key => editableField(key) && !sameJson(oldNote[key], newNote[key]));
    const remove = oldKeys.filter(key => editableField(key) && !Object.hasOwn(newNote, key));
    // Preserve serialized order, since the existing conflict review compares whole project JSON.
    const remaining = oldKeys.filter(key => Object.hasOwn(newNote, key));
    const added = update.filter(key => !Object.hasOwn(oldNote, key));
    if (!sameOrder([...remaining, ...added], newKeys) ||
        oldKeys.some(key => !editableField(key) && key !== 'children' && !sameJson(oldNote[key], newNote[key]))) return false;
    if (update.length || remove.length) {
      notes.push({ projectId, noteId: oldNote.id, fields: Object.fromEntries(update.map(key => [key, newNote[key]])), remove });
    }
    if (!diffNotes(oldNote.children, newNote.children, projectId, notes)) return false;
  }
  return true;
}

// Receives the same JSON values used by a full write, before adding navigation metadata.
export function createLibraryNotePatch(base, next) {
  if (!Array.isArray(base?.novels) || !Array.isArray(next?.novels) || base.novels.length !== next.novels.length ||
      !sameJson(base.collections, next.collections) || !sameJson(base.editorAppearance, next.editorAppearance)) return null;
  const notes = [];
  const projectTimes = [];
  for (let index = 0; index < base.novels.length; index++) {
    const before = base.novels[index];
    const after = next.novels[index];
    if (before === after) continue;
    if (!isRecord(before) || !isRecord(after) || !isId(before.id) || before.id !== after.id ||
        !isRecord(before.sections) || !isRecord(after.sections)) return null;
    const projectKeys = Object.keys(before);
    if (!Object.hasOwn(before, 'updatedAt') && Object.hasOwn(after, 'updatedAt')) projectKeys.push('updatedAt');
    if (!sameOrder(projectKeys, Object.keys(after)) ||
        projectKeys.some(key => key !== 'sections' && key !== 'updatedAt' && !sameJson(before[key], after[key]))) return null;
    const sectionKeys = Object.keys(before.sections);
    if (!sameOrder(sectionKeys, Object.keys(after.sections))) return null;
    const editStart = notes.length;
    if (!sectionKeys.every(key => diffNotes(before.sections[key], after.sections[key], before.id, notes))) return null;
    if (notes.length > editStart) {
      if (!Number.isSafeInteger(after.updatedAt)) return null;
      projectTimes.push({ projectId: before.id, updatedAt: after.updatedAt });
    } else if (before.updatedAt !== after.updatedAt) return null;
  }
  const patch = { notes, projectTimes };
  return validLibraryNotePatch(patch) ? patch : null;
}

export function validLibraryNotePatch(patch) {
  if (!isRecord(patch) || !Array.isArray(patch.notes) || !patch.notes.length || !Array.isArray(patch.projectTimes)) return false;
  const projectIds = new Set();
  for (const project of patch.projectTimes) {
    if (!isRecord(project) || !isId(project.projectId) || projectIds.has(project.projectId) ||
        !Number.isSafeInteger(project.updatedAt)) return false;
    projectIds.add(project.projectId);
  }
  const changes = new Set();
  const touchedProjects = new Set();
  for (const edit of patch.notes) {
    if (!isRecord(edit) || !projectIds.has(edit.projectId) || !isId(edit.noteId) ||
        !isRecord(edit.fields) || !Array.isArray(edit.remove)) return false;
    const keys = Object.keys(edit.fields);
    const unique = new Set([...keys, ...edit.remove]);
    if (!unique.size || unique.size !== keys.length + edit.remove.length || ![...unique].every(editableField)) return false;
    const address = edit.projectId + ':' + edit.noteId;
    if (changes.has(address)) return false;
    changes.add(address);
    touchedProjects.add(edit.projectId);
  }
  return touchedProjects.size === projectIds.size;
}

export function applyLibraryNotePatch(base, patch) {
  if (!Array.isArray(base?.novels) || !validLibraryNotePatch(patch)) return null;
  const projects = new Map(patch.projectTimes.map(({ projectId, updatedAt }) => [projectId, { updatedAt, notes: new Map() }]));
  for (const edit of patch.notes) projects.get(edit.projectId).notes.set(edit.noteId, edit);
  const novels = base.novels.slice();
  for (let index = 0; index < novels.length; index++) {
    const project = novels[index];
    const edits = projects.get(project?.id);
    if (!edits) continue;
    if (!isRecord(project.sections)) return null;
    const matched = new Set();
    let invalid = false;
    function patchNotes(nodes) {
      if (!Array.isArray(nodes)) { invalid = true; return nodes; }
      if (!nodes.length) return nodes;
      let hasChanges = false;
      const patched = nodes.map(node => {
        if (!isRecord(node)) { invalid = true; return node; }
        const children = patchNotes(node.children);
        const edit = edits.notes.get(node.id);
        if (!edit && children === node.children) return node;
        hasChanges = true;
        if (!edit) return { ...node, children };
        if (matched.has(node.id) || edit.remove.some(key => !Object.hasOwn(node, key))) invalid = true;
        matched.add(node.id);
        const changed = { ...node, ...edit.fields, children };
        for (const key of edit.remove) delete changed[key];
        return changed;
      });
      return hasChanges ? patched : nodes;
    }
    const sections = Object.fromEntries(Object.entries(project.sections).map(([key, nodes]) => [key, patchNotes(nodes)]));
    if (invalid || matched.size !== edits.notes.size) return null;
    novels[index] = { ...project, sections, updatedAt: edits.updatedAt };
    projects.delete(project.id);
  }
  return projects.size ? null : { ...base, novels };
}
