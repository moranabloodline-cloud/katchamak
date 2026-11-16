/** Lift an unlabelled list item created by pasting a full document into a
 * blank bullet. Labelled parents and real nested lists keep their hierarchy. */
export function repairListWrappers(root:HTMLElement):boolean {
  const selection=root.ownerDocument.getSelection();
  const anchor=selection?.anchorNode,focus=selection?.focusNode;
  const bookmark=anchor&&focus&&root.contains(anchor)&&root.contains(focus)?{anchor,focus,a:selection!.anchorOffset,f:selection!.focusOffset}:null;
  let changed=false;
  const meaningful=(node:Node)=>node.nodeType===1||node.nodeType===3&&!!node.textContent?.trim();
  for(const list of Array.from(root.querySelectorAll('ul,ol'))) {
    if(!Array.from(list.childNodes).some(meaningful)){list.remove();changed=true;}
  }
  for(const item of Array.from(root.querySelectorAll('li')).reverse()) {
    if(!root.contains(item))continue;
    const nodes=Array.from(item.childNodes).filter(meaningful),first=nodes[0];
    if(first?.nodeType!==1||!['UL','OL'].includes((first as Element).tagName))continue;
    // Inline content after the nested list can be an intentional parent label.
    if(nodes.some(node=>node.nodeType===3||node.nodeType===1&&!['UL','OL','P','DIV','H1','H2','H3','H4','H5','H6','HR','BLOCKQUOTE','PRE','TABLE'].includes((node as Element).tagName)))continue;
    const list=item.parentElement;if(!list||!['UL','OL'].includes(list.tagName))continue;
    const originalItems=Array.from(list.children).filter(node=>node.tagName==='LI');
    let ordinal=Number(list.getAttribute('start')??(list.hasAttribute('reversed')?originalItems.length:1)),afterStart=ordinal;
    for(const entry of originalItems){if(entry.hasAttribute('value'))ordinal=Number(entry.getAttribute('value'));if(entry===originalItems[originalItems.indexOf(item)+1]){afterStart=ordinal;break;}ordinal+=list.hasAttribute('reversed')?-1:1;}
    const before=list.cloneNode(false) as HTMLElement,after=list.cloneNode(false) as HTMLElement;
    before.removeAttribute('id');after.removeAttribute('id');
    if(list.tagName==='OL')after.setAttribute('start',String(afterStart));
    while(list.firstChild&&list.firstChild!==item)before.append(list.firstChild);
    while(item.nextSibling)after.append(item.nextSibling);
    const fragment=root.ownerDocument.createDocumentFragment();
    if(Array.from(before.childNodes).some(meaningful))fragment.append(before);
    while(item.firstChild)fragment.append(item.firstChild);
    if(Array.from(after.childNodes).some(meaningful))fragment.append(after);
    list.replaceWith(fragment);changed=true;
  }
  // Chromium may insert the remainder of a pasted document directly into a
  // list. Split at those blocks so headings/rules never become list children.
  for(const list of Array.from(root.querySelectorAll('ul,ol')).reverse()) {
    const block=(node:Node)=>node.nodeType===1&&['UL','OL','P','DIV','H1','H2','H3','H4','H5','H6','HR','BLOCKQUOTE','PRE','TABLE'].includes((node as Element).tagName);
    if(!root.contains(list)||!Array.from(list.childNodes).some(block))continue;
    const fragment=root.ownerDocument.createDocumentFragment();
    const count=Array.from(list.children).filter(node=>node.tagName==='LI').length;
    let ordinal=Number(list.getAttribute('start')??(list.hasAttribute('reversed')?count:1));
    let segment=list.cloneNode(false) as HTMLElement;segment.removeAttribute('id');
    const flush=()=>{if(Array.from(segment.childNodes).some(meaningful))fragment.append(segment);segment=list.cloneNode(false) as HTMLElement;segment.removeAttribute('id');if(list.tagName==='OL')segment.setAttribute('start',String(ordinal));};
    while(list.firstChild) {
      const node=list.firstChild;
      if(block(node)){flush();fragment.append(node);}
      else {if(node.nodeType===1&&(node as Element).tagName==='LI'){if((node as Element).hasAttribute('value'))ordinal=Number((node as Element).getAttribute('value'));ordinal+=list.hasAttribute('reversed')?-1:1;}segment.append(node);}
    }
    flush();list.replaceWith(fragment);changed=true;
  }
  if(changed&&bookmark&&root.contains(bookmark.anchor)&&root.contains(bookmark.focus)) {
    try{selection!.setBaseAndExtent(bookmark.anchor,bookmark.a,bookmark.focus,bookmark.f);}catch{/* Browser may have replaced a selection endpoint. */}
  }
  return changed;
}

/** Backspace at the start removes one list level rather than an uneditable dot. */
export function backspaceListMarker(editor:HTMLElement):boolean {
  const selection=editor.ownerDocument.getSelection();if(!selection?.rangeCount||!selection.isCollapsed)return false;
  const range=selection.getRangeAt(0),element=range.startContainer.nodeType===1?range.startContainer as Element:range.startContainer.parentElement;
  const item=element?.closest('li');if(!item||!editor.contains(item))return false;
  const prefix=range.cloneRange();prefix.selectNodeContents(item);prefix.setEnd(range.startContainer,range.startOffset);
  const content=prefix.cloneContents();if(content.textContent?.replace(/[\s\u200b]/g,'')||content.querySelector('ul,ol,hr,img,table'))return false;
  return editor.ownerDocument.execCommand('outdent',false);
}
