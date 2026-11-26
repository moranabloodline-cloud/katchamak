import {validAtlas,type MapAtlas} from './canvas-map';
import type {HomeBlock, Homepage} from './homepage';

export type Point = {x:number; y:number};
export type CanvasExtent = {w:number; h:number};
export type Stroke = [number, number][];
export const CANVAS_TOOLS = ['note','link','todo','line','column','heading','image','video','map','audio','color','table','comment','sketch','draw'] as const;
export type CanvasTool = typeof CANVAS_TOOLS[number];
export type CanvasFields = {
  positionLocked?:boolean; stack?:number; groupId?:string;
  at?: Point; columnId?: string; edge?: {from:string; to:string};
  color?: string; tasks?: {text:string; done:boolean}[]; cells?: string[][];
  mapId?:string; atlas?:MapAtlas; audio?:string; pin?:Point; ink?:Stroke[]; extent?:CanvasExtent;
};
export const isPoint=(p:Point|undefined):p is Point=>!!p && Number.isFinite(p.x) && Number.isFinite(p.y);
export const isInk=(ink:Stroke[]|undefined)=>Array.isArray(ink) && ink.length>0 && ink.every(stroke=>
  Array.isArray(stroke) && stroke.length>0 && stroke.every(p=>Array.isArray(p) && p.length===2 && p.every(Number.isFinite)));
export function validCanvasExtent(value:CanvasExtent|undefined):value is CanvasExtent {
  return !!value && Number.isFinite(value.w) && value.w>0 && Number.isFinite(value.h) && value.h>0;
}
export function validCanvasFields(b:HomeBlock) {
  if (b.groupId!==undefined && (typeof b.groupId!=='string'||!b.groupId.trim()||b.groupId.length>128||
      b.layout==='row'||b.layout==='line'||b.layout==='column'))return false;
  if (b.positionLocked!==undefined && typeof b.positionLocked!=='boolean' || b.stack!==undefined && !Number.isSafeInteger(b.stack))return false;
  if (b.at!==undefined && !isPoint(b.at) || b.columnId!==undefined && typeof b.columnId!=='string' ||
      b.color!==undefined && !/^#[0-9a-f]{6}$/i.test(b.color)) return false;
  if (b.extent!==undefined && !validCanvasExtent(b.extent)) return false;
  switch(b.layout){
    case 'todo': return Array.isArray(b.tasks) && b.tasks.every(t=>t && typeof t.text==='string' && typeof t.done==='boolean');
    case 'table': return Array.isArray(b.cells) && b.cells.length>0 && b.cells.every(row=>Array.isArray(row) && row.length>0 && row.length===b.cells![0].length && row.every(v=>typeof v==='string'));
    case 'sketch': case 'draw': return isInk(b.ink);
    case 'line': return !!b.edge && typeof b.edge.from==='string' && typeof b.edge.to==='string' && b.edge.from!==b.edge.to;
    case 'map': if(b.mapId!==undefined)return typeof b.mapId==='string'&&!!b.mapId&&!b.image&&!b.atlas&&!b.pin;
      return !!b.image && (b.atlas===undefined||validAtlas(b.atlas)) && (!b.pin || isPoint(b.pin) && [b.pin.x,b.pin.y].every(v=>v>=0&&v<=1));
    case 'color': return !!b.color;
    case 'link': return !!b.target;
    default: return true;
  }
}
export function validBoard(page:Homepage, rowCards?:ReadonlySet<string>):boolean {
  if(page.mode==='canvas'){
    const fixed=page.blocks.filter(b=>b.layout==='row'||b.cell);
    const rowCards=new Set(fixed.filter(b=>b.cell).map(b=>b.id));
    return validBoard({...page,mode:'page',blocks:fixed}) && validBoard({...page,mode:'board',blocks:page.blocks.filter(b=>b.layout!=='row'&&!b.cell)},rowCards);
  }
  if(page.mode!==undefined && page.mode!=='board' && page.mode!=='page')return false;
  if(page.mode!=='board')return page.blocks.every(b=>(!b.at || b.layout==='row' && isPoint(b.at)) && !b.columnId && b.layout!=='column' && b.layout!=='line');
  const byId=new Map(page.blocks.map(b=>[b.id,b]));
  return page.blocks.every(b=>{
    if(b.cell || b.layout==='row')return false;
    if(b.layout==='line')return !b.columnId && [b.edge!.from,b.edge!.to].every(id=>rowCards?.has(id) || byId.has(id)&&byId.get(id)!.layout!=='line');
    return isPoint(b.at) && (b.columnId===undefined || b.layout!=='column' && byId.get(b.columnId)?.layout==='column');
  });
}
export const CARD_WIDTH=236, COLUMN_WIDTH=276, COLUMN_HEAD=56, COLUMN_GAP=12;
export type BoardRect=Point & CanvasExtent;

export function canResizeCanvasBlock(block:HomeBlock,blocks:ReadonlyMap<string,HomeBlock>):boolean {
  if(block.layout==='line'||block.positionLocked)return false;
  const parentId=block.columnId??block.cell?.rowId;
  const parent=parentId?blocks.get(parentId):undefined;
  return !parentId || !!parent && !parent.positionLocked;
}

function cardHeight(block:HomeBlock,heights:ReadonlyMap<string,number>){
  return block.extent?.h??heights.get(block.id)??98;
}

export function boardRects(blocks:HomeBlock[], heights:ReadonlyMap<string,number>) {
  const rects=new Map<string,BoardRect>();
  const children=new Map<string,HomeBlock[]>();
  for(const b of blocks){
    if(b.columnId){const list=children.get(b.columnId)??[];list.push(b);children.set(b.columnId,list);}
    else if(b.at && b.layout!=='line')rects.set(b.id,{...b.at,w:b.extent?.w??CARD_WIDTH,h:cardHeight(b,heights)});
  }
  for(const col of blocks){
    if(col.layout!=='column')continue;
    const rect=rects.get(col.id)!;
    const cards=children.get(col.id)??[];
    const minHeight=Math.max(150,cards.reduce((h,child)=>h+cardHeight(child,heights)+COLUMN_GAP,COLUMN_HEAD+28));
    rect.w=col.extent?.w??COLUMN_WIDTH;
    rect.h=Math.max(minHeight,col.extent?.h??0);
    const innerWidth=Math.max(1,rect.w-28);
    const gap=COLUMN_GAP+(cards.length>1?(rect.h-minHeight)/(cards.length-1):0);
    let offset=COLUMN_HEAD;
    for(const child of cards){
      const h=cardHeight(child,heights);
      rects.set(child.id,{x:rect.x+14,y:rect.y+offset,w:Math.min(innerWidth,child.extent?.w??innerWidth),h});
      offset+=h+gap;
    }
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
