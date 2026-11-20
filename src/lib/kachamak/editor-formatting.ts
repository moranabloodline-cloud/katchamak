import {editorForRange} from './editor-blocks';

const blocks='p,div,h1,h2,h3,h4,h5,h6,li,pre,blockquote';
const blockTags=new Set(['P','DIV','H1','H2','H3','H4','H5','H6','UL','OL','LI','PRE','BLOCKQUOTE','TABLE']);
function textOffset(editor:HTMLElement,node:Node,offset:number){const prefix=document.createRange();prefix.selectNodeContents(editor);prefix.setEnd(node,offset);return prefix.toString().length;}
function textPoint(editor:HTMLElement,offset:number,next:boolean):[Node,number]|null {
  const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);let node:Node|null,last:Text|null=null,total=0;
  while((node=walker.nextNode())){const text=node as Text;if(offset<total+text.length||offset===total+text.length&&!next)return [text,offset-total];total+=text.length;last=text;}
  return last?[last,last.length]:null;
}
function selectedText(editor:HTMLElement,range:Range) {
  const result:Text[]=[],walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);
  let node:Node|null;
  while((node=walker.nextNode())){
    if(!range.intersectsNode(node))continue;
    const start=range.startContainer===node?range.startOffset:0,end=range.endContainer===node?range.endOffset:node.textContent!.length;
    if(end>start)result.push(node as Text);
  }
  return result;
}

/** Markers move with the content, so splitting quotes keeps the exact selection. */
function format(range:Range|null,action:(editor:HTMLElement,current:()=>Range,start:Comment,end:Comment)=>void) {
  const editor=editorForRange(range);
  if(!editor||!range||editor.getAttribute('contenteditable')!=='true')return false;
  const before=editor.innerHTML,selection=window.getSelection(),working=range.cloneRange(),collapsed=range.collapsed;
  const from=textOffset(editor,working.startContainer,working.startOffset),to=textOffset(editor,working.endContainer,working.endOffset);
  const startNext=working.startOffset===0,endNext=collapsed?startNext:working.endOffset===0;
  editor.focus();selection?.removeAllRanges();selection?.addRange(working);
  editor.dispatchEvent(new InputEvent('beforeinput',{bubbles:true,inputType:'formatBlock'}));
  // Native commands may emit input synchronously. Commit only the clean final
  // HTML once, so temporary bookmarks never enter storage or Undo history.
  const silence=(event:Event)=>event.stopImmediatePropagation();
  editor.addEventListener('input',silence,true);editor.addEventListener('beforeinput',silence,true);
  const start=document.createComment('selection-start'),end=document.createComment('selection-end');
  const tail=working.cloneRange();tail.collapse(false);tail.insertNode(end);
  const head=working.cloneRange();head.collapse(true);head.insertNode(start);
  const current=()=>{const selected=document.createRange();selected.setStartAfter(start);selected.setEndBefore(end);return selected;};
  try {action(editor,current,start,end);}
  finally {
    let restored=start.isConnected&&end.isConnected?current():document.createRange();
    start.remove();end.remove();editor.normalize();
    const fromPoint=textPoint(editor,from,startNext),toPoint=textPoint(editor,to,endNext);
    if(fromPoint&&toPoint){restored=document.createRange();restored.setStart(...fromPoint);restored.setEnd(...toPoint);}
    if(collapsed)restored.collapse(true);
    editor.focus({preventScroll:true});
    selection?.removeAllRanges();selection?.addRange(restored);
    editor.removeEventListener('input',silence,true);editor.removeEventListener('beforeinput',silence,true);
  }
  const changed=before!==editor.innerHTML;
  if(changed)editor.dispatchEvent(new Event('input',{bubbles:true}));
  document.dispatchEvent(new Event('selectionchange'));
  return changed;
}

