import {Check} from 'lucide-react';
import {CANVAS_PAGE_TEMPLATES, type CanvasPageTemplateId} from '@/lib/kachamak/canvas-page-templates';

const previews: Record<CanvasPageTemplateId, string[]> = {
  blank: ['col-span-6 row-span-6 border-dashed border-border'],
  'project-cover': [
    'col-span-6 row-span-3 border-amber-400/30 bg-amber-400/20',
    'col-span-6 row-span-1 border-border bg-muted-foreground/15',
    'col-span-3 row-span-2 border-border bg-muted-foreground/10',
    'col-span-3 row-span-2 border-border bg-muted-foreground/10',
  ],
  'character-overview': [
    'col-span-6 row-span-1 border-border bg-muted-foreground/15',
    'col-span-2 row-span-5 border-amber-400/30 bg-amber-400/20',
    'col-span-2 row-span-5 border-emerald-400/25 bg-emerald-400/15',
    'col-span-2 row-span-5 border-sky-400/25 bg-sky-400/15',
  ],
  'research-board': [
    'col-span-6 row-span-1 border-border bg-muted-foreground/15',
    'col-span-3 row-span-5 border-emerald-400/25 bg-emerald-400/15',
    'col-span-3 row-span-3 border-sky-400/25 bg-sky-400/15',
    'col-span-3 row-span-2 border-border bg-muted-foreground/10',
  ],
  'author-page': [
    'col-span-2 row-span-4 border-amber-400/30 bg-amber-400/20',
    'col-span-4 row-span-4 border-border bg-muted-foreground/15',
    'col-span-3 row-span-2 border-border bg-muted-foreground/10',
    'col-span-3 row-span-2 border-border bg-muted-foreground/10',
  ],
  'project-example': [
    'col-span-4 row-span-3 border-amber-400/30 bg-amber-400/20',
    'col-span-2 row-span-3 border-sky-400/25 bg-sky-400/15',
    'col-span-2 row-span-2 border-emerald-400/25 bg-emerald-400/15',
    'col-span-2 row-span-2 border-emerald-400/25 bg-emerald-400/15',
    'col-span-2 row-span-2 border-emerald-400/25 bg-emerald-400/15',
    'col-span-6 row-span-1 border-border bg-muted-foreground/10',
  ],
  'story-board': [
    'col-span-6 row-span-1 border-sky-400/25 bg-sky-400/15',
    'col-span-2 row-span-2 border-amber-400/30 bg-amber-400/20',
    'col-span-2 row-span-2 border-amber-400/30 bg-amber-400/20',
    'col-span-2 row-span-2 border-border bg-muted-foreground/10',
    'col-span-2 row-span-2 border-emerald-400/25 bg-emerald-400/15',
    'col-span-2 row-span-2 border-border bg-muted-foreground/10',
    'col-span-2 row-span-2 border-emerald-400/25 bg-emerald-400/15',
  ],
  'mind-map': [
    'col-start-3 col-span-2 row-start-3 row-span-2 border-violet-400/35 bg-violet-400/25',
    'col-start-1 col-span-2 row-start-1 row-span-2 border-sky-400/25 bg-sky-400/15',
    'col-start-5 col-span-2 row-start-1 row-span-2 border-sky-400/25 bg-sky-400/15',
    'col-start-1 col-span-2 row-start-5 row-span-2 border-emerald-400/25 bg-emerald-400/15',
    'col-start-5 col-span-2 row-start-5 row-span-2 border-emerald-400/25 bg-emerald-400/15',
  ],
};

export function CanvasPageTemplatePicker({value,onChange}:{value:CanvasPageTemplateId;onChange:(value:CanvasPageTemplateId)=>void}) {
  const selected = CANVAS_PAGE_TEMPLATES.find(template => template.id === value);
  return <fieldset className="min-w-0">
    <legend className="mb-2 text-sm font-medium">Template</legend>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {CANVAS_PAGE_TEMPLATES.map(template => <label key={template.id} className="relative min-w-0 cursor-pointer">
        <input className="peer sr-only" type="radio" name="canvas-template" value={template.id}
          checked={template.id === value} onChange={() => onChange(template.id)}/>
        <span className="flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-2 transition-colors hover:border-amber-400/50 peer-checked:border-amber-500/70 peer-checked:bg-amber-500/10 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
          <span aria-hidden="true" className="grid h-14 grid-cols-6 grid-rows-6 gap-0.5 rounded-md border border-border bg-muted/40 p-2">
            {previews[template.id].map((placement,index) => <span key={index} className={'rounded-sm border '+placement}/>)}
          </span>
          <span className="pr-5 text-xs leading-tight font-medium sm:text-sm">{template.label}</span>
        </span>
        <Check aria-hidden="true" className="pointer-events-none absolute right-2 bottom-2 hidden size-4 text-amber-700 peer-checked:block dark:text-amber-300"/>
      </label>)}
    </div>
    <p aria-live="polite" className="mt-2 min-h-5 text-sm leading-relaxed text-muted-foreground">{selected?.description}</p>
  </fieldset>;
}
