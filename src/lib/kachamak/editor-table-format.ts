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

export function tableProperties(table: HTMLTableElement): TableProperties {
  const {style} = table;
  return {
    fit: style.width === 'auto' ? 'contents' : style.tableLayout === 'fixed' ? 'fixed' : 'page',
    width: widthPercentage(style.width) ?? 100,
    alignment: style.marginLeft === 'auto' ? style.marginRight === 'auto' ? 'center' : 'right' : 'left',
    borders: table.getAttribute('data-editor-table-borderless') !== 'true',
  };
}

export function setTableProperties(table: HTMLTableElement, properties: TableProperties) {
  const {fit,width,alignment,borders} = properties;
  table.style.width = fit === 'contents' ? 'auto' : width + '%';
  table.style.tableLayout = fit === 'fixed' ? 'fixed' : 'auto';
  table.style.marginLeft = alignment === 'left' ? '0' : 'auto';
  table.style.marginRight = alignment === 'right' ? '0' : 'auto';
  if (borders) table.removeAttribute('data-editor-table-borderless');
  else table.setAttribute('data-editor-table-borderless', 'true');
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
