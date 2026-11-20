'use client';
import DOMPurify from 'dompurify';
import {repairListWrappers} from './editor-lists';
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
    const css = formatting(el,(inherited.get(el)||'')+';'+(el.getAttribute('style')||''));
    // Word and accessible editors also mark headings without using an h tag.
    const level=el.getAttribute('role')==='heading'?el.getAttribute('aria-level'):
      el.matches('p')?Array.from(el.classList).join(' ').match(/\bMsoHeading([1-6])\b/i)?.[1]:null;
    if(level&&/^[1-6]$/.test(level)&&!el.matches('h1,h2,h3,h4,h5,h6')){
      const heading=doc.createElement('h'+level);
      heading.append(...el.childNodes);el.replaceWith(heading);continue;
    }
    for(const attr of Array.from(el.attributes)) if(!['data-katchamak-note','title','href','colspan','rowspan','start','reversed','type','value'].includes(attr.name))el.removeAttribute(attr.name);
    if(css)el.setAttribute('style',css);
    if(el.matches('p,div')&&!el.children.length&&(el.textContent===''||el.textContent==='\u00a0'))el.replaceChildren(doc.createElement('br'));
  }
  DOMPurify.sanitize(doc.body,{IN_PLACE:true,ALLOWED_TAGS:['body','p','div','span','br','b','strong','i','em','u','s','strike','sub','sup','h1','h2','h3','h4','h5','h6','blockquote','pre','code','ul','ol','li','table','thead','tbody','tfoot','tr','th','td','a','font','hr'],ALLOWED_ATTR:['data-katchamak-note','title','style','href','colspan','rowspan','start','reversed','type','value']});
  repairListWrappers(doc.body);
  return doc.body.innerHTML.trim()?doc.body.innerHTML:plainTextContent(text);
}

