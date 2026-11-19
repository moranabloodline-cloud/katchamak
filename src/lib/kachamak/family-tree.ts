import type {FamilyRelationship, NoteNode, Novel} from './types';
import {forEachNode} from './utils';
import {directParentage,isSiblingRole,kinshipFamily,relationshipCaption,relationshipDirection,relationshipKey,validKind} from './kinship';

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

function codexIndex(novel:Novel) {
  const codex=new Map<string,NoteNode>();
  forEachNode(novel.sections.codex,node=>codex.set(node.id,node));
  return codex;
}

export function familyMembers(novel:Novel, tree:NoteNode, codex=codexIndex(novel)) {
  return (tree.familyMembers??[]).flatMap(id=>codex.get(id)??[]);
}

export function familyEdges(novel:Novel, people:NoteNode[]) {
  const ids=new Set(people.map(person=>person.id));
  return (novel.familyRelationships??[]).filter(edge=>ids.has(edge.from)&&ids.has(edge.to));
}

type TreeMembership = Map<string, Set<string>[]>;

function indexTreeMembers(index:TreeMembership, node:NoteNode) {
  if (!node.familyMembers || node.familyMembers.length < 2) return;
  const members = new Set(node.familyMembers);
  for (const id of members) {
    const trees = index.get(id);
    if (trees) trees.push(members);
    else index.set(id, [members]);
  }
}

function hasPair(index:TreeMembership, edge:FamilyRelationship) {
  return index.get(edge.from)?.some(members => members.has(edge.to)) ?? false;
}

// A relationship is shared only when both people belong to the same tree.
export function familyDeletionImpact(novel:Novel, rootId:string) {
  const inside = new Map<string, Set<string>[]>();
  const outside = new Map<string, Set<string>[]>();
  function visit(node:NoteNode, deleting:boolean) {
    deleting = deleting || node.id === rootId;
    indexTreeMembers(deleting ? inside : outside, node);
    for (const child of node.children) visit(child, deleting);
  }
  for (const root of novel.sections.family ?? []) visit(root, false);
  const related = (novel.familyRelationships ?? []).filter(edge => hasPair(inside,edge));
  const exclusive = new Set(related.filter(edge => !hasPair(outside,edge)));
  return {related, exclusive};
}

function siblingPair(a:string,b:string) {
  return JSON.stringify(a<b?[a,b]:[b,a]);
}

type FamilyRole='male'|'female'|'unspecified';

// Use only the writer's explicit parent, son or daughter terms for a specific
// kinship label. Conflicting terms fall back to a neutral label.
function recordRole(roles:Map<string,FamilyRole>,edge:FamilyRelationship) {
  const term=edge.kind.split('_').pop();
  let role:FamilyRole;
  if(term==='son' || term==='father')role='male';
  else if(term==='daughter' || term==='mother')role='female';
  else return;
  const prior=roles.get(edge.from);
  roles.set(edge.from,prior && prior!==role?'unspecified':role);
}

function addToIndex(index:Map<string,Set<string>>,key:string,value:string) {
  const values=index.get(key);
  if(values)values.add(value);
  else index.set(key,new Set([value]));
}

// Everything returned here is a projection. Only the original relationships
// in novel.familyRelationships belong in a save or an export.
export function familyTreeView(novel:Novel,tree:NoteNode|null) {
  const codex=codexIndex(novel);
  const people=tree?familyMembers(novel,tree,codex):[];
  const edges=familyEdges(novel,people);
  const reasons=inferredRelationships(novel.familyRelationships??[],codex,new Set(people.map(p=>p.id)),edges);
  return {people,edges:[...edges,...reasons.keys()],reasons};
}

export function noteRelationships(novel:Novel,person:string) {
  const rows:{target:NoteNode;label:string;reason?:string}[]=[];
  if(!novel.familyRelationships?.length || !novel.sections.family?.length)return rows;
  const membership:TreeMembership = new Map();
  forEachNode(novel.sections.family, tree => indexTreeMembers(membership,tree));
  if (!membership.has(person)) return rows;
  const recorded = novel.familyRelationships.filter(edge => hasPair(membership,edge));
  const codex=codexIndex(novel);
  if(!codex.has(person))return rows;
  const visible=new Set(codex.keys());
  const edges=recorded.filter(e=>(e.from===person||e.to===person)&&visible.has(e.from)&&visible.has(e.to));
  const reasons=inferredRelationships(recorded,codex,visible,edges,person);
  for(const edge of [...edges,...reasons.keys()]){
    const target=codex.get(edge.from===person?edge.to:edge.from)!;
    rows.push({target,label:relationshipCaption(edge,person),reason:reasons.get(edge)});
  }
  return rows;
}

