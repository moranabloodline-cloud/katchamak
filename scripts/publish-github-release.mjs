import { readFileSync } from "node:fs";

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
console.log(JSON.stringify({ status: "verified", sourceCommit: live.sourceCommit, sourceTree: live.sourceTree, buildId: live.buildId, url: config.origin }));
