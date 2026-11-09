import { readdir, readFile, mkdir, writeFile, cp } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

export async function packageSite(manifest) {
  const assets = {};
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(file);
      else assets["/" + path.relative("out", file).split(path.sep).join("/")] = (await readFile(file)).toString("base64");
    }
  }
  await visit("out");
  const build = createHash("sha256").update(JSON.stringify(assets)).digest("hex");
  const runtime = await readFile("scripts/sites-runtime.mjs", "utf8");
  await mkdir("dist/server", { recursive: true });
  await mkdir("dist/.openai", { recursive: true });
  await writeFile("dist/server/index.js", "const ASSETS=" + JSON.stringify(assets) + ";\nconst APP_BUILD=" + JSON.stringify(build) + ";\n" + runtime);
  await cp(".openai/hosting.json", "dist/.openai/hosting.json");
  console.log(`Packaged GitHub application for Sites: ${Object.keys(assets).length} assets, build ${build.slice(0, 12)}`);
}
