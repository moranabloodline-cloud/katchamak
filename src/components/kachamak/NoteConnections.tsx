'use client';
import {useDeferredValue,useEffect,useMemo,useState} from 'react';
import {useKachamak} from '@/lib/kachamak/store';
import type {NoteNode,SectionKey} from '@/lib/kachamak/types';
import {indexNotes,matchName,referenceTo,searchNotes,type IndexedNote} from '@/lib/kachamak/knowledge';
import {linkKnownNames} from '@/lib/kachamak/link-known-names';
import {toast} from 'sonner';
import {stripHtml} from '@/lib/kachamak/utils';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';

export function NoteConnections({node,section,mode}:{node:NoteNode;section:SectionKey;mode:'details'|'mentions'}) {
  const novel=useKachamak(s=>s.novels.find(n=>n.id===s.activeNovelId));
  const deferred=useDeferredValue(novel);
  const index=useMemo(()=>deferred?indexNotes(deferred):[],[deferred]);
  const [query,setQuery]=useState(''),[aliases,setAliases]=useState(''),[preview,setPreview]=useState<string|null>(null),[aliasDirty,setAliasDirty]=useState(false);
  const update=useKachamak(s=>s.updateNode);
  useEffect(()=>{setAliases((node.aliases??[]).join('\n'));setAliasDirty(false);setQuery('');},[node.id]);
  useEffect(()=>{if(!aliasDirty)setAliases((node.aliases??[]).join('\n'));},[node.aliases,aliasDirty]);
  const selected=index.find(n=>n.node.id===node.id);
  const outgoing=(node.links??[]).map(id=>({id,target:index.find(n=>n.node.id===id)}));
  const incoming=mode==='mentions'?index.filter(n=>n.node.id!==node.id).map(n=>referenceTo(n,node)).filter(n=>n!==null):[];
  const mentioned=mode==='mentions'&&selected?index.filter(n=>n.section==='codex'&&n.node.id!==node.id).map(n=>({target:n,match:matchName(selected.text,n.node)})).filter(n=>n.match):[];
  const results=searchNotes(index,query,node.id).filter(n=>!(node.links??[]).includes(n.node.id)).slice(0,12);
  const target=index.find(n=>n.node.id===preview);
  const open=(entry:IndexedNote)=>{const s=useKachamak.getState();s.setTab(entry.section);s.select(entry.node.id);setPreview(null);};
  const row=(entry:IndexedNote,detail?:string)=><button type="button" onClick={()=>setPreview(entry.node.id)} className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-xs hover:bg-white/5"><span className="block font-medium text-sky-400">{entry.node.title}</span><span className="mt-1 block truncate text-muted-foreground">{entry.path}</span>{detail&&<span className="mt-1 block line-clamp-2 text-muted-foreground">{detail}</span>}</button>;
  return <div className="space-y-5">
    {mode==='details'?<>
      <section><h3 className="mb-2 text-xs font-semibold">Linked notes</h3>{!outgoing.length&&<p className="text-xs text-muted-foreground">Connect this note to characters, chapters, research or any other note.</p>}<ul className="space-y-2">{outgoing.map(({id,target})=><li key={id} className="flex items-center gap-1">{target?row(target):<span className="flex-1 text-xs text-muted-foreground">Missing note — it may be in Trash.</span>}<button aria-label="Remove link" className="px-2 text-muted-foreground hover:text-red-400" onClick={()=>update(section,node.id,{links:(node.links??[]).filter(n=>n!==id)})}>×</button></li>)}</ul></section>
      <section><label className="text-xs font-semibold" htmlFor="note-link-search">Link a note</label><input id="note-link-search" aria-label="Search notes to link" placeholder="Search all project notes…" value={query} onChange={e=>setQuery(e.target.value)} className="mt-2 w-full rounded border border-white/15 bg-transparent px-3 py-2 text-xs"/>{query.trim()&&<ul className="mt-2 max-h-52 space-y-1 overflow-y-auto">{results.map(entry=><li key={entry.node.id}><button className="w-full rounded px-3 py-2 text-left text-xs hover:bg-white/5" onClick={()=>{update(section,node.id,{links:[...new Set([...(node.links??[]),entry.node.id])]});setQuery('');}}><span className="block text-sky-400">{entry.node.title}</span><span className="text-muted-foreground">{entry.path}</span></button></li>)}{!results.length&&<li className="py-2 text-xs text-muted-foreground">No matching notes.</li>}</ul>}</section>
      <section><label htmlFor="note-aliases" className="text-xs font-semibold">Aliases</label><p className="mt-1 text-xs text-muted-foreground">Other names, nicknames and spellings. One per line. Used for mentions and search.</p><textarea id="note-aliases" value={aliases} onChange={e=>{setAliases(e.target.value);setAliasDirty(true);}} rows={3} className="mt-2 w-full rounded border border-white/15 bg-transparent p-2 text-xs"/><button className="mt-1 rounded border border-white/15 px-3 py-1.5 text-xs" onClick={()=>{update(section,node.id,{aliases:[...new Set(aliases.split('\n').map(n=>n.trim().slice(0,500)).filter(Boolean))].slice(0,100)});setAliasDirty(false);}}>Save aliases</button></section>
    </>:<>
      <section><h3 className="mb-2 text-xs font-semibold">Referenced by · {incoming.length}</h3><p className="mb-2 text-xs text-muted-foreground">Notes that link to this note or mention its name or aliases.</p><ul className="space-y-2">{incoming.map(ref=><li key={ref.source.node.id}>{row(ref.source,(ref.explicit?'Linked · ':'Mention · ')+ref.snippet)}</li>)}</ul>{!incoming.length&&<p className="text-xs text-muted-foreground">No references yet.</p>}</section>
      <section><h3 className="mb-2 text-xs font-semibold">Mentioned here · {mentioned.length}</h3>{mentioned.length>0&&<button className="mb-3 rounded border border-sky-400/30 px-3 py-2 text-xs text-sky-400" onClick={()=>{const result=linkKnownNames(node.content,index.filter(n=>n.section==='codex'&&n.node.id!==node.id).map(n=>n.node));if(result.count){update(section,node.id,{content:result.html});toast.success(result.count+' mentions linked.');}else toast.info('No new unambiguous names to link.');}}>Link names in this text</button>}<ul className="space-y-2">{mentioned.map(({target,match})=><li key={target.node.id}>{row(target,'“'+match!.name+'”')}</li>)}</ul>{!mentioned.length&&<p className="text-xs text-muted-foreground">Codex names and aliases mentioned in this text appear here.</p>}</section>
    </>}
    <Dialog open={!!target} onOpenChange={v=>{if(!v)setPreview(null);}}><DialogContent className="max-h-[80vh] overflow-auto border-white/15 bg-background text-foreground"><DialogHeader><DialogTitle>{target?.node.title}</DialogTitle></DialogHeader><p className="text-xs text-muted-foreground">{target?.path}</p>{target&&<><p className="whitespace-pre-wrap text-sm">{stripHtml(target.node.synopsis)||stripHtml(target.node.content).slice(0,1800)||'This note is empty.'}</p><button className="rounded bg-amber-400 px-4 py-2 text-sm text-black" onClick={()=>open(target)}>Open in workspace</button></>}</DialogContent></Dialog>
  </div>;
}
