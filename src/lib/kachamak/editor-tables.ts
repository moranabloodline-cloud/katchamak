import {editorForRange} from './editor-selection';
import {setTableProperties, tableProperties, type CellVerticalAlignment, type TableAlignment, type TableFit, type TableProperties} from './editor-table-format';

export const maxTableRows = 100;
export const maxTableColumns = 30;
const maxEditableSlots = 30_000;

export type TableSize = {rows: number; columns: number};
export type TableInsertion = {editor: HTMLElement; range: Range; html: string; identity:string};
export type TableCellTarget = {
  editor: HTMLElement;
  table: HTMLTableElement;
  cell: HTMLTableCellElement;
  range: Range;
  html: string;
  identity: string;
};

export type TableAction =
  | {type:'insertRow' | 'insertColumn'; edge:'before' | 'after'}
  | {type:'deleteRow' | 'deleteColumn' | 'deleteTable'}
  | {type:'insertCell' | 'deleteCell'; axis:'row' | 'column'}
  | {type:'split'; size:TableSize}
  | {type:'align'; horizontal:TableAlignment}
  | {type:'align'; vertical:CellVerticalAlignment}
  | {type:'fit'; fit:TableFit}
  | {type:'resize'; axis:'column' | 'row'; delta:number; scale:number}
  | {type:'properties'; properties:TableProperties};

type Cell = {element:HTMLTableCellElement; row:number; column:number; rows:number; columns:number};
type Grid = {rows:HTMLTableRowElement[]; columns:number; cells:Cell[]};

function elementAt(node: Node) {
  return node.nodeType === 1 ? node as Element : node.parentElement;
}

function canEdit(editor: HTMLElement, range: Range) {
  return editor.getAttribute('contenteditable') === 'true' && editorForRange(range) === editor &&
    ![range.startContainer, range.endContainer].some(node => elementAt(node)?.closest('[contenteditable="false"]'));
}

function editorIdentity(editor: HTMLElement) {
  return (editor.dataset.noteId ?? editor.closest<HTMLElement>('[data-inspector-prose]')?.dataset.inspectorProse ?? '') +
    '\n' + (editor.getAttribute('aria-label') ?? '');
}

export function captureTableInsertion(range: Range | null): TableInsertion | undefined {
  const editor = editorForRange(range);
  if (editor && range && canEdit(editor, range)) return {editor, range:range.cloneRange(), html:editor.innerHTML, identity:editorIdentity(editor)};
}

export function tableCellAt(editor: HTMLElement, node: Node | null) {
  const cell = node && elementAt(node)?.closest<HTMLTableCellElement>('td,th');
  return cell?.closest('.kachamak-editor') === editor ? cell : undefined;
}

function atStart(element: Node) {
  const range = element.ownerDocument!.createRange();
  range.selectNodeContents(element);
  range.collapse(true);
  return range;
}

export function captureTableCell(editor: HTMLElement, cell: HTMLTableCellElement): TableCellTarget | undefined {
  const table = cell.closest('table');
  if (!table || tableCellAt(editor, cell) !== cell) return;
  const selection = editor.ownerDocument.getSelection();
  const current = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const range = current && cell.contains(current.startContainer) && cell.contains(current.endContainer)
    ? current.cloneRange() : atStart(cell);
  if (canEdit(editor, range)) return {editor, table, cell, range, html:table.outerHTML, identity:editorIdentity(editor)};
}

export function focusEditorRange(editor: HTMLElement, range: Range) {
  if (!canEdit(editor, range)) return false;
  editor.focus({preventScroll:true});
  const selection = editor.ownerDocument.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  return true;
}

function editorInput(editor: HTMLElement, event: 'beforeinput' | 'input') {
  editor.dispatchEvent(new InputEvent(event, {bubbles:true, inputType:'insertTable'}));
  if (event === 'input') editor.ownerDocument.dispatchEvent(new Event('selectionchange'));
}

function emptyCell(row: HTMLTableRowElement) {
  const tag = row.parentElement?.tagName === 'THEAD' ? 'th' : 'td';
  const cell = row.ownerDocument.createElement(tag);
  cell.append(row.ownerDocument.createElement('br'));
  return cell;
}

function blankParagraph(doc: Document) {
  const paragraph = doc.createElement('p');
  paragraph.append(doc.createElement('br'));
  return paragraph;
}

function validSize({rows,columns}: TableSize) {
  return Number.isInteger(rows) && rows >= 1 && rows <= maxTableRows &&
    Number.isInteger(columns) && columns >= 1 && columns <= maxTableColumns;
}

