import { spawn } from "node:child_process";
const desktop = process.argv[2] === "tauri";
const watcher = spawn(process.execPath, ["scripts/desktop-sync.mjs", "watch"], { stdio: "inherit" });
const app = spawn(process.execPath, desktop ? ["scripts/tauri.mjs", "dev"] : ["scripts/preview-next.mjs", "--host", "127.0.0.1", "--port", "3000"], {
  stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_KATCHAMAK_DESKTOP: "1" },
});
const stop = () => { watcher.kill("SIGTERM"); app.kill("SIGTERM"); };
process.on("SIGINT", stop); process.on("SIGTERM", stop);
app.on("exit", code => { watcher.kill("SIGTERM"); process.exit(code ?? 1); });
