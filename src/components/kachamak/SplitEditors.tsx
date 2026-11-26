"use client";

import { useEffect, useRef, useState } from "react";
import { PenLine } from "lucide-react";
import { EditorPage } from "./WriteArea";
import { CtrlZoom, usePanelZoom } from "./CtrlZoom";
import { useKachamak } from "@/lib/kachamak/store";
import type { NoteNode, SectionKey } from "@/lib/kachamak/types";
import { findNodeInNovel } from "@/lib/kachamak/utils";

type Pane = "a" | "b";

function EmptyPaneBody({ section, pane }: { section: SectionKey; pane: Pane }) {
  return (
    <div
      aria-label={`Empty editor ${pane.toUpperCase()}`}
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-8 text-center"
    >
      <PenLine className="h-8 w-8 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">
        Select a note from the {section} tree to start writing.
      </p>
    </div>
  );
}

/* razdelnik između dva editora — vuče se levo/desno i širi/skuplja površine
   (isti ponašajući resizer kao između panela; granice 0.2–0.8 u setSplitRatio) */
function SplitResizer({
  wrapRef,
  ratio,
}: {
  wrapRef: React.RefObject<HTMLDivElement | null>;
  ratio: number;
}) {
  const setSplitRatio = useKachamak((s) => s.setSplitRatio);
  const [dragging, setDragging] = useState(false);
  const pointer = useRef<{ id: number; x: number } | null>(null);

  useEffect(() => {
    if (!dragging) return;
    const style = document.body.style;
    const { cursor, userSelect } = style;
    style.cursor = "col-resize";
    style.userSelect = "none";
    return () => {
      style.cursor = cursor;
      style.userSelect = userSelect;
    };
  }, [dragging]);

  const endDrag = ({ pointerId }: { pointerId: number }) => {
    if (pointer.current?.id !== pointerId) return;
    pointer.current = null;
    setDragging(false);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize split editors"
      aria-valuemin={20}
      aria-valuemax={80}
      aria-valuenow={Math.round(ratio * 100)}
      tabIndex={0}
      onKeyDown={(e) => {
        const current = useKachamak.getState().splitRatio ?? 0.5;
        let next: number;
        switch (e.key) {
          case "ArrowLeft": next = current - 0.02; break;
          case "ArrowRight": next = current + 0.02; break;
          case "Home": next = 0.2; break;
          case "End": next = 0.8; break;
          default: return;
        }
        e.preventDefault();
        setSplitRatio(next);
      }}
      onPointerDown={(e) => {
        if (e.button !== 0 || pointer.current) return;
        e.preventDefault();
        /* pointerId ne postoji za sintetičke evente — bez capture-a drag i dalje
           radi dok je pokazivač nad razdelnikom */
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        pointer.current = { id: e.pointerId, x: e.clientX };
        setDragging(true);
      }}
      onPointerMove={(e) => {
        const active = pointer.current;
        if (!active || active.id !== e.pointerId) return;
        const dx = e.clientX - active.x;
        active.x = e.clientX;
        const w = wrapRef.current?.getBoundingClientRect().width ?? 0;
        if (!w) return;
        /* uvek iz store-a — pointermove može stići pre nego što React re-renderuje */
        const cur = useKachamak.getState().splitRatio ?? 0.5;
        setSplitRatio(cur + dx / w);
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onPointerLeave={(e) => {
        if (!e.currentTarget.hasPointerCapture?.(e.pointerId)) endDrag(e);
      }}
      className={`relative w-px shrink-0 touch-none cursor-col-resize bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 after:absolute after:inset-y-0 after:-left-1.5 after:-right-1.5 after:content-[''] after:hover:bg-orange-500/10 ${
        dragging ? "bg-orange-500/70" : "hover:bg-orange-500/40"
      }`}
    />
  );
}

export function SplitEditors({ section }: { section: SectionKey }) {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const paneAId = useKachamak((s) => s.paneAId);
  const paneBId = useKachamak((s) => s.paneBId);
  const activePane = useKachamak((s) => s.activePane);
  const setActivePane = useKachamak((s) => s.setActivePane);
  const splitRatio = useKachamak((s) => s.splitRatio ?? 0.5);
  /* zoom po POVŠINI: dok korisnik ne podesi svoj, nasleđuje midZoom —
     bez skoka kad dođe iz Write moda */
  const zoomA = usePanelZoom("paneA");
  const zoomB = usePanelZoom("paneB");

  const wrapRef = useRef<HTMLDivElement>(null);
  const paneARef = useRef<HTMLDivElement | null>(null);
  const paneBRef = useRef<HTMLDivElement | null>(null);
  const novel = novels.find((n) => n.id === activeNovelId);
  const hitA = paneAId && novel ? findNodeInNovel(novel, paneAId) : null;
  const hitB = paneBId && novel ? findNodeInNovel(novel, paneBId) : null;

  /* kad se Split prikaže, a paneli još nemaju note (npr. posle reload-a —
     persist čuva view, ali paneli su prazni dok korisnik ne klikne), oba
     editora kloniraju trenutno otvorenu notu — isto kao prvi ulazak u Split */
  useEffect(() => {
    const s = useKachamak.getState();
    if (s.paneAId === null && s.paneBId === null && s.selectedNodeId) {
      useKachamak.setState({ paneAId: s.selectedNodeId, paneBId: s.selectedNodeId });
    }
  }, []);

  const pane = (p: Pane, hit: { node: NoteNode; section: SectionKey } | null) => {
    const active = activePane === p;
    const zoom = p === "a" ? zoomA : zoomB;
    return (
      <div
        ref={p === "a" ? paneARef : paneBRef}
        onPointerDown={() => setActivePane(p)}
        onFocusCapture={() => {if(useKachamak.getState().activePane!==p)setActivePane(p);}}
        data-pane={p}
        className={`relative flex h-full min-w-0 flex-col ${
          p === "a" ? "shrink-0" : "flex-1"
        }`}
        style={p === "a" ? { width: `${splitRatio * 100}%` } : undefined}
      >
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-0 z-20 h-[2px] bg-[#ad7e2e] transition-opacity ${
            active ? "opacity-100" : "opacity-0"
          }`}
        />
        <div className="flex min-h-0 flex-1 flex-col" style={{ zoom }}>
          {hit ? (
            <EditorPage key={hit.node.id} node={hit.node} section={hit.section} />
          ) : (
            <EmptyPaneBody section={section} pane={p} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {/* Ctrl+skrol nad pojedinačnom površinom menja SAMO njen zoom */}
      <CtrlZoom panel="paneA" targetRef={paneARef} />
      <CtrlZoom panel="paneB" targetRef={paneBRef} />
      <div ref={wrapRef} className="flex min-h-0 flex-1">
        {pane("a", hitA)}
        <SplitResizer wrapRef={wrapRef} ratio={splitRatio} />
        {pane("b", hitB)}
      </div>
    </div>
  );
}
