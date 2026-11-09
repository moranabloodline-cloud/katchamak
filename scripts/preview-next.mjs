import { spawn } from "node:child_process";
const args = process.argv.slice(2);
const value = (flag, fallback) => args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", value("--host", "0.0.0.0"), "--port", value("--port", "3000")], {
  stdio: "inherit",
  env: { ...process.env, NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS: "1" },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", code => process.exit(code ?? 1));
