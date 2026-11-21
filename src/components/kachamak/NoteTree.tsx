"use client";

import {usePanelZoom} from './CtrlZoom';
import {addFinanceNote} from './Finance';
import { useEffect, useRef, useState } from "react";
import {
  Hourglass,
  Zap,
  Diamond,
  ChevronDown,
  ChevronRight,
  Eye,
  Folder,
  FolderOpen,
  Landmark,
  Library,
  MoreHorizontal,
  MoreVertical,
  BookText,
} from "lucide-react";
import type { NoteNode, SectionKey } from "@/lib/kachamak/types";
import { SECTION_KEYS, TABS } from "@/lib/kachamak/types";
import { useKachamak } from "@/lib/kachamak/store";
import { exportNoteJson } from "@/lib/kachamak/store";
import { findNode, locateNode } from "@/lib/kachamak/utils";
import {ColourPalette} from "./PresetColourPicker";
import { NOTE_ICONS, iconForNote, noteIconKey } from "@/lib/kachamak/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { familyDeletionImpact } from "@/lib/kachamak/family-tree";
import { WorkspaceNavigation } from "./WorkspaceNavigation";
import { TemplatePicker } from "./TemplatePicker";
import { toast } from "sonner";
import {ContextMenu,ContextMenuTrigger,ContextMenuContent,ContextMenuItem,ContextMenuSeparator} from "@/components/ui/context-menu";

import {branchSources,insideBranches,noteParents,type BranchSource} from '@/lib/kachamak/tree-move';
import {useTreeSelection} from './useTreeSelection';
import {visibleNoteTree,timelineKind} from '@/lib/kachamak/timeline-tree';
import {addTimelineNote} from '@/lib/kachamak/timeline-actions';

/* fallback only for old notes that never got an icon — the user picks the real one */
const kindIcon = (n: NoteNode, open: boolean) => {
  const style = { color: n.color || undefined };
  if (n.kind === "act") return <Landmark className="h-3.5 w-3.5 text-orange-400/80" style={style} />;
  if (n.kind === "chapter" || n.kind === "folder")
    return open ? (
      <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" style={style} />
    ) : (
      <Folder className="h-3.5 w-3.5 text-muted-foreground" style={style} />
    );
  return <BookText className="h-3.5 w-3.5 text-muted-foreground" style={style} />;
};

/* the note's own icon (user-chosen) tinted with its colour */
const rowIcon = (n: NoteNode, open: boolean) => {
  const Cmp = iconForNote(n);
  if (Cmp) {
    return <Cmp className="h-3.5 w-3.5" style={{ color: n.color || "#a1a1aa" }} />;
  }
  if(timelineKind(n)){const Icon=timelineKind(n)==='period'?Hourglass:Zap;return <Icon className="h-3.5 w-3.5 shrink-0" style={{color:n.color||undefined}}/>;}
  return kindIcon(n, open);
};

const SECTION_LABELS = TABS.filter((t) =>
  SECTION_KEYS.includes(t.key as SectionKey)
);

/* ---------- drag & drop u stablu (kao u Scriveneru) ----------
   gore/levo = „pre“, sredina = „u“ (postaje sub-strana), dole/desno = „posle“;
   prazan prostor na dnu stabla = vrh sekcije (kraj liste). Spuštanje u sopstveno
   podstablo je zabranjeno. Indikatori: zlatna linija iznad/ispod, okvir za „u“. */

type DropMode = "before" | "after" | "onto";

interface TreeDnd {
  rootId?:string;
  selection:ReturnType<typeof useTreeSelection>;
  drop: { id: string; mode: DropMode } | null;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDragOverRow: (e: React.DragEvent, id: string) => void;
  onDragLeaveRow: (e: React.DragEvent, id: string) => void;
  onDropRow: (e: React.DragEvent, id: string) => void;
}

interface TreeRowProps {
  onTemplate: (parentId: string) => void;
  node: NoteNode;
  section: SectionKey;
  depth: number;
  novelTitle: string;
  dnd: TreeDnd;
  revealed?: ReadonlySet<string>;
  onDismissReveal?: () => void;
}

