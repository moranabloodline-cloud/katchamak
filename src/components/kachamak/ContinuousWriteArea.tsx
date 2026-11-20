'use client';
import {useEffect,useId,useRef,useState} from 'react';
import DOMPurify from 'dompurify';
import {RulerRow} from './WriteArea';
import {NotePreview} from './NotePreview';
import {useKachamak} from '@/lib/kachamak/store';
import {continuousSelection} from '@/lib/kachamak/continuous-manuscript';
import type {SectionKey} from '@/lib/kachamak/types';
import {PageSurface,useTabPageDefaults} from './PageSurface';
import {noteAppearance} from '@/lib/kachamak/page-format';
import {noteAnchorStyles} from '@/lib/kachamak/note-links';
import {trimWordSelection} from '@/lib/kachamak/editor-selection';
import {wrapRootParagraphs} from '@/lib/kachamak/editor-paragraphs';

export function ContinuousWriteArea({section,rootId}:{section:SectionKey;rootId?:string}) {
  const {defaults,settings}=useTabPageDefaults();
  const scope='continuous'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
  const novels=useKachamak(s=>s.novels),projectId=useKachamak(s=>s.activeNovelId);
  const selectedId=useKachamak(s=>s.selectedNodeId);
  const zoom=useKachamak(s=>s.midZoom??1);
  const novel=novels.find(n=>n.id===projectId),notes=continuousSelection(novel?.sections[section]??[],selectedId,rootId);
  const scrollRef=useRef<HTMLDivElement>(null),[preview,setPreview]=useState<string|null>(null);
  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=0;},[selectedId,section,rootId,projectId]);
  return <div data-note-link-scope={scope} onDoubleClick={event=>{if(!event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey)trimWordSelection((event.target as Element).closest<HTMLElement>('.kachamak-editor'));}} className="flex h-full min-h-0 flex-col" style={{zoom}}><style>{noteAnchorStyles(novel,scope)}</style>
    <RulerRow node={notes.find(node=>node.id===selectedId)??notes[0]}/>
    <div ref={scrollRef} aria-label="Continuous manuscript · read only" className="min-h-0 flex-1 overflow-y-auto kachamak-scroll pb-[40vh]" style={{scrollbarGutter:'stable'}}>
      {notes.map(node=>{
        const appearance=noteAppearance(defaults,settings,node);
        return <section key={node.id} data-continuous-note={node.id} aria-label={node.title||'Untitled note'} className="px-6 py-6 [&+section]:border-t [&+section]:border-border/50">
        <PageSurface appearance={appearance}><h2 className="note-page-title mb-4 text-center font-bold [overflow-wrap:anywhere]" style={{color:node.color || undefined}}>{node.title||'Untitled note'}</h2><div ref={element=>{if(element)wrapRootParagraphs(element);}} contentEditable={false} data-readonly-note={node.id} className="kachamak-editor text-foreground" onClick={event=>{const anchor=(event.target as Element).closest('a[href^="#note/"]');if(anchor){event.preventDefault();setPreview(anchor.getAttribute('href')!.slice(6));}}} dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(node.content||'',{FORBID_TAGS:['style','script','iframe','object','embed'],FORBID_ATTR:['srcdoc']})}}/></PageSurface>
      </section>;})}
      {!notes.length&&<p className="p-10 text-center text-sm text-muted-foreground">No notes in this view.</p>}
    </div>
    <NotePreview noteId={preview} onClose={()=>setPreview(null)}/>
  </div>;
}
