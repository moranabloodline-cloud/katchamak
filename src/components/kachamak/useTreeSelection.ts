import {useRef,useState,type MouseEvent,type RefObject} from 'react';

// Read rendered rows so Shift follows filtering, sorting and expanded branches.
export function useTreeSelection(tree:RefObject<HTMLElement|null>, activeId:string|null) {
  const [marked,setMarked]=useState<Set<string>|null>(null);
  const anchor=useRef<string|null>(null);
  const visible=()=>Array.from(tree.current?.querySelectorAll<HTMLElement>('[data-tree-move-id]')??[],row=>row.dataset.treeMoveId!);
  function clear() {
    anchor.current=null;
    setMarked(null);
  }
  function click(id:string,event:MouseEvent) {
    const toggle=event.ctrlKey||event.metaKey;
    if (!toggle && !event.shiftKey) {
      clear();
      anchor.current=id;
      return false;
    }
    event.preventDefault();
    const rows=visible(),end=rows.indexOf(id);
    if (end<0) return true;
    const next=new Set(marked??(activeId && rows.includes(activeId)?[activeId]:[]));
    if (event.shiftKey) {
      const previous=rows.indexOf(anchor.current??activeId??'');
      const start=previous<0?end:previous;
      if (!toggle) next.clear();
      for (const row of rows.slice(Math.min(start,end),Math.max(start,end)+1)) next.add(row);
      anchor.current=rows[start];
    } else {
      if (next.has(id)) next.delete(id);
      else next.add(id);
      anchor.current=id;
    }
    setMarked(next);
    return true;
  }
  function dragIds(id:string) {
    if (marked?.has(id)) return visible().filter(row=>marked.has(row));
    setMarked(new Set([id]));
    anchor.current=id;
    return [id];
  }
  return {marked,click,clear,dragIds};
}
