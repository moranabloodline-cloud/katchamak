export function newerRelease(current: string, latest: string): boolean {
  const parse = (v: string) => /^v?(\d+)\.(\d+)\.(\d+)$/.exec(v)?.slice(1).map(Number);
  const a = parse(current), b = parse(latest);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) { if (a[i] !== b[i]) return b[i] > a[i]; }
  return false;
}
export async function checkDesktopRelease(current: string, fetcher: typeof fetch = fetch): Promise<string> {
  const response = await fetcher("https://api.github.com/repos/moranabloodline-cloud/katchamak/releases/latest", {
    headers: { Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(10000), credentials: "omit",
  });
  if (response.status === 404) return "No public update feed is available for this private application. Get the latest installer from your application provider.";
  if (!response.ok) throw new Error("The update service is unavailable. Try again later.");
  const release = await response.json();
  if (release.draft || release.prerelease || !/^v?\d+\.\d+\.\d+$/.test(release.tag_name ?? "")) throw new Error("No supported Windows release was found.");
  return newerRelease(current, release.tag_name) ? `Version ${release.tag_name.replace(/^v/, "")} is available. Ask your application provider for the new Windows installer.` : `You are using the latest published version (${current}).`;
}
