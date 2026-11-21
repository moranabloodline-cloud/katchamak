'use client';

import {usePanelZoom} from './CtrlZoom';
import {useEffect, useMemo, useRef, useState, type Dispatch, type DragEvent, type SetStateAction} from 'react';
import {ChevronDown, ChevronRight, PanelsTopLeft, House, MoreVertical, Plus, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {ContextMenu,ContextMenuTrigger,ContextMenuContent,ContextMenuItem} from '@/components/ui/context-menu';
import {branchSources,insideBranches,type BranchSource} from '@/lib/kachamak/tree-move';
import {useTreeSelection} from './useTreeSelection';
import {toast} from 'sonner';
import {HOME_ROOT, homepageRows} from '@/lib/kachamak/homepage';
import {useKachamak} from '@/lib/kachamak/store';
import type {Novel} from '@/lib/kachamak/types';
import {TreeIconPicker} from './TreeIconPicker';
import {iconByName} from '@/lib/kachamak/icons';
import {WorkspaceNavigation} from './WorkspaceNavigation';

type PageDialog = {action:'create'|'rename'; id:string|null};

export function HomepageTree({novel,selected,collapsed,setCollapsed,onDismiss}:{
  novel:Novel; selected:string; collapsed:Set<string>; setCollapsed:Dispatch<SetStateAction<Set<string>>>; onDismiss:()=>void;
}) {
  const [dialog,setDialog]=useState<PageDialog|null>(null);
  const [picking,setPicking]=useState<string|null>(null);
  const [title,setTitle]=useState('');
  const [error,setError]=useState('');
  const rows=useMemo(()=>homepageRows(novel),[novel]);
  const pages=novel.homePages;
  const tree=useRef<HTMLElement>(null);
  const selection=useTreeSelection(tree,selected);
  const [drag,setDrag]=useState<BranchSource[]|null>(null);
  const [over,setOver]=useState<string|null|undefined>();
  const parents=useMemo(()=>{
    const result=new Map((pages??[]).map(page=>[page.id,page.parentId]));
    result.set(HOME_ROOT,null);
    return result;
  },[pages]);
  const draggedIds=useMemo(()=>new Set(drag?.map(source=>source.id)),[drag]);
  const topSources=useMemo(()=>drag?.filter(source=>!insideBranches(source.parentId,draggedIds,parents)),[drag,draggedIds,parents]);
  const finishDrag=()=>{setDrag(null);setOver(undefined);};
  function dropTarget(id:string|null) {
    const allowed=!!topSources?.some(page=>page.parentId!==id) && !insideBranches(id,draggedIds,parents);
    return {
      onDragOver(event:DragEvent) {
        if (!drag) return;
        event.preventDefault();event.stopPropagation();
        event.dataTransfer.dropEffect=allowed?'move':'none';
        setOver(allowed?id:undefined);
      },
      onDragLeave(event:DragEvent) {
        if (!event.currentTarget.contains(event.relatedTarget as Node|null)) setOver(current=>current===id?undefined:current);
      },
      onDrop(event:DragEvent) {
        if (!drag) return;
        event.preventDefault();event.stopPropagation();
        finishDrag();
        if (!allowed || event.dataTransfer.getData('application/x-kachamak-home-pages')!==JSON.stringify(drag)) return;
        try {
          useKachamak.getState().moveHomePages(novel.id,drag,id);
          selection.clear();
          if (id && collapsed.has(id)) setCollapsed(previous=>{const next=new Set(previous);next.delete(id);return next;});
        } catch(error) {toast.error(error instanceof Error?error.message:'The pages could not be moved.');}
      }
    };
  }
  useEffect(()=>{
    const byId=new Map(pages?.map(p=>[p.id,p]));
    setCollapsed(previous=>{
      const next=new Set(previous);
      let parent=byId.get(selected)?.parentId;
      while(parent){next.delete(parent);parent=byId.get(parent)?.parentId;}
      return next.size===previous.size?previous:next;
    });
  },[selected,pages,setCollapsed]);
  const show=(action:PageDialog['action'],id:string|null,name='')=>{
    setError('');setTitle(action==='rename'?name:'');setDialog({action,id});
  };
  function removePage(id:string,name:string){
    const root=id===HOME_ROOT;
    const message=root?'Clear every element on this canvas? Nested canvases will stay in the tree.':
      'Delete “'+name+'” and all its nested canvases?';
    if(!window.confirm(message))return;
    if(useKachamak.getState().deleteHomePage(novel.id,id))selection.clear();
    else toast.error('The canvas could not be deleted.');
  }
  function appearance(id:string,field:'icon'|'color',value:string){
    if(!useKachamak.getState().changeHomepage(novel.id,{type:'appearance',field,value},id))toast.error('The canvas could not be updated.');
  }
  const choose=(id:string)=>{useKachamak.getState().openHomePage(novel.id,id);onDismiss();};
  const submit=()=>{
    if(!dialog)return;
    const state=useKachamak.getState();
    const ok=dialog.action==='create'?state.createHomePage(novel.id,dialog.id,title):
      state.renameHomePage(novel.id,dialog.id!,title);
    if(ok){setDialog(null);if(dialog.action==='create')onDismiss();}
    else setError('The page tree has changed. Close this dialog and try again.');
  };
  const dialogTitle=dialog?.action==='rename'?'Rename canvas':dialog?.id?'New nested canvas':'New canvas';
  let hiddenBelow=Infinity;
  const leftZoom=usePanelZoom("left");
  return <div className="flex h-full flex-col">
    <WorkspaceNavigation includeHomePages/>
    <nav ref={tree} style={{zoom:leftZoom}} {...dropTarget(null)} aria-label="Canvas tree" className="min-h-0 flex-1 overflow-auto p-1">
      {rows.map(row=>{
        if(row.depth>hiddenBelow)return null;
        hiddenBelow=collapsed.has(row.id)?row.depth:Infinity;
        const active=selected===row.id;
        const Icon=iconByName(row.icon)??(row.id===HOME_ROOT?House:PanelsTopLeft);
        const clearDisabled=row.id===HOME_ROOT && (!!novel.homepage?.locked || !novel.homepage?.blocks.length);
        const deleteLabel=row.id===HOME_ROOT?'Clear canvas':'Delete canvas';
        return <ContextMenu key={row.id}><ContextMenuTrigger asChild><div {...dropTarget(row.id)} style={{paddingLeft:Math.min(row.depth,9)*12+2}} className={'group flex items-center rounded-md border '+(over===row.id?'ring-1 ring-inset ring-teal-400 ':'')+
          (selection.marked?.has(row.id)?'outline outline-1 -outline-offset-1 outline-teal-400 ':'')+(active?'border-amber-500/60 bg-amber-400/10 text-amber-300':'border-transparent hover:bg-white/5')}>
          {row.hasChildren?<button type="button" className="grid size-6 shrink-0 place-items-center" aria-label={(collapsed.has(row.id)?'Expand ':'Collapse ')+row.title}
            aria-expanded={!collapsed.has(row.id)} onClick={()=>setCollapsed(current=>{const next=new Set(current);if(next.has(row.id))next.delete(row.id);else next.add(row.id);return next;})}>
            {collapsed.has(row.id)?<ChevronRight className="size-3"/>:<ChevronDown className="size-3"/>}
          </button>:<span className="w-6 shrink-0"/>}
          <TreeIconPicker open={picking===row.id} onOpenChange={open=>setPicking(open?row.id:null)} icon={row.icon} color={row.color} allowDefault
            onIcon={key=>appearance(row.id,'icon',key)} onColor={color=>appearance(row.id,'color',color)}>
            <button type="button" aria-label={'Change icon and colour: '+row.title} title="Change icon and colour"
              className="mr-1 shrink-0 rounded p-0.5 text-amber-300 hover:bg-white/10" style={{color:row.color}}>
              <Icon className="size-3.5"/>
            </button>
          </TreeIconPicker>
          <button type="button" title={row.path} aria-current={active?'page':undefined} data-tree-move-id={row.id===HOME_ROOT?undefined:row.id} aria-pressed={selection.marked?.has(row.id)??active}
            onClick={event=>{
              if (row.id===HOME_ROOT) {if (event.ctrlKey||event.metaKey||event.shiftKey) return;selection.clear();}
              else if (selection.click(row.id,event)) return;
              choose(row.id);
            }}
            draggable={row.id!==HOME_ROOT} onDragStart={event=>{
              const sources=branchSources(selection.dragIds(row.id),parents);
              event.dataTransfer.setData('application/x-kachamak-home-pages',JSON.stringify(sources));
              event.dataTransfer.effectAllowed='move';setDrag(sources);
            }} onDragEnd={finishDrag} className="flex min-w-0 flex-1 select-none items-center gap-2 py-1.5 text-left text-sm">
            <span className="truncate" style={{color:row.color}}>{row.title}</span>
          </button>
          {row.id===HOME_ROOT && <>
            <Button size="icon" variant="ghost" className="size-7 shrink-0" aria-label="New canvas" title="New canvas" onClick={()=>show('create',null)}><Plus/></Button>
            <Button size="icon" variant="ghost" className="size-7 shrink-0 md:hidden" aria-label="Close page tree" onClick={onDismiss}><X/></Button>
          </>}
          <DropdownMenu><DropdownMenuTrigger asChild>
            <button type="button" aria-label={'Page options: '+row.title} className="grid size-7 shrink-0 place-items-center rounded text-muted-foreground hover:bg-white/10 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0 data-[state=open]:opacity-100"><MoreVertical className="size-4"/></button>
          </DropdownMenuTrigger><DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={()=>show('create',row.id,row.title)}>New nested canvas</DropdownMenuItem>
            <DropdownMenuItem onSelect={()=>show('rename',row.id,row.title)}>Rename</DropdownMenuItem>
            <DropdownMenuItem disabled={clearDisabled} onSelect={()=>removePage(row.id,row.title)}>{deleteLabel}</DropdownMenuItem>
          </DropdownMenuContent></DropdownMenu>
        </div></ContextMenuTrigger><ContextMenuContent>
          <ContextMenuItem onSelect={()=>show('create',row.id)}>New nested canvas</ContextMenuItem>
          <ContextMenuItem onSelect={()=>show('rename',row.id,row.title)}>Rename</ContextMenuItem>
          <ContextMenuItem disabled={clearDisabled} onSelect={()=>removePage(row.id,row.title)}>{deleteLabel}</ContextMenuItem>
        </ContextMenuContent></ContextMenu>;
      })}
    </nav>
    {drag && <div {...dropTarget(null)} className={'shrink-0 rounded border border-dashed border-teal-400/60 p-2 text-center text-xs '+(over===null?'bg-teal-400/15':'')}>Move to top level</div>}
    {dialog&&<Dialog open onOpenChange={open=>{if(!open)setDialog(null);}}><DialogContent className="sm:max-w-sm">
      <DialogHeader><DialogTitle>{dialogTitle}</DialogTitle></DialogHeader>
      <form className="grid gap-4" onSubmit={e=>{e.preventDefault();submit();}}>
        <label className="grid gap-1.5 text-sm">Name<Input required autoFocus value={title} onChange={e=>setTitle(e.target.value)}/></label>
        {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={()=>setDialog(null)}>Cancel</Button>
          <Button type="submit" disabled={!title.trim()}>{dialog.action==='create'?'Create canvas':'Save name'}</Button></div>
      </form>
    </DialogContent></Dialog>}
  </div>;
}
