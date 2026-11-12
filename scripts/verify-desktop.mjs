import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
const env = { ...process.env, PATH: path.join(process.cwd(), ".tools") + path.delimiter + path.join(os.homedir(), ".cargo", "bin") + path.delimiter + process.env.PATH };
const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
};
run(process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.app.json"]);
const bun = process.platform === "win32" ? "bun.exe" : "bun";
for (const file of ["rehydration", "library", "dashboard-zoom", "release-store", "application-updates", "desktop-releases", "account-preferences", "workspace-sync", "desktop-sync", "project-files"]) run(bun, ["run", `tests/${file}.test.mjs`]);
run(process.execPath, ["scripts/build-project.mjs"]);
run(process.execPath, ["scripts/check-desktop.mjs"]);
run("cargo", ["test", "--manifest-path", "src-tauri/Cargo.toml"]);
// A verified desktop change includes compilation of the native host.
run(process.execPath, ["scripts/tauri.mjs", "build", "--no-bundle", "--config", JSON.stringify({ build: { beforeBuildCommand: "" } })]);