function inferredRelationships(recorded:FamilyRelationship[],codex:Map<string,NoteNode>,visible:Set<string>,edges:FamilyRelationship[],focus?:string) {
  const reasons=new Map<FamilyRelationship,string>();
  if(visible.size<2)return reasons;
  const roles=new Map<string,FamilyRole>();
  const parents=new Map<string,Set<string>>();
  const childrenInView=new Map<string,Set<string>>();
  for(const edge of recorded){
    const link=directParentage(edge);
    if(!link || !codex.has(link.from) || !codex.has(link.to))continue;
    addToIndex(parents,link.to,link.from);
    if(visible.has(link.to))addToIndex(childrenInView,link.from,link.to);
    recordRole(roles,edge);
  }

  const explicitSiblings=new Set<string>(),explicitGrandparents=new Set<string>();
  for(const edge of edges){
    if(isSiblingRole(edge.kind))explicitSiblings.add(siblingPair(edge.from,edge.to));
    if(kinshipFamily(edge.kind)==='grandparent'){
      const {from,to}=relationshipDirection(edge);
      explicitGrandparents.add(JSON.stringify([from,to]));
    }
  }

  const names=(ids:Set<string>)=>[...ids].map(id=>codex.get(id)!.title||'Untitled note').join(', ');
  for(const child of parents.keys()){
    if(!visible.has(child))continue;
    const viaBySibling=new Map<string,Set<string>>();
    const viaByGrandparent=new Map<string,Set<string>>();
    for(const parent of parents.get(child)??[]){
      if(!focus||child===focus)for(const sibling of childrenInView.get(parent)??[]){
        if((focus?child!==sibling:child<sibling) && !explicitSiblings.has(siblingPair(child,sibling)))addToIndex(viaBySibling,sibling,parent);
      }
      const grandparents=parents.get(parent);
      const candidates=focus && child!==focus ? (grandparents?.has(focus)?[focus]:[]) : grandparents??[];
      for(const grandparent of candidates){
        if(visible.has(grandparent) && !explicitGrandparents.has(JSON.stringify([grandparent,child])))
          addToIndex(viaByGrandparent,grandparent,parent);
      }
    }
    for(const [sibling,via] of viaBySibling){
      const childRole=roles.get(child);
      const [from,to]=childRole==='male' || childRole==='female'?[child,sibling]:[sibling,child];
      const role=roles.get(from);
      const edge:FamilyRelationship={from,to,kind:role==='male'?'brother':role==='female'?'sister':'sibling'};
      reasons.set(edge,(via.size===1?'Shared parent':'Shared parents')+' · '+names(via));
    }
    for(const [grandparent,via] of viaByGrandparent){
      const elder=roles.get(grandparent),younger=roles.get(child);
      let edge:FamilyRelationship={from:grandparent,to:child,kind:'grandparent'};
      if(elder==='male'||elder==='female')edge.kind=elder==='male'?'grandfather':'grandmother';
      else if(younger==='male'||younger==='female')edge={from:child,to:grandparent,kind:younger==='male'?'grandson':'granddaughter'};
      reasons.set(edge,'Through · '+names(via));
    }
  }
  return reasons;
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
  const parents=new Map<string,Set<string>>();
  const partners=new Map<string,Set<string>>();
  const children=new Map<string,Set<string>>();
  const directions=edges.map(relationshipDirection);
  for(const edge of edges){
    const parent=directParentage(edge);
    if(parent){addToIndex(parents,parent.to,parent.from);addToIndex(children,parent.from,parent.to);}
  }
  for(const edge of directions.filter(e=>e.line==='couple')){
    addToIndex(partners,edge.from,edge.to);addToIndex(partners,edge.to,edge.from);
  }
  for(const edge of directions.filter(e=>e.peer)){
    for(const [id,mate] of [[edge.from,edge.to],[edge.to,edge.from]]){
      if(!peers.has(id))peers.set(id,[]);
      peers.get(id)!.push(mate);
    }
  }
  // Co-parents can occupy the same generation without a recorded partnership.
  for(const family of parents.values()){
    const [first,...rest]=family;
    for(const other of rest){
      peers.set(first,[...(peers.get(first)??[]),other]);
      peers.set(other,[...(peers.get(other)??[]),first]);
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
  const blocksByLevel:string[][][]=[];
  for(const [level,rank] of levels.entries()){
    const row=rows.get(rank)!;
    // Keep couples together and put each branch beneath its parents, even
    // when the user added people from different families in alternating order.
    const blocks:string[][]=[],assigned=new Set<string>();
    for(const id of row){
      if(assigned.has(id))continue;
      const block=[id,...[...(partners.get(id)??[])].filter(mate=>row.includes(mate)&&!assigned.has(mate))];
      block.forEach(member=>assigned.add(member));
      blocks.push(block);
    }
    const anchor=(block:string[])=>{
      const xs=block.flatMap(id=>[...(parents.get(id)??[])].flatMap(parent=>positions.has(parent)?[positions.get(parent)!.x]:[]));
      return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:Infinity;
    };
    for(const block of blocks)block.sort((a,b)=>anchor([a])-anchor([b]));
    blocks.sort((a,b)=>anchor(a)-anchor(b));
    blocksByLevel.push(blocks);
    const left=(width-(row.length*stepX-40))/2;
    blocks.flat().forEach((id,i)=>positions.set(id,{x:left+i*stepX,y:30+level*stepY}));
  }
  // Center each parental household over its children while reserving room
  // for the other households in the same generation.
  for(const blocks of blocksByLevel.reverse()){
    let remaining=blocks.reduce((sum,block)=>sum+block.length*stepX,0);
    let minLeft=32;
    for(const block of blocks){
      const xs=block.flatMap(id=>[...(children.get(id)??[])].map(child=>positions.get(child)!.x));
      const span=(block.length-1)*stepX;
      const desired=xs.length?(Math.min(...xs)+Math.max(...xs)-span)/2:positions.get(block[0])!.x;
      const left=Math.max(minLeft,Math.min(width+8-remaining,desired));
      block.forEach((id,i)=>positions.get(id)!.x=left+i*stepX);
      remaining-=block.length*stepX;
      minLeft=left+block.length*stepX;
    }
  }
  return {width,height,positions};
}
