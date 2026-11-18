'use client';
import {useEffect,useRef,useState} from 'react';
import {CalendarDays,ChevronLeft,ChevronRight,Plus,Settings2,ZoomIn,ZoomOut,Maximize2,Layers} from 'lucide-react';
import {useKachamak} from '@/lib/kachamak/store';
import {findNode,findNodeInNovel,locateNode} from '@/lib/kachamak/utils';
import {TIMELINE_LIMIT,TIMELINE_MAX_SPAN,GREGORIAN,baseYearDays,dateToMinute,eventType,minuteToDate,minutesPerDay,shiftMonth,yearText,type StoryDate} from '@/lib/kachamak/story-calendar';
import {boundedViewport,fittedRange,groupFor,timelineRows,type EventRow} from '@/lib/kachamak/timeline-data';
import type {NoteNode,SectionKey} from '@/lib/kachamak/types';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {CalendarSettings,timeButton,timeField} from './CalendarSettings';
import {DateFields,TimelineEventEditor} from './TimelineEventEditor';
import {TimelineAxis} from './TimelineAxis';
import {TimelineGroups} from './TimelineGroups';
import {TimelineCalendar} from './TimelineCalendar';
import {TimelineCards} from './TimelineCards';
import {timelineDefaultStart,timelineScope,timelineLevelIds} from '@/lib/kachamak/timeline-tree';
import {addTimelineNote,finishTimelineAdd,usesCompactTimelineEditor,useTimelineAddRequest} from '@/lib/kachamak/timeline-actions';
import {OutlineView} from './OutlineView';
import {importTimeline} from '@/lib/kachamak/timeline-import';
import {toast} from 'sonner';

