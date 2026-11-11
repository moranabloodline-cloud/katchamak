import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const config = JSON.parse(readFileSync(".openai/automation.json", "utf8"));
const payload = JSON.parse(readFileSync(".sites-runtime/github-release.json", "utf8"));
if (payload.version.dirty || payload.version.sourceCommit !== process.env.GITHUB_SHA || process.env.GITHUB_REF !== `refs/heads/${config.branch}` || process.env.GITHUB_REPOSITORY !== config.repository) throw new Error("Only the checked main-branch commit can be published.");
const capabilities = await fetch(`${config.origin}/api/deploy-capabilities`, { cache: "no-store", signal: AbortSignal.timeout(30000) });
if (!capabilities.ok) throw new Error("The Sites deployment adapter is not available.");
const hosted = await capabilities.json();
if (!hosted.storageReady || hosted.runtimeHash !== payload.runtimeHash) throw new Error("Hosting infrastructure changed. Publish the updated adapter through Sites before releasing this commit.");
const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
if (!requestUrl || !requestToken) throw new Error("GitHub Actions id-token:write permission is required.");
const identityUrl = new URL(requestUrl);
identityUrl.searchParams.set("audience", config.origin);
const identityResponse = await fetch(identityUrl, { headers: { Authorization: `Bearer ${requestToken}` }, signal: AbortSignal.timeout(30000) });
if (!identityResponse.ok) throw new Error("GitHub identity could not be obtained.");
const identity = await identityResponse.json();
const response = await fetch(`${config.origin}/api/github-release`, {
  method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${identity.value}` },
  body: JSON.stringify(payload), signal: AbortSignal.timeout(120000),
});
const result = await response.json();
if (!response.ok) throw new Error(`Release rejected (${response.status}): ${result.error ?? result.status}`);
if (result.sourceCommit !== payload.version.sourceCommit || result.buildId !== payload.buildId) throw new Error("Published release did not match this build.");
const live = await fetch(`${config.origin}/api/app-version`, { cache: "no-store", signal: AbortSignal.timeout(30000) }).then(r => r.json());
if (live.sourceCommit !== payload.version.sourceCommit || live.sourceTree !== payload.version.sourceTree || live.buildId !== payload.buildId) throw new Error("Published application readback did not match this build.");
for (const asset of [payload.assets.find(a => a.path === "/index.html"), payload.assets.find(a => a.path.endsWith(".js")), payload.assets.find(a => a.path.endsWith(".css"))].filter(Boolean)) {
  const liveAsset = await fetch(`${config.origin}${asset.path === "/index.html" ? "/" : asset.path}`, { cache: "no-store", signal: AbortSignal.timeout(30000) });
  const bytes = Buffer.from(await liveAsset.arrayBuffer());
  if (!liveAsset.ok) throw new Error(`Published asset unavailable: ${asset.path} (HTTP ${liveAsset.status})`);
  if (asset.path === "/index.html") {
    // Sites can inject its host integration into HTML. Verify the built application references,
    // then verify the immutable JS/CSS bytes, instead of rejecting that platform integration.
    const expected = Buffer.from(asset.data, "base64").toString("utf8");
    const refs = [...new Set([...expected.matchAll(/(?:src|href)=["']([^"']*\/_next\/static\/[^"']+)["']/g)].map(m => m[1]))];
    const html = bytes.toString("utf8");
    const missing = refs.filter(ref => !html.includes(ref));
    if (!refs.length || missing.length) throw new Error(`Published page has different application references: ${missing.slice(0, 3).join(", ")} (HTTP ${liveAsset.status}, title=${html.match(/<title>(.*?)<\/title>/)?.[1] ?? "none"})`);
  } else if (createHash("sha256").update(bytes).digest("hex") !== asset.hash) throw new Error(`Published asset differs from the checked build: ${asset.path}`);
}
console.log(JSON.stringify({ status: "verified", sourceCommit: live.sourceCommit, sourceTree: live.sourceTree, buildId: live.buildId, url: config.origin }));
