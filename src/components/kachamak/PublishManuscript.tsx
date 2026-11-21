'use client';
import {useState} from 'react';
import {ArrowDown,ArrowUp,GripVertical} from 'lucide-react';
import type {ManuscriptChange,ManuscriptEntry} from '@/lib/kachamak/publish-manuscript';
import type {Novel} from '@/lib/kachamak/types';

const action='rounded border border-white/15 px-2 py-1 text-xs hover:bg-white/5 disabled:opacity-40';
const arrow='shrink-0 rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-20';
const transfer='application/x-kachamak-publish-entry';

export function PublishManuscript({book,rows,change}:{book:Novel;rows:ManuscriptEntry[];change:(action:ManuscriptChange)=>void}){
  const [drag,setDrag]=useState<string|null>(null);
  const [drop,setDrop]=useState<{id:string;after:boolean}|null>(null);
  const selected=rows.filter(r=>r.included).length;
  const clear=()=>{setDrag(null);setDrop(null);};
  return <section aria-label="Manuscript contents">
    <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">Export order</h2><span className="text-xs text-muted-foreground" aria-live="polite">{selected} of {rows.length} included</span></div>
    <div className="mb-3 flex flex-wrap gap-1">
      <button className={action} disabled={!book.publishManuscript?.included} onClick={()=>change({type:'all'})}>Select all</button>
      <button className={action} disabled={!selected} onClick={()=>change({type:'none'})}>Select none</button>
      <button className={action} disabled={!book.publishManuscript?.order} onClick={()=>change({type:'binderOrder'})}>Use Binder order</button>
    </div>
    {!rows.length&&<p className="text-xs text-muted-foreground">Add chapters or notes to Binder to assemble the manuscript.</p>}
    <ol className="space-y-0.5">{rows.map(({node,parentPath,included},i)=>{
      const marked=drop?.id===node.id;
      return <li key={node.id} data-edition-entry={node.id} className={'flex min-w-0 items-center gap-1 rounded border-y-2 py-1 '+(marked?(drop.after?'border-t-transparent border-b-amber-400':'border-t-amber-400 border-b-transparent'):'border-transparent')+(drag===node.id?' opacity-50':'')}
        onDragOver={e=>{
          if(!drag||drag===node.id||!e.dataTransfer.types.includes(transfer))return;
          e.preventDefault();e.dataTransfer.dropEffect='move';
          const bounds=e.currentTarget.getBoundingClientRect();
          const after=e.clientY>bounds.top+bounds.height/2;
          if(drop?.id!==node.id||drop.after!==after)setDrop({id:node.id,after});
        }} onDrop={e=>{
          if(!drag||e.dataTransfer.getData(transfer)!==book.id+' / '+drag)return;
          e.preventDefault();const bounds=e.currentTarget.getBoundingClientRect();
          change({type:'move',id:drag,target:node.id,after:e.clientY>bounds.top+bounds.height/2});clear();
        }}>
        <span draggable title={'Drag '+node.title} className="shrink-0 cursor-grab p-0.5 text-muted-foreground" onDragStart={e=>{
          setDrag(node.id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData(transfer,book.id+' / '+node.id);
        }} onDragEnd={clear}><GripVertical className="size-3.5"/></span>
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-xs">
          <input type="checkbox" checked={included} aria-label={'Include '+node.title} className="shrink-0 accent-amber-400" onChange={e=>change({type:'include',id:node.id,value:e.target.checked})}/>
          <span className="min-w-0"><span className={'block break-words '+(included?'':'text-muted-foreground')}>{node.title}</span>{parentPath&&<small title={parentPath} className="block truncate text-muted-foreground">{parentPath}</small>}</span>
        </label>
        <button className={arrow} aria-label={'Move '+node.title+' up'} disabled={i===0} onClick={()=>change({type:'move',id:node.id,target:rows[i-1].node.id,after:false})}><ArrowUp className="size-3.5"/></button>
        <button className={arrow} aria-label={'Move '+node.title+' down'} disabled={i===rows.length-1} onClick={()=>change({type:'move',id:node.id,target:rows[i+1].node.id,after:true})}><ArrowDown className="size-3.5"/></button>
      </li>;
    })}</ol>
  </section>;
}
