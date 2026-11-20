import {PAGE_FONTS,NOTE_FONT_SIZES} from './page-format';
import {applySelectionSpacing} from './editor-spacing';
import {editorForRange} from './editor-selection';
export {editorForRange, paragraphSelector} from './editor-selection';

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

/** Route history to this editor only, never to the document-wide browser stack. */
export function applyEditorHistory(range:Range|null,direction:'undo'|'redo') {
  const editor=editorForRange(range);
  if(!editor||!range)return false;
  const selection=window.getSelection();editor.focus();selection?.removeAllRanges();selection?.addRange(range);
  const detail={direction,applied:false};
  editor.dispatchEvent(new CustomEvent('kachamak-history',{detail}));
  return detail.applied;
}

/** Keep indentation in the editor whose selection the toolbar captured. */
export function applyEditorIndent(range:Range|null,direction:'indent'|'outdent') {
  const editor=editorForRange(range);
  if(!editor||!range)return false;
  const selection=window.getSelection();editor.focus();selection?.removeAllRanges();selection?.addRange(range);
  const applied=document.execCommand(direction,false);
  if(applied){editor.dispatchEvent(new Event('input',{bubbles:true}));document.dispatchEvent(new Event('selectionchange'));}
  return applied;
}

export function applyEditorColour(range:Range|null,kind:'text'|'highlight',colour:string) {
  const editor=editorForRange(range);if(!editor||!range)return false;
  const selection=window.getSelection();editor.focus();selection?.removeAllRanges();selection?.addRange(range);
  document.execCommand('styleWithCSS',false,'true');
  const applied=document.execCommand(kind==='text'?'foreColor':'hiliteColor',false,colour||(kind==='text'?'inherit':'transparent'));
  if(applied){editor.dispatchEvent(new Event('input',{bubbles:true}));document.dispatchEvent(new Event('selectionchange'));}
  return applied;
}

/** Inline typography changes only selected text leaves; never set page defaults. */
export function applyEditorTypography(range:Range|null,property:'fontFamily'|'fontSize'|'lineHeight',value:string) {
  const editor=editorForRange(range);
  if(!editor||!range||range.collapsed||editor.getAttribute('contenteditable')!=='true')return false;
  if(property==='fontFamily'&&!PAGE_FONTS.includes(value))return false;
  if(property==='fontSize'&&!NOTE_FONT_SIZES.some(size=>value===`${size}px`))return false;
  if(property==='lineHeight')return applySelectionSpacing(range,{leading:Number(value)});
  const leaves:{node:Text;start:number;end:number}[]=[];
  const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);
  let node:Node|null;
  while((node=walker.nextNode())){
    if(!range.intersectsNode(node)||node.parentElement?.closest('[contenteditable="false"]'))continue;
    const text=node as Text,start=range.startContainer===text?range.startOffset:0,end=range.endContainer===text?range.endOffset:text.length;
    if(end>start)leaves.push({node:text,start,end});
  }

  if(!leaves.length)return false;
  editor.dispatchEvent(new InputEvent('beforeinput',{bubbles:true,inputType:'formatFontName'}));
  const spans:HTMLSpanElement[]=[];
  for(const leaf of leaves.reverse()){
    if(leaf.end<leaf.node.length)leaf.node.splitText(leaf.end);
    const selected=leaf.start?leaf.node.splitText(leaf.start):leaf.node;
    const parent=selected.parentElement;
    if(parent?.matches('span[data-editor-typography]')&&parent.childNodes.length===1){parent.style[property]=value;spans.unshift(parent as HTMLSpanElement);continue;}
    const span=document.createElement('span');span.style[property]=value;span.dataset.editorTypography='true';
    selected.replaceWith(span);span.append(selected);spans.unshift(span);
  }
  const selection=window.getSelection(),next=document.createRange();
  next.setStart(spans[0].firstChild!,0);next.setEnd(spans.at(-1)!.firstChild!,spans.at(-1)!.textContent!.length);
  editor.focus();selection?.removeAllRanges();selection?.addRange(next);
  editor.dispatchEvent(new Event('input',{bubbles:true}));document.dispatchEvent(new Event('selectionchange'));
  return true;
}
