'use client';
import { create } from 'zustand';

// Plaintext, same-browser recovery only; this is not protection from profile access.
// A new writer ID for every window/load prevents one window overwriting another.
export type LocalDraft = { version: 1; owner: string; id: string; generation: string; updatedAt: number; revision: number; snapshot: string };
export type DraftSummary = Pick<LocalDraft, 'id' | 'generation' | 'updatedAt'>;
export const useLocalRecovery = create<{ owner: string | null; drafts: DraftSummary[]; error: string | null; writing: boolean }>(() => ({ owner: null, drafts: [], error: null, writing: false }));
const database = 'kachamak-local-recovery-v1';
let connection: Promise<IDBDatabase> | null = null;
function open() {
  if (!connection) connection = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('Browser storage is not available.')); return; }
    let expired = false;
    const timeout = setTimeout(() => { expired = true; reject(new Error('Local recovery storage did not respond.')); }, 3000);
    const request = indexedDB.open(database, 1);
    request.onupgradeneeded = () => { const store = request.result.createObjectStore('drafts', { keyPath: ['owner', 'id'] }); store.createIndex('owner', 'owner'); };
    request.onerror = () => { clearTimeout(timeout); reject(request.error); };
    request.onblocked = () => { expired = true; clearTimeout(timeout); reject(new Error('Local recovery storage is blocked.')); };
    request.onsuccess = () => { clearTimeout(timeout); const db = request.result; if (expired) { db.close(); return; } db.onversionchange = () => { db.close(); connection = null; }; resolve(db); };
  }).catch(error => { connection = null; throw error; });
  return connection;
}
async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore, result: (value: T) => void) => void): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction('drafts', mode); let value: T;
    const timeout = setTimeout(() => { tx.abort(); reject(new Error('Local recovery storage did not respond.')); }, 5000);
    tx.oncomplete = () => { clearTimeout(timeout); resolve(value); }; // request success is not a durable commit
    tx.onabort = () => { clearTimeout(timeout); reject(tx.error ?? new Error('Local recovery write was interrupted.')); };
    tx.onerror = () => { clearTimeout(timeout); reject(tx.error ?? new Error('Local recovery storage failed.')); };
    try { action(tx.objectStore('drafts'), result => { value = result; }); }
    catch (error) { clearTimeout(timeout); tx.abort(); reject(error); }
  });
}
// Low-level storage accepts an owner; only the authenticated cloud controller
// exposes reads/actions to the UI, and rechecks identity before each action.
export const draftStorage = {
  put(draft: LocalDraft) { return transaction<void>('readwrite', store => { store.put(draft); }); },
  list(owner: string) { return transaction<LocalDraft[]>('readonly', (store, done) => { const r = store.index('owner').getAll(owner); r.onsuccess = () => done(r.result); }); },
  get(owner: string, id: string) { return transaction<LocalDraft | undefined>('readonly', (store, done) => { const r = store.get([owner, id]); r.onsuccess = () => done(r.result); }); },
  remove(owner: string, id: string, generation: string) {
    return transaction<boolean>('readwrite', (store, done) => {
      const r = store.get([owner, id]); r.onsuccess = () => {
        if (r.result?.generation !== generation) { done(false); return; }
        store.delete([owner, id]); done(true);
      };
    });
  },
};
export function lockLocalRecovery() { useLocalRecovery.setState({ owner: null, drafts: [], error: null, writing: false }); }
export function recoveryStorageError(error: unknown) {
  useLocalRecovery.setState({ writing: false, error: 'Local recovery is unavailable. Keep this window open and save or export your work. ' + (error instanceof Error ? error.message : '') });
}
