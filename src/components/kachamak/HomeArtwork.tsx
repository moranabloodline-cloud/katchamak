import type {HomeImageFrame} from '@/lib/kachamak/homepage';

export function HomeArtwork({src,frame,alt=''}:{src:string;frame?:HomeImageFrame;alt?:string}) {
  if(!frame)return <img src={src} alt={alt} draggable={false} className="block h-auto w-full"/>;
  const {ratio,zoom,x,y,fade}=frame;
  const mask=fade?'linear-gradient(to bottom,black 50%,transparent 100%)':undefined;
  return <span className="relative block w-full overflow-hidden" style={{aspectRatio:ratio,maskImage:mask}}>
    <img src={src} alt={alt} draggable={false} className="pointer-events-none absolute max-w-none select-none object-cover"
      style={{width:zoom*100+'%',height:zoom*100+'%',left:(1-zoom)*100*x+'%',top:(1-zoom)*100*y+'%',objectPosition:`${x*100}% ${y*100}%`}}/>
  </span>;
}
