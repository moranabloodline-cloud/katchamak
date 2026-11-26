import type { PersistStorage, StorageValue } from 'zustand/middleware';

export const isWebSession = () => typeof window !== 'undefined' && !('__TAURI_INTERNALS__' in window);

/** Account storage owns persistence. Retain the session state without copying its manuscript and images into JSON. */
export function createSessionStorage<State>(): PersistStorage<State> {
  const memory = new Map<string, StorageValue<State>>();
  return {
    getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => { memory.set(key, value); },
    removeItem: key => { memory.delete(key); },
  };
}
let saved = () => false;
let flush: () => Promise<void> = async () => { throw new Error('Open your account library first.'); };
export const registerFolderStorage = (check: () => boolean, save: () => Promise<void>) => { saved = check; flush = save; };
export const folderSaved = () => saved();
export const saveFolder = () => flush();
