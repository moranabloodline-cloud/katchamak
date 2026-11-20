import { SECTION_KEYS, type SectionKey } from './types';
import { validCoverImage } from './project-settings';

export const HOME_LAYOUTS = ['card','banner','image','text','row','heading','callout','links','divider','video'] as const;
export type HomeLayout = typeof HOME_LAYOUTS[number];
export type HomeCell = {rowId:string; column:number};
export type HomeLink = {id:string; label:string; target:HomeTarget};
export type HomeTarget =
  | { kind: 'note'; id: string }
  | { kind: 'tab'; tab: SectionKey }
  | { kind: 'web'; url: string };

export interface HomeBlock {
  id: string;
  layout: HomeLayout;
  width: 'standard' | 'wide' | 'full';
  title: string;
  text: string;
  image?: string;
  target?: HomeTarget;
  cell?: HomeCell;
  columns?: number;
  links?: HomeLink[];
  videoUrl?: string;
}
export interface Homepage { locked: boolean; blocks: HomeBlock[]; width?: 'wide'|'reading' }
export const EMPTY_HOMEPAGE: Homepage = { locked: false, blocks: [] };

export function isWebsite(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); }
  catch { return false; }
}

export function youtubeVideoId(value:unknown):string|null {
  if (!isWebsite(value)) return null;
  const url=new URL(value);
  const host=url.hostname.toLowerCase().replace(/^www[.]/,'');
  const path=url.pathname.split('/').filter(Boolean);
  let id:string|null=null;
  if(host==='youtu.be')id=path[0];
  else if(['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host)){
    if(path[0]==='watch')id=url.searchParams.get('v');
    else if(['embed','shorts','live'].includes(path[0]))id=path[1];
  }
  return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
}

export function sameCell(a?:HomeCell,b?:HomeCell) {
  return a?.rowId===b?.rowId && a?.column===b?.column;
}
function columnExists(column:number,count?:number) {
  return count!==undefined && Number.isInteger(column) && column>=0 && column<count;
}
function validCell(blocks:HomeBlock[],cell:HomeCell) {
  return columnExists(cell.column,blocks.find(b=>b.id===cell.rowId && b.layout==='row')?.columns);
}

function validTarget(value: HomeTarget | undefined) {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object') return false;
  switch (value.kind) {
    case 'note': return typeof value.id === 'string' && !!value.id;
    case 'tab': return SECTION_KEYS.includes(value.tab);
    case 'web': return isWebsite(value.url);
    default: return false;
  }
}
function validBlock(block: HomeBlock) {
  return !!block && typeof block.id === 'string' && !!block.id &&
    HOME_LAYOUTS.includes(block.layout) && ['standard','wide','full'].includes(block.width) &&
    typeof block.title === 'string' && typeof block.text === 'string' &&
    validCoverImage(block.image) && validTarget(block.target) &&
    (block.cell===undefined || (!!block.cell && typeof block.cell.rowId==='string' && Number.isInteger(block.cell.column))) &&
    (block.layout!=='row' || (!block.cell && Number.isInteger(block.columns) && block.columns!>=1 && block.columns!<=6)) &&
    (block.layout!=='video' || !!youtubeVideoId(block.videoUrl)) &&
    (block.links===undefined || (Array.isArray(block.links) && block.links.every(l=>l && typeof l.id==='string' && !!l.id && typeof l.label==='string' && !!l.target && validTarget(l.target)) && new Set(block.links.map(l=>l.id)).size===block.links.length));
}
export function validHomepage(value: unknown): boolean {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object') return false;
  const page = value as Homepage;
  if(typeof page.locked!=='boolean' || !Array.isArray(page.blocks) || !page.blocks.every(validBlock))return false;
  const rows=new Map(page.blocks.filter(b=>b.layout==='row').map(b=>[b.id,b.columns]));
  return (page.width===undefined || page.width==='wide' || page.width==='reading')
    && new Set(page.blocks.map(b=>b.id)).size===page.blocks.length
    && page.blocks.every(b=>!b.cell || columnExists(b.cell.column,rows.get(b.cell.rowId)));
}

export type HomePlacement = { targetId: string; side: 'before' | 'after' };

export type HomeChange =
  | { type: 'lock'; locked: boolean }
  | { type:'width'; width:'reading'|'wide' }
  | { type:'into'; id:string; cell:HomeCell }
  | { type: 'add'; block: HomeBlock }
  | { type: 'edit'; original: HomeBlock; block: HomeBlock }
  | { type: 'remove'; original: HomeBlock }
  | { type: 'move'; id: string; offset: -1 | 1 }
  | ({ type: 'place'; id: string } & HomePlacement);

export function changeHomepage(page: Homepage, action: HomeChange): Homepage | null {
  if (action.type === 'lock') return { ...page, locked: action.locked };
  if (page.locked) return null;
  if (action.type === 'width') return {...page,width:action.width};
  if (action.type === 'add') {
    if (!validBlock(action.block) || (action.block.cell && !validCell(page.blocks,action.block.cell)) || page.blocks.some(b => b.id === action.block.id)) return null;
    return { ...page, blocks: [...page.blocks, action.block] };
  }
  const id = 'original' in action ? action.original.id : action.id;
  const index = page.blocks.findIndex(b => b.id === id);
  if (index < 0) return null;
  const blocks = [...page.blocks];
  const current=blocks[index];
  if (action.type==='move' || action.type==='place' || action.type==='into') {
    blocks.splice(index,1);
    let cell=current.cell;
    let to:number;
    if(action.type==='into'){
      if(!validCell(blocks,action.cell) || current.layout==='row')return null;
      cell=action.cell;
      to=blocks.length;
    } else if(action.type==='place'){
      const anchor=blocks.findIndex(b=>b.id===action.targetId);
      if(anchor<0 || (current.layout==='row' && blocks[anchor].cell))return null;
      cell=blocks[anchor].cell;
      to=anchor+(action.side==='after'?1:0);
    } else {
      const peers=page.blocks.filter(b=>sameCell(b.cell,cell));
      const adjacent=peers[peers.indexOf(current)+action.offset];
      if(!adjacent)return null;
      to=blocks.indexOf(adjacent)+(action.offset>0?1:0);
    }
    if(to===index && sameCell(cell,current.cell))return null;
    blocks.splice(to,0,sameCell(cell,current.cell)?current:{...current,cell});
  } else {
    if (JSON.stringify(current)!==JSON.stringify(action.original))return null;
    if(action.type==='remove'){
      blocks.splice(index,1);
      if(current.layout==='row'){
        // Unwrap the row in reading order so removing the layout preserves its content.
        const children=blocks.filter(b=>b.cell?.rowId===current.id).sort((a,b)=>a.cell!.column-b.cell!.column);
        const roots=blocks.filter(b=>b.cell?.rowId!==current.id);
        const insertAt=blocks.slice(0,index).filter(b=>b.cell?.rowId!==current.id).length;
        roots.splice(insertAt,0,...children.map(b=>({...b,cell:undefined})));
        return {...page,blocks:roots};
      }
    } else {
      const next=action.block;
      if(next.id!==current.id || !validBlock(next) || !sameCell(current.cell,next.cell) || (current.layout==='row')!==(next.layout==='row'))return null;
      blocks[index]=next;
      if(next.layout==='row' && next.columns! < current.columns!){
        const displaced=(b:HomeBlock)=>b.cell?.rowId===current.id && b.cell.column>=next.columns!;
        const children=blocks.filter(displaced).sort((a,b)=>a.cell!.column-b.cell!.column);
        const kept=blocks.filter(b=>!displaced(b));
        return {...page,blocks:[...kept,...children.map(b=>({...b,cell:{rowId:next.id,column:next.columns!-1}}))]};
      }
    }
  }
  return { ...page, blocks };
}
