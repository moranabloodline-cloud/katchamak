"use client";

import { useState, type ComponentType } from "react";
import { ArrowLeft, BookOpen, ChevronRight, CircleHelp, FolderOpen, Info, Keyboard, Megaphone, MessageCircle, Rocket, Save, Search, Wrench, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import packageInfo from "../../../package.json";

type Article = { id: string; title: string; description?: string; icon: ComponentType<{ className?: string }>; paragraphs: string[] };
const groups: { title?: string; articles: Article[] }[] = [
  { title: "LEARN KATCHAMAK", articles: [
    { id: "getting-started", title: "Getting Started", description: "Create your first project", icon: Rocket, paragraphs: ["Create a project on the Dashboard. Your projects are saved privately to your account."] },
    { id: "user-guide", title: "User Guide", description: "Features and step-by-step guides", icon: BookOpen, paragraphs: ["The Dashboard is your project library. Create collections, drag projects or folders to organize them, and use the path above the library to navigate. Search, sorting, grouping and Grid/List help you find your work.", "Binder, Codex, Planning, Research, Templates and Prompts share the same note system. Notes can contain other notes. Click a note icon to change it, or use its three-dot menu for more actions.", "Write edits one note; Split shows two editors; Grid shows index cards; List shows note details. The Inspector contains Info, Details and Mentions. Deleted notes go to Trash and can be restored."] },
    { id: "shortcuts", title: "Keyboard Shortcuts", description: "Work faster with shortcuts", icon: Keyboard, paragraphs: ["Ctrl + scroll over the Dashboard library changes cover size. Ctrl + scroll over a workspace panel changes its zoom.", "Delete sends the selected note to Trash when you are navigating the note tree. Text fields and the editor handle Delete as text editing.", "Escape closes this Help Center and other open popovers. Tab moves between controls; Enter activates the focused button. Use Save to finish saving changes to your account."] },
  ] },
  { title: "YOUR PROJECTS", articles: [
    { id: "saving", title: "Saving & Backups", description: "Protect and export your work", icon: Save, paragraphs: ["Changes are saved automatically to your account in the cloud. Use Save before closing. Export JSON backups from the project menu."] },
    { id: "recovery", title: "Import & Recovery", description: "Move or restore project files", icon: FolderOpen, paragraphs: ["Import a JSON backup to create a new project. Export unsaved changes before reloading after a conflict."] },
  ] },
  { title: "SUPPORT & FEEDBACK", articles: [
    { id: "troubleshooting", title: "Troubleshooting", description: "Resolve common problems", icon: Wrench, paragraphs: ["Check your connection, retry Save and keep unsaved edits open. Preview and browser share the same account library."] },
    { id: "support", title: "Contact Support", description: "Report a bug or suggest a feature", icon: MessageCircle, paragraphs: ["Describe what you were doing, what you expected and what happened. Include the application version below and a screenshot if it helps explain the problem.", "Share that information in the conversation where you are developing Katchamak, or with the person providing your copy of the application. You can also suggest a feature there."] },
  ] },
  { articles: [
    { id: "whats-new", title: "What's New", icon: Megaphone, paragraphs: ["Private cloud storage for projects, collections, notes and attachments."] },
    { id: "about", title: "About Katchamak", description: "Version info", icon: Info, paragraphs: ["Katchamak is a writing workspace with a shared cloud library."] },
  ] },
];

const webParagraphs: Record<string, string[]> = {
  "getting-started": ["Click Project on the Dashboard, enter a title and author, and start writing. Your project is saved to your account.", "Use Collection to organize projects and nested collections. Add notes with + in the Binder."],
  saving: ["Your library is saved automatically to your private account in the cloud. Preview and browser use the same saved projects when signed into the same account.", "Click Save to finish pending changes. Wait for Saved to your account before closing. Internet access is required for saving.", "Export backup creates a JSON copy of a project. Application source backups on GitHub contain no user projects."],
  recovery: ["Import a JSON project backup from the Dashboard or workspace settings. It creates a new project in your account library.", "If saving fails, keep the page open, retry Save or export your unsaved edits. A previous cloud save is preserved.", "When another window saves newer changes, conflicting writes are stopped. Export unsaved edits before reloading the saved library."],
  troubleshooting: ["Sign in with the same account in Preview and browser. Both views read the same cloud library and refresh saved changes automatically.", "If saving fails, check your connection, retry Save and export a JSON backup before closing. Unsaved edits cannot sync until a save succeeds."],
  "whats-new": ["Projects, collections, notes and attachments now use private account cloud storage. Preview and browser share the same saved library.", "Connect notes across all sections from Details. Add aliases for alternate names. Mentions shows backlinks and detected Codex names; Click a detected name to preview its Codex note, choose an ambiguous match or skip that occurrence.", "Use Link or Ctrl+K to insert a note or website link. Click an internal link to preview it, or Ctrl+click to open its target. Open beside keeps your manuscript in the other pane; the back arrow returns to the previous note and view. Select a name and use Ctrl+K → Create and link to make an ordinary blank Codex note without leaving your writing. Mentions can filter references to the manuscript. Ctrl+S saves; Ctrl+Shift+F focuses project search.", "Settings → Export manuscript compiles selected Binder notes to HTML or Markdown. Export backup keeps the complete project. Open folders as tabs without copying notes, and arrange their sequence in Timeline."],
  about: ["Katchamak is a writing workspace with a project library, Binder, Codex, shared editor and Inspector.", `Version ${packageInfo.version}. Projects and attachments are stored privately in your account using Sites cloud storage.`],
};

export function HelpCenter() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [article, setArticle] = useState<Article | null>(null);
  const search = query.trim().toLocaleLowerCase();
  const platformGroups = groups.map(group => ({ ...group, articles: group.articles.map(item => ({ ...item, paragraphs: webParagraphs[item.id] ?? item.paragraphs })) }));
  const filtered = platformGroups.map(group => ({ ...group, articles: group.articles.filter(item => `${item.title} ${item.description ?? ""} ${item.paragraphs.join(" ")}`.toLocaleLowerCase().includes(search)) })).filter(group => group.articles.length);
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

