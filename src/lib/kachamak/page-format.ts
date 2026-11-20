import {PAGE_FONTS,validPageFormat} from './page-format-validation.mjs';
import type {NoteNode,TabKey} from './types';
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
// Sizes are stored in CSS pixels. In the note editor 12 CSS pixels are 9 typographic points.
export const NOTE_BODY_SIZE = 12;
export const NOTE_FONT_SIZES = [8, NOTE_BODY_SIZE, 14, 16, 18, 20, 24];
export function noteSizeLabel(pixels:number) {
  return `${Number((pixels * .75).toFixed(2))} pt`;
}
export const validNoteFontSize = (size: unknown) => size === undefined || typeof size === 'number' && NOTE_FONT_SIZES.includes(size);
export type PageFormat={indent:0|1|1.5|2;chicago:boolean;paragraphGap:0|0.5|1|1.5|null;width:36|48|60|72|'full';align:'left'|'justify';divider:'line'|'dots'|'asterisks'|'space';layout:'centered'|'fit'|'stacked';colorizeAnnotations:boolean};
export const DEFAULT_PAGE_FORMAT:PageFormat={indent:0,chicago:true,paragraphGap:null,width:48,align:'left',divider:'line',layout:'centered',colorizeAnnotations:true};
export type EditorAppearance={font:string;size:number;spacing:string;page:PageFormat;spellCheck?:boolean};
export const DEFAULT_EDITOR_APPEARANCE:EditorAppearance={font:'Segoe UI',size:16,spacing:'1.5',page:DEFAULT_PAGE_FORMAT,spellCheck:true};
export type FormatTab = Exclude<TabKey,'trash'> | 'homepage';
export type TabPageSettings = {font?:string;size?:number;spacing?:string;page?:Partial<PageFormat>};

export function validTabPageSettings(value:unknown):value is TabPageSettings {
  if(!value || typeof value!=='object' || Array.isArray(value))return false;
  const {font,size,spacing,page}=value as TabPageSettings;
  return Object.keys(value).every(k=>['font','size','spacing','page'].includes(k)) &&
    (font===undefined || PAGE_FONTS.includes(font)) && validNoteFontSize(size) &&
    (spacing===undefined || LINE_SPACINGS.includes(spacing)) &&
    (page===undefined || (!!page && typeof page==='object' && !Array.isArray(page) &&
      Object.keys(page).every(k=>Object.hasOwn(DEFAULT_PAGE_FORMAT,k)) && validPageFormat({...DEFAULT_PAGE_FORMAT,...page})));
}

// A tab overrides only the individual properties the writer has chosen there.
export function noteAppearance(defaults:Pick<EditorAppearance,'spacing'|'page'>,tab?:TabPageSettings,node?:NoteNode|null) {
  const local=node?.pageSettings;
  const explicitSpacing=tab?.spacing??local?.spacing;
  return {
    font:tab?.font??local?.font??'Tahoma',
    // Earlier versions automatically stamped new notes with 8px.
    size:tab?.size??(node?.bodyFontSize===8?undefined:node?.bodyFontSize)??NOTE_BODY_SIZE,
    spacing:explicitSpacing??defaults.spacing,
    explicitSpacing,
    page:{...(local?.page??defaults.page),...tab?.page}
  };
}
export function noteTypography(font:string,size:number,spacing:string):CSSProperties {
  return {fontFamily:`'${font}', Arial, sans-serif`,fontSize:size,lineHeight:spacing,'--note-body-size':`${size}px`} as CSSProperties;
}
export function pageVariables(page:PageFormat,spacing?:string):CSSProperties {
  return {'--page-leading':spacing,'--page-width':page.width==='full'?'100%':`${page.width}rem`,'--page-indent':`${page.indent}em`,'--page-gap':`${page.paragraphGap??0}em`,'--page-align':page.align} as CSSProperties;
}
