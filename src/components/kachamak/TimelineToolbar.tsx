'use client';

import {useState, type ReactNode} from 'react';
import {ArrowLeftRight, CalendarCog, Check, Eye, GitBranch} from 'lucide-react';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {dateToMinute, formatDate, minutesPerDay, minuteToDate, TIMELINE_LIMIT, type StoryCalendar} from '@/lib/kachamak/story-calendar';
import {DateFields} from './TimelineEventEditor';
import {timeButton} from './CalendarSettings';
import type {NoteNode} from '@/lib/kachamak/types';
import type {TimelineDisplay} from '@/lib/kachamak/story-calendar';

export const timelineDisplays = [['axis', 'Timeline'], ['calendar', 'Calendar'], ['chronicle', 'Cards']] as const;
export type DisplayRange = {start: number; end: number};
const tool = 'inline-flex h-8 shrink-0 items-center gap-1.5 rounded px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-amber-400 data-[state=open]:bg-muted data-[state=open]:text-foreground';

function RangeFields({calendar, initial, onApply, onClear}: {
  calendar: StoryCalendar; initial: DisplayRange; onApply: (range: DisplayRange) => void; onClear?: () => void;
}) {
  const [from, setFrom] = useState(() => minuteToDate(calendar, initial.start));
  const [to, setTo] = useState(() => minuteToDate(calendar, initial.end));
  const [error, setError] = useState('');
  return <form className="space-y-3" onSubmit={e => {
    e.preventDefault();
    try {
      const start = dateToMinute(calendar, {...from, hour: 0, minute: 0});
      const end = Math.min(TIMELINE_LIMIT, dateToMinute(calendar, {...to, hour: 0, minute: 0}) + minutesPerDay(calendar) - 1);
      if (end < start) throw new Error('The end date must be on or after the start date.');
      onApply({start, end});
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Choose valid dates.'); }
  }}>
    <DateFields label="From" calendar={calendar} value={from} onChange={setFrom}/>
    <DateFields label="Through" calendar={calendar} value={to} onChange={setTo}/>
    {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
    <div className="flex items-center justify-between">
      <button type="button" disabled={!onClear} className={timeButton} onClick={onClear}>Clear range</button>
      <button type="submit" className={timeButton}>Apply range</button>
    </div>
  </form>;
}

export function TimelineToolbar({calendar, roots, root, range, initialRange, hiddenButtons, onCalendar, onPickRoot, onRange, onToggleButton}: {
  calendar: StoryCalendar; roots: NoteNode[]; root: NoteNode | null; range: DisplayRange | null; initialRange: DisplayRange;
  hiddenButtons: TimelineDisplay[]; onCalendar: () => void; onPickRoot: (id: string | null) => void;
  onRange: (value: DisplayRange | null) => void; onToggleButton: (mode: TimelineDisplay) => void;
}) {
  const [rangeOpen, setRangeOpen] = useState(false);
  const [rootOpen, setRootOpen] = useState(false);
  const pick=(id:string|null)=>{onPickRoot(id);setRootOpen(false);};
  const rootChoices=(nodes:NoteNode[],depth:number):ReactNode=>nodes.map(node=><li key={node.id}>
    <button type="button" aria-pressed={root?.id===node.id} onClick={()=>pick(node.id)}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted aria-pressed:bg-muted"
      style={{paddingLeft:8+Math.min(depth,8)*12,color:node.color||undefined}}>
      <span className="break-words">{node.title||'Untitled'}</span>{root?.id===node.id&&<Check className="ml-auto size-3 shrink-0"/>}
    </button>{node.children.length>0&&<ul>{rootChoices(node.children,depth+1)}</ul>}
  </li>);
  const apply = (value: DisplayRange | null) => {onRange(value); setRangeOpen(false);};
  return <nav aria-label="Timeline tools" className="flex shrink-0 flex-wrap items-center gap-x-1 border-b border-border bg-background px-2 py-1">
    <button type="button" className={tool + ' max-w-full'} title={calendar.name} onClick={onCalendar}>
      <CalendarCog className="size-4 shrink-0"/><span className="max-w-40 truncate">{calendar.name}</span>
    </button>
    <span aria-hidden="true" className="mx-1 h-4 border-l border-border"/>
    <Popover open={rootOpen} onOpenChange={setRootOpen}>
      <PopoverTrigger asChild><button type="button" className={tool} aria-label="Select timeline root" title={root?.title??'Select timeline root'}>
        <GitBranch className="size-4"/>Timeline
      </button></PopoverTrigger>
      <PopoverContent aria-label="Timeline root notes" align="start" className="max-h-[min(60vh,var(--radix-popover-content-available-height))] w-64 max-w-[90vw] overflow-y-auto p-1">
        <button type="button" aria-pressed={!root} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted" onClick={()=>pick(null)}>Follow tree selection{!root&&<Check className="ml-auto size-3"/>}</button>
        {rootOpen&&<ul className="border-t border-border">{rootChoices(roots,0)}</ul>}
      </PopoverContent>
    </Popover>
    <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
      <PopoverTrigger asChild><button type="button" className={tool} title={range ? formatDate(calendar,range.start,'day') + ' – ' + formatDate(calendar,range.end,'day') : 'Filter by date range'}>
        <ArrowLeftRight className="size-4"/><span className={range ? 'text-amber-400' : undefined}>Range</span>
      </button></PopoverTrigger>
      <PopoverContent aria-label="Filter timeline dates" align="start" className="max-h-[var(--radix-popover-content-available-height)] w-[min(20rem,calc(100vw-1rem))] overflow-auto">
        <RangeFields calendar={calendar} initial={range ?? initialRange} onApply={apply} onClear={range ? () => apply(null) : undefined}/>
      </PopoverContent>
    </Popover>
    <Popover>
      <PopoverTrigger asChild><button type="button" className={tool}><Eye className="size-4"/>View</button></PopoverTrigger>
      <PopoverContent aria-label="Visible view buttons" align="start" className="grid w-40 gap-0.5 p-1">
        {timelineDisplays.map(([key,label]) => <label key={key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted">
          <input type="checkbox" checked={!hiddenButtons.includes(key)} onChange={()=>onToggleButton(key)}/>{label}
        </label>)}
      </PopoverContent>
    </Popover>
  </nav>;
}
