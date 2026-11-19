"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import {DocumentTarget} from './DocumentTarget';
import {documentTargetProgress} from '@/lib/kachamak/document-target';
import { NoteTree } from "./NoteTree";
import { DocumentOutline } from "./DocumentOutline";
import { Corkboard } from "./Corkboard";
import { EditorToolbar, WriteArea } from "./WriteArea";
import {ContinuousWriteArea} from './ContinuousWriteArea';
import {continuousSelection} from '@/lib/kachamak/continuous-manuscript';
import { SplitEditors } from "./SplitEditors";
import {timelineDefaultStart} from "@/lib/kachamak/timeline-tree";
import {TimelineEventEditor} from "./TimelineEventEditor";
import {GREGORIAN} from "@/lib/kachamak/story-calendar";
import {FamilyTreeGraph,FamilyTreeEditor} from './FamilyTree';
import { TimelineView } from "./TimelineView";
import { ListView } from "./ListView";
import { RightPanel } from "./RightPanel";
import { CtrlZoom } from "./CtrlZoom";
import { useWebLibrary } from "@/lib/kachamak/cloud-library";
import { projectsSavedLocally, useKachamak } from "@/lib/kachamak/store";
import type { NoteNode, SectionKey, ViewMode } from "@/lib/kachamak/types";
import { findNodeInNovel, novelWords, ownWords, countWords } from "@/lib/kachamak/utils";
import {ColourPalette} from "./PresetColourPicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* naziv moda je „Grid“ — po Nikoli; interno ključ ostaje corkboard (kompatibilnost
   sačuvanih podataka). Kartice (ikona+naslov+Synopsis) su iz arhitektura dokumenta */
const VIEW_BTNS: { key: ViewMode; label: string }[] = [
  { key: "write", label: "Write" },
  { key: "corkboard", label: "Grid" },
  { key: "list", label: "List" },
  { key: "continuous", label: "Continious" },
  { key: "split", label: "Split" },
];

/* ---------- zoom po panelu (Ctrl + skrol) — vidi CtrlZoom.tsx ---------- */

/* kužić — document colour palette (shared with the tree icon picker) */


/* vertical line between the panels — drag it to widen / narrow a panel */
function Resizer({ onMove, side }: { onMove: (dx: number) => void; side: "left" | "right" }) {
  const [dragging, setDragging] = useState(false);
  const lastX = useRef(0);

  useEffect(() => {
    if (!dragging) return;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging]);

  return (
    <div
      role="separator"
      data-workspace-chrome
      aria-orientation="vertical"
      aria-label={`Resize ${side} panel`}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        lastX.current = e.clientX;
        setDragging(true);
      }}
      onPointerMove={(e) => {
        if (!dragging) return;
        onMove(e.clientX - lastX.current);
        lastX.current = e.clientX;
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      className={`relative hidden w-px shrink-0 cursor-col-resize bg-white/10 after:absolute after:inset-y-0 after:-left-1.5 after:-right-1.5 after:content-[''] after:hover:bg-orange-500/10 md:block ${
        dragging ? "bg-orange-500/70" : "hover:bg-orange-500/40"
      }`}
    />
  );
}

/* bottom of the left panel: circled "i" opens save information */
function SaveInfoButton() {
  const cloud = useWebLibrary();
  const saved = cloud.ready && !cloud.pending && !cloud.busy && !cloud.error;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Save information"
          title="Save information"
          className="rounded-full p-1 text-amber-400/90 transition-colors hover:bg-amber-400/10 hover:text-amber-300"
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-64 border-white/10 bg-[#1b1b1b] p-3 text-xs"
      >
        <p className="mb-2 font-semibold text-foreground">Save information</p>
        <dl className="space-y-1 text-muted-foreground">
          <div className="flex justify-between gap-2">
            <dt>{"Cloud save:"}</dt>
            <dd className={saved ? "text-foreground" : "text-red-400"}>
              {saved ? "up to date" : "not verified"}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>JSON:</dt>
            <dd>export manually</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>{"Previous save:"}</dt>
            <dd>{"retained in cloud"}</dd>
          </div>
        </dl>
        {!saved && <p className="mt-2 text-red-400">Try Save and export a JSON backup before closing.</p>}
      </PopoverContent>
    </Popover>
  );
}

