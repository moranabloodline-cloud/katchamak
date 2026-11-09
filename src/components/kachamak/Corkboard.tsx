"use client";

import { useRef, useState } from "react";
import { FileText } from "lucide-react";
import type { NoteNode, SectionKey } from "@/lib/kachamak/types";
import { TABS } from "@/lib/kachamak/types";
import { useKachamak } from "@/lib/kachamak/store";
import { findNode } from "@/lib/kachamak/utils";
import { iconByName } from "@/lib/kachamak/icons";

/* ---------- classic Scrivener index card: icon + title + synopsis ---------- */

function IndexCard({
  node,
  draggable,
  onDragStartCard,
  onDragOverCard,
  onDropOnCard,
  isDropTarget,
  side,
}: {
  node: NoteNode;
  draggable: boolean;
  onDragStartCard?: (id: string) => void;
  onDragOverCard?: (id: string, after: boolean) => void;
  onDropOnCard?: (targetId: string, after: boolean) => void;
  isDropTarget: boolean;
  side: "before" | "after" | null;
}) {
  const selectedNodeId = useKachamak((s) => s.selectedNodeId);
  const select = useKachamak((s) => s.select);
  const selected = selectedNodeId === node.id;
  const Icon = iconByName(node.icon);

  const open = () => {
    select(node.id);
    useKachamak.getState().setView("write");
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${node.title} — index card`}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", node.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStartCard?.(node.id);
      }}
      onClick={() => select(node.id)}
      onDoubleClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter") open();
      }}
      onDragOver={(e) => {
        if (!onDropOnCard) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const rect = e.currentTarget.getBoundingClientRect();
        onDragOverCard?.(node.id, e.clientX > rect.left + rect.width / 2);
      }}
      onDrop={(e) => {
        if (!onDropOnCard) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        onDropOnCard(node.id, e.clientX > rect.left + rect.width / 2);
      }}
      className={`relative flex h-60 w-60 shrink-0 cursor-pointer flex-col rounded-[3px] border text-left transition-shadow ${
        selected
          ? "border-[#ad7e2e] shadow-[0_0_0_2px_rgba(173,126,46,0.45),0_4px_10px_rgba(0,0,0,0.45)]"
          : "border-black/30 shadow-[0_3px_8px_rgba(0,0,0,0.4)] hover:shadow-[0_5px_12px_rgba(0,0,0,0.5)]"
      } ${isDropTarget && side === "before" ? "shadow-[-4px_0_0_0_#ad7e2e]" : ""} ${
        isDropTarget && side === "after" ? "shadow-[4px_0_0_0_#ad7e2e]" : ""
      } ${node.hidden ? "opacity-50" : ""}`}
      style={{ backgroundColor: "#efe6cf", color: "#2a2118" }}
    >
      {/* title line — icon + title, thin rule under it, like the original card */}
      <div className="flex items-center gap-1.5 border-b border-[#2a2118]/30 px-3 py-2">
        {Icon ? (
          <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: node.color || "#7a6a4f" }} />
        ) : (
          <FileText className="h-3.5 w-3.5 shrink-0 text-[#7a6a4f]" />
        )}
        <span className="truncate text-[13px] font-semibold leading-tight">{node.title}</span>
      </div>
      <p className="flex-1 overflow-hidden px-3 py-2 text-[12px] leading-relaxed text-[#4a4036]">
        {node.synopsis || (
          <span className="italic text-[#8a7b60]">
            No synopsis yet — write it in the Info panel.
          </span>
        )}
      </p>
    </div>
  );
}

/* ---------- the corkboard: one hierarchy level at a time ---------- */

export function Corkboard({ section }: { section: SectionKey }) {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const selectedNodeId = useKachamak((s) => s.selectedNodeId);
  const addNode = useKachamak((s) => s.addNode);
  const moveNodeTo = useKachamak((s) => s.moveNodeTo);
  const novel = novels.find((n) => n.id === activeNovelId);
  const roots = novel?.sections[section] ?? [];

  /* which level is open: children of the selected container; a leaf note
     shows itself; nothing selected shows the section roots (top level) */
  const selected = selectedNodeId ? findNode(roots, selectedNodeId) : null;
  const isContainer = !!selected && selected.children.length > 0;
  const cards = selected ? (isContainer ? selected.children : [selected]) : roots;
  const reorderParentId = isContainer ? selected.id : null;
  const levelChildren = isContainer && selected ? selected.children : [];
  const newNoteParentId = selected ? selected.id : null;

  const sectionLabel = TABS.find((t) => t.key === section)?.label ?? section;
  const levelName = selected ? selected.title : `${sectionLabel} — top level`;

  /* the id travels in a ref (HTML5 dataTransfer can't be read during dragover) */
  const dragSrcId = useRef<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; side: "before" | "after" } | null>(null);

  const reorder = (targetId: string, after: boolean) => {
    const srcId = dragSrcId.current;
    dragSrcId.current = null;
    setDrop(null);
    if (!srcId || !reorderParentId) return;
    if (srcId === targetId) return;
    const list = levelChildren;
    const srcIdx = list.findIndex((n) => n.id === srcId);
    const tgtIdx = list.findIndex((n) => n.id === targetId);
    if (srcIdx < 0 || tgtIdx < 0) return;
    let insertIdx = after ? tgtIdx + 1 : tgtIdx;
    if (srcIdx < tgtIdx) insertIdx -= 1;
    if (insertIdx === srcIdx) return;
    moveNodeTo(section, srcId, section, reorderParentId, insertIdx);
  };

  return (
    <div
      className="min-h-full bg-[#241c12]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        /* drop on the bare cork (gaps, "+" button) → move to the end of the level */
        const srcId = dragSrcId.current;
        dragSrcId.current = null;
        setDrop(null);
        if (!srcId || !reorderParentId) return;
        const list = levelChildren;
        const srcIdx = list.findIndex((n) => n.id === srcId);
        if (srcIdx < 0 || srcIdx === list.length - 1) return;
        moveNodeTo(section, srcId, section, reorderParentId, list.length - 1);
      }}
    >
      <div className="px-6 pb-1 pt-5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#c9a55c]/80">
          Corkboard · {levelName}
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-4 p-6 pt-3">
        {cards.map((c) => (
          <IndexCard
            key={c.id}
            node={c}
            draggable={!!reorderParentId}
            onDragStartCard={(id) => (dragSrcId.current = id)}
            onDragOverCard={(id, after) => setDrop({ id, side: after ? "after" : "before" })}
            onDropOnCard={reorder}
            isDropTarget={drop?.id === c.id}
            side={drop?.id === c.id ? drop.side : null}
          />
        ))}

        <button
          type="button"
          onClick={() => addNode(section, newNoteParentId, "doc")}
          className="flex h-60 w-60 shrink-0 flex-col items-center justify-center gap-2 rounded-[3px] border-2 border-dashed border-white/15 text-[#c9a55c]/70 hover:border-[#c9a55c]/50 hover:text-[#c9a55c] cursor-pointer"
        >
          <span className="text-lg leading-none">+</span>
          <span className="text-xs">New note</span>
        </button>

        {cards.length === 0 && (
          <p className="w-full text-sm text-[#b09a72]">
            Empty container — use “+” to add the first sub-note.
          </p>
        )}
      </div>
    </div>
  );
}
