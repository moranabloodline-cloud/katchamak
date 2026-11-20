import {useEffect,useRef,useState,type DragEvent} from 'react';
import {ImagePlus} from 'lucide-react';
import {readHomepageImage} from '@/lib/kachamak/project-settings';

export function HomeImagePlaceholder({onImage,onDragStart,onDragEnd}:{
  onImage:(image:string)=>boolean;
  onDragStart:(event:DragEvent<HTMLButtonElement>)=>void;
  onDragEnd:()=>void;
}){
  const input=useRef<HTMLInputElement>(null);
  const request=useRef(0);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>()=>{request.current++;},[]);
  async function upload(file:File){
    const sequence=++request.current;
    setBusy(true);
    setError('');
    try{
      const image=await readHomepageImage(file);
      if(sequence===request.current && !onImage(image))setError('The block changed. Choose the image again.');
    }catch(e){
      if(sequence===request.current)setError(e instanceof Error?e.message:'Could not open the image.');
    }finally{
      if(sequence===request.current)setBusy(false);
    }
  }
  return <>
    <button type="button" draggable={!busy} onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={()=>input.current?.click()} disabled={busy}
      className="flex min-h-24 w-full aspect-[4/1] items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/25 text-sm text-muted-foreground hover:text-foreground">
      <ImagePlus className="size-4"/>{busy?'Loading image…':'Add an image'}
    </button>
    <input hidden type="file" ref={input} aria-label="Homepage image file" accept="image/png,image/webp,image/jpeg" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(file);}}/>
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  </>;
}
