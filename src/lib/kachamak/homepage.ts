import { SECTION_KEYS, type SectionKey, type Novel } from './types';
import {validProjectImage, validCoverImage} from './project-image';

import {canvasParts,inFixedRow,releaseRow,transferCanvasCards,unifiedCanvas,type CanvasTransfer} from './canvas-layout';
import {applySelection,type BoardSelectionChange} from './canvas-selection';
import {validCanvasFields,validBoard,moveOnBoard,type CanvasFields,type BoardMove} from './canvas-board';

export const HOME_LAYOUTS = ['card','banner','image','text','row','heading','callout','links','divider','video','note','link','todo','column','line','audio','map','color','table','comment','sketch','draw'] as const;
export type HomeLayout = typeof HOME_LAYOUTS[number];
export type HomeCell = {rowId:string; column:number};
export type HomeLink = {id:string; label:string; target:HomeTarget};
export type HomeTarget =
  | { kind: 'note'; id: string }
  | { kind: 'page'; id: string }
  | { kind: 'tab'; tab: SectionKey }
  | { kind: 'web'; url: string };

export interface HomeImageFrame {
  ratio:number;
  zoom:number;
  x:number;
  y:number;
  fade:boolean;
}

function validFrame(frame:HomeImageFrame|undefined) {
  if(frame===undefined)return true;
  const within=(value:number,min:number,max:number)=>Number.isFinite(value)&&value>=min&&value<=max;
  return !!frame && within(frame.ratio,1/4096,4096) && within(frame.zoom,1,6) &&
    within(frame.x,0,1) && within(frame.y,0,1) && typeof frame.fade==='boolean';
}

export interface HomeBlock extends CanvasFields {
  id: string;
  layout: HomeLayout;
  width: 'standard' | 'wide' | 'full';
  title: string;
  text: string;
  image?: string;
  imageFrame?: HomeImageFrame;
  imageCutout?: string;
  target?: HomeTarget;
  cell?: HomeCell;
  columns?: number;
  links?: HomeLink[];
  videoUrl?: string;
}
export interface Homepage { title?:string; mode?:'page'|'board'|'canvas'; locked: boolean; blocks: HomeBlock[]; width?: 'wide'|'reading' }
export const EMPTY_HOMEPAGE: Homepage = { locked: false, blocks: [] };
export const HOME_ROOT = 'home';
export interface HomePageEntry extends Homepage {
  id: string;
  title: string;
  parentId: string | null;
}

// Keep the original canvas at the same storage location, including for old backups.
export function homepageEntry(novel: Novel, id: string): HomePageEntry | undefined {
  if (id === HOME_ROOT) return {...(novel.homepage ?? EMPTY_HOMEPAGE), id, title:novel.homepage?.title||'Homepage', parentId:null};
  return novel.homePages?.find(page => page.id === id);
}

export function homepageRows(novel: Novel) {
  const children = new Map<string | null, HomePageEntry[]>();
  children.set(null, [homepageEntry(novel, HOME_ROOT)!]);
  for (const page of novel.homePages ?? []) {
    const siblings = children.get(page.parentId) ?? [];
    siblings.push(page);
    children.set(page.parentId, siblings);
  }
  const rows: {id:string; title:string; path:string; depth:number; hasChildren:boolean; mode?:Homepage['mode']}[] = [];
  const pending = children.get(null)!.map(page => ({page, path:page.title, depth:0})).reverse();
  const visited = new Set<string>();
  while (pending.length) {
    const {page, path, depth} = pending.pop()!;
    if (visited.has(page.id)) continue;
    visited.add(page.id);
    const nested = children.get(page.id) ?? [];
    rows.push({id:page.id, title:page.title, path, depth, hasChildren:nested.length > 0, mode:page.mode});
    for (let i = nested.length - 1; i >= 0; i--) {
      const child = nested[i];
      pending.push({page:child, path:path+' / '+child.title, depth:depth+1});
    }
  }
  return rows;
}

