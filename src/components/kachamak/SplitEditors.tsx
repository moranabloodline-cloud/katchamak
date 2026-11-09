"use client";

import { useEffect, useRef, useState } from "react";
import { PenLine } from "lucide-react";
import { EditorPage, RulerRow } from "./WriteArea";
import { CtrlZoom } from "./CtrlZoom";
import { useKachamak } from "@/lib/kachamak/store";
import type { NoteNode, SectionKey } from "@/lib/kachamak/types";
import { findNodeInNovel } from "@/lib/kachamak/utils";

type Pane = "a" | "b";

/* prazna površina — u taj editor još nije otvorena nota. Samo telo praznog
   stanja: lenjir iznad njega renderuje panel (ista struktura kao pun panel —
   „dva identična ekrana“ u svakom stanju), a formatna traka je JEDNA fiksna
   instanta iznad svega (renderuje je NotesSection) */
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
}: {
  wrapRef: React.RefObject<HTMLDivElement | null>;
}) {
  const setSplitRatio = useKachamak((s) => s.setSplitRatio);
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
      aria-label="Resize split editors"
      onPointerDown={(e) => {
        e.preventDefault();
        /* pointerId ne postoji za sintetičke evente — bez capture-a drag i dalje
           radi dok je pokazivač nad razdelnikom */
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        lastX.current = e.clientX;
        setDragging(true);
      }}
      onPointerMove={(e) => {
        if (!dragging) return;
        const dx = e.clientX - lastX.current;
        lastX.current = e.clientX;
        const w = wrapRef.current?.getBoundingClientRect().width ?? 0;
        if (!w) return;
        /* uvek iz store-a — pointermove može stići pre nego što React re-renderuje */
        const cur = useKachamak.getState().splitRatio ?? 0.5;
        setSplitRatio(cur + dx / w);
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      className={`relative w-px shrink-0 cursor-col-resize bg-white/10 after:absolute after:inset-y-0 after:-left-1.5 after:-right-1.5 after:content-[''] after:hover:bg-orange-500/10 ${
        dragging ? "bg-orange-500/70" : "hover:bg-orange-500/40"
      }`}
    />
  );
}

/* Split (po Nikoli, kao u Scriveneru): formatna traka (traka 2) je JEDNA i
   fiksna iznad svega — NE duplira se po panelu. Lenjir je u SVAKOJ radnoj
   površini (ispravka 09.11.: svaka površina svoj lenjir, jer svaka površina
   ima SVOJ odvojeni zoom — lenjir se uvećava sa stranom te površine). Deli se
   radna površina: dva identična editora (lenjir + strana) + razdelnik koji
   ih širi/skuplja. Klik na površinu je bira (activePane) — klik na notu u
   stablu/Gridu/Listi onda otvara notu SAMO u izabranoj površini, druga
   ostaje sa svojom notom. Ctrl+skrol nad površinom menja SAMO njen zoom
   (paneAZoom/paneBZoom; null → nasleđuje midZoom dok korisnik ne pomeri).
   Fokusirana površina ima tanku zlatnu liniju na vrhu (2px overlay — ne
   pomera layout ni linije). */
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
  const zoomA = useKachamak((s) => s.paneAZoom ?? s.midZoom ?? 1);
  const zoomB = useKachamak((s) => s.paneBZoom ?? s.midZoom ?? 1);

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
        {/* zoom POVŠINE: lenjir + strana se uvećavaju zajedno, svaka površina
            odvojeno; širine panela i razdelnik ostaju u pravim pikselima */}
        <div className="flex min-h-0 flex-1 flex-col" style={{ zoom }}>
          <RulerRow />
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
        <SplitResizer wrapRef={wrapRef} />
        {pane("b", hitB)}
      </div>
    </div>
  );
}
