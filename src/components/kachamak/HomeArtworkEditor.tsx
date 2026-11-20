'use client';
import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {Crop,Focus,Scan,Blend,Undo2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {encodeHomepageCutout} from '@/lib/kachamak/project-settings';
import type {HomeBlock,HomeImageFrame} from '@/lib/kachamak/homepage';
import {HomeArtwork} from './HomeArtwork';

export type ArtworkChanges=Pick<HomeBlock,'imageFrame'|'imageCutout'>;
type Gesture={x:number;y:number;width:number;height:number;frame:HomeImageFrame;edge?:string};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const defaults=(ratio:number):HomeImageFrame=>({ratio,zoom:1,x:.5,y:.5,fade:false});

export function HomeArtworkEditor({src,block,onClose,onSave}:{
  src:string;block:HomeBlock;onClose:()=>void;onSave:(changes:ArtworkChanges)=>boolean;
}){
  const [natural,setNatural]=useState(0),[frame,setFrame]=useState(block.imageFrame);
  const [cutout,setCutout]=useState(block.imageCutout);
  const [busy,setBusy]=useState(''),[error,setError]=useState('');
  const worker=useRef<Worker|null>(null);
  const canvas=useRef<HTMLDivElement>(null);
  const gesture=useRef<Gesture|null>(null);
  useEffect(()=>{
    let live=true;
    const img=new Image();
    img.onload=()=>{if(live)setNatural(img.naturalWidth/img.naturalHeight);};
    img.onerror=()=>{if(live)setError('Could not open this image.');};
    img.src=src;
    return ()=>{live=false;worker.current?.terminate();worker.current=null;};
  },[src]);
  const current=frame??defaults(natural||1);
  const update=(change:Partial<HomeImageFrame>)=>setFrame({...current,...change});
  function start(e:PointerEvent<HTMLDivElement>){
    if(!canvas.current || e.button!==0 || !e.isPrimary)return;
    const r=canvas.current.getBoundingClientRect();
    gesture.current={x:e.clientX,y:e.clientY,width:r.width,height:r.height,frame:current,edge:(e.target as HTMLElement).dataset.edge};
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function move(e:PointerEvent<HTMLDivElement>){
    const g=gesture.current;
    if(!g || !e.isPrimary)return;
    const dx=e.clientX-g.x,dy=e.clientY-g.y;
    if(g.edge){
      const w=g.width+(g.edge==='right'?dx:g.edge==='left'?-dx:0);
      const h=g.height+(g.edge==='bottom'?dy:g.edge==='top'?-dy:0);
      setFrame({...g.frame,ratio:clamp(Math.max(32,w)/Math.max(24,h),1/16,32)});
      return;
    }
    // At fill, one axis may already overflow even before the user zooms.
    const horizontal=Math.max(g.width,g.height*natural)*g.frame.zoom-g.width;
    const vertical=Math.max(g.height,g.width/natural)*g.frame.zoom-g.height;
    setFrame({...g.frame,x:horizontal>1?clamp(g.frame.x-dx/horizontal,0,1):g.frame.x,
      y:vertical>1?clamp(g.frame.y-dy/vertical,0,1):g.frame.y});
  }
  function removeBackground(){
    if(worker.current)return;
    setError('');
    try{
      const job=new Worker('/image-tools/cutout-worker.js');
      worker.current=job;
      setBusy('Removing background…');
      const finish=()=>{job.terminate();worker.current=null;setBusy('');};
      job.onerror=()=>{finish();setError('Image processing could not start. Try again.');};
      job.onmessage=({data})=>{
        if(worker.current!==job){data.bitmap?.close();return;}
        if(data.status){setBusy(data.status);return;}
        finish();
        if(data.error){setError(data.error);return;}
        try{setCutout(encodeHomepageCutout(data.bitmap));}
        catch(e){setError(e instanceof Error?e.message:'Could not prepare the image.');}
      };
      job.postMessage(src);
    }catch{worker.current?.terminate();worker.current=null;setBusy('');setError('Image processing is unavailable in this browser.');}
  }
  const confirm=()=>{
    const f=frame;
    const originalSize=f&&Math.abs(f.ratio-natural)<.00001&&f.zoom===1&&!f.fade;
    if(onSave({imageFrame:originalSize?undefined:f,imageCutout:cutout}))onClose();
    else setError('This block changed. Reopen it to edit the latest version.');
  };
  return <Dialog open onOpenChange={open=>{if(!open)onClose();}}>
    <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader><DialogTitle>Reposition image</DialogTitle></DialogHeader>
      {natural>0&&<div ref={canvas} tabIndex={0} role="group" aria-label="Image crop. Drag or use arrow keys to reposition."
        className="relative mx-auto w-full touch-none cursor-grab select-none rounded-sm outline outline-dashed outline-muted-foreground/60 focus-visible:outline-amber-400 active:cursor-grabbing"
        style={{maxWidth:`min(100%, ${current.ratio*42}dvh)`}}
        onPointerDown={start} onPointerMove={move} onLostPointerCapture={()=>{gesture.current=null;}}
        onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();
          update({x:clamp(current.x+(e.key==='ArrowLeft'?.05:e.key==='ArrowRight'?-.05:0),0,1),y:clamp(current.y+(e.key==='ArrowUp'?.05:e.key==='ArrowDown'?-.05:0),0,1)});}}>
        <HomeArtwork src={cutout||src} frame={current} alt="Crop preview"/>
        {(['left','right','top','bottom'] as const).map(edge=><span key={edge} data-edge={edge} aria-hidden="true"
          className={'absolute grid place-items-center '+({left:'inset-y-0 left-0 w-4 cursor-ew-resize',right:'inset-y-0 right-0 w-4 cursor-ew-resize',top:'inset-x-4 top-0 h-4 cursor-ns-resize',bottom:'inset-x-4 bottom-0 h-4 cursor-ns-resize'}[edge])}>
          <span className={'pointer-events-none rounded-full bg-foreground/80 shadow '+(edge==='left'||edge==='right'?'h-6 w-1':'h-1 w-6')}/>
        </span>)}
      </div>}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">Frame<select className="rounded border border-border bg-background p-1" value={current.ratio===natural?'original':String(current.ratio)}
          onChange={e=>update({ratio:e.target.value==='original'?natural:Number(e.target.value)})}>
          <option value="original">Original proportions</option>
          {[[3,'Banner'],[16/9,'Landscape'],[1,'Square'],[.75,'Portrait']].map(([r,label])=><option key={r} value={r}>{label}</option>)}
          {current.ratio!==natural&&![3,16/9,1,.75].includes(current.ratio)&&<option value={current.ratio}>Custom</option>}
        </select></label>
        <label className="flex items-center gap-2 text-sm">Zoom<input className="accent-amber-400" aria-label="Image zoom" type="range" min="1" max="6" step=".05" value={current.zoom} onChange={e=>update({zoom:Number(e.target.value)})}/><output>{Math.round(current.zoom*100)}%</output></label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={()=>setFrame({...defaults(natural),fade:current.fade})}><Scan/>Fit whole image</Button>
        <Button type="button" size="sm" variant="outline" onClick={()=>update({zoom:1,x:.5,y:.5})}><Crop/>Reset to fill</Button>
        <Button type="button" size="sm" variant="outline" aria-pressed={current.fade} onClick={()=>update({fade:!current.fade})}><Blend/>{current.fade?'Remove bottom fade':'Add bottom fade'}</Button>
        <Button type="button" size="sm" variant="outline" disabled={!!busy||!natural} onClick={()=>{if(cutout){setCutout(undefined);setError('');}else removeBackground();}}>
          {cutout?<Undo2/>:<Focus/>}{cutout?'Restore background':'Remove background'}</Button>
      </div>
      {busy&&<p role="status" className="text-sm text-muted-foreground">{busy}</p>}
      {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="button" disabled={!!busy||!natural} onClick={confirm}>Apply</Button></div>
    </DialogContent>
  </Dialog>;
}
