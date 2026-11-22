'use client';
import {useEffect,useRef,useState} from 'react';
import {bookArticles,bookCss,escapeText,type Publication} from '@/lib/kachamak/publication';
import {useKachamak} from '@/lib/kachamak/store';
import {trims,type BookStyle} from '@/lib/kachamak/book-style';

export function proofDocument(book:Publication,style:BookStyle,print:boolean){
  const [trimWidth,trimHeight]=trims[style.trim];
  const width=trimWidth*96/25.4;
  // CSS zoom can reflow a finished page into a hidden second column at fractional
  // magnifications. Scale its painted surface and reserve the resulting footprint.
  const screen=print?`@media screen{
    html{background:#262626}
    .pagedjs_pages{display:flex;flex-direction:column;align-items:center;gap:16px;padding:16px 0}
    .pagedjs_page{background:white;box-shadow:0 2px 10px #0006;flex:none}
    html[data-ready=yes] .pagedjs_pages{--scale:calc(var(--fit,1) * var(--panel-zoom,1));width:max(100%,calc(${trimWidth}mm * var(--scale) + 32px))}
    html[data-ready=yes] .pagedjs_page{transform:scale(var(--scale));transform-origin:top center;margin-bottom:calc(${trimHeight}mm * (var(--scale) - 1))}
  }`:
    'html{background:#262626;color:#201f1c;padding:clamp(4px,2vw,16px);line-height:1.5}body{zoom:var(--panel-zoom,1);max-width:36em;min-height:85vh;margin:auto;background:#fff;padding:2.5em clamp(1em,5vw,2em)}html[data-reader-theme=dark]{color-scheme:dark;background:#151515;color:#e7e4df}html[data-reader-theme=dark] body{background:#242424}';
  return '<!doctype html><html lang="'+book.lang+'"><head><meta charset="utf-8"><title>'+escapeText(book.title)+'</title><style>'+bookCss(style,print?'print':'ebook')+'</style><style data-pagedjs-ignore>'+screen+'</style>'+
    (print?'<script>window.PagedConfig={auto:false};</script><script src="/publish-pagination.js"></script>':'')+'</head><body>'+bookArticles(book)+
    (print?`<script>document.currentScript.remove();window.addEventListener('load',async()=>{try{await document.fonts.ready;await new Paged.Previewer().preview();function fit(){document.documentElement.style.setProperty('--fit',Math.min(1.3,Math.max(.15,(document.documentElement.clientWidth-36)/${width})));}fit();window.addEventListener('resize',fit);document.documentElement.dataset.ready='yes';window.dispatchEvent(new Event('proofready'));}catch(e){document.documentElement.dataset.ready='error';window.dispatchEvent(new Event('proofready'));}});</script>`:'')+'</body></html>';
}
function revealEntry(doc:Document,anchor?:string){
  if(!anchor)return;
  const entry=doc.querySelector('.pagedjs_pages [id="'+anchor+'"]')??doc.getElementById(anchor);
  const view=doc.defaultView;
  if(entry&&view)view.scrollTo(0,entry.getBoundingClientRect().top+view.scrollY-8);
}
export function PublishProof({source,print,darkReader,frameRef,onReady,zoom,anchor}:{darkReader:boolean;anchor?:string;zoom:number;source:string;print:boolean;frameRef:React.RefObject<HTMLIFrameElement|null>;onReady:(ready:boolean)=>void}){
  const [status,setStatus]=useState(''), token=useRef(0);
  const currentAnchor=useRef(anchor);
  useEffect(()=>{
    currentAnchor.current=anchor;
    const doc=frameRef.current?.contentDocument;
    if(doc&&(!print||doc.documentElement.dataset.ready==='yes'))revealEntry(doc,anchor);
  },[anchor,frameRef,print]);
  useEffect(()=>{token.current++;onReady(false);setStatus(print?'Setting pages…':'');},[source,print,onReady]);
  useEffect(()=>{frameRef.current?.contentDocument?.documentElement.style.setProperty('--panel-zoom',String(zoom));},[frameRef,zoom]);
  useEffect(()=>{
    const root=frameRef.current?.contentDocument?.documentElement;
    if(root&&!print)root.dataset.readerTheme=darkReader?'dark':'light';
  },[darkReader,frameRef,print]);
  return <div className="relative flex min-h-0 flex-1 flex-col">
    {status&&<div aria-live="polite" className="absolute bottom-2 left-2 z-10 rounded bg-background/95 px-2 py-1 text-xs text-muted-foreground">{status}</div>}
    <iframe ref={frameRef} title={print?'Print proof':'eBook proof'} className="min-h-60 w-full flex-1 border-0 bg-neutral-800" sandbox="allow-scripts allow-same-origin allow-modals" srcDoc={source}
      onLoad={()=>{const w=frameRef.current?.contentWindow;if(!w)return;
        if(!print)w.document.documentElement.dataset.readerTheme=darkReader?'dark':'light';
        w.document.documentElement.style.setProperty('--panel-zoom',String(zoom));
        w.addEventListener('wheel',e=>{if(e.ctrlKey){e.preventDefault();frameRef.current?.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,ctrlKey:true,deltaY:e.deltaY,deltaMode:e.deltaMode}));}},{passive:false});
        w.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='0'){e.preventDefault();useKachamak.getState().setPanelZoom('mid',1);}});
        const id=token.current;const done=()=>{if(id!==token.current||!frameRef.current)return;
          const doc=w.document;if(print && doc.documentElement.dataset.ready!=='yes'){setStatus('Pagination failed. Reopen the proof to try again.');return;}
          const pages=doc.querySelectorAll('.pagedjs_page').length;setStatus(print?pages+' '+(pages===1?'page':'pages'):'');onReady(true);revealEntry(doc,currentAnchor.current);};
        if(!print||w.document.documentElement.dataset.ready)done();else w.addEventListener('proofready',done,{once:true});
      }}/>
  </div>;
}
