import {PAGE_FONTS,validPageFormat} from './page-format-validation.mjs';
import type {CSSProperties} from 'react';
export {PAGE_FONTS,validPageFormat,validEditorAppearance} from './page-format-validation.mjs';
export const LINE_SPACINGS = ['1.0','1.15','1.5','2.0'];
export type NotePageSettings = {font?:string;spacing?:string;page?:PageFormat};
export function validNotePageSettings(value:unknown):boolean {
  if(value===undefined)return true;
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const {font,spacing,page}=value as NotePageSettings;
  return (font===undefined||PAGE_FONTS.includes(font))&&(spacing===undefined||LINE_SPACINGS.includes(spacing))&&(page===undefined||validPageFormat(page));
}
export const NOTE_FONT_SIZES = [8, 12, 14, 16, 18, 20, 24];
export const validNoteFontSize = (size: unknown) => size === undefined || typeof size === 'number' && NOTE_FONT_SIZES.includes(size);
export type PageFormat={indent:0|1|1.5|2;chicago:boolean;paragraphGap:0|0.5|1|1.5|null;width:36|48|60|72|'full';align:'left'|'justify';divider:'line'|'dots'|'asterisks'|'space';layout:'centered'|'fit'|'stacked';colorizeAnnotations:boolean};
export const DEFAULT_PAGE_FORMAT:PageFormat={indent:0,chicago:true,paragraphGap:null,width:48,align:'left',divider:'line',layout:'centered',colorizeAnnotations:true};
export type EditorAppearance={font:string;size:number;spacing:string;page:PageFormat;spellCheck?:boolean};
export const DEFAULT_EDITOR_APPEARANCE:EditorAppearance={font:'Segoe UI',size:16,spacing:'1.5',page:DEFAULT_PAGE_FORMAT,spellCheck:true};
export function pageVariables(page:PageFormat,spacing?:string):CSSProperties {
  return {'--page-leading':spacing,'--page-width':page.width==='full'?'100%':`${page.width}rem`,'--page-indent':`${page.indent}em`,'--page-gap':`${page.paragraphGap??0}em`,'--page-align':page.align} as CSSProperties;
}
