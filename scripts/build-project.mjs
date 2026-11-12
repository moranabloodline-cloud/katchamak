import { spawnSync } from "node:child_process";
import { existsSync, cpSync, readFileSync, rmSync } from "node:fs";
import { sourceVersion } from "./source-version.mjs";
const desktop = process.env.KATCHAMAK_BUILD_TARGET ? process.env.KATCHAMAK_BUILD_TARGET !== "sites" : process.env.SITES_MANAGED_LINUX_CONTAINER !== "1";
const hosted = !desktop && existsSync(".openai/hosting.json");
const env = { ...process.env, KATCHAMAK_DESKTOP: desktop ? "1" : "0", NEXT_PUBLIC_KATCHAMAK_DESKTOP: desktop ? "1" : "0", KATCHAMAK_SITES_EXPORT: hosted ? "1" : "0", NEXT_PUBLIC_APPLICATION_SOURCE_TREE: sourceVersion().sourceTree, NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS: "1" };
const build = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], { stdio: "inherit", env });
if (build.status !== 0) process.exit(build.status ?? 1);
// Internal project records are not distributable application assets.
if (desktop || hosted) for (const file of ["PROJEKT-KONTEKST.md", "KACHAMAK-ARHITEKTURA.md"]) rmSync(`out/${file}`, { force: true });
if (desktop) {
  await import("./check-desktop.mjs");
}
if (hosted) {
  const { packageSite } = await import("./package-sites.mjs");
  await packageSite(JSON.parse(readFileSync(".openai/hosting.json", "utf8")));
} else if (!desktop) {
  cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
  cpSync("public", ".next/standalone/public", { recursive: true });
}
