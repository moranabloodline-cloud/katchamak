'use client';
import DOMPurify from 'dompurify';
import {repairListWrappers} from './editor-lists';
import {tableFormatting} from './editor-table-format';
import {finishPastedEditorialLayout, pastedEditorialFormat, pastedLayoutAttributes, pastedProgress, transferPastedColumnWidths} from './paste-layout';

export type PasteMode = 'rich' | 'match' | 'plain';
export const pasteMediaAttribute = 'data-draftopus-paste-media';
export const pastedDocumentAttribute = 'data-draftopus-paste';
type PrepareMedia = (element: Element) => Node | null;

// Shared emphasis and whitespace rules for both formatted modes.
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
      if(/^(?:\d+(?:\.\d+)?|\.\d+)(?:px|pt|em|rem|mm|cm|%)?$/.test(style[edge]) &&
        Number.parseFloat(style[edge]) <= (/(?:em|cm)$/.test(style[edge]) ? 4 : 96))clean[edge]=style[edge];
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
  return /<h[1-6](?:\s|>)/i.test(html) && insertBlocks(editor,html);
}

export function insertPastedBlocks(editor:HTMLElement,html:string):boolean {
  return /<(?:h[1-6]|table|figure|aside)(?:\s|>)| data-draftopus-(?:layout|media)=/i.test(html) && insertBlocks(editor,html);
}

