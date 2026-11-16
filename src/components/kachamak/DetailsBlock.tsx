'use client';
import type {ReactNode} from 'react';
import {Check,MoreVertical,Plus} from 'lucide-react';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {DETAIL_BLOCKS,type DetailBlockKey} from '@/lib/kachamak/detail-blocks';

export function DetailsBlock({block,onHide,children}:{block:DetailBlockKey;onHide:()=>void;children:ReactNode}) {
  const title=DETAIL_BLOCKS.find(item=>item.key===block)!.label;
  return <section aria-label={`${title} block`} className="group/detail-block border-b border-white/10 pb-2">
    <header className="mb-1.5 flex min-h-6 items-center gap-2"><h3 className="min-w-0 flex-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</h3><DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={`${title} block options`} className="rounded p-1 text-muted-foreground opacity-0 hover:bg-white/10 hover:text-foreground group-hover/detail-block:opacity-100 group-focus-within/detail-block:opacity-100 data-[state=open]:opacity-100 focus-visible:opacity-100"><MoreVertical className="h-3.5 w-3.5"/></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={onHide}>Hide block</DropdownMenuItem></DropdownMenuContent></DropdownMenu></header>
    <div className="space-y-2">{children}</div>
  </section>;
}

export function AddDetailsBlock({hidden,onAdd}:{hidden:DetailBlockKey[];onAdd:(key:DetailBlockKey)=>void}) {
  return <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="flex items-center gap-2 rounded px-1 py-2 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground"><Plus className="h-3.5 w-3.5"/>Add block</button></DropdownMenuTrigger><DropdownMenuContent align="start">{DETAIL_BLOCKS.map(block=><DropdownMenuItem key={block.key} disabled={!hidden.includes(block.key)} onSelect={()=>onAdd(block.key)}>{block.label}{!hidden.includes(block.key)&&<Check className="ml-auto h-3.5 w-3.5"/>}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
}
