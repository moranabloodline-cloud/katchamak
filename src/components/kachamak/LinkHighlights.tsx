'use client';
import { useEffect, useId, useMemo, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Link2, PanelsLeftRight, X } from 'lucide-react';
import {openProjectNote} from '@/lib/kachamak/note-navigation';
import { useKachamak } from '@/lib/kachamak/store';
import { contentText, flattenNotes, indexText, rangeForMatch, explicitLinks, type NoteMatch } from '@/lib/kachamak/note-links';
import { findNodeInNovel, stripHtml } from '@/lib/kachamak/utils';
import {groupLinkedNotes,inlineNoteIds} from '@/lib/kachamak/knowledge';
import {NotePreview} from './NotePreview';

export function LinkHighlights({ editorRef, noteId, colorize=true }: { editorRef: RefObject<HTMLDivElement | null>; noteId: string; colorize?:boolean }) {
  const novels=useKachamak(s=>s.novels), activeNovelId=useKachamak(s=>s.activeNovelId);
  const novel=novels.find(n=>n.id===activeNovelId), hit=novel?findNodeInNovel(novel,noteId):null;
  const prefix='codex'+useId().replace(/[^a-z0-9]/gi,'');
  const [matches,setMatches]=useState<NoteMatch[]>([]);
  const [popup,setPopup]=useState<{match:NoteMatch;x:number;y:number}|null>(null);
  const [listOpen,setListOpen]=useState(false);
  const [preview,setPreview]=useState<string|null>(null);
  const boxRef=useRef<HTMLDivElement>(null);
  const groups=useMemo(()=>{
    if(!novel||!hit)return [];
    const accepted=explicitLinks(contentText(hit.node.content),flattenNotes(novel).map(n=>n.node),hit.node.linkChoices,noteId);
    const ids=[...accepted.flatMap(match=>match.targetId&&!match.missing?[match.targetId]:[]),...inlineNoteIds(hit.node.content)];
    return groupLinkedNotes(novel,ids).map(group=>({...group,entries:group.entries.filter(entry=>entry.target)})).filter(group=>group.entries.length);
  },[novel,hit?.node.content,hit?.node.linkChoices,noteId]);

  useEffect(()=>{
    const editor=editorRef.current;
    if(!editor || !novel || !hit) return;
    if(!hit.node.linkChoices?.length){setMatches(previous=>previous.length?[]:previous);return;}
    const style=document.createElement('style'); document.head.append(style);
    const keys:string[]=[];
    const registry=(globalThis.CSS as unknown as {highlights?: Map<string,unknown>})?.highlights;
    const HighlightClass=(globalThis as unknown as {Highlight?: new (...ranges: Range[])=>unknown}).Highlight;
    let ranged:{match:NoteMatch;range:Range}[]=[];
    const refresh=()=>{
      keys.splice(0).forEach(k=>registry?.delete(k));
      const {text,parts}=indexText(editor);
      const codex=flattenNotes(novel).map(n=>n.node);
      const found=explicitLinks(text,codex,hit.node.linkChoices,noteId);
      setMatches(found); ranged=[];
      const rules:string[]=[];
      for(const [i,match] of found.entries()){
        if(match.explicit && !match.targetId) continue;
        const range=rangeForMatch(parts,match); if(!range) continue;
        ranged.push({match,range});
        if(!registry || !HighlightClass) continue;
        const target=codex.find(n=>n.id===match.targetId), name=prefix+i;
        const color=target?.color && /^#[0-9a-f]{3,8}$/i.test(target.color)?target.color:match.missing?'#f87171':'#60a5fa';
        registry.set(name,new HighlightClass(range)); keys.push(name);
        rules.push(`::highlight(${name}){color:${colorize?color:'inherit'};text-decoration:underline dotted var(--note-link-line) 1px;}`);
      }
      style.textContent=rules.join('\n');
    };
    let timer:ReturnType<typeof setTimeout>;
    const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(refresh,120);});
    observer.observe(editor,{subtree:true,childList:true,characterData:true}); refresh();
    const click=(event:MouseEvent)=>{
      if(!window.getSelection()?.isCollapsed) return;
      const found=ranged.find(r=>Array.from(r.range.getClientRects()).some(rect=>event.clientX>=rect.left && event.clientX<=rect.right && event.clientY>=rect.top && event.clientY<=rect.bottom));
      if(found){setPopup({match:found.match,x:event.clientX,y:event.clientY+12});setListOpen(false);}
    };
    editor.addEventListener('click',click);
    return()=>{clearTimeout(timer);observer.disconnect();editor.removeEventListener('click',click);keys.forEach(k=>registry?.delete(k));style.remove();};
  },[novel,hit?.node.linkChoices,noteId,prefix,editorRef,colorize]);

  useEffect(()=>{
    if(!popup) return;
    const close=(event:Event)=>{if(event instanceof KeyboardEvent ? event.key==='Escape' : !boxRef.current?.contains(event.target as Node))setPopup(null);};
    document.addEventListener('pointerdown',close);document.addEventListener('keydown',close);
    return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',close);};
  },[popup]);
  useEffect(()=>{setPopup(null);setListOpen(false);setPreview(null);},[noteId,activeNovelId]);
  useEffect(()=>{setPopup(null);},[hit?.node.content]);
  if(!novel || !hit || (!matches.length&&!groups.length)) return null;
  const choose=(match:NoteMatch,targetId:string|null|undefined)=>{
    const state=useKachamak.getState(), current=state.novels.find(n=>n.id===activeNovelId);
    const currentHit=current?findNodeInNovel(current,noteId):null;
    if(!currentHit || contentText(currentHit.node.content).slice(match.start,match.end)!==match.text)return;
    const choices=(currentHit.node.linkChoices||[]).filter(c=>c.start!==match.start || c.end!==match.end);
    if(targetId!==undefined)choices.push({start:match.start,end:match.end,text:match.text,targetId});
    state.updateNode(currentHit.section,noteId,{linkChoices:choices});setPopup(null);
  };
  const open=(id:string,beside=false)=>{
    if(openProjectNote(id,beside))setPopup(null);
  };
  const target=popup?.match.targetId?findNodeInNovel(novel,popup.match.targetId)?.node:null;
  const count=groups.reduce((total,group)=>total+group.entries.length,0);
  return <>
    {count>0&&<div className="mt-5 border-t border-white/10 pt-3 text-xs">
      <button type="button" onClick={()=>setListOpen(!listOpen)} className="flex items-center gap-2 text-muted-foreground hover:text-amber-300" aria-expanded={listOpen}><Link2 className="h-3.5 w-3.5"/>{count} note links</button>
      {listOpen&&<div className="mt-3 space-y-4">{groups.map(group=><section key={group.id} aria-label={group.title||group.entries[0].target?.path.split(' / ')[0]}><h3 className="mb-2 border-b border-white/10 pb-2 font-semibold text-muted-foreground" style={{color:group.color || undefined}}>{group.title||group.entries[0].target?.path.split(' / ')[0]}</h3><ul className="space-y-2 pl-3">{group.entries.map(({id,target})=><li key={id}><button type="button" onClick={()=>setPreview(id)} className="text-left hover:underline" style={{color:target?.node.color&&/^#[0-9a-f]{3,8}$/i.test(target.node.color)?target.node.color:'#60a5fa'}}>{target?.node.title}</button></li>)}</ul></section>)}</div>}
    </div>}
    <NotePreview noteId={preview} onClose={()=>setPreview(null)}/>
    {popup&&createPortal(<div ref={boxRef} role="dialog" aria-label="Note link" className="fixed z-[100] w-80 max-w-[calc(100vw-24px)] max-h-[70vh] overflow-auto rounded-xl border border-amber-500/30 bg-[#181818] p-4 text-sm text-stone-200 shadow-2xl" style={{left:Math.max(12,Math.min(popup.x,window.innerWidth-332)),top:Math.max(12,Math.min(popup.y,window.innerHeight-370))}}>
      <div className="mb-3 flex items-center gap-2"><Link2 className="h-4 w-4 text-amber-400"/><strong title={target?.title||popup.match.text} className="min-w-0 flex-1 truncate text-center">{target?.title||popup.match.text}</strong><button aria-label="Close link preview" onClick={()=>setPopup(null)}><X className="h-4 w-4"/></button></div>
      {target?<><p className="mb-3 line-clamp-4 text-xs leading-relaxed text-muted-foreground">{stripHtml(target.synopsis||target.content)||'No description yet.'}</p><div className="mb-4 flex gap-2"><button className="flex items-center gap-1 rounded border border-white/15 px-2 py-1" onClick={()=>open(target.id)}><BookOpen className="h-3 w-3"/>Open</button><button className="flex items-center gap-1 rounded border border-white/15 px-2 py-1" onClick={()=>open(target.id,true)}><PanelsLeftRight className="h-3 w-3"/>Open beside</button></div></>:<p className="mb-3 text-xs text-muted-foreground">{popup.match.missing?'This linked note is in Trash or missing. Restore it to reconnect.':'Choose the meaning for this occurrence only.'}</p>}
      {popup.match.candidates.map(n=><button key={n.id} onClick={()=>choose(popup.match,n.id)} className="mb-1 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-white/10"><span className="h-2 w-2 rounded-full" style={{background:n.color||'#dfb65b'}}/>{n.title}</button>)}
      <div className="mt-3 flex gap-3 border-t border-white/10 pt-3 text-xs"><button onClick={()=>choose(popup.match,null)} className="text-muted-foreground hover:text-white">Skip this occurrence</button>{popup.match.explicit&&<button onClick={()=>choose(popup.match,undefined)} className="text-amber-300">Reset choice</button>}</div>
    </div>,document.body)}
  </>;
}
