"use client";

import { useRef, useState } from "react";
import {
  BookOpen,
  Download,
  Plus,
  Search,
  Trash2,
  Upload,
  UserCircle2,
} from "lucide-react";
import { exportNovelJson, useKachamak } from "@/lib/kachamak/store";
import { novelScenes, novelWords } from "@/lib/kachamak/utils";
import { AccountDialog } from "./AccountDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function Home() {
  const novels = useKachamak((s) => s.novels);
  const createNovel = useKachamak((s) => s.createNovel);
  const importNovel = useKachamak((s) => s.importNovel);
  const deleteNovel = useKachamak((s) => s.deleteNovel);
  const openNovel = useKachamak((s) => s.openNovel);
  const defaultAuthor = useKachamak((s) => s.defaultAuthor);

  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState(defaultAuthor);
  const [accountOpen, setAccountOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = novels.filter((n) =>
    n.title.toLowerCase().includes(query.toLowerCase())
  );
  const totalWords = novels.reduce((a, n) => a + novelWords(n), 0);

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = importNovel(String(reader.result));
      if (res.ok) toast.success("Novel imported from backup.");
      else toast.error(res.error ?? "Import failed.");
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-screen overflow-y-auto kachamak-scroll bg-[#0d0d0d] text-foreground">
      {/* top bar */}
      <header className="flex items-center gap-3 border-b border-white/10 px-6 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15 text-lg">
          🍲
        </span>
        <span className="text-lg font-bold tracking-tight">Kachamak</span>
        <button
          type="button"
          onClick={() => setAccountOpen(true)}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <UserCircle2 className="h-4 w-4" /> My Account
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Your novels</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a world. Pick up where you left off.
        </p>

        <div className="relative mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setNewTitle("");
              setNewAuthor(defaultAuthor);
              setCreateOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-500"
          >
            <Plus className="h-4 w-4" /> Create novel
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm transition-colors hover:bg-white/5"
          >
            <Upload className="h-4 w-4" /> Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Import JSON backup"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportFile(f);
              e.target.value = "";
            }}
          />
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search novels…"
              aria-label="Search novels"
              className="w-56 border-white/10 bg-black/30 pl-8"
            />
          </div>
        </div>

        <p className="mt-10 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Standalone ({filtered.length} novel{filtered.length === 1 ? "" : "s"})
        </p>

        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((n) => (
            <div
              key={n.id}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors hover:border-orange-400/40"
            >
              <button
                type="button"
                onClick={() => openNovel(n.id)}
                aria-label={`Open ${n.title}`}
                className="block w-full cursor-pointer text-left"
              >
                <div
                  className="flex h-36 items-center justify-center text-4xl"
                  style={{ background: n.cover.bg }}
                >
                  <span className="drop-shadow-lg">{n.cover.icon}</span>
                </div>
              </button>
              <div className="p-4">
                <button
                  type="button"
                  onClick={() => openNovel(n.id)}
                  className="block w-full cursor-pointer text-left"
                >
                  <h3 className="truncate font-semibold">{n.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {novelScenes(n)} scenes · {novelWords(n).toLocaleString()} words
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground/70">by {n.author}</p>
                </button>
                <div className="mt-3 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => openNovel(n.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/10 py-1.5 text-xs transition-colors hover:bg-white/15"
                  >
                    <BookOpen className="h-3.5 w-3.5" /> Open
                  </button>
                  <button
                    type="button"
                    aria-label={`Export ${n.title} backup`}
                    onClick={() => {
                      exportNovelJson(n);
                      toast.success("Backup downloaded.");
                    }}
                    className="rounded-lg border border-white/10 p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${n.title}`}
                    onClick={() => setPendingDelete(n.id)}
                    className="rounded-lg border border-white/10 p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 border-t border-white/10 pt-5 text-xs leading-relaxed text-muted-foreground">
          Your novels are saved locally in your browser — nothing leaves your computer.
          Use <span className="text-foreground/80">Export</span> on any novel to keep a
          JSON backup, and <span className="text-foreground/80">Import backup</span> to
          restore it anywhere. Total: {totalWords.toLocaleString()} words across{" "}
          {novels.length} novel{novels.length === 1 ? "" : "s"}.
        </p>
      </main>

      {/* create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-white/10 bg-[#1b1b1b]">
          <DialogHeader>
            <DialogTitle>Create a new novel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="novel-title">Title</Label>
              <Input
                id="novel-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Morrigan's Ocean"
                className="bg-black/30"
              />
            </div>
            <div>
              <Label htmlFor="novel-author">Author</Label>
              <Input
                id="novel-author"
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
                className="bg-black/30"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!newTitle.trim()) return;
                createNovel(newTitle, newAuthor);
                setCreateOpen(false);
                toast.success("Novel created — happy writing!");
              }}
              className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-orange-500"
            >
              Create
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* account dialog (shared with the workspace top bar) */}
      <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />

      {/* delete confirm */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent className="border-white/10 bg-[#1b1b1b]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this novel?</AlertDialogTitle>
            <AlertDialogDescription>
              It and all its notes and trash will be removed from this
              browser. Export a backup first if you want to keep it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-500"
              onClick={() => {
                if (pendingDelete) deleteNovel(pendingDelete);
                setPendingDelete(null);
                toast.success("Novel deleted.");
              }}
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
