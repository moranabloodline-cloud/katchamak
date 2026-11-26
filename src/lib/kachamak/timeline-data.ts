import type { Novel, NoteNode, SectionKey } from './types';
import { TIMELINE_LIMIT, TIMELINE_MAX_SPAN, type StoryEvent, type TimelineGroup } from './story-calendar';
import { findNode } from './utils';
export type EventRow={node:NoteNode;section:SectionKey;path:string[];event:StoryEvent;ancestors?:NoteNode[]};
export function timelineRows(novel:Novel,section:SectionKey,rootId?:string,selectionScope=false):EventRow[] {
  const scope=selectionScope?(rootId?'folder':'section'):novel.timeline?.eventScope??(rootId?'folder':'book');
  const root=scope==='folder'&&rootId?findNode(novel.sections[section],rootId):null;
  const rows:EventRow[]=[];
  function visit(nodes:NoteNode[],source:SectionKey,ancestors:NoteNode[],insideRoot:boolean) {
    for (const node of nodes) {
      const included=insideRoot||node===root;
      if(included&&node.event)rows.push({node,section:source,path:ancestors.map(parent=>parent.title),event:node.event,ancestors});
      if(node.children.length)visit(node.children,source,[...ancestors,node],included);
    }
  }
  for (const [source,nodes] of Object.entries(novel.sections) as [SectionKey,NoteNode[]][]) {
    if(scope==='book'||source===section)visit(nodes,source,[],!root);
  }
  return rows.sort((a,b)=>a.event.start-b.event.start);
}
export const groupFor=(e:StoryEvent,groups:TimelineGroup[])=>groups.some(g=>g.id===e.groupId)?e.groupId! : '';
export function boundedViewport(center:number,span:number) {
  return {center:Math.max(-TIMELINE_LIMIT,Math.min(TIMELINE_LIMIT,Math.round(center))),span:Math.max(1,Math.min(TIMELINE_MAX_SPAN,Math.round(span)))};
}
export function fittedRange(rows:EventRow[],day:number,minDays=7) {
  if(!rows.length)return {center:7*day,span:14*day};
  const {first,last}=rows.reduce((range,r)=>({first:Math.min(range.first,r.event.start),last:Math.max(range.last,r.event.end??r.event.start)}),{first:Infinity,last:-Infinity});
  const span=Math.min(TIMELINE_MAX_SPAN,Math.max(minDays*day,Math.ceil((last-first)*1.25)));
  return {center:Math.round((first+last)/2),span};
}
/** Partition overlaps into tracks. Labels have a minimum footprint so point
 * events at the same time remain separately selectable at distant scales. */
export function eventTracks(rows:EventRow[],span:number) {
  const ends:number[]=[];
  return rows.map(row=>{let track=ends.findIndex(end=>end<=row.event.start);if(track<0)track=ends.length;ends[track]=Math.max(row.event.end??row.event.start,row.event.start+span*0.18);return {row,track};});
}
