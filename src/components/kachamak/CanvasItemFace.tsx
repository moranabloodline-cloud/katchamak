'use client';
import {useMemo,useRef} from 'react';
import {atlasBlock,findProjectMap} from '@/lib/kachamak/project-maps';
import {CanvasMapSurface} from './CanvasMapSurface';
import {ExternalLink,SquareCheck,ArrowUpRight} from 'lucide-react';
import {projectImageSrc} from '@/lib/kachamak/project-image';
import {canvasVideo,type HomeBlock,type HomeTarget} from '@/lib/kachamak/homepage';
import type {Novel,NoteNode} from '@/lib/kachamak/types';
import {contentText} from '@/lib/kachamak/note-links';
import {HomeArtwork} from './HomeArtwork';
import {HomeVideo} from './HomeDocumentBlock';
import {InkPaths} from './CanvasInk';

export function CanvasItemFace({block:b,novel,source,locked,open,describe,toggle,openMap}:{block:HomeBlock;novel:Novel;source?:NoteNode;locked:boolean;
  openMap:(id:string)=>void;open:(t:HomeTarget)=>void;describe:(t:HomeTarget)=>string;toggle:(index:number,done:boolean)=>void}){
  const map=b.layout==='map'?findProjectMap(novel,b.mapId):undefined;
  const mapFrame=useRef<HTMLDivElement>(null);
  const title=b.title || map?.title || (b.target?describe(b.target):'');
  const image=b.imageCutout||projectImageSrc(novel.gallery,map?.image || b.image || (b.layout==='note'?source?.image:undefined));
  const video=b.videoUrl&&canvasVideo(b.videoUrl);
  const destination=b.target && (b.target.kind==='web'?<a className="cv-link" href={b.target.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={13}/>{b.title||describe(b.target)}</a>:
    <button type="button" className="cv-link" onClick={()=>b.target&&open(b.target)}><ArrowUpRight size={14}/>{describe(b.target)}</button>);
  const excerpt=useMemo(()=>b.layout==='note'&&source?contentText(source.content).slice(0,190):'',[source?.content,b.layout]);
  const body=b.text || excerpt;
  return <div className={'cv-face cv-face-'+b.layout}>
    {b.layout==='color'&&<div className="cv-swatch" style={{backgroundColor:b.color}}/>}
    {b.layout==='map'&&(map&&image?<div ref={mapFrame} key={image} className="cv-map-frame">
      <CanvasMapSurface block={atlasBlock(map)} image={image} open={()=>openMap(map.id)} openLabel="Open in Maps"
        onAspect={aspect=>{if(Number.isFinite(aspect)&&aspect>0)mapFrame.current?.style.setProperty('--cv-map-aspect',String(aspect));}}/>
    </div>:<p className="text-xs text-muted-foreground">Map unavailable</p>)}
    {image&&b.layout!=='map'&&<div className="cv-picture">{b.imageFrame?<HomeArtwork src={image} frame={b.imageFrame} alt={b.title||b.layout}/>:<img src={image} alt={b.title||b.layout} draggable={false}/>}</div>}
    {(b.layout==='sketch'||b.layout==='draw')&&<svg viewBox="0 0 320 180" preserveAspectRatio="none" aria-label={b.title||'Drawing'} style={b.extent?{aspectRatio:b.extent.w+'/'+b.extent.h}:undefined}><InkPaths strokes={b.ink??[]} color={b.color??'#d4b487'}/></svg>}
    {title&&b.layout!=='link'&&<h3>{title}</h3>}
    {body&&<p>{body}</p>}
    {b.layout==='todo'&&<div className="cv-checklist">{b.tasks?.map((t,i)=><label key={i}><input type="checkbox" checked={t.done} disabled={locked} onChange={e=>toggle(i,e.target.checked)}/><span className={t.done?'line-through opacity-60':''}>{t.text}</span></label>)}<small><SquareCheck size={12}/>{b.tasks?.filter(t=>t.done).length} / {b.tasks?.length}</small></div>}
    {b.layout==='table'&&<div className="overflow-auto"><table><tbody>{b.cells?.map((row,i)=><tr key={i}>{row.map((v,j)=>i===0?<th key={j}>{v}</th>:<td key={j}>{v}</td>)}</tr>)}</tbody></table></div>}
    {b.layout==='color'&&<code>{b.color?.toUpperCase()}</code>}
    {b.layout==='audio'&&<audio controls preload="none" src={b.audio}/>}
    {b.layout==='video'&&video&&<HomeVideo url={b.videoUrl!} title={title} interactive/>}
    {destination}
  </div>;
}
