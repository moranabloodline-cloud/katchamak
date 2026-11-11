import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { sourceVersion } from "./source-version.mjs";

const expected = sourceVersion();
assert.equal(expected.dirty, false, "Commit application inputs before preparing a release.");
const source = readFileSync("dist/server/index.js", "utf8");
const { default: app } = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
const version = await (await app.fetch(new Request("https://kachamak.invalid/api/app-version"))).json();
assert.equal(version.sourceCommit, expected.sourceCommit, "The package must match the GitHub source commit.");
assert.equal(version.sourceTree, expected.sourceTree, "The package must match all current application inputs.");
assert.equal(version.dirty, false);
const snapshot = await (await app.fetch(new Request("https://kachamak.invalid/app-version.json"))).json();
assert.deepEqual(snapshot, expected);
const root = await app.fetch(new Request("https://kachamak.invalid/"));
assert.equal(root.status, 200);
const tool = await (await app.fetch(new Request("https://kachamak.invalid/mcp", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "open_novel_studio" } }),
}))).json();
assert.equal(tool.result.structuredContent.sourceCommit, expected.sourceCommit);
assert.equal(tool.result.structuredContent.appBuild, version.buildId);
console.log(JSON.stringify({ status: "verified", ...expected, buildId: version.buildId }));
