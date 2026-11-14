/** Calendar arithmetic is independent of JavaScript Date/time zones. All event
 * positions are integer minutes from day 1 of year 1 in the chosen time system.
 * Astronomical year 0 is displayed as year 1 of the preceding era. */
export interface StoryCalendar {
  name: string;
  months: { name: string; days: number }[];
  weekdays: string[];
  epochWeekday: number;
  hoursPerDay: number;
  minutesPerHour: number;
  eraName: string;
  beforeEraName: string;
  leap: { every: number; except: number; also: number; month: number; days: number } | null;
}
export interface StoryDate { year: number; month: number; day: number; hour: number; minute: number }
export interface StoryEvent { start: number; end?: number; groupId?: string; precision: 'day' | 'time' }
export interface TimelineGroup { id: string; name: string; color: string }
export interface TimelinePreferences {
  rootId: string | null; detail: 'titles' | 'synopsis'; compact: boolean;
  calendar?: StoryCalendar;
  display?: 'axis' | 'calendar' | 'chronicle' | 'outline';
  groups?: TimelineGroup[];
  hiddenGroups?: string[];
  eventScope?: 'book' | 'section' | 'folder';
  center?: number;
  span?: number;
}
const names=['January','February','March','April','May','June','July','August','September','October','November','December'];
export const GREGORIAN: StoryCalendar = {
  name:'Gregorian', months:names.map((name,i)=>({name,days:[31,28,31,30,31,30,31,31,30,31,30,31][i]})),
  weekdays:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  epochWeekday:0,hoursPerDay:24,minutesPerHour:60,eraName:'CE',beforeEraName:'BCE',
  leap:{every:4,except:100,also:400,month:1,days:1},
};
export function calendarPreset(preset: 'gregorian'|'uniform'): StoryCalendar {
  if(preset==='gregorian') return structuredClone(GREGORIAN);
  return {name:'Custom calendar',months:Array.from({length:12},(_,i)=>({name:`Month ${i+1}`,days:30})),weekdays:['Day 1','Day 2','Day 3','Day 4','Day 5','Day 6'],epochWeekday:0,hoursPerDay:24,minutesPerHour:60,eraName:'AE',beforeEraName:'BE',leap:null};
}
const integer=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const label=(v:unknown)=>typeof v==='string'&&v.trim().length>0&&v.length<=100;
export function validCalendar(value:unknown):value is StoryCalendar {
  if(!value||typeof value!=='object')return false;
  const c=value as StoryCalendar;
  if(!label(c.name)||!label(c.eraName)||!label(c.beforeEraName)||!Array.isArray(c.months)||!c.months.length||c.months.length>64||!c.months.every(m=>m&&label(m.name)&&integer(m.days,1,366)))return false;
  if(!Array.isArray(c.weekdays)||!c.weekdays.length||c.weekdays.length>32||!c.weekdays.every(label)||!integer(c.epochWeekday,0,c.weekdays.length-1)||!integer(c.hoursPerDay,1,100)||!integer(c.minutesPerHour,1,100))return false;
  const l=c.leap;
  return l===null||!!l&&integer(l.every,1,10000)&&integer(l.except,0,10000)&&integer(l.also,0,10000)&&(!l.except||l.except%l.every===0)&&(!l.also||!!l.except&&l.also%l.except===0)&&integer(l.month,0,c.months.length-1)&&integer(l.days,1,30);
}
export function validEvent(value:unknown):value is StoryEvent {
  if(!value||typeof value!=='object')return false;
  const e=value as StoryEvent;
  return integer(e.start,-1e12,1e12)&&(e.end===undefined||integer(e.end,e.start,1e12))&&(e.groupId===undefined||typeof e.groupId==='string')&&['day','time'].includes(e.precision);
}
export function validTimelineExtra(t:TimelinePreferences) {
  return (t.calendar===undefined||validCalendar(t.calendar))&&
    (t.display===undefined||['axis','calendar','chronicle','outline'].includes(t.display))&&
    (t.eventScope===undefined||['book','section','folder'].includes(t.eventScope))&&
    (t.center===undefined||integer(t.center,-1e12,1e12))&&
    (t.span===undefined||integer(t.span,1,2e12))&&
    (t.groups===undefined||Array.isArray(t.groups)&&t.groups.length<=100&&new Set(t.groups.map(g=>g?.id)).size===t.groups.length&&t.groups.every(g=>g&&label(g.id)&&label(g.name)&&/^#[a-f0-9]{6}$/i.test(g.color)))&&
    (t.hiddenGroups===undefined||Array.isArray(t.hiddenGroups)&&t.hiddenGroups.every(id=>typeof id==='string'));
}
export const minutesPerDay=(c:StoryCalendar)=>c.hoursPerDay*c.minutesPerHour;
export const baseYearDays=(c:StoryCalendar)=>c.months.reduce((sum,m)=>sum+m.days,0);
export function isLeapYear(c:StoryCalendar,year:number) {
  const l=c.leap;return !!l&&year%l.every===0&&(!l.except||year%l.except!==0||!!l.also&&year%l.also===0);
}
export function monthDays(c:StoryCalendar,year:number,month:number) {
  return (c.months[month]?.days??0)+(c.leap?.month===month&&isLeapYear(c,year)?c.leap.days:0);
}
export function daysBeforeYear(c:StoryCalendar,year:number) {
  const y=year-1,l=c.leap;
  return y*baseYearDays(c)+(l?(Math.floor(y/l.every)-(l.except?Math.floor(y/l.except):0)+(l.also?Math.floor(y/l.also):0))*l.days:0);
}
export function validDate(c:StoryCalendar,d:StoryDate) {
  return integer(d.year,-2e12,2e12)&&integer(d.month,0,c.months.length-1)&&integer(d.day,1,monthDays(c,d.year,d.month))&&integer(d.hour,0,c.hoursPerDay-1)&&integer(d.minute,0,c.minutesPerHour-1);
}
export function dateToMinute(c:StoryCalendar,d:StoryDate) {
  if(!validDate(c,d))throw new Error('Choose a valid date in this calendar.');
  let day=daysBeforeYear(c,d.year)+d.day-1;
  for(let i=0;i<d.month;i++)day+=monthDays(c,d.year,i);
  const value=day*minutesPerDay(c)+d.hour*c.minutesPerHour+d.minute;
  if(!integer(value,-1e12,1e12))throw new Error('This date is outside the supported timeline range.');
  return value;
}
export function minuteToDate(c:StoryCalendar,value:number):StoryDate {
  const day=Math.floor(value/minutesPerDay(c));
  // Leap additions are positive, so the unadjusted year supplies safe bounds.
  const bound=Math.ceil(Math.abs(day)/baseYearDays(c))+3;
  let lo=-bound,hi=bound;
  while(lo+1<hi){const mid=Math.floor((lo+hi)/2);if(daysBeforeYear(c,mid)<=day)lo=mid;else hi=mid;}
  let remaining=day-daysBeforeYear(c,lo),month=0;
  while(month<c.months.length-1&&remaining>=monthDays(c,lo,month)){remaining-=monthDays(c,lo,month);month++;}
  const time=((value%minutesPerDay(c))+minutesPerDay(c))%minutesPerDay(c);
  return {year:lo,month,day:remaining+1,hour:Math.floor(time/c.minutesPerHour),minute:time%c.minutesPerHour};
}
export const yearText=(c:StoryCalendar,year:number)=>`${year>0?year:1-year} ${year>0?c.eraName:c.beforeEraName}`;
export function formatDate(c:StoryCalendar,value:number,precision:'day'|'time'='day') {
  const d=minuteToDate(c,value);
  return `${d.day} ${c.months[d.month].name} ${yearText(c,d.year)}${precision==='time'?` · ${String(d.hour).padStart(2,'0')}:${String(d.minute).padStart(2,'0')}`:''}`;
}
export function calendarCells(c:StoryCalendar,value:number) {
  const d=minuteToDate(c,value),first=value-(d.day-1)*minutesPerDay(c)-d.hour*c.minutesPerHour-d.minute,day=Math.floor(first/minutesPerDay(c));
  const offset=((day+c.epochWeekday)%c.weekdays.length+c.weekdays.length)%c.weekdays.length;
  return Array.from({length:Math.ceil((offset+monthDays(c,d.year,d.month))/c.weekdays.length)*c.weekdays.length},(_,i)=>i<offset||i>=offset+monthDays(c,d.year,d.month)?null:{day:i-offset+1,start:first+(i-offset)*minutesPerDay(c)});
}
export function shiftMonth(c:StoryCalendar,value:number,delta:number) {
  const d=minuteToDate(c,value),total=d.year*c.months.length+d.month+delta,year=Math.floor(total/c.months.length),month=((total%c.months.length)+c.months.length)%c.months.length;
  return dateToMinute(c,{year,month,day:1,hour:0,minute:0});
}
export function eventOnDay(e:StoryEvent,start:number,c:StoryCalendar) {return e.start<start+minutesPerDay(c)&&(e.end??e.start)>=start;}
