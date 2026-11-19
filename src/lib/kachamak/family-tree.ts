import type {FamilyRelationship, NoteNode, Novel} from './types';
import {forEachNode} from './utils';
import {relationshipDirection,relationshipKey,validKind} from './kinship';

export function validFamilyMembers(value:unknown):boolean {
  return value===undefined || Array.isArray(value) && value.every(id=>typeof id==='string' && id.length>0) && new Set(value).size===value.length;
}

// Topological order gives every child a row below all its parents.
function generations(ids:string[], edges:{from:string;to:string;steps:number}[]) {
  const rank=new Map(ids.map(id=>[id,0]));
  const remaining=new Map(ids.map(id=>[id,0]));
  const children=new Map<string,{to:string;steps:number}[]>();
  for(const {from,to,steps} of edges){
    if(!steps)continue;
    if(!children.has(from))children.set(from,[]);
    children.get(from)!.push({to,steps});
    remaining.set(to,remaining.get(to)!+1);
  }
  const queue=ids.filter(id=>remaining.get(id)===0);
  for(let i=0;i<queue.length;i++){
    const id=queue[i];
    for(const {to:child,steps} of children.get(id)??[]){
      rank.set(child,Math.max(rank.get(child)!,rank.get(id)!+steps));
      remaining.set(child,remaining.get(child)!-1);
      if(remaining.get(child)===0)queue.push(child);
    }
  }
  return {rank,acyclic:queue.length===ids.length};
}

export function validFamilyRelationships(value:unknown):boolean {
  if(value===undefined)return true;
  if(!Array.isArray(value))return false;
  const ids=new Set<string>(),keys=new Set<string>();
  for(const edge of value){
    if(!edge || !validKind(edge) || typeof edge.from!=='string' || !edge.from
      || typeof edge.to!=='string' || !edge.to || edge.from===edge.to)return false;
    const key=relationshipKey(edge);
    if(keys.has(key))return false;
    keys.add(key);ids.add(edge.from);ids.add(edge.to);
  }
  return generations([...ids],value.map(relationshipDirection).filter(e=>e.line==='ancestry')).acyclic;
}

export function familyMembers(novel:Novel, tree:NoteNode) {
  const codex=new Map<string,NoteNode>();
  forEachNode(novel.sections.codex,node=>codex.set(node.id,node));
  return (tree.familyMembers??[]).flatMap(id=>codex.get(id)??[]);
}

export function familyEdges(novel:Novel, people:NoteNode[]) {
  const ids=new Set(people.map(person=>person.id));
  return (novel.familyRelationships??[]).filter(edge=>ids.has(edge.from)&&ids.has(edge.to));
}

// A pair can have several descriptions (e.g. sibling and twin). Draw one
// connector and keep every recorded description available on it.
export function familyConnections(edges:FamilyRelationship[]) {
  const pairs=new Map<string,{edge:FamilyRelationship;roles:FamilyRelationship[]}>();
  const priority={ancestry:2,couple:1,kin:0};
  for(const edge of edges){
    const key=JSON.stringify([edge.from,edge.to].sort());
    const pair=pairs.get(key);
    if(!pair){pairs.set(key,{edge,roles:[edge]});continue;}
    pair.roles.push(edge);
    if(priority[relationshipDirection(edge).line]>priority[relationshipDirection(pair.edge).line])pair.edge=edge;
  }
  return [...pairs.values()];
}

export const familyCard={width:168,height:62};
export function familyLayout(people:NoteNode[],edges:FamilyRelationship[]) {
  const ids=people.map(person=>person.id);
  const peers=new Map<string,string[]>();
  const directions=edges.map(relationshipDirection);
  for(const edge of directions.filter(e=>e.peer)){
    for(const [id,mate] of [[edge.from,edge.to],[edge.to,edge.from]]){
      if(!peers.has(id))peers.set(id,[]);
      peers.get(id)!.push(mate);
    }
  }
  const group=new Map<string,string>();
  for(const id of ids){
    if(group.has(id))continue;
    const pending=[id];group.set(id,id);
    for(let i=0;i<pending.length;i++)for(const mate of peers.get(pending[i])??[]){
      if(!group.has(mate)){group.set(mate,id);pending.push(mate);}
    }
  }
  // Kinship roles guide the layout. If they conflict, ancestry takes precedence.
  const grouped=generations([...new Set(group.values())],directions.map(e=>({...e,from:group.get(e.from)!,to:group.get(e.to)!})));
  const rank=grouped.acyclic ? new Map(ids.map(id=>[id,grouped.rank.get(group.get(id)!)!])) : generations(ids,directions.filter(e=>e.line==='ancestry')).rank;
  const rows=new Map<number,string[]>(), placed=new Set<string>();
  for(const id of ids){
    const row=rank.get(id)!;
    if(!rows.has(row))rows.set(row,[]);
    for(const next of [id,...(peers.get(id)??[])]){
      if(placed.has(next)||rank.get(next)!==row)continue;
      placed.add(next);rows.get(row)!.push(next);
    }
  }
  const stepX=familyCard.width+40,stepY=familyCard.height+65;
  const widest=Array.from(rows.values()).reduce((max,row)=>Math.max(max,row.length),1);
  const width=widest*stepX+24,height=rows.size*stepY+16;
  const positions=new Map<string,{x:number;y:number}>();
  const levels=[...rows.keys()].sort((a,b)=>a-b);
  for(const [level,rank] of levels.entries()){
    const row=rows.get(rank)!;
    const left=(width-(row.length*stepX-40))/2;
    row.forEach((id,i)=>positions.set(id,{x:left+i*stepX,y:30+level*stepY}));
  }
  return {width,height,positions};
}
