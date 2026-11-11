"use client";

import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowUpDown, BookOpen, ChevronDown, ChevronRight, Download, Feather, Folder, FolderOpen, Layers, LayoutGrid, List, MoreVertical, Plus, Search, UserCircle2 } from "lucide-react";
import { exportNovelJson } from "@/lib/kachamak/store";
import type { Novel } from "@/lib/kachamak/types";
import { novelWords } from "@/lib/kachamak/utils";
import { canMoveCollection, useCollections, type Collection } from "@/lib/kachamak/collections-store";
import { useLibraryPreferences } from "@/lib/kachamak/library-preferences";
import { bindDashboardZoom } from "@/lib/kachamak/dashboard-zoom";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { HelpCenter } from "./HelpCenter";
import { ProjectFileStatus } from "./ProjectFileStorage";
import { toast } from "sonner";

type DragItem = { kind: "collection" | "project"; id: string; sourceId: string | null };
const DRAG_TYPE = "application/x-katchamak-library";
const control = "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-white/15 px-3 text-sm text-[#d4d1c9] transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-amber-400";
const createControl = `${control} border-[#b78b43]/70 bg-[#211a10] font-medium text-[#f5d99d] hover:bg-[#342615]`;

function modified(ts: number) {
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function collectionPath(collections: Collection[], id: string | null): Collection[] {
  const result: Collection[] = [];
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    seen.add(id);
    const c = collections.find((entry) => entry.id === id);
    if (!c) break;
    result.unshift(c);
    id = c.parentId;
  }
  return result;
}

