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
import {CalendarDays,CalendarRange,Diamond,ChevronDown,Image as ImageIcon,Palette,Plus,X,Search} from 'lucide-react';
import {Popover,PopoverTrigger,PopoverContent} from '@/components/ui/popover';
import {NOTE_ICONS,iconByName} from '@/lib/kachamak/icons';
import {formatDate,yearText} from '@/lib/kachamak/story-calendar';
import { timeButton, timeField } from './CalendarSettings';

export function DateFields({label,calendar:c,value:d,onChange,time=false}:{label:string;calendar:StoryCalendar;value:StoryDate;onChange:(d:StoryDate)=>void;time?:boolean}) {
  const era=eraYear(c,d.year);
  const change=(patch:Partial<StoryDate>)=>{const next={...d,...patch};next.day=Math.min(next.day,monthDays(c,next.year,next.month));onChange(next);};
  return <fieldset className="space-y-2"><legend className="mb-2 text-xs font-medium text-muted-foreground">{label}</legend><div className="grid grid-cols-[3.25rem_minmax(0,1fr)_4rem_4rem] gap-1.5">
    <input aria-label={`${label} day`} className={timeField} type="number" min={1} max={monthDays(c,d.year,d.month)} value={d.day} onChange={e=>change({day:Number(e.target.value)})}/>
    <select aria-label={`${label} month`} className={timeField} value={d.month} onChange={e=>change({month:Number(e.target.value)})}>{c.months.map((m,i)=><option key={i} value={i}>{m.name}</option>)}</select>
    <input aria-label={`${label} year`} className={timeField} type="number" min={c.yearZero?0:1} max={2e12} value={era.year} onChange={e=>change({year:absoluteYear(c,Math.max(c.yearZero?0:1,Number(e.target.value)),era.key)})}/>
    <select aria-label={`${label} era`} className={timeField} value={era.key} onChange={e=>change({year:absoluteYear(c,era.year,e.target.value)})}><option value="before">{c.beforeEraName}</option><option value="after">{c.eraName}</option>{c.eras?.map(e=><option key={e.id} value={e.id}>{e.abbreviation}</option>)}</select>
  </div>{time&&<div className="flex items-center gap-2"><input aria-label={`${label} hour`} className={`${timeField} w-20`} type="number" min={0} max={c.hoursPerDay-1} value={d.hour} onChange={e=>change({hour:Number(e.target.value)})}/><span>:</span><input aria-label={`${label} minute`} className={`${timeField} w-20`} type="number" min={0} max={c.minutesPerHour-1} value={d.minute} onChange={e=>change({minute:Number(e.target.value)})}/><span className="text-xs text-muted-foreground">{c.hoursPerDay}-hour day</span></div>}</fieldset>;
}
function DateButton({label,calendar,value,optional=false,time,onChange,onClear}:{label:string;calendar:StoryCalendar;value:StoryDate;optional?:boolean;time:boolean;onChange:(value:StoryDate,time:boolean)=>void;onClear?:()=>void}) {
  const [open,setOpen]=useState(false),[draft,setDraft]=useState(value),[clock,setClock]=useState(time);
  let text='Pick a date (optional)';
  try{text=optional?text:!time&&value.month===0&&value.day===1?yearText(calendar,value.year):formatDate(calendar,dateToMinute(calendar,value),time?'time':'day');}catch{text='Choose a valid date';}
  const apply=()=>{onChange(clock?draft:{...draft,hour:0,minute:0},clock);setOpen(false);};
  return <Popover open={open} onOpenChange={valueOpen=>{if(valueOpen){setDraft(value);setClock(time);}setOpen(valueOpen);}}><PopoverTrigger asChild><button type="button" aria-label={`${label} date`} className={`flex h-8 w-full min-w-0 items-center gap-2 rounded border border-white/10 bg-black/10 px-2 text-left text-[11px] ${optional?'text-muted-foreground':''}`}><CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground"/><span className="truncate">{text}</span></button></PopoverTrigger><PopoverContent align="end" className="w-[min(320px,calc(100vw-24px))] space-y-3 font-sans" onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();e.stopPropagation();apply();}}}><DateFields label={label} calendar={calendar} value={draft} onChange={setDraft} time={clock}/><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={clock} onChange={e=>setClock(e.target.checked)}/>Include time</label><div className="flex items-center justify-between">{onClear?<button type="button" className="text-xs text-muted-foreground" onClick={()=>{onClear();setOpen(false);}}>Clear end date</button>:<span/>}<button type="button" className={timeButton} onClick={apply}>Apply date</button></div></PopoverContent></Popover>;
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
  const [icon,setIcon]=useState(current?.node.icon??'');
  const [links,setLinks]=useState<string[]>(current?.node.links??[]);
  const [linkQuery,setLinkQuery]=useState('');
  const [iconOpen,setIconOpen]=useState(false),[linkOpen,setLinkOpen]=useState(false);
  const [style,setStyle]=useState<'image'|'color'>(current?.node.event?.cardStyle??(current?.node.event?.banner?'image':'color'));
  const [cardColor,setCardColor]=useState<string|undefined>(current?.node.event?.cardColor);
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
  const choose=(id:string)=>{const row=rows.find(r=>r.node.id===id);bannerRequest.current++;setLoadingBanner(false);setIcon(row?.node.icon??'');setLinks(row?.node.links??[]);setStyle(row?.node.event?.cardStyle??(row?.node.event?.banner?'image':'color'));setCardColor(row?.node.event?.cardColor);setBanner(row?.node.event?.banner);setKind(row?.node.event?eventType(row.node.event):'event');setTarget(id);setTitle(row?.node.title||'');setQuery('');if(row?.node.event){setFrom(minuteToDate(calendar,row.node.event.start));setTo(minuteToDate(calendar,row.node.event.end??row.node.event.start+minutesPerDay(calendar)));setKind(eventType(row.node.event));setTime(row.node.event.precision==='time');setGroup(groupFor(row.node.event,novel.timeline?.groups??[]));}};
  const save=()=>{
    if(loadingBanner)return;
    setError('');if(!title.trim()){setError('Give this event a title.');return;}
    try {
      const start=dateToMinute(calendar,time?from:{...from,hour:0,minute:0}),end=hasEnd?dateToMinute(calendar,time?to:{...to,hour:0,minute:0}):undefined;
      if(style==='image'&&!banner)throw new Error('Choose an image for the Image style.');
      if(end!==undefined&&end<=start)throw new Error('A Time Period must end after its start.');
      if(calendar.range&&(start<calendar.range.start||(end??start)>calendar.range.end))throw new Error('Choose dates within the earliest and latest dates in Time System.');
      const event:StoryEvent={...(chosen?.node.event??{}),type:kind,cardStyle:style,...(cardColor?{cardColor}:{}),start,...(end!==undefined?{end}:{}),groupId:group,precision:time?'time':'day',...(banner?{banner}:{})};
      if(end===undefined)delete event.end;if(!banner)delete event.banner;
      const state=useKachamak.getState();
      if(state.activeNovelId!==novel.id)throw new Error('The active book changed. Reopen the event.');
      const live=state.novels.find(n=>n.id===novel.id)!;
      const row=target?flattenNotes(live).find(r=>r.node.id===target):null;
      if(target&&!row)throw new Error('This note is no longer available.');
      const id=row?.node.id||state.addNode(section,parentId??null,'doc',title.trim());
      if(!id)throw new Error('The note could not be created.');
      state.updateNode(row?.section??section,id,{title:title.trim(),event,icon:icon||undefined,links:[...new Set(links.filter(link=>link!==id))]});state.setRenamingNode(null);state.select(id);onSaved(start);onClose();
    }catch(e){setError(e instanceof Error?e.message:String(e));}
  };
  const selectedGroup=novel.timeline?.groups?.find(value=>value.id===group),color=cardColor??selectedGroup?.color??chosen?.node.color??'#a57435';
  const Icon=iconByName(icon)??(hasEnd?CalendarRange:Diamond);
  let dateText='Choose a date';try{dateText=!time&&from.month===0&&from.day===1?yearText(calendar,from.year):formatDate(calendar,dateToMinute(calendar,from),time?'time':'day');}catch{/* Show validation on Update. */}
  return <Dialog open onOpenChange={value=>{if(!value)onClose();}}><DialogContent className="max-h-[90dvh] max-w-[calc(100vw-24px)] gap-3 overflow-y-auto rounded-xl border-2 border-[#536359] bg-[#202222] p-4 font-sans sm:max-w-[328px]">
    <DialogHeader className="gap-0 text-left"><DialogTitle className="text-sm">{current?'Edit event':'Add event'}</DialogTitle><DialogDescription className="sr-only">Set the event title, dates, appearance and linked notes. An end date makes this a Time Period.</DialogDescription><label className="sr-only" htmlFor="event-group">Event group</label><select id="event-group" aria-label="Event group" value={group} onChange={e=>setGroup(e.target.value)} className="mt-1 max-w-[90%] self-start border-0 bg-transparent pr-4 text-[10px] text-muted-foreground outline-none"><option value="">Ungrouped</option>{novel.timeline?.groups?.map(value=><option key={value.id} value={value.id}>{value.name}</option>)}</select></DialogHeader>
    <div aria-label="Event preview" className="relative flex min-h-[76px] items-center overflow-hidden rounded bg-cover bg-center px-3" style={{backgroundImage:style==='image'&&banner?`linear-gradient(#202222b3,#202222b3),url("${banner}")`:'linear-gradient(to right,#ffffff08 1px,transparent 1px)',backgroundSize:style==='image'&&banner?'cover':'44px 100%'}}><span className="mr-2 h-9 w-[3px] shrink-0 rounded" style={{backgroundColor:color}}/><Icon className="mr-2 h-4 w-4 shrink-0 text-white"/><span className="min-w-0"><span className="block truncate text-[11px] font-semibold text-white">{title||'Untitled event'}</span><span className="block text-[9px] text-white/70">{dateText}{hasEnd?' · Time Period':''}</span></span></div>
    <form className="space-y-3" onSubmit={e=>{e.preventDefault();save();}} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();save();}}}>
      {!current&&<details className="text-[10px] text-muted-foreground"><summary className="cursor-pointer">Use an existing note</summary><input aria-label="Find an existing note" className={`${timeField} mt-2 w-full`} placeholder="Search notes…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<div className="mt-1 max-h-28 overflow-auto">{rows.filter(row=>row.node.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0,30).map(row=><button key={row.node.id} type="button" className="block w-full rounded p-2 text-left text-xs hover:bg-white/5" onClick={()=>choose(row.node.id)}>{row.node.title}</button>)}</div>}</details>}
      <div className="flex gap-1"><Popover open={iconOpen} onOpenChange={setIconOpen}><PopoverTrigger asChild><button type="button" aria-label="Event icon" className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/10"><Icon className="h-4 w-4"/></button></PopoverTrigger><PopoverContent align="start" className="max-h-60 w-64 overflow-auto font-sans"><div className="grid grid-cols-6 gap-1">{NOTE_ICONS.map(value=><button key={value.key} type="button" title={value.label} aria-label={`Choose icon ${value.label}`} className="rounded p-2 hover:bg-accent" onClick={()=>{setIcon(value.key);setIconOpen(false);}}><value.Cmp className="h-4 w-4"/></button>)}</div></PopoverContent></Popover><input aria-label="Event title" required maxLength={500} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Event title" className="h-8 min-w-0 flex-1 rounded border border-white/10 bg-black/10 px-2 text-[11px] outline-none focus:border-white/40"/></div>
      <div className="grid grid-cols-[86px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-[11px]">
        <span className="font-semibold">Start</span><DateButton label="Start" calendar={calendar} value={from} time={time} onChange={(value,clock)=>{setFrom(value);setTime(clock);}}/>
        <span className="font-semibold">End</span><DateButton label="End" calendar={calendar} value={to} optional={!hasEnd} time={time} onChange={(value,clock)=>{setTo(value);setKind('period');setTime(clock);}} onClear={()=>setKind('event')}/>
        <span className="font-semibold">Style</span><Popover><PopoverTrigger asChild><button type="button" aria-label="Event style" className="flex h-8 items-center gap-2 rounded border border-white/10 bg-black/10 px-2">{style==='image'?<ImageIcon className="h-3.5 w-3.5"/>:<Palette className="h-3.5 w-3.5"/>}{style==='image'?'Image':'Color'}<ChevronDown className="ml-auto h-3 w-3 text-muted-foreground"/></button></PopoverTrigger><PopoverContent align="end" className="w-60 space-y-3 font-sans"><div className="flex gap-2">{(['image','color'] as const).map(value=><button type="button" key={value} aria-pressed={style===value} className={`${timeButton} aria-pressed:bg-accent`} onClick={()=>setStyle(value)}>{value==='image'?'Image':'Color'}</button>)}</div>{style==='image'?<><label className={`${timeButton} cursor-pointer`}>{banner?'Change image':'Upload image'}<input type="file" aria-label="Upload event banner" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void uploadBanner(file);}}/></label>{banner&&<img src={banner} alt="Event image preview" className="h-20 w-full rounded object-cover"/>}{loadingBanner&&<p role="status" className="text-xs">Preparing image…</p>}</>:<label className="flex items-center justify-between text-xs">Card color<input type="color" aria-label="Event card color" value={color} onChange={e=>setCardColor(e.target.value)}/></label>}</PopoverContent></Popover>
        <span className="font-semibold">Link</span><Popover open={linkOpen} onOpenChange={setLinkOpen}><PopoverTrigger asChild><button type="button" aria-label="Link a note to event" className="flex h-8 items-center gap-2 rounded border border-white/10 bg-black/10 px-2 text-muted-foreground"><Plus className="h-3.5 w-3.5"/>Add{links.length>0&&<span className="ml-auto text-[10px]">{links.length}</span>}</button></PopoverTrigger><PopoverContent align="end" className="w-64 space-y-2 font-sans"><label className="flex items-center gap-2"><Search className="h-3.5 w-3.5"/><input aria-label="Search linked notes" value={linkQuery} onChange={e=>setLinkQuery(e.target.value)} placeholder="Search notes…" className="min-w-0 flex-1 bg-transparent text-xs outline-none"/></label><div className="max-h-48 overflow-auto">{rows.filter(row=>row.node.id!==target&&!links.includes(row.node.id)&&row.node.title.toLocaleLowerCase().includes(linkQuery.toLocaleLowerCase())).slice(0,50).map(row=><button type="button" key={row.node.id} className="block w-full rounded p-2 text-left text-xs hover:bg-accent" onClick={()=>{setLinks([...links,row.node.id]);setLinkOpen(false);setLinkQuery('');}}>{row.node.title}</button>)}</div></PopoverContent></Popover>
      </div>
      {links.length>0&&<ul className="space-y-1 pl-[99px]">{links.map(id=><li key={id} className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="min-w-0 flex-1 truncate">{rows.find(row=>row.node.id===id)?.node.title??'Unavailable note'}</span><button type="button" aria-label={`Remove event link ${rows.find(row=>row.node.id===id)?.node.title??id}`} onClick={()=>setLinks(links.filter(link=>link!==id))}><X className="h-3 w-3"/></button></li>)}</ul>}
      {error&&<p role="alert" className="text-xs text-red-400">{error}</p>}
      <button type="submit" disabled={loadingBanner} className="mt-1 flex h-8 w-full items-center justify-center gap-2 rounded bg-[#e4e4e7] text-[11px] font-medium text-black hover:bg-white disabled:opacity-50">{current?'Update event':'Create event'}<span className="text-[10px] text-black/45">Ctrl + ↵</span></button>
    </form>
  </DialogContent></Dialog>;
}
