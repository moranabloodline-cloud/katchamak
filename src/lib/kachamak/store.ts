"use client";
import { projectStorage, isWebSession, folderSaved } from "./session-storage";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  FamilyRelationship,
  NoteNode,
  Novel,
  SectionKey,
  TabKey,
  InspectorTabKey,
  TreeScope,
  ViewMode,
} from "./types";
import {novelSettingsPatch,validCoverImage,type NovelSettingsPatch} from "./project-settings";
import { SECTION_KEYS } from "./types";
import { newNovel, DEFAULT_STATUSES } from "./seed";
import { uid, findNode, findNodeInNovel } from "./utils";
import { cleanAliases, contentText, rebaseChoices, flattenNotes, validLinkChoices } from "./note-links";
import {DETAIL_BLOCKS,type DetailBlockKey,validHiddenDetailBlocks,validDetailBlockOrder} from './detail-blocks';
import {DEFAULT_PAGE_FORMAT,validNoteFontSize,validPageFormat,type PageFormat} from './page-format';
import {moveWorkspaceTabOrder,workspaceTabs,isWorkspaceTabHidden,revealWorkspaceTab,visibleTabLocation} from './workspace-tabs';
import {validDocumentTarget} from './document-target';
import {familyDeletionImpact,validFamilyMembers,validFamilyRelationships} from './family-tree';
import {relationshipKey,validKind} from './kinship';
import { isReadableProject } from './project-validation';
import { validEvent } from './story-calendar';

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

  /* Scrivener-style ruler above the title in the editor — the eye at its end
     hides it or shows it again (persisted preference) */
  rulerVisible: boolean;
  setRulerVisible: (v: boolean) => void;

  /* Split (kao u Scriveneru): dva nezavisna editora na radnoj površini.
     paneAId/paneBId = nota otvorena u levom/desnom editoru; activePane =
     površina koju je korisnik poslednja kliknuo — klik na notu u stablu/Gridu/
     Listi otvara je SAMO u njoj, druga ostaje ista; splitRatio = širina levog
     editora (0.2–0.8, menja se vučenjem razdelnika). Sve se čuva (persist),
     čita sa ?? default zbog starih sačuvanih store-ova. */
  paneAId: string | null;
  paneBId: string | null;
  activePane: "a" | "b";
  splitRatio: number;
  setActivePane: (p: "a" | "b") => void;
  setSplitRatio: (r: number) => void;

  /* Format page defaults shared by Write, Split and Continuous. The separate
     text toolbar writes inline styles to its selection, never to these defaults. */
  editorFont: string;
  editorSize: number;
  editorSpacing: string;
  editorSpellCheck: boolean;
  pageFormat: PageFormat;
  setPageFormat: (patch:Partial<PageFormat>) => void;
  setEditorSpellCheck: (enabled:boolean) => void;
  setEditorFont: (f: string) => void;
  setEditorSize: (n: number) => void;
  setEditorSpacing: (s: string) => void;

  /* Info tab Inspektora — koliko visine uzima Synopsis (0.15–0.85). Razdelnik
     između Synopsis i Notes se vuče (arhitektura §11); ?? 0.5 zbog starih
     sačuvanih store-ova. */
  infoSynopsisRatio: number;
  setInfoSynopsisRatio: (r: number) => void;

  /* per-panel zoom (Ctrl + scroll over a panel) — 0.5 … 2.0, korak 0.1;
     uvećava SADRŽINU panela (tekstovi, kartice, redovi), ne i trake/okvir —
     da linije trake 2 ostaju poravnate (persisted preference).
     Split površine imaju SVOJ odvojen zoom (paneAZoom/paneBZoom — po Nikoli
     09.11., svaka radna površina svoj zoom, lenjir u svakoj površini);
     null = još nije podešen → nasleđuje midZoom (bez skoka pri prelasku iz
     Write moda), prvi Ctrl+skrol nad površinom ga zauvek odvaja. */
  leftZoom: number;
  midZoom: number;
  rightZoom: number;
  paneAZoom: number | null;
  paneBZoom: number | null;
  setPanelZoom: (panel: "left" | "mid" | "right" | "paneA" | "paneB", v: number) => void;

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
  openNoteTab: (id: string) => void;
  moveWorkspaceTab: (projectId:string,from:TabKey,to:TabKey) => void;
  hideTab: (projectId:string,tab:TabKey) => void;
  setInspectorTabHidden: (projectId:string,tab:InspectorTabKey,hidden:boolean) => void;
  closeTab: (tab: TabKey) => void;
  showSection: (section: SectionKey) => void;
  changeFamilyRelationship: (projectId:string, treeId:string, relation:FamilyRelationship, remove?:boolean) => string | null;
  setTimeline: (patch: Partial<NonNullable<Novel['timeline']>>) => void;
  setView: (v: ViewMode) => void;
  setTreeScope: (s: TreeScope) => void;
  select: (id: string | null) => void;
  setRenamingNode: (id: string | null) => void;
  renameNovel: (title: string) => void;
  updateNovelSettings: (id:string,patch:NovelSettingsPatch) => boolean;
  setDefaultAuthor: (a: string) => void;

  /* status list (per novel, edited via the status dropdown "Edit…") */
  addStatus: (name: string) => void;
  removeStatus: (name: string) => void;

  /* notes */
  addNode: (
    section: SectionKey,
    parentId: string | null,
    kind?: NoteNode["kind"],
    title?: string,
    visibleRootBlocks?: DetailBlockKey[]
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
  restoreFromTrash: (trashId: string) => string | undefined;
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

export function isUsableBackup(value: unknown): value is LegacyNovel {
  return isReadableProject(value);
}

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
export function normalizeNovelSections(n: LegacyNovel): void {
  const secs: Record<string, NoteNode[] | undefined> = { ...(n.sections ?? {}) };
  for (const k of SECTION_KEYS) {
    if (!Array.isArray(secs[k])) secs[k] = [];
  }
  if (secs.codex!.length === 0 && Array.isArray(n.codex) && n.codex.length > 0) {
    secs.codex = n.codex.map(legacyCatToNode);
  }
  const timelineRoot=n.demo?.timelineRootId;
  if(timelineRoot&&!findNode(secs.timeline!,timelineRoot)) {
    const detach=(nodes:NoteNode[]):NoteNode|undefined=>{const index=nodes.findIndex(node=>node.id===timelineRoot);if(index>=0)return nodes.splice(index,1)[0];for(const node of nodes){const found=detach(node.children);if(found)return found;}};
    for(const key of SECTION_KEYS.filter(key=>key!=='timeline')){const found=detach(secs[key]!);if(found){secs.timeline!.push(found);break;}}
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
): { nodes: NoteNode[]; removed: NoteNode | null; parentId: string | null; originalIndex: number | null } {
  const found: { removed: NoteNode | null; parentId: string | null; originalIndex: number | null } = {
    removed: null,
    parentId: null,
    originalIndex: null,
  };
  const walk = (list: NoteNode[], pid: string | null): NoteNode[] => {
    const out: NoteNode[] = [];
    for (const [index, n] of list.entries()) {
      if (n.id === id) {
        found.removed = n;
        found.parentId = pid;
        found.originalIndex = index;
        continue;
      }
      out.push({ ...n, children: walk(n.children, n.id) });
    }
    return out;
  };
  const nodes2 = walk(nodes, null);
  return { nodes: nodes2, removed: found.removed, parentId: found.parentId, originalIndex: found.originalIndex };
}

function touch(novel: Novel): Novel {
  return { ...novel, updatedAt: Date.now() };
}

function resolveChoices(node: NoteNode) {
  return node.linkChoices?.length ? validLinkChoices(contentText(node.content),node.linkChoices) : [];
}

function preserveCodexLinks(novel: Novel) {
  for(const {node} of flattenNotes(novel)) node.linkChoices=resolveChoices(node);
}

function makeNode(kind: NoteNode["kind"], title: string): NoteNode {
  const now = Date.now();
  return {
    id: uid(),
    title,
    kind,
    bodyFontSize: 8,
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
      defaultAuthor: "",

      leftPanelOpen: true,
      rightPanelOpen: true,
      rulerVisible: true,

      paneAId: null,
      paneBId: null,
      activePane: "a",
      splitRatio: 0.5,

      editorFont: "Segoe UI",
      editorSize: 16,
      editorSpacing: "1.5",
      pageFormat: {...DEFAULT_PAGE_FORMAT},
      setPageFormat: patch => set(state=>{const next={...DEFAULT_PAGE_FORMAT,...state.pageFormat,...patch};return validPageFormat(next)?{pageFormat:next}:{};}),
      editorSpellCheck: true,
      setEditorSpellCheck: (enabled) => set({editorSpellCheck:enabled}),
      setEditorFont: (f) => set({ editorFont: f }),
      setEditorSize: (n) => set({ editorSize: n }),
      setEditorSpacing: (sp) => set({ editorSpacing: sp }),

      infoSynopsisRatio: 0.5,
      setInfoSynopsisRatio: (r) =>
        set({
          infoSynopsisRatio:
            Math.round(Math.min(0.85, Math.max(0.15, r)) * 1000) / 1000,
        }),

      leftZoom: 1,
      midZoom: 1,
      rightZoom: 1,
      paneAZoom: null,
      paneBZoom: null,

      leftPanelWidth: 256,
      rightPanelWidth: 288,
      setLeftPanelWidth: (px) =>
        set({ leftPanelWidth: Math.round(Math.min(560, Math.max(240, px))) }),
      setRightPanelWidth: (px) =>
        set({ rightPanelWidth: Math.round(Math.min(680, Math.max(190, px))) }),

      toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
      toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),

      setRulerVisible: (v) => set({ rulerVisible: v }),

      /* klik na površinu je bira: inspector, brojač na dnu i highlight u stablu
         prate fokusirani editor (kao u Scriveneru); dok je površina prazna,
         ostaje poslednja selekcija */
      setActivePane: (p) =>
        set((s) => ({
          activePane: p,
          selectedNodeId: (p === "a" ? s.paneAId : s.paneBId) ?? s.selectedNodeId,
        })),

      setSplitRatio: (r) =>
        set({ splitRatio: Math.round(Math.min(0.8, Math.max(0.2, r)) * 1000) / 1000 }),

      setPanelZoom: (panel, v) => {
        const z = Math.round(Math.min(2, Math.max(0.5, v)) * 100) / 100;
        set(
          panel === "left"
            ? { leftZoom: z }
            : panel === "mid"
              ? { midZoom: z }
              : panel === "right"
                ? { rightZoom: z }
                : panel === "paneA"
                  ? { paneAZoom: z }
                  : { paneBZoom: z }
        );
      },

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
          paneAId: null,
          paneBId: null,
          /* view stays on the last active mode — never reset it */
        }));
      },

      importNovel: (json) => {
        try {
          const input = JSON.parse(json);
          const parsed: unknown = input?.format === "katchamak-project" && input?.version === 1 ? input.novel : input;
          if (!isUsableBackup(parsed)) {
            return { ok: false, error: "Not a Kachamak novel backup." };
          }
          const n: LegacyNovel = {
            ...parsed,
            id: uid(), // never collide with existing ids
            author: parsed.author ?? "",
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
            paneAId: null,
            paneBId: null,
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
        set({
          activeNovelId: id,
          activeTab: "binder",
          selectedNodeId: null,
          paneAId: null,
          paneBId: null,
        }),

      closeNovel: () =>
        set({ activeNovelId: null, selectedNodeId: null, paneAId: null, paneBId: null }),

      /* ---------- workspace ---------- */

      /* prelazak na drugi tab NE menja radnu površinu — selekcija ostaje
         (editor toolbar i desni panel drže tekuću notu) dok korisnik ne klikne
         novu note u levom panelu; čisti se samo inline preimenovanje (po Nikoli) */
      setTab: (tab) => set(s => ({ activeTab: tab, renamingNodeId: null, ...(tab==="timeline"?{view:"timeline" as const}:(s.activeTab==="timeline"&&s.view==="timeline" || tab!=='family' && s.view==='family')?{view:"write" as const}:{}),
        ...(s.novels.some(n=>n.id===s.activeNovelId && isWorkspaceTabHidden(n,tab))
          ? {novels:s.novels.map(n=>n.id===s.activeNovelId?touch(revealWorkspaceTab(n,tab)):n)} : {})
      })),
      openNoteTab: (id) => {
        const novel=get().novels.find(n=>n.id===get().activeNovelId);
        if(!novel || !findNodeInNovel(novel,id)) return;
        set(s=>({novels:s.novels.map(n=>n.id===novel.id?touch({...revealWorkspaceTab(n,`note:${id}`),openNoteTabs:[...new Set([...(n.openNoteTabs||[]),id])]}):n),activeTab:`note:${id}`,renamingNodeId:null}));
      },
      moveWorkspaceTab: (projectId,from,to)=>set(s=>{
        if(s.activeNovelId!==projectId)return s;
        const novel=s.novels.find(n=>n.id===projectId);if(!novel)return s;
        const tabOrder=moveWorkspaceTabOrder(novel,from,to);if(!tabOrder)return s;
        return {novels:s.novels.map(n=>n.id===projectId?touch({...n,tabOrder}):n)};
      }),
      setInspectorTabHidden: (projectId,tab,hidden) => set(s=>{
        const novel=s.novels.find(n=>n.id===projectId);
        if(!novel || s.activeNovelId!==projectId)return s;
        const current=novel.hiddenInspectorTabs??[];
        if(current.includes(tab)===hidden)return s;
        const hiddenInspectorTabs=hidden?[...current,tab]:current.filter(key=>key!==tab);
        return {novels:s.novels.map(n=>n===novel?touch({...n,hiddenInspectorTabs}):n)};
      }),
      hideTab: (projectId,tab) => set(s=>{
        const novel=s.novels.find(n=>n.id===projectId);
        if(projectId!==s.activeNovelId||!novel||!workspaceTabs(novel).some(t=>t.key===tab))return s;
        const updated=touch({...novel,hiddenTabs:[...(novel.hiddenTabs??[]),tab]});
        return {novels:s.novels.map(n=>n===novel?updated:n),
          ...(s.activeTab===tab?{...visibleTabLocation(updated,tab,s.view),renamingNodeId:null}:{})};
      }),
      closeTab: (tab) => {
        if(['binder','codex','timeline','trash'].includes(tab)) return;
        set(s=>({novels:s.novels.map(n=>n.id===s.activeNovelId?touch({...n,...(tab.startsWith('note:')?{openNoteTabs:(n.openNoteTabs||[]).filter(id=>id!==tab.slice(5))}:{hiddenSections:[...new Set([...(n.hiddenSections||[]),tab as SectionKey])]})}):n),activeTab:s.activeTab===tab?'binder':s.activeTab}));
      },
      showSection: (section) => set(s=>({...(section==='family'?{view:'family' as const,selectedNodeId:s.novels.find(n=>n.id===s.activeNovelId)?.sections.family?.find(n=>!n.hidden)?.id??null}:{}),novels:s.novels.map(n=>n.id===s.activeNovelId?touch(revealWorkspaceTab(n,section)):n),activeTab:section})),
      changeFamilyRelationship: (projectId,treeId,relation,remove=false) => {
        const state=get(), novel=state.novels.find(n=>n.id===projectId);
        const tree=novel && findNode(novel.sections.family,treeId);
        if(!novel || state.activeNovelId!==projectId || !tree || ![relation.from,relation.to].every(id=>tree.familyMembers?.includes(id) && findNode(novel.sections.codex,id)))return 'Choose two people in this tree.';
        if(relation.from===relation.to)return 'Choose two different people.';
        if(!validKind(relation))return 'Choose a relationship or enter a valid name.';
        const existing=novel.familyRelationships??[];
        const key=relationshipKey(relation);
        const same=(edge:typeof relation)=>relationshipKey(edge)===key;
        if(!remove && existing.some(same))return 'This relationship already exists.';
        const next=remove ? existing.filter(edge=>!same(edge)) : [...existing,relation];
        if(!validFamilyRelationships(next))return 'A person cannot be their own ancestor.';
        // Removing a shared link explicitly also cancels its restoration from older tree snapshots.
        const trash = remove ? novel.trash.map(item => item.familyRelationships?.some(same)
          ? {...item, familyRelationships:item.familyRelationships.filter(edge => !same(edge))}
          : item) : novel.trash;
        set({novels:state.novels.map(n=>n===novel?touch({...novel,trash,familyRelationships:next}):n)});
        return null;
      },
      setTimeline: (patch) => set(s=>({novels:s.novels.map(n=>n.id===s.activeNovelId?touch({...n,timeline:{rootId:null,detail:'synopsis',compact:false,...n.timeline,...patch}}):n)})),

      /* ulazak u Split (prvi put, kad paneli još nemaju note — kao u
         Scriveneru): oba editora kloniraju trenutno otvorenu notu; ako su
         paneli već bili raspoređeni, ostaje poslednje stanje iz njih */
      setView: (v) =>
        set((s) =>
          v === "split" && s.paneAId === null && s.paneBId === null
            ? { view: v, paneAId: s.selectedNodeId, paneBId: s.selectedNodeId }
            : { view: v }
        ),

      setTreeScope: (s) => set({ treeScope: s }),

      /* klik na notu otvara je u FOKUSIRANOM editoru (activePane) — drugi
         editor zadržava svoju notu (po Nikoli, kao u Scriveneru) */
      select: (id) =>
        set((s) => ({
          selectedNodeId: id,
          paneAId: s.activePane === "a" ? id : s.paneAId,
          paneBId: s.activePane === "b" ? id : s.paneBId,
        })),

      setRenamingNode: (id) => set({ renamingNodeId: id }),

      updateNovelSettings: (id,patch) => {
        const novel=get().novels.find(n=>n.id===id);if(!novel)return false;
        const values=novelSettingsPatch(novel,patch);if(!values)return false;
        set(s=>({novels:s.novels.map(n=>n.id===id?touch({...n,...values}):n)}));return true;
      },

      renameNovel: (title) =>
        set((s) => ({
          novels: s.novels.map((n) =>
            n.id === s.activeNovelId ? touch({ ...n, title: title.trim() || n.title }) : n
          ),
        })),

      setDefaultAuthor: (a) => set({ defaultAuthor: a }),

      /* ---------- notes ---------- */

      addNode: (section, parentId, kind, title, visibleRootBlocks = []) => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return null;
        const roots = novel.sections[section];
        let created: NoteNode | null = null;

        /* free hierarchy — every new note is the same thing; the user names it
           (inline rename opens right away), picks its icon and its colour */
        const n = makeNode(kind ?? "doc", title ?? "Untitled");
        if (parentId === null) {
          n.hiddenDetailBlocks = DETAIL_BLOCKS.map(block => block.key).filter(key => !visibleRootBlocks.includes(key));
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
          paneAId: s.activePane === "a" ? (created?.id ?? s.paneAId) : s.paneAId,
          paneBId: s.activePane === "b" ? (created?.id ?? s.paneBId) : s.paneBId,
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
        if(patch.ignoreAutoLinking !== undefined && typeof patch.ignoreAutoLinking !== 'boolean')return;
        if(!validFamilyMembers(patch.familyMembers))return;
        if(patch.event!==undefined&&!validEvent(patch.event))return;
        if(patch.timelineKind!==undefined&&patch.timelineKind!=="event"&&patch.timelineKind!=="period")return;
        if (!validCoverImage(patch.image)||!validDocumentTarget(patch.documentTarget)) return;
        if (!validNoteFontSize(patch.bodyFontSize) || !validHiddenDetailBlocks(patch.hiddenDetailBlocks)) return;
        if (!validHiddenDetailBlocks(patch.collapsedDetailBlocks)||!validDetailBlockOrder(patch.detailBlockOrder)) return;
        if (Object.entries(patch).every(([key,value]) => target[key as keyof NoteNode] === value)) return;
        if(section==='codex' && (patch.title!==undefined || patch.aliases!==undefined)) preserveCodexLinks(novel);
        if(patch.content !== undefined && patch.linkChoices === undefined && target.linkChoices?.length) {
          patch = {...patch,linkChoices:rebaseChoices(contentText(target.content),contentText(patch.content),target.linkChoices)};
        }
        if(patch.aliases) patch = {...patch,aliases:cleanAliases(patch.aliases,patch.title ?? target.title)};
        Object.assign(target, patch, { updatedAt: Date.now() });
        if(patch.content !== undefined) target.linkChoices=resolveChoices(target);
        set((s) => ({
          novels: s.novels.map((x) => (x.id === novel.id ? touch({ ...x }) : x)),
        }));
      },

      deleteNode: (section, id) => {
        const novel = get().novels.find((n) => n.id === get().activeNovelId);
        if (!novel) return;
        if(section==='codex') preserveCodexLinks(novel);
        const { nodes, removed, parentId, originalIndex } = removeFromNodes(
          novel.sections[section],
          id
        );
        if (!removed) return;
        const impact = section === 'family' ? familyDeletionImpact(novel, id) : undefined;
        if (impact?.exclusive.size) {
          novel.familyRelationships = novel.familyRelationships!.filter(edge => !impact.exclusive.has(edge));
        }
        novel.sections = { ...novel.sections, [section]: nodes };
        novel.trash = [
          { id: uid(), parentId, section, node: removed, deletedAt: Date.now(), originalIndex: originalIndex ?? undefined,
            ...(impact?.related.length ? {familyRelationships:impact.related} : {}) },
          ...novel.trash,
        ];
        const removedNode: NoteNode = removed;
        set((s) => {
          const gone = (nid: string | null): boolean =>
            !!nid && (nid === id || !!findNode([removedNode], nid));
          return {
            selectedNodeId: gone(s.selectedNodeId) ? null : s.selectedNodeId,
            paneAId: gone(s.paneAId) ? null : s.paneAId,
            paneBId: gone(s.paneBId) ? null : s.paneBId,
            renamingNodeId:
              s.renamingNodeId &&
              (s.renamingNodeId === id || findNode([removedNode], s.renamingNodeId))
                ? null
                : s.renamingNodeId,
            novels: s.novels.map((x) => (x.id === novel.id ? touch({ ...x }) : x)),
          };
        });
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
        if(fromSection==='codex' && destSection!=='codex') preserveCodexLinks(novel);
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
        if(section==='codex') preserveCodexLinks(novel);
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
        if (item.section === 'family' && item.familyRelationships?.length) {
          const live = novel.familyRelationships ?? [];
          const keys = new Set(live.map(relationshipKey));
          const merged = [...live, ...item.familyRelationships.filter(edge => !keys.has(relationshipKey(edge)))];
          if (!validFamilyRelationships(merged)) {
            return 'Restoring this tree would create a loop in the current ancestry. Review the parent links and try again. The tree is still in Trash.';
          }
          novel.familyRelationships = merged;
        }
        const restoreAtOriginalPosition = (list: NoteNode[]) => {
          if (typeof item.originalIndex === "number" && Number.isInteger(item.originalIndex) && item.originalIndex >= 0) {
            list.splice(Math.min(item.originalIndex, list.length), 0, item.node);
          } else {
            list.push(item.node);
          }
        };
        if (item.parentId) {
          const parent = findNode(novel.sections[item.section], item.parentId);
          if (parent) {
            restoreAtOriginalPosition(parent.children);
            parent.collapsed = false;
          } else {
            novel.sections[item.section].push(item.node);
          }
        } else {
          restoreAtOriginalPosition(novel.sections[item.section]);
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
      version: 39,
      storage: createJSONStorage(() => projectStorage),
      /* v0 → v1: original-style statuses, free-text labels instead of label ids
         v2 → v3: every note gets its icon + colour (like the original app —
         acts and chapters as solid coloured folders)
         v3 → v4: everything is a NOTE on every tab — the old Codex
         categories/entries become plain notes in the Codex section
         v4 → v5: the Grid view becomes the Corkboard (Scrivener index cards)
         v5 → v6: older Trash items have no recorded position and keep the old append behavior
         v6 → v7: Details tab — optional links to Codex notes on NoteNode
         (no data migration; older stores simply lack the field) */
      migrate: (persisted, version) => {
        const s = persisted as KachamakState;
        if(version<39){ /* Earlier notes keep their page font size and saved Details layout. */ }
        if(version<38){ /* Missing inspector preferences show every tab, without rewriting books. */ }
        if(version<37){ /* Existing books retain their tab order and legacy hidden sections. */ }
        if(version<36){ /* Notes without an explicit opt-out remain automatic link targets. */ }
        if(version<35){ /* Earlier Trash items have no saved family links. */ }
        if(version<34){ /* Existing three-block layouts are valid; Timeline is added at display time. */ }
        if(version<33){ /* Existing parent and partner records retain their original terms and endpoints. */ }
        if(version<32){for(const novel of s.novels??[])if(novel.sections && novel.sections.family===undefined)novel.sections.family=[];}
        if(version<31){ /* Optional undated Timeline types and date precision; preserve all saved dates. */ }
        if(version<30){ /* Optional era colours; existing eras keep the default without changing dates. */ }
        if(version<29){if(typeof s.editorSpellCheck!=='boolean')s.editorSpellCheck=true;}
        if(version<28){ /* Optional per-note document targets; existing notes have no target. */ }
        if(version<27){ /* Optional per-project tab order; keep existing notes and the default order. */ }
        if(version<26){if(!validPageFormat(s.pageFormat))s.pageFormat={...DEFAULT_PAGE_FORMAT};}
        if(version<25){ /* Optional Details order/collapse; existing notes remain expanded in their original order. */ }
        if(version<24){ /* Optional per-note block visibility; preserve all existing content. */ }
        if(version<23){ /* Optional note image; existing notes remain untouched. */ }
        // v17: explicit Event/Time Period metadata is optional. Legacy date ranges are interpreted without rewriting them.
        if(version<22){if(typeof s.editorSpellCheck!=='boolean')s.editorSpellCheck=true;}
        if(version<21){ /* Optional audience and writing metadata; preserve manuscripts. */ }

        if(version<20){ /* Optional book metadata; no content or chapters are invented. */ }

        if(version<19){ /* Optional card style; existing banners remain visible. */ }

        if(version<18){ /* Optional per-event card appearance; preserve existing dates/content. */ }

        if(version<17){ /* Existing dates and content stay intact. */ }
        // v16: Timeline owns a note section. Move the known demo root with IDs and links intact.
        if(version<16){for(const novel of s.novels??[])normalizeNovelSections(novel);}

        // v15: demo edition/source identity is optional; publishing updates only the authorized source project.
        if(version<15){ /* No local project transformation. */ }
        // v14: demo provenance is optional. Never replace or seed projects during storage migration.
        if(version<14){ /* Demo copies are installed separately through authenticated cloud storage. */ }
        // v13: optional Timeline card banners; old events stay unchanged without an image.
        if(version<13){ /* No banner is invented or copied into existing events. */ }
        // v12: Continuous is an explicit view; Write stays single-note. The removed tree menu defaults to all.
        if(version<12){s.treeScope='all';}
        // v11: time-system eras, moons, display and range are optional. Preserve all event minutes.
        if(version<11){ /* Existing calendars retain their original arithmetic and presentation. */ }
        // v10: project metadata/cover are optional; old manuscripts and cover icons stay intact.
        if(version<10){ /* Missing metadata means no series, no uploaded cover, and an active project. */ }
        // v9: calendar and event dates are optional. Never invent dates for old notes.
        if (version < 9) {
          // No transformation: existing Timeline preferences and manuscript order remain intact.
        }
        // v8 adds optional aliases, occurrence choices, folder tabs and Timeline
        // preferences. Existing manuscripts and the previous migrations stay intact.
        if (version < 8) {
          const visit = (nodes: NoteNode[]) => { for(const node of nodes??[]) { node.aliases ??= [];visit(node.children); } };
          for (const n of s.novels ?? []) { n.openNoteTabs ??= []; n.hiddenSections ??= []; for(const nodes of Object.values(n.sections??{}))visit(nodes);for(const item of n.trash??[])visit([item.node]); }
        }
        // Version 6 only adds optional Trash metadata. Do not rerun older
        // migrations on an already migrated version 5 library.
        if (version >= 5) return s;
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

    }
  )
);

/** Check that all current project data actually matches browser storage. */
export function projectsSavedLocally(): boolean {
  if (isWebSession()) return folderSaved();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const stored = JSON.parse(raw) as { state?: { novels?: unknown } };
    return Array.isArray(stored.state?.novels) &&
      JSON.stringify(stored.state.novels) === JSON.stringify(useKachamak.getState().novels);
  } catch {
    return false;
  }
}

/** Retry the normal persist write, then verify its contents before reporting success. */
export function saveProjectsLocally(): boolean {
  if (isWebSession()) return folderSaved();
  try {
    useKachamak.setState({});
    return projectsSavedLocally();
  } catch {
    return false;
  }
}

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
