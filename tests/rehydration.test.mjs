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

const { useKachamak } = await import("../src/lib/kachamak/store.ts");
const key = "kachamak-store-v1";

assert.ok(useKachamak.getState().novels.length > 0, "first run loads examples");
const savedNovel = useKachamak.getState().novels[0];
storage.setItem(key, JSON.stringify({ state: { novels: [] }, version: 5 }));
await useKachamak.persist.rehydrate();
assert.deepEqual(useKachamak.getState().novels, [], "saved empty library stays empty");

storage.setItem(key, JSON.stringify({ state: { novels: [savedNovel] }, version: 5 }));
await useKachamak.persist.rehydrate();
assert.deepEqual(useKachamak.getState().novels, [savedNovel], "saved project is preserved");
console.log("Storage rehydration checks passed.");