const textBlock = 'p,div,h1,h2,h3,h4,h5,h6';
const nestedBlocks = textBlock + ',ul,ol,table,blockquote,section,pre,hr';
const containsContent = (element: Element) => !!element.textContent ||
  !!element.querySelector('img,hr,table,input,svg') || element.querySelectorAll('br').length > 1;

export function insertEditorTable(target: TableInsertion, size: TableSize) {
  const {editor,range,html,identity} = target;
  if (!validSize(size) || editorIdentity(editor) !== identity || editor.innerHTML !== html || !focusEditorRange(editor, range)) return false;
  const doc = editor.ownerDocument;
  const table = doc.createElement('table');
  setTableProperties(table,{fit:'contents',width:100,alignment:'left',borders:true});
  const body = table.createTBody();
  for (let i = 0; i < size.rows; i++) {
    const row = body.insertRow();
    for (let j = 0; j < size.columns; j++) row.append(emptyCell(row));
  }
  editorInput(editor, 'beforeinput');
  const point = range.cloneRange();
  point.collapse(false);
  let block = point.endContainer;
  while (block !== editor && block.parentNode !== editor) block = block.parentNode!;
  if (block === editor) {
    editor.insertBefore(table, editor.childNodes[point.endOffset] ?? null);
  } else if (block.nodeType === 1 && (block as Element).matches(textBlock) && !(block as Element).querySelector(nestedBlocks)) {
    // Leave both halves of the paragraph, including their inline formatting.
    const before = block as HTMLElement;
    const after = before.cloneNode(false) as HTMLElement;
    after.removeAttribute('id');
    point.setEnd(before, before.childNodes.length);
    after.append(point.extractContents());
    before.after(table);
    if (containsContent(after)) table.after(after);
    if (!containsContent(before)) before.remove();
  } else {
    // A caret inside a list or table inserts after the containing block.
    (block as ChildNode).after(table);
  }
  if (!table.nextElementSibling) table.after(blankParagraph(doc));
  focusEditorRange(editor, atStart(table.rows[0].cells[0]));
  editorInput(editor, 'input');
  return true;
}

function markCell(slots: (Cell | undefined)[][], cell: Cell) {
  for (let row = cell.row; row < cell.row + cell.rows; row++) {
    for (let column = cell.column; column < cell.column + cell.columns; column++) {
      if (!slots[row] || slots[row][column]) return false;
      slots[row][column] = cell;
    }
  }
  return true;
}

function readGrid(table: HTMLTableElement): Grid | undefined {
  const rows = Array.from(table.rows);
  if (!rows.length || rows.length > maxEditableSlots) return;
  const groupEnds = new Map<HTMLElement | null, number>();
  rows.forEach((row, i) => groupEnds.set(row.parentElement, i + 1));
  const slots: (Cell | undefined)[][] = rows.map(() => []);
  const cells: Cell[] = [];
  let columns = 0;
  for (const [row, element] of rows.entries()) {
    let column = 0;
    for (const cell of Array.from(element.cells)) {
      while (slots[row][column]) column++;
      const groupRemaining = groupEnds.get(element.parentElement)! - row;
      const rect = {element:cell, row, column, rows:Math.min(cell.rowSpan || groupRemaining, groupRemaining), columns:cell.colSpan};
      column += rect.columns;
      columns = Math.max(columns, column);
      if (rows.length * columns > maxEditableSlots || !markCell(slots, rect)) return;
      cells.push(rect);
    }
  }
  if (columns) return {rows, columns, cells};
}

function resizeTable(table: HTMLTableElement, copy: HTMLTableElement, cell: HTMLTableCellElement,
  {axis,delta,scale}: Extract<TableAction, {type:'resize'}>) {
  const grid = readGrid(table);
  const item = grid?.cells.find(rect => rect.element === cell);
  if (!grid || !item || !Number.isFinite(delta) || !Number.isFinite(scale) || scale <= 0) return false;
  const change = Math.round(delta / scale);
  if (!change) return true;
  if (axis === 'row') {
    const index = item.row + item.rows - 1;
    const height = grid.rows[index].getBoundingClientRect().height / scale;
    copy.rows[index].style.height = Math.round(Math.max(16, Math.min(1600, height + change))) + 'px';
    return true;
  }

  const column = item.column + item.columns - 1;
  const widths = grid.cells.map(rect => ({...rect,width:rect.element.getBoundingClientRect().width / scale}));
  const affected = widths.filter(rect => rect.column <= column && rect.column + rect.columns > column);
  const minimum = Math.min(...affected.map(rect => rect.width - 24 * rect.columns));
  const editor = table.closest('.kachamak-editor')!;
  const room = (editor.getBoundingClientRect().width - table.getBoundingClientRect().width) / scale;
  const adjustment = Math.max(-Math.max(0,minimum),Math.min(Math.max(0,room),change));
  if (!Math.round(adjustment)) return true;
  copy.style.width = 'auto';
  copy.style.tableLayout = 'auto';
  for (const rect of widths) {
    const width = rect.width + (rect.column <= column && rect.column + rect.columns > column ? adjustment : 0);
    copy.rows[rect.row].cells[rect.element.cellIndex].style.width = Math.round(Math.min(2400,width)) + 'px';
  }
  return true;
}

