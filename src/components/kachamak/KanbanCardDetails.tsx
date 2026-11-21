'use client';

import {useEffect, useRef, useState} from 'react';
import {AlignLeft, CalendarDays, Check, CheckSquare, Circle, CircleCheck, Copy, Ellipsis, Flag, ImagePlus, MessageSquare, Plus, Tag, Trash2, Users, X} from 'lucide-react';
import {Dialog, DialogContent, DialogTitle} from '@/components/ui/dialog';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {GalleryImagePicker} from './GalleryImagePicker';
import {projectImageSrc} from '@/lib/kachamak/project-image';
import {uid} from '@/lib/kachamak/utils';
import type {Novel} from '@/lib/kachamak/types';
import {cardEntry, priorities, type CardChecklist, type CardLabel, type KanbanBoard, type KanbanCard, type Priority} from '@/lib/kachamak/kanban';
import css from './kanban.module.css';

type Change = (update:(current:KanbanCard)=>KanbanCard,message?:string)=>void;
type Tool = 'Labels'|'Dates'|'Checklist'|'Members';
const tools = [{name:'Labels',icon:Tag},{name:'Dates',icon:CalendarDays},{name:'Checklist',icon:CheckSquare},{name:'Members',icon:Users}] as const;
const colors = ['#ddb466','#75b9b0','#7fa9d9','#be99cb','#de967f','#93b982'];
const same = (left:string,right:string)=>left.trim().toLowerCase()===right.trim().toLowerCase();

function AddText({label,action,onAdd}:{label:string;action:string;onAdd:(value:string)=>void}) {
  const [text,setText]=useState('');
  return <form className={css.inlineForm} onSubmit={e=>{e.preventDefault();if(text.trim()){onAdd(text.trim());setText('');}}}>
    <input aria-label={label} placeholder={label} value={text} maxLength={240} onChange={e=>setText(e.target.value)}/>
    <button className={css.smallButton} disabled={!text.trim()}>{action}</button>
  </form>;
}

function Checklist({list,change}:{list:CardChecklist;change:Change}) {
  const completed=list.items.filter(item=>item.done).length;
  function update(apply:(current:CardChecklist)=>CardChecklist,message:string) {
    change(card=>({...card,checklists:card.checklists?.map(current=>current.id===list.id?apply(current):current)}),message);
  }
  return <section className={css.checklist} aria-label={list.title}>
    <header><CheckSquare size={16}/><h3>{list.title}</h3><span>{completed}/{list.items.length}</span>
      <button type="button" className={css.icon} aria-label={'Remove checklist '+list.title} onClick={()=>change(card=>({...card,checklists:card.checklists?.filter(item=>item.id!==list.id)}),'removed checklist '+list.title)}><Trash2 size={14}/></button>
    </header>
    {list.items.length>0&&<progress aria-label={list.title+' progress'} max={list.items.length} value={completed}/>}
    {list.items.map(item=><div key={item.id} className={css.checkItem}>
      <label><input type="checkbox" checked={item.done} onChange={e=>{const done=e.target.checked;update(current=>({...current,items:current.items.map(i=>i.id===item.id?{...i,done}:i)}),(done?'checked ':'reopened ')+item.text);}}/><span>{item.text}</span></label>
      <button className={css.icon} aria-label={'Remove item '+item.text} onClick={()=>update(current=>({...current,items:current.items.filter(i=>i.id!==item.id)}),'removed an item from '+list.title)}><X size={13}/></button>
    </div>)}
    <AddText label={'New item in '+list.title} action="Add item" onAdd={text=>update(current=>({...current,items:[...current.items,{id:uid(),text,done:false}]}),'added an item to '+list.title)}/>
  </section>;
}

