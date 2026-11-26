'use client';

import {useMemo, useState, type CSSProperties, type DragEvent, type FormEvent} from 'react';
import {AlignStartVertical, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ExternalLink, LockKeyhole, Pencil, Plus, UnlockKeyhole} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import type {HomePageEntry} from '@/lib/kachamak/homepage';
import {flattenNotes} from '@/lib/kachamak/note-links';
import {
  moveStoryScene, storyPlotlineColors, type StoryBoard, type StoryChapter, type StoryPlotline, type StoryScene,
} from '@/lib/kachamak/story-board';
import type {Novel} from '@/lib/kachamak/types';
import {uid} from '@/lib/kachamak/utils';
import './canvas-story-board.css';

type Item =
  | {kind: 'chapter'; value: StoryChapter}
  | {kind: 'plotline'; value: StoryPlotline}
  | {kind: 'scene'; value: StoryScene};

type Edit = Item & {existing: boolean; previous: StoryBoard};
type Destination = {chapterId: string; plotlineId: string; beforeId?: string};
type BinderNote = {id: string; title: string; path: string};
type Props = {
  page: HomePageEntry;
  board: StoryBoard;
  novel: Novel;
  change: (previous: StoryBoard, next: StoryBoard) => boolean;
  openNote: (id: string) => void;
  onShowPages?: () => void;
  toggleLock?: () => void;
};

const selectStyle = 'h-9 min-w-0 w-full rounded-md border border-input bg-background px-2 text-sm';
const cellKey = (chapterId: string, plotlineId: string) => chapterId + ':' + plotlineId;
const sceneDragType = 'application/x-draftopus-story-scene';

function upsert<T extends {id: string}>(items: T[], item: T) {
  const original = items.find(entry => entry.id === item.id);
  return original ? items.map(entry => entry === original ? item : entry) : [...items, item];
}

function shift<T>(items: T[], index: number, by: -1 | 1) {
  const next = items.slice();
  const other = index + by;
  [next[other], next[index]] = [next[index], next[other]];
  return next;
}

