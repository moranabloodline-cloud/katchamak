import {editorForRange} from './editor-blocks';
import {indexText} from './note-links';

function replaceListItem(item:HTMLElement,selection:Selection){
  const list=item.parentElement;if(!list||!['UL','OL'].includes(list.tagName))return false;
  const before=list.cloneNode(false) as HTMLElement,after=list.cloneNode(false) as HTMLElement;
  before.removeAttribute('id');after.removeAttribute('id');
  const items=Array.from(list.children).filter(node=>node.tagName==='LI');
  let ordinal=Number(list.getAttribute('start')??(list.hasAttribute('reversed')?items.length:1)),afterStart=ordinal;
  if(list.tagName==='OL')before.setAttribute('start',String(ordinal));
  for(const entry of items){if(entry.hasAttribute('value'))ordinal=Number(entry.getAttribute('value'));ordinal+=list.hasAttribute('reversed')?-1:1;if(entry===item){afterStart=ordinal;break;}}
  let passed=false;
  for(const child of Array.from(list.childNodes)){if(child===item){passed=true;continue;}(passed?after:before).append(child.cloneNode(true));}
  if(list.tagName==='OL')after.setAttribute('start',String(afterStart));
  const rule=document.createElement('hr'),paragraph=document.createElement('p');paragraph.append(document.createElement('br'));
  const fragment=document.createDocumentFragment();
  if(before.querySelector('li'))fragment.append(before);
  fragment.append(rule,paragraph);
  if(after.querySelector('li'))fragment.append(after);
  // Chromium formatting can leave a list inside a paragraph. Split that
  // wrapper so the new rule and paragraph remain valid block siblings.
  const parent=list.parentElement;
  if(parent?.tagName==='P'){
    const leading=parent.cloneNode(false) as HTMLElement,trailing=parent.cloneNode(false) as HTMLElement;
    let passedList=false;
    for(const child of Array.from(parent.childNodes)){if(child===list){passedList=true;continue;}(passedList?trailing:leading).append(child.cloneNode(true));}
    const replacement=document.createDocumentFragment();
    if(leading.hasChildNodes())replacement.append(leading);
    replacement.append(fragment);
    if(trailing.hasChildNodes())replacement.append(trailing);
    parent.replaceWith(replacement);
  }else list.replaceWith(fragment);
  const caret=document.createRange();caret.setStart(paragraph,0);caret.collapse(true);selection.removeAllRanges();selection.addRange(caret);
  return true;
}

/** An isolated --- becomes a rule immediately; prose, code and headings stay literal. */
export function insertTypedDivider(editor:HTMLElement) {
  const selection=window.getSelection();
  if(!selection?.rangeCount||!selection.isCollapsed)return false;
  const caret=selection.getRangeAt(0);
  if(editorForRange(caret)!==editor)return false;
  const element=caret.startContainer.nodeType===1?caret.startContainer as Element:caret.startContainer.parentElement;
  if(element?.closest('pre,code,h1,h2,h3,h4,h5,h6'))return false;
  const block=element?.closest<HTMLElement>('p,div,li');
  if(!block||(block!==editor&&!editor.contains(block)))return false;
  const {text,parts}=indexText(block),prefix=caret.cloneRange();prefix.selectNodeContents(block);prefix.setEnd(caret.endContainer,caret.endOffset);
  const current=parts.find(part=>part.node===caret.startContainer),offset=current?current.start+caret.startOffset:indexText(prefix.cloneContents()).text.length,start=text.lastIndexOf('\n',Math.max(0,offset-1))+1,next=text.indexOf('\n',offset),end=next<0?text.length:next;
  if(text.slice(start,end).trim()!=='---'||text.slice(offset,end).trim())return false;
  const item=block.closest<HTMLElement>('li');
  if(item){
    // Exit a marker-only list item, retaining adjacent items and numbering.
    if(item.textContent?.trim()!=='---'||item.querySelector('ul,ol,img,table'))return false;
    return replaceListItem(item,selection);
  }
  const range=document.createRange();
  if(text.trim()==='---'&&!block.querySelector('img,table,ul,ol,hr')){
    if(block===editor)range.selectNodeContents(block);else range.selectNode(block);
  }else{
    // A soft line break is a real line too, even inside an imported div.
    const first=parts.find(part=>part.end>start&&part.start<end),last=parts.findLast(part=>part.end>start&&part.start<end);
    if(!first||!last)return false;
    range.setStart(first.node,Math.max(0,start-first.start));range.setEnd(last.node,Math.min(last.node.length,end-last.start));
  }
  selection.removeAllRanges();selection.addRange(range);
  return document.execCommand('insertHTML',false,'<hr><p><br></p>');
}
