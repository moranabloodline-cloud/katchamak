import type {HomeBlock, Homepage} from './homepage';

export type Point = {x:number; y:number};
export type Stroke = [number, number][];
export const CANVAS_TOOLS = ['note','link','todo','line','column','heading','image','video','map','audio','color','table','comment','sketch','draw'] as const;
export type CanvasTool = typeof CANVAS_TOOLS[number];
export type CanvasFields = {
  positionLocked?:boolean; stack?:number;
  at?: Point; columnId?: string; edge?: {from:string; to:string};
  color?: string; tasks?: {text:string; done:boolean}[]; cells?: string[][];
  audio?:string; pin?:Point; ink?:Stroke[]; extent?:{w:number;h:number};
};
export const isPoint=(p:Point|undefined):p is Point=>!!p && Number.isFinite(p.x) && Number.isFinite(p.y);
export const isInk=(ink:Stroke[]|undefined)=>Array.isArray(ink) && ink.length>0 && ink.every(stroke=>
  Array.isArray(stroke) && stroke.length>0 && stroke.every(p=>Array.isArray(p) && p.length===2 && p.every(Number.isFinite)));
export function validCanvasFields(b:HomeBlock) {
  if (b.positionLocked!==undefined && typeof b.positionLocked!=='boolean' || b.stack!==undefined && !Number.isSafeInteger(b.stack))return false;
  if (b.at!==undefined && !isPoint(b.at) || b.columnId!==undefined && typeof b.columnId!=='string' ||
      b.color!==undefined && !/^#[0-9a-f]{6}$/i.test(b.color)) return false;
  if (b.extent!==undefined && (!b.extent || ![b.extent.w,b.extent.h].every(n=>Number.isFinite(n)&&n>0))) return false;
  switch(b.layout){
    case 'todo': return Array.isArray(b.tasks) && b.tasks.every(t=>t && typeof t.text==='string' && typeof t.done==='boolean');
    case 'table': return Array.isArray(b.cells) && b.cells.length>0 && b.cells.every(row=>Array.isArray(row) && row.length>0 && row.length===b.cells![0].length && row.every(v=>typeof v==='string'));
    case 'sketch': case 'draw': return isInk(b.ink);
    case 'line': return !!b.edge && typeof b.edge.from==='string' && typeof b.edge.to==='string' && b.edge.from!==b.edge.to;
    case 'map': return !!b.image && (!b.pin || isPoint(b.pin) && [b.pin.x,b.pin.y].every(v=>v>=0&&v<=1));
    case 'color': return !!b.color;
    case 'link': return !!b.target;
    default: return true;
  }
}
export function validBoard(page:Homepage) {
  if(page.mode!==undefined && page.mode!=='board' && page.mode!=='page')return false;
  if(page.mode!=='board')return page.blocks.every(b=>!b.at && !b.columnId && b.layout!=='column' && b.layout!=='line');
  const byId=new Map(page.blocks.map(b=>[b.id,b]));
  return page.blocks.every(b=>{
    if(b.cell || !CANVAS_TOOLS.includes(b.layout as CanvasTool))return false;
    if(b.layout==='line')return !b.columnId && [b.edge!.from,b.edge!.to].every(id=>byId.has(id)&&byId.get(id)!.layout!=='line');
    return isPoint(b.at) && (b.columnId===undefined || b.layout!=='column' && byId.get(b.columnId)?.layout==='column');
  });
}
export const CARD_WIDTH=236, COLUMN_WIDTH=276, COLUMN_HEAD=56, COLUMN_GAP=12;
export type BoardRect=Point & {w:number;h:number};
export function boardRects(blocks:HomeBlock[], heights:ReadonlyMap<string,number>) {
  const rects=new Map<string,BoardRect>();
  const children=new Map<string,HomeBlock[]>();
  for(const b of blocks){
    if(b.columnId){const list=children.get(b.columnId)??[];list.push(b);children.set(b.columnId,list);}
    else if(b.at && b.layout!=='line')rects.set(b.id,{...b.at,w:b.extent?.w??CARD_WIDTH,h:heights.get(b.id)??b.extent?.h??98});
  }
  for(const col of blocks.filter(b=>b.layout==='column')){
    const rect=rects.get(col.id)!;
    let offset=COLUMN_HEAD;
    for(const child of children.get(col.id)??[]){
      const h=heights.get(child.id)??98;
      rects.set(child.id,{x:rect.x+14,y:rect.y+offset,w:COLUMN_WIDTH-28,h});
      offset+=h+COLUMN_GAP;
    }
    rect.w=COLUMN_WIDTH;rect.h=Math.max(150,offset+28);
  }
  return rects;
}
export type BoardMove = {type:'boardMove';id:string;at:Point;columnId?:string;before?:string};
export function moveOnBoard(page:Homepage, action:BoardMove):Homepage|null {
  const b=page.blocks.find(item=>item.id===action.id);
  if(!b || b.positionLocked || page.blocks.some(col=>col.positionLocked && (col.id===b.columnId || col.id===action.columnId)) ||
     b.layout==='line' || !isPoint(action.at) || action.columnId &&
     (b.layout==='column' || !page.blocks.some(item=>item.id===action.columnId && item.layout==='column')))return null;
  const blocks=page.blocks.filter(item=>item.id!==b.id);
  const before=action.before?blocks.findIndex(item=>item.id===action.before && item.columnId===action.columnId):-1;
  blocks.splice(before<0?blocks.length:before,0,{...b,at:action.at,columnId:action.columnId});
  return {...page,blocks};
}
