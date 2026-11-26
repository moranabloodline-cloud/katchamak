export type LibraryNotePatch = {
  notes: { projectId: string; noteId: string; fields: Record<string, unknown>; remove: string[] }[];
  projectTimes: { projectId: string; updatedAt: number }[];
};

type LibraryContent = {
  novels: unknown[];
  collections?: unknown[];
  editorAppearance?: unknown;
};

export function createLibraryNotePatch(base: LibraryContent, next: LibraryContent): LibraryNotePatch | null;
export function validLibraryNotePatch(patch: unknown): patch is LibraryNotePatch;
export function applyLibraryNotePatch<T extends LibraryContent>(base: T, patch: unknown): T | null;
