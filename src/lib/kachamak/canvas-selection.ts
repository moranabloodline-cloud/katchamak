import type {HomeBlock, HomePageEntry, Homepage} from './homepage';
import {boardRects, isPoint, type BoardRect, type Point} from './canvas-board';

export type Alignment='left'|'center'|'right'|'top'|'middle'|'bottom';
export type SelectionCommand =
  | {kind:'color'; color:string} | {kind:'lock'; locked:boolean}
  | {kind:'stack'; front:boolean} | {kind:'connect'}
  | {kind:'align'; alignment:Alignment} | {kind:'distribute'; axis:'x'|'y'}
  | {kind:'translate'; delta:Point};
export type BoardSelectionChange={type:'boardSelection'; ids:string[]; command:SelectionCommand; heights?:[string,number][]};

export function frameBetween(a:Point,b:Point):BoardRect {
  return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x),h:Math.abs(a.y-b.y)};
}

export function selectionRoots(blocks:HomeBlock[], ids:ReadonlySet<string>) {
  return blocks.filter(b=>b.layout!=='line' && ids.has(b.id) && !(b.columnId && ids.has(b.columnId)));
}

export function framedItems(blocks:HomeBlock[],rects:ReadonlyMap<string,BoardRect>,frame:BoardRect) {
  const hits=new Set<string>();
  for(const block of blocks){
    const r=rects.get(block.id);
    if(!r)continue;
    // Crossing a column header selects its whole branch. Inside the column, select individual cards.
    const h=block.layout==='column'?Math.min(40,r.h):r.h;
    if(r.x<=frame.x+frame.w && frame.x<=r.x+r.w && r.y<=frame.y+frame.h && frame.y<=r.y+h)hits.add(block.id);
  }
  return selectionRoots(blocks,hits).map(b=>b.id);
}

export function boardLayers(blocks:HomeBlock[]){
  // A column and its contents move through the stack as a unit.
  const roots=blocks.filter(b=>!b.columnId && b.layout!=='line')
    .sort((a,b)=>(a.stack??(a.layout==='column'?0:1))-(b.stack??(b.layout==='column'?0:1)));
  return new Map(roots.map((b,i)=>[b.id,i*2+1]));
}

function ordered(items:HomeBlock[],rects:Map<string,BoardRect>,axis:'x'|'y'){
  const second=axis==='x'?'y':'x';
  return [...items].sort((a,b)=>rects.get(a.id)![axis]-rects.get(b.id)![axis] || rects.get(a.id)![second]-rects.get(b.id)![second]);
}

