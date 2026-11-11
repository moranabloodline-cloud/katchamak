"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { uid } from "./utils";

export interface Collection {
  id: string;
  name: string;
  projectIds: string[];
  parentId: string | null;
}

interface CollectionsState {
  collections: Collection[];
  addCollection: (name: string, parentId?: string | null) => string | null;
  renameCollection: (id: string, name: string) => void;
  removeCollection: (id: string) => void;
  setMembership: (collectionId: string, projectId: string, included: boolean) => void;
  moveCollection: (id: string, parentId: string | null) => boolean;
  moveProject: (id: string, parentId: string | null) => boolean;
  collapsedIds: string[];
  toggleCollapsed: (id: string) => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  coverSize: number;
  setCoverSize: (size: number) => void;
  layout: "grid" | "list";
  setLayout: (layout: "grid" | "list") => void;
  projectMeta: Record<string, { category?: string; coverUrl?: string }>;
  setProjectMeta: (id: string, patch: { category?: string; coverUrl?: string }) => void;
}

export function canMoveCollection(collections: Collection[], id: string, parentId: string | null): boolean {
  if (!collections.some((c) => c.id === id)) return false;
  const seen = new Set<string>([id]);
  let current = parentId;
  while (current !== null) {
    if (seen.has(current)) return false;
    seen.add(current);
    const parent = collections.find((c) => c.id === current);
    if (!parent) return false;
    current = parent.parentId ?? null;
  }
  return true;
}

// Kept separately so existing manuscript data and its migrations stay untouched.
export const useCollections = create<CollectionsState>()(persist((set, get) => ({
  collections: [],
  collapsedIds: [], sidebarWidth: 260, coverSize: 160, layout: "grid", projectMeta: {},
  setSidebarWidth: (width) => { if (Number.isFinite(width)) set({ sidebarWidth: Math.max(180, Math.min(480, width)) }); },
  setCoverSize: (size) => { if (Number.isFinite(size)) set({ coverSize: Math.max(100, Math.min(280, size)) }); },
  setLayout: (layout) => set({ layout }),
  setProjectMeta: (id, patch) => set((s) => ({ projectMeta: { ...s.projectMeta, [id]: { ...s.projectMeta[id], ...patch } } })),
  toggleCollapsed: (id) => set((s) => ({ collapsedIds: s.collapsedIds.includes(id) ? s.collapsedIds.filter((x) => x !== id) : [...s.collapsedIds, id] })),
  addCollection: (name, parentId = null) => {
    const title = name.trim();
    if (!title || (parentId !== null && !get().collections.some((c) => c.id === parentId))) return null;
    const id = uid();
    set((state) => ({ collections: [...state.collections, { id, name: title, projectIds: [], parentId }], collapsedIds: state.collapsedIds.filter((x) => x !== parentId) }));
    return id;
  },
  renameCollection: (id, name) => {
    const title = name.trim();
    if (!title) return;
    set((state) => ({ collections: state.collections.map((c) => c.id === id ? { ...c, name: title } : c) }));
  },
  removeCollection: (id) => set((state) => {
    const removed = state.collections.find((c) => c.id === id);
    if (!removed) return state;
    return { collections: state.collections.filter((c) => c.id !== id).map((c) => ({ ...c,
      parentId: c.parentId === id ? removed.parentId : c.parentId,
      projectIds: c.id === removed.parentId ? [...new Set([...c.projectIds, ...removed.projectIds])] : c.projectIds,
    })), collapsedIds: state.collapsedIds.filter((x) => x !== id) };
  }),
  moveCollection: (id, parentId) => {
    if (!canMoveCollection(get().collections, id, parentId)) return false;
    set((s) => ({ collections: s.collections.map((c) => c.id === id ? { ...c, parentId } : c), collapsedIds: s.collapsedIds.filter((x) => x !== parentId) }));
    return true;
  },
  moveProject: (id, parentId) => {
    if (parentId !== null && !get().collections.some((c) => c.id === parentId)) return false;
    set((s) => ({ collections: s.collections.map((c) => ({ ...c, projectIds: c.id === parentId ? [...c.projectIds.filter((p) => p !== id), id] : c.projectIds.filter((p) => p !== id) })), collapsedIds: s.collapsedIds.filter((x) => x !== parentId) }));
    return true;
  },
  setMembership: (collectionId, projectId, included) => set((state) => ({
    collections: state.collections.map((c) => c.id !== collectionId ? c : {
      ...c,
      projectIds: included ? [...new Set([...c.projectIds, projectId])] : c.projectIds.filter((id) => id !== projectId),
    }),
  })),
}), { name: "kachamak-collections-v1", version: 2, storage: createJSONStorage(() => localStorage),
  migrate: (persisted) => {
    const previous = persisted as Partial<CollectionsState>;
    const collections = (previous.collections ?? []).map((c) => ({ ...c, parentId: c.parentId ?? null, projectIds: [...c.projectIds] }));
    for (const c of collections) if (!canMoveCollection(collections, c.id, c.parentId)) c.parentId = null;
    return { ...previous, collections };
  },
}));
