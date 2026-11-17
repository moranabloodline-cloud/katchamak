"use client";
import {useState} from 'react';
import {AlignLeft,AlignJustify,Type,Rows3,AlignCenter,Maximize2} from 'lucide-react';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {useKachamak} from '@/lib/kachamak/store';
import {PAGE_FONTS,DEFAULT_PAGE_FORMAT} from '@/lib/kachamak/page-format';

function Choices<T extends string|number>({label,values,value,onChange,preview}:{label:string;values:{value:T;label:string}[];value:T;onChange:(value:T)=>void;preview?:(index:number)=>React.ReactNode}) {
  return <fieldset className="min-w-0"><legend className="mb-2 text-xs font-medium">{label}</legend><div className="flex flex-wrap gap-1">{values.map((item,index)=><button type="button" key={item.value} aria-label={`${label}: ${item.label}`} title={item.label} aria-pressed={value===item.value} onClick={()=>onChange(item.value)} className={`flex h-9 min-w-8 items-center justify-center rounded-md border px-1.5 text-xs transition-colors ${value===item.value?'border-amber-300/70 bg-amber-400/10 text-foreground':'border-border text-muted-foreground hover:bg-muted/40'}`}>{preview?preview(index):item.label}</button>)}</div></fieldset>;
}
function Lines({index,kind}:{index:number;kind:'height'|'indent'|'gap'|'width'}) {
  return <span aria-hidden="true" className="flex w-5 flex-col" style={{gap:kind==='height'?2+index:kind==='gap'?2:3,width:kind==='width'?8+index*3:20}}>{[0,1,2,3].map(row=><span key={row} className="block h-px bg-current" style={{marginLeft:kind==='indent'&&row===0?index*3:0,marginTop:kind==='gap'&&row===2?index*2:0,width:row===3?'70%':undefined}}/>)}</span>;
}
export function PageFormatMenu({disabled=false}:{disabled?:boolean}) {
  const [open,setOpen]=useState(false);
  const page=useKachamak(s=>s.pageFormat??DEFAULT_PAGE_FORMAT),setPage=useKachamak(s=>s.setPageFormat);
  const font=useKachamak(s=>s.editorFont),size=useKachamak(s=>s.editorSize),spacing=useKachamak(s=>s.editorSpacing);
  const setFont=useKachamak(s=>s.setEditorFont),setSize=useKachamak(s=>s.setEditorSize),setSpacing=useKachamak(s=>s.setEditorSpacing);
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><button type="button" disabled={disabled} aria-label="Format" className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors disabled:opacity-40 ${open?'bg-white/10 text-foreground':'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}><Type className="h-3.5 w-3.5"/>Format</button></PopoverTrigger>
    <PopoverContent aria-label="Page format" align="end" sideOffset={10} className="w-[440px] max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto border-border bg-popover p-0 text-popover-foreground shadow-xl kachamak-scroll">
      <section className="p-4"><h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Typography</h2><div className="grid grid-cols-2 gap-x-5 gap-y-5">
        <label className="min-w-0 text-xs font-medium">Font family<select aria-label="Page font family" value={font} onChange={e=>setFont(e.target.value)} className="mt-2 h-9 w-full rounded-md border border-border bg-background px-2 text-xs">{PAGE_FONTS.map(f=><option key={f}>{f}</option>)}</select></label>
        <Choices label="Text size" value={size} values={[14,16,18,20].map(n=>({value:n,label:`${n}px`}))} onChange={setSize} preview={index=><span aria-hidden="true" style={{fontSize:12+index*2,fontWeight:600}}>Ab</span>}/>
        <Choices label="Line height" value={spacing} values={['1.0','1.15','1.5','2.0'].map(n=>({value:n,label:`${n}×`}))} onChange={setSpacing} preview={index=><Lines index={index} kind="height"/>}/>
        <div><Choices label="Text indent" value={page.indent} values={([0,1,1.5,2] as const).map(n=>({value:n,label:`${n}em`}))} onChange={indent=>setPage({indent})} preview={index=><Lines index={index} kind="indent"/>}/><label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={page.chicago} onChange={e=>setPage({chicago:e.target.checked})}/>Chicago Style</label></div>
        <Choices label="Paragraph spacing" value={page.paragraphGap??-1} values={([0,0.5,1,1.5] as const).map(n=>({value:n,label:`${n}em`}))} onChange={paragraphGap=>setPage({paragraphGap:paragraphGap as 0|0.5|1|1.5})} preview={index=><Lines index={index} kind="gap"/>}/>
        <Choices label="Page width" value={page.width} values={([36,48,60,72,'full'] as const).map(n=>({value:n,label:n==='full'?'Full width':`${n}rem`}))} onChange={width=>setPage({width})} preview={index=>index===4?<Maximize2 className="h-3.5 w-3.5"/>:<Lines index={index} kind="width"/>}/>
        <Choices label="Text alignment" value={page.align} values={[{value:'left',label:'Left'},{value:'justify',label:'Justify'}]} onChange={align=>setPage({align})} preview={index=><span className="flex items-center gap-1">{index?<AlignJustify className="h-3.5 w-3.5"/>:<AlignLeft className="h-3.5 w-3.5"/>}{index?'Justify':'Left'}</span>}/>
        <label className="text-xs font-medium">Scene divider<select aria-label="Scene divider" value={page.divider} onChange={e=>setPage({divider:e.target.value as typeof page.divider})} className="mt-2 h-9 w-full rounded-md border border-border bg-background px-2 text-xs"><option value="line">Line</option><option value="dots">Dots</option><option value="asterisks">Asterisks</option><option value="space">Space</option></select></label>
      </div></section>
      <section className="border-t border-border p-4"><h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Page</h2>
        <Choices label="Layout" value={page.layout} values={[{value:'centered',label:'Centered'},{value:'fit',label:'Fit content'},{value:'stacked',label:'Stacked'}]} onChange={layout=>setPage({layout})} preview={index=><span className="flex items-center gap-1.5">{index===0?<AlignCenter className="h-3.5 w-3.5"/>:index===1?<Maximize2 className="h-3.5 w-3.5"/>:<Rows3 className="h-3.5 w-3.5"/>}{['Centered','Fit content','Stacked'][index]}</span>}/>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{page.layout==='fit'?'Use the available workspace width.':page.layout==='stacked'?'Display notes as separate pages.':'Center the text at your selected page width.'}</p>
        <h3 className="mb-1 mt-5 text-xs font-medium">Codex annotations</h3><p className="mb-2 text-[11px] text-muted-foreground">Underline linked references in your text.</p><label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={page.colorizeAnnotations} onChange={e=>setPage({colorizeAnnotations:e.target.checked})}/>Colorize annotations</label>
      </section>
    </PopoverContent>
  </Popover>;
}
