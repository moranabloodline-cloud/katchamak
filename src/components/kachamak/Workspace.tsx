"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, FileText, House, Save, Search, Settings, Upload } from "lucide-react";
import { exportNovelJson, useKachamak } from "@/lib/kachamak/store";
import { SCOPE_LABELS, TABS } from "@/lib/kachamak/types";
import type { NoteNode, SectionKey, TabKey, TreeScope } from "@/lib/kachamak/types";
import { NotesSection } from "./NotesSection";
import { TrashView } from "./TrashView";
import { AccountDialog } from "./AccountDialog";
import { NOTE_ICONS, iconByName } from "@/lib/kachamak/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

/* ---------- project search (top bar, left panel zone) ---------- */

function ProjectSearch() {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const setTab = useKachamak((s) => s.setTab);
  const select = useKachamak((s) => s.select);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const novel = novels.find((n) => n.id === activeNovelId);

  const results = useMemo(() => {
    if (!novel || !q.trim()) return [];
    const needle = q.trim().toLowerCase();
    const out: { node: NoteNode; section: SectionKey }[] = [];
    for (const key of Object.keys(novel.sections) as SectionKey[]) {
      const walk = (nodes: NoteNode[]) => {
        for (const n of nodes) {
          if (n.title.toLowerCase().includes(needle)) {
            out.push({ node: n, section: key });
          }
          walk(n.children);
        }
      };
      walk(novel.sections[key]);
    }
    return out.slice(0, 8);
  }, [novel, q]);

  const go = (r: { node: NoteNode; section: SectionKey }) => {
    setTab(r.section);
    select(r.node.id);
    setQ("");
    setOpen(false);
  };

  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && results[0]) go(results[0]);
        }}
        placeholder="Search project."
        aria-label="Search project"
        className="h-9 w-full rounded-lg border border-white/15 bg-[#10151d] pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-amber-500/50"
      />
      {open && q.trim() && (
        <div className="absolute inset-x-0 top-11 z-50 max-h-80 overflow-y-auto kachamak-scroll rounded-lg border border-white/10 bg-[#161616] p-1.5 shadow-2xl">
          {results.map((r) => {
            const Icon = iconByName(r.node.icon);
            return (
              <button
                key={r.node.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(r)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/10"
              >
                {Icon ? (
                  <Icon
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: r.node.color || "#a1a1aa" }}
                  />
                ) : (
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate">{r.node.title}</span>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {TABS.find((t) => t.key === r.section)?.label ?? r.section}
                </span>
              </button>
            );
          })}
          {results.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">No matches.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- settings (the gear) ---------- */

function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const importNovel = useKachamak((s) => s.importNovel);
  const novel = novels.find((n) => n.id === activeNovelId);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#1b1b1b] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <button
            type="button"
            disabled={!novel}
            onClick={() => {
              if (!novel) return;
              exportNovelJson(novel);
              toast.success("Backup downloaded.");
            }}
            className="flex w-full items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm transition-colors hover:bg-white/5 disabled:opacity-40"
          >
            <Save className="h-4 w-4" /> Export backup of “{novel?.title ?? "—"}”
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm transition-colors hover:bg-white/5"
          >
            <Upload className="h-4 w-4" /> Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const reader = new FileReader();
              reader.onload = () => {
                const res = importNovel(String(reader.result));
                if (res.ok) toast.success("Novel imported from backup.");
                else toast.error(res.error ?? "Import failed.");
              };
              reader.readAsText(f);
              e.target.value = "";
            }}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Everything is saved locally in this browser. Export a JSON backup from
            time to time to keep it safe.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- workspace ---------- */

export function Workspace() {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const activeTab = useKachamak((s) => s.activeTab);
  const setTab = useKachamak((s) => s.setTab);
  const closeNovel = useKachamak((s) => s.closeNovel);
  const treeScope = useKachamak((s) => s.treeScope);
  const setTreeScope = useKachamak((s) => s.setTreeScope);
  const defaultAuthor = useKachamak((s) => s.defaultAuthor);
  const leftPanelOpen = useKachamak((s) => s.leftPanelOpen);
  const rightPanelOpen = useKachamak((s) => s.rightPanelOpen);
  const leftPanelWidth = useKachamak((s) => s.leftPanelWidth);
  const rightPanelWidth = useKachamak((s) => s.rightPanelWidth);

  const [accountOpen, setAccountOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const novel = novels.find((n) => n.id === activeNovelId);
  if (!novel) return null;

  const initials =
    defaultAuthor
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "ND";

  return (
    <div className="flex h-screen flex-col bg-[#0d0d0d] text-foreground">
      {/* top bar — one continuous strip, identical on every tab; the vertical
          dividers line up with the panel edges below and run to the very top
          (the +1 covers the 1px resizer column so the lines are never bent) */}
      <header className="flex shrink-0 items-stretch border-b border-white/10">
        {/* left panel zone: home icon pinned to the corner + project search */}
        <div
          className="flex shrink-0 items-center gap-2.5 border-r border-white/10 bg-black/20 px-3"
          style={{ width: leftPanelOpen ? leftPanelWidth + 1 : 28 }}
        >
          <button
            type="button"
            aria-label="Back to dashboard"
            title="Dashboard"
            onClick={closeNovel}
            className="shrink-0 rounded-md p-1 text-stone-200 hover:bg-white/10 hover:text-white"
          >
            <House className="h-5 w-5" />
          </button>
          {leftPanelOpen && <ProjectSearch />}
        </div>

        {/* tabs start at the left edge of the workspace */}
        <nav
          aria-label="Workspace sections"
          className="flex min-w-0 flex-1 items-center gap-1.5 px-4"
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key as TabKey)}
              aria-current={activeTab === t.key ? "page" : undefined}
              className={`shrink-0 rounded-lg px-3.5 py-1 text-base transition-colors ${
                activeTab === t.key
                  ? "border border-[#ad7e2e]/80 bg-[#3a2c18] text-[#fbe4a6]"
                  : "border border-transparent text-stone-300 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* right panel zone: folder-level dropdown, save, account, settings */}
        <div
          className="flex shrink-0 items-center gap-3 border-l border-white/10 bg-black/20 px-3.5"
          style={{ width: rightPanelOpen ? rightPanelWidth + 1 : 28 }}
        >
          {rightPanelOpen ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Tree level"
                    title="Which level of the tree to show"
                    className="flex h-9 min-w-0 items-center gap-2 rounded-lg border border-white/15 px-3.5 text-[15px] text-stone-100 transition-colors hover:bg-white/5"
                  >
                    <span className="truncate">{SCOPE_LABELS[treeScope]}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-64 border-white/10 bg-[#1b1b1b]"
                >
                  {(Object.keys(SCOPE_LABELS) as TreeScope[]).map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onSelect={() => setTreeScope(s)}
                      className={treeScope === s ? "bg-white/10" : ""}
                    >
                      {SCOPE_LABELS[s]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <span className="ml-auto" />

              <button
                type="button"
                aria-label="Save"
                title="Save"
                onClick={() =>
                  toast.success(
                    `Saved locally · ${new Date().toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}`
                  )
                }
                className="rounded-md p-1 text-stone-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Save className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="My account"
                title="My account"
                onClick={() => setAccountOpen(true)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-[#18202c] text-[11px] font-bold text-stone-200 transition-colors hover:border-white/50"
              >
                {initials}
              </button>
              <button
                type="button"
                aria-label="Settings"
                title="Settings"
                onClick={() => setSettingsOpen(true)}
                className="rounded-md p-1 text-stone-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Settings className="h-5 w-5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              aria-label="Settings"
              title="Settings"
              onClick={() => setSettingsOpen(true)}
              className="mx-auto rounded-md p-1 text-stone-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Settings className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      {/* body — every tab is the same note system; only Trash is different */}
      {activeTab === "trash" ? (
        <TrashView />
      ) : (
        <NotesSection section={activeTab as SectionKey} />
      )}

      <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
