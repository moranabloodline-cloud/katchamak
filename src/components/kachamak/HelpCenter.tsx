"use client";

import { useState, type ComponentType } from "react";
import { ArrowLeft, BookOpen, ChevronRight, CircleHelp, FolderOpen, Info, Keyboard, Megaphone, MessageCircle, Rocket, Save, Search, Wrench, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PROJECT_BACKUP_ATTACHMENT_NOTICE } from "@/lib/kachamak/project-settings";
import packageInfo from "../../../package.json";

type Article = { id: string; title: string; description?: string; icon: ComponentType<{ className?: string }>; paragraphs: string[] };
const groups: { title?: string; articles: Article[] }[] = [
  { title: "LEARN DRAFTOPUS", articles: [
    { id: "getting-started", title: "Getting Started", description: "Create your first project", icon: Rocket, paragraphs: [
      "Click Project in the library and enter a title and author. In Binder, right-click an empty part of the tree and choose Create top-level note. To add a child, open a note’s menu and choose Create note.",
      "Use Collection to organize projects and folders. Open a collection from the library tree on the left.",
    ] },
    { id: "user-guide", title: "User Guide", description: "Features and step-by-step guides", icon: BookOpen, paragraphs: [
      "Use the library tree to open collections and drag projects or folders to move them. Project Settings edits the open novel’s title, author, series and cover. Find archived projects under Archived in the library.",
      "Right-click a workspace tab to hide it. Use the + menu to show a hidden tab. Right-click a note and choose Open as tab to keep it within reach. Use the note’s three-dot menu for more actions.",
      "Write edits one note, Split opens two editors, Grid shows index cards, and List shows note details. Use Continuous to read several notes as one document. Restore deleted notes from Trash.",
      "Select text and press Ctrl+K to link to a note or website. Use Details to add references and Mentions to see where another note refers to the selected one.",
      "Canvas arranges cards and embeds existing maps with Insert map. Open a map in Maps to place pins, draw paths or regions, and measure distances. The Timeline tab has Timeline, Calendar and Cards views.",
      "In Publish, choose the manuscript and a House Style. Preview, print or export the edition from there.",
    ] },
    { id: "shortcuts", title: "Keyboard Shortcuts", description: "Work faster with shortcuts", icon: Keyboard, paragraphs: [
      "Ctrl+S saves pending changes. Ctrl+K inserts a link and Ctrl+Shift+F focuses project search. Ctrl+Z undoes an edit. Ctrl+Y or Ctrl+Shift+Z redoes it. The toolbar arrows and shortcuts follow the active editor, including Synopsis and Notes.",
      "Type --- on its own line to insert a divider. Ctrl+Alt+1–6 applies Heading 1–6 in the active editor. Ctrl+Alt+0 restores a normal paragraph. Ctrl + scroll in the library changes cover size. In a workspace panel it changes the panel zoom.",
      "In the note tree, Up and Down move through visible notes. Right expands a note or enters its children. Left collapses it or selects its parent. Home and End select the first or last visible note. Delete sends the selected note to Trash.",
    ] },
  ] },
  { title: "YOUR PROJECTS", articles: [
    { id: "saving", title: "Saving & Backups", description: "Protect and export your work", icon: Save, paragraphs: [
      "Draftopus saves changes automatically to your private account. Click Save to finish pending changes and wait for Saved to your account before closing.",
      "If the cloud is temporarily unavailable, Draftopus retries and keeps a local draft until the server confirms the save.",
      "Use Export JSON backup under Settings → Data & Privacy → Backups & export to download a copy of the project. " + PROJECT_BACKUP_ATTACHMENT_NOTICE,
    ] },
    { id: "recovery", title: "Import & Recovery", description: "Move or restore project files", icon: FolderOpen, paragraphs: [
      "Import a JSON backup from the library or Settings → Data & Privacy → Backups & export.",
      "Use the local recovery panel to recover drafts as project copies. If another window saved newer changes, export your unsaved edits before reloading the saved library.",
    ] },
  ] },
  { title: "SUPPORT & FEEDBACK", articles: [
    { id: "troubleshooting", title: "Troubleshooting", description: "Resolve common problems", icon: Wrench, paragraphs: [
      "If Draftopus is retrying a save, keep the page open and check your connection. If the error persists, use Retry save or Export backups in the save banner.",
      "Sign in to the same account in Preview and your browser to open the same saved library.",
    ] },
    { id: "support", title: "Report a Problem", description: "Prepare a bug report", icon: MessageCircle, paragraphs: ["Describe what you were doing, what you expected and what happened. Include the version below and a screenshot if it helps explain the problem."] },
  ] },
  { articles: [
    { id: "whats-new", title: "What's New", icon: Megaphone, paragraphs: [
      "Large libraries send less data when saving. Draftopus retries temporary failures while keeping a local draft.",
      "Maps has its own workspace for pins, paths, regions and distances. Add map previews to Canvas or to a Codex note’s Details.",
      "Automatic link detection on Save recognizes Codex titles and aliases. Separate multiple aliases with commas or new lines.",
    ] },
    { id: "about", title: "About Draftopus", description: "Version info", icon: Info, paragraphs: ["Draftopus is a writing workspace with a project library, Binder, Codex, shared editor and Inspector. Projects and attachments are stored privately in your account."] },
  ] },
];

