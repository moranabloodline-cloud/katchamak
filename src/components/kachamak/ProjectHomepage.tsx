'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, ArrowUpRight, LockKeyhole, Plus, Trash2, UnlockKeyhole} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {EMPTY_HOMEPAGE, type HomeBlock} from '@/lib/kachamak/homepage';
import {flattenNotes} from '@/lib/kachamak/note-links';
import {openProjectNote} from '@/lib/kachamak/note-navigation';
import {useKachamak} from '@/lib/kachamak/store';
import {TABS, type Novel, type NoteNode} from '@/lib/kachamak/types';
import {HomeBlockEditor} from './HomeBlockEditor';
import {useOpenWorkspaceTab} from './WorkspaceTabs';

function blockDisplay(block:HomeBlock, notes:Map<string,NoteNode>) {
  const target=block.target;
  const note=target?.kind==='note' ? notes.get(target.id) : undefined;
  const destination=target?.kind==='tab' ? TABS.find(t=>t.key===target.tab)?.label :
    target?.kind==='web' ? new URL(target.url).hostname : note?.title;
  return {
    title:block.title || destination,
    image:block.image || note?.image,
    name:block.title || destination || block.text.split('\n')[0] || (target?.kind==='note'?'Unavailable note':'Image'),
  };
}

function BlockFace({block,title,image}:{block:HomeBlock;title?:string;image?:string}) {
  const banner=block.layout==='banner', prose=block.layout==='text';
  return <>
    {image && <img src={image} alt="" className={banner?'absolute inset-0 size-full object-cover':prose?'w-full max-h-56 object-cover':'aspect-[2/1] w-full object-cover'}/>}
    {banner && image && <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent"/>}
    {(title||block.text||!image)&&<span className={`relative flex w-full flex-col gap-2 break-words p-5 ${banner?'mt-auto @[640px]:p-8':''} ${banner&&image?'text-white':''}`}>
      {title&&<span className={`font-semibold leading-tight ${banner?'text-3xl @[640px]:text-4xl':prose?'text-xl':'text-lg'}`}>{title}</span>}
      {block.text&&<span className={`whitespace-pre-wrap text-sm leading-relaxed ${banner&&image?'text-white/90':'text-muted-foreground'}`}>{block.text}</span>}
      {!title&&!block.text&&!image&&<span>Unavailable note</span>}
    </span>}
  </>;
}

export function ProjectHomepage({novel,onBack}:{novel:Novel;onBack:()=>void}) {
  const page=novel.homepage??EMPTY_HOMEPAGE;
  const notes=useMemo(()=>flattenNotes(novel),[novel]);
  const byId=useMemo(()=>new Map(notes.map(({node})=>[node.id,node])),[notes]);
  const change=useKachamak(s=>s.changeHomepage);
  const openTab=useOpenWorkspaceTab(novel);
  const [editor,setEditor]=useState<{original?:HomeBlock}|null>(null);
  const [previewId,setPreviewId]=useState<string|null>(null);
  const [message,setMessage]=useState('');
  const opener=useRef<HTMLElement|null>(null);
  const captureOpener=()=>{opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;};
  const restoreFocus=()=>requestAnimationFrame(()=>{if(opener.current?.isConnected)opener.current.focus();});
  const closeEditor=()=>{setEditor(null);restoreFocus();};
  useEffect(()=>{if(page.locked)setEditor(null);else setPreviewId(null);setMessage('');},[page.locked]);
  const edit=(original?:HomeBlock)=>{captureOpener();setMessage('');setEditor({original});};
  const preview=page.blocks.find(block=>block.id===previewId);
  const details=preview&&blockDisplay(preview,byId);
  const activate=(block:HomeBlock)=>{
    setMessage('');
    if(!page.locked){edit(block);return;}
    const target=block.target;
    if(target?.kind==='note'){
      if(!openProjectNote(target.id))setMessage('This note is no longer in this book. Unlock the page to choose another destination.');
    } else if(target?.kind==='tab'){
      openTab(target.tab);
      if(target.tab!=='family'&&target.tab!=='timeline')useKachamak.getState().select(novel.sections[target.tab].find(n=>!n.hidden)?.id??null);
    } else {captureOpener();setPreviewId(block.id);}
  };
  return <section aria-label="Project homepage" className="@container flex min-h-0 flex-1 flex-col overflow-auto">
    <header className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-2">
      <Button size="icon" variant="ghost" title="Back to workspace" aria-label="Back to workspace" onClick={onBack}><ArrowLeft/></Button>
      <h1 className="mr-auto text-lg font-semibold">Homepage</h1>
      {!page.locked&&page.blocks.length>0&&<Button size="sm" variant="outline" onClick={()=>edit()}><Plus/>Add block</Button>}
      <Button size="sm" variant="ghost" onClick={()=>change(novel.id,{type:'lock',locked:!page.locked})}>
        {page.locked?<UnlockKeyhole/>:<LockKeyhole/>}{page.locked?'Unlock page':'Lock page'}
      </Button>
    </header>
    {message&&<p role="status" className="px-5 pt-3 text-sm text-amber-300">{message}</p>}
    <div className="mx-auto w-full max-w-[100rem] p-4 @[640px]:p-8">
      {!page.locked&&!page.blocks.length&&<button type="button" className="flex min-h-36 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-amber-500/50 hover:text-foreground" onClick={()=>edit()}><Plus className="size-4"/>Add your first block</button>}
      <div className="grid grid-cols-1 items-start gap-4 @[530px]:grid-cols-2 @[1040px]:grid-cols-4">
        {page.blocks.map((block,index)=>{
          const {title,image,name}=blockDisplay(block,byId);
          const face=<BlockFace block={block} title={title} image={image}/>;
          const cardClass=`relative flex w-full flex-col overflow-hidden rounded-xl border border-border text-left transition-colors hover:border-amber-500/60 focus-visible:outline-2 focus-visible:outline-amber-400 ${block.layout==='banner'?'min-h-44 justify-end bg-gradient-to-br from-muted to-background':block.layout==='text'?'bg-background':'bg-card'}`;
          return <article key={block.id} className={`min-w-0 ${block.width==='full'?'col-span-full':block.width==='wide'?'@[530px]:col-span-2':''}`}>
            {page.locked&&block.target?.kind==='web'
              ? <a className={cardClass} aria-label={name} href={block.target.url} target="_blank" rel="noopener noreferrer">{face}<ArrowUpRight aria-hidden="true" className="absolute right-3 top-3 size-5 rounded bg-background/80 p-0.5"/></a>
              : <button type="button" className={cardClass} aria-label={page.locked?name:'Edit '+name} onClick={()=>activate(block)}>{face}</button>}
            {!page.locked&&<div role="group" aria-label={'Arrange '+name} className="mt-1 flex justify-end gap-1 text-muted-foreground">
              <Button size="icon" variant="ghost" className="size-7" disabled={!index} aria-label="Move earlier" title="Move earlier" onClick={()=>change(novel.id,{type:'move',id:block.id,offset:-1})}><ArrowLeft/></Button>
              <Button size="icon" variant="ghost" className="size-7" disabled={index===page.blocks.length-1} aria-label="Move later" title="Move later" onClick={()=>change(novel.id,{type:'move',id:block.id,offset:1})}><ArrowRight/></Button>
              <Button size="icon" variant="ghost" className="size-7" aria-label="Remove block" title="Remove block" onClick={()=>{if(window.confirm('Remove this block from the homepage?'))change(novel.id,{type:'remove',original:block});}}><Trash2/></Button>
            </div>}
          </article>;
        })}
      </div>
    </div>
    {!page.locked&&editor&&<HomeBlockEditor original={editor.original} notes={notes} onClose={closeEditor} onSave={block=>change(novel.id,editor.original?{type:'edit',original:editor.original,block}:{type:'add',block})}/>}
    {page.locked&&preview&&details&&<Dialog open onOpenChange={open=>{if(!open){setPreviewId(null);restoreFocus();}}}>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{details.title||'Block preview'}</DialogTitle></DialogHeader>
        {details.image&&<img src={details.image} alt={details.title||'Block image'} className="mx-auto max-h-[68dvh] w-auto rounded-md object-contain"/>}
        {preview.text&&<p className="whitespace-pre-wrap break-words">{preview.text}</p>}
      </DialogContent>
    </Dialog>}
  </section>;
}
