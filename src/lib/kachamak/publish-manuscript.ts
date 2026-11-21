import type {NoteNode,Novel} from './types';

// Missing fields follow Binder. Explicit inclusion only admits the chosen notes.
export interface PublishManuscript {
  included?:string[];
  order?:string[];
}
export type ManuscriptChange =
  | {type:'include';id:string;value:boolean}
  | {type:'all'|'none'|'binderOrder'}
  | {type:'move';id:string;target:string;after:boolean};
export type ManuscriptEntry={node:NoteNode;parentPath:string;included:boolean};

export function validPublishManuscript(value:unknown){
  if(value===undefined)return true;
  if(!value || typeof value!=='object' || Array.isArray(value))return false;
  const validIds=(v:unknown)=>v===undefined || Array.isArray(v)&&v.every(id=>typeof id==='string'&&id.length>0)&&new Set(v).size===v.length;
  const plan=value as PublishManuscript;
  return validIds(plan.included)&&validIds(plan.order);
}
export function manuscriptEntries(book:Novel):ManuscriptEntry[]{
  const included=book.publishManuscript?.included;
  const selected=included?new Set(included):null;
  const rows:ManuscriptEntry[]=[];
  function visit(nodes:NoteNode[],parentPath:string){
    for(const node of nodes){
      rows.push({node,parentPath,included:selected?.has(node.id)??true});
      visit(node.children,parentPath?parentPath+' / '+node.title:node.title);
    }
  }
  visit(book.sections.binder??[],'');
  const order=book.publishManuscript?.order;
  if(!order?.length)return rows;
  const byId=new Map(rows.map(row=>[row.node.id,row]));
  const sorted:ManuscriptEntry[]=[];
  for(const id of order){
    const row=byId.get(id);
    if(row){sorted.push(row);byId.delete(id);}
  }
  return sorted.concat([...byId.values()]);
}
export function changeManuscript(book:Novel,change:ManuscriptChange):PublishManuscript|undefined{
  const old=book.publishManuscript;
  const next={...old};
  if(change.type==='all')delete next.included;
  if(change.type==='none')next.included=[];
  if(change.type==='binderOrder')delete next.order;
  if(change.type==='include'||change.type==='move'){
    const rows=manuscriptEntries(book);
    const ids=rows.map(row=>row.node.id);
    const row=rows.find(r=>r.node.id===change.id);
    if(!row)return old;
    if(change.type==='include'){
      if(row.included===change.value)return old;
      const included=new Set(old?.included??ids);
      if(change.value)included.add(change.id);else included.delete(change.id);
      next.included=[...included];
    }else{
      if(change.id===change.target||!ids.includes(change.target))return old;
      const order=[...new Set([...(old?.order??[]),...ids])].filter(id=>id!==change.id);
      order.splice(order.indexOf(change.target)+(change.after?1:0),0,change.id);
      const liveIds=new Set(ids);
      if(order.filter(id=>liveIds.has(id)).every((id,i)=>id===ids[i]))return old;
      next.order=order;
    }
  }
  return next.included===undefined&&next.order===undefined?undefined:next;
}
