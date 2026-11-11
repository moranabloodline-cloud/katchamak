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
  ChevronDown,
  Download,
  HelpCircle,
  Layers,
  LayoutGrid,
  List,
  Minus,
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
import { DashboardLibrary, projectCategory } from "./DashboardLibrary";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  const [group, setGroup] = useState<"none" | "author" | "category">("none");
  const layout = useCollections((s) => s.layout);
  const setLayout = useCollections((s) => s.setLayout);
  const [helpOpen, setHelpOpen] = useState(false);
  const coverSize = useCollections((s) => s.coverSize);
  const setCoverSize = useCollections((s) => s.setCoverSize);
  const dashboardZoom = Math.round(coverSize / 160 * 100);
  const projectMeta = useCollections((s) => s.projectMeta);
  const [newCategory, setNewCategory] = useState("Novel");
  const fileRef = useRef<HTMLInputElement>(null);

  const query = searchText.trim().toLocaleLowerCase();
  const activeCollection = collections.find((c) => c.id === selectedCollection);
  const sortedNovels = novels.filter((n) =>
    (activeCollection ? activeCollection.projectIds.includes(n.id) : !collections.some((c) => c.projectIds.includes(n.id))) &&
    (n.title.toLocaleLowerCase().includes(query) || (n.author ?? "").toLocaleLowerCase().includes(query))
  ).sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : sort === "created" ? (b.createdAt ?? 0) - (a.createdAt ?? 0) : (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  const projectGroups = group === "none" ? [{ name: "", projects: sortedNovels }] :
    Object.entries(sortedNovels.reduce<Record<string, Novel[]>>((groups, novel) => {
      const author = group === "category" ? projectCategory(novel, projectMeta[novel.id]) : novel.author?.trim() || "Unknown Author";
      (groups[author] ??= []).push(novel);
      return groups;
    }, {})).sort(([a], [b]) => a.localeCompare(b)).map(([name, projects]) => ({ name, projects }));
  const openNewCollection = () => { setCollectionName(""); setCollectionDialog("new"); };
  const exportProject = (novel: Novel) => {
    const meta = projectMeta[novel.id];
    const backup = { ...novel, category: projectCategory(novel, meta), cover: { ...novel.cover, ...(meta?.coverUrl ? { url: meta.coverUrl } : {}) } };
    exportNovelJson(backup);
    toast.success("Project backup downloaded.");
  };

  return (
    <div className="flex h-dvh min-w-0 flex-col overflow-hidden bg-[#0a0c10] text-foreground">
      {/* ── top bar ── */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-black/70 bg-[#0c0906] px-5">
        <span className="flex items-center gap-2.5">
          <Feather className="h-5 w-5 text-[#e8c265]" />
          <span className="font-serif text-lg font-semibold tracking-[0.3em] text-[#e8c265]">
            KATCHAMAK
          </span>
        </span>
        <div className="ml-auto flex items-center gap-1">
          <div className="mr-2 flex items-center rounded-md border border-[#a97f33]/40 bg-white/[0.03] text-[#e8c265]" aria-label="Cover size" title="Ctrl + scroll over the library to resize covers">
            <button type="button" aria-label="Smaller covers" title="Zoom out" disabled={coverSize <= 100} onClick={() => setCoverSize(coverSize - 16)} className="rounded-l-md p-1.5 hover:bg-white/10 disabled:opacity-40"><Minus className="h-3.5 w-3.5" /></button>
            <button type="button" aria-label="Reset cover size" title="Reset zoom" onClick={() => setCoverSize(160)} className="min-w-10 px-1 text-xs tabular-nums hover:text-white">{dashboardZoom}%</button>
            <button type="button" aria-label="Larger covers" title="Zoom in" disabled={coverSize >= 280} onClick={() => setCoverSize(coverSize + 16)} className="rounded-r-md p-1.5 hover:bg-white/10 disabled:opacity-40"><Plus className="h-3.5 w-3.5" /></button>
          </div>
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

      <DashboardLibrary novels={novels} selected={selectedCollection} onSelect={setSelectedCollection} groups={projectGroups} query={query}
        onCreateCollection={openNewCollection} onRenameCollection={(c) => { setCollectionName(c.name); setCollectionDialog(c.id); }}
        onDeleteCollection={setPendingDelete} onOpen={openNovel}
        onExport={exportProject} onDelete={setPendingProjectDelete}
        toolbar={<>          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openNewCollection}
              className="group flex h-9 items-center gap-2.5 rounded-lg border border-[#b78b43]/80 bg-[#211a10] px-4 text-sm font-semibold text-[#f5d99d] shadow-[inset_0_1px_0_rgba(255,222,160,0.12)] transition-colors hover:border-[#e4b960] hover:bg-[#342615] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e4b960]"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md border border-[#c89c50]/60 bg-[#6d4c1b]/40 text-[#f4ca76]"><Plus className="h-4 w-4" /></span> Collection
            </button>
            <button
              type="button"
              onClick={() => {
                setNewTitle("");
                setNewCategory("Novel");
                setNewAuthor(defaultAuthor);
                setCreateOpen(true);
              }}
              className="group flex h-9 items-center gap-2.5 rounded-lg border border-[#b78b43]/80 bg-[#211a10] px-4 text-sm font-semibold text-[#f5d99d] shadow-[inset_0_1px_0_rgba(255,222,160,0.12)] transition-colors hover:border-[#e4b960] hover:bg-[#342615] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e4b960]"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md border border-[#c89c50]/60 bg-[#6d4c1b]/40 text-[#f4ca76]"><Plus className="h-4 w-4" /></span> Project
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-9 items-center gap-2 rounded-lg border border-white/20 px-5 text-sm text-[#cfd2d6] transition-colors hover:bg-white/5 hover:text-foreground"
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
                  if (result.ok) { const id = useKachamak.getState().activeNovelId; if (id) useCollections.getState().moveProject(id, selectedCollection); toast.success("Project imported from backup."); }
                  else toast.error(result.error ?? "Import failed.");
                };
                reader.onerror = () => toast.error("Could not read the backup file.");
                reader.readAsText(file);
              }}
            />
            <span className="mx-1 hidden h-7 w-px bg-white/10 md:block" />
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="relative w-[220px] max-w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search projects…"
                  aria-label="Search projects"
                  className="h-9 w-full rounded-lg border border-white/15 bg-black/30 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-[#f0b018]/50"
                />
              </div>
              <DropdownMenu><DropdownMenuTrigger asChild><button type="button"
                className="flex h-9 items-center gap-2 rounded-lg border border-white/20 px-4 text-sm text-[#cfd2d6] transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <ArrowUpDown className="h-5 w-5" /> Sort
                <ChevronDown className="h-4 w-4" />
              </button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuCheckboxItem checked={sort === "updated"} onSelect={() => setSort("updated")}>Recently modified</DropdownMenuCheckboxItem><DropdownMenuCheckboxItem checked={sort === "title"} onSelect={() => setSort("title")}>Title A–Z</DropdownMenuCheckboxItem><DropdownMenuCheckboxItem checked={sort === "created"} onSelect={() => setSort("created")}>Recently created</DropdownMenuCheckboxItem></DropdownMenuContent></DropdownMenu>
              <DropdownMenu><DropdownMenuTrigger asChild><button type="button"
                className="flex h-9 items-center gap-2 rounded-lg border border-white/20 px-4 text-sm text-[#cfd2d6] transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <Layers className="h-5 w-5" /> Group
                <ChevronDown className="h-4 w-4" />
              </button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuCheckboxItem checked={group === "none"} onSelect={() => setGroup("none")}>None</DropdownMenuCheckboxItem><DropdownMenuCheckboxItem checked={group === "category"} onSelect={() => setGroup("category")}>Category</DropdownMenuCheckboxItem><DropdownMenuCheckboxItem checked={group === "author"} onSelect={() => setGroup("author")}>Author</DropdownMenuCheckboxItem></DropdownMenuContent></DropdownMenu>
              <div className="ml-1 flex h-9 shrink-0 overflow-hidden rounded-lg border border-[#c9973c]/70">
                <button
                  type="button"
                  aria-label="Grid view"
                  aria-pressed={layout === "grid"}
                  onClick={() => setLayout("grid")}
                  className={`flex h-full w-10 items-center justify-center ${layout === "grid" ? "bg-[#f3b64e] text-[#221503]" : "text-[#e8c265] hover:bg-white/5"}`}
                >
                  <LayoutGrid className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="List view"
                  aria-pressed={layout === "list"}
                  onClick={() => setLayout("list")}
                  className={`flex h-full w-10 items-center justify-center border-l border-[#c9973c]/60 ${layout === "list" ? "bg-[#f3b64e] text-[#221503]" : "text-[#e8c265] hover:bg-white/5"}`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

</>} />
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-white/10 bg-[#1b1b1b]">
          <DialogHeader><DialogTitle>Create a new project</DialogTitle></DialogHeader>
          <form onSubmit={(event) => {
            event.preventDefault();
            const title = newTitle.trim();
            if (!title) return;
            createNovel(title, newAuthor.trim());
            const createdId = useKachamak.getState().activeNovelId;
            if (createdId) {
              useCollections.getState().moveProject(createdId, selectedCollection);
              useCollections.getState().setProjectMeta(createdId, { category: newCategory });
            }
            setCreateOpen(false);
            toast.success("Project created.");
          }}>
            <div className="space-y-3">
              <div><Label htmlFor="dashboard-project-title">Title</Label><Input id="dashboard-project-title" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} className="bg-black/30" required /></div>
              <div><Label htmlFor="dashboard-project-category">Category</Label><select id="dashboard-project-category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="mt-1 w-full rounded-md border border-white/20 bg-[#101318] p-2 text-sm">{["Novel", "Game", "Software", "Movies", "Cartoons"].map((c) => <option key={c}>{c}</option>)}</select></div>
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
      <Dialog open={collectionDialog !== null} onOpenChange={(open) => { if (!open) setCollectionDialog(null); }}><DialogContent className="border-white/10 bg-[#1b1b1b]"><DialogHeader><DialogTitle>{collectionDialog === "new" ? "New collection" : "Rename collection"}</DialogTitle></DialogHeader><form onSubmit={(event) => { event.preventDefault(); const name = collectionName.trim(); if (!name) return; if (collectionDialog === "new") { const id = addCollection(name, selectedCollection); if (id) setSelectedCollection(id); } else if (collectionDialog) renameCollection(collectionDialog, name); setCollectionDialog(null); }}><Label htmlFor="collection-name">Name</Label><Input id="collection-name" value={collectionName} onChange={(event) => setCollectionName(event.target.value)} required className="mt-2 bg-black/30" /><DialogFooter className="mt-4"><button type="button" onClick={() => setCollectionDialog(null)} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground">Cancel</button><button type="submit" className="rounded-lg bg-[#f3b64e] px-3 py-1.5 text-sm font-semibold text-[#221503]">Save</button></DialogFooter></form></DialogContent></Dialog>
      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}><AlertDialogContent className="border-white/10 bg-[#1b1b1b]"><AlertDialogHeader><AlertDialogTitle>Delete collection?</AlertDialogTitle><AlertDialogDescription>The collection will be removed. Projects are kept. Subcollections move up one level.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (pendingDelete) { const parent = collections.find((c) => c.id === pendingDelete)?.parentId ?? null; removeCollection(pendingDelete); if (selectedCollection === pendingDelete) setSelectedCollection(parent); } setPendingDelete(null); }}>Delete collection</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={pendingProjectDelete !== null} onOpenChange={(open) => { if (!open) setPendingProjectDelete(null); }}><AlertDialogContent className="border-white/10 bg-[#1b1b1b]"><AlertDialogHeader><AlertDialogTitle>Delete {pendingProjectDelete?.title}?</AlertDialogTitle><AlertDialogDescription>This permanently removes the project, all its notes and trash from this browser. Export a backup first if you want to keep it.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-500" onClick={() => { if (pendingProjectDelete) { collections.forEach((c) => setMembership(c.id, pendingProjectDelete.id, false)); deleteNovel(pendingProjectDelete.id); toast.success("Project deleted."); } setPendingProjectDelete(null); }}>Delete project</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}><DialogContent className="border-white/10 bg-[#1b1b1b]"><DialogHeader><DialogTitle>Dashboard help</DialogTitle></DialogHeader><p className="text-sm leading-relaxed text-muted-foreground">Create collections and subcollections, drag folders and projects to move them, and use Ctrl + scroll over the library to resize covers. Projects and collections are stored in this browser. Export individual project backups from the workspace settings; these backups do not include collections.</p></DialogContent></Dialog>
    </div>
  );
}
