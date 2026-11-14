import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const paths = ["db", "drizzle", "drizzle.config.ts", "src", "public", "scripts", "tests", ".github", ".openai", "README.md", "PROJECT_STATUS.md", "PROJEKT-KONTEKST.md", "KACHAMAK-ARHITEKTURA.md", "package.json", "bun.lock", "next.config.ts", "tsconfig.json", "tsconfig.app.json", "tailwind.config.ts", "postcss.config.mjs", ".gitignore"];
const secretName = /(^|\/)(\.env[^/]*|\.git-credentials|[^/]*\.(pem|key))$/i;
const secretValue = /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-(?:proj-)?[A-Za-z0-9_-]{30,})\b|-{5}BEGIN [A-Z ]*PRIVATE KEY-{5}/;

export function syncWorkspace(cwd, { publish = false, checks, quietMs = 30000, now = Date.now(), enforceRemote = true } = {}) {
  const directory = path.join(cwd, ".sites-runtime"); mkdirSync(directory, { recursive: true });
  const stateFile = path.join(directory, "sync-state.json");
  let state; try { state = JSON.parse(readFileSync(stateFile, "utf8")); } catch { state = {}; }
  const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }, timeout: 60000 }).trim();
  const save = (update) => { state = { ...state, ...update, pid: process.pid, updatedAt: Date.now() }; writeFileSync(stateFile, JSON.stringify(state, null, 2)); return state; };
  if (existsSync(path.join(directory, "sync.paused"))) return save({ status: "paused", busy: false });
  try {
    save({ busy: true, status: "fetching" });
    const config = JSON.parse(readFileSync(path.join(cwd, ".openai/automation.json"), "utf8"));
    if (enforceRemote) {
      const remote = new URL(git("remote", "get-url", "origin"));
      if (remote.hostname !== "github.com" || remote.username || remote.password || remote.pathname.replace(/\.git$/, "") !== `/${config.repository}`) throw new Error("Origin must be the configured GitHub repository without embedded credentials.");
    }
    git("fetch", "origin", config.branch);
    const remote = git("rev-parse", `origin/${config.branch}`), local = git("rev-parse", "HEAD");
    const status = git("status", "--porcelain", "--untracked-files=normal", "--", ...paths);
    const changed = git("diff", "--name-only", "HEAD", "--", ...paths).split("\n").filter(Boolean);
    const untracked = git("ls-files", "--others", "--exclude-standard", "--", ...paths).split("\n").filter(Boolean);
    const hash = createHash("sha256").update(git("diff", "--binary", "HEAD", "--", ...paths));
    for (const file of [...changed, ...untracked]) {
      if (secretName.test(file)) throw new Error(`Excluded credential file: ${file}`);
      const full = path.join(cwd, file);
      if (existsSync(full) && secretValue.test(readFileSync(full, "utf8"))) throw new Error(`Possible credential in ${file}; automatic commit stopped.`);
      if (untracked.includes(file)) hash.update(file + "\0").update(readFileSync(full));
    }
    const fingerprint = hash.digest("hex");
    const upstreamIsAncestor = spawnSync("git", ["merge-base", "--is-ancestor", remote, local], { cwd }).status === 0;
    if (local !== remote && !upstreamIsAncestor) {
      if (git("diff", "--name-only", local, remote, "--", "upload").length) throw new Error("Incoming commit changes protected upload/ inputs; automatic overwrite stopped.");
      const recovery = `backup/autosync-${Date.now()}-${local.slice(0, 8)}`;
      git("branch", recovery, local);
      if (status) git("stash", "push", "--include-untracked", "-m", recovery, "--", ...new Set([...changed, ...untracked]));
      // Keep previous commits on the recovery branch; never force-push or rewrite remote history.
      git("switch", "--detach", `origin/${config.branch}`);
      return save({ busy: false, status: "pulled", remote, backup: recovery, fingerprint: null, changedAt: null });
    }
    if (!publish) return save({ busy: false, status: "ready", remote });
    if (status && state.fingerprint !== fingerprint) return save({ busy: false, status: "waiting_for_finished_edit", remote, fingerprint, changedAt: now });
    if (status && now - (state.changedAt ?? now) < quietMs) return save({ busy: false, status: "waiting_for_finished_edit", remote });
    if (!status && local === remote) return save({ busy: false, status: "up_to_date", remote });
    if (state.failedCommit === local && !status && now - (state.failedAt ?? 0) < 60000) return save({ busy: false, status: "retry_pending", remote });
    const commands = checks ?? [
      ["bun", "run", "typecheck"], ["bun", "run", "tests/rich-editor.test.mjs"], ["bun", "run", "tests/note-workflow.test.mjs"], ["bun", "run", "tests/note-link-dialog.test.mjs"], ["bun", "run", "tests/knowledge.test.mjs"], ["bun", "run", "tests/note-links.test.mjs"], ["bun", "run", "tests/note-tree-add.test.mjs"], ["bun", "run", "tests/cloud-library.test.mjs"], ["bun", "run", "tests/account-auth.test.mjs"], ["bun", "run", "tests/rehydration.test.mjs"], ["bun", "run", "tests/library.test.mjs"],
      ["bun", "run", "tests/release-store.test.mjs"], ["bun", "run", "tests/application-updates.test.mjs"],
    ];
    const run = (command) => { const result = spawnSync(command[0], command.slice(1), { cwd, stdio: "inherit", env: process.env }); if (result.status !== 0) throw new Error(`${command.join(" ")} failed.`); };
    save({ status: "checking" });
    for (const command of commands) run(command);
    if (existsSync(path.join(directory, "sync.paused"))) return save({ busy: false, status: "paused" });
    const afterHash = createHash("sha256").update(git("diff", "--binary", "HEAD", "--", ...paths));
    for (const file of git("ls-files", "--others", "--exclude-standard", "--", ...paths).split("\n").filter(Boolean)) afterHash.update(file + "\0").update(readFileSync(path.join(cwd, file)));
    if (afterHash.digest("hex") !== fingerprint) return save({ busy: false, status: "waiting_for_finished_edit", fingerprint: null, changedAt: now });
    if (status) { git("add", "-A", "--", ...new Set([...changed, ...untracked])); git("commit", "-m", "Auto-sync verified Katchamak changes"); }
    const commit = git("rev-parse", "HEAD");
    save({ status: "building", pendingCommit: commit });
    if (!checks) { run([process.execPath, "scripts/run-target.mjs", "sites", "scripts/build-project.mjs"]); run(["bun", "run", "check:release"]); }
    if (existsSync(path.join(directory, "sync.paused"))) return save({ busy: false, status: "paused", pendingCommit: commit });
    // A simultaneous upstream push makes this fail safely. The next pass backs up and pulls it.
    git("push", "origin", `HEAD:${config.branch}`);
    return save({ busy: false, status: "pushed", remote: commit, fingerprint: null, changedAt: null, pendingCommit: null, failedCommit: null, error: null });
  } catch (error) {
    save({ busy: false, status: "error", failedCommit: git("rev-parse", "HEAD"), failedAt: now, error: error.message });
    throw error;
  }
}

