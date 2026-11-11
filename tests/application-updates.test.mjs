import assert from "node:assert/strict";
import { watchApplicationUpdates } from "../src/lib/kachamak/application-updates.ts";

const target = new EventTarget(); let version = "a".repeat(64), busy = true, reloads = 0;
const stop = watchApplicationUpdates({ current: version, fetchVersion: async () => ({ sourceTree: version }), canReload: () => !busy, reload: () => reloads++, target, intervalMs: 5 });
const tick = () => new Promise(resolve => setTimeout(resolve, 20));
await tick(); assert.equal(reloads, 0);
version = "b".repeat(64); await tick(); assert.equal(reloads, 0, "active editing postpones refresh");
busy = false; target.dispatchEvent(new Event("focus")); await tick(); assert.equal(reloads, 1);
await tick(); assert.equal(reloads, 1, "a new version requests only one reload");
stop();
let resolveRequest;
const cancel = watchApplicationUpdates({ current: "a".repeat(64), fetchVersion: () => new Promise(resolve => { resolveRequest = resolve; }), canReload: () => true, reload: () => reloads++, target, intervalMs: 1000 });
cancel(); resolveRequest({ sourceTree: "c".repeat(64) }); await tick(); assert.equal(reloads, 1, "unmount cancels pending refresh");
console.log("Application version refresh checks passed.");
