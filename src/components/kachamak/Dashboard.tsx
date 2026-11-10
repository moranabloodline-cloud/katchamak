"use client";

/**
 * Dashboard — početni ekran (faza 1).
 * Gornji deo: KATCHAMAK logo + Help/Account, naslov „My Collections“,
 * dekorativni statični banner (slika, bez funkcionalnosti).
 * Donji deo: levo stablo kolekcija (faza 1: vizuelno, prazno dok korisnik
 * ne napravi kolekcije), desno lista postojećih projekata — klik otvara
 * Workspace (openNovel). Collection, Sort, Group i Grid/List su u fazi 1
 * samo vizuelne kontrole. Projekti se čuvaju postojećim mehanizmom.
 */

import { useRef, useState } from "react";
import {
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Folder,
  HelpCircle,
  Layers,
  LayoutGrid,
  List,
  MoreVertical,
  Plus,
  Search,
  UserCircle2,
  Feather,
  ArrowUpDown,
} from "lucide-react";
import { useKachamak } from "@/lib/kachamak/store";
import type { Novel } from "@/lib/kachamak/types";
import { novelWords } from "@/lib/kachamak/utils";
import { AccountDialog } from "./AccountDialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/** „Modified 3d ago“ stil iz reference. */
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1w ago";
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months <= 1) return "1mo ago";
  return `${months}mo ago`;
}

