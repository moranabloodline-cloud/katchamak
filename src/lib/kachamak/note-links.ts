import type { LinkChoice, NoteNode, Novel, SectionKey } from './types';

export type TextPart = { node: Text; start: number; end: number };
export type NoteMatch = LinkChoice & { candidates: NoteNode[]; explicit: boolean; missing: boolean; context: string };
const blocks = new Set(['P','DIV','LI','H1','H2','H3','H4','H5','H6','TR','BLOCKQUOTE']);
const excluded = new Set(['A','CODE','PRE','SCRIPT','STYLE','BUTTON']);

/** The same text coordinates drive display, choices, and backlinks. Formatting
 * is never rewritten. Block boundaries and excluded links cannot match names. */
export function indexText(root: Node) {
  let text = '';
  const parts: TextPart[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === 3) {
      const value = node.textContent || '';
      parts.push({ node: node as Text, start: text.length, end: text.length + value.length });
      text += value; return;
    }
    const tag = (node as Element).tagName;
    if (excluded.has(tag)) { text += '\ufffc'; return; }
    if (tag === 'BR') { text += '\n'; return; }
    if (blocks.has(tag) && text && !text.endsWith('\n')) text += '\n';
    node.childNodes.forEach(walk);
    if (blocks.has(tag) && !text.endsWith('\n')) text += '\n';
  };
  root.childNodes.forEach(walk);
  return { text, parts };
}

export function contentText(html: string) {
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '');
  const root = document.createElement('div'); root.innerHTML = html;
  return indexText(root).text;
}

export function flattenNotes(novel: Novel) {
  const out: { node: NoteNode; section: SectionKey; path: string[] }[] = [];
  for (const [section, roots] of Object.entries(novel.sections) as [SectionKey, NoteNode[]][]) {
    const walk = (nodes: NoteNode[], path: string[]) => nodes.forEach(node => {
      out.push({node, section, path}); walk(node.children, [...path, node.title]);
    });
    walk(roots, []);
  }
  return out;
}

export function cleanAliases(values: string[], title = '') {
  const seen = new Set([title.trim().toLocaleLowerCase()]);
  return values.map(v => v.trim()).filter(v => {
    const key = v.toLocaleLowerCase(); if (!v || seen.has(key)) return false;
    seen.add(key); return true;
  });
}

export function scanLinks(text: string, codex: NoteNode[], choices: LinkChoice[] = [], sourceId?: string): NoteMatch[] {
  const terms = new Map<string, NoteNode[]>();
  for (const note of codex) {
    if (note.id === sourceId) continue;
    for (const term of cleanAliases([note.title, ...(note.aliases || [])])) {
      const key = term.toLocaleLowerCase();
      const list = terms.get(key) || [];
      if (!list.some(n => n.id === note.id)) list.push(note);
      terms.set(key, list);
    }
  }
  const found: NoteMatch[] = [];
  const context = (start: number, end: number) => text.slice(Math.max(0, start - 48), Math.min(text.length, end + 64)).replace(/\s+/g, ' ').trim();
  // Explicit choices survive target renaming or deletion; never silently retarget.
  for (const c of choices) {
    if (text.slice(c.start, c.end) !== c.text || c.start < 0 || c.end <= c.start || c.text.includes('\ufffc')) continue;
    const target = codex.find(n => n.id === c.targetId);
    found.push({...c, candidates: terms.get(c.text.toLocaleLowerCase()) || (target ? [target] : []), explicit: true, missing: !!c.targetId && !target, context: context(c.start,c.end)});
  }
  const overlap = (start: number, end: number) => found.some(m => start < m.end && end > m.start);
  // Long names win over shorter aliases, with Unicode word boundaries.
  for (const [term, candidates] of [...terms].sort((a,b) => b[0].length-a[0].length)) {
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'giu');
    for (const match of text.matchAll(re)) {
      const start = match.index!, end = start + match[0].length;
      if (overlap(start,end) || /[\p{L}\p{N}_]/u.test(text.slice(0,start).slice(-1)) || /[\p{L}\p{N}_]/u.test(text.slice(end,end+1))) continue;
      found.push({start,end,text:match[0],targetId:candidates.length===1?candidates[0].id:null,candidates,explicit:false,missing:false,context:context(start,end)});
    }
  }
  return found.sort((a,b)=>a.start-b.start);
}

/** Preserve choices only in unchanged text; edits through an occurrence invalidate
 * that choice. Identical aliases elsewhere never inherit it. */
export function rebaseChoices(before: string, after: string, choices: LinkChoice[] = []) {
  if (before === after) return choices;
  let start=0, suffix=0;
  while(start<before.length && start<after.length && before[start]===after[start]) start++;
  while(suffix<before.length-start && suffix<after.length-start && before[before.length-1-suffix]===after[after.length-1-suffix]) suffix++;
  const delta=after.length-before.length;
  return choices.flatMap(c => {
    const next = c.end<=start ? c : c.start>=before.length-suffix ? {...c,start:c.start+delta,end:c.end+delta} : null;
    return next && after.slice(next.start,next.end)===next.text ? [next] : [];
  });
}

export function noteMatches(novel: Novel, node: NoteNode) {
  const codex = flattenNotes(novel).filter(n=>n.section==='codex').map(n=>n.node);
  return scanLinks(contentText(node.content), codex, node.linkChoices, node.id);
}

export function backlinks(novel: Novel, targetId: string) {
  const rows = flattenNotes(novel);
  const codex = rows.filter(n=>n.section==='codex').map(n=>n.node);
  return rows.filter(r=>r.node.id!==targetId).flatMap(r=>{
    const matches=scanLinks(contentText(r.node.content),codex,r.node.linkChoices,r.node.id).filter(m=>m.targetId===targetId);
    return matches.length || r.node.links?.includes(targetId) ? [{...r,matches,manual:!!r.node.links?.includes(targetId)}] : [];
  });
}

export function rangeForMatch(parts: TextPart[], match: Pick<LinkChoice,'start'|'end'>) {
  const first=parts.find(p=>p.start<=match.start && p.end>match.start);
  const last=parts.find(p=>p.start<match.end && p.end>=match.end);
  if(!first || !last) return null;
  const range=document.createRange();
  range.setStart(first.node,match.start-first.start); range.setEnd(last.node,match.end-last.start);
  return range;
}
