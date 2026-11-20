'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, ArrowUpRight, Columns3, GripVertical, LockKeyhole, Pencil, Plus, Trash2, UnlockKeyhole} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {EMPTY_HOMEPAGE, type HomeBlock, type HomeCell, type HomeTarget} from '@/lib/kachamak/homepage';
import {flattenNotes} from '@/lib/kachamak/note-links';
import {openProjectNote} from '@/lib/kachamak/note-navigation';
import {useKachamak} from '@/lib/kachamak/store';
import {TABS, type Novel, type NoteNode} from '@/lib/kachamak/types';
import {useHomepageDrag} from './useHomepageDrag';
import {HomeImagePlaceholder} from './HomeImagePlaceholder';
import {HomeDocumentBlock} from './HomeDocumentBlock';
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
  const banner=block.layout==='banner';
  const caption=image && (banner || block.layout==='image') ? block.title : title;
  return <>
    {image&&<img draggable={false} src={image} alt="" className="block h-auto w-full"/>}
    {(caption||block.text||!image)&&<span className={`flex w-full flex-col gap-2 break-words p-5 ${banner?'@[640px]:p-8':''}`}>
      {caption&&<span className={`font-semibold leading-tight ${banner?'text-3xl @[640px]:text-4xl':block.layout==='text'?'text-xl':'text-lg'}`}>{caption}</span>}
      {block.text&&<span className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{block.text}</span>}
      {!caption&&!block.text&&!image&&<span>Unavailable note</span>}
    </span>}
  </>;
}

