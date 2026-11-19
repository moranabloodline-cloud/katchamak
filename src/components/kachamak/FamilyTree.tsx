'use client';
import {useId,useMemo,useState} from 'react';
import {Check,ChevronDown,GitFork,Network,Plus,UserRound,X} from 'lucide-react';
import type {FamilyRelationship,NoteNode,Novel} from '@/lib/kachamak/types';
import {familyCard,familyConnections,familyLayout,familyTreeView} from '@/lib/kachamak/family-tree';
import {customNameLimit,kinshipGroups,kinshipName,relationshipDirection,relationshipName,type KinshipKind} from '@/lib/kachamak/kinship';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {Command,CommandEmpty,CommandGroup,CommandInput,CommandItem,CommandList} from '@/components/ui/command';
import {iconByName} from '@/lib/kachamak/icons';
import {useKachamak} from '@/lib/kachamak/store';
import {CodexNotePicker} from './CodexNotePicker';
import {NotePreview} from './NotePreview';

const field='h-8 w-full min-w-0 rounded border border-border bg-background px-2 text-xs';
const action='inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent';

function RelationshipPicker({value,onChange}:{value:KinshipKind;onChange:(value:KinshipKind,name?:string)=>void}){
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState('');
  const choose=(kind:KinshipKind)=>{onChange(kind,kind==='custom'?search.trim():undefined);setOpen(false);};
  return <Popover open={open} onOpenChange={next=>{setOpen(next);if(next)setSearch('');}}>
    <PopoverTrigger asChild><button type="button" aria-label="Relationship type" className={field+' flex items-center justify-between gap-1'}>
      {kinshipName(value)}<ChevronDown className="size-3.5" aria-hidden="true"/>
    </button></PopoverTrigger>
    <PopoverContent align="start" className="w-72 max-w-[calc(100vw-24px)] p-0">
      <Command label="Choose relationship"><CommandInput placeholder="Search relationships" aria-label="Search relationships" value={search} onValueChange={setSearch}/>
        <CommandList className="max-h-[min(22rem,calc(var(--radix-popover-content-available-height)-3rem))]">
          <CommandEmpty>No matching relationships.</CommandEmpty>
          {kinshipGroups.map(({group,kinds})=><CommandGroup key={group} heading={group}>{kinds.map(kind=>
            <CommandItem key={kind} value={kinshipName(kind)} onSelect={()=>choose(kind)}>
              {kinshipName(kind)}{kind===value && <Check className="ml-auto size-3.5"/>}
            </CommandItem>)}</CommandGroup>)}
        </CommandList>
      </Command>
      <button type="button" onClick={()=>choose('custom')} className="w-full border-t border-border px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent">Custom relationship…</button>
    </PopoverContent>
  </Popover>;
}

