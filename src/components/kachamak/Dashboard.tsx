"use client";

/**
 * Dashboard — početni ekran (faza 1).
 * Gornji deo: KATCHAMAK logo + Help/Account, naslov „My Collections“,
 * dekorativni statični banner (slika, bez funkcionalnosti).
 * Donji deo: lokalne kolekcije i lista projekata; klik otvara Workspace.
 * Projekti se čuvaju postojećim mehanizmom.
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
import { exportNovelJson, useKachamak } from "@/lib/kachamak/store";
import type { Novel } from "@/lib/kachamak/types";
import { novelWords } from "@/lib/kachamak/utils";
import { AccountDialog } from "./AccountDialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCollections } from "@/lib/kachamak/collections-store";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  const deleteNovel = useKachamak((s) => s.deleteNovel);
  const defaultAuthor = useKachamak((s) => s.defaultAuthor);
  const collections = useCollections((s) => s.collections);
  const addCollection = useCollections((s) => s.addCollection);
  const renameCollection = useCollections((s) => s.renameCollection);
  const removeCollection = useCollections((s) => s.removeCollection);
  const setMembership = useCollections((s) => s.setMembership);
  const [searchText, setSearchText] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState(defaultAuthor);
  const [collectionDialog, setCollectionDialog] = useState<"new" | string | null>(null);
  const [collectionName, setCollectionName] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [pendingProjectDelete, setPendingProjectDelete] = useState<Novel | null>(null);
  const [sort, setSort] = useState<"updated" | "title" | "created">("updated");
  const [group, setGroup] = useState<"none" | "author">("none");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [helpOpen, setHelpOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const query = searchText.trim().toLocaleLowerCase();
  const activeCollection = collections.find((c) => c.id === selectedCollection);
  const sortedNovels = novels.filter((n) =>
    (!activeCollection || activeCollection.projectIds.includes(n.id)) &&
    (n.title.toLocaleLowerCase().includes(query) || (n.author ?? "").toLocaleLowerCase().includes(query))
  ).sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : sort === "created" ? (b.createdAt ?? 0) - (a.createdAt ?? 0) : (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  const projectGroups = group === "none" ? [{ name: "", projects: sortedNovels }] :
    Object.entries(sortedNovels.reduce<Record<string, Novel[]>>((groups, novel) => {
      const author = novel.author?.trim() || "Unknown Author";
      (groups[author] ??= []).push(novel);
      return groups;
    }, {})).sort(([a], [b]) => a.localeCompare(b)).map(([name, projects]) => ({ name, projects }));
  const openNewCollection = () => { setCollectionName(""); setCollectionDialog("new"); };

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
            onClick={() => setHelpOpen(true)}
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
        <div className="pointer-events-none absolute left-0 top-0 z-10 px-5 py-4 sm:px-8" style={{ textShadow: "0 2px 8px rgba(0,0,0,.95), 0 1px 3px black" }}>
          <h1 className="font-serif text-2xl font-bold text-[#f2ead9] sm:text-3xl">
            My Collections
          </h1>
          <p className="mt-1 text-sm text-[#e8e1d4]">
            Your creative projects, organized your way.
          </p>
        </div>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/dashboard-banner.png"
            alt="Decorative banner: Books, Games, Software, Movies and Cartoons"
            className="mx-auto block h-auto max-h-[min(28vh,290px)] w-auto max-w-full"
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
              onClick={openNewCollection}
              className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg border border-[#c9973c]/70 text-[#e8c265] transition-colors hover:bg-white/5"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto kachamak-scroll">
            <button type="button" onClick={() => setSelectedCollection(null)} aria-pressed={!activeCollection} className={`w-full rounded px-2 py-2 text-left text-sm ${!activeCollection ? "bg-amber-400/15 text-amber-200" : "text-muted-foreground hover:bg-white/5"}`}>All Projects</button>
            {collections.length === 0 && <p className="mt-2 px-2 text-sm text-muted-foreground/70">No collections yet.</p>}
            {collections.map((c) => <div key={c.id} className="flex items-center gap-1">
              <button type="button" onClick={() => setSelectedCollection(c.id)} aria-pressed={c.id === activeCollection?.id} className={`flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-2 text-left text-sm ${c.id === activeCollection?.id ? "bg-amber-400/15 text-amber-200" : "text-muted-foreground hover:bg-white/5"}`}><Folder className="h-4 w-4 shrink-0" /><span className="truncate">{c.name}</span></button>
              <DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={`Options for ${c.name}`} className="rounded p-1.5 text-muted-foreground hover:bg-white/10"><MoreVertical className="h-4 w-4" /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => { setCollectionName(c.name); setCollectionDialog(c.id); }}>Rename</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(c.id)}>Delete collection</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
            </div>)}
          </div>
        </aside>

        {/* glavni panel */}
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto kachamak-scroll px-9 pb-6 pt-5">
          <div className="flex items-center gap-3.5">
            <BookOpen className="h-8 w-8 text-[#e8c265]" />
            <h2 className="font-serif text-3xl font-bold text-[#f2ead9]">
              {activeCollection?.name ?? "All Projects"}
            </h2>
          </div>

          {/* toolbar: levo akcije, desno pretraga/sort/group/grid-list */}
          <div className="mt-5 flex flex-wrap items-center gap-3.5">
            <button
              type="button"
              onClick={openNewCollection}
              className="group flex h-11 items-center gap-2.5 rounded-lg border border-[#b78b43]/80 bg-[#211a10] px-4 text-base font-semibold text-[#f5d99d] shadow-[inset_0_1px_0_rgba(255,222,160,0.12)] transition-colors hover:border-[#e4b960] hover:bg-[#342615] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e4b960]"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md border border-[#c89c50]/60 bg-[#6d4c1b]/40 text-[#f4ca76]"><Plus className="h-4 w-4" /></span> Collection
            </button>
            <button
              type="button"
              onClick={() => {
                setNewTitle("");
                setNewAuthor(defaultAuthor);
                setCreateOpen(true);
              }}
              className="group flex h-11 items-center gap-2.5 rounded-lg border border-[#b78b43]/80 bg-[#211a10] px-4 text-base font-semibold text-[#f5d99d] shadow-[inset_0_1px_0_rgba(255,222,160,0.12)] transition-colors hover:border-[#e4b960] hover:bg-[#342615] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e4b960]"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md border border-[#c89c50]/60 bg-[#6d4c1b]/40 text-[#f4ca76]"><Plus className="h-4 w-4" /></span> Project
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
              <DropdownMenu><DropdownMenuTrigger asChild><button type="button"
                className="flex h-11 items-center gap-2 rounded-lg border border-white/20 px-4 text-base text-[#cfd2d6] transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <ArrowUpDown className="h-5 w-5" /> Sort
                <ChevronDown className="h-4 w-4" />
              </button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuCheckboxItem checked={sort === "updated"} onSelect={() => setSort("updated")}>Recently modified</DropdownMenuCheckboxItem><DropdownMenuCheckboxItem checked={sort === "title"} onSelect={() => setSort("title")}>Title A–Z</DropdownMenuCheckboxItem><DropdownMenuCheckboxItem checked={sort === "created"} onSelect={() => setSort("created")}>Recently created</DropdownMenuCheckboxItem></DropdownMenuContent></DropdownMenu>
              <DropdownMenu><DropdownMenuTrigger asChild><button type="button"
                className="flex h-11 items-center gap-2 rounded-lg border border-white/20 px-4 text-base text-[#cfd2d6] transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <Layers className="h-5 w-5" /> Group
                <ChevronDown className="h-4 w-4" />
              </button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuCheckboxItem checked={group === "none"} onSelect={() => setGroup("none")}>None</DropdownMenuCheckboxItem><DropdownMenuCheckboxItem checked={group === "author"} onSelect={() => setGroup("author")}>Author</DropdownMenuCheckboxItem></DropdownMenuContent></DropdownMenu>
              <div className="ml-1 flex h-11 shrink-0 overflow-hidden rounded-lg border border-[#c9973c]/70">
                <button
                  type="button"
                  aria-label="Grid view"
                  aria-pressed={layout === "grid"}
                  onClick={() => setLayout("grid")}
                  className={`flex h-full w-[52px] items-center justify-center ${layout === "grid" ? "bg-[#f3b64e] text-[#221503]" : "text-[#e8c265] hover:bg-white/5"}`}
                >
                  <LayoutGrid className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="List view"
                  aria-pressed={layout === "list"}
                  onClick={() => setLayout("list")}
                  className={`flex h-full w-[52px] items-center justify-center border-l border-[#c9973c]/60 ${layout === "list" ? "bg-[#f3b64e] text-[#221503]" : "text-[#e8c265] hover:bg-white/5"}`}
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
            <div className="mt-6 space-y-6">{projectGroups.map((groupItem) => <section key={groupItem.name || "all"}>
              {groupItem.name && <h3 className="mb-3 font-serif text-lg text-[#f2ead9]">{groupItem.name}</h3>}
              <div className={layout === "grid" ? "grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3" : "grid grid-cols-1 gap-3"}>
              {groupItem.projects.map((n) => (
                <ProjectCard
                  key={n.id}
                  novel={n}
                  onOpen={() => openNovel(n.id)}
                  layout={layout}
                  collections={collections}
                  setMembership={setMembership}
                  onExport={() => { exportNovelJson(n); toast.success("Project backup downloaded."); }}
                  onDelete={() => setPendingProjectDelete(n)}
                />
              ))}
              </div></section>)}</div>
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
      <Dialog open={collectionDialog !== null} onOpenChange={(open) => { if (!open) setCollectionDialog(null); }}><DialogContent className="border-white/10 bg-[#1b1b1b]"><DialogHeader><DialogTitle>{collectionDialog === "new" ? "New collection" : "Rename collection"}</DialogTitle></DialogHeader><form onSubmit={(event) => { event.preventDefault(); const name = collectionName.trim(); if (!name) return; if (collectionDialog === "new") { const id = addCollection(name); if (id) setSelectedCollection(id); } else if (collectionDialog) renameCollection(collectionDialog, name); setCollectionDialog(null); }}><Label htmlFor="collection-name">Name</Label><Input id="collection-name" value={collectionName} onChange={(event) => setCollectionName(event.target.value)} required className="mt-2 bg-black/30" /><DialogFooter className="mt-4"><button type="button" onClick={() => setCollectionDialog(null)} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground">Cancel</button><button type="submit" className="rounded-lg bg-[#f3b64e] px-3 py-1.5 text-sm font-semibold text-[#221503]">Save</button></DialogFooter></form></DialogContent></Dialog>
      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}><AlertDialogContent className="border-white/10 bg-[#1b1b1b]"><AlertDialogHeader><AlertDialogTitle>Delete collection?</AlertDialogTitle><AlertDialogDescription>The collection will be removed. Its projects and their contents will remain in All Projects.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (pendingDelete) { removeCollection(pendingDelete); if (selectedCollection === pendingDelete) setSelectedCollection(null); } setPendingDelete(null); }}>Delete collection</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={pendingProjectDelete !== null} onOpenChange={(open) => { if (!open) setPendingProjectDelete(null); }}><AlertDialogContent className="border-white/10 bg-[#1b1b1b]"><AlertDialogHeader><AlertDialogTitle>Delete {pendingProjectDelete?.title}?</AlertDialogTitle><AlertDialogDescription>This permanently removes the project, all its notes and trash from this browser. Export a backup first if you want to keep it.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-500" onClick={() => { if (pendingProjectDelete) { collections.forEach((c) => setMembership(c.id, pendingProjectDelete.id, false)); deleteNovel(pendingProjectDelete.id); toast.success("Project deleted."); } setPendingProjectDelete(null); }}>Delete project</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}><DialogContent className="border-white/10 bg-[#1b1b1b]"><DialogHeader><DialogTitle>Dashboard help</DialogTitle></DialogHeader><p className="text-sm leading-relaxed text-muted-foreground">Create or import projects, search by title or author, and use a project’s menu to add it to collections. Projects and collections are stored in this browser. Export individual project backups from the workspace settings; these backups do not include collections.</p></DialogContent></Dialog>
    </div>
  );
}