/* bottom of the right panel, one line: label box + status dropdown + colour dot */
function NoteMetaBar({ section, node }: { section: SectionKey; node: NoteNode }) {
  const updateNode = useKachamak((s) => s.updateNode);
  const statuses = useKachamak(
    (s) => s.novels.find((n) => n.id === s.activeNovelId)?.statuses ?? []
  );
  const addStatus = useKachamak((s) => s.addStatus);
  const removeStatus = useKachamak((s) => s.removeStatus);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <div className="flex h-10 items-center justify-end gap-2 overflow-hidden border-t border-amber-500/25 px-2">
      {/* Label i Status „wrap“ oko svog teksta (size po broju znakova / w-fit)
          i stoje uz desnu ivicu panela — na širokom panelu ostaje prazno desno,
          na uzom se seku (overflow-hidden), po Nikolinoj odluci */}
      <Input
        value={node.label}
        onChange={(e) => updateNode(section, node.id, { label: e.target.value })}
        placeholder="No Label"
        aria-label="Label"
        size={Math.max(8, node.label.length + 1)}
        className="h-7 w-auto max-w-full min-w-0 border-white/10 bg-black/20 text-xs"
      />
      <Select
        value={node.status || "none"}
        onValueChange={(v) => {
          if (v === "__edit") {
            setEditOpen(true);
            return;
          }
          updateNode(section, node.id, { status: v === "none" ? "" : v });
        }}
      >
        <SelectTrigger
          className="h-7 max-w-full min-w-0 border-white/10 bg-black/20 text-xs"
          aria-label="Status"
        >
          <SelectValue placeholder="No Status" />
        </SelectTrigger>
        <SelectContent className="border-white/10 bg-[#1b1b1b]">
          <SelectItem value="none">No Status</SelectItem>
          {statuses.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
          <SelectItem value="__edit" className="text-orange-300">
            Edit…
          </SelectItem>
        </SelectContent>
      </Select>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Document colour"
            title="Document colour"
            className="flex h-7 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/20 transition-colors hover:bg-white/5"
          >
            <span
              className="h-4 w-4 rounded-full border border-white/20"
              style={{ backgroundColor: node.color || "transparent" }}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-52 border-white/10 bg-[#1b1b1b] p-2.5">
          <ColourPalette value={node.color} onChange={color=>updateNode(section,node.id,{color})}/>
        </PopoverContent>
      </Popover>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-white/10 bg-[#1b1b1b] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit statuses</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <ul className="max-h-48 space-y-1 overflow-y-auto kachamak-scroll">
              {statuses.map((s) => (
                <li
                  key={s}
                  className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 px-2.5 py-1.5 text-sm"
                >
                  <span>{s}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${s}`}
                    title={`Remove ${s}`}
                    onClick={() => removeStatus(s)}
                    className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
              {statuses.length === 0 && (
                <li className="px-2 py-3 text-center text-xs text-muted-foreground">
                  No statuses yet.
                </li>
              )}
            </ul>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                addStatus(draft);
                setDraft("");
              }}
            >
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="New status name"
                className="h-8 text-sm"
              />
              <button
                type="submit"
                className="shrink-0 rounded-md border border-orange-500/40 px-3 text-xs text-orange-300 transition-colors hover:bg-orange-500/10"
              >
                Add
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function NotesSection({ section, rootId, revealSearch }: { section: SectionKey; rootId?: string; revealSearch?: boolean }) {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const selectedNodeId = useKachamak((s) => s.selectedNodeId);
  const select = useKachamak((s) => s.select);
  const storedView = useKachamak((s) => s.view);
  const view = storedView==='family' && section!=='family' ? 'write' : storedView;
  const [editFamily,setEditFamily]=useState(0);
  const [compactFamily,setCompactFamily]=useState(false);
  useEffect(()=>setCompactFamily(false),[activeNovelId,section,selectedNodeId]);
  const activePane = useKachamak((s) => s.activePane);
  const setView = useKachamak((s) => s.setView);
  const leftPanelOpen = useKachamak((s) => s.leftPanelOpen);
  const rightPanelOpen = useKachamak((s) => s.rightPanelOpen);
  const toggleLeftPanel = useKachamak((s) => s.toggleLeftPanel);
  const toggleRightPanel = useKachamak((s) => s.toggleRightPanel);
  const leftPanelWidth = useKachamak((s) => s.leftPanelWidth);
  const rightPanelWidth = useKachamak((s) => s.rightPanelWidth);
  const setLeftPanelWidth = useKachamak((s) => s.setLeftPanelWidth);
  const setRightPanelWidth = useKachamak((s) => s.setRightPanelWidth);
  const setAllNodesCollapsed = useKachamak((s) => s.setAllNodesCollapsed);
  const [treeReveal, setTreeReveal] = useState<{ id: string; scope: string }>();
  const treeScopeKey = `${activeNovelId}:${section}:${rootId ?? ''}`;
  const reveal = view === 'timeline' && treeReveal?.scope === treeScopeKey && treeReveal.id === selectedNodeId
    ? treeReveal : undefined;

  /* zone za Ctrl+skrol (zoom po panelu) */
  const leftPanelRef = useRef<HTMLElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const rightPanelRef = useRef<HTMLElement | null>(null);

  const novel = novels.find((n) => n.id === activeNovelId);
  /* selekcija preživi prelazak na drugi tab: nota se traži u celom romanu, ne
     samo u tekućoj sekciji — editor toolbar, editor i desni panel drže istu
     notu dok korisnik ne klikne novu u levom panelu (po Nikoli). Izmene idu u
     matičnu sekciju note (selectedSection), ne u tekući tab. */
  const hit =
    selectedNodeId && novel ? findNodeInNovel(novel, selectedNodeId) : null;
  const selected = ((view==="timeline"&&section==="timeline")||view==='family')&&hit?.section!==section?null:hit?.node ?? null;
  const familySettings=selected && novel && hit?.section==='family'
    ? <FamilyTreeEditor key={selected.id} novel={novel} tree={selected}/> : undefined;
  const openFamilyInspector=()=>{
    if(novel)useKachamak.getState().setInspectorTabHidden(novel.id,'family',false);
    if(!rightPanelOpen)toggleRightPanel();
    setEditFamily(n=>n+1);
    setCompactFamily(true);
  };
  const selectedSection = hit?.section ?? section;

  const manuscriptWords=view==='continuous'?continuousSelection(novel?.sections[section]??[],selectedNodeId,rootId).reduce((total,node)=>total+countWords(node.content),0):0;
  const target=view!=='continuous'&&selected?.documentTarget?.amount?selected.documentTarget:null;
  const targetCount=target?documentTargetProgress(selected?.content??'',target).count:0;

  return (
    <div className="flex min-h-0 flex-1">
      {leftPanelOpen || revealSearch ? (
        <>
          <aside
            data-workspace-chrome
            data-search-shortcut={revealSearch || undefined}
            ref={leftPanelRef}
            style={{ width: leftPanelWidth }}
            className="hidden shrink-0 flex-col bg-black/20 md:flex"
          >
            <CtrlZoom panel="left" targetRef={leftPanelRef} />
            <div className="min-h-0 flex-1">
              <NoteTree section={section} rootId={rootId} reveal={reveal} onDismissReveal={() => setTreeReveal(undefined)} />
            </div>
            {/* dno levog panela: ⓘ levo (ostaje left align), Expand i
                Collapse skroz desno u istom redu — po Nikoli */}
            <div className="flex h-10 shrink-0 items-center gap-1.5 border-t border-amber-500/25 px-2">
              <SaveInfoButton />
              <span className="ml-auto" />
              <button
                type="button"
                onClick={() => setAllNodesCollapsed(section, false)}
                className="shrink-0 rounded border border-white/15 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                Expand
              </button>
              <button
                type="button"
                onClick={() => { setTreeReveal(undefined); setAllNodesCollapsed(section, true); }}
                className="shrink-0 rounded border border-white/15 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                Collapse
              </button>
            </div>
          </aside>
          <Resizer
            side="left"
            onMove={(dx) => setLeftPanelWidth(useKachamak.getState().leftPanelWidth + dx)}
          />
        </>
      ) : (
        // zatvoreni levi panel — uska traka; h-10 red održava donju liniju
        // trake 2 kontinuiranom i kad je panel sakriven
        <div data-workspace-chrome className="hidden w-7 shrink-0 flex-col items-center border-r border-white/10 bg-black/20 md:flex">
          <div className="flex h-10 w-full shrink-0 items-center justify-center border-b border-white/10">
            <button
              type="button"
              aria-label="Show panel"
              title="Show panel"
              onClick={toggleLeftPanel}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <main ref={mainRef} tabIndex={-1} className="flex min-w-0 flex-1 flex-col outline-none">
        <CtrlZoom panel="mid" targetRef={mainRef} />
        {/* One fixed formatting toolbar for every note view, including Continuous, Grid and List. */}
        {view!=="timeline"&&view!=="family"&&<EditorToolbar node={selected} section={selectedSection} />}
        <div className="min-h-0 flex-1 overflow-y-auto kachamak-scroll">
          {view === "corkboard" && <Corkboard section={section} rootId={rootId} />}
          {view==='family' && novel && <FamilyTreeGraph key={treeScopeKey+':'+selected?.id} novel={novel} tree={selected}
            onCreate={()=>useKachamak.getState().addNode('family',rootId??null,'doc','New family tree')} onEdit={openFamilyInspector}/>}
          {view === "timeline" && <TimelineView key={treeScopeKey} section={section} rootId={rootId} onRevealNote={id => setTreeReveal({ id, scope: treeScopeKey })} />}
          {view === "list" && <ListView section={section} rootId={rootId} />}
          {/* Split: dva nezavisna editora (kao u Scriveneru) — klik na površinu
              je bira, klik na notu otvara notu samo u izabranoj. Lenjir (traka
              3) je unutar SplitEditors — JEDAN red iznad OBA panela, bez
              pozadine; deli se samo površina ispod njega */}
          {(view === "write" || view === "split" || view === "continuous") && <DocumentOutline title={view === "continuous" && selectedSection !== section ? novel?.title ?? "Manuscript" : selected?.title ?? ""} scopeKey={`${activeNovelId}:${section}:${rootId ?? ""}:${selectedNodeId}:${view}`} pane={view === "split" ? activePane : undefined}>
            {view === "split" && <SplitEditors section={section} />}
            {view === "write" && (selected ? <WriteArea key={selected.id} node={selected} section={selectedSection}/> : <div className="p-10 text-center text-sm text-muted-foreground">Select a note from the tree to start writing.</div>)}
            {view === "continuous" && <ContinuousWriteArea key={`${activeNovelId}:${section}:${rootId??""}`} section={section} rootId={rootId}/>}
          </DocumentOutline>}
        </div>

        {/* The extra Timeline workspace controls need more room before the count can be centered. */}
        <div data-workspace-chrome className="@container relative flex h-10 shrink-0 items-center border-t border-amber-500/25">
          <DocumentTarget node={selected} section={selectedSection}/>
          {/* brojač na dnu radne površine — kao u Scriveneru pokazuje reči
              OTVORENE note (content + Synopsis + Notes, isto što i „Words“ u
              Details tabu); zbir celog romana samo kad ništa nije selektovano */}
          <span
            className={`ml-10 mr-1 min-w-0 max-w-52 flex-1 truncate whitespace-nowrap text-xs text-muted-foreground ${view === "timeline"
              ? "@[1040px]:absolute @[1040px]:left-1/2 @[1040px]:mx-0 @[1040px]:-translate-x-1/2"
              : "@[680px]:absolute @[680px]:left-1/2 @[680px]:ml-0 @[680px]:-translate-x-1/2"}`}
            title={target?'Document text / target':view === "continuous" ? "Words in the current manuscript view" : selected ? "Words in the selected note" : "Total words in the novel"}
          >
            {target?`${targetCount.toLocaleString('en-US')}/${target.amount.toLocaleString('en-US')} ${target.unit}`:view === "continuous" ? `${manuscriptWords.toLocaleString("en-US")} words` : selected
              ? `${ownWords(selected).toLocaleString("en-US")} words`
              : novel
                ? `${novelWords(novel).toLocaleString("en-US")} words`
                : "0 words"}
          </span>
          <div
            role="toolbar"
            aria-label="View mode"
            className="ml-auto flex min-w-0 items-center gap-0.5 overflow-x-auto px-1 @[440px]:px-2"
          >
            {view==="timeline"&&<span aria-hidden="true" className="hidden shrink-0 border-r border-border pr-2 text-[11px] font-medium text-muted-foreground @[440px]:mr-1 @[440px]:inline">Workspace</span>}
            {(section==="timeline"?[{key:"timeline" as const,label:"Timeline"},...VIEW_BTNS]:section==="family"?[{key:"family" as const,label:"Tree"},...VIEW_BTNS]:VIEW_BTNS).map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => setView(view === b.key ? "write" : b.key)}
                aria-pressed={view === b.key}
                className={`shrink-0 rounded-lg px-1.5 py-1 text-xs transition-colors @[440px]:px-2 @[440px]:text-[13px] ${
                  view === b.key
                    ? "border border-amber-400/70 bg-amber-400/15 text-amber-300"
                    : "border border-transparent text-zinc-300 hover:text-white"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </main>

      {rightPanelOpen ? (
        <>
          <Resizer
            side="right"
            onMove={(dx) => setRightPanelWidth(useKachamak.getState().rightPanelWidth - dx)}
          />
          <aside
            data-workspace-chrome
            ref={rightPanelRef}
            style={{ width: rightPanelWidth }}
            className={compactFamily && familySettings ? "absolute right-0 top-10 bottom-0 z-30 flex max-w-[95vw] flex-col border-l border-border bg-background lg:static lg:z-auto lg:shrink-0" : "hidden shrink-0 flex-col bg-black/20 lg:flex"}
          >
            <CtrlZoom panel="right" targetRef={rightPanelRef} />
            {novel && <div className="min-h-0 flex-1">
              <RightPanel key={familySettings?`${novel.id}:family:${editFamily}`:novel.id}
                novel={novel} node={selected} section={selectedSection} familySettings={familySettings}
                onHide={()=>{
                  setCompactFamily(false);
                  if(!compactFamily || window.matchMedia('(min-width:64rem)').matches)toggleRightPanel();
                }}
                timelineSettings={selected && (selectedSection==='timeline' || view==='timeline' && selectedSection===section)
                  ? <TimelineEventEditor key={`${novel.id}:${selected.id}:${selected.title}:${JSON.stringify(selected.event)}:${selected.icon}:${JSON.stringify(selected.links)}:${JSON.stringify(novel.timeline?.calendar)}`}
                      embedded start={timelineDefaultStart(novel.sections[selectedSection],selected.id)} novel={novel}
                      calendar={novel.timeline?.calendar??GREGORIAN} current={{node:selected,section:selectedSection}}
                      section={selectedSection} onClose={()=>{}} onSaved={()=>{}}/>
                  : undefined}
              />
            </div>}
            {selected ? <NoteMetaBar section={selectedSection} node={selected}/> : <div className="h-10 shrink-0 border-t border-amber-500/25"/>}
          </aside>
        </>
      ) : (
        // zatvoreni desni panel — uska traka; h-10 red održava donju liniju
        // trake 2 kontinuiranom i kad je panel sakriven
        <div data-workspace-chrome className="hidden w-7 shrink-0 flex-col items-center border-l border-white/10 bg-black/20 lg:flex">
          <div className="flex h-10 w-full shrink-0 items-center justify-center border-b border-white/10">
            <button
              type="button"
              aria-label="Show panel"
              title="Show panel"
              onClick={toggleRightPanel}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
