"use client";

import { useState } from "react";
import { AlertTriangle, RotateCcw, Trash2, FileText } from "lucide-react";
import { useKachamak } from "@/lib/kachamak/store";
import type { SectionKey } from "@/lib/kachamak/types";
import { formatDate } from "@/lib/kachamak/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SECTION_NAMES: Record<SectionKey, string> = {
  binder: "Binder",
  planning: "Planning",
  research: "Research",
  templates: "Templates",
  prompts: "Prompts",
};

export function TrashView() {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const restoreFromTrash = useKachamak((s) => s.restoreFromTrash);
  const deleteForever = useKachamak((s) => s.deleteForever);
  const emptyTrash = useKachamak((s) => s.emptyTrash);
  const novel = novels.find((n) => n.id === activeNovelId);
  const [filter, setFilter] = useState("");

  if (!novel) return null;

  const items = novel.trash.filter((t) =>
    t.node.title.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-black/20 md:block">
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-orange-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {novel.title}
            </span>
          </div>
        </div>
        <div className="space-y-1 px-2 pb-3">
          {(Object.keys(SECTION_NAMES) as SectionKey[]).map((k) => {
            const count = novel.trash.filter((t) => t.section === k).length;
            return (
              <div
                key={k}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/80"
              >
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1">{SECTION_NAMES[k]}</span>
                <span className="text-[10px] text-muted-foreground">{count || ""}</span>
              </div>
            );
          })}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto kachamak-scroll">
        <div className="mx-auto max-w-2xl p-8">
          <h2 className="text-2xl font-bold">Trash</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Deleted notes and their sub-pages appear here. Restore them whenever you need
            them.
          </p>

          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name…"
            aria-label="Filter trash by name"
            className="mt-4 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-orange-500/50"
          />

          <div className="mt-4 space-y-2">
            {items.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.node.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {SECTION_NAMES[t.section]} · deleted {formatDate(t.deletedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => restoreFromTrash(t.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-green-500/40 px-2.5 py-1.5 text-xs text-green-300 hover:bg-green-500/10"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restore
                </button>
                <button
                  type="button"
                  onClick={() => deleteForever(t.id)}
                  aria-label={`Delete ${t.node.title} forever`}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {novel.trash.length === 0 && (
            <div className="mt-8 rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
              Trash is empty — {novel.trash.length} items.
            </div>
          )}
          {novel.trash.length > 0 && items.length === 0 && (
            <div className="mt-8 rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
              No items match “{filter}”.
            </div>
          )}

          {/* danger zone */}
          <div className="mt-10 rounded-xl border border-red-500/30 bg-red-500/[0.04] p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-red-400">
              <AlertTriangle className="h-4 w-4" /> Danger Zone
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Emptying the trash permanently removes {novel.trash.length} item
              {novel.trash.length === 1 ? "" : "s"} and their entire history. This cannot
              be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  disabled={novel.trash.length === 0}
                  className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Delete {novel.trash.length} item{novel.trash.length === 1 ? "" : "s"} forever
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#1b1b1b] border-white/10">
                <AlertDialogHeader>
                  <AlertDialogTitle>Empty the Trash?</AlertDialogTitle>
                  <AlertDialogDescription>
                    All {novel.trash.length} deleted items will be permanently destroyed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-white/10">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-500"
                    onClick={emptyTrash}
                  >
                    Empty Trash
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </main>

      <aside className="hidden w-72 shrink-0 border-l border-white/10 bg-black/20 p-4 lg:block">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          About restoring
        </h4>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Restoring a note keeps its text, formatting, synopsis, status and metadata. If
          its original parent folder was also deleted, the note returns to the top of its
          section.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Deleted items never expire — they stay here until you remove them.
        </p>
      </aside>
    </div>
  );
}
