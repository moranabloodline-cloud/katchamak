'use client';
import {useState} from 'react';
import {ImagePlus, LayoutPanelTop, PanelsTopLeft, Type, Columns3, Heading, Info, Link2, Minus, Video, Plus, Trash2} from 'lucide-react';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {GalleryImagePicker} from './GalleryImagePicker';
import {projectImageSrc} from '@/lib/kachamak/project-image';
import type {Novel} from '@/lib/kachamak/types';
import {isWebsite, youtubeVideoId, type HomeBlock, type HomeCell, type HomeLayout, type homepageRows, type HomeLink, type HomeTarget} from '@/lib/kachamak/homepage';
import {HomeArtwork} from './HomeArtwork';
import {HomeArtworkEditor} from './HomeArtworkEditor';
import {HomeDestinationFields,homeSelectClass} from './HomeDestinationFields';
import type {flattenNotes} from '@/lib/kachamak/note-links';

const layouts = [
  {kind:'row',label:'Row',icon:Columns3},
  {kind:'heading',label:'Heading',icon:Heading},
  {kind:'callout',label:'Callout',icon:Info},
  {kind:'links',label:'Link list',icon:Link2},
  {kind:'divider',label:'Divider',icon:Minus},
  {kind:'video',label:'Video',icon:Video},
  {kind:'card', label:'Card', icon:PanelsTopLeft},
  {kind:'image', label:'Image', icon:ImagePlus},
  {kind:'banner', label:'Banner', icon:LayoutPanelTop},
  {kind:'text', label:'Text', icon:Type},
] as const;


