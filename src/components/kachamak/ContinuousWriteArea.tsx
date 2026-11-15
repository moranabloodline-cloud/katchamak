'use client';
import {useEffect,useRef} from 'react';
import {EditorPage,RulerRow} from './WriteArea';
import {useKachamak} from '@/lib/kachamak/store';
import {continuousNotes} from '@/lib/kachamak/continuous-manuscript';
import type {SectionKey} from '@/lib/kachamak/types';

export function ContinuousWriteArea({section,rootId}:{section:SectionKey;rootId?:string}) {
  const novels=useKachamak(s=>s.novels),projectId=useKachamak(s=>s.activeNovelId);
  const selectedId=useKachamak(s=>s.selectedNodeId);
  const zoom=useKachamak(s=>s.midZoom??1),select=useKachamak(s=>s.select);
  const novel=novels.find(n=>n.id===projectId),notes=continuousNotes(novel?.sections[section]??[],'all',rootId);
  const scrollRef=useRef<HTMLDivElement>(null),pages=useRef(new Map<string,HTMLElement>());
  const jump=(id:string|null)=>{
    const page=id?pages.current.get(id):null;if(!page)return;
    // Editing a paragraph must never pull its caret or scroll position to the title.
    if(page.contains(document.activeElement))return;
    page.scrollIntoView?.({block:'start',inline:'nearest'});
  };
  useEffect(()=>{jump(selectedId);},[selectedId,section,rootId,projectId]);
  useEffect(()=>{
    // A second click on the same tree row also returns to that note.
    const click=(event:MouseEvent)=>{const row=(event.target as Element)?.closest?.('[role="treeitem"][data-note-id]');if(row)jump(row.getAttribute('data-note-id'));};
    document.addEventListener('click',click);return()=>document.removeEventListener('click',click);
  },[]);
  return <div className="flex h-full min-h-0 flex-col" style={{zoom}}>
    <RulerRow/>
    <div ref={scrollRef} aria-label="Continuous manuscript" className="min-h-0 flex-1 overflow-y-auto kachamak-scroll pb-[40vh]">
      {notes.map(node=><section key={node.id} ref={el=>{if(el)pages.current.set(node.id,el);else pages.current.delete(node.id);}} data-continuous-note={node.id} aria-label={node.title||'Untitled note'} onFocusCapture={event=>{if(event.currentTarget.contains(event.target as Node)&&useKachamak.getState().selectedNodeId!==node.id)select(node.id);}} className="scroll-mt-4 [&+section]:border-t [&+section]:border-border/50">
        <EditorPage node={node} section={section} continuous/>
      </section>)}
      {!notes.length&&<div className="p-10 text-center text-sm text-muted-foreground"><p>No notes in this view.</p><button type="button" className="mt-4 rounded border border-border px-3 py-2 hover:bg-muted" onClick={()=>useKachamak.getState().addNode(section,rootId??null,'doc')}>Create note</button></div>}
    </div>
  </div>;
}