function Cover({ novel, small = false }: { novel: Novel; small?: boolean }) {
  // The existing project cover is a background + icon; keep that user data intact.
  return <span aria-hidden="true" className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-r-md border border-[#d7b469]/20 shadow-[4px_5px_14px_#0007] ${small ? "h-12 w-8 text-xl" : "aspect-[2/3] w-full text-5xl"}`} style={{ background: novel.cover?.bg || "linear-gradient(135deg,#30291f,#171717)" }}>
    <span className="absolute inset-y-0 left-0 w-[7%] border-r border-black/30 bg-black/20" />
    <span className="absolute inset-[8%] border border-white/15" />
    <span className="drop-shadow-lg">{novel.cover?.icon || <BookOpen className={small ? "h-4 w-4" : "h-12 w-12 text-[#dbc38d]"} />}</span>
  </span>;
}

interface Props {
  novels: Novel[];
  onOpenProject: (id: string) => void;
  onCreateCollection: () => void;
  onCreateProject: () => void;
  onImport: () => void;
  onOpenFile?: () => void;
  onAccount: () => void;
  onRenameCollection: (collection: Collection) => void;
  onDeleteCollection: (id: string) => void;
  onDeleteProject: (novel: Novel) => void;
  children: ReactNode;
}

export function DashboardLibrary(props: Props) {
  const { novels } = props;
  const { collections, moveCollection, moveProject, setMembership } = useCollections();
  const prefs = useLibraryPreferences();
  const { selectedCollection, expanded, layout, sort, group, coverZoom } = prefs;
  const active = collections.find((c) => c.id === selectedCollection);
  const location = active?.id ?? null;
  const path = collectionPath(collections, location);
  const libraryRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null | undefined>();

  useEffect(() => {
    if (libraryRef.current) return bindDashboardZoom(libraryRef.current, prefs.changeCoverZoom);
  }, [prefs.changeCoverZoom]);

  const navigate = (id: string | null) => {
    prefs.setLocation(id, collectionPath(collections, id).map((c) => c.id));
    setSearch("");
    libraryRef.current?.scrollTo(0, 0);
  };
  const move = (item: DragItem, destination: string | null) => {
    if (item.kind === "collection") {
      if (!moveCollection(item.id, destination)) { toast.error("A collection cannot be moved inside itself or its descendants."); return; }
    } else {
      if (!novels.some((n) => n.id === item.id)) return;
      moveProject(item.id, destination, item.sourceId);
    }
    if (destination && !expanded.includes(destination)) prefs.toggleExpanded(destination);
    toast.success("Moved.");
  };
  const startDrag = (event: DragEvent, item: DragItem) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(item));
    setDragItem(item);
  };
  const dropZone = (destination: string | null) => ({
    "data-drop-zone": destination ?? "root",
    onDragOver: (event: DragEvent) => {
      if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
      event.preventDefault(); event.stopPropagation();
      const allowed = dragItem?.kind !== "collection" || canMoveCollection(collections, dragItem.id, destination);
      event.dataTransfer.dropEffect = allowed ? "move" : "none";
      setDropTarget(allowed ? destination : undefined);
    },
    onDragLeave: (event: DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(undefined);
    },
    onDrop: (event: DragEvent) => {
      if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
      event.preventDefault(); event.stopPropagation();
      try {
        const item = JSON.parse(event.dataTransfer.getData(DRAG_TYPE)) as DragItem;
        if ((item.kind === "collection" || item.kind === "project") && typeof item.id === "string") move(item, destination);
      } catch { /* Ignore unrelated or malformed drag payloads. */ }
      setDragItem(null); setDropTarget(undefined);
    },
  });
  const dragProps = (item: DragItem) => ({ draggable: true, onDragStart: (event: DragEvent) => startDrag(event, item), onDragEnd: () => { setDragItem(null); setDropTarget(undefined); } });
  const destinationMenu = (item: DragItem) => <DropdownMenuSub><DropdownMenuSubTrigger>Move to</DropdownMenuSubTrigger><DropdownMenuSubContent className="max-h-72 max-w-80 overflow-y-auto">
    <DropdownMenuItem onSelect={() => move(item, null)}>Library</DropdownMenuItem>
    {collections.map((c) => <DropdownMenuItem key={c.id} disabled={item.kind === "collection" && !canMoveCollection(collections, item.id, c.id)} onSelect={() => move(item, c.id)}><span className="truncate">{collectionPath(collections, c.id).map((p) => p.name).join(" / ")}</span></DropdownMenuItem>)}
  </DropdownMenuSubContent></DropdownMenuSub>;
  const folderMenu = (c: Collection) => <DropdownMenu><DropdownMenuTrigger asChild><button aria-label={`Options for collection ${c.name}`} className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-white/10"><MoreVertical className="h-4 w-4" /></button></DropdownMenuTrigger><DropdownMenuContent align="end">
    <DropdownMenuItem onSelect={() => navigate(c.id)}>Open collection</DropdownMenuItem>
    <DropdownMenuItem onSelect={() => props.onRenameCollection(c)}>Rename</DropdownMenuItem>
    {destinationMenu({ kind: "collection", id: c.id, sourceId: c.parentId })}
    <DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={() => props.onDeleteCollection(c.id)}>Delete collection</DropdownMenuItem>
  </DropdownMenuContent></DropdownMenu>;
  const projectMenu = (n: Novel, sourceId: string | null) => <DropdownMenu><DropdownMenuTrigger asChild><button aria-label={`Options for project ${n.title}`} className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-white/10"><MoreVertical className="h-4 w-4" /></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="max-h-96 max-w-80 overflow-y-auto">
    <DropdownMenuItem onSelect={() => props.onOpenProject(n.id)}>Open project</DropdownMenuItem>
    <DropdownMenuItem onSelect={() => { exportNovelJson(n); toast.success("Backup downloaded."); }}>Export backup</DropdownMenuItem>
    {destinationMenu({ kind: "project", id: n.id, sourceId })}
    <DropdownMenuItem variant="destructive" onSelect={() => props.onDeleteProject(n)}>Delete project</DropdownMenuItem>
    <DropdownMenuSeparator />
    {collections.map((c) => <DropdownMenuCheckboxItem key={c.id} checked={c.projectIds.includes(n.id)} onSelect={(e) => e.preventDefault()} onCheckedChange={(checked) => setMembership(c.id, n.id, checked === true)}><span className="truncate">{collectionPath(collections, c.id).map((p) => p.name).join(" / ")}</span></DropdownMenuCheckboxItem>)}
  </DropdownMenuContent></DropdownMenu>;
  const projectsAt = (id: string | null) => novels.filter((n) => id ? collections.find((c) => c.id === id)?.projectIds.includes(n.id) : !collections.some((c) => c.projectIds.includes(n.id)));
  const sortedCollections = (parentId: string | null) => collections.filter((c) => c.parentId === parentId).sort((a, b) => sort === "title" ? a.name.localeCompare(b.name) : (sort === "created" ? (b.createdAt ?? 0) - (a.createdAt ?? 0) : (b.updatedAt ?? 0) - (a.updatedAt ?? 0)));
  const tree = (parentId: string | null, depth = 0): ReactNode => <>
    {sortedCollections(parentId).map((c) => <div key={c.id}>
      <div {...dropZone(c.id)} {...dragProps({ kind: "collection", id: c.id, sourceId: c.parentId })} data-tree-collection={c.id} className={`flex h-9 items-center rounded-md pr-1 text-sm ${dropTarget === c.id ? "bg-amber-400/25 ring-1 ring-inset ring-amber-300" : location === c.id ? "bg-amber-400/10 text-[#f5d99d]" : "text-[#bcb8b0] hover:bg-white/5"}`} style={{ paddingLeft: 6 + depth * 16, minWidth: 150 + depth * 16 }}>
        <button type="button" aria-label={`${expanded.includes(c.id) ? "Collapse" : "Expand"} ${c.name}`} aria-expanded={expanded.includes(c.id)} onClick={() => prefs.toggleExpanded(c.id)} className="shrink-0 rounded p-1 hover:bg-white/10">{expanded.includes(c.id) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</button>
        <button type="button" onClick={() => navigate(c.id)} aria-current={location === c.id ? "location" : undefined} className="flex min-w-0 flex-1 items-center gap-2 text-left" title={c.name}><Folder className="h-4 w-4 shrink-0 text-[#cba457]" /><span className="truncate">{c.name}</span></button>
        {folderMenu(c)}
      </div>
      {expanded.includes(c.id) && tree(c.id, depth + 1)}
    </div>)}
    {projectsAt(parentId).map((n) => <div key={n.id} {...dragProps({ kind: "project", id: n.id, sourceId: parentId })} data-tree-project={n.id} className="flex h-9 items-center rounded-md pr-1 text-sm text-[#bcb8b0] hover:bg-white/5" style={{ paddingLeft: 30 + depth * 16, minWidth: 150 + depth * 16 }}>
      <button type="button" onClick={() => props.onOpenProject(n.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left" title={n.title}><BookOpen className="h-4 w-4 shrink-0 text-[#bfae8c]" /><span className="truncate">{n.title}</span></button>{projectMenu(n, parentId)}
    </div>)}
  </>;

  const query = search.trim().toLocaleLowerCase();
  const folders = sortedCollections(location).filter((c) => c.name.toLocaleLowerCase().includes(query));
  const projects = projectsAt(location).filter((n) => n.title.toLocaleLowerCase().includes(query) || n.author.toLocaleLowerCase().includes(query)).sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : sort === "created" ? b.createdAt - a.createdAt : b.updatedAt - a.updatedAt);
  const projectGroups: [string, Novel[]][] = group === "none" ? [["", projects]] : Object.entries(projects.reduce<Record<string, Novel[]>>((all, n) => { (all[n.author?.trim() || "Unknown Author"] ??= []).push(n); return all; }, {})).sort(([a], [b]) => a.localeCompare(b));
  const gridStyle = { gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${Math.round(156 * coverZoom / 100)}px), 1fr))` };

  return <div className="flex h-dvh flex-col overflow-hidden bg-[#0a0c10] text-foreground">
    <header className="flex min-h-12 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#a97f33]/25 bg-[#0c0906] px-4 py-1.5">
      <button type="button" aria-label="KATCHAMAK — Library home" onClick={() => navigate(null)} className="flex items-center gap-2.5 py-1 text-[#e8c265]"><Feather className="h-5 w-5" /><span className="font-serif text-lg font-semibold tracking-[0.25em]">KATCHAMAK</span></button>
      <div className="ml-auto flex items-center gap-1">
        <HelpCenter />
        <span className="mx-1 h-5 w-px bg-white/10" />
        <button onClick={props.onAccount} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-white/5"><UserCircle2 className="h-4 w-4 text-[#e8c265]" />Account<ChevronDown className="h-3.5 w-3.5" /></button>
      </div>
    </header>
    <div className="flex min-h-0 flex-1">
      <aside aria-label="Collections" className="flex min-w-0 shrink-0 flex-col bg-[#090b0f]" style={{ width: `min(${prefs.sidebarWidth}px, 45vw)` }}>
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-white/[0.07] px-3"><h2 className="min-w-0 flex-1 truncate font-serif text-lg text-[#f2ead9]">Collections</h2><button aria-label="New collection" onClick={props.onCreateCollection} className="rounded-md border border-[#a97f33]/40 p-1 text-[#e8c265] hover:bg-white/5"><Plus className="h-4 w-4" /></button></div>
        <nav aria-label="Collection tree" className="min-h-0 flex-1 overflow-auto p-2 kachamak-scroll">
          {tree(null)}
          {!collections.length && !novels.length && <p className="px-2 py-4 text-xs leading-relaxed text-muted-foreground">Create a collection or project to start your library.</p>}
        </nav>
        <div className="shrink-0 border-t border-white/[0.07] px-3 py-2 text-xs text-muted-foreground">{collections.length} collections · {novels.length} projects</div>
      </aside>
      <div role="separator" aria-label="Resize collections panel" aria-orientation="vertical" aria-valuemin={140} aria-valuemax={600} aria-valuenow={prefs.sidebarWidth} tabIndex={0} className="z-10 w-[5px] shrink-0 cursor-col-resize touch-none bg-white/[0.07] outline-none hover:bg-amber-400/60 focus:bg-amber-400/60" onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); prefs.setSidebarWidth(prefs.sidebarWidth + (event.key === "ArrowLeft" ? -16 : 16)); } }} onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) prefs.setSidebarWidth(Math.min(event.clientX, window.innerWidth * .45)); }} onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} />
      <main aria-label="Library" className="flex min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-white/[0.07] bg-[#0c0e12] px-4 py-3">
          <div className="mb-3 flex min-w-0 items-center gap-2"><button aria-label="Parent collection" disabled={!active} onClick={() => navigate(active?.parentId ?? null)} className="rounded p-1 text-muted-foreground hover:bg-white/5 disabled:opacity-25"><ArrowLeft className="h-4 w-4" /></button>
            <nav aria-label="Library path" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm kachamak-scroll"><button {...dropZone(null)} className="shrink-0 rounded px-1.5 py-1 text-[#e8c265] hover:bg-white/5" onClick={() => navigate(null)}>Library</button>{path.map((c) => <span key={c.id} className="flex shrink-0 items-center gap-1"><ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /><button {...dropZone(c.id)} onClick={() => navigate(c.id)} title={c.name} className="max-w-48 truncate rounded px-1.5 py-1 text-[#d4d1c9] hover:bg-white/5" aria-current={c.id === location ? "page" : undefined}>{c.name}</button></span>)}</nav>
          </div>
          <div aria-label="Library toolbar" className="flex flex-wrap items-center gap-2">
            <button onClick={props.onCreateCollection} className={createControl}><Plus className="h-4 w-4" />Collection</button>
            <button onClick={props.onCreateProject} className={createControl}><Plus className="h-4 w-4" />Project</button>
            {props.onOpenFile && <button onClick={props.onOpenFile} className={control}><FolderOpen className="h-4 w-4" />Open</button>}
            <button onClick={props.onImport} className={control}><Download className="h-4 w-4" />Import</button>
            <div className="relative min-w-[100px] flex-1 basis-40"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input aria-label="Search library" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search this location…" className="h-9 w-full rounded-md border border-white/15 bg-black/25 pl-8 pr-2 text-sm outline-none focus:border-[#c9973c]" /></div>
            <DropdownMenu><DropdownMenuTrigger asChild><button className={control}><ArrowUpDown className="h-4 w-4" />Sort<ChevronDown className="h-3 w-3" /></button></DropdownMenuTrigger><DropdownMenuContent align="end">{([ ["updated", "Recently modified"], ["title", "Title A–Z"], ["created", "Recently created"] ] as const).map(([value, label]) => <DropdownMenuCheckboxItem key={value} checked={sort === value} onSelect={() => prefs.setSort(value)}>{label}</DropdownMenuCheckboxItem>)}</DropdownMenuContent></DropdownMenu>
            <DropdownMenu><DropdownMenuTrigger asChild><button className={control}><Layers className="h-4 w-4" />Group<ChevronDown className="h-3 w-3" /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuCheckboxItem checked={group === "none"} onSelect={() => prefs.setGroup("none")}>None</DropdownMenuCheckboxItem><DropdownMenuCheckboxItem checked={group === "author"} onSelect={() => prefs.setGroup("author")}>Author</DropdownMenuCheckboxItem></DropdownMenuContent></DropdownMenu>
            <div className="flex h-9 shrink-0 overflow-hidden rounded-md border border-[#c9973c]/60">{([ ["grid", LayoutGrid], ["list", List] ] as const).map(([value, Icon]) => <button key={value} aria-label={`${value === "grid" ? "Grid" : "List"} view`} aria-pressed={layout === value} onClick={() => prefs.setLayout(value)} className={`px-2.5 ${layout === value ? "bg-[#e8b65c] text-[#221503]" : "text-[#e8c265] hover:bg-white/5"}`}><Icon className="h-4 w-4" /></button>)}</div>
          </div>
        </div>
        <div ref={libraryRef} {...dropZone(location)} data-testid="library-content" className={`min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 kachamak-scroll ${dropTarget !== undefined && dropTarget === location ? "bg-amber-400/[0.04] ring-1 ring-inset ring-amber-400/40" : ""}`}>
          <div className="mb-5 flex items-center gap-2"><h1 className="min-w-0 flex-1 truncate font-serif text-2xl text-[#f2ead9]" title={active?.name ?? "Library"}>{active?.name ?? "Library"}</h1><span className="shrink-0 text-xs text-muted-foreground">{folders.length + projects.length} items</span></div>
          {folders.length > 0 && <section aria-label="Folders" className="mb-6"><div className={layout === "grid" ? "grid gap-3" : "space-y-1"} style={layout === "grid" ? gridStyle : undefined}>{folders.map((c) => <div key={c.id} {...dragProps({ kind: "collection", id: c.id, sourceId: c.parentId })} {...dropZone(c.id)} data-library-collection={c.id} className={`flex min-w-0 items-center rounded-lg border px-2 py-3 ${dropTarget === c.id ? "border-amber-300 bg-amber-400/15" : "border-white/10 bg-white/[0.02] hover:border-[#a97f33]/60"}`}>
            <button type="button" onClick={() => navigate(c.id)} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-left" aria-label={`Open collection ${c.name}`}><span className={`flex shrink-0 items-center justify-center ${layout === "list" ? "h-12 w-8" : ""}`}><FolderOpen className={`shrink-0 text-[#d1ac60] ${layout === "grid" ? "h-9 w-9" : "h-6 w-6"}`} /></span><span className="min-w-0 flex-1 basis-16"><span className="block truncate text-sm text-[#e9dfcb]">{c.name}</span>{layout === "grid" && <span className="mt-0.5 block text-xs text-muted-foreground">Collection</span>}</span>{layout === "list" && <><span className="w-14 text-xs text-muted-foreground">Collection</span><span className="w-24 text-xs text-muted-foreground">—</span><span className="w-24 text-xs text-muted-foreground/70">{c.updatedAt ? modified(c.updatedAt) : "—"}</span></>}</button>{folderMenu(c)}
          </div>)}</div></section>}
          {projectGroups.map(([name, entries]) => entries.length > 0 && <section key={name || "projects"} aria-label={name || "Projects"} className="mb-6">{name && <h2 className="mb-3 border-b border-white/10 pb-2 text-sm text-[#d9c394]">{name}</h2>}
            <div className={layout === "grid" ? "grid items-start gap-x-5 gap-y-7" : "space-y-1"} style={layout === "grid" ? gridStyle : undefined}>{entries.map((n) => <article key={n.id} {...dragProps({ kind: "project", id: n.id, sourceId: location })} data-library-project={n.id} className={`group relative min-w-0 ${layout === "list" ? "flex items-center gap-2 rounded-md border border-white/[0.07] bg-white/[0.02] px-2 py-2 hover:bg-white/5" : ""}`}>
              <button type="button" onClick={() => props.onOpenProject(n.id)} aria-label={`Open ${n.title}`} className={layout === "grid" ? "block w-full text-left" : "flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-left"}>
                <Cover novel={n} small={layout === "list"} />
                <span className={layout === "grid" ? "mt-3 block pr-6" : "min-w-0 flex-1 basis-24"}><span className="block break-words font-serif text-base leading-snug text-[#eee7d8] group-hover:text-[#f5d99d]">{n.title}</span>{layout === "list" && <span className="text-xs text-muted-foreground">{n.author}</span>}</span>
                {layout === "list" && <span className="w-14 text-xs text-muted-foreground">Novel</span>}
                <span className={layout === "grid" ? "mt-1.5 block text-xs leading-relaxed text-muted-foreground" : "w-24 text-xs text-muted-foreground"}>{novelWords(n).toLocaleString()} words</span>
                <span title={new Date(n.updatedAt).toLocaleString()} className={layout === "grid" ? "block text-xs leading-relaxed text-muted-foreground/70" : "w-24 text-xs text-muted-foreground/70"}>{layout === "grid" ? "Modified " : ""}{modified(n.updatedAt)}</span>
              </button>
              <div className={layout === "grid" ? "absolute right-2 top-2 rounded bg-[#0a0c10]/90" : ""}>{projectMenu(n, location)}</div>
            </article>)}</div>
          </section>)}
          {!folders.length && !projects.length && <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-muted-foreground"><FolderOpen className="h-10 w-10 text-[#8d7548]" /><p className="text-sm">{query ? "No matching collections or projects." : "This location is empty."}</p>{!query && <p className="max-w-64 text-xs leading-relaxed">Create a collection or project, or drag items here from the tree.</p>}</div>}
        </div>
        <footer className="shrink-0 border-t border-white/[0.07] px-4 py-2 text-xs text-muted-foreground">{layout === "grid" ? "Ctrl + scroll to resize covers" : "List view"}<span className="float-right"><ProjectFileStatus /></span></footer>
      </main>
    </div>
    {props.children}
  </div>;
}
