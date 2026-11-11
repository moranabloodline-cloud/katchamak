const githubIssuer = "https://token.actions.githubusercontent.com";
let githubKeys;

export async function verifyGitHubToken(token, config, options = {}) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid identity token");
  const decode = (value) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  const json = (value) => JSON.parse(new TextDecoder().decode(decode(value)));
  const header = json(parts[0]), claims = json(parts[1]);
  if (header.alg !== "RS256" || typeof header.kid !== "string") throw new Error("Invalid signing algorithm");
  const now = options.now ?? Math.floor(Date.now() / 1000);
  const repoRef = `${config.repository}/${config.workflow}@refs/heads/${config.branch}`;
  if (claims.iss !== githubIssuer || claims.aud !== config.origin ||
      claims.repository !== config.repository || claims.ref !== `refs/heads/${config.branch}` ||
      claims.workflow_ref !== repoRef || !["push", "workflow_dispatch"].includes(claims.event_name) ||
      !Number.isFinite(claims.exp) || claims.exp <= now || !Number.isFinite(claims.nbf) || claims.nbf > now + 30 ||
      !Number.isFinite(claims.iat) || claims.iat > now + 30 || now - claims.iat > 600 ||
      !/^[a-f0-9]{40}$/.test(claims.sha ?? "") || !/^\d+$/.test(claims.run_id ?? "") || !/^\d+$/.test(claims.run_attempt ?? "")) {
    throw new Error("Identity does not authorize this release");
  }
  let keys = options.keys;
  if (!keys) {
    if (!githubKeys || githubKeys.expires < now || !githubKeys.keys.some(k => k.kid === header.kid)) {
      const response = await fetch(`${githubIssuer}/.well-known/jwks`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error("Identity provider unavailable");
      const body = await response.json();
      githubKeys = { keys: body.keys, expires: now + 300 };
    }
    keys = githubKeys.keys;
  }
  const jwk = keys.find(k => k.kid === header.kid && k.kty === "RSA" && (!k.use || k.use === "sig"));
  if (!jwk) throw new Error("Unknown signing key");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decode(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!valid) throw new Error("Invalid identity signature");
  return claims;
}
