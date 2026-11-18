import type { NoteNode, Novel, SectionKey, TabKey } from './types';
import { ancestorIds, findNodeInNovel, forEachNode, uid } from './utils';
import { workspaceTabs } from './workspace-tabs';
import { removeUnavailableNoteLinks } from './link-review';

export function cloneableWorkspaceTabs(novel: Novel) {
  return workspaceTabs(novel).filter(({key}) => {
    if (key === 'timeline' || key === 'trash') return false;
    return !key.startsWith('note:') || findNodeInNovel(novel, key.slice(5))?.section !== 'timeline';
  });
}

function tabLocation(novel: Novel, key: TabKey) {
  if (!cloneableWorkspaceTabs(novel).some(tab => tab.key === key)) return null;
  if (key.startsWith('note:')) return findNodeInNovel(novel, key.slice(5));
  return { section: key as SectionKey, node: null };
}

// HTML is parsed in an inert template. Copy only project-local references
// whose targets are part of this batch; retain their visible text otherwise.
function remapHtml(html: string, ids: ReadonlyMap<string, string>, unwrap: boolean) {
  if (!/data-katchamak-note|#note\//i.test(html)) return html;
  const template = document.createElement('template');
  template.innerHTML = html;
  for (const element of template.content.querySelectorAll('[data-katchamak-note], a[href^="#note/"]')) {
    const id = element.getAttribute('data-katchamak-note');
    if (id !== null) {
      const target = ids.get(id);
      if (target) element.setAttribute('data-katchamak-note', target);
      else element.removeAttribute('data-katchamak-note');
    }
    const href = element.getAttribute('href');
    if (element.tagName !== 'A' || !href?.startsWith('#note/')) continue;
    const target = ids.get(href.slice(6));
    if (target) element.setAttribute('href', '#note/' + target);
    else if (unwrap) element.replaceWith(...element.childNodes);
  }
  return template.innerHTML;
}

export function cloneWorkspaceTab(source: Novel, sourceTab: TabKey, destination: Novel, destinationTab: TabKey) {
  if (source.id === destination.id || destination.archived) throw new Error('Choose a different active project.');
  const from = tabLocation(source, sourceTab);
  const to = tabLocation(destination, destinationTab);
  if (!from || !to) throw new Error('One of the selected tabs is no longer available.');
  const roots = from.node ? [from.node] : source.sections[from.section];
  if (!roots.length) throw new Error('This tab has no notes to copy.');
  const destinationRoots = destination.sections[to.section];
  const parentId = to.node?.id;
  const siblings = to.node?.children ?? destinationRoots;
  const sortThis = siblings.find(node => node.title === 'Sort This' && !node.hidden);
  const path = parentId ? ancestorIds(destinationRoots, parentId) : [];
  const wrapperDepth = parentId ? path.length + 1 : 0;
  const ancestors = new Set(path);
  const ids = new Map<string, string>();
  forEachNode(roots, node => ids.set(node.id, uid()));
  const targets = new Set(ids.values());
  const now = Date.now();
  const statuses = new Set(destination.statuses);
  const copy = (original: NoteNode, depth: number): NoteNode => {
    // The existing cloud reader requires even the final empty child list to be below depth 100.
    if (depth >= 99) throw new Error('The copied notes would be nested too deeply. Choose a higher-level destination tab.');
    const node = structuredClone({ ...original, children: [] });
    if (node.status) statuses.add(node.status);
    const content = remapHtml(node.content ?? '', ids, false);
    const linkChoices = node.linkChoices?.flatMap(choice => {
      const targetId = choice.targetId && ids.get(choice.targetId);
      return targetId ? [{...choice, targetId}] : [];
    });
    const repaired = content.includes('#note/')
      ? removeUnavailableNoteLinks({content, linkChoices}, targets)
      : {content, linkChoices};
    return {
      ...node, id: ids.get(original.id)!, createdAt: now, updatedAt: now,
      content: repaired.content, linkChoices: repaired.linkChoices,
      synopsis: remapHtml(node.synopsis ?? '', ids, true),
      notes: remapHtml(node.notes ?? '', ids, true),
      links: Array.isArray(node.links) ? node.links.flatMap(id => ids.get(id) ?? []) : undefined,
      children: original.children.map(child => copy(child, depth + 1)),
    };
  };
  const copies = roots.map(node => copy(node, wrapperDepth + 1));
  const inbox: NoteNode = sortThis
    ? {...sortThis, collapsed: false, updatedAt: now, children: [...sortThis.children, ...copies]}
    : {id: uid(), title: 'Sort This', kind: 'doc', icon: 'folder', content: '', synopsis: '', notes: '', status: '', label: '', children: copies, createdAt: now, updatedAt: now};
  const nextSiblings = sortThis ? siblings.map(node => node === sortThis ? inbox : node) : [...siblings, inbox];
  const insert = (nodes: NoteNode[]): NoteNode[] => nodes.map(node => {
    if (node.id === parentId) return {...node, collapsed: false, updatedAt: now, children: nextSiblings};
    return ancestors.has(node.id) ? {...node, children: insert(node.children)} : node;
  });
  return {
    count: ids.size,
    novel: {
      ...destination, updatedAt: now, statuses: [...statuses],
      sections: {...destination.sections, [to.section]: parentId ? insert(destinationRoots) : nextSiblings},
    },
  };
}
