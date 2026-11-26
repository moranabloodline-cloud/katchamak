'use client';

import {useLayoutEffect, useMemo, useRef, useState, type CSSProperties} from 'react';
import {ArrowLeft, ArrowUpRight, Monitor, Smartphone} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog';
import {unifiedCanvas, worldRows} from '@/lib/kachamak/canvas-layout';
import {HOME_ROOT, homepageEntry, homepageRows, isWebsite, type HomeBlock, type HomePageEntry, type HomeTarget} from '@/lib/kachamak/homepage';
import {projectImageSrc} from '@/lib/kachamak/project-image';
import type {NoteNode, Novel} from '@/lib/kachamak/types';
import {CanvasItemFace} from './CanvasItemFace';
import {HomeArtwork} from './HomeArtwork';
import {HomeDocumentBlock} from './HomeDocumentBlock';
import './canvas-page-preview.css';

type PreviewProps = {
  novel: Novel;
  initialPageId: string;
  notes: Map<string, NoteNode>;
  describe: (target: HomeTarget) => string;
  onOpen: (target: HomeTarget) => void;
  onOpenMap: (id: string) => void;
  onClose: () => void;
};

type Section = {
  id: string;
  title: string;
  columns: HomeBlock[][];
};

function previewSections(page: HomePageEntry) {
  const layout = unifiedCanvas(page);
  const rows = layout.blocks.filter(block => block.layout === 'row');
  const positions = worldRows(rows, layout.width === 'reading' ? 736 : 1160, new Map(), layout.legacyRowX);
  const cells = new Map<string, HomeBlock[][]>(rows.map(row => [row.id, Array.from({length: row.columns || 1}, () => [])]));
  const members = new Map<string, HomeBlock[]>();
  for (const block of layout.blocks) {
    if (block.cell) cells.get(block.cell.rowId)?.[block.cell.column]?.push(block);
    if (block.columnId) {
      const children = members.get(block.columnId) ?? [];
      children.push(block);
      members.set(block.columnId, children);
    }
  }
  return layout.blocks
    .filter(block => block.layout !== 'line' && !block.cell && !block.columnId)
    .sort((a, b) => {
      const aPoint = positions.get(a.id) ?? a.at;
      const bPoint = positions.get(b.id) ?? b.at;
      return (aPoint?.y ?? 0) - (bPoint?.y ?? 0) || (aPoint?.x ?? 0) - (bPoint?.x ?? 0);
    })
    .map((block): Section => {
      if (block.layout === 'row') return {id:block.id, title:block.title, columns:cells.get(block.id) ?? []};
      if (block.layout === 'column') return {id:block.id, title:block.title, columns:[members.get(block.id) ?? []]};
      return {id:block.id, title:'', columns:[[block]]};
    });
}

function blockImage(block: HomeBlock, novel: Novel, notes: Map<string, NoteNode>) {
  const source = block.target?.kind === 'note' ? notes.get(block.target.id) : undefined;
  return block.imageCutout || projectImageSrc(novel.gallery, block.image ?? source?.image);
}

function PreviewLink({target, label, primary = false, open}:{
  target: HomeTarget;
  label: string;
  primary?: boolean;
  open: (target: HomeTarget) => void;
}) {
  const contents = <>{label}<ArrowUpRight size={15} aria-hidden="true" className="shrink-0"/></>;
  const className = primary ? 'canvas-preview-cta' : 'canvas-preview-link';
  if (target.kind === 'web') {
    return isWebsite(target.url)
      ? <a href={target.url} target="_blank" rel="noopener noreferrer" className={className}>{contents}</a>
      : null;
  }
  return <button type="button" className={className} onClick={() => open(target)}>{contents}</button>;
}

function PreviewBlock({block, novel, notes, leadHeading, leadLink, describe, open, openMap}:{
  block: HomeBlock;
  novel: Novel;
  notes: Map<string, NoteNode>;
  leadHeading: boolean;
  leadLink: boolean;
  describe: PreviewProps['describe'];
  open: PreviewProps['onOpen'];
  openMap: PreviewProps['onOpenMap'];
}) {
  const source = block.target?.kind === 'note' ? notes.get(block.target.id) : undefined;
  const image = blockImage(block, novel, notes);
  const title = block.title || source?.title || '';
  if (block.layout === 'links') {
    return <section className="canvas-preview-links">
      {title && <h3>{title}</h3>}
      {block.text && <p>{block.text}</p>}
      {!!block.links?.length && <ul className="flex flex-wrap gap-2">
        {block.links.map(({id, label, target}, index) => <li key={id} className="min-w-0 max-w-full">
          <PreviewLink target={target} label={label || describe(target)} open={open} primary={leadLink && index === 0}/>
        </li>)}
      </ul>}
    </section>;
  }
  if (block.layout === 'heading') {
    return <header className="canvas-preview-heading">
      {image && <HomeArtwork src={image} frame={block.imageFrame} alt={title}/>}
      {title && (leadHeading ? <h1>{title}</h1> : <h2>{title}</h2>)}
      {block.text && <p>{block.text}</p>}
      {block.target && <PreviewLink target={block.target} label={describe(block.target)} open={open}/>}
    </header>;
  }
  if (block.layout === 'card' || block.layout === 'banner' || block.layout === 'image' || block.layout === 'text') {
    const className = block.layout === 'card' || block.layout === 'text' ? 'canvas-preview-surface' : 'canvas-preview-art';
    return <article className={className}>
      {image && <HomeArtwork src={image} frame={block.imageFrame} alt={title}/>}
      {(title || block.text || block.target) && <div className="canvas-preview-copy">
        {title && <h3>{title}</h3>}
        {block.text && <p>{block.text}</p>}
        {block.target && <PreviewLink target={block.target} label={describe(block.target)} open={open}/>}
      </div>}
    </article>;
  }
  if (block.layout === 'video' || block.layout === 'divider' || block.layout === 'callout') {
    return <div className="min-w-0">
      <HomeDocumentBlock block={block} image={image} interactive describe={describe} open={open}/>
      {block.target && <PreviewLink target={block.target} label={describe(block.target)} open={open}/>}
    </div>;
  }
  return <div className="canvas-preview-surface">
    <CanvasItemFace block={block} novel={novel} source={source} locked open={open} describe={describe} toggle={() => {}} openMap={openMap}/>
  </div>;
}

