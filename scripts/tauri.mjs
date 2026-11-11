import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
const env = { ...process.env, NEXT_PUBLIC_KATCHAMAK_DESKTOP: "1", PATH: path.join(os.homedir(), ".cargo", "bin") + path.delimiter + process.env.PATH };
const child = spawn(process.execPath, ["node_modules/@tauri-apps/cli/tauri.js", ...process.argv.slice(2)], { stdio: "inherit", env });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", code => process.exit(code ?? 1));
