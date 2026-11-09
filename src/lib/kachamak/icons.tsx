"use client";

import type { ComponentType, CSSProperties } from "react";
import {
  Anchor,
  Book,
  BookOpen,
  Bookmark,
  Building2,
  Calendar,
  Castle,
  Clock,
  Compass,
  Crown,
  Diamond,
  Droplets,
  Eye,
  Feather,
  File,
  FileText,
  Flag,
  Flame,
  Folder,
  FolderOpen,
  Gem,
  Ghost,
  Globe,
  Heart,
  Hexagon,
  Home,
  KeyRound,
  Landmark,
  Leaf,
  Library,
  Lightbulb,
  Map,
  MapPin,
  Moon,
  Mountain,
  Notebook,
  PenLine,
  Quote,
  Scroll,
  ScrollText,
  Shield,
  Ship,
  Skull,
  Sparkles,
  Star,
  Sun,
  Swords,
  Tag,
  TreePine,
  Users,
  User,
} from "lucide-react";

type IconCmp = ComponentType<{ className?: string; style?: CSSProperties }>;

/* solid folder like the original app's tree icons */
export function MaterialFolder({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
  );
}

/* everything a note can be — the user decides via name + icon + colour */
export const NOTE_ICONS: { key: string; label: string; Cmp: IconCmp }[] = [
  { key: "folder", label: "Folder", Cmp: MaterialFolder },
  { key: "file", label: "Note", Cmp: FileText },
  { key: "file-generic", label: "File", Cmp: File },
  { key: "folder-open", label: "Open folder", Cmp: FolderOpen },
  { key: "folder-outline", label: "Folder outline", Cmp: Folder },
  { key: "book", label: "Book", Cmp: Book },
  { key: "book-open", label: "Open book", Cmp: BookOpen },
  { key: "bookmark", label: "Bookmark", Cmp: Bookmark },
  { key: "library", label: "Library", Cmp: Library },
  { key: "landmark", label: "Landmark", Cmp: Landmark },
  { key: "scroll", label: "Scroll", Cmp: Scroll },
  { key: "scroll-text", label: "Scroll text", Cmp: ScrollText },
  { key: "notebook", label: "Notebook", Cmp: Notebook },
  { key: "pen", label: "Pen", Cmp: PenLine },
  { key: "feather", label: "Feather", Cmp: Feather },
  { key: "quote", label: "Quote", Cmp: Quote },
  { key: "lightbulb", label: "Idea", Cmp: Lightbulb },
  { key: "map", label: "Map", Cmp: Map },
  { key: "map-pin", label: "Pin", Cmp: MapPin },
  { key: "compass", label: "Compass", Cmp: Compass },
  { key: "globe", label: "World", Cmp: Globe },
  { key: "users", label: "People", Cmp: Users },
  { key: "user", label: "Person", Cmp: User },
  { key: "heart", label: "Heart", Cmp: Heart },
  { key: "skull", label: "Skull", Cmp: Skull },
  { key: "swords", label: "Battle", Cmp: Swords },
  { key: "shield", label: "Shield", Cmp: Shield },
  { key: "crown", label: "Crown", Cmp: Crown },
  { key: "castle", label: "Castle", Cmp: Castle },
  { key: "ghost", label: "Ghost", Cmp: Ghost },
  { key: "moon", label: "Moon", Cmp: Moon },
  { key: "sun", label: "Sun", Cmp: Sun },
  { key: "star", label: "Star", Cmp: Star },
  { key: "sparkles", label: "Magic", Cmp: Sparkles },
  { key: "flame", label: "Fire", Cmp: Flame },
  { key: "droplets", label: "Water", Cmp: Droplets },
  { key: "leaf", label: "Nature", Cmp: Leaf },
  { key: "tree", label: "Tree", Cmp: TreePine },
  { key: "mountain", label: "Mountain", Cmp: Mountain },
  { key: "home", label: "Home", Cmp: Home },
  { key: "building", label: "Building", Cmp: Building2 },
  { key: "ship", label: "Ship", Cmp: Ship },
  { key: "anchor", label: "Anchor", Cmp: Anchor },
  { key: "key", label: "Key", Cmp: KeyRound },
  { key: "eye", label: "Eye", Cmp: Eye },
  { key: "clock", label: "Time", Cmp: Clock },
  { key: "calendar", label: "Date", Cmp: Calendar },
  { key: "flag", label: "Flag", Cmp: Flag },
  { key: "tag", label: "Tag", Cmp: Tag },
  { key: "diamond", label: "Diamond", Cmp: Diamond },
  { key: "hexagon", label: "Hexagon", Cmp: Hexagon },
];

const ICON_MAP: Record<string, IconCmp> = Object.fromEntries(
  NOTE_ICONS.map((i) => [i.key, i.Cmp])
);

export function iconByName(key: string | undefined): IconCmp | null {
  if (!key) return null;
  return ICON_MAP[key] ?? null;
}

/* the note colour palette (icon tint in the tree + the document dot) */
export const NOTE_COLORS = [
  "#e3c567",
  "#3fb950",
  "#f0883e",
  "#f85149",
  "#a371f7",
  "#58a6ff",
  "#39c5cf",
  "#f472b6",
  "#a3e635",
  "#8b949e",
];