function StoryBoardEditor({edit, notes, save, close}: {
  edit: Edit;
  notes: BinderNote[];
  save: (board: StoryBoard) => boolean;
  close: () => void;
}) {
  const [editorError, setEditorError] = useState('');
  const {kind, value, previous, existing} = edit;
  const scene = kind === 'scene' ? value : undefined;
  const chapter = kind === 'chapter';
  const axes = chapter ? previous.chapters : previous.plotlines;
  const index = axes.findIndex(item => item.id === value.id);
  const heading = (existing ? 'Edit ' : 'Add ') + kind;
  const linkedNoteMissing = scene?.noteId && !notes.some(note => note.id === scene.noteId);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    if (!title) {
      setEditorError('Enter a title.');
      return;
    }

    let next: StoryBoard;
    if (kind === 'chapter') {
      next = {...previous, chapters: upsert(previous.chapters, {...value, title})};
    } else if (kind === 'plotline') {
      next = {...previous, plotlines: upsert(previous.plotlines, {...value, title, color: String(form.get('color'))})};
    } else {
      const chapterId = String(form.get('chapter'));
      const plotlineId = String(form.get('plotline'));
      const synopsis = String(form.get('synopsis') ?? '').trim();
      const noteId = String(form.get('note') ?? '') || undefined;
      const moved = existing && (chapterId !== value.chapterId || plotlineId !== value.plotlineId);
      const from = moved ? moveStoryScene(previous, value.id, chapterId, plotlineId) : previous;
      // Editing in place must keep the scene's place within its cell.
      next = {...from, scenes: upsert(from.scenes, {...value, title, chapterId, plotlineId, synopsis, noteId})};
    }
    finish(next);
  }

  function finish(next: StoryBoard) {
    if (save(next)) close();
    else setEditorError('The board changed while you were editing. Close this window and try again.');
  }

  function reorder(by: -1 | 1) {
    if (index < 0 || index + by < 0 || index + by >= axes.length) return;
    finish(chapter
      ? {...previous, chapters: shift(previous.chapters, index, by)}
      : {...previous, plotlines: shift(previous.plotlines, index, by)});
  }

  function remove() {
    if (kind === 'scene') {
      if (window.confirm('Remove this scene from the Story Board?')) {
        finish({...previous, scenes: previous.scenes.filter(item => item.id !== value.id)});
      }
      return;
    }
    const affected = previous.scenes.filter(item => (chapter ? item.chapterId : item.plotlineId) === value.id);
    const notice = affected.length
      ? 'Remove this ' + kind + ' and its ' + affected.length + ' scene ' + (affected.length === 1 ? 'card' : 'cards') + ' from the board? Binder notes stay in place.'
      : 'Remove this ' + kind + ' from the board?';
    if (!window.confirm(notice)) return;
    const scenes = previous.scenes.filter(item => (chapter ? item.chapterId : item.plotlineId) !== value.id);
    finish(chapter
      ? {...previous, chapters: previous.chapters.filter(item => item.id !== value.id), scenes}
      : {...previous, plotlines: previous.plotlines.filter(item => item.id !== value.id), scenes});
  }

  const Backward = chapter ? ArrowLeft : ArrowUp;
  const Forward = chapter ? ArrowRight : ArrowDown;
  return (
    <Dialog open onOpenChange={open => { if (!open) close(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription className="sr-only">Organize scenes and story structure on this board.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <label className="grid gap-1.5 text-sm">
            Title
            <Input name="title" required defaultValue={value.title} autoFocus />
          </label>
          {kind === 'plotline' && <label className="grid gap-1.5 text-sm">
            Color
            <input className="h-9 w-14 rounded-md border border-input bg-background p-1" type="color" name="color" defaultValue={value.color} />
          </label>}
          {scene && <>
            <label className="grid gap-1.5 text-sm">
              Synopsis
              <Textarea name="synopsis" defaultValue={scene.synopsis} rows={4} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid min-w-0 gap-1.5 text-sm">
                Chapter
                <select className={selectStyle} name="chapter" defaultValue={scene.chapterId}>
                  {previous.chapters.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
                </select>
              </label>
              <label className="grid min-w-0 gap-1.5 text-sm">
                Plotline
                <select className={selectStyle} name="plotline" defaultValue={scene.plotlineId}>
                  {previous.plotlines.map(line => <option key={line.id} value={line.id}>{line.title}</option>)}
                </select>
              </label>
            </div>
            <label className="grid gap-1.5 text-sm">
              Binder note
              <select className={selectStyle} name="note" defaultValue={scene.noteId ?? ''}>
                <option value="">No linked note</option>
                {linkedNoteMissing && <option value={scene.noteId}>Note unavailable</option>}
                {notes.map(note => <option key={note.id} value={note.id}>{note.path}</option>)}
              </select>
            </label>
          </>}
          {editorError && <p role="alert" className="text-sm text-destructive">{editorError}</p>}
          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
              {existing && <Button type="button" variant="ghost" className="text-destructive" onClick={remove}>Remove {kind}</Button>}
              {existing && kind !== 'scene' && <>
                <Button type="button" variant="ghost" size="icon" aria-label={'Move ' + kind + ' ' + (chapter ? 'left' : 'up')} disabled={index <= 0} onClick={() => reorder(-1)}><Backward /></Button>
                <Button type="button" variant="ghost" size="icon" aria-label={'Move ' + kind + ' ' + (chapter ? 'right' : 'down')} disabled={index >= axes.length - 1} onClick={() => reorder(1)}><Forward /></Button>
              </>}
            </div>
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
              <Button type="submit">{existing ? 'Save changes' : heading}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CanvasStoryBoard({page, board, novel, change, openNote, onShowPages, toggleLock}: Props) {
  const [editor, setEditor] = useState<Edit | null>(null);
  const [dragId, setDragId] = useState<string>();
  const [drop, setDrop] = useState<Destination>();
  const [error, setError] = useState(false);
  const {notes, notesById} = useMemo(() => {
    const notes: BinderNote[] = flattenNotes(novel, 'binder')
      .filter(({node}) => node.kind !== 'folder' && !node.hidden)
      .map(({node, path}) => {
        const title = node.title || 'Untitled note';
        return {id: node.id, title, path: [...path, title].join(' / ')};
      });
    return {notes, notesById: new Map(notes.map(note => [note.id, note]))};
  }, [novel]);
  const sceneCells = useMemo(() => {
    const groups = new Map<string, StoryScene[]>();
    for (const scene of board.scenes) {
      const key = cellKey(scene.chapterId, scene.plotlineId);
      const group = groups.get(key);
      if (group) group.push(scene);
      else groups.set(key, [scene]);
    }
    return groups;
  }, [board.scenes]);

  function openEditor(item: Item, existing = false) {
    setError(false);
    setEditor({...item, existing, previous: board});
  }

  function commit(previous: StoryBoard, next: StoryBoard) {
    if (page.locked) return false;
    if (next === previous || JSON.stringify(next) === JSON.stringify(previous)) return true;
    const saved = change(previous, next);
    setError(!saved);
    return saved;
  }

  function clearDrag() {
    setDragId(undefined);
    setDrop(undefined);
  }

  function destination(event: DragEvent<HTMLTableCellElement>, chapterId: string, plotlineId: string): Destination {
    const over = (event.target as Element).closest<HTMLElement>('[data-story-scene]');
    if (!over) return {chapterId, plotlineId};
    const rect = over.getBoundingClientRect();
    const beforeId = event.clientY < rect.top + rect.height / 2
      ? over.dataset.storyScene : (over.nextElementSibling as HTMLElement | null)?.dataset.storyScene;
    return {chapterId, plotlineId, beforeId};
  }

  const locked = page.locked;
  return (
    <section className="canvas-story flex min-h-0 min-w-0 flex-1 flex-col" aria-label="Story Board">
      <header className="canvas-story-header">
        {onShowPages && <Button type="button" variant="ghost" size="sm" className="md:hidden" onClick={onShowPages}>Pages</Button>}
        <div className="canvas-story-title flex min-w-0 flex-1 items-center gap-2">
          <AlignStartVertical size={18} className="shrink-0" aria-hidden="true" />
          <h2 className="truncate text-xl font-semibold" title={page.title}>{page.title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!locked && <>
            <Button type="button" size="sm" variant="outline" onClick={() => openEditor({kind: 'chapter', value: {id: uid(), title: ''}})}><Plus />Add chapter</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => openEditor({kind: 'plotline', value: {
              id: uid(), title: '', color: storyPlotlineColors[board.plotlines.length % storyPlotlineColors.length],
            }})}><Plus />Add plotline</Button>
          </>}
          {toggleLock && <Button type="button" size="icon" variant="ghost" aria-label={locked ? 'Unlock canvas' : 'Lock canvas'} onClick={toggleLock}>
            {locked ? <LockKeyhole /> : <UnlockKeyhole />}
          </Button>}
        </div>
      </header>
      {error && !editor && <p className="canvas-story-error" role="alert">The board changed. Try moving the scene again.</p>}
      {(!board.chapters.length || !board.plotlines.length) && <p className="canvas-story-empty">
        {locked ? 'No scenes on this board.' : 'Add a chapter and a plotline to start placing scenes.'}
      </p>}
      <div className="canvas-story-scroll kachamak-scroll" role="region" aria-label="Story grid" tabIndex={0}>
        <table className="canvas-story-matrix" aria-label="Chapters and plotlines" style={{'--story-chapters': Math.max(1, board.chapters.length)} as CSSProperties}>
          <thead>
            <tr>
              <th scope="col" className="canvas-story-axis">Plotlines</th>
              {board.chapters.map(chapter => <th scope="col" key={chapter.id}>
                <div className="canvas-story-axis-heading">
                  <span>{chapter.title}</span>
                  {!locked && <Button type="button" variant="ghost" size="icon" aria-label={'Edit ' + chapter.title} onClick={() => openEditor({kind: 'chapter', value: chapter}, true)}><Pencil /></Button>}
                </div>
              </th>)}
            </tr>
          </thead>
          <tbody>
            {board.plotlines.map(plotline => <tr key={plotline.id} style={{'--story-line': plotline.color} as CSSProperties}>
              <th scope="row" className="canvas-story-axis">
                <div className="canvas-story-axis-heading">
                  <span className="canvas-story-plotline">{plotline.title}</span>
                  {!locked && <Button type="button" variant="ghost" size="icon" aria-label={'Edit ' + plotline.title} onClick={() => openEditor({kind: 'plotline', value: plotline}, true)}><Pencil /></Button>}
                </div>
              </th>
              {board.chapters.map(chapter => {
                const activeDrop = drop?.chapterId === chapter.id && drop.plotlineId === plotline.id ? drop : undefined;
                const scenes = sceneCells.get(cellKey(chapter.id, plotline.id)) ?? [];
                return <td key={chapter.id} data-story-chapter={chapter.id} data-story-plotline={plotline.id}
                  data-drop={activeDrop && !activeDrop.beforeId ? true : undefined}
                  onDragOver={event => {
                    if (locked || !dragId || !event.dataTransfer.types.includes(sceneDragType)) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    const next = destination(event, chapter.id, plotline.id);
                    setDrop(previous => previous?.chapterId === next.chapterId && previous.plotlineId === next.plotlineId &&
                      previous.beforeId === next.beforeId ? previous : next);
                  }}
                  onDragLeave={event => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDrop(undefined);
                  }}
                  onDrop={event => {
                    if (locked || !dragId || event.dataTransfer.getData(sceneDragType) !== dragId) return;
                    event.preventDefault();
                    const next = destination(event, chapter.id, plotline.id);
                    commit(board, moveStoryScene(board, dragId, chapter.id, plotline.id, next.beforeId));
                    clearDrag();
                  }}>
                  {scenes.map(scene => {
                    const note = scene.noteId ? notesById.get(scene.noteId) : undefined;
                    return <article className="canvas-story-scene" data-story-scene={scene.id} key={scene.id}
                      data-dragging={dragId === scene.id ? true : undefined}
                      data-drop-before={activeDrop?.beforeId === scene.id && dragId !== scene.id ? true : undefined}
                      draggable={!locked}
                      onDragStart={event => {
                        if (locked) return;
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData(sceneDragType, scene.id);
                        setDragId(scene.id);
                      }}
                      onDragEnd={clearDrag}>
                      <div className="flex items-start gap-1">
                        <h3 className="min-w-0 flex-1 break-words text-sm font-medium">{scene.title}</h3>
                        {!locked && <Button type="button" size="icon" variant="ghost" aria-label={'Edit ' + scene.title} onClick={() => openEditor({kind: 'scene', value: scene}, true)}><Pencil /></Button>}
                      </div>
                      {scene.synopsis && <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{scene.synopsis}</p>}
                      {note ? <button type="button" className="canvas-story-note" aria-label={'Open ' + note.title} title={note.path} onClick={() => openNote(note.id)}>
                        <ExternalLink size={12} className="shrink-0" /><span className="truncate">{note.title}</span>
                      </button> : scene.noteId && <p className="mt-2 text-xs text-muted-foreground">Linked note unavailable</p>}
                    </article>;
                  })}
                  {!locked && <button type="button" className="canvas-story-add" onClick={() => openEditor({kind: 'scene', value: {
                    id: uid(), title: '', synopsis: '', chapterId: chapter.id, plotlineId: plotline.id,
                  }})}><Plus size={15} /> Add scene</button>}
                </td>;
              })}
            </tr>)}
          </tbody>
        </table>
      </div>
      {!locked && editor && <StoryBoardEditor key={editor.value.id} edit={editor} notes={notes}
        save={next => commit(editor.previous, next)} close={() => setEditor(null)} />}
    </section>
  );
}
