"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Landmark,
  Library,
  MoreHorizontal,
  MoreVertical,
  Plus,
  ScrollText,
  SquarePlus,
  BookText,
} from "lucide-react";
import type { NoteNode, SectionKey } from "@/lib/kachamak/types";
import { SECTION_KEYS, TABS } from "@/lib/kachamak/types";
import { useKachamak } from "@/lib/kachamak/store";
import { exportNoteJson } from "@/lib/kachamak/store";
import { NOTE_COLORS, NOTE_ICONS, iconByName } from "@/lib/kachamak/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

/* fallback only for old notes that never got an icon — the user picks the real one */
const kindIcon = (n: NoteNode, open: boolean) => {
  if (n.kind === "act") return <Landmark className="h-3.5 w-3.5 text-orange-400/80" />;
  if (n.kind === "chapter" || n.kind === "folder")
    return open ? (
      <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
    ) : (
      <Folder className="h-3.5 w-3.5 text-muted-foreground" />
    );
  return <BookText className="h-3.5 w-3.5 text-muted-foreground" />;
};

/* the note's own icon (user-chosen) tinted with its colour */
const rowIcon = (n: NoteNode, open: boolean) => {
  const Cmp = iconByName(n.icon);
  if (Cmp) {
    return <Cmp className="h-3.5 w-3.5" style={{ color: n.color || "#a1a1aa" }} />;
  }
  return kindIcon(n, open);
};

const SECTION_LABELS = TABS.filter((t) =>
  SECTION_KEYS.includes(t.key as SectionKey)
);

interface TreeRowProps {
  node: NoteNode;
  section: SectionKey;
  depth: number;
  novelTitle: string;
}