export function CanvasPagePreview({novel, initialPageId, notes, describe, onOpen, onOpenMap, onClose}: PreviewProps) {
  const [trail, setTrail] = useState([initialPageId]);
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop');
  const [message, setMessage] = useState('');
  const scroll = useRef<HTMLDivElement>(null);
  const id = trail.at(-1) ?? initialPageId;
  const page = useMemo(() => homepageEntry(novel, id) ?? homepageEntry(novel, HOME_ROOT)!, [novel, id]);
  const pages = useMemo(() => {
    const boardIds = new Set(novel.homePages?.filter(entry => entry.storyBoard).map(entry => entry.id));
    return homepageRows(novel).filter(entry => !boardIds.has(entry.id));
  }, [novel]);
  const sections = useMemo(() => previewSections(page)
    .map(section => ({...section, columns:section.columns.map(column => column.filter(block =>
      block.layout !== 'image' || !!(block.title || block.text || block.target || blockImage(block, novel, notes)),
    )).filter(column => column.length > 0)}))
    .filter(section => section.columns.length > 0), [page, novel, notes]);
  const content = sections.flatMap(section => section.columns.flat());
  const leadHeading = content.find(block => block.layout === 'heading' && block.title.trim())?.id;
  const leadLink = content.find(block => block.layout === 'links' && block.links?.length)?.id;

  useLayoutEffect(() => {
    if (!scroll.current) return;
    scroll.current.scrollTop = 0;
    scroll.current.focus({preventScroll:true});
  }, [page.id]);

  function open(target: HomeTarget) {
    setMessage('');
    if (target.kind === 'page') {
      const next = homepageEntry(novel, target.id);
      if (!next) {
        setMessage('This page is unavailable.');
        return;
      }
      if (!next.storyBoard) {
        setTrail(previous => previous.at(-1) === next.id ? previous : [...previous, next.id]);
        return;
      }
    }
    if (target.kind === 'note' && !notes.has(target.id)) {
      setMessage('This note is unavailable.');
      return;
    }
    onClose();
    onOpen(target);
  }

  function openMap(id: string) {
    onClose();
    onOpenMap(id);
  }

  return <Dialog open onOpenChange={value => {if (!value) onClose();}}>
    <DialogContent className="canvas-preview-dialog" onCloseAutoFocus={event => event.preventDefault()}>
      <div className="canvas-preview-bar">
        <DialogTitle>Page preview</DialogTitle>
        <DialogDescription className="sr-only">Read a Canvas page and try its links in desktop or phone layout.</DialogDescription>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button type="button" size="icon" variant="outline" aria-label="Back to previous preview page"
            disabled={trail.length < 2} onClick={() => {setMessage('');setTrail(current => current.slice(0, -1));}}>
            <ArrowLeft aria-hidden="true"/>
          </Button>
          <select aria-label="Canvas page" value={page.id} disabled={pages.length < 2}
            className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
            onChange={event => open({kind:'page', id:event.target.value})}>
            {pages.map(entry => <option key={entry.id} value={entry.id}>{entry.path}</option>)}
          </select>
        </div>
        <div aria-label="Preview device" role="group" className="flex gap-1 rounded-lg border border-border p-1">
          <Button type="button" size="sm" variant={device === 'desktop' ? 'secondary' : 'ghost'} aria-pressed={device === 'desktop'}
            onClick={() => setDevice('desktop')}><Monitor aria-hidden="true"/>Desktop</Button>
          <Button type="button" size="sm" variant={device === 'phone' ? 'secondary' : 'ghost'} aria-pressed={device === 'phone'}
            onClick={() => setDevice('phone')}><Smartphone aria-hidden="true"/>Phone</Button>
        </div>
      </div>
      <div ref={scroll} tabIndex={0} role="region" data-preview-scroll aria-label="Page content" className="canvas-preview-scroll">
        <article className="canvas-preview-page" data-device={device} data-canvas-page-preview={page.id} aria-label={page.title}>
          {message && <p role="status" className="rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive">{message}</p>}
          {!leadHeading && <h1>{page.title}</h1>}
          {sections.map(section => <section key={section.id} className="canvas-preview-section">
            {section.title && <h2>{section.title}</h2>}
            <div className="canvas-preview-grid" style={{'--preview-columns':section.columns.length} as CSSProperties}>
              {section.columns.map((column, index) => <div key={index} className="canvas-preview-column">
                {column.map(block => <PreviewBlock key={block.id} block={block} novel={novel} notes={notes}
                  leadHeading={block.id === leadHeading} leadLink={block.id === leadLink} describe={describe} open={open} openMap={openMap}/>)}
              </div>)}
            </div>
          </section>)}
          {sections.length === 0 && <p className="canvas-preview-empty">This canvas has no page content yet.</p>}
        </article>
      </div>
    </DialogContent>
  </Dialog>;
}
