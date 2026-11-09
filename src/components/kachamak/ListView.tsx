"use client";

import { useRef, useState } from "react";
import { FileText, FolderOpen } from "lucide-react";
import type { NoteNode, SectionKey } from "@/lib/kachamak/types";
import { useKachamak } from "@/lib/kachamak/store";
import { findNode, locateNode, nodeWords, ownWords } from "@/lib/kachamak/utils";

function flatten(nodes: NoteNode[], out: NoteNode[] = []): NoteNode[] {
  for (const n of nodes) {
    out.push(n);
    flatten(n.children, out);
  }
  return out;
}

/* DnD u listi — isto kao u stablu: gore = „pre“, sredina = „u“ (sub-strana),
   dole = „posle“; računa se nad stvarnim stablom sekcije */
type DropMode = "before" | "onto" | "after";

export function ListView({ section }: { section: SectionKey }) {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const selectedNodeId = useKachamak((s) => s.selectedNodeId);
  const select = useKachamak((s) => s.select);
  const moveNodeTo = useKachamak((s) => s.moveNodeTo);
  const midZoom = useKachamak((s) => s.midZoom ?? 1);
  const novel = novels.find((n) => n.id === activeNovelId);
  const roots = novel?.sections[section] ?? [];
  const all = flatten(roots);

  const total = all.reduce((a, n) => a + nodeWords(n), 0);

  /* ---------- drag & drop ---------- */
  const dragSrcId = useRef<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; mode: DropMode } | null>(null);

  const isInvalidTarget = (srcId: string, targetId: string): boolean => {
    if (srcId === targetId) return true;
    const srcNode = findNode(roots, srcId);
    return !srcNode || !!findNode([srcNode], targetId);
  };

  const modeForEvent = (e: React.DragEvent): DropMode => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = (e.clientY - rect.top) / Math.max(rect.height, 1);
    return y < 0.3 ? "before" : y > 0.7 ? "after" : "onto";
  };

  const onDropRow = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const srcId = dragSrcId.current;
    dragSrcId.current = null;
    setDrop(null);
    if (!srcId || isInvalidTarget(srcId, id)) return;
    const mode = modeForEvent(e);
    const tgtLoc = locateNode(roots, id);
    if (!tgtLoc) return;
    if (mode === "onto") {
      moveNodeTo(section, srcId, section, id);
      return;
    }
    const srcLoc = locateNode(roots, srcId);
    if (!srcLoc) return;
    let insertIdx = mode === "before" ? tgtLoc.index : tgtLoc.index + 1;
    if (srcLoc.parentId === tgtLoc.parentId) {
      if (srcLoc.index < tgtLoc.index) insertIdx -= 1;
      if (insertIdx === srcLoc.index) return;
    }
    moveNodeTo(section, srcId, section, tgtLoc.parentId, insertIdx);
  };

  return (
    <div className="p-6" style={{ zoom: midZoom }}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {all.length} notes · {total.toLocaleString()} words
        </h3>
      </div>
      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Title</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Synopsis</th>
              <th className="px-4 py-2.5 font-medium">Words</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Status</th>
            </tr>
          </thead>
          <tbody>
            {all.map((n) => {
              const parent = n.children.length > 0;
              const dropHere = drop && drop.id === n.id ? drop.mode : null;
              const dropLine =
                dropHere === "before"
                  ? "shadow-[inset_0_2px_0_0_#ad7e2e]"
                  : dropHere === "after"
                    ? "shadow-[inset_0_-2px_0_0_#ad7e2e]"
                    : "";
              return (
                <tr
                  key={n.id}
                  onClick={() => select(n.id)}
                  draggable
                  onDragStart={(e) => {
                    dragSrcId.current = n.id;
                    e.dataTransfer.setData("text/plain", n.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    dragSrcId.current = null;
                    setDrop(null);
                  }}
                  onDragOver={(e) => {
                    const srcId = dragSrcId.current;
                    if (!srcId || isInvalidTarget(srcId, n.id)) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    const mode = modeForEvent(e);
                    setDrop((d) =>
                      d && d.id === n.id && d.mode === mode ? d : { id: n.id, mode }
                    );
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                    setDrop((d) => (d && d.id === n.id ? null : d));
                  }}
                  onDrop={(e) => onDropRow(e, n.id)}
                  className={`cursor-pointer border-b border-white/5 transition-colors ${
                    selectedNodeId === n.id
                      ? "bg-amber-400/10"
                      : "hover:bg-white/[0.04]"
                  } ${dropHere === "onto" ? "bg-amber-400/15" : ""}`}
                >
                  <td className={`px-4 py-2.5 ${dropLine}`}>
                    <span className="flex items-center gap-2">
                      {parent ? (
                        <FolderOpen className="h-4 w-4 shrink-0 text-orange-400/80" />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className={parent ? "font-medium" : ""}>{n.title}</span>
                    </span>
                  </td>
                  <td className={`hidden max-w-0 truncate px-4 py-2.5 text-muted-foreground md:table-cell ${dropLine}`}>
                    {n.synopsis || "—"}
                  </td>
                  <td className={`px-4 py-2.5 text-muted-foreground ${dropLine}`}>
                    {/* kontejner: reči podstabla; list: sav tekst same note
                        (content + Synopsis + Notes) — isti jezik kao Details */}
                    {parent ? nodeWords(n).toLocaleString() : ownWords(n).toLocaleString()}
                  </td>
                  <td className={`hidden px-4 py-2.5 sm:table-cell ${dropLine}`}>
                    {n.status ? (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                        {n.status}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {all.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  This section is empty.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