export function ProjectHomepage({novel,onBack}:{novel:Novel;onBack:()=>void}) {
  const page=novel.homepage??EMPTY_HOMEPAGE;
  const notes=useMemo(()=>flattenNotes(novel),[novel]);
  const byId=useMemo(()=>new Map(notes.map(({node})=>[node.id,node])),[notes]);
  const change=useKachamak(s=>s.changeHomepage);
  const openTab=useOpenWorkspaceTab(novel);
  const drag=useHomepageDrag(page.locked,(id,p)=>change(novel.id,p.cell?{type:'into',id,cell:p.cell}:{type:'place',id,targetId:p.targetId,side:p.side}));
  const [editor,setEditor]=useState<{original?:HomeBlock;cell?:HomeCell}|null>(null);
  const [previewId,setPreviewId]=useState<string|null>(null);
  const [message,setMessage]=useState('');
  const opener=useRef<HTMLElement|null>(null);
  const captureOpener=()=>{opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;};
  const restoreFocus=()=>requestAnimationFrame(()=>{if(opener.current?.isConnected)opener.current.focus();});
  const closeEditor=()=>{setEditor(null);restoreFocus();};
  useEffect(()=>{if(page.locked)setEditor(null);else setPreviewId(null);setMessage('');},[page.locked]);
  const edit=(original?:HomeBlock,cell?:HomeCell)=>{captureOpener();setMessage('');setEditor({original,cell:original?.cell??cell});};
  const preview=page.blocks.find(block=>block.id===previewId);
  const details=preview&&blockDisplay(preview,byId);
  const describe=(target:HomeTarget)=>target.kind==='note'?(byId.get(target.id)?.title||'Unavailable note'):target.kind==='web'?new URL(target.url).hostname:(TABS.find(t=>t.key===target.tab)?.label??target.tab);
  const openTarget=(target:HomeTarget)=>{
    setMessage('');
    if(target?.kind==='note'){
      if(!openProjectNote(target.id))setMessage('This note is no longer in this book. Unlock the page to choose another destination.');
    } else if(target?.kind==='tab'){
      openTab(target.tab);
      if(target.tab!=='family'&&target.tab!=='timeline')useKachamak.getState().select(novel.sections[target.tab].find(n=>!n.hidden)?.id??null);
    }
  };
  const activate=(block:HomeBlock)=>{
    if(!page.locked)edit(block);
    else if(block.target)openTarget(block.target);
    else {captureOpener();setPreviewId(block.id);}
  };
  const roots=page.blocks.filter(b=>!b.cell);
  const lanes=new Map<string,HomeBlock[][]>();
  for(const b of roots)if(b.layout==='row')lanes.set(b.id,Array.from({length:b.columns!},()=>[]));
  for(const b of page.blocks)if(b.cell)lanes.get(b.cell.rowId)?.[b.cell.column]?.push(b);
  function renderBlock(block:HomeBlock,index:number,count:number):React.ReactNode {
    const display=blockDisplay(block,byId);
    const row=block.layout==='row';
    const name=block.title || (row?'Row':block.layout==='divider'?'Divider':block.layout==='video'?'Video':display.name);
    const editButton={type:'button' as const,draggable:!page.locked,onDragStart:(e:React.DragEvent<HTMLButtonElement>)=>drag.start(e,block.id,row),onDragEnd:drag.finish,
      'aria-label':'Edit '+name,title:'Drag to rearrange, or click to edit',onClick:()=>edit(block)};
    const classic=['card','banner','image','text'].includes(block.layout);
    const emptyImage=block.layout==='image'&&!display.image;
    const bare=block.layout==='image'||Boolean(display.image&&(block.layout==='banner'||(block.image&&!display.title&&!block.text)));
    const face=<BlockFace block={block} title={display.title} image={display.image}/>;
    const frame=bare?'bg-transparent':`overflow-hidden rounded-xl border border-border hover:border-amber-500/60 ${block.layout==='banner'?'min-h-44 justify-end bg-gradient-to-br from-muted to-background':block.layout==='text'?'bg-background':'bg-card'}`;
    const cardClass='relative flex w-full flex-col text-left focus-visible:outline-2 focus-visible:outline-amber-400 '+frame;
    const hint=!drag.hint?.cell&&drag.hint?.targetId===block.id?drag.hint:null;
    return <article key={block.id} data-home-block={block.id} data-home-row={row?'':undefined} className={`relative min-w-0 [&:hover>.home-arrange]:opacity-100 [&:hover>.home-arrange]:pointer-events-auto [&:focus-within>.home-arrange]:opacity-100 [&:focus-within>.home-arrange]:pointer-events-auto ${drag.dragging===block.id?'opacity-55':''} ${!block.cell&&(row||block.width==='full')?'col-span-full':!block.cell&&block.width==='wide'?'@[530px]:col-span-2':''}`}>
      {row?<div className={'@container/row rounded-lg px-1 py-3 '+(page.locked?'':'outline outline-dashed outline-border')}>
        {block.title&&<h2 className="mb-2 text-xl font-semibold">{block.title}</h2>}
        {!page.locked&&<button {...editButton} className="absolute -top-2 right-2 z-[1] flex cursor-grab items-center gap-1 rounded bg-background px-2 text-xs text-muted-foreground active:cursor-grabbing"><GripVertical className="size-3"/>Edit row</button>}
        <div className="grid grid-cols-1 gap-4 @[450px]/row:grid-cols-[repeat(min(3,var(--columns)),minmax(0,1fr))] @[680px]/row:grid-cols-[repeat(var(--columns),minmax(0,1fr))]" style={{'--columns':block.columns} as React.CSSProperties}>
          {lanes.get(block.id)?.map((children,column)=>{
            const active=drag.hint?.cell?.rowId===block.id && drag.hint.cell.column===column;
            return <div key={column} data-home-cell={block.id} data-column={column} className={`relative flex min-w-0 flex-col gap-3 rounded pb-6 ${active?'bg-amber-400/10 outline outline-amber-400':page.locked?'':'outline outline-dashed outline-border/70'}`}>
              {children.map((child,i)=>renderBlock(child,i,children.length))}
              {!page.locked&&<button type="button" aria-label={'Add element to column '+(column+1)} title={'Add element to column '+(column+1)} className="absolute bottom-0 left-0 flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground hover:text-foreground" onClick={()=>edit(undefined,{rowId:block.id,column})}><Plus className="size-3"/>Add element</button>}
            </div>;
          })}
        </div>
      </div>:emptyImage&&!page.locked?(
        <HomeImagePlaceholder onDragStart={editButton.onDragStart} onDragEnd={drag.finish} onImage={image=>change(novel.id,{type:'edit',original:block,block:{...block,image}})}/>
      ):emptyImage&&!block.target&&!block.title&&!block.text?<div aria-hidden="true" className="min-h-24 aspect-[4/1]"/>:classic?(
        page.locked&&block.target?.kind==='web'?<a draggable={false} className={cardClass} aria-label={name} href={block.target.url} target="_blank" rel="noopener noreferrer">{face}{!bare&&<ArrowUpRight aria-hidden="true" className="absolute right-3 top-3 size-5 rounded bg-background/80 p-0.5"/>}</a>:
          <button {...editButton} aria-label={page.locked?name:'Edit '+name} title={page.locked?undefined:editButton.title} className={cardClass+(page.locked?'':' cursor-grab select-none active:cursor-grabbing')} onClick={()=>activate(block)}>{face}</button>
      ):<div className="relative min-w-0">
        <HomeDocumentBlock block={block} image={display.image} interactive={page.locked} describe={describe} open={openTarget}/>
        {!page.locked?<button {...editButton} className="absolute inset-0 w-full cursor-grab rounded focus-visible:outline-2 focus-visible:outline-amber-400 active:cursor-grabbing"/>:
          block.target?.kind==='web'?<a aria-label={name} className="absolute inset-0" href={block.target.url} target="_blank" rel="noopener noreferrer"/>:
          block.target&&<button type="button" aria-label={name} className="absolute inset-0 w-full" onClick={()=>activate(block)}/>}
      </div>}
      {hint&&<span aria-hidden="true" className={`pointer-events-none absolute z-10 rounded-full bg-amber-400 ${hint.axis==='row'
        ? `inset-x-0 h-1 ${hint.side==='before'?'-top-2':'-bottom-2'}` : `inset-y-0 w-1 ${hint.side==='before'?'-left-2':'-right-2'}`}`}/>}
      {!page.locked&&<div role="group" aria-label={'Arrange '+name} className="home-arrange pointer-events-none absolute -bottom-2 right-2 z-[1] flex gap-0.5 rounded-md border border-border bg-background px-0.5 text-muted-foreground opacity-0 shadow-sm [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100">
        {emptyImage&&<Button size="icon" variant="ghost" className="size-7" aria-label={'Edit '+name} title="Edit block" onClick={()=>edit(block)}><Pencil/></Button>}
        <Button size="icon" variant="ghost" className="size-7" disabled={!index} aria-label="Move earlier" title="Move earlier" onClick={()=>change(novel.id,{type:'move',id:block.id,offset:-1})}><ArrowLeft/></Button>
        <Button size="icon" variant="ghost" className="size-7" disabled={index===count-1} aria-label="Move later" title="Move later" onClick={()=>change(novel.id,{type:'move',id:block.id,offset:1})}><ArrowRight/></Button>
        <Button size="icon" variant="ghost" className="size-7" aria-label="Remove block" title="Remove block" onClick={()=>{if(window.confirm(row?'Remove this row and keep its elements on the homepage?':'Remove this block from the homepage?'))change(novel.id,{type:'remove',original:block});}}><Trash2/></Button>
      </div>}
    </article>;
  }
  return <section aria-label="Project homepage" className="@container flex min-h-0 flex-1 flex-col overflow-auto">
    <header className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-2">
      <Button size="icon" variant="ghost" title="Back to workspace" aria-label="Back to workspace" onClick={onBack}><ArrowLeft/></Button>
      <h1 className="mr-auto text-lg font-semibold">Homepage</h1>
      {!page.locked&&<label title="Page width" className="relative grid size-8 shrink-0 place-items-center rounded focus-within:outline @[520px]:block @[520px]:size-auto"><Columns3 aria-hidden="true" className="size-4 @[520px]:hidden"/><select aria-label="Page width" className="absolute inset-0 w-full cursor-pointer rounded border border-border bg-background px-2 py-1 text-sm opacity-0 @[520px]:static @[520px]:opacity-100" value={page.width??'wide'} onChange={e=>change(novel.id,{type:'width',width:e.target.value as 'reading'|'wide'})}><option value="wide">Wide page</option><option value="reading">Reading width</option></select></label>}
      {!page.locked&&page.blocks.length>0&&<Button size="sm" variant="outline" aria-label="Add block" title="Add block" onClick={()=>edit()}><Plus/><span className="hidden @[520px]:inline">Add block</span></Button>}
      <Button size="sm" variant="ghost" aria-label={page.locked?'Unlock page':'Lock page'} title={page.locked?'Unlock page':'Lock page'} onClick={()=>change(novel.id,{type:'lock',locked:!page.locked})}>
        {page.locked?<UnlockKeyhole/>:<LockKeyhole/>}<span className="hidden @[360px]:inline">{page.locked?'Unlock page':'Lock page'}</span>
      </Button>
    </header>
    {message&&<p role="status" className="px-5 pt-3 text-sm text-amber-300">{message}</p>}
    <div className={'mx-auto w-full p-4 @[640px]:p-8 '+(page.width==='reading'?'max-w-3xl':'max-w-[100rem]')}>
      {!page.locked&&!page.blocks.length&&<button type="button" className="flex min-h-36 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-amber-500/50 hover:text-foreground" onClick={()=>edit()}><Plus className="size-4"/>Add your first block</button>}
      <div {...(page.locked?{}:drag.gridEvents)} className="grid grid-cols-1 items-start gap-4 @[530px]:grid-cols-2 @[1040px]:grid-cols-4">
        {roots.map((block,index)=>renderBlock(block,index,roots.length))}
      </div>
    </div>
    {!page.locked&&editor&&<HomeBlockEditor original={editor.original} cell={editor.cell} notes={notes} onClose={closeEditor} onSave={block=>change(novel.id,editor.original?{type:'edit',original:editor.original,block}:{type:'add',block})}/>}
    {page.locked&&preview&&details&&<Dialog open onOpenChange={open=>{if(!open){setPreviewId(null);restoreFocus();}}}>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{details.title||'Block preview'}</DialogTitle></DialogHeader>
        {details.image&&<img src={details.image} alt={details.title||'Block image'} className="mx-auto max-h-[68dvh] w-auto rounded-md object-contain"/>}
        {preview.text&&<p className="whitespace-pre-wrap break-words">{preview.text}</p>}
      </DialogContent>
    </Dialog>}
  </section>;
}
