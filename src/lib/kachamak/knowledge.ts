import { SECTION_KEYS, type Novel, type NoteNode, type SectionKey } from './types';
import { noteMatches, scanLinks } from './note-links';
import { stripHtml } from './utils';
export type IndexedNote = { node: NoteNode; section: SectionKey; path: string; text: string };
export function indexNotes(novel: Novel): IndexedNote[] {
  const result: IndexedNote[] = [];
  for (const section of SECTION_KEYS) {
    const visit = (nodes: NoteNode[], ancestors: string[]) => { for(const node of nodes) { result.push({node,section,path:[section,...ancestors].join(' / '),text:stripHtml([node.content,node.synopsis,node.notes].join(' '))}); visit(node.children,[...ancestors,node.title]); } };
    visit(novel.sections[section] ?? [],[]);
  }
  return result;
}
export const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function matchName(text: string, node: NoteNode): {name:string;index:number} | null {
  const match=scanLinks(text,[node]).find(m=>m.targetId===node.id);
  return match?{name:match.text,index:match.start}:null;
}
export function inlineNoteIds(html: string): string[] {
  return [...html.matchAll(/(?:data-katchamak-note\s*=\s*["']|href\s*=\s*["']#note\/)([a-zA-Z0-9_-]{1,128})["']/gi)].map(m=>m[1]);
}
export function referenceTo(source: IndexedNote, target: NoteNode, novel?: Novel) {
  const explicit=(source.node.links??[]).includes(target.id)||inlineNoteIds(source.node.content).includes(target.id);
  const match=novel && novel.sections.codex.some(function contains(n):boolean{return n.id===target.id||n.children.some(contains);})
    ? (()=>{const m=noteMatches(novel,source.node).find(m=>m.targetId===target.id&&!m.missing);return m?{name:m.text,index:m.start}:null;})()
    : matchName(source.text,target);
  return explicit || match ? {source,explicit,match,snippet:source.text.slice(Math.max(0,(match?.index??0)-55),(match?.index??0)+150)} : null;
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
