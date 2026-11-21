export const priorities = ['Low', 'Normal', 'High'] as const;
export type Priority = typeof priorities[number];
export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  due: string;
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
      typeof card.due === 'string' && (!card.due || /^\d{4}-\d{2}-\d{2}$/.test(card.due))));
}

export function moveKanbanCard(board: KanbanBoard, id: string, columnId: string, before: string | null = null): KanbanBoard {
  const source = board.columns.find(col => col.cards.some(card => card.id === id));
  const target = board.columns.find(col => col.id === columnId);
  if (!source || !target || before === id || (before && !target.cards.some(card => card.id === before))) return board;
  const from = source.cards.findIndex(card => card.id === id);
  const remaining = target.cards.filter(card => card.id !== id);
  const index = before ? remaining.findIndex(card => card.id === before) : remaining.length;
  if (source === target && from === index) return board;
  remaining.splice(index, 0, source.cards[from]);
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
