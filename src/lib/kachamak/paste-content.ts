'use client';
import DOMPurify from 'dompurify';
import {repairListWrappers} from './editor-lists';
import {tableFormatting} from './editor-table-format';
// Only carry inline emphasis and significant whitespace. The destination
// supplies the font, type scale, leading, alignment and page layout.
function formatting(el:Element,css:string) {
  const declarations=css.replace(/^\s*;+/, '').trim();
  if(!declarations)return '';
  const style=document.createElement('span').style;
  style.cssText=declarations;
  const clean=document.createElement('span').style;
  if(style.fontWeight==='bold'||Number(style.fontWeight)>=600)clean.fontWeight='bold';
  else if(style.fontWeight==='normal'||Number(style.fontWeight)>0)clean.fontWeight='normal';
  if(['italic','oblique','normal'].includes(style.fontStyle))clean.fontStyle=style.fontStyle;
  const decoration=style.textDecorationLine||style.textDecoration;
  clean.textDecorationLine=decoration.split(/\s+/).filter(value=>['underline','line-through','none'].includes(value)).join(' ');
  if(['sub','super'].includes(style.verticalAlign))clean.verticalAlign=style.verticalAlign;
  if(['pre','pre-wrap','break-spaces'].includes(style.whiteSpace))clean.whiteSpace='pre-wrap';
  if(style.whiteSpace==='pre-line')clean.whiteSpace='pre-line';
  // Original paragraph spacing can display an explicit source gap. The
  // existing page-spacing rule takes precedence for any chosen note gap.
  if(el.matches('p,div')&&!el.querySelector('p,div,h1,h2,h3,h4,h5,h6,ul,ol,table,blockquote,hr,pre')){
    for(const edge of ['marginTop','marginBottom'] as const){
      if(/^(?:\d+(?:\.\d+)?|\.\d+)(?:px|pt|em|rem|mm|cm|in|pc|%)?$/.test(style[edge]))clean[edge]=style[edge];
    }
  }
  return clean.cssText;
}

function plainTextContent(text:string):string {
  if(!text)return '';
  const lines=text.replace(/\r\n?/g,'\n').split('\n');
  const escaped=lines.map(line=>{
    const span=document.createElement('span');
    span.textContent=line;
    if(/^\s|\s$| {2}|\t/.test(line)){span.style.whiteSpace='pre-wrap';return span.outerHTML;}
    return span.innerHTML;
  });
  return lines.length===1?escaped[0]:escaped.map(line=>'<p>'+(line||'<br>')+'</p>').join('');
}

// Native insertHTML can merge the last paragraph into the style at the caret
// and write the current pixel size into the manuscript. Insert heading-bearing
// fragments as blocks so their typography can continue to follow the tab.
export function insertHeadingFragment(editor:HTMLElement,html:string):boolean {
  if(!/<h[1-6](?:\s|>)/i.test(html))return false;
  const doc=editor.ownerDocument,selection=doc.getSelection();
  if(!selection?.rangeCount)return false;
  const range=selection.getRangeAt(0);
  if(!editor.contains(range.commonAncestorContainer))return false;

  const scopeOf=(node:Node)=>{
    const element=node.nodeType===1?node as Element:node.parentElement;
    const scope=element?.closest('li,td,th,blockquote');
    return scope&&editor.contains(scope)?scope:editor;
  };
  const scope=scopeOf(range.startContainer);
  if(scope!==scopeOf(range.endContainer))return false;
  const template=doc.createElement('template');
  template.innerHTML=html;
  const content=template.content;
  // Clipboard HTML often ends with a newline after the final block.
  const last=Array.from(content.childNodes).findLast(node=>node.nodeType===1 || node.textContent?.trim());
  if(!last)return false;

  const replacement=range.cloneRange();
  const parts=doc.createDocumentFragment();
  // Split at the block boundary, keeping the surrounding text and its original
  // inline marks on either side. Ignore an empty paragraph's caret placeholder.
  const edge=(node:Node,offset:number,before:boolean)=>{
    if(node===scope)return;
    let block=node;
    const length=node.nodeType===3?node.textContent!.length:node.childNodes.length;
    let keep=before?offset>0:offset<length;
    while(block.parentNode!==scope && block.parentNode){
      keep ||= !!(before?block.previousSibling:block.nextSibling);
      block=block.parentNode;
    }
    const part=doc.createRange();
    part.selectNode(block);
    if(before){part.setEnd(node,offset);replacement.setStartBefore(block);}
    else{part.setStart(node,offset);replacement.setEndAfter(block);}
    const placeholder=block.nodeType===1 && (block as Element).innerHTML==='<br>';
    if(keep && !placeholder)parts.append(part.cloneContents());
  };
  edge(range.startContainer,range.startOffset,true);
  parts.append(content);
  edge(range.endContainer,range.endOffset,false);
  replacement.deleteContents();
  replacement.insertNode(parts);
  // Keep subsequent typing in the last pasted paragraph.
  if(last.nodeType===1 && (last as Element).matches('br,hr')){
    range.setStartAfter(last);range.collapse(true);
  }else{
    range.selectNodeContents(last);
    range.collapse(last.nodeType===1 && (last as Element).innerHTML==='<br>');
  }
  selection.removeAllRanges();selection.addRange(range);
  return true;
}

