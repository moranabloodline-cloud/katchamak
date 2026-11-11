import { spawnSync } from "node:child_process";
const [target, script, ...args] = process.argv.slice(2);
const result = spawnSync(process.execPath, [script, ...args], { stdio: "inherit", env: { ...process.env, KATCHAMAK_BUILD_TARGET: target } });
process.exit(result.status ?? 1);
