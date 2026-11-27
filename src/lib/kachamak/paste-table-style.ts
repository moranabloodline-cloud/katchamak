export const pastedTableStyleAttribute='data-draftopus-table-style';

export function copiedTableStyle(element: Element) {
  const saved=element.getAttribute(pastedTableStyleAttribute);
  if (saved==='rows' || saved==='source') return saved;
  if (element.matches('table[data-d-dividers],[data-d-component="table"]')) return 'rows';
}

export function applyPastedTableStyle(table: HTMLTableElement) {
  if (copiedTableStyle(table)) return;
  const rowTable=table.parentElement?.getAttribute(pastedTableStyleAttribute)==='rows';
  table.setAttribute(pastedTableStyleAttribute,rowTable ? 'rows' : 'source');
}
