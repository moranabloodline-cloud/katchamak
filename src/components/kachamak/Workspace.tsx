"use client";

import { ArrowLeft, Download, Lock } from "lucide-react";
import { exportNovelJson, useKachamak } from "@/lib/kachamak/store";
import { TABS } from "@/lib/kachamak/types";
import type { TabKey } from "@/lib/kachamak/types";
import { NotesSection } from "./NotesSection";
import { CodexView } from "./CodexView";
import { TrashView } from "./TrashView";
import { novelWords } from "@/lib/kachamak/utils";
import { toast } from "sonner";

export function Workspace() {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const activeTab = useKachamak((s) => s.activeTab);
  const setTab = useKachamak((s) => s.setTab);
  const closeNovel = useKachamak((s) => s.closeNovel);
  const renameNovel = useKachamak((s) => s.renameNovel);

  const novel = novels.find((n) => n.id === activeNovelId);
  if (!novel) return null;

  return (
    <div className="flex h-screen flex-col bg-[#0d0d0d] text-foreground">
      {/* header */}
      <header className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
        <button
          type="button"
          onClick={closeNovel}
          aria-label="Back to library"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-lg">🍲</span>
        <input
          value={novel.title}
          onChange={(e) => renameNovel(e.target.value)}
          aria-label="Novel title"
          className="w-40 rounded-md bg-transparent px-1.5 py-1 font-bold outline-none hover:bg-white/5 focus:bg-white/10 sm:w-56"
        />
        <span className="hidden items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[9px] font-semibold tracking-widest text-muted-foreground lg:flex">
          <Lock className="h-2.5 w-2.5" /> PRIVATE
        </span>

        <nav
          aria-label="Workspace sections"
          className="order-last flex w-full flex-wrap items-center gap-1 overflow-x-auto sm:order-none sm:w-auto sm:flex-1 sm:justify-center"
        >
          {TABS.map((t) => {
            const badge =
              t.key === "trash" && novel.trash.length > 0 ? novel.trash.length : null;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key as TabKey)}
                aria-current={activeTab === t.key ? "page" : undefined}
                className={`relative rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  activeTab === t.key
                    ? "bg-orange-500/15 font-semibold text-orange-300"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {t.label}
                {badge !== null && (
                  <span className="ml-1.5 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[9px] text-red-300">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:block">
            {novelWords(novel).toLocaleString()} words
          </span>
          <button
            type="button"
            aria-label="Export backup"
            onClick={() => {
              exportNovelJson(novel);
              toast.success("Backup downloaded.");
            }}
            className="rounded-lg border border-white/10 p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* body */}
      {activeTab === "codex" ? (
        <CodexView />
      ) : activeTab === "trash" ? (
        <TrashView />
      ) : (
        <NotesSection section={activeTab as Parameters<typeof NotesSection>[0]["section"]} />
      )}
    </div>
  );
}
