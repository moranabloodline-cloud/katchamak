import assert from "node:assert/strict";

const key = "kachamak-collections-v1";
localStorage.setItem(key, JSON.stringify({ version: 1, state: { collections: [
  { id: "old-a", name: "User collection A", projectIds: ["p1", "p2"] },
  { id: "old-b", name: "User collection B", projectIds: ["p1"] },
] } }));
const { useCollections, canMoveCollection } = await import("../src/lib/kachamak/collections-store.ts");
await useCollections.persist.rehydrate();
let state = useCollections.getState();
assert.deepEqual(state.collections.map((c) => [c.id, c.name, c.projectIds, c.parentId]), [
  ["old-a", "User collection A", ["p1", "p2"], null], ["old-b", "User collection B", ["p1"], null],
], "v1 migration preserves every collection and project reference");
const child = state.addCollection("Child", "old-a");
const grandchild = state.addCollection("Grandchild", child);
const deep = state.addCollection("Deeper", grandchild);
assert.equal(useCollections.getState().collections.find((c) => c.id === deep).parentId, grandchild);
const before = JSON.stringify(useCollections.getState().collections);
assert.equal(state.moveCollection("old-a", deep), false, "ancestor cannot enter its descendant");
assert.equal(state.moveCollection(child, child), false, "folder cannot enter itself");
assert.equal(state.moveCollection(child, "missing"), false);
assert.equal(JSON.stringify(useCollections.getState().collections), before, "rejected moves leave the hierarchy intact");
assert.equal(state.moveCollection(child, "old-b"), true);
assert.equal(state.moveProject("p1", deep), true);
assert.equal(useCollections.getState().collections.filter((c) => c.projectIds.includes("p1")).length, 1, "moving a project updates every view without duplicate memberships");
assert.equal(useCollections.getState().collections.find((c) => c.id === deep).projectIds.includes("p1"), true);
state.setSidebarWidth(337); state.setCoverSize(224); state.setLayout("list");
state.setProjectMeta("p1", { category: "Game", coverUrl: "data:image/png;base64,a" });
state.toggleCollapsed("old-b");
await useCollections.persist.rehydrate(); state = useCollections.getState();
assert.equal(state.sidebarWidth, 337); assert.equal(state.coverSize, 224); assert.equal(state.layout, "list");
assert.equal(state.collections.find((c) => c.id === child).parentId, "old-b");
assert.equal(state.collections.find((c) => c.id === deep).projectIds.includes("p1"), true);
assert.equal(state.projectMeta.p1.category, "Game"); assert.ok(state.collapsedIds.includes("old-b"));
state.removeCollection(grandchild);
assert.equal(useCollections.getState().collections.find((c) => c.id === deep).parentId, child, "deleting a collection promotes its child folders");
assert.equal(state.moveProject("p1", null), true);
assert.equal(useCollections.getState().collections.some((c) => c.projectIds.includes("p1")), false, "moving to root removes folder memberships");
state.moveProject("p2", child); state.removeCollection(child);
assert.ok(useCollections.getState().collections.find((c) => c.id === "old-b").projectIds.includes("p2"), "deleting a child collection preserves its projects in the parent");
state.setCoverSize(999); assert.equal(useCollections.getState().coverSize, 280);
state.setSidebarWidth(1); assert.equal(useCollections.getState().sidebarWidth, 180);
assert.equal(canMoveCollection(useCollections.getState().collections, "old-b", deep), false);
console.log("Collection migration, nesting, move, preferences and reload checks passed.");
