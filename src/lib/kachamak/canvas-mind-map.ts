import type {HomeBlock} from './homepage';

export const canAddBranch = (block: HomeBlock | undefined): block is HomeBlock =>
  !!block?.at && !block.columnId && !block.cell && ['note', 'card', 'heading', 'text'].includes(block.layout);

const branchTones = ['teal', 'blue', 'green', 'amber', 'rose'] as const;
type Tone = typeof branchTones[number] | 'violet';

// A mind map uses ordinary cards and connections. Recognize the tree in existing canvases.
export function canvasMindMap(blocks: HomeBlock[]) {
  if (blocks.some(block => block.layout === 'row' || block.layout === 'column')) return;
  const nodes = new Set(blocks.filter(canAddBranch).map(block => block.id));
  const children = new Map<string, string[]>();
  const parents = new Map<string, string>();
  for (const {edge} of blocks) {
    if (!edge || !nodes.has(edge.from) || !nodes.has(edge.to) || parents.has(edge.to)) continue;
    const group = children.get(edge.from) ?? [];
    group.push(edge.to);
    children.set(edge.from, group);
    parents.set(edge.to, edge.from);
  }
  const roots = [...children.keys()].filter(id => !parents.has(id));
  const starter = blocks.length === 1 && blocks[0].title === 'Central idea' && nodes.has(blocks[0].id);
  const root = starter ? blocks[0].id : roots.length === 1 ? roots[0] : undefined;
  if (!root) return;

  const byId = new Map<string, Tone>([[root, 'violet']]);
  (children.get(root) ?? []).forEach((id, branch) => {
    const tone = branchTones[branch % branchTones.length];
    const pending = [id];
    while (pending.length) {
      const next = pending.pop()!;
      if (byId.has(next)) continue;
      byId.set(next, tone);
      for (const child of children.get(next) ?? []) pending.push(child);
    }
  });
  return {root, children, parents, byId};
}

export function mindMapTone(tone: Tone | undefined) {
  return tone ? 'var(--cv-mind-' + tone + ')' : undefined;
}
