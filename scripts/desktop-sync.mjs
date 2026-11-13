import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const inputs = ["db", "drizzle", "drizzle.config.ts", "src", "src-tauri", "public", "scripts", "tests", ".github", ".openai", "README.md", "DESKTOP.md", "PROJECT_STATUS.md", "PROJEKT-KONTEKST.md", "KACHAMAK-ARHITEKTURA.md", "package.json", "bun.lock", "next.config.ts", "tsconfig.json", "tsconfig.app.json", "tailwind.config.ts", "postcss.config.mjs", ".gitignore", "Start-Katchamak.cmd", "Develop-Katchamak.cmd"];
const forbidden = /(^|\/)(?:\.env[^/]*|\.git-credentials|[^/]*\.(?:key|pem)|user-projects|vaults|backups)(?:\/|$)/i;
const secret = /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-(?:proj-)?[A-Za-z0-9_-]{30,})\b|-{5}BEGIN [A-Z ]*PRIVATE KEY-{5}/;

export function verifiedSave(cwd, { commands, enforceRemote = true } = {}) {
  const directory = path.join(cwd, ".desktop-runtime");
  mkdirSync(directory, { recursive: true });
  const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" }, timeout: 60000, stdio: ["ignore", "pipe", "pipe"] }).trim();
  const state = (status, detail = {}) => {
    let previous;
    try { previous = JSON.parse(readFileSync(path.join(directory, "sync-state.json"), "utf8")); } catch {}
    const result = { ...previous, status, ...detail, ...(["pushed", "up_to_date"].includes(status) ? { pendingCommit: null, error: null } : {}), updatedAt: new Date().toISOString() };
    writeFileSync(path.join(directory, "sync-state.json"), JSON.stringify(result, null, 2));
    return result;
  };
  const files = () => [...new Set(git("ls-files", "--cached", "--others", "--exclude-standard", "--", ...inputs).split("\n").filter(Boolean))].sort();
  const fingerprint = () => {
    const hash = createHash("sha256");
    for (const file of files()) {
      if (forbidden.test(file)) throw new Error(`Private project data or credential path: ${file}`);
      const full = path.join(cwd, file);
      hash.update(file + "\0");
      if (existsSync(full)) {
        const content = readFileSync(full);
        if (secret.test(content.toString("utf8"))) throw new Error(`Possible credential in ${file}`);
        hash.update(content);
      } else hash.update("DELETED");
      hash.update("\0");
    }
    return hash.digest("hex");
  };
  const lock = path.join(directory, "save.lock");
  let locked = false;
  try {
    try { mkdirSync(lock); locked = true; writeFileSync(path.join(lock, "pid"), String(process.pid)); }
    catch {
      const pid = Number(readFileSync(path.join(lock, "pid"), "utf8"));
      let alive = true; try { process.kill(pid, 0); } catch { alive = false; }
      if (alive) return { status: "busy" };
      rmSync(lock, { recursive: true }); mkdirSync(lock); locked = true;
      writeFileSync(path.join(lock, "pid"), String(process.pid));
    }
    if (existsSync(path.join(cwd, ".sites-runtime", "sync.paused"))) return state("paused");
    if (git("branch", "--show-current") !== "main") return state("waiting_for_main", { message: "Automatic push only runs on main; feature branches are preserved." });
    if (enforceRemote && git("remote", "get-url", "origin") !== "https://github.com/moranabloodline-cloud/katchamak.git") throw new Error("Unexpected GitHub origin; automatic push stopped.");
    if (git("diff", "--cached", "--name-only")) throw new Error("Existing staged changes need review before automatic save.");
    const startHead = git("rev-parse", "HEAD");
    const start = fingerprint();
    let prior;
    try { prior = JSON.parse(readFileSync(path.join(directory, "sync-state.json"), "utf8")); } catch {}
    state("checking");
    // Verify locally before network access; an offline session always keeps its files.
    const dirty = git("status", "--porcelain", "--untracked-files=normal", "--", ...inputs);
    if (!dirty) {
      git("fetch", "origin", "main");
      const remote = git("rev-parse", "origin/main");
      if (remote === startHead) return state("up_to_date", { commit: startHead });
      if (prior?.pendingCommit === startHead && spawnSync("git", ["merge-base", "--is-ancestor", remote, startHead], { cwd }).status === 0) {
        for (const command of commands ?? [[process.execPath, "scripts/verify-cloud.mjs"]]) {
          if (spawnSync(command[0], command.slice(1), { cwd, stdio: "inherit" }).status !== 0) throw new Error("Pending commit verification failed.");
        }
        if (fingerprint() !== start) return state("changed_during_checks");
        try { git("push", "origin", "HEAD:main"); }
        catch { return state("push_pending", { commit: startHead, pendingCommit: startHead }); }
        git("fetch", "origin", "main");
        if (git("rev-parse", "origin/main") !== startHead) throw new Error("Remote changed after push.");
        return state("pushed", { commit: startHead });
      }
      // No automatic pull, reset, stash, merge or branch switch.
      throw new Error("Local and remote commits differ. Review and integrate explicitly; local work was preserved.");
    }
    for (const command of commands ?? [[process.execPath, "scripts/verify-cloud.mjs"]]) {
      const result = spawnSync(command[0], command.slice(1), { cwd, stdio: "inherit", env: process.env });
      if (result.status !== 0) throw new Error("Verification failed; no commit or push was made.");
    }
    if (git("rev-parse", "HEAD") !== startHead || fingerprint() !== start) return state("changed_during_checks");
    if (existsSync(path.join(cwd, ".sites-runtime", "sync.paused"))) return state("paused");
    git("fetch", "origin", "main");
    if (git("rev-parse", "origin/main") !== startHead) throw new Error("GitHub main changed; integrate explicitly before saving. Local files preserved.");
    const changed = [...new Set([
      ...git("diff", "--name-only", "HEAD", "--", ...inputs).split("\n"),
      ...git("ls-files", "--others", "--exclude-standard", "--", ...inputs).split("\n"),
    ])].filter(Boolean);
    if (!changed.length) return state("up_to_date", { commit: startHead });
    git("add", "-A", "--", ...changed);
    // Detect an editor save between validation and staging.
    if (fingerprint() !== start || git("diff", "--name-only", "--", ...inputs)) {
      git("restore", "--staged", "--", ...changed);
      return state("changed_during_checks");
    }
    git("commit", "-m", "Save verified Katchamak desktop changes");
    const commit = git("rev-parse", "HEAD");
    // A concurrent remote push is rejected by Git, never forced.
    try { git("push", "origin", "HEAD:main"); }
    catch (error) { return state("push_pending", { commit, pendingCommit: commit, message: "Verified local commit preserved; GitHub push must be retried.", error: error.message }); }
    git("fetch", "origin", "main");
    if (git("rev-parse", "origin/main") !== commit) throw new Error("Remote changed after push; inspect GitHub history.");
    return state("pushed", { commit });
  } catch (error) {
    state("error", { error: error.message });
    throw error;
  } finally { if (locked) rmSync(lock, { recursive: true, force: true }); }
}

