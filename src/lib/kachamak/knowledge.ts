import { SECTION_KEYS, TABS, type Novel, type NoteNode, type SectionKey } from './types';
import { contentText, flattenNotes, prepareLinkScanner, scanLinks } from './note-links';
import { stripHtml } from './utils';
export type IndexedNote = { node: NoteNode; section: SectionKey; path: string; text: string };
export function searchNoteTitles(index:IndexedNote[],query:string):IndexedNote[]{
  const name=query.trim().normalize('NFC').toLocaleLowerCase();
  return name?index.filter(entry=>entry.node.title.normalize('NFC').toLocaleLowerCase().startsWith(name)):index;
}
type NoteLocation = Omit<IndexedNote, 'text'>;
function* noteLocations(novel: Novel): Generator<NoteLocation> {
  for (const section of SECTION_KEYS) {
    const visit = function* (nodes: NoteNode[], path: string): Generator<NoteLocation> {
      for (const node of nodes) {
        yield { node, section, path };
        if (node.children.length) yield* visit(node.children, path+' / '+node.title);
      }
    };
    yield* visit(novel.sections[section] ?? [], TABS.find(tab=>tab.key===section)?.label??section);
  }
}
function indexedNote(location: NoteLocation): IndexedNote {
  const {content,synopsis,notes}=location.node;
  return {...location,text:stripHtml([content,synopsis,notes].join(' '))};
}
export function indexNotes(novel: Novel): IndexedNote[] {
  return Array.from(noteLocations(novel),indexedNote);
}
export type LinkedNoteGroup = { id: string; title: string; color?: string; entries: { id: string; target?: IndexedNote }[] };
const linkedTitleOrder=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});
// Group by the existing immediate parent, never by a guessed name or note kind.
export function groupLinkedNotes(novel: Novel, ids: string[]): LinkedNoteGroup[] {
  if (!ids.length) return [];
  const wanted = new Set(ids);
  type Group = Pick<LinkedNoteGroup, 'id' | 'title' | 'color'>;
  const targets = new Map<string, { group: Group; entry: IndexedNote }>();
  const ordered: Group[] = [];
  for (const section of SECTION_KEYS) {
    const ungrouped = { id: `section:${section}`, title: '' };
    ordered.push(ungrouped);
    const path = [TABS.find(tab => tab.key === section)?.label ?? section];
    const visit = (nodes: NoteNode[], parentGroup: Group) => {
      for (const node of nodes) {
        if (wanted.has(node.id)) {
          targets.set(node.id, { group: parentGroup, entry: indexedNote({node,section,path:path.join(' / ')}) });
        }
        if (!node.children.length) continue;
        const group = { id: `parent:${node.id}`, title: node.title || 'Untitled note', color: node.color };
        ordered.push(group);
        path.push(node.title);
        visit(node.children, group);
        path.pop();
      }
    };
    visit(novel.sections[section] ?? [], ungrouped);
  }
  const missing = { id: 'missing', title: 'Unavailable notes' };
  ordered.push(missing);
  const groups = new Map<string, LinkedNoteGroup>();
  for (const id of wanted) {
    const target = targets.get(id);
    const group = target?.group ?? missing;
    const linkedGroup: LinkedNoteGroup = groups.get(group.id) ?? { ...group, entries: [] };
    linkedGroup.entries.push({ id, target: target?.entry });
    groups.set(group.id, linkedGroup);
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
function scanReference(source: NoteLocation | IndexedNote, target: NoteNode, scanner: ReturnType<typeof prepareLinkScanner>) {
  if(source.node.id===target.id)return null;
  const {id,content,synopsis,notes,links,linkChoices}=source.node;
  const explicit=(links??[]).includes(target.id) || [content,synopsis,notes].some(html=>html && inlineNoteIds(html).includes(target.id));
  const find=(text:string,choices=linkChoices)=>{
    if(!scanner.mightMatch(text,target.id) && !choices?.some(choice=>choice.targetId===target.id))return undefined;
    return scanner.scan(text,choices,id).find(match=>match.targetId===target.id&&!match.missing);
  };
  const occurrence=find(contentText(content)) ?? ((synopsis||notes) ? find(contentText(synopsis)+'\n'+contentText(notes),[]) : undefined);
  if(!explicit&&!occurrence)return null;
  const entry='text' in source ? source : indexedNote(source);
  const match=occurrence?{name:occurrence.text,index:occurrence.start}:null;
  return {source:entry,explicit,match,snippet:occurrence?.context??entry.text.slice(0,150)};
}
export function referenceTo(source: IndexedNote, target: NoteNode, novel?: Novel) {
  const scanner=prepareLinkScanner(novel?flattenNotes(novel).map(entry=>entry.node):[target]);
  return scanReference(source,target,scanner);
}
/** Yield after each source note, including notes that do not mention the target. */
export function* noteReferences(novel: Novel, target: NoteNode) {
  const scanner=prepareLinkScanner(flattenNotes(novel).map(entry=>entry.node));
  for (const source of noteLocations(novel)) yield scanReference(source,target,scanner);
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