/** Horizontalna kartica projekta: naslovna slika levo, informacije desno. */
function ProjectCard({ novel, onOpen, onExport, onDelete, layout, collections, setMembership }: { novel: Novel; onOpen: () => void; onExport: () => void; onDelete: () => void; layout: "grid" | "list"; collections: { id: string; name: string; projectIds: string[] }[]; setMembership: (collectionId: string, projectId: string, included: boolean) => void }) {
  return (
    <div className={`group relative overflow-hidden rounded-xl border border-[#a97f33]/60 bg-[#0c0f14] transition-colors hover:border-[#f0b018] ${layout === "grid" ? "h-[230px]" : "h-[104px]"}`}>
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${novel.title}`}
      className="flex h-full w-full cursor-pointer overflow-hidden text-left"
    >
      {/* cover */}
      <span
        className={`flex shrink-0 items-center justify-center border-r border-[#a97f33]/40 ${layout === "grid" ? "w-[44%] min-w-[160px] max-w-[250px] text-6xl" : "w-[90px] text-3xl"}`}
        style={{ background: novel.cover.bg }}
      >
        <span className="drop-shadow-lg">{novel.cover.icon}</span>
      </span>
      {/* info */}
      <span className={`flex min-w-0 flex-1 flex-col px-6 ${layout === "grid" ? "pt-7" : "justify-center"}`}>
        <span className={`truncate pr-5 font-serif font-bold text-white ${layout === "grid" ? "text-2xl" : "text-xl"}`}>
          {novel.title}
        </span>
        <span className={`${layout === "grid" ? "mt-6" : "mt-1"} flex items-center gap-3 text-base text-[#d4d1c9]`}>
          <BookOpen className="h-5 w-5 shrink-0 text-[#e8c265]" />
          Novel
        </span>
        <span className={`${layout === "grid" ? "mt-5" : "mt-1"} flex items-center gap-3 text-base text-[#d4d1c9]`}>
          <FileText className="h-5 w-5 shrink-0 text-[#e8c265]" />
          {novelWords(novel).toLocaleString()} words
        </span>
        <span className={`${layout === "grid" ? "mt-5" : "hidden"} flex items-center gap-3 text-base text-[#d4d1c9]`}>
          <Calendar className="h-5 w-5 shrink-0 text-[#e8c265]" />
          Modified {relativeTime(novel.updatedAt)}
        </span>
      </span>
    </button>
    <DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={`Options for ${novel.title}`} className="absolute bottom-3 right-3 rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-white"><MoreVertical className="h-5 w-5" /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={onOpen}>Open project</DropdownMenuItem><DropdownMenuItem onSelect={onExport}>Export backup</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={onDelete}>Delete project</DropdownMenuItem><DropdownMenuSeparator />{collections.length === 0 ? <DropdownMenuItem disabled>Create a collection first</DropdownMenuItem> : collections.map((c) => <DropdownMenuCheckboxItem key={c.id} checked={c.projectIds.includes(novel.id)} onSelect={(event) => event.preventDefault()} onCheckedChange={(checked) => setMembership(c.id, novel.id, checked === true)}>{c.name}</DropdownMenuCheckboxItem>)}</DropdownMenuContent></DropdownMenu>
    </div>
  );
}
