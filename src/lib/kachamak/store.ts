"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  NoteNode,
  Novel,
  SectionKey,
  TabKey,
  TreeScope,
  ViewMode,
} from "./types";
import { SECTION_KEYS } from "./types";
import { newNovel, seedNovels, DEFAULT_STATUSES } from "./seed";
import { uid, findNode } from "./utils";

interface KachamakState {
  novels: Novel[];
  activeNovelId: string | null;
  activeTab: TabKey;
  selectedNodeId: string | null;
  /* the note currently being renamed inline in the tree (also set right after create) */
  renamingNodeId: string | null;
  view: ViewMode;
  /* top-bar dropdown — which level of the tree is shown */
  treeScope: TreeScope;
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
  setSubtreeCollapsed: (section: SectionKey, id: string, collapsed: boolean) => void;

  /* library */
  createNovel: (title: string, author: string) => void;
  importNovel: (json: string) => { ok: boolean; error?: string };
  deleteNovel: (id: string) => void;
  openNovel: (id: string) => void;
  closeNovel: () => void;

  /* workspace */
  setTab: (tab: TabKey) => void;
  setView: (v: ViewMode) => void;
  setTreeScope: (s: TreeScope) => void;
  select: (id: string | null) => void;
  setRenamingNode: (id: string | null) => void;
  renameNovel: (title: string) => void;
  setDefaultAuthor: (a: string) => void;

  /* status list (per novel, edited via the status dropdown "Edit…") */
  addStatus: (name: string) => void;
  removeStatus: (name: string) => void;

  /* notes */
  addNode: (
    section: SectionKey,
    parentId: string | null,
    kind?: NoteNode["kind"],
    title?: string
  ) => string | null;
  updateNode: (section: SectionKey, id: string, patch: Partial<NoteNode>) => void;
  deleteNode: (section: SectionKey, id: string) => void;
  moveNode: (section: SectionKey, id: string, dir: "up" | "down") => void;
  moveNodeTo: (
    fromSection: SectionKey,
    id: string,
    destSection: SectionKey,
    destParentId: string | null,
    destIndex?: number
  ) => void;
  duplicateNode: (section: SectionKey, id: string) => void;
  sortChildren: (
    section: SectionKey,
    id: string,
    mode: "title-asc" | "title-desc" | "created-asc" | "created-desc"
  ) => void;

  /* trash */
  restoreFromTrash: (trashId: string) => void;
  deleteForever: (trashId: string) => void;
  emptyTrash: () => void;
}

/* ---------- legacy codex (pre-unification data) ---------- */

interface LegacyCodexEntry {
  id: string;
  title: string;
  content: string;
  aliases: string[];
  entryType: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}

interface LegacyCodexCategory {
  id: string;
  name: string;
  children: LegacyCodexCategory[];
  entries: LegacyCodexEntry[];
}

type LegacyNovel = Novel & { codex?: LegacyCodexCategory[] };

const LEGACY_CAT_ICONS: [RegExp, string][] = [
  [/^char/i, "users"],
  [/^loc/i, "map-pin"],
  [/^thing/i, "diamond"],
  [/^lore/i, "scroll"],
];

/* turn an old codex category (with its entries) into a plain note subtree */
function legacyCatToNode(cat: LegacyCodexCategory): NoteNode {
  const now = Date.now();
  const icon = LEGACY_CAT_ICONS.find(([re]) => re.test(cat.name))?.[1] ?? "folder";
  return {
    id: uid(),
    title: cat.name,
    kind: "folder",
    synopsis: "",
    content: "",
    notes: "",
    status: "",
    label: "",
    icon,
    createdAt: now,
    updatedAt: now,
    children: [
      ...cat.children.map(legacyCatToNode),
      ...cat.entries.map((e) => ({
        id: uid(),
        title: e.title,
        kind: "doc" as const,
        synopsis: "",
        content: e.content ?? "",
        notes: "",
        status: e.status ?? "",
        label: e.entryType ?? "",
        createdAt: e.createdAt ?? now,
        updatedAt: e.updatedAt ?? now,
        children: [] as NoteNode[],
      })),
    ],
  };
}

/* make sure a novel has every section (older backups may miss keys) and convert
   its legacy codex array into plain notes in the Codex section */
