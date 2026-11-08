"use client";

import { useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Folder,
  FolderOpen,
  MapPin,
  Package,
  ScrollText,
  Trash2,
  Users,
  Plus,
  SquarePlus,
  MoreHorizontal,
  ImagePlus,
  X,
  AtSign,
} from "lucide-react";
import { RichEditor } from "./RichEditor";
import { useKachamak } from "@/lib/kachamak/store";
import type { CodexCategory } from "@/lib/kachamak/types";
import { CODEX_TYPES } from "@/lib/kachamak/seed";
import { countWords, findNodeSafe } from "@/lib/kachamak/codex-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const catIcon = (name: string, open: boolean) => {
  const n = name.toLowerCase();
  if (n.startsWith("char"))
    return <Users className="h-3.5 w-3.5 text-orange-400/80" />;
  if (n.startsWith("loc"))
    return <MapPin className="h-3.5 w-3.5 text-orange-400/80" />;
  if (n.startsWith("thing"))
    return <Package className="h-3.5 w-3.5 text-orange-400/80" />;
  if (n.startsWith("lore"))
    return <ScrollText className="h-3.5 w-3.5 text-orange-400/80" />;
  return open ? (
    <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
  ) : (
    <Folder className="h-3.5 w-3.5 text-muted-foreground" />
  );
};

/* ---------- sidebar tree ---------- */

interface CatRowProps {
  cat: CodexCategory;
  depth: number;
}

