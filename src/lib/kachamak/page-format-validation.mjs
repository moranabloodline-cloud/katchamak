export const PAGE_FONTS=['Segoe UI','Arial','Calibri','Cambria','Georgia','Garamond','Palatino Linotype','Times New Roman','Courier New','Verdana','EB Garamond','Literata'];
export const validPageFormat=value=>!!value && typeof value==='object' &&
  [0,1,1.5,2].includes(value.indent) && typeof value.chicago==='boolean' &&
  [null,0,0.5,1,1.5].includes(value.paragraphGap) && [36,48,60,72,'full'].includes(value.width) &&
  ['left','justify'].includes(value.align) && ['line','dots','asterisks','space'].includes(value.divider) &&
  ['centered','fit','stacked'].includes(value.layout) && typeof value.colorizeAnnotations==='boolean';
export const validEditorAppearance=value=>!!value && PAGE_FONTS.includes(value.font) &&
  [12,14,16,18,20,24].includes(value.size) && ['1.0','1.15','1.5','2.0'].includes(value.spacing) && validPageFormat(value.page) &&
  (value.spellCheck===undefined||typeof value.spellCheck==='boolean');
