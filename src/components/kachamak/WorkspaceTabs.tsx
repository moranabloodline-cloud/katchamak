'use client';
import { useState } from 'react';
import { Plus, X, FolderOpen } from 'lucide-react';
import { useKachamak } from '@/lib/kachamak/store';
import { findNodeInNovel } from '@/lib/kachamak/utils';
import { TABS, type Novel, type SectionKey, type TabKey } from '@/lib/kachamak/types';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

export function WorkspaceTabs({novel}:{novel:Novel}) {
  const active=useKachamak(s=>s.activeTab), setTab=useKachamak(s=>s.setTab), closeTab=useKachamak(s=>s.closeTab);
  const [name,setName]=useState(''), [open,setOpen]=useState(false);
  const fixed=['binder','codex','trash'];
  const tabs=[...TABS.filter(t=>fixed.includes(t.key)),...TABS.filter(t=>!fixed.includes(t.key)&&!novel.hiddenSections?.includes(t.key as SectionKey)),...(novel.openNoteTabs||[]).flatMap(id=>{const hit=findNodeInNovel(novel,id);return hit?[{key:`note:${id}` as TabKey,label:hit.node.title}]:[];})];
  return <nav aria-label="Workspace sections" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-2">
    {tabs.map(t=><div key={t.key} className={`flex shrink-0 items-center rounded-md border ${active===t.key?'border-[#ad7e2e]/70 bg-[#3a2c18] text-[#fbe4a6]':'border-transparent text-muted-foreground'}`}>
      <button type="button" onClick={()=>setTab(t.key)} aria-current={active===t.key?'page':undefined} title={t.label} className="max-w-44 truncate whitespace-nowrap px-2.5 py-1 text-sm hover:text-white">{t.label}</button>
      {!fixed.includes(t.key)&&<button type="button" title="Close tab — keeps all notes" aria-label={`Close ${t.label} tab`} onClick={()=>closeTab(t.key)} className="mr-1 rounded p-0.5 hover:bg-white/10"><X className="h-3 w-3"/></button>}
    </div>)}
    <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><button aria-label="Open workspace tab" title="Open workspace tab" className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-white/10"><Plus className="h-4 w-4"/></button></PopoverTrigger><PopoverContent align="start" className="w-72 border-white/15 bg-[#1b1b1b] p-3">
      <p className="text-sm font-medium">Your workspace</p><p className="my-2 text-xs leading-relaxed text-muted-foreground">Open any Binder note as a tab from its ••• menu. Closing a tab keeps its notes.</p>
      <form className="flex gap-2" onSubmit={e=>{e.preventDefault();if(!name.trim())return;const state=useKachamak.getState();const id=state.addNode('binder',null,'doc',name.trim());if(id){state.updateNode('binder',id,{icon:'folder'});state.openNoteTab(id);state.select(id);state.setRenamingNode(null);}setName('');setOpen(false);}}><input aria-label="New folder tab name" placeholder="Research, World, Marketing…" value={name} onChange={e=>setName(e.target.value)} className="min-w-0 flex-1 rounded border border-white/15 bg-black/20 px-2 py-1.5 text-xs"/><button className="rounded bg-amber-400 px-2 text-xs text-black">Create</button></form>
      {!!novel.hiddenSections?.length&&<div className="mt-3 border-t border-white/10 pt-2">{TABS.filter(t=>novel.hiddenSections?.includes(t.key as SectionKey)).map(t=><button key={t.key} className="flex w-full items-center gap-2 rounded p-2 text-left text-xs hover:bg-white/10" onClick={()=>{useKachamak.getState().showSection(t.key as SectionKey);setOpen(false);}}><FolderOpen className="h-3.5 w-3.5"/>Show {t.label}</button>)}</div>}
    </PopoverContent></Popover>
  </nav>;
}
