'use client';
import {useId,useState} from 'react';
import {GitFork,Network,Plus,UserRound,X} from 'lucide-react';
import type {FamilyRelationship,NoteNode,Novel} from '@/lib/kachamak/types';
import {familyCard,familyEdges,familyLayout,familyMembers} from '@/lib/kachamak/family-tree';
import {iconByName} from '@/lib/kachamak/icons';
import {useKachamak} from '@/lib/kachamak/store';
import {CodexNotePicker} from './CodexNotePicker';
import {NotePreview} from './NotePreview';

const field='h-8 w-full min-w-0 rounded border border-border bg-background px-2 text-xs';
const action='inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent';

export function FamilyTreeEditor({novel,tree}:{novel:Novel;tree:NoteNode}){
  const people=familyMembers(novel,tree), names=new Map(people.map(p=>[p.id,p.title]));
  const edges=familyEdges(novel,people);
  const [adding,setAdding]=useState(false);
  const [from,setFrom]=useState(''),[to,setTo]=useState('');
  const [kind,setKind]=useState<FamilyRelationship['kind']>('parent'),[error,setError]=useState('');
  const validPair=names.has(from)&&names.has(to)&&from!==to;
  const save=(edge:FamilyRelationship,remove=false)=>{
    const message=useKachamak.getState().changeFamilyRelationship(novel.id,tree.id,edge,remove);
    setError(message??'');
    if(!message){setAdding(false);setFrom('');setTo('');}
  };
  const removePerson=(id:string)=>{
    const state=useKachamak.getState();
    if(state.activeNovelId===novel.id)state.updateNode('family',tree.id,{familyMembers:(tree.familyMembers??[]).filter(member=>member!==id)});
  };
  return <div className="space-y-5 text-sm">
    <section><div className="mb-2 flex items-center gap-1 border-b border-border pb-1">
      <h3 className="font-semibold">People</h3><CodexNotePicker section="family" node={tree} field="familyMembers"/>
    </div>
    {(tree.familyMembers??[]).map(id=><div key={id} className="flex items-center justify-between gap-2 py-1">
      <span className="truncate">{names.get(id)??'Unavailable Codex note'}</span>
      <button type="button" aria-label={'Remove '+(names.get(id)??'note')+' from this tree'} title="Remove from this tree" onClick={()=>removePerson(id)} className="rounded p-1 text-muted-foreground hover:bg-accent"><X className="size-3.5"/></button></div>)}
    </section>
    <section><div className="mb-2 flex items-center gap-1 border-b border-border pb-1">
      <h3 className="font-semibold">Relationships</h3>
      {people.length>=2 && !adding && <button type="button" aria-label="Add relationship" title="Add relationship" onClick={()=>{setAdding(true);setFrom(people[0].id);setTo(people[1].id);setError('');}} className="rounded p-1 text-muted-foreground hover:bg-accent"><Plus className="size-4"/></button>}
    </div>
    <p className="mb-2 text-xs text-muted-foreground">Shared across this book’s family trees.</p>
    {edges.map(edge=><div key={JSON.stringify(edge)} className="flex items-center gap-2 border-b border-border/50 py-2 text-xs">
      <span className="min-w-0 flex-1 break-words">{names.get(edge.from)} <span className="text-muted-foreground">{edge.kind==='parent'?'is a parent of':'is a partner of'}</span> {names.get(edge.to)}</span>
      <button type="button" aria-label={'Remove relationship between '+names.get(edge.from)+' and '+names.get(edge.to)} title="Remove shared relationship" className="rounded p-1 text-muted-foreground hover:bg-accent" onClick={()=>{if(window.confirm('Remove this relationship from all family trees in this book?'))save(edge,true);}}><X className="size-3.5"/></button></div>)}
    {adding && <form className="mt-3 space-y-2" onSubmit={e=>{e.preventDefault();if(validPair)save({kind,from,to});}}>
      <select aria-label="First person" className={field} value={from} onChange={e=>{setFrom(e.target.value);setError('');}}>{people.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select>
      <select aria-label="Relationship type" className={field} value={kind} onChange={e=>{setKind(e.target.value as FamilyRelationship['kind']);setError('');}}><option value="parent">is a parent of</option><option value="partner">is a partner of</option></select>
      <select aria-label="Second person" className={field} value={to} onChange={e=>{setTo(e.target.value);setError('');}}>{people.map(p=><option key={p.id} value={p.id} disabled={p.id===from}>{p.title}</option>)}</select>
      <div className="flex gap-2"><button type="submit" disabled={!validPair} className={action+' disabled:opacity-40'}>Add relationship</button><button type="button" className="px-1 text-xs text-muted-foreground" onClick={()=>{setAdding(false);setError('');}}>Cancel</button></div>
    </form>}
    {error && <p role="alert" className="mt-2 text-xs text-amber-400">{error}</p>}
    </section>
  </div>;
}

export function FamilyTreeGraph({novel,tree,onCreate,onEdit}:{novel:Novel;tree:NoteNode|null;onCreate:()=>void;onEdit:()=>void}){
  const [preview,setPreview]=useState<string|null>(null);
  const marker=useId().replace(/[^\w-]/g,'');
  const people=tree?familyMembers(novel,tree):[];
  const edges=familyEdges(novel,people);
  const {width,height,positions}=familyLayout(people,edges);
  const {width:w,height:h}=familyCard;
  const rightOpen=useKachamak(s=>s.rightPanelOpen);
  return <section aria-label="Family tree graph" className="flex h-full min-h-72 flex-col">
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3">
      <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold"><Network className="size-4 shrink-0 text-muted-foreground"/><span className="truncate">{tree?.title||'Family Tree'}</span></h2>
      {tree && <button type="button" onClick={onEdit} className={action+(rightOpen?' lg:hidden':'')}>Edit tree</button>}
    </header>
    {people.length===0 ? <div className="m-auto max-w-sm px-5 py-12 text-center">
      <Network aria-hidden="true" className="mx-auto mb-4 size-8 text-amber-400/70"/>
      {tree?<p className="text-sm text-muted-foreground">Choose people from the Codex using + next to People in the Family tab.</p>:<button type="button" onClick={onCreate} className={action}><Plus className="size-4"/>New family tree</button>}
    </div> : <div className="min-h-0 flex-1 overflow-auto kachamak-scroll px-4 py-5">
      <div className="relative mx-auto" style={{width,height}} aria-label="People and relationships">
        <svg aria-hidden="true" width={width} height={height} className="pointer-events-none absolute inset-0 overflow-visible text-muted-foreground">
          <defs><marker id={marker} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L8 4 L0 8" fill="currentColor"/></marker></defs>
          {edges.map(edge=>{
            const a=positions.get(edge.from)!,b=positions.get(edge.to)!;
            const partner=edge.kind==='partner';
            const near=partner && a.y===b.y && Math.abs(a.x-b.x)<=w+40;
            const x1=a.x+w/2,x2=b.x+w/2,mid=(a.y+h+b.y)/2;
            const d=near ? `M${Math.min(a.x,b.x)+w} ${a.y+h/2} H${Math.max(a.x,b.x)}` : partner
              ? `M${x1} ${a.y} C${x1} ${Math.min(a.y,b.y)-28},${x2} ${Math.min(a.y,b.y)-28},${x2} ${b.y}`
              : `M${x1} ${a.y+h} C${x1} ${mid},${x2} ${mid},${x2} ${b.y-2}`;
            return <path key={JSON.stringify(edge)} d={d} data-relation={edge.kind} fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray={partner?'4 4':undefined} markerEnd={partner?undefined:`url(#${marker})`}/>;
          })}
        </svg>
        {people.map(person=>{
          const {x,y}=positions.get(person.id)!,Icon=iconByName(person.icon)??UserRound;
          return <button type="button" key={person.id} aria-label={'Preview '+person.title} title={person.title} onClick={()=>setPreview(person.id)}
            className="absolute flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 text-left shadow-sm hover:border-amber-400/60 focus-visible:outline-amber-400"
            style={{left:x,top:y,width:w,height:h}}>
            {person.image?<img src={person.image} alt="" className="size-9 shrink-0 rounded-full object-cover"/>:<span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted" style={{color:person.color||undefined}}><Icon className="size-4"/></span>}
            <span className="line-clamp-2 break-words text-sm font-semibold leading-tight">{person.title}</span>
          </button>;
        })}
      </div>
      {edges.length>0 && <div className="mt-4 flex justify-center gap-4 text-xs text-muted-foreground">
        {edges.some(edge=>edge.kind==='parent')&&<span className="inline-flex items-center gap-1"><GitFork className="size-3"/>Parent → child</span>}
        {edges.some(edge=>edge.kind==='partner')&&<span className="inline-flex items-center gap-1"><span aria-hidden="true" className="w-4 border-t border-dashed"/>Partners</span>}
      </div>}
    </div>}
    <NotePreview noteId={preview} onClose={()=>setPreview(null)}/>
  </section>;
}
