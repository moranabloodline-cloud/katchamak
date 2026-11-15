'use client';
import {useDeferredValue,useEffect,useMemo,useState} from 'react';
import {useKachamak} from '@/lib/kachamak/store';
import {TABS,type NoteNode,type SectionKey} from '@/lib/kachamak/types';
import {indexNotes,groupLinkedNotes,referenceTo,type IndexedNote} from '@/lib/kachamak/knowledge';
import {NotePreview} from './NotePreview';
import {CodexNotePicker} from './CodexNotePicker';

export function NoteConnections({node,section,mode}:{node:NoteNode;section:SectionKey;mode:'details'|'mentions'}) {
  const novel=useKachamak(s=>s.novels.find(n=>n.id===s.activeNovelId));
  const deferred=useDeferredValue(novel);
  const index=useMemo(()=>deferred?indexNotes(deferred):[],[deferred]);
  const [aliases,setAliases]=useState(''),[preview,setPreview]=useState<string|null>(null),[aliasDirty,setAliasDirty]=useState(false);
  const [referenceQuery,setReferenceQuery]=useState('');
  const update=useKachamak(s=>s.updateNode);
  useEffect(()=>{setAliases((node.aliases??[]).join('\n'));setAliasDirty(false);setReferenceQuery('');setPreview(null);},[node.id]);
  useEffect(()=>{if(!aliasDirty)setAliases((node.aliases??[]).join('\n'));},[node.aliases,aliasDirty]);
  const outgoing=useMemo(()=>novel?groupLinkedNotes(novel,node.links??[]):[],[novel,node.links]);
  const incoming=mode==='mentions'?index.filter(n=>n.node.id!==node.id).map(n=>referenceTo(n,node,deferred)).filter(n=>n!==null):[];
  const visibleIncoming=incoming.filter(ref=>[ref.source.node.title,ref.source.path,ref.snippet].join(' ').toLocaleLowerCase().includes(referenceQuery.trim().toLocaleLowerCase()));
  const mentionGroups=TABS.flatMap(tab=>{const entries=visibleIncoming.filter(ref=>ref.source.section===tab.key);return entries.length?[{...tab,entries}]:[];});
  const row=(entry:IndexedNote,detail?:string)=><button type="button" onClick={()=>setPreview(entry.node.id)} className={mode==='details'?"inline text-left align-baseline text-xs hover:underline":"w-full rounded-lg border border-white/10 px-3 py-2 text-left text-xs hover:bg-white/5"}><span className={mode==='details'?"font-medium":"block font-medium"} style={{color:entry.node.color && /^#[0-9a-f]{3,8}$/i.test(entry.node.color)?entry.node.color:'#60a5fa'}}>{entry.node.title}</span>{mode==='mentions'&&<span className="mt-1 block truncate text-muted-foreground">{entry.path}</span>}{detail&&<span className="mt-1 block line-clamp-2 text-muted-foreground">{detail}</span>}</button>;
  return <div className="space-y-5">
    {mode==='details'?<>
      <section><label htmlFor="note-aliases" className="text-xs font-semibold">Aliases</label><textarea id="note-aliases" value={aliases} onChange={e=>{setAliases(e.target.value);setAliasDirty(true);}} rows={3} className="mt-2 w-full rounded border border-white/15 bg-transparent p-2 text-xs"/><div className="mt-2 flex gap-2"><button type="button" className="rounded border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5" onClick={()=>{update(section,node.id,{aliases:[...new Set(aliases.split('\n').map(n=>n.trim().slice(0,500)).filter(Boolean))].slice(0,100)});setAliasDirty(false);}}>Save</button><button type="button" className="rounded border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5 disabled:opacity-40" title="Sort aliases A–Z" disabled={!aliases.trim()} onClick={()=>{setAliases([...new Set(aliases.split('\n').map(n=>n.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'})).join('\n'));setAliasDirty(true);}}>Sort</button></div></section>
      <section className="space-y-3"><CodexNotePicker node={node} section={section}/></section>
      {outgoing.map(group=><section key={group.id} aria-label={group.title}>{group.title&&<h3 className="mb-2 border-b border-white/10 pb-2 text-xs font-semibold text-muted-foreground">{group.title}</h3>}<ul className="space-y-2">{group.entries.map(({id,target})=><li key={id} className="text-xs">{target?row(target):<span className="text-xs text-muted-foreground">Missing note — it may be in Trash.</span>}{' '}<button type="button" aria-label="Remove link" className="inline align-baseline text-muted-foreground hover:text-red-400" onClick={()=>update(section,node.id,{links:(node.links??[]).filter(n=>n!==id)})}>×</button></li>)}</ul></section>)}
    </>:<>
      <section><h3 className="mb-2 text-xs font-semibold">Referenced by · {incoming.length}</h3>{incoming.length>0&&<input aria-label="Filter references" placeholder="Find a chapter or reference…" value={referenceQuery} onChange={e=>setReferenceQuery(e.target.value)} className="mb-2 w-full rounded border border-white/15 bg-transparent px-2 py-1.5 text-xs"/>}<div className="space-y-5">{mentionGroups.map(group=><section key={group.key} aria-label={group.label}><h3 className="mb-2 border-b border-white/10 pb-2 text-xs font-semibold text-muted-foreground">{group.label}</h3><ul className="space-y-2">{group.entries.map(ref=><li key={ref.source.node.id}>{row(ref.source,(ref.explicit?'Linked · ':'Mention · ')+ref.snippet)}</li>)}</ul></section>)}</div>{!visibleIncoming.length&&<p className="text-xs text-muted-foreground">{incoming.length?'No references match this filter.':'No mentions yet. This note’s title, aliases and links will be found across all project notes.'}</p>}</section>

    </>}
    <NotePreview noteId={preview} onClose={()=>setPreview(null)} />
  </div>;
}
