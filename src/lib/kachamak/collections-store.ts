"use client";
import { projectStorage, isWebSession } from "./session-storage";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { uid } from "./utils";

export interface Collection {
  id: string;
  name: string;
  projectIds: string[];
  parentId: string | null;
  createdAt?: number;
  updatedAt?: number;
}

interface CollectionsState {
  collections: Collection[];
  addCollection: (name: string, parentId?: string | null) => string | null;
  renameCollection: (id: string, name: string) => void;
  removeCollection: (id: string) => void;
  setMembership: (collectionId: string, projectId: string, included: boolean) => void;
  moveCollection: (id: string, parentId: string | null) => boolean;
  moveProject: (projectId: string, destinationId: string | null, sourceId: string | null) => void;
}

export function canMoveCollection(collections: Collection[], id: string, parentId: string | null): boolean {
  if (!collections.some((c) => c.id === id)) return false;
  const seen = new Set([id]);
  let current = parentId;
  while (current !== null) {
    if (seen.has(current)) return false;
    seen.add(current);
    const parent = collections.find((c) => c.id === current);
    if (!parent) return false;
    current = parent.parentId;
  }
  return true;
}

// Kept separately so existing manuscript data and its migrations stay untouched.
export const useCollections = create<CollectionsState>()(persist((set, get) => ({
  collections: [],
  addCollection: (name, parentId = null) => {
    const title = name.trim();
    if (!title || (parentId !== null && !get().collections.some((c) => c.id === parentId))) return null;
    const id = uid();
    set((state) => ({ collections: [...state.collections, { id, name: title, parentId, projectIds: [], createdAt: Date.now(), updatedAt: Date.now() }] }));
    return id;
  },
  renameCollection: (id, name) => {
    const title = name.trim();
    if (!title) return;
    set((state) => ({ collections: state.collections.map((c) => c.id === id ? { ...c, name: title, updatedAt: Date.now() } : c) }));
  },
  // Removing a folder promotes its contents; manuscripts are never deleted here.
  removeCollection: (id) => set((state) => {
    const removed = state.collections.find((c) => c.id === id);
    if (!removed) return state;
    return { collections: state.collections.filter((c) => c.id !== id).map((c) => ({
      ...c,
      parentId: c.parentId === id ? removed.parentId : c.parentId,
      projectIds: c.id === removed.parentId ? [...new Set([...c.projectIds, ...removed.projectIds])] : c.projectIds,
    })) };
  }),
  moveCollection: (id, parentId) => {
    if (!canMoveCollection(get().collections, id, parentId)) return false;
    set((state) => ({ collections: state.collections.map((c) => c.id === id ? { ...c, parentId, updatedAt: Date.now() } : c) }));
    return true;
  },
  moveProject: (projectId, destinationId, sourceId) => set((state) => {
    if (destinationId !== null && !state.collections.some((c) => c.id === destinationId)) return state;
    return { collections: state.collections.map((c) => ({ ...c,
      projectIds: c.id === destinationId ? [...new Set([...c.projectIds, projectId])] :
        (destinationId === null || c.id === sourceId) ? c.projectIds.filter((id) => id !== projectId) : c.projectIds,
    })) };
  }),
  setMembership: (collectionId, projectId, included) => set((state) => ({
    collections: state.collections.map((c) => c.id !== collectionId ? (included && isWebSession() ? { ...c, projectIds: c.projectIds.filter(id => id !== projectId) } : c) : {
      ...c,
      projectIds: included ? [...new Set([...c.projectIds, projectId])] : c.projectIds.filter((id) => id !== projectId),
    }),
  })),
}), {
  name: "kachamak-collections-v1", version: 2, storage: createJSONStorage(() => projectStorage),
  migrate: (persisted, version) => {
    const state = persisted as { collections: Collection[] };
    if (version < 2) return { ...state, collections: state.collections.map((c) => ({ ...c, parentId: c.parentId ?? null })) };
    return state;
  },
}));
