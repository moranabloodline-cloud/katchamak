import type {Novel,NoteNode} from './types';
import DOMPurify from 'dompurify';
import { SECTION_KEYS } from './types';
import {stripHtml} from './utils';
import TurndownService from 'turndown';
export function manuscriptNotes(novel:Novel,allSections=false) {
  const result:{node:NoteNode;depth:number}[]=[];
  const visit=(nodes:NoteNode[],depth:number)=>{for(const node of nodes){result.push({node,depth});visit(node.children,depth+1);}};
  for(const key of allSections?SECTION_KEYS:['binder'] as const)visit(novel.sections[key]??[],0);return result;
}
export function manuscriptHtml(novel:Novel,selected:Set<string>|boolean=false) {
  const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const notes=manuscriptNotes(novel,selected===true).filter(n=>typeof selected==='boolean'||selected.has(n.node.id));
  const body=notes.map(({node,depth})=>{const level=Math.min(depth+2,6);return `<section><h${level}>${esc(node.title)}</h${level}>${DOMPurify.sanitize(node.content,{FORBID_TAGS:['style','script','iframe','object','embed']})}</section>`;}).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(novel.title)}</title><style>body{max-width:760px;margin:48px auto;padding:0 24px;font:18px/1.6 Georgia,serif;color:#222;background:white}h1,h2,h3{line-height:1.25}section{margin:2em 0}p:empty{min-height:1em}a{color:inherit;text-decoration:none}@media print{body{margin:0;max-width:none}h2{break-before:page}}</style></head><body><h1>${esc(novel.title)}</h1><p>${esc(novel.author)}</p>${body}</body></html>`;
}
export function manuscriptMarkdown(novel:Novel,selected:Set<string>|boolean=false) {
  const converter=new TurndownService({headingStyle:'atx',bulletListMarker:'-'});
  return '# '+novel.title+'\n\n'+novel.author+'\n\n'+manuscriptNotes(novel,selected===true).filter(n=>typeof selected==='boolean'||selected.has(n.node.id)).map(({node,depth})=>'#'.repeat(Math.min(depth+2,6))+' '+node.title+'\n\n'+converter.turndown(node.content)).join('\n\n')+'\n';
}
export const manuscriptWords=(novel:Novel,selected:Set<string>|boolean=false)=>manuscriptNotes(novel,selected===true).filter(n=>typeof selected==='boolean'||selected.has(n.node.id)).reduce((total,{node})=>total+(stripHtml(node.content).trim().match(/\S+/g)?.length??0),0);

export function downloadManuscript(novel:Novel,format:'md'|'html',allSections=false) {
  const clean=(node:NoteNode):NoteNode=>({...node,content:DOMPurify.sanitize(node.content,{FORBID_TAGS:['style','script','iframe','object','embed']}),children:node.children.map(clean)});
  const safe={...novel,sections:Object.fromEntries(SECTION_KEYS.map(key=>[key,novel.sections[key].map(clean)])) as Novel['sections']};
  const body=format==='md'?manuscriptMarkdown(safe,allSections):'<!doctype html>\n'+DOMPurify.sanitize(manuscriptHtml(safe,allSections),{WHOLE_DOCUMENT:true,ADD_TAGS:['style']});
  const url=URL.createObjectURL(new Blob([body],{type:format==='md'?'text/markdown;charset=utf-8':'text/html;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=(novel.title.replace(/[<>:"/\\|?*]/g,'_')||'Manuscript')+(allSections?' - All notes':' - Manuscript')+'.'+format;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