export function HomeBlockEditor({novel,original,cell,notes,pages,onSave,onClose}:{
  novel:Novel; original?:HomeBlock; cell?:HomeCell; notes:ReturnType<typeof flattenNotes>; pages:ReturnType<typeof homepageRows>;
  onSave:(block:HomeBlock)=>boolean; onClose:()=>void;
}) {
  const [draft,setDraft]=useState<HomeBlock>(()=>original??{id:crypto.randomUUID(),layout:'card',width:'standard',title:'',text:'',cell});
  const row=draft.layout==='row', divider=draft.layout==='divider', list=draft.layout==='links', video=draft.layout==='video';
  const hasDestination=!row&&!divider&&!list&&!video;
  const [adjusting,setAdjusting]=useState(false);
  const [error,setError]=useState('');
  const image=projectImageSrc(novel.gallery,draft.image);
  const patch=(value:Partial<HomeBlock>)=>setDraft(current=>({...current,...value}));
  const chooseLayout=(layout:HomeLayout)=>patch({layout,width:layout==='card'?'standard':layout==='text'?'wide':'full',columns:draft.columns??2});
  const links=draft.links??[];
  const updateLink=(id:string,value:Partial<HomeLink>)=>patch({links:links.map(l=>l.id===id?{...l,...value}:l)});
  const validDestination=(target:HomeTarget)=>target.kind==='page'?pages.some(p=>p.id===target.id):target.kind==='note'?notes.some(n=>n.node.id===target.id):target.kind==='web'?isWebsite(target.url):true;
  const save=()=>{
    if(video&&!youtubeVideoId(draft.videoUrl)){setError('Enter a YouTube video address.');return;}
    if(list&&links.some(l=>!validDestination(l.target))){setError('Choose a valid destination for every link.');return;}
    const target=hasDestination?draft.target:undefined;
    if(target&&!validDestination(target)){setError('Choose a valid link destination.');return;}
    if(draft.layout!=='image'&&!row&&!divider&&!video&&!draft.title.trim()&&!draft.text.trim()&&!draft.image&&!target&&!(list&&links.length)){setError('Add text, an image or a destination.');return;}
    const block:HomeBlock={...draft,title:draft.title.trim(),target,columns:row?draft.columns:undefined,
      links:list?links:undefined,videoUrl:video?draft.videoUrl?.trim():undefined};
    if(onSave(block))onClose();
    else setError('The homepage changed. Reopen this block to edit its latest version.');
  };
  return <Dialog open onOpenChange={open=>{if(!open)onClose();}}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle>{original?'Edit block':'Add block'}</DialogTitle></DialogHeader>
      <form className="grid gap-4" onSubmit={event=>{event.preventDefault();save();}}>
        <div role="group" aria-label="Block layout" className="grid grid-cols-3 gap-2">{layouts.filter(l=>original?.layout==='row'?l.kind==='row':l.kind!=='row'||(!cell&&!original)).map(({kind,label,icon:Icon})=>
          <Button key={kind} type="button" variant="outline" aria-pressed={draft.layout===kind} className={draft.layout===kind?'border-amber-500/60 bg-amber-500/10':''} onClick={()=>chooseLayout(kind)}><Icon/>{label}</Button>)}</div>
        {row&&<Label className="grid gap-2">Equal columns<select className={homeSelectClass} value={draft.columns??2} onChange={e=>patch({columns:Number(e.target.value)})}>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n}</option>)}</select></Label>}
        {row&&original?.columns&&draft.columns!<original.columns&&<p className="text-sm text-muted-foreground">Elements in removed columns will move to the last column.</p>}
        {!divider&&<Label className="grid gap-2">Title<Input value={draft.title} onChange={event=>patch({title:event.target.value})}/></Label>}
        {!row&&!divider&&!video&&<Label className="grid gap-2">Text<Textarea rows={3} value={draft.text} onChange={event=>patch({text:event.target.value})}/></Label>}
        {!row&&!divider&&!video&&<div className="flex flex-wrap items-center gap-2">
          {image&&(draft.imageFrame?<div className="mx-auto w-full" style={{maxWidth:`${9*draft.imageFrame.ratio}rem`}}><HomeArtwork src={draft.imageCutout||image} frame={draft.imageFrame} alt="Block image preview"/></div>:<img src={draft.imageCutout||image} alt="Block image preview" className="block max-h-36 w-full object-contain"/>)}
          <GalleryImagePicker novel={novel} onPick={ref=>patch({image:ref,imageFrame:undefined,imageCutout:undefined})}>
            <Button type="button" variant="outline"><ImagePlus/>{image?'Replace image':'Choose from Gallery'}</Button>
          </GalleryImagePicker>
          {draft.image&&<Button type="button" variant="outline" onClick={()=>setAdjusting(true)}>Reposition image</Button>}
          {draft.image&&<Button type="button" variant="ghost" onClick={()=>{patch({image:undefined,imageFrame:undefined,imageCutout:undefined});}}>Remove image</Button>}
        </div>}
        {!row&&!draft.cell&&<Label className="grid gap-2">Width<select className={homeSelectClass} value={draft.width} onChange={e=>patch({width:e.target.value as HomeBlock['width']})}><option value="standard">Standard</option><option value="wide">Wide</option><option value="full">Full row</option></select></Label>}
        {hasDestination&&<HomeDestinationFields notes={notes} pages={pages} target={draft.target} onChange={target=>patch({target})} optional/>}
        {video&&<Label className="grid gap-2">YouTube address<Input type="url" required placeholder="https://www.youtube.com/watch?v=…" value={draft.videoUrl??''} onChange={e=>patch({videoUrl:e.target.value})}/></Label>}
        {list&&<div className="grid gap-3">{links.map((link,i)=><fieldset key={link.id} className="grid gap-3 rounded-md border border-border p-3">
          <legend className="px-1 text-sm">Link {i+1}</legend>
          <Label className="grid gap-2">Link label<Input value={link.label} onChange={e=>updateLink(link.id,{label:e.target.value})}/></Label>
          <HomeDestinationFields notes={notes} pages={pages} target={link.target} onChange={target=>{if(target)updateLink(link.id,{target});}}/>
          <Button type="button" variant="ghost" className="justify-self-end" onClick={()=>patch({links:links.filter(l=>l.id!==link.id)})}><Trash2/>Remove link</Button>
        </fieldset>)}<Button type="button" variant="outline" onClick={()=>patch({links:[...links,{id:crypto.randomUUID(),label:'',target:{kind:'note',id:''}}]})}><Plus/>Add link</Button></div>}
        {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">{original?'Save block':'Add to homepage'}</Button></div>
      </form>
      {adjusting&&image&&<HomeArtworkEditor block={draft} src={image} onClose={()=>setAdjusting(false)} onSave={options=>{patch(options);return true;}}/>}
    </DialogContent>
  </Dialog>;
}