async function main() {
  const cwd = process.cwd(), directory = path.join(cwd, ".sites-runtime"); mkdirSync(directory, { recursive: true });
  const action = process.argv[2] ?? "watch";
  if (action === "pause") {
    writeFileSync(path.join(directory, "sync.paused"), "paused\n");
    while (existsSync(path.join(directory, "sync-state.json"))) {
      const state = JSON.parse(readFileSync(path.join(directory, "sync-state.json"), "utf8"));
      if (!state.busy) break;
      try { process.kill(state.pid, 0); } catch { break; }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    console.log("Automatic sync paused."); return;
  }
  if (action === "resume") { rmSync(path.join(directory, "sync.paused"), { force: true }); console.log("Automatic sync resumed."); return; }
  if (action === "once") { console.log(JSON.stringify(syncWorkspace(cwd))); return; }
  const lock = path.join(directory, "sync.lock");
  if (existsSync(lock)) {
    const pid = Number(readFileSync(path.join(lock, "pid"), "utf8"));
    try { process.kill(pid, 0); console.log("Workspace sync is already running."); return; } catch { rmSync(lock, { recursive: true, force: true }); }
  }
  mkdirSync(lock); writeFileSync(path.join(lock, "pid"), String(process.pid));
  const cleanup = () => { rmSync(lock, { recursive: true, force: true }); process.exit(0); };
  process.on("SIGINT", cleanup); process.on("SIGTERM", cleanup);
  let prior = "";
  while (true) {
    try { const state = syncWorkspace(cwd, { publish: true }); if (state.status !== prior) console.log(JSON.stringify(state)); prior = state.status; }
    catch (error) { console.error(error.message); }
    const config = JSON.parse(readFileSync(path.join(cwd, ".openai/automation.json"), "utf8"));
    await new Promise(resolve => setTimeout(resolve, config.workspace_poll_seconds * 1000));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
