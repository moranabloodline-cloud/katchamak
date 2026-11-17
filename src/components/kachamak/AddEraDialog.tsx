'use client';
import {useEffect,useState} from 'react';
import {Check} from 'lucide-react';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {NOTE_COLORS} from '@/lib/kachamak/icons';
import {DEFAULT_ERA_COLOR,type StoryCalendar} from '@/lib/kachamak/story-calendar';

type Era=NonNullable<StoryCalendar['eras']>[number];
export function AddEraDialog({open,onOpenChange,eras,onAdd}:{open:boolean;onOpenChange:(open:boolean)=>void;eras:Era[];onAdd:(era:Era)=>void}){
  const [name,setName]=useState(''),[abbreviation,setAbbreviation]=useState(''),[color,setColor]=useState(DEFAULT_ERA_COLOR);
  useEffect(()=>{if(open){setName('');setAbbreviation('');setColor(DEFAULT_ERA_COLOR);}},[open]);
  const startYear=(eras.at(-1)?.startYear??1)+100;
  const canSave=!!name.trim()&&!!abbreviation.trim()&&eras.length<32&&Number.isSafeInteger(startYear)&&startYear<=1e9;
  const field='mt-2 w-full rounded-md border border-border bg-background px-3 py-3 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400';
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Add Era</DialogTitle><DialogDescription className="sr-only">Choose the name, abbreviation and colour of the new era.</DialogDescription></DialogHeader>
    <form className="space-y-6" onSubmit={event=>{event.preventDefault();event.stopPropagation();if(!canSave)return;onAdd({id:crypto.randomUUID(),name:name.trim(),abbreviation:abbreviation.trim(),color,startYear});onOpenChange(false);}}>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]"><label className="text-sm font-medium">Era name<input autoFocus required maxLength={100} className={field} value={name} onChange={event=>setName(event.target.value)}/></label><label className="text-sm font-medium">Abbreviation<input required maxLength={100} placeholder="e.g. TA" className={field} value={abbreviation} onChange={event=>setAbbreviation(event.target.value)}/></label></div>
      <div><p className="mb-3 text-sm font-medium">Color</p><div role="group" aria-label="Era color" className="flex flex-wrap gap-2">{NOTE_COLORS.map(value=><button key={value} type="button" aria-label={`Era color ${value}`} aria-pressed={color===value} title={value} onClick={()=>setColor(value)} className={`flex h-9 w-9 items-center justify-center rounded-md border-2 text-black ${color===value?'border-foreground':'border-transparent'}`} style={{backgroundColor:value}}>{color===value&&<Check aria-hidden="true" className="h-4 w-4"/>}</button>)}</div><button type="button" className="mt-3 text-xs text-muted-foreground hover:text-foreground" onClick={()=>setColor(DEFAULT_ERA_COLOR)}>Reset to default</button></div>
      <div className="flex justify-end gap-2 pt-2"><button type="button" className="rounded-md border border-border px-4 py-2.5 text-sm hover:bg-muted" onClick={()=>onOpenChange(false)}>Cancel</button><button type="submit" disabled={!canSave} className="rounded-md bg-amber-400 px-4 py-2.5 text-sm font-medium text-black hover:bg-amber-300 disabled:opacity-40">Save era</button></div>
    </form>
  </DialogContent></Dialog>;
}
