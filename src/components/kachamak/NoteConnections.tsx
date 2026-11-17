'use client';
import {useDeferredValue,useEffect,useMemo,useState} from 'react';
import {useKachamak} from '@/lib/kachamak/store';
import {TABS,type NoteNode,type SectionKey} from '@/lib/kachamak/types';
import {indexNotes,groupLinkedNotes,referenceTo,type IndexedNote} from '@/lib/kachamak/knowledge';
import {NotePreview} from './NotePreview';
import {CodexNotePicker} from './CodexNotePicker';
import {NoteImage} from './NoteImage';
import {DetailsBlock,DetailsBlocks,AddDetailsBlock} from './DetailsBlock';
import {detailBlockOrder,moveDetailBlock,type DetailBlockKey} from '@/lib/kachamak/detail-blocks';
import {cleanAliases} from '@/lib/kachamak/note-links';

export function NoteConnections({node,section,mode}:{node:NoteNode;section:SectionKey;mode:'details'|'mentions'}) {
  const novel=useKachamak(s=>s.novels.find(n=>n.id===s.activeNovelId));
  const deferred=useDeferredValue(novel);
  const index=useMemo(()=>mode==='mentions'&&deferred?indexNotes(deferred):[],[mode,deferred]);
  const [aliases,setAliases]=useState(''),[preview,setPreview]=useState<string|null>(null),[aliasDirty,setAliasDirty]=useState(false);
  const [referenceQuery,setReferenceQuery]=useState('');
  const update=useKachamak(s=>s.updateNode);
  const saveAliases=(value:string,finish=false)=>{
    if(useKachamak.getState().activeNovelId!==novel?.id)return;
    const next=cleanAliases(value.split('\n').map(alias=>alias.slice(0,500)),node.title).slice(0,100).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}));
    if(next.join('\n')!==(node.aliases??[]).join('\n'))update(section,node.id,{aliases:next});
    if(finish){setAliases(next.join('\n'));setAliasDirty(false);}
  };
  const hidden=node.hiddenDetailBlocks??[];
  const collapsed=node.collapsedDetailBlocks??[],order=detailBlockOrder(node.detailBlockOrder),visibleOrder=order.filter(key=>!hidden.includes(key));
  const updateLayout=(patch:Partial<NoteNode>)=>{if(useKachamak.getState().activeNovelId===novel?.id)update(section,node.id,patch);};
  const setBlockVisible=(key:DetailBlockKey,visible:boolean)=>{
    const state=useKachamak.getState();if(state.activeNovelId!==novel?.id)return;
    const current=node.hiddenDetailBlocks??[];
    update(section,node.id,{hiddenDetailBlocks:visible?current.filter(item=>item!==key):[...new Set([...current,key])]});
  };
  useEffect(()=>{setAliases((node.aliases??[]).join('\n'));setAliasDirty(false);setReferenceQuery('');setPreview(null);},[node.id]);
  useEffect(()=>{if(!aliasDirty)setAliases((node.aliases??[]).join('\n'));},[node.aliases,aliasDirty]);
  const outgoing=useMemo(()=>mode==='details'&&!node.hiddenDetailBlocks?.includes('codex')&&novel&&node.links?.length?groupLinkedNotes(novel,node.links):[],[mode,novel,node.links,node.hiddenDetailBlocks]);
  const incoming=useMemo(()=>mode==='mentions'?index.filter(n=>n.node.id!==node.id).map(n=>referenceTo(n,node,deferred)).filter(n=>n!==null):[],[mode,index,node,deferred]);
  const visibleIncoming=incoming.filter(ref=>[ref.source.node.title,ref.source.path,ref.snippet].join(' ').toLocaleLowerCase().includes(referenceQuery.trim().toLocaleLowerCase()));
  const mentionGroups=TABS.flatMap(tab=>{const entries=visibleIncoming.filter(ref=>ref.source.section===tab.key);return entries.length?[{...tab,entries}]:[];});
  const row=(entry:IndexedNote,detail?:string)=><button type="button" onClick={()=>setPreview(entry.node.id)} className={mode==='details'?"inline text-left align-baseline text-xs hover:underline":"w-full rounded-lg border border-white/10 px-3 py-2 text-left text-xs hover:bg-white/5"}><span className={mode==='details'?"font-medium":"block font-medium"} style={{color:entry.node.color && /^#[0-9a-f]{3,8}$/i.test(entry.node.color)?entry.node.color:'#60a5fa'}}>{entry.node.title}</span>{mode==='mentions'&&<span className="mt-1 block truncate text-muted-foreground">{entry.path}</span>}{detail&&<span className="mt-1 block line-clamp-2 text-muted-foreground">{detail}</span>}</button>;
  return <div className={mode==='details'?'space-y-2':'space-y-5'}>
    {mode==='details'?<>
      {!!visibleOrder.length&&<DetailsBlocks key={node.id} order={visibleOrder} onMove={(from,to)=>updateLayout({detailBlockOrder:moveDetailBlock(order,from,to)})}>{visibleOrder.map(block=><DetailsBlock key={block} block={block} collapsed={collapsed.includes(block)} onToggle={()=>updateLayout({collapsedDetailBlocks:collapsed.includes(block)?collapsed.filter(key=>key!==block):[...collapsed,block]})} onHide={()=>setBlockVisible(block,false)} headerAction={block==="codex"?<CodexNotePicker node={node} section={section}/>:undefined}>
      {block==='image'?<NoteImage node={node} section={section}/>:block==='aliases'?<textarea aria-label="Aliases" id="note-aliases" value={aliases} onChange={e=>{setAliases(e.target.value);setAliasDirty(true);saveAliases(e.target.value);}} onBlur={e=>saveAliases(e.target.value,true)} rows={3} className="block w-full rounded border border-white/15 bg-transparent p-2 text-xs"/>:<>
      {outgoing.map(group=><section key={group.id} aria-label={group.title}>{group.title&&<h3 className="mb-2 border-b border-white/10 pb-2 text-xs font-semibold text-muted-foreground">{group.title}</h3>}<ul className={group.title?"space-y-2 pl-3":"space-y-2"}>{group.entries.map(({id,target})=><li key={id} className="text-xs">{target?row(target):<span className="text-xs text-muted-foreground">Missing note — it may be in Trash.</span>}{' '}<button type="button" aria-label="Remove link" className="inline align-baseline text-muted-foreground hover:text-red-400" onClick={()=>update(section,node.id,{links:(node.links??[]).filter(n=>n!==id)})}>×</button></li>)}</ul></section>)}
      </>}
      </DetailsBlock>)}</DetailsBlocks>}
      <AddDetailsBlock hidden={hidden} onAdd={key=>setBlockVisible(key,true)}/>
    </>:<>
      <section><h3 className="mb-2 text-xs font-semibold">Referenced by · {incoming.length}</h3>{incoming.length>0&&<input aria-label="Filter references" placeholder="Find a chapter or reference…" value={referenceQuery} onChange={e=>setReferenceQuery(e.target.value)} className="mb-2 w-full rounded border border-white/15 bg-transparent px-2 py-1.5 text-xs"/>}<div className="space-y-5">{mentionGroups.map(group=><section key={group.key} aria-label={group.label}><h3 className="mb-2 border-b border-white/10 pb-2 text-xs font-semibold text-muted-foreground">{group.label}</h3><ul className="space-y-2">{group.entries.map(ref=><li key={ref.source.node.id}>{row(ref.source,(ref.explicit?'Linked · ':'Mention · ')+ref.snippet)}</li>)}</ul></section>)}</div>{!visibleIncoming.length&&<p className="text-xs text-muted-foreground">{incoming.length?'No references match this filter.':'No mentions yet. This note’s title, aliases and links will be found across all project notes.'}</p>}</section>

    </>}
    <NotePreview noteId={preview} onClose={()=>setPreview(null)} />
  </div>;
}
