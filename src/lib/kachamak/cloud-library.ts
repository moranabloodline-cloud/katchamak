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
import {DEFAULT_EDITOR_APPEARANCE,validEditorAppearance,type EditorAppearance} from './page-format';
import { requestJson } from './request-json';

type Navigation = Pick<ReturnType<typeof useKachamak.getState>, 'activeNovelId' | 'activeTab' | 'selectedNodeId' | 'paneAId' | 'paneBId' | 'activePane'>;
type Snapshot = { novels: Novel[]; collections: Collection[]; editorAppearance?:EditorAppearance; view?: ViewMode; navigation?: Navigation; location?: { selectedCollection: string | null; expanded: string[] } };
export const useWebLibrary = create<{ email: string; ready: boolean; busy: boolean; pending: boolean; error: string | null; conflict: boolean }>(() => ({ email: '', ready: false, busy: false, pending: false, error: null, conflict: false }));
let revision = 0, saved = '', applying = false, subscribed = false;
let initializing: Promise<void> | null = null, running: Promise<void> | null = null, refreshing: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let accountId='';
let refreshController: AbortController | null = null;
let snapshotDirty=true,cachedSnapshot='';
// Serialize at save/verification boundaries, not for each keystroke or panel resize.
const snapshot = () => {
  if(subscribed&&!snapshotDirty)return cachedSnapshot;
  const { novels, view, activeNovelId, activeTab, selectedNodeId, paneAId, paneBId, activePane } = useKachamak.getState();
  const {selectedCollection, expanded} = useLibraryPreferences.getState();
  const {editorFont:font,editorSize:size,editorSpacing:spacing,pageFormat:page,editorSpellCheck:spellCheck}=useKachamak.getState();
  cachedSnapshot=JSON.stringify({novels, collections: useCollections.getState().collections, editorAppearance:{font,size,spacing,page,spellCheck}, view, navigation: {activeNovelId, activeTab, selectedNodeId, paneAId, paneBId, activePane}, location: {selectedCollection, expanded}});
  snapshotDirty=false;
  return cachedSnapshot;
};
const fail = (error: unknown) => useWebLibrary.setState({ busy: false, pending: snapshot() !== saved, error: error instanceof Error ? error.message : String(error) });
class LibraryConflictError extends Error {}
async function api(path: string, init?: RequestInit) {
  const headers=new Headers(init?.headers);
  if(path.startsWith('/api/library')&&accountId)headers.set('X-Katchamak-Account',accountId);
  const { response, data } = await requestJson(path, { ...init, headers }, path.includes('/demo/') || init?.body instanceof FormData ? 60000 : 30000);
  if(data.accountChanged)useWebLibrary.setState({ready:false,busy:false,error:data.error});
  if (!response.ok) {
    const message=data.error || 'Cloud storage could not be reached. Retry saving.';
    if(response.status===409&&data.conflict===true)throw new LibraryConflictError(message);
    throw new Error(message);
  }
  return data;
}
function apply(data: { revision: number; snapshot: Snapshot },keepAppearance=false) {
  if (!Number.isSafeInteger(data.revision) || data.revision < 0 || !Array.isArray(data.snapshot?.novels) || !data.snapshot.novels.every(isUsableBackup) || !Array.isArray(data.snapshot.collections)) throw new Error('The saved library could not be read.');
  data.snapshot.novels.forEach(normalizeNovelSections);
  const active = useKachamak.getState().activeNovelId;
  const route = !useWebLibrary.getState().ready ? readWorkspaceRoute() : null;
  const preferredView = route?.view ?? data.snapshot.view;
  const restoredView = !useWebLibrary.getState().ready && ['write','split','corkboard','list','continuous','timeline'].includes(preferredView ?? '') ? { view: preferredView! } : {};
  if(data.snapshot.editorAppearance!==undefined&&!validEditorAppearance(data.snapshot.editorAppearance))throw new Error('The saved page format could not be read.');
  const appearance=data.snapshot.editorAppearance??DEFAULT_EDITOR_APPEARANCE;
  const restoredAppearance=keepAppearance?{}:{editorFont:appearance.font,editorSize:appearance.size,editorSpacing:appearance.spacing,pageFormat:{...appearance.page},editorSpellCheck:appearance.spellCheck??true};
  const navigation: Partial<Navigation> = {};
  if (!useWebLibrary.getState().ready && (route || data.snapshot.navigation)) {
    const saved = route?.navigation ?? data.snapshot.navigation!;
    const novel = data.snapshot.novels.find(n => n.id === saved.activeNovelId);
    const note = (id: string | null) => novel && typeof id === 'string' && Object.values(novel.sections).some(nodes => findNode(nodes, id)) ? id : null;
    navigation.activeNovelId = novel?.id ?? null;
    navigation.activeTab = ['binder','codex','planning','research','templates','prompts','timeline','trash'].includes(saved.activeTab) ? saved.activeTab as TabKey : novel && typeof saved.activeTab === 'string' && saved.activeTab.startsWith('note:') && findNodeInNovel(novel,saved.activeTab.slice(5)) ? saved.activeTab as TabKey : 'binder';
    navigation.selectedNodeId = note(saved.selectedNodeId);
    if(preferredView==='timeline'&&(!navigation.selectedNodeId||novel&&findNodeInNovel(novel,navigation.selectedNodeId)?.section==='timeline')&&navigation.activeTab!=='trash')navigation.activeTab='timeline';
    navigation.paneAId = note(saved.paneAId); navigation.paneBId = note(saved.paneBId);
    navigation.activePane = saved.activePane === 'b' ? 'b' : 'a';
  }
  if (!useWebLibrary.getState().ready && data.snapshot.location) {
    const location = data.snapshot.location;
    const exists = (id: string) => data.snapshot.collections.some(c => c.id === id);
    useLibraryPreferences.setState({selectedCollection: location.selectedCollection && exists(location.selectedCollection) ? location.selectedCollection : null, expanded: Array.isArray(location.expanded) ? location.expanded.filter(exists) : []});
  }
  applying = true;
  try { useKachamak.setState({ ...restoredView,...restoredAppearance, novels: data.snapshot.novels, activeNovelId: data.snapshot.novels.some(n => n.id === active) ? active : null, ...navigation }); useCollections.setState({ collections: data.snapshot.collections }); }
  finally { applying = false; }
  snapshotDirty=true;
  revision = data.revision; saved = snapshot();
  if(keepAppearance){const acknowledged=JSON.parse(saved);acknowledged.editorAppearance=appearance;saved=JSON.stringify(acknowledged);}
  useWebLibrary.setState({ ready: true, busy: false, pending: snapshot()!==saved, error: null, conflict: false });
}
export async function initializeWebLibrary() {
  if (initializing) return initializing;
  if (useWebLibrary.getState().ready) return;
  initializing = (async () => {
    useWebLibrary.setState({ busy: true, error: null });
    const account = await api('/api/account');
    if(typeof account.id!=='string'||!account.id||typeof account.email!=='string')throw new Error('The signed-in account could not be read. Please retry.');
    if(accountId&&accountId!==account.id&&snapshot()!==saved)throw new Error('Sign back in to '+useWebLibrary.getState().email+' to save the changes left open in this window.');
    let resumePending = false;
    if (subscribed && accountId === account.id && useWebLibrary.getState().pending && snapshot() !== saved) {
      const current = JSON.parse(snapshot()) as Snapshot, base = JSON.parse(saved) as Snapshot;
      // Navigation alone is restored through the workspace URL as before.
      resumePending = JSON.stringify([current.novels,current.collections,current.editorAppearance]) !== JSON.stringify([base.novels,base.collections,base.editorAppearance]);
    }
    accountId=account.id;
    useWebLibrary.setState({ email: account.email });
    useAccountPreferences.setState({displayName: account.displayName, photo: account.avatar || null});
    useAppearancePreferences.setState({theme: account.preferences?.lightTheme?'light':'dark',interfaceSize:account.preferences?.smallInterface?'small':account.preferences?.largeInterface?'large':'normal'});
    useKachamak.setState({ defaultAuthor: account.displayName || '' });
    // Reauthenticating the same window must not replace its pending prose with the last cloud copy.
    if (resumePending) {
      useWebLibrary.setState({ready:true,busy:false});
      await flushWebLibrary();
      return;
    }
    apply(await api('/api/library/demo/install',{method:'POST'}));
    writeWorkspaceRoute();
    if (!subscribed) {
      subscribed = true;
      const changed = () => {
        snapshotDirty=true;
        if (applying || !useWebLibrary.getState().ready) return;
        writeWorkspaceRoute();
        useWebLibrary.setState({ pending: true });
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { timer = null; if (!useWebLibrary.getState().conflict) void flushWebLibrary().catch(() => {}); }, 600);
      };
      const fields=['novels','view','activeNovelId','activeTab','selectedNodeId','paneAId','paneBId','activePane','editorFont','editorSize','editorSpacing','pageFormat','editorSpellCheck'] as const;
      useKachamak.subscribe((state,before)=>{if(fields.some(field=>state[field]!==before[field]))changed();});
      useCollections.subscribe((state,before)=>{if(state.collections!==before.collections)changed();});
      useLibraryPreferences.subscribe((state,before)=>{if(state.selectedCollection!==before.selectedCollection||state.expanded!==before.expanded)changed();});
    }
  })().catch(error => { fail(error); throw error; }).finally(() => { initializing = null; });
  return initializing;
}
export async function flushWebLibrary() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (running) return running;
  running = (async () => {
    if (!useWebLibrary.getState().ready) throw new Error('Open your account library before saving.');
    // Saving takes priority over a background read. CAS still checks the latest server revision.
    if (refreshing) { refreshController?.abort(); await refreshing.catch(() => {}); }
    if (!useWebLibrary.getState().ready) throw new Error('Open your account library before saving.');
    let retries=0;
    if(useWebLibrary.getState().conflict)await reconcileRevision();
    while (true) {
      const value = snapshot();
      if(value===saved)break;
      useWebLibrary.setState({ busy: true, pending: true });
      let data;
      try{data=await api('/api/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: `{"revision":${revision},"snapshot":${value}}` });}
      catch(error){
        if(!(error instanceof LibraryConflictError))throw error;
        if(retries++>=2){useWebLibrary.setState({conflict:true});throw error;}
        await reconcileRevision();continue;
      }
      if(!Number.isSafeInteger(data.revision)||data.revision!==revision+1)throw new Error('The server did not confirm this save. Your edits are kept in this window. Retry saving.');
      revision = data.revision; saved = value;
    }
    useWebLibrary.setState({ busy: false, pending: false, error: null });
  })().catch(error => { fail(error); throw error; }).finally(() => { running = null; });
  return running;
}
export const saveWebLibrary = flushWebLibrary;
// Navigation is window-local during reconciliation. Never overwrite competing
// manuscript/collection edits; only retry when one content version is unchanged.
async function reconcileRevision(){
  const remote=await api('/api/library');
  if(!Array.isArray(remote.snapshot?.novels)||!remote.snapshot.novels.every(isUsableBackup)||!Array.isArray(remote.snapshot.collections)||!Number.isSafeInteger(remote.revision))throw new Error('The saved library could not be read.');
  const local=JSON.parse(snapshot()) as Snapshot,base=JSON.parse(saved) as Snapshot;
  if(remote.snapshot.editorAppearance!==undefined&&!validEditorAppearance(remote.snapshot.editorAppearance))throw new Error('The saved page format could not be read.');
  const keepAppearance=JSON.stringify(local.editorAppearance??DEFAULT_EDITOR_APPEARANCE)!==JSON.stringify(base.editorAppearance??DEFAULT_EDITOR_APPEARANCE);
  const content=(value:Snapshot)=>JSON.stringify([value.novels,value.collections]);
  const localContent=content(local),remoteContent=content(remote.snapshot),baseContent=content(base);
  if(localContent===remoteContent||localContent===baseContent){apply(remote,keepAppearance);return;}
  if(remoteContent!==baseContent){
    useWebLibrary.setState({conflict:true});
    throw new LibraryConflictError('Another window changed project content too. Your unsaved edits are kept in this window. Export backups before reloading.');
  }
  revision=remote.revision;saved=JSON.stringify(remote.snapshot);
  if(!keepAppearance){const appearance=remote.snapshot.editorAppearance??DEFAULT_EDITOR_APPEARANCE;applying=true;try{useKachamak.setState({editorFont:appearance.font,editorSize:appearance.size,editorSpacing:appearance.spacing,pageFormat:{...appearance.page},editorSpellCheck:appearance.spellCheck??true});}finally{applying=false;}snapshotDirty=true;}
  useWebLibrary.setState({conflict:false,error:null});
}
export async function refreshWebLibrary() {
  if (refreshing) return refreshing;
  if (!useWebLibrary.getState().ready || running || useWebLibrary.getState().pending || useWebLibrary.getState().error) return;
  const before = snapshot();
  const controller = new AbortController(); refreshController = controller;
  refreshing = (async () => {
    const data = await api('/api/library?revision='+revision, { signal: controller.signal });
    if(!Number.isSafeInteger(data.revision)||data.revision<0)throw new Error('The saved library could not be read.');
    if(data.unchanged===true){if(data.revision!==revision)throw new Error('The saved library revision could not be verified.');return;}
    if (snapshot() === before && !useWebLibrary.getState().pending && data.revision !== revision) apply(data);
  })().finally(() => { refreshing = null; refreshController = null; });
  return refreshing;
}
export async function reloadWebLibrary(discard = false) {
  if (running) await running;
  if (snapshot() !== saved && !discard) throw new Error('Save or export your unsaved edits before reloading.');
  const before = snapshot(), data = await api('/api/library');
  // Discard applies only to edits present at the click, never to text typed while waiting.
  if (snapshot() !== before || data.revision < revision) throw new Error('The library changed while reloading. Your current edits were kept. Save them before retrying.');
  apply(data);
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
  // Match the established store.importNovel defaults for older JSON backups.
  const novel: Novel = { ...value, id: crypto.randomUUID(), author: value.author ?? '', trash: value.trash ?? [], statuses: value.statuses ?? [], labels: value.labels ?? [] };
  normalizeNovelSections(novel); addNovel(novel, collectionId); await flushWebLibrary();
}
function filesPath() { const id = useKachamak.getState().activeNovelId; if (!id) throw new Error('Open a project first.'); return '/api/library/files/' + encodeURIComponent(id); }
export async function projectAttachments(): Promise<{ id: string; name: string; size: number }[]> { return (await api(filesPath())).files; }
export async function addProjectAttachment(file: File) { await flushWebLibrary(); const data = new FormData(); data.set('file', file); await api(filesPath(), { method: 'POST', body: data }); }
export function attachmentUrl(id: string) { return filesPath() + '/' + encodeURIComponent(id); }
registerFolderStorage(() => useWebLibrary.getState().ready && !useWebLibrary.getState().error && !useWebLibrary.getState().pending && snapshot() === saved, flushWebLibrary);

export async function removeWebProject(id:string) {
  await flushWebLibrary();
  const state=useKachamak.getState(),novel=state.novels.find(n=>n.id===id);if(!novel)throw new Error('Project not found.');
  const backup=structuredClone(novel),memberships=useCollections.getState().collections.filter(c=>c.projectIds.includes(id)).map(c=>c.id);
  const navigation={activeNovelId:state.activeNovelId,activeTab:state.activeTab,selectedNodeId:state.selectedNodeId,paneAId:state.paneAId,paneBId:state.paneBId,activePane:state.activePane};
  state.deleteNovel(id);memberships.forEach(collectionId=>useCollections.getState().setMembership(collectionId,id,false));
  try{await flushWebLibrary();}catch(error){
    useKachamak.setState(s=>({novels:s.novels.some(n=>n.id===id)?s.novels:[...s.novels,backup],...(!s.activeNovelId&&navigation.activeNovelId===id?navigation:{})}));
    useCollections.setState(s=>({collections:s.collections.map(c=>memberships.includes(c.id)?{...c,projectIds:[...new Set([...c.projectIds,id])]}:c)}));
    throw error;
  }
}

export async function publishMorriganDemo(projectId:string) {
  await saveWebLibrary();
  const result=await api('/api/library/demo/publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId})});
  await saveWebLibrary();
  const before=snapshot(),data=await api('/api/library/demo/install',{method:'POST'});
  if(snapshot()===before)apply(data);
  return result as {title:string;chapterCount:number;version:number};
}
