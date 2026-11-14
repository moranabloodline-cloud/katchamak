'use client';
import type {NoteNode} from './types';
import {escapePattern} from './knowledge';
/** Deterministic, user-triggered linking. Ambiguous aliases and existing links stay untouched. */
export function linkKnownNames(html:string,notes:NoteNode[]) {
  const names=new Map<string,{name:string;ids:Set<string>;title:string}>();
  for(const note of notes)for(const [i,value] of [note.title,...(note.aliases??[])].entries()) {
    const name=value.trim();if(name.length<(i===0?3:2))continue;
    const key=name.toLocaleLowerCase(), prior=names.get(key);
    if(prior)prior.ids.add(note.id);else names.set(key,{name,ids:new Set([note.id]),title:note.title});
  }
  const unambiguous=[...names.values()].filter(n=>n.ids.size===1).sort((a,b)=>b.name.length-a.name.length);
  if(!unambiguous.length)return {html,count:0};
  const pattern=new RegExp('(?<![\\p{L}\\p{N}_])(?:'+unambiguous.map(n=>escapePattern(n.name)).join('|')+')(?![\\p{L}\\p{N}_])','giu');
  const lookup=new Map(unambiguous.map(n=>[n.name.toLocaleLowerCase(),n]));
  const doc=new DOMParser().parseFromString(html,'text/html'),walker=doc.createTreeWalker(doc.body,4),texts:Text[]=[];
  while(walker.nextNode())texts.push(walker.currentNode as Text);
  let count=0;
  for(const text of texts) {
    if(text.parentElement?.closest('a,code,pre,script,style'))continue;
    const value=text.data,matches=[...value.matchAll(pattern)];if(!matches.length)continue;
    const fragment=doc.createDocumentFragment();let offset=0;
    for(const match of matches) {
      const target=lookup.get(match[0].toLocaleLowerCase());if(!target)continue;
      const start=match.index!;fragment.append(doc.createTextNode(value.slice(offset,start)));
      const a=doc.createElement('a');const id=[...target.ids][0];a.setAttribute('href','#note/'+id);a.dataset.katchamakNote=id;a.title=target.title+' · Ctrl+click to open';a.textContent=match[0];fragment.append(a);offset=start+match[0].length;count++;
    }
    fragment.append(doc.createTextNode(value.slice(offset)));text.replaceWith(fragment);
  }
  return {html:count?doc.body.innerHTML:html,count};
}
