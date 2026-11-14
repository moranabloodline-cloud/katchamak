import type {Novel,NoteNode} from './types';
import {stripHtml} from './utils';
import TurndownService from 'turndown';
export function manuscriptNotes(novel:Novel) {
  const result:{node:NoteNode;depth:number}[]=[];
  const visit=(nodes:NoteNode[],depth:number)=>{for(const node of nodes){result.push({node,depth});visit(node.children,depth+1);}};
  visit(novel.sections.binder??[],0);return result;
}
export function manuscriptHtml(novel:Novel,selected:Set<string>) {
  const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const notes=manuscriptNotes(novel).filter(n=>selected.has(n.node.id));
  const body=notes.map(({node,depth})=>{const level=Math.min(depth+2,6);return `<section><h${level}>${esc(node.title)}</h${level}>${node.content}</section>`;}).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(novel.title)}</title><style>body{max-width:760px;margin:48px auto;padding:0 24px;font:18px/1.6 Georgia,serif;color:#222;background:white}h1,h2,h3{line-height:1.25}section{margin:2em 0}p:empty{min-height:1em}a{color:inherit;text-decoration:none}@media print{body{margin:0;max-width:none}h2{break-before:page}}</style></head><body><h1>${esc(novel.title)}</h1><p>${esc(novel.author)}</p>${body}</body></html>`;
}
export function manuscriptMarkdown(novel:Novel,selected:Set<string>) {
  const converter=new TurndownService({headingStyle:'atx',bulletListMarker:'-'});
  return '# '+novel.title+'\n\n'+novel.author+'\n\n'+manuscriptNotes(novel).filter(n=>selected.has(n.node.id)).map(({node,depth})=>'#'.repeat(Math.min(depth+2,6))+' '+node.title+'\n\n'+converter.turndown(node.content)).join('\n\n')+'\n';
}
export const manuscriptWords=(novel:Novel,selected:Set<string>)=>manuscriptNotes(novel).filter(n=>selected.has(n.node.id)).reduce((total,{node})=>total+(stripHtml(node.content).trim().match(/\S+/g)?.length??0),0);
