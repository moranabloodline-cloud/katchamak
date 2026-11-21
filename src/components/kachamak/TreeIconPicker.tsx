'use client';

import type {ReactElement} from 'react';
import {NOTE_ICONS} from '@/lib/kachamak/icons';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {ColourPalette} from './PresetColourPicker';

type Props={
  children:ReactElement; open:boolean; onOpenChange:(open:boolean)=>void;
  icon?:string; color?:string; onIcon:(key:string)=>void; onColor:(color:string)=>void; allowDefault?:boolean;
};

export function TreeIconPicker({children,open,onOpenChange,icon,color,onIcon,onColor,allowDefault}:Props){
  function choose(key:string){onIcon(key);onOpenChange(false);}
  return <Popover open={open} onOpenChange={onOpenChange}>
    <PopoverTrigger asChild>{children}</PopoverTrigger>
    <PopoverContent side="bottom" align="start" onClick={e=>e.stopPropagation()}
      className="max-h-[min(calc(100dvh-1.5rem),var(--radix-popover-content-available-height))] w-[min(36rem,calc(100vw-1.5rem))] overflow-y-auto border-white/10 bg-[#1b1b1b] p-3 kachamak-scroll">
      <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground">Icon</p>
      <div className="grid grid-cols-8 gap-1 sm:grid-cols-12">
        {open&&NOTE_ICONS.map(({key,label,Cmp})=><button key={key} type="button" aria-label={label} title={label}
          aria-pressed={icon===key} onClick={()=>choose(key)}
          className="flex h-8 min-w-0 items-center justify-center rounded-md transition-colors hover:bg-white/10 aria-pressed:bg-white/15">
          <Cmp className="h-4 w-4" style={{color:icon===key&&color?color:'#a1a1aa'}}/>
        </button>)}
      </div>
      {allowDefault&&icon&&<button type="button" className="mt-2 text-xs text-muted-foreground hover:text-foreground" onClick={()=>choose('')}>Default icon</button>}
      <p className="mb-2 mt-3 text-[11px] font-semibold tracking-wide text-muted-foreground">Colour</p>
      <ColourPalette value={color} onChange={onColor}/>
    </PopoverContent>
  </Popover>;
}
