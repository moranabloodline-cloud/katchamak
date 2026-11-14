import {editorForRange} from './editor-blocks';

/** An isolated --- becomes a rule immediately; prose, code and headings stay literal. */
export function insertTypedDivider(editor:HTMLElement) {
  const selection=window.getSelection();
  if(!selection?.rangeCount||!selection.isCollapsed)return false;
  const caret=selection.getRangeAt(0);
  if(editorForRange(caret)!==editor)return false;
  const element=caret.startContainer.nodeType===1?caret.startContainer as Element:caret.startContainer.parentElement;
  if(element?.closest('pre,code,h1,h2,h3,h4,h5,h6,li'))return false;
  const block=element?.closest<HTMLElement>('p,div');
  if(!block||(block!==editor&&!editor.contains(block))||block.textContent?.trim()!=='---')return false;
  if(block===editor&&block.querySelector('p,div,h1,h2,h3,h4,h5,h6,pre,ul,ol,blockquote,hr'))return false;
  const tail=caret.cloneRange();tail.selectNodeContents(block);tail.setStart(caret.endContainer,caret.endOffset);
  if(tail.toString().trim())return false;
  const range=document.createRange();
  if(block===editor)range.selectNodeContents(block);else range.selectNode(block);
  selection.removeAllRanges();selection.addRange(range);
  return document.execCommand('insertHTML',false,'<hr><p><br></p>');
}
