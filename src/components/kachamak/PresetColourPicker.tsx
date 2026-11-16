'use client';
import {useState,type ReactNode} from 'react';
import {NOTE_COLORS} from '@/lib/kachamak/icons';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';

export function ColourPalette({value,onChange,allowClear=true,label='Colour'}:{value?:string;onChange:(value:string)=>void;allowClear?:boolean;label?:string}) {
  return <div className="mx-auto w-48 max-w-full" role="group" aria-label={label}><div className="grid grid-cols-5 gap-1.5">{NOTE_COLORS.map(colour=><button key={colour} type="button" aria-label={`Colour ${colour}`} title={colour} aria-pressed={value===colour} onMouseDown={event=>event.preventDefault()} onClick={()=>onChange(colour)} className={`mx-auto h-6 w-6 rounded-full border transition-transform hover:scale-110 ${value===colour?'border-foreground':'border-transparent'}`} style={{backgroundColor:colour}}/>)}</div>{allowClear&&<button type="button" onMouseDown={event=>event.preventDefault()} onClick={()=>onChange('')} className="mt-2 w-full rounded-md border border-white/10 py-1 text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground">No colour</button>}</div>;
}

export function PresetColourPicker({label,value,onChange,children,className,allowClear=true,preserveSelection=false,onOpenChange}:{label:string;value?:string;onChange:(value:string)=>void;children?:ReactNode;className?:string;allowClear?:boolean;preserveSelection?:boolean;onOpenChange?:(open:boolean)=>void}) {
  const [open,setOpen]=useState(false);
  const changeOpen=(next:boolean)=>{onOpenChange?.(next);setOpen(next);};
  return <Popover open={open} onOpenChange={changeOpen}><PopoverTrigger asChild><button type="button" aria-label={label} title={label} onMouseDown={event=>{if(preserveSelection)event.preventDefault();}} className={className??'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 hover:bg-white/5'}>{children??<span className="h-4 w-4 rounded-full border border-white/20" style={{backgroundColor:value||'transparent'}}/>}</button></PopoverTrigger><PopoverContent align="end" className="w-52 border-white/10 bg-[#1b1b1b] p-2.5" onCloseAutoFocus={event=>{if(preserveSelection)event.preventDefault();}}><ColourPalette label={label+' palette'} value={value} allowClear={allowClear} onChange={colour=>{onChange(colour);changeOpen(false);}}/></PopoverContent></Popover>;
}
