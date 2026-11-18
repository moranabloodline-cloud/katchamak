export class RequestTimeoutError extends Error {
  constructor() { super('The request timed out. Retry when the connection is available.'); this.name = 'RequestTimeoutError'; }
}

/** One deadline covers both headers and body. Mutations are never silently retried. */
export async function requestJson(path: string, init: RequestInit = {}, timeoutMs = 30000) {
  const controller = new AbortController(), started = performance.now();
  const cancel = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) cancel(); else init.signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => controller.abort(new RequestTimeoutError()), timeoutMs);
  let response: Response | undefined, abort: (() => void) | undefined;
  try {
    if (controller.signal.aborted) throw controller.signal.reason;
    const cancelled = new Promise<never>((_, reject) => {
      abort = () => reject(controller.signal.reason ?? new DOMException('Aborted', 'AbortError'));
      if (controller.signal.aborted) abort(); else controller.signal.addEventListener('abort', abort, { once: true });
    });
    return await Promise.race([cancelled, (async () => {
      response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...init, signal: controller.signal });
      // HTTP error pages may be HTML; a successful non-JSON response must never acknowledge a save.
      const raw = await response.text();
      let data;
      try { data = JSON.parse(raw); } catch {
        if (response.ok) throw new Error('The server returned an unreadable response. Please retry.');
        data = {};
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('The server returned an invalid response. Please retry.');
      return { response, data };
    })()]);
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', cancel);
    if (abort) controller.signal.removeEventListener('abort', abort);
    const durationMs = Math.round(performance.now() - started);
    if (durationMs >= 3000 || controller.signal.reason instanceof RequestTimeoutError) {
      // Never log query strings, account IDs, headers or request/response contents.
      const route = path.split('?')[0].replace(/(\/api\/library\/files)(\/.*)?$/, '$1/:attachment');
      console.warn('Slow API request', { method: init.method ?? 'GET', route, durationMs, status: response?.status, requestId: response?.headers.get('X-Katchamak-Request') ?? undefined, timedOut: controller.signal.reason instanceof RequestTimeoutError });
    }
  }
}
