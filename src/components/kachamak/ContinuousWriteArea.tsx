'use client';
import {useEffect,useRef,useState} from 'react';
import DOMPurify from 'dompurify';
import {RulerRow} from './WriteArea';
import {NotePreview} from './NotePreview';
import {useKachamak} from '@/lib/kachamak/store';
import {continuousSelection} from '@/lib/kachamak/continuous-manuscript';
import type {SectionKey} from '@/lib/kachamak/types';

export function ContinuousWriteArea({section,rootId}:{section:SectionKey;rootId?:string}) {
  const novels=useKachamak(s=>s.novels),projectId=useKachamak(s=>s.activeNovelId);
  const selectedId=useKachamak(s=>s.selectedNodeId);
  const zoom=useKachamak(s=>s.midZoom??1),font=useKachamak(s=>s.editorFont??'Segoe UI'),size=useKachamak(s=>s.editorSize??16),spacing=useKachamak(s=>s.editorSpacing??'1.5');
  const novel=novels.find(n=>n.id===projectId),notes=continuousSelection(novel?.sections[section]??[],selectedId,rootId);
  const scrollRef=useRef<HTMLDivElement>(null),[preview,setPreview]=useState<string|null>(null);
  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=0;},[selectedId,section,rootId,projectId]);
  return <div className="flex h-full min-h-0 flex-col" style={{zoom}}>
    <RulerRow/>
    <div ref={scrollRef} aria-label="Continuous manuscript · read only" className="min-h-0 flex-1 overflow-y-auto kachamak-scroll pb-[40vh]" style={{scrollbarGutter:'stable'}}>
      {notes.map(node=><section key={node.id} data-continuous-note={node.id} aria-label={node.title||'Untitled note'} className="px-6 py-6 [&+section]:border-t [&+section]:border-border/50">
        <div className="mx-auto w-full max-w-3xl"><h2 className="mb-4 text-2xl font-bold">{node.title||'Untitled note'}</h2><div contentEditable={false} data-readonly-note={node.id} className="kachamak-editor text-foreground" style={{fontFamily:`'${font}',system-ui,sans-serif`,fontSize:size,lineHeight:spacing}} onClick={event=>{const anchor=(event.target as Element).closest('a[href^="#note/"]');if(anchor){event.preventDefault();setPreview(anchor.getAttribute('href')!.slice(6));}}} dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(node.content||'',{FORBID_TAGS:['style','script','iframe','object','embed'],FORBID_ATTR:['srcdoc']})}}/></div>
      </section>)}
      {!notes.length&&<p className="p-10 text-center text-sm text-muted-foreground">No notes in this view.</p>}
    </div>
    <NotePreview noteId={preview} onClose={()=>setPreview(null)}/>
  </div>;
}
