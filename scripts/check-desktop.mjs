import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
const html = readFileSync("out/index.html", "utf8");
assert.ok(html.includes("_next/static/"), "Static app must reference its bundled assets");
assert.ok(!/https?:\/\/(?:fonts\.googleapis|fonts\.gstatic|[^/]+\.chatgpt\.site)/.test(html), "App entry must not load cloud assets");
const config = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
assert.equal(config.build.frontendDist, "../out");
assert.ok(!config.build.frontendDist.startsWith("http"));
const visit = folder => readdirSync(folder, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? visit(path.join(folder, entry.name)) : [path.join(folder, entry.name)]);
assert.ok(visit("out/fonts").some(file => file.endsWith(".woff2")), "Fonts must be packaged offline");
for (const asset of [...html.matchAll(/(?:src|href)="([^"?#]+)"/g)].map(m => m[1]).filter(s => s.startsWith("/_next/"))) assert.ok(readFileSync(path.join("out", asset)));
console.log("Desktop static entry, local assets and bundled fonts verified.");

for (const file of visit("out")) {
  assert.ok(!/\.(?:zip|7z|tar|gz|bak)$/i.test(file) && !/(?:^|[\\/])(?:project\.json|recent-projects\.json)$|\.katchamak[\\/]|-kachamak-backup\.json$/i.test(file), `Project data or source archive in distribution: ${file}`);
  if (!/\.(?:js|json|html|txt|md|map)$/i.test(file)) continue;
  const content = readFileSync(file, "utf8");
  assert.ok(!/Morrigan|CASHABLANCA|Nikola Djokovic|Archive-Prime|The third dial waited|Morana: Bloodline/i.test(content), `Private sample content in distribution: ${file}`);
}
console.log("Distribution contains no personal seed projects or internal project records.");
