import { expect, test } from "bun:test";

const values = new Map<string, string>();
const storage: Storage = {
  get length() { return values.size; },
  clear() { values.clear(); },
  getItem(key) { return values.get(key) ?? null; },
  key(index) { return [...values.keys()][index] ?? null; },
  removeItem(key) { values.delete(key); },
  setItem(key, value) { values.set(key, String(value)); },
};
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });

const { useKachamak } = await import("../src/lib/kachamak/store");
const key = "kachamak-store-v1";

test("first run seeds examples but saved libraries, including an empty one, are preserved", async () => {
  expect(useKachamak.getState().novels.length).toBeGreaterThan(0);
  const savedNovel = useKachamak.getState().novels[0];
  storage.setItem(key, JSON.stringify({ state: { novels: [] }, version: 5 }));
  await useKachamak.persist.rehydrate();
  expect(useKachamak.getState().novels).toEqual([]);

  storage.setItem(key, JSON.stringify({ state: { novels: [savedNovel] }, version: 5 }));
  await useKachamak.persist.rehydrate();
  expect(useKachamak.getState().novels).toEqual([savedNovel]);
});
