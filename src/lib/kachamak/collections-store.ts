"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { uid } from "./utils";

export interface Collection {
  id: string;
  name: string;
  projectIds: string[];
}

interface CollectionsState {
  collections: Collection[];
  addCollection: (name: string) => string | null;
  renameCollection: (id: string, name: string) => void;
  removeCollection: (id: string) => void;
  setMembership: (collectionId: string, projectId: string, included: boolean) => void;
}

// Kept separately so existing manuscript data and its migrations stay untouched.
export const useCollections = create<CollectionsState>()(persist((set) => ({
  collections: [],
  addCollection: (name) => {
    const title = name.trim();
    if (!title) return null;
    const id = uid();
    set((state) => ({ collections: [...state.collections, { id, name: title, projectIds: [] }] }));
    return id;
  },
  renameCollection: (id, name) => {
    const title = name.trim();
    if (!title) return;
    set((state) => ({ collections: state.collections.map((c) => c.id === id ? { ...c, name: title } : c) }));
  },
  removeCollection: (id) => set((state) => ({ collections: state.collections.filter((c) => c.id !== id) })),
  setMembership: (collectionId, projectId, included) => set((state) => ({
    collections: state.collections.map((c) => c.id !== collectionId ? c : {
      ...c,
      projectIds: included ? [...new Set([...c.projectIds, projectId])] : c.projectIds.filter((id) => id !== projectId),
    }),
  })),
}), { name: "kachamak-collections-v1", version: 1, storage: createJSONStorage(() => localStorage) }));
