'use client';
import {type ReactNode} from 'react';
import {Copy,Folder,Layers,Pencil} from 'lucide-react';
import {ContextMenu,ContextMenuTrigger,ContextMenuContent,ContextMenuItem,ContextMenuSeparator,ContextMenuSub,ContextMenuSubTrigger,ContextMenuSubContent,ContextMenuRadioGroup,ContextMenuRadioItem} from '@/components/ui/context-menu';
import type {StoryEvent,TimelineGroup} from '@/lib/kachamak/story-calendar';
import type {EventRow} from '@/lib/kachamak/timeline-data';
import {useKachamak} from '@/lib/kachamak/store';
import {findNode} from '@/lib/kachamak/utils';
import {ColourPalette} from './PresetColourPicker';
export function TimelineCardMenu({row,groups,color,opacity,detail,onEdit,children}:{row:EventRow;groups:TimelineGroup[];color:string;opacity:number;detail:string;onEdit:()=>void;children:ReactNode}) {
  const patch=(value:Partial<StoryEvent>)=>{const state=useKachamak.getState(),novel=state.novels.find(n=>n.id===state.activeNovelId),live=novel&&findNode(novel.sections[row.section],row.node.id);if(live?.event)state.updateNode(row.section,row.node.id,{event:{...live.event,...value}});};
  return <><ContextMenu><ContextMenuTrigger asChild>{children}</ContextMenuTrigger><ContextMenuContent aria-label={`Event actions for ${row.node.title}`} className="w-56 font-sans [&_[role=menuitem]]:text-xs">
    <div className="p-1"><ColourPalette label="Card color" value={row.event.cardColor} onChange={value=>patch({cardColor:value||undefined})}/></div>
    <div className="flex items-center justify-between gap-2 px-2 py-2"><span className="text-xs">Opacity</span><div className="flex gap-1" role="group" aria-label="Card opacity">{[.25,.6,1].map(value=><button key={value} type="button" aria-label={`Card opacity ${Math.round(value*100)}%`} aria-pressed={opacity===value} title={`${Math.round(value*100)}%`} className="flex h-6 w-6 items-center justify-center rounded border border-border aria-pressed:bg-accent" onClick={()=>patch({cardOpacity:value})}><span className="h-3 w-3 rounded-sm bg-foreground" style={{opacity:value}}/></button>)}</div></div>
    <ContextMenuSeparator/><ContextMenuItem onSelect={onEdit}><Pencil/>Edit event</ContextMenuItem>
    <ContextMenuItem onSelect={()=>useKachamak.getState().duplicateNode(row.section,row.node.id)}><Copy/>Duplicate event</ContextMenuItem>
    <ContextMenuSub><ContextMenuSubTrigger><Folder className="mr-2 h-4 w-4"/>Move to group</ContextMenuSubTrigger><ContextMenuSubContent className="max-h-72 overflow-auto font-sans"><ContextMenuRadioGroup value={row.event.groupId??''} onValueChange={groupId=>patch({groupId})}><ContextMenuRadioItem value="">Ungrouped</ContextMenuRadioItem>{groups.map(group=><ContextMenuRadioItem key={group.id} value={group.id}><span className="mr-2 h-2 w-2 rounded-full" style={{background:group.color}}/>{group.name}</ContextMenuRadioItem>)}</ContextMenuRadioGroup></ContextMenuSubContent></ContextMenuSub>
    <ContextMenuSub><ContextMenuSubTrigger><Layers className="mr-2 h-4 w-4"/>Detail level</ContextMenuSubTrigger><ContextMenuSubContent className="font-sans"><ContextMenuRadioGroup value={detail} onValueChange={value=>patch({cardDetail:value as StoryEvent['cardDetail']})}><ContextMenuRadioItem value="title">Title only</ContextMenuRadioItem><ContextMenuRadioItem value="dates">Title + dates</ContextMenuRadioItem><ContextMenuRadioItem value="synopsis">Title + synopsis</ContextMenuRadioItem></ContextMenuRadioGroup></ContextMenuSubContent></ContextMenuSub>
  </ContextMenuContent></ContextMenu></>;
}
