/** Chromium starts an empty contentEditable with bare inline text, then creates
 * blocks on Enter. Give that first line the same paragraph rules as later ones. */
export function wrapRootParagraphs(editor:HTMLElement):boolean {
  const children=Array.from(editor.childNodes);
  const inline=(node:Node)=>node.nodeType===3||node.nodeType===1&&!/^(ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|DIV|DL|FIELDSET|FIGURE|FOOTER|FORM|H[1-6]|HEADER|HR|LI|MAIN|NAV|OL|P|PRE|SECTION|TABLE|UL)$/.test((node as Element).tagName);
  const selection=editor.ownerDocument.getSelection();
  const anchor=selection?.anchorNode,focus=selection?.focusNode;
  const bookmark=anchor&&focus&&editor.contains(anchor)&&editor.contains(focus)?{anchor,focus,a:selection!.anchorOffset,f:selection!.focusOffset}:null;
  let changed=false;
  for(let index=0;index<children.length;){
    if(!inline(children[index])){index++;continue;}
    const run:Node[]=[];while(index<children.length&&inline(children[index]))run.push(children[index++]);
    // Whitespace separating existing blocks is not a new paragraph.
    if(!run.some(node=>node.nodeType===1||!!node.textContent?.trim())&&children.some(node=>!inline(node)))continue;
    const paragraph=editor.ownerDocument.createElement('p');editor.insertBefore(paragraph,run[0]);
    paragraph.append(...run);changed=true;
  }
  if(changed&&bookmark){
    const point=(node:Node,offset:number):[Node,number]=>{
      if(node!==editor)return [node,offset];
      const next=children[offset],previous=children[offset-1];
      if(next?.parentNode&&next.parentNode!==editor)return [next.parentNode,Array.prototype.indexOf.call(next.parentNode.childNodes,next)];
      if(previous?.parentNode&&previous.parentNode!==editor)return [previous.parentNode,Array.prototype.indexOf.call(previous.parentNode.childNodes,previous)+1];
      return [editor,next?Array.prototype.indexOf.call(editor.childNodes,next):editor.childNodes.length];
    };
    selection!.setBaseAndExtent(...point(bookmark.anchor,bookmark.a),...point(bookmark.focus,bookmark.f));
  }
  return changed;
}
