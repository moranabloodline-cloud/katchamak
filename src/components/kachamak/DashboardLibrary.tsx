"use client";

import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { BookOpen, ChevronDown, ChevronRight, Folder, FolderOpen, MoreVertical, Plus } from "lucide-react";
import { useCollections, canMoveCollection, type Collection } from "@/lib/kachamak/collections-store";
import type { Novel } from "@/lib/kachamak/types";
import { novelWords } from "@/lib/kachamak/utils";
import { bindDashboardZoom } from "@/lib/kachamak/dashboard-zoom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type Item = { type: "collection" | "project"; id: string };
const MIME = "application/x-katchamak-library";
const control = "rounded-md px-2 py-1.5 text-muted-foreground hover:bg-white/10 hover:text-[#efd197] focus-visible:outline-2 focus-visible:outline-amber-400";

export function projectCategory(novel: Novel, meta?: { category?: string }) {
  return meta?.category || (novel as Novel & { category?: string }).category || "Novel";
}

export function DashboardLibrary({ novels, selected, onSelect, groups, query, toolbar, onCreateCollection, onRenameCollection, onDeleteCollection, onOpen, onExport, onDelete }: {
  novels: Novel[]; selected: string | null; onSelect: (id: string | null) => void;
  groups: { name: string; projects: Novel[] }[]; query: string; toolbar: ReactNode;
  onCreateCollection: () => void; onRenameCollection: (collection: Collection) => void;
  onDeleteCollection: (id: string) => void; onOpen: (id: string) => void;
  onExport: (novel: Novel) => void; onDelete: (novel: Novel) => void;
}) {
  const { collections, collapsedIds, toggleCollapsed, sidebarWidth, setSidebarWidth, coverSize, setCoverSize, layout, projectMeta, setProjectMeta, moveCollection, moveProject } = useCollections();
  const libraryRef = useRef<HTMLDivElement>(null);
  const [dragged, setDragged] = useState<Item | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null | undefined>(undefined);
  const [moving, setMoving] = useState<Item | null>(null);
  const [destination, setDestination] = useState("");
  const [coverProject, setCoverProject] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const active = collections.find((c) => c.id === selected);
  const parentId = active?.id ?? null;
  const children = collections.filter((c) => c.parentId === parentId && (!query || c.name.toLocaleLowerCase().includes(query)));
  const rootProjects = novels.filter((n) => !collections.some((c) => c.projectIds.includes(n.id)));
  const ancestors: Collection[] = [];
  const visited = new Set<string>();
  let ancestor = active;
  while (ancestor && !visited.has(ancestor.id)) {
    ancestors.unshift(ancestor); visited.add(ancestor.id);
    ancestor = collections.find((c) => c.id === ancestor!.parentId);
  }

  useEffect(() => {
    if (!libraryRef.current) return;
    return bindDashboardZoom(libraryRef.current, (step) => {
      const state = useCollections.getState();
      state.setCoverSize(state.coverSize + step);
    });
  }, []);

  function start(event: DragEvent, item: Item) {
    event.stopPropagation(); event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(MIME, JSON.stringify(item)); setDragged(item);
  }
  function allowed(item: Item, id: string | null) {
    if (!item || (item.type !== "collection" && item.type !== "project") || typeof item.id !== "string") return false;
    return item.type === "collection" ? canMoveCollection(collections, item.id, id) : novels.some((n) => n.id === item.id) && (id === null || collections.some((c) => c.id === id));
  }
  function move(item: Item, id: string | null) {
    if (!allowed(item, id)) return false;
    return item.type === "collection" ? moveCollection(item.id, id) : moveProject(item.id, id);
  }
  function over(event: DragEvent, id: string | null) {
    if (!dragged || !allowed(dragged, id)) return;
    event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = "move"; setDropTarget(id);
  }
  function drop(event: DragEvent, id: string | null) {
    event.preventDefault(); event.stopPropagation();
    try { const item = JSON.parse(event.dataTransfer.getData(MIME)) as Item; if (!move(item, id)) toast.error("This move is not allowed."); } catch { /* unrelated drag */ }
    setDragged(null); setDropTarget(undefined);
  }
  const dragProps = (item: Item) => ({ draggable: true, onDragStart: (event: DragEvent) => start(event, item), onDragEnd: () => { setDragged(null); setDropTarget(undefined); } });
  const dropProps = (id: string | null) => ({ onDragOver: (event: DragEvent) => over(event, id), onDrop: (event: DragEvent) => drop(event, id), onDragLeave: () => setDropTarget(undefined) });
  const beginMove = (item: Item) => { setMoving(item); setDestination(""); };
  const pathName = (c: Collection) => {
    const names = [c.name]; const seen = new Set([c.id]); let id = c.parentId;
    while (id && !seen.has(id)) { seen.add(id); const p = collections.find((x) => x.id === id); if (!p) break; names.unshift(p.name); id = p.parentId; }
    return names.join(" / ");
  };
  const collectionMenu = (c: Collection) => <DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={`Options for ${c.name}`} className={control}><MoreVertical className="h-4 w-4" /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => onRenameCollection(c)}>Rename</DropdownMenuItem><DropdownMenuItem onSelect={() => beginMove({ type: "collection", id: c.id })}>Move</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => onDeleteCollection(c.id)}>Delete collection</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
  const projectMenu = (n: Novel) => <DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={`Options for ${n.title}`} className={control}><MoreVertical className="h-4 w-4" /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => onOpen(n.id)}>Open project</DropdownMenuItem><DropdownMenuItem onSelect={() => beginMove({ type: "project", id: n.id })}>Move</DropdownMenuItem><DropdownMenuItem onSelect={() => { setCoverProject(n.id); uploadRef.current?.click(); }}>Set cover image</DropdownMenuItem>{projectMeta[n.id]?.coverUrl && <DropdownMenuItem onSelect={() => setProjectMeta(n.id, { coverUrl: "" })}>Remove cover image</DropdownMenuItem>}<DropdownMenuItem onSelect={() => onExport(n)}>Export backup</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => onDelete(n)}>Delete project</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
  function treeProject(n: Novel, depth: number, location: string) {
    return <div key={`${location}-${n.id}`} {...dragProps({ type: "project", id: n.id })} className="group flex min-w-0 items-center rounded-md hover:bg-white/5" style={{ paddingLeft: depth * 16 + 12 }}><button type="button" onClick={() => onOpen(n.id)} className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left text-sm text-stone-300"><BookOpen className="h-4 w-4 shrink-0 text-[#bfa46a]" /><span className="truncate">{n.title}</span></button>{projectMenu(n)}</div>;
  }
  function treeFolder(c: Collection, depth: number, seen = new Set<string>()): ReactNode {
    if (seen.has(c.id)) return null;
    const next = new Set(seen).add(c.id); const collapsed = collapsedIds.includes(c.id);
    const projects = novels.filter((n) => c.projectIds.includes(n.id));
    return <div key={c.id}>
      <div {...dragProps({ type: "collection", id: c.id })} {...dropProps(c.id)} className={`flex min-w-0 items-center rounded-md ${dropTarget === c.id ? "bg-amber-400/20 ring-1 ring-amber-400" : selected === c.id ? "bg-amber-400/10 text-amber-200" : "text-stone-300 hover:bg-white/5"}`} style={{ paddingLeft: depth * 16 + 4 }}>
        <button type="button" aria-label={`${collapsed ? "Expand" : "Collapse"} ${c.name}`} aria-expanded={!collapsed} onClick={() => toggleCollapsed(c.id)} className="shrink-0 rounded p-1">{collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</button>
        <button type="button" onClick={() => onSelect(c.id)} aria-current={selected === c.id ? "page" : undefined} className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left text-sm"><Folder className="h-4 w-4 shrink-0 text-[#d1ad60]" /><span className="truncate">{c.name}</span></button>{collectionMenu(c)}
      </div>
      {!collapsed && <div>{collections.filter((x) => x.parentId === c.id).map((x) => treeFolder(x, depth + 1, next))}{projects.map((n) => treeProject(n, depth + 1, c.id))}</div>}
    </div>;
  }
  function Cover({ novel, small = false }: { novel: Novel; small?: boolean }) {
    const cover = novel.cover as Novel["cover"] & { url?: string; src?: string; image?: string; imageUrl?: string };
    const source = projectMeta[novel.id]?.coverUrl || cover.url || cover.src || cover.imageUrl || cover.image;
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [source]);
    const width = small ? Math.round(coverSize / 4) : coverSize;
    return <div className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-sm border border-[#71603f]/60 bg-[#20242b] shadow-md" style={{ width, maxWidth: "100%", aspectRatio: "2 / 3" }}>
      {source && !failed ? <img src={source} alt={`${novel.title} cover`} className="h-full w-full object-contain" onError={() => setFailed(true)} draggable={false} /> : <><span className="absolute inset-y-0 left-1.5 w-px bg-[#a9915c]/30" /><div className="flex h-full w-full flex-col items-center justify-center gap-3 border-y-4 border-[#655332]/40 px-3 text-center"><BookOpen className={small ? "h-4 w-4 text-[#bba16c]" : "h-7 w-7 text-[#bba16c]"} />{!small && <><span className="line-clamp-4 font-serif text-base font-medium leading-snug text-[#e7ddc5]">{novel.title}</span><span className="line-clamp-2 text-xs text-stone-400">{novel.author}</span></>}</div></>}
    </div>;
  }
  const date = (n: Novel) => Number.isFinite(n.updatedAt) ? new Date(n.updatedAt).toLocaleDateString() : "—";

  return <div className="flex min-h-0 min-w-0 flex-1 bg-[#0a0c10]">
    <aside aria-label="Collections" className="flex min-h-0 shrink-0 flex-col bg-[#0b0e13]" style={{ width: `min(${sidebarWidth}px, 40vw)` }}>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-4"><FolderOpen className="h-5 w-5 text-[#d6b66e]" /><h2 className="flex-1 font-serif text-lg font-semibold">Collections</h2><button type="button" aria-label="New collection" onClick={onCreateCollection} className={control}><Plus className="h-4 w-4" /></button></div>
      <nav aria-label="Library hierarchy" className="min-h-0 flex-1 overflow-auto p-2 kachamak-scroll">
        <button type="button" {...dropProps(null)} onClick={() => onSelect(null)} aria-current={parentId === null ? "page" : undefined} className={`mb-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm ${dropTarget === null ? "ring-1 ring-amber-400" : ""} ${parentId === null ? "bg-amber-400/10 text-amber-200" : "text-stone-300 hover:bg-white/5"}`}><BookOpen className="h-4 w-4" />Library<span className="ml-auto text-xs text-stone-500">{novels.length}</span></button>
        {collections.filter((c) => c.parentId === null).map((c) => treeFolder(c, 0))}
        {rootProjects.map((n) => treeProject(n, 0, "root"))}
        {!collections.length && !rootProjects.length && <p className="px-3 py-4 text-xs text-stone-500">Create a collection or project to get started.</p>}
      </nav>
    </aside>
    <div role="separator" aria-label="Resize collections panel" aria-orientation="vertical" aria-valuemin={180} aria-valuemax={480} aria-valuenow={sidebarWidth} tabIndex={0} className="relative w-px shrink-0 touch-none cursor-col-resize bg-white/10 after:absolute after:inset-y-0 after:-left-1 after:-right-1 hover:bg-amber-400 focus:bg-amber-400 focus:outline-none" onKeyDown={(e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); setSidebarWidth(sidebarWidth + (e.key === "ArrowRight" ? 16 : -16)); } }} onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) setSidebarWidth(Math.min(e.clientX, window.innerWidth - 320)); }} onPointerUp={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }} />
    <main className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label="Project library">
      <div className="flex h-14 shrink-0 items-center gap-2 overflow-hidden border-b border-white/10 px-6 text-sm"><button type="button" onClick={() => onSelect(null)} className={control}>Library</button>{ancestors.map((c) => <span key={c.id} className="flex min-w-0 items-center gap-2"><ChevronRight className="h-3.5 w-3.5 shrink-0 text-stone-600" /><button type="button" onClick={() => onSelect(c.id)} className="truncate font-medium text-[#e8d4a3]">{c.name}</button></span>)}<span className="ml-auto shrink-0 text-xs text-stone-500">{children.length} folders · {groups.reduce((sum, g) => sum + g.projects.length, 0)} projects</span></div>
      <div className="shrink-0 border-b border-white/[0.06] px-5 py-3">{toolbar}</div>
      <div ref={libraryRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 kachamak-scroll" aria-label="Library contents" title="Ctrl + scroll to resize covers" {...dropProps(parentId)}>
        {children.length > 0 && <section className="mb-7"><h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Collections</h3><div className={layout === "grid" ? "grid gap-5" : "space-y-1"} style={layout === "grid" ? { gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${coverSize}px), 1fr))` } : undefined}>{children.map((c) => <div key={c.id} {...dragProps({ type: "collection", id: c.id })} {...dropProps(c.id)} className={`flex items-center gap-2 rounded-lg border px-3 py-4 ${dropTarget === c.id ? "border-amber-400 bg-amber-400/10" : "border-white/10 bg-white/[0.02] hover:border-[#a9915c]/60"}`}><button type="button" onClick={() => onSelect(c.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><Folder className="h-8 w-8 shrink-0 text-[#d2ad5d]" /><span className="min-w-0"><span className="block truncate text-sm font-medium text-stone-200">{c.name}</span><span className="text-xs text-stone-500">{collections.filter((x) => x.parentId === c.id).length + novels.filter((n) => c.projectIds.includes(n.id)).length} items</span></span></button>{collectionMenu(c)}</div>)}</div></section>}
        {groups.map((g) => g.projects.length > 0 && <section key={g.name || "projects"} className="mb-6">{g.name && <h3 className="mb-4 text-sm font-semibold text-[#e7d7af]">{g.name}</h3>}{layout === "list" && <div className="mb-2 hidden grid-cols-[minmax(0,1fr)_110px_100px_130px_36px] gap-3 border-b border-white/10 px-3 pb-2 text-xs text-stone-500 lg:grid"><span>Project</span><span>Category</span><span>Words</span><span>Modified</span><span /></div>}<div className={layout === "grid" ? "grid gap-x-6 gap-y-7" : "space-y-1"} style={layout === "grid" ? { gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${coverSize}px), 1fr))` } : undefined}>{g.projects.map((n) => layout === "grid" ? <article key={n.id} {...dragProps({ type: "project", id: n.id })} className="group min-w-0" style={{ maxWidth: coverSize }}><button type="button" onClick={() => onOpen(n.id)} aria-label={`Open ${n.title}`} className="block w-full rounded-sm text-left outline-offset-4 focus-visible:outline-2 focus-visible:outline-amber-400"><Cover novel={n} /><span className="mt-3 block line-clamp-2 text-sm font-semibold leading-snug text-[#eee8dc] group-hover:text-[#efce84]">{n.title}</span></button><div className="mt-1 flex items-start gap-1"><div className="min-w-0 flex-1 text-xs leading-5 text-stone-500"><p className="truncate">{projectCategory(n, projectMeta[n.id])} · {novelWords(n).toLocaleString()} words</p><p>Modified {date(n)}</p></div>{projectMenu(n)}</div></article> : <article key={n.id} {...dragProps({ type: "project", id: n.id })} className="grid grid-cols-[minmax(0,1fr)_36px] items-center gap-3 rounded-md border border-transparent px-3 py-2 hover:border-white/10 hover:bg-white/[0.03] lg:grid-cols-[minmax(0,1fr)_110px_100px_130px_36px]"><button type="button" onClick={() => onOpen(n.id)} aria-label={`Open ${n.title}`} className="flex min-w-0 items-center gap-4 text-left"><Cover novel={n} small /><span className="min-w-0"><span className="block truncate text-sm font-medium text-[#eee8dc]">{n.title}</span><span className="text-xs text-stone-500 lg:hidden">{projectCategory(n, projectMeta[n.id])} · {novelWords(n).toLocaleString()} words · {date(n)}</span></span></button><span className="hidden truncate text-xs text-stone-400 lg:block">{projectCategory(n, projectMeta[n.id])}</span><span className="hidden text-xs tabular-nums text-stone-400 lg:block">{novelWords(n).toLocaleString()}</span><span className="hidden text-xs text-stone-400 lg:block">{date(n)}</span>{projectMenu(n)}</article>)}</div></section>)}
        {!children.length && !groups.some((g) => g.projects.length) && <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center"><BookOpen className="h-9 w-9 text-stone-600" /><p className="text-sm text-stone-400">{query ? "Nothing matches your search." : "This collection is empty."}</p><p className="text-xs text-stone-500">Create a project, import a backup, or drop an item here.</p></div>}
      </div>
    </main>
    <input ref={uploadRef} type="file" accept="image/*" className="sr-only" aria-label="Project cover image" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (!file || !coverProject) return; if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) { toast.error("Choose an image smaller than 2 MB."); return; } const id = coverProject; const reader = new FileReader(); reader.onload = () => setProjectMeta(id, { coverUrl: String(reader.result) }); reader.onerror = () => toast.error("Could not read the cover image."); reader.readAsDataURL(file); }} />
    <Dialog open={moving !== null} onOpenChange={(open) => { if (!open) setMoving(null); }}><DialogContent className="border-white/10 bg-[#171a20]"><DialogHeader><DialogTitle>Move to collection</DialogTitle></DialogHeader><label htmlFor="library-destination" className="text-sm">Destination</label><select id="library-destination" value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full rounded-md border border-white/20 bg-[#101318] p-2 text-sm"><option value="">Library root</option>{collections.filter((c) => !moving || allowed(moving, c.id)).map((c) => <option key={c.id} value={c.id}>{pathName(c)}</option>)}</select><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setMoving(null)} className={control}>Cancel</button><button type="button" onClick={() => { if (moving && move(moving, destination || null)) setMoving(null); else toast.error("This move is not allowed."); }} className="rounded-md bg-[#d3ad5e] px-4 py-2 text-sm font-semibold text-black">Move</button></div></DialogContent></Dialog>
  </div>;
}
