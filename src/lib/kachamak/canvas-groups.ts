import type {HomeBlock,Homepage} from './homepage';

export type CardGroupChange={type:'cardGroup';ids:string[];groupId:string|null};

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
