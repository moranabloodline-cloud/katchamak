"use client";

import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import { useKachamak, isUsableBackup, normalizeNovelSections, saveProjectsLocally } from "./store";
import { newNovel } from "./seed";
import type { Novel } from "./types";

export const isDesktop = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
type DiskDocument = { format: "katchamak-project"; version: 1; storeVersion: 7; novel: Novel };
type Loaded = { path: string; revision: string; document: DiskDocument };
type Registry = { projects: Loaded[]; errors: string[]; registered_ids: string[] };
type State = { ready: boolean; busy: boolean; pending: boolean; error: string | null; paths: Record<string, string>; legacyIds: string[] };
export const useProjectFiles = create<State>(() => ({ ready: false, busy: false, pending: false, error: null, paths: {}, legacyIds: [] }));
const documents = new Map<string, { path: string; revision: string; saved: string }>();
let initializing: Promise<void> | null = null;
let running: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let subscribed = false;
let applying = false;

const wrap = (novel: Novel): DiskDocument => ({ format: "katchamak-project", version: 1, storeVersion: 7, novel });
const fail = (error: unknown) => { useProjectFiles.setState({ error: String(error), busy: false, pending: true }); };
function checked(loaded: Loaded): Novel {
  if (!isUsableBackup(loaded.document.novel)) throw new Error(`Invalid project file: ${loaded.path}`);
  const novel = loaded.document.novel;
  normalizeNovelSections(novel);
  return novel;
}
function remember(loaded: Loaded) {
  const novel = checked(loaded);
  documents.set(novel.id, { path: loaded.path, revision: loaded.revision, saved: JSON.stringify(novel) });
  useProjectFiles.setState({ paths: Object.fromEntries([...documents].map(([id, file]) => [id, file.path])) });
  return novel;
}
function install(loaded: Loaded, open = false) {
  const novel = remember(loaded);
  applying = true;
  try { useKachamak.setState(state => ({ novels: [...state.novels.filter(n => n.id !== novel.id), novel], ...(open ? { activeNovelId: novel.id, selectedNodeId: null, paneAId: null, paneBId: null, activeTab: "binder" as const } : {}) })); }
  finally { applying = false; }
}

export async function initializeProjectFiles() {
  if (!isDesktop()) { useProjectFiles.setState({ ready: true }); return; }
  if (initializing) return initializing;
  initializing = (async () => {
    useProjectFiles.setState({ busy: true, error: null });
    const cached = useKachamak.getState().novels;
    // Preserve the last local recovery cache before authoritative files replace it.
    if (cached.length) await invoke("save_disk_recovery", { documents: cached.map(wrap) });
    const registry = await invoke<Registry>("load_disk_projects");
    if (registry.errors.length) throw new Error(registry.errors.join("\n"));
    const legacy = cached.filter(n => !registry.registered_ids.includes(n.id));
    documents.clear();
    const novels = [...registry.projects.map(remember), ...legacy];
    applying = true;
    try { useKachamak.setState(state => ({ novels, activeNovelId: novels.some(n => n.id === state.activeNovelId) ? state.activeNovelId : null })); }
    finally { applying = false; }
    useProjectFiles.setState({ ready: true, busy: false, pending: false, paths: Object.fromEntries([...documents].map(([id, file]) => [id, file.path])), legacyIds: legacy.map(n => n.id), error: null });
    if (!subscribed) {
      subscribed = true;
      useKachamak.subscribe(() => {
        if (applying || !isDesktop() || !useProjectFiles.getState().ready) return;
        const dirty = useKachamak.getState().novels.some(n => documents.has(n.id) && documents.get(n.id)!.saved !== JSON.stringify(n));
        if (!dirty) return;
        useProjectFiles.setState({ pending: true });
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { timer = null; void flushProjectFiles().catch(fail); }, 300);
      });
    }
  })().catch(error => { fail(error); throw error; }).finally(() => { initializing = null; });
  return initializing;
}

