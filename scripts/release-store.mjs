import { verifyGitHubToken } from "./github-oidc.mjs";

const maxReleaseBytes = 20 * 1024 * 1024;
const digest = async (data) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", data))].map(v => v.toString(16).padStart(2, "0")).join("");
const releaseJson = (value, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });

export async function publishedRelease(bucket) {
  if (!bucket) return null;
  const object = await bucket.get("current.json");
  return object ? object.json() : null;
}

export async function publishRelease(request, bucket, config, verify = verifyGitHubToken) {
  if (!bucket) return releaseJson({ error: "Release storage unavailable" }, 503);
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ") || auth.length > 20000) return releaseJson({ error: "GitHub identity required" }, 401);
  let claims;
  try { claims = await verify(auth.slice(7), config); }
  catch { return releaseJson({ error: "Unauthorized GitHub release" }, 403); }
  if (Number(request.headers.get("content-length")) > maxReleaseBytes) return releaseJson({ error: "Release too large" }, 413);
  let body;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Missing release");
    const chunks = []; let size = 0;
    while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > maxReleaseBytes) { await reader.cancel(); return releaseJson({ error: "Release too large" }, 413); } chunks.push(value); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch { return releaseJson({ error: "Invalid release" }, 400); }
  if (body.runtimeHash !== config.runtimeHash) return releaseJson({ error: "Hosting adapter changed; publish the new adapter through Sites first" }, 412);
  if (body.version?.sourceCommit !== claims.sha || body.version?.dirty !== false || !/^[a-f0-9]{64}$/.test(body.version?.sourceTree ?? "") || !/^[a-f0-9]{64}$/.test(body.buildId ?? "")) return releaseJson({ error: "Release identity mismatch" }, 400);
  if (!Array.isArray(body.assets) || body.assets.length > 256) return releaseJson({ error: "Invalid asset manifest" }, 400);
  const paths = new Set(); const assets = [];
  try {
    for (const asset of body.assets) {
      if (typeof asset.path !== "string" || !asset.path.startsWith("/") || /[\\\0?#]/.test(asset.path) || asset.path.split("/").includes("..") || paths.has(asset.path) || !/^[a-f0-9]{64}$/.test(asset.hash) || typeof asset.data !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(asset.data)) throw new Error("Invalid asset");
      paths.add(asset.path);
      const bytes = Uint8Array.from(atob(asset.data), c => c.charCodeAt(0));
      if (await digest(bytes) !== asset.hash) throw new Error("Asset checksum mismatch");
      assets.push({ path: asset.path, hash: asset.hash, bytes });
    }
    if (!paths.has("/index.html") || !paths.has("/app-version.json")) throw new Error("Missing application entrypoint");
    const versionAsset = assets.find(a => a.path === "/app-version.json");
    if (JSON.stringify(JSON.parse(new TextDecoder().decode(versionAsset.bytes))) !== JSON.stringify(body.version)) throw new Error("Version asset mismatch");
  } catch { return releaseJson({ error: "Invalid or corrupted application assets" }, 400); }
  const order = { run: claims.run_id, attempt: claims.run_attempt };
  const isOlder = (current) => current?.order && (BigInt(order.run) < BigInt(current.order.run) || (order.run === current.order.run && BigInt(order.attempt) <= BigInt(current.order.attempt)));
  const current = await publishedRelease(bucket);
  if (isOlder(current)) return releaseJson({ status: current.buildId === body.buildId ? "already_published" : "stale", sourceCommit: current.version.sourceCommit, buildId: current.buildId }, current.buildId === body.buildId ? 200 : 409);
  // Publish only after every verified asset has reached storage. Failed uploads keep the old release.
  try {
    for (const asset of assets) {
      await bucket.put(`assets/${asset.hash}`, asset.bytes);
      if (asset.path.startsWith("/_next/static/")) await bucket.put(`immutable${asset.path}`, asset.hash);
    }
    const release = { version: body.version, buildId: body.buildId, runtimeHash: body.runtimeHash, order, paths: Object.fromEntries(assets.map(a => [a.path, a.hash])) };
    await bucket.put(`releases/${body.buildId}.json`, JSON.stringify(release));
    for (let attempt = 0; attempt < 4; attempt++) {
      const prior = await bucket.get("current.json");
      if (prior && isOlder(await prior.json())) return releaseJson({ error: "A newer release is already published" }, 409);
      const saved = await bucket.put("current.json", JSON.stringify(release), { onlyIf: prior ? { etagMatches: prior.etag } : { etagDoesNotMatch: "*" } });
      if (saved) return releaseJson({ status: "published", sourceCommit: body.version.sourceCommit, buildId: body.buildId });
    }
    return releaseJson({ error: "Another release is publishing; retry" }, 409);
  } catch { return releaseJson({ error: "Upload failed; previous release retained" }, 503); }
}

export async function releaseAsset(bucket, release, file) {
  let hash = release?.paths?.[file];
  if (!hash && bucket && file.startsWith("/_next/static/")) {
    const old = await bucket.get(`immutable${file}`);
    if (old) hash = await old.text();
  }
  return hash && bucket ? bucket.get(`assets/${hash}`) : null;
}