function normalizeNovelSections(n: LegacyNovel): void {
  const secs: Record<string, NoteNode[] | undefined> = { ...(n.sections ?? {}) };
  for (const k of SECTION_KEYS) {
    if (!Array.isArray(secs[k])) secs[k] = [];
  }
  if (secs.codex!.length === 0 && Array.isArray(n.codex) && n.codex.length > 0) {
    secs.codex = n.codex.map(legacyCatToNode);
  }
  n.sections = secs as Novel["sections"];
  delete n.codex;
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
      renamingNodeId: null,
      view: "split",
      treeScope: "all",
      defaultAuthor: "Nikola Djokovic",

      leftPanelOpen: true,
      rightPanelOpen: true,

      leftPanelWidth: 256,
      rightPanelWidth: 288,
      setLeftPanelWidth: (px) =>
        set({ leftPanelWidth: Math.round(Math.min(560, Math.max(240, px))) }),
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

      /* Collapse all / Expand all in the note menu — the note and every descendant */
      setSubtreeCollapsed: (section, id, collapsed) => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return;
        const target = findNode(novel.sections[section], id);
        if (!target) return;
        const apply = (n: NoteNode) => {
          n.collapsed = collapsed;
          n.children.forEach(apply);
        };
        apply(target);
        set((s) => ({
          novels: s.novels.map((x) => (x.id === novel.id ? touch({ ...x }) : x)),
        }));
      },

      /* ---------- library ---------- */

      createNovel: (title, author) => {
        const n = newNovel(title, author || get().defaultAuthor);
        set((s) => ({
          novels: [...s.novels, n],
          activeNovelId: n.id,
          activeTab: "binder",
          selectedNodeId: null,
          /* view stays on the last active mode — never reset it */
        }));
      },

      importNovel: (json) => {
        try {
          const parsed = JSON.parse(json) as LegacyNovel;
          if (!parsed || typeof parsed !== "object" || !parsed.title) {
            return { ok: false, error: "Not a Kachamak novel backup." };
          }
          const n: LegacyNovel = {
            ...parsed,
            id: uid(), // never collide with existing ids
            trash: parsed.trash ?? [],
            statuses: parsed.statuses ?? [],
            labels: parsed.labels ?? [],
          };
          normalizeNovelSections(n);
          set((s) => ({
            novels: [...s.novels, n as Novel],
            activeNovelId: n.id,
            activeTab: "binder",
            selectedNodeId: null,
            /* view stays on the last active mode — never reset it */
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
        set({ activeNovelId: id, activeTab: "binder", selectedNodeId: null }),

      closeNovel: () => set({ activeNovelId: null, selectedNodeId: null }),

      /* ---------- workspace ---------- */

      setTab: (tab) =>
        set({ activeTab: tab, selectedNodeId: null, renamingNodeId: null }),

      setView: (v) => set({ view: v }),

      setTreeScope: (s) => set({ treeScope: s }),

      select: (id) => set({ selectedNodeId: id }),

      setRenamingNode: (id) => set({ renamingNodeId: id }),

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

        /* free hierarchy — every new note is the same thing; the user names it
           (inline rename opens right away), picks its icon and its colour */
        const n = makeNode(kind ?? "doc", title ?? "Untitled");
        if (parentId === null) {
          created = n;
          roots.push(n);
        } else {
          const parent = findNode(roots, parentId);
          if (!parent) return null;
          created = n;
          parent.children.push(n);
          parent.collapsed = false;
        }
        set((s) => ({
          selectedNodeId: created?.id ?? null,
          renamingNodeId: created?.id ?? null,
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
          renamingNodeId:
            s.renamingNodeId &&
            (s.renamingNodeId === id || findNode([removedNode], s.renamingNodeId))
              ? null
              : s.renamingNodeId,
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

      /* Move — the note becomes the last child of the destination (or a section root) */
      moveNodeTo: (fromSection, id, destSection, destParentId, destIndex) => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return;
        const fromRoots = novel.sections[fromSection];
        const moving = findNode(fromRoots, id);
        if (!moving) return;
        /* never move a note into itself or one of its own sub-pages */
        if (
          destSection === fromSection &&
          destParentId &&
          (destParentId === id || findNode([moving], destParentId))
        )
          return;
        const { nodes, removed } = removeFromNodes(fromRoots, id);
        if (!removed) return;
        novel.sections = { ...novel.sections, [fromSection]: nodes };
        /* destIndex (optional): insertion position in the post-removal list —
           the Corkboard computes it against the array without the dragged note */
        const spliceOrPush = (list: NoteNode[]) => {
          if (typeof destIndex === "number") {
            const idx = Math.max(0, Math.min(destIndex, list.length));
            list.splice(idx, 0, removed);
          } else {
            list.push(removed);
          }
        };
        if (destParentId) {
          const parent = findNode(novel.sections[destSection], destParentId);
          if (parent) {
            spliceOrPush(parent.children);
            parent.collapsed = false;
          } else {
            spliceOrPush(novel.sections[destSection]);
          }
        } else {
          spliceOrPush(novel.sections[destSection]);
        }
        set((s) => ({
          novels: s.novels.map((x) => (x.id === novel.id ? touch({ ...x }) : x)),
        }));
      },

      /* deep-copy the note (with all sub-pages) right below the original */
      duplicateNode: (section, id) => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return;
        const roots = novel.sections[section];
        if (!findNode(roots, id)) return;
        const deep = (n: NoteNode): NoteNode => ({
          ...n,
          id: uid(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          children: n.children.map(deep),
        });
        const insertAfter = (list: NoteNode[]): boolean => {
          const i = list.findIndex((n) => n.id === id);
          if (i >= 0) {
            list.splice(i + 1, 0, deep(list[i]));
            return true;
          }
          return list.some((n) => insertAfter(n.children));
        };
        insertAfter(roots);
        set((s) => ({
          novels: s.novels.map((x) => (x.id === novel.id ? touch({ ...x }) : x)),
        }));
      },

      /* sort sub-pages of a note — title A→Z / Z→A, oldest or newest first */
      sortChildren: (section, id, mode) => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return;
        const roots = novel.sections[section];
        const target = findNode(roots, id);
        const list = target ? target.children : roots;
        if (!target || list.length === 0) return;
        const byTitle = (a: NoteNode, b: NoteNode) =>
          a.title.localeCompare(b.title, undefined, {
            sensitivity: "base",
            numeric: true,
          });
        list.sort((a, b) => {
          switch (mode) {
            case "title-desc":
              return byTitle(b, a);
            case "created-asc":
              return a.createdAt - b.createdAt;
            case "created-desc":
              return b.createdAt - a.createdAt;
            default:
              return byTitle(a, b);
          }
        });
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
    }),
    {
      name: STORAGE_KEY,
      version: 5,
      storage: createJSONStorage(() => localStorage),
      /* v0 → v1: original-style statuses, free-text labels instead of label ids
         v2 → v3: every note gets its icon + colour (like the original app —
         acts and chapters as solid coloured folders)
         v3 → v4: everything is a NOTE on every tab — the old Codex
         categories/entries become plain notes in the Codex section
         v4 → v5: the Grid view becomes the Corkboard (Scrivener index cards) */
      migrate: (persisted) => {
        const s = persisted as KachamakState;
        if ((s as { view?: string }).view === "grid") s.view = "corkboard";
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
        for (const n of (s.novels ?? []) as LegacyNovel[]) {
          let upgraded = false;
          if ((n.statuses ?? []).join("|") === OLD_DEFAULT_STATUSES.join("|")) {
            n.statuses = [...DEFAULT_STATUSES];
            upgraded = true;
          }
          const idToName = new Map((n.labels ?? []).map((l) => [l.id, l.name]));
          const nameToColor = new Map((n.labels ?? []).map((l) => [l.name, l.color]));
          /* act palette like the original screenshot: gold / green / purple … */
          const ACT_PALETTE = [
            { act: "#e3c567", chapter: "#c69c6d" },
            { act: "#8ab661", chapter: "#699bdd" },
            { act: "#a371f7", chapter: "#c084fc" },
          ];
          let actIndex = -1;
          const walk = (nodes: NoteNode[], chapterColor?: string) => {
            for (const nd of nodes) {
              if (nd.label && idToName.has(nd.label)) nd.label = idToName.get(nd.label)!;
              if (!nd.color && nd.label && nameToColor.has(nd.label)) {
                nd.color = nameToColor.get(nd.label)!;
              }
              if (upgraded && RENAMES[nd.status]) nd.status = RENAMES[nd.status];
              /* give every container-like note the solid folder icon + colours */
              if (!nd.icon && (nd.kind === "act" || nd.kind === "chapter" || nd.kind === "folder")) {
                nd.icon = "folder";
              }
              let chColor: string | undefined;
              if (!nd.color && nd.kind === "act") {
                actIndex += 1;
                const pal = ACT_PALETTE[actIndex % ACT_PALETTE.length];
                nd.color = pal.act;
                chColor = pal.chapter;
              }
              if (!nd.color && nd.kind === "chapter" && chapterColor) {
                nd.color = chapterColor;
              }
              walk(nd.children, nd.kind === "act" ? chColor : undefined);
            }
          };
          normalizeNovelSections(n);
          for (const roots of Object.values(n.sections)) {
            actIndex = -1;
            walk(roots);
          }
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

/* export a single note (with its sub-pages) from the 3-dots menu */
export function exportNoteJson(novelTitle: string, node: NoteNode): void {
  const payload = {
    type: "kachamak-note",
    novel: novelTitle,
    exportedAt: new Date().toISOString(),
    note: node,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${node.title.replace(/[^\w\d-]+/g, "_")}-note.json`;
  a.click();
  URL.revokeObjectURL(url);
}
