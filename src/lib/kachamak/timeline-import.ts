import {useKachamak} from './store';
import {GREGORIAN,validCalendar,validEvent,type StoryCalendar} from './story-calendar';
import type {NoteNode} from './types';
import {CLOUD_NOTE_LEVELS,uid} from './utils';

// A timeline file contains dated prose and hierarchy, never an entire library.
// Import is append-only and does not replace the destination calendar or notes.
const calendarRules=(c:StoryCalendar)=>JSON.stringify({months:c.months,weekdays:c.weekdays,hours:c.hoursPerDay,minutes:c.minutesPerHour,leap:c.leap,yearZero:!!c.yearZero});
export function importTimeline(projectId:string,json:string) {
  const state=useKachamak.getState(),novel=state.novels.find(n=>n.id===projectId);
  if(!novel||state.activeNovelId!==projectId)throw new Error('The active project changed. Reopen Import timeline.');
  const file=JSON.parse(json);
  if(file?.format!=='kachamak-timeline'||file.version!==1||!validCalendar(file.calendar)||!Array.isArray(file.notes)||!file.notes.length)throw new Error('Choose a Kachamak timeline JSON file.');
  if(calendarRules(file.calendar)!==calendarRules(novel.timeline?.calendar??GREGORIAN))throw new Error('This timeline uses different calendar rules. The project calendar has not been changed.');
  let count=0;const now=Date.now();
  const maxLevels=process.env.NEXT_PUBLIC_KATCHAMAK_DESKTOP==='1'?100:CLOUD_NOTE_LEVELS;
  const read=(value:unknown,depth:number):NoteNode=>{
    if(!value||typeof value!=='object'||Array.isArray(value)||depth>=maxLevels||++count>10000)throw new Error('The timeline hierarchy is invalid or too large.');
    const n=value as Record<string,unknown>;
    if(typeof n.title!=='string'||!n.title.trim()||n.title.length>500||!Array.isArray(n.children)||!['content','synopsis','notes'].every(k=>n[k]===undefined||typeof n[k]==='string')||n.event!==undefined&&!validEvent(n.event)||n.timelineKind!==undefined&&!['event','period'].includes(String(n.timelineKind)))throw new Error('A timeline note has invalid text or dates.');
    const event=n.event?{...(n.event as NonNullable<NoteNode['event']>)}:undefined;
    if(event)delete event.groupId; // Project-specific group IDs are not portable.
    return {id:uid(),title:n.title.trim(),kind:'doc',content:typeof n.content==='string'?n.content:'',synopsis:typeof n.synopsis==='string'?n.synopsis:'',notes:typeof n.notes==='string'?n.notes:'',status:'',label:'',createdAt:now,updatedAt:now,children:n.children.map(child=>read(child,depth+1)),event,timelineKind:n.timelineKind as NoteNode['timelineKind'],collapsed:n.collapsed===true,...(typeof n.color==='string'&&/^#[a-f0-9]{6}$/i.test(n.color)?{color:n.color}:{}),...(typeof n.icon==='string'?{icon:n.icon}:{})};
  };
  const roots=file.notes.map((node:unknown)=>read(node,0));
  useKachamak.setState(s=>({novels:s.novels.map(n=>n.id===projectId?{...n,updatedAt:now,sections:{...n.sections,timeline:[...n.sections.timeline,...roots]},timeline:{rootId:null,detail:'synopsis',compact:false,...n.timeline,display:'axis'}}:n)}));
  state.setTab('timeline');state.select(roots[0].id);
  return {count,rootId:roots[0].id};
}
