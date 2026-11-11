"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  AtSign,
  CalendarDays,
  ChevronRight,
  FileText,
  Hash,
  Search,
  X,
} from "lucide-react";
import { RichEditor } from "./RichEditor";
import { useKachamak } from "@/lib/kachamak/store";
import type { NoteNode, SectionKey } from "@/lib/kachamak/types";
import { ownWords, stripHtml } from "@/lib/kachamak/utils";
import { iconByName } from "@/lib/kachamak/icons";
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
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const rightZoom = useKachamak((s) => s.rightZoom ?? 1);
  const novel = novels.find((n) => n.id === activeNovelId);
  const setTab = useKachamak((s) => s.setTab);
  const select = useKachamak((s) => s.select);
  const infoRatio = useKachamak((s) => s.infoSynopsisRatio ?? 0.5);
  const setInfoSynopsisRatio = useKachamak((s) => s.setInfoSynopsisRatio);

  /* Info razdelnik — meri se nad kontejnerom oba polja (vidi SynopsisResizer) */
  const infoBoxRef = useRef<HTMLDivElement | null>(null);

  /* sve Codex note (ravna lista) — izvor veza i pretrage u Details tabu */
  const codexNotes = useMemo(() => {
    if (!novel) return [] as NoteNode[];
    const out: NoteNode[] = [];
    const walk = (nodes: NoteNode[]) => {
      for (const nd of nodes) {
        out.push(nd);
        walk(nd.children);
      }
    };
    walk(novel.sections.codex ?? []);
    return out;
  }, [novel]);

  /* postojeće veze: naslov/ikona se rešavaju uživo iz Codexa (preimenovanje se
     provlači); obrisanu Codex notu veza i dalje pamti kao „missing note“ */
  const linked = useMemo(
    () =>
      (node.links ?? []).map((id) => ({
        id,
        target: codexNotes.find((n) => n.id === id) ?? null,
      })),
    [node.links, codexNotes]
  );

  /* pretraživi birač (arhitektura §11) — po naslovu, bez ove note i bez
     već povezanih; rezultati ograničeni na 8 kao u pretrazi projekta */
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [] as NoteNode[];
    const linkedIds = new Set(node.links ?? []);
    return codexNotes
      .filter(
        (n) =>
          n.id !== node.id &&
          !linkedIds.has(n.id) &&
          n.title.toLowerCase().includes(needle)
      )
      .slice(0, 8);
  }, [query, codexNotes, node.id, node.links]);

  const setLinks = (links: string[]) => updateNode(section, node.id, { links });

  const mentions = useMemo(() => {
    if (!novel) return [];
    const text = stripHtml(node.content).toLowerCase();
    const found: { id: string; title: string; alias: string }[] = [];
    /* every note in the Codex tab is a mention source — titles (3+ letters) */
    const walk = (nodes: NoteNode[]) => {
      for (const nd of nodes) {
        const nm = nd.title.trim();
        if (nm.length >= 3 && text.includes(nm.toLowerCase())) {
          found.push({ id: nd.id, title: nd.title, alias: nm });
        }
        walk(nd.children);
      }
    };
    walk(novel.sections.codex ?? []);
    return found;
  }, [node.content, novel]);

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
          <div>
            <Label className="text-xs text-muted-foreground">
              Linked Codex notes
            </Label>
            {linked.length === 0 ? (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                No links yet — search below to connect this note to Codex notes
                (characters, places, things).
              </p>
            ) : (
              <ul className="mt-1 space-y-1.5">
                {linked.map(({ id, target }) => {
                  const Icon = target ? iconByName(target.icon) : null;
                  return (
                    <li
                      key={id}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 py-1 pl-2 pr-1 text-xs"
                    >
                      {target ? (
                        <button
                          type="button"
                          title="Open the linked Codex note"
                          onClick={() => {
                            setTab("codex");
                            select(id);
                          }}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded text-left transition-colors hover:text-foreground"
                        >
                          {Icon ? (
                            <Icon
                              className="h-3.5 w-3.5 shrink-0"
                              style={{ color: target.color || "#a1a1aa" }}
                            />
                          ) : (
                            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate font-medium">
                            {target.title}
                          </span>
                        </button>
                      ) : (
                        <span className="flex min-w-0 flex-1 items-center gap-2 text-muted-foreground">
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate italic">missing note</span>
                        </span>
                      )}
                      <button
                        type="button"
                        aria-label="Remove link"
                        title="Remove link"
                        onClick={() =>
                          setLinks((node.links ?? []).filter((x) => x !== id))
                        }
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-red-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">
              Link a Codex note
            </Label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Codex notes..."
                aria-label="Search Codex notes"
                className="h-8 w-full rounded-lg border border-white/15 bg-black/20 pl-8 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-amber-500/50"
              />
            </div>
            {query.trim() && (
              <ul className="mt-1.5 max-h-44 overflow-y-auto kachamak-scroll rounded-lg border border-white/10 bg-black/20 p-1">
                {results.map((n) => {
                  const Icon = iconByName(n.icon);
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setLinks([...(node.links ?? []), n.id]);
                          setQuery("");
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/10"
                      >
                        {Icon ? (
                          <Icon
                            className="h-3.5 w-3.5 shrink-0"
                            style={{ color: n.color || "#a1a1aa" }}
                          />
                        ) : (
                          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">{n.title}</span>
                      </button>
                    </li>
                  );
                })}
                {results.length === 0 && (
                  <li className="px-2 py-2 text-xs text-muted-foreground">
                    No Codex notes match.
                  </li>
                )}
              </ul>
            )}
          </div>

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
          {mentions.length === 0 ? (
            <p className="pt-2 text-xs text-muted-foreground">
              No Codex notes mentioned in this text yet. Names of characters, places and
              things (3+ letters) from the Codex tab appear here automatically.
            </p>
          ) : (
            <ul className="space-y-1.5 pt-2">
              {mentions.map((m) => (
                <li
                  key={`${m.id}-${m.alias}`}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-xs"
                >
                  <AtSign className="h-3.5 w-3.5 text-orange-400" />
                  <span className="font-medium">{m.title}</span>
                  <span className="ml-auto text-muted-foreground">“{m.alias}”</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}
