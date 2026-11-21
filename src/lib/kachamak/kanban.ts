import {isGalleryImageRef} from './project-image';
import {uid} from './utils';

export const priorities = ['Low', 'Normal', 'High'] as const;
export type Priority = typeof priorities[number];
export interface CardLabel { name:string; color:string }
export interface ChecklistItem { id:string; text:string; done:boolean }
export interface CardChecklist { id:string; title:string; items:ChecklistItem[] }
export interface CardEntry { id:string; kind:'comment'|'activity'; author:string; at:number; text:string }
export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  due: string;
  start?: string;
  complete?: boolean;
  labels?: CardLabel[];
  members?: string[];
  checklists?: CardChecklist[];
  feed?: CardEntry[];
  cover?: string;
}
export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}
export interface KanbanBoard { columns: KanbanColumn[] }

export function newKanbanBoard(): KanbanBoard {
  return { columns: [
    {id: 'todo', title: 'To do', cards: []},
    {id: 'doing', title: 'In progress', cards: []},
    {id: 'done', title: 'Done', cards: []},
  ] };
}

const nonblank = (value:unknown):value is string => typeof value === 'string' && !!value.trim();
const day = (value:string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

function uniqueItems<T>(values:T[]|undefined, key:(item:T)=>string, valid:(item:T)=>boolean) {
  if (values === undefined) return true;
  if (!Array.isArray(values)) return false;
  const seen = new Set<string>();
  return values.every(item=>{
    if (!item || !valid(item)) return false;
    const id = key(item);
    if (!nonblank(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function validDetails(card:KanbanCard) {
  return (card.start===undefined || typeof card.start==='string' && (!card.start || day(card.start))) &&
    (!card.start || !card.due || card.start<=card.due) &&
    (card.complete===undefined || typeof card.complete==='boolean') &&
    (card.cover===undefined || isGalleryImageRef(card.cover)) &&
    uniqueItems(card.labels, label=>label.name.trim().toLowerCase(), label=>nonblank(label.name) && /^#[0-9a-f]{6}$/i.test(label.color)) &&
    uniqueItems(card.members, name=>name.trim().toLowerCase(), nonblank) &&
    uniqueItems(card.checklists, list=>list.id, list=>nonblank(list.title) && Array.isArray(list.items) &&
      uniqueItems(list.items, item=>item.id, item=>nonblank(item.text) && typeof item.done==='boolean')) &&
    uniqueItems(card.feed, entry=>entry.id, entry=>['comment','activity'].includes(entry.kind) &&
      nonblank(entry.author) && nonblank(entry.text) && Number.isSafeInteger(entry.at) && entry.at>=0 && entry.at<=8640000000000000);
}

export function cardEntry(kind:CardEntry['kind'], author:string, text:string):CardEntry {
  return {id:uid(),kind,author,at:Date.now(),text};
}
export function recordCardActivity(card:KanbanCard, author:string, message:string):KanbanCard {
  return {...card,feed:[...(card.feed??[]),cardEntry('activity',author,message)]};
}
export function updateKanbanCard(board:KanbanBoard, id:string, change:(card:KanbanCard)=>KanbanCard):KanbanBoard {
  const col = board.columns.find(c=>c.cards.some(card=>card.id===id));
  const current = col?.cards.find(card=>card.id===id);
  if (!col || !current) return board;
  const next = change(current);
  if (next === current) return board;
  return {columns:board.columns.map(c=>c===col ? {...c,cards:c.cards.map(card=>card.id===id?next:card)} : c)};
}

export function validKanban(value: unknown): value is KanbanBoard {
  if (!value || typeof value !== 'object' || !('columns' in value) || !Array.isArray(value.columns)) return false;
  const ids = new Set<string>();
  const acceptId = (id: unknown) => {
    if (typeof id !== 'string' || !/^[\w-]{1,128}$/.test(id) || ids.has(id)) return false;
    ids.add(id);
    return true;
  };
  const title = (text: unknown) => typeof text === 'string' && !!text.trim();
  return value.columns.every(column => column && acceptId(column.id) && title(column.title) &&
    Array.isArray(column.cards) && column.cards.every((card: KanbanCard) => card && acceptId(card.id) &&
      title(card.title) && typeof card.description === 'string' && priorities.includes(card.priority) &&
      typeof card.due === 'string' && (!card.due || day(card.due)) && validDetails(card)));
}

export function moveKanbanCard(board: KanbanBoard, id: string, columnId: string, before: string | null = null, author?:string): KanbanBoard {
  const source = board.columns.find(col => col.cards.some(card => card.id === id));
  const target = board.columns.find(col => col.id === columnId);
  if (!source || !target || before === id || (before && !target.cards.some(card => card.id === before))) return board;
  const from = source.cards.findIndex(card => card.id === id);
  const remaining = target.cards.filter(card => card.id !== id);
  const index = before ? remaining.findIndex(card => card.id === before) : remaining.length;
  if (source === target && from === index) return board;
  const card = source.cards[from];
  const message = source === target ? 'reordered this card in '+target.title : 'moved this card from '+source.title+' to '+target.title;
  remaining.splice(index, 0, author ? recordCardActivity(card,author,message) : card);
  return {columns: board.columns.map(col => col === target ? {...col, cards: remaining} :
    col === source ? {...col, cards: col.cards.filter(card => card.id !== id)} : col)};
}

export function moveKanbanColumn(board: KanbanBoard, id: string, offset: number): KanbanBoard {
  const from = board.columns.findIndex(col => col.id === id);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= board.columns.length || !offset) return board;
  const columns = board.columns.slice();
  columns.splice(to, 0, columns.splice(from, 1)[0]);
  return {columns};
}
