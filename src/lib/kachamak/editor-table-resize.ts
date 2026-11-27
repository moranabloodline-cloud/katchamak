import {captureTableCell, editEditorTable, tableCellAt, type TableCellTarget} from './editor-tables';

type Axis = 'column' | 'row';

export function bindTableResize(editor: HTMLElement) {
  const doc = editor.ownerDocument;
  const guide = doc.createElement('div');
  guide.setAttribute('aria-hidden','true');
  guide.style.cssText = 'position:fixed;pointer-events:none;z-index:1000;background:#dcb564;display:none';
  let drag: {target:TableCellTarget; axis:Axis; pointer:number; start:number; edge:number; scale:number} | undefined;

  function edgeAt(event: PointerEvent) {
    const cell = tableCellAt(editor,event.target as Node);
    const table = cell?.closest('table');
    if (!cell || !table) return;
    const box = cell.getBoundingClientRect();
    const right = Math.abs(box.right - event.clientX);
    const bottom = Math.abs(box.bottom - event.clientY);
    if (Math.min(right,bottom) > 5) return;
    const axis: Axis = right <= bottom ? 'column' : 'row';
    return {cell,table,axis,edge:axis === 'column' ? box.right : box.bottom};
  }

  function hide() {
    guide.style.display = 'none';
    editor.style.removeProperty('cursor');
  }

  function show(table: HTMLTableElement, axis: Axis, edge: number) {
    const box = table.getBoundingClientRect();
    if (!guide.isConnected) doc.body.append(guide);
    const column = axis === 'column';
    Object.assign(guide.style,{
      display:'block', left:(column ? edge-1 : box.left)+'px', top:(column ? box.top : edge-1)+'px',
      width:(column ? 2 : box.width)+'px', height:(column ? box.height : 2)+'px',
    });
    editor.style.cursor = column ? 'col-resize' : 'row-resize';
  }

  const coordinate = (event: PointerEvent, axis: Axis) => axis === 'column' ? event.clientX : event.clientY;
  function move(event: PointerEvent) {
    if (drag) {
      if (drag.pointer === event.pointerId) show(drag.target.table,drag.axis,drag.edge+coordinate(event,drag.axis)-drag.start);
      return;
    }
    const edge = event.buttons === 0 ? edgeAt(event) : undefined;
    if (edge) show(edge.table,edge.axis,edge.edge);
    else hide();
  }

  function start(event: PointerEvent) {
    if (event.button !== 0 || drag) return;
    const edge = edgeAt(event);
    if (!edge) return;
    const target = captureTableCell(editor,edge.cell);
    const scale = edge.table.getBoundingClientRect().width / edge.table.offsetWidth;
    if (!target || !Number.isFinite(scale) || scale <= 0) return;
    event.preventDefault();
    editor.setPointerCapture(event.pointerId);
    drag = {target,axis:edge.axis,edge:edge.edge,scale,pointer:event.pointerId,start:coordinate(event,edge.axis)};
    show(edge.table,edge.axis,edge.edge);
  }

  function finish(event: PointerEvent) {
    if (drag?.pointer !== event.pointerId) return;
    const current = drag;
    drag = undefined;
    hide();
    if (event.type === 'pointerup') editEditorTable(current.target,{
      type:'resize',axis:current.axis,scale:current.scale,delta:coordinate(event,current.axis)-current.start,
    });
  }

  const leave = () => { if (!drag) hide(); };
  editor.addEventListener('pointermove',move);
  editor.addEventListener('pointerdown',start);
  editor.addEventListener('pointerleave',leave);
  editor.addEventListener('pointerup',finish);
  editor.addEventListener('pointercancel',finish);
  editor.addEventListener('lostpointercapture',finish);
  doc.addEventListener('scroll',hide,true);
  return () => {
    if (drag && editor.hasPointerCapture(drag.pointer)) editor.releasePointerCapture(drag.pointer);
    editor.removeEventListener('pointermove',move);
    editor.removeEventListener('pointerdown',start);
    editor.removeEventListener('pointerleave',leave);
    editor.removeEventListener('pointerup',finish);
    editor.removeEventListener('pointercancel',finish);
    editor.removeEventListener('lostpointercapture',finish);
    doc.removeEventListener('scroll',hide,true);
    hide();
    guide.remove();
  };
}
