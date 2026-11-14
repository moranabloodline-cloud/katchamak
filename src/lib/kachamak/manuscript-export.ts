import TurndownService from 'turndown';
import DOMPurify from 'dompurify';
import type { Novel, NoteNode, SectionKey } from './types';
import { SECTION_KEYS, TABS } from './types';

const escape=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function manuscriptHtml(novel:Novel,allSections=false) {
  const walk=(nodes:NoteNode[],depth:number):string=>nodes.map(n=>`<section><h${Math.min(depth,6)}>${escape(n.title)}</h${Math.min(depth,6)}>${DOMPurify.sanitize(n.content)}${walk(n.children,depth+1)}</section>`).join('\n');
  const keys:SectionKey[]=allSections?SECTION_KEYS:['binder'];
  return `<h1>${escape(novel.title)}</h1>${novel.author?`<p>${escape(novel.author)}</p>`:''}\n`+keys.map(k=>`${allSections?`<h2>${TABS.find(t=>t.key===k)?.label}</h2>`:''}${walk(novel.sections[k],allSections?3:2)}`).join('\n');
}
export function manuscriptMarkdown(novel:Novel,allSections=false) {
  const converter=new TurndownService({headingStyle:'atx',bulletListMarker:'-',codeBlockStyle:'fenced'});
  converter.keep(['table']);
  return converter.turndown(manuscriptHtml(novel,allSections))+'\n';
}
export function downloadManuscript(novel:Novel,format:'md'|'html',allSections=false) {
  const body=format==='md'?manuscriptMarkdown(novel,allSections):`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(novel.title)}</title><style>body{max-width:48rem;margin:3rem auto;padding:0 1.5rem;font:18px/1.7 Georgia,serif;color:#242424}h1,h2,h3{line-height:1.2}img{max-width:100%}@media print{body{margin:0}h1,h2{break-after:avoid}}</style><body>${manuscriptHtml(novel,allSections)}</body></html>`;
  const url=URL.createObjectURL(new Blob([body],{type:format==='md'?'text/markdown;charset=utf-8':'text/html;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=(novel.title.replace(/[<>:"/\\|?*]/g,'_')||'Manuscript')+(allSections?' - All notes':' - Manuscript')+'.'+format;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
