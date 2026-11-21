'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {CalendarDays,ChevronLeft,ChevronRight,Plus,ZoomIn,ZoomOut,Maximize2} from 'lucide-react';
import {useKachamak} from '@/lib/kachamak/store';
import {saveZoomSetting,useZoomSetting,zoomScope} from '@/lib/kachamak/workspace-zoom';
import {findNode,findNodeInNovel,locateNode} from '@/lib/kachamak/utils';
import {TIMELINE_LIMIT,TIMELINE_MAX_SPAN,GREGORIAN,baseYearDays,dateToMinute,eventType,minuteToDate,minutesPerDay,shiftMonth,yearText,type StoryDate} from '@/lib/kachamak/story-calendar';
import {boundedViewport,fittedRange,timelineRows,type EventRow} from '@/lib/kachamak/timeline-data';
import type {NoteNode,SectionKey} from '@/lib/kachamak/types';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {CalendarSettings,timeButton,timeField} from './CalendarSettings';
import {DateFields,TimelineEventEditor} from './TimelineEventEditor';
import {TimelineAxis} from './TimelineAxis';
import {TimelineCalendar} from './TimelineCalendar';
import {TimelineCards} from './TimelineCards';
import {TimelineToolbar,timelineDisplays,type DisplayRange,type TimelineMenu} from './TimelineToolbar';
import {timelineDefaultStart,timelineScope,timelineLevelIds,visibleNoteTree} from '@/lib/kachamak/timeline-tree';
import {addTimelineNote,finishTimelineAdd,usesTimelineDialog,useTimelineAddRequest} from '@/lib/kachamak/timeline-actions';
import {importTimeline} from '@/lib/kachamak/timeline-import';
import {toast} from 'sonner';

