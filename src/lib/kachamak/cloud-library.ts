'use client';
import { readWorkspaceRoute, writeWorkspaceRoute } from './workspace-route';
import { create } from 'zustand';
import { useKachamak, isUsableBackup, normalizeNovelSections } from './store';
import { useCollections, type Collection } from './collections-store';
import { findNode, findNodeInNovel } from './utils';
import { useLibraryPreferences } from './library-preferences';
import { newNovel } from './seed';
import type { Novel, ViewMode, TabKey } from './types';
import { registerFolderStorage } from './session-storage';
import { useAppearancePreferences } from './appearance-preferences';
import { useAccountPreferences } from './account-preferences';

type Navigation = Pick<ReturnType<typeof useKachamak.getState>, 'activeNovelId' | 'activeTab' | 'selectedNodeId' | 'paneAId' | 'paneBId' | 'activePane'>;
type Snapshot = { novels: Novel[]; collections: Collection[]; view?: ViewMode; navigation?: Navigation; location?: { selectedCollection: string | null; expanded: string[] } };
export const useWebLibrary = create<{ email: string; ready: boolean; busy: boolean; pending: boolean; error: string | null; conflict: boolean }>(() => ({ email: '', ready: false, busy: false, pending: false, error: null, conflict: false }));
let revision = 0, saved = '', applying = false, subscribed = false;
let initializing: Promise<void> | null = null, running: Promise<void> | null = null, refreshing: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const snapshot = () => {
  const { novels, view, activeNovelId, activeTab, selectedNodeId, paneAId, paneBId, activePane } = useKachamak.getState();
  const {selectedCollection, expanded} = useLibraryPreferences.getState();
  return JSON.stringify({novels, collections: useCollections.getState().collections, view, navigation: {activeNovelId, activeTab, selectedNodeId, paneAId, paneBId, activePane}, location: {selectedCollection, expanded}});
};
const fail = (error: unknown) => useWebLibrary.setState({ busy: false, pending: snapshot() !== saved, error: error instanceof Error ? error.message : String(error) });
async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { if (response.status === 409) useWebLibrary.setState({ conflict: true }); throw new Error(data.error || 'Cloud storage could not be reached. Retry saving.'); }
  return data;
}
function apply(data: { revision: number; snapshot: Snapshot }) {
  if (!data.snapshot?.novels?.every(isUsableBackup) || !Array.isArray(data.snapshot.collections)) throw new Error('The saved library could not be read.');
  data.snapshot.novels.forEach(normalizeNovelSections);
  const active = useKachamak.getState().activeNovelId;
  const route = !useWebLibrary.getState().ready ? readWorkspaceRoute() : null;
  const preferredView = route?.view ?? data.snapshot.view;
  const restoredView = !useWebLibrary.getState().ready && ['write','split','corkboard','list','timeline'].includes(preferredView ?? '') ? { view: preferredView! } : {};
  const navigation: Partial<Navigation> = {};
  if (!useWebLibrary.getState().ready && (route || data.snapshot.navigation)) {
    const saved = route?.navigation ?? data.snapshot.navigation!;
    const novel = data.snapshot.novels.find(n => n.id === saved.activeNovelId);
    const note = (id: string | null) => novel && typeof id === 'string' && Object.values(novel.sections).some(nodes => findNode(nodes, id)) ? id : null;
    navigation.activeNovelId = novel?.id ?? null;
    navigation.activeTab = ['binder','codex','planning','research','templates','prompts','trash'].includes(saved.activeTab) ? saved.activeTab as TabKey : novel && saved.activeTab.startsWith('note:') && findNodeInNovel(novel,saved.activeTab.slice(5)) ? saved.activeTab as TabKey : 'binder';
    navigation.selectedNodeId = note(saved.selectedNodeId);
    navigation.paneAId = note(saved.paneAId); navigation.paneBId = note(saved.paneBId);
    navigation.activePane = saved.activePane === 'b' ? 'b' : 'a';
  }
  if (!useWebLibrary.getState().ready && data.snapshot.location) {
    const location = data.snapshot.location;
    const exists = (id: string) => data.snapshot.collections.some(c => c.id === id);
    useLibraryPreferences.setState({selectedCollection: location.selectedCollection && exists(location.selectedCollection) ? location.selectedCollection : null, expanded: Array.isArray(location.expanded) ? location.expanded.filter(exists) : []});
  }
  applying = true;
  try { useKachamak.setState({ ...restoredView, novels: data.snapshot.novels, activeNovelId: data.snapshot.novels.some(n => n.id === active) ? active : null, ...navigation }); useCollections.setState({ collections: data.snapshot.collections }); }
  finally { applying = false; }
  revision = data.revision; saved = snapshot();
  useWebLibrary.setState({ ready: true, busy: false, pending: false, error: null, conflict: false });
}
export async function initializeWebLibrary() {
  if (initializing) return initializing;
  if (useWebLibrary.getState().ready) return;
  initializing = (async () => {
    useWebLibrary.setState({ busy: true, error: null });
    const account = await api('/api/account');
    useWebLibrary.setState({ email: account.email });
    useAccountPreferences.setState({displayName: account.displayName, photo: account.avatar || null});
    useAppearancePreferences.setState({theme: account.preferences?.lightTheme?'light':'dark',interfaceSize:account.preferences?.smallInterface?'small':account.preferences?.largeInterface?'large':'normal'});
    useKachamak.setState({ defaultAuthor: account.displayName || '' });
    apply(await api('/api/library'));
    writeWorkspaceRoute();
    if (!subscribed) {
      subscribed = true;
      const changed = () => {
        if (applying || !useWebLibrary.getState().ready) return;
        writeWorkspaceRoute();
        if (snapshot() === saved) return;
        useWebLibrary.setState({ pending: true });
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { timer = null; if (!useWebLibrary.getState().conflict) void flushWebLibrary().catch(() => {}); }, 600);
      };
      useKachamak.subscribe(changed); useCollections.subscribe(changed); useLibraryPreferences.subscribe(changed);
    }
  })().catch(error => { fail(error); throw error; }).finally(() => { initializing = null; });
  return initializing;
}
export async function flushWebLibrary() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (running) return running;
  running = (async () => {
    if (!useWebLibrary.getState().ready) throw new Error('Open your account library before saving.');
    if (useWebLibrary.getState().conflict) throw new Error('Another window saved newer changes. Export your unsaved edits before reloading.');
    // A refresh begun before typing must finish before the revision is used for saving.
    if (refreshing) await refreshing;
    while (snapshot() !== saved) {
      const value = snapshot();
      useWebLibrary.setState({ busy: true, pending: true });
      const data = await api('/api/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision, snapshot: JSON.parse(value) }) });
      revision = data.revision; saved = value;
    }
    useWebLibrary.setState({ busy: false, pending: false, error: null });
  })().catch(error => { fail(error); throw error; }).finally(() => { running = null; });
  return running;
}
export const saveWebLibrary = flushWebLibrary;
export async function refreshWebLibrary() {
  if (refreshing) return refreshing;
  if (!useWebLibrary.getState().ready || running || useWebLibrary.getState().pending || useWebLibrary.getState().error) return;
  const before = snapshot();
  refreshing = (async () => {
    const data = await api('/api/library');
    if (snapshot() === before && !useWebLibrary.getState().pending && data.revision !== revision) apply(data);
  })().finally(() => { refreshing = null; });
  return refreshing;
}
export async function reloadWebLibrary(discard = false) {
  if (running) await running;
  if (snapshot() !== saved && !discard) throw new Error('Save or export your unsaved edits before reloading.');
  apply(await api('/api/library'));
}
export async function createWebCollection(name: string, parentId: string | null) {
  const id = useCollections.getState().addCollection(name, parentId); await flushWebLibrary(); return id;
}
export async function createWebProject(title: string, author: string, collectionId: string | null) {
  const novel = newNovel(title, author); addNovel(novel, collectionId); await flushWebLibrary(); return novel.id;
}
function addNovel(novel: Novel, collectionId: string | null) {
  useKachamak.setState(s => ({ novels: [...s.novels, novel], activeNovelId: novel.id, activeTab: 'binder', selectedNodeId: null, paneAId: null, paneBId: null }));
  if (collectionId) useCollections.getState().setMembership(collectionId, novel.id, true);
}
export async function prepareWebImport(_collectionId: string | null) { await flushWebLibrary(); }
export async function importWebProject(json: string, collectionId: string | null) {
  const input = JSON.parse(json), value = input?.format === 'katchamak-project' ? input.novel : input;
  if (!isUsableBackup(value)) throw new Error('Not a Katchamak project.');
  normalizeNovelSections(value); addNovel({ ...value, id: crypto.randomUUID() }, collectionId); await flushWebLibrary();
}
function filesPath() { const id = useKachamak.getState().activeNovelId; if (!id) throw new Error('Open a project first.'); return '/api/library/files/' + encodeURIComponent(id); }
export async function projectAttachments(): Promise<{ id: string; name: string; size: number }[]> { return (await api(filesPath())).files; }
export async function addProjectAttachment(file: File) { await flushWebLibrary(); const data = new FormData(); data.set('file', file); await api(filesPath(), { method: 'POST', body: data }); }
export function attachmentUrl(id: string) { return filesPath() + '/' + encodeURIComponent(id); }
registerFolderStorage(() => useWebLibrary.getState().ready && !useWebLibrary.getState().error && !useWebLibrary.getState().pending && snapshot() === saved, flushWebLibrary);
