import type {HomeBlock,Homepage} from './homepage';

export type CardGroupChange={type:'cardGroup';ids:string[];groupId:string|null};

export type DuplicateGroupChange={type:'duplicateGroup';groupId:string;copyId:string};

export function duplicateCardGroup(page:Homepage,{groupId,copyId}:DuplicateGroupChange):Homepage|null{
  if(page.locked||!groupId||!copyId?.trim()||copyId.length>128)return null;
  const cards=page.blocks.filter(b=>b.groupId===groupId);
  const first=cards[0];
  if(cards.length<2||cards.some(b=>b.cell?.rowId!==first.cell?.rowId||b.cell?.column!==first.cell?.column||b.columnId!==first.columnId))return null;
  const ids=new Map(cards.map((b,i)=>[b.id,copyId+'-card-'+i]));
  const internal=page.blocks.filter(b=>b.edge&&ids.has(b.edge.from)&&ids.has(b.edge.to));
  const existing=new Set(page.blocks.map(b=>b.id));
  if(page.blocks.some(b=>b.groupId===copyId)||[...ids.values()].some(id=>existing.has(id)))return null;
  const lines=internal.map((line,i)=>({...line,id:copyId+'-line-'+i,edge:{from:ids.get(line.edge!.from)!,to:ids.get(line.edge!.to)!}}));
  if(lines.some(b=>existing.has(b.id)))return null;

  let offset=32;
  if(first.at&&!first.columnId){
    const occupied=new Set(page.blocks.filter(b=>b.at&&!b.columnId).map(b=>b.at!.x+','+b.at!.y));
    while(occupied.has((first.at.x+offset)+','+(first.at.y+offset)))offset+=32;
  }
  const copies=cards.map(card=>{
    const copy=structuredClone(card);
    copy.id=ids.get(card.id)!;
    copy.groupId=copyId;
    delete copy.positionLocked;
    if(copy.at&&!copy.columnId)copy.at={x:copy.at.x+offset,y:copy.at.y+offset};
    return copy;
  });
  const blocks=[...page.blocks];
  const insert=first.cell||first.columnId?page.blocks.indexOf(cards[cards.length-1])+1:blocks.length;
  blocks.splice(insert,0,...copies);
  return {...page,blocks:[...blocks,...lines]};
}

export function expandCardGroups(blocks:HomeBlock[],ids:ReadonlySet<string>):Set<string>{
  const result=new Set(ids);
  const groups=new Set<string>();
  for(const block of blocks)if(block.groupId&&ids.has(block.id))groups.add(block.groupId);
  if(groups.size)for(const block of blocks)if(block.groupId&&groups.has(block.groupId))result.add(block.id);
  return result;
}

export function canGroupCards(cards:HomeBlock[]){
  const first=cards[0];
  return cards.length>=2&&cards.every(b=>b.layout!=='line'&&b.layout!=='row'&&b.layout!=='column'&&
    b.columnId===first.columnId&&b.cell?.rowId===first.cell?.rowId&&b.cell?.column===first.cell?.column)&&
    (!first.groupId||cards.some(b=>b.groupId!==first.groupId));
}

export function changeCardGroup(page:Homepage,{ids,groupId}:CardGroupChange):Homepage|null{
  if(page.locked||!ids.length)return null;
  const members=expandCardGroups(page.blocks,new Set(ids));
  const cards=page.blocks.filter(b=>members.has(b.id));
  if(cards.length!==members.size)return null;
  if(groupId===null){
    if(!cards.some(b=>b.groupId))return null;
  }else if(typeof groupId!=='string'||!groupId.trim()||groupId.length>128||!canGroupCards(cards)||
    page.blocks.some(b=>b.groupId===groupId))return null;
  return {...page,blocks:page.blocks.map(b=>members.has(b.id)?{...b,groupId:groupId??undefined}:b)};
}

export function clearSingletonGroups(page:Homepage):Homepage{
  const seen=new Set<string>(),paired=new Set<string>();
  for(const {groupId} of page.blocks)if(groupId){
    if(seen.has(groupId))paired.add(groupId);
    seen.add(groupId);
  }
  if(paired.size===seen.size)return page;
  return {...page,blocks:page.blocks.map(b=>b.groupId&&!paired.has(b.groupId)?{...b,groupId:undefined}:b)};
}
