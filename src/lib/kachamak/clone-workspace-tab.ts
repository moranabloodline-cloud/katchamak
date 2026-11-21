import {galleryImage, galleryImageRef} from './project-image';
import { v5 as namedUuid } from 'uuid';
import { TABS, type NoteNode, type Novel, type SectionKey, type TabKey } from './types';
import { ancestorIds, CLOUD_NOTE_LEVELS, findNodeInNovel, forEachNode, uid } from './utils';
import { workspaceTabs } from './workspace-tabs';
import { removeUnavailableNoteLinks } from './link-review';
import { noteLinkInstructions, noteLinkTitle } from './note-links';

export function cloneableWorkspaceTabs(novel: Novel) {
  return workspaceTabs(novel).filter(({key}) => {
    if (key === 'timeline' || key === 'family' || key === 'trash' || key === 'gallery') return false;
    return !key.startsWith('note:') || !['timeline','family'].includes(findNodeInNovel(novel, key.slice(5))?.section ?? '');
  });
}

function tabLocation(novel: Novel, key: TabKey) {
  if (!cloneableWorkspaceTabs(novel).some(tab => tab.key === key)) return null;
  if (key.startsWith('note:')) return findNodeInNovel(novel, key.slice(5));
  return { section: key as SectionKey, node: null };
}

// HTML is parsed in an inert template. Copy only project-local references
// whose targets are part of this batch; retain their visible text otherwise.
type CopyTarget = { id: string; title: string; path: string };
function remapHtml(html: string, copies: ReadonlyMap<string, CopyTarget>, unwrap: boolean) {
  if (!/<a\b|data-katchamak-note/i.test(html)) return html;
  const template = document.createElement('template');
  template.innerHTML = html;
  const links = template.content.querySelectorAll('[data-katchamak-note], a[href^="#note/"]');
  if (!links.length) return html;
  for (const element of links) {
    const id = element.getAttribute('data-katchamak-note');
    if (id !== null) {
      const target = copies.get(id);
      if (target) element.setAttribute('data-katchamak-note', target.id);
      else element.removeAttribute('data-katchamak-note');
    }
    const href = element.getAttribute('href');
    if (element.tagName !== 'A' || !href?.startsWith('#note/')) continue;
    const target = copies.get(href.slice(6));
    if (target) {
      element.setAttribute('href', '#note/' + target.id);
      if (element.getAttribute('title')?.endsWith(' · ' + noteLinkInstructions)) {
        element.setAttribute('title', noteLinkTitle(target.title, target.path));
      }
    } else if (unwrap) element.replaceWith(...element.childNodes);
  }
  return template.innerHTML;
}