export function TimelineView({section='binder',rootId,onRevealNote}:{section?:SectionKey;rootId?:string;onRevealNote?:(id:string)=>void}) {
  const state=useKachamak(),novel=state.novels.find(n=>n.id===state.activeNovelId);
  const [settings,setSettings]=useState(false);
  const [editing,setEditing]=useState<{id?:string;start:number}|null>(null);
  const [jump,setJump]=useState<StoryDate|null>(null),[jumpError,setJumpError]=useState('');
  const [includeNested,setIncludeNested]=useState(false),[toolMenu,setToolMenu]=useState<TimelineMenu>(null);
  const [range,setRange]=useState<DisplayRange|null>(null);
  const runOption=(action:()=>void)=>{setToolMenu(null);action();};
  const importFile=useRef<HTMLInputElement>(null),[importing,setImporting]=useState(false);
  // Editing a card selects its note for the inspector without drilling into it.
  const [viewSelection,setViewSelection]=useState<{id:string;scopeId?:string}|null>(null);
  const savedMode=novel?.timeline?.display;
  // Older projects may still have Outline selected. Read it as Timeline without rewriting the project.
  const mode=savedMode==='outline'?'axis':savedMode??(section==='timeline'?'axis':'chronicle');
  useEffect(()=>{
    if(viewSelection?.id!==state.selectedNodeId)setViewSelection(null);
  },[state.selectedNodeId,viewSelection]);
  const selectedScope=novel&&state.selectedNodeId?findNodeInNovel(novel,state.selectedNodeId):null;
  const folderScope=novel&&rootId?findNode(novel.sections[section],rootId):null;
  const roots=useMemo(()=>novel?visibleNoteTree(folderScope?[folderScope]:novel.sections[section],section,state.treeScope):[],[novel,folderScope,section,state.treeScope]);
  const pickedRoot=novel?.timeline?.pinnedRootId?findNode(roots,novel.timeline.pinnedRootId):null;
  const followedScopeId=viewSelection?.id===state.selectedNodeId?viewSelection.scopeId:novel&&section==="timeline"?timelineScope(novel.sections.timeline,state.selectedNodeId,rootId):selectedScope?.section===section&&(!folderScope||findNode([folderScope],selectedScope.node.id))?selectedScope.node.id:rootId;
  const scopeId=pickedRoot?.id??followedScopeId;
  const zoomKey=zoomScope(state);
  const savedViewport=useZoomSetting(zoomKey,'timeline-viewport');
  const addRequest=useTimelineAddRequest();
  useEffect(()=>{
    if(!novel||!addRequest||addRequest.novelId!==novel.id||addRequest.section!==section
      ||addRequest.noteId!==state.selectedNodeId||!usesTimelineDialog())return;
    setEditing({id:addRequest.noteId,start:timelineDefaultStart(novel.sections[section],addRequest.noteId)});
    finishTimelineAdd(addRequest);
  },[addRequest,novel,section,state.selectedNodeId]);

  if(!novel)return null;
  const prefs=novel.timeline,calendar=prefs?.calendar??GREGORIAN,groups=prefs?.groups??[];
  const all=timelineRows(novel,section,scopeId,true),hiddenButtons=prefs?.hiddenDisplayButtons??[];
  const level=section==='timeline'&&(mode==='axis'||mode==='chronicle')&&!includeNested?timelineLevelIds(novel.sections.timeline,scopeId):null;
  const inScope=all.filter(r=>(!level||level.has(r.node.id))&&(mode==='axis'||r.node.id!==scopeId||pickedRoot?.id===r.node.id&&eventType(r.event)==='event'));
  const rows=range?inScope.filter(({event})=>event.start<=range.end&&(event.end??event.start)>=range.start):inScope;
  const day=minutesPerDay(calendar),fit=fittedRange(rows,day,1);
  const defaultViewport=range?boundedViewport(range.start+(range.end-range.start)/2,range.end-range.start+1):fit;
  const scopeKey=novel.id+':'+section+':'+mode+':'+(scopeId??'all')+':'+(range?range.start+','+range.end:'all')+':'+(mode==='calendar'?JSON.stringify(calendar)+':':'')+rows.map(r=>r.node.id+','+r.event.start+','+r.event.end).join(';');
  // Invalidate an old framing when the dates or range change. Store only a
  // numeric signature and coordinates, even for a timeline with many notes.
  let signature=2166136261;
  for(let i=0;i<scopeKey.length;i++)signature=Math.imul(signature^scopeKey.charCodeAt(i),16777619);
  const [savedSignature,savedCenter,savedSpan]=savedViewport?.split(' ').map(Number)??[];
  const local=savedSignature===signature && Number.isFinite(savedCenter) && savedSpan>0 && Number.isFinite(savedSpan)
    ? boundedViewport(savedCenter,savedSpan):null;
  const firstEvent=rows.find(r=>eventType(r.event)==='event')??rows[0];
  const calendarStart=mode==='calendar'?firstEvent?.event.start:undefined;
  const scoped=!!scopeId||section==='timeline'||!!range;
  const calendarCenter=range?Math.max(range.start,calendarStart??range.start):calendarStart??fit.center;
  const center=local?.center??(mode==='calendar'?calendarCenter:scoped?defaultViewport.center:prefs?.center??fit.center);
  const defaultSpan=scoped?defaultViewport.span:prefs?.span??fit.span;
  const span=local?.span??defaultSpan;
  const date=minuteToDate(calendar,center);
  const selected=state.selectedNodeId?findNodeInNovel(novel,state.selectedNodeId):null;
  const current=editing?.id?findNodeInNovel(novel,editing.id):undefined;
  const edit=(r:EventRow)=>{if(eventType(r.event)==='event')setViewSelection({id:r.node.id,scopeId});state.select(r.node.id);if(mode==='calendar')onRevealNote?.(r.node.id);if(usesTimelineDialog())setEditing({id:r.node.id,start:r.event.start});else if(!state.rightPanelOpen)state.toggleRightPanel();};
  const changeViewport=(patch:Partial<{center:number;span:number}>)=>{
    const next=boundedViewport(patch.center??center,patch.span??span);
    saveZoomSetting(zoomKey,'timeline-viewport',[signature,next.center,next.span].join(' '));
  };
  const changeCenter=(value:number)=>changeViewport({center:Math.max(-TIMELINE_LIMIT,Math.min(TIMELINE_LIMIT,Math.round(value)))});
  const monthMove=(delta:number)=>{try{changeCenter(shiftMonth(calendar,center,delta));}catch{/* Limit reached. */}};
  const navigate=(id:string|null)=>{if(pickedRoot)state.setTimeline({pinnedRootId:null});setViewSelection(null);state.select(id);};
  const trail:NoteNode[]=[];let trailId=scopeId;while(trailId){const node=findNode(novel.sections[section],trailId);if(!node)break;trail.unshift(node);trailId=locateNode(novel.sections[section],trailId)?.parentId??undefined;}
  return <div className="flex h-full min-w-0 flex-col bg-background">
    <TimelineToolbar calendar={calendar} roots={roots} root={pickedRoot} range={range} hiddenButtons={hiddenButtons}
      initialRange={{start:inScope[0]?.event.start??center,end:inScope.reduce((last,r)=>Math.max(last,r.event.end??r.event.start),inScope[0]?.event.start??center)}}
      hidden={prefs?.toolsHidden??false} onToggleTools={()=>state.setTimeline({toolsHidden:!prefs?.toolsHidden})}
      menu={toolMenu} onMenu={setToolMenu}
      noteActions={<div className="mt-1 grid gap-2 border-t border-border p-2">
        {!!trail.length&&<nav aria-label="Timeline location" className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground"><button className="hover:text-foreground" style={{color:folderScope?.color || undefined}} onClick={()=>runOption(()=>navigate(rootId??null))}>{folderScope?.title??'All timelines'}</button>{trail.map((node,index)=><span key={node.id} className="flex min-w-0 items-center gap-1"><ChevronRight className="h-3 w-3 shrink-0"/><button className="max-w-48 truncate hover:text-foreground" style={{color:node.color || undefined}} aria-current={index===trail.length-1?'page':undefined} onClick={()=>runOption(()=>navigate(node.id))}>{node.title}</button></span>)}</nav>}
        <div className="flex flex-wrap items-center gap-2"><button className={`${timeButton} border-amber-400/50 bg-amber-400/10 text-amber-300`} onClick={()=>runOption(()=>{addTimelineNote(section,scopeId??null,'event');})}><Plus className="h-3.5 w-3.5"/>Add event</button><button className={timeButton} onClick={()=>runOption(()=>{addTimelineNote(section,scopeId??null,'period');})}><Plus className="h-3.5 w-3.5"/>Time Period</button>{selected?.section===section&&<button className={`${timeButton} lg:hidden`} onClick={()=>runOption(()=>setEditing({id:selected.node.id,start:selected.node.event?.start??center}))}>Edit dates</button>}</div>
        {section==='timeline'&&<><button className={timeButton} disabled={importing} onClick={()=>importFile.current?.click()}>{importing?'Importing…':'Import timeline'}</button><input ref={importFile} type="file" accept=".json,application/json" aria-label="Import timeline file" className="hidden" onChange={async e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(!file)return;setImporting(true);try{if(file.size>2_000_000)throw new Error('Choose a timeline file smaller than 2 MB.');const result=importTimeline(novel.id,await file.text());toast.success(`${result.count} notes added to this project’s Timeline.`);}catch(error){toast.error(error instanceof Error?error.message:'The timeline could not be imported.');}finally{setImporting(false);}}}/></>}
        <div className="flex"><span className="ml-auto text-[11px] text-muted-foreground">{rows.filter(r=>eventType(r.event)==='event').length} events · {rows.filter(r=>eventType(r.event)==='period').length} periods</span></div>
      </div>}
      dateNavigation={(mode==='axis'||mode==='calendar')&&<div className="mb-3 border-b border-border">
        {mode==='axis'&&<div className="flex flex-wrap items-center gap-1.5 pb-2">
            <button aria-label="Earlier dates" className={timeButton} onClick={()=>changeCenter(center-span/2)}><ChevronLeft className="h-4 w-4"/></button>
            <button aria-label="Later dates" className={timeButton} onClick={()=>changeCenter(center+span/2)}><ChevronRight className="h-4 w-4"/></button>
            <button className={timeButton} onClick={()=>runOption(()=>{setJump(date);setJumpError('');})}>Go to date</button>
            <select aria-label="Timeline scale" className={`${timeField} !py-1 !text-xs`} value="" onChange={e=>changeViewport({span:Number(e.target.value)*day})}><option value="" disabled>Scale…</option><option value={1}>Day</option><option value={14}>Two weeks</option><option value={baseYearDays(calendar)}>Year</option><option value={baseYearDays(calendar)*10}>Decade</option><option value={baseYearDays(calendar)*100}>Century</option><option value={baseYearDays(calendar)*1e6}>Million years</option><option value={baseYearDays(calendar)*1e9}>Billion years</option></select><button aria-label="Zoom in timeline" className={timeButton} disabled={span<=60} onClick={()=>changeViewport({span:Math.max(60,Math.round(span/2))})}><ZoomIn className="h-4 w-4"/></button><button aria-label="Zoom out timeline" className={timeButton} disabled={span>=TIMELINE_MAX_SPAN} onClick={()=>changeViewport({span:Math.min(TIMELINE_MAX_SPAN,span*2)})}><ZoomOut className="h-4 w-4"/></button>
            <button className={timeButton} disabled={!rows.length} onClick={()=>changeViewport(fit)}><Maximize2 className="h-3.5 w-3.5"/>Fit events</button>
          </div>}
          {mode==='calendar'&&<div className="flex flex-wrap items-center gap-1.5 pb-2">
            <button aria-label="Previous month" className={timeButton} onClick={()=>monthMove(-1)}><ChevronLeft className="h-4 w-4"/></button>
            <button aria-label="Next month" className={timeButton} onClick={()=>monthMove(1)}><ChevronRight className="h-4 w-4"/></button>
            <button className={`${timeButton} mr-auto`} onClick={()=>runOption(()=>{setJump(date);setJumpError('');})}><CalendarDays className="h-3.5 w-3.5"/>{calendar.months[date.month].name} {yearText(calendar,date.year)}</button>
            <button className={timeButton} disabled={!rows.length} onClick={()=>changeViewport({center:firstEvent!.event.start})}><Maximize2 className="h-3.5 w-3.5"/>First event</button>
          </div>}
      </div>}
      displayOptions={<div className="mt-1 grid gap-2 border-t border-border p-2">
        {mode==='chronicle'&&<select aria-label="Event card content" className={`${timeField} !py-1.5 !text-xs`} value={prefs?.detail??'synopsis'} onChange={e=>state.setTimeline({detail:e.target.value as 'titles'|'synopsis'})}><option value="synopsis">Title + synopsis</option><option value="titles">Titles only</option></select>}<label className="flex items-center gap-1 text-xs text-muted-foreground"><input type="checkbox" checked={prefs?.compact??false} onChange={e=>state.setTimeline({compact:e.target.checked})}/>Compact</label>{section==='timeline'&&(mode==='axis'||mode==='chronicle')&&<label className="flex items-center gap-1 text-xs text-muted-foreground"><input type="checkbox" checked={includeNested} onChange={e=>setIncludeNested(e.target.checked)}/>Include nested notes</label>}
      </div>}
      onCalendar={()=>setSettings(true)} onRange={setRange}
      onToggleButton={key=>state.setTimeline({hiddenDisplayButtons:hiddenButtons.includes(key)?hiddenButtons.filter(item=>item!==key):[...hiddenButtons,key]})}
      onPickRoot={id=>{
        state.setTimeline({pinnedRootId:id});setRange(null);setViewSelection(null);
        if(id){state.select(id);onRevealNote?.(id);}
      }}/>
    {mode==='axis'&&<TimelineAxis calendar={calendar} rows={rows} groups={groups} center={center} span={span} compact={prefs?.compact??false} onOpen={edit} selectedId={state.selectedNodeId??undefined} onPan={changeCenter} onZoom={changeViewport} defaultSpan={defaultSpan}/>}
    {mode==='calendar'&&<TimelineCalendar gallery={novel.gallery} selectedId={state.selectedNodeId??undefined} rows={rows} calendar={calendar} groups={groups} center={center} compact={prefs?.compact??false} onOpen={edit} onAdd={start=>setEditing({start})}/>}
    {mode==='chronicle'&&<TimelineCards gallery={novel.gallery} calendar={calendar} rows={rows} groups={groups} compact={prefs?.compact??false} synopsis={prefs?.detail!=='titles'} selectedId={state.selectedNodeId??undefined} onEdit={edit} onAdd={()=>setEditing({start:scopeId?findNode(novel.sections[section],scopeId)?.event?.start??center:firstEvent?.event.start??center})}/>}
    {all.length>0&&!rows.length&&<div className="p-5 text-center text-xs text-muted-foreground">{range?<><p>No dated notes in this range.</p><button className={`${timeButton} mt-2`} onClick={()=>setRange(null)}>Clear range</button></>:<p>No dated notes in this period yet.</p>}</div>}
    {!all.length&&mode!=='chronicle' &&<div className="shrink-0 border-t border-white/10 p-4 text-center"><button className={timeButton} onClick={()=>setEditing({start:scopeId?timelineDefaultStart(novel.sections[section],scopeId):center})}><Plus className="size-3.5"/>Add Event</button>{selected&&<button className={`${timeButton} ml-2`} onClick={()=>setEditing({id:selected.node.id,start:center})}>Date “<span style={{color:selected.node.color || undefined}}>{selected.node.title}</span>”</button>}</div>}
    {hiddenButtons.length<timelineDisplays.length&&<div className="flex shrink-0 justify-center border-t border-border bg-background px-3 py-2"><div role="tablist" aria-label="Timeline display" className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1">{timelineDisplays.filter(([key])=>!hiddenButtons.includes(key)).map(([key,label])=><button key={key} role="tab" aria-selected={mode===key} className={`${timeButton} ${mode===key?'border-amber-500/60 bg-amber-500/15 text-amber-300':''}`} onClick={()=>state.setTimeline({display:key})}>{label}</button>)}</div></div>}
    {settings&&<CalendarSettings calendar={calendar} onClose={()=>setSettings(false)} onSave={c=>{state.setTimeline({calendar:c});setSettings(false);}}/>}
    {editing&&<TimelineEventEditor key={editing.id||`new:${editing.start}`} novel={novel} calendar={calendar} current={current??undefined} start={editing.start} section={section} parentId={scopeId} onClose={()=>setEditing(null)} onSaved={value=>{changeCenter(value);}}/>}
    {jump&&<Dialog open onOpenChange={v=>{if(!v)setJump(null);}}><DialogContent className="border-white/15 bg-background sm:max-w-xl"><DialogHeader><DialogTitle>Go to date</DialogTitle><DialogDescription>Navigate using {calendar.name}.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={e=>{e.preventDefault();try{changeCenter(dateToMinute(calendar,jump));setJump(null);}catch(err){setJumpError(err instanceof Error?err.message:String(err));}}}><DateFields label="Go to" calendar={calendar} value={jump} onChange={setJump}/>{jumpError&&<p role="alert" className="text-red-400">{jumpError}</p>}<button className="rounded-md bg-amber-400 px-4 py-2 text-sm text-black">Go</button></form></DialogContent></Dialog>}
  </div>;
}
