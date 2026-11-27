import {directImageLink} from './editor-media';

const layoutAttribute = 'data-draftopus-layout';
const columnsAttribute = 'data-draftopus-columns';
const layouts = ['grid', 'card', 'callout', 'caption', 'table', 'bar', 'metric', 'chart', 'chart-row', 'chart-label', 'bar-track', 'photo-row', 'citation'];
export const pastedDocumentAttribute = 'data-draftopus-paste';

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
  if (component === 'badge' && element.closest('[data-d-component="popover-trigger"]')) return { kind: 'citation' };
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

const textOf = (element: Element | null | undefined) => element?.textContent?.trim() ?? '';
const blockHeadings = 'h1,h2,h3,h4,h5,h6';
const metricValue = /^(?:[€$£¥]\s*)?[+-]?\d(?:[\d.,\s]*\d)?(?:\s*[%€$£¥]|\s+[\p{L}²³]+(?:\s+[\p{L}²³]+)?)?$/u;
const markLayout = (element: Element, layout: string) => element.setAttribute(layoutAttribute, layout);

function metricCard(card: Element) {
  const [label, value, detail] = Array.from(card.children);
  const number = textOf(value);
  return card.matches('div') && card.childElementCount <= 3 && label?.matches('span') &&
    value?.matches(blockHeadings) && (!detail || detail.matches('span')) &&
    !!textOf(label) && number.length <= 40 && metricValue.test(number);
}

function photoRow([photo, description]: Element[]) {
  if (!photo.matches('div,figure') || !description.matches('div') ||
    photo.querySelector('p,figcaption,table,'+blockHeadings) || description.childElementCount !== 2) return false;
  const [title, caption] = Array.from(description.children);
  const emphasis = title.querySelector('strong,b');
  if (!title.matches('p') || !caption.matches('p') || !emphasis || !textOf(emphasis) ||
    textOf(title) !== textOf(emphasis) || !textOf(caption) || description.querySelector('img,table')) return false;
  const images=photo.querySelectorAll('img');
  if (images.length) return images.length===1;
  const links=Array.from(photo.querySelectorAll('a[href]'));
  return links.length > 0 && links.length <= 2 &&
    links.filter(link=>directImageLink(link.getAttribute('href'))).length===1;
}

function chartRow(row: Element) {
  const [labels, track] = Array.from(row.children);
  if (!row.matches('div') || row.childElementCount > 2 || !labels?.matches('div') ||
    labels.childElementCount !== 2) return;
  const [name, value] = Array.from(labels.children);
  if (!name.matches('p') || !value.matches('p') || !textOf(name) || !textOf(value) ||
    labels.querySelector('img,table,br')) return;
  const bar = track?.firstElementChild as HTMLElement | null | undefined;
  if (track && (!track.matches('div') || track.childElementCount !== 1 ||
    bar?.getAttribute(layoutAttribute) !== 'bar' || !bar.style.width)) return;
  return { row, labels, value: textOf(value), track, bar };
}

function chartNumber(value: string) {
  if (value.length > 32) return;
  const match = /^([€$£¥])?\s*((?:\d{1,3}(?:[,\s]\d{3})+|\d+)(?:\.\d+)?)\s*([%€$£¥])?$/.exec(value);
  if (!match || (match[1] && match[3])) return;
  const number = Number(match[2].replace(/[,\s]/g, ''));
  if (Number.isFinite(number)) return { number, unit: match[1] || match[3] || '' };
}

function inferredWidths(group: Element, values: string[]) {
  // Legacy clipboard HTML retained both columns of text while dropping the
  // decorative track. Require a heading and repeated, comparable values.
  const title = group.previousElementSibling;
  const emphasis = title?.querySelector('strong,b');
  if (values.length < 3 || !title || (!title.matches(blockHeadings) &&
    (!title.matches('p') || !emphasis || textOf(title) !== textOf(emphasis)))) return;
  const numbers = values.map(chartNumber);
  const first = numbers[0];
  if (!first || !numbers.every((value): value is NonNullable<typeof value> => !!value && value.unit===first.unit)) return;
  const peak = Math.max(...numbers.map(value=>value.number));
  const step = peak ? 10 ** (Math.floor(Math.log10(peak)) - 1) : 1;
  const bound = first.unit==='%' && peak<=100 ? 100 : Math.max(step, Math.ceil(peak * 1.05 / step) * step);
  return numbers.map(value => (value.number / bound * 100).toFixed(4) + '%');
}

function formatChart(group: Element, children: Element[]) {
  if (children.length > 32) return;
  const rows = children.map(chartRow);
  if (!rows.every((row): row is NonNullable<typeof row> => !!row)) return;
  const preserved = rows.every(row=>row.bar);
  const widths = !preserved && rows.every(row=>!row.track) ? inferredWidths(group,rows.map(row=>row.value)) : undefined;
  if (!preserved && !widths) return;
  markLayout(group,'chart');
  for (const [index,row] of rows.entries()) {
    markLayout(row.row,'chart-row');
    markLayout(row.labels,'chart-label');
    const track = row.track ?? group.ownerDocument.createElement('div');
    markLayout(track,'bar-track');
    if (!row.track && widths) {
      const bar = group.ownerDocument.createElement('div');
      markLayout(bar,'bar');
      bar.style.width = widths[index];
      track.append(bar);
      row.row.append(track);
    }
  }
  const following = group.nextElementSibling;
  const citation = following?.matches('p') ? following.nextElementSibling : following;
  if (citation?.matches('div') && citation.childElementCount===2 &&
    Array.from(citation.children).every(child=>child.matches('span')) &&
    /^\+\d{1,2}$/.test(textOf(citation.lastElementChild))) markLayout(citation,'citation');
}

/** Restore report blocks from clipboard structure without rewriting their text. */
export function formatPastedReports(root: ParentNode) {
  for (const group of root.querySelectorAll('['+pastedDocumentAttribute+'] div')) {
    const current = group.getAttribute(layoutAttribute);
    if (group.childElementCount < 2 || (current && current!=='grid') || group.closest('pre,code,table')) continue;
    const children = Array.from(group.children);
    if (children.length <= 6 && children.every(metricCard)) {
      markLayout(group,'grid');
      group.setAttribute(columnsAttribute,String(children.length));
      children.forEach(child=>markLayout(child,'metric'));
      const caption=group.nextElementSibling;
      if (caption?.matches('span')) markLayout(caption,'caption');
    } else if (children.length===2 && photoRow(children)) {
      markLayout(group,'photo-row');
    } else {
      formatChart(group,children);
    }
  }
}
