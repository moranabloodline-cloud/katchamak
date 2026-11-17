export const DETAIL_BLOCKS=[{key:'image',label:'Image'},{key:'aliases',label:'Aliases'},{key:'codex',label:'Codex'}] as const;
export type DetailBlockKey=typeof DETAIL_BLOCKS[number]['key'];

export function validHiddenDetailBlocks(value:unknown):value is DetailBlockKey[]|undefined {
  return value===undefined||Array.isArray(value)&&value.length<=DETAIL_BLOCKS.length&&new Set(value).size===value.length&&value.every(key=>DETAIL_BLOCKS.some(block=>block.key===key));
}

export function validDetailBlockOrder(value:unknown):value is DetailBlockKey[]|undefined {
  return value===undefined||validHiddenDetailBlocks(value)&&value.length===DETAIL_BLOCKS.length;
}
export function detailBlockOrder(order?:DetailBlockKey[]):DetailBlockKey[]{
  return order??DETAIL_BLOCKS.map(block=>block.key);
}
export function moveDetailBlock(order:DetailBlockKey[],from:DetailBlockKey,to:DetailBlockKey){
  const next=[...order],start=next.indexOf(from),end=next.indexOf(to);
  if(start<0||end<0||start===end)return order;
  next.splice(start,1);next.splice(end,0,from);return next;
}
