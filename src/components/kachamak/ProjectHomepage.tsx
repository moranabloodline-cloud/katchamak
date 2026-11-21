'use client';

import {useEffect, useMemo, useRef, useState, type CSSProperties} from 'react';
import {ArrowLeft, ArrowRight, ArrowUpRight, Crop, Columns3, GripVertical, Link2, LockKeyhole, ListTree, Pencil, Plus, Rows3, Trash2, UnlockKeyhole} from 'lucide-react';
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger} from '@/components/ui/alert-dialog';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {HOME_ROOT, homepageEntry, homepageRows, type HomeChange, type HomeBlock, type HomeCell, type HomeTarget} from '@/lib/kachamak/homepage';
import {flattenNotes} from '@/lib/kachamak/note-links';
import {openProjectNote} from '@/lib/kachamak/note-navigation';
import {useKachamak} from '@/lib/kachamak/store';
import {TABS, type Novel, type NoteNode} from '@/lib/kachamak/types';
import {useHomepageDrag} from './useHomepageDrag';
import {HomeArtwork} from './HomeArtwork';
import {HomeArtworkEditor} from './HomeArtworkEditor';
import {HomeImagePlaceholder} from './HomeImagePlaceholder';
import {projectImageSrc} from '@/lib/kachamak/project-image';
import {HomeDocumentBlock} from './HomeDocumentBlock';
import {HomeBlockEditor} from './HomeBlockEditor';
import './canvas.css';
import {CanvasBoard} from './CanvasBoard';
import {CanvasTools} from './CanvasTools';
import {CanvasItemEditor,newCanvasBlock} from './CanvasItemEditor';
import {CanvasItemFace} from './CanvasItemFace';
import type {CanvasTool} from '@/lib/kachamak/canvas-board';
import {useOpenWorkspaceTab} from './WorkspaceTabs';

function blockDisplay(block:HomeBlock, notes:Map<string,NoteNode>, pages:Map<string,string>, gallery:Novel['gallery']) {
  const target=block.target;
  const note=target?.kind==='note' ? notes.get(target.id) : undefined;
  const destination=target?.kind==='page' ? (pages.get(target.id) ?? 'Unavailable page') : target?.kind==='tab' ? TABS.find(t=>t.key===target.tab)?.label :
    target?.kind==='web' ? new URL(target.url).hostname : note?.title;
  return {
    title:block.title || (block.layout==='card' ? undefined : destination),
    source:block.image || note?.image,
    image:block.imageCutout || projectImageSrc(gallery,block.image || note?.image),
    name:block.title || destination || block.text.split('\n')[0] || (target?.kind==='note'?'Unavailable note':'Image'),
  };
}

function BlockFace({block,title,image}:{block:HomeBlock;title?:string;image?:string}) {
  if(block.layout==='card')return <>
    {title&&<span className="w-full bg-background px-2 py-1 text-center text-sm leading-tight font-bold uppercase [overflow-wrap:anywhere]">{title}</span>}
    {image&&<HomeArtwork src={image} frame={block.imageFrame}/>}
    {block.text&&<span className="w-full whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-muted-foreground">{block.text}</span>}
    {!title&&!image&&!block.text&&<Link2 aria-hidden="true" className="mx-auto my-3 size-4 text-muted-foreground"/>}
  </>;
  const banner=block.layout==='banner';
  const caption=image && (banner || block.layout==='image') ? block.title : title;
  return <>
    {image&&<HomeArtwork src={image} frame={block.imageFrame}/>}
    {(caption||block.text||!image)&&<span className={`flex w-full flex-col gap-2 break-words p-5 ${banner?'@[640px]:p-8':''}`}>
      {caption&&<span className={`font-semibold leading-tight ${!block.title && (block.target?.kind==='note'||block.target?.kind==='page')?'text-center':''} ${banner?'text-3xl @[640px]:text-4xl':block.layout==='text'?'text-xl':'text-lg'}`}>{caption}</span>}
      {block.text&&<span className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{block.text}</span>}
      {!caption&&!block.text&&!image&&<span>Unavailable note</span>}
    </span>}
  </>;
}

