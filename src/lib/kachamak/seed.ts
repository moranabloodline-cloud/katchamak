import type { NoteNode, Novel } from "./types";
import { SECTION_KEYS } from "./types";
import { uid } from "./utils";

export const DEFAULT_STATUSES = [
  "N/A",
  "To Do",
  "First Draft",
  "Revised Draft",
  "Final Draft",
  "Done",
];

export const DEFAULT_LABELS = [
  { id: "lbl-green", name: "Canon", color: "#3fb950" },
  { id: "lbl-orange", name: "Plot", color: "#f0883e" },
  { id: "lbl-red", name: "Conflict", color: "#f85149" },
  { id: "lbl-violet", name: "Theme", color: "#a371f7" },
  { id: "lbl-yellow", name: "Research", color: "#d29922" },
];

export function emptySections(): Record<string, NoteNode[]> {
  const o: Record<string, NoteNode[]> = {};
  for (const k of SECTION_KEYS) o[k] = [];
  return o;
}

export function newNovel(title: string, author: string): Novel {
  const now = Date.now();
  const palettes = [
    "linear-gradient(135deg,#1b1035 0%,#3b1f6e 45%,#7c3aed 100%)",
    "linear-gradient(135deg,#2b0505 0%,#7f1d1d 55%,#dc2626 100%)",
    "linear-gradient(135deg,#0a2618 0%,#14532d 55%,#22c55e 100%)",
    "linear-gradient(135deg,#271a04 0%,#92400e 55%,#f59e0b 100%)",
    "linear-gradient(135deg,#041f27 0%,#155e75 55%,#06b6d4 100%)",
  ];
  return {
    id: uid(),
    title: title.trim() || "Untitled Novel",
    author: author.trim() || "Unknown Author",
    cover: { bg: palettes[Math.floor(Math.random() * palettes.length)], icon: "✦" },
    sections: emptySections() as Novel["sections"],
    trash: [],
    statuses: DEFAULT_STATUSES,
    labels: DEFAULT_LABELS,
    createdAt: now,
    updatedAt: now,
  };
}
