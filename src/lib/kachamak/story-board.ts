import type {NoteNode, Novel} from './types';
import {NOTE_COLORS} from './note-colors';
import {uid} from './utils';

export interface StoryChapter {
  id: string;
  title: string;
}

export interface StoryPlotline {
  id: string;
  title: string;
  color: string;
}

export interface StoryScene {
  id: string;
  chapterId: string;
  plotlineId: string;
  title: string;
  synopsis: string;
  noteId?: string;
}

export interface StoryBoard {
  chapters: StoryChapter[];
  plotlines: StoryPlotline[];
  scenes: StoryScene[];
}

export function nextPlotlineColor(plotlines: StoryPlotline[]) {
  const used = new Set(plotlines.map(line => line.color.toLowerCase()));
  return NOTE_COLORS.find(color => !used.has(color)) ?? NOTE_COLORS[plotlines.length % NOTE_COLORS.length];
}

const chapterTitle = /^ch(?:apter)?\.?\s*(?:\d+|[ivxlcdm]+)\b/i;

function binderChapterTitles(roots: NoteNode[]) {
  const names: string[] = [];
  const visit = (nodes: NoteNode[]) => {
    for (const node of nodes) {
      if (names.length >= 5) break;
      if (node.hidden) continue;
      const title = node.title.trim();
      if (title && (node.kind === 'chapter' || chapterTitle.test(title))) {
        names.push(title);
      } else {
        visit(node.children);
      }
    }
  };
  visit(roots);
  return names;
}

export function newStoryBoard(novel: Novel): StoryBoard {
  const names = binderChapterTitles(novel.sections.binder);
  return {
    chapters: (names.length ? names : ['Chapter 1', 'Chapter 2', 'Chapter 3']).map(title => ({id: uid(), title})),
    plotlines: [
      {id: uid(), title: 'Main plot', color: NOTE_COLORS[0]},
      {id: uid(), title: 'Character arc', color: NOTE_COLORS[1]},
    ],
    scenes: [],
  };
}

function nonblank(value: unknown): value is string {
  return typeof value === 'string' && !!value.trim();
}

export function validStoryBoard(value: unknown): value is StoryBoard {
  if (!value || typeof value !== 'object') return false;
  const {chapters, plotlines, scenes} = value as Partial<StoryBoard>;
  if (!Array.isArray(chapters) || !Array.isArray(plotlines) || !Array.isArray(scenes)) return false;

  const ids = new Set<string>();
  const uniqueId = (id: unknown) => {
    if (typeof id !== 'string' || !/^[\w-]{1,128}$/.test(id) || ids.has(id)) return false;
    ids.add(id);
    return true;
  };
  if (!chapters.every(chapter => chapter && uniqueId(chapter.id) && nonblank(chapter.title)) ||
      !plotlines.every(plotline => plotline && uniqueId(plotline.id) && nonblank(plotline.title) &&
        typeof plotline.color === 'string' && /^#[\da-f]{6}$/i.test(plotline.color))) return false;

  const chapterIds = new Set(chapters.map(chapter => chapter.id));
  const plotlineIds = new Set(plotlines.map(plotline => plotline.id));
  return scenes.every(scene => scene && uniqueId(scene.id) && chapterIds.has(scene.chapterId) &&
    plotlineIds.has(scene.plotlineId) && nonblank(scene.title) && typeof scene.synopsis === 'string' &&
    (scene.noteId === undefined || nonblank(scene.noteId)));
}

export function moveStoryScene(
  board: StoryBoard, sceneId: string, chapterId: string, plotlineId: string, beforeId?: string,
): StoryBoard {
  const scene = board.scenes.find(item => item.id === sceneId);
  if (!scene || beforeId === sceneId ||
      !board.chapters.some(chapter => chapter.id === chapterId) ||
      !board.plotlines.some(plotline => plotline.id === plotlineId)) return board;

  const destination = board.scenes.filter(item =>
    item.chapterId === chapterId && item.plotlineId === plotlineId);
  const sameCell = scene.chapterId === chapterId && scene.plotlineId === plotlineId;
  const sceneIndex = destination.findIndex(item => item.id === sceneId);
  const before = beforeId ? destination.find(item => item.id === beforeId) : undefined;
  if (beforeId && !before) return board;
  if (sameCell && (before ? destination[sceneIndex + 1]?.id === beforeId : sceneIndex === destination.length - 1)) return board;

  const scenes = board.scenes.filter(item => item !== scene);
  const insertAt = before ? scenes.indexOf(before) : scenes.length;
  scenes.splice(insertAt, 0, sameCell ? scene : {...scene, chapterId, plotlineId});
  return {...board, scenes};
}
