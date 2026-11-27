import {pastedTableStyleAttribute} from './paste-table-style';

export const tableFits = ['contents', 'page', 'fixed'] as const;
export const tableAlignments = ['left', 'center', 'right'] as const;
export const cellVerticalAlignments = ['top', 'middle', 'bottom'] as const;

export type TableFit = typeof tableFits[number];
export type TableAlignment = typeof tableAlignments[number];
export type CellVerticalAlignment = typeof cellVerticalAlignments[number];
export type TableProperties = {fit: TableFit; width: number; alignment: TableAlignment; borders: boolean};

function widthPercentage(value: string) {
  if (!/^\d+(?:\.\d+)?%$/.test(value)) return;
  const width = Number(value.slice(0, -1));
  if (width >= 1 && width <= 100) return width;
}

function containsTableBorders(table: HTMLTableElement) {
  if (table.getAttribute(pastedTableStyleAttribute) !== 'source' || Number(table.getAttribute('border')) > 0) return true;
  const elements = [table, ...table.querySelectorAll<HTMLElement>(
    ':scope > :is(thead,tbody,tfoot)[style], :scope > :is(thead,tbody,tfoot) > tr[style], ' +
    ':scope > :is(thead,tbody,tfoot) > tr > :is(td,th)[style]'
  )];
  return elements.some(({style}) => ['top','right','bottom','left','block-start','block-end','inline-start','inline-end'].some(side => {
    const line = style.getPropertyValue('border-'+side+'-style');
    return line && line !== 'none' && line !== 'hidden' && style.getPropertyValue('border-'+side+'-width') !== '0px';
  }));
}

export function tableProperties(table: HTMLTableElement): TableProperties {
  const {style} = table;
  const fitContents = style.width === 'auto' || !style.width && table.getAttribute(pastedTableStyleAttribute) === 'source';
  const borderless = table.getAttribute('data-editor-table-borderless');
  return {
    fit: fitContents ? 'contents' : style.tableLayout === 'fixed' ? 'fixed' : 'page',
    width: widthPercentage(style.width) ?? 100,
    alignment: style.marginLeft === 'auto' ? style.marginRight === 'auto' ? 'center' : 'right' : 'left',
    borders: borderless === null ? containsTableBorders(table) : borderless !== 'true',
  };
}

export function setTableProperties(table: HTMLTableElement, properties: TableProperties) {
  const {fit,width,alignment,borders} = properties;
  table.style.width = fit === 'contents' ? 'auto' : width + '%';
  table.style.tableLayout = fit === 'fixed' ? 'fixed' : 'auto';
  table.style.marginLeft = alignment === 'left' ? '0' : 'auto';
  table.style.marginRight = alignment === 'right' ? '0' : 'auto';
  if (borders === tableProperties(table).borders) return;
  if (!borders) table.setAttribute('data-editor-table-borderless', 'true');
  else if (containsTableBorders(table)) table.removeAttribute('data-editor-table-borderless');
  else table.setAttribute('data-editor-table-borderless', 'false');
}

// Keep supported table formatting when the publication strips source typography.
export function tableFormatting(element: HTMLElement) {
  const clean = element.ownerDocument.createElement('span').style;
  const style = element.style;
  if (element.tagName === 'TABLE') {
    if (style.width === 'auto' || widthPercentage(style.width)) clean.width = style.width;
    if (style.tableLayout === 'auto' || style.tableLayout === 'fixed') clean.tableLayout = style.tableLayout;
    for (const side of ['marginLeft', 'marginRight'] as const) {
      if (style[side] === '0px' || style[side] === 'auto') clean[side] = style[side];
    }
  } else if (element.matches('th,td')) {
    if (tableAlignments.some(value => value === style.textAlign)) clean.textAlign = style.textAlign;
    if (cellVerticalAlignments.some(value => value === style.verticalAlign)) clean.verticalAlign = style.verticalAlign;
  }
  return clean.cssText;
}
