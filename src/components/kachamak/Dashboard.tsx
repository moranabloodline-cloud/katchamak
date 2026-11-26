"use client";

/** Project dialogs reuse the existing manuscript actions; the library owns navigation. */
import { createWebCollection, createWebProject, importWebProject, removeWebProject } from "@/lib/kachamak/cloud-library";
import { useRef, useState } from "react";
import { useKachamak } from "@/lib/kachamak/store";
import type { Novel } from "@/lib/kachamak/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCollections } from "@/lib/kachamak/collections-store";
import { useLibraryPreferences } from "@/lib/kachamak/library-preferences";
import { DashboardLibrary } from "./DashboardLibrary";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function Dashboard() {
  const novels = useKachamak((s) => s.novels);
  const openNovel = useKachamak((s) => s.openNovel);
  const defaultAuthor = useKachamak((s) => s.defaultAuthor);
  const collections = useCollections((s) => s.collections);
  const renameCollection = useCollections((s) => s.renameCollection);
  const removeCollection = useCollections((s) => s.removeCollection);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState(defaultAuthor);
  const [collectionDialog, setCollectionDialog] = useState<"new" | string | null>(null);
  const [collectionName, setCollectionName] = useState("");
  const storedCollection = useLibraryPreferences((s) => s.selectedCollection);
  const selectedCollection = collections.some((c) => c.id === storedCollection) ? storedCollection : null;
  const setSelectedCollection = useLibraryPreferences((s) => s.setLocation);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [pendingProjectDelete, setPendingProjectDelete] = useState<Novel | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const openNewCollection = () => { setCollectionName(""); setCollectionDialog("new"); };

  return (
    <DashboardLibrary
      novels={novels}
      onOpenProject={openNovel}
      onCreateCollection={openNewCollection}
      onCreateProject={() => { setNewTitle(""); setNewAuthor(defaultAuthor); setCreateOpen(true); }}
      onImport={() => fileRef.current?.click()}
      onRenameCollection={(c) => { setCollectionName(c.name); setCollectionDialog(c.id); }}
      onDeleteCollection={setPendingDelete}
      onDeleteProject={setPendingProjectDelete}
    >
      <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Import JSON backup" onChange={async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        try {
          await importWebProject(file, selectedCollection);
          toast.success("Project imported from backup.");
        } catch (error) { toast.error(String(error)); }
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
              await createWebProject(title, newAuthor.trim(), selectedCollection);
              setCreateOpen(false);
              toast.success("Project saved to your account.");
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
      <Dialog open={collectionDialog !== null} onOpenChange={(open) => { if (!open) setCollectionDialog(null); }}>
        <DialogContent className="border-white/10 bg-[#1b1b1b]">
          <DialogHeader><DialogTitle>{collectionDialog === "new" ? "New collection" : "Rename collection"}</DialogTitle></DialogHeader>
          <form onSubmit={async (event) => {
            event.preventDefault();
            const name = collectionName.trim();
            if (!name || !collectionDialog) return;
            if (collectionDialog !== "new") {
              renameCollection(collectionDialog, name);
              setCollectionDialog(null);
              return;
            }
            try {
              const id = await createWebCollection(name, selectedCollection, (createdId) => {
                setSelectedCollection(createdId, selectedCollection ? [selectedCollection] : []);
                setCollectionDialog(null);
              });
              if (!id) toast.error("The parent collection is no longer available.");
            } catch (error) {
              toast.error(String(error));
            }
          }}>
            <Label htmlFor="collection-name">Name</Label>
            <Input id="collection-name" value={collectionName} onChange={(event) => setCollectionName(event.target.value)} required className="mt-2 bg-black/30" />
            <DialogFooter className="mt-4">
              <button type="button" onClick={() => setCollectionDialog(null)} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground">Cancel</button>
              <button type="submit" disabled={!collectionName.trim()} className="rounded-lg bg-[#f3b64e] px-3 py-1.5 text-sm font-semibold text-[#221503] disabled:opacity-50">Save</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}><AlertDialogContent className="border-white/10 bg-[#1b1b1b]"><AlertDialogHeader><AlertDialogTitle>Delete collection?</AlertDialogTitle><AlertDialogDescription>The collection will be removed. Its subcollections and projects will move to its parent location. Project contents will be preserved.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (pendingDelete) { const parentId = collections.find((c) => c.id === pendingDelete)?.parentId ?? null; removeCollection(pendingDelete); if (selectedCollection === pendingDelete) setSelectedCollection(parentId); } setPendingDelete(null); }}>Delete collection</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={pendingProjectDelete !== null} onOpenChange={(open) => { if (!open && !deletingProject) setPendingProjectDelete(null); }}>
        <AlertDialogContent className="border-white/10 bg-[#1b1b1b]" aria-busy={deletingProject}>
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">Delete {pendingProjectDelete?.title}?</AlertDialogTitle>
            <AlertDialogDescription>This deletes the project from your account library. Export a backup first if you want to keep a copy.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingProject}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-500" disabled={deletingProject} onClick={async (event) => {
              event.preventDefault();
              if (!pendingProjectDelete || deletingProject) return;
              setDeletingProject(true);
              try {
                await removeWebProject(pendingProjectDelete.id);
                setPendingProjectDelete(null);
                toast.success("Project deleted from your account library.");
              } catch (error) {
                toast.error(String(error));
                if (!useKachamak.getState().novels.some((novel) => novel.id === pendingProjectDelete.id)) setPendingProjectDelete(null);
              } finally {
                setDeletingProject(false);
              }
            }}>{deletingProject ? "Deleting…" : "Delete project"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLibrary>
  );
}