function renderGrid(grid: Grid) {
  const {rows,columns,cells} = grid;
  if (!rows.length || !columns || rows.length * columns > maxEditableSlots) return false;
  const slots: (Cell | undefined)[][] = rows.map(() => []);
  for (const cell of cells) {
    if (cell.column + cell.columns > columns || !markCell(slots, cell)) return false;
  }
  rows.forEach((row,i) => {
    const children: HTMLTableCellElement[] = [];
    for (let j = 0; j < columns; j++) {
      const rect = slots[i][j];
      if (!rect) {
        const element = emptyCell(row);
        slots[i][j] = {element,row:i,column:j,rows:1,columns:1};
        children.push(element);
      } else if (rect.row === i && rect.column === j) {
        if (rect.rows > 1) rect.element.rowSpan = rect.rows;
        else rect.element.removeAttribute('rowspan');
        if (rect.columns > 1) rect.element.colSpan = rect.columns;
        else rect.element.removeAttribute('colspan');
        children.push(rect.element);
      }
    }
    row.replaceChildren(...children);
  });
  return slots;
}

type Axis = 'row' | 'column';
const spanFor = (axis:Axis) => axis === 'row' ? 'rows' : 'columns';

function addTracks(grid: Grid, axis: Axis, position: number, count: number, rowGroup?: Node, inside = false) {
  const span = spanFor(axis);
  for (const cell of grid.cells) {
    if (cell[axis] > position || (cell[axis] === position && !inside)) cell[axis] += count;
    else if (cell[axis] + cell[span] > position) cell[span] += count;
  }
  if (axis === 'column') {
    grid.columns += count;
  } else {
    const index = position + Number(inside);
    const next = grid.rows[index];
    const doc = grid.rows[0].ownerDocument;
    const rows = Array.from({length:count}, () => doc.createElement('tr'));
    for (const row of rows) rowGroup!.insertBefore(row, next?.parentNode === rowGroup ? next : null);
    grid.rows.splice(index, 0, ...rows);
  }
}

function removeTrack(grid: Grid, axis: Axis, position: number) {
  const span = spanFor(axis);
  grid.cells = grid.cells.filter(cell => {
    if (cell[axis] > position) cell[axis]--;
    else if (cell[axis] + cell[span] > position && --cell[span] === 0) return false;
    return true;
  });
  if (axis === 'column') grid.columns--;
  else grid.rows.splice(position, 1)[0].remove();
}

function canShift(grid: Grid) {
  return grid.rows.every(row => row.parentElement === grid.rows[0].parentElement) &&
    grid.cells.every(cell => cell.rows === 1 && cell.columns === 1);
}

export function tableCellOptions(target: TableCellTarget) {
  const grid = readGrid(target.table);
  const cell = grid?.cells.find(item => item.element === target.cell);
  return {structural:!!cell, shift:!!cell && canShift(grid!), rows:cell?.rows ?? 1, columns:cell?.columns ?? 1};
}

function shiftCells(grid: Grid, cell: Cell, axis: Axis, insert: boolean) {
  const across = axis === 'row' ? 'column' : 'row';
  if (insert) {
    if (axis === 'column') grid.columns++;
    else {
      const last = grid.rows.at(-1)!;
      const row = last.ownerDocument.createElement('tr');
      last.after(row);
      grid.rows.push(row);
    }
  } else {
    grid.cells = grid.cells.filter(item => item !== cell);
  }
  const origin = cell[axis], line = cell[across];
  for (const item of grid.cells) if (item[across] === line && item[axis] >= origin) item[axis] += insert ? 1 : -1;
}

function splitCell(grid: Grid, cell: Cell, size: TableSize) {
  if (size.columns > cell.columns) addTracks(grid, 'column', cell.column + cell.columns - 1, size.columns - cell.columns, undefined, true);
  if (size.rows > cell.rows) addTracks(grid, 'row', cell.row + cell.rows - 1, size.rows - cell.rows, grid.rows[cell.row].parentNode!, true);
  const original = {...cell};
  for (let i = 0; i < size.rows; i++) {
    for (let j = 0; j < size.columns; j++) {
      const rowStart = Math.floor(i * original.rows / size.rows), columnStart = Math.floor(j * original.columns / size.columns);
      const row = original.row + rowStart, column = original.column + columnStart;
      const rows = Math.floor((i + 1) * original.rows / size.rows) - rowStart;
      const columns = Math.floor((j + 1) * original.columns / size.columns) - columnStart;
      if (i === 0 && j === 0) Object.assign(cell, {rows,columns});
      else grid.cells.push({element:emptyCell(grid.rows[row]),row,column,rows,columns});
    }
  }
}

