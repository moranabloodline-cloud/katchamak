import type {StoryCalendar} from './story-calendar';
import {calendarCells,eventOnDay,eventType,minutesPerDay} from './story-calendar';
import type {EventRow} from './timeline-data';
export function timelineCalendarWeeks(rows:EventRow[],calendar:StoryCalendar,center:number) {
  const cells=calendarCells(calendar,center),columns=calendar.weekdays.length,day=minutesPerDay(calendar),first=cells.findIndex(Boolean);
  if(first<0)return [];
  const monthGridStart=cells[first]!.start-first*day;
  return Array.from({length:Math.ceil(cells.length/columns)},(_,week)=>{
    const dates=cells.slice(week*columns,(week+1)*columns),start=monthGridStart+week*columns*day;
    const valid=dates.flatMap((cell,index)=>cell?[index]:[]),left=valid[0]??0,right=(valid.at(-1)??-1)+1;
    const spans=rows.filter(row=>dates.some(cell=>cell&&eventOnDay(row.event,cell.start,calendar))).map(row=>{
      const from=Math.max(left,Math.floor((row.event.start-start)/day)),period=eventType(row.event)==='period';
      const to=period?Math.min(right,Math.floor(((row.event.end??row.event.start)-start)/day)+1):Math.min(right,from+1);
      return {row,from,to,before:row.event.start<start+left*day,after:(row.event.end??row.event.start)>=start+right*day};
    }).filter(item=>item.to>item.from).sort((a,b)=>a.from-b.from||(b.to-b.from)-(a.to-a.from));
    const ends:number[]=[];
    const items=spans.map(item=>{let lane=ends.findIndex(end=>end<=item.from);if(lane<0)lane=ends.length;ends[lane]=item.to;return {...item,lane};});
    return {dates,start,items,lanes:Math.max(1,ends.length)};
  });
}
