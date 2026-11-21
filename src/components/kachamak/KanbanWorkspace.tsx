'use client';

import {useState, type DragEvent} from 'react';
import {ArrowLeft, ArrowRight, CalendarDays, ChevronRight, Columns3, Ellipsis, Flag, FolderTree, GripVertical, Layers2, Pencil, Plus, SquareKanban, Trash2} from 'lucide-react';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from '@/components/ui/dialog';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {useKachamak} from '@/lib/kachamak/store';
import {findNode, locateNode, uid} from '@/lib/kachamak/utils';
import type {Novel, NoteNode} from '@/lib/kachamak/types';
import {moveKanbanCard, moveKanbanColumn, newKanbanBoard, priorities, type KanbanBoard, type KanbanCard, type KanbanColumn} from '@/lib/kachamak/kanban';
import css from './kanban.module.css';

type CardForm = {kind:'card'; columnId:string; card:KanbanCard; existing:boolean};
type Form = CardForm | {kind:'board'; parent:string|null; title:string} |
  {kind:'column'; id:string|null; title:string} | {kind:'delete-column'|'delete-card'; id:string; title:string};
type Placement = {column:string; before:string|null};
const accents = ['#dfb663','#76b9c4','#95b495','#b099c6','#d49a85'];
const cardDrag = 'application/x-kachamak-kanban-card';

