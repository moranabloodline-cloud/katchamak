"use client";

import {usePanelZoom} from './CtrlZoom';
import {
  useEffect,
  useRef,
  useState,
  type RefObject,
  type ReactNode,
} from "react";
import {
  CalendarDays,
  ChevronRight,
  Plus,
} from "lucide-react";
import { NoteConnections } from "./NoteConnections";
import { RichEditor } from "./RichEditor";
import {useNoteAppearance} from "./PageSurface";
import {noteTypography} from "@/lib/kachamak/page-format";
import { useKachamak } from "@/lib/kachamak/store";
import { finishTimelineAdd, usesTimelineDialog, useTimelineAddRequest } from "@/lib/kachamak/timeline-actions";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type {HomePageEntry} from '@/lib/kachamak/homepage';
import { selectedInspectorTab, type InspectorTabAction } from "@/lib/kachamak/inspector-tabs";
import { changeNoteInspectorTab, useNoteInspectorSettings } from "@/lib/kachamak/note-inspector-settings";
import { INSPECTOR_TABS, type InspectorTabKey, type Novel, type NoteNode, type SectionKey } from "@/lib/kachamak/types";
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
  const pointer = useRef<{ id: number; y: number; ratio: number } | null>(null);

  useEffect(() => {
    if (!dragging) return;
    const style = document.body.style;
    const { cursor, userSelect } = style;
    style.cursor = "row-resize";
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
      aria-orientation="horizontal"
      aria-label="Resize Synopsis and Notes"
      aria-valuemin={15}
      aria-valuemax={85}
      aria-valuenow={Math.round(ratio * 100)}
      tabIndex={0}
      onKeyDown={(e) => {
        const current = useKachamak.getState().infoSynopsisRatio ?? 0.5;
        let next: number;
        switch (e.key) {
          case "ArrowUp": next = current - 0.02; break;
          case "ArrowDown": next = current + 0.02; break;
          case "Home": next = 0.15; break;
          case "End": next = 0.85; break;
          default: return;
        }
        e.preventDefault();
        onDrag(next);
      }}
      onPointerDown={(e) => {
        if (e.button !== 0 || pointer.current) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        pointer.current = { id: e.pointerId, y: e.clientY, ratio };
        setDragging(true);
      }}
      onPointerMove={(e) => {
        const active = pointer.current;
        if (!active || active.id !== e.pointerId) return;
        const box = boxRef.current;
        if (!box || box.clientHeight === 0) return;
        onDrag(active.ratio + (e.clientY - active.y) / box.clientHeight);
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      className={`relative h-px w-full shrink-0 touch-none cursor-row-resize bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 after:absolute after:inset-x-0 after:-bottom-1.5 after:-top-1.5 after:content-[''] after:hover:bg-orange-500/10 ${
        dragging ? "bg-orange-500/70" : "hover:bg-orange-500/40"
      }`}
    />
  );
}

export function RightPanel({
  novel,
  node,
  section,
  onHide,
  timelineSettings,
  familySettings,
  emptyInfo,
  infoEditor,
  infoOnly = false,
  publishTools,
  mapTools,
  canvas,
}: {
  novel: Novel;
  node: NoteNode | null;
  section: SectionKey;
  onHide?: () => void;
  timelineSettings?: ReactNode;
  familySettings?: ReactNode;
  emptyInfo?: ReactNode;
  infoEditor?: ReactNode;
  infoOnly?: boolean;
  mapTools?: (host:HTMLDivElement|null)=>void;
  publishTools?: {host:(host:HTMLDivElement|null)=>void;tab:"tools"|"manuscript";select:(tab:"tools"|"manuscript")=>void};
  canvas?: {page:HomePageEntry; toolsRef:(host:HTMLDivElement|null)=>void};
}) {
  const updateNode = useKachamak((s) => s.updateNode);
  const {font,size,spacing}=useNoteAppearance(node);
  const proseStyle=noteTypography(font,size,spacing);
  const rightZoom = usePanelZoom("right");
  const infoRatio = useKachamak((s) => s.infoSynopsisRatio ?? 0.5);
  const setInfoSynopsisRatio = useKachamak((s) => s.setInfoSynopsisRatio);
  const workspace = useKachamak(s => s.activeTab);
  const inspectorNoteId = canvas || infoOnly || mapTools || publishTools ? undefined : node?.id;
  const settings = useNoteInspectorSettings(novel, workspace, inspectorNoteId);
  const visibleTabs = INSPECTOR_TABS.filter(t => infoOnly ? t.key === 'info' : !settings.hidden.includes(t.key));
  const hiddenTabs = INSPECTOR_TABS.filter(t => settings.hidden.includes(t.key));
  const selectCanvasTab = useKachamak(s=>s.selectCanvasInspectorTab);
  const changeHomepage = useKachamak(s=>s.changeHomepage);
  const info = canvas?.page ?? node;
  const writeInfo = (field:'synopsis'|'notes', html:string) => {
    if(canvas)changeHomepage(novel.id,{type:'info',field,value:html},canvas.page.id);
    else if(node)updateNode(section,node.id,{[field]:html});
  };
  const activeTab = mapTools ? 'tools' : publishTools ? publishTools.tab : canvas ? novel.inspectorByTab?.homepage?.selected ?? 'info' : infoOnly ? 'info' : selectedInspectorTab(settings, workspace) ?? '';
  const setInspectorTabHidden = useKachamak(s => s.setInspectorTabHidden);
  const selectInspectorTab = useKachamak(s => s.selectInspectorTab);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const restoringTab = useRef(false);
  const changeTab = (key: InspectorTabKey, action: InspectorTabAction) => {
    if (inspectorNoteId && changeNoteInspectorTab(novel, workspace, inspectorNoteId, key, action)) return;
    if (action === "select") selectInspectorTab(novel.id,key);
    else setInspectorTabHidden(novel.id,key,action === "hide");
  };
  const hideTab = (key:InspectorTabKey) => {
    changeTab(key,"hide");
    requestAnimationFrame(()=>toolbarRef.current?.querySelector<HTMLButtonElement>(
      '[role="tab"][aria-selected="true"], button[aria-label="Show hidden inspector tabs"]'
    )?.focus());
  };
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const addRequest = useTimelineAddRequest();
  const hasTimelineSettings = !!timelineSettings;
  const detailsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasTimelineSettings || !addRequest || addRequest.novelId !== activeNovelId || addRequest.section !== section
      || addRequest.noteId !== node?.id || usesTimelineDialog()) return;
    if(activeTab!=='details'){
      if (!changeNoteInspectorTab(novel, workspace, addRequest.noteId, 'details', 'select')) selectInspectorTab(novel.id, 'details');
      return;
    }
    detailsRef.current?.querySelector('[aria-label="Timeline block"]')?.scrollIntoView?.({block:"nearest"});
    finishTimelineAdd(addRequest);
  }, [addRequest, activeNovelId, activeTab, hasTimelineSettings, node?.id, section, novel, workspace, selectInspectorTab]);


  /* Info razdelnik — meri se nad kontejnerom oba polja (vidi SynopsisResizer) */
  const infoBoxRef = useRef<HTMLDivElement | null>(null);

  // The context-menu trigger shares this button's data-state. aria-selected belongs to the tab.
  const tabCls =
    "h-8 flex-none rounded-md border border-transparent bg-transparent px-3 text-sm font-normal text-muted-foreground shadow-none transition-colors aria-selected:border-[#ad7e2e]/70 aria-selected:bg-[#3a2c18] aria-selected:text-[#fbe4a6] dark:aria-selected:text-[#fbe4a6]";

  return (
    <Tabs value={activeTab} onValueChange={value => {
      if(publishTools){if(value==='tools'||value==='manuscript')publishTools.select(value);}
      else if(canvas){if(value==='info'||value==='tools')selectCanvasTab(novel.id,value);}
      else if (!infoOnly)changeTab(value as InspectorTabKey,"select");
    }} className="flex h-full flex-col gap-0">
      {/* traka 2 (desno) — ista donja linija kao header stabla i editor toolbar;
          „Hide panel“ skroz desno u istom redu, ne zalepljen uz tabove */}
      <div ref={toolbarRef} className="flex h-10 min-w-0 shrink-0 items-center gap-1 border-b border-white/10 px-2">
        <TabsList aria-label={mapTools?"Maps inspector":publishTools?"Publish inspector":canvas?"Canvas inspector":"Note inspector"} className={`h-auto min-w-0 justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-0 ${!canvas && visibleTabs.length>3 ? '[&>[role=tab]]:px-2 [&>[role=tab]]:text-xs' : ''}`}>
          {mapTools ? <TabsTrigger value="tools" className={tabCls}>Tools</TabsTrigger> : publishTools ? <><TabsTrigger value="tools" className={tabCls}>Tools</TabsTrigger><TabsTrigger value="manuscript" className={tabCls}>Manuscript</TabsTrigger></> : canvas ? <>
            <TabsTrigger value="info" className={tabCls}>Info</TabsTrigger>
            <TabsTrigger value="tools" className={tabCls}>Tools</TabsTrigger>
          </> : visibleTabs.map(t=>{
            const trigger=<TabsTrigger key={t.key} value={t.key} className={tabCls}>{t.label}</TabsTrigger>;
            if(infoOnly) return trigger;
            return <ContextMenu key={t.key}>
              <ContextMenuTrigger asChild>{trigger}</ContextMenuTrigger>
              <ContextMenuContent aria-label={t.label+' tab actions'}>
                <ContextMenuItem onSelect={()=>hideTab(t.key)}>Hide tab</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>;
          })}
        </TabsList>
        {!mapTools && !publishTools && !canvas && !infoOnly && <DropdownMenu>
          <DropdownMenuTrigger asChild><button type="button" disabled={!hiddenTabs.length} aria-label="Show hidden inspector tabs" title={hiddenTabs.length?'Show hidden tabs':'All tabs are visible'} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-white/10 disabled:opacity-40"><Plus className="size-4"/></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" aria-label="Hidden inspector tabs" onCloseAutoFocus={event=>{
            if(!restoringTab.current)return;
            restoringTab.current=false;
            event.preventDefault();
            toolbarRef.current?.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')?.focus();
          }}>
            {hiddenTabs.map(t=><DropdownMenuItem key={t.key} onSelect={()=>{
              restoringTab.current=true;
              changeTab(t.key,"show");
            }}>Show {t.label}</DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>}
        {onHide && (
          <button
            type="button"
            aria-label="Hide panel"
            title="Hide panel"
            onClick={onHide}
            className="ml-auto shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* zoom desnog panela (Ctrl + skrol) — samo sadržina; red tabova (traka 2)
          i NoteMetaBar na dnu ostaju istih visina, linije ostaju poravnate */}
      <div
        className="min-h-0 flex-1 overflow-y-auto kachamak-scroll p-3"
        style={{ zoom: rightZoom }}
      >
        {/* Info — Synopsis i Notes vertikalno; razdelnik između njih se vuče
            (arhitektura §11), svako polje skroluje svoj sadržaj nezavisno */}
        {info && <TabsContent value="info" className="mt-0 h-full">
          {infoEditor ?? <div key={info.id} ref={infoBoxRef} data-inspector-prose={info.id}
            data-link-source-id={canvas ? undefined : info.id} className="flex h-full min-h-0 flex-col">
            <div
              className="flex min-h-0 shrink-0 flex-col"
              style={{ height: `${infoRatio * 100}%` }}
            >
              <Label className="shrink-0 text-xs text-muted-foreground">
                Synopsis
              </Label>
              <div style={proseStyle} className="note-prose mt-1 min-h-0 flex-1 overflow-y-auto kachamak-scroll rounded-lg border border-white/10 bg-black/20 p-2.5">
                <RichEditor
                  ariaLabel="Synopsis" html={info.synopsis??''}
                  onChange={html=>writeInfo('synopsis',html)}
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
              <div style={proseStyle} className="note-prose mt-1 min-h-0 flex-1 overflow-y-auto kachamak-scroll rounded-lg border border-white/10 bg-black/20 p-2.5">
                <RichEditor
                  ariaLabel="Notes" html={info.notes??''}
                  onChange={html=>writeInfo('notes',html)}
                  placeholder="Write here..."
                />
              </div>
            </div>
          </div>}
        </TabsContent>}
        {mapTools && <TabsContent value="tools" className="mt-0"><div ref={mapTools}/></TabsContent>}
        {publishTools && <TabsContent value={publishTools.tab} className="mt-0"><div ref={publishTools.host}/></TabsContent>}
        {canvas && <TabsContent value="tools" className="mt-0"><div ref={canvas.toolsRef}/></TabsContent>}

        {node && <>
        {/* Details — postojeće veze, aliasi i podaci note
            (arhitektura §11); osnovni podaci note ostaju ispod */}
        <TabsContent ref={detailsRef} value="details" forceMount={timelineSettings?true:undefined} hidden={activeTab!=='details'} className="mt-0 h-full min-h-0 flex-col gap-1 data-[state=active]:flex data-[state=inactive]:hidden">
          <NoteConnections node={node} section={section} mode="details" timelineSettings={timelineSettings}/>

          <dl className="mt-auto shrink-0 space-y-2 rounded-lg border border-white/10 bg-black/20 p-3 text-xs">
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

          </dl>
        </TabsContent>

        <TabsContent value="mentions" className="mt-0">
          <NoteConnections node={node} section={section} mode="mentions" />
        </TabsContent>
        </>}
        {!mapTools && !publishTools && !info && activeTab && activeTab!=='family' && <TabsContent value={activeTab} className="mt-0 text-xs text-muted-foreground">{activeTab==='info' && emptyInfo ? emptyInfo : <>Select a note to see its {activeTab==='info'?'synopsis and notes':activeTab}.</>}</TabsContent>}
        {!canvas && <TabsContent value="family" forceMount={familySettings?true:undefined} hidden={activeTab!=='family'} className="mt-0 data-[state=inactive]:hidden">
          {familySettings ?? <p className="text-xs text-muted-foreground">Select a Family Tree note to edit its members and relationships.</p>}
        </TabsContent>}
      </div>
    </Tabs>
  );
}