function unquote(editor:HTMLElement,current:()=>Range,start:Comment) {
  // Inner quotes first; an outer quote can then release the same selected blocks.
  for(const quote of Array.from(editor.querySelectorAll('blockquote')).reverse()){
    const range=current(),texts=selectedText(editor,range);
    const groups:Node[][]=[];let inline:Node[]=[];
    const flushInline=()=>{if(inline.length){groups.push(inline);inline=[];}};
    for(const node of Array.from(quote.childNodes)){
      if(node.nodeType===1&&blockTags.has((node as Element).tagName)){flushInline();groups.push([node]);}
      else inline.push(node);
    }
    flushInline();
    const selected=groups.map(group=>group.some(node=>texts.some(text=>node===text||node.contains(text))||!texts.length&&(node===start||node.contains(start))));
    if(!selected.some(Boolean))continue;
    const fragment=document.createDocumentFragment();let retained:HTMLElement|null=null;
    const flush=()=>{if(retained?.hasChildNodes())fragment.append(retained);retained=null;};
    groups.forEach((group,index)=>{
      if(!selected[index]){
        if(!retained){retained=quote.cloneNode(false) as HTMLElement;retained.removeAttribute('id');}
        retained.append(...group);return;
      }
      flush();
      if(group.length===1&&group[0].nodeType===1&&blockTags.has((group[0] as Element).tagName))fragment.append(group[0]);
      else {const paragraph=document.createElement('p');paragraph.append(...group);fragment.append(paragraph);}
    });
    flush();quote.replaceWith(fragment);
  }
}

export function applyEditorQuote(range:Range|null) {
  return format(range,(editor,current,start)=>{
    const selected=current(),texts=selectedText(editor,selected);
    const quoted=Array.from(editor.querySelectorAll('blockquote')).some(quote=>!texts.length&&quote.contains(start)||texts.some(text=>quote.contains(text)));
    if(quoted)unquote(editor,current,start);
    else {
      const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(selected);
      document.execCommand('formatBlock',false,'blockquote');
    }
  });
}

// Split inline wrappers at the selection edges so clearing part of a link or
// styled run keeps both neighbouring pieces with their original attributes.
function splitInlineAt(marker:Comment,editor:HTMLElement){
  let inline=marker.parentElement;
  while(inline&&inline!==editor&&inline.matches('a,b,strong,i,em,u,s,strike,span,font,small,big,sub,sup,mark,code')){
    const remainder=inline.cloneNode(false) as HTMLElement;
    remainder.removeAttribute('id');
    while(marker.nextSibling)remainder.append(marker.nextSibling);
    inline.after(marker);
    if(remainder.hasChildNodes())marker.after(remainder);
    if(!inline.hasChildNodes())inline.remove();
    inline=marker.parentElement;
  }
}

export function clearEditorFormatting(range:Range|null) {
  const collapsed=range?.collapsed??false;
  return format(range,(editor,current,start,end)=>{
    if(!collapsed){splitInlineAt(end,editor);splitInlineAt(start,editor);}
    let selected=current();
    if(collapsed){
      const block=start.parentElement?.closest<HTMLElement>(blocks);
      if(block&&block!==editor){selected=document.createRange();selected.selectNodeContents(block);}
    }
    const texts=selectedText(editor,selected);
    const selectedBlocks=Array.from(editor.querySelectorAll<HTMLElement>(blocks)).filter(block=>
      !block.querySelector(blocks)&&texts.some(text=>block.contains(text))&&
      (collapsed||texts.filter(text=>block.contains(text)).map(text=>text.data).join('')===block.textContent)
    );
    // removeFormat deliberately preserves anchors in Chromium. Unwrap only
    // links touched by the selection (or the caret's own link), including dead
    // note IDs and pasted website links; keep their text and unrelated links.
    const wholeParagraphs=selectedBlocks.length>0&&texts.every(text=>selectedBlocks.some(block=>block.contains(text)));
    const caretLink=start.parentElement?.closest('a');
    const links=collapsed?(caretLink&&editor.contains(caretLink)?[caretLink]:[]):Array.from(editor.querySelectorAll('a')).filter(link=>texts.some(text=>link.contains(text)));
    if(!collapsed){
      for(const span of Array.from(editor.querySelectorAll('span[data-editor-typography]')).reverse()){
        if(texts.some(text=>span.contains(text)))span.replaceWith(...span.childNodes);
      }
    }
    for(const link of links)link.replaceWith(...Array.from(link.childNodes));
    if(!collapsed)selected=current();
    const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(selected);
    document.execCommand('removeFormat',false);
    for(const block of selectedBlocks){
      block.removeAttribute('style');block.removeAttribute('data-editor-line-height');
      if(/^H[1-6]$/.test(block.tagName)){const paragraph=document.createElement('p');paragraph.append(...Array.from(block.childNodes));block.replaceWith(paragraph);}
    }
    if(collapsed||wholeParagraphs)unquote(editor,current,start);
  });
}
