"use client";
import type {ReactNode} from 'react';
import {useKachamak} from '@/lib/kachamak/store';
import {DEFAULT_PAGE_FORMAT,pageVariables} from '@/lib/kachamak/page-format';
export function PageSurface({children}:{children:ReactNode}) {
  const page=useKachamak(s=>s.pageFormat??DEFAULT_PAGE_FORMAT);
  return <div data-document-page data-colorize-annotations={page.colorizeAnnotations} data-page-layout={page.layout} data-page-chicago={page.chicago} data-page-spacing={page.paragraphGap===null?'original':'custom'} data-scene-divider={page.divider} className="w-full" style={pageVariables(page)}>{children}</div>;
}
