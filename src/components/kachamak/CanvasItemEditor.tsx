'use client';
import {useMemo,useState} from 'react';
import {ImagePlus, MapPin, Plus, X} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {projectImageSrc} from '@/lib/kachamak/project-image';
import {flattenNotes} from '@/lib/kachamak/note-links';
import {homepageRows,isWebsite,youtubeVideoId,type HomeBlock} from '@/lib/kachamak/homepage';
import type {Novel} from '@/lib/kachamak/types';
import type {CanvasTool} from '@/lib/kachamak/canvas-board';
import {GalleryImagePicker} from './GalleryImagePicker';
import {HomeDestinationFields} from './HomeDestinationFields';
import {CanvasInk} from './CanvasInk';
import {toolsByKind} from './CanvasTools';

export function newCanvasBlock(kind:CanvasTool):HomeBlock{
  const block:HomeBlock={id:crypto.randomUUID(),layout:kind,width:'standard',title:'',text:''};
  if(kind==='todo')block.tasks=[{text:'',done:false}];
  if(kind==='table')block.cells=[['',''],['','']];
  if(kind==='link')block.target={kind:'web',url:''};
  if(['sketch','draw','color','column'].includes(kind))block.color=toolsByKind[kind].color;
  return block;
}
export function CanvasItemEditor({novel,initial,creating,onSave,onClose}:{novel:Novel;initial:HomeBlock;creating:boolean;onSave:(next:HomeBlock)=>boolean;onClose:()=>void}){
  const [draft,setDraft]=useState(initial),[error,setError]=useState('');
  const patch=(p:Partial<HomeBlock>)=>setDraft(current=>({...current,...p}));
  const kind=draft.layout as CanvasTool,{name}=toolsByKind[kind];
  const galleryImage=projectImageSrc(novel.gallery,draft.image);
  const notes=useMemo(()=>flattenNotes(novel),[novel]),pages=useMemo(()=>homepageRows(novel),[novel]);
  const tasks=draft.tasks??[],cells=draft.cells??[];
  const text=['note','comment','heading','image','map','link'].includes(kind);
  function save(){
    if(kind==='video'&&!youtubeVideoId(draft.videoUrl))return setError('Enter a YouTube video address.');
    if(kind==='audio'&&!isWebsite(draft.audio))return setError('Enter a direct audio file address.');
    if((kind==='image'||kind==='map')&&!draft.image)return setError('Choose an image from this book’s Gallery.');
    if((kind==='draw'||kind==='sketch')&&!draft.ink?.length)return setError('Draw at least one stroke.');
    if(draft.target){const t=draft.target;
      if(t.kind==='note'&&!notes.some(n=>n.node.id===t.id)||t.kind==='page'&&!pages.some(p=>p.id===t.id)||t.kind==='web'&&!isWebsite(t.url))return setError('Choose a valid destination.');
    }
    if(['heading','comment','note','column'].includes(kind)&&!draft.title.trim()&&!draft.text.trim()&&!draft.target)return setError('Enter a title or text, or choose a note.');
    const clean={...draft,title:draft.title.trim()};
    if(kind==='todo'){
      clean.tasks=tasks.filter(item=>item.text.trim());if(!clean.tasks.length)return setError('Add at least one task.');
    }
    if(onSave(clean))onClose();else setError('This item changed. Reopen it to edit the latest version.');
  }
  return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="cv-dialog max-h-[90dvh] overflow-y-auto sm:max-w-lg">
    <DialogHeader><DialogTitle>{creating?'Add':'Edit'} {name}</DialogTitle></DialogHeader>
    <form onSubmit={e=>{e.preventDefault();save();}} className="grid gap-4">
      <label>Title<Input autoFocus value={draft.title} onChange={e=>patch({title:e.target.value})} placeholder={kind==='column'?'Chapter name':undefined}/></label>
      {text&&kind!=='heading'&&<label>{kind==='comment'?'Comment':'Text'}<Textarea rows={3} value={draft.text} onChange={e=>patch({text:e.target.value})}/></label>}
      {(kind==='link'||kind==='note')&&<HomeDestinationFields notes={notes} pages={pages} optional={kind==='note'} target={draft.target} onChange={target=>patch({target})}/>}
      {(kind==='image'||kind==='map')&&<div className="grid gap-2">{galleryImage&&<div className="relative justify-self-start">
        <img src={galleryImage} alt={kind==='map'?'Map preview':'Image preview'} className="block max-h-56 max-w-full rounded object-contain" onPointerDown={kind==='map'?e=>{const r=e.currentTarget.getBoundingClientRect();patch({pin:{x:(e.clientX-r.x)/r.width,y:(e.clientY-r.y)/r.height}});}:undefined}/>
        {kind==='map'&&draft.pin&&<MapPin className="cv-pin" style={{left:100*draft.pin.x+'%',top:100*draft.pin.y+'%'}}/>}</div>}
        <GalleryImagePicker novel={novel} onPick={image=>patch({image,pin:undefined})}><Button type="button" variant="outline"><ImagePlus/>{galleryImage?'Replace image':'Choose from Gallery'}</Button></GalleryImagePicker>
        {kind==='map'&&galleryImage&&<small className="text-muted-foreground">Click the map to place its pin.</small>}</div>}
      {kind==='video'&&<label>YouTube address<Input type="url" required value={draft.videoUrl??''} onChange={e=>patch({videoUrl:e.target.value})}/></label>}
      {kind==='audio'&&<label>Audio file address<Input type="url" required value={draft.audio??''} onChange={e=>patch({audio:e.target.value})} placeholder="https://…/recording.mp3"/></label>}
      {['color','column','sketch','draw'].includes(kind)&&<label>Color<div className="flex items-center gap-2"><input type="color" value={draft.color??'#deb679'} onChange={e=>patch({color:e.target.value})}/><code>{draft.color}</code></div></label>}
      {(kind==='sketch'||kind==='draw')&&<CanvasInk value={draft.ink??[]} color={draft.color??'#deb679'} onChange={ink=>patch({ink})}/>}
      {kind==='todo'&&<div className="grid gap-2">{tasks.map((t,i)=><div key={i} className="flex items-center gap-2"><input type="checkbox" aria-label={'Task '+(i+1)+' completed'} checked={t.done} onChange={e=>patch({tasks:tasks.map((v,j)=>i===j?{...v,done:e.target.checked}:v)})}/>
        <Input aria-label={'Task '+(i+1)} value={t.text} onChange={e=>patch({tasks:tasks.map((v,j)=>i===j?{...v,text:e.target.value}:v)})}/><button type="button" aria-label={'Remove task '+(i+1)} onClick={()=>patch({tasks:tasks.filter((_,j)=>j!==i)})}><X size={15}/></button></div>)}
        <Button type="button" variant="outline" onClick={()=>patch({tasks:[...tasks,{text:'',done:false}]})}><Plus/>Task</Button></div>}
      {kind==='table'&&<div className="overflow-auto"><table className="cv-table-edit"><tbody>{cells.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}><input aria-label={'Row '+(i+1)+' column '+(j+1)} value={v} onChange={e=>patch({cells:cells.map((row,ri)=>ri===i?row.map((s,ci)=>ci===j?e.target.value:s):row)})}/></td>)}</tr>)}</tbody></table>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="cv-text-btn" onClick={()=>patch({cells:[...cells,cells[0].map(()=>'')]})}>+ Row</button>
          <button type="button" className="cv-text-btn" onClick={()=>patch({cells:cells.map(r=>[...r,''])})}>+ Column</button>
          <button type="button" className="cv-text-btn" disabled={cells.length<2} onClick={()=>patch({cells:cells.slice(0,-1)})}>− Row</button>
          <button type="button" className="cv-text-btn" disabled={cells[0].length<2} onClick={()=>patch({cells:cells.map(r=>r.slice(0,-1))})}>− Column</button>
        </div></div>}
      {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">{creating?'Add to canvas':'Save changes'}</Button></div>
    </form></DialogContent></Dialog>;
}