function TreeRow({ node, section, depth, novelTitle, dnd, revealed, onDismissReveal, onTemplate }: TreeRowProps) {
  const selectedNodeId = useKachamak((s) => s.selectedNodeId);
  const selectNode = useKachamak((s) => s.select);
  const select=(id:string|null)=>{selectNode(id);if(section==="timeline" || section==="family")useKachamak.getState().setView(section);};
  const updateNode = useKachamak((s) => s.updateNode);
  const addNode = useKachamak((s) => s.addNode);
  const deleteNode = useKachamak((s) => s.deleteNode);
  const moveNodeTo = useKachamak((s) => s.moveNodeTo);
  const duplicateNode = useKachamak((s) => s.duplicateNode);
  const sortChildren = useKachamak((s) => s.sortChildren);
  const renamingNodeId = useKachamak((s) => s.renamingNodeId);
  const setRenamingNode = useKachamak((s) => s.setRenamingNode);
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);

  const [draft, setDraft] = useState(node.title);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [deleteInBook, setDeleteInBook] = useState<string | null>(null);
  const novel = novels.find((n) => n.id === activeNovelId);
  const impact = novel && section === 'family' && deleteInBook === novel.id
    ? familyDeletionImpact(novel, node.id) : null;
  const sharedCount = impact ? impact.related.length - impact.exclusive.size : 0;
  const rowRef = useRef<HTMLDivElement>(null);
  const requestDelete = () => {
    if (section === 'family') setDeleteInBook(activeNovelId);
    else deleteNode(section, node.id);
  };
  const renaming = renamingNodeId === node.id;
  const selected = selectedNodeId === node.id;
  const selectedIcon = noteIconKey(node);
  const open = !node.collapsed || !!revealed?.has(node.id);
  const setCollapsed = (collapsed: boolean) => {
    if (collapsed && revealed?.has(node.id)) onDismissReveal?.();
    updateNode(section, node.id, { collapsed });
  };
  const hasChildren = node.children.length > 0;
  const dropHere = dnd.drop && dnd.drop.id === node.id ? dnd.drop.mode : null;

  /* sync the draft every time the rename starts (menu or right after create)
     and grab the caret — closing the dropdown menu steals focus for a moment,
     so retry briefly (but only while nothing else holds the focus) */
  const renameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!renaming) return;
    setDraft(node.title);
    let tries = 0;
    const grab = () => {
      tries += 1;
      const el = renameRef.current;
      if (!el || tries > 12) return;
      if (document.activeElement === el) {
        el.select();
        return;
      }
      if (document.activeElement === document.body) {
        el.focus();
        el.select();
      }
      setTimeout(grab, 50);
    };
    grab();
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
  if (moveOpen) collectIds(node);

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
    const invalid = (sec === section && subtreeIds.has(n.id)) || (sec==="finance" && !!n.transaction);
    return (
      <div key={n.id}>
        <button
          type="button"
          disabled={invalid}
          onClick={() => pickDestination(sec, n.id)}
          title={sec==="finance" && n.transaction ? "Choose a financial folder." : invalid ? "You can't move a note into itself or its sub-pages." : n.title}
          className={`flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-sm transition-colors ${
            invalid
              ? "cursor-not-allowed text-muted-foreground/40"
              : "cursor-pointer hover:bg-white/10"
          }`}
        >
          <span className="shrink-0" style={{ paddingLeft: `${d * 14}px` }} />
          {rowIcon(n, true)}
          <span className="min-w-0 truncate" style={{color:n.color || undefined}}>{n.title}</span>
        </button>
        {n.children.map((c) => renderDest(c, d + 1, sec))}
      </div>
    );
  };

  return (
    <div>
      <div
        role="treeitem"
        ref={rowRef}
        aria-selected={dnd.selection.marked?.has(node.id)??selected}
        aria-expanded={hasChildren ? open : undefined}
        aria-level={depth + 1}
        data-note-id={node.id}
        data-tree-move-id={node.id!==dnd.rootId?node.id:undefined}
        tabIndex={0}
        onClick={e=>{
          if (renaming || !e.currentTarget.contains(e.target as Node)) return;
          if (!dnd.selection.click(node.id,e)) select(node.id);
          e.currentTarget.focus();
        }}
        onContextMenu={(e) => {
          if ((e.target as HTMLElement).closest('input,textarea,[contenteditable="true"]')) { e.stopPropagation(); return; }
          e.preventDefault();e.stopPropagation();
          select(node.id);e.currentTarget.focus();setMenuOpen(true);
        }}
        onKeyDown={(e) => {
          if(e.target===e.currentTarget&&(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10'))){
            e.preventDefault();e.stopPropagation();select(node.id);setMenuOpen(true);return;
          }
          // Inputs and popup controls keep their own editing/navigation keys.
          if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.nativeEvent.isComposing) return;
          if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
            e.preventDefault();e.stopPropagation();
            const tree=e.currentTarget.closest('[role="tree"]');
            const rows=Array.from(tree?.querySelectorAll<HTMLElement>('[role="treeitem"]')??[]);
            const index=rows.indexOf(e.currentTarget);
            const go=(row:HTMLElement|undefined)=>{if(!row?.dataset.noteId)return;dnd.selection.clear();select(row.dataset.noteId);row.focus();row.scrollIntoView?.({block:'nearest',inline:'nearest'});};
            if(e.key==='ArrowDown')go(rows[index+1]);
            if(e.key==='ArrowUp')go(rows[index-1]);
            if(e.key==='Home')go(rows[0]);
            if(e.key==='End')go(rows.at(-1));
            if(e.key==='ArrowRight'&&hasChildren){if(!open)setCollapsed(false);else if(Number(rows[index+1]?.getAttribute('aria-level'))>depth+1)go(rows[index+1]);}
            if(e.key==='ArrowLeft'){
              if(hasChildren&&open)setCollapsed(true);
              else go(rows.slice(0,index).reverse().find(row=>Number(row.getAttribute('aria-level'))<depth+1));
            }
            return;
          }
          if (e.key === "Enter") select(node.id);
          /* Delete key deletes the selected note (goes to Trash) */
          if (e.key === "Delete" && selected && !renaming && (!dnd.selection.marked || (dnd.selection.marked.size===1 && dnd.selection.marked.has(node.id)))) {
            e.stopPropagation();
            e.preventDefault();
            requestDelete();
          }
        }}
        draggable={!renaming && node.id!==dnd.rootId}
        onDragStart={(e) => dnd.onDragStart(e, node.id)}
        onDragEnd={dnd.onDragEnd}
        onDragOver={(e) => dnd.onDragOverRow(e, node.id)}
        onDragLeave={(e) => dnd.onDragLeaveRow(e, node.id)}
        onDrop={(e) => dnd.onDropRow(e, node.id)}
        className={`group flex items-center gap-1.5 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors select-none ${
          node.hidden ? "opacity-50" : ""
        } ${
          selected
            ? "bg-amber-400/10 text-amber-100 border border-amber-400/40"
            : "border border-transparent hover:bg-white/5 text-foreground/90"
        } ${
          dnd.selection.marked?.has(node.id) ? "outline outline-1 -outline-offset-1 outline-teal-400" : ""
        } ${
          dropHere === "onto"
            ? "bg-amber-400/15 ring-1 ring-inset ring-amber-400/70"
            : ""
        } ${
          dropHere === "before" ? "shadow-[inset_0_2px_0_0_#ad7e2e]" : ""
        } ${
          dropHere === "after" ? "shadow-[inset_0_-2px_0_0_#ad7e2e]" : ""
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        <button
          type="button"
          aria-label={open ? "Collapse" : "Expand"}
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed(open);
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
              className="shrink-0 rounded p-0.5 transition-colors hover:bg-white/10"
            >
              {rowIcon(node, open)}
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="start"
            className="max-h-[min(calc(100dvh-1.5rem),var(--radix-popover-content-available-height))] w-[min(36rem,calc(100vw-1.5rem))] overflow-y-auto border-white/10 bg-[#1b1b1b] p-3 kachamak-scroll"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground">
              Icon
            </p>
            <div className="grid grid-cols-8 gap-1 sm:grid-cols-12">
              {pickerOpen && NOTE_ICONS.map(({ key, label, Cmp }) => (
                <button
                  key={key}
                  type="button"
                  aria-label={label}
                  title={label}
                  onClick={() => {
                    updateNode(section, node.id, { icon: key });
                    setPickerOpen(false);
                  }}
                  className={`flex h-8 min-w-0 items-center justify-center rounded-md transition-colors hover:bg-white/10 ${
                    selectedIcon === key ? "bg-white/15" : ""
                  }`}
                >
                  <Cmp
                    className="h-4 w-4"
                    style={{
                      color:
                        selectedIcon === key && node.color
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
            <ColourPalette value={node.color} onChange={color=>updateNode(section,node.id,{color})}/>
          </PopoverContent>
        </Popover>
        {renaming ? (
          <input
            ref={renameRef}
            style={{ color: node.color || undefined }}
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
          <span className="min-w-0 flex-1 truncate" style={{ color: node.color || undefined }} title={node.title}>{node.title}</span>
        )}
        {/* three-dot menu at the END of the row — exact structure from the
            documentation; the dots stay visible while a menu/picker is open */}
        <span
          className={`${
            menuOpen || pickerOpen ? "flex" : "hidden group-hover:flex group-focus-within:flex"
          } shrink-0 items-center`}
        >
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                aria-label="Note actions"
                className="p-0.5 rounded transition-colors hover:bg-white/10 text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={4}
              className="w-52 bg-[#1b1b1b] border-white/10 font-serif"
              /* don't yank focus back to the dots on close — it would dismiss the
                 icon picker that "Change icon" just opened */
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              {section==="finance" ? !node.transaction && <>
                <DropdownMenuItem onSelect={()=>addFinanceNote(node.id,'folder')}>New folder</DropdownMenuItem>
                <DropdownMenuItem onSelect={()=>addFinanceNote(node.id,'income')}>+ Income</DropdownMenuItem>
                <DropdownMenuItem onSelect={()=>addFinanceNote(node.id,'expense')}>+ Expense</DropdownMenuItem>
              </> : <><DropdownMenuItem onSelect={() => addNode(section, node.id, "doc")}>
                Create note
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onTemplate(node.id)}>Insert Template</DropdownMenuItem></>}
              <DropdownMenuSeparator className="bg-white/10" />
              {section==="timeline"&&<><DropdownMenuItem onSelect={()=>addTimelineNote(section,node.id,"event")}><Zap className="mr-2 h-4 w-4"/>Add Event</DropdownMenuItem><DropdownMenuItem onSelect={()=>addTimelineNote(section,node.id,"period")}><Hourglass className="mr-2 h-4 w-4"/>Add Time Period</DropdownMenuItem><DropdownMenuSeparator/></>}
              <DropdownMenuItem onSelect={() => setRenamingNode(node.id)}>
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => useKachamak.getState().openNoteTab(node.id)}>Open as tab</DropdownMenuItem>
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
                disabled={!menuOpen || !novel || locateNode(novel.sections[section],node.id)?.parentId == null}
                onSelect={() => {
                  moveNodeTo(section,node.id,section,null);
                  const state=useKachamak.getState();
                  if(state.activeTab.startsWith('note:'))state.setTab(section);
                  select(node.id);
                  toast.success(`Moved “${node.title}” to the top level.`);
                }}
              >
                Move to top level
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={requestDelete}
                className="text-red-400 focus:text-red-300"
              >
                Delete
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                disabled={!hasChildren}
                onSelect={() => sortChildren(section, node.id, "title-asc")}
              >
                Sort sub-pages
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onSelect={() => updateNode(section, node.id, { hidden: !node.hidden })}
              >
                {node.hidden ? "Show" : "Hide"}
              </DropdownMenuItem>
              <DropdownMenuCheckboxItem
                checked={node.ignoreAutoLinking === true}
                onCheckedChange={checked => updateNode(section, node.id, { ignoreAutoLinking: checked === true })}
              >
                Ignore in auto-linking
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                disabled={!hasChildren}
                onSelect={() => setCollapsed(true)}
              >
                Collapse
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!hasChildren}
                onSelect={() => setCollapsed(false)}
              >
                Expand
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onSelect={() =>
                  /* small delay: the closing dropdown menu dismisses a popover
                     opened in the same tick — wait for its cleanup to finish */
                  setTimeout(() => setPickerOpen(true), 100)
                }
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
            <TreeRow key={c.id} node={c} section={section} depth={depth + 1} novelTitle={novelTitle} dnd={dnd} revealed={revealed} onDismissReveal={onDismissReveal} onTemplate={onTemplate} />
          ))}
        </div>
      )}

      {impact && (
        <AlertDialog open onOpenChange={open => { if (!open) setDeleteInBook(null); }}>
          <AlertDialogContent className="border-white/10 bg-[#1b1b1b]" onCloseAutoFocus={e => {
            if (rowRef.current?.isConnected) { e.preventDefault(); rowRef.current.focus(); }
          }}>
            <AlertDialogHeader>
              <AlertDialogTitle>Move “<span style={{color:node.color || undefined}}>{node.title}</span>” to Trash?</AlertDialogTitle>
              <AlertDialogDescription>
                {hasChildren ? 'This includes all nested family trees. ' : ''}
                {impact.exclusive.size
                  ? `This will remove ${impact.exclusive.size} recorded family relationship${impact.exclusive.size === 1 ? '' : 's'} from the linked Codex notes. Inferred kinship will update too. `
                  : 'No family relationships will be removed from Codex. '}
                {sharedCount > 0 && `${sharedCount} shared relationship${sharedCount === 1 ? ' stays' : 's stay'} in other trees. `}
                The character notes are kept. You can restore the tree and its relationships from Trash.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 text-white hover:bg-red-500" onClick={() => {
                if (useKachamak.getState().activeNovelId === deleteInBook) deleteNode(section, node.id);
              }}>Move to Trash</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Move — pick any section root or any other note as the new parent */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="border-white/10 bg-[#1b1b1b] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move “<span style={{color:node.color || undefined}}>{node.title}</span>”</DialogTitle>
          </DialogHeader>
          <p className="-mt-1 text-xs text-muted-foreground">
            Pick a destination — the note goes to the end of the chosen spot.
          </p>
          <div className="max-h-72 overflow-y-auto kachamak-scroll rounded-lg border border-white/10 bg-black/20 p-1.5">
            {moveOpen && SECTION_LABELS.map((t) => {
              const sec = t.key as SectionKey;
              const roots = novel?.sections[sec] ?? [];
              return (
                <div key={t.key}>
                  <button
                    type="button"
                    onClick={() => pickDestination(sec, null)}
                    className="flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm font-semibold transition-colors hover:bg-white/10"
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

export function NoteTree({ section, rootId, reveal, onDismissReveal }: { section: SectionKey; rootId?: string; reveal?: { id: string }; onDismissReveal?: () => void }) {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const addNode = useKachamak((s) => s.addNode);
  const selectedNodeId = useKachamak((s) => s.selectedNodeId);
  const updateNode = useKachamak((s) => s.updateNode);
  const setAllNodesCollapsed = useKachamak((s) => s.setAllNodesCollapsed);
  const moveTreeNotes = useKachamak((s) => s.moveTreeNotes);
  const treeScope = useKachamak((s) => s.treeScope);
  const leftZoom = usePanelZoom("left");
  const novel = novels.find((n) => n.id === activeNovelId);
  const roots = novel?.sections[section] ?? [];
  const [templateTarget, setTemplateTarget] = useState<{ bookId: string; parentId: string | null } | null>(null);
  useEffect(() => { setTemplateTarget(null); }, [activeNovelId, section, rootId]);
  const openTemplates = (parentId: string | null) => {
    if (activeNovelId) setTemplateTarget({ bookId: activeNovelId, parentId });
  };
  const treeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!reveal) return;
    const tree = treeRef.current;
    const row = Array.from(tree?.querySelectorAll<HTMLElement>('[data-note-id]') ?? [])
      .find(el => el.dataset.noteId === reveal.id);
    // Scroll only the tree; do not move keyboard focus or the calendar viewport.
    if (tree && row) {
      const bounds = tree.getBoundingClientRect(), target = row.getBoundingClientRect();
      if (target.top < bounds.top) tree.scrollTop += (target.top - bounds.top) / leftZoom;
      else if (target.bottom > bounds.bottom) tree.scrollTop += (target.bottom - bounds.bottom) / leftZoom;
    }
  }, [reveal, leftZoom, treeScope]);

  const selection=useTreeSelection(treeRef,selectedNodeId);
  const [drag,setDrag]=useState<{sources:BranchSource[]; ids:Set<string>; parents:Map<string,string|null>}|null>(null);
  const [drop,setDrop]=useState<{id:string;mode:DropMode}|null>(null);
  const clearDrag=()=>{setDrag(null);setDrop(null);};
  const modeForEvent=(event:React.DragEvent):DropMode=>{
    const rect=event.currentTarget.getBoundingClientRect();
    const fraction=(event.clientY-rect.top)/Math.max(rect.height,1);
    return fraction<0.3?'before':fraction>0.7?'after':'onto';
  };
  const allowed=(id:string,mode:DropMode)=>drag && !insideBranches(id,drag.ids,drag.parents) &&
    (id!==rootId || mode==='onto') && (section!=='finance' || mode!=='onto' || !findNode(roots,id)?.transaction);
  const finish=(event:React.DragEvent,id:string|null,mode:DropMode)=>{
    event.preventDefault();
    event.stopPropagation();
    clearDrag();
    if (!activeNovelId || !drag || event.dataTransfer.getData('application/x-kachamak-note-tree')!==JSON.stringify(drag.sources) ||
        (id && !allowed(id,mode))) return;
    try {
      const parentId=mode==='onto'?id:drag.parents.get(id!)!;
      moveTreeNotes(activeNovelId,section,drag.sources,parentId,id && mode!=='onto'?{id,side:mode}:undefined);
      selection.clear();
    } catch(error) {toast.error(error instanceof Error?error.message:'The notes could not be moved.');}
  };
  const treeDnd:TreeDnd={
    drop,selection,rootId,
    onDragStart:(event,id)=>{
      const parents=noteParents(roots);
      const ids=selection.dragIds(id);
      const sources=branchSources(ids,parents);
      event.dataTransfer.setData('application/x-kachamak-note-tree',JSON.stringify(sources));
      event.dataTransfer.setData('text/plain',id);
      event.dataTransfer.effectAllowed='move';
      setDrag({sources,ids:new Set(ids),parents});
    },
    onDragEnd:clearDrag,
    onDragOverRow:(event,id)=>{
      if (!drag) return;
      event.preventDefault();
      event.stopPropagation();
      const mode=modeForEvent(event);
      const valid=allowed(id,mode);
      event.dataTransfer.dropEffect=valid?'move':'none';
      setDrop(previous=>valid?(previous?.id===id && previous.mode===mode?previous:{id,mode}):null);
    },
    onDragLeaveRow:(event,id)=>{
      if (!event.currentTarget.contains(event.relatedTarget as Node|null)) setDrop(previous=>previous?.id===id?null:previous);
    },
    onDropRow:(event,id)=>finish(event,id,modeForEvent(event)),
  };
  const handleDropRoot=(event:React.DragEvent)=>finish(event,rootId??null,'onto');
  const scopedRoot = rootId ? findNode(roots, rootId) : null;
  const visibleRoots = visibleNoteTree(scopedRoot ? [scopedRoot] : roots, section, treeScope);

  // A selection can temporarily disclose its path without modifying saved notes.
  const revealed = new Set<string>();
  if (reveal && findNode(visibleRoots, reveal.id)) {
    let parentId = locateNode(visibleRoots, reveal.id)?.parentId;
    while (parentId) {
      revealed.add(parentId);
      parentId = locateNode(visibleRoots, parentId)?.parentId;
    }
  }

  /* every hidden note in this section — "Show" them from the section ••• menu */
  const hiddenNotes: NoteNode[] = [];
  const collectHidden = (nodes: NoteNode[]) =>
    nodes.forEach((n) => {
      if (n.hidden) hiddenNotes.push(n);
      collectHidden(n.children);
    });
  collectHidden(roots);

  const capLabel =
    scopedRoot?.title ?? TABS.find((t) => t.key === section)?.label ?? section.charAt(0).toUpperCase() + section.slice(1);

  return (
    <div className="flex h-full flex-col">
      {/* traka 2 (levo) — border-b se nastavlja preko editor toolbar-a i Info/
          Details/Mentions reda: jedna linija od leve do desne ivice ekrana */}
      <WorkspaceNavigation />

      <ContextMenu>
      <ContextMenuTrigger asChild>
      <div
        ref={treeRef}
        className="flex-1 overflow-y-auto kachamak-scroll px-2 pb-2"
        style={{ zoom: leftZoom }}
        role="tree"
        aria-multiselectable="true"
        aria-label={capLabel}
        onDragOver={e=>{if(drag){e.preventDefault();e.dataTransfer.dropEffect="move";}}}
        onDrop={handleDropRoot}
      >
        {visibleRoots.map((r) => (
          <TreeRow key={r.id} node={r} section={section} depth={0} novelTitle={novel?.title ?? "note"} dnd={treeDnd} revealed={revealed} onDismissReveal={onDismissReveal} onTemplate={openTemplates} />
        ))}
        {visibleRoots.length === 0 && (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            Empty. Right-click here to create your first note.
          </p>
        )}
      </div>
      </ContextMenuTrigger>
      <ContextMenuContent aria-label="Tree actions" className="w-56 border-white/10 bg-[#1b1b1b] font-serif">
        {section==="timeline"&&<><ContextMenuItem onSelect={()=>addTimelineNote(section,rootId??null,"event")}><Zap className="mr-2 h-4 w-4"/>Add Event</ContextMenuItem><ContextMenuItem onSelect={()=>addTimelineNote(section,rootId??null,"period")}><Hourglass className="mr-2 h-4 w-4"/>Add Time Period</ContextMenuItem></>}
              {section==="finance" ? <>
                <ContextMenuItem onSelect={()=>addFinanceNote(rootId??null,'folder')}>New folder</ContextMenuItem>
                <ContextMenuItem onSelect={()=>addFinanceNote(rootId??null,'income')}>+ Income</ContextMenuItem>
                <ContextMenuItem onSelect={()=>addFinanceNote(rootId??null,'expense')}>+ Expense</ContextMenuItem>
              </> : <><ContextMenuItem onSelect={() => addNode(section,rootId??null,'doc')}>
          {rootId?'Create note':'Create top-level note'}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => openTemplates(rootId ?? null)}>Insert Template</ContextMenuItem></>}
        <ContextMenuSeparator className="bg-white/10" />
        <ContextMenuItem onSelect={() => rootId?useKachamak.getState().setSubtreeCollapsed(section,rootId,false):setAllNodesCollapsed(section,false)}>Expand all</ContextMenuItem>
        <ContextMenuItem onSelect={() => { onDismissReveal?.(); if (rootId) useKachamak.getState().setSubtreeCollapsed(section,rootId,true); else setAllNodesCollapsed(section,true); }}>Collapse all</ContextMenuItem>
        {hiddenNotes.length > 0 && <>
          <ContextMenuSeparator className="bg-white/10" />
          {hiddenNotes.map(hn=><ContextMenuItem key={hn.id} onSelect={()=>updateNode(section,hn.id,{hidden:false})}><Eye className="mr-2 h-3.5 w-3.5"/>Show <span style={{color:hn.color || undefined}}>{hn.title}</span></ContextMenuItem>)}
        </>}
      </ContextMenuContent>
      </ContextMenu>
      {drag && <div className="shrink-0 rounded border border-dashed border-teal-400/60 p-2 text-center text-xs" onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='move';}} onDrop={handleDropRoot}>
        Move to {rootId?capLabel:'top level'}
      </div>}
      {novel && templateTarget?.bookId === novel.id && <TemplatePicker templates={novel.sections.templates}
        onClose={() => setTemplateTarget(null)} onChoose={templateId => {
          const state = useKachamak.getState();
          if (state.activeNovelId !== templateTarget.bookId) return;
          const id = addNode(section, templateTarget.parentId, { templateId });
          setTemplateTarget(null);
          if (!id) return;
          if (!['write', 'split', 'continuous'].includes(state.view)) state.setView('write');
        }} />}
    </div>
  );
}
