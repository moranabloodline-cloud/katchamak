export class RequestTimeoutError extends Error {
  constructor() { super('The request timed out. Retry when the connection is available.'); this.name = 'RequestTimeoutError'; }
}

export class InvalidResponseError extends Error {}

// Fetch cannot report upload progress. A library snapshot can contain several MB of images.
function transferSnapshot(path: string, init: RequestInit, body: string | null, signal: AbortSignal, onProgress: () => void): Promise<Response> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(init.method ?? 'GET', path);
    request.responseType = 'blob';
    new Headers(init.headers).forEach((value, key) => request.setRequestHeader(key, value));

    const trackBytes = () => {
      let previous = 0;
      return (event: ProgressEvent) => {
        if (event.loaded > previous) {
          previous = event.loaded;
          onProgress();
        }
      };
    };
    request.upload.onprogress = trackBytes();
    request.onprogress = trackBytes();
    request.onload = () => {
      const headers = new Headers();
      for (const line of request.getAllResponseHeaders().trim().split(/\r?\n/)) {
        const colon = line.indexOf(':');
        if (colon > 0) headers.append(line.slice(0, colon), line.slice(colon + 1).trim());
      }
      const bodyAllowed = ![204, 205, 304].includes(request.status);
      resolve(new Response(bodyAllowed ? request.response : null, { status: request.status, statusText: request.statusText, headers }));
    };
    request.onerror = () => reject(new TypeError('The connection was interrupted. Please retry.'));
    request.onabort = () => reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    const cancel = () => request.abort();
    request.onloadend = () => signal.removeEventListener('abort', cancel);
    signal.throwIfAborted();
    signal.addEventListener('abort', cancel, { once: true });
    request.send(body);
  });
}

/** A snapshot gets a fresh timeout as bytes move. Other requests retain a single deadline. */
export async function requestJson(path: string, init: RequestInit = {}, timeoutMs = 30000) {
  const controller = new AbortController(), started = performance.now();
  const cancel = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) cancel(); else init.signal?.addEventListener('abort', cancel, { once: true });
  const timedOut = () => controller.abort(new RequestTimeoutError());
  let timer = setTimeout(timedOut, timeoutMs);
  const progress = () => {
    clearTimeout(timer);
    timer = setTimeout(timedOut, timeoutMs);
  };
  let response: Response | undefined, abort: (() => void) | undefined;
  try {
    if (controller.signal.aborted) throw controller.signal.reason;
    const cancelled = new Promise<never>((_, reject) => {
      abort = () => reject(controller.signal.reason ?? new DOMException('Aborted', 'AbortError'));
      if (controller.signal.aborted) abort(); else controller.signal.addEventListener('abort', abort, { once: true });
    });
    return await Promise.race([cancelled, (async () => {
      const route = path.split('?')[0];
      const snapshot = route === '/api/library' || route === '/api/library/demo/install';
      response = snapshot && typeof XMLHttpRequest !== 'undefined' && (init.body == null || typeof init.body === 'string')
        ? await transferSnapshot(path, init, init.body ?? null, controller.signal, progress)
        : await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...init, signal: controller.signal });
      // HTTP error pages may be HTML; a successful non-JSON response must never acknowledge a save.
      const raw = await response.text();
      let data;
      try { data = JSON.parse(raw); } catch {
        if (response.ok) throw new InvalidResponseError('The server returned an unreadable response. Please retry.');
        data = {};
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        if (response.ok) throw new InvalidResponseError('The server returned an invalid response. Please retry.');
        data = {};
      }
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
