'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {bookArticles,bookCss,escapeText,type Publication} from '@/lib/kachamak/publication';
import {useKachamak} from '@/lib/kachamak/store';
import {trims,type BookStyle} from '@/lib/kachamak/book-style';

export const previewModes = ['Kindle', 'iPhone', 'iPad', 'Print'] as const;
export type PreviewMode = typeof previewModes[number];

const readerPages = { Kindle: [480,640,24], iPhone: [390,844,22], iPad: [768,1024,42] } as const;
const pageSelector = '.pagedjs_pages .pagedjs_page';

const contentsPageNumbers = `
      const pageNumbers = new Map();
      for (const page of document.querySelectorAll('.pagedjs_pages .pagedjs_page[data-page-number]')) {
        for (const article of page.querySelectorAll('article[id], article[data-id]')) {
          const id = article.getAttribute('data-id') || article.id;
          if (!pageNumbers.has(id)) pageNumbers.set(id, page.dataset.pageNumber);
        }
      }
      for (const link of document.querySelectorAll('.pagedjs_pages .contents a[href^="#"]')) {
        const pageNumber = pageNumbers.get(link.getAttribute('href').slice(1));
        if (!pageNumber) continue;
        const number = document.createElement('span');
        number.className = 'contents-page-number';
        number.textContent = pageNumber;
        link.append(number);
      }`;

