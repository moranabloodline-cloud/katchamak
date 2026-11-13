import type { StateStorage } from 'zustand/middleware';
const memory = new Map<string, string>();
export const isWebSession = () => typeof window !== 'undefined' && !('__TAURI_INTERNALS__' in window);
/** Project content is loaded from the authenticated cloud library. */
export const projectStorage: StateStorage = {
  getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => { memory.set(key, value); },
  removeItem: key => { memory.delete(key); },
};
let saved = () => false;
let flush: () => Promise<void> = async () => { throw new Error('Open your account library first.'); };
export const registerFolderStorage = (check: () => boolean, save: () => Promise<void>) => { saved = check; flush = save; };
export const folderSaved = () => saved();
export const saveFolder = () => flush();
