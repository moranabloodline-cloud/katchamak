import type {HomeBlock,HomeCell,Homepage} from './homepage';
import {boardRects,CARD_WIDTH,COLUMN_WIDTH,isPoint,type Point} from './canvas-board';

export const inFixedRow=(b:HomeBlock)=>b.layout==='row'||!!b.cell;

// A connection stays with the canvas while either endpoint is in a fixed row.
export function canvasParts(blocks:HomeBlock[]) {
  const fixed=blocks.filter(inFixedRow);
  const fixedIds=new Set(fixed.map(b=>b.id));
  const free:HomeBlock[]=[], parked:HomeBlock[]=[];
  for(const block of blocks){
    if(fixedIds.has(block.id))continue;
    if(block.edge && (fixedIds.has(block.edge.from)||fixedIds.has(block.edge.to)))parked.push(block);
    else free.push(block);
  }
  return {fixed,free,parked};
}

export type CanvasTransfer =
  | {type:'dockCards'; ids:string[]; cell:HomeCell; heights?:[string,number][]}
  | {type:'releaseCards'; ids:string[]; cell:HomeCell; at:Point};

export function transferCanvasCards(page:Homepage, action:CanvasTransfer):Homepage|null {
  const ids=new Set(action.ids);
  const cards=page.blocks.filter(b=>ids.has(b.id));
  if(!ids.size||ids.size!==action.ids.length||cards.length!==ids.size)return null;
  if(cards.some(b=>b.positionLocked||b.layout==='line'||b.layout==='row'||b.layout==='column'))return null;
  const rest=page.blocks.filter(b=>!ids.has(b.id));
  if(action.type==='releaseCards'){
    if(!isPoint(action.at)||cards.some(b=>b.cell?.rowId!==action.cell.rowId||b.cell.column!==action.cell.column))return null;
    // The stored order of siblings is also the order displayed in this column.
    let x=action.at.x;
    const released=cards.map(b=>{
      const at={x,y:action.at.y};
      x+=(b.extent?.w??CARD_WIDTH)+24;
      return {...b,cell:undefined,at};
    });
    return {...page,blocks:[...rest,...released]};
  }
  const lockedColumns=new Set(page.blocks.filter(b=>b.layout==='column'&&b.positionLocked).map(b=>b.id));
  if(cards.some(b=>b.cell||!b.at||(b.columnId&&lockedColumns.has(b.columnId))))return null;
  if(cards.length>1){
    const rects=boardRects(canvasParts(page.blocks).free,new Map(action.heights));
    cards.sort((a,b)=>rects.get(a.id)!.y-rects.get(b.id)!.y);
    // Treat slightly staggered tops as one visual row, independent of click or creation order.
    for(let first=0;first<cards.length;){
      const top=rects.get(cards[first].id)!.y;
      let end=first+1;
      while(end<cards.length&&rects.get(cards[end].id)!.y<=top+16)end++;
      const band=cards.slice(first,end).sort((a,b)=>rects.get(a.id)!.x-rects.get(b.id)!.x);
      for(let j=0;j<band.length;j++)cards[first+j]=band[j];
      first=end;
    }
  }
  const docked=cards.map(b=>({...b,at:undefined,columnId:undefined,cell:action.cell}));
  return {...page,blocks:[...rest,...docked]};
}

// Read old books and imports without rewriting them when the user simply opens a Canvas.
export function unifiedCanvas<T extends Homepage>(page:T):T {
  if(page.mode==='canvas')return page;
  if(page.mode==='board')return {...page,mode:'canvas'};
  const blocks:HomeBlock[]=[],ids=new Set(page.blocks.map(b=>b.id));
  let row:HomeBlock|undefined,used=0;
  for(const b of page.blocks){
    if(b.cell){blocks.push(b);continue;}
    if(b.layout==='row'){blocks.push(b);row=undefined;continue;}
    // Preserve the desktop width of old Homepage cards, banners and wide text blocks.
    const columns=b.width==='full'?1:b.width==='wide'?2:4;
    if(!row || row.columns!==columns || used===columns){
      let id='row-'+b.id;
      while(ids.has(id))id+='-';
      ids.add(id);row={id,layout:'row',columns,width:'full',title:'',text:''};blocks.push(row);used=0;
    }
    blocks.push({...b,cell:{rowId:row.id,column:used++}});
  }
  return {...page,mode:'canvas',blocks};
}

export function releaseRow(page:Homepage,row:HomeBlock):Homepage {
  const fixed=page.blocks.filter(inFixedRow),free=page.blocks.filter(b=>!inFixedRow(b));
  const rects=boardRects(free,new Map());
  let x=24;
  for(const rect of rects.values())x=Math.max(x,rect.x+rect.w+24);
  const children=fixed.filter(b=>b.cell?.rowId===row.id).sort((a,b)=>a.cell!.column-b.cell!.column);
  const released=children.map((b,i)=>({...b,cell:undefined,at:{x:x+i*(COLUMN_WIDTH+24),y:28}}));
  return {...page,blocks:[...fixed.filter(b=>b.id!==row.id&&b.cell?.rowId!==row.id),...free,...released]};
}
