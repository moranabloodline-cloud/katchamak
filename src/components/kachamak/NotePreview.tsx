'use client';
import {useKachamak} from '@/lib/kachamak/store';
import {indexNotes} from '@/lib/kachamak/knowledge';
import {openProjectNote} from '@/lib/kachamak/note-navigation';
import {stripHtml} from '@/lib/kachamak/utils';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';

export function NotePreview({noteId,onClose}:{noteId:string|null;onClose:()=>void}) {
  const novel=useKachamak(s=>s.novels.find(n=>n.id===s.activeNovelId));
  const entry=novel&&noteId?indexNotes(novel).find(n=>n.node.id===noteId):null;
  return <Dialog open={!!noteId} onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="max-h-[80vh] overflow-auto border-white/15 bg-background text-foreground"><DialogHeader><DialogTitle>{entry?.node.title||'Unavailable note'}</DialogTitle><DialogDescription className="sr-only">Preview a linked note while keeping your current text open.</DialogDescription></DialogHeader>{entry?<>
    <p className="text-xs text-muted-foreground">{entry.path}</p>
    {!!entry.node.aliases?.length&&<p className="text-xs text-muted-foreground">Also known as: {entry.node.aliases.join(' · ')}</p>}
    {!!entry.node.synopsis&&<p className="whitespace-pre-wrap text-sm font-medium">{stripHtml(entry.node.synopsis)}</p>}
    <p className="max-h-72 overflow-auto whitespace-pre-wrap text-sm leading-relaxed">{stripHtml(entry.node.content).slice(0,6000)||'This note is empty. Open it to start writing.'}</p>
    <div className="flex flex-wrap gap-2"><button className="rounded bg-amber-400 px-4 py-2 text-sm text-black" onClick={()=>{if(openProjectNote(entry.node.id))onClose();}}>Open in workspace</button><button className="rounded border border-white/15 px-4 py-2 text-sm" onClick={()=>{if(openProjectNote(entry.node.id,true))onClose();}}>Open beside</button></div>
  </>:<p className="text-sm text-muted-foreground">This note may be in Trash. Your link has been kept.</p>}</DialogContent></Dialog>;
}
