"use client";
import { projectStorage } from "./session-storage";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {LibrarySort,LibraryGroup} from './library-order';

interface LibraryPreferences {
  selectedCollection: string | null;
  expanded: string[];
  sidebarWidth: number;
  coverZoom: number;
  layout: "grid" | "list";
  sort: LibrarySort;
  group: LibraryGroup;
  setLocation: (id: string | null, ancestors?: string[]) => void;
  toggleExpanded: (id: string) => void;
  setSidebarWidth: (width: number) => void;
  changeCoverZoom: (step: number) => void;
  resetCoverZoom: () => void;
  setLayout: (layout: "grid" | "list") => void;
  setSort: (sort: LibraryPreferences["sort"]) => void;
  setGroup: (group: LibraryPreferences["group"]) => void;
}

export const useLibraryPreferences = create<LibraryPreferences>()(persist((set) => ({
  selectedCollection: null, expanded: [], sidebarWidth: 260, coverZoom: 100,
  layout: "grid", sort: "updated", group: "none",
  setLocation: (id, ancestors = []) => set((s) => ({ selectedCollection: id, expanded: [...new Set([...s.expanded, ...ancestors])] })),
  toggleExpanded: (id) => set((s) => ({ expanded: s.expanded.includes(id) ? s.expanded.filter((v) => v !== id) : [...s.expanded, id] })),
  setSidebarWidth: (width) => set({ sidebarWidth: Math.max(140, Math.min(600, width)) }),
  changeCoverZoom: (step) => set((s) => ({ coverZoom: Math.max(60, Math.min(180, s.coverZoom + step)) })),
  resetCoverZoom: () => set({ coverZoom: 100 }),
  setLayout: (layout) => set({ layout }),
  setSort: (sort) => set({ sort }),
  setGroup: (group) => set({ group }),
}), { name: "kachamak-library-preferences-v1", version: 2, storage: createJSONStorage(() => projectStorage), migrate: persisted => {
  // v2 extends the choices while preserving existing location, layout and zoom.
  const previous=persisted as LibraryPreferences;
  return {...previous,sort:['updated','title','created','series','author'].includes(previous.sort)?previous.sort:'updated',group:['none','author','series','date'].includes(previous.group)?previous.group:'none'} as LibraryPreferences;
} }));
