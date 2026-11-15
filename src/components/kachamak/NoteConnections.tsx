'use client';
import {useDeferredValue,useEffect,useMemo,useState} from 'react';
import {useKachamak} from '@/lib/kachamak/store';
import type {NoteNode,SectionKey} from '@/lib/kachamak/types';
import {indexNotes,groupLinkedNotes,referenceTo,type IndexedNote} from '@/lib/kachamak/knowledge';
import {noteMatches} from '@/lib/kachamak/note-links';
import {NotePreview} from './NotePreview';
import {CodexNotePicker} from './CodexNotePicker';

export function NoteConnections({node,section,mode}:{node:NoteNode;section:SectionKey;mode:'details'|'mentions'}) {
  const novel=useKachamak(s=>s.novels.find(n=>n.id===s.activeNovelId));
  const deferred=useDeferredValue(novel);
  const index=useMemo(()=>deferred?indexNotes(deferred):[],[deferred]);
  const [aliases,setAliases]=useState(''),[preview,setPreview]=useState<string|null>(null),[aliasDirty,setAliasDirty]=useState(false);
  const [referenceScope,setReferenceScope]=useState<'all'|'binder'>('all');
  const [referenceQuery,setReferenceQuery]=useState('');
  const update=useKachamak(s=>s.updateNode);
  useEffect(()=>{setAliases((node.aliases??[]).join('\n'));setAliasDirty(false);setReferenceQuery('');setPreview(null);},[node.id]);
  useEffect(()=>{if(!aliasDirty)setAliases((node.aliases??[]).join('\n'));},[node.aliases,aliasDirty]);
  const selected=index.find(n=>n.node.id===node.id);
  const outgoing=useMemo(()=>novel?groupLinkedNotes(novel,node.links??[]):[],[novel,node.links]);
  const incoming=mode==='mentions'?index.filter(n=>n.node.id!==node.id).map(n=>referenceTo(n,node,deferred)).filter(n=>n!==null):[];
  const detected=mode==='mentions'&&selected&&deferred?noteMatches(deferred,selected.node):[];
  const mentioned=[...new Set(detected.filter(m=>m.targetId&&!m.missing).map(m=>m.targetId))].flatMap(id=>{const target=index.find(n=>n.node.id===id),m=detected.find(m=>m.targetId===id);return target&&m?[{target,match:{name:m.text}}]:[];});
  const visibleIncoming=incoming.filter(ref=>(referenceScope==='all'||ref.source.section==='binder')&&[ref.source.node.title,ref.source.path,ref.snippet].join(' ').toLocaleLowerCase().includes(referenceQuery.trim().toLocaleLowerCase()));
  const manuscriptCount=incoming.filter(ref=>ref.source.section==='binder').length;
  const row=(entry:IndexedNote,detail?:string)=><button type="button" onClick={()=>setPreview(entry.node.id)} className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-xs hover:bg-white/5"><span className="block font-medium" style={{color:entry.node.color && /^#[0-9a-f]{3,8}$/i.test(entry.node.color)?entry.node.color:'#60a5fa'}}>{entry.node.title}</span>{mode==='mentions'&&<span className="mt-1 block truncate text-muted-foreground">{entry.path}</span>}{detail&&<span className="mt-1 block line-clamp-2 text-muted-foreground">{detail}</span>}</button>;
  return <div className="space-y-5">
    {mode==='details'?<>
      <section><label htmlFor="note-aliases" className="text-xs font-semibold">Aliases</label><textarea id="note-aliases" value={aliases} onChange={e=>{setAliases(e.target.value);setAliasDirty(true);}} rows={3} className="mt-2 w-full rounded border border-white/15 bg-transparent p-2 text-xs"/><div className="mt-2 flex gap-2"><button type="button" className="rounded border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5" onClick={()=>{update(section,node.id,{aliases:[...new Set(aliases.split('\n').map(n=>n.trim().slice(0,500)).filter(Boolean))].slice(0,100)});setAliasDirty(false);}}>Save</button><button type="button" className="rounded border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5 disabled:opacity-40" title="Sort aliases A–Z" disabled={!aliases.trim()} onClick={()=>{setAliases([...new Set(aliases.split('\n').map(n=>n.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'})).join('\n'));setAliasDirty(true);}}>Sort</button></div></section>
      <section className="space-y-3"><CodexNotePicker node={node} section={section}/></section>
      {outgoing.map(group=><section key={group.id} aria-label={group.title}>{group.title&&<h3 className="mb-2 border-b border-white/10 pb-2 text-xs font-semibold text-muted-foreground">{group.title}</h3>}<ul className="space-y-2">{group.entries.map(({id,target})=><li key={id} className="flex items-center gap-1">{target?row(target):<span className="flex-1 text-xs text-muted-foreground">Missing note — it may be in Trash.</span>}<button aria-label="Remove link" className="px-2 text-muted-foreground hover:text-red-400" onClick={()=>update(section,node.id,{links:(node.links??[]).filter(n=>n!==id)})}>×</button></li>)}</ul></section>)}
    </>:<>
      <section><h3 className="mb-2 text-xs font-semibold">Referenced by · {incoming.length}</h3><p className="mb-2 text-xs text-muted-foreground">Notes that link to this note or mention its name or aliases.</p><div className="mb-2 flex gap-2"><button aria-pressed={referenceScope==='all'} onClick={()=>setReferenceScope('all')} className="rounded border border-white/15 px-2 py-1 text-xs aria-pressed:border-amber-400">All notes · {incoming.length}</button><button aria-pressed={referenceScope==='binder'} onClick={()=>setReferenceScope('binder')} className="rounded border border-white/15 px-2 py-1 text-xs aria-pressed:border-amber-400">Manuscript · {manuscriptCount}</button></div>{incoming.length>0&&<input aria-label="Filter references" placeholder="Find a chapter or reference…" value={referenceQuery} onChange={e=>setReferenceQuery(e.target.value)} className="mb-2 w-full rounded border border-white/15 bg-transparent px-2 py-1.5 text-xs"/>}<ul className="space-y-2">{visibleIncoming.map(ref=><li key={ref.source.node.id}>{row(ref.source,(ref.explicit?'Linked · ':'Mention · ')+ref.snippet)}</li>)}</ul>{!visibleIncoming.length&&<p className="text-xs text-muted-foreground">{incoming.length?'No references match this filter.':'No references yet. Link this note from your manuscript or mention its name or aliases.'}</p>}</section>
      <section><h3 className="mb-2 text-xs font-semibold">Mentioned here · {mentioned.length}</h3><ul className="space-y-2">{mentioned.map(({target,match})=><li key={target.node.id}>{row(target,'“'+match!.name+'”')}</li>)}</ul>{!mentioned.length&&<p className="text-xs text-muted-foreground">Codex names and aliases mentioned in this text appear here.</p>}</section>
    </>}
    <NotePreview noteId={preview} onClose={()=>setPreview(null)} />
  </div>;
}
