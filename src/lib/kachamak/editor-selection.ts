export function editorForRange(range:Range|null):HTMLElement|null {
  if(!range)return null;
  const element=range.commonAncestorContainer.nodeType===1?range.commonAncestorContainer as Element:range.commonAncestorContainer.parentElement;
  const editor=element?.closest<HTMLElement>('.kachamak-editor')??null;
  return editor?.isConnected?editor:null;
}
export const paragraphSelector='p,div,li,h1,h2,h3,h4,h5,h6,blockquote,pre,td,th';

/** Trim only a native double-click word selection; never edit the document. */
export function trimWordSelection(editor:HTMLElement|null) {
  const selection=window.getSelection();
  if(!editor||!selection?.rangeCount||selection.isCollapsed)return false;
  const range=selection.getRangeAt(0);
  if(!editor.contains(range.startContainer)||!editor.contains(range.endContainer))return false;
  const parts:{node:Text;start:number;end:number}[]=[];
  const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);let node:Node|null;
  while((node=walker.nextNode())){
    if(!range.intersectsNode(node))continue;
    const start=range.startContainer===node?range.startOffset:0,end=range.endContainer===node?range.endOffset:node.textContent!.length;
    if(end>start)parts.push({node:node as Text,start,end});
  }
  const text=parts.map(part=>part.node.data.slice(part.start,part.end)).join('');
  const leading=text.length-text.trimStart().length,end=text.trimEnd().length;
  if(leading>=end||leading===0&&end===text.length)return false;
  const point=(offset:number,last=false):[Text,number]=>{
    let passed=0;
    for(const part of parts){const size=part.end-part.start;if(offset<passed+size||last&&offset===passed+size)return [part.node,part.start+offset-passed];passed+=size;}
    const tail=parts[parts.length-1];return [tail.node,tail.end];
  };
  const backward=selection.anchorNode===range.endContainer&&selection.anchorOffset===range.endOffset;
  const from=point(leading),to=point(end,true);
  selection.setBaseAndExtent(...(backward?[...to,...from]:[...from,...to]) as [Node,number,Node,number]);
  document.dispatchEvent(new Event('selectionchange'));
  return true;
}
