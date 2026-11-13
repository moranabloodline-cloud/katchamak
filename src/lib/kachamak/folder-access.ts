import type { DiskFolder } from './folder-files';

export type FolderHandle = DiskFolder & {
  queryPermission(options: { mode: string }): Promise<PermissionState>;
  requestPermission(options: { mode: string }): Promise<PermissionState>;
};
export const FOLDER_ACCESS = 'katchamak-folder-access-v1';

/** Opaque directory grants only. No manuscripts or absolute paths. */
export async function rememberedFolder(accountId: string, handle?: FolderHandle): Promise<FolderHandle | null> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('katchamak-folder-locations', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('accounts');
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
  try { return await new Promise((resolve, reject) => {
    const tx = db.transaction('accounts', handle ? 'readwrite' : 'readonly');
    const store = tx.objectStore('accounts');
    const req = handle ? store.put([{ id: 'vault', kind: 'collection', handle, parent: handle, name: handle.name }], accountId + ':vault-v1') : store.get(accountId + ':vault-v1');
    let result: FolderHandle | null = null;
    req.onsuccess = () => { result = handle ?? req.result?.[0]?.handle ?? null; };
    tx.oncomplete = () => resolve(result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  }); } finally { db.close(); }
}

export function needsFolderWindow() {
  try { return window.top?.location.origin !== window.location.origin; }
  catch { return true; }
}

export function isFolderAccessWindow() {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('folder-access') === '1';
}

export async function pickNativeFolder(): Promise<FolderHandle> {
  const picker = (window as unknown as { showDirectoryPicker?: (options: { mode: string; id: string }) => Promise<FolderHandle> }).showDirectoryPicker;
  if (!picker) throw new Error('This browser does not provide writable local folders. Open this same application in desktop Chrome or Edge.');
  return picker.call(window, { mode: 'readwrite', id: 'katchamak-library' });
}

let pending: Promise<FolderHandle> | null = null;
/** The top-level window grants access, then sends the actual handle back to Preview.
 * File System Access disallows pickers in cross-origin iframes, but permits using
 * an already-granted handle received from a same-origin window. No file copying. */
export function requestFolderWindow(accountId: string, current: FolderHandle | null, choose: boolean): Promise<FolderHandle> {
  if (pending) return pending;
  const requestId = crypto.randomUUID();
  const url = new URL(window.location.href);
  url.search = ''; url.hash = ''; url.searchParams.set('folder-access', '1'); url.searchParams.set('request', requestId);
  const child = window.open(url.href, 'katchamak-folder-' + requestId, 'popup,width=560,height=420');
  if (!child) return Promise.reject(new Error('Allow the folder connection window, then try again. Your library has not changed.'));
  pending = new Promise<FolderHandle>((resolve, reject) => {
    const done = (error?: Error, handle?: FolderHandle) => {
      window.removeEventListener('message', receive); clearInterval(closed); clearTimeout(timeout);
      if (error) { child.close(); reject(error); } else resolve(handle!);
    };
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== child) return;
      const data = event.data;
      if (!data || data.type !== FOLDER_ACCESS || data.requestId !== requestId) return;
      if (data.action === 'ready') child.postMessage({ type: FOLDER_ACCESS, requestId, action: 'connect', accountId, current, choose }, url.origin);
      if (data.action === 'selected') {
        if (data.accountId !== accountId || data.handle?.kind !== 'directory' || typeof data.handle.queryPermission !== 'function') { done(new Error('The folder connection belongs to a different account.')); return; }
        child.postMessage({ type: FOLDER_ACCESS, requestId, action: 'accepted' }, url.origin);
        done(undefined, data.handle);
      }
      if (data.action === 'cancel') done(new DOMException('Folder selection cancelled', 'AbortError'));
      if (data.action === 'error') done(new Error(data.error || 'The folder connection failed.'));
    };
    window.addEventListener('message', receive);
    const closed = setInterval(() => { if (child.closed) done(new DOMException('Folder connection window closed', 'AbortError')); }, 500);
    const timeout = setTimeout(() => done(new Error('The folder window could not connect to Preview. This host may open links in a separate browser. Open the application directly to use your local library.')), 120000);
  }).finally(() => { pending = null; });
  return pending;
}

/** Must be called directly from the click handler, before any network/IDB awaits. */
export async function requestFolder(accountId: string, current: FolderHandle | null = null, choose = true): Promise<FolderHandle> {
  if (needsFolderWindow()) return requestFolderWindow(accountId, current, choose);
  try {
    if (!choose && current) {
      if (await current.queryPermission({ mode: 'readwrite' }) === 'granted' || await current.requestPermission({ mode: 'readwrite' }) === 'granted') return current;
      throw new Error('Folder access was not allowed. Your unsaved changes remain open.');
    }
    return await pickNativeFolder();
  } catch (error) {
    if (['SecurityError', 'NotAllowedError'].includes((error as Error).name)) return requestFolderWindow(accountId, current, choose);
    throw error;
  }
}
