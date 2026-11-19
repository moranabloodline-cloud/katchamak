import type {CSSProperties} from 'react';
export {PAGE_FONTS,validPageFormat,validEditorAppearance} from './page-format-validation.mjs';
export const NOTE_FONT_SIZES = [8, 12, 14, 16, 18, 20, 24];
export const validNoteFontSize = (size: unknown) => size === undefined || typeof size === 'number' && NOTE_FONT_SIZES.includes(size);
export type PageFormat={indent:0|1|1.5|2;chicago:boolean;paragraphGap:0|0.5|1|1.5|null;width:36|48|60|72|'full';align:'left'|'justify';divider:'line'|'dots'|'asterisks'|'space';layout:'centered'|'fit'|'stacked';colorizeAnnotations:boolean};
export const DEFAULT_PAGE_FORMAT:PageFormat={indent:0,chicago:true,paragraphGap:null,width:48,align:'left',divider:'line',layout:'centered',colorizeAnnotations:true};
export type EditorAppearance={font:string;size:number;spacing:string;page:PageFormat;spellCheck?:boolean};
export const DEFAULT_EDITOR_APPEARANCE:EditorAppearance={font:'Segoe UI',size:16,spacing:'1.5',page:DEFAULT_PAGE_FORMAT,spellCheck:true};
export function pageVariables(page:PageFormat):CSSProperties {
  return {'--page-width':page.width==='full'?'100%':`${page.width}rem`,'--page-indent':`${page.indent}em`,'--page-gap':`${page.paragraphGap??0}em`,'--page-align':page.align} as CSSProperties;
}
