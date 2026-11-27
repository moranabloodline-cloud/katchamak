import type {GalleryEntry} from './gallery';
import {galleryImage, galleryImageRef, editorImageAttribute, type GalleryImage} from './project-image';
import {pasteMediaAttribute, preparePastedContent, type PasteMode} from './paste-content';
import {pastedImageFormatAttribute, pastedImageSize} from './paste-layout';
import {directImageLink, formatEditorMedia, formatEditorMediaHtml} from './editor-media';

type ClipboardContent = {html: string; text: string; markdown: string; files: Blob[]};
export type EditorPasteRequest = {mode: PasteMode; range: Range};
type Media = {blob?: Blob; svg?: string; url?: string; reference?: string; existing?: GalleryImage; title: string; chartSnapshot?: boolean};
type ImportedMedia = {image: string; width: number; height: number};
export type PreparedClipboard = {html: string; images: GalleryImage[]; unavailable: number};

const maxImageBytes = 10 * 1024 * 1024;
const maxImages = 64;
const maxEncodedImages = 4_200_000;
const remoteImageAttribute = 'data-draftopus-remote-image';
const imageTypes = /^image\/(?:png|jpe?g|webp|gif|avif|bmp|svg\+xml)$/i;
const supportedType = (type: string) => imageTypes.test(type.split(';', 1)[0]);

export function editorClipboardData(data: DataTransfer): ClipboardContent {
  const candidates = data.files?.length ? Array.from(data.files) :
    Array.from(data.items ?? []).flatMap(item=>item.kind==='file' ? item.getAsFile() ?? [] : []);
  const files = candidates.filter(file => supportedType(file.type)).slice(0,maxImages);
  const svg = data.getData('image/svg+xml');
  const inlineSvg = svg && svg.length <= maxImageBytes ? [new Blob([svg],{type:'image/svg+xml'})] : [];
  return {html:data.getData('text/html'),text:data.getData('text/plain'),
    markdown:data.getData('text/markdown') || data.getData('text/x-markdown'),files:[...files,...inlineSvg]};
}

export async function readEditorClipboard(): Promise<ClipboardContent> {
  if (!navigator.clipboard?.read) {
    return {html:'',text:await navigator.clipboard.readText(),markdown:'',files:[]};
  }
  const content: ClipboardContent = {html:'',text:'',markdown:'',files:[]};
  for (const item of await navigator.clipboard.read()) {
    for (const type of item.types) {
      if (type === 'text/html' && !content.html) content.html = await (await item.getType(type)).text();
      else if (type === 'text/plain' && !content.text) content.text = await (await item.getType(type)).text();
      else if (type === 'text/markdown' && !content.markdown) content.markdown = await (await item.getType(type)).text();
      else if (supportedType(type) && content.files.length < maxImages) content.files.push(await item.getType(type));
    }
  }
  return content;
}

