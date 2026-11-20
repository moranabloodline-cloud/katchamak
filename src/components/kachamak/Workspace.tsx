"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { ChevronLeft, Save, Settings,Minimize2,LoaderCircle } from "lucide-react";
import { AutoLinkReview, requestLinkReview,useSaveReviewState } from "./AutoLinkReview";
import { useKachamak } from "@/lib/kachamak/store";
import type { SectionKey } from "@/lib/kachamak/types";
import { WorkspaceBrand } from "./WorkspaceBrand";
import { activeWritingEditor } from "./WorkspaceNavigation";
import { WorkspaceTabs } from "./WorkspaceTabs";
import { findNodeInNovel } from "@/lib/kachamak/utils";
import {ProjectSettings as SettingsDialog} from "./ProjectSettings";
import { NoteLinkDialog } from "./NoteLinkDialog";
import { NotesSection } from "./NotesSection";
import { TrashView } from "./TrashView";
import { useAccountPreferences } from "@/lib/kachamak/account-preferences";
import { AccountDialog } from "./AccountDialog";



/* ---------- project search (top bar, left panel zone) ---------- */

/* ---------- settings (the gear) ---------- */

/* ---------- workspace ---------- */

export function Workspace() {
  const novels = useKachamak((s) => s.novels);
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const activeTab = useKachamak((s) => s.activeTab);
  const savePhase=useSaveReviewState(s=>s.phase);
  const setTab = useKachamak((s) => s.setTab);
  const [searchShortcut,setSearchShortcut]=useState(false);
  useEffect(()=>{
    const keyboard=(event:KeyboardEvent)=>{
      if(!(event.ctrlKey||event.metaKey))return;
      if(event.key.toLowerCase()==='s'){event.preventDefault();requestLinkReview();}
      if(event.shiftKey && !event.altKey && event.key.toLowerCase()==='f' && !event.defaultPrevented
        && useKachamak.getState().activeTab!=='trash' && !document.querySelector('[role="dialog"],[role="alertdialog"]')){
        event.preventDefault();
        flushSync(()=>setSearchShortcut(true));
        const search=document.querySelector<HTMLInputElement>('[data-project-search]');
        search?.focus();
        search?.select();
      }
    };
    document.addEventListener('keydown',keyboard);return()=>document.removeEventListener('keydown',keyboard);
  },[]);
  const setTreeScope = useKachamak((s) => s.setTreeScope);
  useEffect(()=>{if(useKachamak.getState().treeScope!=="all")setTreeScope("all");},[setTreeScope]);
  const defaultAuthor = useKachamak((s) => s.defaultAuthor);
  const { displayName, photo } = useAccountPreferences();
  const leftPanelOpen = useKachamak((s) => s.leftPanelOpen);
  const toggleLeftPanel = useKachamak((s) => s.toggleLeftPanel);
  const rightPanelOpen = useKachamak((s) => s.rightPanelOpen);
  const leftPanelWidth = useKachamak((s) => s.leftPanelWidth);
  const rightPanelWidth = useKachamak((s) => s.rightPanelWidth);

  const [accountOpen, setAccountOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusMode,setFocusMode]=useState(false);
  useEffect(()=>{setFocusMode(false);},[activeNovelId]);
  useEffect(()=>{
    if(!focusMode)return;
    const exit=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented&&!document.querySelector('[role="dialog"]'))setFocusMode(false);};
    document.addEventListener('keydown',exit);return()=>document.removeEventListener('keydown',exit);
  },[focusMode]);
  const enterFocus=()=>{
    const editor=activeWritingEditor();
    const selection=window.getSelection(),range=selection?.rangeCount?selection.getRangeAt(0).cloneRange():null;
    setFocusMode(true);
    if(editor){editor.focus({preventScroll:true});if(range&&editor.contains(range.startContainer)&&editor.contains(range.endContainer)){selection?.removeAllRanges();selection?.addRange(range);}}
  };

  const novel = novels.find((n) => n.id === activeNovelId);
  const folder = novel && activeTab.startsWith('note:') ? findNodeInNovel(novel,activeTab.slice(5)) : null;
  useEffect(() => { if(activeTab.startsWith('note:') && !folder) setTab('binder'); }, [activeTab,folder,setTab]);
  if (!novel) return null;

  const initials =
    (displayName || defaultAuthor)
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div data-workspace data-focus-mode={focusMode} onBlur={event=>{
      if(event.target instanceof HTMLInputElement && event.target.hasAttribute('data-project-search'))setSearchShortcut(false);
    }} className="flex h-screen flex-col bg-[#0d0d0d] text-foreground">
      {focusMode&&<button type="button" aria-label="Exit focus" title="Exit focus (Esc)" onMouseDown={event=>event.preventDefault()} onClick={()=>setFocusMode(false)} className="fixed right-4 top-4 z-40 flex items-center gap-2 rounded-md border border-border bg-background/90 px-3 py-2 text-xs text-muted-foreground opacity-30 shadow transition-opacity hover:opacity-100 focus:opacity-100"><Minimize2 className="h-4 w-4"/>Exit focus · Esc</button>}
      {/* top bar — ONE strip, identical on every tab: home + search over the left
          panel, then the section tabs (all in one row), then scope/save/account/
          settings over the right panel. Together with the strip below it (panel
          headers + editor toolbar) the top of the app has TWO tracks. The vertical
          dividers line up with the panel edges below and run to the very top
          (the +1 covers the 1px resizer column so the lines are never bent) */}
      <header className="flex shrink-0 flex-wrap items-stretch border-b border-white/10 xl:h-16 xl:flex-nowrap">
        {/* Static program branding above the navigation row. */}
        <div
          className={`flex shrink-0 items-center gap-1.5 overflow-hidden max-xl:h-10 max-xl:max-w-[50%] border-r border-white/10 bg-black/20 ${leftPanelOpen?"pl-3 pr-1":"px-0"}`}
          style={{ width: leftPanelOpen ? leftPanelWidth + 1 : 28 }}
        >
          <WorkspaceBrand compact={!leftPanelOpen} />
          {leftPanelOpen&&<button type="button" aria-label="Hide left panel" title="Hide panel" onClick={toggleLeftPanel} className="ml-auto shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"><ChevronLeft className="h-4 w-4"/></button>}
        </div>

        {/* tabs start at the left edge of the workspace, always in a single line */}
        <WorkspaceTabs novel={novel} onFocus={enterFocus} />

        {/* right panel zone: folder-level dropdown, save, account, settings */}
        <div
          className={`ml-auto flex shrink-0 items-center gap-2 max-xl:max-w-[50%] border-l border-white/10 bg-black/20 ${rightPanelOpen ? "justify-end px-3" : "justify-center"}`}
          style={{ width: rightPanelOpen ? rightPanelWidth + 1 : 28 }}
        >
          {rightPanelOpen ? (
            <>


              <button
                type="button"
                aria-label="Save"
                title={savePhase==='preparing'?'Preparing link review…':savePhase==='saving'?'Saving to your account…':'Save'}
                aria-busy={savePhase!=='idle'}
                onClick={requestLinkReview}
                className="grid size-10 shrink-0 place-items-center rounded-md text-stone-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                {savePhase==='idle'?<Save className="size-9" strokeWidth={1.75}/>:<LoaderCircle className="size-9 animate-spin" strokeWidth={1.75}/>}
              </button>
              <button
                type="button"
                aria-label="My account"
                title="My account"
                onClick={() => setAccountOpen(true)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-[#18202c] text-xs font-bold text-stone-200 transition-colors hover:border-white/50"
              >
                {photo ? <img src={photo} alt="" className="h-full w-full rounded-full object-cover" /> : initials}
              </button>
              <button
                type="button"
                aria-label="Settings"
                title="Settings"
                onClick={() => setSettingsOpen(true)}
                className="grid size-10 shrink-0 place-items-center rounded-md text-stone-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Settings className="size-9" strokeWidth={1.75} />
              </button>
            </>
          ) : (
            <button
              type="button"
              aria-label="Settings"
              title="Settings"
              onClick={() => setSettingsOpen(true)}
              className="rounded-md py-1 text-stone-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Settings className="size-[26px]" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </header>

      {/* body — every tab is the same note system; only Trash is different */}
      {activeTab === "trash" ? (
        <TrashView key={activeNovelId} />
      ) : (
        <NotesSection section={folder?.section ?? (activeTab.startsWith("note:") ? "binder" : activeTab as SectionKey)} rootId={folder?.node.id} revealSearch={searchShortcut}/>
      )}

      <AutoLinkReview />
      <NoteLinkDialog />
      <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}


