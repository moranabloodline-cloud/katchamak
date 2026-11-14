'use client';
import DOMPurify from 'dompurify';
const properties = new Set(['font-family','font-size','font-weight','font-style','font-variant','text-align','text-indent','text-transform','text-decoration-line','text-decoration-style','line-height','letter-spacing','word-spacing','white-space','vertical-align','margin','margin-top','margin-bottom','margin-left','margin-right','padding','padding-top','padding-bottom','padding-left','padding-right','list-style-type','list-style-position','border-collapse','width','height']);
function formatting(css: string) {
  const style = document.createElement('span').style; style.cssText = css.replace(/^\s*;+/, '');
  const clean = document.createElement('span').style;
  for (const property of properties) {
    const value = style.getPropertyValue(property);
    if (value && !/url\s*\(|expression\s*\(|var\s*\(/i.test(value)) clean.setProperty(property,value);
  }
  // Preserve underlining/strikethrough without importing decoration colors.
  const decoration = style.getPropertyValue('text-decoration');
  if(decoration && !clean.textDecorationLine)clean.textDecorationLine=decoration.split(/\s+/).filter(v=>['underline','line-through','overline','none'].includes(v)).join(' ');
  return clean.cssText;
}
export function preparePastedContent(html: string, text: string): string {
  if (!html) return '<span style="white-space: pre-wrap">'+text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\r\n?/g,'\n').replace(/\n/g,'<br>')+'</span>';
  const doc = new DOMParser().parseFromString(html,'text/html');
  const inherited = new Map<Element,string>();
  // Office/Docs clipboard fragments often keep paragraph spacing in class rules.
  for(const sheet of doc.querySelectorAll('style')) for(const rule of sheet.textContent?.matchAll(/([^{}]+)\{([^{}]*)\}/g) ?? []) {
    if(rule[1].includes('@'))continue;
    try { for(const el of doc.querySelectorAll(rule[1].trim())) inherited.set(el,(inherited.get(el)||'')+';'+formatting(rule[2])); } catch { /* Unsupported source selector. */ }
  }
  doc.querySelectorAll('script,style,link,meta,iframe,object,embed,svg,img').forEach(el=>el.remove());
  for(const el of doc.body.querySelectorAll('*')) {
    const css = formatting((inherited.get(el)||'')+';'+(el.getAttribute('style')||''));
    for(const attr of Array.from(el.attributes)) if(!['data-katchamak-note','title','href','colspan','rowspan','start','reversed','type','face','size'].includes(attr.name))el.removeAttribute(attr.name);
    if(css)el.setAttribute('style',css);
    if(['P','DIV'].includes(el.tagName) && !el.textContent?.replace(/[\s\u00a0]/g,'') && !el.querySelector('br,table,ul,ol'))el.innerHTML='<br>';
    if(el.tagName==='P') { const style=(el as HTMLElement).style; if(!style.margin && !style.marginTop && !style.marginBottom)style.marginBottom='1em'; }
  }
  DOMPurify.sanitize(doc.body,{IN_PLACE:true,ALLOWED_TAGS:['body','p','div','span','br','b','strong','i','em','u','s','strike','sub','sup','h1','h2','h3','h4','h5','h6','blockquote','pre','code','ul','ol','li','table','thead','tbody','tfoot','tr','th','td','a','font','hr'],ALLOWED_ATTR:['data-katchamak-note','title','style','href','colspan','rowspan','start','reversed','type','face','size']});
  return doc.body.innerHTML;
}

