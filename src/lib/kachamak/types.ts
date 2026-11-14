import type { StoryEvent, TimelinePreferences } from './story-calendar';
/* every tab is the same note system — Codex included */
export type SectionKey =
  | "binder"
  | "codex"
  | "planning"
  | "research"
  | "templates"
  | "prompts";

export const SECTION_KEYS: SectionKey[] = [
  "binder",
  "codex",
  "planning",
  "research",
  "templates",
  "prompts",
];

export type TabKey = SectionKey | "trash" | `note:${string}`;

export interface LinkChoice {
  start: number;
  end: number;
  text: string;
  targetId: string | null; // null explicitly skips this occurrence
}

export const TABS: { key: TabKey; label: string }[] = [
  { key: "binder", label: "Binder" },
  { key: "codex", label: "Codex" },
  { key: "planning", label: "Planning" },
  { key: "research", label: "Research" },
  { key: "templates", label: "Templates" },
  { key: "prompts", label: "Prompts" },
  { key: "trash", label: "Trash" },
];

/* legacy kinds kept only for old data — new notes are always "doc" and the user
   decides the name, icon and colour themselves (free hierarchy) */
export type NodeKind = "act" | "chapter" | "scene" | "folder" | "doc";

export interface NoteNode {
  id: string;
  title: string;
  kind: NodeKind;
  synopsis: string;
  content: string; // rich text (HTML)
  notes: string;
  status: string; // "" = none
  label: string; // free text, "" = no label
  color?: string; // document colour (the dot in the right panel), "" = none
  icon?: string; // note icon, chosen by the user (see NOTE_ICONS)
  hidden?: boolean; // "Hide" in the note menu — hidden from the tree
  collapsed?: boolean;
  /* Details tab (arhitektura §11) — links to Codex notes; only ids are stored,
     titles resolve live from the Codex section. Optional — older stores and
     backups simply lack the field. */
  links?: string[];
  aliases?: string[];
  linkChoices?: LinkChoice[];
  event?: StoryEvent;
  createdAt: number;
  updatedAt: number;
  children: NoteNode[];
}

export interface TrashItem {
  id: string;
  parentId: string | null; // restore target (null = section root)
  section: SectionKey;
  node: NoteNode; // whole subtree
  deletedAt: number;
  originalIndex?: number; // original position among siblings; absent in older backups
}

export interface Novel {
  id: string;
  title: string;
  author: string;
  cover: { bg: string; icon: string };
  sections: Record<SectionKey, NoteNode[]>;
  trash: TrashItem[];
  statuses: string[];
  labels: { id: string; name: string; color: string }[];
  openNoteTabs?: string[];
  hiddenSections?: SectionKey[];
  timeline?: TimelinePreferences;
  createdAt: number;
  updatedAt: number;
}

export type ViewMode = "split" | "write" | "corkboard" | "list" | "timeline";

/* the top-bar dropdown: which level of the tree the panel shows */
export type TreeScope = "all" | "folders" | "top";

export const SCOPE_LABELS: Record<TreeScope, string> = {
  all: "Everything · Full manuscript",
  folders: "Folders only",
  top: "Top level only",
};
