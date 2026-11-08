"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  CodexCategory,
  CodexEntry,
  NoteNode,
  Novel,
  SectionKey,
  TabKey,
  ViewMode,
} from "./types";
import { newNovel, seedNovels, DEFAULT_STATUSES } from "./seed";
import { uid, findNode } from "./utils";

interface KachamakState {
  novels: Novel[];
  activeNovelId: string | null;
  activeTab: TabKey;
  selectedNodeId: string | null;
  selectedCodexId: string | null;
  view: ViewMode;
  defaultAuthor: string;

  /* panel visibility (user-controlled, like the original) */
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;

  /* panel sizes in px (drag the vertical line to widen / narrow) */
  leftPanelWidth: number;
  rightPanelWidth: number;
  setLeftPanelWidth: (px: number) => void;
  setRightPanelWidth: (px: number) => void;

  /* tree expand / collapse (persisted) */
  setAllNodesCollapsed: (section: SectionKey, collapsed: boolean) => void;
  codexCollapsed: Record<string, boolean>;
  toggleCodexCat: (id: string) => void;
  setAllCodexCollapsed: (collapsed: boolean) => void;

  /* library */
  createNovel: (title: string, author: string) => void;
  importNovel: (json: string) => { ok: boolean; error?: string };
  deleteNovel: (id: string) => void;
  openNovel: (id: string) => void;
  closeNovel: () => void;

  /* workspace */
  setTab: (tab: TabKey) => void;
  setView: (v: ViewMode) => void;
  select: (id: string | null) => void;
  selectCodex: (id: string | null) => void;
  renameNovel: (title: string) => void;
  setDefaultAuthor: (a: string) => void;

  /* status list (per novel, edited via the status dropdown "Edit…") */
  addStatus: (name: string) => void;
  removeStatus: (name: string) => void;

  /* notes */
  addNode: (
    section: SectionKey,
    parentId: string | null,
    kind: NoteNode["kind"],
    title?: string
  ) => string | null;
  updateNode: (section: SectionKey, id: string, patch: Partial<NoteNode>) => void;
  deleteNode: (section: SectionKey, id: string) => void;
  moveNode: (section: SectionKey, id: string, dir: "up" | "down") => void;

  /* trash */
  restoreFromTrash: (trashId: string) => void;
  deleteForever: (trashId: string) => void;
  emptyTrash: () => void;

  /* codex */
  addCategory: (parentId: string | null, name: string) => void;
  renameCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  addEntry: (categoryId: string, title: string) => string | null;
  updateEntry: (id: string, patch: Partial<CodexEntry>) => void;
  deleteEntry: (id: string) => void;
  findEntryCategory: (entryId: string) => CodexCategory | null;
}

/* ---------- immutable helpers ---------- */

function mapNodes(nodes: NoteNode[], fn: (n: NoteNode) => NoteNode): NoteNode[] {
  return nodes.map((n) => ({ ...fn(n), children: mapNodes(n.children, fn) }));
}

function removeFromNodes(
  nodes: NoteNode[],
  id: string
): { nodes: NoteNode[]; removed: NoteNode | null; parentId: string | null } {
  const found: { removed: NoteNode | null; parentId: string | null } = {
    removed: null,
    parentId: null,
  };
  const walk = (list: NoteNode[], pid: string | null): NoteNode[] => {
    const out: NoteNode[] = [];
    for (const n of list) {
      if (n.id === id) {
        found.removed = n;
        found.parentId = pid;
        continue;
      }
      out.push({ ...n, children: walk(n.children, n.id) });
    }
    return out;
  };
  const nodes2 = walk(nodes, null);
  return { nodes: nodes2, removed: found.removed, parentId: found.parentId };
}

function mapCategories(
  cats: CodexCategory[],
  fn: (c: CodexCategory) => CodexCategory
): CodexCategory[] {
  return cats.map((c) => ({ ...fn(c), children: mapCategories(c.children, fn) }));
}

function removeFromCategories(
  cats: CodexCategory[],
  id: string
): { cats: CodexCategory[]; removed: CodexCategory | null } {
  const found: { removed: CodexCategory | null } = { removed: null };
  const walk = (list: CodexCategory[]): CodexCategory[] => {
    const out: CodexCategory[] = [];
    for (const c of list) {
      if (c.id === id) {
        found.removed = c;
        continue;
      }
      out.push({ ...c, children: walk(c.children) });
    }
    return out;
  };
  const cats2 = walk(cats);
  return { cats: cats2, removed: found.removed };
}

function findCategory(
  cats: CodexCategory[],
  id: string
): CodexCategory | null {
  for (const c of cats) {
    if (c.id === id) return c;
    const hit = findCategory(c.children, id);
    if (hit) return hit;
  }
  return null;
}

