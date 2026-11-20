"use client";
import type {ReactNode} from 'react';
import {useKachamak} from '@/lib/kachamak/store';
import {DEFAULT_PAGE_FORMAT,pageVariables} from '@/lib/kachamak/page-format';
import type {PageFormat} from '@/lib/kachamak/page-format';
import type {NoteNode} from '@/lib/kachamak/types';

export function useNoteAppearance(node?:NoteNode|null) {
  const font=useKachamak(s=>node?.pageSettings?.font??s.editorFont);
  const size=useKachamak(s=>node?.bodyFontSize??s.editorSize);
  const spacing=useKachamak(s=>node?.pageSettings?.spacing??s.editorSpacing);
  const page=useKachamak(s=>node?.pageSettings?.page??s.pageFormat??DEFAULT_PAGE_FORMAT);
  return {font,size,spacing,page};
}

export function PageSurface({children,page,spacing}:{children:ReactNode;page:PageFormat;spacing?:string}) {
  const fallbackSpacing=useKachamak(s=>s.editorSpacing);
  return <div data-document-page data-page-leading={spacing} data-colorize-annotations={page.colorizeAnnotations} data-page-layout={page.layout} data-page-chicago={page.chicago} data-page-spacing={page.paragraphGap===null?'original':'custom'} data-scene-divider={page.divider} className="w-full" style={pageVariables(page,spacing??fallbackSpacing)}>{children}</div>;
}
