"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Landmark,
  MoreHorizontal,
  MoreVertical,
  Plus,
  SquarePlus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Library,
  BookText,
} from "lucide-react";
import type { NoteNode, SectionKey } from "@/lib/kachamak/types";
import { useKachamak } from "@/lib/kachamak/store";
import { nodeWords } from "@/lib/kachamak/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const kindIcon = (n: NoteNode, open: boolean) => {
  if (n.kind === "act") return <Landmark className="h-3.5 w-3.5 text-orange-400/80" />;
  if (n.kind === "chapter")
    return open ? (
      <FolderOpen className="h-3.5 w-3.5 text-orange-400/70" />
    ) : (
      <Folder className="h-3.5 w-3.5 text-orange-400/70" />
    );
  if (n.kind === "folder")
    return open ? (
      <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
    ) : (
      <Folder className="h-3.5 w-3.5 text-muted-foreground" />
    );
  if (n.kind === "doc") return <BookText className="h-3.5 w-3.5 text-muted-foreground" />;
  return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
};

const childKind = (parent: NoteNode | null, section: SectionKey) => {
  if (section !== "binder") return parent ? "doc" : "folder";
  if (!parent) return "act";
  if (parent.kind === "act") return "chapter";
  return "scene";
};

const childLabel = (parent: NoteNode | null, section: SectionKey) => {
  if (section !== "binder") return parent ? "note" : "folder";
  if (!parent) return "act";
  if (parent.kind === "act") return "chapter";
  return "scene";
};

interface TreeRowProps {
  node: NoteNode;
  section: SectionKey;
  depth: number;
}

function TreeRow({ node, section, depth }: TreeRowProps) {
  const selectedNodeId = useKachamak((s) => s.selectedNodeId);
  const select = useKachamak((s) => s.select);
  const updateNode = useKachamak((s) => s.updateNode);
  const addNode = useKachamak((s) => s.addNode);
  const deleteNode = useKachamak((s) => s.deleteNode);
  const moveNode = useKachamak((s) => s.moveNode);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(node.title);

  const selected = selectedNodeId === node.id;
  const open = !node.collapsed;
  const hasChildren = node.children.length > 0;

  const commitRename = () => {
    setRenaming(false);
    if (draft.trim() && draft !== node.title) {
      updateNode(section, node.id, { title: draft.trim() });
    }
  };

  return (
    <div>
      <div
        role="treeitem"
        aria-selected={selected}
        tabIndex={0}
        onClick={() => select(node.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter") select(node.id);
        }}
        className={`group flex items-center gap-1.5 rounded-md px-2 py-1.5 cursor-pointer text-sm select-none ${
          selected
            ? "bg-green-500/20 text-green-100 border border-green-500/40"
            : "border border-transparent hover:bg-white/5 text-foreground/90"
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        <button
          type="button"
          aria-label={open ? "Collapse" : "Expand"}
          onClick={(e) => {
            e.stopPropagation();
            updateNode(section, node.id, { collapsed: open });
          }}
          className={`shrink-0 ${hasChildren ? "visible" : "invisible"}`}
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
        {kindIcon(node, open)}
        {renaming ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setRenaming(false);
            }}
            className="flex-1 min-w-0 bg-black/40 border border-orange-500/50 rounded px-1 text-sm outline-none"
          />
        ) : (
          <span className="flex-1 min-w-0 truncate">{node.title}</span>
        )}
        <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            aria-label={`Add ${childLabel(node, section)}`}
            onClick={(e) => {
              e.stopPropagation();
              addNode(section, node.id, childKind(node, section));
            }}
            className="p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                aria-label="Note actions"
                className="p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1b1b1b] border-white/10">
              <DropdownMenuItem onClick={() => setRenaming(true)}>
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => addNode(section, node.id, childKind(node, section))}
              >
                Add {childLabel(node, section)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => moveNode(section, node.id, "up")}>
                <ArrowUp className="h-3.5 w-3.5" /> Move up
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => moveNode(section, node.id, "down")}>
                <ArrowDown className="h-3.5 w-3.5" /> Move down
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={() => deleteNode(section, node.id)}
                className="text-red-400 focus:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>
      {open && hasChildren && (
        <div role="group">
          {node.children.map((c) => (
            <TreeRow key={c.id} node={c} section={section} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function NoteTree({
  section,
  label,
  rootKinds,
}: {
  section: SectionKey;
  label: string;
  rootKinds: { kind: NoteNode["kind"]; label: string }[];
}) {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const addNode = useKachamak((s) => s.addNode);
  const toggleLeftPanel = useKachamak((s) => s.toggleLeftPanel);
  const setAllNodesCollapsed = useKachamak((s) => s.setAllNodesCollapsed);
  const novel = novels.find((n) => n.id === activeNovelId);
  const roots = novel?.sections[section] ?? [];

  const capLabel = label.charAt(0).toUpperCase() + label.slice(1);
  const primary = rootKinds[0];
  const extras = rootKinds.slice(1);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 px-1.5 pt-2.5 pb-2">
        <button
          type="button"
          aria-label="Hide panel"
          title="Hide panel"
          onClick={toggleLeftPanel}
          className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <Library className="h-4 w-4 shrink-0 text-orange-400" />
        <span className="min-w-0 truncate text-sm font-bold text-foreground">{capLabel}</span>
        <span className="ml-auto" />
        <button
          type="button"
          aria-label={`Add ${primary.label}`}
          title={`Add ${primary.label}`}
          onClick={() => addNode(section, null, primary.kind)}
          className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
        >
          <SquarePlus className="h-4 w-4" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Section actions"
              title="More actions"
              className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#1b1b1b] border-white/10">
            {extras.map((rk) => (
              <DropdownMenuItem key={rk.kind} onClick={() => addNode(section, null, rk.kind)}>
                Add {rk.label}
              </DropdownMenuItem>
            ))}
            {extras.length > 0 && <DropdownMenuSeparator className="bg-white/10" />}
            <DropdownMenuItem onClick={() => setAllNodesCollapsed(section, false)}>
              Expand all
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAllNodesCollapsed(section, true)}>
              Collapse all
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-1.5 px-2 pb-2">
        <button
          type="button"
          onClick={() => setAllNodesCollapsed(section, false)}
          className="rounded border border-white/15 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground"
        >
          Expand all
        </button>
        <button
          type="button"
          onClick={() => setAllNodesCollapsed(section, true)}
          className="rounded border border-white/15 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground"
        >
          Collapse all
        </button>
      </div>

      <div className="flex-1 overflow-y-auto kachamak-scroll px-2 pb-2" role="tree" aria-label={label}>
        {roots.map((r) => (
          <TreeRow key={r.id} node={r} section={section} depth={0} />
        ))}
        {roots.length === 0 && (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            Empty. Use + above to create your first item.
          </p>
        )}
      </div>
    </div>
  );
}

export function nodeTotalWords(n: NoteNode): number {
  return nodeWords(n);
}
