'use client';
import { useState } from 'react';
import { ArrowDown, ArrowUp, FileText, Hourglass, Zap, Plus } from 'lucide-react';
import { useKachamak } from '@/lib/kachamak/store';
import { findNode, stripHtml } from '@/lib/kachamak/utils';
import {chronologicalNotes,timelineKind} from '@/lib/kachamak/timeline-tree';
import {iconByName} from '@/lib/kachamak/icons';
import {GREGORIAN,formatDate} from '@/lib/kachamak/story-calendar';
import {addTimelineNote} from '@/lib/kachamak/timeline-actions';
import type { NoteNode, SectionKey } from '@/lib/kachamak/types';

export function OutlineView({section='binder',rootId,onSelectNote,chronological=false}:{section?:SectionKey;rootId?:string;chronological?:boolean;onSelectNote?:(id:string)=>void}) {
  const state=useKachamak(), novel=state.novels.find(n=>n.id===state.activeNovelId);
  const [outlineFilter,setOutlineFilter]=useState<string|null>(null);
  if(!novel)return null;
  const prefs=novel.timeline??{rootId:null,detail:'synopsis',compact:false};
  const scope=rootId?findNode(novel.sections[section],rootId):null;
  const candidates=chronological?chronologicalNotes(scope?scope.children:novel.sections[section]):scope?scope.children:novel.sections[section];
  // The chronological Outline filter belongs to the current breadcrumb scope.
  const filterId=chronological?outlineFilter:prefs.rootId;
  const filter=(id:string|null)=>chronological?setOutlineFilter(id):state.setTimeline({rootId:id});
  const root=filterId?findNode(candidates,filterId):null;
  const groups=root?root.children:candidates;
  const containers:{id:string;title:string}[]=[];
  const walk=(nodes:NoteNode[],depth=0)=>nodes.forEach(n=>{if(n.children.length){containers.push({id:n.id,title:'· '.repeat(depth)+n.title});walk(n.children,depth+1);}});walk(candidates);
  const open=(id:string)=>{if(chronological){(onSelectNote??state.select)(id);if(!state.rightPanelOpen)state.toggleRightPanel();}else{state.select(id);state.setView('write');}};
  const changeStatus=(id:string,status:string)=>{
    state.updateNode(section,id,{status});
    (onSelectNote??state.select)(id);
  };
  const card=(node:NoteNode,index:number,total:number)=> {const Icon=iconByName(node.icon)??(chronological?(timelineKind(node)==='period'?Hourglass:Zap):FileText);return <article key={node.id} className={`rounded-lg border bg-card ${state.selectedNodeId===node.id?'border-amber-400/60':'border-white/10'} ${prefs.compact?'p-2.5':'p-4'}`} style={{borderTopColor:node.color||'#ad7e2e',borderTopWidth:2}}>
    <div className="flex items-start gap-2"><button onClick={()=>open(node.id)} className="flex min-w-0 flex-1 items-start gap-2 text-left text-sm font-medium hover:text-amber-200"><Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{color:node.color||'#d6a64a'}}/><span>{node.title}</span></button><span className="text-[10px] text-muted-foreground">{index+1}</span></div>
    {chronological&&node.event&&<p className="mt-2 break-words text-xs leading-snug text-foreground/80">{formatDate(novel.timeline?.calendar??GREGORIAN,node.event.start,node.event.precision)}{node.event.end!==undefined?' – '+formatDate(novel.timeline?.calendar??GREGORIAN,node.event.end,node.event.endPrecision??node.event.precision):''}</p>}
    {prefs.detail==='synopsis'&&<p className={`mt-3 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground ${prefs.compact?'line-clamp-2':'line-clamp-6'}`}>{stripHtml(node.synopsis)||'Add a synopsis in Info.'}</p>}
    <div className="mt-3 flex items-center gap-2"><select aria-label={`Status for ${node.title}`} value={node.status||''} onChange={e=>changeStatus(node.id,e.target.value)} className="min-w-0 flex-1 rounded border border-white/10 bg-muted px-1 py-1 text-[11px] text-muted-foreground"><option value="">No status</option>{novel.statuses.map(s=><option key={s}>{s}</option>)}</select>{!chronological&&<><button aria-label={`Move ${node.title} earlier`} disabled={index===0} onClick={()=>state.moveNode(section,node.id,'up')} className="text-muted-foreground disabled:opacity-20"><ArrowUp className="h-3.5 w-3.5"/></button><button aria-label={`Move ${node.title} later`} disabled={index===total-1} onClick={()=>state.moveNode(section,node.id,'down')} className="text-muted-foreground disabled:opacity-20"><ArrowDown className="h-3.5 w-3.5"/></button></>}</div>
    {!!node.children.length&&<button onClick={()=>filter(node.id)} className="mt-2 text-xs text-amber-300">View {node.children.length} sub-notes →</button>}
  </article>;};
  return <div className="flex h-full flex-col bg-background">
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-white/10 px-5 py-3"><div className="mr-auto"><h2 className="text-sm font-semibold text-foreground">{scope?.title||(chronological?'All timelines':novel.title)}</h2><p className="text-[11px] text-muted-foreground">Outline · {chronological?'Chronological order':'Note order'}</p></div><label className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">{chronological&&"Filter:"}<select aria-label={chronological?"Outline filter":"Timeline scope"} value={root?.id||''} onChange={e=>filter(e.target.value||null)} className="max-w-48 rounded border border-white/15 bg-muted px-2 py-1 text-xs"><option value="">{chronological?"All in this scope":"Current section"}</option>{containers.map(n=><option key={n.id} value={n.id}>{n.title}</option>)}</select></label>{chronological&&root&&<button type="button" className="rounded border border-white/15 px-2 py-1 text-xs text-amber-300" onClick={()=>filter(null)}>Clear filter</button>}<select aria-label="Timeline card content" value={prefs.detail} onChange={e=>state.setTimeline({detail:e.target.value as 'titles'|'synopsis'})} className="rounded border border-white/15 bg-muted px-2 py-1 text-xs"><option value="synopsis">Title + synopsis</option><option value="titles">Titles only</option></select><label className="flex items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" checked={prefs.compact} onChange={e=>state.setTimeline({compact:e.target.checked})}/>Compact</label></div>
    <div className="flex min-h-0 flex-1 gap-4 overflow-auto p-5 kachamak-scroll">{groups.map((group,index)=><section key={group.id} className={`flex shrink-0 flex-col ${prefs.compact?'w-60':'w-72'}`}><div className="mb-3 flex items-center gap-2 border-b border-amber-500/30 pb-2"><span className="text-[11px] text-amber-500/60">{String(index+1).padStart(2,'0')}</span><button onClick={()=>open(group.id)} className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:text-amber-200">{group.title}</button><button aria-label={`Add note to ${group.title}`} onClick={()=>{if(chronological)addTimelineNote(section,group.id,'event');else{state.addNode(section,group.id);state.setView('write');}}} className="text-muted-foreground hover:text-amber-300"><Plus className="h-4 w-4"/></button></div><div className="space-y-3">{group.children.length?group.children.map((n,i)=>card(n,i,group.children.length)):card(group,index,groups.length)}</div></section>)}
      {!groups.length&&<div className="m-auto max-w-sm text-center"><h3 className="text-lg text-foreground">{chronological?'Add your first event':'Plan your next chapter'}</h3><p className="my-3 text-sm leading-relaxed text-muted-foreground">{chronological?'Events and time periods appear here in chronological order.':'Your notes appear here in the same order. Use any structure that suits your story.'}</p><button className="rounded border border-amber-500/40 px-4 py-2 text-sm text-amber-200" onClick={()=>{if(chronological)addTimelineNote(section,root?.id||scope?.id||null,'event');else{state.addNode(section,root?.id||scope?.id||null);state.setView('write');}}}>{chronological?'Add event':'Create a note'}</button></div>}
    </div>
  </div>;
}
