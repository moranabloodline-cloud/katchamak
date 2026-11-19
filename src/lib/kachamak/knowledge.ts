import { SECTION_KEYS, TABS, type Novel, type NoteNode, type SectionKey } from './types';
import { contentText, flattenNotes, scanLinks } from './note-links';
import { stripHtml } from './utils';
export type IndexedNote = { node: NoteNode; section: SectionKey; path: string; text: string };
export function searchNoteTitles(index:IndexedNote[],query:string):IndexedNote[]{
  const name=query.trim().normalize('NFC').toLocaleLowerCase();
  return name?index.filter(entry=>entry.node.title.normalize('NFC').toLocaleLowerCase().startsWith(name)):index;
}
export function indexNotes(novel: Novel): IndexedNote[] {
  const result: IndexedNote[] = [];
  for (const section of SECTION_KEYS) {
    const visit = (nodes: NoteNode[], ancestors: string[]) => { for(const node of nodes) { result.push({node,section,path:[TABS.find(tab=>tab.key===section)?.label??section,...ancestors].join(' / '),text:stripHtml([node.content,node.synopsis,node.notes].join(' '))}); visit(node.children,[...ancestors,node.title]); } };
    visit(novel.sections[section] ?? [],[]);
  }
  return result;
}
export type LinkedNoteGroup = { id: string; title: string; entries: { id: string; target?: IndexedNote }[] };
const linkedTitleOrder=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});
// Group by the existing immediate parent, never by a guessed name or note kind.
export function groupLinkedNotes(novel: Novel, ids: string[]): LinkedNoteGroup[] {
  const index = new Map(indexNotes(novel).map(entry => [entry.node.id, entry]));
  const membership = new Map<string, { id: string; title: string }>();
  const ordered: { id: string; title: string }[] = [];
  for (const section of SECTION_KEYS) {
    const ungrouped = { id: `section:${section}`, title: '' };
    ordered.push(ungrouped);
    const visit = (note: NoteNode, parent?: NoteNode) => {
      membership.set(note.id, parent ? { id: `parent:${parent.id}`, title: parent.title || 'Untitled note' } : ungrouped);
      if (note.children.length) ordered.push({ id: `parent:${note.id}`, title: note.title || 'Untitled note' });
      note.children.forEach(child => visit(child, note));
    };
    (novel.sections[section] ?? []).forEach(root => visit(root));
  }
  const missing = { id: 'missing', title: 'Unavailable notes' };
  ordered.push(missing);
  const groups = new Map<string, LinkedNoteGroup>();
  for (const id of new Set(ids)) {
    const group = membership.get(id) ?? missing;
    if (!groups.has(group.id)) groups.set(group.id, { ...group, entries: [] });
    groups.get(group.id)!.entries.push({ id, target: index.get(id) });
  }
  return ordered.flatMap(group => {
    const match=groups.get(group.id);if(!match)return [];
    match.entries.sort((a,b)=>linkedTitleOrder.compare(a.target?.node.title??'',b.target?.node.title??''));
    return [match];
  });
}
export function matchName(text: string, node: NoteNode): {name:string;index:number} | null {
  const match=scanLinks(text,[node]).find(m=>m.targetId===node.id);
  return match?{name:match.text,index:match.start}:null;
}
export function inlineNoteIds(html: string): string[] {
  return [...html.matchAll(/(?:data-katchamak-note\s*=\s*["']|href\s*=\s*["']#note\/)([a-zA-Z0-9_-]{1,128})["']/gi)].map(m=>m[1]);
}
export function referenceTo(source: IndexedNote, target: NoteNode, novel?: Novel) {
  if(source.node.id===target.id)return null;
  const explicit=(source.node.links??[]).includes(target.id) ||
    [source.node.content,source.node.synopsis,source.node.notes].some(html=>html && inlineNoteIds(html).includes(target.id));
  const candidates=novel?flattenNotes(novel).map(entry=>entry.node):[target];
  const body=scanLinks(contentText(source.node.content),candidates,source.node.linkChoices,source.node.id);
  const metadata=scanLinks(contentText(source.node.synopsis)+'\n'+contentText(source.node.notes),candidates,[],source.node.id);
  const occurrence=[...body,...metadata].find(match=>match.targetId===target.id&&!match.missing);
  const match=occurrence?{name:occurrence.text,index:occurrence.start}:null;
  return explicit || match ? {source,explicit,match,snippet:occurrence?.context??source.text.slice(0,150)} : null;
}
export function searchNotes(index: IndexedNote[], query: string, excludeId?: string): IndexedNote[] {
  const q=query.trim().toLocaleLowerCase(); if(!q)return [];
  const terms=q.split(/\s+/);
  return index.filter(n=>n.node.id!==excludeId).map(entry=> {
    const title=entry.node.title.toLocaleLowerCase(), aliases=(entry.node.aliases??[]).join(' ').toLocaleLowerCase();
    const hay=[title,aliases,entry.path.toLocaleLowerCase(),entry.text.toLocaleLowerCase()].join(' ');
    const score=title===q?100:title.startsWith(q)?80:title.includes(q)?60:aliases.includes(q)?50:terms.every(t=>hay.includes(t))?10:0;
    return {entry,score};
  }).filter(n=>n.score>0).sort((a,b)=>b.score-a.score||a.entry.node.title.localeCompare(b.entry.node.title)).map(n=>n.entry);
}