export function HelpCenter() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [article, setArticle] = useState<Article | null>(null);
  const search = query.trim().toLocaleLowerCase();
  const filtered = groups.map(group => ({ ...group, articles: group.articles.filter(item => `${item.title} ${item.description ?? ""} ${item.paragraphs.join(" ")}`.toLocaleLowerCase().includes(search)) })).filter(group => group.articles.length);
  return <Popover open={open} onOpenChange={value => { setOpen(value); if (!value) { setQuery(""); setArticle(null); } }}>
    <PopoverTrigger asChild><button type="button" aria-label="Help" className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 data-[state=open]:bg-white/5 data-[state=open]:text-[#eed18a]"><CircleHelp className="h-4 w-4" />Help</button></PopoverTrigger>
    <PopoverContent align="end" side="bottom" sideOffset={10} collisionPadding={10} aria-label="Help Center" className="w-[325px] max-w-[calc(100vw-20px)] overflow-hidden rounded-[15px] border-[#3f3f46] bg-[#18181b] p-0 font-sans text-[#e7e7e9] shadow-2xl [font-family:Arial,sans-serif]">
      <div className="flex h-[43px] items-center gap-2 px-[11px]">
        {article ? <button type="button" aria-label="Back to Help Center" onClick={() => setArticle(null)} className="rounded p-1 text-[#b1b1b8] hover:bg-white/10 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /></button> : <CircleHelp className="h-3.5 w-3.5 text-[#e8bc55]" />}
        <h2 className="min-w-0 flex-1 text-[14px] font-semibold leading-5">{article ? article.title : "Help Center"}</h2>
        <button type="button" aria-label="Close Help Center" onClick={() => { setOpen(false); setQuery(""); setArticle(null); }} className="rounded p-1 text-[#a1a1aa] hover:bg-white/10 hover:text-white"><X className="h-3.5 w-3.5" /></button>
      </div>
      {article ? <article aria-label={article.title} className="max-h-[min(570px,calc(100dvh-150px))] overflow-y-auto px-4 pb-5 pt-1 text-[12px] leading-[1.65] text-[#c9c9cf] kachamak-scroll">
        {article.paragraphs.map(paragraph => <p className="mb-3 last:mb-0" key={paragraph}>{paragraph}</p>)}
        {(article.id === "about" || article.id === "support") && <p className="mt-4 border-t border-white/10 pt-3 text-[#e7bc58]">Draftopus · Version {packageInfo.version}</p>}
      </article> : <>
        <div className="px-[10px] pb-[3px]"><label className="flex h-[39px] items-center gap-2 rounded-[7px] border border-[#45454d] bg-[#27272b] px-[11px] focus-within:border-[#b79040]"><Search className="h-3.5 w-3.5 shrink-0 text-[#b4b4bb]" /><input aria-label="Search help articles" placeholder="Search help articles..." value={query} onChange={event => setQuery(event.target.value)} className="w-full bg-transparent text-[12px] leading-4 text-[#e7e7e9] outline-none placeholder:text-[#b7b7bf]" /></label></div>
        <nav aria-label="Help articles" className="max-h-[min(590px,calc(100dvh-200px))] overflow-y-auto px-[10px] pb-[10px] kachamak-scroll">
          {filtered.map((group, index) => <section key={group.title ?? "about"} className={index ? "mt-[10px] border-t border-[#3a3a40] pt-[10px]" : ""}>
            {group.title && <h3 className="pb-[6px] pt-[8px] text-[10px] font-semibold leading-3 text-[#dfb34f]">{group.title}</h3>}
            {group.articles.map(item => { const Icon = item.icon; const footer = !group.title; return <button key={item.id} type="button" onClick={() => setArticle(item)} className={`group flex w-full items-center gap-[10px] rounded-[7px] px-[7px] text-left transition-colors hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-[#dcb354] ${footer ? "min-h-[43px]" : "min-h-[50px]"}`}>
              <span className={footer ? "flex w-[10px] shrink-0 items-center justify-center text-[#e8bc55]" : "flex h-[33px] w-[33px] shrink-0 items-center justify-center rounded-[7px] bg-[#2c2c31] text-[#e8bc55]"}><Icon className="h-[13px] w-[13px]" /></span>
              <span className="min-w-0 flex-1"><span className="block text-[12px] font-semibold leading-[17px]">{item.title}</span>{item.description && !footer && <span className="mt-[2px] block text-[10px] leading-[14px] text-[#ccccd1]">{item.description}</span>}</span>
              {item.id === "about" ? <span className="text-[10px] text-[#b9b9c1]">Version info</span> : <ChevronRight className="h-3 w-3 shrink-0 text-[#b5b5bd]" />}
            </button>; })}
          </section>)}
          {!filtered.length && <p role="status" className="px-2 py-6 text-center text-[12px] text-[#b7b7bf]">No help articles found.</p>}
        </nav>
      </>}
    </PopoverContent>
  </Popover>;
}