function looksLikeMarkdown(text: string) {
  return /^\s*\|?[ \t]*:?-{3,}:?[ \t]*\|[ \t]*:?-{3,}/m.test(text) ||
    /^ {0,3}(?:#{1,6}[ \t]+\S|\x60{3,}|~{3,}|>[ \t]+\S)/m.test(text) ||
    /^ {0,3}(?:[-+*]|\d{1,3}[.)])[ \t]+\S[^\n]*\n {0,3}(?:[-+*]|\d{1,3}[.)])[ \t]+\S/m.test(text) ||
    /!?\[[^\]\n]+\]\((?:https?:\/\/|#)[^\s)]+\)/i.test(text);
}

function imageReference(src: string) {
  if (!/^(?:https?:)?\/\//i.test(src))return;
  try {
    const url = new URL(src.startsWith('//') ? 'https:' + src : src);
    if (!url.username && !url.password) return url.href;
  } catch { /* A relative path has no reliable source in the clipboard. */ }
}

function bitmapSource(src: string) {
  if (src.length <= maxImageBytes * 1.4 && /^data:image\/(?:png|jpe?g|webp|gif|avif|bmp|svg\+xml)[;,]/i.test(src)) return src;
  if (src.startsWith('blob:') && src.slice(5).startsWith(location.origin + '/')) return src;
  const url = imageReference(src);
  if (url?.startsWith('https:') || url?.startsWith(location.origin + '/')) return url;
}

async function readBitmapSource(url: string, signal: AbortSignal): Promise<Blob> {
  const response = await fetch(url, {credentials:'omit', referrerPolicy:'no-referrer',signal});
  const type = response.headers.get('content-type') || '';
  if (!response.ok || !response.body || !supportedType(type) || Number(response.headers.get('content-length')) > maxImageBytes) {
    throw new Error('This image is unavailable.');
  }
  const reader = response.body.getReader();
  const parts: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    while (true) {
      const {value,done} = await reader.read();
      if (done)break;
      size += value.byteLength;
      if (size > maxImageBytes) {
        await reader.cancel();
        throw new Error('This image exceeds the clipboard limit.');
      }
      parts.push(new Uint8Array(value));
    }
  } finally {reader.releaseLock();}
  return new Blob(parts,{type});
}

const svgGeometry = 'path,rect,circle,ellipse,line,polyline,polygon,text';
const svgTags = ['svg','g','path','rect','circle','ellipse','line','polyline','polygon','text','tspan','title','desc','defs','lineargradient','radialgradient','stop','clippath'];
const svgAttributes = ['xmlns','viewBox','preserveAspectRatio','id','d','points','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','dx','dy','width','height',
  'fill','fill-rule','fill-opacity','stroke','stroke-width','stroke-opacity','stroke-linecap','stroke-linejoin','stroke-dasharray','opacity','transform',
  'font-size','font-weight','text-anchor','dominant-baseline','clip-path','offset','stop-color','stop-opacity','gradientUnits','gradientTransform','fx','fy'];

async function svgBitmap(source: string) {
  const {default:DOMPurify} = await import('dompurify');
  const template = document.createElement('template');
  template.innerHTML = DOMPurify.sanitize(source,{
    ALLOWED_TAGS:svgTags,ALLOWED_ATTR:svgAttributes,ALLOW_DATA_ATTR:false,ALLOW_ARIA_ATTR:false,FORBID_TAGS:['script','style','foreignobject','image','use'],
  });
  const svg = template.content.querySelector('svg');
  if (!svg?.querySelector(svgGeometry)) throw new Error('No static SVG shapes were copied.');
  for (const node of [svg,...svg.querySelectorAll('*')]) {
    for (const attribute of Array.from(node.attributes)) {
      if (/url\s*\(/i.test(attribute.value) && !/^url\(\s*#[\w:.-]+\s*\)$/i.test(attribute.value))node.removeAttribute(attribute.name);
    }
  }
  const viewBox = svg.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
  const width = viewBox?.[2] || Number(svg.getAttribute('width')) || 320;
  const height = viewBox?.[3] || Number(svg.getAttribute('height')) || 240;
  if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height)))throw new Error('Invalid SVG dimensions.');
  const scale = Math.min(1280 / width, 960 / height, 2);
  svg.setAttribute('xmlns','http://www.w3.org/2000/svg');
  if (!viewBox)svg.setAttribute('viewBox','0 0 '+width+' '+height);
  svg.setAttribute('width',String(Math.max(1,Math.round(width * scale))));
  svg.setAttribute('height',String(Math.max(1,Math.round(height * scale))));
  const url = URL.createObjectURL(new Blob([svg.outerHTML],{type:'image/svg+xml'}));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return await createImageBitmap(image);
  } finally {URL.revokeObjectURL(url);}
}

async function importMedia(media: Media, signal: AbortSignal): Promise<ImportedMedia> {
  const blob = media.blob ?? (media.url ? await readBitmapSource(media.url,signal) : undefined);
  if (blob && (blob.size > maxImageBytes || !blob.size || !supportedType(blob.type))) throw new Error('Unsupported image.');
  const svg = media.svg ?? (blob && /^image\/svg\+xml/i.test(blob.type) ? await blob.text() : undefined);
  const {encodePastedImage} = await import('./project-settings');
  const bitmap = svg ? await svgBitmap(svg) : await createImageBitmap(blob!);
  const {width,height} = bitmap;
  if (signal.aborted || width * height > 64_000_000) {
    bitmap.close();
    throw new Error('This image could not be prepared.');
  }
  return {image:encodePastedImage(bitmap,blob?.type || 'image/svg+xml',media.chartSnapshot),width,height};
}