async function main() {
  const cwd = process.cwd();
  if (process.argv[2] !== "watch") {
    const result = verifiedSave(cwd); console.log(JSON.stringify(result));
    if (result.status === "push_pending") process.exitCode = 1;
    return;
  }
  let previous = "", seen = "", stableSince = 0, attempted = "";
  console.log("Verified GitHub save watcher active. Editing and application storage work offline.");
  while (true) {
    try {
      const status = execFileSync("git", ["diff", "--binary", "HEAD", "--", ...inputs], { cwd });
      const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard", "--", ...inputs], { cwd, encoding: "utf8" }).trim().split("\n").filter(Boolean);
      const hash = createHash("sha256").update(status);
      for (const file of untracked) hash.update(file).update(readFileSync(path.join(cwd, file)));
      const current = hash.digest("hex");
      if (current !== seen) { seen = current; stableSince = Date.now(); attempted = ""; }
      if (Date.now() - stableSince >= 30000 && attempted !== current) {
        const result = verifiedSave(cwd);
        if (result.status !== previous) console.log(JSON.stringify(result));
        previous = result.status;
        if (["pushed", "up_to_date", "waiting_for_main"].includes(result.status)) attempted = current;
      }
    } catch (error) { if (previous !== error.message) console.error(error.message); previous = error.message; }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
