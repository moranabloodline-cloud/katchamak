import type { StoryEvent, TimelinePreferences } from './story-calendar';
import type {DetailBlockKey} from './detail-blocks';
import type {KinshipKind} from './kinship';
/* every tab is the same note system — Codex included */
export type SectionKey =
  | "binder"
  | "codex"
  | "planning"
  | "research"
  | "templates"
  | "prompts"
  | "timeline"
  | "family"
  | "finance"
  | "kanban";

export const SECTION_KEYS: SectionKey[] = [
  "binder",
  "codex",
  "planning",
  "research",
  "templates",
  "prompts",
  "timeline",
  "family",
  "finance",
  "kanban",
];

export type TabKey = SectionKey | "gallery" | "trash" | `note:${string}`;

export const INSPECTOR_TABS = [
  { key: 'info', label: 'Info' },
  { key: 'details', label: 'Details' },
  { key: 'mentions', label: 'Mentions' },
  { key: 'family', label: 'Family' },
] as const;
export type InspectorTabKey = typeof INSPECTOR_TABS[number]['key'];

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
  { key: "timeline", label: "Timeline" },
  { key: "family", label: "Relationships" },
  { key: "kanban", label: "Kanban" },
  { key: "finance", label: "Finance" },
  { key: "trash", label: "Trash" },
];

/* legacy kinds kept only for old data — new notes are always "doc" and the user
   decides the name, icon and colour themselves (free hierarchy) */
export type NodeKind = "act" | "chapter" | "scene" | "folder" | "doc";
export const DEFAULT_NOTE_ICON = "file-generic";

export interface DocumentTarget {
  amount:number;
  unit:'words'|'characters';
  minimum:number;
  allowance:number;
  showOverrun:boolean;
  showAllowance:boolean;
  notifications:boolean;
}

export interface NoteNode {
  id: string;
  title: string;
  kind: NodeKind;
  synopsis: string;
  content: string; // rich text (HTML)
  pageSettings?: import('./page-format').NotePageSettings;
  bodyFontSize?: number; // px; older notes inherit the page format
  notes: string;
  status: string; // "" = none
  label: string; // free text, "" = no label
  color?: string; // document colour (the dot in the right panel), "" = none
  image?: string; // optional portable raster portrait in Details
  documentTarget?: DocumentTarget;
  hiddenDetailBlocks?: DetailBlockKey[]; // presentation only; hiding never deletes data
  collapsedDetailBlocks?: DetailBlockKey[];
  detailBlockOrder?: DetailBlockKey[];
  icon?: string; // note icon, chosen by the user (see NOTE_ICONS)
  hidden?: boolean; // "Hide" in the note menu — hidden from the tree
  collapsed?: boolean;
  /* Details tab (arhitektura §11) — links to Codex notes; only ids are stored,
     titles resolve live from the Codex section. Optional — older stores and
     backups simply lack the field. */
  links?: string[];
  familyMembers?: string[]; // Codex IDs included in this graph
  aliases?: string[];
  ignoreAutoLinking?: boolean; // skip this note as a target during automatic link review
  linkChoices?: LinkChoice[];
  kanban?: import('./kanban').KanbanBoard;
  transaction?: import('./finance').Transaction;
  event?: StoryEvent;
  timelineKind?: 'event' | 'period'; // an undated Timeline note awaiting its dates
  createdAt: number;
  updatedAt: number;
  children: NoteNode[];
}

export interface TrashItem {
  id: string;
  parentId: string | null; // restore target (null = section root)
  section: SectionKey;
  node: NoteNode; // whole subtree
  familyRelationships?: FamilyRelationship[]; // recorded links available when this tree is restored
  deletedAt: number;
  originalIndex?: number; // original position among siblings; absent in older backups
}

export interface Novel {
  financeCurrency?: import('./finance').FinanceCurrency;
  gallery?: import('./gallery').GalleryEntry[];
  homepage?: import('./homepage').Homepage;
  homePages?: import('./homepage').HomePageEntry[];
  familyRelationships?: FamilyRelationship[];
  demo?: { key: string; version: number; edition?: number; source?: boolean; timelineRootId?: string };
  id: string;
  title: string;
  author: string;
  cover: { bg: string; icon: string; image?: string };
  series?: string;
  seriesIndex?: string;
  language?: string;
  genres?: string[];
  subgenres?: string[];
  chapterCount?: number;
  targetAudience?: string;
  tones?: string[];
  writingStyles?: string[];
  plotTechniques?: string[];
  sellingPoints?: string[];
  explicitContent?: boolean;
  archived?: boolean;
  sections: Record<SectionKey, NoteNode[]>;
  trash: TrashItem[];
  statuses: string[];
  labels: { id: string; name: string; color: string }[];
  openNoteTabs?: string[];
  tabOrder?: TabKey[];
  tabFormats?: Partial<Record<import('./page-format').FormatTab,import('./page-format').TabPageSettings>>;
  hiddenSections?: SectionKey[];
  hiddenTabs?: TabKey[];
  hiddenInspectorTabs?: InspectorTabKey[];
  inspectorByTab?: Partial<Record<TabKey, import('./inspector-tabs').InspectorSettings>> & {homepage?: import('./inspector-tabs').CanvasInspectorSettings};
  timeline?: TimelinePreferences;
  createdAt: number;
  updatedAt: number;
}

export type FamilyRelationship = {
  from: string;
  to: string;
} & ({kind:Exclude<KinshipKind,'custom'>} | {kind:'custom';label:string;mutual?:boolean});

export type ViewMode = "split" | "write" | "corkboard" | "list" | "continuous" | "timeline" | "family" | "homepage";

/* the top-bar dropdown: which level of the tree the panel shows */
export type TreeScope = "all" | "folders" | "top";

export const SCOPE_LABELS: Record<TreeScope, string> = {
  all: "Everything · Full manuscript",
  folders: "Folders only",
  top: "Top level only",
};
