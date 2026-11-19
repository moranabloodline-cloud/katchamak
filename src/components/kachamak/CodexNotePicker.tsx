'use client';
import {useEffect,useMemo,useState} from 'react';
import {FileText,Plus} from 'lucide-react';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {useKachamak} from '@/lib/kachamak/store';
import {indexNotes,searchNoteTitles,type IndexedNote} from '@/lib/kachamak/knowledge';
import {iconByName} from '@/lib/kachamak/icons';
import type {NoteNode,SectionKey} from '@/lib/kachamak/types';

export function CodexNotePicker({node,section,field='links'}:{node:NoteNode;section:SectionKey;field?:'links'|'familyMembers'}){
  const novel=useKachamak(s=>s.novels.find(n=>n.id===s.activeNovelId));
  const label=field==='familyMembers'?'Add person from Codex':'Add Codex link';
  const update=useKachamak(s=>s.updateNode);
  const [open,setOpen]=useState(false),[query,setQuery]=useState('');
  useEffect(()=>{setOpen(false);setQuery('');},[node.id,novel?.id]);
  const groups=useMemo(()=>{
    if(!novel)return [];
    const index=indexNotes(novel).filter(e=>e.section==='codex');
    const available=searchNoteTitles(index,query).filter(e=>e.node.id!==node.id&&!(node[field]??[]).includes(e.node.id));
    const found=new Map(available.map(e=>[e.node.id,e]));
    return novel.sections.codex.map(root=>{
      const entries:IndexedNote[]=[];
      const visit=(note:NoteNode)=>{const entry=found.get(note.id);if(entry)entries.push(entry);note.children.forEach(visit);};
      visit(root);
      return {id:root.id,title:root.children.length?root.title:'',entries};
    }).filter(g=>g.entries.length);
  },[novel,node,field,query]);
  const link=(id:string)=>{
    // Read the current selection again so rapid clicks cannot overwrite another link.
    const state=useKachamak.getState();
    if(state.activeNovelId!==novel?.id)return;
    const current=state.novels.find(n=>n.id===novel?.id);
    const source=current&&indexNotes(current).find(e=>e.node.id===node.id&&e.section===section);
    if(source)update(section,node.id,{[field]:[...new Set([...(source.node[field]??[]),id])]});
    setOpen(false);setQuery('');
  };
  return <Popover open={open} onOpenChange={value=>{setOpen(value);if(!value)setQuery('');}}><PopoverTrigger asChild><button type="button" aria-label={label} title={label} className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-white/5 hover:text-foreground"><Plus className="h-3.5 w-3.5"/></button></PopoverTrigger><PopoverContent align="start" sideOffset={5} className="flex max-h-[min(32rem,var(--radix-popover-content-available-height))] w-64 max-w-[calc(100vw-24px)] flex-col gap-2 overflow-hidden border-border bg-popover p-2" aria-label="Link a Codex note"><input autoFocus aria-label="Search Codex" placeholder="Search" value={query} onChange={e=>setQuery(e.target.value)} className="h-8 w-full shrink-0 rounded border border-border bg-background/40 px-2 text-xs outline-none focus:border-amber-500/60"/><div className="min-h-0 overflow-y-auto kachamak-scroll">{groups.map(group=><section key={group.id} className="border-b border-border py-1 last:border-0">{group.title&&<h3 className="px-2 pb-1 pt-2 text-xs font-semibold text-muted-foreground">{group.title}</h3>}{group.entries.map(entry=>{const Icon=iconByName(entry.node.icon)??FileText;return <button type="button" key={entry.node.id} title={entry.path} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent focus-visible:bg-accent focus-visible:outline-none" onClick={()=>link(entry.node.id)}><Icon className="h-4 w-4 shrink-0" style={{color:entry.node.color||undefined}}/><span className="min-w-0 truncate">{entry.node.title||'Untitled note'}</span></button>;})}</section>)}{!groups.length&&<p className="px-2 py-3 text-xs text-muted-foreground">{query.trim()?'No matching Codex notes.':'No Codex notes available to link.'}</p>}</div></PopoverContent></Popover>;
}