export async function flushProjectFiles(): Promise<void> {
  if (!isDesktop()) { if (!saveProjectsLocally()) throw new Error("Could not save the project."); return; }
  if (timer) { clearTimeout(timer); timer = null; }
  if (running) { await running; return flushProjectFiles(); }
  if (useProjectFiles.getState().legacyIds.length) throw new Error("Choose a folder for your existing projects first.");
  running = (async () => {
    useProjectFiles.setState({ busy: true });
    for (const novel of useKachamak.getState().novels) {
      const file = documents.get(novel.id);
      if (!file) throw new Error(`Choose a project file location for ${novel.title}.`);
      const snapshot = JSON.stringify(novel);
      if (file.saved === snapshot) continue;
      const saved = await invoke<Loaded>("save_disk_project", { id: novel.id, expectedRevision: file.revision, document: wrap(JSON.parse(snapshot)) });
      documents.set(novel.id, { path: saved.path, revision: saved.revision, saved: snapshot });
    }
    const dirty = useKachamak.getState().novels.some(n => documents.get(n.id)?.saved !== JSON.stringify(n));
    useProjectFiles.setState({ busy: false, pending: dirty, error: null });
  })().catch(error => { fail(error); throw error; }).finally(() => { running = null; });
  await running;
  if (useProjectFiles.getState().pending) return flushProjectFiles();
}

export async function createFileProject(title: string, author: string): Promise<string | null> {
  const novel = newNovel(title, author);
  const loaded = await invoke<Loaded | null>("create_disk_project", { document: wrap(novel) });
  if (!loaded) return null;
  install(loaded, true);
  return novel.id;
}

export async function openFileProject() {
  if (useProjectFiles.getState().ready && !useProjectFiles.getState().error) await flushProjectFiles();
  const loaded = await invoke<Loaded | null>("open_disk_project");
  if (!loaded) return;
  checked(loaded);
  await initializeProjectFiles();
  install(loaded, true);
}

export async function openRecentProject(id: string) {
  await flushProjectFiles();
  const loaded = await invoke<Loaded>("read_disk_project", { id });
  install(loaded, true);
}

export async function migrateExistingProjects() {
  const ids = useProjectFiles.getState().legacyIds;
  const legacy = useKachamak.getState().novels.filter(n => ids.includes(n.id));
  const saved = await invoke<Loaded[] | null>("migrate_disk_projects", { documents: legacy.map(wrap) });
  if (!saved) return;
  await initializeProjectFiles();
}

export async function removeFileProject(id: string) {
  await flushProjectFiles();
  await invoke("forget_disk_project", { id });
  documents.delete(id);
  useKachamak.getState().deleteNovel(id);
  useProjectFiles.setState({ paths: Object.fromEntries([...documents].map(([key, file]) => [key, file.path])) });
}

// JSON backup import is copied to a user-selected project folder before it is added.
export async function importFileProject(json: string): Promise<string | null> {
  const parsed: unknown = JSON.parse(json);
  if (!isUsableBackup(parsed)) throw new Error("Not a Katchamak project backup.");
  normalizeNovelSections(parsed);
  const novel = { ...parsed, id: newNovel("", "").id, author: parsed.author ?? "", trash: parsed.trash ?? [], statuses: parsed.statuses ?? [], labels: parsed.labels ?? [] } as Novel;
  const loaded = await invoke<Loaded | null>("create_disk_project", { document: wrap(novel) });
  if (!loaded) return null;
  install(loaded, true);
  return novel.id;
}

// Recover an unavailable/moved project path without replacing current edits with an older disk copy.
export async function relocateCurrentProject() {
  if (running) { try { await running; } catch {} }
  const state = useKachamak.getState();
  const novel = state.novels.find(n => n.id === state.activeNovelId);
  if (!novel) throw new Error("Open the project you want to save first.");
  const snapshot = JSON.parse(JSON.stringify(novel));
  const loaded = await invoke<Loaded | null>("create_disk_project", { document: wrap(snapshot) });
  if (!loaded) return;
  remember(loaded);
  // Edits made while the folder picker was open are still in memory and are flushed next.
  await flushProjectFiles();
}