export function ProjectHomepage({novel,pageId=HOME_ROOT,onShowPages}:{novel:Novel;pageId?:string;onShowPages?:()=>void}) {
  const page=homepageEntry(novel,pageId) ?? homepageEntry(novel,HOME_ROOT)!;
  const pages=useMemo(()=>homepageRows(novel),[novel]);
  const titles=useMemo(()=>new Map(pages.map(p=>[p.id,p.title])),[pages]);
  const openPage=useKachamak(s=>s.openHomePage);

  const style=novel.tabFormats?.homepage;
  const notes=useMemo(()=>flattenNotes(novel),[novel]);
  const byId=useMemo(()=>new Map(notes.map(({node})=>[node.id,node])),[notes]);
  const updatePage=useKachamak(s=>s.changeHomepage);
  const change=(action:HomeChange)=>updatePage(novel.id,action,page.id);
  const openTab=useOpenWorkspaceTab(novel);
  const drag=useHomepageDrag(page.locked,(id,p)=>change(p.cell?{type:'into',id,cell:p.cell}:{type:'place',id,targetId:p.targetId,side:p.side}));
  const [editor,setEditor]=useState<{original?:HomeBlock;cell?:HomeCell}|null>(null);
  const [artwork,setArtwork]=useState<{block:HomeBlock;src:string}|null>(null);
  const [previewId,setPreviewId]=useState<string|null>(null);
  const [item,setItem]=useState<{initial:HomeBlock;original?:HomeBlock}|null>(null);
  const [message,setMessage]=useState('');
  const opener=useRef<HTMLElement|null>(null);
  const addRowButton=useRef<HTMLButtonElement>(null);
  const addRow=()=>{
    const id=crypto.randomUUID();
    if(change({type:'add',block:{id,layout:'row',width:'full',columns:2,title:'',text:''}})){
      requestAnimationFrame(()=>document.getElementById('home-edit-row-'+id)?.focus());
    }
  };
  const captureOpener=()=>{opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;};
  const restoreFocus=()=>requestAnimationFrame(()=>{if(opener.current?.isConnected)opener.current.focus();});
  const closeEditor=()=>{setEditor(null);restoreFocus();};
  useEffect(()=>{if(page.locked){setEditor(null);setItem(null);setArtwork(null);}else setPreviewId(null);setMessage('');},[page.locked]);
  const edit=(original?:HomeBlock,cell?:HomeCell)=>{captureOpener();setMessage('');if(original&&['note','link','todo','map','audio','color','table','sketch','draw','comment'].includes(original.layout))setItem({initial:original,original});
    else setEditor({original,cell:original?.cell??cell});};
  const preview=page.blocks.find(block=>block.id===previewId);
  const details=preview&&blockDisplay(preview,byId,titles,novel.gallery);
  const describe=(target:HomeTarget)=>target.kind==='page'?(titles.get(target.id)??'Unavailable page'):target.kind==='note'?(byId.get(target.id)?.title||'Unavailable note'):target.kind==='web'?new URL(target.url).hostname:(TABS.find(t=>t.key===target.tab)?.label??target.tab);
  const openTarget=(target:HomeTarget)=>{
    setMessage('');
    if(target.kind==='page'){
      if(!openPage(novel.id,target.id))setMessage('This page is no longer in this book. Unlock the page to choose another destination.');
    } else if(target.kind==='note'){
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
  if(page.mode==='board')return <CanvasBoard novel={novel} page={page} byId={byId} change={change} open={openTarget} describe={describe} showTree={onShowPages}/>;
  function addTool(kind:CanvasTool){
    captureOpener();
    if(kind==='column'){addRow();return;}
    if(kind==='line'){change({type:'add',block:{id:crypto.randomUUID(),layout:'divider',width:'full',title:'',text:''}});return;}
    setItem({initial:newCanvasBlock(kind)});
  }
  const roots=page.blocks.filter(b=>!b.cell);
  const lanes=new Map<string,HomeBlock[][]>();
  for(const b of roots)if(b.layout==='row')lanes.set(b.id,Array.from({length:b.columns!},()=>[]));
  for(const b of page.blocks)if(b.cell)lanes.get(b.cell.rowId)?.[b.cell.column]?.push(b);
  function renderBlock(block:HomeBlock,index:number,count:number):React.ReactNode {
    const display=blockDisplay(block,byId,titles,novel.gallery);
    const row=block.layout==='row';
    const name=block.title || (row?'Row':block.layout==='divider'?'Divider':block.layout==='video'?'Video':display.name);
    const editButton={type:'button' as const,draggable:!page.locked,onDragStart:(e:React.DragEvent<HTMLButtonElement>)=>drag.start(e,block.id,row),onDragEnd:drag.finish,
      'aria-label':'Edit '+name,title:'Drag to rearrange, or click to edit',onClick:()=>edit(block)};
    const classic=['card','banner','image','text'].includes(block.layout);
    const emptyImage=block.layout==='image'&&!display.image;
    const bare=block.layout==='image'||Boolean(display.image&&(block.layout==='banner'||(block.image&&!display.title&&!block.text)));
    const face=<BlockFace block={block} title={display.title} image={display.image}/>;
    const frame=bare?'bg-transparent':`overflow-hidden ${block.layout==='card'?'rounded-md':'rounded-xl'} border border-border hover:border-amber-500/60 ${block.layout==='banner'?'min-h-44 justify-end bg-gradient-to-br from-muted to-background':block.layout==='text'?'bg-background':'bg-card'}`;
    const cardClass='relative flex w-full flex-col text-left focus-visible:outline-2 focus-visible:outline-amber-400 '+frame;
    const hint=!drag.hint?.cell&&drag.hint?.targetId===block.id?drag.hint:null;
    return <article key={block.id} data-home-block={block.id} data-home-row={row?'':undefined} className={`relative min-w-0 [&:hover>.home-arrange]:opacity-100 [&:hover>.home-arrange]:pointer-events-auto [&:focus-within>.home-arrange]:opacity-100 [&:focus-within>.home-arrange]:pointer-events-auto ${drag.dragging===block.id?'opacity-55':''} ${!block.cell&&(row||block.width==='full')?'col-span-full':!block.cell&&block.width==='wide'?'@[530px]:col-span-2':''}`}>
      {row?<div className={'@container/row rounded-lg px-1 py-3 '+(page.locked?'':'outline outline-dashed outline-border')}>
        {block.title&&<h2 className="mb-2 text-xl font-semibold">{block.title}</h2>}
        {!page.locked&&<div className="mb-2 flex flex-wrap justify-end gap-2">
          <button {...editButton} id={'home-edit-row-'+block.id} className="flex min-h-7 cursor-grab scroll-mt-12 items-center gap-1 rounded px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"><GripVertical className="size-3"/>Edit row</button>
          <AlertDialog>
            <AlertDialogTrigger asChild><button type="button" className="flex min-h-7 items-center gap-1 rounded px-2 text-xs text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="size-3"/>Remove row</button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this row?</AlertDialogTitle>
                <AlertDialogDescription>Its elements will stay on this page in reading order.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={()=>{
                  if(change({type:'remove',original:block}))requestAnimationFrame(()=>addRowButton.current?.focus({preventScroll:true}));
                }}>Remove row</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>}
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
        <HomeImagePlaceholder novel={novel} onDragStart={editButton.onDragStart} onDragEnd={drag.finish} onImage={image=>change({type:'edit',original:block,block:{...block,image}})}/>
      ):emptyImage&&!block.target&&!block.title&&!block.text?<div aria-hidden="true" className="min-h-24 aspect-[4/1]"/>:classic?(
        page.locked&&block.target?.kind==='web'?<a draggable={false} className={cardClass} aria-label={name} href={block.target.url} target="_blank" rel="noopener noreferrer">{face}{!bare&&block.layout!=='card'&&<ArrowUpRight aria-hidden="true" className="absolute right-3 top-3 size-5 rounded bg-background/80 p-0.5"/>}</a>:
          <button {...editButton} aria-label={page.locked?name:'Edit '+name} title={page.locked?undefined:editButton.title} className={cardClass+(page.locked?'':' cursor-grab select-none active:cursor-grabbing')} onClick={()=>activate(block)}>{face}</button>
      ):['note','link','todo','map','audio','color','table','sketch','draw','comment'].includes(block.layout)?<div className="cv-page-card">
        {!page.locked&&<button {...editButton} className="cv-page-grip"><GripVertical size={13}/>Edit {block.layout}</button>}
        <CanvasItemFace block={block} novel={novel} source={block.target?.kind==='note'?byId.get(block.target.id):undefined} locked={page.locked} open={openTarget} describe={describe} toggle={(index,done)=>change({type:'task',id:block.id,index,done})}/>
      </div>:<div className="relative min-w-0">
        <HomeDocumentBlock block={block} image={display.image} interactive={page.locked} describe={describe} open={openTarget}/>
        {!page.locked?<button {...editButton} className="absolute inset-0 w-full cursor-grab rounded focus-visible:outline-2 focus-visible:outline-amber-400 active:cursor-grabbing"/>:
          block.target?.kind==='web'?<a aria-label={name} className="absolute inset-0" href={block.target.url} target="_blank" rel="noopener noreferrer"/>:
          block.target&&<button type="button" aria-label={name} className="absolute inset-0 w-full" onClick={()=>activate(block)}/>}
      </div>}
      {!page.locked&&display.image&&!row&&<Button size="icon" variant="outline" className="home-arrange pointer-events-none absolute right-2 top-2 z-[1] size-8 bg-background opacity-0 focus-visible:pointer-events-auto focus-visible:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100"
        aria-label={'Reposition image: '+name} title="Reposition image" onClick={()=>{captureOpener();setArtwork({block,src:display.source||display.image!});}}><Crop/></Button>}
      {hint&&<span aria-hidden="true" className={`pointer-events-none absolute z-10 rounded-full bg-amber-400 ${hint.axis==='row'
        ? `inset-x-0 h-1 ${hint.side==='before'?'-top-2':'-bottom-2'}` : `inset-y-0 w-1 ${hint.side==='before'?'-left-2':'-right-2'}`}`}/>}
      {!page.locked&&<div role="group" aria-label={'Arrange '+name} className="home-arrange pointer-events-none absolute -bottom-2 right-2 z-[1] flex gap-0.5 rounded-md border border-border bg-background px-0.5 text-muted-foreground opacity-0 shadow-sm [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100">
        {emptyImage&&<Button size="icon" variant="ghost" className="size-7" aria-label={'Edit '+name} title="Edit block" onClick={()=>edit(block)}><Pencil/></Button>}
        <Button size="icon" variant="ghost" className="size-7" disabled={!index} aria-label="Move earlier" title="Move earlier" onClick={()=>change({type:'move',id:block.id,offset:-1})}><ArrowLeft/></Button>
        <Button size="icon" variant="ghost" className="size-7" disabled={index===count-1} aria-label="Move later" title="Move later" onClick={()=>change({type:'move',id:block.id,offset:1})}><ArrowRight/></Button>
        {!row&&<Button size="icon" variant="ghost" className="size-7" aria-label="Remove block" title="Remove block" onClick={()=>{if(window.confirm('Remove this block from the homepage?'))change({type:'remove',original:block});}}><Trash2/></Button>}
      </div>}
    </article>;
  }
  return <div className="cv-page-shell col-span-full row-start-2"><section style={{zoom:"var(--workspace-canvas-zoom, 1)"}} aria-label="Project homepage" aria-description={page.title} className="@container col-span-full row-start-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
    <div className={'pointer-events-none sticky top-0 z-10 flex h-8 shrink-0 items-center justify-end gap-1.5 px-1.5'+(page.locked?' -mb-8':'')}>
      {onShowPages&&<Button size="icon" variant="ghost" className="pointer-events-auto mr-auto size-7 bg-background/90 md:hidden" aria-label="Show homepage pages" onClick={onShowPages}><ListTree/></Button>}
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-md bg-background/90">
        {!page.locked&&<label title="Page width" className="relative grid size-8 shrink-0 place-items-center rounded focus-within:outline @[520px]:block @[520px]:size-auto"><Columns3 aria-hidden="true" className="size-4 @[520px]:hidden"/><select aria-label="Page width" className="absolute inset-0 w-full cursor-pointer rounded border border-border bg-background px-2 py-1 text-sm opacity-0 @[520px]:static @[520px]:opacity-100" value={page.width??'wide'} onChange={e=>change({type:'width',width:e.target.value as 'reading'|'wide'})}><option value="wide">Wide page</option><option value="reading">Reading width</option></select></label>}
        {!page.locked&&page.blocks.length>0&&<Button size="sm" variant="outline" aria-label="Add block" title="Add block" onClick={()=>edit()}><Plus/><span className="hidden @[520px]:inline">Add block</span></Button>}
        {!page.locked&&<Button ref={addRowButton} size="sm" variant="outline" onClick={addRow}><Rows3/>Add row</Button>}
        <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-foreground" aria-label={page.locked?'Unlock page':'Lock page'} title={page.locked?'Unlock page':'Lock page'} onClick={()=>change({type:'lock',locked:!page.locked})}>
          {page.locked?<UnlockKeyhole aria-hidden="true" className="size-3.5"/>:<LockKeyhole aria-hidden="true" className="size-3.5"/>}
        </Button>
      </div>
    </div>
    {message&&<p role="status" className="px-5 pt-3 text-sm text-amber-300">{message}</p>}
    <div data-home-size={style?.size} data-home-spacing={style?.spacing} data-home-align={style?.page?.align}
      style={{fontFamily:style?.font,
      '--home-text-size':style?.size===undefined?undefined:`${style.size}px`,
      '--home-leading':style?.spacing,'--home-align':style?.page?.align} as CSSProperties}
      className={'mx-auto w-full p-4 @[640px]:p-8 '+(page.locked?'pt-8 ':'')+(page.width==='reading'?'max-w-3xl':'max-w-[100rem]')}>
      {!page.locked&&!page.blocks.length&&<button type="button" className="flex min-h-36 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-amber-500/50 hover:text-foreground" onClick={()=>edit()}><Plus className="size-4"/>Add your first block</button>}
      <div {...(page.locked?{}:drag.gridEvents)} className="grid grid-cols-1 items-start gap-4 @[530px]:grid-cols-2 @[1040px]:grid-cols-4">
        {roots.map((block,index)=>renderBlock(block,index,roots.length))}
      </div>
    </div>
    {!page.locked&&item&&<CanvasItemEditor novel={novel} creating={!item.original} initial={item.initial} onClose={()=>{setItem(null);restoreFocus();}} onSave={block=>change(item.original?{type:'edit',original:item.original,block}:{type:'add',block})}/>}
    {!page.locked&&artwork&&<HomeArtworkEditor src={projectImageSrc(novel.gallery,artwork.src)!} block={artwork.block} onClose={()=>{setArtwork(null);restoreFocus();}}
      onSave={options=>change({type:'edit',original:artwork.block,block:{...artwork.block,...options,image:artwork.block.image||(options.imageCutout?artwork.src:undefined)}})}/>}
    {!page.locked&&editor&&<HomeBlockEditor novel={novel} original={editor.original} cell={editor.cell} notes={notes} pages={pages} onClose={closeEditor} onSave={block=>change(editor.original?{type:'edit',original:editor.original,block}:{type:'add',block})}/>}
    {page.locked&&preview&&details&&<Dialog open onOpenChange={open=>{if(!open){setPreviewId(null);restoreFocus();}}}>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{details.title||'Block preview'}</DialogTitle></DialogHeader>
        {details.image&&(preview.imageFrame?<div className="mx-auto w-full" style={{maxWidth:`${68*preview.imageFrame.ratio}dvh`}}><HomeArtwork src={details.image} frame={preview.imageFrame} alt={details.title||'Block image'}/></div>:<img src={details.image} alt={details.title||'Block image'} className="mx-auto max-h-[68dvh] w-auto rounded-md object-contain"/>)}
        {preview.text&&<p className="whitespace-pre-wrap break-words">{preview.text}</p>}
      </DialogContent>
    </Dialog>}
  </section>{!page.locked&&<CanvasTools onPick={addTool}/>}</div>;
}
