import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {SECTION_KEYS,TABS,type SectionKey} from '@/lib/kachamak/types';
import type {flattenNotes} from '@/lib/kachamak/note-links';
import type {HomeTarget} from '@/lib/kachamak/homepage';

export const homeSelectClass='h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm';

export function HomeDestinationFields({notes,target,onChange,optional=false}:{
  notes:ReturnType<typeof flattenNotes>;target?:HomeTarget;onChange:(next?:HomeTarget)=>void;optional?:boolean;
}){
  return <>
    <Label className="grid gap-2">Link to<select className={homeSelectClass} value={target?.kind??'none'} onChange={e=>{
      switch(e.target.value){
        case 'note':onChange({kind:'note',id:''});break;
        case 'tab':onChange({kind:'tab',tab:'binder'});break;
        case 'web':onChange({kind:'web',url:''});break;
        default:onChange(undefined);
      }
    }}>{optional&&<option value="none">No destination</option>}<option value="note">Book note</option><option value="tab">Workspace tab</option><option value="web">Website</option></select></Label>
    {target?.kind==='note'&&<Label className="grid gap-2">Book note<select className={homeSelectClass} required value={target.id} onChange={e=>onChange({kind:'note',id:e.target.value})}><option value="">Choose a note</option>
      {SECTION_KEYS.map(section=>{
        const entries=notes.filter(entry=>entry.section===section);
        return entries.length>0&&<optgroup key={section} label={TABS.find(t=>t.key===section)?.label}>{entries.map(({node,path})=><option key={node.id} value={node.id}>{[...path,node.title||'Untitled note'].join(' / ')}</option>)}</optgroup>;
      })}
    </select></Label>}
    {target?.kind==='tab'&&<Label className="grid gap-2">Workspace tab<select className={homeSelectClass} value={target.tab} onChange={e=>onChange({kind:'tab',tab:e.target.value as SectionKey})}>{TABS.filter(t=>t.key!=='trash').map(t=><option key={t.key} value={t.key}>{t.label}</option>)}</select></Label>}
    {target?.kind==='web'&&<Label className="grid gap-2">Website address<Input type="url" required placeholder="https://" value={target.url} onChange={e=>onChange({kind:'web',url:e.target.value})}/></Label>}
  </>;
}
