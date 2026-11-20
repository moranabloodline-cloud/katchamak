'use client';
import {useEffect, useRef, useState} from 'react';
import {ImagePlus, LayoutPanelTop, PanelsTopLeft, Type} from 'lucide-react';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {readNovelCover} from '@/lib/kachamak/project-settings';
import {isWebsite, type HomeBlock, type HomeLayout, type HomeTarget} from '@/lib/kachamak/homepage';
import {SECTION_KEYS, TABS, type SectionKey} from '@/lib/kachamak/types';
import type {flattenNotes} from '@/lib/kachamak/note-links';

const layouts = [
  {kind:'card', label:'Card', icon:PanelsTopLeft},
  {kind:'banner', label:'Banner', icon:LayoutPanelTop},
  {kind:'text', label:'Text', icon:Type},
] as const;
const selectClass='h-9 w-full rounded-md border border-input bg-background px-2 text-sm';

export function HomeBlockEditor({original,notes,onSave,onClose}:{
  original?:HomeBlock; notes:ReturnType<typeof flattenNotes>;
  onSave:(block:HomeBlock)=>boolean; onClose:()=>void;
}) {
  const [draft,setDraft]=useState<HomeBlock>(()=>original??{id:crypto.randomUUID(),layout:'card',width:'standard',title:'',text:''});
  const [linkKind,setLinkKind]=useState<HomeTarget['kind']|'none'>(original?.target?.kind??'none');
  const [noteId,setNoteId]=useState(original?.target?.kind==='note'?original.target.id:'');
  const [tab,setTab]=useState<SectionKey>(original?.target?.kind==='tab'?original.target.tab:'binder');
  const [website,setWebsite]=useState(original?.target?.kind==='web'?original.target.url:'');
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const upload=useRef(0), fileInput=useRef<HTMLInputElement>(null);
  useEffect(()=>()=>{upload.current++;},[]);
  const patch=(value:Partial<HomeBlock>)=>setDraft(current=>({...current,...value}));
  const chooseLayout=(layout:HomeLayout)=>patch({layout,width:layout==='banner'?'full':layout==='text'?'wide':'standard'});
  const loadImage=async(file:File)=>{
    const version=++upload.current;setBusy(true);setError('');
    try {
      const image=await readNovelCover(file,{width:1440,height:800});
      if(upload.current===version)patch({image});
    } catch(err) {
      if(upload.current===version)setError(err instanceof Error?err.message:'Could not open that image.');
    } finally {if(upload.current===version)setBusy(false);}
  };
  const save=()=>{
    let target:HomeTarget|undefined;
    if(linkKind==='note'){
      if(!notes.some(entry=>entry.node.id===noteId)){setError('Choose a note in this book.');return;}
      target={kind:'note',id:noteId};
    } else if(linkKind==='tab')target={kind:'tab',tab};
    else if(linkKind==='web'){
      if(!isWebsite(website.trim())){setError('Enter a full http:// or https:// address.');return;}
      target={kind:'web',url:website.trim()};
    }
    if(!draft.title.trim()&&!draft.text.trim()&&!draft.image&&!target){setError('Add text, an image or a destination.');return;}
    if(onSave({...draft,title:draft.title.trim(),target}))onClose();
    else setError('The homepage changed. Reopen this block to edit its latest version.');
  };
  return <Dialog open onOpenChange={open=>{if(!open)onClose();}}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle>{original?'Edit block':'Add block'}</DialogTitle></DialogHeader>
      <form className="grid gap-4" onSubmit={event=>{event.preventDefault();save();}}>
        <div role="group" aria-label="Block layout" className="grid grid-cols-3 gap-2">{layouts.map(({kind,label,icon:Icon})=>
          <Button key={kind} type="button" variant="outline" aria-pressed={draft.layout===kind} className={draft.layout===kind?'border-amber-500/60 bg-amber-500/10':''} onClick={()=>chooseLayout(kind)}><Icon/>{label}</Button>)}</div>
        <Label className="grid gap-2">Title<Input value={draft.title} onChange={event=>patch({title:event.target.value})}/></Label>
        <Label className="grid gap-2">Text<Textarea rows={3} value={draft.text} onChange={event=>patch({text:event.target.value})}/></Label>
        <div className="flex flex-wrap items-center gap-2">
          {draft.image&&<img src={draft.image} alt="Block image preview" className="h-12 w-20 rounded object-cover"/>}
          <input type="file" aria-label="Block image file" ref={fileInput} accept="image/jpeg,image/png,image/webp" hidden onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void loadImage(file);}}/>
          <Button type="button" variant="outline" onClick={()=>fileInput.current?.click()}><ImagePlus/>{busy?'Loading image…':draft.image?'Replace image':'Add image'}</Button>
          {draft.image&&<Button type="button" variant="ghost" onClick={()=>{upload.current++;setBusy(false);patch({image:undefined});}}>Remove image</Button>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Label className="grid gap-2">Width<select className={selectClass} value={draft.width} onChange={e=>patch({width:e.target.value as HomeBlock['width']})}><option value="standard">Standard</option><option value="wide">Wide</option><option value="full">Full row</option></select></Label>
          <Label className="grid gap-2">Link to<select className={selectClass} value={linkKind} onChange={e=>setLinkKind(e.target.value as typeof linkKind)}><option value="none">Block preview</option><option value="note">Book note</option><option value="tab">Workspace tab</option><option value="web">Website</option></select></Label>
        </div>
        {linkKind==='note'&&<Label className="grid gap-2">Book note<select className={selectClass} value={noteId} onChange={e=>setNoteId(e.target.value)}>
          <option value="">Choose a note</option>{SECTION_KEYS.map(section=>{
            const entries=notes.filter(entry=>entry.section===section);
            return entries.length>0&&<optgroup key={section} label={TABS.find(t=>t.key===section)?.label}>{entries.map(({node,path})=><option key={node.id} value={node.id}>{[...path,node.title||'Untitled note'].join(' / ')}</option>)}</optgroup>;
          })}
        </select></Label>}
        {linkKind==='tab'&&<Label className="grid gap-2">Workspace tab<select className={selectClass} value={tab} onChange={e=>setTab(e.target.value as SectionKey)}>{TABS.filter(t=>t.key!=='trash').map(t=><option key={t.key} value={t.key}>{t.label}</option>)}</select></Label>}
        {linkKind==='web'&&<Label className="grid gap-2">Website address<Input type="url" placeholder="https://" value={website} onChange={e=>setWebsite(e.target.value)}/></Label>}
        {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{original?'Save block':'Add to homepage'}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
