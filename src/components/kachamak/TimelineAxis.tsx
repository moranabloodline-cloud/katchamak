'use client';
import {useEffect,useRef,useState} from 'react';
import {TIMELINE_LIMIT,TIMELINE_MAX_SPAN,eventType,formatDate,type StoryCalendar,type TimelineGroup} from '@/lib/kachamak/story-calendar';
import {groupFor,type EventRow} from '@/lib/kachamak/timeline-data';
import {timelineAxisRows,timelineGeometry,timelineOutsideParent,timelineParent,timelineTicks} from '@/lib/kachamak/timeline-layout';
import {iconByName} from '@/lib/kachamak/icons';
import {Hourglass,Zap,TriangleAlert,ChevronLeft,ChevronRight} from 'lucide-react';
interface Props {calendar:StoryCalendar;rows:EventRow[];groups:TimelineGroup[];center:number;span:number;compact:boolean;onPan:(center:number)=>void;onZoom:(viewport:{center:number;span:number})=>void;onOpen:(r:EventRow)=>void;selectedId?:string}
type Drag={x:number;width:number;delta:number};
export function TimelineAxis({calendar,rows,groups,center,span,compact,onPan,onZoom,onOpen,selectedId}:Props) {
  const chartRef=useRef<HTMLDivElement>(null),scaleRef=useRef<HTMLDivElement>(null);
  const gesture=useRef<Drag|null>(null),[drag,setDrag]=useState<Drag|null>(null);
  useEffect(()=>{
    const chart=chartRef.current;
    if(!chart)return;
    const wheel=(event:WheelEvent)=>{
      if(!event.ctrlKey)return;
      event.preventDefault();
      event.stopPropagation();
      if(!event.deltaY||gesture.current)return;
      const unit=event.deltaMode===1?16:event.deltaMode===2?Math.max(chart.clientHeight,1):1;
      const step=Math.max(-1,Math.min(1,event.deltaY*unit/300));
      const nextSpan=Math.max(Math.min(60,span),Math.min(TIMELINE_MAX_SPAN,Math.round(span*2**step)));
      if(nextSpan===span)return;
      const scale=scaleRef.current?.getBoundingClientRect();
      const anchor=scale?.width&&event.clientX>=scale.left&&event.clientX<=scale.right
        ? (event.clientX-scale.left)/scale.width : 0.5;
      onZoom({center:center+(anchor-0.5)*(span-nextSpan),span:nextSpan});
    };
    chart.addEventListener('wheel',wheel,{passive:false});
    return ()=>chart.removeEventListener('wheel',wheel);
  },[center,span,onZoom]);
  const left=center-span/2-(drag?.delta??0);
  const begin=(e:React.PointerEvent)=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);const value={x:e.clientX,width:e.currentTarget.getBoundingClientRect().width,delta:0};gesture.current=value;setDrag(value);};
  const move=(e:React.PointerEvent)=>{const g=gesture.current;if(!g)return;const delta=Math.round((e.clientX-g.x)/Math.max(1,g.width)*span);const next={...g,delta:Math.max(center-TIMELINE_LIMIT,Math.min(center+TIMELINE_LIMIT,delta))};gesture.current=next;setDrag(next);};
  const end=()=>{const g=gesture.current;gesture.current=null;setDrag(null);if(g)onPan(Math.round(center-g.delta));};
  const cancel=()=>{gesture.current=null;setDrag(null);};
  const ticks=timelineTicks(calendar,left,span);
  const ordered=timelineAxisRows(rows),visible=rows.filter(row=>timelineGeometry(row.event,left,span));
  const grid={gridTemplateColumns:'minmax(180px,240px) minmax(360px,1fr)'};
  return <div ref={chartRef} className="min-h-0 flex-1 overflow-auto kachamak-scroll" aria-label="Timeline chart">
    <div className="min-w-[600px]">
      <div className="sticky top-0 z-20 grid border-b border-border bg-background" style={grid}>
        <div className="sticky left-0 z-10 flex h-12 items-center border-r border-border bg-background px-4 text-xs text-muted-foreground">Events &amp; time periods</div>
        <div ref={scaleRef} className="relative h-12 overflow-hidden" aria-label="Timeline date scale">{ticks.map(tick=><div key={tick.value} className="absolute bottom-0 h-8 truncate border-l border-border pl-2 text-[11px] font-medium text-foreground/80" title={tick.label} style={{left:`${(tick.value-left)/span*100}%`,maxWidth:'24%'}}>{tick.label}</div>)}</div>
      </div>
      {ordered.map(({row,depth})=>{const period=eventType(row.event)==='period',geometry=timelineGeometry(row.event,left,span),parent=timelineParent(row),parentGeometry=parent?.event?timelineGeometry(parent.event,left,span):null,outside=timelineOutsideParent(row),group=groups.find(g=>g.id===groupFor(row.event,groups)),color=row.node.color||group?.color||'#d6a64a',Icon=iconByName(row.node.icon)??(period?Hourglass:Zap),dates=formatDate(calendar,row.event.start,row.event.precision)+(row.event.end!==undefined?' – '+formatDate(calendar,row.event.end,row.event.endPrecision??row.event.precision):''),label=`Open ${period?'time period':'event'} ${row.node.title}`;
        return <div key={row.node.id} data-timeline-row={row.node.id} className={`grid border-b border-border/50 ${selectedId===row.node.id?'bg-amber-400/[.07]':period?'bg-muted/20':''}`} style={grid}>
          <button type="button" aria-label={label} aria-current={selectedId===row.node.id?'true':undefined} title={`${row.node.title} · ${dates}${outside?' · Dates outside parent period':''}`} onClick={()=>onOpen(row)} className={`sticky left-0 z-10 flex min-w-0 items-center gap-2 border-r border-border bg-background px-3 text-left hover:bg-accent ${compact?'py-2':'py-3'}`} style={{paddingLeft:12+Math.min(depth,6)*14}}>
            <Icon className="h-4 w-4 shrink-0" style={{color}}/><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{row.node.title}</span><span className="mt-1 block break-words text-xs leading-snug text-foreground/80">{dates}</span></span>{outside&&<TriangleAlert aria-label="Dates outside parent period" className="h-3.5 w-3.5 shrink-0 text-amber-400"/>}
          </button>
          <div data-timeline-track={row.node.id} className="relative min-h-12 overflow-hidden touch-pan-y cursor-grab"  onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel}>
            {ticks.map(tick=><span key={tick.value} aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-border/40" style={{left:`${(tick.value-left)/span*100}%`}}/>)}
            {parentGeometry&&<div aria-hidden="true" className="pointer-events-none absolute inset-y-0 border-x border-white/10 bg-white/[.025]" style={{left:`${parentGeometry.start}%`,width:`${parentGeometry.width}%`}}/>}
            {geometry&&<button type="button" aria-label={`Show dates for ${row.node.title}`} title={dates} onPointerDown={e=>e.stopPropagation()} onClick={()=>onOpen(row)} draggable={false} className={`absolute top-1/2 -translate-y-1/2 cursor-pointer ${period?'h-5 rounded-sm':'h-7 w-5 -translate-x-1/2'} ${selectedId===row.node.id?'brightness-125':''}`} style={{left:`${geometry.start}%`,...(period?{width:`${geometry.width}%`,backgroundColor:color+'44',borderTop:`2px solid ${color}`,borderBottom:`2px solid ${color}`}:{})}}>
              {period?<><span aria-hidden="true" className="absolute inset-y-0 left-0 w-px" style={{backgroundColor:color}}/><span aria-hidden="true" className="absolute inset-y-0 right-0 w-px" style={{backgroundColor:color}}/>{geometry.before&&<ChevronLeft className="absolute left-0 top-0 h-4 w-4"/>}{geometry.after&&<ChevronRight className="absolute right-0 top-0 h-4 w-4"/>}</>:<><span aria-hidden="true" className="absolute inset-y-1 left-1/2 w-px" style={{backgroundColor:color}}/><span aria-hidden="true" className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45" style={{backgroundColor:color}}/></>}
            </button>}
          </div>
        </div>;
      })}
    </div>
    {!!rows.length&&!visible.length&&<p className="p-5 text-center text-xs text-muted-foreground">No events in this range. Use Fit events to return to your dates.</p>}
    {!!rows.length&&<p className="px-4 py-3 text-[11px] text-muted-foreground">Select a note to edit its dates. Drag empty space to browse. Ctrl + scroll to zoom.</p>}
  </div>;
}