function insertBlocks(editor:HTMLElement,html:string):boolean {
  const doc=editor.ownerDocument,selection=doc.getSelection();
  if(!selection?.rangeCount)return false;
  const range=selection.getRangeAt(0);
  if(!editor.contains(range.commonAncestorContainer))return false;

  const scopeOf=(node:Node)=>{
    const element=node.nodeType===1?node as Element:node.parentElement;
    const scope=element?.closest('li,td,th,blockquote,[data-draftopus-layout="card"]');
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
  if(last.nodeType===1 && (last as Element).matches('br,hr,figure,table,[data-draftopus-paste],[data-draftopus-media]')){
    range.setStartAfter(last);range.collapse(true);
  }else{
    range.selectNodeContents(last);
    range.collapse(last.nodeType===1 && (last as Element).innerHTML==='<br>');
  }
  selection.removeAllRanges();selection.addRange(range);
  return true;
}

const allowedAttributes = ['data-katchamak-note','data-editor-table-borderless','title','href','colspan','rowspan','start','reversed','type','value'];
const allowedTags = ['div','p','span','br','b','strong','i','em','u','s','strike','sub','sup','h1','h2','h3','h4','h5','h6','blockquote','pre','code','ul','ol','li','table','caption','thead','tbody','tfoot','tr','th','td','a','font','hr','figure','figcaption','section','aside','article','mark'];

function pasteLink(value: string) {
  return /^(?:https?:\/\/|mailto:|#)/i.test(value) ? value : value.startsWith('//') ? 'https:' + value : '';
}

export function preparePastedContent(html: string, text: string, mode: PasteMode = 'match', prepareMedia?: PrepareMedia): string {
  if (!html || mode === 'plain') return plainTextContent(text);
  // A template does not request resources from pasted img, iframe or link tags.
  const template = document.createElement('template');
  template.innerHTML = html;
  const doc = template.content.ownerDocument;
  const root = doc.createElement('div');
  root.append(template.content);
  const inherited = new Map<Element,string>();
  // Office/Docs clipboard fragments often keep paragraph spacing in class rules.
  let rules = 0;
  for(const sheet of Array.from(root.querySelectorAll('style')).slice(0,16)) {
    for(const rule of sheet.textContent?.slice(0,128_000).matchAll(/([^{}]+)\{([^{}]*)\}/g) ?? []) {
      if(++rules>256)break;
      if(rule[1].length>200 || /[@:]/.test(rule[1]) || rule[2].length>4000)continue;
      try { for(const el of root.querySelectorAll(rule[1].trim())) inherited.set(el,(inherited.get(el)||'')+';'+rule[2]); } catch { /* Unsupported source selector. */ }
    }
  }
  root.querySelectorAll('script,style,link,meta,base,iframe,object,embed,button,input,textarea,select,noscript,[hidden],[aria-hidden="true"]').forEach(el=>el.remove());
  if(mode === 'rich')transferPastedColumnWidths(root);
  for(const el of root.querySelectorAll('*')) {
    if(!root.contains(el))continue;
    if(el.matches('img,svg')) {
      const replacement = prepareMedia?.(el);
      if(replacement)el.replaceWith(replacement);
      else el.remove();
      continue;
    }
    if(el.matches('canvas')) {
      const label = el.getAttribute('aria-label')?.trim();
      if(!el.textContent?.trim() && label)el.replaceWith(doc.createTextNode(label));
      continue;
    }
    if(mode==='rich' && el.matches('meter,progress,[role="progressbar"]')){
      const progress=pastedProgress(el);
      if(progress){el.replaceWith(progress);continue;}
    }
    const declarations = (inherited.get(el)||'')+';'+(el.getAttribute('style')||'');
    const editorial = mode === 'rich' ? pastedEditorialFormat(el as HTMLElement,declarations) : undefined;
    const css = [formatting(el,declarations),el.matches('table,td,th') ? tableFormatting(el as HTMLElement) : '',editorial?.css].filter(Boolean).join(' ');
    if(el.getAttribute('role')==='separator' || el.getAttribute('data-d-component')==='divider'){
      el.replaceWith(doc.createElement('hr'));
      continue;
    }
    // Word and accessible editors also mark headings without using an h tag.
    const level=el.getAttribute('role')==='heading'?el.getAttribute('aria-level'):
      el.matches('p')?Array.from(el.classList).join(' ').match(/\bMsoHeading([1-6])\b/i)?.[1]:null;
    let target = el;
    if(level&&/^[1-6]$/.test(level)&&!el.matches('h1,h2,h3,h4,h5,h6')){
      target=doc.createElement('h'+level);
      target.append(...el.childNodes);
      el.replaceWith(target);
    }
    for(const attr of Array.from(target.attributes)) if(!allowedAttributes.includes(attr.name))target.removeAttribute(attr.name);
    if(target.matches('a[href]')){
      const href = pasteLink(target.getAttribute('href')!.trim());
      if(href)target.setAttribute('href',href);
      else target.removeAttribute('href');
    }
    if(css)target.setAttribute('style',css);
    for(const [attr,value] of Object.entries(editorial?.attributes ?? {}))target.setAttribute(attr,value);
    if(target.matches(mode==='rich'?'p':'p,div')&&!target.children.length&&(target.textContent===''||target.textContent==='\u00a0')&&
      editorial?.attributes['data-draftopus-layout']!=='bar')target.replaceChildren(doc.createElement('br'));
  }
  DOMPurify.sanitize(root,{IN_PLACE:true,ALLOWED_TAGS:[...allowedTags,'img'],ALLOWED_ATTR:[
    ...allowedAttributes,...pastedLayoutAttributes,'style',pasteMediaAttribute,
  ],ALLOW_DATA_ATTR:false});
  repairListWrappers(root);
  if(mode === 'rich') {
    // Discard empty wrappers left behind by removed buttons, favicons and
    // loading indicators. Keep blank paragraphs and meaningful layout blocks.
    for(const el of Array.from(root.querySelectorAll('div,span')).reverse()){
      if(!el.children.length && !el.textContent?.trim() && !el.hasAttribute('data-draftopus-layout'))el.remove();
    }
    finishPastedEditorialLayout(root);
    if(root.querySelector('table,figure,aside,[data-draftopus-layout],h1,h2,h3,h4,h5,h6') ||
      root.querySelectorAll('p').length > 1) {
      const container = doc.createElement('div');
      container.setAttribute(pastedDocumentAttribute,'');
      container.append(...root.childNodes);
      root.append(container);
    }
  }
  return root.innerHTML.trim() || plainTextContent(text);
}

