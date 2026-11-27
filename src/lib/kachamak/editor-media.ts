import {editorImageAttribute} from './project-image';

const mediaAttribute = 'data-draftopus-media';
const pictureAttribute = 'data-draftopus-media-picture';
const creditAttribute = 'data-draftopus-media-credit';
const pictureFile = /\.(?:avif|bmp|gif|jpe?g|png|webp)$/i;
const blockSelector = 'p,div';
const excluded = 'pre,code';

function httpsUrl(value: string | null) {
  if (!value || !/^https:\/\//i.test(value) || value.length > 4096 || /\s/.test(value)) return;
  try {
    const url = new URL(value);
    if (!url.username && !url.password) return url;
  } catch { /* Malformed addresses stay as links. */ }
}

export function directImageLink(value: string | null) {
  const url = httpsUrl(value);
  if (!url) return;
  if (pictureFile.test(url.pathname) || url.hostname === 'images.openai.com' &&
    /^\/static-rsc-\d+\/[a-z0-9_-]+$/i.test(url.pathname)) return url.href;
}

const hostname = (url: URL) => url.hostname.replace(/^www\./, '');
const compact = (value: string | null) => (value ?? '').replace(/[\s\u200b]+/g,'');

function sourceCredit(link: HTMLAnchorElement) {
  const url = httpsUrl(link.getAttribute('href'));
  return !!url && !directImageLink(url.href) && compact(link.textContent).replace(/^www\./i,'').toLowerCase() === hostname(url);
}

function findImageBlock(link: HTMLAnchorElement, root: ParentNode) {
  let block: HTMLElement|undefined, credit: HTMLAnchorElement|undefined;
  for (let current=link.parentElement; current && current!==root; current=current.parentElement) {
    if (!current.matches('p,div,span') || current.matches('[data-draftopus-paste],[data-draftopus-layout]') ||
      (current.textContent?.length ?? 0)>1024) break;
    const anchors=Array.from(current.querySelectorAll<HTMLAnchorElement>('a[href]'));
    if (anchors.length>2 || compact(current.textContent)!==anchors.map(a=>compact(a.textContent)).join('')) break;
    const other=anchors.find(a=>a!==link);
    if (other && !sourceCredit(other)) break;
    if (Array.from(current.querySelectorAll('img')).some(img=>!link.contains(img)) ||
      current.querySelector('table,h1,h2,h3,h4,h5,h6,hr,figure,aside,ul,ol')) break;
    if (current.matches(blockSelector)) {
      block=current;
      credit=other;
    }
  }
  return {block,credit};
}

function pastedGalleryPicture(block: Element, title: string) {
  const sibling=block.nextElementSibling;
  if (!title || !sibling?.matches('p,div,figure') || sibling.textContent?.trim() ||
    sibling.querySelector('a,table,hr,h1,h2,h3,h4,h5,h6')) return;
  const images=sibling.querySelectorAll('img');
  const image=images[0];
  // Copy Image may retain the article title. Keep that saved copy when it
  // appears immediately after the matching source, with no separate caption.
  if (images.length!==1 || !image.hasAttribute(editorImageAttribute) || image.alt.trim()!==title) return;
  return {sibling,image};
}

function embedImageLink(link: HTMLAnchorElement, root: ParentNode) {
  const href=link.getAttribute('href') ?? '';
  const src=directImageLink(href) || (link.hasAttribute('data-draftopus-image-link') ? httpsUrl(href)?.href : undefined);
  if (!src || link.closest(excluded)) return;
  const {block,credit}=findImageBlock(link,root);
  if (!block) return;
  const title=link.textContent?.trim() ?? '';
  let image=link.querySelector('img');
  if (!image) {
    const pasted=credit && title!==href ? pastedGalleryPicture(block,title) : undefined;
    image=pasted ? pasted.image : link.ownerDocument.createElement('img');
    image.alt=title && title!==href ? title : 'Linked image';
    if (!pasted) {
      image.setAttribute('referrerpolicy','no-referrer');
      image.setAttribute('loading','lazy');
      image.setAttribute('decoding','async');
      image.src=src;
      image.setAttribute('data-draftopus-remote-image','');
    }
    link.replaceChildren(image);
    if (pasted) pasted.sibling.remove();
    if (title && title!==href) link.title=title;
  }
  block.setAttribute(mediaAttribute,'linked');
  link.setAttribute(pictureAttribute,'');
  credit?.setAttribute(creditAttribute,'');
}

/** Dress standalone images in the editor while preserving external and note links. */
export function formatEditorMedia(root: ParentNode) {
  for (const link of root.querySelectorAll<HTMLAnchorElement>('a[href]')) embedImageLink(link,root);
  for (const img of root.querySelectorAll('img')) {
    if (img.closest(excluded+', ['+mediaAttribute+']')) continue;
    const figure=img.closest('figure');
    if (figure?.querySelectorAll('img').length===1) {
      figure.setAttribute(mediaAttribute,'figure');
      continue;
    }
    const block=img.closest(blockSelector);
    if (block && block!==root && !block.textContent?.trim() && block.querySelectorAll('img').length===1) {
      block.setAttribute(mediaAttribute,'figure');
    }
  }
}

export function formatEditorMediaHtml(html: string) {
  if (typeof document==='undefined' || !/<img\b|<a\s[^>]*https:\/\//i.test(html)) return html;
  const template=document.createElement('template');
  template.innerHTML=html;
  formatEditorMedia(template.content);
  return template.innerHTML;
}