function isIllustration(element: Element) {
  if (element.closest('[data-d-component="favicon"]')) return false;
  if (element.tagName.toLowerCase() === 'img') {
    if (element.getAttribute('alt')?.trim())return true;
    const src=element.getAttribute('src') ?? '';
    const width=Number(element.getAttribute('width')), height=Number(element.getAttribute('height'));
    return !src.includes('/s2/favicons?') && !(width > 0 && height > 0 && width <= 32 && height <= 32);
  }
  const label = element.getAttribute('aria-label') || element.querySelector('title')?.textContent;
  const width = element.getAttribute('width') || '';
  const height = element.getAttribute('height') || '';
  if (!label && (/em$/i.test(width) || /em$/i.test(height) ||
    Number.parseFloat(width) <= 32 && Number.parseFloat(height) <= 32)) return false;
  return !!element.querySelector(svgGeometry);
}

export async function prepareEditorClipboard(
  payload: ClipboardContent,
  mode: PasteMode,
  gallery: GalleryEntry[] | undefined,
  signal: AbortSignal,
): Promise<PreparedClipboard> {
  const text = payload.text || payload.markdown;
  if (mode === 'plain')return {html:preparePastedContent('',text,'plain'),images:[],unavailable:0};
  let html = payload.html.length <= 16 * 1024 * 1024 ? payload.html : '';
  const imageUrl = directImageLink(text.trim());
  if (imageUrl && !/<(?:img|figure)\b/i.test(html) && !payload.files.length) {
    const paragraph = document.createElement('p');
    const link = document.createElement('a');
    link.href = imageUrl;
    link.textContent = imageUrl;
    paragraph.append(link);
    html = paragraph.outerHTML;
  }
  const markdown = !html && (payload.markdown || (looksLikeMarkdown(text) ? text : ''));
  if (!html && markdown) {
    const {marked} = await import('marked');
    html = marked.parse(markdown,{gfm:true,async:false});
  }
  const files = [...payload.files];
  const media: Media[] = [];
  const assetIndexes = new Map<string,number>();
  const placeholders: HTMLImageElement[] = [];
  const makeImage = (doc:Document, item:Media, key?:string) => {
    const img = doc.createElement('img');
    let index = key ? assetIndexes.get(key) : undefined;
    if (index === undefined) {
      index = media.push(item) - 1;
      if (key)assetIndexes.set(key,index);
    }
    img.setAttribute('alt',item.title);
    img.setAttribute(pasteMediaAttribute,String(index));
    placeholders.push(img);
    return img;
  };
  const onlyHtmlImage = (html.match(/<img\b/gi)?.length ?? 0) === 1;
  let body = preparePastedContent(html,text,mode,(source,declarations)=>{
    if (!isIllustration(source))return null;
    const doc = source.ownerDocument;
    const svg = source.tagName.toLowerCase() === 'svg';
    const title = (source.getAttribute('alt') || source.getAttribute('aria-label') || source.querySelector('title')?.textContent || '').trim().slice(0,500);
    const src = source.getAttribute('src')?.trim() || '';
    const url = bitmapSource(src);
    const existing = galleryImage(gallery,source.getAttribute(editorImageAttribute)??undefined);
    const blob = !svg && !existing && (!url || onlyHtmlImage && files.length === 1) ? files.shift() : undefined;
    const chartSnapshot = !svg && title === 'Chart' && (!!blob || /^data:image\/png;base64,/i.test(src));
    const key = existing?.id || (chartSnapshot && url ? 'chart:'+url : url);
    const img = makeImage(doc,{title,url,reference:imageReference(src),existing,blob,chartSnapshot,
      svg:svg && source.outerHTML.length <= 1024*1024 ? source.outerHTML : undefined}, key);
    if (mode === 'rich' && !svg) {
      const size = pastedImageSize(source,declarations);
      if (size.width)img.width = size.width;
      if (size.height)img.height = size.height;
      if (size.cssWidth)img.style.width = size.cssWidth;
      if (size.cssHeight)img.style.height = size.cssHeight;
      if (size.cssMaxWidth)img.style.maxWidth = size.cssMaxWidth;
      if (size.aspectRatio)img.style.aspectRatio = size.aspectRatio;
      if (size.objectFit)img.style.objectFit = size.objectFit;
      if (size.objectPosition)img.style.objectPosition = size.objectPosition;
      if (size.borderRadius)img.style.borderRadius = size.borderRadius;
      if (size.aspectRatio || size.objectPosition || size.borderRadius)img.setAttribute(pastedImageFormatAttribute,'');
      if (size.alignment==='left' || size.alignment==='right')img.style.float=size.alignment;
      if (size.alignment==='center'){img.style.display='block';img.style.marginInline='auto';}
    }
    return img;
  });
  if (!placeholders.length && files.length && payload.files.length && payload.text === '')body = '';
  for (const file of files) {
    const figure = document.createElement('figure');
    figure.append(makeImage(document,{blob:file,title:file instanceof File ? file.name.slice(0,255) : ''}));
    body += figure.outerHTML;
  }
  if (!media.length || signal.aborted)return {html:signal.aborted?body:formatEditorMediaHtml(body),images:[],unavailable:0};
  // Fetch a few images at a time. A blocked source does not hold a long report
  // indefinitely, and one visual cannot consume the entire Gallery write.
  const deadline = AbortSignal.any([signal,AbortSignal.timeout(5000)]);
  const results: (ImportedMedia|undefined)[] = [];
  let next = 0;
  await Promise.all(Array.from({length:Math.min(6,media.length)},async()=>{
    while (next < Math.min(media.length,maxImages) && !deadline.aborted) {
      const index = next++;
      if(media[index].existing)continue;
      try {results[index] = await importMedia(media[index],deadline);} catch { /* Keep its original source below. */ }
    }
  }));
  const reusable = new Map((gallery ?? []).flatMap(item=>item.kind==='image' ? [[item.image,item] as const] : []));
  const images: GalleryImage[] = [];
  let encoded = 0;
  const assets = media.map((source,index)=>{
    if (source.existing)return source.existing;
    const result = results[index];
    if (!result)return;
    const reused = reusable.get(result.image);
    if (reused)return reused;
    if (encoded + result.image.length > maxEncodedImages)return;
    encoded += result.image.length;
    const asset: GalleryImage = {id:crypto.randomUUID(),kind:'image',name:source.title.slice(0,255) || 'Pasted image',parentId:null,image:result.image};
    reusable.set(result.image,asset);
    images.push(asset);
    return asset;
  });
  const template = document.createElement('template');
  template.innerHTML = body;
  let unavailable = 0;
  for (const img of template.content.querySelectorAll<HTMLImageElement>('img['+pasteMediaAttribute+']')) {
    const index = Number(img.getAttribute(pasteMediaAttribute));
    const asset = assets[index], original = media[index], bitmap = results[index];
    if (asset) {
      img.removeAttribute(pasteMediaAttribute);
      img.setAttribute(editorImageAttribute,galleryImageRef(asset.id));
      img.setAttribute('decoding','async');
      if (bitmap && !img.hasAttribute('width') && !img.hasAttribute('height')) {
        img.width = bitmap.width;
        img.height = bitmap.height;
      }
      continue;
    }
    unavailable++;
    const href = original?.reference;
    const enclosingLink = img.closest('a[href]');
    const fallback = template.content.ownerDocument.createElement(href && !enclosingLink ? 'a' : 'span');
    if (href && !enclosingLink)fallback.setAttribute('href',href);
    fallback.setAttribute('data-draftopus-image-link','');
    const description = original?.title || (href ? 'Image source' : 'Image unavailable');
    img.replaceWith(fallback);
    // Some origins allow browser display while denying access to the pixels.
    // Keep that exact reference visible online. The alternative text is the
    // link label if the image is gone or the document is opened offline.
    if (href?.startsWith('https:')) {
      img.removeAttribute(pasteMediaAttribute);
      img.setAttribute(remoteImageAttribute,'');
      img.alt=description;
      img.referrerPolicy='no-referrer';
      img.loading='lazy';
      img.decoding='async';
      img.src=href;
      fallback.append(img);
    }else fallback.textContent=description;
  }
  formatEditorMedia(template.content);
  return {html:template.innerHTML,images,unavailable};
}
