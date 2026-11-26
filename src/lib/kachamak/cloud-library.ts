'use client';
import { migrateBookArtwork, migrateLibraryArtwork } from './migrate-gallery-images';
import { readWorkspaceRoute, writeWorkspaceRoute } from './workspace-route';
import {HOME_ROOT, homepageEntry} from './homepage';
import { create } from 'zustand';
import { useKachamak, isUsableBackup, normalizeNovelSections, exportNovelJson } from './store';
import { validCloudLibrary } from './cloud-write-validation.mjs';
import { useCollections, type Collection } from './collections-store';
import { findNode, findNodeInNovel } from './utils';
import { useLibraryPreferences } from './library-preferences';
import { newNovel } from './seed';
import type { Novel, ViewMode, TabKey } from './types';
import { isWebSession, registerFolderStorage } from './session-storage';
import { useAppearancePreferences } from './appearance-preferences';
import { useAccountPreferences } from './account-preferences';
import {DEFAULT_EDITOR_APPEARANCE,validEditorAppearance,type EditorAppearance} from './page-format';
import { requestJson, RequestTimeoutError, InvalidResponseError } from './request-json';
import { draftStorage, lockLocalRecovery, recoveryStorageError, useLocalRecovery, type LocalDraft, type DraftSummary } from './local-recovery';
import {runWorkspaceAction,setHistoryOwner,historyStoreChanged,flushBookHistories,discardBookHistory} from './workspace-history';
import { cloneWorkspaceTab } from './clone-workspace-tab';
import { cloneLayout, withExistingTexts } from './clone-text-recovery';

type Navigation = Pick<ReturnType<typeof useKachamak.getState>, 'activeNovelId' | 'activeTab' | 'selectedNodeId' | 'paneAId' | 'paneBId' | 'activePane'> & {activeHomePageId?: string};
type LibraryLocation = { selectedCollection: string | null; expanded: string[] };
type LibraryContent = { novels: Novel[]; collections: Collection[]; editorAppearance?: EditorAppearance };
type Snapshot = LibraryContent & { view?: ViewMode; navigation?: Navigation; location?: LibraryLocation };
export const useWebLibrary = create<{ email: string; ready: boolean; busy: boolean; pending: boolean; retrying: boolean; error: string | null; conflict: boolean }>(() => ({ email: '', ready: false, busy: false, pending: false, retrying: false, error: null, conflict: false }));
let revision = 0, saved = '', applying = false, subscribed = false;
let initializing: Promise<void> | null = null, running: Promise<void> | null = null, refreshing: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let saveRetry: ReturnType<typeof setTimeout> | null = null;
let retryDelay = 1000;
let unconfirmedWrite: { payload: string; value: string; draft: LocalDraft | null } | null = null;
let accountId='';
let gzipLibrarySave = false;
let accountEpoch = 0, writerId = crypto.randomUUID();
let activeDraft: LocalDraft | null = null, localTimer: ReturnType<typeof setTimeout> | null = null;
let localWrites: Promise<void> = Promise.resolve();
let refreshController: AbortController | null = null;
let snapshotDirty=true,cachedSnapshot='';
const serializeLibrary = ({novels,collections,editorAppearance}: LibraryContent) =>
  JSON.stringify({novels,collections,editorAppearance});
// Only content and account-wide editor appearance participate in cloud dirty checks.
const snapshot = () => {
  if(subscribed&&!snapshotDirty)return cachedSnapshot;
  const {novels,editorFont:font,editorSize:size,editorSpacing:spacing,pageFormat:page,editorSpellCheck:spellCheck}=useKachamak.getState();
  cachedSnapshot=serializeLibrary({novels,collections:useCollections.getState().collections,editorAppearance:{font,size,spacing,page,spellCheck}});
  snapshotDirty=false;
  return cachedSnapshot;
};
function libraryLocation(): LibraryLocation {
  const {selectedCollection,expanded}=useLibraryPreferences.getState();
  return {selectedCollection,expanded};
}
function locationStorageKey() { return 'kachamak-library-location:' + accountId; }
function rememberLibraryLocation() {
  try { window.sessionStorage.setItem(locationStorageKey(),JSON.stringify(libraryLocation())); }
  catch { /* Navigation stays usable when browser storage is blocked. */ }
}
function rememberedLibraryLocation(): LibraryLocation | undefined {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(locationStorageKey()) ?? 'null');
    if (value && Array.isArray(value.expanded)) return value;
  } catch { /* Older cloud locations remain the fallback. */ }
}
function snapshotWithNavigation(value: string) {
  const {view,activeNovelId,activeTab,selectedNodeId,paneAId,paneBId,activePane,activeHomePageId} = useKachamak.getState();
  const navigation = {activeNovelId,activeTab,selectedNodeId,paneAId,paneBId,activePane,
    ...(view==='homepage' && activeHomePageId!==HOME_ROOT ? {activeHomePageId} : {})};
  // Add the latest navigation to a real save without re-encoding the manuscript.
  return value.slice(0,-1) + ',' + JSON.stringify({view,navigation,location:libraryLocation()}).slice(1);
}
// Check a whole upload before changing the book, including the other books in its cloud save.
export function checkGalleryUploadSize(entries:import('./gallery').GalleryEntry[],replaced?:import('./gallery').GalleryEntry) {
  if (!isWebSession()) return;
  const bytes = new Blob([snapshotWithNavigation(snapshot()),JSON.stringify(entries)]).size-(replaced?new Blob([JSON.stringify(replaced)]).size:0);
  if (bytes + 128 > 20 * 1024 * 1024) throw new Error('These images would exceed the 20 MB library save limit. Choose fewer or smaller images.');
}
const fail = (error: unknown) => useWebLibrary.setState({ busy: false, pending: snapshot() !== saved, error: error instanceof Error ? error.message : String(error) });

