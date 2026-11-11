"use client";

/** Project dialogs reuse the existing manuscript actions; the library owns navigation. */
import { useEffect, useRef, useState } from "react";
import { BookOpen, FileText, Calendar, MoreVertical } from "lucide-react";
import { exportNovelJson, projectsSavedLocally, saveProjectsLocally, useKachamak } from "@/lib/kachamak/store";
import type { Novel } from "@/lib/kachamak/types";
import { novelWords } from "@/lib/kachamak/utils";
import { AccountDialog } from "./AccountDialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCollections } from "@/lib/kachamak/collections-store";
import { useLibraryPreferences } from "@/lib/kachamak/library-preferences";
import { isDesktop, createFileProject, openFileProject, openRecentProject, importFileProject, removeFileProject } from "@/lib/kachamak/project-files";
import { DashboardLibrary } from "./DashboardLibrary";
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
  useEffect(() => {
    // Browser storage is a recovery cache; native projects use their selected disk folders.
    if (!projectsSavedLocally() && !saveProjectsLocally()) toast.error("Projects could not be saved. Export a JSON backup before refreshing.");
  }, []);
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
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState(defaultAuthor);
  const [collectionDialog, setCollectionDialog] = useState<"new" | string | null>(null);
  const [collectionName, setCollectionName] = useState("");
  const storedCollection = useLibraryPreferences((s) => s.selectedCollection);
  const selectedCollection = collections.some((c) => c.id === storedCollection) ? storedCollection : null;
  const setSelectedCollection = useLibraryPreferences((s) => s.setLocation);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [pendingProjectDelete, setPendingProjectDelete] = useState<Novel | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const openNewCollection = () => { setCollectionName(""); setCollectionDialog("new"); };

  return (
    <DashboardLibrary
      novels={novels}
      onOpenProject={(id) => { if (isDesktop()) void openRecentProject(id).catch(error => toast.error(String(error))); else openNovel(id); }}
      onOpenFile={isDesktop() ? () => { void openFileProject().catch(error => toast.error(String(error))); } : undefined}
      onCreateCollection={openNewCollection}
      onCreateProject={() => { setNewTitle(""); setNewAuthor(defaultAuthor); setCreateOpen(true); }}
      onImport={() => fileRef.current?.click()}
      onAccount={() => setAccountOpen(true)}
      onRenameCollection={(c) => { setCollectionName(c.name); setCollectionDialog(c.id); }}
      onDeleteCollection={setPendingDelete}
      onDeleteProject={setPendingProjectDelete}
    >
      <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Import JSON backup" onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        const destination = selectedCollection;
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            if (isDesktop()) {
              const id = await importFileProject(String(reader.result));
              if (!id) return;
              if (destination) setMembership(destination, id, true);
            } else {
              const result = importNovel(String(reader.result));
              if (!result.ok) throw new Error(result.error ?? "Import failed.");
              const id = useKachamak.getState().activeNovelId;
              if (id && destination) setMembership(destination, id, true);
            }
            toast.success("Project imported from backup.");
          } catch (error) { toast.error(String(error)); }
        };
        reader.onerror = () => toast.error("Could not read the backup file.");
        reader.readAsText(file);
      }} />
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-white/10 bg-[#1b1b1b]">
          <DialogHeader><DialogTitle>Create a new project</DialogTitle></DialogHeader>
          <form onSubmit={async (event) => {
            event.preventDefault();
            const title = newTitle.trim();
            if (!title || creating) return;
            setCreating(true);
            try {
              let id: string | null;
              if (isDesktop()) id = await createFileProject(title, newAuthor.trim());
              else { createNovel(title, newAuthor.trim()); id = useKachamak.getState().activeNovelId; }
              if (!id) return;
              if (selectedCollection) setMembership(selectedCollection, id, true);
              setCreateOpen(false);
              toast.success(isDesktop() ? "Project folder created on your computer." : "Project created.");
            } catch (error) { toast.error(String(error)); }
            finally { setCreating(false); }
          }}>
            <div className="space-y-3">
              <div><Label htmlFor="dashboard-project-title">Title</Label><Input id="dashboard-project-title" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} className="bg-black/30" required /></div>
              <div><Label htmlFor="dashboard-project-author">Author</Label><Input id="dashboard-project-author" value={newAuthor} onChange={(event) => setNewAuthor(event.target.value)} className="bg-black/30" /></div>
            </div>
            <DialogFooter className="mt-4">
              <button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button type="submit" disabled={creating} className="rounded-lg bg-[#f3b64e] px-3 py-1.5 text-sm font-semibold text-[#221503] hover:bg-[#ffc36a]">Create</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
      <Dialog open={collectionDialog !== null} onOpenChange={(open) => { if (!open) setCollectionDialog(null); }}><DialogContent className="border-white/10 bg-[#1b1b1b]"><DialogHeader><DialogTitle>{collectionDialog === "new" ? "New collection" : "Rename collection"}</DialogTitle></DialogHeader><form onSubmit={(event) => { event.preventDefault(); const name = collectionName.trim(); if (!name) return; if (collectionDialog === "new") { const id = addCollection(name, selectedCollection); if (id) setSelectedCollection(id, [id, ...(selectedCollection ? [selectedCollection] : [])]); } else if (collectionDialog) renameCollection(collectionDialog, name); setCollectionDialog(null); }}><Label htmlFor="collection-name">Name</Label><Input id="collection-name" value={collectionName} onChange={(event) => setCollectionName(event.target.value)} required className="mt-2 bg-black/30" /><DialogFooter className="mt-4"><button type="button" onClick={() => setCollectionDialog(null)} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground">Cancel</button><button type="submit" disabled={creating} className="rounded-lg bg-[#f3b64e] px-3 py-1.5 text-sm font-semibold text-[#221503]">Save</button></DialogFooter></form></DialogContent></Dialog>
      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}><AlertDialogContent className="border-white/10 bg-[#1b1b1b]"><AlertDialogHeader><AlertDialogTitle>Delete collection?</AlertDialogTitle><AlertDialogDescription>The collection will be removed. Its subcollections and projects will move to its parent location. Project contents will be preserved.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (pendingDelete) { const parentId = collections.find((c) => c.id === pendingDelete)?.parentId ?? null; removeCollection(pendingDelete); if (selectedCollection === pendingDelete) setSelectedCollection(parentId); } setPendingDelete(null); }}>Delete collection</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={pendingProjectDelete !== null} onOpenChange={(open) => { if (!open) setPendingProjectDelete(null); }}><AlertDialogContent className="border-white/10 bg-[#1b1b1b]"><AlertDialogHeader><AlertDialogTitle>{isDesktop() ? "Remove from library: " : "Delete "}{pendingProjectDelete?.title}?</AlertDialogTitle><AlertDialogDescription>{isDesktop() ? "This removes the project from the recent-project library. Its folder and manuscripts remain on your computer." : "This permanently removes the project, all its notes and trash from this browser. Export a backup first if you want to keep it."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-500" onClick={async () => { if (pendingProjectDelete) { try { if (isDesktop()) await removeFileProject(pendingProjectDelete.id); else deleteNovel(pendingProjectDelete.id); collections.forEach((c) => setMembership(c.id, pendingProjectDelete.id, false)); toast.success(isDesktop() ? "Project removed from library. Its folder is preserved." : "Project deleted."); } catch (error) { toast.error(String(error)); } } setPendingProjectDelete(null); }}>{isDesktop() ? "Remove from library" : "Delete project"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </DashboardLibrary>
  );
}