export function Dashboard() {
  const novels = useKachamak((s) => s.novels);
  const openNovel = useKachamak((s) => s.openNovel);
  const createNovel = useKachamak((s) => s.createNovel);
  const importNovel = useKachamak((s) => s.importNovel);
  const defaultAuthor = useKachamak((s) => s.defaultAuthor);
  const [searchText, setSearchText] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState(defaultAuthor);
  const fileRef = useRef<HTMLInputElement>(null);

  const query = searchText.trim().toLocaleLowerCase();
  const sortedNovels = novels.filter((n) =>
    n.title.toLocaleLowerCase().includes(query) || (n.author ?? "").toLocaleLowerCase().includes(query)
  ).sort(
    (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#17110b] text-foreground">
      {/* ── top bar ── */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-black/70 bg-[#0c0906] px-5">
        <span className="flex items-center gap-2.5">
          <Feather className="h-5 w-5 text-[#e8c265]" />
          <span className="font-serif text-lg font-semibold tracking-[0.3em] text-[#e8c265]">
            KATCHAMAK
          </span>
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <HelpCircle className="h-4 w-4" /> Help
          </button>
          <span className="mx-1 h-5 w-px bg-white/10" />
          <button
            type="button"
            onClick={() => setAccountOpen(true)}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <UserCircle2 className="h-4 w-4 text-[#e8c265]" /> Account
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* ── hero: naslov + dekorativni banner (statična slika) ── */}
      <section className="relative shrink-0 overflow-hidden bg-[#0b0806]">
        <div className="relative z-10 py-4 text-center">
          <h1 className="font-serif text-4xl font-bold text-[#f2ead9]">
            My Collections
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your creative projects, organized your way.
          </p>
        </div>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/dashboard-banner.png"
            alt="Decorative banner: Books, Games, Software, Movies and Cartoons"
            className="block w-full"
            draggable={false}
          />
        </div>
      </section>

      {/* ── donji deo: stablo kolekcija (levo) + projekti (desno) ──
          boje i proporcije po referenci: skoro-crna pozadina #0a0c10,
          sidebar ~19% širine, krupnija tipografija i zlatni detalji */}
      <div className="flex min-h-0 flex-1 bg-[#0a0c10]">
        {/* sidebar: collections */}
        <aside className="flex w-[19%] min-w-[230px] shrink-0 flex-col border-r border-white/[0.07] bg-[#090b0f] px-5 pb-5 pt-5">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <Folder className="h-6 w-6 fill-amber-400/90 text-amber-400" />
            <span className="font-serif text-[19px] font-semibold text-[#f2ead9]">
              Collections
            </span>
            <button
              type="button"
              aria-label="New collection"
              className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg border border-[#c9973c]/70 text-[#e8c265] transition-colors hover:bg-white/5"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* faza 1: stablo je prazno dok ne nastanu kolekcije (bez demo
              podataka); kod za prikaz hijerarhije i izbora je spreman za
              fazu 2, kada kolekcije dobiju model */}
          <div className="mt-4 flex-1 overflow-y-auto kachamak-scroll">
            <p className="mt-1 px-1 text-sm leading-relaxed text-muted-foreground/70">
              No collections yet.
            </p>
          </div>
        </aside>

        {/* glavni panel */}
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto kachamak-scroll px-9 pb-6 pt-5">
          <div className="flex items-center gap-3.5">
            <BookOpen className="h-8 w-8 text-[#e8c265]" />
            <h2 className="font-serif text-3xl font-bold text-[#f2ead9]">
              All Projects
            </h2>
          </div>

          {/* toolbar: levo akcije, desno pretraga/sort/group/grid-list */}
          <div className="mt-5 flex flex-wrap items-center gap-3.5">
            <button
              type="button"
              className="flex h-11 items-center gap-2 rounded-lg bg-[#f3b64e] px-5 text-base font-semibold text-[#221503] transition-colors hover:bg-[#ffc36a]"
            >
              <Plus className="h-5 w-5" /> Collection
            </button>
            <button
              type="button"
              onClick={() => {
                setNewTitle("");
                setNewAuthor(defaultAuthor);
                setCreateOpen(true);
              }}
              className="flex h-11 items-center gap-2 rounded-lg bg-[#f3b64e] px-5 text-base font-semibold text-[#221503] transition-colors hover:bg-[#ffc36a]"
            >
              <Plus className="h-5 w-5" /> Project
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-11 items-center gap-2 rounded-lg border border-white/20 px-5 text-base text-[#cfd2d6] transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <Download className="h-5 w-5" /> Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Import JSON backup"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const result = importNovel(String(reader.result));
                  if (result.ok) toast.success("Project imported from backup.");
                  else toast.error(result.error ?? "Import failed.");
                };
                reader.onerror = () => toast.error("Could not read the backup file.");
                reader.readAsText(file);
              }}
            />
            <span className="mx-1 hidden h-7 w-px bg-white/10 md:block" />
            <div className="ml-auto flex flex-wrap items-center gap-3.5">
              <div className="relative w-[310px] max-w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search projects…"
                  aria-label="Search projects"
                  className="h-11 w-full rounded-lg border border-white/15 bg-black/30 pl-10 pr-3 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-[#f0b018]/50"
                />
              </div>
              <button
                type="button"
                className="flex h-11 items-center gap-2 rounded-lg border border-white/20 px-4 text-base text-[#cfd2d6] transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <ArrowUpDown className="h-5 w-5" /> Sort
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="flex h-11 items-center gap-2 rounded-lg border border-white/20 px-4 text-base text-[#cfd2d6] transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <Layers className="h-5 w-5" /> Group
                <ChevronDown className="h-4 w-4" />
              </button>
              <div className="ml-1 flex h-11 shrink-0 overflow-hidden rounded-lg border border-[#c9973c]/70">
                <button
                  type="button"
                  aria-label="Grid view"
                  className="flex h-full w-[52px] items-center justify-center bg-[#f3b64e] text-[#221503]"
                >
                  <LayoutGrid className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="List view"
                  className="flex h-full w-[52px] items-center justify-center border-l border-[#c9973c]/60 text-[#e8c265] transition-colors hover:bg-white/5"
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* kartice projekata */}
          {sortedNovels.length === 0 ? (
            <p className="mt-10 text-sm text-muted-foreground">
              {query ? "No projects match your search." : "No projects yet."}
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3">
              {sortedNovels.map((n) => (
                <ProjectCard
                  key={n.id}
                  novel={n}
                  onOpen={() => openNovel(n.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-white/10 bg-[#1b1b1b]">
          <DialogHeader><DialogTitle>Create a new project</DialogTitle></DialogHeader>
          <form onSubmit={(event) => {
            event.preventDefault();
            const title = newTitle.trim();
            if (!title) return;
            createNovel(title, newAuthor.trim());
            setCreateOpen(false);
            toast.success("Project created.");
          }}>
            <div className="space-y-3">
              <div><Label htmlFor="dashboard-project-title">Title</Label><Input id="dashboard-project-title" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} className="bg-black/30" required /></div>
              <div><Label htmlFor="dashboard-project-author">Author</Label><Input id="dashboard-project-author" value={newAuthor} onChange={(event) => setNewAuthor(event.target.value)} className="bg-black/30" /></div>
            </div>
            <DialogFooter className="mt-4">
              <button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button type="submit" className="rounded-lg bg-[#f3b64e] px-3 py-1.5 text-sm font-semibold text-[#221503] hover:bg-[#ffc36a]">Create</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
    </div>
  );
}

/** Horizontalna kartica projekta: naslovna slika levo, informacije desno. */
function ProjectCard({ novel, onOpen }: { novel: Novel; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${novel.title}`}
      className="group relative flex h-[230px] cursor-pointer overflow-hidden rounded-xl border border-[#a97f33]/60 bg-[#0c0f14] text-left transition-colors hover:border-[#f0b018]"
    >
      {/* cover */}
      <span
        className="flex w-[44%] min-w-[160px] max-w-[250px] shrink-0 items-center justify-center border-r border-[#a97f33]/40 text-6xl"
        style={{ background: novel.cover.bg }}
      >
        <span className="drop-shadow-lg">{novel.cover.icon}</span>
      </span>
      {/* info */}
      <span className="flex min-w-0 flex-1 flex-col px-6 pt-7">
        <span className="truncate font-serif text-2xl font-bold text-white">
          {novel.title}
        </span>
        <span className="mt-6 flex items-center gap-3 text-base text-[#d4d1c9]">
          <BookOpen className="h-5 w-5 shrink-0 text-[#e8c265]" />
          Novel
        </span>
        <span className="mt-5 flex items-center gap-3 text-base text-[#d4d1c9]">
          <FileText className="h-5 w-5 shrink-0 text-[#e8c265]" />
          {novelWords(novel).toLocaleString()} words
        </span>
        <span className="mt-5 flex items-center gap-3 text-base text-[#d4d1c9]">
          <Calendar className="h-5 w-5 shrink-0 text-[#e8c265]" />
          Modified {relativeTime(novel.updatedAt)}
        </span>
        <MoreVertical className="absolute bottom-3.5 right-3.5 h-5 w-5 text-muted-foreground/60" />
      </span>
    </button>
  );
}
