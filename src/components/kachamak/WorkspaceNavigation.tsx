"use client";
import {useId,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import {ArrowLeft,FileText,House,Search} from 'lucide-react';
import {homepageRows} from '@/lib/kachamak/homepage';
import {useKachamak} from '@/lib/kachamak/store';
import {TABS} from '@/lib/kachamak/types';
import {openProjectNote,returnToPreviousNote,useNoteTrail} from '@/lib/kachamak/note-navigation';
import {findNodeInNovel} from '@/lib/kachamak/utils';
import {indexNotes,searchNotes} from '@/lib/kachamak/knowledge';
import {iconByName,noteIconKey} from '@/lib/kachamak/icons';

function NoteBackButton() {
  const active=useKachamak(s=>s.activeNovelId),novels=useKachamak(s=>s.novels);
  const trail=useNoteTrail();
  const previous=trail.projectId===active?trail.entries.at(-1):null;
  if(!previous)return null;
  const novel=novels.find(n=>n.id===active),name=novel&&previous.selectedNodeId?findNodeInNovel(novel,previous.selectedNodeId)?.node.title:null;
  return <button type="button" aria-label="Back to previous note" title={name?'Back to '+name:'Back to previous view'} onClick={returnToPreviousNote} className="shrink-0 rounded p-1 text-sky-400 hover:bg-white/10"><ArrowLeft className="h-4 w-4"/></button>;
}

export function activeWritingEditor() {
  const {view,activePane}=useKachamak.getState();
  const scope=view==='split' ? `main [data-pane="${activePane}"]` : 'main';
  return document.querySelector<HTMLElement>(`${scope} .kachamak-editor[contenteditable="true"]`);
}

function ProjectSearch({includeHomePages}:{includeHomePages:boolean}) {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const novel = novels.find((n) => n.id === activeNovelId);

  const listId=useId();
  const input=useRef<HTMLInputElement>(null);
  const origin=useRef<HTMLElement|null>(null);
  const caret=useRef<Range|null>(null);
  const [highlight,setHighlight]=useState(0);
  const results = useMemo(() => {
    const query=q.trim().toLocaleLowerCase();
    if(!novel || !query)return [];
    const pages=includeHomePages ? homepageRows(novel).filter(p=>p.title.toLocaleLowerCase().includes(query))
      .map(p=>({id:p.id, title:p.title, group:'Homepage', page:true, icon:'', color:undefined})) : [];
    if(pages.length>=20)return pages.slice(0,20);
    const notes=searchNotes(indexNotes(novel),q).slice(0,20-pages.length).map(({node,section})=>({id:node.id, title:node.title,
      group:TABS.find(t=>t.key===section)?.label ?? section, page:false, icon:noteIconKey(node), color:node.color}));
    return [...pages,...notes];
  }, [novel,q,includeHomePages]);
  const expanded=open && !!q.trim();
  const activeIndex=Math.min(highlight,results.length-1);
  const activeId=expanded && activeIndex>=0 ? `${listId}-${activeIndex}` : undefined;
  useLayoutEffect(()=>{
    if(activeId)document.getElementById(activeId)?.scrollIntoView({block:'nearest'});
  },[activeId]);

  useLayoutEffect(()=>{
    // Capture the manuscript selection before the browser moves it into Search.
    const remember=(event:FocusEvent)=>{
      if(event.relatedTarget!==input.current)return;
      origin.current=event.target instanceof HTMLElement ? event.target : null;
      const selection=window.getSelection();
      const range=selection?.rangeCount ? selection.getRangeAt(0) : null;
      caret.current=range && activeWritingEditor()?.contains(range.commonAncestorContainer) ? range.cloneRange() : null;
    };
    document.addEventListener('blur',remember,true);
    return ()=>document.removeEventListener('blur',remember,true);
  },[]);

  const returnToText=()=>{
    const editor=activeWritingEditor();
    const fallback=origin.current?.isConnected ? origin.current : document.querySelector<HTMLElement>('main');
    (editor ?? fallback)?.focus({preventScroll:true});
    const range=caret.current;
    if(range && editor?.contains(range.commonAncestorContainer)){
      const selection=window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  const go = (r: typeof results[number], keyboard=false) => {
    flushSync(()=>{
      const view=useKachamak.getState().view;
      const opened=r.page && novel ? useKachamak.getState().openHomePage(novel.id,r.id) : openProjectNote(r.id);
      if(keyboard && opened && useKachamak.getState().view==='timeline'){
        useKachamak.getState().setView(view==='split' ? 'split' : 'write');
      }
      setQ("");
      setHighlight(0);
      setOpen(false);
    });
    if(keyboard)returnToText();
    else if(document.activeElement===input.current)input.current?.blur();
  };

  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={input}
        data-project-search
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={activeId}
        aria-keyshortcuts="Control+Shift+F Meta+Shift+F"
        value={q}
        onChange={(e) => {setQ(e.target.value);setHighlight(0);setOpen(true);}}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if(e.nativeEvent.isComposing || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey)return;
          if(e.key==='Escape'){
            e.preventDefault();
            setQ('');setHighlight(0);setOpen(false);
            returnToText();
          }else if(expanded && results.length){
            if(e.key==='ArrowDown'){e.preventDefault();setHighlight(Math.min(activeIndex+1,results.length-1));}
            if(e.key==='ArrowUp'){e.preventDefault();setHighlight(Math.max(0,activeIndex-1));}
            if(e.key==='Enter'){e.preventDefault();go(results[activeIndex],true);}
          }
        }}
        placeholder="Search"
        aria-label="Search"
        className="h-9 w-full rounded-lg border border-white/15 bg-[#10151d] pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-amber-500/50"
      />
      {expanded && (
        <div id={listId} role="listbox" aria-label="Search results" className="absolute inset-x-0 top-11 z-50 max-h-80 overflow-y-auto kachamak-scroll rounded-lg border border-white/10 bg-[#161616] p-1.5 shadow-2xl">
          {results.map((r, i) => {
            const Icon = r.page ? House : iconByName(r.icon);
            return (
              <button
                key={(r.page?'home:':'note:')+r.id}
                id={`${listId}-${i}`}
                role="option"
                tabIndex={-1}
                aria-selected={i === activeIndex}
                data-highlighted={i === activeIndex}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(r)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/10 data-[highlighted=true]:bg-white/10"
              >
                {Icon ? (
                  <Icon
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: r.color || (r.page ? "#fcd34d" : "#a1a1aa") }}
                  />
                ) : (
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" style={{ color: r.color || undefined }} />
                )}
                <span className="min-w-0 flex-1 truncate" style={{ color: r.color || undefined }}>{r.title}</span>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {r.group}
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

export function WorkspaceNavigation({includeHomePages=false}:{includeHomePages?:boolean}={}) {
  return <div className="flex min-w-0 flex-1 items-center gap-1.5"><ProjectSearch includeHomePages={includeHomePages}/><NoteBackButton/></div>;
}
