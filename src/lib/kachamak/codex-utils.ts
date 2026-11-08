import type { CodexCategory } from "./types";
import { stripHtml } from "./utils";

export function countWords(html: string): number {
  const text = stripHtml(html).trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}

export function findEntryInCategories(
  cats: CodexCategory[],
  id: string
): CodexCategory["entries"][number] | null {
  for (const c of cats) {
    const hit = c.entries.find((e) => e.id === id);
    if (hit) return hit;
    const sub = findEntryInCategories(c.children, id);
    if (sub) return sub;
  }
  return null;
}

/** alias kept for readability at call sites */
export const findNodeSafe = findEntryInCategories;
