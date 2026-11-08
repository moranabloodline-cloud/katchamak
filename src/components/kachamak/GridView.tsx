"use client";

import { ChevronDown, ChevronRight, FileText, StickyNote } from "lucide-react";
import type { NoteNode, SectionKey } from "@/lib/kachamak/types";
import { useKachamak } from "@/lib/kachamak/store";
import { countWords, nodeWords } from "@/lib/kachamak/utils";

const kindLabel: Record<string, string> = {
  act: "ACT",
  chapter: "CHAPTER",
  folder: "FOLDER",
  scene: "SCENE",
  doc: "NOTE",
};

/* ---------- leaf card: title + synopsis ---------- */

function LeafCard({ node, section }: { node: NoteNode; section: SectionKey }) {
  const selectedNodeId = useKachamak((s) => s.selectedNodeId);
  const select = useKachamak((s) => s.select);
  const selected = selectedNodeId === node.id;
  const words = countWords(node.content);

  return (
    <button
      type="button"
      onClick={() => select(node.id)}
      onDoubleClick={() => {
        select(node.id);
        useKachamak.getState().setView("split");
      }}
      aria-pressed={selected}
      className={`group w-60 shrink-0 text-left rounded-xl border p-4 transition-all cursor-pointer ${
        selected
          ? "border-green-500/60 bg-green-500/10 shadow-[0_0_0_1px_rgba(34,197,94,0.25)]"
          : "border-white/10 bg-white/[0.03] hover:border-orange-400/50 hover:bg-white/[0.06]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-semibold tracking-widest text-orange-400/90">
          {kindLabel[node.kind] ?? "NOTE"}
        </span>
        {node.label && <DotLabel id={node.label} />}
      </div>
      <h4 className="mt-1.5 font-semibold text-sm leading-snug text-foreground line-clamp-2">
        {node.title}
      </h4>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-5">
        {node.synopsis || "No synopsis yet — open the Info panel to write one."}
      </p>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground/80">
        {node.status ? (
          <span className="rounded-full bg-white/10 px-2 py-0.5">{node.status}</span>
        ) : (
          <StickyNote className="h-3 w-3" />
        )}
        <span className="ml-auto">{words.toLocaleString()} words</span>
      </div>
      <span className="sr-only">Open {node.title} in section {section}</span>
    </button>
  );
}

function DotLabel({ id }: { id: string }) {
  const novel = useKachamak((s) => s.novels.find((n) => n.id === s.activeNovelId));
  const lbl = novel?.labels.find((l) => l.id === id);
  if (!lbl) return null;
  return (
    <span
      aria-label={`Label: ${lbl.name}`}
      className="h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: lbl.color }}
    />
  );
}

/* ---------- parent frame: expands around children, no synopsis in grid ---------- */

function ParentFrame({
  node,
  section,
  depth,
}: {
  node: NoteNode;
  section: SectionKey;
  depth: number;
}) {
  const selectedNodeId = useKachamak((s) => s.selectedNodeId);
  const select = useKachamak((s) => s.select);
  const updateNode = useKachamak((s) => s.updateNode);
  const selected = selectedNodeId === node.id;
  const open = !node.collapsed;
  const childCount = node.children.length;
  const words = nodeWords(node);

  return (
    <div
      className={`w-fit max-w-full rounded-2xl border-2 p-3 transition-colors ${
        selected
          ? "border-green-500/60 bg-green-500/[0.06]"
          : depth === 0
            ? "border-orange-500/40 bg-orange-500/[0.04]"
            : "border-white/15 bg-white/[0.02]"
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => select(node.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter") select(node.id);
        }}
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-1 pb-1 text-left"
      >
        <button
          type="button"
          aria-label={open ? "Collapse frame" : "Expand frame"}
          onClick={(e) => {
            e.stopPropagation();
            updateNode(section, node.id, { collapsed: open });
          }}
          className="rounded p-0.5 hover:bg-white/10"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 text-orange-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-orange-400" />
          )}
        </button>
        <span className="text-[10px] font-bold tracking-widest text-orange-400">
          {kindLabel[node.kind] ?? "FOLDER"}
        </span>
        <span className="font-semibold text-sm text-foreground">{node.title}</span>
        <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-muted-foreground">
          {childCount} {childCount === 1 ? "item" : "items"}
        </span>
        <span className="text-[10px] text-muted-foreground/70">
          {words.toLocaleString()} words
        </span>
      </div>
      {open && (
        <div className="mt-2 flex flex-wrap items-start gap-3">
          {node.children.map((c) =>
            c.children.length > 0 ? (
              <ParentFrame key={c.id} node={c} section={section} depth={depth + 1} />
            ) : (
              <LeafCard key={c.id} node={c} section={section} />
            )
          )}
          {childCount === 0 && (
            <p className="px-1 py-3 text-xs text-muted-foreground italic flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Empty container — add sub-notes from the
              tree.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- the grid: same rule on every tab ---------- */

export function GridView({ section }: { section: SectionKey }) {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const addNode = useKachamak((s) => s.addNode);
  const novel = novels.find((n) => n.id === activeNovelId);
  const roots = novel?.sections[section] ?? [];

  const rootLabel = section === "binder" ? "Act" : "Folder";
  const rootKind = section === "binder" ? "act" : "folder";

  return (
    <div className="flex flex-wrap items-start gap-4 p-6">
      {roots.map((r) =>
        r.children.length > 0 ? (
          <ParentFrame key={r.id} node={r} section={section} depth={0} />
        ) : (
          <LeafCard key={r.id} node={r} section={section} />
        )
      )}

      <button
        type="button"
        onClick={() => addNode(section, null, rootKind as NoteNode["kind"])}
        className="flex h-auto min-h-24 w-60 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 p-6 text-muted-foreground hover:border-orange-400/50 hover:text-foreground cursor-pointer"
      >
        <span className="text-lg leading-none">+</span>
        <span className="text-xs">New {rootLabel}</span>
      </button>

      {roots.length === 0 && (
        <p className="w-full text-sm text-muted-foreground">
          Nothing here yet — parents become frames, leaf notes become cards with their
          synopsis. Create the first one with the dashed button.
        </p>
      )}
    </div>
  );
}
