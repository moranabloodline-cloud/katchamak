import {transactionText} from './finance';
import type {Novel,NoteNode} from './types';
import DOMPurify from 'dompurify';
import { SECTION_KEYS } from './types';
import {stripHtml} from './utils';
import TurndownService from 'turndown';
import {portableEditorHtml} from './project-image';

const editorialStyle = 'figure{margin:1em 0}figcaption{font-size:.9em;color:#555}img{height:auto;max-width:100%}table{width:100%;border-collapse:collapse}th,td{border:1px solid #aaa;padding:.4em .6em;vertical-align:top;overflow-wrap:anywhere}th{background:#eee}[data-editor-table-borderless=true] :is(th,td){border-color:transparent}[data-draftopus-layout=table]{overflow-x:auto}[data-draftopus-layout=grid]{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,9em),1fr));gap:1em;margin-block:1em}[data-draftopus-layout=card],[data-draftopus-layout=callout]{background:#f7f7f7;border:1px solid #ddd;border-radius:.5em;padding:.7em}[data-draftopus-layout=bar]{height:.6em;background:#41638c;border-radius:.3em}[data-draftopus-layout=caption]{display:block;font-size:.9em}';
export function manuscriptNotes(novel:Novel,allSections=false) {
  const result:{node:NoteNode;depth:number}[]=[];
  const visit=(nodes:NoteNode[],depth:number)=>{for(const node of nodes){result.push({node,depth});visit(node.children,depth+1);}};
  for(const key of allSections?SECTION_KEYS:['binder'] as const)visit(novel.sections[key]??[],0);return result;
}
export function manuscriptHtml(novel:Novel,selected:Set<string>|boolean=false) {
  const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const notes=manuscriptNotes(novel,selected===true).filter(n=>typeof selected==='boolean'||selected.has(n.node.id));
  const body=notes.map(({node,depth})=>{
    const level=Math.min(depth+2,6);
    const transaction=node.transaction?'<p>'+esc(transactionText(node.transaction,novel.financeCurrency)).replace(/\n/g,'<br>')+'</p>':'';
    const content=DOMPurify.sanitize(portableEditorHtml(node.content,novel.gallery),{FORBID_TAGS:['style','script','iframe','object','embed'],ADD_ATTR:['referrerpolicy']});
    return `<section><h${level}>${esc(node.title)}</h${level}>${transaction}${content}</section>`;
  }).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(novel.title)}</title><style>body{max-width:760px;margin:48px auto;padding:0 24px;font:18px/1.6 Georgia,serif;color:#222;background:white}h1,h2,h3{line-height:1.25}section{margin:2em 0}p:empty{min-height:1em}a{color:inherit;text-decoration:none}${editorialStyle}@media print{body{margin:0;max-width:none}h2{break-before:page}}</style></head><body><h1>${esc(novel.title)}</h1><p>${esc(novel.author)}</p>${body}</body></html>`;
}
export function editorMarkdownConverter(options:ConstructorParameters<typeof TurndownService>[0]) {
  const converter=new TurndownService(options);
  converter.keep(node=>node.nodeName==='TABLE'||node.nodeName==='FIGURE'||['grid','callout'].includes(node.getAttribute('data-draftopus-layout')??''));
  return converter;
}
export function manuscriptMarkdown(novel:Novel,selected:Set<string>|boolean=false) {
  const converter=editorMarkdownConverter({headingStyle:'atx',bulletListMarker:'-'});
  return '# '+novel.title+'\n\n'+novel.author+'\n\n'+manuscriptNotes(novel,selected===true).filter(n=>typeof selected==='boolean'||selected.has(n.node.id)).map(({node,depth})=>'#'.repeat(Math.min(depth+2,6))+' '+node.title+'\n\n'+(node.transaction?transactionText(node.transaction,novel.financeCurrency)+'\n\n':'')+converter.turndown(portableEditorHtml(node.content,novel.gallery))).join('\n\n')+'\n';
}
export const manuscriptWords=(novel:Novel,selected:Set<string>|boolean=false)=>manuscriptNotes(novel,selected===true).filter(n=>typeof selected==='boolean'||selected.has(n.node.id)).reduce((total,{node})=>total+(stripHtml(node.content).trim().match(/\S+/g)?.length??0),0);

export function downloadManuscript(novel:Novel,format:'md'|'html',allSections=false) {
  const clean=(node:NoteNode):NoteNode=>({...node,content:DOMPurify.sanitize(node.content,{FORBID_TAGS:['style','script','iframe','object','embed'],ADD_ATTR:['referrerpolicy']}),children:node.children.map(clean)});
  const safe={...novel,sections:Object.fromEntries(SECTION_KEYS.map(key=>[key,(novel.sections[key]??[]).map(clean)])) as Novel['sections']};
  const body=format==='md'?manuscriptMarkdown(safe,allSections):'<!doctype html>\n'+DOMPurify.sanitize(manuscriptHtml(safe,allSections),{WHOLE_DOCUMENT:true,ADD_TAGS:['style'],ADD_ATTR:['referrerpolicy']});
  const url=URL.createObjectURL(new Blob([body],{type:format==='md'?'text/markdown;charset=utf-8':'text/html;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=(novel.title.replace(/[<>:"/\\|?*]/g,'_')||'Manuscript')+(allSections?' - All notes':' - Manuscript')+'.'+format;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
