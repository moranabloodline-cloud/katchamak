import {HomeArtwork} from './HomeArtwork';
import {useState} from 'react';
import {Info,Play} from 'lucide-react';
import {youtubeVideoId,type HomeBlock,type HomeTarget} from '@/lib/kachamak/homepage';

export function HomeVideo({id,title,interactive}:{id:string;title:string;interactive:boolean}){
  const [playing,setPlaying]=useState(false);
  const poster=<><img alt="" draggable={false} src={'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg'} className="absolute inset-0 size-full object-cover opacity-75" onError={e=>{e.currentTarget.hidden=true;}}/><span className="relative grid h-11 w-16 place-items-center rounded-xl bg-red-600 text-white"><Play aria-hidden="true" className="size-6 fill-current"/></span></>;
  const frame='relative grid aspect-video min-h-[200px] w-full place-items-center overflow-hidden rounded-lg bg-zinc-900';
  return <>
    {playing&&interactive?<iframe title={title||'YouTube video'} src={'https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1'} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className={frame+' border-0'}/>:
      interactive?<button type="button" aria-label={'Play '+(title||'video')} className={frame} onClick={()=>setPlaying(true)}>{poster}</button>:<div className={frame}>{poster}</div>}
    {interactive?<a className="text-xs text-muted-foreground underline" href={'https://www.youtube.com/watch?v='+id} target="_blank" rel="noopener noreferrer">Watch on YouTube</a>:<span className="text-xs text-muted-foreground">Watch on YouTube</span>}
  </>;
}

export function HomeDocumentBlock({block,image,interactive,describe,open}:{
  block:HomeBlock;image?:string;interactive:boolean;describe:(target:HomeTarget)=>string;open:(target:HomeTarget)=>void;
}){
  if(block.layout==='divider')return <div className="flex min-h-5 items-center"><hr className="w-full border-border"/></div>;
  const video=block.layout==='video'?youtubeVideoId(block.videoUrl):null;
  const title=block.title||(block.target?describe(block.target):'');
  return <div className={'min-w-0 break-words '+(block.layout==='callout'?'flex items-start gap-3 rounded-lg border border-sky-400/35 bg-sky-400/10 px-4 py-3':'space-y-2')}>
    {block.layout==='callout'&&<Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-sky-400"/>}
    <div className="min-w-0 flex-1 space-y-2">
      {image&&<HomeArtwork src={image} frame={block.imageFrame}/>}
      {title&&(block.layout==='heading'||video?<h2 className="text-2xl font-semibold leading-tight">{title}</h2>:<h3 className="text-base font-semibold">{title}</h3>)}
      {block.text&&<p className="whitespace-pre-wrap text-sm leading-relaxed">{block.text}</p>}
      {block.layout==='links'&&<ul className="space-y-1 text-sm">{block.links?.map(link=>{
        const label=link.label||describe(link.target);
        const cls='break-words text-amber-300 underline decoration-amber-300/60 underline-offset-2 hover:text-amber-200';
        return <li key={link.id}>{!interactive?<span className={cls}>{label}</span>:link.target.kind==='web'
          ? <a className={cls} href={link.target.url} target="_blank" rel="noopener noreferrer">{label}</a>
          : <button type="button" className={cls+' text-left'} onClick={()=>open(link.target)}>{label}</button>}</li>;
      })}</ul>}
      {video&&<HomeVideo key={video+interactive} id={video} title={title} interactive={interactive}/>}
    </div>
  </div>;
}
