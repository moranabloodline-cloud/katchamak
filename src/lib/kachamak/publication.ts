import {genreSamples} from './genre-samples';
import {manuscriptEntries,type ManuscriptEntry} from './publish-manuscript';
import DOMPurify from 'dompurify';
import type {BookStyle, BlockName, SpecialPage} from './book-style';
import {fontStacks,glyphs,trims} from './book-style';
import {projectImageSrc} from './project-image';
import type {Novel,NoteNode} from './types';

export type Proof = 'Manuscript'|'Title page'|'Chapter opening'|'Body text'|'Scene break'|'Special blocks'|'End matter'|SpecialPage;
export const proofs:Proof[]=['Manuscript','Title page','Chapter opening','Body text','Scene break','Special blocks','Copyright','Dedication','Contents','About the author','Colophon'];
export type Leaf={id:string;title:string;kind:'chapter'|'part'|'special';html:string};
export type Publication={title:string;author:string;lang:string;sections:Leaf[];coverImage?:string};
export const escapeText=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function chapterNumber(index:number,format:BookStyle['numbering']){
  if(format==='None')return '';
  if(format==='Arabic')return String(index);
  let out='';
  for(const [value,glyph] of [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']] as const){
    while(index>=value){out+=glyph;index-=value;}
  }
  return out;
}
const sampleParagraphs=[
  'At first light the ferryman found a letter tucked beneath the brass bell. The paper smelled faintly of cedar. Across the water, the windows of the old observatory were still dark.',
  'He knew the handwriting. For thirty years it had filled the margins of tide tables, correcting the moon by a minute here, a breath there. He sat down on the landing and broke the seal.',
  'A little wind came up the river. The boat shifted against its rope and the bell sounded once, as if someone on the far bank had answered.'
];
const paras=(value:string)=>value.split(/\n\s*\n/).map(p=>'<p>'+escapeText(p).replace(/\n/g,'<br/>')+'</p>').join('');
export const sampleBody=sampleParagraphs.map(paras).join('');
const sampleChapterTitle='The Far Bank';
function divider(style:BookStyle){return '<div class="scene" role="separator">'+escapeText(glyphs[style.divider])+'</div>';}
function preserveInlineEmphasis(element: HTMLElement) {
  if (!element.matches('span, a, b, strong, i, em, u, s, sup, sub')) return;
  const {style} = element;
  const decoration = (style.textDecorationLine || style.textDecoration).split(/\s+/);
  const marks = [
    [style.fontWeight === 'bold' || Number(style.fontWeight) >= 600, 'strong', 'strong, b'],
    [/^(?:italic|oblique)(?:\s|$)/.test(style.fontStyle), 'em', 'em, i'],
    [decoration.includes('underline'), 'u', 'u'],
    [decoration.includes('line-through'), 's', 's'],
    [style.verticalAlign === 'super', 'sup', 'sup'],
    [style.verticalAlign === 'sub', 'sub', 'sub'],
  ] as const;
  let content = element;
  for (const [enabled, tag, selector] of marks) {
    if (!enabled || element.closest(selector)) continue;
    const mark = element.ownerDocument.createElement(tag);
    mark.append(...Array.from(content.childNodes));
    content.append(mark);
    content = mark;
  }
}
function cleanBody(raw:string,book:Novel,sceneBreak:string,targets:Map<string,string>){
  const el=document.implementation.createHTMLDocument('').createElement('div');
  if(raw.includes('gallery:')){
    const template=document.createElement('template');
    template.innerHTML=raw;
    for(const img of template.content.querySelectorAll('img[src^="gallery:"]')){
      img.setAttribute('src',projectImageSrc(book.gallery,img.getAttribute('src')??'')??'');
    }
    raw=template.innerHTML;
  }
  el.innerHTML=DOMPurify.sanitize(raw,{ALLOWED_TAGS:['p','div','span','br','strong','b','em','i','u','s','sup','sub','ul','ol','li','blockquote','pre','h1','h2','h3','h4','h5','h6','hr','img','a','table','thead','tbody','tr','th','td','figure','figcaption','section','aside'],ALLOWED_ATTR:['href','src','alt','class','data-block','style','start','value','reversed','colspan','rowspan'],ALLOW_DATA_ATTR:false});
  for(const n of Array.from(el.querySelectorAll<HTMLElement>('*'))){
    const old=n.getAttribute('data-block')||n.className;
    n.removeAttribute('class');n.removeAttribute('data-block');
    // Convert editor marks before the publication preset replaces source CSS.
    preserveInlineEmphasis(n);
    n.removeAttribute('style');
    if(n.tagName==='IMG'){
      const src=projectImageSrc(book.gallery,n.getAttribute('src')??'');
      if(src && /^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(src))n.setAttribute('src',src);
      else {n.replaceWith(document.createTextNode(n.getAttribute('alt')??''));continue;}
    }
    if(n.tagName==='A' && n.getAttribute('href')?.startsWith('#note/')){
      const target=targets.get(n.getAttribute('href')!.slice(6));
      if(target)n.setAttribute('href','#'+target);else n.removeAttribute('href');
    }
    if(n.tagName==='A' && !/^(https?:\/\/|mailto:|#)/i.test(n.getAttribute('href')??''))n.removeAttribute('href');
    if(n.tagName==='HR' || (['P','DIV'].includes(n.tagName)&&!n.children.length && /^(?:\*\s*\*\s*\*|#\s*#\s*#)$/.test((n.textContent??'').trim()))){n.outerHTML=sceneBreak;continue;}
    if(['letter','verse','aside'].includes(old))n.className=old;
    if(n.tagName==='DIV' && !n.querySelector('div,p,h1,h2,h3,h4,h5,h6,ul,ol,table,section,figure,blockquote,pre') && !n.className){
      const p=document.createElement('p');p.append(...Array.from(n.childNodes));n.replaceWith(p);
    }
  }
  if(el.childNodes.length && !el.querySelector('p,div,section,h1,h2,h3,h4,h5,h6,ul,ol,table,blockquote,pre,figure,aside')){const p=document.createElement('p');p.append(...Array.from(el.childNodes));el.append(p);}
  return el.innerHTML;
}
function openingBody(html:string){
  const doc=document.createElement('div');doc.innerHTML=html;
  const first=Array.from(doc.querySelectorAll('p')).find(p=>p.textContent?.trim()&&!p.closest('blockquote,aside,figure,table,ul,ol,pre,.letter,.verse,.aside'));
  if(first){
    first.classList.add('opening');
    const walker=document.createTreeWalker(first,NodeFilter.SHOW_TEXT);
    // Count words across inline markup so an italic syllable does not consume a word.
    const leadEnd=/^\s*\S+(?:\s+\S+){0,3}/u.exec(first.textContent??'')?.[0].length??0;
    const texts:Text[]=[];
    while(walker.nextNode())texts.push(walker.currentNode as Text);
    let remaining=leadEnd;
    for(const text of texts){
      if(!remaining)break;
      const count=Math.min(remaining,text.length);
      if(!count)continue;
      if(count<text.length)text.splitText(count);
      const span=document.createElement('span');span.className='lead';text.replaceWith(span);span.append(text);
      remaining-=count;
    }
  }
  return doc;
}
function opening(html:string){return openingBody(html).innerHTML;}
function chapterHead(title:string,index:number,s:BookStyle,art?:string){
  const num=chapterNumber(index,s.numbering);
  return '<header class="chapter-head">'+(art?'<img class="chapter-art" alt="" src="'+escapeText(art)+'"/>':'')+
    (s.ornament==='None'?'':'<div class="ornament">'+glyphs[s.ornament]+'</div>')+
    (num?'<div class="number">'+escapeText(num)+'</div>':'')+'<h1>'+escapeText(title)+'</h1></header>';
}
function special(page:SpecialPage,book:Novel,style:BookStyle,chapters:Leaf[]):Leaf {
  const content:Record<SpecialPage,string>={
    'Title page':'<header class="title-page"><h1>'+escapeText(book.title)+'</h1><p>'+escapeText(book.author)+'</p></header>',
    Copyright:paras(style.copyright||('© '+book.author).trim()),
    Dedication:paras(style.dedication),Contents:'<nav class="contents">'+chapters.map(ch=>'<p><a href="#'+ch.id+'">'+escapeText(ch.title)+'</a></p>').join('')+'</nav>',
    'About the author':paras(style.biography),Colophon:paras(style.colophon)
  };
  return {id:'matter-'+page.toLowerCase().replaceAll(' ','-'),title:page,kind:'special',html:page==='Title page'?content[page]:'<h1>'+escapeText(page)+'</h1>'+content[page]};
}
function sampleChapter(s: BookStyle, art?: string): Leaf {
  const ending = paras('By the time the post boat passed the headland, he had read the letter twice. He folded it along the old creases and slipped it into his coat. The sky was clearing over the hills. For the first time in years, the clock on the customs house was running a little slow.');
  return {
    id: 'specimen',
    kind: 'chapter',
    title: sampleChapterTitle,
    html: chapterHead(sampleChapterTitle, 1, s, art) + opening(sampleBody) + divider(s) + ending,
  };
}
export function sampleChapterOpening(book: Novel, s: BookStyle): Publication {
  const art = projectImageSrc(book.gallery, s.chapterImage);
  return {title: sampleChapterTitle, author: '', lang: 'en', sections: [sampleChapter(s, art)]};
}
function genreOpening(s:BookStyle,genre:NonNullable<BookStyle['sampleGenre']>,art?:string):Publication{
  const sample=genreSamples[genre];
  const passages=sample.passages.map(p=>{
    if(typeof p==='string')return paras(p);
    if('heading' in p)return '<h2>'+escapeText(p.heading)+'</h2>';
    if('quote' in p)return '<blockquote>'+escapeText(p.quote)+'</blockquote>';
    if('stanza' in p)return '<p class="verse" style="margin:0 0 1em;text-indent:0">'+p.stanza.map(escapeText).join('<br/>')+'</p>';
    if('steps' in p)return '<ol>'+p.steps.map(step=>'<li>'+escapeText(step)+'</li>').join('')+'</ol>';
    if('table' in p){
      const head=p.table.columns.map(cell=>'<th scope="col">'+escapeText(cell)+'</th>').join('');
      const body=p.table.rows.map(row=>'<tr>'+row.map(cell=>'<td>'+escapeText(cell)+'</td>').join('')+'</tr>').join('');
      return '<table style="margin:.8em 0"><thead><tr>'+head+'</tr></thead><tbody>'+body+'</tbody></table>';
    }
    const availableHeight=trims[s.trim][1]-s.top-s.bottom;
    return '<figure style="margin:0;break-inside:avoid"><img src="publish-samples/'+p.picture+'.webp" alt="'+escapeText(p.alt)+'" style="display:block;width:100%;max-height:'+Math.round(availableHeight*.72)+'mm;object-fit:contain"/><figcaption style="margin-top:.7em">'+escapeText(p.caption)+'</figcaption></figure>';
  }).join('');
  const html=chapterHead(sample.title,1,s,art)+opening(passages);
  return {title:sample.title,lang:'en',author:'',sections:[{id:'genre-sample',kind:'chapter',title:sample.title,html}]};
}
function bookLanguage(language?:string){
  const named:Record<string,string>={english:'en',serbian:'sr',srpski:'sr',french:'fr',german:'de',italian:'it',spanish:'es',russian:'ru',croatian:'hr'};
  return named[(language??'').toLowerCase()] || (/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(language??'')?language!:'en');
}
export type BinderChapterChoice={node:NoteNode;path:string;number:number};
export function binderChapterChoices(book:Novel):BinderChapterChoice[]{
  const choices:BinderChapterChoice[]=[];
  let chapterCount=0;
  function visit(nodes:NoteNode[],parentPath:string,parentNumber:number){
    for(const node of nodes){
      if(node.hidden)continue;
      const path=parentPath?parentPath+' / '+node.title:node.title;
      const number=node.kind==='chapter'?++chapterCount:parentNumber;
      if(node.kind!=='act')choices.push({node,path,number:number||1});
      visit(node.children,path,number);
    }
  }
  visit(book.sections.binder??[],'',0);
  return choices;
}

// Each thumbnail shows one sheet. Keep the complete chapter for the opened proof.
function firstSheetExcerpt(body:HTMLElement){
  const doc=body.ownerDocument;
  const walker=doc.createTreeWalker(body,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);
  const range=doc.createRange();
  let remaining=4600,images=0;
  for(let node=walker.nextNode();node;node=walker.nextNode()){
    if(node.nodeType===3){
      const text=node as Text;
      if(text.length<=remaining){remaining-=text.length;continue;}
      const cut=remaining>0&&/[\uD800-\uDBFF]/.test(text.data[remaining-1])?remaining-1:remaining;
      range.setStart(text,cut);
    }else if(node.nodeName==='IMG'&&++images>4){
      range.setStartBefore(node);
    }else continue;
    range.setEnd(body,body.childNodes.length);
    range.deleteContents();
    break;
  }
  return body.innerHTML;
}
export function prepareChapterSample(book:Novel,choice:BinderChapterChoice){
  const passages:string[]=[];
  const targets=new Map<string,string>();
  function collect(node:NoteNode){
    if(node.content){
      const html=cleanBody(node.content,book,'<hr>',targets);
      if(html.replace(/<[^>]+>|&nbsp;/g,'').trim()||/<img\b/i.test(html))passages.push(html);
    }
    for(const child of node.children){
      if(!child.hidden&&child.kind!=='chapter'&&child.kind!=='act')collect(child);
    }
  }
  collect(choice.node);
  return chapterSample(choice.node.title,choice.number,passages.join('<hr>'));
}
function chapterSample(title:string,number:number,html:string){
  const body=openingBody(html);
  return {title,number,full:body.innerHTML,excerpt:firstSheetExcerpt(body)};
}
function hasPassage(html:string){
  return !!html.replace(/<[^>]+>|&nbsp;/g,'').trim()||/<img\b/i.test(html);
}
function isPart(node:NoteNode,content:string){
  return node.kind==='folder'||node.kind==='act'||(node.kind!=='chapter'&&node.children.length>0&&!hasPassage(content));
}
// Select an opening in export order. Child notes have their own inclusion flags.
export function projectOpeningSample(book:Novel,entries:ManuscriptEntry[],choices:BinderChapterChoice[]){
  const visible=new Set(choices.map(c=>c.node.id));
  const targets=new Map<string,string>();
  let number=0;
  for(const {node,included} of entries){
    if(!included||node.kind==='folder'||node.kind==='act')continue;
    const content=cleanBody(node.content??'',book,'<hr>',targets);
    if(isPart(node,content))continue;
    number++;
    if(visible.has(node.id)&&hasPassage(content))return chapterSample(node.title,number,content);
  }
  return null;
}
export type ChapterSample=ReturnType<typeof prepareChapterSample>;
export function chapterSpecimen(book:Novel,s:BookStyle,sample:ChapterSample,thumbnail:boolean):Publication{
  const head=chapterHead(sample.title,sample.number,s,projectImageSrc(book.gallery,s.chapterImage));
  const body=(thumbnail?sample.excerpt:sample.full).replaceAll('<hr>',divider(s));
  return {title:book.title,author:book.author,lang:bookLanguage(book.language),sections:[
    {id:'binder-sample',kind:'chapter',title:sample.title,html:head+body}
  ]};
}
export function publication(book:Novel,s:BookStyle,proof:Proof='Manuscript'):Publication{
  const chapters:Leaf[]=[];let index=0;
  const art=projectImageSrc(book.gallery,s.chapterImage);
  if(proof==='Chapter opening'&&s.sampleGenre)return genreOpening(s,s.sampleGenre,art);
  const targets=new Map<string,string>();
  if(proof==='Manuscript'){
    const entries=manuscriptEntries(book).filter(row=>row.included);
    entries.forEach(({node},i)=>targets.set(node.id,'entry-'+i));
    for(const {node} of entries){
      const content=cleanBody(node.content??'',book,divider(s),targets);
      const part=isPart(node,content);
      const leaf:Leaf={id:targets.get(node.id)!,title:node.title,kind:part?'part':'chapter',html:''};
      leaf.html=part?'<h1>'+escapeText(node.title)+'</h1>'+content:chapterHead(node.title,++index,s,art)+opening(content);
      chapters.push(leaf);
    }
  }
  const model={title:book.title,author:book.author,lang:bookLanguage(book.language),sections:chapters};
  if(proof==='Manuscript'){
    const fronters=s.pages.filter(p=>!['About the author','Colophon'].includes(p));
    const back=s.pages.filter(p=>['About the author','Colophon'].includes(p));
    return {...model,coverImage:projectImageSrc(book.gallery,book.cover?.image),sections:[...fronters.map(p=>special(p,book,s,chapters)),...chapters,...back.map(p=>special(p,book,s,chapters))]};
  }
  if(proof==='Chapter opening')return {...model,sections:[sampleChapter(s,art)]};
  if (['Title page','Copyright','Dedication','Contents','About the author','Colophon'].includes(proof)) {
    const samples={...s,dedication:s.dedication||'For everyone who made the crossing.',biography:s.biography||'The author writes about the people who cross the river.',colophon:s.colophon||'Set and composed for this edition.'};
    const contents:Leaf[]=proof==='Contents'&&book.sections.binder?.length
      ?manuscriptEntries(book).filter(row=>row.included).map(({node},i)=>({id:'entry-'+i,title:node.title,kind:'chapter',html:''}))
      :[{id:'specimen',title:sampleChapterTitle,kind:'chapter',html:''}];
    return {...model,sections:[special(proof as SpecialPage,book,samples,contents)]};
  }
  const examples:Partial<Record<Proof,string>>={
    'Body text':sampleBody+sampleBody,'Scene break':paras(sampleParagraphs[0])+divider(s)+paras(sampleParagraphs[2]),
    'Special blocks':'<h2>Field notes</h2><blockquote>Every crossing begins with a promise.</blockquote><p class="letter">Dear Elin,<br/>The ferry will be waiting when you return.</p><pre class="verse">One lamp upon the water,\none star beneath the oar.</pre><aside>A note from the ferryman’s log.</aside>',
    'End matter':special('About the author',book,{...s,biography:s.biography||'The author lives near the river and writes about the people who cross it.'},[]).html
  };
  return {...model,sections:[{id:'specimen',title:proof,kind:'special',html:examples[proof]!}]};
}
// Share the opening (right-hand) margins with the paged print layout.
export function pageMargins(s:BookStyle){
  return [s.top,s.outer,s.bottom,s.inner].map(mm=>mm+'mm').join(' ');
}
export function projectStyleProof(book:Novel,s:BookStyle,proof:Proof,sample:ChapterSample|null,thumbnail=false):Publication{
  const model:Publication={title:book.title,author:book.author,lang:bookLanguage(book.language),sections:[]};
  if(proof==='Manuscript')return publication(book,s);
  if(proof==='Chapter opening'&&sample)return chapterSpecimen(book,s,sample,thumbnail);
  if(proof==='Chapter opening'||proof==='Title page')return {...model,sections:[special('Title page',book,s,[])]};
  if(proof==='Body text'||proof==='Scene break'||proof==='Special blocks'){
    if(!sample)return model;
    const body=document.createElement('div');body.innerHTML=sample.full;
    let html=body.innerHTML;
    if(proof==='Scene break'){
      const hr=body.querySelector('hr');
      html=hr?(hr.previousElementSibling?.outerHTML??'')+'<hr>'+(hr.nextElementSibling?.outerHTML??''):'';
    }else if(proof==='Special blocks'){
      const selector='blockquote,h2,h3,h4,h5,h6,.letter,pre,.verse,aside,.aside,table';
      html=Array.from(body.querySelectorAll(selector)).filter(n=>!n.parentElement?.closest(selector)).map(n=>n.outerHTML).join('');
    }
    if(html)model.sections.push({id:'binder-passage',kind:'special',title:sample.title,html:html.replaceAll('<hr>',divider(s))});
    return model;
  }
  const contents=proof==='Contents'?manuscriptEntries(book).filter(row=>row.included).map(({node},i)=>({id:'entry-'+i,title:node.title,kind:'chapter' as const,html:''})):[];
  return {...model,sections:[special(proof==='End matter'?'About the author':proof,book,s,contents)]};
}
export function bookCss(s:BookStyle,medium:'print'|'screen'|'ebook'){
  const print=medium==='print',reader=medium==='ebook';
  const accent=reader?'currentColor':s.accent;
  const metrics=reader?'':'color:'+s.ink+';font-size:'+(print?s.size+'pt':(s.size/11)+'em')+';line-height:'+s.leading+';';
  const [w,h]=trims[s.trim];
  const rules=(Object.entries({Quote:'blockquote',Subheading:'h2,h3,h4,h5,h6',Letter:'.letter',Verse:'pre,.verse',Aside:'aside,.aside'}) as [BlockName,string][]).map(([k,selector])=>{
    const b=s.blocks[k];return selector+'{font-size:'+b.size+'em;font-style:'+(b.italic?'italic':'normal')+';text-align:'+b.align+';'+(b.rule?'border-inline-start:2px solid '+accent+';padding-inline-start:1em;':'')+'}';
  }).join('\n');
  return `
*{box-sizing:border-box}html,body{margin:0}body{font-family:${fontStacks[s.bodyFont]};${metrics}overflow-wrap:break-word}
article{display:block}p{margin:0 0 ${s.paragraphGap}em;text-indent:${s.indent}em;text-align:${s.align};hyphens:${s.hyphens?'auto':'manual'};orphans:2;widows:2}p:empty{min-height:1em}
h1,h2,h3,h4,h5,h6{font-family:${fontStacks[s.headingFont]};color:${reader?'inherit':s.heading};line-height:1.16;break-after:avoid}
h1{margin:.45em 0 .8em;font-size:${s.headingSize/s.size}em}img{max-width:100%;height:auto;max-height:${print?(h-s.top-s.bottom-8)+'mm':'65vh'};object-fit:contain}
blockquote p,aside p,.letter p,.verse p,.aside p{text-align:inherit;text-indent:0}a{color:inherit}table{width:100%;border-collapse:collapse;table-layout:fixed}td,th{border:1px solid #aaa;padding:.3em}pre,.verse{white-space:pre-wrap;font-family:inherit}blockquote,aside,.letter,pre{margin:1em}
.chapter-head{text-align:${s.chapterAlign};padding-top:${print?h*s.sink/100+'mm':s.sink/3+'em'};margin:0 0 ${s.chapterGap}em;break-inside:avoid;break-after:avoid}
.chapter-head h1{margin:.3em 0 0}.chapter-art{max-height:5em;max-width:80%}.ornament,.scene,.number{color:${accent}}.number{font-size:.85em;letter-spacing:.12em}.scene{text-align:center;margin:${s.dividerGap}em 0;min-height:.35em;break-after:avoid}
.opening{text-indent:${s.firstIndent?s.indent:0}em}.lead{font-variant:${s.smallCaps?'small-caps':'normal'}}
${s.initial==='Normal'?'':'.opening::first-letter{font-family:'+fontStacks[s.headingFont]+';color:'+accent+';'+(s.initial==='Drop cap'?'float:left;font-size:3em;line-height:.85;margin:.07em .08em 0 0':'font-size:1.9em;line-height:.9')+'}'}
.title-page{text-align:center;padding-top:${print?h*.19+'mm':'4em'}}.title-page p{text-align:center;text-indent:0}.contents p{text-indent:0;text-align:left;margin:.4em 0}.contents a{text-decoration:none}
${rules}
${print?`@page{size:${w}mm ${h}mm;margin:${pageMargins(s)};@top-center{content:${s.running?'string(booktitle)':'none'};font:9pt ${fontStacks[s.headingFont]};color:${accent}}@bottom-center{content:${s.folios?'counter(page)':'none'};font:9pt ${fontStacks[s.bodyFont]}}}
@page titleleaf{@top-center{content:none}@bottom-center{content:none}}article#matter-title-page{page:titleleaf}
@page:left{margin-left:${s.outer}mm;margin-right:${s.inner}mm}@page:blank{@top-center{content:none}@bottom-center{content:none}}
article{break-before:page}article.chapter{break-before:${s.recto?'right':'page'}}article:first-child{break-before:auto}.book-name{string-set:booktitle content();height:0;overflow:hidden;line-height:0}`:'.book-name{display:none}article+article{margin-top:3em;break-before:page}'}
`;
}
export const bookArticles=(b:Publication)=>b.sections.map((s,i)=>'<article class="'+s.kind+'" id="'+s.id+'">'+(i===0?'<div class="book-name" aria-hidden="true">'+escapeText(b.title)+'</div>':'')+s.html+'</article>').join('\n');
export function htmlEdition(b:Publication,s:BookStyle){
  return '<!doctype html><html lang="'+b.lang+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escapeText(b.title)+'</title><style>@media screen{'+bookCss(s,'screen')+'body{max-width:42em;margin:auto;padding:2em}}@media print{'+bookCss(s,'print')+'}</style></head><body>'+bookArticles(b)+'</body></html>';
}
