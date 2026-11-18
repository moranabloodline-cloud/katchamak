import type {EventRow} from './timeline-data';
import {TIMELINE_LIMIT,dateToMinute,eventType,formatDate,minutesPerDay,minuteToDate,type StoryCalendar,type StoryEvent} from './story-calendar';

/** One row per note, parent first. Dates and saved note order are never modified. */
export function timelineAxisRows(rows:EventRow[]) {
  const ids=new Set(rows.map(row=>row.node.id)),children=new Map<string|undefined,EventRow[]>();
  for(const row of rows){const parent=row.ancestors?.findLast(node=>ids.has(node.id));const list=children.get(parent?.id)??[];list.push(row);children.set(parent?.id,list);}
  const result:{row:EventRow;depth:number}[]=[];
  const visit=(parent:string|undefined,depth:number)=>{for(const row of (children.get(parent)??[]).toSorted((a,b)=>a.event.start-b.event.start)){result.push({row,depth});visit(row.node.id,depth+1);}};
  visit(undefined,0);return result;
}

/** Clip only to the viewport. Never stretch a range to make room for its label. */
export function timelineGeometry(event:StoryEvent,left:number,span:number) {
  const end=event.end??event.start,right=left+span;
  if(end<left||event.start>right)return null;
  const startPercent=Math.max(0,Math.min(100,(event.start-left)/span*100));
  const endPercent=Math.max(0,Math.min(100,(end-left)/span*100));
  return {start:startPercent,width:Math.max(0,endPercent-startPercent),before:event.start<left,after:end>right};
}

export function timelineParent(row:EventRow){return row.ancestors?.findLast(node=>node.event&&eventType(node.event)==='period');}
export function timelineOutsideParent(row:EventRow){return row.ancestors?.filter(node=>node.event&&eventType(node.event)==='period').some(node=>row.event.start<node.event!.start||(row.event.end??row.event.start)>node.event!.end!)??false;}

const niceStep=(value:number)=>{const magnitude=10**Math.floor(Math.log10(Math.max(1,value)));return ([1,2,5,10].find(n=>n*magnitude>=value)??10)*magnitude;};
/** Rounded calendar ticks, rather than arbitrary fractional years. */
export function timelineTicks(calendar:StoryCalendar,left:number,span:number){
  const lo=Math.max(-TIMELINE_LIMIT,Math.round(left)),hi=Math.min(TIMELINE_LIMIT,Math.round(left+span)),first=minuteToDate(calendar,lo),last=minuteToDate(calendar,hi),ticks:{value:number;label:string}[]=[];
  const add=(value:number,precision:'year'|'month'|'day'|'time')=>{if(value>=lo&&value<=hi&&!ticks.some(t=>t.value===value))ticks.push({value,label:formatDate(calendar,value,precision)});};
  const yearSpan=last.year-first.year,day=minutesPerDay(calendar);
  if(yearSpan>=3){
    const step=niceStep(yearSpan/5),start=Math.floor((first.year<=0?first.year-1:first.year)/step)*step;
    for(let i=0;i<10;i++){const labelYear=start+i*step;if(labelYear===0)continue;const year=labelYear<0?labelYear+1:labelYear;try{add(dateToMinute(calendar,{year,month:0,day:1,hour:0,minute:0}),'year');}catch{/* Outside supported dates. */}}
  }else if(span>day*60){
    const monthCount=calendar.months.length,start=first.year*monthCount+first.month,step=niceStep((last.year*monthCount+last.month-start+1)/5);
    for(let i=0;i<10;i++){const value=Math.floor(start/step)*step+i*step,year=Math.floor(value/monthCount),month=((value%monthCount)+monthCount)%monthCount;try{add(dateToMinute(calendar,{year,month,day:1,hour:0,minute:0}),'month');}catch{/* Outside supported dates. */}}
  }else{
    const unit=span>day*2?day:span>calendar.minutesPerHour*3?calendar.minutesPerHour:1,step=niceStep(span/unit/5)*unit,start=Math.ceil(lo/step)*step;
    for(let i=0;i<10;i++)add(start+i*step,unit===day?'day':'time');
  }
  if(!ticks.length)add(lo,span>day*365?'year':span>day*60?'month':span>day*2?'day':'time');
  return ticks;
}
