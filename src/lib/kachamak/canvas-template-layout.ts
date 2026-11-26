import type {HomeBlock, HomeLink} from './homepage';
import {availableProjectImage, validProjectImage} from './project-image';
import type {Novel, SectionKey} from './types';
import {uid} from './utils';

export type TemplateBlock = Omit<HomeBlock, 'id' | 'width' | 'cell'>;

export function row(title: string, ...columns: TemplateBlock[][]): HomeBlock[] {
  const rowId = uid();
  return [
    {id:rowId, layout:'row', width:'full', title, text:'', columns:columns.length},
    ...columns.flatMap((blocks, column) => blocks.map(block => ({
      ...block, id:uid(), width:'full' as const, cell:{rowId,column},
    }))),
  ];
}

export function tabLink(label: string, tab: SectionKey): HomeLink {
  return {id:uid(), label, target:{kind:'tab',tab}};
}

export function imageFor(book: Novel, image: string | undefined) {
  return image && validProjectImage(image) && availableProjectImage(book.gallery,image) ? image : undefined;
}