export function KanbanWorkspace({novel, rootId, selected, zoom, onShowTree}:{
  novel:Novel; rootId?:string; selected:NoteNode|null; zoom:number; onShowTree:()=>void;
}) {
  const roots = novel.sections.kanban ?? [];
  const scope = rootId ? findNode(roots, rootId) : null;
  const node = (selected && (!scope || findNode([scope], selected.id)) ? selected : null) ?? scope ?? roots.find(n=>!n.hidden);
  const board = node?.kanban ?? newKanbanBoard();
  const [form,setForm] = useState<Form|null>(null);
  const [dragging,setDragging] = useState<string|null>(null);
  const [drop,setDrop] = useState<Placement|null>(null);
  const select = useKachamak(s=>s.select);

  function commit(change:(current:KanbanBoard)=>KanbanBoard) {
    const state = useKachamak.getState();
    if (!node || state.activeNovelId !== novel.id) return;
    const liveNovel = state.novels.find(n=>n.id === novel.id);
    const live = findNode(liveNovel?.sections.kanban ?? [], node.id);
    if (!live) return;
    const current = live.kanban ?? newKanbanBoard(), next = change(current);
    if (next !== current) state.updateNode('kanban', live.id, {kanban:next});
  }

  function save() {
    if (!form) return;
    if (form.kind === 'board') {
      const state = useKachamak.getState();
      if (state.activeNovelId !== novel.id || !form.title.trim()) return;
      if (state.addNode('kanban', form.parent, 'doc', form.title.trim())) state.setRenamingNode(null);
    } else if (form.kind === 'column') {
      const title = form.title.trim();
      if (!title) return;
      commit(b=>({columns:form.id ? b.columns.map(col=>col.id===form.id ? {...col,title} : col) :
        [...b.columns,{id:uid(),title,cards:[]}]}));
    } else if (form.kind === 'card') {
      const card = {...form.card, title:form.card.title.trim()};
      if (!card.title) return;
      commit(b=>{
        if (!b.columns.some(col=>col.id===form.columnId)) return b;
        if (!form.existing) return {columns:b.columns.map(col=>col.id===form.columnId ? {...col,cards:[...col.cards,card]} : col)};
        const origin = b.columns.find(col=>col.cards.some(c=>c.id===card.id));
        if (!origin) return b;
        const arranged = origin.id === form.columnId ? b : moveKanbanCard(b,card.id,form.columnId);
        return {columns:arranged.columns.map(col=>col.id===form.columnId ? {...col,cards:col.cards.map(c=>c.id===card.id?card:c)} : col)};
      });
    } else if (form.kind === 'delete-column') {
      commit(b=>({columns:b.columns.filter(col=>col.id!==form.id)}));
    } else {
      commit(b=>({columns:b.columns.map(col=>({...col,cards:col.cards.filter(card=>card.id!==form.id)}))}));
    }
    setForm(null);
  }
  function editCard(column:KanbanColumn,card?:KanbanCard) {
    setForm({kind:'card',columnId:column.id,existing:!!card,card:card ?? {id:uid(),title:'',description:'',priority:'Normal',due:''}});
  }
  function placement(event:DragEvent,column:KanbanColumn): Placement {
    const cards = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[data-kanban-card]'));
    const before = cards.find(el=>{const rect=el.getBoundingClientRect(); return event.clientY < rect.top + rect.height / 2;});
    return {column:column.id,before:before?.dataset.kanbanCard ?? null};
  }
  function previewDrop(event:DragEvent,column:KanbanColumn) {
    if (!dragging) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const next = placement(event,column);
    setDrop(current => current?.column===next.column && current.before===next.before ? current : next);
  }
  function finishDrag() {setDragging(null);setDrop(null);}
  function dropCard(event:DragEvent,column:KanbanColumn) {
    if (!dragging || event.dataTransfer.getData(cardDrag)!==JSON.stringify([novel.id,node?.id,dragging])) return;
    event.preventDefault(); event.stopPropagation();
    const target = placement(event,column);
    commit(b=>moveKanbanCard(b,dragging,target.column,target.before));
    finishDrag();
  }
  const ancestors:NoteNode[]=[];
  let parentId = node && locateNode(roots,node.id)?.parentId;
  while(parentId) {
    const parent = findNode(roots,parentId);
    if (!parent || (scope && !findNode([scope],parent.id))) break;
    ancestors.unshift(parent); parentId=locateNode(roots,parent.id)?.parentId;
  }
  const creatingBoard = ()=>setForm({kind:'board',parent:rootId??null,title:''});
  const newColumn = ()=>setForm({kind:'column',id:null,title:''});
  const cardCount = board.columns.reduce((sum,col)=>sum+col.cards.length,0);
  const deleting = form?.kind==='delete-column' || form?.kind==='delete-card';
  const formTitle = !form?'': form.kind==='card'?(form.existing?'Edit card':'Add card'):form.kind==='column'?
    (form.id?'Rename column':'Add column'):form.kind==='board'?(form.parent?'New sub-board':'New board'):
    form.kind==='delete-column'?'Delete column?':'Delete card?';
  const titleEmpty = form?.kind==='card' ? !form.card.title.trim() : !form?.title.trim();

  return <section aria-label="Kanban workspace" className={css.workspace} style={{zoom}}>
    <header className={css.bar}>
      <div className={css.location}><button type="button" title="Show boards" aria-label="Show boards" className="md:hidden" onClick={onShowTree}><FolderTree size={16}/></button>
        <SquareKanban size={15}/><span>Kanban</span>
        {ancestors.map(ancestor=><span className={css.crumb} key={ancestor.id}><ChevronRight size={12}/><button onClick={()=>select(ancestor.id)}>{ancestor.title}</button></span>)}
      </div>
      {node && <button className={css.smallButton} onClick={creatingBoard}><Plus size={14}/>{rootId?'New board in this tab':'New board'}</button>}
    </header>
    {!node ? <div className={css.empty}>
      <SquareKanban size={38} strokeWidth={1.35}/><h1>Kanban boards</h1>
      <p>Create a board to organize your cards into columns.</p>
      <button className={css.primary} onClick={creatingBoard}><Plus size={15}/>New board</button>
    </div> : <>
      <div className={css.heading}>
        <div className={css.title}><h1>{node.title}</h1><p>{board.columns.length} {board.columns.length===1?'column':'columns'}<span>·</span>{cardCount} {cardCount===1?'card':'cards'}</p></div>
        <div className={css.actions}><button className={css.smallButton} onClick={()=>setForm({kind:'board',parent:node.id,title:''})}><Layers2 size={14}/>New sub-board</button>
          <button className={css.primary} onClick={newColumn}><Plus size={15}/>Add column</button></div>
      </div>
      <div className={css.scroller+' kachamak-scroll'}><div className={css.lanes}>
        {board.columns.map((col,index)=><section key={col.id} aria-label={col.title+' column'} className={css.lane}
          style={{'--stage-color':accents[index%accents.length]} as React.CSSProperties}
          onDragEnter={e=>previewDrop(e,col)} onDragOver={e=>previewDrop(e,col)}
          onDragLeave={e=>{if(!(e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)))setDrop(null);}}
          onDrop={e=>dropCard(e,col)}>
          <header className={css.laneHead}><i/><h2>{col.title}</h2><span className={css.count}>{col.cards.length}</span>
            <DropdownMenu><DropdownMenuTrigger asChild><button className={css.icon} aria-label={col.title+' column actions'}><Ellipsis size={16}/></button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={()=>setForm({kind:'column',id:col.id,title:col.title})}><Pencil/>Rename column</DropdownMenuItem>
                <DropdownMenuItem disabled={!index} onSelect={()=>commit(b=>moveKanbanColumn(b,col.id,-1))}><ArrowLeft/>Move left</DropdownMenuItem>
                <DropdownMenuItem disabled={index===board.columns.length-1} onSelect={()=>commit(b=>moveKanbanColumn(b,col.id,1))}><ArrowRight/>Move right</DropdownMenuItem>
                <DropdownMenuSeparator/><DropdownMenuItem variant="destructive" onSelect={()=>setForm({kind:'delete-column',id:col.id,title:col.title})}><Trash2/>Delete column</DropdownMenuItem>
              </DropdownMenuContent></DropdownMenu>
          </header>
          <div className={css.stack}>
            {col.cards.map((card,i)=><article key={card.id} data-kanban-card={card.id}
              className={[css.card,dragging===card.id?css.dragging:'',drop?.column===col.id&&drop.before===card.id?css.insert:''].join(' ')}
              draggable onDragStart={e=>{e.dataTransfer.setData(cardDrag,JSON.stringify([novel.id,node.id,card.id]));e.dataTransfer.effectAllowed='move';setDragging(card.id);}} onDragEnd={finishDrag}>
              <button className={css.cardBody} onClick={()=>editCard(col,card)} aria-label={'Edit '+card.title}>
                <strong>{card.title}</strong>{card.description && <span className={css.excerpt}>{card.description}</span>}
                {(card.priority!=='Normal'||card.due)&&<span className={css.meta}>{card.priority!=='Normal'&&<span data-priority={card.priority}><Flag size={12}/>{card.priority}</span>}{card.due&&<span><CalendarDays size={12}/><time dateTime={card.due}>{card.due}</time></span>}</span>}
              </button>
              <DropdownMenu><DropdownMenuTrigger asChild><button className={css.cardMenu} aria-label={card.title+' card actions'}><GripVertical size={14}/></button></DropdownMenuTrigger>
                <DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>editCard(col,card)}>Edit card</DropdownMenuItem>
                  <DropdownMenuItem disabled={i===0} onSelect={()=>commit(b=>moveKanbanCard(b,card.id,col.id,col.cards[i-1]?.id))}>Move up</DropdownMenuItem>
                  <DropdownMenuItem disabled={i===col.cards.length-1} onSelect={()=>commit(b=>moveKanbanCard(b,card.id,col.id,col.cards[i+2]?.id??null))}>Move down</DropdownMenuItem>
                  <DropdownMenuSeparator/><DropdownMenuItem variant="destructive" onSelect={()=>setForm({kind:'delete-card',id:card.id,title:card.title})}>Delete card</DropdownMenuItem>
                </DropdownMenuContent></DropdownMenu>
            </article>)}
            <button className={[css.addCard,drop?.column===col.id&&!drop.before?css.insert:''].join(' ')} onClick={()=>editCard(col)} aria-label={'Add card to '+col.title}><Plus size={14}/>Add card</button>
          </div>
        </section>)}
        {!board.columns.length&&<button className={css.addLane} onClick={newColumn}><Columns3 size={19}/>Add first column</button>}
      </div></div>
    </>}
    <Dialog open={!!form} onOpenChange={open=>{if(!open)setForm(null);}}><DialogContent aria-describedby={undefined} className="sm:max-w-md">
      <DialogHeader><DialogTitle>{formTitle}</DialogTitle></DialogHeader>
      {form && <form className={css.form} onSubmit={e=>{e.preventDefault();save();}}>
        {deleting ? <p>Delete “{form.title}”{form.kind==='delete-column'?' and all cards in this column':''}?</p> :
          form.kind==='card' ? <>
            <label>Card title<input autoFocus required maxLength={240} value={form.card.title} onChange={e=>setForm({...form,card:{...form.card,title:e.target.value}})}/></label>
            <label>Description<textarea rows={4} value={form.card.description} onChange={e=>setForm({...form,card:{...form.card,description:e.target.value}})}/></label>
            <label>Column<select value={form.columnId} onChange={e=>setForm({...form,columnId:e.target.value})}>{board.columns.map(col=><option key={col.id} value={col.id}>{col.title}</option>)}</select></label>
            <div className={css.fields}><label>Priority<select value={form.card.priority} onChange={e=>setForm({...form,card:{...form.card,priority:e.target.value as KanbanCard['priority']}})}>{priorities.map(p=><option key={p}>{p}</option>)}</select></label>
              <label>Due date<input type="date" max="9999-12-31" value={form.card.due} onChange={e=>setForm({...form,card:{...form.card,due:e.target.value}})}/></label></div>
          </> : (form.kind==='board'||form.kind==='column')&&<label>{form.kind==='board'?'Board name':'Column name'}<input autoFocus required maxLength={160} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>}
        <DialogFooter><button type="button" className={css.smallButton} onClick={()=>setForm(null)}>Cancel</button>
          <button type="submit" disabled={!deleting&&titleEmpty} className={deleting?css.danger:css.primary}>{deleting?'Delete':form.kind==='board'?'Create board':form.kind==='card'&&!form.existing?'Add card':form.kind==='column'&&!form.id?'Add column':'Save changes'}</button></DialogFooter>
      </form>}
    </DialogContent></Dialog>
  </section>;
}