export function validHomePages(value: unknown): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  const parents = new Map<string, string | null>([[HOME_ROOT, null]]);
  for (const page of value) {
    if (!page || typeof page.id !== 'string' || !page.id || parents.has(page.id) ||
        typeof page.title !== 'string' || !page.title.trim() ||
        !(page.parentId === null || typeof page.parentId === 'string') || !validHomepage(page)) return false;
    parents.set(page.id, page.parentId);
  }
  const resolved = new Set<string>([HOME_ROOT]);
  for (const id of parents.keys()) {
    const path = new Set<string>();
    let cursor: string | null = id;
    while (cursor !== null && !resolved.has(cursor)) {
      if (!parents.has(cursor) || path.has(cursor)) return false;
      path.add(cursor);
      cursor = parents.get(cursor)!;
    }
    for (const visited of path) resolved.add(visited);
  }
  return true;
}

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
    case 'page':
    case 'note': return typeof value.id === 'string' && !!value.id;
    case 'tab': return SECTION_KEYS.includes(value.tab);
    case 'web': return isWebsite(value.url);
    default: return false;
  }
}
function validBlock(block: HomeBlock) {
  return !!block && typeof block.id === 'string' && !!block.id &&
    HOME_LAYOUTS.includes(block.layout) && ['standard','wide','full'].includes(block.width) &&
    validCanvasFields(block) && (block.layout!=='audio' || isWebsite(block.audio)) && typeof block.title === 'string' && typeof block.text === 'string' &&
    validProjectImage(block.image) && validFrame(block.imageFrame) && validCoverImage(block.imageCutout) && (!block.imageCutout || !!block.image) && validTarget(block.target) &&
    (block.cell===undefined || (!!block.cell && typeof block.cell.rowId==='string' && Number.isInteger(block.cell.column))) &&
    (block.layout!=='row' || (!block.cell && Number.isInteger(block.columns) && block.columns!>=1 && block.columns!<=6)) &&
    (block.layout!=='video' || !!youtubeVideoId(block.videoUrl)) &&
    (block.links===undefined || (Array.isArray(block.links) && block.links.every(l=>l && typeof l.id==='string' && !!l.id && typeof l.label==='string' && !!l.target && validTarget(l.target)) && new Set(block.links.map(l=>l.id)).size===block.links.length));
}
export function validHomepage(value: unknown): boolean {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object') return false;
  const page = value as Homepage;
  if(page.title!==undefined && typeof page.title!=='string')return false;
  if(typeof page.locked!=='boolean' || !Array.isArray(page.blocks) || !page.blocks.every(validBlock))return false;
  const rows=new Map(page.blocks.filter(b=>b.layout==='row').map(b=>[b.id,b.columns]));
  return validBoard(page) && (page.width===undefined || page.width==='wide' || page.width==='reading')
    && new Set(page.blocks.map(b=>b.id)).size===page.blocks.length
    && page.blocks.every(b=>!b.cell || columnExists(b.cell.column,rows.get(b.cell.rowId)));
}

export type HomePlacement = { targetId: string; side: 'before' | 'after' };

export type HomeChange = BoardMove | BoardSelectionChange | CanvasTransfer
  | {type:'removeBoardItem'; original:HomeBlock; positions:Record<string,{x:number;y:number}>}
  | {type:'task'; id:string; index:number; done:boolean}
  | { type: 'lock'; locked: boolean }
  | { type:'width'; width:'reading'|'wide' }
  | { type:'into'; id:string; cell:HomeCell }
  | { type: 'add'; block: HomeBlock }
  | { type: 'edit'; original: HomeBlock; block: HomeBlock }
  | { type: 'remove'; original: HomeBlock }
  | { type: 'move'; id: string; offset: -1 | 1 }
  | ({ type: 'place'; id: string } & HomePlacement);

