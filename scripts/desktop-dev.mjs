import { spawn } from "node:child_process";
const desktop = process.argv[2] === "tauri";
const sites = process.env.SITES_MANAGED_LINUX_CONTAINER === "1";
const watcher = sites ? null : spawn(process.execPath, ["scripts/desktop-sync.mjs", "watch"], { stdio: "inherit" });
const app = spawn(process.execPath, desktop ? ["scripts/tauri.mjs", "dev"] : sites ? ["scripts/preview-next.mjs", ...process.argv.slice(2)] : ["scripts/preview-next.mjs", "--host", "127.0.0.1", "--port", "3000"], {
  stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_KATCHAMAK_DESKTOP: sites ? "0" : "1" },
});
const stop = () => { watcher?.kill("SIGTERM"); app.kill("SIGTERM"); };
process.on("SIGINT", stop); process.on("SIGTERM", stop);
app.on("exit", code => { watcher?.kill("SIGTERM"); process.exit(code ?? 1); });