export function cloneWorkspaceTab(source: Novel, sourceTab: TabKey, destination: Novel, destinationTab: TabKey, sharedBatch = false) {
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
  // Two clean windows copying the same source into the same inbox state create
  // identical IDs. After a successful copy the inbox contains new root IDs.
  const batch = sharedBatch ? namedUuid(new TextEncoder().encode(JSON.stringify([
    'kachamak/clone-tab/v1', source.id, sourceTab, destination.id, destinationTab,
    roots, destination.updatedAt, sortThis?.id, sortThis?.children.map(node => node.id),
  ])), namedUuid.URL) : undefined;
  const occupied = new Set<string>();
  if (batch) {
    const reserve = (node: NoteNode) => occupied.add(node.id);
    Object.values(destination.sections).forEach(nodes => forEachNode(nodes, reserve));
    forEachNode((destination.trash ?? []).map(item => item.node), reserve);
  }
  function newId(name: string) {
    if (!batch) return uid();
    let id = namedUuid(name, batch);
    // A previous copy can have left the inbox and still be restorable.
    while (occupied.has(id)) id = namedUuid(id, batch);
    occupied.add(id);
    return id;
  }
  const path = parentId ? ancestorIds(destinationRoots, parentId) : [];
  const wrapperDepth = parentId ? path.length + 1 : 0;
  const ancestors = new Set(path);
  const inboxPath = [TABS.find(tab => tab.key === to.section)?.label ?? to.section];
  let level = destinationRoots;
  for (const id of parentId ? [...path, parentId] : []) {
    const parent = level.find(node => node.id === id)!;
    inboxPath.push(parent.title);
    level = parent.children;
  }
  const mapping = new Map<string, CopyTarget>();
  function indexCopies(nodes: NoteNode[], parentPath: string) {
    for (const node of nodes) {
      mapping.set(node.id, { id: newId('note:' + node.id), title: node.title, path: parentPath });
      indexCopies(node.children, parentPath + ' / ' + node.title);
    }
  }
  indexCopies(roots, [...inboxPath, 'Sort This'].join(' / '));
  const targets = new Set(Array.from(mapping.values(), target => target.id));
  const now = Date.now();
  const statuses = new Set(destination.statuses);
  const gallery=[...(destination.gallery??[])];
  const transferImage=(value?:string)=>{
    const sourceItem=galleryImage(source.gallery,value);
    if(!sourceItem)return value;
    let match=gallery.find(item=>item.kind==='image' && item.image===sourceItem.image);
    if(!match) {
      let id=newId('gallery:'+sourceItem.id);
      while(gallery.some(item=>item.id===id))id=newId('gallery:'+id);
      match={...sourceItem,id,parentId:null};
      gallery.push(match);
    }
    return galleryImageRef(match.id);
  };
  const copy = (original: NoteNode, depth: number): NoteNode => {
    if (depth >= CLOUD_NOTE_LEVELS) throw new Error('The copied notes would be nested too deeply. Choose a higher-level destination tab.');
    const node = structuredClone({ ...original, children: [] });
    if (node.image) node.image=transferImage(node.image);
    if (node.event?.banner) node.event.banner=transferImage(node.event.banner);
    if (node.status) statuses.add(node.status);
    const content = remapHtml(node.content ?? '', mapping, false);
    const linkChoices = node.linkChoices?.flatMap(choice => {
      const targetId = choice.targetId && mapping.get(choice.targetId)?.id;
      return targetId ? [{...choice, targetId}] : [];
    });
    const repaired = content.includes('#note/')
      ? removeUnavailableNoteLinks({content, linkChoices}, targets)
      : {content, linkChoices};
    return {
      ...node, id: mapping.get(original.id)!.id, createdAt: now, updatedAt: now,
      content: repaired.content, linkChoices: repaired.linkChoices,
      synopsis: remapHtml(node.synopsis ?? '', mapping, true),
      notes: remapHtml(node.notes ?? '', mapping, true),
      familyMembers: node.familyMembers?.flatMap(id => mapping.get(id)?.id ?? []),
      links: Array.isArray(node.links) ? node.links.flatMap(id => mapping.get(id)?.id ?? []) : undefined,
      children: original.children.map(child => copy(child, depth + 1)),
    };
  };
  const copies = roots.map(node => copy(node, wrapperDepth + 1));
  const inbox: NoteNode = sortThis
    ? {...sortThis, collapsed: false, updatedAt: now, children: [...sortThis.children, ...copies]}
    : {id: newId('inbox'), title: 'Sort This', kind: 'doc', icon: 'folder', content: '', synopsis: '', notes: '', status: '', label: '', children: copies, createdAt: now, updatedAt: now};
  const nextSiblings = sortThis ? siblings.map(node => node === sortThis ? inbox : node) : [...siblings, inbox];
  const insert = (nodes: NoteNode[]): NoteNode[] => nodes.map(node => {
    if (node.id === parentId) return {...node, collapsed: false, updatedAt: now, children: nextSiblings};
    return ancestors.has(node.id) ? {...node, children: insert(node.children)} : node;
  });
  return {
    count: mapping.size,
    novel: {
      ...destination, updatedAt: now, statuses: [...statuses],
      ...(gallery.length!==(destination.gallery?.length??0)?{gallery}:{}),
      sections: {...destination.sections, [to.section]: parentId ? insert(destinationRoots) : nextSiblings},
    },
  };
}
