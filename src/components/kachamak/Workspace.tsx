"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Save, Settings } from "lucide-react";
import { AutoLinkReview, requestLinkReview } from "./AutoLinkReview";
import { useKachamak } from "@/lib/kachamak/store";
import type { SectionKey } from "@/lib/kachamak/types";
import { WorkspaceBrand } from "./WorkspaceBrand";
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
  const setTab = useKachamak((s) => s.setTab);
  useEffect(()=>{
    const keyboard=(event:KeyboardEvent)=>{
      if(!(event.ctrlKey||event.metaKey))return;
      if(event.key.toLowerCase()==='s'){event.preventDefault();requestLinkReview();}
      if(event.shiftKey&&event.key.toLowerCase()==='f'){event.preventDefault();document.querySelector<HTMLInputElement>('[aria-label="Search project"]')?.focus();}
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
    <div className="flex h-screen flex-col bg-[#0d0d0d] text-foreground">
      {/* top bar — ONE strip, identical on every tab: home + search over the left
          panel, then the section tabs (all in one row), then scope/save/account/
          settings over the right panel. Together with the strip below it (panel
          headers + editor toolbar) the top of the app has TWO tracks. The vertical
          dividers line up with the panel edges below and run to the very top
          (the +1 covers the 1px resizer column so the lines are never bent) */}
      <header className="flex h-10 shrink-0 items-stretch border-b border-white/10">
        {/* Static program branding above the navigation row. */}
        <div
          className={`flex shrink-0 items-center gap-1.5 overflow-hidden border-r border-white/10 bg-black/20 ${leftPanelOpen?"pl-3 pr-1":"px-0"}`}
          style={{ width: leftPanelOpen ? leftPanelWidth + 1 : 28 }}
        >
          <WorkspaceBrand />
          {leftPanelOpen&&<button type="button" aria-label="Hide left panel" title="Hide panel" onClick={toggleLeftPanel} className="ml-auto shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"><ChevronLeft className="h-4 w-4"/></button>}
        </div>

        {/* tabs start at the left edge of the workspace, always in a single line */}
        <WorkspaceTabs novel={novel} />

        {/* right panel zone: folder-level dropdown, save, account, settings */}
        <div
          className="flex shrink-0 items-center gap-3 border-l border-white/10 bg-black/20 px-3.5"
          style={{ width: rightPanelOpen ? rightPanelWidth + 1 : 28 }}
        >
          {rightPanelOpen ? (
            <>


              <span className="ml-auto" />

              <button
                type="button"
                aria-label="Save"
                title="Save"
                onClick={requestLinkReview}
                className="rounded-md p-1 text-stone-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Save className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="My account"
                title="My account"
                onClick={() => setAccountOpen(true)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-[#18202c] text-[11px] font-bold text-stone-200 transition-colors hover:border-white/50"
              >
                {photo ? <img src={photo} alt="" className="h-full w-full rounded-full object-cover" /> : initials}
              </button>
              <button
                type="button"
                aria-label="Settings"
                title="Settings"
                onClick={() => setSettingsOpen(true)}
                className="rounded-md p-1 text-stone-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Settings className="h-5 w-5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              aria-label="Settings"
              title="Settings"
              onClick={() => setSettingsOpen(true)}
              className="mx-auto rounded-md p-1 text-stone-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Settings className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      {/* body — every tab is the same note system; only Trash is different */}
      {activeTab === "trash" ? (
        <TrashView />
      ) : (
        <NotesSection section={folder?.section ?? (activeTab.startsWith("note:") ? "binder" : activeTab as SectionKey)} rootId={folder?.node.id} />
      )}

      <AutoLinkReview />
      <NoteLinkDialog />
      <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}


