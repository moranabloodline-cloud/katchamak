import assert from "node:assert/strict";
import { mock } from "bun:test";

const cache = new Map();
globalThis.localStorage = { getItem: key => cache.get(key) ?? null, setItem: (key, value) => cache.set(key, String(value)), removeItem: key => cache.delete(key) };
globalThis.window = { __TAURI_INTERNALS__: {} };
const disk = new Map();
let cancel = false, version = 0, failWrite = false;
const clone = value => structuredClone(value);
mock.module("@tauri-apps/api/core", () => ({ invoke: async (command, args) => {
  if (command === "save_disk_recovery") return;
  if (command === "load_disk_projects") return { projects: [...disk.values()].map(clone), registered_ids: [...disk.keys()], errors: [] };
  if (command === "create_disk_project") {
    if (cancel) return null;
    const result = { path: `D:/User projects/${args.document.novel.id}.katchamak/project.json`, document: clone(args.document), revision: String(++version) };
    disk.set(args.document.novel.id, result); return clone(result);
  }
  if (command === "save_disk_project") {
    if (failWrite) throw new Error("Disk not writable");
    assert.equal(args.expectedRevision, disk.get(args.id).revision);
    const result = { ...disk.get(args.id), document: clone(args.document), revision: String(++version) };
    disk.set(args.id, result); return clone(result);
  }
  if (command === "read_disk_project") return clone(disk.get(args.id));
  if (command === "forget_disk_project") { disk.delete(args.id); return; }
  if (command === "migrate_disk_projects") {
    if (cancel) return null;
    return args.documents.map(document => {
      const result = { path: `D:/User projects/${document.novel.id}.katchamak/project.json`, document: clone(document), revision: String(++version) };
      disk.set(document.novel.id, result); return clone(result);
    });
  }
  throw new Error(command);
} }));
const { useKachamak } = await import("../src/lib/kachamak/store.ts");
const { initializeProjectFiles, createFileProject, flushProjectFiles, openRecentProject, useProjectFiles, importFileProject, removeFileProject, migrateExistingProjects } = await import("../src/lib/kachamak/project-files.ts");
await initializeProjectFiles();
assert.deepEqual(useKachamak.getState().novels, [], "new install never creates personal sample projects");
useKachamak.getState().createNovel("Existing personal project", "Existing author");
const legacy = clone(useKachamak.getState().novels[0]);
await initializeProjectFiles();
assert.deepEqual(useProjectFiles.getState().legacyIds, [legacy.id]);
cancel = true;
await migrateExistingProjects();
assert.deepEqual(useKachamak.getState().novels[0], legacy, "cancelled migration preserves the existing library");
cancel = false;
await migrateExistingProjects();
assert.deepEqual(disk.get(legacy.id).document.novel, legacy, "migration preserves project IDs, manuscripts and author");
assert.deepEqual(useProjectFiles.getState().legacyIds, []);
await removeFileProject(legacy.id);
cancel = true;
assert.equal(await createFileProject("Cancelled", "Tester"), null);
assert.equal(useKachamak.getState().novels.length, 0, "cancelling a location does not create a phantom project");
cancel = false;
const id = await createFileProject("Test project", "Tester");
assert.ok(disk.has(id));
assert.ok(useProjectFiles.getState().paths[id].startsWith("D:/User projects/"));
const note = useKachamak.getState().addNode("binder", null, "doc", "Test note");
useKachamak.getState().updateNode("binder", note, { content: "<p>Stored on disk.</p>" });
await flushProjectFiles();
assert.equal(disk.get(id).document.novel.sections.binder[0].content, "<p>Stored on disk.</p>");
assert.equal(useProjectFiles.getState().pending, false);
failWrite = true;
useKachamak.getState().updateNode("binder", note, { content: "<p>Keep unsaved edits.</p>" });
await assert.rejects(flushProjectFiles(), /Disk not writable/);
assert.equal(disk.get(id).document.novel.sections.binder[0].content, "<p>Stored on disk.</p>");
assert.equal(useKachamak.getState().novels[0].sections.binder[0].content, "<p>Keep unsaved edits.</p>");
failWrite = false;
await flushProjectFiles();
disk.get(id).document.novel.title = "External title";
await openRecentProject(id);
assert.equal(useKachamak.getState().novels[0].title, "External title", "opening reads the actual registered file, not a stale library copy");
const imported = await importFileProject(JSON.stringify(useKachamak.getState().novels[0]));
assert.notEqual(imported, id);
assert.ok(disk.has(imported));
await assert.rejects(importFileProject('{"title":"bad"}'));
const original = clone(disk.get(id));
await removeFileProject(id);
assert.equal(useKachamak.getState().novels.some(n => n.id === id), false);
assert.equal(original.document.novel.sections.binder[0].content, "<p>Keep unsaved edits.</p>");
console.log("Project-file bridge: empty install, cancellation, disk save, failed-write recovery, path reopening, import and library removal passed.");
