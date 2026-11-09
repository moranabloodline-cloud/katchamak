import type { NoteNode, Novel, SectionKey } from "./types";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');
}

export function countWords(html: string): number {
  const text = stripHtml(html).trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ---------- tree helpers ---------- */

export function findNode(
  roots: NoteNode[],
  id: string
): NoteNode | null {
  for (const n of roots) {
    if (n.id === id) return n;
    const hit = findNode(n.children, id);
    if (hit) return hit;
  }
  return null;
}

export function findParentId(
  roots: NoteNode[],
  id: string,
  parentId: string | null = null
): string | null {
  for (const n of roots) {
    if (n.id === id) return parentId;
    const hit = findParentId(n.children, id, n.id);
    if (hit !== null || n.children.some((c) => c.id === id)) return hit;
  }
  return null;
}

export function forEachNode(
  roots: NoteNode[],
  fn: (n: NoteNode) => void
): void {
  for (const n of roots) {
    fn(n);
    forEachNode(n.children, fn);
  }
}

export function nodeWords(n: NoteNode): number {
  return countWords(n.content) + n.children.reduce((a, c) => a + nodeWords(c), 0);
}

export function countScenes(roots: NoteNode[]): number {
  let k = 0;
  forEachNode(roots, (n) => {
    if (n.kind === "scene") k++;
  });
  return k;
}

export function sectionWords(novel: Novel, key: SectionKey): number {
  return novel.sections[key].reduce((a, r) => a + nodeWords(r), 0);
}

export function novelWords(novel: Novel): number {
  return sectionWords(novel, "binder");
}

export function novelScenes(novel: Novel): number {
  return countScenes(novel.sections.binder);
}

/** All ancestor ids of a node (for auto-expanding the tree). */
export function ancestorIds(roots: NoteNode[], id: string): string[] {
  const path: string[] = [];
  const walk = (nodes: NoteNode[], chain: string[]): boolean => {
    for (const n of nodes) {
      if (n.id === id) {
        path.push(...chain);
        return true;
      }
      if (walk(n.children, [...chain, n.id])) return true;
    }
    return false;
  };
  walk(roots, []);
  return path;
}

/** Leaf notes = notes without children (they are the cards in Corkboard). */
export function isLeaf(n: NoteNode): boolean {
  return n.children.length === 0;
}

export function hasVisibleChildren(n: NoteNode): boolean {
  return n.children.length > 0;
}
