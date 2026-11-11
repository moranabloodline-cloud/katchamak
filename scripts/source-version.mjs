import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

// Application inputs only: no credentials, browser data or generated output.
const inputs = ["src", "public", "scripts", "package.json", "bun.lock", "next.config.ts", "tsconfig.json", "tsconfig.app.json", "tailwind.config.ts", "postcss.config.mjs", ".openai/hosting.json", ".openai/automation.json"];

export function sourceVersion(cwd = process.cwd()) {
  const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  const files = [...new Set(git("ls-files", "--cached", "--others", "--exclude-standard", "--", ...inputs).split("\n").filter(Boolean))].sort();
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file + "\0");
    hash.update(readFileSync(path.join(cwd, file)));
    hash.update("\0");
  }
  return {
    sourceCommit: git("rev-parse", "HEAD"),
    sourceTree: hash.digest("hex"),
    dirty: Boolean(git("status", "--porcelain", "--untracked-files=normal", "--", ...inputs)),
  };
}
