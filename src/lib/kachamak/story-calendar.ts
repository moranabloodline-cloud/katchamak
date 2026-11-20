import { validCoverImage } from './project-settings';
export const DEFAULT_ERA_COLOR='#8b949e';
// 13.8 billion Gregorian years fit exactly in integer minutes. Leave headroom
// below MAX_SAFE_INTEGER for calendar-day arithmetic and viewport rounding.
export const TIMELINE_LIMIT=8e15;
export const TIMELINE_MAX_SPAN=Number.MAX_SAFE_INTEGER;
export type DatePrecision='year'|'month'|'day'|'time';
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
  eraFullName?: string;
  beforeEraFullName?: string;
  eras?: { id: string; name: string; abbreviation: string; startYear: number; color?: string }[];
  yearZero?: boolean;
  resetWeekdaysEachMonth?: boolean;
  range?: { start: number; end: number };
  moons?: { id: string; name: string; period: number; offset: number; color: string }[];
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  leap: { every: number; except: number; also: number; month: number; days: number } | null;
}
export interface StoryDate { year: number; month: number; day: number; hour: number; minute: number }
export interface StoryEvent { start: number; end?: number; groupId?: string; precision: DatePrecision; endPrecision?: DatePrecision; banner?: string; type?: 'event' | 'period'; cardColor?: string; cardOpacity?: number; cardDetail?: 'title' | 'dates' | 'synopsis'; cardStyle?: 'image' | 'color' }
export const eventType=(event:StoryEvent):'event'|'period'=>event.type??(event.end!==undefined&&event.end>event.start?'period':'event');
const durationNumber = new Intl.NumberFormat('en-US');

