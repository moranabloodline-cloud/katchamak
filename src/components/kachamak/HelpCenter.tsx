"use client";

import { useState, type ComponentType } from "react";
import { ArrowLeft, BookOpen, ChevronRight, CircleHelp, FolderOpen, Info, Keyboard, Megaphone, MessageCircle, Rocket, Save, Search, Wrench, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import packageInfo from "../../../package.json";

type Article = { id: string; title: string; description?: string; icon: ComponentType<{ className?: string }>; paragraphs: string[] };
const groups: { title?: string; articles: Article[] }[] = [
  { title: "LEARN KATCHAMAK", articles: [
    { id: "getting-started", title: "Getting Started", description: "Create your first project", icon: Rocket, paragraphs: ["Click Project on the Dashboard, enter a title and author, then choose where to create the project folder on your computer. Cancelling the folder selection keeps your library unchanged.", "Each project has its own .katchamak folder containing project.json. Open your project, add a note with + in the Binder and start writing."] },
    { id: "user-guide", title: "User Guide", description: "Features and step-by-step guides", icon: BookOpen, paragraphs: ["The Dashboard is your project library. Create collections, drag projects or folders to organize them, and use the path above the library to navigate. Search, sorting, grouping and Grid/List help you find your work.", "Binder, Codex, Planning, Research, Templates and Prompts share the same note system. Notes can contain other notes. Click a note icon to change it, or use its three-dot menu for more actions.", "Write edits one note; Split shows two editors; Grid shows index cards; List shows note details. The Inspector contains Info, Details and Mentions. Deleted notes go to Trash and can be restored."] },
    { id: "shortcuts", title: "Keyboard Shortcuts", description: "Work faster with shortcuts", icon: Keyboard, paragraphs: ["Ctrl + scroll over the Dashboard library changes cover size. Ctrl + scroll over a workspace panel changes its zoom.", "Delete sends the selected note to Trash when you are navigating the note tree. Text fields and the editor handle Delete as text editing.", "Escape closes this Help Center and other open popovers. Tab moves between controls; Enter activates the focused button. Use the Save button to immediately finish saving project files."] },
  ] },
  { title: "YOUR PROJECTS", articles: [
    { id: "saving", title: "Saving & Backups", description: "Protect and export your work", icon: Save, paragraphs: ["Desktop projects are saved automatically to their own folders on your computer. The library remembers their file paths. Click Save to finish pending writes immediately.", "project.json contains the manuscript and project data. project.json.bak holds the previous successfully saved file. Keep a separate copy of your project folder or use Export backup from the project menu or workspace settings.", "Account → Storage & Backup controls automatic local backups and opens their folder. Up to 20 versions per project are retained. GitHub backs up application source code; your project folders and local backups are not included in the installer or source backup."] },
    { id: "recovery", title: "Import & Recovery", description: "Move or restore project files", icon: FolderOpen, paragraphs: ["Use Open on the Dashboard to select project.json inside an existing .katchamak folder. To move a project, close it first, move the entire project folder, then use Open to locate it again.", "Use Import for a JSON project backup. Choose a destination for the new project folder before it is added to the desktop library.", "If a save fails, the window stays open so you can retry or export a backup. If a file was changed by another program, Katchamak stops the conflicting write. Recovery copies from a previous session are kept in %LOCALAPPDATA%\\com.katchamak.desktop\\recovery. Open that location in File Explorer and use Open on the Dashboard to select a recovery file."] },
  ] },
  { title: "SUPPORT & FEEDBACK", articles: [
    { id: "troubleshooting", title: "Troubleshooting", description: "Resolve common problems", icon: Wrench, paragraphs: ["If a project cannot be found, reconnect its drive or use Open to locate its project.json file. Removing a project from the library preserves its folder.", "If saving fails, check that the project drive is connected, has free space and permits writing. Retry Save before closing. Use Export backup to keep a separate copy of current edits.", "A fresh installation has an empty library. When updating an older installation, choose a folder when prompted to transfer existing projects into separate project folders."] },
    { id: "support", title: "Contact Support", description: "Report a bug or suggest a feature", icon: MessageCircle, paragraphs: ["Describe what you were doing, what you expected and what happened. Include the application version below and a screenshot if it helps explain the problem.", "Share that information in the conversation where you are developing Katchamak, or with the person providing your copy of the application. You can also suggest a feature there."] },
  ] },
  { articles: [
    { id: "whats-new", title: "What's New", icon: Megaphone, paragraphs: ["Account Settings now includes a local profile, Dark/Light appearance, interface sizes, default project location and automatic local backups. Help Center has searchable offline articles.", "Desktop projects live in separate .katchamak folders on your computer. New installations start with an empty library, and existing projects can be transferred without deleting their contents."] },
    { id: "about", title: "About Katchamak", description: "Version info", icon: Info, paragraphs: ["Katchamak is a local writing workspace with a project library, Binder, Codex, shared note editor and Inspector.", `Version ${packageInfo.version}. The Windows desktop application works offline. Project files stay in the folders you choose on your computer.`] },
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
        {(article.id === "about" || article.id === "support") && <p className="mt-4 border-t border-white/10 pt-3 text-[#e7bc58]">Katchamak · Version {packageInfo.version}</p>}
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
