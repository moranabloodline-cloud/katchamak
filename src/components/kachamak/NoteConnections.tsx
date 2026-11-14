'use client';
import {useDeferredValue,useEffect,useMemo,useState} from 'react';
import {useKachamak} from '@/lib/kachamak/store';
import type {NoteNode,SectionKey} from '@/lib/kachamak/types';
import {indexNotes,referenceTo,searchNotes,type IndexedNote} from '@/lib/kachamak/knowledge';
import {noteMatches} from '@/lib/kachamak/note-links';
import {NotePreview} from './NotePreview';

export function NoteConnections({node,section,mode}:{node:NoteNode;section:SectionKey;mode:'details'|'mentions'}) {
  const novel=useKachamak(s=>s.novels.find(n=>n.id===s.activeNovelId));
  const deferred=useDeferredValue(novel);
  const index=useMemo(()=>deferred?indexNotes(deferred):[],[deferred]);
  const [query,setQuery]=useState(''),[aliases,setAliases]=useState(''),[preview,setPreview]=useState<string|null>(null),[aliasDirty,setAliasDirty]=useState(false);
  const [referenceScope,setReferenceScope]=useState<'all'|'binder'>('all');
  const [referenceQuery,setReferenceQuery]=useState('');
  const update=useKachamak(s=>s.updateNode);
  useEffect(()=>{setAliases((node.aliases??[]).join('\n'));setAliasDirty(false);setQuery('');setReferenceQuery('');setPreview(null);},[node.id]);
  useEffect(()=>{if(!aliasDirty)setAliases((node.aliases??[]).join('\n'));},[node.aliases,aliasDirty]);
  const selected=index.find(n=>n.node.id===node.id);
  const outgoing=(node.links??[]).map(id=>({id,target:index.find(n=>n.node.id===id)}));
  const incoming=mode==='mentions'?index.filter(n=>n.node.id!==node.id).map(n=>referenceTo(n,node,deferred)).filter(n=>n!==null):[];
  const detected=mode==='mentions'&&selected&&deferred?noteMatches(deferred,selected.node):[];
  const mentioned=[...new Set(detected.filter(m=>m.targetId&&!m.missing).map(m=>m.targetId))].flatMap(id=>{const target=index.find(n=>n.node.id===id),m=detected.find(m=>m.targetId===id);return target&&m?[{target,match:{name:m.text}}]:[];});
  const results=searchNotes(index,query,node.id).filter(n=>!(node.links??[]).includes(n.node.id)).slice(0,12);
  const visibleIncoming=incoming.filter(ref=>(referenceScope==='all'||ref.source.section==='binder')&&[ref.source.node.title,ref.source.path,ref.snippet].join(' ').toLocaleLowerCase().includes(referenceQuery.trim().toLocaleLowerCase()));
  const manuscriptCount=incoming.filter(ref=>ref.source.section==='binder').length;
  const row=(entry:IndexedNote,detail?:string)=><button type="button" onClick={()=>setPreview(entry.node.id)} className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-xs hover:bg-white/5"><span className="block font-medium text-sky-400">{entry.node.title}</span><span className="mt-1 block truncate text-muted-foreground">{entry.path}</span>{detail&&<span className="mt-1 block line-clamp-2 text-muted-foreground">{detail}</span>}</button>;
  return <div className="space-y-5">
    {mode==='details'?<>
      <section><h3 className="mb-2 text-xs font-semibold">Linked notes</h3>{!outgoing.length&&<p className="text-xs text-muted-foreground">Connect this note to characters, chapters, research or any other note.</p>}<ul className="space-y-2">{outgoing.map(({id,target})=><li key={id} className="flex items-center gap-1">{target?row(target):<span className="flex-1 text-xs text-muted-foreground">Missing note — it may be in Trash.</span>}<button aria-label="Remove link" className="px-2 text-muted-foreground hover:text-red-400" onClick={()=>update(section,node.id,{links:(node.links??[]).filter(n=>n!==id)})}>×</button></li>)}</ul></section>
      <section><label className="text-xs font-semibold" htmlFor="note-link-search">Link a note</label><input id="note-link-search" aria-label="Search notes to link" placeholder="Search all project notes…" value={query} onChange={e=>setQuery(e.target.value)} className="mt-2 w-full rounded border border-white/15 bg-transparent px-3 py-2 text-xs"/>{query.trim()&&<ul className="mt-2 max-h-52 space-y-1 overflow-y-auto">{results.map(entry=><li key={entry.node.id}><button className="w-full rounded px-3 py-2 text-left text-xs hover:bg-white/5" onClick={()=>{update(section,node.id,{links:[...new Set([...(node.links??[]),entry.node.id])]});setQuery('');}}><span className="block text-sky-400">{entry.node.title}</span><span className="text-muted-foreground">{entry.path}</span></button></li>)}{!results.length&&<li className="py-2 text-xs text-muted-foreground">No matching notes.</li>}</ul>}</section>
      <section><label htmlFor="note-aliases" className="text-xs font-semibold">Aliases</label><p className="mt-1 text-xs text-muted-foreground">Other names, nicknames and spellings. One per line. Used for mentions and search.</p><textarea id="note-aliases" value={aliases} onChange={e=>{setAliases(e.target.value);setAliasDirty(true);}} rows={3} className="mt-2 w-full rounded border border-white/15 bg-transparent p-2 text-xs"/><button className="mt-1 rounded border border-white/15 px-3 py-1.5 text-xs" onClick={()=>{update(section,node.id,{aliases:[...new Set(aliases.split('\n').map(n=>n.trim().slice(0,500)).filter(Boolean))].slice(0,100)});setAliasDirty(false);}}>Save aliases</button></section>
    </>:<>
      <section><h3 className="mb-2 text-xs font-semibold">Referenced by · {incoming.length}</h3><p className="mb-2 text-xs text-muted-foreground">Notes that link to this note or mention its name or aliases.</p><div className="mb-2 flex gap-2"><button aria-pressed={referenceScope==='all'} onClick={()=>setReferenceScope('all')} className="rounded border border-white/15 px-2 py-1 text-xs aria-pressed:border-amber-400">All notes · {incoming.length}</button><button aria-pressed={referenceScope==='binder'} onClick={()=>setReferenceScope('binder')} className="rounded border border-white/15 px-2 py-1 text-xs aria-pressed:border-amber-400">Manuscript · {manuscriptCount}</button></div>{incoming.length>0&&<input aria-label="Filter references" placeholder="Find a chapter or reference…" value={referenceQuery} onChange={e=>setReferenceQuery(e.target.value)} className="mb-2 w-full rounded border border-white/15 bg-transparent px-2 py-1.5 text-xs"/>}<ul className="space-y-2">{visibleIncoming.map(ref=><li key={ref.source.node.id}>{row(ref.source,(ref.explicit?'Linked · ':'Mention · ')+ref.snippet)}</li>)}</ul>{!visibleIncoming.length&&<p className="text-xs text-muted-foreground">{incoming.length?'No references match this filter.':'No references yet. Link this note from your manuscript or mention its name or aliases.'}</p>}</section>
      <section><h3 className="mb-2 text-xs font-semibold">Mentioned here · {mentioned.length}</h3><ul className="space-y-2">{mentioned.map(({target,match})=><li key={target.node.id}>{row(target,'“'+match!.name+'”')}</li>)}</ul>{!mentioned.length&&<p className="text-xs text-muted-foreground">Codex names and aliases mentioned in this text appear here.</p>}</section>
    </>}
    <NotePreview noteId={preview} onClose={()=>setPreview(null)} />
  </div>;
}
