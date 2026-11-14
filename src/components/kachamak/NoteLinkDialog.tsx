'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useKachamak} from '@/lib/kachamak/store';
import {indexNotes,searchNotes,type IndexedNote} from '@/lib/kachamak/knowledge';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {createLinkedCodexNote} from '@/lib/kachamak/create-linked-note';
import {toast} from 'sonner';
export function NoteLinkDialog() {
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[url,setUrl]=useState(''),[canInsert,setCanInsert]=useState(false);
  const range=useRef<Range|null>(null),editor=useRef<HTMLElement|null>(null);
  const context=useRef<{projectId:string;sourceId:string}|null>(null);
  const [newTitle,setNewTitle]=useState(''),[parentId,setParentId]=useState('');
  const novel=useKachamak(s=>s.novels.find(n=>n.id===s.activeNovelId));
  const index=useMemo(()=>novel?indexNotes(novel):[],[novel]);
  const eligible=index.filter(n=>n.node.id!==context.current?.sourceId);
  const results=query.trim()?searchNotes(eligible,query).slice(0,15):eligible.slice(0,15);
  useEffect(()=>{
    const show=()=>{
      const selection=window.getSelection(),r=selection?.rangeCount?selection.getRangeAt(0):null;
      const el=r?.commonAncestorContainer.nodeType===1?r.commonAncestorContainer as Element:r?.commonAncestorContainer.parentElement;
      editor.current=el?.closest<HTMLElement>('.kachamak-editor')??null;
      range.current=editor.current&&r?r.cloneRange():null;
      const state=useKachamak.getState(),sourceId=editor.current?.dataset.noteId;
      context.current=state.activeNovelId&&sourceId?{projectId:state.activeNovelId,sourceId}:null;
      const text=selection?.toString().trim().slice(0,200)||'';
      setCanInsert(!!range.current);setQuery(text);setNewTitle(text);setParentId('');setUrl('');setOpen(true);
    };
    document.addEventListener('katchamak-link',show);return()=>document.removeEventListener('katchamak-link',show);
  },[]);
  const insert=(href:string,target?:IndexedNote)=>{
    if(!range.current||!editor.current?.isConnected)return false;
    if(context.current&&useKachamak.getState().activeNovelId!==context.current.projectId){toast.error('Return to the original project to insert this link.');return false;}
    if(!target&&!/^https?:\/\/|^mailto:/i.test(href)){toast.error('Use an https://, http:// or mailto: link.');return;}
    const selection=window.getSelection();editor.current.focus();selection?.removeAllRanges();selection?.addRange(range.current);
    const link=document.createElement('a');link.setAttribute('href',href);if(!range.current.collapsed){link.append(range.current.cloneContents());link.querySelectorAll('a').forEach(a=>a.replaceWith(...Array.from(a.childNodes)));}else link.textContent=target?.node.title||href;
    // Chromium trims ordinary boundary spaces in insertHTML. Keep the selected separation intact.
    const walker=document.createTreeWalker(link,NodeFilter.SHOW_TEXT),texts:Text[]=[];
    let textNode:Node|null;while((textNode=walker.nextNode()))texts.push(textNode as Text);
    if(texts.length){texts[0].data=texts[0].data.replace(/^[ \t]+/,s=>s.replace(/ /g,'\u00a0'));const last=texts.at(-1)!;last.data=last.data.replace(/[ \t]+$/,s=>s.replace(/ /g,'\u00a0'));}
    if(target){link.dataset.katchamakNote=target.node.id;link.title=target.node.title+' · '+target.path+' · Click to preview · Ctrl+click to open';}
    if(!document.execCommand('insertHTML',false,link.outerHTML)){toast.error('The link could not be inserted. Your text is unchanged.');return false;}editor.current.dispatchEvent(new Event('input',{bubbles:true}));setOpen(false);return true;
  };
  const create=()=>{
    if(!context.current||!range.current||!editor.current?.isConnected)return;
    const id=createLinkedCodexNote(context.current.projectId,context.current.sourceId,newTitle,parentId||null);
    if(!id){toast.error('The note could not be created. Check its name and location.');return;}
    const current=useKachamak.getState().novels.find(n=>n.id===context.current!.projectId);
    const entry=current?indexNotes(current).find(n=>n.node.id===id):null;
    if(entry&&insert('#note/'+id,entry))toast.success('Codex note created and linked. Continue writing or click its link to open it.');
    else toast.info('The new note is in Codex and linked in Details. Insert its text link again when ready.');
  };
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent onCloseAutoFocus={event=>{event.preventDefault();editor.current?.focus();}} className="max-h-[80vh] overflow-auto border-white/15 bg-background text-foreground"><DialogHeader><DialogTitle>Insert a link</DialogTitle><DialogDescription className="sr-only">Choose a project note, create a blank Codex note or insert a website link at your selection.</DialogDescription></DialogHeader>{!canInsert&&<p className="text-sm text-muted-foreground">Place the cursor or select text in an editor, then use Link or Ctrl+K.</p>}<label className="text-xs font-semibold" htmlFor="insert-note-link">Link to a project note</label><input id="insert-note-link" placeholder="Search titles, aliases and content…" value={query} onChange={e=>setQuery(e.target.value)} className="rounded border border-white/15 bg-transparent p-2 text-sm"/><ul className="max-h-64 space-y-1 overflow-auto">{results.map(entry=><li key={entry.node.id}><button disabled={!canInsert} className="w-full rounded p-2 text-left text-sm hover:bg-white/5 disabled:opacity-40" onClick={()=>insert('#note/'+entry.node.id,entry)}><span className="block text-sky-400">{entry.node.title}</span><span className="text-xs text-muted-foreground">{entry.path}</span></button></li>)}{!results.length&&<li className="text-sm text-muted-foreground">No matching notes.</li>}</ul>{context.current&&<div className="space-y-2 rounded-lg border border-amber-400/25 p-3"><h3 className="text-sm font-semibold">Create a Codex note</h3><p className="text-xs text-muted-foreground">A blank note linked to this text. Keep writing here.</p><input aria-label="New Codex note title" placeholder="Name of your new note" maxLength={200} value={newTitle} onChange={e=>setNewTitle(e.target.value)} className="w-full rounded border border-white/15 bg-transparent p-2 text-sm"/><select aria-label="New Codex note location" value={parentId} onChange={e=>setParentId(e.target.value)} className="w-full rounded border border-white/15 bg-muted p-2 text-sm"><option value="">Codex · top level</option>{index.filter(n=>n.section==='codex').map(n=><option key={n.node.id} value={n.node.id}>{n.path} / {n.node.title}</option>)}</select><button disabled={!canInsert||!newTitle.trim()} onClick={create} className="rounded bg-amber-400 px-3 py-2 text-sm text-black disabled:opacity-40">Create and link</button></div>}<div className="border-t border-white/10 pt-3"><label className="text-xs font-semibold" htmlFor="external-link">Or link to a website</label><div className="mt-2 flex gap-2"><input id="external-link" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://…" className="min-w-0 flex-1 rounded border border-white/15 bg-transparent p-2 text-sm"/><button disabled={!canInsert||!url.trim()} onClick={()=>insert(url.trim())} className="rounded border border-white/15 px-3 text-sm disabled:opacity-40">Insert</button></div></div></DialogContent></Dialog>;
}
