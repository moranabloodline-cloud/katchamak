const layoutAttribute = 'data-draftopus-layout';
const columnsAttribute = 'data-draftopus-columns';
const layouts = ['grid', 'card', 'callout', 'caption', 'table', 'bar'];

export const pastedLayoutAttributes = [layoutAttribute, columnsAttribute, 'data-editor-line-height', 'width', 'height', 'scope', 'alt'];

function sourceLength(value: string, maxPixels: number, maxPercent = 0): string {
  if (value === '0' || value === '0px') return '0px';
  const match = /^(\d+(?:\.\d+)?|\.\d+)(px|pt|em|rem|%)$/i.exec(value.trim());
  if (!match) return '';
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === '%') return amount <= maxPercent ? amount + '%' : '';
  const pixels = amount * (unit === 'pt' ? 4 / 3 : unit === 'px' ? 1 : 16);
  return pixels <= maxPixels ? amount + unit : '';
}

export function pastedImageSize(element: Element) {
  const style = (element as HTMLElement).style;
  const width = Number(element.getAttribute('width'));
  const height = Number(element.getAttribute('height'));
  return {
    width: width > 0 && width <= 8192 ? Math.round(width) : undefined,
    height: height > 0 && height <= 8192 ? Math.round(height) : undefined,
    cssWidth: sourceLength(style?.width || '', 2400, 100),
    alignment: style?.float || element.getAttribute('align') || '',
  };
}

function gridColumns(style: CSSStyleDeclaration, children: number) {
  if (!style.gridTemplateColumns || style.gridTemplateColumns === 'none') return Math.min(children, 3);
  const repeated = /^repeat\(\s*([2-6])\s*,/.exec(style.gridTemplateColumns);
  if (repeated) return Number(repeated[1]);
  const tracks = style.gridTemplateColumns.replace(/\([^)]*\)/g, '').trim().split(/\s+/).length;
  return Math.min(children, tracks > 1 ? tracks : 3, 6);
}

function layoutOf(element: HTMLElement, style: CSSStyleDeclaration) {
  const native = element.getAttribute(layoutAttribute);
  if (native && layouts.includes(native)) {
    const columns = Number(element.getAttribute(columnsAttribute));
    return { kind: native, columns: Number.isInteger(columns) && columns >= 2 && columns <= 6 ? columns : undefined };
  }
  const component = element.getAttribute('data-d-component');
  const children = Array.from(element.children).filter(child => !child.matches('style,[hidden],[aria-hidden="true"]'));
  if (component === 'grid-item') return { kind: 'card' };
  if (component === 'caption' && !element.closest('p,th,td')) return { kind: 'caption' };
  if (element.matches('aside,[role="note"],[role="alert"]')) return { kind: 'callout' };
  if (element.matches('div,section,article') && children.length > 1) {
    if (component === 'grid' || /^(?:inline-)?grid$/.test(style.display) || style.gridTemplateColumns) {
      return { kind: 'grid', columns: gridColumns(style, children.length) };
    }
    if (/^(?:inline-)?flex$/.test(style.display) && !style.flexDirection.startsWith('column') &&
      children.length <= 6 && children.every(child => child.matches('div,section,article,figure,p,img'))) {
      return { kind: 'grid', columns: children.length };
    }
  }
  if (element.matches('div,span') && !children.length && !element.textContent?.trim() &&
    style.backgroundColor && sourceLength(style.height, 32) && /^\d+(?:\.\d+)?%$/.test(style.width) &&
    sourceLength(style.width, 0, 100)) return { kind: 'bar' };
}

/** Preserve supported dimensions and layout tokens using the destination theme. */
export function pastedEditorialFormat(element: HTMLElement, declarations: string) {
  const source = element.ownerDocument.createElement('span').style;
  const style = element.ownerDocument.createElement('span').style;
  const attributes: Record<string, string> = {};
  source.cssText = declarations.replace(/^\s*;+/, '').trim();
  const layout = layoutOf(element, source);
  if (layout) {
    attributes[layoutAttribute] = layout.kind;
    if (layout.columns) attributes[columnsAttribute] = String(layout.columns);
  }
  if (['left', 'center', 'right', 'justify', 'start', 'end'].includes(source.textAlign)) style.textAlign = source.textAlign;
  if (element.matches('p,div,blockquote,li,td,th,pre,h1,h2,h3,h4,h5,h6')) {
    const leading = Number(source.lineHeight);
    if ((leading >= .9 && leading <= 3) || (source.lineHeight !== '0px' && sourceLength(source.lineHeight, 64, 300))) {
      style.lineHeight = source.lineHeight;
      attributes['data-editor-line-height'] = '';
    }
  }
  if (element.matches('table,td,th') || layout?.kind === 'bar') {
    style.width = sourceLength(source.width || element.getAttribute('width')?.replace(/^\d+$/, '$&px') || '', 2400, 100);
  }
  if (element.matches('td,th')) {
    for (const side of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const) {
      style[side] = sourceLength(source[side], 24);
    }
  }
  if (element.matches('th')) {
    const scope = element.getAttribute('scope');
    if (scope && ['row', 'col', 'rowgroup', 'colgroup'].includes(scope)) attributes.scope = scope;
  }
  return { css: style.cssText, attributes };
}

export function pastedProgress(source: Element) {
  const min = Number(source.getAttribute('min') || 0);
  const max = Number(source.getAttribute('max') || source.getAttribute('aria-valuemax') || 1);
  const value = Number(source.getAttribute('value') ?? source.getAttribute('aria-valuenow'));
  if (!source.hasAttribute('value') && !source.hasAttribute('aria-valuenow') ||
      ![value,min,max].every(Number.isFinite) || max <= min || value < min || value > max)return;
  const doc = source.ownerDocument;
  const container = doc.createElement('div'), label = doc.createElement('p'), bar = doc.createElement('div');
  label.textContent = source.getAttribute('aria-valuetext') || source.textContent?.trim() || (source.getAttribute('aria-label') ? source.getAttribute('aria-label') + ' · ' : '') + value + ' / ' + max;
  bar.setAttribute(layoutAttribute,'bar');
  bar.style.width = ((value-min) / (max-min) * 100).toFixed(2) + '%';
  container.append(label,bar);
  return container;
}

// The table editor owns column mutations. Carry width hints into cells so a
// pasted colgroup cannot become misaligned after inserting or deleting a column.
export function transferPastedColumnWidths(root: ParentNode) {
  for (const table of root.querySelectorAll('table')) {
    const columns = Array.from(table.querySelectorAll<HTMLTableColElement>(':scope > colgroup > col'));
    const firstRow = table.rows[0];
    if (!columns.length || !firstRow) continue;
    let index = 0, remaining = columns[0].span;
    for (const cell of Array.from(firstRow.cells)) {
      const column = columns[index];
      if (!column) break;
      if (cell.colSpan === 1 && !cell.style.width && !cell.hasAttribute('width')) {
        const width = column.style.width || column.getAttribute('width')?.replace(/^\d+$/, '$&px') || '';
        cell.style.width = sourceLength(width, 2400, 100);
      }
      remaining -= cell.colSpan;
      while (remaining <= 0 && ++index < columns.length) remaining += columns[index].span;
    }
  }
}

export function finishPastedEditorialLayout(root: ParentNode) {
  for (const table of root.querySelectorAll('table')) {
    if (table.parentElement?.getAttribute(layoutAttribute) === 'table' || table.closest('td,th')) continue;
    const container = table.ownerDocument.createElement('div');
    container.setAttribute(layoutAttribute, 'table');
    table.replaceWith(container);
    container.append(table);
  }
}
