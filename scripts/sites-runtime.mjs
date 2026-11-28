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

const clerkPreference = "__Host-draftopus-clerk=1";
const authenticationHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" };

function accountRedirect(location, useClerk) {
  const headers = { ...authenticationHeaders, Location: location };
  if (useClerk !== undefined) {
    headers["Set-Cookie"] = (useClerk ? clerkPreference : "__Host-draftopus-clerk=; Max-Age=0") + "; Path=/; Secure; HttpOnly; SameSite=Lax";
  }
  return new Response(null, { status: 303, headers });
}

async function independentSignIn(request, url, env, config) {
  const id = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  const legacy = id && email ? { id, email, provider: "sites", canLinkSignIn: true } : null;
  const path = url.pathname;
  const askClerk = path === "/" && url.searchParams.get("auth") === "clerk";
  const useClerk = askClerk || (request.headers.get("Cookie") ?? "").split(";").some(value => value.trim() === clerkPreference);
  const wantsClerk = ["/auth/profile", "/auth/clerk/continue", "/auth/link"].includes(path);
  const authMutation = path.startsWith("/api/auth/");
  let navigation;
  const onNavigation = request.method === "GET" && request.headers.get("Accept")?.includes("text/html")
    && (wantsClerk || path === "/" && useClerk) ? result => { navigation = result; } : undefined;
  const clerk = useClerk || wantsClerk || authMutation || !legacy
    ? await resolveClerkAccount(request, env, url.origin, onNavigation).catch(() => null) : null;
  const withCookies = response => {
    for (const cookie of navigation?.cookies ?? []) response.headers.append("Set-Cookie", cookie);
    return { response };
  };
  if (navigation?.location) return withCookies(new Response(null, {
    status: 307, headers: { ...authenticationHeaders, Location: navigation.location }
  }));
  const page = mode => clerkAccountPage({
    publishableKey: config.publishableKey, mode, legacy,
    linked: mode === "link" ? Boolean(legacy && clerk?.account?.id === legacy.id) : !!clerk?.account,
    linkedToAnotherAccount: mode === "link" && Boolean(legacy && clerk?.account && clerk.account.id !== legacy.id)
  });

  if (path === "/auth/clerk") return { response: page(url.searchParams.get("mode") === "sign-up" ? "sign-up" : "sign-in") };
  if (path === "/auth/logout") return { response: page("sign-out") };
  if (path === "/auth/legacy") return { response: legacy ? page("legacy") : accountRedirect("/signin-with-chatgpt?return_to=%2Fauth%2Flegacy") };
  if (path === "/auth/sites/continue") return { response: legacy ? accountRedirect("/", false) : accountRedirect("/signin-with-chatgpt?return_to=%2Fauth%2Fsites%2Fcontinue") };
  if (path === "/auth/profile") return withCookies(clerk?.account ? page("profile") : accountRedirect("/auth/clerk?resume=1"));
  if (path === "/auth/clerk/continue") return withCookies(!clerk ? accountRedirect("/auth/clerk?resume=1") : clerk.account ? accountRedirect("/", true) : page("link-required"));
  if (path === "/auth/link") {
    if (!legacy) return { response: accountRedirect("/auth/legacy") };
    if (!clerk) return withCookies(accountRedirect("/auth/clerk?intent=link"));
    await accountApi(new Request(url.origin + "/api/account"), env, undefined, legacy);
    return withCookies(page("link"));
  }
  if (path === "/api/auth/register") return { response: await registerClerkAccount(request, env, url.origin, clerk) };
  if (path === "/api/auth/link/start" || path === "/api/auth/link/complete") return { response: await linkClerkAccount(request, env, url.origin, legacy, clerk) };

  const principal = useClerk || !legacy ? clerk?.account && { ...clerk.account, provider: "clerk" } : legacy;
  if (!principal) return withCookies(path.startsWith("/api/")
    ? Response.json({ error: "Sign in required." }, { status: 401, headers: authenticationHeaders })
    : accountRedirect(useClerk ? "/auth/clerk?resume=1" : "/auth/clerk"));
  if (askClerk) return withCookies(accountRedirect("/", true));
  return { principal, cookies: navigation?.cookies ?? [] };
}