function touch(novel: Novel): Novel {
  return { ...novel, updatedAt: Date.now() };
}

function makeNode(kind: NoteNode["kind"], title: string): NoteNode {
  const now = Date.now();
  return {
    id: uid(),
    title,
    kind,
    synopsis: "",
    content: "",
    notes: "",
    status: "",
    label: "",
    createdAt: now,
    updatedAt: now,
    children: [],
  };
}

const STORAGE_KEY = "kachamak-store-v1";

export const useKachamak = create<KachamakState>()(
  persist(
    (set, get) => ({
      novels: [],
      activeNovelId: null,
      activeTab: "binder",
      selectedNodeId: null,
      selectedCodexId: null,
      view: "split",
      defaultAuthor: "Nikola Djokovic",

      leftPanelOpen: true,
      rightPanelOpen: true,

      leftPanelWidth: 256,
      rightPanelWidth: 288,
      setLeftPanelWidth: (px) =>
        set({ leftPanelWidth: Math.round(Math.min(560, Math.max(170, px))) }),
      setRightPanelWidth: (px) =>
        set({ rightPanelWidth: Math.round(Math.min(680, Math.max(190, px))) }),

      toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
      toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),

      addStatus: (name) => {
        const v = name.trim();
        if (!v) return;
        set((s) => ({
          novels: s.novels.map((n) =>
            n.id === s.activeNovelId && !n.statuses.includes(v)
              ? touch({ ...n, statuses: [...n.statuses, v] })
              : n
          ),
        }));
      },

      removeStatus: (name) =>
        set((s) => ({
          novels: s.novels.map((n) =>
            n.id === s.activeNovelId
              ? touch({ ...n, statuses: n.statuses.filter((x) => x !== name) })
              : n
          ),
        })),

      setAllNodesCollapsed: (section, collapsed) => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return;
        const map = (nodes: NoteNode[]): NoteNode[] =>
          nodes.map((n) => ({ ...n, collapsed, children: map(n.children) }));
        novel.sections = { ...novel.sections, [section]: map(novel.sections[section]) };
        set((s) => ({
          novels: s.novels.map((x) => (x.id === novel.id ? touch({ ...x }) : x)),
        }));
      },

      codexCollapsed: {},
      toggleCodexCat: (id) =>
        set((s) => ({
          codexCollapsed: { ...s.codexCollapsed, [id]: !s.codexCollapsed[id] },
        })),
      setAllCodexCollapsed: (collapsed) => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return;
        const next: Record<string, boolean> = {};
        const walk = (cats: CodexCategory[]) => {
          for (const c of cats) {
            next[c.id] = collapsed;
            walk(c.children);
          }
        };
        walk(novel.codex);
        set({ codexCollapsed: next });
      },

      /* ---------- library ---------- */

      createNovel: (title, author) => {
        const n = newNovel(title, author || get().defaultAuthor);
        set((s) => ({
          novels: [...s.novels, n],
          activeNovelId: n.id,
          activeTab: "binder",
          selectedNodeId: null,
          view: "grid",
        }));
      },

      importNovel: (json) => {
        try {
          const parsed = JSON.parse(json) as Novel;
          if (!parsed || typeof parsed !== "object" || !parsed.title) {
            return { ok: false, error: "Not a Kachamak novel backup." };
          }
          const n: Novel = {
            ...parsed,
            id: uid(), // never collide with existing ids
            trash: parsed.trash ?? [],
            statuses: parsed.statuses ?? [],
            labels: parsed.labels ?? [],
          };
          set((s) => ({
            novels: [...s.novels, n],
            activeNovelId: n.id,
            activeTab: "binder",
            selectedNodeId: null,
            view: "grid",
          }));
          return { ok: true };
        } catch {
          return { ok: false, error: "Could not read that JSON file." };
        }
      },

      deleteNovel: (id) =>
        set((s) => ({
          novels: s.novels.filter((n) => n.id !== id),
          activeNovelId: s.activeNovelId === id ? null : s.activeNovelId,
        })),

      openNovel: (id) =>
        set({ activeNovelId: id, activeTab: "binder", selectedNodeId: null, view: "grid" }),

      closeNovel: () => set({ activeNovelId: null, selectedNodeId: null }),

      /* ---------- workspace ---------- */

      setTab: (tab) =>
        set({ activeTab: tab, selectedNodeId: null, selectedCodexId: null }),

      setView: (v) => set({ view: v }),

      select: (id) => set({ selectedNodeId: id }),

      selectCodex: (id) => set({ selectedCodexId: id }),

      renameNovel: (title) =>
        set((s) => ({
          novels: s.novels.map((n) =>
            n.id === s.activeNovelId ? touch({ ...n, title: title.trim() || n.title }) : n
          ),
        })),

      setDefaultAuthor: (a) => set({ defaultAuthor: a }),

      /* ---------- notes ---------- */

      addNode: (section, parentId, kind, title) => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return null;
        const roots = novel.sections[section];
        let created: NoteNode | null = null;

        const fallbackTitle =
          kind === "act"
            ? "New Act"
            : kind === "chapter"
              ? "New Chapter"
              : kind === "scene"
                ? "New Scene"
                : kind === "folder"
                  ? "New Folder"
                  : "New Note";

        if (parentId === null) {
          const n = makeNode(kind, title ?? fallbackTitle);
          created = n;
          roots.push(n);
        } else {
          const parent = findNode(roots, parentId);
          if (!parent) return null;
          const n = makeNode(kind, title ?? fallbackTitle);
          created = n;
          parent.children.push(n);
          parent.collapsed = false;
        }
        set((s) => ({
          selectedNodeId: created?.id ?? null,
          novels: s.novels.map((x) => (x.id === novel.id ? touch({ ...x }) : x)),
        }));
        return created?.id ?? null;
      },

      updateNode: (section, id, patch) => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return;
        const roots = novel.sections[section];
        const target = findNode(roots, id);
        if (!target) return;
        Object.assign(target, patch, { updatedAt: Date.now() });
        set((s) => ({
          novels: s.novels.map((x) => (x.id === novel.id ? touch({ ...x }) : x)),
        }));
      },

      deleteNode: (section, id) => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return;
        const { nodes, removed, parentId } = removeFromNodes(
          novel.sections[section],
          id
        );
        if (!removed) return;
        novel.sections = { ...novel.sections, [section]: nodes };
        novel.trash = [
          { id: uid(), parentId, section, node: removed, deletedAt: Date.now() },
          ...novel.trash,
        ];
        const removedNode: NoteNode = removed;
        set((s) => ({
          selectedNodeId:
            s.selectedNodeId === id ||
            findNode([removedNode], s.selectedNodeId ?? "")
              ? null
              : s.selectedNodeId,
          novels: s.novels.map((x) => (x.id === novel.id ? touch({ ...x }) : x)),
        }));
      },

      moveNode: (section, id, dir) => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return;
        const roots = novel.sections[section];

        const swap = (list: NoteNode[]): boolean => {
          const i = list.findIndex((n) => n.id === id);
          if (i >= 0) {
            const j = dir === "up" ? i - 1 : i + 1;
            if (j < 0 || j >= list.length) return false;
            const copy = [...list];
            [copy[i], copy[j]] = [copy[j], copy[i]];
            list.length = 0;
            list.push(...copy);
            return true;
          }
          return list.some((n) => swap(n.children));
        };
        swap(roots);
        set((s) => ({
          novels: s.novels.map((x) => (x.id === novel.id ? touch({ ...x }) : x)),
        }));
      },

      /* ---------- trash ---------- */

      restoreFromTrash: (trashId) => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return;
        const item = novel.trash.find((t) => t.id === trashId);
        if (!item) return;
        if (item.parentId) {
          const parent = findNode(novel.sections[item.section], item.parentId);
          if (parent) {
            parent.children.push(item.node);
            parent.collapsed = false;
          } else {
            novel.sections[item.section].push(item.node);
          }
        } else {
          novel.sections[item.section].push(item.node);
        }
        novel.trash = novel.trash.filter((t) => t.id !== trashId);
        set((s) => ({
          novels: s.novels.map((x) => (x.id === novel.id ? touch({ ...x }) : x)),
        }));
      },

      deleteForever: (trashId) => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return;
        novel.trash = novel.trash.filter((t) => t.id !== trashId);
        set((s) => ({
          novels: s.novels.map((x) => (x.id === novel.id ? touch({ ...x }) : x)),
        }));
      },

      emptyTrash: () => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return;
        novel.trash = [];
        set((s) => ({
          novels: s.novels.map((x) => (x.id === novel.id ? touch({ ...x }) : x)),
        }));
      },

      /* ---------- codex ---------- */

      addCategory: (parentId, name) => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return;
        const cat: CodexCategory = {
          id: uid(),
          name: name.trim() || "New Folder",
          children: [],
          entries: [],
        };
        if (parentId === null) {
          novel.codex.push(cat);
        } else {
          const parent = findCategory(novel.codex, parentId);
          if (parent) {
            parent.children.push(cat);
          } else {
            novel.codex.push(cat);
          }
        }
        set((s) => ({
          novels: s.novels.map((x) => (x.id === novel.id ? touch({ ...x }) : x)),
        }));
      },

      renameCategory: (id, name) => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return;
        const cat = findCategory(novel.codex, id);
        if (cat) cat.name = name.trim() || cat.name;
        set((s) => ({
          novels: s.novels.map((x) => (x.id === novel.id ? touch({ ...x }) : x)),
        }));
      },

      deleteCategory: (id) => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return;
        const { cats, removed } = removeFromCategories(novel.codex, id);
        if (!removed) return;
        novel.codex = cats;
        // deleted entries' ids no longer selected
        const entryIds = new Set<string>();
        const collect = (c: CodexCategory) => {
          c.entries.forEach((e) => entryIds.add(e.id));
          c.children.forEach(collect);
        };
        collect(removed);
        set((s) => ({
          selectedCodexId: s.selectedCodexId && entryIds.has(s.selectedCodexId) ? null : s.selectedCodexId,
          novels: s.novels.map((x) => (x.id === novel.id ? touch({ ...x }) : x)),
        }));
      },

      addEntry: (categoryId, title) => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return null;
        const cat = findCategory(novel.codex, categoryId);
        if (!cat) return null;
        const e: CodexEntry = {
          id: uid(),
          title: title.trim() || "New Entry",
          content: "",
          aliases: [],
          entryType: "Human",
          status: "To Do",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        cat.entries.push(e);
        set((s) => ({
          selectedCodexId: e.id,
          novels: s.novels.map((x) => (x.id === novel.id ? touch({ ...x }) : x)),
        }));
        return e.id;
      },

      updateEntry: (id, patch) => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return;
        const found: { hit: boolean } = { hit: false };
        novel.codex = mapCategories(novel.codex, (c) => ({
          ...c,
          entries: c.entries.map((e) => {
            if (e.id === id) {
              found.hit = true;
              return { ...e, ...patch, updatedAt: Date.now() };
            }
            return e;
          }),
        }));
        if (found.hit) {
          set((s) => ({
            novels: s.novels.map((x) => (x.id === novel.id ? touch({ ...x }) : x)),
          }));
        }
      },

      deleteEntry: (id) => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return;
        mapCategories(novel.codex, (c) => {
          c.entries = c.entries.filter((e) => e.id !== id);
          return c;
        });
        set((s) => ({
          selectedCodexId: s.selectedCodexId === id ? null : s.selectedCodexId,
          novels: s.novels.map((x) => (x.id === novel.id ? touch({ ...x }) : x)),
        }));
      },

      findEntryCategory: (entryId) => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return null;
        let found: CodexCategory | null = null;
        const walk = (cats: CodexCategory[]) => {
          for (const c of cats) {
            if (c.entries.some((e) => e.id === entryId)) {
              found = c;
              return;
            }
            walk(c.children);
          }
        };
        walk(novel.codex);
        return found;
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      /* v0 → v1: original-style statuses, free-text labels instead of label ids */
      migrate: (persisted) => {
        const s = persisted as KachamakState;
        const OLD_DEFAULT_STATUSES = [
          "To Do",
          "First Draft",
          "Second Draft",
          "Revised",
          "Final",
        ];
        const RENAMES: Record<string, string> = {
          "Second Draft": "Revised Draft",
          Revised: "Revised Draft",
          Final: "Final Draft",
        };
        for (const n of s.novels ?? []) {
          let upgraded = false;
          if ((n.statuses ?? []).join("|") === OLD_DEFAULT_STATUSES.join("|")) {
            n.statuses = [...DEFAULT_STATUSES];
            upgraded = true;
          }
          const idToName = new Map((n.labels ?? []).map((l) => [l.id, l.name]));
          const walk = (nodes: NoteNode[]) => {
            for (const nd of nodes) {
              if (nd.label && idToName.has(nd.label)) nd.label = idToName.get(nd.label)!;
              if (upgraded && RENAMES[nd.status]) nd.status = RENAMES[nd.status];
              walk(nd.children);
            }
          };
          for (const roots of Object.values(n.sections ?? {})) walk(roots);
          for (const t of n.trash ?? []) walk([t.node]);
        }
        return s;
      },
      onRehydrateStorage: () => (state) => {
        // first run: seed with the demo novels
        if (state && state.novels.length === 0) {
          state.novels = seedNovels();
        }
      },
    }
  )
);

/* ---------- export helper (backup) ---------- */

export function exportNovelJson(novel: Novel): void {
  const blob = new Blob([JSON.stringify(novel, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${novel.title.replace(/[^\w\d-]+/g, "_")}-kachamak-backup.json`;
  a.click();
  URL.revokeObjectURL(url);
}