function TreeRow({ node, section, depth, novelTitle }: TreeRowProps) {
  const selectedNodeId = useKachamak((s) => s.selectedNodeId);
  const select = useKachamak((s) => s.select);
  const updateNode = useKachamak((s) => s.updateNode);
  const addNode = useKachamak((s) => s.addNode);
  const deleteNode = useKachamak((s) => s.deleteNode);
  const moveNodeTo = useKachamak((s) => s.moveNodeTo);
  const duplicateNode = useKachamak((s) => s.duplicateNode);
  const sortChildren = useKachamak((s) => s.sortChildren);
  const setSubtreeCollapsed = useKachamak((s) => s.setSubtreeCollapsed);
  const renamingNodeId = useKachamak((s) => s.renamingNodeId);
  const setRenamingNode = useKachamak((s) => s.setRenamingNode);
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);

  const [draft, setDraft] = useState(node.title);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [permOpen, setPermOpen] = useState(false);

  const novel = novels.find((n) => n.id === activeNovelId);
  const renaming = renamingNodeId === node.id;
  const selected = selectedNodeId === node.id;
  const open = !node.collapsed;
  const hasChildren = node.children.length > 0;

  /* sync the draft every time the rename starts (menu or right after create) */
  useEffect(() => {
    if (renaming) setDraft(node.title);
  }, [renaming, node.title]);

  const commitRename = () => {
    setRenamingNode(null);
    const v = draft.trim();
    if (v && v !== node.title) {
      updateNode(section, node.id, { title: v });
    }
  };

  /* ids inside this note's own subtree — they are invalid Move destinations */
  const subtreeIds = new Set<string>();
  const collectIds = (n: NoteNode) => {
    subtreeIds.add(n.id);
    n.children.forEach(collectIds);
  };
  collectIds(node);

  const pickDestination = (destSection: SectionKey, destParentId: string | null) => {
    const label =
      destParentId === null
        ? SECTION_LABELS.find((t) => t.key === destSection)?.label ?? destSection
        : novel
          ? (findTitle(novel.sections[destSection], destParentId) ?? "note")
          : "note";
    moveNodeTo(section, node.id, destSection, destParentId);
    setMoveOpen(false);
    toast.success(`Moved “${node.title}” to ${label}.`);
  };

  const renderDest = (n: NoteNode, d: number, sec: SectionKey): React.ReactNode => {
    const invalid = sec === section && subtreeIds.has(n.id);
    return (
      <div key={n.id}>
        <button
          type="button"
          disabled={invalid}
          onClick={() => pickDestination(sec, n.id)}
          title={invalid ? "You can't move a note into itself or its sub-pages." : n.title}
          className={`flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-sm ${
            invalid
              ? "cursor-not-allowed text-muted-foreground/40"
              : "cursor-pointer hover:bg-white/10"
          }`}
        >
          <span className="shrink-0" style={{ paddingLeft: `${d * 14}px` }} />
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate">{n.title}</span>
        </button>
        {n.children.map((c) => renderDest(c, d + 1, sec))}
      </div>
    );
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
          node.hidden ? "opacity-50" : ""
        } ${
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
        {/* note icon — click it to pick a different icon or colour */}
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Change icon"
              title="Change icon"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 rounded p-0.5 hover:bg-white/10"
            >
              {rowIcon(node, open)}
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="start"
            className="w-64 border-white/10 bg-[#1b1b1b] p-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground">
              Icon
            </p>
            <div className="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto kachamak-scroll">
              {NOTE_ICONS.map(({ key, label, Cmp }) => (
                <button
                  key={key}
                  type="button"
                  aria-label={label}
                  title={label}
                  onClick={() => {
                    updateNode(section, node.id, { icon: key });
                    setPickerOpen(false);
                  }}
                  className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/10 ${
                    node.icon === key ? "bg-white/15" : ""
                  }`}
                >
                  <Cmp
                    className="h-4 w-4"
                    style={{
                      color:
                        node.icon === key && node.color
                          ? node.color
                          : "#a1a1aa",
                    }}
                  />
                </button>
              ))}
            </div>
            <p className="mb-2 mt-3 text-[11px] font-semibold tracking-wide text-muted-foreground">
              Colour
            </p>
            <div className="grid grid-cols-10 gap-1">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Colour ${c}`}
                  title={`Colour ${c}`}
                  onClick={() => updateNode(section, node.id, { color: c })}
                  className={`mx-auto h-5 w-5 rounded-full border transition-transform hover:scale-110 ${
                    node.color === c ? "border-foreground" : "border-white/20"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => updateNode(section, node.id, { color: "" })}
              className="mt-2 w-full rounded-md border border-white/10 py-1 text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              No colour
            </button>
          </PopoverContent>
        </Popover>
        {renaming ? (
          <input
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setRenamingNode(null);
            }}
            className="flex-1 min-w-0 bg-black/40 border border-orange-500/50 rounded px-1 text-sm outline-none"
          />
        ) : (
          <span className="flex-1 min-w-0 truncate">{node.title}</span>
        )}
        <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            aria-label="Create sub-page"
            title="Create sub-page"
            onClick={(e) => {
              e.stopPropagation();
              addNode(section, node.id, "doc");
            }}
            className="p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          {/* the note menu — same structure as the original app */}
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
            <DropdownMenuContent
              align="end"
              className="w-52 bg-[#1b1b1b] border-white/10 font-serif"
            >
              <DropdownMenuItem
                onSelect={() => addNode(section, node.id, "doc")}
              >
                Create sub-page
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onSelect={() => setRenamingNode(node.id)}>
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => duplicateNode(section, node.id)}>
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => exportNoteJson(novelTitle, node)}>
                Export
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setMoveOpen(true)}>
                Move
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => deleteNode(section, node.id)}
                className="text-red-400 focus:text-red-300"
              >
                Delete
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={!hasChildren}>
                  Sort sub-pages
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="bg-[#1b1b1b] border-white/10 font-serif">
                  <DropdownMenuItem
                    onSelect={() => sortChildren(section, node.id, "title-asc")}
                  >
                    Title A → Z
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => sortChildren(section, node.id, "title-desc")}
                  >
                    Title Z → A
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => sortChildren(section, node.id, "created-asc")}
                  >
                    Oldest first
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => sortChildren(section, node.id, "created-desc")}
                  >
                    Newest first
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onSelect={() => setPermOpen(true)}>
                Edit permissions
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onSelect={() => updateNode(section, node.id, { hidden: !node.hidden })}
              >
                {node.hidden ? "Show" : "Hide"}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                disabled={!hasChildren}
                onSelect={() => setSubtreeCollapsed(section, node.id, true)}
              >
                Collapse all
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!hasChildren}
                onSelect={() => setSubtreeCollapsed(section, node.id, false)}
              >
                Expand all
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onSelect={() => setTimeout(() => setPickerOpen(true), 0)}
              >
                Change icon
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>
      {open && hasChildren && (
        <div role="group">
          {node.children.map((c) => (
            <TreeRow key={c.id} node={c} section={section} depth={depth + 1} novelTitle={novelTitle} />
          ))}
        </div>
      )}

      {/* Move — pick any section root or any other note as the new parent */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="border-white/10 bg-[#1b1b1b] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move “{node.title}”</DialogTitle>
          </DialogHeader>
          <p className="-mt-1 text-xs text-muted-foreground">
            Pick a destination — the note goes to the end of the chosen spot.
          </p>
          <div className="max-h-72 overflow-y-auto kachamak-scroll rounded-lg border border-white/10 bg-black/20 p-1.5">
            {SECTION_LABELS.map((t) => {
              const sec = t.key as SectionKey;
              const roots = novel?.sections[sec] ?? [];
              return (
                <div key={t.key}>
                  <button
                    type="button"
                    onClick={() => pickDestination(sec, null)}
                    className="flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm font-semibold hover:bg-white/10"
                  >
                    <Library className="h-3.5 w-3.5 shrink-0 text-orange-400" />
                    <span>{t.label}</span>
                    <span className="text-[10px] font-normal text-muted-foreground">
                      top level
                    </span>
                  </button>
                  {roots.map((r) => renderDest(r, 1, sec))}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit permissions — Kachamak is a private, single-user workspace */}
      <Dialog open={permOpen} onOpenChange={setPermOpen}>
        <DialogContent className="border-white/10 bg-[#1b1b1b] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit permissions</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Owner</span>
              <span className="font-medium">You</span>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Kachamak is your private, local workspace — everything is saved only in this
            browser, so nobody else has access and no sharing permissions are needed.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* find a node title by id (for the Move toast) */
function findTitle(roots: NoteNode[], id: string): string | null {
  for (const n of roots) {
    if (n.id === id) return n.title;
    const hit = findTitle(n.children, id);
    if (hit) return hit;
  }
  return null;
}

const HEADER_ICONS: Partial<Record<SectionKey, typeof Library>> = {
  codex: ScrollText,
};

export function NoteTree({ section }: { section: SectionKey }) {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const addNode = useKachamak((s) => s.addNode);
  const toggleLeftPanel = useKachamak((s) => s.toggleLeftPanel);
  const setAllNodesCollapsed = useKachamak((s) => s.setAllNodesCollapsed);
  const novel = novels.find((n) => n.id === activeNovelId);
  const roots = novel?.sections[section] ?? [];

  const capLabel =
    TABS.find((t) => t.key === section)?.label ?? section.charAt(0).toUpperCase() + section.slice(1);
  const HeaderIcon = HEADER_ICONS[section] ?? Library;

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
        <HeaderIcon className="h-4 w-4 shrink-0 text-orange-400" />
        <span className="min-w-0 truncate text-sm font-bold text-foreground">{capLabel}</span>
        <span className="ml-auto" />
        <button
          type="button"
          aria-label="Add note"
          title="Add note"
          onClick={() => addNode(section, null, "doc")}
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

      <div className="flex-1 overflow-y-auto kachamak-scroll px-2 pb-2" role="tree" aria-label={capLabel}>
        {roots.map((r) => (
          <TreeRow key={r.id} node={r} section={section} depth={0} novelTitle={novel?.title ?? "note"} />
        ))}
        {roots.length === 0 && (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            Empty. Use + above to create your first note.
          </p>
        )}
      </div>
    </div>
  );
}