function removeTable(target: TableCellTarget) {
  const {editor,table} = target;
  const next = table.nextElementSibling ?? blankParagraph(table.ownerDocument);
  if (!next.parentNode) table.after(next);
  table.remove();
  focusEditorRange(editor, atStart(next));
}

export function editEditorTable(target: TableCellTarget, action: TableAction) {
  const {editor,table,cell,range,html,identity} = target;
  if (editorIdentity(editor) !== identity || !canEdit(editor, range) || tableCellAt(editor, cell) !== cell ||
    cell.closest('table') !== table || table.outerHTML !== html) return false;
  const copy = table.cloneNode(true) as HTMLTableElement;
  const tr = cell.parentElement as HTMLTableRowElement;
  let nextCell = copy.rows[tr.rowIndex]?.cells[cell.cellIndex];
  if (!nextCell) return false;
  let remove = action.type === 'deleteTable';
  if (action.type === 'align') {
    if ('horizontal' in action) {
      nextCell.style.textAlign = action.horizontal;
      for (const block of nextCell.querySelectorAll<HTMLElement>(textBlock)) {
        if (block.style.textAlign && block.closest('td,th') === nextCell) block.style.textAlign = action.horizontal;
      }
    } else nextCell.style.verticalAlign = action.vertical;
  } else if (action.type === 'properties' || action.type === 'fit') {
    const previous = tableProperties(table);
    const properties = action.type === 'fit' ? {...previous,fit:action.fit,width:100} : action.properties;
    const {width} = properties;
    if (!Number.isFinite(width) || width < 1 || width > 100) return false;
    setTableProperties(copy, properties);
    if (properties.fit === 'contents' && (action.type === 'fit' || previous.fit !== 'contents')) {
      for (const row of Array.from(copy.rows)) for (const cell of Array.from(row.cells)) cell.style.removeProperty('width');
    }
  } else if (action.type === 'resize') {
    if (!resizeTable(table,copy,cell,action)) return false;
  } else if (!remove) {
    const grid = readGrid(copy);
    const item = grid?.cells.find(rect => rect.element === nextCell);
    if (!grid || !item) return false;
    let row = item.row, column = item.column;
    switch (action.type) {
      case 'insertRow':
        row += action.edge === 'after' ? item.rows : 0;
        addTracks(grid,'row',row,1,grid.rows[item.row].parentNode!);
        break;
      case 'insertColumn':
        column += action.edge === 'after' ? item.columns : 0;
        addTracks(grid,'column',column,1);
        break;
      case 'deleteRow':
        remove = grid.rows.length === 1;
        if (!remove) removeTrack(grid,'row',row);
        break;
      case 'deleteColumn':
        remove = grid.columns === 1;
        if (!remove) removeTrack(grid,'column',column);
        break;
      case 'insertCell':
      case 'deleteCell':
        if (!canShift(grid)) return false;
        shiftCells(grid,item,action.axis,action.type === 'insertCell');
        break;
      case 'split':
        if (!validSize(action.size) || action.size.rows * action.size.columns < 2) return false;
        splitCell(grid,item,action.size);
        break;
    }
    if (!remove) {
      const slots = renderGrid(grid);
      if (!slots) return false;
      nextCell = slots[Math.min(row,grid.rows.length - 1)][Math.min(column,grid.columns - 1)]!.element;
    }
  }
  if (!remove && copy.outerHTML === html) return focusEditorRange(editor, range);
  if (!focusEditorRange(editor, range)) return false;
  editorInput(editor, 'beforeinput');
  if (remove) removeTable(target);
  else {
    table.replaceWith(copy);
    focusEditorRange(editor, atStart(nextCell));
  }
  editorInput(editor, 'input');
  return true;
}

export function moveTableCaret(editor: HTMLElement, backward: boolean) {
  const selection = editor.ownerDocument.getSelection();
  const cell = tableCellAt(editor, selection?.focusNode ?? null);
  const table = cell?.closest('table');
  if (!cell || !table || !selection?.anchorNode || !cell.contains(selection.anchorNode)) return false;
  const cells = Array.from(table.rows).flatMap(row => Array.from(row.cells));
  const next = cells[cells.indexOf(cell) + (backward ? -1 : 1)] ??
    (backward ? table.previousElementSibling : table.nextElementSibling);
  return !!next && focusEditorRange(editor, atStart(next));
}