function CatRow({ cat, depth }: CatRowProps) {
  const selectedCodexId = useKachamak((s) => s.selectedCodexId);
  const selectCodex = useKachamak((s) => s.selectCodex);
  const addCategory = useKachamak((s) => s.addCategory);
  const renameCategory = useKachamak((s) => s.renameCategory);
  const deleteCategory = useKachamak((s) => s.deleteCategory);
  const addEntry = useKachamak((s) => s.addEntry);
  const codexCollapsed = useKachamak((s) => s.codexCollapsed);
  const toggleCodexCat = useKachamak((s) => s.toggleCodexCat);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(cat.name);

  const open = !codexCollapsed[cat.id];
  const entryCount = useMemo(() => {
    let k = cat.entries.length;
    const walk = (c: CodexCategory) => {
      c.children.forEach((ch) => {
        k += ch.entries.length;
        walk(ch);
      });
    };
    cat.children.forEach(walk);
    return k;
  }, [cat]);

  return (
    <div>
      <div
        className={`group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm select-none cursor-pointer ${
          selectedCodexId === cat.id
            ? "bg-orange-500/15 text-orange-200"
            : "hover:bg-white/5 text-foreground/90"
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => selectCodex(cat.id)}
      >
        <button
          type="button"
          aria-label={open ? "Collapse" : "Expand"}
          onClick={(e) => {
            e.stopPropagation();
            toggleCodexCat(cat.id);
          }}
          className="shrink-0"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
        {catIcon(cat.name, open)}
        {renaming ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              setRenaming(false);
              renameCategory(cat.id, draft);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setRenaming(false);
                renameCategory(cat.id, draft);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 bg-black/40 border border-orange-500/50 rounded px-1 text-sm outline-none"
          />
        ) : (
          <span className="flex-1 min-w-0 truncate">{cat.name}</span>
        )}
        <span className="shrink-0 text-[10px] text-muted-foreground group-hover:hidden">
          {entryCount || ""}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label="Category actions"
              className="hidden shrink-0 rounded p-0.5 hover:bg-white/10 group-hover:block"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#1b1b1b] border-white/10">
            <DropdownMenuItem onClick={() => addEntry(cat.id, "New Entry")}>
              New entry here
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addCategory(cat.id, "New Folder")}>
              New subfolder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRenaming(true)}>Rename</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => deleteCategory(cat.id)}
              className="text-red-400 focus:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {open && (
        <div>
          {cat.children.map((c) => (
            <CatRow key={c.id} cat={c} depth={depth + 1} />
          ))}
          {cat.entries.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => selectCodex(e.id)}
              className={`flex w-full items-center gap-1.5 rounded-md py-1.5 pl-8 pr-2 text-left text-sm cursor-pointer ${
                selectedCodexId === e.id
                  ? "bg-green-500/20 text-green-100 border border-green-500/40"
                  : "border border-transparent hover:bg-white/5 text-foreground/80"
              }`}
              style={{ marginLeft: `${depth * 14}px`, marginRight: "8px" }}
            >
              <ScrollText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 min-w-0 truncate">{e.title}</span>
              {e.entryType === "God/Deity" && (
                <span className="text-[10px] text-orange-400">✦</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- entry editor ---------- */

function EntryEditor({ entryId }: { entryId: string }) {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const updateEntry = useKachamak((s) => s.updateEntry);
  const deleteEntry = useKachamak((s) => s.deleteEntry);
  const findEntryCategory = useKachamak((s) => s.findEntryCategory);
  const selectCodex = useKachamak((s) => s.selectCodex);
  const rightPanelOpen = useKachamak((s) => s.rightPanelOpen);
  const toggleRightPanel = useKachamak((s) => s.toggleRightPanel);
  const novel = novels.find((n) => n.id === activeNovelId);
  const entry = novel ? findNodeSafe(novel.codex, entryId) : null;
  const category = findEntryCategory(entryId);
  const [aliasDraft, setAliasDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!entry || !novel) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Entry not found.
      </div>
    );
  }

  const addAlias = () => {
    const v = aliasDraft.trim();
    if (v && !entry.aliases.includes(v)) {
      updateEntry(entry.id, { aliases: [...entry.aliases, v] });
    }
    setAliasDraft("");
  };

  return (
    <div className="flex h-full min-h-0">
      {/* center editor */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto kachamak-scroll px-6 py-6">
          <div className="mx-auto max-w-3xl">
            <input
              value={entry.title}
              onChange={(e) => updateEntry(entry.id, { title: e.target.value })}
              aria-label="Entry title"
              className="mb-1 w-full bg-transparent text-2xl font-bold text-orange-400 outline-none"
              placeholder="Entry title"
            />
            <p className="mb-4 text-xs text-muted-foreground">
              {category?.name} · {entry.entryType} · {countWords(entry.content).toLocaleString()} words
            </p>
            <RichEditor
              html={entry.content}
              onChange={(html) => updateEntry(entry.id, { content: html })}
              placeholder="Write here..."
              className="min-h-[50vh] text-foreground"
            />
          </div>
        </div>
      </div>

      {/* details panel */}
      {rightPanelOpen && (
      <aside className="hidden w-72 shrink-0 overflow-y-auto kachamak-scroll border-l border-white/10 bg-black/20 p-3 lg:block">
        <Tabs defaultValue="details">
          <div className="flex items-center gap-1">
            <TabsList className="grid flex-1 grid-cols-2 bg-white/5">
              <TabsTrigger value="details" className="text-xs">
                Details
              </TabsTrigger>
              <TabsTrigger value="tags" className="text-xs">
                Tags
              </TabsTrigger>
            </TabsList>
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
          <TabsContent value="details" className="mt-3 space-y-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-white/15 text-muted-foreground hover:border-orange-400/50 hover:text-foreground"
            >
              <ImagePlus className="h-5 w-5" />
              <span className="text-xs">Upload image</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () =>
                  updateEntry(entry.id, { image: String(reader.result) });
                reader.readAsDataURL(f);
              }}
            />
            {entry.image && (
              <div className="relative">
                <img
                  src={entry.image}
                  alt={`${entry.title} portrait`}
                  className="h-28 w-full rounded-xl object-cover"
                />
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => updateEntry(entry.id, { image: undefined })}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white hover:bg-red-500/80"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Aliases / Nicknames</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {entry.aliases.map((a) => (
                  <span
                    key={a}
                    className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs"
                  >
                    {a}
                    <button
                      type="button"
                      aria-label={`Remove alias ${a}`}
                      onClick={() =>
                        updateEntry(entry.id, {
                          aliases: entry.aliases.filter((x) => x !== a),
                        })
                      }
                      className="text-muted-foreground hover:text-red-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-1.5 flex gap-1.5">
                <Input
                  value={aliasDraft}
                  onChange={(e) => setAliasDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addAlias()}
                  placeholder="Add alias…"
                  className="h-8 bg-black/30 text-xs"
                />
                <button
                  type="button"
                  onClick={addAlias}
                  className="rounded-md border border-white/10 px-2 text-xs hover:bg-white/10"
                >
                  Add
                </button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select
                value={entry.entryType}
                onValueChange={(v) => updateEntry(entry.id, { entryType: v })}
              >
                <SelectTrigger className="mt-1 w-full bg-black/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1b1b1b] border-white/10">
                  {CODEX_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={entry.status || "none"}
                onValueChange={(v) =>
                  updateEntry(entry.id, { status: v === "none" ? "" : v })
                }
              >
                <SelectTrigger className="mt-1 w-full bg-black/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1b1b1b] border-white/10">
                  <SelectItem value="none">No Status</SelectItem>
                  {novel.statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-500/30 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete entry
            </button>
            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
              <AlertDialogContent className="bg-[#1b1b1b] border-white/10">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete “{entry.title}”?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Codex entries are removed permanently (they don&apos;t go to Trash).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-white/10">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-500"
                    onClick={() => {
                      deleteEntry(entry.id);
                      selectCodex(null);
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
          <TabsContent value="tags" className="mt-3">
            <p className="text-xs text-muted-foreground">
              Tag scenes with this entry to track appearances (coming soon). Mentions in
              text are detected automatically in the Binder&apos;s Mentions panel.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <AtSign className="h-3.5 w-3.5 text-orange-400" />
              Auto-detected alias: “{entry.aliases[0] ?? entry.title}”
            </div>
          </TabsContent>
        </Tabs>
      </aside>
      )}

      {/* reopen right panel when hidden — full-height rail with the vertical line */}
      {!rightPanelOpen && (
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
  );
}

/* ---------- main codex view ---------- */

export function CodexView() {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const selectedCodexId = useKachamak((s) => s.selectedCodexId);
  const addEntry = useKachamak((s) => s.addEntry);
  const addCategory = useKachamak((s) => s.addCategory);
  const selectCodex = useKachamak((s) => s.selectCodex);
  const leftPanelOpen = useKachamak((s) => s.leftPanelOpen);
  const toggleLeftPanel = useKachamak((s) => s.toggleLeftPanel);
  const setAllCodexCollapsed = useKachamak((s) => s.setAllCodexCollapsed);
  const novel = novels.find((n) => n.id === activeNovelId);

  const selectedIsEntry = useMemo(() => {
    if (!novel || !selectedCodexId) return false;
    let found = false;
    const walk = (cats: CodexCategory[]) => {
      for (const c of cats) {
        if (c.entries.some((e) => e.id === selectedCodexId)) found = true;
        walk(c.children);
      }
    };
    walk(novel.codex);
    return found;
  }, [novel, selectedCodexId]);

  if (!novel) return null;

  return (
    <div className="flex min-h-0 flex-1">
      {/* reopen left panel when hidden — full-height rail with the vertical line */}
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
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-black/20 md:flex">
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
          <ScrollText className="h-4 w-4 shrink-0 text-orange-400" />
          <span className="min-w-0 truncate text-sm font-bold text-foreground">Codex</span>
          <span className="ml-auto" />
          <button
            type="button"
            aria-label="Add entry"
            title="Add entry"
            onClick={() => addEntry(novel.codex[0]?.id ?? "", "New Entry")}
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
              <DropdownMenuItem onClick={() => addCategory(null, "New Folder")}>
                Add folder
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => setAllCodexCollapsed(false)}>
                Expand all
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAllCodexCollapsed(true)}>
                Collapse all
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1.5 px-2 pb-2">
          <button
            type="button"
            onClick={() => setAllCodexCollapsed(false)}
            className="rounded border border-white/15 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => setAllCodexCollapsed(true)}
            className="rounded border border-white/15 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            Collapse all
          </button>
        </div>

        <div className="flex-1 overflow-y-auto kachamak-scroll px-2 pb-2">
          {novel.codex.map((c) => (
            <CatRow key={c.id} cat={c} depth={0} />
          ))}
        </div>
      </aside>
      )}

      <main className="min-w-0 flex-1">
        {selectedCodexId && selectedIsEntry ? (
          <EntryEditor entryId={selectedCodexId} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <ScrollText className="h-10 w-10 text-muted-foreground/40" />
            <p className="max-w-sm text-sm text-muted-foreground">
              {selectedCodexId
                ? "Select an entry inside the folder to edit it."
                : "Pick a person, place, thing or lore entry from the Codex tree — or create a new one below the tree."}
            </p>
            <button
              type="button"
              onClick={() => selectCodex(null)}
              className="text-xs text-orange-300 hover:underline"
            >
              Clear selection
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
