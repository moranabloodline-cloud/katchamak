"use client";
import {useEffect,useMemo,useState} from 'react';
import {ArrowLeft,FileText,House,Search} from 'lucide-react';
import {useKachamak} from '@/lib/kachamak/store';
import {TABS,type NoteNode,type SectionKey} from '@/lib/kachamak/types';
import {openProjectNote,returnToPreviousNote,useNoteTrail} from '@/lib/kachamak/note-navigation';
import {findNodeInNovel} from '@/lib/kachamak/utils';
import {indexNotes,searchNotes} from '@/lib/kachamak/knowledge';
import {iconByName} from '@/lib/kachamak/icons';

function NoteBackButton() {
  const active=useKachamak(s=>s.activeNovelId),novels=useKachamak(s=>s.novels);
  const trail=useNoteTrail();
  const previous=trail.projectId===active?trail.entries.at(-1):null;
  if(!previous)return null;
  const novel=novels.find(n=>n.id===active),name=novel&&previous.selectedNodeId?findNodeInNovel(novel,previous.selectedNodeId)?.node.title:null;
  return <button type="button" aria-label="Back to previous note" title={name?'Back to '+name:'Back to previous view'} onClick={returnToPreviousNote} className="shrink-0 rounded p-1 text-sky-400 hover:bg-white/10"><ArrowLeft className="h-4 w-4"/></button>;
}

function ProjectSearch() {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const novel = novels.find((n) => n.id === activeNovelId);

  const [highlight,setHighlight]=useState(0);
  const results = useMemo(() => novel && q.trim() ? searchNotes(indexNotes(novel),q).slice(0,20) : [], [novel,q]);
  useEffect(()=>setHighlight(0),[q]);

  const go = (r: { node: NoteNode; section: SectionKey }) => {
    openProjectNote(r.node.id);
    setQ("");
    setOpen(false);
  };

  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "ArrowDown") {e.preventDefault();setHighlight(i=>Math.max(0,Math.min(i+1,results.length-1)));}
          if (e.key === "ArrowUp") {e.preventDefault();setHighlight(i=>Math.max(0,i-1));}
          if (e.key === "Enter" && results[highlight]) {e.preventDefault();go(results[highlight]);}
        }}
        placeholder="Search project."
        aria-label="Search project"
        className="h-9 w-full rounded-lg border border-white/15 bg-[#10151d] pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-amber-500/50"
      />
      {open && q.trim() && (
        <div className="absolute inset-x-0 top-11 z-50 max-h-80 overflow-y-auto kachamak-scroll rounded-lg border border-white/10 bg-[#161616] p-1.5 shadow-2xl">
          {results.map((r, i) => {
            const Icon = iconByName(r.node.icon);
            return (
              <button
                key={r.node.id}
                data-highlighted={i === highlight}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(r)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/10 data-[highlighted=true]:bg-white/10"
              >
                {Icon ? (
                  <Icon
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: r.node.color || "#a1a1aa" }}
                  />
                ) : (
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate">{r.node.title}</span>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {TABS.find((t) => t.key === r.section)?.label ?? r.section}
                </span>
              </button>
            );
          })}
          {results.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">No matches.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function WorkspaceNavigation() {
  const closeNovel=useKachamak(state=>state.closeNovel);
  return <div className="flex min-w-0 flex-1 items-center gap-1.5"><button type="button" aria-label="Back to dashboard" title="Dashboard" onClick={closeNovel} className="shrink-0 rounded-md p-1 text-stone-200 hover:bg-white/10 hover:text-white"><House className="h-5 w-5"/></button><NoteBackButton/><ProjectSearch/></div>;
}
