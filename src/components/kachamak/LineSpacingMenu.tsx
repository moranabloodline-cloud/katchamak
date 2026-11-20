'use client';

import {useRef, useState} from 'react';
import {Check, ChevronDown} from 'lucide-react';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {LINE_SPACINGS} from '@/lib/kachamak/page-format';
import {applySelectionSpacing, selectedSpacing, validSelectionLeading, type SpacingChange} from '@/lib/kachamak/editor-spacing';
import {editorForRange} from '@/lib/kachamak/editor-blocks';

type Props = {
  selection: () => Range | null;
  validate: (range: Range | null) => Range | null;
  disabled: boolean;
};

const itemClass = 'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-muted focus-visible:bg-muted disabled:opacity-45';

export function LineSpacingMenu({selection,validate,disabled}: Props) {
  const [open,setOpen] = useState(false);
  const [custom,setCustom] = useState(false);
  const [input,setInput] = useState('');
  const [info,setInfo] = useState<ReturnType<typeof selectedSpacing>>({value:null,wholeParagraphs:false});
  const bookmark = useRef<Range | null>(null);

  function toggle(next: boolean) {
    if (next) {
      const range = selection();
      if (!range) return;
      bookmark.current = range.cloneRange();
      const current = selectedSpacing(range);
      setInfo(current);
      setInput(current.value?.toString() ?? '');
      setCustom(false);
    }
    setOpen(next);
  }

  function apply(change: SpacingChange) {
    applySelectionSpacing(validate(bookmark.current), change);
    setOpen(false);
  }

  return <Popover open={open} onOpenChange={toggle}>
    <PopoverTrigger asChild>
      <button type="button" aria-label="Line spacing" title="Line spacing" disabled={disabled}
        onMouseDown={event => event.preventDefault()}
        className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 3v18M2 6l3-3 3 3M2 18l3 3 3-3M11 5h11M11 12h11M11 19h11"/></svg><ChevronDown size={11}/>
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" data-editor-toolbar-popup aria-label="Line spacing options" className="w-60 p-1.5 text-sm"
      onCloseAutoFocus={event => event.preventDefault()}
      onEscapeKeyDown={() => {
        const range = validate(bookmark.current);
        if (!range) return;
        editorForRange(range)?.focus({preventScroll:true});
        const current = window.getSelection();
        current?.removeAllRanges();
        current?.addRange(range);
      }}>
      {LINE_SPACINGS.map(label => <button key={label} type="button" aria-pressed={info.value === Number(label)}
        className={itemClass} onClick={() => apply({leading:Number(label)})}>
        <Check size={14} className={info.value === Number(label) ? '' : 'invisible'}/>{label}×
      </button>)}
      <button type="button" aria-expanded={custom} className={itemClass} onClick={() => setCustom(!custom)}>Line spacing options…</button>
      {custom && <form className="flex items-end gap-2 px-2 py-1.5" onSubmit={event => {
        event.preventDefault();
        if (validSelectionLeading(Number(input))) apply({leading:Number(input)});
      }}>
        <label className="flex-1 text-xs">Custom spacing (×)
          <input autoFocus required type="number" inputMode="decimal" min="1" max="4" step="0.01" value={input}
            onChange={event => setInput(event.target.value)} className="mt-1 w-full rounded border bg-background px-2 py-1"/>
        </label>
        <button type="submit" disabled={!validSelectionLeading(Number(input))} className="rounded border px-2 py-1 disabled:opacity-45">Apply</button>
      </form>}
      <div className="mt-1 border-t pt-1">
        {(['before','after'] as const).map(edge => <button key={edge} type="button" disabled={!info.wholeParagraphs}
          title={info.wholeParagraphs ? undefined : 'Select an entire paragraph'} className={itemClass}
          onClick={() => apply({remove:edge})}>Remove space {edge} paragraph</button>)}
      </div>
    </PopoverContent>
  </Popover>;
}
