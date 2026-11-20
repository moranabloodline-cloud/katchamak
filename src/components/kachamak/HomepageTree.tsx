'use client';

import {useEffect, useMemo, useState, type Dispatch, type SetStateAction} from 'react';
import {ChevronDown, ChevronRight, FileText, House, MoreVertical, Plus, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {HOME_ROOT, homepageRows} from '@/lib/kachamak/homepage';
import {useKachamak} from '@/lib/kachamak/store';
import type {Novel} from '@/lib/kachamak/types';
import {WorkspaceNavigation} from './WorkspaceNavigation';

type PageDialog = {action:'create'|'rename'; id:string|null};

export function HomepageTree({novel,selected,collapsed,setCollapsed,onDismiss}:{
  novel:Novel; selected:string; collapsed:Set<string>; setCollapsed:Dispatch<SetStateAction<Set<string>>>; onDismiss:()=>void;
}) {
  const [dialog,setDialog]=useState<PageDialog|null>(null);
  const [title,setTitle]=useState('');
  const [error,setError]=useState('');
  const rows=useMemo(()=>homepageRows(novel),[novel]);
  const pages=novel.homePages;
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
  const choose=(id:string)=>{useKachamak.getState().openHomePage(novel.id,id);onDismiss();};
  const submit=()=>{
    if(!dialog)return;
    const state=useKachamak.getState();
    const ok=dialog.action==='create'?state.createHomePage(novel.id,dialog.id,title):
      state.renameHomePage(novel.id,dialog.id!,title);
    if(ok){setDialog(null);if(dialog.action==='create')onDismiss();}
    else setError('The page tree has changed. Close this dialog and try again.');
  };
  const dialogTitle=dialog?.action==='rename'?'Rename page':dialog?.id?'New subpage':'New page';
  let hiddenBelow=Infinity;
  return <div className="flex h-full flex-col">
    <div className="flex h-10 shrink-0 items-center gap-1 border-b border-white/10 pl-3 pr-1">
      <WorkspaceNavigation includeHomePages/>
      <Button size="icon" variant="ghost" className="size-7" aria-label="New page" title="New page" onClick={()=>show('create',null)}><Plus/></Button>
      <Button size="icon" variant="ghost" className="size-7 md:hidden" aria-label="Close page tree" onClick={onDismiss}><X/></Button>
    </div>
    <nav aria-label="Homepage pages" className="min-h-0 flex-1 overflow-auto p-1">
      {rows.map(row=>{
        if(row.depth>hiddenBelow)return null;
        hiddenBelow=collapsed.has(row.id)?row.depth:Infinity;
        const active=selected===row.id;
        const Icon=row.id===HOME_ROOT?House:FileText;
        return <div key={row.id} style={{paddingLeft:Math.min(row.depth,9)*12+2}} className={'group flex items-center rounded-md border '+(active?'border-amber-500/60 bg-amber-400/10 text-amber-300':'border-transparent hover:bg-white/5')}>
          {row.hasChildren?<button type="button" className="grid size-6 shrink-0 place-items-center" aria-label={(collapsed.has(row.id)?'Expand ':'Collapse ')+row.title}
            aria-expanded={!collapsed.has(row.id)} onClick={()=>setCollapsed(current=>{const next=new Set(current);if(next.has(row.id))next.delete(row.id);else next.add(row.id);return next;})}>
            {collapsed.has(row.id)?<ChevronRight className="size-3"/>:<ChevronDown className="size-3"/>}
          </button>:<span className="w-6 shrink-0"/>}
          <button type="button" title={row.path} aria-current={active?'page':undefined} onClick={()=>choose(row.id)} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-sm">
            <Icon className="size-3.5 shrink-0 text-amber-300"/><span className="truncate">{row.title}</span>
          </button>
          <DropdownMenu><DropdownMenuTrigger asChild>
            <button type="button" aria-label={'Page options: '+row.title} className="grid size-7 shrink-0 place-items-center rounded text-muted-foreground hover:bg-white/10 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0 data-[state=open]:opacity-100"><MoreVertical className="size-4"/></button>
          </DropdownMenuTrigger><DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={()=>show('create',row.id,row.title)}>New subpage</DropdownMenuItem>
            {row.id!==HOME_ROOT&&<DropdownMenuItem onSelect={()=>show('rename',row.id,row.title)}>Rename</DropdownMenuItem>}
          </DropdownMenuContent></DropdownMenu>
        </div>;
      })}
    </nav>
    {dialog&&<Dialog open onOpenChange={open=>{if(!open)setDialog(null);}}><DialogContent className="sm:max-w-sm">
      <DialogHeader><DialogTitle>{dialogTitle}</DialogTitle></DialogHeader>
      <form className="grid gap-4" onSubmit={e=>{e.preventDefault();submit();}}>
        <label className="grid gap-1.5 text-sm">Page name<Input required autoFocus value={title} onChange={e=>setTitle(e.target.value)}/></label>
        {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={()=>setDialog(null)}>Cancel</Button>
          <Button type="submit" disabled={!title.trim()}>{dialog.action==='create'?'Create page':'Save name'}</Button></div>
      </form>
    </DialogContent></Dialog>}
  </div>;
}
