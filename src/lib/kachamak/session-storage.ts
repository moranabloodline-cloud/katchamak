import type { StateStorage } from 'zustand/middleware';
const memory = new Map<string, string>();
export const isWebSession = () => typeof window !== 'undefined' && !('__TAURI_INTERNALS__' in window);
/** Web data is session-only. Desktop keeps its existing recovery cache. */
export const projectStorage: StateStorage = {
  getItem: key => isWebSession() || typeof localStorage === 'undefined' ? memory.get(key) ?? null : localStorage.getItem(key),
  setItem: (key, value) => { if (isWebSession() || typeof localStorage === 'undefined') memory.set(key, value); else localStorage.setItem(key, value); },
  removeItem: key => { if (isWebSession() || typeof localStorage === 'undefined') memory.delete(key); else localStorage.removeItem(key); },
};
let saved = () => false;
let flush: () => Promise<void> = async () => { throw new Error('Choose a library folder first.'); };
export const registerFolderStorage = (check: () => boolean, save: () => Promise<void>) => { saved = check; flush = save; };
export const folderSaved = () => saved();
export const saveFolder = () => flush();
