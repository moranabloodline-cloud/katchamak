'use client';

import {useEffect, useMemo, useRef, useState, type CSSProperties} from 'react';
import {ArrowLeft, ArrowRight, ArrowUpRight, Crop, GripVertical, Link2, MoreHorizontal, MoveDown, Pencil, Plus, Rows3, SquareCheck, Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {canvasParts,unifiedCanvas} from '@/lib/kachamak/canvas-layout';
import {HOME_ROOT, homepageEntry, homepageRows, type HomeChange, type HomeBlock, type HomeCell, type HomeTarget} from '@/lib/kachamak/homepage';
import {flattenNotes} from '@/lib/kachamak/note-links';
import {openProjectNote} from '@/lib/kachamak/note-navigation';
import {expandCardGroups} from '@/lib/kachamak/canvas-groups';
import {useKachamak} from '@/lib/kachamak/store';
import {TABS, type Novel, type NoteNode} from '@/lib/kachamak/types';
import {HomeArtwork} from './HomeArtwork';
import {HomeArtworkEditor} from './HomeArtworkEditor';
import {HomeImagePlaceholder} from './HomeImagePlaceholder';
import {projectImageSrc} from '@/lib/kachamak/project-image';
import {HomeDocumentBlock} from './HomeDocumentBlock';
import {HomeBlockEditor} from './HomeBlockEditor';
import './canvas.css';
import {CanvasBoard} from './CanvasBoard';
import type {CanvasFile} from '@/lib/kachamak/canvas-file';
import {canvasToolLabel,toolsByKind} from './CanvasTools';
import {CanvasItemEditor,newCanvasBlock} from './CanvasItemEditor';
import {openProjectMap} from '@/lib/kachamak/map-navigation';
import {CanvasItemFace} from './CanvasItemFace';
import {CANVAS_TOOLS} from '@/lib/kachamak/canvas-board';
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

export function ProjectHomepage({novel,pageId=HOME_ROOT,onShowPages,toolsHost,onShowInspector,onToolPicked}:{novel:Novel;pageId?:string;onShowPages?:()=>void;toolsHost?:HTMLDivElement|null;onShowInspector?:()=>void;onToolPicked?:()=>void}) {
  const entry=useMemo(()=>homepageEntry(novel,pageId) ?? homepageEntry(novel,HOME_ROOT)!,[novel,pageId]);
  const page=useMemo(()=>unifiedCanvas(entry),[entry]);
  const parts=useMemo(()=>canvasParts(page.blocks),[page]);
  const free=useMemo(()=>({...page,blocks:parts.free}),[page,parts]);
  const pages=useMemo(()=>homepageRows(novel),[novel]);
  const titles=useMemo(()=>new Map(pages.map(p=>[p.id,p.title])),[pages]);
  const openPage=useKachamak(s=>s.openHomePage);

  const style=novel.tabFormats?.homepage;
  const notes=useMemo(()=>flattenNotes(novel),[novel]);
  const byId=useMemo(()=>new Map(notes.map(({node})=>[node.id,node])),[notes]);
  const updatePage=useKachamak(s=>s.changeHomepage);
  const change=(action:HomeChange)=>updatePage(novel.id,action,page.id,true);
  const openTab=useOpenWorkspaceTab(novel);
  const openMap=(id:string)=>openProjectMap(novel,id);
  const [picked,setSelection]=useState<string[]>([]);
  const selectedIds=useMemo(()=>expandCardGroups(page.blocks,new Set(picked)),[page.blocks,picked]);
  const selection=useMemo(()=>[...selectedIds],[selectedIds]);
  const rowAnchor=useRef<string|null>(null);
  const [editor,setEditor]=useState<{original?:HomeBlock;cell?:HomeCell;createRow?:boolean;manualPosition?:true;at?:HomeBlock['at'];before?:string}|null>(null);
  const [artwork,setArtwork]=useState<{block:HomeBlock;src:string}|null>(null);
  const [previewId,setPreviewId]=useState<string|null>(null);
  const [item,setItem]=useState<{initial:HomeBlock;original?:HomeBlock}|null>(null);
  const [message,setMessage]=useState('');
  const [incoming,setIncoming]=useState<{file:CanvasFile;name:string;project:string;page:string;expected:Novel['homepage']}|null>(null);
  const fileInput=useRef<HTMLInputElement>(null);
  async function readLayout(file?:File){
    if(!file)return;
    const expected=page.id===HOME_ROOT?novel.homepage:novel.homePages?.find(p=>p.id===page.id);
    try{
      const incomingFile=JSON.parse(await file.text()) as CanvasFile;
      if(incomingFile?.format!=='kachamak-canvas/1'||incomingFile.projectId!==novel.id)throw Error('Choose a Canvas layout for this book.');
      setIncoming({file:incomingFile,name:file.name,project:novel.id,page:page.id,expected});
    }catch(error){setMessage(error instanceof SyntaxError?'Choose a valid Canvas layout file.':error instanceof Error?error.message:'Could not open the layout.');}
  }
  function installLayout(){
    if(!incoming)return;
    const ok=useKachamak.getState().importCanvasLayout(incoming.project,incoming.page,incoming.expected,incoming.file);
    setIncoming(null);
    if(!ok){setMessage('The layout could not be applied. Check its links or reopen the file if the canvas changed.');return;}
    setSelection([]);
  }
  const opener=useRef<HTMLElement|null>(null);
  const addRowButton=useRef<HTMLButtonElement>(null);
  const addRow=(at:NonNullable<HomeBlock['at']>,manualPosition?:true)=>{
    captureOpener();setEditor({createRow:true,at,manualPosition});
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
  const roots=useMemo(()=>parts.fixed.filter(b=>b.layout==='row'),[parts]);
  const lanes=new Map<string,HomeBlock[][]>();
  for(const b of roots)if(b.layout==='row')lanes.set(b.id,Array.from({length:b.columns!},()=>[]));
  for(const b of page.blocks)if(b.cell)lanes.get(b.cell.rowId)?.[b.cell.column]?.push(b);
  function selectInColumn(block:HomeBlock,toggle:boolean,range:boolean){
    if(!block.cell)return;
    const siblings=lanes.get(block.cell.rowId)![block.cell.column];
    const previous=siblings.filter(b=>selectedIds.has(b.id)).map(b=>b.id);
    if(range){
      const index=siblings.findIndex(b=>b.id===block.id);
      const anchor=previous.includes(rowAnchor.current??'')?rowAnchor.current:previous[0];
      const start=anchor?siblings.findIndex(b=>b.id===anchor):index;
      const span=siblings.slice(Math.min(start,index),Math.max(start,index)+1).map(b=>b.id);
      setSelection(toggle?[...new Set([...previous,...span])]:span);
      rowAnchor.current=anchor??block.id;
    }else{
      rowAnchor.current=block.id;
      const unit=expandCardGroups(siblings,new Set([block.id]));
      setSelection(toggle&&selectedIds.has(block.id)?previous.filter(id=>!unit.has(id)):toggle?[...previous,block.id]:[block.id]);
    }
  }
  function renderBlock(block:HomeBlock,index:number,count:number,release:(cards:HomeBlock[])=>void,selectedSiblings:HomeBlock[]=[],removeRow?:()=>void,selectedColumn?:number):React.ReactNode {
    const display=blockDisplay(block,byId,titles,novel.gallery);
    const row=block.layout==='row';
    const rowLanes=lanes.get(block.id);
    const cardRow=rowLanes?.every(items=>items.length===0 || (items.length===1 && items[0].layout==='card'));
    const name=block.title || (row?'Row':block.layout==='divider'?'Divider':block.layout==='video'?'Video':display.name);
    const editLabel=block.layout==='map'?'Change map'+(block.title?': '+block.title:''):'Edit '+name;
    const editButton={type:'button' as const,'aria-label':editLabel,title:row?'Edit row':editLabel,onClick:()=>edit(block)};
    const classic=['card','banner','image','text'].includes(block.layout);
    const emptyImage=block.layout==='image'&&!display.image;
    const bare=block.layout==='image'||Boolean(display.image&&(block.layout==='banner'||(block.image&&!display.title&&!block.text)));
    const face=<BlockFace block={block} title={display.title} image={display.image}/>;
    const frame=bare?'bg-transparent':`overflow-hidden ${block.layout==='card'?'rounded-md':'rounded-xl'} border border-border hover:border-amber-500/60 ${block.layout==='banner'?'min-h-44 justify-end bg-gradient-to-br from-muted to-background':block.layout==='text'?'bg-background':'bg-card'}`;
    const cardClass='relative flex w-full flex-col text-left focus-visible:outline-2 focus-visible:outline-amber-400 '+frame;
    const selected=!page.locked&&selectedIds.has(block.id)&&(!!block.cell||row&&selectedColumn===undefined);
    return <article key={block.id} data-fixed-selected={selected?true:undefined}
      draggable={!!block.cell&&!page.locked&&!block.positionLocked}
      tabIndex={block.cell&&!page.locked?0:undefined} aria-label={block.cell?name:undefined}
      onFocus={e=>{if(block.cell&&!page.locked&&e.target===e.currentTarget&&e.currentTarget.matches(':focus-visible')&&!selectedIds.has(block.id))selectInColumn(block,false,false);}}
      onKeyDown={e=>{if(block.cell&&!page.locked&&e.key==='Enter'&&(e.target===e.currentTarget||(e.target as Element).closest('[data-card-face]'))){e.preventDefault();edit(block);}}}
      onDoubleClick={block.cell&&!page.locked?e=>{if(e.currentTarget.contains(e.target as Node)&&!(e.target as Element).closest('.home-arrange,.cv-page-grip,input,a,button:not([data-card-face])'))edit(block);}:undefined}
      onClickCapture={!block.cell||page.locked?undefined:e=>{
        const target=e.target as Element;
        if(!e.currentTarget.contains(target)||target.closest('.home-arrange'))return;
        const toggle=e.ctrlKey||e.metaKey;
        if(toggle||e.shiftKey||target.closest('[data-card-face]')){
          e.preventDefault();e.stopPropagation();e.currentTarget.focus({preventScroll:true});
        }
        selectInColumn(block,toggle,e.shiftKey);
      }} data-home-block={block.id} data-home-row={row?'':undefined} className={`relative min-w-0 [&:hover>.home-arrange]:opacity-100 [&:hover>.home-arrange]:pointer-events-auto [&:focus-within>.home-arrange]:opacity-100 [&:focus-within>.home-arrange]:pointer-events-auto ${!block.cell&&(row||block.width==='full')?'col-span-full':!block.cell&&block.width==='wide'?'@[530px]:col-span-2':''}`}>
      {row?<div className={'@container/row rounded-lg px-1 py-1 '+(page.locked?'':'outline outline-dashed outline-border')}>
        {(block.title||!page.locked)&&<div className="mb-1 flex flex-wrap items-center justify-between gap-2"><h2 className="cv-row-title">
          {!page.locked&&<button type="button" data-row-handle={block.id} aria-label={'Move row: '+(block.title||'Row')} title="Drag row · Arrow keys to move" className="cv-row-grip"><GripVertical size={16}/></button>}
          <span className="cv-row-name" data-row-handle={page.locked?undefined:block.id}>{block.title||'Row'}</span></h2>
        {!page.locked&&<div className="ml-auto flex flex-wrap justify-end gap-2">
          <button {...editButton} id={'home-edit-row-'+block.id} className="flex min-h-7 items-center gap-1 rounded px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="size-3"/>Edit row</button>
          <button type="button" onClick={removeRow} className="flex min-h-7 items-center gap-1 rounded px-2 text-xs text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="size-3"/>Remove row</button>
        </div>}</div>}
        <div data-card-row={cardRow||undefined} className="grid grid-cols-1 gap-2 @[450px]/row:grid-cols-[repeat(min(3,var(--columns)),minmax(0,1fr))] @[680px]/row:grid-cols-[repeat(var(--columns),minmax(0,1fr))]" style={{'--columns':block.columns} as React.CSSProperties}>
          {rowLanes?.map((children,column)=>{
            const selectedSiblings=children.filter(b=>selectedIds.has(b.id));
            const active=selectedIds.has(block.id)&&selectedColumn===column;
            return <div key={column} data-home-cell={block.id} data-column={column} tabIndex={page.locked?undefined:0} aria-label={'Column '+(column+1)} className={`relative flex min-w-0 flex-col gap-2 rounded ${page.locked?'':'min-h-14 pb-6'} ${active?'bg-amber-400/10 outline outline-amber-400':page.locked?'':'outline outline-dashed outline-border/70'}`}>
              {children.map((child,i)=>renderBlock(child,i,children.length,release,selectedSiblings))}
              {!page.locked&&<DropdownMenu><DropdownMenuTrigger asChild>
                <button type="button" aria-label={'Add element to column '+(column+1)} className="absolute bottom-0 left-0 flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground hover:text-foreground"><Plus className="size-3"/>Add element</button>
              </DropdownMenuTrigger><DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                <DropdownMenuItem onSelect={()=>edit(undefined,{rowId:block.id,column})}>Card or layout block…</DropdownMenuItem>
                {CANVAS_TOOLS.filter(k=>k!=='line'&&k!=='column').map(kind=>{
                  const {icon:Icon}=toolsByKind[kind];
                  return <DropdownMenuItem key={kind} onSelect={()=>setItem({initial:{...newCanvasBlock(kind),cell:{rowId:block.id,column}}})}><Icon size={15}/>{canvasToolLabel(kind)}</DropdownMenuItem>;
                })}
              </DropdownMenuContent></DropdownMenu>}
            </div>;
          })}
        </div>
      </div>:emptyImage&&!page.locked?(
        <HomeImagePlaceholder novel={novel} onImage={image=>change({type:'edit',original:block,block:{...block,image}})}/>
      ):emptyImage&&!block.target&&!block.title&&!block.text?<div aria-hidden="true" className="min-h-24 aspect-[4/1]"/>:classic?(
        page.locked&&block.target?.kind==='web'?<a draggable={false} className={cardClass} aria-label={name} href={block.target.url} target="_blank" rel="noopener noreferrer">{face}{!bare&&block.layout!=='card'&&<ArrowUpRight aria-hidden="true" className="absolute right-3 top-3 size-5 rounded bg-background/80 p-0.5"/>}</a>:
          <button {...editButton} data-card-face aria-label={name} title={page.locked?undefined:'Select or drag · Double-click to edit'} className={cardClass+(page.locked?'':' cursor-grab select-none active:cursor-grabbing')} onClick={()=>activate(block)}>{face}</button>
      ):['note','link','todo','map','audio','color','table','sketch','draw','comment'].includes(block.layout)?<div className="cv-page-card">
        {!page.locked&&<button {...editButton} className="cv-page-grip"><GripVertical size={13}/>{block.layout==='map'?'Change map':'Edit '+block.layout}</button>}
        <CanvasItemFace openMap={openMap} block={block} novel={novel} source={block.target?.kind==='note'?byId.get(block.target.id):undefined} locked={page.locked} open={openTarget} describe={describe} toggle={(index,done)=>change({type:'task',id:block.id,index,done})}/>
      </div>:<div className="relative min-w-0">
        <HomeDocumentBlock block={block} image={display.image} interactive={page.locked} describe={describe} open={openTarget}/>
        {!page.locked?<button {...editButton} data-card-face className="absolute inset-0 w-full cursor-grab rounded focus-visible:outline-2 focus-visible:outline-amber-400 active:cursor-grabbing"/>:
          block.target?.kind==='web'?<a aria-label={name} className="absolute inset-0" href={block.target.url} target="_blank" rel="noopener noreferrer"/>:
          block.target&&<button type="button" aria-label={name} className="absolute inset-0 w-full" onClick={()=>activate(block)}/>}
      </div>}
      {!page.locked&&display.image&&!row&&block.layout!=='map'&&<Button size="icon" variant="outline" className="home-arrange pointer-events-none absolute right-2 top-2 z-[1] size-8 bg-background opacity-0 focus-visible:pointer-events-auto focus-visible:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100"
        aria-label={'Reposition image: '+name} title="Reposition image" onClick={()=>{captureOpener();setArtwork({block,src:display.source||display.image!});}}><Crop/></Button>}
      {!page.locked&&!row&&<div role="group" aria-label={'Arrange '+name} className="home-arrange pointer-events-none absolute -bottom-2 right-2 z-[1] flex gap-0.5 rounded-md border border-border bg-background px-0.5 text-muted-foreground opacity-0 shadow-sm [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100">
        {(emptyImage||classic||!['note','link','todo','map','audio','color','table','sketch','draw','comment'].includes(block.layout))&&<Button size="icon" variant="ghost" className="size-7" aria-label={'Edit '+name} title="Edit block" onClick={()=>edit(block)}><Pencil/></Button>}
        <Button size="icon" variant="ghost" className="size-7" disabled={!index} aria-label="Move earlier" title="Move earlier" onClick={()=>change({type:'move',id:block.id,offset:-1})}><ArrowLeft/></Button>
        <Button size="icon" variant="ghost" className="size-7" disabled={index===count-1} aria-label="Move later" title="Move later" onClick={()=>change({type:'move',id:block.id,offset:1})}><ArrowRight/></Button>
        {block.cell&&<Button type="button" size="icon" variant="ghost" className="size-7" aria-label={'Select '+name} aria-pressed={selected} title="Select card · Shift for range" onClick={e=>selectInColumn(block,true,e.shiftKey)}><SquareCheck/></Button>}
        {block.cell&&<DropdownMenu><DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="size-7" aria-label={'More actions: '+name} title="More actions"><MoreHorizontal/></Button>
        </DropdownMenuTrigger><DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={()=>release(selected?selectedSiblings:[block])}><MoveDown size={15}/>Move out of row{selected&&selectedSiblings.length>1&&<span className="ml-auto pl-2 text-muted-foreground">{selectedSiblings.length}</span>}</DropdownMenuItem>
        </DropdownMenuContent></DropdownMenu>}
        {!row&&<Button size="icon" variant="ghost" className="size-7" aria-label="Remove block" title="Remove block" onClick={()=>{if(window.confirm('Remove this block from the canvas?'))change({type:'remove',original:block});}}><Trash2/></Button>}
      </div>}
    </article>;
  }
  const actions=(placeRow:()=>NonNullable<HomeBlock['at']>)=><>
    <Button size="sm" variant="ghost" onClick={()=>fileInput.current?.click()}>Import layout…</Button>
    <input hidden ref={fileInput} type="file" accept=".json,application/json" aria-label="Canvas layout file" onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';void readLayout(file);}}/>
    {roots.length>0&&<select aria-label="Row width" title="Row width" className="cv-width" value={page.width??'wide'} onChange={e=>change({type:'width',width:e.target.value as 'reading'|'wide'})}><option value="wide">Wide</option><option value="reading">Reading width</option></select>}
    <Button type="button" size="sm" ref={addRowButton} variant="outline" onClick={()=>addRow(placeRow())}><Rows3 size={15}/>Add row</Button>
  </>;
  const renderRow=(row:HomeBlock,release:(cards:HomeBlock[])=>void,removeRow:()=>void,selectedColumn?:number)=><div className="@container cv-fixed-section">
    <div data-home-size={style?.size} data-home-spacing={style?.spacing} data-home-align={style?.page?.align}
      style={{fontFamily:style?.font,
      '--home-text-size':style?.size===undefined?undefined:`${style.size}px`,
      '--home-leading':style?.spacing,'--home-align':style?.page?.align} as CSSProperties}
      className="w-full">
      <div className="grid grid-cols-1 items-start">
        {renderBlock(row,0,1,release,[],removeRow,selectedColumn)}
      </div>
    </div>
  </div>;
  const classicFree=(b:HomeBlock)=>{
    const display=blockDisplay(b,byId,titles,novel.gallery);
    if(['card','text','banner'].includes(b.layout)){
      const face=<BlockFace block={b} title={display.title} image={display.image}/>;
      if(page.locked&&b.target?.kind==='web')return <a href={b.target.url} target="_blank" rel="noopener noreferrer">{face}</a>;
      return page.locked?<button type="button" className="w-full text-left" onClick={()=>activate(b)}>{face}</button>:face;
    }
    const documentFace=<HomeDocumentBlock block={b} image={display.image} interactive={page.locked} describe={describe} open={openTarget}/>;
    if(!page.locked||!b.target)return documentFace;
    return <div className="relative">{documentFace}{b.target.kind==='web'
      ? <a className="absolute inset-0" aria-label={display.name} href={b.target.url} target="_blank" rel="noopener noreferrer"/>
      : <button type="button" className="absolute inset-0 w-full" aria-label={display.name} onClick={()=>activate(b)}/>}</div>;
  };
  return <>
    <CanvasBoard key={page.id+':'+(page.viewKey??'')} novel={novel} page={free} byId={byId} change={change} open={openTarget} describe={describe} showTree={onShowPages} toolsHost={toolsHost} openMap={openMap} showInspector={onShowInspector} onToolPicked={onToolPicked}
      selection={selection} setSelection={setSelection} rows={roots} rowContents={parts.fixed} heldLines={parts.parked} renderRow={renderRow} addRow={at=>addRow(at,true)} layoutActions={actions} editClassic={edit} renderClassic={classicFree}
      addClassic={placement=>{captureOpener();setEditor(placement);}}/>
    {incoming&&incoming.page===page.id&&incoming.project===novel.id&&<Dialog open onOpenChange={open=>{if(!open)setIncoming(null);}}><DialogContent><DialogHeader><DialogTitle>Replace this canvas layout?</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Open {incoming.name} in {page.title}. Undo restores the previous layout.</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setIncoming(null)}>Cancel</Button><Button onClick={installLayout}>Replace layout</Button></div></DialogContent></Dialog>}
    {message&&<p role="status" className="absolute bottom-4 right-4 bg-card p-2 text-amber-300">{message}</p>}
    {!page.locked&&item&&<CanvasItemEditor novel={novel} creating={!item.original} initial={item.initial} onClose={()=>{setItem(null);restoreFocus();}} onSave={block=>change(item.original?{type:'edit',original:item.original,block}:{type:'add',block})}/>}
    {!page.locked&&artwork&&<HomeArtworkEditor src={projectImageSrc(novel.gallery,artwork.src)!} block={artwork.block} onClose={()=>{setArtwork(null);restoreFocus();}}
      onSave={options=>change({type:'edit',original:artwork.block,block:{...artwork.block,...options,image:artwork.block.image||(options.imageCutout?artwork.src:undefined)}})}/>}
    {!page.locked&&editor&&<HomeBlockEditor novel={novel} original={editor.original} cell={editor.cell} createRow={editor.createRow} notes={notes} pages={pages} onClose={closeEditor} onSave={block=>change(editor.original?{type:'edit',original:editor.original,block}:{type:'add',before:editor.before,block:editor.at?{...block,at:editor.at,...(editor.manualPosition?{manualPosition:true as const}:{})}:block})}/>}
    {page.locked&&preview&&details&&<Dialog open onOpenChange={open=>{if(!open){setPreviewId(null);restoreFocus();}}}>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{details.title||'Block preview'}</DialogTitle></DialogHeader>
        {details.image&&(preview.imageFrame?<div className="mx-auto w-full" style={{maxWidth:`${68*preview.imageFrame.ratio}dvh`}}><HomeArtwork src={details.image} frame={preview.imageFrame} alt={details.title||'Block image'}/></div>:<img src={details.image} alt={details.title||'Block image'} className="mx-auto max-h-[68dvh] w-auto rounded-md object-contain"/>)}
        {preview.text&&<p className="whitespace-pre-wrap break-words">{preview.text}</p>}
      </DialogContent>
    </Dialog>}
  </>;
}
