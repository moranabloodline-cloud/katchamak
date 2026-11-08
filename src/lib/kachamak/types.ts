export type SectionKey =
  | "binder"
  | "planning"
  | "research"
  | "templates"
  | "prompts";

export const SECTION_KEYS: SectionKey[] = [
  "binder",
  "planning",
  "research",
  "templates",
  "prompts",
];

export type TabKey = SectionKey | "codex" | "trash";

export const TABS: { key: TabKey; label: string }[] = [
  { key: "binder", label: "Binder" },
  { key: "codex", label: "Codex" },
  { key: "planning", label: "Planning" },
  { key: "research", label: "Research" },
  { key: "templates", label: "Templates" },
  { key: "prompts", label: "Prompts" },
  { key: "trash", label: "Trash" },
];

export type NodeKind = "act" | "chapter" | "scene" | "folder" | "doc";

export interface NoteNode {
  id: string;
  title: string;
  kind: NodeKind;
  synopsis: string;
  content: string; // rich text (HTML)
  notes: string;
  status: string; // "" = none
  label: string; // "" = none, else label id
  collapsed?: boolean;
  createdAt: number;
  updatedAt: number;
  children: NoteNode[];
}

export interface CodexEntry {
  id: string;
  title: string;
  content: string;
  aliases: string[];
  entryType: string;
  status: string;
  image?: string; // dataURL
  createdAt: number;
  updatedAt: number;
}

export interface CodexCategory {
  id: string;
  name: string;
  children: CodexCategory[];
  entries: CodexEntry[];
}

export interface TrashItem {
  id: string;
  parentId: string | null; // restore target (null = section root)
  section: SectionKey;
  node: NoteNode; // whole subtree
  deletedAt: number;
}

export interface Novel {
  id: string;
  title: string;
  author: string;
  cover: { bg: string; icon: string };
  sections: Record<SectionKey, NoteNode[]>;
  codex: CodexCategory[];
  trash: TrashItem[];
  statuses: string[];
  labels: { id: string; name: string; color: string }[];
  createdAt: number;
  updatedAt: number;
}

export type ViewMode = "split" | "write" | "grid" | "list";
