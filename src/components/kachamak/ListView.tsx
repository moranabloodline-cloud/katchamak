"use client";

import { FileText, FolderOpen } from "lucide-react";
import type { NoteNode, SectionKey } from "@/lib/kachamak/types";
import { useKachamak } from "@/lib/kachamak/store";
import { nodeWords, ownWords } from "@/lib/kachamak/utils";

function flatten(nodes: NoteNode[], out: NoteNode[] = []): NoteNode[] {
  for (const n of nodes) {
    out.push(n);
    flatten(n.children, out);
  }
  return out;
}

export function ListView({ section }: { section: SectionKey }) {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const selectedNodeId = useKachamak((s) => s.selectedNodeId);
  const select = useKachamak((s) => s.select);
  const novel = novels.find((n) => n.id === activeNovelId);
  const all = flatten(novel?.sections[section] ?? []);

  const total = all.reduce((a, n) => a + nodeWords(n), 0);

  return (
    <div className="p-6">
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
              return (
                <tr
                  key={n.id}
                  onClick={() => select(n.id)}
                  className={`cursor-pointer border-b border-white/5 transition-colors ${
                    selectedNodeId === n.id
                      ? "bg-amber-400/10"
                      : "hover:bg-white/[0.04]"
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      {parent ? (
                        <FolderOpen className="h-4 w-4 shrink-0 text-orange-400/80" />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className={parent ? "font-medium" : ""}>{n.title}</span>
                    </span>
                  </td>
                  <td className="hidden max-w-0 truncate px-4 py-2.5 text-muted-foreground md:table-cell">
                    {n.synopsis || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {/* kontejner: reči podstabla; list: sav tekst same note
                        (content + Synopsis + Notes) — isti jezik kao Details */}
                    {parent ? nodeWords(n).toLocaleString() : ownWords(n).toLocaleString()}
                  </td>
                  <td className="hidden px-4 py-2.5 sm:table-cell">
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
