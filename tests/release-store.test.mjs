import assert from "node:assert/strict";
import { verifyGitHubToken } from "../scripts/github-oidc.mjs";
import { publishRelease, publishedRelease, releaseAsset } from "../scripts/release-store.mjs";

const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
const jwk = { ...await crypto.subtle.exportKey("jwk", pair.publicKey), kid: "test-key", use: "sig" };
const config = { repository: "owner/repo", branch: "main", origin: "https://example.test", workflow: ".github/workflows/build.yml", runtimeHash: "runtime-v1" };
const now = Math.floor(Date.now() / 1000);
const claims = { iss: "https://token.actions.githubusercontent.com", aud: config.origin, repository: config.repository, ref: "refs/heads/main", workflow_ref: "owner/repo/.github/workflows/build.yml@refs/heads/main", event_name: "push", exp: now + 300, nbf: now - 10, iat: now - 10, sha: "a".repeat(40), run_id: "1", run_attempt: "1" };
const b64 = data => Buffer.from(data).toString("base64url");
async function token(changes = {}, key = pair.privateKey) {
  const message = b64(JSON.stringify({ alg: "RS256", kid: "test-key" })) + "." + b64(JSON.stringify({ ...claims, ...changes }));
  return message + "." + b64(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(message)));
}
const verify = (jwt, c) => verifyGitHubToken(jwt, c, { keys: [jwk], now });
assert.equal((await verify(await token(), config)).sha, claims.sha);
for (const invalid of [{ aud: "wrong" }, { repository: "other/repo" }, { ref: "refs/heads/other" }, { event_name: "pull_request" }, { workflow_ref: "owner/repo/.github/workflows/other.yml@refs/heads/main" }, { exp: now }, { nbf: now + 90 }, { iat: now - 700 }]) await assert.rejects(verify(await token(invalid), config));
const valid = await token();
await assert.rejects(verify(valid.slice(0, -12) + "AAAAAAAAAAAA", config), "tampered signature rejected");

class MemoryBucket {
  values = new Map(); counter = 0; fail = false;
  async get(key) {
    const value = this.values.get(key); if (!value) return null;
    return { etag: value.etag, json: async () => JSON.parse(new TextDecoder().decode(value.bytes)), text: async () => new TextDecoder().decode(value.bytes), body: new Response(value.bytes).body };
  }
  async put(key, data, options = {}) {
    if (this.fail && key.startsWith("assets/")) throw new Error("simulated upload failure");
    const previous = this.values.get(key);
    if (options.onlyIf?.etagMatches && previous?.etag !== options.onlyIf.etagMatches) return null;
    if (options.onlyIf?.etagDoesNotMatch === "*" && previous) return null;
    const value = { bytes: typeof data === "string" ? new TextEncoder().encode(data) : data, etag: String(++this.counter) };
    this.values.set(key, value); return { etag: value.etag };
  }
}
async function payload(sha = claims.sha, buildId = "b".repeat(64)) {
  const version = { sourceCommit: sha, sourceTree: "c".repeat(64), dirty: false };
  const entries = { "/index.html": "<h1>new application</h1>", "/app-version.json": JSON.stringify(version), "/_next/static/old.js": "old immutable chunk" };
  const assets = [];
  for (const [path, value] of Object.entries(entries)) assets.push({ path, data: Buffer.from(value).toString("base64"), hash: [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))].map(v => v.toString(16).padStart(2, "0")).join("") });
  return { version, buildId, runtimeHash: config.runtimeHash, assets };
}
const request = (jwt, body) => new Request(config.origin + "/api/github-release", { method: "POST", headers: { Authorization: `Bearer ${jwt}` }, body: JSON.stringify(body) });
const bucket = new MemoryBucket();
const first = await payload();
assert.equal((await publishRelease(request("", first), bucket, config, verify)).status, 401);
assert.equal((await publishRelease(request(valid, { ...first, runtimeHash: "wrong" }), bucket, config, verify)).status, 412);
assert.equal((await publishRelease(request(valid, { ...first, assets: first.assets.map((a, i) => i ? a : { ...a, data: "Y29ycnVwdA==" }) }), bucket, config, verify)).status, 400);
assert.equal(await publishedRelease(bucket), null, "invalid uploads cannot create a release");
assert.equal((await publishRelease(request(valid, first), bucket, config, verify)).status, 200);
assert.equal((await publishedRelease(bucket)).version.sourceCommit, claims.sha);
assert.equal(await (await releaseAsset(bucket, await publishedRelease(bucket), "/index.html")).text(), "<h1>new application</h1>");
const second = await payload("d".repeat(40), "e".repeat(64)); second.assets = second.assets.filter(a => a.path !== "/_next/static/old.js");
const secondToken = await token({ sha: second.version.sourceCommit, run_id: "2" });
bucket.fail = true;
assert.equal((await publishRelease(request(secondToken, second), bucket, config, verify)).status, 503);
assert.equal((await publishedRelease(bucket)).version.sourceCommit, claims.sha, "partial upload preserves the old release");
bucket.fail = false;
assert.equal((await publishRelease(request(secondToken, second), bucket, config, verify)).status, 200);
assert.equal((await publishRelease(request(valid, first), bucket, config, verify)).status, 409, "older workflows cannot roll back a newer release");
assert.equal((await publishRelease(request(secondToken, second), bucket, config, verify)).status, 200, "identical retries are idempotent");
assert.equal(await (await releaseAsset(bucket, await publishedRelease(bucket), "/_next/static/old.js")).text(), "old immutable chunk", "previous tabs can still fetch their immutable chunks");
console.log("GitHub OIDC authorization, release integrity, atomic activation, failure recovery and ordering checks passed.");
