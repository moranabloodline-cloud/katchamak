import {draftopusAuthConfig, openDraftopusAuth, handleDraftopusAuth} from "./draftopus-auth-session.mjs";
import {draftopusAccountPage} from "./draftopus-auth-ui.mjs";
import {legacyDraftopusEmails, legacyDraftopusAccount, independentDraftopusAccount} from "./draftopus-identities.mjs";
import {readOnlyDemo} from "./read-only-demo.mjs";

// Web adaptation of desktop 0.2.3: invalidate older remote application packages.
const uiUri = (build) => "ui://kachamak/github-" + build + ".html";
const studioTool = (resourceUri) => ({
  name: "open_novel_studio", title: "Open Draftopus",
  description: "Open the writing workspace. Projects are saved privately to your account in the cloud; this tool shares no manuscript.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  _meta: { ui: { resourceUri }, "openai/outputTemplate": resourceUri, "openai/ui": { entrypoints: [{ type: "thread" }] } },
});
const MIME = { html: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8", json: "application/json", txt: "text/plain; charset=utf-8", svg: "image/svg+xml", png: "image/png", webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", woff2: "font/woff2", woff: "font/woff", ico: "image/x-icon", md: "text/markdown; charset=utf-8" };
const rpc = (id, result, error) => Response.json(error ? { jsonrpc: "2.0", id, error } : { jsonrpc: "2.0", id, result }, { headers: { "Cache-Control": "no-store" } });
const privateHeaders = { "Cache-Control": "private, no-store" };
const toPage = path => new Response(null, { status: 303, headers: { ...privateHeaders, Location: path } });

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    if (url.pathname === "/api/github-release" && request.method === "POST") return publishRelease(request, env.BUCKET, DEPLOY_CONFIG);
    if (url.pathname === "/api/deploy-capabilities") return Response.json({ protocol: 1, runtimeHash: DEPLOY_CONFIG.runtimeHash, storageReady: Boolean(env.BUCKET) }, { headers: { "Cache-Control": "no-store" } });
    const publicProtocol = ["/mcp", "/api/app-version", "/app-version.json"].includes(url.pathname);
    const legacyEmails = legacyDraftopusEmails(env);
    const config = legacyEmails?.size && env.DB ? draftopusAuthConfig(request, env) : null;
    const publicAsset = (request.method === "GET" || request.method === "HEAD") &&
      (url.pathname.startsWith("/_next/static/") || url.pathname === "/draftopus-logo.png");
    const session = config && !publicProtocol && !publicAsset ? openDraftopusAuth(request, config) : null;
    const withSession = response => session ? session.withCookies(response) : response;
    const getProfile = async principal => {
      const response = await accountApi(new Request(new URL("/api/account", url)), env, undefined, principal);
      return response.ok ? { profile: await response.json() } : { error: response };
    };

    if (session && url.pathname.startsWith("/auth/")) {
      const response = await handleDraftopusAuth(request, session, {
        async signedInDestination(next, user) {
          const account = await independentDraftopusAccount(env.DB, config.providerOrigin, user, legacyEmails);
          if (!account) return "/account";
          if (next === "demo") return "/demo";
          if (next === "account" || next === "membership") return "/account";
          const { profile } = await getProfile(account);
          return profile?.license.active ? "/" : "/demo";
        },
      });
      return withSession(response ?? new Response("Not found", { status: 404, headers: privateHeaders }));
    }

    const user = session ? await session.getVerifiedUser() : null;
    const account = config
      ? user && await independentDraftopusAccount(env.DB, config.providerOrigin, user, legacyEmails)
      : legacyDraftopusAccount(request, legacyEmails);
    const accountRequest = ["/api/account", "/api/account/billing"].includes(url.pathname) || url.pathname.startsWith("/api/admin/");
    if (accountRequest) return withSession(await traceApiRequest(request, measure => accountApi(request, env, measure, account)));
    if (url.pathname === "/api/library" || url.pathname.startsWith("/api/library/")) {
      return withSession(await traceApiRequest(request, measure => cloudLibraryApi(request, env, measure, account)));
    }

    if (config && !publicProtocol && !publicAsset) {
      if (!account) {
        if (user) return withSession(draftopusAccountPage({ email: user.email, existingAccount: true }));
        const next = url.pathname === "/demo" ? "?next=demo" : url.pathname === "/account" ? "?next=account" : "";
        return withSession(toPage("/auth/sign-up" + next));
      }
      if (["/", "/index.html", "/demo", "/account"].includes(url.pathname)) {
        const { profile, error } = await getProfile(account);
        if (error) return withSession(error);
        if (url.pathname === "/demo") return withSession(await readOnlyDemo(request, env));
        if (url.pathname === "/account") {
          if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
          return withSession(draftopusAccountPage({ email: profile.email, active: profile.license.active, billingAvailable: Boolean(env.PADDLE_LIFETIME_PRODUCT_ID && paddleConfig(env)) }));
        }
        if (!profile.license.active) return withSession(toPage("/demo"));
      }
    } else if (!config && !account && !publicProtocol && !(!legacyEmails && request.headers.get("oai-authenticated-user-id"))) {
      if (legacyEmails && request.headers.has("oai-authenticated-user-id")) {
        return new Response("Draftopus access requires an invitation.", { status: 403, headers: privateHeaders });
      }
      const next = url.searchParams.get("settings");
      const target = next === "account" || next === "membership" ? "/?settings=" + next : "/";
      return new Response(null, { status: 302, headers: { ...privateHeaders, Location: "/signin-with-chatgpt?return_to=" + encodeURIComponent(target) } });
    }
    let release = await publishedRelease(env.BUCKET);
    if (release?.runtimeHash !== DEPLOY_CONFIG.runtimeHash) release = null;
    const version = release?.version ?? SOURCE_VERSION;
    const buildId = release?.buildId ?? APP_BUILD;
    const UI_URI = uiUri(buildId);
    const TOOL = studioTool(UI_URI);
    if (url.pathname === "/api/app-version") return Response.json({ ...version, buildId, source: "moranabloodline-cloud/katchamak", resourceUri: UI_URI }, { headers: { "Cache-Control": "no-store" } });
    if (url.pathname === "/app-version.json") return Response.json(version, { headers: { "Cache-Control": "no-store" } });
    if (url.pathname === "/mcp") {
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
      let body;
      try { body = await request.json(); } catch { return rpc(null, null, { code: -32700, message: "Invalid JSON" }); }
      const { id = null, method, params = {} } = body;
      if (method?.startsWith("notifications/")) return new Response(null, { status: 202 });
      switch (method) {
        case "server/discover": return rpc(id, { supportedVersions: ["2026-07-28"], capabilities: { tools: {}, resources: {} } });
        case "initialize": return rpc(id, { protocolVersion: params.protocolVersion || "2026-07-28", capabilities: { tools: {}, resources: {} }, serverInfo: { name: "kachamak", version: "0.3.0" } });
        case "ping": return rpc(id, {});
        case "tools/list": return rpc(id, { tools: [TOOL] });
        case "tools/call": return params.name === TOOL.name
          ? rpc(id, { content: [{ type: "text", text: "Draftopus opened from the GitHub codebase. Projects are saved privately to your account." }], structuredContent: { status: "ready", appBuild: buildId, ...version, sharedManuscript: false, automation: { storageReady: Boolean(env.BUCKET), runtimeHash: DEPLOY_CONFIG.runtimeHash, releaseRunId: release?.order?.run ?? null } }, _meta: TOOL._meta })
          : rpc(id, { isError: true, content: [{ type: "text", text: "Unknown tool" }] });
        case "resources/list": return rpc(id, { resources: [{ uri: UI_URI, name: "Draftopus", mimeType: "text/html;profile=mcp-app" }] });
        case "resources/templates/list": return rpc(id, { resourceTemplates: [] });
        case "resources/read": {
          if (!/^ui:\/\/kachamak\/github-[a-f0-9]{64}\.html$/.test(params.uri)) return rpc(id, null, { code: -32602, message: "Unknown resource" });
          const origin = url.origin;
          const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;background:#0d0d0d}iframe{border:0;width:100%;height:100vh;min-height:700px;display:block}</style></head><body><iframe title="Draftopus writing workspace" src="${origin}/" allow="clipboard-read; clipboard-write; fullscreen"></iframe></body></html>`;
          return rpc(id, { contents: [{ uri: UI_URI, mimeType: "text/html;profile=mcp-app", text: html, _meta: { ui: { prefersBorder: true, csp: { connectDomains: [origin], resourceDomains: [origin], frameDomains: [origin] } }, "openai/widgetCSP": { connect_domains: [origin], resource_domains: [origin], frame_domains: [origin] }, "openai/widgetDescription": "Draftopus writing workspace from GitHub. Projects are saved privately to your account." } }] });
        }
        default: return rpc(id, null, { code: -32601, message: "Method not found" });
      }
    }
    if (!["GET", "HEAD"].includes(request.method)) return new Response("Method not allowed", { status: 405 });
    let file;
    try { file = decodeURIComponent(url.pathname); } catch { return new Response("Bad path", { status: 400 }); }
    if (file === "/") file = "/index.html";
    else if (file.endsWith("/")) file += "index.html";
    if (!(file in (release?.paths ?? ASSETS)) && file + ".html" in (release?.paths ?? ASSETS)) file += ".html";
    const hosted = await releaseAsset(env.BUCKET, release, file);
    if (hosted) {
      const type = MIME[file.split(".").at(-1)] || "application/octet-stream";
      return withSession(new Response(request.method === "HEAD" ? null : hosted.body, { headers: { "Content-Type": type, "Cache-Control": file.startsWith("/_next/static/") ? "public, max-age=31536000, immutable" : "no-store", "X-Content-Type-Options": "nosniff" } }));
    }
    const encoded = ASSETS[file];
    if (encoded === undefined) return new Response("Not found", { status: 404 });
    const bytes = request.method === "HEAD" ? null : Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const type = file === "/api" ? "application/json" : MIME[file.split(".").at(-1)] || "application/octet-stream";
    return withSession(new Response(bytes, { headers: { "Content-Type": type, "Cache-Control": file.startsWith("/_next/static/") ? "public, max-age=31536000, immutable" : config ? "private, no-store" : "no-cache", "X-Content-Type-Options": "nosniff" } }));
  },
};

