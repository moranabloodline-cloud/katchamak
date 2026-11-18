import type {NoteNode} from './types';
import {eventType,formatDate,type StoryCalendar,type StoryEvent} from './story-calendar';
import {findNode,locateNode} from './utils';

export const timelineKind=(node:NoteNode)=>node.event?eventType(node.event):node.timelineKind;
export function timelineDefaultStart(nodes:NoteNode[],id:string):number {
  let parentId=locateNode(nodes,id)?.parentId;
  while(parentId){const parent=findNode(nodes,parentId);if(!parent)break;if(parent.event)return parent.event.start;parentId=locateNode(nodes,parentId)?.parentId;}
  return 0;
}
/** Display order only: no saved hierarchy or manuscript order is rewritten. */
export function chronologicalNotes(nodes:NoteNode[]):NoteNode[] {
  const first=(node:NoteNode):number=>node.event?.start??Math.min(Infinity,...node.children.map(first));
  return [...nodes].sort((a,b)=>first(a)-first(b)).map(node=>({...node,children:chronologicalNotes(node.children)}));
}
export function timelineScope(nodes:NoteNode[],selectedId:string|null,rootId?:string) {
  const selected=selectedId?findNode(nodes,selectedId):null;
  if(!selected||rootId&&!findNode([findNode(nodes,rootId)!].filter(Boolean),selected.id))return rootId;
  if(timelineKind(selected)==='period'||!selected.event&&selected.children.length)return selected.id;
  return locateNode(nodes,selected.id)?.parentId??rootId;
}
export function timelineDateLabel(node:NoteNode,calendar:StoryCalendar) {
  const e=node.event;
  return e?formatDate(calendar,e.start,e.precision)+(e.end===undefined?'':' – '+formatDate(calendar,e.end,e.endPrecision??e.precision)):'Set dates';
}
/** At each scale show immediate dated children; undated containers are transparent.
 * Opening a period reveals its next level instead of crowding billions of years
 * and a few days onto the same overview. The selected period remains a range bar. */
export function timelineLevelIds(nodes:NoteNode[],scopeId?:string) {
  const root=scopeId?findNode(nodes,scopeId):null,ids=new Set<string>();
  if(root?.event)ids.add(root.id);
  const walk=(list:NoteNode[])=>list.forEach(node=>{if(node.event)ids.add(node.id);else walk(node.children);});
  walk(root?root.children:nodes);
  return ids;
}
/** Reparenting never changes dates. Report a containing period mismatch instead. */
export function timelineWarnings(nodes:NoteNode[],node:NoteNode):string[] {
  const messages:string[]=[];
  let parentId=locateNode(nodes,node.id)?.parentId;
  while(parentId){const parent=findNode(nodes,parentId);if(!parent)break;
    if(node.event&&parent.event&&eventType(parent.event)==='period'&&(node.event.start<parent.event.start||(node.event.end??node.event.start)>parent.event.end!))messages.push(`Dates fall outside “${parent.title}”.`);
    parentId=locateNode(nodes,parentId)?.parentId;
  }
  if(node.event&&eventType(node.event)==='period'){
    let outside=0;const check=(list:NoteNode[])=>list.forEach(child=>{if(child.event&&(child.event.start<node.event!.start||(child.event.end??child.event.start)>node.event!.end!))outside++;check(child.children);});check(node.children);
    if(outside)messages.push(`${outside} contained ${outside===1?'note falls':'notes fall'} outside this period. Their dates have not been changed.`);
  }
  return messages;
}

/** Validate explicit date edits against both ancestors and descendants, without
 * silently resizing a parent or moving its children. Existing data stays intact. */
export function timelineDateErrors(nodes:NoteNode[],event:StoryEvent,id?:string,parentId?:string):string[] {
  const current=id?findNode(nodes,id):null,messages:string[]=[];
  let ancestorId=current?locateNode(nodes,current.id)?.parentId:parentId;
  while(ancestorId){const ancestor=findNode(nodes,ancestorId);if(!ancestor)break;
    if(ancestor.event&&eventType(ancestor.event)==='period'&&(event.start<ancestor.event.start||(event.end??event.start)>ancestor.event.end!))messages.push(`Dates must stay within “${ancestor.title}”. Edit that period’s dates first if it needs to be wider.`);
    ancestorId=locateNode(nodes,ancestorId)?.parentId??undefined;
  }
  if(current&&eventType(event)==='period'){
    const outside:string[]=[];const visit=(list:NoteNode[])=>list.forEach(child=>{if(child.event&&(child.event.start<event.start||(child.event.end??child.event.start)>event.end!))outside.push(child.title);visit(child.children);});visit(current.children);
    if(outside.length)messages.push(`This period must include ${outside.slice(0,2).map(title=>`“${title}”`).join(' and ')}${outside.length>2?` and ${outside.length-2} other notes`:''}. Their dates will not be moved.`);
  }
  return messages;
}
