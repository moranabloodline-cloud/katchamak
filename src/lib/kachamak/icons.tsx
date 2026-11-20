"use client";

import type { ComponentType, CSSProperties } from "react";
import { DEFAULT_NOTE_ICON, type NoteNode } from "./types";
import {
  createLucideIcon,
  FlaskConical,
  Circle,
  Bomb,
  BrickWall,
  BadgeCheck,
  Drama,
  Coins,
  Box,
  Boxes,
  CircleHelp,
  Dice6,
  Footprints,
  Clapperboard,
  Zap,
  Gift,
  Sword,
  Hammer,
  Images,
  LifeBuoy,
  ListChecks,
  WandSparkles,
  Medal,
  Store,
  Music,
  Wrench,
  Car,
  Shapes,
  Omega,
  Smartphone,
  Radiation,
  Layers,
  Rocket,
  Vault,
  Signpost,
  Cctv,
  Target,
  Tv,
  Hourglass,
  TriangleAlert,
  CloudLightning,
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

// Reference motifs absent from Lucide; all inherit the note's chosen colour.
const Airship = createLucideIcon('Airship', [
  ['ellipse',{cx:'12',cy:'9',rx:'9',ry:'5',key:'hull'}],
  ['path',{d:'M3 9h18M12 4c4 2 4 8 0 10M8 14l1 4h6l1-4M3 7 1 5v8l2-2',key:'details'}],
]);
const Ammunition = createLucideIcon('Ammunition', [
  ['path',{d:'M8 18V8c0-3 4-6 4-6s4 3 4 6v10M8 9h8M7 18h10v3H7z',key:'cartridge'}],
]);
const Pawn = createLucideIcon('Pawn', [
  ['circle',{cx:'12',cy:'5',r:'3',key:'head'}],
  ['path',{d:'M9 9h6M10 9c0 5-1 7-3 9h10c-2-2-3-4-3-9M6 18v3h12v-3',key:'base'}],
]);
const Deity = createLucideIcon('Deity', [
  ['circle',{cx:'12',cy:'12',r:'9',key:'circle'}],
  ['path',{d:'M12 3a4.5 4.5 0 0 1 0 9 4.5 4.5 0 0 0 0 9',key:'balance'}],
  ['circle',{cx:'12',cy:'7.5',r:'0.75',fill:'currentColor',key:'upper'}],
  ['circle',{cx:'12',cy:'16.5',r:'0.75',fill:'currentColor',key:'lower'}],
]);
const CheckeredFlag = createLucideIcon('CheckeredFlag', [
  ['path',{d:'M4 22V3h16v12H4M4 9h16M9 3v12M15 3v12',key:'flag'}],
  ['path',{d:'M4 3h5v6H4zM15 3h5v6h-5zM9 9h6v6H9z',fill:'currentColor',strokeWidth:'0',key:'checks'}],
]);
const Gauntlet = createLucideIcon('Gauntlet', [
  ['path',{d:'M7 15 4 11a1.5 1.5 0 0 1 2-2l2 2V5a1 1 0 0 1 2 0v5-7a1 1 0 0 1 2 0v7-6a1 1 0 0 1 2 0v6-4a1 1 0 0 1 2 0v7l-2 3M7 15v6h8v-6H7M8 18h6',key:'hand'}],
]);
const Helmet = createLucideIcon('Helmet', [
  ['path',{d:'M4 12V9a8 8 0 0 1 16 0v3H4M5 12v5l3 4h3v-6h2v6h3l3-4v-5M8 8h8M12 2v6',key:'helm'}],
]);
const Hat = createLucideIcon('Hat', [
  ['path',{d:'m6 15 2-11 4 2 4-2 2 11M7 12h10',key:'crown'}],
  ['ellipse',{cx:'12',cy:'17',rx:'10',ry:'3',key:'brim'}],
]);
const Gun = createLucideIcon('Gun', [
  ['path',{d:'M2 5h19v6h-8l-1 3h-2l2 7H6L4 11H2zM5 8h13M12 11v3h4l2-3M21 7h2',key:'pistol'}],
]);
const Handcuffs = createLucideIcon('Handcuffs', [
  ['circle',{cx:'6',cy:'15',r:'4',key:'left'}],
  ['circle',{cx:'18',cy:'9',r:'4',key:'right'}],
  ['path',{d:'m8 11 2-3h4M4 12l4 6M16 6l4 6',key:'chain'}],
]);
const MagicStaff = createLucideIcon('MagicStaff', [
  ['path',{d:'m5 21 9-12M12 4l4-3 5 4-3 5-6-6zM14 3l4 5M4 7v4M2 9h4',key:'staff'}],
]);
const Monster = createLucideIcon('Monster', [
  ['path',{d:'M6 7 3 2v9M18 7l3-5v9M7 6h10l4 6-3 8H6l-3-8zM7 11l3 1M17 11l-3 1M8 16h8M9 16v2M15 16v2',key:'creature'}],
]);
const PlayingCard = createLucideIcon('PlayingCard', [
  ['rect',{x:'5',y:'2',width:'14',height:'20',rx:'2',key:'card'}],
  ['path',{d:'m12 8 3 4-3 4-3-4zM8 5h1M15 19h1',key:'suit'}],
]);
const Alien = createLucideIcon('Alien', [
  ['path',{d:'M20 9c0 6-6 12-8 12S4 15 4 9a8 8 0 0 1 16 0zM7 10l4 3c-3 1-4-1-4-3zM17 10l-4 3c3 1 4-1 4-3zM10 17h4',key:'head'}],
]);
const Ring = createLucideIcon('Ring', [
  ['circle',{cx:'12',cy:'15',r:'6',key:'band'}],
  ['path',{d:'m8 3 4-2 4 2-4 6zM8 3h8M12 3v6',key:'stone'}],
]);
const Virus = createLucideIcon('Virus', [
  ['circle',{cx:'12',cy:'12',r:'5',key:'body'}],
  ['path',{d:'M12 7V2M10 2h4M12 17v5M10 22h4M7 12H2M2 10v4M17 12h5M22 10v4M8 8 4 4M3 5l2-2M16 8l4-4M19 3l2 2M8 16l-4 4M3 19l2 2M16 16l4 4M19 21l2-2M10 10h.01M14 13h.01',key:'spikes'}],
]);

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
  { key: DEFAULT_NOTE_ICON, label: "File", Cmp: File },
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
  { key: "airship", label: "Airship", Cmp: Airship },
  { key: "ammunition", label: "Ammunition", Cmp: Ammunition },
  { key: "pawn", label: "Pawn", Cmp: Pawn },
  { key: "potion", label: "Potion", Cmp: FlaskConical },
  { key: "sphere", label: "Sphere", Cmp: Circle },
  { key: "bomb", label: "Bomb", Cmp: Bomb },
  { key: "brick-wall", label: "Brick wall", Cmp: BrickWall },
  { key: "certificate", label: "Certificate", Cmp: BadgeCheck },
  { key: "checkered-flag", label: "Checkered flag", Cmp: CheckeredFlag },
  { key: "class", label: "Class", Cmp: Drama },
  { key: "coins", label: "Coins", Cmp: Coins },
  { key: "cube", label: "Cube", Cmp: Box },
  { key: "cubes", label: "Cubes", Cmp: Boxes },
  { key: "question", label: "Question", Cmp: CircleHelp },
  { key: "deity", label: "Deity", Cmp: Deity },
  { key: "die", label: "Die", Cmp: Dice6 },
  { key: "domain", label: "Domain", Cmp: Footprints },
  { key: "encounter", label: "Encounter", Cmp: Clapperboard },
  { key: "lightning", label: "Lightning", Cmp: Zap },
  { key: "gauntlet", label: "Gauntlet", Cmp: Gauntlet },
  { key: "gift", label: "Gift", Cmp: Gift },
  { key: "helmet", label: "Helmet", Cmp: Helmet },
  { key: "sword", label: "Sword", Cmp: Sword },
  { key: "hat", label: "Hat", Cmp: Hat },
  { key: "gun", label: "Gun", Cmp: Gun },
  { key: "hammer", label: "Hammer", Cmp: Hammer },
  { key: "handcuffs", label: "Handcuffs", Cmp: Handcuffs },
  { key: "image-gallery", label: "Image gallery", Cmp: Images },
  { key: "life-preserver", label: "Life preserver", Cmp: LifeBuoy },
  { key: "list", label: "List", Cmp: ListChecks },
  { key: "magic-item", label: "Magic item", Cmp: WandSparkles },
  { key: "magic-staff", label: "Magic staff", Cmp: MagicStaff },
  { key: "medal", label: "Medal", Cmp: Medal },
  { key: "merchant", label: "Merchant", Cmp: Store },
  { key: "monster", label: "Monster", Cmp: Monster },
  { key: "music", label: "Music", Cmp: Music },
  { key: "equipment", label: "Equipment", Cmp: Wrench },
  { key: "vehicle", label: "Vehicle", Cmp: Car },
  { key: "object-collection", label: "Object collection", Cmp: Shapes },
  { key: "omega", label: "Omega", Cmp: Omega },
  { key: "phone", label: "Phone", Cmp: Smartphone },
  { key: "playing-card", label: "Playing card", Cmp: PlayingCard },
  { key: "alien", label: "Alien / Race", Cmp: Alien },
  { key: "radioactive", label: "Radioactive", Cmp: Radiation },
  { key: "dimension", label: "Dimension", Cmp: Layers },
  { key: "ring", label: "Ring", Cmp: Ring },
  { key: "rocket", label: "Rocket", Cmp: Rocket },
  { key: "safe", label: "Safe", Cmp: Vault },
  { key: "signpost", label: "Signpost", Cmp: Signpost },
  { key: "surveillance", label: "Surveillance camera", Cmp: Cctv },
  { key: "target", label: "Target", Cmp: Target },
  { key: "television", label: "Television", Cmp: Tv },
  { key: "time-period", label: "Time period", Cmp: Hourglass },
  { key: "virus", label: "Virus", Cmp: Virus },
  { key: "warning", label: "Warning", Cmp: TriangleAlert },
  { key: "weather", label: "Weather", Cmp: CloudLightning },
];

const ICON_MAP: Record<string, IconCmp> = Object.fromEntries(
  NOTE_ICONS.map((i) => [i.key, i.Cmp])
);

export function iconByName(key: string | undefined): IconCmp | null {
  if (!key) return null;
  return ICON_MAP[key] ?? null;
}

/** An unset icon inherits File. Timeline items have their own contextual symbols. */
export function noteIconKey(note: Pick<NoteNode, "icon" | "event" | "timelineKind">) {
  return note.icon || (note.event || note.timelineKind ? undefined : DEFAULT_NOTE_ICON);
}

export function iconForNote(note: NoteNode): IconCmp | null {
  return iconByName(noteIconKey(note));
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
