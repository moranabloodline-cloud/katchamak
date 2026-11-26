import {strToU8,zipSync,type Zippable} from 'fflate';
import {bookCss,escapeText,htmlEdition,type Publication} from './publication';
import type {BookStyle} from './book-style';

export function downloadEdition(blob:Blob,filename:string){
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_');document.body.append(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),60000);
}
export function imageBytes(src:string){
  const comma=src.indexOf(',');
  return Uint8Array.from(atob(src.slice(comma+1)),c=>c.charCodeAt(0));
}
export function epubEdition(book:Publication,s:BookStyle){
  const mime='application/epub+zip';
  const files:Zippable={mimetype:[strToU8(mime),{level:0}]};
  const file=(path:string,body:string)=>{files[path]=strToU8(body);};
  file('META-INF/container.xml','<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="Book/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  file('Book/style.css',bookCss(s,'ebook'));
  const images = new Map<string, { id: string; path: string; mediaType: string }>();
  const manifest: string[] = [], spine: string[] = [], links: string[] = [];
  function addImage(src: string) {
    const existing = images.get(src);
    if (existing) return existing;
    const match = /^data:(image\/(png|jpeg|webp|gif));base64,/i.exec(src);
    if (!match) return;
    let bytes: Uint8Array;
    try { bytes = imageBytes(src); }
    catch { return; }
    if (!bytes.length) return;
    const id = 'image-' + (images.size + 1);
    const image = { id, path: id + '.' + match[2].toLowerCase(), mediaType: match[1].toLowerCase() };
    files['Book/' + image.path] = bytes;
    images.set(src, image);
    return image;
  }
  const xhtml=(title:string,body:string)=>'<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="'+book.lang+'" xml:lang="'+book.lang+'"><head><title>'+escapeText(title)+'</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body>'+body+'</body></html>';
  const ids=new Map(book.sections.map((leaf,i)=>[leaf.id,'section-'+(i+1)+'.xhtml']));
  for(const [i,section] of book.sections.entries()){
    const path=ids.get(section.id)!;
    const article=document.createElement('article');article.className=section.kind;article.id=section.id;article.innerHTML=section.html;
    for(const a of article.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')){
      const key=a.getAttribute('href')!.slice(1);if(ids.has(key))a.setAttribute('href',ids.get(key)!+'#'+key);
    }
    for(const img of article.querySelectorAll('img')){
      const image = addImage(img.getAttribute('src') ?? '');
      if (!image) { img.remove(); continue; }
      img.setAttribute('src', image.path);
      if (!img.hasAttribute('alt')) img.alt = '';
    }
    file('Book/'+path,xhtml(section.title,new XMLSerializer().serializeToString(article)));
    manifest.push('<item id="s'+i+'" href="'+path+'" media-type="application/xhtml+xml"/>');spine.push('<itemref idref="s'+i+'"/>');links.push('<li><a href="'+path+'">'+escapeText(section.title)+'</a></li>');
  }
  const cover = book.coverImage ? addImage(book.coverImage) : undefined;
  for (const image of images.values()) {
    const properties = image === cover ? ' properties="cover-image"' : '';
    manifest.push(`<item id="${image.id}" href="${image.path}" media-type="${image.mediaType}"${properties}/>`);
  }
  // Reading systems can jump straight to the main text or to the selected Contents page.
  const landmarks: string[] = [];
  const contents = ids.get('matter-contents');
  if (contents) landmarks.push(`<li><a epub:type="toc" href="${contents}">Contents</a></li>`);
  const body = book.sections.find(section => section.kind !== 'special');
  if (body) landmarks.push(`<li><a epub:type="bodymatter" href="${ids.get(body.id)}">Start of book</a></li>`);
  const guide = landmarks.length
    ? `<nav epub:type="landmarks" hidden=""><h2>Landmarks</h2><ol>${landmarks.join('')}</ol></nav>`
    : '';
  file('Book/nav.xhtml', xhtml('Contents', `<nav epub:type="toc"><h1>Contents</h1><ol>${links.join('')}</ol></nav>${guide}`));
  file('Book/package.opf','<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">urn:uuid:'+crypto.randomUUID()+'</dc:identifier><dc:title>'+escapeText(book.title)+'</dc:title><dc:creator>'+escapeText(book.author)+'</dc:creator><dc:language>'+book.lang+'</dc:language><meta property="dcterms:modified">'+new Date().toISOString().replace(/\.\d{3}Z$/,'Z')+'</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="style.css" media-type="text/css"/>'+manifest.join('')+'</manifest><spine>'+spine.join('')+'</spine></package>');
  return new Blob([new Uint8Array(zipSync(files))],{type:mime});
}
export async function exportEdition(format:'HTML'|'EPUB'|'DOCX',book:Publication,s:BookStyle){
  const file=format==='HTML'?new Blob([htmlEdition(book,s)],{type:'text/html;charset=utf-8'}):
    format==='EPUB'?epubEdition(book,s):await (await import('./publish-word')).wordEdition(book,s);
  downloadEdition(file,(book.title||'Book')+'.'+format.toLowerCase());
}