export function FamilyTreeEditor({novel,tree}:{novel:Novel;tree:NoteNode}){
  const {people,edges,reasons}=useMemo(()=>familyTreeView(novel,tree),[novel,tree]);
  const names=new Map(people.map(p=>[p.id,p.title]));
  const [adding,setAdding]=useState(false);
  const [from,setFrom]=useState(''),[to,setTo]=useState('');
  const [kind,setKind]=useState<FamilyRelationship['kind']>('parent'),[error,setError]=useState('');
  const [label,setLabel]=useState(''),[mutual,setMutual]=useState(false);
  const validPair=names.has(from)&&names.has(to)&&from!==to;
  const canSave=validPair && (kind!=='custom'||!!label.trim());
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
      {people.length>=2 && !adding && <button type="button" aria-label="Add relationship" title="Add relationship" onClick={()=>{setAdding(true);setFrom(people[0].id);setTo(people[1].id);setKind('parent');setLabel('');setMutual(false);setError('');}} className="rounded p-1 text-muted-foreground hover:bg-accent"><Plus className="size-4"/></button>}
    </div>
    <p className="mb-2 text-xs text-muted-foreground">Shared across this book’s family trees.</p>
    {edges.map(edge=><div key={JSON.stringify(edge)} className="flex items-center gap-2 border-b border-border/50 py-2 text-xs">
      <span className="min-w-0 flex-1 break-words">{names.get(edge.from)} <span className="text-muted-foreground">is the {edge.kind==='custom'?edge.label:relationshipName(edge).toLowerCase()} of</span> {names.get(edge.to)}
        {reasons.has(edge) && <small className="mt-0.5 block text-muted-foreground">Inferred · {reasons.get(edge)}</small>}</span>
      {!reasons.has(edge) && <button type="button" aria-label={'Remove relationship between '+names.get(edge.from)+' and '+names.get(edge.to)} title="Remove shared relationship" className="rounded p-1 text-muted-foreground hover:bg-accent" onClick={()=>{if(window.confirm('Remove this relationship from all family trees in this book?'))save(edge,true);}}><X className="size-3.5"/></button>}</div>)}
    {adding && <form className="mt-3 space-y-2" onSubmit={e=>{e.preventDefault();if(canSave)save(kind==='custom'?{kind,from,to,label:label.trim(),mutual}:{kind,from,to});}}>
      <select aria-label="First person" className={field} value={from} onChange={e=>{setFrom(e.target.value);setError('');}}>{people.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select>
      <RelationshipPicker value={kind} onChange={(selected,name)=>{setKind(selected);if(name)setLabel(name.slice(0,customNameLimit));setError('');}}/>
      {kind==='custom' && <div className="space-y-2"><input aria-label="Relationship name" placeholder="Relationship name" required maxLength={customNameLimit} value={label} onChange={e=>setLabel(e.target.value)} className={field}/>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={mutual} onChange={e=>setMutual(e.target.checked)}/>Same role in both directions</label></div>}
      <select aria-label="Second person" className={field} value={to} onChange={e=>{setTo(e.target.value);setError('');}}>{people.map(p=><option key={p.id} value={p.id} disabled={p.id===from}>{p.title}</option>)}</select>
      <div className="flex gap-2"><button type="submit" disabled={!canSave} className={action+' disabled:opacity-40'}>Add relationship</button><button type="button" className="px-1 text-xs text-muted-foreground" onClick={()=>{setAdding(false);setError('');}}>Cancel</button></div>
    </form>}
    {error && <p role="alert" className="mt-2 text-xs text-amber-400">{error}</p>}
    </section>
  </div>;
}

export function FamilyTreeGraph({novel,tree,onCreate,onEdit}:{novel:Novel;tree:NoteNode|null;onCreate:()=>void;onEdit:()=>void}){
  const [preview,setPreview]=useState<string|null>(null);
  const marker=useId().replace(/[^\w-]/g,'');
  const {people,edges,reasons}=useMemo(()=>familyTreeView(novel,tree),[novel,tree]);
  const {width,height,positions}=familyLayout(people,edges);
  const names=new Map(people.map(p=>[p.id,p.title]));
  const connections=familyConnections(edges);
  const lineTypes=new Set(connections.map(({edge})=>{
    const line=relationshipDirection(edge).line;
    return reasons.has(edge)?(line==='ancestry'?'grandparents':'siblings'):line;
  }));
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
          {connections.map(({edge,roles})=>{
            const direction=relationshipDirection(edge);
            const inferred=reasons.has(edge);
            const a=positions.get(direction.from)!,b=positions.get(direction.to)!;
            const lateral=direction.line!=='ancestry';
            const near=lateral && a.y===b.y && Math.abs(a.x-b.x)<=w+40;
            const x1=a.x+w/2,x2=b.x+w/2,mid=(a.y+h+b.y)/2;
            let d=near ? `M${a.x<b.x?a.x+w:a.x} ${a.y+h/2} H${a.x<b.x?b.x:b.x+w}` : lateral && a.y===b.y
              ? `M${x1} ${a.y} C${x1} ${a.y-28},${x2} ${b.y-28},${x2} ${b.y}`
              : lateral && a.y>b.y ? `M${x1} ${a.y} C${x1} ${(a.y+b.y+h)/2},${x2} ${(a.y+b.y+h)/2},${x2} ${b.y+h+2}`
              : `M${x1} ${a.y+h} C${x1} ${mid},${x2} ${mid},${x2} ${b.y-2}`;
            // An inferred grandparent in the same column needs its own path
            // around the intervening parent card.
            if(inferred && !lateral && a.x===b.x){
              const side=a.x+w,bend=side+32;
              d=`M${side} ${a.y+h/2} C${bend} ${a.y+h/2},${bend} ${b.y+h/2},${side+2} ${b.y+h/2}`;
            }
            const description=roles.map(role=>[names.get(role.from),relationshipName(role),names.get(role.to),reasons.get(role)].filter(Boolean).join(' · ')).join('\n');
            const dash=inferred&&!lateral?'6 3':direction.line==='couple'?'4 4':lateral?'1.5 3':undefined;
            return <path key={JSON.stringify(edge)} d={d} data-relation={edge.kind} fill="none" stroke="currentColor" strokeWidth="1.5" className={'pointer-events-stroke'+(inferred?' text-amber-400/75':'')} strokeDasharray={dash} markerEnd={direction.mutual?undefined:`url(#${marker})`}><title>{description}</title></path>;
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
      {edges.length>0 && <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {lineTypes.has('ancestry')&&<span className="inline-flex items-center gap-1"><GitFork className="size-3"/>Ancestry</span>}
        {lineTypes.has('couple')&&<span className="inline-flex items-center gap-1"><span aria-hidden="true" className="w-4 border-t border-dashed"/>Partners</span>}
        {lineTypes.has('kin')&&<span className="inline-flex items-center gap-1"><span aria-hidden="true" className="w-4 border-t border-dotted"/>Other kinship</span>}
        {lineTypes.has('siblings')&&<span className="inline-flex items-center gap-1"><span aria-hidden="true" className="w-4 border-t border-dotted border-amber-400/75"/>Siblings</span>}
        {lineTypes.has('grandparents')&&<span className="inline-flex items-center gap-1"><span aria-hidden="true" className="w-4 border-t border-dashed border-amber-400/75"/>Grandparents &amp; grandchildren</span>}
      </div>}
    </div>}
    <NotePreview noteId={preview} onClose={()=>setPreview(null)}/>
  </section>;
}
