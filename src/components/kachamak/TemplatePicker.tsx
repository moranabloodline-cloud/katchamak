'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { iconByName } from '@/lib/kachamak/icons';
import type { NoteNode } from '@/lib/kachamak/types';

export function TemplatePicker({ templates, onChoose, onClose }: {
  templates: NoteNode[];
  onChoose: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const matches: { note: NoteNode; path: string }[] = [];
  const term = query.trim().toLocaleLowerCase();
  function visit(notes: NoteNode[], path: string) {
    for (const note of notes) {
      if (note.hidden) continue;
      const title = note.title || 'Untitled';
      const fullPath = path ? path + ' / ' + title : title;
      if (fullPath.toLocaleLowerCase().includes(term)) matches.push({ note, path });
      visit(note.children, fullPath);
    }
  }
  visit(templates, '');
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent aria-describedby={undefined} className="gap-3 sm:max-w-md">
      <DialogHeader><DialogTitle>Insert Template</DialogTitle></DialogHeader>
      <input aria-label="Search templates" placeholder="Search templates" value={query}
        onChange={event => setQuery(event.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-amber-500" />
      <div className="max-h-[min(50vh,24rem)] overflow-y-auto kachamak-scroll">
        {matches.map(({ note, path }) => {
          const Icon = iconByName(note.icon) ?? FileText;
          return <button key={note.id} type="button" onClick={() => onChoose(note.id)}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent">
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" style={{ color: note.color || undefined }} />
            <span className="min-w-0"><span className="block break-words">{note.title || 'Untitled'}</span>
              {path && <span className="block break-words text-xs text-muted-foreground">{path}</span>}
            </span>
          </button>;
        })}
        {!matches.length && <p className="px-2 py-3 text-sm text-muted-foreground">
          {term ? 'No matching templates.' : 'Add a note to the Templates tab to use it here.'}
        </p>}
      </div>
    </DialogContent>
  </Dialog>;
}