function clearSaveRetry() {
  if (saveRetry !== null) clearTimeout(saveRetry);
  saveRetry = null;
}

function scheduleSaveRetry() {
  if (timer !== null) { clearTimeout(timer); timer = null; }
  const epoch = accountEpoch;
  saveRetry = setTimeout(() => {
    saveRetry = null;
    const state = useWebLibrary.getState();
    if (epoch === accountEpoch && state.ready && state.pending && !state.conflict) void flushWebLibrary().catch(() => {});
  }, retryDelay);
  retryDelay = Math.min(retryDelay * 2, 30000);
  useWebLibrary.setState({ retrying: true });
}
// Recovery protects project/collection data, not transient navigation or account preferences.
const projectPayload = (value: string) => { const data = JSON.parse(value); return JSON.stringify({ novels: data.novels, collections: data.collections }); };
let recoveryBase = '', recoveryBasePayload = '';
async function fingerprint(serialized: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
// Throttled independently of cloud debounce: continuous typing still checkpoints.
export function checkpointLocalDraft(clone?: { key: string; base: Novel }) {
  if (localTimer) { clearTimeout(localTimer); localTimer = null; }
  if (!accountId || !saved || !unconfirmedWrite && snapshot() === saved) return localWrites;
  if (recoveryBase !== saved) { recoveryBase = saved; recoveryBasePayload = projectPayload(saved); }
  const value = projectPayload(snapshot());
  if (!unconfirmedWrite && value === recoveryBasePayload) return localWrites;
  if (activeDraft?.snapshot === value) return localWrites;
  const draft: LocalDraft = { version: 1, owner: accountId, id: writerId, generation: crypto.randomUUID(), updatedAt: Date.now(), revision, snapshot: value };
  if (clone) draft.clone = { key: clone.key, destinationId: clone.base.id, baseHash: '' };
  activeDraft = draft;
  useLocalRecovery.setState({ writing: true });
  localWrites = localWrites.then(async () => {
    if (clone && draft.clone) {
      [draft.clone.baseHash, draft.clone.layoutHash] = await Promise.all([
        fingerprint(JSON.stringify(clone.base)), fingerprint(cloneLayout(clone.base)),
      ]);
    }
    await draftStorage.put(draft);
  }).then(() => {
    if (useLocalRecovery.getState().owner === draft.owner && activeDraft === draft) useLocalRecovery.setState({ writing: false, error: null });
  }).catch(error => { if (activeDraft === draft) activeDraft = null; if (useLocalRecovery.getState().owner === draft.owner) recoveryStorageError(error); });
  return localWrites;
}
function lockAccount() {
  setHistoryOwner(null);
  void checkpointLocalDraft();
  accountEpoch++;
  gzipLibrarySave = false;
  clearSaveRetry();
  retryDelay = 1000;
  unconfirmedWrite = null;
  if (timer) { clearTimeout(timer); timer = null; }
  lockLocalRecovery();
  useWebLibrary.setState({ ready: false, busy: false, retrying: false, email: '', error: 'Sign in again to access your library and local recovery drafts.' });
}
type ConfirmedLibrary = { revision: number; snapshot: Snapshot };
async function checkClone(draft: LocalDraft, source: Snapshot, remote: ConfirmedLibrary) {
  const { destinationId, baseHash, layoutHash } = draft.clone!;
  const copy = source.novels.find(n => n.id === destinationId);
  const book = remote.snapshot.novels.find(n => n.id === destinationId);
  if (!book || !copy || remote.revision < draft.revision) return {committed:false, copy:undefined};
  if (remote.revision === draft.revision) return {committed:false, copy};
  // Copies from concurrent windows share IDs but record their actual creation
  // times. Keep the timestamps and prose of the already committed batch.
  if (cloneLayout(book, false) === cloneLayout(copy, false)) return {committed:true, copy:undefined};
  if (layoutHash && await fingerprint(cloneLayout(book)) === layoutHash)
    return {committed:false, copy:withExistingTexts(copy, book)};
  // Earlier drafts have only the exact pre-clone fingerprint.
  return {committed:false, copy:await fingerprint(JSON.stringify(book)) === baseHash ? copy : undefined};
}
async function loadLocalDrafts(confirmed?: ConfirmedLibrary) {
  const owner = useLocalRecovery.getState().owner, epoch = accountEpoch;
  if (!owner || owner !== accountId) return;
  try {
    const drafts = (await draftStorage.list(owner)).filter(draft => draft.id !== writerId);
    const summaries: DraftSummary[] = [];
    for (const draft of drafts) {
      if (epoch !== accountEpoch || useLocalRecovery.getState().owner !== owner) return;
      const summary: DraftSummary = { id: draft.id, generation: draft.generation, updatedAt: draft.updatedAt };
      if (draft.clone) {
        summary.cloneKey = draft.clone.key;
        summary.retryClone = true;
        if (confirmed) {
          let source: Snapshot;
          try { source = readDraft(draft); }
          catch { summaries.push({...summary, retryClone:false}); continue; }
          const {committed, copy} = await checkClone(draft, source, confirmed);
          if (committed) {
            await draftStorage.remove(owner, draft.id, draft.generation);
            continue;
          }
          summary.retryClone = !!copy;
        }
      }
      summaries.push(summary);
    }
    if (epoch === accountEpoch && useLocalRecovery.getState().owner === owner) useLocalRecovery.setState({ drafts: summaries.sort((a,b) => b.updatedAt-a.updatedAt) });
  } catch (error) { if (epoch === accountEpoch && useLocalRecovery.getState().owner === owner) recoveryStorageError(error); }
}
export async function refreshLocalDrafts() {
  await verifyRecoveryOwner();
  const checkClones = useWebLibrary.getState().ready && useLocalRecovery.getState().drafts.some(d => d.retryClone !== undefined);
  await loadLocalDrafts(checkClones ? await api('/api/library') : undefined);
}
async function removeAcknowledgedDraft(draft: LocalDraft | null, value: string) {
  if (!draft || draft.snapshot !== projectPayload(value)) return;
  try {
    await localWrites;
    await draftStorage.remove(draft.owner, draft.id, draft.generation);
    // Another window may have already removed this confirmed generation.
    if (activeDraft?.generation === draft.generation) activeDraft = null;
  }
  catch (error) { if (useLocalRecovery.getState().owner === draft.owner) recoveryStorageError(error); }
}
class LibraryConflictError extends Error {}
class TemporaryCloudError extends Error {}
class UnsupportedLibraryEncodingError extends Error {}
const GZIP_LIBRARY_TYPE = 'application/vnd.katchamak.snapshot+gzip';
async function api(path: string, init?: RequestInit) {
  const epoch = accountEpoch;
  const headers=new Headers(init?.headers);
  if(path.startsWith('/api/library')&&accountId)headers.set('X-Katchamak-Account',accountId);
  const { response, data } = await requestJson(path, { ...init, headers }, path.includes('/demo/') || init?.body instanceof FormData ? 60000 : 30000).catch(error => {
    const invalidLibraryResponse = error instanceof InvalidResponseError && path.split('?')[0] === '/api/library';
    if (!init?.signal?.aborted && (error instanceof RequestTimeoutError || error instanceof TypeError || invalidLibraryResponse)) {
      throw new TemporaryCloudError(error.message);
    }
    throw error;
  });
  if (epoch !== accountEpoch) throw new Error('The account session changed. Please sign in again.');
  if(data.accountChanged || response.status === 401 || response.status === 403) {
    lockAccount();
    throw new Error(data.accountChanged ? 'Your signed-in account changed. Sign in again to access your library and local recovery drafts.' : 'Sign in again to access your library and local recovery drafts.');
  }
  if (!response.ok) {
    const message=data.error || 'Cloud storage could not be reached. Retry saving.';
    if(response.status===415&&headers.get('Content-Type')===GZIP_LIBRARY_TYPE)throw new UnsupportedLibraryEncodingError(message);
    if(response.status===409&&data.conflict===true)throw new LibraryConflictError(message);
    if(response.status===408||response.status===429||response.status>=500)throw new TemporaryCloudError(message);
    throw new Error(message);
  }
  return data;
}
async function writeLibrarySnapshot(value: string, baseRevision: number) {
  if (gzipLibrarySave && value.length >= 256 * 1024 && typeof CompressionStream !== 'undefined') {
    const owner = accountId, epoch = accountEpoch;
    const checkSession = () => {
      if (owner !== accountId || epoch !== accountEpoch || !useWebLibrary.getState().ready) {
        throw new Error('The account session changed. Please sign in again.');
      }
    };
    let body: Blob | undefined;
    try {
      const raw = new Blob([value]);
      const compressed = await new Response(raw.stream().pipeThrough(new CompressionStream('gzip'))).blob();
      if (compressed.size < raw.size) body = compressed;
    } catch {
      // Compression is optional. Keep the exact same snapshot for a JSON upload.
    }
    checkSession();
    if (body) {
      try {
        return await api('/api/library', {
          method: 'POST',
          headers: { 'Content-Type': GZIP_LIBRARY_TYPE, 'X-Katchamak-Revision': String(baseRevision) },
          body,
        });
      } catch (error) {
        if (!(error instanceof UnsupportedLibraryEncodingError)) throw error;
        checkSession();
        gzipLibrarySave = false;
      }
    }
  }
  return api('/api/library', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: `{"revision":${baseRevision},"snapshot":${value}}`,
  });
}
function apply(data: { revision: number; snapshot: Snapshot },keepAppearance=false) {
  if (!Number.isSafeInteger(data.revision) || data.revision < 0 || !Array.isArray(data.snapshot?.novels) || !data.snapshot.novels.every(isUsableBackup) || !Array.isArray(data.snapshot.collections)) throw new Error('The saved library could not be read.');
  data.snapshot.novels.forEach(normalizeNovelSections);
  const active = useKachamak.getState().activeNovelId;
  const route = !useWebLibrary.getState().ready ? readWorkspaceRoute() : null;
  const preferredView = route?.view ?? data.snapshot.view;
  const restoredView = !useWebLibrary.getState().ready && ['write','split','corkboard','list','continuous','timeline','family','homepage'].includes(preferredView ?? '') ? { view: preferredView! } : {};
  if(data.snapshot.editorAppearance!==undefined&&!validEditorAppearance(data.snapshot.editorAppearance))throw new Error('The saved page format could not be read.');
  const appearance=data.snapshot.editorAppearance??DEFAULT_EDITOR_APPEARANCE;
  const restoredAppearance=keepAppearance?{}:{editorFont:appearance.font,editorSize:appearance.size,editorSpacing:appearance.spacing,pageFormat:{...appearance.page},editorSpellCheck:appearance.spellCheck??true};
  const navigation: Partial<Navigation> = {};
  if (!useWebLibrary.getState().ready && (route || data.snapshot.navigation)) {
    const saved = route?.navigation ?? data.snapshot.navigation!;
    const novel = data.snapshot.novels.find(n => n.id === saved.activeNovelId);
    const note = (id: string | null) => novel && typeof id === 'string' && Object.values(novel.sections).some(nodes => findNode(nodes, id)) ? id : null;
    navigation.activeNovelId = novel?.id ?? null;
    navigation.activeTab = ['binder','codex','planning','research','templates','prompts','timeline','family','finance','kanban','publish','maps','gallery','trash'].includes(saved.activeTab) ? saved.activeTab as TabKey : novel && typeof saved.activeTab === 'string' && saved.activeTab.startsWith('note:') && findNodeInNovel(novel,saved.activeTab.slice(5)) ? saved.activeTab as TabKey : 'binder';
    const homeId = 'activeHomePageId' in saved ? saved.activeHomePageId : undefined;
    navigation.activeHomePageId = novel && typeof homeId === 'string' && homepageEntry(novel,homeId) ? homeId : HOME_ROOT;
    navigation.selectedNodeId = note(saved.selectedNodeId);
    if(preferredView==='timeline'&&(!navigation.selectedNodeId||novel&&findNodeInNovel(novel,navigation.selectedNodeId)?.section==='timeline')&&navigation.activeTab!=='trash')navigation.activeTab='timeline';
    navigation.paneAId = note(saved.paneAId); navigation.paneBId = note(saved.paneBId);
    navigation.activePane = saved.activePane === 'b' ? 'b' : 'a';
  }
  const location = !useWebLibrary.getState().ready && (rememberedLibraryLocation() ?? data.snapshot.location);
  if (location) {
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
  // Retain the acknowledged snapshot as the CAS baseline. This change then uses
  // the same autosave, offline draft and retry path as edits in the workspace.
  const novels = migrateLibraryArtwork(data.snapshot.novels);
  if (novels !== data.snapshot.novels) {
    // The upgrade can be replayed from the server after an offline reload. Only
    // subsequent changes by the writer need a separate local recovery copy.
    recoveryBase = saved;
    recoveryBasePayload = JSON.stringify({ novels, collections: data.snapshot.collections });
    useKachamak.setState({ novels });
  }
}
export async function initializeWebLibrary() {
  if (initializing) return initializing;
  if (useWebLibrary.getState().ready) return;
  initializing = (async () => {
    lockLocalRecovery();
    useWebLibrary.setState({ busy: true, error: null });
    const account = await api('/api/account');
    if(typeof account.id!=='string'||!account.id||typeof account.email!=='string')throw new Error('The signed-in account could not be read. Please retry.');
    if(accountId&&accountId!==account.id&&snapshot()!==saved){lockAccount();throw new Error('Sign back in to the original account to save the changes left open in this window.');}
    let resumePending = false;
    if (subscribed && accountId === account.id && useWebLibrary.getState().pending && snapshot() !== saved) {
      const current = JSON.parse(snapshot()) as Snapshot, base = JSON.parse(saved) as Snapshot;
      // Navigation alone is restored through the workspace URL as before.
      resumePending = JSON.stringify([current.novels,current.collections,current.editorAppearance]) !== JSON.stringify([base.novels,base.collections,base.editorAppearance]);
    }
    if (accountId !== account.id) { writerId = crypto.randomUUID(); activeDraft = null; }
    accountId=account.id;
    gzipLibrarySave = account.librarySaveEncoding === 'gzip';
    useLocalRecovery.setState({ owner: account.id, drafts: [], error: null });
    await loadLocalDrafts();
    useWebLibrary.setState({ email: account.email });
    useAccountPreferences.setState({displayName: account.displayName, photo: account.avatar || null});
    useAppearancePreferences.setState({theme: account.preferences?.lightTheme?'light':'dark',interfaceSize:account.preferences?.smallInterface?'small':account.preferences?.largeInterface?'large':'normal'});
    useKachamak.setState({ defaultAuthor: account.displayName || '' });
    // Reauthenticating the same window must not replace its pending prose with the last cloud copy.
    if (resumePending) {
      setHistoryOwner(account.id);
      historyStoreChanged(useKachamak.getState());
      // Reauthentication retains this window's text, but never silently uploads it.
      useWebLibrary.setState({ready:true,busy:false,conflict:true,error:'Unsaved changes were kept after sign-in. Choose Retry save to save them, or export backups.'});
      return;
    }
    const confirmed = await api('/api/library/demo/install',{method:'POST'});
    if (!subscribed) {
      subscribed = true;
      const changed = () => {
        snapshotDirty=true;
        if (applying || !useWebLibrary.getState().ready) return;
        useWebLibrary.setState({ pending: true });
        if (!localTimer) localTimer = setTimeout(() => { void checkpointLocalDraft(); }, 150);
        if (useWebLibrary.getState().retrying) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { timer = null; if (!useWebLibrary.getState().conflict) void flushWebLibrary().catch(() => {}); }, 600);
      };
      const navigationFields=['view','activeNovelId','activeHomePageId','activeTab','selectedNodeId','paneAId','paneBId','activePane'] as const;
      const savedFields=['novels','editorFont','editorSize','editorSpacing','pageFormat','editorSpellCheck'] as const;
      useKachamak.subscribe((state,before)=>{
        if(!applying && useWebLibrary.getState().ready && navigationFields.some(field=>state[field]!==before[field]))writeWorkspaceRoute();
        if(savedFields.some(field=>state[field]!==before[field]))changed();
      });
      useCollections.subscribe((state,before)=>{if(state.collections!==before.collections)changed();});
      useLibraryPreferences.subscribe((state,before)=>{
        if(!applying && useWebLibrary.getState().ready && (state.selectedCollection!==before.selectedCollection||state.expanded!==before.expanded))rememberLibraryLocation();
      });
    }
    setHistoryOwner(account.id);
    apply(confirmed);
    writeWorkspaceRoute();
    if (useLocalRecovery.getState().drafts.some(d => d.retryClone)) await loadLocalDrafts(confirmed);
  })().catch(error => { fail(error); throw error; }).finally(() => { initializing = null; });
  return initializing;
}
export async function flushWebLibrary() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (running) return running;
  clearSaveRetry();
  running = (async () => {
    if (!useWebLibrary.getState().ready) throw new Error('Open your account library before saving.');
    // Saving takes priority over a background read. CAS still checks the latest server revision.
    if (refreshing) { refreshController?.abort(); await refreshing.catch(() => {}); }
    if (!useWebLibrary.getState().ready) throw new Error('Open your account library before saving.');
    let retries=0;
    if(useWebLibrary.getState().conflict)await reconcileRevision();
    if (unconfirmedWrite) {
      const attempt = unconfirmedWrite;
      const remote = await api('/api/library?revision='+revision);
      if (!Number.isSafeInteger(remote.revision) || remote.revision < revision ||
          (remote.unchanged === true ? remote.revision !== revision
            : !Array.isArray(remote.snapshot?.novels) || !Array.isArray(remote.snapshot?.collections))) {
        throw new TemporaryCloudError('The server did not confirm the saved library revision.');
      }
      // A failed response may follow a committed write. Confirm its exact payload
      // before retrying newer edits against the acknowledged revision.
      if (remote.revision === revision + 1 && JSON.stringify(remote.snapshot) === attempt.payload) {
        revision = remote.revision;
        saved = attempt.value;
        await removeAcknowledgedDraft(attempt.draft, attempt.value);
      }
      unconfirmedWrite = null;
    }
    while (true) {
      const value = snapshot();
      await flushBookHistories();
      if(value===saved){
        await removeAcknowledgedDraft(activeDraft, value);
        if(snapshot()===value)break;
        continue;
      }
      await checkpointLocalDraft();
      const checkpoint = activeDraft;
      if (!useWebLibrary.getState().ready) throw new Error('Sign in again before saving.');
      const payload = snapshotWithNavigation(value);
      useWebLibrary.setState({ busy: true, pending: true });
      let data;
      try {
        data = await writeLibrarySnapshot(payload, revision);
        if (!Number.isSafeInteger(data.revision) || data.revision !== revision + 1) {
          throw new TemporaryCloudError('The server did not confirm this save. Your edits are kept in this window.');
        }
      }
      catch(error){
        if (error instanceof TemporaryCloudError && useWebLibrary.getState().ready) unconfirmedWrite = { payload, value, draft: checkpoint };
        if(!(error instanceof LibraryConflictError))throw error;
        if(retries++>=2){useWebLibrary.setState({conflict:true});throw error;}
        await reconcileRevision();continue;
      }
      revision = data.revision; saved = value;
      await removeAcknowledgedDraft(checkpoint, value);
    }
    retryDelay = 1000;
    useWebLibrary.setState({ busy: false, pending: false, retrying: false, error: null });
  })().catch(error => {
    fail(error);
    const state = useWebLibrary.getState();
    if (error instanceof TemporaryCloudError && state.ready && (state.pending || unconfirmedWrite) && !state.conflict) {
      useWebLibrary.setState({ pending: true });
      scheduleSaveRetry();
      void checkpointLocalDraft();
    }
    else {
      retryDelay = 1000;
      useWebLibrary.setState({ retrying: false });
    }
    throw error;
  }).finally(() => { running = null; });
  return running;
}
export const saveWebLibrary = flushWebLibrary;
export function saveWorkspaceClone(source: Novel, sourceTab: TabKey, destination: Novel, destinationTab: TabKey) {
  const key = JSON.stringify([source.id, sourceTab, destination.id, destinationTab]);
  if (activeDraft?.owner === accountId && activeDraft.clone?.key === key && activeDraft.snapshot === projectPayload(snapshot()))
    return {count: null, saving: flushWebLibrary()};
  const prior = useLocalRecovery.getState().drafts.find(draft => draft.cloneKey === key);
  if (prior) {
    if (!prior.retryClone) throw new Error('The destination changed. Review the previous clone in My Account → Storage.');
    return {count: null, saving: recoverLocalDraft(prior)};
  }
  // A scoped retry is safe only when this clone accounts for all unsaved project data.
  const clean = projectPayload(snapshot()) === projectPayload(saved);
  const result = cloneWorkspaceTab(source, sourceTab, destination, destinationTab, clean);
  runWorkspaceAction(useKachamak.getState,'cloneTab',[],()=>
    useKachamak.setState(s => ({novels: s.novels.map(n => n.id === destination.id ? result.novel : n)})));
  void checkpointLocalDraft(clean ? {key, base: destination} : undefined);
  return {count: result.count, saving: flushWebLibrary()};
}
// Keep navigation window-local. A clone and disjoint text edits can be retried
// together. Competing edits to the same prose still require a user decision.
async function reconcileRevision(){
  const remote=await api('/api/library');
  if(!Array.isArray(remote.snapshot?.novels)||!remote.snapshot.novels.every(isUsableBackup)||!Array.isArray(remote.snapshot.collections)||!Number.isSafeInteger(remote.revision))throw new Error('The saved library could not be read.');
  const local=JSON.parse(snapshot()) as Snapshot,base=JSON.parse(saved) as Snapshot;
  if(remote.snapshot.editorAppearance!==undefined&&!validEditorAppearance(remote.snapshot.editorAppearance))throw new Error('The saved page format could not be read.');
  const keepAppearance=JSON.stringify(local.editorAppearance??DEFAULT_EDITOR_APPEARANCE)!==JSON.stringify(base.editorAppearance??DEFAULT_EDITOR_APPEARANCE);
  const content=(value:Snapshot)=>JSON.stringify([value.novels,value.collections]);
  const localContent=content(local),remoteContent=content(remote.snapshot),baseContent=content(base);
  const migrationOnly = () => {
    const novels = migrateLibraryArtwork(base.novels);
    return novels !== base.novels && content({ ...base, novels }) === localContent;
  };
  if(localContent===remoteContent||localContent===baseContent||migrationOnly()){
    const checkpoint = activeDraft;
    apply(remote,keepAppearance);
    if (localContent === remoteContent) await removeAcknowledgedDraft(checkpoint, saved);
    return;
  }
  if(remoteContent!==baseContent){
    const value = snapshot(), checkpoint = activeDraft, epoch = accountEpoch;
    const clone = checkpoint?.snapshot === projectPayload(value) ? checkpoint.clone : undefined;
    let merged: Novel | undefined;
    if (checkpoint && clone) {
      const result = await checkClone(checkpoint, local, remote);
      if (epoch !== accountEpoch || value !== snapshot()) throw new Error('The library changed while checking this clone. Retry saving.');
      if (result.committed) {
        apply(remote, keepAppearance);
        await removeAcknowledgedDraft(checkpoint, value);
        return;
      }
      merged = result.copy;
    } else if (JSON.stringify(local.collections) === JSON.stringify(base.collections) &&
        local.novels.length === base.novels.length && local.novels.every((n,i) => n.id === base.novels[i].id)) {
      const edits = local.novels.filter((n,i) => JSON.stringify(n) !== JSON.stringify(base.novels[i]));
      if (edits.length === 1) {
        const latest = remote.snapshot.novels.find((n: Novel) => n.id === edits[0].id);
        if (latest) merged = withExistingTexts(latest, edits[0], base.novels.find(n => n.id === latest.id)!);
      }
    }
    if (merged) {
      const next = merged;
      apply(remote, keepAppearance);
      useKachamak.setState(s => ({novels:s.novels.map(n => n.id === next.id ? next : n)}));
      if (clone) void checkpointLocalDraft({key:clone.key, base:remote.snapshot.novels.find((n: Novel) => n.id === next.id)!});
      return;
    }
    useWebLibrary.setState({conflict:true});
    throw new LibraryConflictError('Another window changed project content too. Your unsaved edits are kept in this window. Export backups before reloading.');
  }
  revision=remote.revision;saved=serializeLibrary(remote.snapshot);
  if(!keepAppearance){const appearance=remote.snapshot.editorAppearance??DEFAULT_EDITOR_APPEARANCE;applying=true;try{useKachamak.setState({editorFont:appearance.font,editorSize:appearance.size,editorSpacing:appearance.spacing,pageFormat:{...appearance.page},editorSpellCheck:appearance.spellCheck??true});}finally{applying=false;}snapshotDirty=true;}
  useWebLibrary.setState({conflict:false,error:null});
}
export async function refreshWebLibrary() {
  if (refreshing) return refreshing;
  if (running) return;
  if (!useWebLibrary.getState().ready) { if (useLocalRecovery.getState().owner) await verifyRecoveryOwner(); return; }
  if (useWebLibrary.getState().pending || useWebLibrary.getState().error) { await verifyRecoveryOwner(); return; }
  const before = snapshot();
  const controller = new AbortController(); refreshController = controller;
  refreshing = (async () => {
    const data = await api('/api/library?revision='+revision, { signal: controller.signal });
    if(!Number.isSafeInteger(data.revision)||data.revision<0)throw new Error('The saved library could not be read.');
    if(data.unchanged===true){if(data.revision!==revision)throw new Error('The saved library revision could not be verified.');return;}
    if (snapshot() === before && !useWebLibrary.getState().pending && data.revision !== revision) apply(data);
  })().catch(error => { if (!controller.signal.aborted && !(error instanceof TemporaryCloudError)) lockAccount(); throw error; }).finally(() => { refreshing = null; refreshController = null; });
  return refreshing;
}
async function verifyRecoveryOwner() {
  const owner = useLocalRecovery.getState().owner;
  if (!owner || owner !== accountId) throw new Error('Sign in again to access local recovery.');
  let account;
  try { account = await api('/api/account'); }
  catch (error) { if (!(error instanceof TemporaryCloudError)) lockAccount(); throw error; } // No offline unlock from a remembered identity.
  if (account.id !== owner) { lockAccount(); throw new Error('Your signed-in account changed. Sign in again to access local recovery.'); }
  return owner;
}
async function selectedDraft(summary: DraftSummary) {
  const owner = await verifyRecoveryOwner(), epoch = accountEpoch;
  const draft = await draftStorage.get(owner, summary.id);
  if (epoch !== accountEpoch || useLocalRecovery.getState().owner !== owner) throw new Error('Sign in again to access local recovery.');
  if (!draft || draft.generation !== summary.generation) { await refreshLocalDrafts(); throw new Error('This draft changed in another window. Choose its latest version.'); }
  return draft;
}
function readDraft(draft: LocalDraft): Snapshot {
  const value = JSON.parse(draft.snapshot);
  if (draft.version !== 1 || !Array.isArray(value?.novels) || !value.novels.every(isUsableBackup) || !Array.isArray(value.collections)) throw new Error('This local draft cannot be recovered. It has been kept.');
  return value;
}
export async function exportPendingBackups() {
  await verifyRecoveryOwner();
  for (const novel of useKachamak.getState().novels) exportNovelJson(novel);
}
export async function exportLocalDraft(summary: DraftSummary) {
  const draft = await selectedDraft(summary), value = readDraft(draft);
  for (const novel of value.novels) exportNovelJson(novel);
}
export async function discardLocalDraft(summary: DraftSummary) {
  const draft = await selectedDraft(summary);
  await draftStorage.remove(draft.owner, draft.id, draft.generation);
  await refreshLocalDrafts();
}
let recovering = false;
export async function recoverLocalDraft(summary: DraftSummary) {
  if (recovering) throw new Error('A recovery is already in progress.');
  recovering = true;
  try {
    const draft = await selectedDraft(summary), source = readDraft(draft), epoch = accountEpoch;
    if (!useWebLibrary.getState().ready) throw new Error('Open the cloud library before recovering copies. You can still export this draft.');
    await flushWebLibrary();
    if (epoch !== accountEpoch || useLocalRecovery.getState().owner !== draft.owner) throw new Error('Sign in again to recover this draft.');
    if (summary.retryClone && draft.clone) {
      const remote: ConfirmedLibrary = await api('/api/library');
      if (!Number.isSafeInteger(remote.revision) || remote.revision < draft.revision || !Array.isArray(remote.snapshot?.novels) || !remote.snapshot.novels.every(isUsableBackup) || !Array.isArray(remote.snapshot.collections))
        throw new Error('The saved library could not be verified. Your clone draft was kept.');
      const {copy, committed} = await checkClone(draft, source, remote);
      if (!committed) {
        if (!copy) {
          await loadLocalDrafts(remote);
          throw new Error('The destination changed. Your draft is still available to recover separately.');
        }
        if (epoch !== accountEpoch || useLocalRecovery.getState().owner !== draft.owner) throw new Error('Sign in again to retry this clone.');
        const next = {...remote.snapshot, novels: remote.snapshot.novels.map(n => n.id === copy.id ? copy : n)};
        const ack = await api('/api/library', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({revision:remote.revision,snapshot:next})});
        if (!Number.isSafeInteger(ack.revision) || ack.revision !== remote.revision + 1) throw new Error('The server did not confirm this clone. Retry saving.');
      }
      await draftStorage.remove(draft.owner, draft.id, draft.generation);
      await refreshWebLibrary();
      await refreshLocalDrafts();
      return;
    }
    // A draft generation is immutable. Its copy IDs must also survive retries and reloads.
    const root = 'recovered-' + draft.generation;
    const ids = new Map(source.novels.map((n, index) => [n.id, root + '-book-' + index]));
    const folders = new Map(source.collections.map((c, index) => [c.id, root + '-folder-' + index]));
    if (folders.size !== source.collections.length || source.collections.some(c => typeof c.name !== 'string' || !Array.isArray(c.projectIds) || c.projectIds.some(id => !ids.has(id)) || c.parentId !== null && !folders.has(c.parentId))) throw new Error('This draft has invalid collections. Export its project backups instead.');
    const novels = source.novels.map(n => { const copy = { ...n, id: ids.get(n.id)!, title: n.title + ' (Recovered)', author: n.author ?? '', trash: n.trash ?? [], statuses: n.statuses ?? [], labels: n.labels ?? [] }; normalizeNovelSections(copy); return migrateBookArtwork(copy); });
    const assigned = new Set(source.collections.flatMap(c => c.projectIds));
    const current = { novels: useKachamak.getState().novels, collections: useCollections.getState().collections };
    const groupName = current.collections.find(c => c.id === root)?.name ?? 'Recovered · ' + new Date(draft.updatedAt).toLocaleString();
    const collections: Collection[] = [
      { id: root, name: groupName, parentId: null, projectIds: source.novels.filter(n => !assigned.has(n.id)).map(n => ids.get(n.id)!), createdAt: draft.updatedAt, updatedAt: draft.updatedAt },
      ...source.collections.map(c => ({ ...c, id: folders.get(c.id)!, parentId: c.parentId === null ? root : folders.get(c.parentId)!, projectIds: c.projectIds.map(id => ids.get(id)!) })),
    ];
    const matches = (available: Snapshot) => {
      if (!Array.isArray(available?.novels) || !Array.isArray(available.collections)) return false;
      const books = new Map(available.novels.map(n => [n.id, n]));
      const groups = new Map(available.collections.map(c => [c.id, c]));
      return novels.every(n => JSON.stringify(books.get(n.id)) === JSON.stringify(n))
        && collections.every(c => JSON.stringify(groups.get(c.id)) === JSON.stringify(c));
    };
    const copyIds = new Set([...ids.values(), ...folders.values(), root]);
    if (current.novels.some(n => copyIds.has(n.id)) || current.collections.some(c => copyIds.has(c.id))) {
      // A retry may be using a stale window. Confirm the copies on the server
      // before releasing their source, even if this window has no edits to save.
      if (!matches(current) || !matches((await api('/api/library')).snapshot)) {
        throw new Error('Previously recovered copies have changed. Your draft is still available to export.');
      }
    } else {
      useKachamak.setState(s => ({ novels: [...s.novels, ...novels] }));
      useCollections.setState(s => ({ collections: [...s.collections, ...collections] }));
    }
    await flushWebLibrary();
    // Only this exact selected generation, and only after its copies are acknowledged.
    const acknowledged = JSON.parse(saved) as Snapshot;
    if (!matches(acknowledged)) throw new Error('The recovered copies changed during saving. Your draft is still available to export.');
    await draftStorage.remove(draft.owner, draft.id, draft.generation);
    await refreshLocalDrafts();
  } finally { recovering = false; }
}
export async function reloadWebLibrary(discard = false) {
  if (running) await running;
  if (snapshot() !== saved && !discard) throw new Error('Save or export your unsaved edits before reloading.');
  const before = snapshot(), discardedDraft = activeDraft;
  const pausedRetry = saveRetry !== null;
  if (pausedRetry) clearSaveRetry();
  try {
    const data = await api('/api/library');
    // Discard applies only to edits present at the click, never to text typed while waiting.
    if (snapshot() !== before || data.revision < revision) throw new Error('The library changed while reloading. Your current edits were kept. Save them before retrying.');
    apply(data);
    retryDelay = 1000;
    unconfirmedWrite = null;
    useWebLibrary.setState({ retrying: false });
    if (discard) await removeAcknowledgedDraft(discardedDraft, before);
  } catch (error) {
    if (pausedRetry && useWebLibrary.getState().retrying && saveRetry === null && !running) scheduleSaveRetry();
    throw error;
  }
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
export async function importWebProject(file: string | Blob, collectionId: string | null) {
  const owner = accountId, epoch = accountEpoch;
  if (!owner || !useWebLibrary.getState().ready) throw new Error('Open your account library before importing.');
  const json = typeof file === 'string' ? file : await file.text();
  if (owner !== accountId || epoch !== accountEpoch || !useWebLibrary.getState().ready)
    throw new Error('Your account session changed. Choose the backup again.');
  const input = JSON.parse(json), value = input?.format === 'katchamak-project' ? input.novel : input;
  if (!isUsableBackup(value)) throw new Error('Not a Draftopus project.');
  // Match the established store.importNovel defaults for older JSON backups.
  const novel: Novel = { ...value, id: crypto.randomUUID(), author: value.author ?? '', trash: value.trash ?? [], statuses: value.statuses ?? [], labels: value.labels ?? [] };
  normalizeNovelSections(novel);
  if (!validCloudLibrary({novels:[novel],collections:[]}))
    throw new Error('This backup contains project data that cannot be saved to your cloud library.');
  addNovel(migrateBookArtwork(novel), collectionId); await flushWebLibrary();
}
function filesPath(id: string | null) { if (!id) throw new Error('Open a project first.'); return '/api/library/files/' + encodeURIComponent(id); }
export async function projectAttachments(projectId = useKachamak.getState().activeNovelId): Promise<{ id: string; name: string; size: number }[]> {
  return (await api(filesPath(projectId))).files;
}
export async function addProjectAttachment(file: File, projectId = useKachamak.getState().activeNovelId) {
  const path = filesPath(projectId), epoch = accountEpoch;
  await flushWebLibrary();
  if (epoch !== accountEpoch || !useWebLibrary.getState().ready) throw new Error('Sign in again before adding a file.');
  const data = new FormData();
  data.set('file', file);
  await api(path, { method: 'POST', body: data });
}
export function attachmentUrl(id: string, projectId = useKachamak.getState().activeNovelId) {
  return filesPath(projectId) + '/' + encodeURIComponent(id);
}
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
  discardBookHistory(id);
  await flushBookHistories();
}

export async function publishDemoProject(projectId:string) {
  await saveWebLibrary();
  const result=await api('/api/library/demo/publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId})});
  await saveWebLibrary();
  const before=snapshot(),data=await api('/api/library/demo/install',{method:'POST'});
  if(snapshot()===before)apply(data);
  return result as {title:string;chapterCount:number;version:number};
}
