'use client';
import {useState} from 'react';
import {AlignStartVertical,AlignCenterVertical,AlignEndVertical,AlignStartHorizontal,AlignCenterHorizontal,AlignEndHorizontal,ArrowDownToLine,ArrowUpToLine,Columns3,Rows3,Layers,Link2,LockKeyhole,UnlockKeyhole,X} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import type {Alignment,SelectionCommand} from '@/lib/kachamak/canvas-selection';
import type {HomeBlock} from '@/lib/kachamak/homepage';
import {ColourPalette} from './PresetColourPicker';

const alignments=[
  ['left',AlignStartVertical],['center',AlignCenterVertical],['right',AlignEndVertical],
  ['top',AlignStartHorizontal],['middle',AlignCenterHorizontal],['bottom',AlignEndHorizontal]
] as const;
type Props={items:HomeBlock[];fixed:boolean;clear:()=>void;run:(command:SelectionCommand)=>void;convert:(title:string)=>boolean};

export function CanvasSelectionTools({items,fixed,clear,run,convert}:Props){
  const [naming,setNaming]=useState(false),[title,setTitle]=useState(''),[error,setError]=useState('');
  const loose=items.every(b=>!b.columnId), allLocked=items.every(b=>b.positionLocked);
  const firstColor=items[0]?.color;
  const selectionColor=items.every(item=>item.color===firstColor)?firstColor:undefined;
  const align=(value:Alignment)=>run({kind:'align',alignment:value});
  return <section className="cv-batch" aria-label="Selection tools">
    <div>
      <div className="cv-tools-head"><strong>{items.length} selected</strong><button type="button" title="Clear selection" aria-label="Clear selection" onClick={clear}><X size={15}/></button></div>
      <fieldset><legend>Color</legend>
        <ColourPalette label="Selection color" value={selectionColor} onChange={color=>run({kind:'color',color})} allowClear={false}/>
      </fieldset>
      <fieldset disabled={!loose||fixed||items.length<2} title={!loose?'Columns arrange their own cards':undefined}><legend>Alignment</legend><div className="cv-batch-icons">
        {alignments.map(([value,Icon])=><button key={value} type="button" aria-label={'Align '+value} title={'Align '+value} onClick={()=>align(value)}><Icon size={16}/></button>)}
      </div></fieldset>
      <fieldset disabled={!loose||fixed||items.length<3} title="Distribute three or more free items"><legend>Distribute</legend><div className="cv-batch-icons">
        <button aria-label="Distribute horizontally" title="Equal horizontal gaps" onClick={()=>run({kind:'distribute',axis:'x'})}><Columns3 size={16}/></button>
        <button aria-label="Distribute vertically" title="Equal vertical gaps" onClick={()=>run({kind:'distribute',axis:'y'})}><Rows3 size={16}/></button>
      </div></fieldset>
      <div className="cv-batch-actions">
        <button disabled={items.length<2} onClick={()=>run({kind:'connect'})}><Link2/>Connect with lines</button>
        <button disabled={fixed} onClick={()=>{setTitle('');setError('');setNaming(true);}}><Layers/>Convert to canvas</button>
        <button onClick={()=>run({kind:'lock',locked:!allLocked})}>{allLocked?<UnlockKeyhole/>:<LockKeyhole/>}{allLocked?'Unlock position':'Lock position'}</button>
        <button disabled={!loose} onClick={()=>run({kind:'stack',front:true})}><ArrowUpToLine/>Bring to front</button>
        <button disabled={!loose} onClick={()=>run({kind:'stack',front:false})}><ArrowDownToLine/>Send to back</button>
      </div>
    </div>
    <Dialog open={naming} onOpenChange={setNaming}><DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>Convert to canvas</DialogTitle></DialogHeader>
      <form className="grid gap-3" onSubmit={e=>{e.preventDefault();if(!convert(title))setError('The selection changed. Select the items again.');}}>
        <label className="grid gap-2">Canvas name<Input autoFocus required value={title} onChange={e=>setTitle(e.target.value)}/></label>
        {error&&<p role="alert">{error}</p>}<Button disabled={!title.trim()} type="submit">Create canvas</Button>
      </form>
    </DialogContent></Dialog>
  </section>;
}