export function applySelection(page:Homepage,action:BoardSelectionChange):Homepage|null {
  if(page.mode!=='board'||page.locked)return null;
  const ids=new Set(action.ids), byId=new Map(page.blocks.map(b=>[b.id,b]));
  if(!ids.size || action.ids.some(id=>!byId.has(id)||byId.get(id)!.layout==='line'))return null;
  const items=selectionRoots(page.blocks,ids), chosen=new Set(items.map(b=>b.id)), cmd=action.command;
  const patch=(fn:(b:HomeBlock)=>HomeBlock)=>({...page,blocks:page.blocks.map(b=>chosen.has(b.id)?fn(b):b)});
  if(cmd.kind==='color')return /^#[0-9a-f]{6}$/i.test(cmd.color)?patch(b=>({...b,color:cmd.color})):null;
  if(cmd.kind==='lock')return patch(b=>({...b,positionLocked:cmd.locked || undefined}));
  if(cmd.kind==='stack'){
    if(items.some(b=>b.columnId))return null;
    const layers=boardLayers(page.blocks);
    const all=[...layers.keys()], first=all.filter(id=>chosen.has(id)),other=all.filter(id=>!chosen.has(id));
    const next=cmd.front?[...other,...first]:[...first,...other];
    const order=new Map(next.map((id,i)=>[id,i]));
    return {...page,blocks:page.blocks.map(b=>order.has(b.id)?{...b,stack:order.get(b.id)}:b)};
  }
  const rects=boardRects(page.blocks,new Map(action.heights));
  if(cmd.kind==='connect'){
    if(items.length<2)return null;
    const sorted=ordered(items,rects,'x');
    const key=(a:string,b:string)=>JSON.stringify([a,b].sort());
    const existing=new Set(page.blocks.flatMap(b=>b.edge?[key(b.edge.from,b.edge.to)]:[]));
    const lines:HomeBlock[]=[];
    sorted.slice(1).forEach((b,i)=>{
      const from=sorted[i].id;
      if(!existing.has(key(from,b.id)))lines.push({id:crypto.randomUUID(),layout:'line',title:'',text:'',width:'standard',edge:{from,to:b.id}});
    });
    return {...page,blocks:[...page.blocks,...lines]};
  }
  if(items.some(b=>b.positionLocked || b.columnId&&byId.get(b.columnId)?.positionLocked))return null;
  if(cmd.kind==='translate'){
    if(!isPoint(cmd.delta))return null;
    return patch(b=>{const r=rects.get(b.id)!;return {...b,columnId:undefined,at:{x:r.x+cmd.delta.x,y:r.y+cmd.delta.y}};});
  }
  if(items.length<2||items.some(b=>b.columnId))return null;
  const axis=cmd.kind==='align'?(['left','center','right'].includes(cmd.alignment)?'x':'y'):cmd.axis;
  const size=axis==='x'?'w':'h', placements=new Map<string,number>();
  const sorted=ordered(items,rects,axis);
  const start=rects.get(sorted[0].id)![axis];
  const end=items.reduce((max,b)=>{const r=rects.get(b.id)!;return Math.max(max,r[axis]+r[size]);},-Infinity);
  if(cmd.kind==='align'){
    const fraction=({left:0,top:0,center:.5,middle:.5,right:1,bottom:1})[cmd.alignment];
    for(const b of items)placements.set(b.id,start+(end-start-rects.get(b.id)![size])*fraction);
  }else{
    if(items.length<3)return null;
    // Keep the first and last items fixed, even when the items have unequal sizes.
    const last=rects.get(sorted[sorted.length-1].id)!;
    const total=items.reduce((sum,b)=>sum+rects.get(b.id)![size],0);
    const gap=(last[axis]+last[size]-start-total)/(items.length-1);
    let cursor=start;
    for(const b of sorted){placements.set(b.id,cursor);cursor+=rects.get(b.id)![size]+gap;}
  }
  return patch(b=>({...b,at:{...b.at!,[axis]:placements.get(b.id)!}}));
}

export function extractBoard(page:HomePageEntry,ids:string[],name:string,childId:string,linkId:string,heights:[string,number][]){
  if(page.mode!=='board'||page.locked||!name.trim())return null;
  const selected=new Set(ids), roots=selectionRoots(page.blocks,selected), byId=new Map(page.blocks.map(b=>[b.id,b]));
  if(!roots.length||ids.some(id=>!byId.has(id)) || roots.some(b=>b.positionLocked || b.columnId&&byId.get(b.columnId)?.positionLocked))return null;
  const moved=new Set(roots.map(b=>b.id));
  for(const b of page.blocks)if(b.columnId && moved.has(b.columnId))moved.add(b.id);
  const rects=boardRects(page.blocks,new Map(heights));
  const origin=roots.reduce((p,b)=>{const r=rects.get(b.id)!;return {x:Math.min(p.x,r.x),y:Math.min(p.y,r.y)};},{x:Infinity,y:Infinity});
  const portal:HomeBlock={id:linkId,title:name.trim(),layout:'link',width:'standard',text:'',at:origin,target:{kind:'page',id:childId}};
  const sharedColumn=roots[0].columnId;
  if(sharedColumn && roots.every(b=>b.columnId===sharedColumn))portal.columnId=sharedColumn;
  const nested:HomeBlock[]=[], parent:HomeBlock[]=[];
  let placed=false;
  for(const b of page.blocks){
    if(b.edge){
      const from=moved.has(b.edge.from),to=moved.has(b.edge.to);
      if(from&&to)nested.push(b);
      else parent.push(from||to?{...b,edge:{from:from?linkId:b.edge.from,to:to?linkId:b.edge.to}}:b);
    }else if(moved.has(b.id)){
      if(!placed){parent.push(portal);placed=true;}
      const r=rects.get(b.id)!;
      nested.push({...b,columnId:b.columnId&&moved.has(b.columnId)?b.columnId:undefined,at:{x:r.x-origin.x,y:r.y-origin.y}});
    }else parent.push(b);
  }
  const child:HomePageEntry={id:childId,title:name.trim(),parentId:page.id,mode:'board',locked:false,blocks:nested};
  return {child,parent:{...page,blocks:parent}};
}
