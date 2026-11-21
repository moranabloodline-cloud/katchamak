import type {NoteNode} from './types';
import {canPlaceNotes} from './utils';

export type BranchSource = {id:string; parentId:string|null};
export type TreePosition = {id:string; side:'before'|'after'};
type Parents = ReadonlyMap<string,string|null>;

export function branchSources(ids:string[], parents:Parents):BranchSource[] {
  return ids.map(id=>{
    if (!parents.has(id)) throw new Error('The tree changed. Select the items again.');
    return {id,parentId:parents.get(id)!};
  });
}

export function insideBranches(id:string|null, selected:ReadonlySet<string>, parents:Parents) {
  while (id!==null) {
    if (selected.has(id)) return true;
    id=parents.get(id)??null;
  }
  return false;
}

function movingRoots(sources:BranchSource[], parents:Parents, destination:string|null) {
  if (destination!==null && !parents.has(destination)) throw new Error('The destination is no longer available.');
  if (sources.some(item=>parents.get(item.id)!==item.parentId)) throw new Error('The tree changed. Select the items again.');
  const ids=new Set(sources.map(item=>item.id));
  if (insideBranches(destination,ids,parents)) throw new Error('Choose a destination outside the selected branches.');
  return new Set(sources.filter(item=>!insideBranches(item.parentId,ids,parents)).map(item=>item.id));
}

// Gallery folders and Homepage pages keep their children by parent ID.
export function reparentEntries<T extends BranchSource>(entries:T[], parents:Parents, sources:BranchSource[], destination:string|null):T[] {
  const roots=movingRoots(sources,parents,destination);
  if (![...roots].some(id=>parents.get(id)!==destination)) return entries;
  return entries.map(item=>roots.has(item.id) && item.parentId!==destination?{...item,parentId:destination}:item);
}

export function noteParents(nodes:NoteNode[]) {
  const parents=new Map<string,string|null>();
  function walk(list:NoteNode[], parentId:string|null) {
    for (const node of list) {
      parents.set(node.id,parentId);
      walk(node.children,node.id);
    }
  }
  walk(nodes,null);
  return parents;
}

export function moveNoteBranches(nodes:NoteNode[], sources:BranchSource[], destination:string|null, position?:TreePosition):NoteNode[] {
  const parents=noteParents(nodes);
  const moving=movingRoots(sources,parents,destination);
  if (!moving.size) return nodes;
  if (position && (parents.get(position.id)!==destination || moving.has(position.id))) throw new Error('The drop position has changed.');
  const collected=new Map<string,NoteNode>();
  function detach(list:NoteNode[]):NoteNode[] {
    let changed=false;
    const result:NoteNode[]=[];
    for (const node of list) {
      if (moving.has(node.id)) {
        collected.set(node.id,node);
        changed=true;
      } else {
        const children=detach(node.children);
        changed ||= children!==node.children;
        result.push(children===node.children?node:{...node,children});
      }
    }
    return changed?result:list;
  }
  const remaining=detach(nodes);
  const branches=[...moving].map(id=>collected.get(id)!);
  if (!canPlaceNotes(nodes,destination,branches)) throw new Error('This branch would be nested too deeply to save. Choose a higher-level parent.');
  function insert(list:NoteNode[]):NoteNode[] {
    const index=position?list.findIndex(node=>node.id===position.id)+(position.side==='after'?1:0):list.length;
    return [...list.slice(0,index),...branches,...list.slice(index)];
  }
  if (!destination) return insert(remaining);
  function attach(list:NoteNode[]):NoteNode[] {
    for (let index=0;index<list.length;index++) {
      const node=list[index],target=node.id===destination;
      const children=target?insert(node.children):attach(node.children);
      if (children!==node.children) {
        const result=list.slice();
        result[index]=target?{...node,children,collapsed:false}:{...node,children};
        return result;
      }
    }
    return list;
  }
  return attach(remaining);
}
