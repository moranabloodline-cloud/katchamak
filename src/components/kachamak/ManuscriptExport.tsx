'use client';
import {useEffect,useState} from 'react';
import DOMPurify from 'dompurify';
import {useKachamak} from '@/lib/kachamak/store';
import {manuscriptNotes,manuscriptHtml,manuscriptMarkdown,manuscriptWords} from '@/lib/kachamak/manuscript-export';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {toast} from 'sonner';
export function ManuscriptExport({open,onOpenChange}:{open:boolean;onOpenChange:(v:boolean)=>void}) {
  const novel=useKachamak(s=>s.novels.find(n=>n.id===s.activeNovelId));
  const [selected,setSelected]=useState<Set<string>>(new Set());
  useEffect(()=>{if(open&&novel)setSelected(new Set(manuscriptNotes(novel).map(n=>n.node.id)));},[open,novel?.id]);
  if(!novel)return null;
  const notes=manuscriptNotes(novel);
  const included=notes.filter(n=>selected.has(n.node.id)).length;
  const download=(format:'html'|'md')=>{
    const safe = {...novel, sections:{...novel.sections,binder:novel.sections.binder.map(function clean(node): typeof node {return {...node,content:DOMPurify.sanitize(node.content,{FORBID_TAGS:['style','script','iframe','object','embed']}),children:node.children.map(clean)};})}};
    const text=format==='html'?'<!doctype html>\n'+DOMPurify.sanitize(manuscriptHtml(safe,selected),{WHOLE_DOCUMENT:true,ADD_TAGS:['style']}):manuscriptMarkdown(safe,selected);
    const blob=new Blob([text],{type:format==='html'?'text/html;charset=utf-8':'text/markdown;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(novel.title.replace(/[<>:"/\\|?*]/g,'_')||'Manuscript')+'.'+format;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast.success('Manuscript downloaded.');
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[85vh] overflow-auto border-white/15 bg-background text-foreground"><DialogHeader><DialogTitle>Export manuscript</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Compile selected Binder notes in their current order. Codex and research stay in your project backup.</p><div className="flex justify-between text-xs"><span>{included} notes · {manuscriptWords(novel,selected).toLocaleString()} words</span><span className="flex gap-3"><button onClick={()=>setSelected(new Set(notes.map(n=>n.node.id)))} className="underline">Select all</button><button onClick={()=>setSelected(new Set())} className="underline">Clear</button></span></div><ul className="max-h-72 space-y-1 overflow-auto rounded border border-white/10 p-2">{notes.map(({node,depth})=><li key={node.id} style={{paddingLeft:Math.min(depth,10)*12}}><label className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={selected.has(node.id)} onChange={e=>setSelected(current=>{const next=new Set(current);if(e.target.checked)next.add(node.id);else next.delete(node.id);return next;})}/><span className="truncate">{node.title}</span></label></li>)}</ul>{!notes.length&&<p className="text-sm text-muted-foreground">Add manuscript notes in Binder first.</p>}<div className="flex gap-2"><button disabled={!included} className="rounded bg-amber-400 px-4 py-2 text-sm text-black disabled:opacity-40" onClick={()=>download('html')}>Download HTML</button><button disabled={!included} className="rounded border border-white/15 px-4 py-2 text-sm disabled:opacity-40" onClick={()=>download('md')}>Download Markdown</button></div><p className="text-xs text-muted-foreground">HTML keeps rich formatting and can be opened in a browser or Word. Markdown is plain text with portable formatting. Your source notes stay intact.</p></DialogContent></Dialog>;
}
