import { spawnSync } from "node:child_process";
import { readdir, readFile, mkdir, writeFile, cp } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { sourceVersion } from "./source-version.mjs";

export async function packageSite(manifest) {
  const version = sourceVersion();
  await writeFile("out/app-version.json", JSON.stringify(version));
  const assets = {};
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(file);
      else assets["/" + path.relative("out", file).split(path.sep).join("/")] = (await readFile(file)).toString("base64");
    }
  }
  await visit("out");
  const build = createHash("sha256").update(JSON.stringify(assets)).digest("hex");
  const runtime = await readFile("scripts/sites-runtime.mjs", "utf8");
  const accounts = await readFile("scripts/accounts-runtime.mjs", "utf8");
  const oidc = await readFile("scripts/github-oidc.mjs", "utf8");
  const store = await readFile("scripts/release-store.mjs", "utf8");
  const automation = JSON.parse(await readFile(".openai/automation.json", "utf8"));
  const deployConfig = { repository: automation.repository, branch: automation.branch, origin: automation.origin, workflow: automation.workflow };
  deployConfig.runtimeHash = createHash("sha256").update(accounts + oidc + store + runtime + JSON.stringify(deployConfig) + JSON.stringify(manifest)).digest("hex");
  const modules = accounts.replace(/^export /gm, "") + "\n" + oidc.replace(/^export /gm, "") + "\n" + store.replace(/^import[^\r\n]*github-oidc[^\r\n]*(?:\r?\n|$)/m, "").replace(/^export /gm, "");
  await mkdir("dist/server", { recursive: true });
  await mkdir("dist/.openai", { recursive: true });
  await writeFile("dist/server/index.js", "const ASSETS=" + JSON.stringify(assets) + ";\nconst APP_BUILD=" + JSON.stringify(build) + ";\nconst SOURCE_VERSION=" + JSON.stringify(version) + ";\nconst DEPLOY_CONFIG=" + JSON.stringify(deployConfig) + ";\n" + modules + "\n" + runtime);
  const syntax = spawnSync(process.execPath, ["--check", "dist/server/index.js"], { stdio: "inherit" });
  if (syntax.status !== 0) throw new Error("Sites Worker syntax validation failed.");
  await cp(".openai/hosting.json", "dist/.openai/hosting.json");
  await mkdir(".sites-runtime", { recursive: true });
  await writeFile(".sites-runtime/github-release.json", JSON.stringify({ version, buildId: build, runtimeHash: deployConfig.runtimeHash, assets: Object.entries(assets).map(([file, data]) => ({ path: file, data, hash: createHash("sha256").update(Buffer.from(data, "base64")).digest("hex") })) }));
  console.log(`Packaged GitHub application for Sites: ${Object.keys(assets).length} assets, build ${build.slice(0, 12)}`);
}

