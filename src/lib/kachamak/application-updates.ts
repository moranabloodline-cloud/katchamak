export function watchApplicationUpdates(options: {
  current: string;
  fetchVersion: () => Promise<{ sourceTree?: string }>;
  canReload: () => boolean;
  reload: () => void;
  target: Pick<Window, "addEventListener" | "removeEventListener">;
  intervalMs?: number;
}) {
  let stopped = false, checking = false, reloading = false;
  const check = async () => {
    if (checking || stopped || reloading) return;
    checking = true;
    try {
      const version = await options.fetchVersion();
      if (!stopped && /^[a-f0-9]{64}$/.test(version.sourceTree ?? "") && version.sourceTree !== options.current && options.canReload()) {
        reloading = true;
        options.reload();
      }
    } catch { /* An unavailable connection keeps the current application open. */ }
    finally { checking = false; }
  };
  const timer = setInterval(check, options.intervalMs ?? 15000);
  options.target.addEventListener("focus", check);
  void check();
  return () => { stopped = true; clearInterval(timer); options.target.removeEventListener("focus", check); };
}
