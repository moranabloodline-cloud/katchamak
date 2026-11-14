"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Info, PenLine, Target, X } from "lucide-react";
import { NoteTree } from "./NoteTree";
import { Corkboard } from "./Corkboard";
import { EditorToolbar, WriteArea } from "./WriteArea";
import { SplitEditors } from "./SplitEditors";
import { TimelineView } from "./TimelineView";
import { ListView } from "./ListView";
import { RightPanel } from "./RightPanel";
import { CtrlZoom } from "./CtrlZoom";
import { useWebLibrary } from "@/lib/kachamak/cloud-library";
import { projectsSavedLocally, useKachamak } from "@/lib/kachamak/store";
import type { NoteNode, SectionKey, ViewMode } from "@/lib/kachamak/types";
import { findNodeInNovel, novelWords, ownWords } from "@/lib/kachamak/utils";
import { NOTE_COLORS } from "@/lib/kachamak/icons";
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
  { key: "split", label: "Split" },
  { key: "write", label: "Write" },
  { key: "corkboard", label: "Grid" },
  { key: "list", label: "List" },
  { key: "timeline", label: "Timeline" },
];

/* ---------- zoom po panelu (Ctrl + skrol) — vidi CtrlZoom.tsx ---------- */

/* kužić — document colour palette (shared with the tree icon picker) */
const DOC_COLORS = NOTE_COLORS;

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
    <div className="flex h-10 items-center gap-2 overflow-hidden border-t border-amber-500/25 px-2">
      {/* Label i Status „wrap“ oko svog teksta (size po broju znakova / w-fit)
          i stoje uz levu ivicu panela — na širokom panelu ostaje prazno desno,
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
          <div className="grid grid-cols-5 gap-1.5">
            {DOC_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                onClick={() => updateNode(section, node.id, { color: c })}
                className={`mx-auto h-6 w-6 rounded-full border hover:scale-110 transition-transform ${
                  node.color === c ? "border-foreground" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => updateNode(section, node.id, { color: "" })}
            className="mt-2 w-full rounded-md border border-white/10 py-1 text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            No colour
          </button>
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

export function NotesSection({ section, rootId }: { section: SectionKey; rootId?: string }) {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const selectedNodeId = useKachamak((s) => s.selectedNodeId);
  const select = useKachamak((s) => s.select);
  const view = useKachamak((s) => s.view);
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
  const selected = hit?.node ?? null;
  const selectedSection = hit?.section ?? section;

  const showEditor = view === "split" || view === "write";

  return (
    <div className="flex min-h-0 flex-1">
      {leftPanelOpen ? (
        <>
          <aside
            ref={leftPanelRef}
            style={{ width: leftPanelWidth }}
            className="hidden shrink-0 flex-col bg-black/20 md:flex"
          >
            <CtrlZoom panel="left" targetRef={leftPanelRef} />
            <div className="min-h-0 flex-1">
              <NoteTree section={section} rootId={rootId} />
            </div>
            {/* dno levog panela: ⓘ levo (ostaje left align), Expand all i
                Collapse all skroz desno u istom redu — po Nikoli */}
            <div className="flex h-10 shrink-0 items-center gap-1.5 border-t border-amber-500/25 px-2">
              <SaveInfoButton />
              <span className="ml-auto" />
              <button
                type="button"
                onClick={() => setAllNodesCollapsed(section, false)}
                className="shrink-0 rounded border border-white/15 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                Expand all
              </button>
              <button
                type="button"
                onClick={() => setAllNodesCollapsed(section, true)}
                className="shrink-0 rounded border border-white/15 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                Collapse all
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
        <div className="hidden w-7 shrink-0 flex-col items-center border-r border-white/10 bg-black/20 md:flex">
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

      <main ref={mainRef} className="flex min-w-0 flex-1 flex-col">
        <CtrlZoom panel="mid" targetRef={mainRef} />
        {/* traka 2 — formatna traka: JEDNA fiksna instanta (po Nikoli se NE
            duplira po panelu u Splitu), uvek na istom mestu iznad lenjira i
            radne površine; na njenu širinu utiču jedino bočni paneli. Prikazuje
            se u Write modu sa otvorenom notom i u Split modu; u Grid / List /
            Write bez selekcije prazan h-10 red drži njenu donju liniju
            neprekinutom od leve do desne ivice */}
        {view === "split" || (showEditor && selected) ? (
          <EditorToolbar />
        ) : (
          <div className="h-10 shrink-0 border-b border-white/10" />
        )}
        <div className="min-h-0 flex-1 overflow-y-auto kachamak-scroll">
          {view === "corkboard" && <Corkboard section={section} rootId={rootId} />}
          {view === "timeline" && <TimelineView />}
          {view === "list" && <ListView section={section} rootId={rootId} />}
          {/* Split: dva nezavisna editora (kao u Scriveneru) — klik na površinu
              je bira, klik na notu otvara notu samo u izabranoj. Lenjir (traka
              3) je unutar SplitEditors — JEDAN red iznad OBA panela, bez
              pozadine; deli se samo površina ispod njega */}
          {view === "split" && <SplitEditors section={section} />}
          {view === "write" &&
            (selected ? (
              <WriteArea key={selected.id} node={selected} section={selectedSection} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
                <PenLine className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Select a note from the {section} tree to start writing.
                </p>
                <button
                  type="button"
                  onClick={() => setView("corkboard")}
                  className="mt-2 rounded-lg border border-orange-500/40 px-3 py-1.5 text-xs text-orange-300 transition-colors hover:bg-orange-500/10"
                >
                  Browse Grid instead
                </button>
              </div>
            ))}
        </div>

        {/* Centre the count when space permits; on narrow panes keep it clear of the view buttons. */}
        <div className="@container relative flex h-10 shrink-0 items-center border-t border-amber-500/25">
          <Target className="absolute left-3 h-4 w-4 text-amber-400/90" aria-hidden="true" />
          {/* brojač na dnu radne površine — kao u Scriveneru pokazuje reči
              OTVORENE note (content + Synopsis + Notes, isto što i „Words“ u
              Details tabu); zbir celog romana samo kad ništa nije selektovano */}
          <span
            className="absolute left-10 max-w-24 truncate text-xs text-muted-foreground @[680px]:left-1/2 @[680px]:-translate-x-1/2"
            title={selected ? "Words in the selected note" : "Total words in the novel"}
          >
            {selected
              ? `${ownWords(selected).toLocaleString("en-US")} words`
              : novel
                ? `${novelWords(novel).toLocaleString("en-US")} words`
                : "0 words"}
          </span>
          <div
            role="toolbar"
            aria-label="View mode"
            className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5"
          >
            {VIEW_BTNS.map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => setView(b.key)}
                aria-pressed={view === b.key}
                className={`rounded-lg px-2 py-1 text-[13px] transition-colors ${
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
            ref={rightPanelRef}
            style={{ width: rightPanelWidth }}
            className="hidden shrink-0 flex-col bg-black/20 lg:flex"
          >
            <CtrlZoom panel="right" targetRef={rightPanelRef} />
            {selected ? (
              <>
                <div className="min-h-0 flex-1">
                  <RightPanel node={selected} section={selectedSection} onHide={toggleRightPanel} />
                </div>
                <NoteMetaBar section={selectedSection} node={selected} />
              </>
            ) : (
              <div className="flex h-full flex-col">
                <div className="flex h-10 shrink-0 items-center justify-between gap-1 border-b border-white/10 pl-3.5 pr-3.5">
                  <span className="text-xs text-muted-foreground">Info</span>
                  <button
                    type="button"
                    aria-label="Hide panel"
                    title="Hide panel"
                    onClick={toggleRightPanel}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <p className="p-4 text-xs leading-relaxed text-muted-foreground">
                  Select a note in the tree or a card in the Grid to see its synopsis,
                  notes and details here.
                </p>
                {/* keep the full-width bottom bar continuous */}
                <div className="h-10 shrink-0 border-t border-amber-500/25" />
              </div>
            )}
          </aside>
        </>
      ) : (
        // zatvoreni desni panel — uska traka; h-10 red održava donju liniju
        // trake 2 kontinuiranom i kad je panel sakriven
        <div className="hidden w-7 shrink-0 flex-col items-center border-l border-white/10 bg-black/20 lg:flex">
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
