import { spawnSync } from "node:child_process";
import { readdir, readFile, mkdir, writeFile, cp } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { sourceVersion } from "./source-version.mjs";
import { build as bundle } from "esbuild";

async function previousStaticAssets(workerPath, currentAssets) {
  if (!workerPath) return {};
  const worker = await readFile(workerPath, "utf8");
  const start = "const ASSETS=";
  const end = worker.indexOf(";\nconst APP_BUILD=");
  if (!worker.startsWith(start) || end < 0) throw new Error("Previous Sites Worker asset manifest was not found.");
  const previousAssets = JSON.parse(worker.slice(start.length, end));
  return Object.fromEntries(Object.entries(previousAssets).filter(([file]) =>
    file.startsWith("/_next/static/") && !Object.hasOwn(currentAssets, file)
  ));
}

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
  const fallbackAssets = await previousStaticAssets(process.env.KATCHAMAK_PREVIOUS_SITES_WORKER, assets);
  const fallback = Object.keys(fallbackAssets).length
    ? "Object.assign(ASSETS," + JSON.stringify(fallbackAssets) + ");\n"
    : "";
  const runtime = (await readFile("scripts/sites-runtime.mjs", "utf8"))
    .replace(/^import .*from "\.\/(?:draftopus-auth-session|draftopus-auth-ui|draftopus-identities|read-only-demo)\.mjs";\r?\n/gm, "");
  const requestTrace = await readFile("scripts/request-trace.mjs", "utf8");
  const accounts = await readFile("scripts/accounts-runtime.mjs", "utf8");
  const membershipSchema = await readFile("drizzle/0006_membership_purchases.sql", "utf8");
  const checkoutSchema = await readFile("drizzle/0007_paddle_checkouts.sql", "utf8");
  const billing = await readFile("scripts/paddle-billing.mjs", "utf8");
  const billingModule = "const checkoutMigration=" + JSON.stringify(checkoutSchema) + ";\n" + billing.replace(/^import .*drizzle\/0007_paddle_checkouts[^\r\n]*(?:\r?\n|$)/m, "").replace(/^export /gm, "");
  const demos = await readFile("scripts/demo-projects.mjs", "utf8");
  const cloud = await readFile("scripts/cloud-library-runtime.mjs", "utf8");
  // Bundle the shared cloud write logic without pulling in the client store.
  const validation = await bundle({
    stdin: {
      contents: `export {validCloudLibrary} from "./src/lib/kachamak/cloud-write-validation.mjs";
export {applyLibraryNotePatch, validLibraryNotePatch} from "./src/lib/kachamak/cloud-note-patch.mjs";`,
      resolveDir: process.cwd(),
    },
    bundle: true, write: false, format: "iife", globalName: "projectValidation", platform: "neutral", target: "es2022",
  });
  const projectValidation = validation.outputFiles[0].text + "\nconst {validCloudLibrary, applyLibraryNotePatch, validLibraryNotePatch} = projectValidation;\n";
  const accountsBundle = await bundle({
    stdin: {
      contents: `export {draftopusAuthConfig, openDraftopusAuth, handleDraftopusAuth} from "./scripts/draftopus-auth-session.mjs";
export {draftopusAccountPage} from "./scripts/draftopus-auth-ui.mjs";
export {legacyDraftopusEmails, legacyDraftopusAccount, independentDraftopusAccount} from "./scripts/draftopus-identities.mjs";
export {readOnlyDemo} from "./scripts/read-only-demo.mjs";`,
      resolveDir: process.cwd(),
    },
    bundle: true, write: false, format: "iife", globalName: "draftopusAccounts", platform: "browser", target: "es2022",
  });
  const independentAccounts = accountsBundle.outputFiles[0].text + "\nconst {draftopusAuthConfig, openDraftopusAuth, handleDraftopusAuth, draftopusAccountPage, legacyDraftopusEmails, legacyDraftopusAccount, independentDraftopusAccount, readOnlyDemo} = draftopusAccounts;\n";
  const oidc = await readFile("scripts/github-oidc.mjs", "utf8");
  const store = await readFile("scripts/release-store.mjs", "utf8");
  const automation = JSON.parse(await readFile(".openai/automation.json", "utf8"));
  const deployConfig = { repository: automation.repository, branch: automation.branch, origin: automation.origin, workflow: automation.workflow };
  deployConfig.runtimeHash = createHash("sha256").update(requestTrace + accounts + membershipSchema + billingModule + demos + cloud + projectValidation + independentAccounts + oidc + store + runtime + JSON.stringify(deployConfig) + JSON.stringify(manifest)).digest("hex");
  const modules = projectValidation + requestTrace.replace(/^export /gm, "") + "\n" + demos.replace(/^export /gm, "") + "\n" + cloud.replace(/^(?:import|export \{)[^\r\n]*(?:demo-projects|cloud-(?:write-validation|note-patch)|request-trace)[^\r\n]*(?:\r?\n|$)/gm, "").replace(/^export /gm, "") + "\nconst membershipMigration=" + JSON.stringify(membershipSchema) + ";\n" + accounts.replace(/^import[^\r\n]*(?:request-trace|0006_membership_purchases)[^\r\n]*(?:\r?\n|$)/gm, "").replace(/^export /gm, "") + "\n" + oidc.replace(/^export /gm, "") + "\n" + store.replace(/^import[^\r\n]*github-oidc[^\r\n]*(?:\r?\n|$)/m, "").replace(/^export /gm, "");
  await mkdir("dist/server", { recursive: true });
  await mkdir("dist/.openai", { recursive: true });
  // Keep the previous build's extra immutable files out of the active build
  // fingerprint and GitHub manifest. They are available to open tabs only.
  await writeFile("dist/server/index.js", "const ASSETS=" + JSON.stringify(assets) + ";\nconst APP_BUILD=" + JSON.stringify(build) + ";\nconst SOURCE_VERSION=" + JSON.stringify(version) + ";\nconst DEPLOY_CONFIG=" + JSON.stringify(deployConfig) + ";\n" + fallback + independentAccounts + modules.replace(/^import .*paddle-billing[^\r\n]*(?:\r?\n|$)/m, "") + "\n" + billingModule + "\n" + runtime);
  const syntax = spawnSync(process.execPath, ["--check", "dist/server/index.js"], { stdio: "inherit" });
  if (syntax.status !== 0) throw new Error("Sites Worker syntax validation failed.");
  await cp(".openai/hosting.json", "dist/.openai/hosting.json");
  await mkdir(".sites-runtime", { recursive: true });
  await writeFile(".sites-runtime/github-release.json", JSON.stringify({ version, buildId: build, runtimeHash: deployConfig.runtimeHash, assets: Object.entries(assets).map(([file, data]) => ({ path: file, data, hash: createHash("sha256").update(Buffer.from(data, "base64")).digest("hex") })) }));
  console.log(`Packaged GitHub application for Sites: ${Object.keys(assets).length} assets, build ${build.slice(0, 12)}`);
  if (fallback) console.log(`Retained ${Object.keys(fallbackAssets).length} immutable assets from the previous Sites Worker.`);
}

