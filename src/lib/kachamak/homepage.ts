import { SECTION_KEYS, type SectionKey, type Novel } from './types';
import {atlasOf,validAtlas,type MapAtlas} from './canvas-map';
import {validProjectImage, validCoverImage} from './project-image';

import {canvasParts,inFixedRow,releaseRow,transferCanvasCards,unifiedCanvas,worldRows,type CanvasTransfer} from './canvas-layout';
import {changeCardGroup,clearSingletonGroups,duplicateCardGroup,type CardGroupChange,type DuplicateGroupChange} from './canvas-groups';
import {applySelection,type BoardSelectionChange} from './canvas-selection';
import {validCanvasFields,validBoard,moveOnBoard,isPoint,type Point,type CanvasFields,type BoardMove} from './canvas-board';

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
  manualPosition?:true;
  links?: HomeLink[];
  videoUrl?: string;
}
export interface Homepage { viewKey?:string; synopsis?:string; notes?:string; icon?:string; color?:string; legacyRowX?:number; title?:string; mode?:'page'|'board'|'canvas'; locked: boolean; blocks: HomeBlock[]; width?: 'wide'|'reading' }
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
  const rows: {id:string; title:string; path:string; depth:number; hasChildren:boolean; mode?:Homepage['mode']; icon?:string; color?:string}[] = [];
  const pending = children.get(null)!.map(page => ({page, path:page.title, depth:0})).reverse();
  const visited = new Set<string>();
  while (pending.length) {
    const {page, path, depth} = pending.pop()!;
    if (visited.has(page.id)) continue;
    visited.add(page.id);
    const nested = children.get(page.id) ?? [];
    rows.push({id:page.id, title:page.title, path, depth, hasChildren:nested.length > 0, mode:page.mode,icon:page.icon,color:page.color});
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

function embeddedMedia(value:unknown,kind:'audio'|'video'):value is string{
  if(typeof value!=='string'||value.length>3_000_000)return false;
  const pattern=kind==='audio'?/^data:audio\/(?:wav|mpeg|ogg);base64,[a-z0-9+/]+=*$/i:/^data:video\/(?:webm|mp4);base64,[a-z0-9+/]+=*$/i;
  return pattern.test(value);
}
export function canvasAudio(value:unknown):value is string {
  return embeddedMedia(value,'audio')||isWebsite(value);
}
export function directCanvasVideo(value:unknown):value is string {
  return embeddedMedia(value,'video')||isWebsite(value) && /\.(webm|mp4)$/i.test(new URL(value,'https://canvas.invalid').pathname);
}
export function canvasVideo(value:unknown){return directCanvasVideo(value)||!!youtubeVideoId(value);}

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
    validCanvasFields(block) && (block.layout!=='audio' || canvasAudio(block.audio)) && typeof block.title === 'string' && typeof block.text === 'string' &&
    validProjectImage(block.image) && validFrame(block.imageFrame) && validCoverImage(block.imageCutout) && (!block.imageCutout || !!block.image || !!block.mapId) && validTarget(block.target) &&
    (block.cell===undefined || (!!block.cell && typeof block.cell.rowId==='string' && Number.isInteger(block.cell.column))) &&
    (block.manualPosition===undefined||block.manualPosition===true&&block.layout==='row'&&isPoint(block.at)) &&
    (block.layout!=='row' || (!block.cell && Number.isInteger(block.columns) && block.columns!>=1 && block.columns!<=6)) &&
    (block.layout!=='video' || canvasVideo(block.videoUrl)) &&
    (block.links===undefined || (Array.isArray(block.links) && block.links.every(l=>l && typeof l.id==='string' && !!l.id && typeof l.label==='string' && !!l.target && validTarget(l.target)) && new Set(block.links.map(l=>l.id)).size===block.links.length));
}
type AppearanceField='icon'|'color';
function validAppearance(field:AppearanceField,value:unknown) {
  return typeof value==='string' && (field==='color'?/^#[0-9a-f]{6}$/i:/^[a-z0-9][a-z0-9-]{0,79}$/i).test(value);
}

export function validHomepage(value: unknown): boolean {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object') return false;
  const page = value as Homepage;
  if(page.icon!==undefined&&!validAppearance('icon',page.icon) || page.color!==undefined&&!validAppearance('color',page.color))return false;
  if(page.viewKey!==undefined&&(typeof page.viewKey!=='string'||!page.viewKey||page.viewKey.length>80))return false;
  if(page.legacyRowX!==undefined && !Number.isFinite(page.legacyRowX))return false;
  if([page.title,page.synopsis,page.notes].some(field=>field!==undefined && typeof field!=='string'))return false;
  if(typeof page.locked!=='boolean' || !Array.isArray(page.blocks) || !page.blocks.every(validBlock))return false;
  const rows=new Map(page.blocks.filter(b=>b.layout==='row').map(b=>[b.id,b.columns]));
  return validBoard(page) && (page.width===undefined || page.width==='wide' || page.width==='reading')
    && new Set(page.blocks.map(b=>b.id)).size===page.blocks.length
    && page.blocks.every(b=>!b.cell || columnExists(b.cell.column,rows.get(b.cell.rowId)));
}

export type HomePlacement = { targetId: string; side: 'before' | 'after' };

type MapAnnotationChange = {type:'mapAnnotations'; original:HomeBlock; atlas:MapAtlas};
export type HomeChange = MapAnnotationChange | LayoutChange;
type LayoutChange = BoardMove | BoardSelectionChange | CanvasTransfer | CardGroupChange | DuplicateGroupChange
  | {type:'info';field:'synopsis'|'notes';value:string}
  | {type:'appearance';field:AppearanceField;value:string}
  | {type:'moveRow';id:string;at:Point;heights:[string,number][]}
  | {type:'deleteItems'; originals:HomeBlock[]; positions:Record<string,Point>}
  | {type:'removeBoardItem'; original:HomeBlock; positions:Record<string,{x:number;y:number}>}
  | {type:'task'; id:string; index:number; done:boolean}
  | { type: 'lock'; locked: boolean }
  | { type:'width'; width:'reading'|'wide' }
  | { type:'into'; id:string; cell:HomeCell }
  | { type: 'add'; block: HomeBlock; before?:string }
  | { type: 'edit'; original: HomeBlock; block: HomeBlock }
  | { type: 'remove'; original: HomeBlock; column?:number; positions?:Record<string,{x:number;y:number}> }
  | { type: 'move'; id: string; offset: -1 | 1 }
  | ({ type: 'place'; id: string } & HomePlacement);

export function changeHomepage(page: Homepage, action: HomeChange): Homepage | null {
  if(action.type==='mapAnnotations'){
    const current=page.blocks.find(block=>block.id===action.original.id);
    if(current?.layout!=='map'||!current.image||current.image!==action.original.image||!validAtlas(action.atlas)||
      JSON.stringify(atlasOf(current))!==JSON.stringify(atlasOf(action.original)))return null;
    // The page lock protects the layout. Map annotations have their own edit commands.
    return {...page,blocks:page.blocks.map(block=>block===current?{...block,pin:undefined,atlas:action.atlas}:block)};
  }
  if(action.type==='info'){
    if(!['synopsis','notes'].includes(action.field)||typeof action.value!=='string'||action.value===(page[action.field]??''))return null;
    return {...page,[action.field]:action.value};
  }
  if(action.type==='appearance')return action.value===''||validAppearance(action.field,action.value)?{...page,[action.field]:action.value||undefined}:null;
  const next=page.mode==='canvas'?changeUnifiedCanvas(page,action):applyHomeChange(page,action);
  if(!next||page.mode!=='canvas'&&!validBoard(next))return null;
  return action.type==='remove'||action.type==='removeBoardItem'||action.type==='deleteItems'||action.type==='place'||action.type==='into'
    ?clearSingletonGroups(next):next;
}
// Operate on the appropriate layout in isolation so a free-board command cannot move a fixed row.
export function changeUnifiedCanvas(saved:Homepage,action:LayoutChange):Homepage|null {
  const page=unifiedCanvas(saved);
  if(action.type==='duplicateGroup')return duplicateCardGroup(page,action);
  if(action.type==='cardGroup')return changeCardGroup(page,action);
  if(action.type==='lock')return {...page,locked:action.locked};
  if(page.locked)return null;
  if(action.type==='width')return {...page,width:action.width};
  if(action.type==='moveRow'){
    const rows=page.blocks.filter(b=>b.layout==='row'),row=rows.find(b=>b.id===action.id);
    if(!row||!isPoint(action.at))return null;
    const original=worldRows(rows,page.width==='reading'?736:1160,new Map(action.heights),page.legacyRowX);
    return {...page,blocks:page.blocks.map(b=>{
      if(b.id===row.id)return {...b,at:action.at,manualPosition:true};
      // Taking a row out of the legacy stack must not pull its neighbours up.
      if(!row.manualPosition && b.layout==='row' && !b.manualPosition){
        const bounds=original.get(b.id)!;
        if(bounds.y!==(b.at?.y??0))return {...b,at:{x:bounds.x,y:bounds.y}};
      }
      return b;
    })};
  }
  if(action.type==='moveCellCards'||action.type==='dockCards'||action.type==='releaseCards'){
    return validCell(page.blocks,action.cell)?transferCanvasCards(page,action):null;
  }
  if(action.type==='deleteItems'){
    const originals=new Map(action.originals.map(b=>[b.id,b]));
    const selected=page.blocks.filter(b=>originals.has(b.id));
    if(!selected.length||selected.length!==action.originals.length||
       selected.some(b=>JSON.stringify(b)!==JSON.stringify(originals.get(b.id))))return null;
    // Removing a container releases its surviving children. Only deleted endpoints lose connections.
    const blocks=page.blocks.filter(b=>!originals.has(b.id)&&!(b.edge&&(originals.has(b.edge.from)||originals.has(b.edge.to))))
      .map(b=>{
        if(!(b.cell&&originals.has(b.cell.rowId))&&!(b.columnId&&originals.has(b.columnId)))return b;
        const at=action.positions[b.id]??b.at??{x:24,y:28};
        return {...b,cell:undefined,columnId:undefined,at};
      });
    return {...page,blocks};
  }
  const {fixed,free,parked}=canvasParts(page.blocks);
  const block='original' in action?action.original:'block' in action?action.block:'id' in action?page.blocks.find(b=>b.id===action.id):undefined;
  if(action.type==='boardMove'&&block?.layout==='column')return null;
  if(action.type==='boardSelection'&&['translate','align','distribute'].includes(action.command.kind)){
    const ids=new Set(action.ids);
    if(free.some(b=>b.layout==='column'&&ids.has(b.id)))return null;
  }
  if(action.type==='add'&&page.blocks.some(b=>b.id===action.block.id))return null;
  if(action.type==='add'&&action.block.layout==='line'&&action.block.edge){
    const next={...page,blocks:[...page.blocks,action.block]};
    return validBlock(action.block)&&validBoard(next)?next:null;
  }
  if(action.type==='remove'&&block?.layout==='row'){
    if(!fixed.some(b=>b.id===block.id&&JSON.stringify(b)===JSON.stringify(block)))return null;
    if(action.column!==undefined&&!columnExists(action.column,block.columns))return null;
    return releaseRow(page,block,action.positions,action.column);
  }
  if(action.type==='removeBoardItem'&&block?.edge&&parked.some(b=>b.id===block.id&&JSON.stringify(b)===JSON.stringify(block)))
    return {...page,blocks:page.blocks.filter(b=>b.id!==block.id)};
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

function applyHomeChange(page:Homepage,action:LayoutChange):Homepage|null {
  if(action.type==='duplicateGroup')return duplicateCardGroup(page,action);
  if(action.type==='cardGroup')return changeCardGroup(page,action);
  if(action.type==='deleteItems'||action.type==='moveRow'||action.type==='info'||action.type==='appearance'||action.type==='moveCellCards'||action.type==='dockCards'||action.type==='releaseCards')return null;
  if (action.type === 'lock') return { ...page, locked: action.locked };
  if (page.locked) return null;
  if(action.type==='boardSelection')return applySelection(page,action);
  if(action.type==='boardMove'){
    if(page.mode!=='board'||!isPoint(action.at))return null;
    const item=page.blocks.find(b=>b.id===action.id);
    if(item?.groupId){
      if(!item.at||item.columnId||action.columnId)return null;
      return applySelection(page,{type:'boardSelection',ids:[item.id],command:{kind:'translate',
        delta:{x:action.at.x-item.at.x,y:action.at.y-item.at.y}}});
    }
    return moveOnBoard(page,action);
  }
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
    const before=action.before && action.block.cell
      ? page.blocks.findIndex(b=>b.id===action.before && sameCell(b.cell,action.block.cell)) : -1;
    const blocks=[...page.blocks];
    blocks.splice(before<0?blocks.length:before,0,action.block);
    return {...page,blocks};
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
    blocks.splice(to,0,sameCell(cell,current.cell)?current:{...current,cell,groupId:undefined});
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
      blocks[index]=current.groupId?{...next,groupId:current.groupId}:next;
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
