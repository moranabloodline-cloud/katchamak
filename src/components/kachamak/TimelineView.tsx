'use client';
import { ArrowDown, ArrowUp, FileText, Plus } from 'lucide-react';
import { useKachamak } from '@/lib/kachamak/store';
import { findNode, stripHtml } from '@/lib/kachamak/utils';
import type { NoteNode } from '@/lib/kachamak/types';

export function TimelineView() {
  const state=useKachamak(), novel=state.novels.find(n=>n.id===state.activeNovelId);
  if(!novel)return null;
  const prefs=novel.timeline??{rootId:null,detail:'synopsis',compact:false};
  const root=prefs.rootId?findNode(novel.sections.binder,prefs.rootId):null;
  const groups=root?root.children:novel.sections.binder;
  const containers:{id:string;title:string}[]=[];
  const walk=(nodes:NoteNode[],depth=0)=>nodes.forEach(n=>{if(n.children.length){containers.push({id:n.id,title:'· '.repeat(depth)+n.title});walk(n.children,depth+1);}});walk(novel.sections.binder);
  const open=(id:string)=>{state.setTab('binder');state.select(id);state.setView('write');};
  const card=(node:NoteNode,index:number,total:number)=> <article key={node.id} className={`rounded-lg border bg-card ${state.selectedNodeId===node.id?'border-amber-400/60':'border-white/10'} ${prefs.compact?'p-2.5':'p-4'}`} style={{borderTopColor:node.color||'#ad7e2e',borderTopWidth:2}}>
    <div className="flex items-start gap-2"><button onClick={()=>open(node.id)} className="flex min-w-0 flex-1 items-start gap-2 text-left text-sm font-medium hover:text-amber-200"><FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400"/><span>{node.title}</span></button><span className="text-[10px] text-muted-foreground">{index+1}</span></div>
    {prefs.detail==='synopsis'&&<p className={`mt-3 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground ${prefs.compact?'line-clamp-2':'line-clamp-6'}`}>{stripHtml(node.synopsis)||'Add a synopsis in Info.'}</p>}
    <div className="mt-3 flex items-center gap-2"><select aria-label={`Status for ${node.title}`} value={node.status||''} onChange={e=>state.updateNode('binder',node.id,{status:e.target.value})} className="min-w-0 flex-1 rounded border border-white/10 bg-muted px-1 py-1 text-[11px] text-muted-foreground"><option value="">No status</option>{novel.statuses.map(s=><option key={s}>{s}</option>)}</select><button aria-label={`Move ${node.title} earlier`} disabled={index===0} onClick={()=>state.moveNode('binder',node.id,'up')} className="text-muted-foreground disabled:opacity-20"><ArrowUp className="h-3.5 w-3.5"/></button><button aria-label={`Move ${node.title} later`} disabled={index===total-1} onClick={()=>state.moveNode('binder',node.id,'down')} className="text-muted-foreground disabled:opacity-20"><ArrowDown className="h-3.5 w-3.5"/></button></div>
    {!!node.children.length&&<button onClick={()=>state.setTimeline({rootId:node.id})} className="mt-2 text-xs text-amber-300">View {node.children.length} sub-notes →</button>}
  </article>;
  return <div className="flex h-full flex-col bg-background">
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-white/10 px-5 py-3"><div className="mr-auto"><h2 className="text-sm font-semibold text-foreground">{novel.title}</h2><p className="text-[11px] text-muted-foreground">Timeline · Binder order · one book</p></div><select aria-label="Timeline scope" value={root?.id||''} onChange={e=>state.setTimeline({rootId:e.target.value||null})} className="max-w-48 rounded border border-white/15 bg-muted px-2 py-1 text-xs"><option value="">Entire Binder</option>{containers.map(n=><option key={n.id} value={n.id}>{n.title}</option>)}</select><select aria-label="Timeline card content" value={prefs.detail} onChange={e=>state.setTimeline({detail:e.target.value as 'titles'|'synopsis'})} className="rounded border border-white/15 bg-muted px-2 py-1 text-xs"><option value="synopsis">Title + synopsis</option><option value="titles">Titles only</option></select><label className="flex items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" checked={prefs.compact} onChange={e=>state.setTimeline({compact:e.target.checked})}/>Compact</label></div>
    <div className="flex min-h-0 flex-1 gap-4 overflow-auto p-5 kachamak-scroll">{groups.map((group,index)=><section key={group.id} className={`flex shrink-0 flex-col ${prefs.compact?'w-60':'w-72'}`}><div className="mb-3 flex items-center gap-2 border-b border-amber-500/30 pb-2"><span className="text-[11px] text-amber-500/60">{String(index+1).padStart(2,'0')}</span><button onClick={()=>open(group.id)} className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:text-amber-200">{group.title}</button><button aria-label={`Add note to ${group.title}`} onClick={()=>{state.addNode('binder',group.id);state.setTab('binder');state.setView('write');}} className="text-muted-foreground hover:text-amber-300"><Plus className="h-4 w-4"/></button></div><div className="space-y-3">{group.children.length?group.children.map((n,i)=>card(n,i,group.children.length)):card(group,index,groups.length)}</div></section>)}
      {!groups.length&&<div className="m-auto max-w-sm text-center"><h3 className="text-lg text-foreground">Plan your next chapter</h3><p className="my-3 text-sm leading-relaxed text-muted-foreground">Your Binder notes appear here in the same order. Use any structure that suits your story.</p><button className="rounded border border-amber-500/40 px-4 py-2 text-sm text-amber-200" onClick={()=>{state.addNode('binder',root?.id||null);state.setTab('binder');state.setView('write');}}>Create a note</button></div>}
    </div>
  </div>;
}
