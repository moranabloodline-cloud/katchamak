export const DETAIL_BLOCKS=[{key:'image',label:'Image'},{key:'aliases',label:'Aliases'},{key:'codex',label:'Codex'}] as const;
export type DetailBlockKey=typeof DETAIL_BLOCKS[number]['key'];

export function validHiddenDetailBlocks(value:unknown):value is DetailBlockKey[]|undefined {
  return value===undefined||Array.isArray(value)&&value.length<=DETAIL_BLOCKS.length&&new Set(value).size===value.length&&value.every(key=>DETAIL_BLOCKS.some(block=>block.key===key));
}
