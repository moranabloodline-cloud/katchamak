'use client';
import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Link2, PanelsLeftRight, X } from 'lucide-react';
import { useKachamak } from '@/lib/kachamak/store';
import { contentText, flattenNotes, indexText, rangeForMatch, scanLinks, type NoteMatch } from '@/lib/kachamak/note-links';
import { findNodeInNovel, stripHtml } from '@/lib/kachamak/utils';

export function LinkHighlights({ editorRef, noteId }: { editorRef: RefObject<HTMLDivElement | null>; noteId: string }) {
  const novels=useKachamak(s=>s.novels), activeNovelId=useKachamak(s=>s.activeNovelId);
  const novel=novels.find(n=>n.id===activeNovelId), hit=novel?findNodeInNovel(novel,noteId):null;
  const prefix='codex'+useId().replace(/[^a-z0-9]/gi,'');
  const [matches,setMatches]=useState<NoteMatch[]>([]);
  const [popup,setPopup]=useState<{match:NoteMatch;x:number;y:number}|null>(null);
  const [listOpen,setListOpen]=useState(false);
  const boxRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const editor=editorRef.current;
    if(!editor || !novel || !hit) return;
    const style=document.createElement('style'); document.head.append(style);
    const keys:string[]=[];
    const registry=(globalThis.CSS as unknown as {highlights?: Map<string,unknown>})?.highlights;
    const HighlightClass=(globalThis as unknown as {Highlight?: new (...ranges: Range[])=>unknown}).Highlight;
    let ranged:{match:NoteMatch;range:Range}[]=[];
    const refresh=()=>{
      keys.splice(0).forEach(k=>registry?.delete(k));
      const {text,parts}=indexText(editor);
      const codex=flattenNotes(novel).filter(n=>n.section==='codex').map(n=>n.node);
      const found=scanLinks(text,codex,hit.node.linkChoices,noteId);
      setMatches(found); ranged=[];
      const rules:string[]=[];
      for(const [i,match] of found.entries()){
        if(match.explicit && !match.targetId) continue;
        const range=rangeForMatch(parts,match); if(!range) continue;
        ranged.push({match,range});
        if(!registry || !HighlightClass) continue;
        const target=codex.find(n=>n.id===match.targetId), name=prefix+i;
        const color=target?.color && /^#[0-9a-f]{3,8}$/i.test(target.color)?target.color:match.missing?'#f87171':'#dfb65b';
        registry.set(name,new HighlightClass(range)); keys.push(name);
        rules.push(`::highlight(${name}){color:${color};text-decoration:underline;text-decoration-style:${match.targetId?'solid':'dotted'};}`);
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
  },[novel,hit?.node.linkChoices,noteId,prefix,editorRef]);

  useEffect(()=>{
    if(!popup) return;
    const close=(event:Event)=>{if(event instanceof KeyboardEvent ? event.key==='Escape' : !boxRef.current?.contains(event.target as Node))setPopup(null);};
    document.addEventListener('pointerdown',close);document.addEventListener('keydown',close);
    return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',close);};
  },[popup]);
  useEffect(()=>{setPopup(null);setListOpen(false);},[noteId]);
  useEffect(()=>{setPopup(null);},[hit?.node.content]);
  if(!novel || !hit || !matches.length) return null;
  const choose=(match:NoteMatch,targetId:string|null|undefined)=>{
    const state=useKachamak.getState(), current=state.novels.find(n=>n.id===activeNovelId);
    const currentHit=current?findNodeInNovel(current,noteId):null;
    if(!currentHit || contentText(currentHit.node.content).slice(match.start,match.end)!==match.text)return;
    const choices=(currentHit.node.linkChoices||[]).filter(c=>c.start!==match.start || c.end!==match.end);
    if(targetId!==undefined)choices.push({start:match.start,end:match.end,text:match.text,targetId});
    state.updateNode(currentHit.section,noteId,{linkChoices:choices});setPopup(null);
  };
  const open=(id:string,beside=false)=>{
    const state=useKachamak.getState();
    if(beside){const sourcePane=state.activePane;state.setView('split');state.setActivePane(sourcePane==='a'?'b':'a');}
    else state.setView('write');
    state.setTab('codex');state.select(id);setPopup(null);
  };
  const target=popup?.match.targetId?findNodeInNovel(novel,popup.match.targetId)?.node:null;
  const count=matches.filter(m=>m.targetId&&!m.missing).length;
  const unresolved=matches.filter(m=>!m.explicit&&m.candidates.length>1).length;
  return <>
    <div className="mt-5 border-t border-white/10 pt-3 text-xs">
      <button type="button" onClick={()=>setListOpen(!listOpen)} className="flex items-center gap-2 text-muted-foreground hover:text-amber-300" aria-expanded={listOpen}><Link2 className="h-3.5 w-3.5"/>{count} Codex links{unresolved?` · ${unresolved} to choose`:''}</button>
      {listOpen&&<div className="mt-2 flex flex-wrap gap-2">{matches.map(m=><button key={`${m.start}-${m.end}`} type="button" onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setPopup({match:m,x:r.left,y:r.bottom+8});}} className="rounded-md border border-white/15 px-2 py-1 text-muted-foreground hover:border-amber-500/50">{m.text}{m.explicit&&!m.targetId?' · skipped':m.missing?' · missing':!m.targetId?' · choose':''}</button>)}</div>}
    </div>
    {popup&&createPortal(<div ref={boxRef} role="dialog" aria-label="Codex link" className="fixed z-[100] w-80 max-w-[calc(100vw-24px)] max-h-[70vh] overflow-auto rounded-xl border border-amber-500/30 bg-[#181818] p-4 text-sm text-stone-200 shadow-2xl" style={{left:Math.max(12,Math.min(popup.x,window.innerWidth-332)),top:Math.max(12,Math.min(popup.y,window.innerHeight-370))}}>
      <div className="mb-3 flex items-center gap-2"><Link2 className="h-4 w-4 text-amber-400"/><strong className="flex-1 truncate">{target?.title||popup.match.text}</strong><button aria-label="Close link preview" onClick={()=>setPopup(null)}><X className="h-4 w-4"/></button></div>
      {target?<><p className="mb-3 line-clamp-4 text-xs leading-relaxed text-muted-foreground">{stripHtml(target.synopsis||target.content)||'No description yet.'}</p><div className="mb-4 flex gap-2"><button className="flex items-center gap-1 rounded border border-white/15 px-2 py-1" onClick={()=>open(target.id)}><BookOpen className="h-3 w-3"/>Open</button><button className="flex items-center gap-1 rounded border border-white/15 px-2 py-1" onClick={()=>open(target.id,true)}><PanelsLeftRight className="h-3 w-3"/>Open beside</button></div></>:<p className="mb-3 text-xs text-muted-foreground">{popup.match.missing?'This linked note is in Trash or missing. Restore it to reconnect.':'Choose the meaning for this occurrence only.'}</p>}
      {popup.match.candidates.map(n=><button key={n.id} onClick={()=>choose(popup.match,n.id)} className="mb-1 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-white/10"><span className="h-2 w-2 rounded-full" style={{background:n.color||'#dfb65b'}}/>{n.title}</button>)}
      <div className="mt-3 flex gap-3 border-t border-white/10 pt-3 text-xs"><button onClick={()=>choose(popup.match,null)} className="text-muted-foreground hover:text-white">Skip this occurrence</button>{popup.match.explicit&&<button onClick={()=>choose(popup.match,undefined)} className="text-amber-300">Reset choice</button>}</div>
    </div>,document.body)}
  </>;
}
