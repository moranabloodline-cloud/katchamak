export function editorForRange(range:Range|null):HTMLElement|null {
  if(!range)return null;
  const element=range.commonAncestorContainer.nodeType===1?range.commonAncestorContainer as Element:range.commonAncestorContainer.parentElement;
  const editor=element?.closest<HTMLElement>('.kachamak-editor')??null;
  return editor?.isConnected?editor:null;
}
export function selectionBlock(range:Range|null):string {
  const editor=editorForRange(range);if(!editor||!range)return 'normal';
  const node=range.startContainer.nodeType===1?range.startContainer as Element:range.startContainer.parentElement;
  const block=node?.closest('h1,h2,h3,h4,h5,h6,blockquote');
  return block&&editor.contains(block)?(block.tagName==='BLOCKQUOTE'?'quote':block.tagName.toLowerCase()):'normal';
}
export function applyBlockStyle(range:Range|null,style:string) {
  const editor=editorForRange(range);
  if(!editor||!range||!['normal','quote','h1','h2','h3','h4','h5','h6'].includes(style))return false;
  const selection=window.getSelection();editor.focus();selection?.removeAllRanges();selection?.addRange(range);
  const applied=document.execCommand('formatBlock',false,style==='normal'?'p':style==='quote'?'blockquote':style);
  if(applied){editor.dispatchEvent(new Event('input',{bubbles:true}));document.dispatchEvent(new Event('selectionchange'));}
  return applied;
}
