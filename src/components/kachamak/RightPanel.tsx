"use client";

import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  CalendarDays,
  ChevronRight,
  Hash,
} from "lucide-react";
import { NoteConnections } from "./NoteConnections";
import { RichEditor } from "./RichEditor";
import { useKachamak } from "@/lib/kachamak/store";
import type { NoteNode, SectionKey } from "@/lib/kachamak/types";
import { ownWords } from "@/lib/kachamak/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

/* vodoravni razdelnik Info taba — vuče se gore/dole i menja koliko visine
   uzima Synopsis spram Notes (arhitektura §11); granice čuva store setter */
function SynopsisResizer({
  boxRef,
  ratio,
  onDrag,
}: {
  boxRef: RefObject<HTMLDivElement | null>;
  ratio: number;
  onDrag: (next: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const start = useRef({ y: 0, ratio: 0.5 });

  useEffect(() => {
    if (!dragging) return;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging]);

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize Synopsis and Notes"
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        start.current = { y: e.clientY, ratio };
        setDragging(true);
      }}
      onPointerMove={(e) => {
        if (!dragging) return;
        const box = boxRef.current;
        if (!box || box.clientHeight === 0) return;
        onDrag(start.current.ratio + (e.clientY - start.current.y) / box.clientHeight);
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      className={`relative h-px w-full shrink-0 cursor-row-resize bg-white/10 after:absolute after:inset-x-0 after:-bottom-1.5 after:-top-1.5 after:content-[''] after:hover:bg-orange-500/10 ${
        dragging ? "bg-orange-500/70" : "hover:bg-orange-500/40"
      }`}
    />
  );
}

export function RightPanel({
  node,
  section,
  onHide,
}: {
  node: NoteNode;
  section: SectionKey;
  onHide?: () => void;
}) {
  const updateNode = useKachamak((s) => s.updateNode);
  const rightZoom = useKachamak((s) => s.rightZoom ?? 1);
  const infoRatio = useKachamak((s) => s.infoSynopsisRatio ?? 0.5);
  const setInfoSynopsisRatio = useKachamak((s) => s.setInfoSynopsisRatio);

  /* Info razdelnik — meri se nad kontejnerom oba polja (vidi SynopsisResizer) */
  const infoBoxRef = useRef<HTMLDivElement | null>(null);

  /* reči note = sav njen tekst: content + Synopsis + Notes (konzistentno sa
     Listom i brojačem na dnu radne površine) */
  const words = ownWords(node);

  /* tabovi bez ikonica i bez okvira — svetli samo selektovani (zlatna pilula,
     isti aktivni jezik kao tabovi u topbaru); po Nikoli. dark: parnjaci su
     nužni jer dark:data-... varijante iz ui/tabs.tsx inače pobeđuju */
  const tabCls =
    "h-8 flex-none rounded-lg border border-transparent bg-transparent px-3 text-sm font-normal text-muted-foreground shadow-none transition-colors data-[state=active]:border-[#ad7e2e]/80 dark:data-[state=active]:border-[#ad7e2e]/80 data-[state=active]:bg-[#3a2c18] dark:data-[state=active]:bg-[#3a2c18] data-[state=active]:text-[#fbe4a6] dark:data-[state=active]:text-[#fbe4a6] data-[state=active]:shadow-none dark:data-[state=active]:shadow-none";

  return (
    <Tabs defaultValue="info" className="flex h-full flex-col gap-0">
      {/* traka 2 (desno) — ista donja linija kao header stabla i editor toolbar;
          „Hide panel“ skroz desno u istom redu, ne zalepljen uz tabove */}
      <div className="flex h-10 shrink-0 items-center border-b border-white/10 pl-3.5 pr-3.5">
        <TabsList className="h-auto justify-start gap-1 rounded-none bg-transparent p-0">
          <TabsTrigger value="info" className={tabCls}>
            Info
          </TabsTrigger>
          <TabsTrigger value="details" className={tabCls}>
            Details
          </TabsTrigger>
          <TabsTrigger value="mentions" className={tabCls}>
            Mentions
          </TabsTrigger>
        </TabsList>
        {onHide && (
          <button
            type="button"
            aria-label="Hide panel"
            title="Hide panel"
            onClick={onHide}
            className="ml-auto rounded p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* zoom desnog panela (Ctrl + skrol) — samo sadržina; red tabova (traka 2)
          i NoteMetaBar na dnu ostaju istih visina, linije ostaju poravnate */}
      <div
        className="flex-1 overflow-y-auto kachamak-scroll p-3"
        style={{ zoom: rightZoom }}
      >
        {/* Info — Synopsis i Notes vertikalno; razdelnik između njih se vuče
            (arhitektura §11), svako polje skroluje svoj sadržaj nezavisno */}
        <TabsContent value="info" className="mt-0 h-full">
          <div ref={infoBoxRef} className="flex h-full min-h-0 flex-col">
            <div
              className="flex min-h-0 shrink-0 flex-col"
              style={{ height: `${infoRatio * 100}%` }}
            >
              <Label className="shrink-0 text-xs text-muted-foreground">
                Synopsis
              </Label>
              <div className="mt-1 min-h-0 flex-1 overflow-y-auto kachamak-scroll rounded-lg border border-white/10 bg-black/20 p-2.5 text-sm">
                <RichEditor
                  html={node.synopsis}
                  onChange={(html) =>
                    updateNode(section, node.id, { synopsis: html })
                  }
                  placeholder="Write here..."
                />
              </div>
            </div>

            <SynopsisResizer
              boxRef={infoBoxRef}
              ratio={infoRatio}
              onDrag={setInfoSynopsisRatio}
            />

            <div className="flex min-h-0 flex-1 flex-col pt-2">
              <Label className="shrink-0 text-xs text-muted-foreground">
                Notes
              </Label>
              <div className="mt-1 min-h-0 flex-1 overflow-y-auto kachamak-scroll rounded-lg border border-white/10 bg-black/20 p-2.5 text-sm">
                <RichEditor
                  html={node.notes}
                  onChange={(html) => updateNode(section, node.id, { notes: html })}
                  placeholder="Write here..."
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Details — veze prema Codex notama + pretraživi birač
            (arhitektura §11); osnovni podaci note ostaju ispod */}
        <TabsContent value="details" className="mt-0 space-y-4">
          <NoteConnections node={node} section={section} mode="details" />

          <dl className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3 text-xs">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Type</dt>
              <dd>
                {node.kind === "doc"
                  ? "Note"
                  : node.kind.charAt(0).toUpperCase() + node.kind.slice(1)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Words</dt>
              <dd>{words.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> Created
              </dt>
              <dd>{new Date(node.createdAt).toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> Updated
              </dt>
              <dd>{new Date(node.updatedAt).toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground flex items-center gap-1">
                <Hash className="h-3 w-3" /> Sub-notes
              </dt>
              <dd>{node.children.length}</dd>
            </div>
          </dl>
        </TabsContent>

        <TabsContent value="mentions" className="mt-0">
          <NoteConnections node={node} section={section} mode="mentions" />
        </TabsContent>
      </div>
    </Tabs>
  );
}
