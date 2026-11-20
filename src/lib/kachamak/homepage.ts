import { SECTION_KEYS, type SectionKey } from './types';
import { validCoverImage } from './project-settings';

export type HomeLayout = 'card' | 'banner' | 'text';
export type HomeTarget =
  | { kind: 'note'; id: string }
  | { kind: 'tab'; tab: SectionKey }
  | { kind: 'web'; url: string };

export interface HomeBlock {
  id: string;
  layout: HomeLayout;
  width: 'standard' | 'wide' | 'full';
  title: string;
  text: string;
  image?: string;
  target?: HomeTarget;
}
export interface Homepage { locked: boolean; blocks: HomeBlock[] }
export const EMPTY_HOMEPAGE: Homepage = { locked: false, blocks: [] };

export function isWebsite(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); }
  catch { return false; }
}

function validTarget(value: HomeTarget | undefined) {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object') return false;
  switch (value.kind) {
    case 'note': return typeof value.id === 'string' && !!value.id;
    case 'tab': return SECTION_KEYS.includes(value.tab);
    case 'web': return isWebsite(value.url);
    default: return false;
  }
}
function validBlock(block: HomeBlock) {
  return !!block && typeof block.id === 'string' && !!block.id &&
    ['card','banner','text'].includes(block.layout) && ['standard','wide','full'].includes(block.width) &&
    typeof block.title === 'string' && typeof block.text === 'string' &&
    validCoverImage(block.image) && validTarget(block.target);
}
export function validHomepage(value: unknown): boolean {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object') return false;
  const page = value as Homepage;
  return typeof page.locked === 'boolean' && Array.isArray(page.blocks) && page.blocks.every(validBlock)
    && new Set(page.blocks.map(block => block.id)).size === page.blocks.length;
}

export type HomeChange =
  | { type: 'lock'; locked: boolean }
  | { type: 'add'; block: HomeBlock }
  | { type: 'edit'; original: HomeBlock; block: HomeBlock }
  | { type: 'remove'; original: HomeBlock }
  | { type: 'move'; id: string; offset: -1 | 1 };

export function changeHomepage(page: Homepage, action: HomeChange): Homepage | null {
  if (action.type === 'lock') return { ...page, locked: action.locked };
  if (page.locked) return null;
  if (action.type === 'add') {
    if (!validBlock(action.block) || page.blocks.some(b => b.id === action.block.id)) return null;
    return { ...page, blocks: [...page.blocks, action.block] };
  }
  const index = page.blocks.findIndex(b => b.id === (action.type === 'move' ? action.id : action.original.id));
  if (index < 0) return null;
  const blocks = [...page.blocks];
  if (action.type === 'move') {
    const to = index + action.offset;
    if (to < 0 || to >= blocks.length) return null;
    [blocks[index], blocks[to]] = [blocks[to], blocks[index]];
  } else {
    // A remote refresh can replace a block while its editor is open.
    if (JSON.stringify(blocks[index]) !== JSON.stringify(action.original)) return null;
    if (action.type === 'remove') blocks.splice(index, 1);
    else {
      if (action.block.id !== action.original.id || !validBlock(action.block)) return null;
      blocks[index] = action.block;
    }
  }
  return { ...page, blocks };
}
