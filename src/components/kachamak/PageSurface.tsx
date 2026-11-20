"use client";
import type {ReactNode} from 'react';
import {useKachamak} from '@/lib/kachamak/store';
import {DEFAULT_PAGE_FORMAT,noteAppearance,pageVariables} from '@/lib/kachamak/page-format';
import type {PageFormat} from '@/lib/kachamak/page-format';
import type {NoteNode} from '@/lib/kachamak/types';

export function useTabPageDefaults() {
  const settings=useKachamak(s=>{
    const tab=s.view==='homepage'?'homepage':s.activeTab;
    return tab==='trash'?undefined:s.novels.find(n=>n.id===s.activeNovelId)?.tabFormats?.[tab];
  });
  const font=useKachamak(s=>s.editorFont),size=useKachamak(s=>s.editorSize);
  const spacing=useKachamak(s=>s.editorSpacing),page=useKachamak(s=>s.pageFormat??DEFAULT_PAGE_FORMAT);
  return {defaults:{font,size,spacing,page},settings};
}

export function useNoteAppearance(node?:NoteNode|null) {
  const {defaults,settings}=useTabPageDefaults();
  return noteAppearance(defaults,settings,node);
}

export function PageSurface({children,page,spacing}:{children:ReactNode;page:PageFormat;spacing?:string}) {
  const fallbackSpacing=useKachamak(s=>s.editorSpacing);
  return <div data-document-page data-page-leading={spacing} data-colorize-annotations={page.colorizeAnnotations} data-page-layout={page.layout} data-page-chicago={page.chicago} data-page-spacing={page.paragraphGap===null?'original':'custom'} data-scene-divider={page.divider} className="w-full" style={pageVariables(page,spacing??fallbackSpacing)}>{children}</div>;
}