export function proofDocument(book: Publication, style: BookStyle, print: boolean, device: Exclude<PreviewMode, 'Print'> = 'iPad') {
  const [trimWidth, trimHeight] = trims[style.trim];
  const [readerWidth, readerHeight, readerMargin] = readerPages[device];
  const width = print ? trimWidth * 96 / 25.4 : readerWidth;
  const height = print ? trimHeight * 96 / 25.4 : readerHeight;
  const readerLayout = print ? '' : `@page{size:${width}px ${height}px;margin:${readerMargin}px}
    body{line-height:1.5}article+article{margin-top:0}img{max-height:${height - readerMargin * 2}px}`;
  // Only the screen hides inactive sheets. The PDF still prints the full document.
  const screen = `@media screen {
    html{background:#262626}
    html:not([data-ready=yes]) .pagedjs_pages,html:not([data-ready=yes]) body>article{visibility:hidden}
    html[data-ready=yes],html[data-ready=yes] body{overflow:hidden}
    html[data-ready=yes] .pagedjs_pages{position:fixed;inset:0}
    .pagedjs_page{background:white;box-shadow:0 2px 10px #0006}
    html[data-ready=yes] .pagedjs_page:not([data-preview-current]){display:none}
    html[data-ready=yes] .pagedjs_page[data-preview-current]{position:absolute;top:50%;left:50%;margin:0;
      transform:translate(-50%,-50%) scale(min(var(--fit,1),calc(var(--fit,1) * var(--panel-zoom,1))))}
    html[data-reader-theme=dark] .pagedjs_page{color:#e7e4df;background:#242424}
    html[data-reader-device] .pagedjs_page{outline:5px solid #151515;border-radius:10px;overflow:hidden}
    html[data-reader-device=iPhone] .pagedjs_page{border-radius:24px}
    html[data-reader-device=Kindle] .pagedjs_page{filter:grayscale(1)}
    html[data-reader-device=Kindle][data-reader-theme=light] .pagedjs_page{background:#f6f5ee}
  }`;
  const numberedContents=print&&style.folios&&book.sections.some(section=>section.id==='matter-contents')
    &&book.sections.some(section=>section.id.startsWith('entry-'));
  // Reserve space before pagination so adding the page numbers cannot wrap a link.
  const contentsLayout=numberedContents
    ? '.contents p{break-inside:avoid}.contents a{display:block;position:relative;padding-inline-end:4ch}'+
      '.contents-page-number{position:absolute;inset-inline-end:0;bottom:0;font-variant-numeric:tabular-nums}'
    : '';
  const paginate=`<script>
    document.currentScript.remove();
    window.addEventListener('load', async () => {
      try {
        await document.fonts.ready;
        await new Paged.Previewer().preview();
        ${numberedContents ? contentsPageNumbers : ''}
        const first = document.querySelector('${pageSelector}');
        if (!first) throw new Error('No pages');
        first.setAttribute('data-preview-current', '');
        const fit = () => document.documentElement.style.setProperty('--fit', Math.max(.05, Math.min(1.3,
          (window.innerWidth - 32) / ${width}, (window.innerHeight - 24) / ${height})));
        fit();
        window.addEventListener('resize', fit);
        document.documentElement.dataset.ready = 'yes';
      } catch {
        document.documentElement.dataset.ready = 'error';
      }
      window.dispatchEvent(new Event('proofready'));
    });
  </script>`;
  return '<!doctype html><html lang="'+book.lang+'"><head><meta charset="utf-8"><title>'+escapeText(book.title)+'</title><style>'+bookCss(style,print?'print':'ebook')+readerLayout+contentsLayout+'</style><style data-pagedjs-ignore>'+screen+'</style>'+
    '<script>window.PagedConfig={auto:false};</script><script src="/publish-pagination.js"></script>'+'</head><body>'+bookArticles(book)+paginate+'</body></html>';
}
export function PublishProof({source,mode,darkReader,frameRef,onLoaded,zoom,anchor}:{darkReader:boolean;anchor?:string;zoom:number;source:string;mode:PreviewMode;frameRef:React.RefObject<HTMLIFrameElement|null>;onLoaded:()=>void}){
  const print = mode === 'Print';
  const [status, setStatus] = useState('Setting pages…');
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [pageEdges, setPageEdges] = useState<{left:number;right:number;middle:number} | null>(null);
  const current = useRef(0);
  const sheets = useRef<HTMLElement[]>([]);
  const latestAnchor = useRef(anchor);
  latestAnchor.current = anchor;

  function showPage(index: number) {
    const next = Math.min(sheets.current.length - 1, Math.max(0, index));
    const sheet = sheets.current[next];
    if (!sheet) return;
    sheets.current[current.current]?.removeAttribute('data-preview-current');
    sheet.setAttribute('data-preview-current', '');
    current.current = next;
    setPage(next);
  }

  function revealEntry(doc: Document, id?: string, focus = false) {
    if (!id) return;
    const entry = doc.querySelector<HTMLElement>('.pagedjs_pages #' + CSS.escape(id));
    const sheet = entry?.closest<HTMLElement>('.pagedjs_page');
    if (!entry || !sheet) return;
    showPage(sheets.current.indexOf(sheet));
    if (focus) {
      if (entry.tabIndex < 0 && !entry.hasAttribute('tabindex')) entry.tabIndex = -1;
      entry.focus({preventScroll:true});
    }
  }

  useEffect(() => {
    const doc = frameRef.current?.contentDocument;
    if (doc?.documentElement.dataset.ready === 'yes') revealEntry(doc, anchor);
  }, [anchor, frameRef]);
  function applyAppearance(root: HTMLElement) {
    root.style.setProperty('--panel-zoom', String(zoom));
    if (!print) {
      root.dataset.readerTheme = darkReader ? 'dark' : 'light';
      root.dataset.readerDevice = mode;
    }
  }
  useEffect(() => {
    const root = frameRef.current?.contentDocument?.documentElement;
    if (root) applyAppearance(root);
  }, [darkReader, frameRef, mode, print, zoom]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !count) return;
    let pending = 0;
    const measure = () => {
      const rect = sheets.current[page]?.getBoundingClientRect();
      if (rect?.width && rect.height) {
        setPageEdges({ left: rect.left, right: rect.right, middle: rect.top + rect.height / 2 });
      }
    };
    measure();
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(measure);
    });
    observer.observe(frame);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(pending);
    };
  }, [count, frameRef, page, zoom]);

  function navigateWithKey(event: KeyboardEvent | React.KeyboardEvent) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || !sheets.current.length) return;
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') showPage(current.current - 1);
    else if (event.key === 'ArrowRight' || event.key === 'PageDown') showPage(current.current + 1);
    else return;
    event.preventDefault();
  }

  const arrow = 'absolute z-10 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-neutral-900/85 text-white shadow-md hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-amber-400 disabled:opacity-40';
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col" onKeyDown={navigateWithKey}>
    <div className="relative flex min-h-0 flex-1">
    <iframe ref={frameRef} title={print?'Print proof':mode+' proof'} className="min-h-0 w-full flex-1 border-0 bg-neutral-800" sandbox="allow-scripts allow-same-origin allow-modals" srcDoc={source}
      onLoad={event=>{
        const {contentWindow:w, contentDocument:doc} = event.currentTarget;
        if (!w || !doc?.documentElement) return;
        applyAppearance(doc.documentElement);
        w.addEventListener('wheel', e => {
          if (e.ctrlKey) {
            e.preventDefault();
            frameRef.current?.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,ctrlKey:true,deltaY:e.deltaY,deltaMode:e.deltaMode}));
          }
        }, {passive:false});
        w.addEventListener('keydown', e => {
          if ((e.ctrlKey||e.metaKey) && e.key==='0') {
            e.preventDefault();
            useKachamak.getState().setPanelZoom('mid',1);
          } else navigateWithKey(e);
        });
        doc.addEventListener('click', event => {
          const target = event.target as Element | null;
          const href = target?.closest?.('a[href^="#"]')?.getAttribute('href');
          if (!href) return;
          event.preventDefault();
          if (doc.documentElement.dataset.ready !== 'yes') return;
          const fragment = href.slice(1);
          let id = fragment;
          try { id = decodeURIComponent(fragment); } catch { /* Use a literal percent sign. */ }
          revealEntry(doc, id, true);
        });
        const done = () => {
          if (frameRef.current?.contentDocument !== doc) return;
          if (doc.documentElement.dataset.ready !== 'yes') {
            setStatus(print ? 'Pagination failed. Use Print / Save PDF or reopen the proof to try again.' : 'Pagination failed. Switch preview mode to try again.');
          } else {
            sheets.current = Array.from(doc.querySelectorAll(pageSelector));
            setCount(sheets.current.length);
            setStatus('');
            revealEntry(doc, latestAnchor.current);
          }
          onLoaded();
        };
        if (doc.documentElement.dataset.ready) done();
        else w.addEventListener('proofready', done, {once:true});
      }}/>
      {pageEdges && <>
        <button type="button" className={arrow} style={{left:pageEdges.left,top:pageEdges.middle}} aria-label="Previous page" disabled={page === 0} onClick={()=>showPage(page-1)}><ChevronLeft className="size-4"/></button>
        <button type="button" className={arrow} style={{left:pageEdges.right,top:pageEdges.middle}} aria-label="Next page" disabled={page+1 >= count} onClick={()=>showPage(page+1)}><ChevronRight className="size-4"/></button>
      </>}
    </div>
    <div className="flex min-h-11 shrink-0 items-center justify-center border-t border-white/10 px-2 py-1 text-xs">
      <span role="status" className="text-center tabular-nums text-muted-foreground">{status || (page+1)+' / '+count}</span>
    </div>
  </div>;
}
