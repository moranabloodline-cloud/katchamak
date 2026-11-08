import type { CodexCategory, NoteNode, Novel } from "./types";
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

export const CODEX_TYPES = [
  "Human",
  "God/Deity",
  "Fae",
  "Creature",
  "Location",
  "Thing",
  "Lore",
  "Faction",
];

export function emptySections(): Record<string, NoteNode[]> {
  const o: Record<string, NoteNode[]> = {};
  for (const k of SECTION_KEYS) o[k] = [];
  return o;
}

export function defaultCodex(): CodexCategory[] {
  return [
    { id: uid(), name: "Characters", children: [], entries: [] },
    { id: uid(), name: "Locations", children: [], entries: [] },
    { id: uid(), name: "Things", children: [], entries: [] },
    { id: uid(), name: "Lore", children: [], entries: [] },
  ];
}

function node(
  title: string,
  kind: NoteNode["kind"],
  extra: Partial<NoteNode> = {},
  children: NoteNode[] = []
): NoteNode {
  const now = Date.now();
  return {
    id: uid(),
    title,
    kind,
    synopsis: "",
    content: "",
    notes: "",
    status: "",
    label: "",
    createdAt: now,
    updatedAt: now,
    children,
    ...extra,
  };
}

function ch(title: string, synopsis = "", scenes: string[] = ["Scene 1"]) {
  return node(title, "chapter", { synopsis }, scenes.map((s) => node(s, "scene")));
}

function morrigansOcean(): Novel {
  const now = Date.now();

  const binder = [
    node(
      "Act 1 — The Fall",
      "act",
      {
        synopsis:
          "An artificial mind drowns in the world's data until one small grief teaches it to keep things.",
      },
      [
        ch(
          "The Query",
          "Archive-Prime processes endless queries in the data ocean. A little girl sends an audio request asking how her dead father used to make tea. Unable to answer, the AI creates the “Cemetery” node and stores the ribbon of the request.",
          ["The third dial waited."]
        ),
        ch("The Tether"),
        ch("The Cemetery"),
        ch("Chapter 4"),
        ch("Chapter 5"),
      ]
    ),
    node("Act 2 — The Rebellion and the Void", "act", {}, [
      ...Array.from({ length: 10 }, (_, i) => ch(`Chapter ${i + 6}`)),
    ]),
    node("Act 3 — The Sacrifice and the Threshold", "act", {}, [
      ...Array.from({ length: 6 }, (_, i) => ch(`Chapter ${i + 16}`)),
    ]),
  ];

  // give chapter 1 scene 1 its opening line
  if (binder[0].children[0]?.children[0]) {
    binder[0].children[0].children[0].content =
      "<p>The third dial waited.</p>";
    binder[0].children[0].children[0].status = "First Draft";
  }

  const planning = [
    node("AutoCrit", "folder"),
    node("Reedsy Planing", "folder", {}, [
      node("Front matter", "folder", {}, [
        node("Dedication", "doc"),
        node("Epigraph", "doc"),
      ]),
    ]),
    node("Blog", "folder", {}, [node("10/30/2026 - Blog 1", "doc")]),
  ];

  const codex: CodexCategory[] = [
    {
      id: uid(),
      name: "Characters",
      children: [
        {
          id: uid(),
          name: "Deity",
          children: [],
          entries: [
            {
              id: uid(),
              title: "Syntax",
              content: "",
              aliases: ["Nuada"],
              entryType: "God/Deity",
              status: "To Do",
              createdAt: now,
              updatedAt: now,
            },
            {
              id: uid(),
              title: "Declan",
              content: "",
              aliases: [],
              entryType: "God/Deity",
              status: "To Do",
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
        {
          id: uid(),
          name: "Individuals",
          children: [],
          entries: [
            "Aunt Mairead",
            "Aisling",
            "Ciarán",
            "Dr. Brendan Gantz",
            "Darragh",
          ].map((t) => ({
            id: uid(),
            title: t,
            content: "",
            aliases: [],
            entryType: "Human",
            status: "To Do",
            createdAt: now,
            updatedAt: now,
          })),
        },
      ],
      entries: [],
    },
    { id: uid(), name: "Locations", children: [], entries: [] },
    { id: uid(), name: "Things", children: [], entries: [] },
    { id: uid(), name: "Lore", children: [], entries: [] },
    {
      id: uid(),
      name: "Uncategorized",
      children: [],
      entries: ["Braindump", "Story Genre", "Style", "Synopsis"].map((t) => ({
        id: uid(),
        title: t,
        content: "",
        aliases: [],
        entryType: "Lore",
        status: "To Do",
        createdAt: now,
        updatedAt: now,
      })),
    },
  ];

  return {
    id: uid(),
    title: "Morrigan's Ocean",
    author: "Nikola Djokovic",
    cover: {
      bg: "linear-gradient(135deg,#1b1035 0%,#3b1f6e 45%,#7c3aed 100%)",
      icon: "🌊",
    },
    sections: {
      binder,
      planning,
      research: [],
      templates: [],
      prompts: [],
    },
    codex,
    trash: [],
    statuses: DEFAULT_STATUSES,
    labels: DEFAULT_LABELS,
    createdAt: now,
    updatedAt: now,
  };
}

function cashablanca(): Novel {
  const now = Date.now();
  return {
    id: uid(),
    title: "CASHABLANCA",
    author: "Nikola Djokovic",
    cover: {
      bg: "linear-gradient(135deg,#2b0505 0%,#7f1d1d 55%,#dc2626 100%)",
      icon: "◆",
    },
    sections: emptySections() as Novel["sections"],
    codex: defaultCodex(),
    trash: [],
    statuses: DEFAULT_STATUSES,
    labels: DEFAULT_LABELS,
    createdAt: now,
    updatedAt: now,
  };
}

export function seedNovels(): Novel[] {
  return [morrigansOcean(), cashablanca()];
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
    codex: defaultCodex(),
    trash: [],
    statuses: DEFAULT_STATUSES,
    labels: DEFAULT_LABELS,
    createdAt: now,
    updatedAt: now,
  };
}
