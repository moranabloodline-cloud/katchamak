"use client";

/**
 * Dashboard — početni ekran (faza 1).
 * Gornji deo: KATCHAMAK logo + Help/Account, naslov „My Collections“,
 * dekorativni statični banner (slika, bez funkcionalnosti).
 * Donji deo: levo stablo kolekcija (faza 1: vizuelno, prazno dok korisnik
 * ne napravi kolekcije), desno lista postojećih projekata — klik otvara
 * Workspace (openNovel). Ostale kontrole (+ Collection, + Project, Import,
 * Search, Sort, Group, Grid/List) su u fazi 1 samo vizuelne.
 * Ne dira store, podatke ni migracije — samo čita novels i otvara projekte.
 */

import { useState } from "react";
import {
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Folder,
  HelpCircle,
  Layers,
  LayoutGrid,
  List,
  MoreVertical,
  Plus,
  Search,
  UserCircle2,
  Feather,
  ArrowUpDown,
} from "lucide-react";
import { useKachamak } from "@/lib/kachamak/store";
import type { Novel } from "@/lib/kachamak/types";
import { novelWords } from "@/lib/kachamak/utils";

/** „Modified 3d ago“ stil iz reference. */
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1w ago";
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months <= 1) return "1mo ago";
  return `${months}mo ago`;
}

export function Dashboard() {
  const novels = useKachamak((s) => s.novels);
  const openNovel = useKachamak((s) => s.openNovel);
  // faza 1: search/sort/group/grid-list su samo vizuelne kontrole
  const [searchText, setSearchText] = useState("");

  const sortedNovels = [...novels].sort(
    (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#17110b] text-foreground">
      {/* ── top bar ── */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-black/70 bg-[#0c0906] px-5">
        <span className="flex items-center gap-2.5">
          <Feather className="h-5 w-5 text-[#e8c265]" />
          <span className="font-serif text-lg font-semibold tracking-[0.3em] text-[#e8c265]">
            KATCHAMAK
          </span>
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <HelpCircle className="h-4 w-4" /> Help
          </button>
          <span className="mx-1 h-5 w-px bg-white/10" />
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <UserCircle2 className="h-4 w-4 text-[#e8c265]" /> Account
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* ── hero: naslov + dekorativni banner (statična slika) ── */}
      <section className="relative shrink-0 overflow-hidden bg-[#0b0806]">
        <div className="relative z-10 py-4 text-center">
          <h1 className="font-serif text-4xl font-bold text-[#f2ead9]">
            My Collections
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your creative projects, organized your way.
          </p>
        </div>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/dashboard-banner.png"
            alt="Decorative banner: Books, Games, Software, Movies and Cartoons"
            className="block w-full"
            draggable={false}
          />
          <span className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-[#0b0806] to-transparent" />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#17110b] to-transparent" />
        </div>
      </section>

      {/* ── donji deo: stablo kolekcija (levo) + projekti (desno) ── */}
      <div className="flex min-h-0 flex-1">
        {/* sidebar: collections */}
        <aside className="flex w-[280px] shrink-0 flex-col border-r border-white/5 bg-[#17110b] px-4 pb-4 pt-4">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 fill-amber-400/80 text-amber-400" />
            <span className="font-serif text-[15px] font-semibold text-[#f2ead9]">
              Collections
            </span>
            <button
              type="button"
              aria-label="New collection"
              className="ml-auto flex h-7 w-7 items-center justify-center rounded-md border border-white/15 text-[#e8c265] transition-colors hover:bg-white/5"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* faza 1: stablo je prazno dok ne nastanu kolekcije (bez demo
              podataka); kod za prikaz hijerarhije i izbora je spreman za
              fazu 2, kada kolekcije dobiju model */}
          <div className="mt-3 flex-1 overflow-y-auto kachamak-scroll">
            <p className="mt-2 px-2 text-xs leading-relaxed text-muted-foreground/70">
              No collections yet.
            </p>
          </div>
        </aside>

        {/* glavni panel */}
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto kachamak-scroll px-6 pb-5 pt-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-[#e8c265]" />
            <h2 className="font-serif text-2xl font-bold text-[#f2ead9]">
              All Projects
            </h2>
          </div>

          {/* toolbar */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="flex h-9 items-center gap-1.5 rounded-md bg-[#f0b018] px-3.5 text-sm font-semibold text-[#221503] transition-colors hover:bg-[#ffc233]"
            >
              <Plus className="h-4 w-4" /> Collection
            </button>
            <button
              type="button"
              className="flex h-9 items-center gap-1.5 rounded-md bg-[#f0b018] px-3.5 text-sm font-semibold text-[#221503] transition-colors hover:bg-[#ffc233]"
            >
              <Plus className="h-4 w-4" /> Project
            </button>
            <button
              type="button"
              className="flex h-9 items-center gap-1.5 rounded-md border border-white/15 px-3.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <Download className="h-4 w-4" /> Import
            </button>
            <span className="mx-1 h-6 w-px bg-white/10" />
            <div className="relative w-[260px] max-w-full">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search projects…"
                aria-label="Search projects"
                className="h-9 w-full rounded-md border border-white/10 bg-black/30 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-[#f0b018]/50"
              />
            </div>
            <button
              type="button"
              className="flex h-9 items-center gap-1.5 rounded-md border border-white/15 px-3 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <ArrowUpDown className="h-4 w-4" /> Sort
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="flex h-9 items-center gap-1.5 rounded-md border border-white/15 px-3 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <Layers className="h-4 w-4" /> Group
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <div className="ml-auto flex overflow-hidden rounded-md border border-white/15">
              <button
                type="button"
                aria-label="Grid view"
                className="flex h-9 w-10 items-center justify-center bg-white/10 text-foreground"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="List view"
                className="flex h-9 w-10 items-center justify-center border-l border-white/15 text-muted-foreground transition-colors hover:bg-white/5"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* kartice projekata */}
          {sortedNovels.length === 0 ? (
            <p className="mt-10 text-sm text-muted-foreground">
              No projects yet.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {sortedNovels.map((n) => (
                <ProjectCard
                  key={n.id}
                  novel={n}
                  onOpen={() => openNovel(n.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/** Horizontalna kartica projekta: naslovna slika levo, informacije desno. */
function ProjectCard({ novel, onOpen }: { novel: Novel; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${novel.title}`}
      className="group relative flex h-[172px] cursor-pointer overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] text-left transition-colors hover:border-amber-400/40"
    >
      {/* cover */}
      <span
        className="flex w-[150px] shrink-0 items-center justify-center text-5xl"
        style={{ background: novel.cover.bg }}
      >
        <span className="drop-shadow-lg">{novel.cover.icon}</span>
      </span>
      {/* info */}
      <span className="flex min-w-0 flex-1 flex-col p-4">
        <span className="truncate font-serif text-xl font-semibold text-[#f2ead9]">
          {novel.title}
        </span>
        <span className="mt-2.5 flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5 shrink-0 text-[#e8c265]" />
          Novel
        </span>
        <span className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-3.5 w-3.5 shrink-0 text-[#e8c265]" />
          {novelWords(novel).toLocaleString()} words
        </span>
        <span className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-[#e8c265]" />
          Modified {relativeTime(novel.updatedAt)}
        </span>
        <MoreVertical className="absolute bottom-2.5 right-2.5 h-4 w-4 text-muted-foreground/60" />
      </span>
    </button>
  );
}
