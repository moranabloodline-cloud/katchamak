'use client';

import {useState} from 'react';
import {ArrowLeftRight, CalendarCog, Eye, Group} from 'lucide-react';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {dateToMinute, formatDate, minutesPerDay, minuteToDate, TIMELINE_LIMIT, type StoryCalendar} from '@/lib/kachamak/story-calendar';
import {DateFields} from './TimelineEventEditor';
import {timeButton} from './CalendarSettings';

export const timelineDisplays = [['axis', 'Timeline'], ['calendar', 'Calendar'], ['chronicle', 'Cards']] as const;
type Display = typeof timelineDisplays[number][0];
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

export function TimelineToolbar({calendar, mode, range, initialRange, onCalendar, onCreate, onRange, onGroups, onView}: {
  calendar: StoryCalendar; mode: Display; range: DisplayRange | null; initialRange: DisplayRange;
  onCalendar: () => void; onCreate: () => void; onRange: (value: DisplayRange | null) => void;
  onGroups: () => void; onView: (mode: Display) => void;
}) {
  const [rangeOpen, setRangeOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const apply = (value: DisplayRange | null) => {onRange(value); setRangeOpen(false);};
  return <nav aria-label="Timeline tools" className="flex shrink-0 flex-wrap items-center gap-x-1 border-b border-border bg-background px-2 py-1">
    <button type="button" className={tool + ' max-w-full'} title={calendar.name} onClick={onCalendar}>
      <CalendarCog className="size-4 shrink-0"/><span className="max-w-40 truncate">{calendar.name}</span>
    </button>
    <span aria-hidden="true" className="mx-1 h-4 border-l border-border"/>
    <button type="button" className={tool} aria-label="Create timeline" title="Create timeline" onClick={onCreate}>
      <span aria-hidden="true" className="text-base leading-none">+</span>Timeline
    </button>
    <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
      <PopoverTrigger asChild><button type="button" className={tool} title={range ? formatDate(calendar,range.start,'day') + ' – ' + formatDate(calendar,range.end,'day') : 'Filter by date range'}>
        <ArrowLeftRight className="size-4"/><span className={range ? 'text-amber-400' : undefined}>Range</span>
      </button></PopoverTrigger>
      <PopoverContent aria-label="Filter timeline dates" align="start" className="max-h-[var(--radix-popover-content-available-height)] w-[min(20rem,calc(100vw-1rem))] overflow-auto">
        <RangeFields calendar={calendar} initial={range ?? initialRange} onApply={apply} onClear={range ? () => apply(null) : undefined}/>
      </PopoverContent>
    </Popover>
    <button type="button" className={tool} onClick={onGroups}><Group className="size-4"/>Groups</button>
    <Popover open={viewOpen} onOpenChange={setViewOpen}>
      <PopoverTrigger asChild><button type="button" className={tool}><Eye className="size-4"/>View</button></PopoverTrigger>
      <PopoverContent aria-label="Choose timeline view" align="start" className="grid w-36 gap-0.5 p-1">
        {timelineDisplays.map(([key,label]) => <button type="button" key={key} aria-pressed={mode===key}
          className="rounded px-3 py-1.5 text-left text-xs hover:bg-muted aria-pressed:bg-amber-500/15 aria-pressed:text-amber-300"
          onClick={() => {onView(key); setViewOpen(false);}}>{label}</button>)}
      </PopoverContent>
    </Popover>
  </nav>;
}