/** Horizontalna kartica projekta: naslovna slika levo, informacije desno. */
function ProjectCard({ novel, onOpen, onExport, onDelete, layout, collections, setMembership }: { novel: Novel; onOpen: () => void; onExport: () => void; onDelete: () => void; layout: "grid" | "list"; collections: { id: string; name: string; projectIds: string[] }[]; setMembership: (collectionId: string, projectId: string, included: boolean) => void }) {
  return (
    <div className={`group relative overflow-hidden rounded-xl border border-[#a97f33]/60 bg-[#0c0f14] transition-colors hover:border-[#f0b018] ${layout === "grid" ? "h-[210px]" : "h-[104px]"}`}>
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${novel.title}`}
      className="flex h-full w-full cursor-pointer overflow-hidden text-left"
    >
      {/* cover */}
      <span
        className={`flex shrink-0 items-center justify-center border-r border-[#a97f33]/40 ${layout === "grid" ? "w-[32%] min-w-[112px] max-w-[180px] text-5xl" : "w-[90px] text-3xl"}`}
        style={{ background: novel.cover.bg }}
      >
        <span className="drop-shadow-lg">{novel.cover.icon}</span>
      </span>
      {/* info */}
      <span className={`flex min-w-0 flex-1 flex-col px-5 ${layout === "grid" ? "py-5" : "justify-center"}`}>
        <span className={`truncate pr-5 font-serif font-bold text-white ${layout === "grid" ? "text-2xl" : "text-xl"}`}>
          {novel.title}
        </span>
        <span className={`${layout === "grid" ? "mt-4" : "mt-1"} flex items-center gap-3 text-base text-[#d4d1c9]`}>
          <BookOpen className="h-5 w-5 shrink-0 text-[#e8c265]" />
          Novel
        </span>
        <span className={`${layout === "grid" ? "mt-3" : "mt-1"} flex items-center gap-3 text-base text-[#d4d1c9]`}>
          <FileText className="h-5 w-5 shrink-0 text-[#e8c265]" />
          {novelWords(novel).toLocaleString()} words
        </span>
        <span className={`${layout === "grid" ? "mt-3" : "hidden"} flex items-center gap-3 text-base text-[#d4d1c9]`}>
          <Calendar className="h-5 w-5 shrink-0 text-[#e8c265]" />
          Modified {relativeTime(novel.updatedAt)}
        </span>
      </span>
    </button>
    <DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={`Options for ${novel.title}`} className="absolute bottom-3 right-3 rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-white"><MoreVertical className="h-5 w-5" /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={onOpen}>Open project</DropdownMenuItem><DropdownMenuItem onSelect={onExport}>Export backup</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={onDelete}>Delete project</DropdownMenuItem><DropdownMenuSeparator />{collections.length === 0 ? <DropdownMenuItem disabled>Create a collection first</DropdownMenuItem> : collections.map((c) => <DropdownMenuCheckboxItem key={c.id} checked={c.projectIds.includes(novel.id)} onSelect={(event) => event.preventDefault()} onCheckedChange={(checked) => setMembership(c.id, novel.id, checked === true)}>{c.name}</DropdownMenuCheckboxItem>)}</DropdownMenuContent></DropdownMenu>
    </div>
  );
}
