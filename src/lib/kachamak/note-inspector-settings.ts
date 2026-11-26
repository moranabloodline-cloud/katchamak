import { useSyncExternalStore } from 'react';
import {
  changeInspectorTab, inspectorSettings, validHiddenInspectorTabs,
  type InspectorSettings, type InspectorTabAction,
} from './inspector-tabs';
import { INSPECTOR_TABS, type InspectorTabKey, type Novel, type TabKey } from './types';

const prefix = 'draftopus-note-inspector-v1:';
const listeners = new Set<() => void>();
const unsaved = new Map<string, string>();

function settingsKey(projectId: string, noteId: string) {
  return prefix + JSON.stringify([projectId, noteId]);
}

function read(key: string | undefined): string | null {
  if (!key) return null;
  const pending = unsaved.get(key);
  if (pending !== undefined) return pending;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(prefix)) listener();
  };
  listeners.add(listener);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function parse(value: string | null): InspectorSettings | undefined {
  if (!value) return;
  try {
    const stored = JSON.parse(value);
    if (!validHiddenInspectorTabs(stored?.hidden)) return;
    const { hidden, selected } = stored;
    if (selected === undefined || INSPECTOR_TABS.some(tab => tab.key === selected && !hidden.includes(tab.key))) {
      return { hidden, selected };
    }
  } catch {
    // An unreadable local preference falls back to the workspace settings.
  }
}

export function getNoteInspectorSettings(book: Novel, workspace: TabKey, noteId?: string) {
  return parse(read(noteId ? settingsKey(book.id, noteId) : undefined)) ?? inspectorSettings(book, workspace);
}

export function useNoteInspectorSettings(book: Novel, workspace: TabKey, noteId?: string) {
  const key = noteId ? settingsKey(book.id, noteId) : undefined;
  const value = useSyncExternalStore(subscribe, () => read(key), () => null);
  return parse(value) ?? inspectorSettings(book, workspace);
}

// Scope stays local so changing a note's inspector never dirties the manuscript.
export function changeNoteInspectorTab(
  book: Novel, workspace: TabKey, noteId: string, tab: InspectorTabKey, action: InspectorTabAction
) {
  const key = settingsKey(book.id, noteId);
  const current = parse(read(key));
  if (!current && action === 'select') return false;
  const next = changeInspectorTab(current ?? inspectorSettings(book, workspace), workspace, tab, action);
  if (next) {
    const value = JSON.stringify({ hidden: next.hidden, selected: next.selected });
    try {
      window.localStorage.setItem(key, value);
      unsaved.delete(key);
    } catch {
      unsaved.set(key, value);
    }
    for (const listener of listeners) listener();
  }
  return true;
}
