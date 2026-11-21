'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {ChevronDown} from 'lucide-react';
import {alignments,blockNames,fonts,ornaments,specialPages,trims,type BlockName,type BookStyle} from '@/lib/kachamak/book-style';
import type {Novel} from '@/lib/kachamak/types';
import type {Proof} from '@/lib/kachamak/publication';
import {GalleryImagePicker} from './GalleryImagePicker';

const input='min-w-0 max-w-full rounded border border-white/15 bg-background px-2 py-1.5 text-xs text-foreground';
function Field({label,children}:{label:string;children:ReactNode}){
  return <label className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-center gap-2 text-xs text-muted-foreground"><span>{label}</span>{children}</label>;
}
function Pick<T extends string>({label,value,options,change}:{label:string;value:T;options:readonly T[];change:(v:T)=>void}){
  return <Field label={label}><select className={input} value={value} onChange={e=>change(e.target.value as T)}>{options.map(v=><option key={v}>{v}</option>)}</select></Field>;
}
function Amount({label,value,change,min,max,step=.1}:{label:string;value:number;min:number;max:number;step?:number;change:(v:number)=>void}){
  const [text,setText]=useState(String(value));useEffect(()=>setText(String(value)),[value]);
  return <Field label={label}><input type="number" min={min} max={max} step={step} className={input} value={text}
    onBlur={()=>setText(String(value))} onChange={e=>{setText(e.target.value);const n=e.target.valueAsNumber;if(Number.isFinite(n)&&n>=min&&n<=max)change(n);}}/></Field>;
}
function Check({label,value,change}:{label:string;value:boolean;change:(v:boolean)=>void}){
  return <label className="flex cursor-pointer items-center justify-between gap-2 text-xs"><span>{label}</span><input className="accent-amber-400" type="checkbox" checked={value} onChange={e=>change(e.target.checked)}/></label>;
}
function Group({title,children,initial=false}:{title:string;children:ReactNode;initial?:boolean}){
  const [open,setOpen]=useState(initial);
  return <section className="border-b border-white/10 py-1"><button className="flex w-full items-center justify-between py-2.5 text-left text-sm font-semibold" aria-expanded={open} onClick={()=>setOpen(!open)}>{title}<ChevronDown className={'size-3.5 text-muted-foreground '+(open?'rotate-180':'')}/></button>{open&&<div className="grid gap-3 pb-4">{children}</div>}</section>;
}
export function PublishTools({novel,name,style:s,change,save,inspect,print}:{novel:Novel;name:string;style:BookStyle;change:(s:BookStyle)=>void;save:()=>void;inspect:(p:Proof)=>void;print:boolean}){
  const [block,setBlock]=useState<BlockName>('Quote');
  const patch=<K extends keyof BookStyle>(key:K,value:BookStyle[K])=>change({...s,[key]:value});
  const b=s.blocks[block],blockPatch=(value:Partial<typeof b>)=>patch('blocks',{...s.blocks,[block]:{...b,...value}});
  const matter=[['Copyright','copyright'],['Dedication','dedication'],['About the author','biography'],['Colophon','colophon']] as const;
  return <div aria-label="Book style settings" className="min-w-0">
    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3"><strong className="truncate text-sm">{name}</strong><button className={input+' shrink-0'} onClick={save}>Save as style</button></div>
    <Group title="Typography" initial>
      <Pick label="Body font" options={fonts} value={s.bodyFont} change={v=>patch('bodyFont',v)}/>
      <Pick label="Heading font" options={fonts} value={s.headingFont} change={v=>patch('headingFont',v)}/>
      <Amount label="Body size (pt)" value={s.size} min={8} max={20} step={.5} change={v=>patch('size',v)}/>
      <Amount label="Heading size (pt)" value={s.headingSize} min={14} max={48} step={1} change={v=>patch('headingSize',v)}/>
      <Amount label="Line height" value={s.leading} min={1} max={2.4} step={.05} change={v=>patch('leading',v)}/>
      <Amount label="Paragraph gap (em)" value={s.paragraphGap} min={0} max={2} change={v=>patch('paragraphGap',v)}/>
      <Amount label="Indent (em)" value={s.indent} min={0} max={3} change={v=>patch('indent',v)}/>
      <Pick label="Alignment" options={alignments} value={s.align} change={v=>patch('align',v)}/>
      <Check label="Automatic hyphenation" value={s.hyphens} change={v=>patch('hyphens',v)}/>
    </Group>
    <Group title="Chapter design">
      <Pick label="Numbering" options={['Arabic','Roman','None']} value={s.numbering} change={v=>patch('numbering',v)}/>
      <Pick label="Title alignment" options={['left','center','right']} value={s.chapterAlign} change={v=>patch('chapterAlign',v)}/>
      <Amount label="Title offset (%)" min={0} max={30} step={1} value={s.sink} change={v=>patch('sink',v)}/>
      <Pick label="Chapter ornament" options={ornaments} value={s.ornament} change={v=>patch('ornament',v)}/>
      <Amount label="After title (em)" min={.3} max={4} value={s.chapterGap} change={v=>patch('chapterGap',v)}/>
      <GalleryImagePicker novel={novel} onPick={ref=>patch('chapterImage',ref)}><button className={input}>{s.chapterImage?'Change chapter image':'Choose chapter image'}</button></GalleryImagePicker>
      {s.chapterImage&&<button className={input} onClick={()=>patch('chapterImage',undefined)}>Remove image</button>}
    </Group>
    <Group title="First paragraph">
      <Pick label="Initial" options={['Normal','Drop cap','Raised cap']} value={s.initial} change={v=>patch('initial',v)}/>
      <Check label="Small caps lead-in" value={s.smallCaps} change={v=>patch('smallCaps',v)}/>
      <Check label="Indent opening paragraph" value={s.firstIndent} change={v=>patch('firstIndent',v)}/>
    </Group>
    <Group title="Scene breaks"><Pick label="Divider" options={ornaments} value={s.divider} change={v=>patch('divider',v)}/>
      <Amount label="Divider spacing (em)" value={s.dividerGap} min={.25} max={4} step={.25} change={v=>patch('dividerGap',v)}/></Group>
    <Group title="Special blocks"><Pick label="Block" options={blockNames} value={block} change={v=>{setBlock(v);inspect('Special blocks');}}/>
      <Amount label="Size multiplier" value={b.size} min={.7} max={2} change={size=>blockPatch({size})}/>
      <Pick label="Block alignment" options={alignments} value={b.align} change={align=>blockPatch({align})}/>
      <Check label="Italic" value={b.italic} change={italic=>blockPatch({italic})}/><Check label="Side rule" value={b.rule} change={rule=>blockPatch({rule})}/>
    </Group>
    <Group title="Print & layout">{!print&&<p className="text-xs text-muted-foreground">These settings apply to the printed edition.</p>}
      <Pick label="Trim size" options={Object.keys(trims) as (keyof typeof trims)[]} value={s.trim} change={v=>patch('trim',v)}/>
      {(['top','bottom','inner','outer'] as const).map(k=><Amount key={k} label={k[0].toUpperCase()+k.slice(1)+' margin (mm)'} value={s[k]} min={8} max={40} step={1} change={v=>patch(k,v)}/>)}
      <Check label="Page numbers" value={s.folios} change={v=>patch('folios',v)}/><Check label="Running book title" value={s.running} change={v=>patch('running',v)}/>
      <Check label="Start chapters on right pages" value={s.recto} change={v=>patch('recto',v)}/>
    </Group>
    <Group title="Colors">{([['Body text','ink'],['Headings','heading'],['Accents','accent']] as const).map(([label,k])=><Field label={label} key={k}><input type="color" value={s[k]} className="h-7 w-full cursor-pointer" onChange={e=>patch(k,e.target.value)}/></Field>)}</Group>
    <Group title="Special pages">{specialPages.map(p=><div key={p} className="grid gap-2">
      <Check label={p} value={s.pages.includes(p)} change={v=>patch('pages',specialPages.filter(key=>key===p?v:s.pages.includes(key)))}/>
      {s.pages.includes(p)&&matter.filter(([page])=>page===p).map(([,k])=><textarea key={k} aria-label={p+' text'} rows={3} maxLength={10000} className={input} value={s[k]} onChange={e=>patch(k,e.target.value)}/>)}
    </div>)}</Group>
  </div>;
}
