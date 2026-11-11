import { spawn } from "node:child_process";
import { syncWorkspace } from "./sync-workspace.mjs";

// Get GitHub's canonical source before opening a development session.
syncWorkspace(process.cwd());
const watcher = spawn(process.execPath, ["scripts/sync-workspace.mjs", "watch"], { stdio: "inherit" });
const preview = spawn(process.execPath, ["scripts/preview-next.mjs", ...process.argv.slice(2)], { stdio: "inherit" });
const stop = () => { watcher.kill("SIGTERM"); preview.kill("SIGTERM"); };
process.on("SIGINT", stop); process.on("SIGTERM", stop);
preview.on("exit", code => { watcher.kill("SIGTERM"); process.exit(code ?? 1); });
