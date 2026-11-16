'use client';
import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useKachamak } from '@/lib/kachamak/store';
import { openProjectNote } from '@/lib/kachamak/note-navigation';
import { readNovelCover } from '@/lib/kachamak/project-settings';
import { groupFor } from '@/lib/kachamak/timeline-data';
import { flattenNotes } from '@/lib/kachamak/note-links';
import { eventType, minutesPerDay, absoluteYear, eraYear, dateToMinute, minuteToDate, monthDays, type StoryCalendar, type StoryDate, type StoryEvent } from '@/lib/kachamak/story-calendar';
import type { NoteNode, Novel, SectionKey } from '@/lib/kachamak/types';
import { timeButton, timeField } from './CalendarSettings';

export function DateFields({label,calendar:c,value:d,onChange,time=false}:{label:string;calendar:StoryCalendar;value:StoryDate;onChange:(d:StoryDate)=>void;time?:boolean}) {
  const era=eraYear(c,d.year);
  const change=(patch:Partial<StoryDate>)=>{const next={...d,...patch};next.day=Math.min(next.day,monthDays(c,next.year,next.month));onChange(next);};
  return <fieldset className="space-y-2"><legend className="mb-2 text-xs font-medium text-muted-foreground">{label}</legend><div className="grid grid-cols-[5rem_1fr_6rem_5rem] gap-2">
    <input aria-label={`${label} day`} className={timeField} type="number" min={1} max={monthDays(c,d.year,d.month)} value={d.day} onChange={e=>change({day:Number(e.target.value)})}/>
    <select aria-label={`${label} month`} className={timeField} value={d.month} onChange={e=>change({month:Number(e.target.value)})}>{c.months.map((m,i)=><option key={i} value={i}>{m.name}</option>)}</select>
    <input aria-label={`${label} year`} className={timeField} type="number" min={c.yearZero?0:1} max={2e12} value={era.year} onChange={e=>change({year:absoluteYear(c,Math.max(c.yearZero?0:1,Number(e.target.value)),era.key)})}/>
    <select aria-label={`${label} era`} className={timeField} value={era.key} onChange={e=>change({year:absoluteYear(c,era.year,e.target.value)})}><option value="before">{c.beforeEraName}</option><option value="after">{c.eraName}</option>{c.eras?.map(e=><option key={e.id} value={e.id}>{e.abbreviation}</option>)}</select>
  </div>{time&&<div className="flex items-center gap-2"><input aria-label={`${label} hour`} className={`${timeField} w-20`} type="number" min={0} max={c.hoursPerDay-1} value={d.hour} onChange={e=>change({hour:Number(e.target.value)})}/><span>:</span><input aria-label={`${label} minute`} className={`${timeField} w-20`} type="number" min={0} max={c.minutesPerHour-1} value={d.minute} onChange={e=>change({minute:Number(e.target.value)})}/><span className="text-xs text-muted-foreground">{c.hoursPerDay}-hour day</span></div>}</fieldset>;
}
export function TimelineEventEditor({novel,calendar,current,start=0,section,parentId,onClose,onSaved}:{novel:Novel;calendar:StoryCalendar;current?:{node:NoteNode;section:SectionKey};start?:number;section:SectionKey;parentId?:string;onClose:()=>void;onSaved:(value:number)=>void}) {
  const [target,setTarget]=useState(current?.node.id||'');
  const [title,setTitle]=useState(current?.node.title||'');
  const [query,setQuery]=useState('');
  const [from,setFrom]=useState(()=>minuteToDate(calendar,current?.node.event?.start??start));
  const [to,setTo]=useState(()=>minuteToDate(calendar,current?.node.event?.end??Math.min(1e12,(current?.node.event?.start??start)+minutesPerDay(calendar))));
  const [kind,setKind]=useState<'event'|'period'>(current?.node.event?eventType(current.node.event):'event');
  const hasEnd=kind==='period';
  const [time,setTime]=useState(current?.node.event?.precision==='time');
  const [group,setGroup]=useState(current?.node.event?groupFor(current.node.event,novel.timeline?.groups??[]):'');
  const [error,setError]=useState('');
  const [banner,setBanner]=useState<string|undefined>(current?.node.event?.banner);
  const [loadingBanner,setLoadingBanner]=useState(false);
  const bannerRequest=useRef(0);
  useEffect(()=>()=>{bannerRequest.current++;},[]);
  const uploadBanner=async(file:File)=>{
    const request=++bannerRequest.current;setLoadingBanner(true);setError('');
    try{const image=await readNovelCover(file);if(request===bannerRequest.current)setBanner(image);}
    catch(error){if(request===bannerRequest.current)setError(error instanceof Error?error.message:'The banner could not be read.');}
    finally{if(request===bannerRequest.current)setLoadingBanner(false);}
  };

  const rows=flattenNotes(novel),chosen=rows.find(r=>r.node.id===target);
  const choose=(id:string)=>{const row=rows.find(r=>r.node.id===id);bannerRequest.current++;setLoadingBanner(false);setBanner(row?.node.event?.banner);setKind(row?.node.event?eventType(row.node.event):'event');setTarget(id);setTitle(row?.node.title||'');setQuery('');if(row?.node.event){setFrom(minuteToDate(calendar,row.node.event.start));setTo(minuteToDate(calendar,row.node.event.end??row.node.event.start+minutesPerDay(calendar)));setKind(eventType(row.node.event));setTime(row.node.event.precision==='time');setGroup(groupFor(row.node.event,novel.timeline?.groups??[]));}};
  const save=()=>{
    if(loadingBanner)return;
    setError('');if(!title.trim()){setError('Give this event a title.');return;}
    try {
      const start=dateToMinute(calendar,time?from:{...from,hour:0,minute:0}),end=hasEnd?dateToMinute(calendar,time?to:{...to,hour:0,minute:0}):undefined;
      if(end!==undefined&&end<=start)throw new Error('A Time Period must end after its start.');
      if(calendar.range&&(start<calendar.range.start||(end??start)>calendar.range.end))throw new Error('Choose dates within the earliest and latest dates in Time System.');
      const event:StoryEvent={...(chosen?.node.event??{}),type:kind,start,...(end!==undefined?{end}:{}),groupId:group,precision:time?'time':'day',...(banner?{banner}:{})};
      if(end===undefined)delete event.end;if(!banner)delete event.banner;
      const state=useKachamak.getState();
      if(state.activeNovelId!==novel.id)throw new Error('The active book changed. Reopen the event.');
      const live=state.novels.find(n=>n.id===novel.id)!;
      const row=target?flattenNotes(live).find(r=>r.node.id===target):null;
      if(target&&!row)throw new Error('This note is no longer available.');
      const id=row?.node.id||state.addNode(section,parentId??null,'doc',title.trim());
      if(!id)throw new Error('The note could not be created.');
      state.updateNode(row?.section??section,id,{title:title.trim(),event});state.setRenamingNode(null);state.select(id);onSaved(start);onClose();
    }catch(e){setError(e instanceof Error?e.message:String(e));}
  };
  return <Dialog open onOpenChange={v=>{if(!v)onClose();}}><DialogContent className="max-h-[90vh] overflow-auto border-white/15 bg-background sm:max-w-xl"><DialogHeader><DialogTitle>{current?'Edit event':'Add event'}</DialogTitle><DialogDescription>Event marks a moment. Time Period spans a start and end. Both stay linked to the same note.</DialogDescription></DialogHeader>
    <form onSubmit={e=>{e.preventDefault();save();}} className="space-y-4">
      {!current&&<div className="space-y-2"><div className="flex gap-2"><button type="button" className={timeButton} onClick={()=>choose('')}>New note</button><span className="self-center text-xs text-muted-foreground">or date an existing note</span></div><input aria-label="Find an existing note" className={`${timeField} w-full`} placeholder="Search notes…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<div className="max-h-36 overflow-auto rounded-md border border-white/10">{rows.filter(r=>r.node.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0,30).map(r=><button key={r.node.id} type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-white/10" onClick={()=>choose(r.node.id)}>{r.node.title}<span className="ml-2 text-xs text-muted-foreground">{r.section}{r.node.event?' · already dated':''}</span></button>)}</div>}</div>}
      {chosen&&<div className="flex items-center gap-2"><p className="min-w-0 flex-1 text-xs text-muted-foreground">Linked note: {chosen.section} / {[...chosen.path,chosen.node.title].join(' / ')}</p><button type="button" className={timeButton} onClick={()=>{onClose();openProjectNote(chosen.node.id);}}>Open note</button></div>}
      <label className="grid gap-1 text-xs text-muted-foreground">Event title<input className={timeField} required maxLength={500} value={title} onChange={e=>setTitle(e.target.value)}/></label>
      <DateFields label="Start" calendar={calendar} value={from} onChange={setFrom} time={time}/>
      <div className="flex items-end gap-5"><label className="grid flex-1 gap-1 text-xs text-muted-foreground">Type<select aria-label="Timeline item type" className={timeField} value={kind} onChange={e=>{const next=e.target.value as 'event'|'period';setKind(next);if(next==='period'){try{if(dateToMinute(calendar,to)<=dateToMinute(calendar,from))setTo(minuteToDate(calendar,Math.min(1e12,dateToMinute(calendar,from)+minutesPerDay(calendar))));}catch{setError('Choose a valid start date.');}}}}><option value="event">Event</option><option value="period">Time Period</option></select></label><label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={time} onChange={e=>setTime(e.target.checked)}/>Include time</label></div>

      {hasEnd&&<DateFields label="End" calendar={calendar} value={to} onChange={setTo} time={time}/>}
      <label className="grid gap-1 text-xs text-muted-foreground">Group<select className={timeField} value={group} onChange={e=>setGroup(e.target.value)}><option value="">Ungrouped</option>{novel.timeline?.groups?.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
      <section className="space-y-2" aria-label="Event banner"><h3 className="text-xs font-medium text-muted-foreground">Banner</h3>{banner&&<img src={banner} alt="Event banner preview" className="aspect-[5/2] w-full rounded-md object-cover"/>}<div className="flex items-center gap-3"><label className={`${timeButton} cursor-pointer`}>{banner?'Change banner':'Upload banner'}<input aria-label="Upload event banner" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void uploadBanner(file);}}/></label>{banner&&<button type="button" className={timeButton} onClick={()=>{bannerRequest.current++;setLoadingBanner(false);setBanner(undefined);}}>Remove banner</button>}{loadingBanner&&<span role="status" className="text-xs text-muted-foreground">Preparing banner…</span>}</div><p className="text-xs text-muted-foreground">JPG, PNG or WebP · up to 10 MB. Shown on the event card.</p></section>
      {error&&<p role="alert" className="text-sm text-red-400">{error}</p>}
      <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">{current?.node.event?<button type="button" className="text-xs text-red-400" onClick={()=>{useKachamak.getState().updateNode(current.section,current.node.id,{event:undefined});onClose();}}>Remove date · keep note</button>:<span/>}<button disabled={loadingBanner} className="rounded-md bg-amber-400 px-4 py-2 text-sm font-medium text-black disabled:opacity-40">{kind==='period'?'Save period':'Save event'}</button></div>
    </form>
  </DialogContent></Dialog>;
}
