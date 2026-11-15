import type {NoteNode,TreeScope} from './types';
import {findNode} from './utils';

/** Manuscript order follows the tree, independently of collapsed branches. */
export function continuousNotes(roots:NoteNode[],scope:TreeScope='all',rootId?:string):NoteNode[] {
  const root=rootId?findNode(roots,rootId):null;
  if(rootId&&!root)return [];
  const out:NoteNode[]=[];
  const visit=(nodes:NoteNode[])=>{for(const node of nodes){
    if(node.hidden)continue;
    if(scope!=='folders'||node.children.length)out.push(node);
    if(scope!=='top')visit(node.children);
  }};
  visit(root?[root]:roots);return out;
}
