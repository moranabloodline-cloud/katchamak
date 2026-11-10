import assert from "node:assert/strict";

const values = new Map();
const storage = {
  get length() { return values.size; },
  clear() { values.clear(); },
  getItem(key) { return values.get(key) ?? null; },
  key(index) { return [...values.keys()][index] ?? null; },
  removeItem(key) { values.delete(key); },
  setItem(key, value) { values.set(key, String(value)); },
};
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });

const { useKachamak, projectsSavedLocally, saveProjectsLocally } = await import("../src/lib/kachamak/store.ts");
const key = "kachamak-store-v1";

assert.ok(useKachamak.getState().novels.length > 0, "first run loads examples");
const savedNovel = useKachamak.getState().novels[0];
storage.setItem(key, JSON.stringify({ state: { novels: [] }, version: 5 }));
await useKachamak.persist.rehydrate();
assert.deepEqual(useKachamak.getState().novels, [], "saved empty library stays empty");

storage.setItem(key, JSON.stringify({ state: { novels: [savedNovel] }, version: 5 }));
await useKachamak.persist.rehydrate();
assert.deepEqual(useKachamak.getState().novels, [savedNovel], "saved project is preserved");

useKachamak.getState().createNovel("Trash position test", "Tester");
const actions = useKachamak.getState();
const parent = actions.addNode("binder", null, "doc", "Parent");
const first = actions.addNode("binder", parent, "doc", "First");
const middle = actions.addNode("binder", parent, "doc", "Middle");
const last = actions.addNode("binder", parent, "doc", "Last");
actions.deleteNode("binder", middle);
let project = useKachamak.getState().novels.find((n) => n.title === "Trash position test");
let item = project.trash[0];
assert.equal(item.originalIndex, 1, "position is saved in Trash");
await useKachamak.persist.rehydrate();
useKachamak.getState().restoreFromTrash(item.id);
project = useKachamak.getState().novels.find((n) => n.title === "Trash position test");
assert.deepEqual(project.sections.binder[0].children.map((n) => n.id), [first, middle, last], "restore preserves sibling order after reload");

const priorVersion = JSON.parse(JSON.stringify(project));
const restored = priorVersion.sections.binder[0].children.splice(1, 1)[0];
priorVersion.trash.push({ id: "old-trash", parentId: parent, section: "binder", node: restored, deletedAt: 1 });
storage.setItem(key, JSON.stringify({ state: { novels: [priorVersion], activeNovelId: priorVersion.id }, version: 5 }));
await useKachamak.persist.rehydrate();
useKachamak.getState().restoreFromTrash("old-trash");
project = useKachamak.getState().novels[0];
assert.deepEqual(project.sections.binder[0].children.map((n) => n.id), [first, last, middle], "older Trash entries restore without losing notes");
assert.equal(projectsSavedLocally(), true, "current projects match browser storage");
const realSetItem = storage.setItem;
storage.setItem = () => { throw new Error("Storage quota exceeded"); };
assert.throws(() => useKachamak.getState().updateNode("binder", first, { title: "Unsaved change" }));
assert.equal(projectsSavedLocally(), false, "failed write does not claim that the changed project was saved");
assert.equal(saveProjectsLocally(), false, "manual save reports a failed write");
assert.equal(useKachamak.getState().novels[0].sections.binder[0].children[0].title, "Unsaved change", "failed save retains the edit in memory for export");
storage.setItem = realSetItem;
assert.equal(saveProjectsLocally(), true, "manual save retries and verifies the project data");
await useKachamak.persist.rehydrate();
assert.equal(useKachamak.getState().novels[0].sections.binder[0].children[0].title, "Unsaved change", "retried change survives reload");
console.log("Storage rehydration checks passed.");
