import type {HomeBlock,Homepage} from './homepage';
import {boardRects,COLUMN_WIDTH} from './canvas-board';

export const inFixedRow=(b:HomeBlock)=>b.layout==='row'||!!b.cell;

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
