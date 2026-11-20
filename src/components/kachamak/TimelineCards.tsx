'use client';
import {Plus,Hourglass,Zap} from 'lucide-react';
import {eventType,eventDuration,formatDate,type StoryCalendar,type TimelineGroup} from '@/lib/kachamak/story-calendar';
import {groupFor,type EventRow} from '@/lib/kachamak/timeline-data';
import {iconByName} from '@/lib/kachamak/icons';
import {validCoverImage} from '@/lib/kachamak/project-settings';
import {stripHtml} from '@/lib/kachamak/utils';
import {TimelineCardMenu} from './TimelineCardMenu';

export function TimelineCards({rows,calendar,groups,compact,synopsis,selectedId,onEdit,onAdd}:{rows:EventRow[];calendar:StoryCalendar;groups:TimelineGroup[];compact:boolean;synopsis:boolean;selectedId?:string;onEdit:(row:EventRow)=>void;onAdd:()=>void}) {
  const cardCalendar=calendar.dateFormat ? calendar : {...calendar,dateFormat:'MMMM D^, YYYY E'};
  return <div className="min-h-0 flex-1 overflow-auto px-3 py-6 sm:px-5 kachamak-scroll"><div className="mx-auto max-w-[54rem]">
    {rows.map(row=>{const period=eventType(row.event)==='period',Icon=iconByName(row.node.icon)??(period?Hourglass:Zap),group=groups.find(g=>g.id===groupFor(row.event,groups)),banner=row.event.cardStyle!=='color'&&row.event.banner&&validCoverImage(row.event.banner)?row.event.banner:undefined;
      const color=row.event.cardColor??group?.color??row.node.color??'#45494a',opacity=row.event.cardOpacity??(banner ? .2 : .6),detail=row.event.cardDetail??(synopsis?'synopsis':'title');
      const startDate=formatDate(cardCalendar,row.event.start,row.event.precision);
      const duration=eventDuration(row.event,calendar);
      const dates=period&&row.event.end!==undefined
        ? startDate+' → '+formatDate(cardCalendar,row.event.end,row.event.endPrecision??row.event.precision)+(duration?' ('+duration+')':'')
        : startDate;
      const rgb=[1,3,5].map(n=>parseInt(color.slice(n,n+2),16)),light=!banner&&opacity>.7&&(rgb[0]*.299+rgb[1]*.587+rgb[2]*.114)>180;
      const iconSize=compact?'[--card-icon-size:1.75rem]':banner?'[--card-icon-size:2.5rem] sm:[--card-icon-size:3rem]':'[--card-icon-size:2.25rem]';
      return <article key={row.node.id} className="grid grid-cols-[16px_minmax(0,1fr)] gap-x-3 sm:grid-cols-[minmax(90px,140px)_18px_minmax(0,1fr)]">
        <div className="hidden pt-1 text-right sm:block"><time className="block break-words text-xs font-semibold leading-snug">{formatDate(calendar,row.event.start,row.event.precision)}</time></div>
        <div className="relative flex justify-center"><div className="mb-3 mt-7 w-px bg-border"/><span className="absolute top-1.5 h-3.5 w-3.5 rotate-45 border bg-background" style={{borderColor:color,backgroundColor:group||row.event.cardColor?color+'77':undefined}}/></div>
        <TimelineCardMenu row={row} color={color} opacity={opacity} detail={detail} onEdit={()=>onEdit(row)}><button type="button" aria-label={`Edit event ${row.node.title}`} onClick={()=>onEdit(row)} className={`relative mb-3 flex w-full min-w-0 flex-col overflow-hidden rounded-xl border text-left shadow-sm outline-offset-2 hover:brightness-110 focus-visible:outline-2 ${iconSize} min-h-[calc(3*var(--card-icon-size))] ${light?'text-black':'text-white'} ${selectedId===row.node.id?'ring-2 ring-amber-400 ring-offset-2 ring-offset-background':''}`} style={{borderColor:color,backgroundColor:'#25282a'}}>
          {banner&&<img src={banner} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover"/>}<span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{backgroundColor:color,opacity}}/>{banner&&<span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-black/10"/>}
          <span className={`relative z-10 mt-auto flex w-full min-w-0 items-center gap-3 px-4 ${compact?'py-2':'py-3'} ${banner?'drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]':''}`}><Icon aria-hidden="true" className="size-[var(--card-icon-size)] shrink-0"/><span className="min-w-0 flex-1"><span className="block break-words text-xs font-semibold leading-snug" style={row.node.color ? {color:row.node.color,WebkitTextStroke:"2px var(--background)",paintOrder:"stroke fill"} : undefined}>{row.node.title}</span>{detail!=='title'&&<span className="mt-0.5 block break-words text-xs leading-snug opacity-95">{dates}</span>}{detail==='synopsis'&&stripHtml(row.node.synopsis)&&<span className="mt-1 block line-clamp-2 text-[11px] leading-snug opacity-90">{stripHtml(row.node.synopsis)}</span>}</span></span>
        </button></TimelineCardMenu>
      </article>;
    })}
    <div className="grid grid-cols-[16px_minmax(0,1fr)] gap-x-3 sm:grid-cols-[minmax(90px,140px)_18px_minmax(0,1fr)]"><div className="hidden sm:block"/><div className="flex justify-center"><div className="h-full w-px bg-border"/></div><button type="button" onClick={onAdd} className="flex min-h-12 items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-4 text-left text-xs text-muted-foreground hover:border-amber-500/50 hover:bg-muted/40 hover:text-foreground"><Plus className="h-3.5 w-3.5"/>Add Event</button></div>
  </div></div>;
}
