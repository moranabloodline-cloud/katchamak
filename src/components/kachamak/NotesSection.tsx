"use client";


import { ChevronLeft, ChevronRight, LayoutGrid, List as ListIcon, PenLine, Columns2 } from "lucide-react";
import { NoteTree } from "./NoteTree";
import { GridView } from "./GridView";
import { WriteArea } from "./WriteArea";
import { ListView } from "./ListView";
import { RightPanel } from "./RightPanel";
import { useKachamak } from "@/lib/kachamak/store";
import type { NoteNode, SectionKey, ViewMode } from "@/lib/kachamak/types";
import { findNode, nodeWords } from "@/lib/kachamak/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROOT_KINDS: Record<SectionKey, { kind: NoteNode["kind"]; label: string }[]> = {
  binder: [{ kind: "act", label: "Act" }],
  planning: [
    { kind: "folder", label: "Folder" },
    { kind: "doc", label: "Note" },
  ],
  research: [
    { kind: "folder", label: "Folder" },
    { kind: "doc", label: "Note" },
  ],
  templates: [
    { kind: "folder", label: "Folder" },
    { kind: "doc", label: "Note" },
  ],
  prompts: [
    { kind: "folder", label: "Folder" },
    { kind: "doc", label: "Note" },
  ],
};

const VIEW_BTNS: { key: ViewMode; icon: React.ReactNode; label: string }[] = [
  { key: "split", icon: <Columns2 className="h-3.5 w-3.5" />, label: "Split" },
  { key: "write", icon: <PenLine className="h-3.5 w-3.5" />, label: "Write" },
  { key: "grid", icon: <LayoutGrid className="h-3.5 w-3.5" />, label: "Grid" },
  { key: "list", icon: <ListIcon className="h-3.5 w-3.5" />, label: "List" },
];

export function NotesSection({ section }: { section: SectionKey }) {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const selectedNodeId = useKachamak((s) => s.selectedNodeId);
  const select = useKachamak((s) => s.select);
  const view = useKachamak((s) => s.view);
  const setView = useKachamak((s) => s.setView);
  const updateNode = useKachamak((s) => s.updateNode);
  const leftPanelOpen = useKachamak((s) => s.leftPanelOpen);
  const rightPanelOpen = useKachamak((s) => s.rightPanelOpen);
  const toggleLeftPanel = useKachamak((s) => s.toggleLeftPanel);
  const toggleRightPanel = useKachamak((s) => s.toggleRightPanel);

  const novel = novels.find((n) => n.id === activeNovelId);
  const roots = novel?.sections[section] ?? [];
  const selected = selectedNodeId ? findNode(roots, selectedNodeId) : null;

  const showEditor = view === "split" || view === "write";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        {/* reopen left panel — full-height rail with the vertical line */}
        {!leftPanelOpen && (
          <div className="hidden w-7 shrink-0 flex-col items-center border-r border-white/10 bg-black/20 pt-2 md:flex">
            <button
              type="button"
              aria-label="Show panel"
              title="Show panel"
              onClick={toggleLeftPanel}
              className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {leftPanelOpen && (
          <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-black/20 md:block">
            <NoteTree section={section} label={section} rootKinds={ROOT_KINDS[section]} />
          </aside>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto kachamak-scroll">
          {view === "grid" && <GridView section={section} />}
          {view === "list" && <ListView section={section} />}
          {showEditor &&
            (selected ? (
              <WriteArea key={selected.id} node={selected} section={section} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
                <PenLine className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Select a note from the {section} tree to start writing.
                </p>
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  className="mt-2 rounded-lg border border-orange-500/40 px-3 py-1.5 text-xs text-orange-300 hover:bg-orange-500/10"
                >
                  Browse Grid view instead
                </button>
              </div>
            ))}
        </main>

        {rightPanelOpen ? (
          <aside className="hidden w-72 shrink-0 border-l border-white/10 bg-black/20 lg:block">
            {selected ? (
              <RightPanel node={selected} section={section} onHide={toggleRightPanel} />
            ) : (
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-1 pl-3 pr-2 pt-3">
                  <span className="flex-1 rounded-md bg-white/5 px-2.5 py-1.5 text-center text-xs text-muted-foreground">
                    Info
                  </span>
                  <button
                    type="button"
                    aria-label="Hide panel"
                    title="Hide panel"
                    onClick={toggleRightPanel}
                    className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <p className="p-4 text-xs leading-relaxed text-muted-foreground">
                  Select a note in the tree or a card in the Grid to see its synopsis,
                  notes and details here.
                </p>
              </div>
            )}
          </aside>
        ) : (
          <div className="hidden w-7 shrink-0 flex-col items-center border-l border-white/10 bg-black/20 pt-2 lg:flex">
            <button
              type="button"
              aria-label="Show panel"
              title="Show panel"
              onClick={toggleRightPanel}
              className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* status bar */}
      <footer className="flex items-center gap-3 border-t border-white/10 bg-black/30 px-4 py-1.5">
        <div
          role="toolbar"
          aria-label="View mode"
          className="flex overflow-hidden rounded-lg border border-white/10"
        >
          {VIEW_BTNS.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => setView(b.key)}
              aria-pressed={view === b.key}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs transition-colors ${
                view === b.key
                  ? "bg-orange-500/20 text-orange-300"
                  : "text-muted-foreground hover:bg-white/5"
              }`}
            >
              {b.icon} {b.label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-muted-foreground">
          {selected
            ? `${nodeWords(selected).toLocaleString()} words in “${selected.title}”`
            : `${roots.reduce((a, r) => a + nodeWords(r), 0).toLocaleString()} words total`}
        </span>

        {selected && (
          <div className="flex items-center gap-2">
            <Select
              value={selected.label || "none"}
              onValueChange={(v) =>
                updateNode(section, selected.id, { label: v === "none" ? "" : v })
              }
            >
              <SelectTrigger className="h-7 w-[110px] bg-black/20 text-xs" aria-label="Label">
                <SelectValue placeholder="No Label" />
              </SelectTrigger>
              <SelectContent className="bg-[#1b1b1b] border-white/10">
                <SelectItem value="none">No Label</SelectItem>
                {(novel?.labels ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: l.color }}
                      />
                      {l.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selected.status || "none"}
              onValueChange={(v) =>
                updateNode(section, selected.id, { status: v === "none" ? "" : v })
              }
            >
              <SelectTrigger className="h-7 w-[120px] bg-black/20 text-xs" aria-label="Status">
                <SelectValue placeholder="No Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#1b1b1b] border-white/10">
                <SelectItem value="none">No Status</SelectItem>
                {(novel?.statuses ?? []).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </footer>
    </div>
  );
}
