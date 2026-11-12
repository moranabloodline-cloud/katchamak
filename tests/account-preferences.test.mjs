import assert from "node:assert/strict";
const values = new Map([["kachamak-store-v1", "private manuscript sentinel"]]);
let fail = false;
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => { if (fail) throw new Error("Storage full"); values.set(key, value); },
  removeItem: key => values.delete(key),
};
const { useAccountPreferences, saveLocalProfile } = await import("../src/lib/kachamak/account-preferences.ts");
const { useAppearancePreferences, saveAppearance } = await import("../src/lib/kachamak/appearance-preferences.ts");
assert.deepEqual(useAccountPreferences.getState(), { displayName: "", photo: null });
saveLocalProfile({displayName:"Test Writer", photo:"data:image/png;base64,test"});
await useAccountPreferences.persist.rehydrate();
assert.equal(useAccountPreferences.getState().displayName,"Test Writer");
assert.equal(useAccountPreferences.getState().photo,"data:image/png;base64,test");
saveAppearance({theme:"light", interfaceSize:"large"});
await useAppearancePreferences.persist.rehydrate();
assert.deepEqual(useAppearancePreferences.getState(), {theme:"light", interfaceSize:"large"});
fail = true;
assert.throws(() => saveLocalProfile({displayName:"Lost change",photo:null}));
assert.equal(useAccountPreferences.getState().displayName,"Test Writer", "failed storage does not replace the saved profile");
assert.throws(() => saveAppearance({theme:"dark",interfaceSize:"small"}));
assert.equal(useAppearancePreferences.getState().theme,"light");
assert.equal(values.get("kachamak-store-v1"), "private manuscript sentinel", "profile and appearance writes never touch manuscripts");
console.log("Local profile/appearance persistence, failure recovery and manuscript separation passed.");