export function changeHomepage(page: Homepage, action: HomeChange): Homepage | null {
  if(page.mode==='canvas')return changeUnifiedCanvas(page,action);
  const next=applyHomeChange(page,action);
  return next && validBoard(next) ? next : null;
}
// Operate on the appropriate layout in isolation so a free-board command cannot move a fixed row.
export function changeUnifiedCanvas(saved:Homepage,action:HomeChange):Homepage|null {
  const page=unifiedCanvas(saved);
  if(action.type==='lock')return {...page,locked:action.locked};
  if(page.locked)return null;
  if(action.type==='width')return {...page,width:action.width};
  if(action.type==='dockCards'||action.type==='releaseCards'){
    return validCell(page.blocks,action.cell)?transferCanvasCards(page,action):null;
  }
  const {fixed,free,parked}=canvasParts(page.blocks);
  const block='original' in action?action.original:'block' in action?action.block:'id' in action?page.blocks.find(b=>b.id===action.id):undefined;
  if(action.type==='add'&&page.blocks.some(b=>b.id===action.block.id))return null;
  if(action.type==='remove'&&block?.layout==='row'){
    if(!fixed.some(b=>b.id===block.id&&JSON.stringify(b)===JSON.stringify(block)))return null;
    return releaseRow(page,block);
  }
  const structured=!!block && inFixedRow(block);
  if(structured){
    if(action.type==='boardMove'||action.type==='removeBoardItem')return null;
    if(['move','place','into'].includes(action.type)&&block.layout==='row')return null;
    if(action.type==='into'&&action.cell.rowId!==block.cell?.rowId)return null;
    if(action.type==='place'&&(!block.cell || fixed.find(b=>b.id===action.targetId)?.cell?.rowId!==block.cell.rowId))return null;
  }
  if(action.type==='into'&&!structured)return null;
  if(action.type==='edit'&&inFixedRow(action.block)!==structured)return null;
  // Legacy callers may create a regular card without specifying its initial free position.
  const edit=!structured && action.type==='add' && action.block.layout!=='line' && !action.block.at
    ? {...action,block:{...action.block,at:{x:24+free.length*24,y:28+free.length*24}}} : action;
  const next=changeHomepage({...page,mode:structured?'page':'board',blocks:structured?fixed:free},edit);
  if(!next)return null;
  const removed=action.type==='remove'||action.type==='removeBoardItem'?action.original.id:undefined;
  const kept=removed?parked.filter(b=>b.edge!.from!==removed&&b.edge!.to!==removed):parked;
  return {...page,blocks:[...(structured?next.blocks:fixed),...(structured?free:next.blocks),...kept]};
}

function applyHomeChange(page:Homepage,action:HomeChange):Homepage|null {
  if(action.type==='dockCards'||action.type==='releaseCards')return null;
  if (action.type === 'lock') return { ...page, locked: action.locked };
  if (page.locked) return null;
  if(action.type==='boardSelection')return applySelection(page,action);
  if(action.type==='boardMove')return page.mode==='board'?moveOnBoard(page,action):null;
  if(action.type==='removeBoardItem'){
    const original=page.blocks.find(b=>b.id===action.original.id);
    if(page.mode!=='board'||!original||JSON.stringify(original)!==JSON.stringify(action.original))return null;
    return {...page,blocks:page.blocks.filter(b=>b.id!==original.id && b.edge?.from!==original.id && b.edge?.to!==original.id)
      .map(b=>b.columnId===original.id?{...b,columnId:undefined,at:action.positions[b.id]??b.at}:b)};
  }
  if(action.type==='task'){
    const item=page.blocks.find(b=>b.id===action.id);
    if(!item?.tasks?.[action.index])return null;
    return {...page,blocks:page.blocks.map(b=>b!==item?b:{...b,tasks:b.tasks!.map((t,i)=>i===action.index?{...t,done:action.done}:t)})};
  }
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