export function preparePastedContent(html: string, text: string): string {
  if (!html) return plainTextContent(text);
  const doc = new DOMParser().parseFromString(html,'text/html');
  const inherited = new Map<Element,string>();
  // Office/Docs clipboard fragments often keep paragraph spacing in class rules.
  for(const sheet of doc.querySelectorAll('style')) for(const rule of sheet.textContent?.matchAll(/([^{}]+)\{([^{}]*)\}/g) ?? []) {
    if(rule[1].includes('@'))continue;
    try { for(const el of doc.querySelectorAll(rule[1].trim())) inherited.set(el,(inherited.get(el)||'')+';'+rule[2]); } catch { /* Unsupported source selector. */ }
  }
  doc.querySelectorAll('script,style,link,meta,iframe,object,embed,svg,img').forEach(el=>el.remove());
  for(const el of doc.body.querySelectorAll('*')) {
    const css = [formatting(el,(inherited.get(el)||'')+';'+(el.getAttribute('style')||'')),
      el.matches('table,td,th') ? tableFormatting(el as HTMLElement) : ''].filter(Boolean).join(' ');
    // Word and accessible editors also mark headings without using an h tag.
    const level=el.getAttribute('role')==='heading'?el.getAttribute('aria-level'):
      el.matches('p')?Array.from(el.classList).join(' ').match(/\bMsoHeading([1-6])\b/i)?.[1]:null;
    if(level&&/^[1-6]$/.test(level)&&!el.matches('h1,h2,h3,h4,h5,h6')){
      const heading=doc.createElement('h'+level);
      heading.append(...el.childNodes);el.replaceWith(heading);continue;
    }
    for(const attr of Array.from(el.attributes)) if(!['data-katchamak-note','data-editor-table-borderless','title','href','colspan','rowspan','start','reversed','type','value'].includes(attr.name))el.removeAttribute(attr.name);
    if(css)el.setAttribute('style',css);
    if(el.matches('p,div')&&!el.children.length&&(el.textContent===''||el.textContent==='\u00a0'))el.replaceChildren(doc.createElement('br'));
  }
  DOMPurify.sanitize(doc.body,{IN_PLACE:true,ALLOWED_TAGS:['body','p','div','span','br','b','strong','i','em','u','s','strike','sub','sup','h1','h2','h3','h4','h5','h6','blockquote','pre','code','ul','ol','li','table','thead','tbody','tfoot','tr','th','td','a','font','hr'],ALLOWED_ATTR:['data-katchamak-note','data-editor-table-borderless','title','style','href','colspan','rowspan','start','reversed','type','value']});
  repairListWrappers(doc.body);
  return doc.body.innerHTML.trim()?doc.body.innerHTML:plainTextContent(text);
}

