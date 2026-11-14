'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useKachamak} from '@/lib/kachamak/store';
import {indexNotes,searchNotes,type IndexedNote} from '@/lib/kachamak/knowledge';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {toast} from 'sonner';
export function NoteLinkDialog() {
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[url,setUrl]=useState(''),[canInsert,setCanInsert]=useState(false);
  const range=useRef<Range|null>(null),editor=useRef<HTMLElement|null>(null);
  const novel=useKachamak(s=>s.novels.find(n=>n.id===s.activeNovelId));
  const index=useMemo(()=>novel?indexNotes(novel):[],[novel]);
  const results=query.trim()?searchNotes(index,query).slice(0,15):index.slice(0,15);
  useEffect(()=>{
    const show=()=>{const selection=window.getSelection();const r=selection?.rangeCount?selection.getRangeAt(0):null;const el=r?.commonAncestorContainer.nodeType===1?r.commonAncestorContainer as Element:r?.commonAncestorContainer.parentElement;editor.current=el?.closest<HTMLElement>('.kachamak-editor')??null;range.current=editor.current&&r?r.cloneRange():null;setCanInsert(!!range.current);setQuery('');setUrl('');setOpen(true);};
    document.addEventListener('katchamak-link',show);return()=>document.removeEventListener('katchamak-link',show);
  },[]);
  const insert=(href:string,target?:IndexedNote)=>{
    if(!range.current||!editor.current?.isConnected)return;
    if(!target&&!/^https?:\/\/|^mailto:/i.test(href)){toast.error('Use an https://, http:// or mailto: link.');return;}
    const selection=window.getSelection();editor.current.focus();selection?.removeAllRanges();selection?.addRange(range.current);
    const link=document.createElement('a');link.setAttribute('href',href);link.textContent=selection?.toString()||target?.node.title||href;
    if(target){link.dataset.katchamakNote=target.node.id;link.title=target.node.title+' · '+target.path+' · Ctrl+click to open';}
    document.execCommand('insertHTML',false,link.outerHTML);editor.current.dispatchEvent(new Event('input',{bubbles:true}));setOpen(false);
  };
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent onCloseAutoFocus={event=>{event.preventDefault();editor.current?.focus();}} className="max-h-[80vh] overflow-auto border-white/15 bg-background text-foreground"><DialogHeader><DialogTitle>Insert a link</DialogTitle></DialogHeader>{!canInsert&&<p className="text-sm text-muted-foreground">Place the cursor or select text in an editor, then use Link or Ctrl+K.</p>}<label className="text-xs font-semibold" htmlFor="insert-note-link">Link to a project note</label><input id="insert-note-link" placeholder="Search titles, aliases and content…" value={query} onChange={e=>setQuery(e.target.value)} className="rounded border border-white/15 bg-transparent p-2 text-sm"/><ul className="max-h-64 space-y-1 overflow-auto">{results.map(entry=><li key={entry.node.id}><button disabled={!canInsert} className="w-full rounded p-2 text-left text-sm hover:bg-white/5 disabled:opacity-40" onClick={()=>insert('#note/'+entry.node.id,entry)}><span className="block text-sky-400">{entry.node.title}</span><span className="text-xs text-muted-foreground">{entry.path}</span></button></li>)}{!results.length&&<li className="text-sm text-muted-foreground">No matching notes.</li>}</ul><div className="border-t border-white/10 pt-3"><label className="text-xs font-semibold" htmlFor="external-link">Or link to a website</label><div className="mt-2 flex gap-2"><input id="external-link" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://…" className="min-w-0 flex-1 rounded border border-white/15 bg-transparent p-2 text-sm"/><button disabled={!canInsert||!url.trim()} onClick={()=>insert(url.trim())} className="rounded border border-white/15 px-3 text-sm disabled:opacity-40">Insert</button></div></div></DialogContent></Dialog>;
}