export function eventDuration(event:StoryEvent, c:StoryCalendar) {
  if (eventType(event) !== 'period' || event.end === undefined) return '';
  const start = minuteToDate(c, event.start), end = minuteToDate(c, event.end);
  const endPrecision = event.endPrecision ?? event.precision;
  const parts: string[] = [];
  function add(value:number, unit:string) {
    if (value > 0) parts.push(`${durationNumber.format(value)} ${unit}${value === 1 ? '' : 's'}`);
  }

  // Describe the interval between the displayed dates. Coarse end dates are
  // stored at the last minute of their day, month or year for chart coverage.
  if (event.precision === 'year' || endPrecision === 'year') {
    add(end.year - start.year, 'year');
  } else {
    const monthsPerYear = c.months.length;
    let months = (end.year - start.year) * monthsPerYear + end.month - start.month;
    let days = 0, minutes = 0;
    if (event.precision !== 'month' && endPrecision !== 'month') {
      if (event.precision === 'time' && endPrecision === 'time') {
        minutes = (end.hour - start.hour) * c.minutesPerHour + end.minute - start.minute;
      }
      const anniversaryDay = Math.min(start.day, monthDays(c, end.year, end.month));
      days = end.day - anniversaryDay;
      const borrowDay = minutes < 0 ? 1 : 0;
      if (borrowDay) minutes += minutesPerDay(c);
      days -= borrowDay;
      if (days < 0) {
        months--;
        const previousMonth = (end.month + monthsPerYear - 1) % monthsPerYear;
        const previousLength = monthDays(c, end.month === 0 ? end.year - 1 : end.year, previousMonth);
        days = previousLength - Math.min(start.day, previousLength) + end.day - borrowDay;
      }
    }
    add(Math.floor(months / monthsPerYear), 'year');
    add(months % monthsPerYear, 'month');
    add(days, 'day');
    add(Math.floor(minutes / c.minutesPerHour), 'hour');
    add(minutes % c.minutesPerHour, 'minute');
  }
  return parts.join(', ');
}
export interface TimelineGroup { id: string; name: string; color: string }
export type TimelineDisplay = 'axis' | 'calendar' | 'chronicle';
export interface TimelinePreferences {
  rootId: string | null; detail: 'titles' | 'synopsis'; compact: boolean;
  calendar?: StoryCalendar;
  display?: TimelineDisplay | 'outline';
  // Only a root chosen in the toolbar pins the view. Older rootId values did not pin it.
  pinnedRootId?: string | null;
  toolsHidden?: boolean;
  hiddenDisplayButtons?: TimelineDisplay[];
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
  if(c.eraFullName!==undefined&&!label(c.eraFullName)||c.beforeEraFullName!==undefined&&!label(c.beforeEraFullName))return false;
  if(c.yearZero!==undefined&&typeof c.yearZero!=='boolean'||c.resetWeekdaysEachMonth!==undefined&&typeof c.resetWeekdaysEachMonth!=='boolean')return false;
  if(c.eras!==undefined&&(!Array.isArray(c.eras)||c.eras.length>32||!c.eras.every((e,i)=>e&&label(e.id)&&label(e.name)&&label(e.abbreviation)&&(e.color===undefined||typeof e.color==='string'&&/^#[a-f0-9]{6}$/i.test(e.color))&&integer(e.startYear,2,1e9)&&(!i||e.startYear>c.eras![i-1].startYear))||new Set(c.eras.map(e=>e.id)).size!==c.eras.length))return false;
  if(c.range!==undefined&&(!c.range||!integer(c.range.start,-TIMELINE_LIMIT,TIMELINE_LIMIT)||!integer(c.range.end,c.range.start,TIMELINE_LIMIT)))return false;
  if(c.moons!==undefined&&(!Array.isArray(c.moons)||c.moons.length>32||!c.moons.every(m=>m&&label(m.id)&&label(m.name)&&Number.isFinite(m.period)&&m.period>=1&&m.period<=1e12&&Number.isFinite(m.offset)&&Math.abs(m.offset)<=1e12&&/^#[a-f0-9]{6}$/i.test(m.color))||new Set(c.moons.map(m=>m.id)).size!==c.moons.length))return false;
  if(c.dateFormat!==undefined&&(typeof c.dateFormat!=='string'||!c.dateFormat.trim()||c.dateFormat.length>200)||c.timeFormat!==undefined&&!['12h','24h'].includes(c.timeFormat))return false;
  return l===null||!!l&&integer(l.every,1,10000)&&integer(l.except,0,10000)&&integer(l.also,0,10000)&&(!l.except||l.except%l.every===0)&&(!l.also||!!l.except&&l.also%l.except===0)&&integer(l.month,0,c.months.length-1)&&integer(l.days,1,30);
}
export function validEvent(value:unknown):value is StoryEvent {
  if(!value||typeof value!=='object')return false;
  const e=value as StoryEvent;
  return integer(e.start,-TIMELINE_LIMIT,TIMELINE_LIMIT)&&(e.end===undefined||integer(e.end,e.start,TIMELINE_LIMIT))&&(e.groupId===undefined||typeof e.groupId==='string')&&['year','month','day','time'].includes(e.precision)&&(e.endPrecision===undefined||['year','month','day','time'].includes(e.endPrecision))&&validCoverImage(e.banner)&&(e.cardColor===undefined||/^#[a-f0-9]{6}$/i.test(e.cardColor))&&(e.cardOpacity===undefined||Number.isFinite(e.cardOpacity)&&e.cardOpacity>=0&&e.cardOpacity<=1)&&(e.cardStyle===undefined||['image','color'].includes(e.cardStyle))&&(e.cardDetail===undefined||['title','dates','synopsis'].includes(e.cardDetail))&&(e.type===undefined||e.type==='event'&&e.end===undefined||e.type==='period'&&e.end!==undefined&&e.end>e.start);
}
export function validTimelineExtra(t:TimelinePreferences) {
  return (t.calendar===undefined||validCalendar(t.calendar))&&
    (t.display===undefined||['axis','calendar','chronicle','outline'].includes(t.display))&&
    (t.pinnedRootId==null||typeof t.pinnedRootId==='string')&&
    (t.toolsHidden===undefined||typeof t.toolsHidden==='boolean')&&
    (t.hiddenDisplayButtons===undefined||Array.isArray(t.hiddenDisplayButtons)&&t.hiddenDisplayButtons.length<=3&&new Set(t.hiddenDisplayButtons).size===t.hiddenDisplayButtons.length&&t.hiddenDisplayButtons.every(key=>['axis','calendar','chronicle'].includes(key)))&&
    (t.eventScope===undefined||['book','section','folder'].includes(t.eventScope))&&
    (t.center===undefined||integer(t.center,-TIMELINE_LIMIT,TIMELINE_LIMIT))&&
    (t.span===undefined||integer(t.span,1,TIMELINE_MAX_SPAN))&&
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
  if(!integer(value,-TIMELINE_LIMIT,TIMELINE_LIMIT))throw new Error('This date is outside the supported timeline range.');
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
export function eraYear(c:StoryCalendar,year:number) {
  const era=year>0?[...(c.eras??[])].reverse().find(e=>year>=e.startYear):undefined;
  return {key:year<=0?'before':era?.id??'after',year:(year<=0?1-year:year-(era?.startYear??1)+1)-(c.yearZero?1:0),abbreviation:year<=0?c.beforeEraName:era?.abbreviation??c.eraName,name:year<=0?c.beforeEraFullName??c.beforeEraName:era?.name??c.eraFullName??c.eraName};
}
export function absoluteYear(c:StoryCalendar,year:number,key:string) {
  const offset=c.yearZero?0:1;
  return key==='before'?offset-year:year+(c.eras?.find(e=>e.id===key)?.startYear??1)-offset;
}
export const yearText=(c:StoryCalendar,year:number)=>{const e=eraYear(c,year);return `${e.year} ${e.abbreviation}`;};
export const moonPhase=(moon:NonNullable<StoryCalendar['moons']>[number],minute:number)=>((minute-moon.offset)%moon.period+moon.period)%moon.period/moon.period;
export function formatCalendarDate(c:StoryCalendar,value:number,pattern=c.dateFormat??'D MMMM YYYY E') {
  const d=minuteToDate(c,value),era=eraYear(c,d.year),day=c.resetWeekdaysEachMonth?d.day-1:Math.floor(value/minutesPerDay(c)),weekday=((day+c.epochWeekday)%c.weekdays.length+c.weekdays.length)%c.weekdays.length;
  const ordinal=(n:number)=>n%100>=11&&n%100<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]??'th');
  const tokens:Record<string,string>={E:era.abbreviation,EE:era.name,YY:String(era.year).slice(-2).padStart(2,'0'),YYYY:String(era.year),SYYYY:String(d.year),YBIG:era.year.toLocaleString('en-US'),M:String(d.month+1),MM:String(d.month+1).padStart(2,'0'),MMM:c.months[d.month].name.slice(0,3),MMMM:c.months[d.month].name,D:String(d.day),DD:String(d.day).padStart(2,'0'),DDD:c.weekdays[weekday].slice(0,3),DDDD:c.weekdays[weekday],H:String(d.hour),HH:String(d.hour).padStart(2,'0'),m:String(d.minute),mm:String(d.minute).padStart(2,'0'),'^':ordinal(d.day)};
  return pattern.replace(/\[[^\]]*\]|SYYYY|YYYY|YBIG|MMMM|DDDD|MMM|DDD|YY|MM|DD|EE|HH|mm|[EMDHm^]/g,t=>t.startsWith('[')?t.slice(1,-1):tokens[t]??t);
}
export function formatDate(c:StoryCalendar,value:number,precision:DatePrecision='day') {
  const d=minuteToDate(c,value);
  const era=eraYear(c,d.year),year=era.year>9999?era.year.toLocaleString('en-US'):String(era.year);
  if(precision==='year')return `${year} ${era.abbreviation}`;
  if(precision==='month')return `${c.months[d.month].name} ${year} ${era.abbreviation}`;
  const clock=c.timeFormat==='12h'&&c.hoursPerDay===24?`${d.hour%12||12}:${String(d.minute).padStart(2,'0')} ${d.hour<12?'AM':'PM'}`:`${String(d.hour).padStart(2,'0')}:${String(d.minute).padStart(2,'0')}`;
  return `${formatCalendarDate(c,value)}${precision==='time'?` · ${clock}`:''}`;
}
export function dateAtPrecision(c:StoryCalendar,d:StoryDate,precision:DatePrecision,end=false) {
  const month=precision==='year'?(end?c.months.length-1:0):d.month;
  const day=precision==='year'||precision==='month'?(end?monthDays(c,d.year,month):1):d.day;
  return {...d,month,day,hour:precision==='time'?d.hour:end?c.hoursPerDay-1:0,minute:precision==='time'?d.minute:end?c.minutesPerHour-1:0};
}
export function calendarCells(c:StoryCalendar,value:number) {
  const d=minuteToDate(c,value),first=value-(d.day-1)*minutesPerDay(c)-d.hour*c.minutesPerHour-d.minute,day=Math.floor(first/minutesPerDay(c));
  const offset=(((c.resetWeekdaysEachMonth?0:day)+c.epochWeekday)%c.weekdays.length+c.weekdays.length)%c.weekdays.length;
  return Array.from({length:Math.ceil((offset+monthDays(c,d.year,d.month))/c.weekdays.length)*c.weekdays.length},(_,i)=>i<offset||i>=offset+monthDays(c,d.year,d.month)?null:{day:i-offset+1,start:first+(i-offset)*minutesPerDay(c)});
}
export function shiftMonth(c:StoryCalendar,value:number,delta:number) {
  const d=minuteToDate(c,value),total=d.year*c.months.length+d.month+delta,year=Math.floor(total/c.months.length),month=((total%c.months.length)+c.months.length)%c.months.length;
  return dateToMinute(c,{year,month,day:1,hour:0,minute:0});
}
export function eventOnDay(e:StoryEvent,start:number,c:StoryCalendar) {return e.start<start+minutesPerDay(c)&&(e.end??e.start)>=start;}
