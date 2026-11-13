import assert from "node:assert/strict";

const values = new Map();
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
const key = "kachamak-collections-v1";
const legacy = [
  { id: "existing-a", name: "Original A", projectIds: ["manuscript"] },
  { id: "existing-b", name: "Original B", projectIds: ["manuscript", "second"] },
];
storage.setItem(key, JSON.stringify({ version: 1, state: { collections: legacy } }));
const { useCollections } = await import("../src/lib/kachamak/collections-store.ts");
useCollections.persist.setOptions({storage:{getItem:key=>{const raw=storage.getItem(key);return raw?JSON.parse(raw):null;},setItem:(key,value)=>storage.setItem(key,JSON.stringify(value)),removeItem:key=>storage.removeItem(key)}});
await useCollections.persist.rehydrate();
assert.deepEqual(useCollections.getState().collections, legacy.map((c) => ({ ...c, parentId: null })), "migration retains IDs, names and all memberships");
const actions = useCollections.getState();
assert.equal(actions.addCollection("  "), null);
assert.equal(actions.addCollection("Invalid parent", "missing"), null);
let parent = "existing-a";
const chain = [];
for (let i = 0; i < 50; i++) { parent = actions.addCollection(`Nested ${i}`, parent); chain.push(parent); }
assert.equal(actions.moveCollection("existing-a", parent), false, "moving into a descendant is rejected");
assert.equal(actions.moveCollection(parent, parent), false, "moving into self is rejected");
assert.equal(actions.moveCollection(parent, "missing"), false);
assert.equal(actions.moveCollection(parent, "existing-b"), true);
actions.moveProject("manuscript", chain[0], "existing-a");
let collections = useCollections.getState().collections;
assert.equal(collections.find((c) => c.id === "existing-a").projectIds.includes("manuscript"), false);
assert.equal(collections.find((c) => c.id === chain[0]).projectIds.includes("manuscript"), true);
assert.equal(collections.find((c) => c.id === "existing-b").projectIds.includes("manuscript"), true, "unrelated legacy memberships remain intact");
actions.moveProject("manuscript", null, chain[0]);
assert.equal(useCollections.getState().collections.some((c) => c.projectIds.includes("manuscript")), false, "moving to root removes folder memberships");
actions.moveProject("second", chain[0], "existing-b");
actions.removeCollection(chain[0]);
collections = useCollections.getState().collections;
assert.equal(collections.find((c) => c.id === chain[1]).parentId, "existing-a", "deleting a folder promotes its subfolders");
assert.ok(collections.find((c) => c.id === "existing-a").projectIds.includes("second"), "deleting a folder promotes its projects");
const expected = structuredClone(collections);
await useCollections.persist.rehydrate();
assert.deepEqual(useCollections.getState().collections, expected, "hierarchy and memberships survive reload");
assert.equal(JSON.parse(storage.getItem(key)).version, 2);

const { useLibraryPreferences } = await import("../src/lib/kachamak/library-preferences.ts");
const prefs = useLibraryPreferences.getState();
prefs.setSidebarWidth(340); prefs.changeCoverZoom(30); prefs.setLayout("list");
prefs.setSort("title"); prefs.setGroup("author"); prefs.setLocation(chain[1], ["existing-a", chain[1]]);
await useLibraryPreferences.persist.rehydrate();
assert.equal(useLibraryPreferences.getState().sidebarWidth, 340);
assert.equal(useLibraryPreferences.getState().coverZoom, 130);
assert.equal(useLibraryPreferences.getState().layout, "list");
assert.equal(useLibraryPreferences.getState().selectedCollection, chain[1]);
assert.ok(useLibraryPreferences.getState().expanded.includes("existing-a"));
prefs.changeCoverZoom(1000); assert.equal(useLibraryPreferences.getState().coverZoom, 180);
prefs.changeCoverZoom(-1000); assert.equal(useLibraryPreferences.getState().coverZoom, 60);
console.log("Library migration, hierarchy, movement, deletion and preferences checks passed.");
