'use client';
import {Plus,Hourglass,Zap} from 'lucide-react';
import {eventType,eventDuration,formatDate,type StoryCalendar,type TimelineGroup} from '@/lib/kachamak/story-calendar';
import {groupFor,type EventRow} from '@/lib/kachamak/timeline-data';
import {iconByName} from '@/lib/kachamak/icons';
import {validCoverImage} from '@/lib/kachamak/project-settings';
import {stripHtml} from '@/lib/kachamak/utils';
import {TimelineCardMenu} from './TimelineCardMenu';

export function TimelineCards({rows,calendar,groups,compact,synopsis,selectedId,onEdit,onAdd}:{rows:EventRow[];calendar:StoryCalendar;groups:TimelineGroup[];compact:boolean;synopsis:boolean;selectedId?:string;onEdit:(row:EventRow)=>void;onAdd:()=>void}) {
  return <div className="min-h-0 flex-1 overflow-auto px-3 py-6 sm:px-5 kachamak-scroll"><div className="mx-auto max-w-4xl">
    {rows.map(row=>{const period=eventType(row.event)==='period',Icon=iconByName(row.node.icon)??(period?Hourglass:Zap),group=groups.find(g=>g.id===groupFor(row.event,groups)),banner=row.event.cardStyle!=='color'&&row.event.banner&&validCoverImage(row.event.banner)?row.event.banner:undefined;
      const color=row.event.cardColor??group?.color??row.node.color??'#45494a',opacity=row.event.cardOpacity??(banner ? .2 : .6),detail=row.event.cardDetail??(synopsis?'synopsis':'title');
      const dates=formatDate(calendar,row.event.start,row.event.precision)+(period&&row.event.end!==undefined?' → '+formatDate(calendar,row.event.end,row.event.endPrecision??row.event.precision)+' ('+eventDuration(row.event,calendar)+')':'');
      const rgb=[1,3,5].map(n=>parseInt(color.slice(n,n+2),16)),light=!banner&&opacity>.7&&(rgb[0]*.299+rgb[1]*.587+rgb[2]*.114)>180;
      return <article key={row.node.id} className="grid grid-cols-[16px_minmax(0,1fr)] gap-x-3 sm:grid-cols-[minmax(90px,140px)_18px_minmax(0,1fr)]">
        <div className="hidden pt-1 text-right sm:block"><time className="block text-[11px] font-semibold leading-snug">{formatDate(calendar,row.event.start,row.event.precision)}</time><span className="mt-1 block text-[10px] text-muted-foreground">{period?'Time Period':'Event'}</span></div>
        <div className="relative flex justify-center"><div className="mb-3 mt-7 w-px bg-border"/><span className="absolute top-1.5 h-3.5 w-3.5 rotate-45 border bg-background" style={{borderColor:color,backgroundColor:group||row.event.cardColor?color+'77':undefined}}/></div>
        <TimelineCardMenu row={row} groups={groups} color={color} opacity={opacity} detail={detail} onEdit={()=>onEdit(row)}><button type="button" aria-label={`Edit event ${row.node.title}`} onClick={()=>onEdit(row)} className={`relative mb-3 flex w-full min-w-0 flex-col overflow-hidden rounded-xl border text-left shadow-sm outline-offset-2 hover:brightness-110 focus-visible:outline-2 ${banner?(compact?'min-h-24':'min-h-[134px]'):(compact?'min-h-12':'min-h-16')} ${light?'text-black':'text-white'} ${selectedId===row.node.id?'ring-2 ring-amber-400 ring-offset-2 ring-offset-background':''}`} style={{borderColor:color,backgroundColor:'#25282a'}}>
          {banner&&<img src={banner} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover"/>}<span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{backgroundColor:color,opacity}}/>{banner&&<span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-black/10"/>}
          {(group||row.path.length>0)&&<span className="relative z-10 mx-4 mt-3 text-[10px] opacity-80">{group?.name??row.path.at(-1)}</span>}
          <span className={`relative z-10 flex w-full min-w-0 gap-3 px-4 ${banner?'mt-auto items-end pb-3 pt-6':compact?'items-center py-2':'items-center py-3'} ${banner?'drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]':''}`}><Icon className={banner?"h-7 w-7 shrink-0":"h-4 w-4 shrink-0"}/><span className="min-w-0 flex-1"><span className="block break-words text-xs font-semibold leading-snug">{row.node.title}</span>{detail!=='title'&&<span className="mt-0.5 block text-[10px] leading-snug opacity-90">{dates}</span>}{detail==='synopsis'&&stripHtml(row.node.synopsis)&&<span className="mt-1 block line-clamp-2 text-[11px] leading-snug opacity-90">{stripHtml(row.node.synopsis)}</span>}</span></span>
        </button></TimelineCardMenu>
      </article>;
    })}
    <div className="grid grid-cols-[16px_minmax(0,1fr)] gap-x-3 sm:grid-cols-[minmax(90px,140px)_18px_minmax(0,1fr)]"><div className="hidden sm:block"/><div className="flex justify-center"><div className="h-full w-px bg-border"/></div><button type="button" onClick={onAdd} className="flex min-h-12 items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-4 text-left text-xs text-muted-foreground hover:border-amber-500/50 hover:bg-muted/40 hover:text-foreground"><Plus className="h-3.5 w-3.5"/>Add Event</button></div>
  </div></div>;
}