function withClerkSession(html, frontend, key) {
  const tags = '<script>window.draftopusClerkReady=new Promise(function(resolve){'
    + 'var script=document.createElement("script");script.crossOrigin="anonymous";'
    + 'script.src=' + JSON.stringify(frontend + '/npm/@clerk/clerk-js@6/dist/clerk.browser.js') + ';'
    + 'script.dataset.clerkPublishableKey=' + JSON.stringify(key) + ';'
    + 'script.onload=function(){if(!window.Clerk)return resolve(null);'
    + 'window.Clerk.load().then(()=>resolve(window.Clerk),()=>resolve(null));};'
    + 'script.onerror=function(){resolve(null)};document.head.appendChild(script)});</script>';
  return html.replace("<head>", "<head>" + tags);
}

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    if (url.pathname === "/api/github-release" && request.method === "POST") return publishRelease(request, env.BUCKET, DEPLOY_CONFIG);
    if (url.pathname === "/api/deploy-capabilities") return Response.json({ protocol: 1, runtimeHash: DEPLOY_CONFIG.runtimeHash, storageReady: Boolean(env.BUCKET) }, { headers: { "Cache-Control": "no-store" } });
    const publicProtocol = ["/mcp", "/api/app-version", "/app-version.json"].includes(url.pathname);
    const publicAsset = (request.method === "GET" || request.method === "HEAD") &&
      (url.pathname.startsWith("/_next/static/") || url.pathname === "/draftopus-logo.png");
    const clerkMode = env.DRAFTOPUS_CLERK_MODE;
    const cfg = clerkMode === "production" || clerkMode === "development" && DEPLOY_CONFIG.branch !== "main"
      ? clerkAccountConfig(request, env, DEPLOY_CONFIG.origin) : null;
    const authentication = cfg && !publicProtocol && !publicAsset ? await independentSignIn(request, url, env, cfg) : null;
    if (authentication?.response) return authentication.response;
    const principal = authentication?.principal;
    if (['/api/account','/api/account/billing'].includes(url.pathname) || url.pathname.startsWith('/api/admin/')) return traceApiRequest(request, measure => accountApi(request, env, measure, principal));
    if (url.pathname === '/api/library' || url.pathname.startsWith('/api/library/')) return traceApiRequest(request, measure => cloudLibraryApi(request, env, measure, principal));
    if (!cfg && !request.headers.get("oai-authenticated-user-id") && !publicProtocol) {
      return new Response(null, { status: 302, headers: { Location: "/signin-with-chatgpt?return_to=%2F", "Cache-Control": "private, no-store" } });
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
      if (file === "/index.html" && principal?.provider === "clerk") {
        const headers = new Headers({ "Content-Type": type, ...authenticationHeaders });
        for (const cookie of authentication.cookies) headers.append("Set-Cookie", cookie);
        return new Response(request.method === "HEAD" ? null : withClerkSession(await new Response(hosted.body).text(), cfg.issuer, cfg.publishableKey), { headers });
      }
      return new Response(request.method === "HEAD" ? null : hosted.body, { headers: { "Content-Type": type, "Cache-Control": file.startsWith("/_next/static/") ? "public, max-age=31536000, immutable" : "no-store", "X-Content-Type-Options": "nosniff" } });
    }
    const encoded = ASSETS[file];
    if (encoded === undefined) return new Response("Not found", { status: 404 });
    const bytes = request.method === "HEAD" ? null : Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const type = file === "/api" ? "application/json" : MIME[file.split(".").at(-1)] || "application/octet-stream";
    if (file === "/index.html" && principal?.provider === "clerk") {
      const headers = new Headers({ "Content-Type": type, ...authenticationHeaders });
      for (const cookie of authentication.cookies) headers.append("Set-Cookie", cookie);
      return new Response(bytes ? withClerkSession(new TextDecoder().decode(bytes), cfg.issuer, cfg.publishableKey) : null, { headers });
    }
    return new Response(bytes, { headers: { "Content-Type": type, "Cache-Control": file.startsWith("/_next/static/") ? "public, max-age=31536000, immutable" : "no-cache", "X-Content-Type-Options": "nosniff" } });
  },
};