export function TimelineView({section='binder',rootId,onRevealNote}:{section?:SectionKey;rootId?:string;onRevealNote?:(id:string)=>void}) {
  const state=useKachamak(),novel=state.novels.find(n=>n.id===state.activeNovelId);
  const [settings,setSettings]=useState(false),[groupsOpen,setGroupsOpen]=useState(false);
  const [editing,setEditing]=useState<{id?:string;start:number}|null>(null);
  const [jump,setJump]=useState<StoryDate|null>(null),[jumpError,setJumpError]=useState('');
  const [includeNested,setIncludeNested]=useState(false);
  const importFile=useRef<HTMLInputElement>(null),[importing,setImporting]=useState(false);
  // Editing a card selects its note for the inspector without drilling into it.
  const [viewSelection,setViewSelection]=useState<{id:string;scopeId?:string}|null>(null);
  const mode=novel?.timeline?.display??(section==='timeline'?'axis':'chronicle');
  useEffect(()=>{
    if(viewSelection?.id!==state.selectedNodeId)setViewSelection(null);
  },[state.selectedNodeId,viewSelection]);
  const selectedScope=novel&&state.selectedNodeId?findNodeInNovel(novel,state.selectedNodeId):null;
  const folderScope=novel&&rootId?findNodeInNovel(novel,rootId)?.node:null;
  const scopeId=viewSelection?.id===state.selectedNodeId?viewSelection.scopeId:novel&&section==="timeline"?timelineScope(novel.sections.timeline,state.selectedNodeId,rootId):selectedScope?.section===section&&(!folderScope||findNode([folderScope],selectedScope.node.id))?selectedScope.node.id:rootId;
  const [viewport,setViewport]=useState<{key:string;center:number;span:number}|null>(null);
  const addRequest=useTimelineAddRequest();
  useEffect(()=>{
    if(!novel||!addRequest||addRequest.novelId!==novel.id||addRequest.section!==section
      ||addRequest.noteId!==state.selectedNodeId||!usesCompactTimelineEditor())return;
    setEditing({id:addRequest.noteId,start:timelineDefaultStart(novel.sections[section],addRequest.noteId)});
    finishTimelineAdd(addRequest);
  },[addRequest,novel,section,state.selectedNodeId]);

  if(!novel)return null;
  const prefs=novel.timeline,calendar=prefs?.calendar??GREGORIAN,groups=prefs?.groups??[];
  const all=timelineRows(novel,section,scopeId,true),hidden=prefs?.hiddenGroups??[];
  const level=section==='timeline'&&(mode==='axis'||mode==='chronicle')&&!includeNested?timelineLevelIds(novel.sections.timeline,scopeId):null;
  const inScope=all.filter(r=>(!level||level.has(r.node.id))&&(mode==='axis'||mode==='outline'||r.node.id!==scopeId));
  const rows=inScope.filter(r=>!hidden.includes(groupFor(r.event,groups)));
  const day=minutesPerDay(calendar),fit=fittedRange(rows,day,1);
  // Hide/show changes rows for the calendar, not the month the user is viewing.
  const viewportRows=mode==='calendar'?inScope:rows;
  const scopeKey=novel.id+':'+section+':'+mode+':'+(scopeId??'all')+':'+(mode==='calendar'?JSON.stringify(calendar)+':':'')+viewportRows.map(r=>r.node.id+','+r.event.start+','+r.event.end).join(';');
  const local=viewport?.key===scopeKey?viewport:null;
  const firstDated=(items:EventRow[])=>items.find(row=>eventType(row.event)==='event')??items[0];
  const firstEvent=firstDated(rows);
  const calendarStart=mode==='calendar'?(firstEvent??firstDated(inScope))?.event.start:undefined;
  const center=local?.center??(mode==='calendar'?calendarStart??fit.center:scopeId||section==="timeline"?fit.center:prefs?.center??fit.center),span=local?.span??(scopeId||section==="timeline"?fit.span:prefs?.span??fit.span);
  const date=minuteToDate(calendar,center);
  const selected=state.selectedNodeId?findNodeInNovel(novel,state.selectedNodeId):null;
  const current=editing?.id?findNodeInNovel(novel,editing.id):undefined;
  const renderGroups=[{id:'',name:'Ungrouped',color:'#d6a64a'},...groups].filter(g=>g.id||all.some(r=>groupFor(r.event,groups)===''));
  const hiddenGroupCount=mode==='outline'?0:renderGroups.filter(g=>hidden.includes(g.id)).length;
  const edit=(r:EventRow)=>{if(eventType(r.event)==='event')setViewSelection({id:r.node.id,scopeId});state.select(r.node.id);if(mode==='calendar')onRevealNote?.(r.node.id);if(usesCompactTimelineEditor())setEditing({id:r.node.id,start:r.event.start});else if(!state.rightPanelOpen)state.toggleRightPanel();};
  const preserveCalendarMonth=()=>{if(mode==='calendar'&&!local)setViewport({key:scopeKey,center,span});};
  const setHiddenGroups=(hiddenGroups:string[])=>{preserveCalendarMonth();state.setTimeline({hiddenGroups});};
  const changeViewport=(patch:Partial<{center:number;span:number}>)=>{const next=boundedViewport(patch.center??center,patch.span??span);setViewport({key:scopeKey,...next});state.setTimeline(next);};
  const changeCenter=(value:number)=>changeViewport({center:Math.max(-TIMELINE_LIMIT,Math.min(TIMELINE_LIMIT,Math.round(value)))});
  const monthMove=(delta:number)=>{try{changeCenter(shiftMonth(calendar,center,delta));}catch{/* Limit reached. */}};
  const navigate=(id:string|null)=>{setViewSelection(null);state.select(id);};
  const trail:NoteNode[]=[];let trailId=scopeId;while(trailId){const node=findNode(novel.sections[section],trailId);if(!node)break;trail.unshift(node);trailId=locateNode(novel.sections[section],trailId)?.parentId??undefined;}
  return <div className="flex h-full min-w-0 flex-col bg-background">
    <header className="shrink-0 space-y-3 border-b border-white/10 px-4 py-3">
      {!!trail.length&&<nav aria-label="Timeline location" className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground"><button className="hover:text-foreground" onClick={()=>navigate(rootId??null)}>{folderScope?.title??'All timelines'}</button>{trail.map((node,index)=><span key={node.id} className="flex min-w-0 items-center gap-1"><ChevronRight className="h-3 w-3 shrink-0"/><button className="max-w-48 truncate hover:text-foreground" aria-current={index===trail.length-1?'page':undefined} onClick={()=>navigate(node.id)}>{node.title}</button></span>)}</nav>}
      <div className="flex flex-wrap items-center gap-2"><div className="mr-auto min-w-0"><h2 className="flex items-center gap-2 truncate text-lg font-semibold"><CalendarDays className="h-5 w-5 shrink-0"/>{scopeId?findNodeInNovel(novel,scopeId)?.node.title:section==='timeline'?'All timelines':novel.title}</h2><p className="text-[11px] text-muted-foreground">{novel.title} · {calendar.name}</p></div><button className={timeButton} onClick={()=>setSettings(true)}><Settings2 className="h-3.5 w-3.5"/>Time System</button><button className={`${timeButton} border-amber-400/50 bg-amber-400/10 text-amber-300`} onClick={()=>addTimelineNote(section,scopeId??null,'event')}><Plus className="h-3.5 w-3.5"/>Add event</button><button className={timeButton} onClick={()=>addTimelineNote(section,scopeId??null,'period')}><Plus className="h-3.5 w-3.5"/>Time Period</button>{selected?.section===section&&<button className={`${timeButton} lg:hidden`} onClick={()=>setEditing({id:selected.node.id,start:selected.node.event?.start??center})}>Edit dates</button>}</div>
      <details className="rounded border border-border px-3 py-2"><summary className="cursor-pointer text-xs text-muted-foreground">View options · filters &amp; groups{' '}{hiddenGroupCount>0&&<span className="ml-2 inline-block rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-300">{hiddenGroupCount} {hiddenGroupCount===1?'group':'groups'} hidden</span>}</summary><div className="mt-3 flex flex-wrap items-center gap-2">
        {section==='timeline'&&<><button className={timeButton} disabled={importing} onClick={()=>importFile.current?.click()}>{importing?'Importing…':'Import timeline'}</button><input ref={importFile} type="file" accept=".json,application/json" aria-label="Import timeline file" className="hidden" onChange={async e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(!file)return;setImporting(true);try{if(file.size>2_000_000)throw new Error('Choose a timeline file smaller than 2 MB.');const result=importTimeline(novel.id,await file.text());toast.success(`${result.count} notes added to this project’s Timeline.`);}catch(error){toast.error(error instanceof Error?error.message:'The timeline could not be imported.');}finally{setImporting(false);}}}/></>}
        {mode!=='outline'&&<>{mode==='chronicle'&&<select aria-label="Event card content" className={`${timeField} !py-1.5 !text-xs`} value={prefs?.detail??'synopsis'} onChange={e=>state.setTimeline({detail:e.target.value as 'titles'|'synopsis'})}><option value="synopsis">Title + synopsis</option><option value="titles">Titles only</option></select>}<label className="flex items-center gap-1 text-xs text-muted-foreground"><input type="checkbox" checked={prefs?.compact??false} onChange={e=>state.setTimeline({compact:e.target.checked})}/>Compact</label>{section==='timeline'&&(mode==='axis'||mode==='chronicle')&&<label className="flex items-center gap-1 text-xs text-muted-foreground"><input type="checkbox" checked={includeNested} onChange={e=>setIncludeNested(e.target.checked)}/>Include nested notes</label>}</>}
      </div>
      {mode!=='outline'&&<div className="flex flex-wrap items-center gap-1.5"><button className={timeButton} onClick={()=>setGroupsOpen(true)}><Layers className="h-3.5 w-3.5"/>Groups</button>{renderGroups.map(g=><button key={g.id} aria-pressed={!hidden.includes(g.id)} className={`flex items-center gap-1.5 rounded-full border border-white/10 px-2 py-1 text-[11px] ${hidden.includes(g.id)?'opacity-40 line-through':''}`} onClick={()=>setHiddenGroups(hidden.includes(g.id)?hidden.filter(id=>id!==g.id):[...hidden,g.id])}><span className="h-1.5 w-1.5 rounded-full" style={{background:g.color}}/>{g.name}</button>)}<span className="ml-auto text-[11px] text-muted-foreground">{rows.filter(r=>eventType(r.event)==='event').length} events · {rows.filter(r=>eventType(r.event)==='period').length} periods</span></div>}</details>
    </header>
    {mode==='outline'?<div className="min-h-0 flex-1"><OutlineView key={section==='timeline'?scopeId??'all':undefined} section={section} chronological={section==='timeline'} rootId={scopeId} onSelectNote={id=>{setViewSelection({id,scopeId});state.select(id);}}/></div>:<>
      {(mode==='axis'||mode==='calendar')&&<div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2">
        <button aria-label={mode==='calendar'?'Previous month':'Earlier dates'} className={timeButton} onClick={()=>mode==='calendar'?monthMove(-1):changeCenter(center-span/2)}><ChevronLeft className="h-4 w-4"/></button>
        <button aria-label={mode==='calendar'?'Next month':'Later dates'} className={timeButton} onClick={()=>mode==='calendar'?monthMove(1):changeCenter(center+span/2)}><ChevronRight className="h-4 w-4"/></button>
        <button className={`${timeButton} mr-auto`} onClick={()=>{setJump(minuteToDate(calendar,center));setJumpError('');}}><CalendarDays className="h-3.5 w-3.5"/>{mode==='calendar'?`${calendar.months[date.month].name} ${yearText(calendar,date.year)}`:'Go to date'}</button>
        {mode==='axis'&&<><select aria-label="Timeline scale" className={`${timeField} !py-1 !text-xs`} value="" onChange={e=>changeViewport({span:Number(e.target.value)*day})}><option value="" disabled>Scale…</option><option value={1}>Day</option><option value={14}>Two weeks</option><option value={baseYearDays(calendar)}>Year</option><option value={baseYearDays(calendar)*10}>Decade</option><option value={baseYearDays(calendar)*100}>Century</option><option value={baseYearDays(calendar)*1e6}>Million years</option><option value={baseYearDays(calendar)*1e9}>Billion years</option></select><button aria-label="Zoom in timeline" className={timeButton} disabled={span<=60} onClick={()=>changeViewport({span:Math.max(60,Math.round(span/2))})}><ZoomIn className="h-4 w-4"/></button><button aria-label="Zoom out timeline" className={timeButton} disabled={span>=TIMELINE_MAX_SPAN} onClick={()=>changeViewport({span:Math.min(TIMELINE_MAX_SPAN,span*2)})}><ZoomOut className="h-4 w-4"/></button></>}
        <button className={timeButton} disabled={!rows.length} onClick={()=>changeViewport(mode==='calendar'?{center:firstEvent!.event.start}:fit)}><Maximize2 className="h-3.5 w-3.5"/>{mode==='calendar'?'First event':'Fit events'}</button>
      </div>}
      {mode==='axis'&&<TimelineAxis calendar={calendar} rows={rows} groups={groups} center={center} span={span} compact={prefs?.compact??false} onOpen={edit} selectedId={state.selectedNodeId??undefined} onPan={changeCenter}/>}
      {mode==='calendar'&&<TimelineCalendar selectedId={state.selectedNodeId??undefined} rows={rows} calendar={calendar} groups={groups} center={center} compact={prefs?.compact??false} onOpen={edit} onAdd={start=>setEditing({start})}/>}
      {mode==='chronicle'&&<TimelineCards calendar={calendar} rows={rows} groups={groups} compact={prefs?.compact??false} synopsis={prefs?.detail!=='titles'} selectedId={state.selectedNodeId??undefined} onEdit={edit} onAdd={()=>setEditing({start:scopeId?findNode(novel.sections[section],scopeId)?.event?.start??center:firstEvent?.event.start??center})}/>}
      {all.length>0&&!rows.length&&<div className="p-5 text-center text-xs text-muted-foreground">{hidden.length>0?<><p>No notes match these filters.</p><button className={`${timeButton} mt-2`} onClick={()=>setHiddenGroups([])}>Show all groups</button></>:<p>No dated notes in this period yet.</p>}</div>}
      {!all.length&&mode!=='chronicle' &&<div className="shrink-0 border-t border-white/10 p-4 text-center"><p className="text-sm">Place your story in time</p><p className="mt-1 text-xs text-muted-foreground">Add a dated event or assign dates to an existing note. Choose a note in the tree and set its dates in the right panel.</p>{selected&&<button className={`${timeButton} mt-3`} onClick={()=>setEditing({id:selected.node.id,start:center})}>Date “{selected.node.title}”</button>}</div>}
    </>}
    <div className="flex shrink-0 justify-center border-t border-border bg-background px-3 py-2"><div role="tablist" aria-label="Chronology view" className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1"><span aria-hidden="true" className="px-2 text-[11px] font-medium text-muted-foreground">Chronology</span>{([['axis','Timeline'],['calendar','Calendar'],['chronicle','Cards'],['outline','Outline']] as const).map(([key,label])=><button key={key} role="tab" aria-selected={mode===key} className={`${timeButton} ${mode===key?'border-amber-500/60 bg-amber-500/15 text-amber-300':''}`} onClick={()=>state.setTimeline({display:key})}>{label}</button>)}</div></div>
    {settings&&<CalendarSettings calendar={calendar} onClose={()=>setSettings(false)} onSave={c=>{state.setTimeline({calendar:c});setSettings(false);}}/>}
    {groupsOpen&&<TimelineGroups groups={groups} onClose={()=>setGroupsOpen(false)} onSave={g=>{preserveCalendarMonth();state.setTimeline({groups:g,hiddenGroups:hidden.filter(id=>!id||g.some(x=>x.id===id))});setGroupsOpen(false);}}/>}
    {editing&&<TimelineEventEditor key={editing.id||`new:${editing.start}`} novel={novel} calendar={calendar} current={current??undefined} start={editing.start} section={section} parentId={scopeId} onClose={()=>setEditing(null)} onSaved={value=>{changeCenter(value);}}/>}
    {jump&&<Dialog open onOpenChange={v=>{if(!v)setJump(null);}}><DialogContent className="border-white/15 bg-background sm:max-w-xl"><DialogHeader><DialogTitle>Go to date</DialogTitle><DialogDescription>Navigate using {calendar.name}.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={e=>{e.preventDefault();try{changeCenter(dateToMinute(calendar,jump));setJump(null);}catch(err){setJumpError(err instanceof Error?err.message:String(err));}}}><DateFields label="Go to" calendar={calendar} value={jump} onChange={setJump}/>{jumpError&&<p role="alert" className="text-red-400">{jumpError}</p>}<button className="rounded-md bg-amber-400 px-4 py-2 text-sm text-black">Go</button></form></DialogContent></Dialog>}
  </div>;
}
