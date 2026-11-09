"use client";

import { useEffect, useRef, useState } from "react";
import { PenLine } from "lucide-react";
import { EditorPage, RulerRow } from "./WriteArea";
import { useKachamak } from "@/lib/kachamak/store";
import type { NoteNode, SectionKey } from "@/lib/kachamak/types";
import { findNodeInNovel } from "@/lib/kachamak/utils";

type Pane = "a" | "b";

/* prazna površina — u taj editor još nije otvorena nota. Bez lažnog reda za
   traku 2: formatna traka je JEDNA fiksna instanta iznad lenjira (renderuje
   je NotesSection), pa ovde ništa ne drži njenu liniju */
function EmptyPane({ section, pane }: { section: SectionKey; pane: Pane }) {
  const setActivePane = useKachamak((s) => s.setActivePane);
  return (
    <div
      onPointerDown={() => setActivePane(pane)}
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
   fiksna iznad svega — NE duplira se po panelu. Lenjir je traka 3: jedan red
   preko cele radne površine, bez pozadine (zato se traka ne vidi) — i on se
   NE deli. Deli se samo radna površina ISPOD lenjira: dva identična editora
   (EditorPage) + razdelnik koji ih širi/skuplja. Klik na površinu je bira
   (activePane) — klik na notu u stablu/Gridu/Listi onda otvara notu SAMO u
   izabranoj površini, druga ostaje sa svojom notom. Fokusirana površina ima
   tanku zlatnu liniju na vrhu (2px overlay — ne pomera layout ni linije). */
export function SplitEditors({ section }: { section: SectionKey }) {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const paneAId = useKachamak((s) => s.paneAId);
  const paneBId = useKachamak((s) => s.paneBId);
  const activePane = useKachamak((s) => s.activePane);
  const setActivePane = useKachamak((s) => s.setActivePane);
  const splitRatio = useKachamak((s) => s.splitRatio ?? 0.5);
  /* zoom srednjeg panela: lenjir + površine se uvećavaju; formatna traka
     ostaje van zooma (traka 2 mora biti u istom redu kroz sve panele) */
  const midZoom = useKachamak((s) => s.midZoom ?? 1);

  const wrapRef = useRef<HTMLDivElement>(null);
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

  const pane = (
    p: Pane,
    hit: { node: NoteNode; section: SectionKey } | null
  ) => {
    const active = activePane === p;
    return (
      <div
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
        {hit ? (
          <EditorPage key={hit.node.id} node={hit.node} section={hit.section} />
        ) : (
          <EmptyPane section={section} pane={p} />
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col" style={{ zoom: midZoom }}>
      {/* traka 3 — lenjir: JEDAN red preko cele radne površine, bez pozadine
          (zato se traka ne vidi); deli se samo površina ispod njega */}
      <RulerRow />
      <div ref={wrapRef} className="flex min-h-0 flex-1">
        {pane("a", hitA)}
        <SplitResizer wrapRef={wrapRef} />
        {pane("b", hitB)}
      </div>
    </div>
  );
}