function CardDates({card,change}:{card:KanbanCard;change:Change}) {
  const [start,setStart]=useState(card.start??''), [due,setDue]=useState(card.due);
  const invalid=!!start && !!due && due<start;
  return <form className={css.dateForm} onSubmit={e=>{
    e.preventDefault();
    if(!invalid)change(c=>({...c,start,due}),'updated the card dates');
  }}>
    <div className={css.fields}><label>Start date<input type="date" max="9999-12-31" value={start} onChange={e=>setStart(e.target.value)}/></label>
      <label>Due date<input type="date" max="9999-12-31" value={due} onChange={e=>setDue(e.target.value)}/></label></div>
    {invalid&&<p role="alert">The due date must be on or after the start date.</p>}
    <button className={css.smallButton} disabled={invalid || (card.start??'')===start && card.due===due}>Apply dates</button>
  </form>;
}

function LabelChip({label,onClick,selected}:{label:CardLabel;onClick?:()=>void;selected?:boolean}) {
  const content=<><i style={{background:label.color}}/>{label.name}{selected&&<Check size={12}/>}</>;
  return onClick ? <button className={css.labelChip} aria-pressed={!!selected} onClick={onClick}>{content}</button> : <span className={css.labelChip}>{content}</span>;
}

export function KanbanCardDetails({novel, board, card, columnId, existing, author, change, onMove, onCreate, onClose, onDuplicate, onDelete}:{
  novel:Novel; board:KanbanBoard; card:KanbanCard; columnId:string; existing:boolean; author:string; change:Change;
  onMove:(id:string)=>void; onCreate:(title:string,description:string)=>void; onClose:()=>void; onDuplicate:()=>void; onDelete:()=>void;
}) {
  const [tool,setTool]=useState<Tool|null>(null), [gallery,setGallery]=useState(false);
  const [title,setTitle]=useState(card.title), [description,setDescription]=useState(card.description);
  const [color,setColor]=useState(colors[0]), [comment,setComment]=useState(''), [details,setDetails]=useState(false);
  const commentRef=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>setTitle(card.title),[card.title]);
  useEffect(()=>setDescription(card.description),[card.description]);
  const selectedLabels=card.labels??[], members=card.members??[], lists=card.checklists??[];
  const feed=card.feed??[];
  const lastActivity=feed.findLast(entry=>entry.kind==='activity');
  const entries=feed.filter(entry=>entry.kind==='comment'||details||entry===lastActivity).slice().reverse();
  const boardCards=board.columns.flatMap(column=>column.cards);
  const labels=new Map<string,CardLabel>();
  for(const label of [...(novel.labels??[]),...boardCards.flatMap(c=>c.labels??[]),...selectedLabels]) {
    if(label.name.trim()) labels.set(label.name.toLowerCase(),{name:label.name,color:/^#[0-9a-f]{6}$/i.test(label.color)?label.color:colors[0]});
  }
  const people=[...new Set([author,...boardCards.flatMap(c=>c.members??[]),...members])];
  function saveTitle() {
    const trimmed=title.trim();
    if(!trimmed){if(existing)setTitle(card.title);return;}
    if(trimmed!==card.title)change(c=>c.title===trimmed?c:{...c,title:trimmed},'renamed this card');
  }
  function saveDescription() {
    if(description!==card.description)change(c=>c.description===description?c:{...c,description},'updated the description');
  }
  function close() {if(existing){saveTitle();saveDescription();}onClose();}
  function toggleLabel(label:CardLabel) {
    const remove=selectedLabels.some(l=>same(l.name,label.name));
    change(c=>({...c,labels:remove ? (c.labels??[]).filter(l=>!same(l.name,label.name)) :
      [...(c.labels??[]).filter(l=>!same(l.name,label.name)),label]}),(remove?'removed label ':'added label ')+label.name);
  }
  function assign(name:string,remove=false) {
    if(!remove&&members.some(m=>same(m,name)))return;
    change(c=>({...c,members:remove ? (c.members??[]).filter(m=>!same(m,name)) : [...(c.members??[]),name]}),(remove?'unassigned ':'assigned ')+name);
  }
  function postComment() {
    const text=comment.trim();
    if(!text)return;
    const entry=cardEntry('comment',author,text);
    change(c=>({...c,feed:[...(c.feed??[]),entry]}));
    setComment('');
  }
  function focusComment() {setTool(null);requestAnimationFrame(()=>commentRef.current?.focus());}

  return <Dialog open onOpenChange={open=>{if(!open)close();}}>
    <DialogContent aria-describedby={undefined} className={'w-[min(60rem,calc(100vw-1.5rem))] max-w-none gap-0 overflow-hidden p-0 sm:max-w-none '+css.detailDialog}>
      <DialogTitle className="sr-only">{existing?'Card details: '+card.title:'Add card'}</DialogTitle>
      <header className={css.detailBar}>
        <select aria-label="Card column" value={columnId} onChange={e=>onMove(e.target.value)}>{board.columns.map(col=><option value={col.id} key={col.id}>{col.title}</option>)}</select>
        <div className={css.barTools}><button className={css.icon} title="Choose cover from Gallery" aria-label="Choose cover from Gallery" onClick={()=>setGallery(true)}><ImagePlus size={16}/></button>
          {existing&&<DropdownMenu><DropdownMenuTrigger asChild><button className={css.icon} aria-label="More card actions"><Ellipsis size={17}/></button></DropdownMenuTrigger><DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onDuplicate}><Copy/>Duplicate card</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onDelete}><Trash2/>Delete card</DropdownMenuItem>
          </DropdownMenuContent></DropdownMenu>}
        </div>
      </header>
      <div className={css.detailScroll+' kachamak-scroll'}><div className={css.detailLayout}>
        <main className={css.detailMain}>
          {card.cover && <div className={css.cover}><img src={projectImageSrc(novel.gallery,card.cover)} alt="Card cover"/><button aria-label="Remove cover" className={css.icon} onClick={()=>change(c=>({...c,cover:undefined}),'removed the cover')}><X size={15}/></button></div>}
          <div className={css.cardTitle}>
            <button aria-label={card.complete?'Mark incomplete':'Mark complete'} aria-pressed={!!card.complete} onClick={()=>change(c=>({...c,complete:!c.complete}),card.complete?'reopened this card':'completed this card')}>{card.complete?<CircleCheck size={22}/>:<Circle size={22}/>}</button>
            <input aria-label="Card title" placeholder="Card title" maxLength={240} autoFocus={!existing} value={title} onChange={e=>setTitle(e.target.value)} onBlur={saveTitle} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/>
          </div>
          <div className={css.actionStrip}>
            <DropdownMenu><DropdownMenuTrigger asChild><button className={css.smallButton}><Plus size={14}/>Add</button></DropdownMenuTrigger>
              <DropdownMenuContent align="start">{tools.map(({name,icon:Icon})=><DropdownMenuItem key={name} onSelect={()=>setTool(name)}><Icon/>{name}</DropdownMenuItem>)}
                <DropdownMenuItem onSelect={()=>setGallery(true)}><ImagePlus/>Cover from Gallery</DropdownMenuItem>
                <DropdownMenuItem onSelect={focusComment}><MessageSquare/>Comment</DropdownMenuItem>
              </DropdownMenuContent></DropdownMenu>
            {tools.map(({name,icon:Icon})=><button key={name} className={css.smallButton} aria-expanded={tool===name} onClick={()=>setTool(t=>t===name?null:name)}><Icon size={14}/>{name}</button>)}
          </div>
          {tool&&<section aria-label={tool+' options'} className={css.toolBox}>
            <header><h3>{tool}</h3><button className={css.icon} aria-label="Close options" onClick={()=>setTool(null)}><X size={14}/></button></header>
            {tool==='Labels'&&<>
              <div className={css.chips}>{[...labels.values()].map(label=><LabelChip key={label.name.toLowerCase()} label={label} selected={selectedLabels.some(l=>same(l.name,label.name))} onClick={()=>toggleLabel(label)}/>)}</div>
              <div className={css.colorRow}><label>Label color <input type="color" aria-label="Label color" value={color} onChange={e=>setColor(e.target.value)}/></label>
                <AddText label="New label name" action="Add label" onAdd={name=>{const label=labels.get(name.toLowerCase())??{name,color};if(!selectedLabels.some(l=>same(l.name,name)))toggleLabel(label);}}/></div>
            </>}
            {tool==='Dates'&&<CardDates key={(card.start??'')+'/'+card.due} card={card} change={change}/>}
            {tool==='Checklist'&&<AddText label="Checklist name" action="Add checklist" onAdd={name=>{change(c=>({...c,checklists:[...(c.checklists??[]),{id:uid(),title:name,items:[]}]}),'added checklist '+name);setTool(null);}}/>}
            {tool==='Members'&&<>
              <div className={css.chips}>{people.map(person=><button className={css.labelChip} key={person} aria-pressed={members.some(m=>same(m,person))} onClick={()=>assign(person,members.some(m=>same(m,person)))}><Users size={13}/>{person}{members.some(m=>same(m,person))&&<Check size={12}/>}</button>)}</div>
              <AddText label="Member name" action="Assign" onAdd={name=>assign(name)}/>
            </>}
          </section>}
          {(selectedLabels.length>0||members.length>0||card.start||card.due)&&<div className={css.chips}>
            {selectedLabels.map(label=><LabelChip key={label.name} label={label}/>)}
            {members.map(name=><span className={css.labelChip} key={name}><Users size={12}/>{name}</span>)}
            {(card.due||card.start)&&<button className={css.labelChip} onClick={()=>setTool('Dates')}><CalendarDays size={12}/>{[card.start,card.due].filter(Boolean).join(' → ')}</button>}
          </div>}
          <label className={css.description}><span><AlignLeft size={16}/>Description</span>
            <textarea rows={4} placeholder="Add a description…" value={description} onChange={e=>setDescription(e.target.value)} onBlur={saveDescription}/></label>
          <label className={css.priority}><Flag size={14}/>Priority <select value={card.priority} onChange={e=>{const priority=e.target.value as Priority;change(c=>({...c,priority}),'changed priority to '+priority);}}>{priorities.map(p=><option key={p}>{p}</option>)}</select></label>
          {lists.map(list=><Checklist key={list.id} list={list} change={change}/>)}
        </main>
        <aside className={css.activity} aria-label="Comments and activity">
          <header><MessageSquare size={16}/><h3>Comments and activity</h3><button className={css.smallButton} aria-expanded={details} onClick={()=>setDetails(v=>!v)}>{details?'Hide details':'Show details'}</button></header>
          <form className={css.commentForm} onSubmit={e=>{e.preventDefault();postComment();}}>
            <textarea ref={commentRef} aria-label="Write a comment" rows={2} maxLength={12000} placeholder="Write a comment…" value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();postComment();}}}/>
            {comment.trim()&&<button className={css.smallButton}>Post comment</button>}
          </form>
          <ol>{entries.map(entry=><li key={entry.id}><span className={css.avatar} aria-hidden="true">{entry.author.trim().split(/\s+/).slice(0,2).map(n=>n[0]).join('').toUpperCase()}</span>
            <div><strong>{entry.author}</strong>{entry.kind==='activity'?' '+entry.text:<p>{entry.text}</p>}<time dateTime={new Date(entry.at).toISOString()}>{new Date(entry.at).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})}</time></div></li>)}</ol>
        </aside>
      </div></div>
      {!existing&&<footer className={css.detailFooter}><button className={css.smallButton} onClick={onClose}>Cancel</button><button className={css.primary} disabled={!title.trim()} onClick={()=>onCreate(title.trim(),description)}><Plus size={14}/>Add card</button></footer>}
      <GalleryImagePicker novel={novel} open={gallery} onOpenChange={setGallery} onPick={ref=>change(c=>({...c,cover:ref}),'changed the cover')}/>
    </DialogContent>
  </Dialog>;
}
