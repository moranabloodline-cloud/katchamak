"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { relocateCurrentProject, initializeProjectFiles, isDesktop, useProjectFiles, migrateExistingProjects, openFileProject, flushProjectFiles } from "@/lib/kachamak/project-files";
import { useKachamak, exportNovelJson } from "@/lib/kachamak/store";
import { toast } from "sonner";

export function ProjectFileStorage({ children }: { children: ReactNode }) {
  const state = useProjectFiles();
  const [working, setWorking] = useState(false);
  useEffect(() => { void initializeProjectFiles().catch(() => {}); }, []);
  useEffect(() => {
    if (!isDesktop()) return;
    let dispose: (() => void) | undefined;
    let disposed = false;
    void getCurrentWindow().onCloseRequested(async event => {
      event.preventDefault();
      try {
        const current = useProjectFiles.getState();
        if (current.ready && !current.legacyIds.length) await flushProjectFiles();
        await getCurrentWindow().destroy();
      } catch (error) { toast.error(`Could not save the project file. The window remains open. ${String(error)}`); }
    }).then(stop => { if (disposed) stop(); else dispose = stop; });
    return () => { disposed = true; dispose?.(); };
  }, []);
  if (!isDesktop()) return <>{children}</>;
  const run = async (action: () => Promise<unknown>) => {
    setWorking(true);
    try { await action(); } catch (error) { toast.error(String(error)); }
    finally { setWorking(false); }
  };
  if (!state.ready || state.legacyIds.length) return <main className="flex min-h-screen items-center justify-center bg-[#0d0d0d] p-8 text-foreground">
    <section className="w-full max-w-xl space-y-5 rounded-xl border border-[#a97f33]/50 bg-[#151515] p-7">
      <h1 className="font-serif text-2xl text-[#f3d589]">{state.legacyIds.length ? "Choose a folder for your projects" : state.error ? "Could not open project files" : "Opening project files…"}</h1>
      {state.legacyIds.length > 0 && <p className="text-sm leading-relaxed text-muted-foreground">Your existing projects are preserved. Choose a location on your computer. Each project will be saved in its own .katchamak folder, and future edits will be saved there.</p>}
      {state.error && <p role="alert" className="whitespace-pre-wrap text-sm text-red-300">{state.error}</p>}
      <div className="flex flex-wrap gap-3">
        {state.legacyIds.length > 0 && <button disabled={working} onClick={() => void run(migrateExistingProjects)} className="rounded-md bg-[#f3b64e] px-4 py-2 text-sm text-black">Choose folder and save existing projects</button>}
        {state.error && <button disabled={working} onClick={() => void run(initializeProjectFiles)} className="rounded-md border border-white/20 px-4 py-2 text-sm">Retry</button>}
        {(state.error || state.legacyIds.length > 0) && <button disabled={working} onClick={() => void run(openFileProject)} className="rounded-md border border-white/20 px-4 py-2 text-sm">Open an existing project file</button>}
      </div>
    </section>
  </main>;
  return <>
    {children}
    {state.error && <div role="alert" className="fixed inset-x-0 top-0 z-[100] flex items-center gap-3 bg-red-950 p-3 text-sm text-red-100"><span className="flex-1">Project file could not be saved: {state.error}</span><button onClick={() => void run(flushProjectFiles)} className="underline">Retry save</button><button disabled={working} onClick={() => void run(relocateCurrentProject)} className="underline">Save current edits to a new folder</button><button onClick={() => { const n = useKachamak.getState().novels.find(n => n.id === useKachamak.getState().activeNovelId); if (n) exportNovelJson(n); }} className="underline">Export backup</button></div>}
  </>;
}

export function ProjectFileStatus() {
  const state = useProjectFiles();
  const activeId = useKachamak(s => s.activeNovelId);
  if (!isDesktop()) return <>Saved in this browser</>;
  return <span title={activeId ? state.paths[activeId] : Object.values(state.paths).join("\n")}>{state.error ? "File save failed" : state.busy || state.pending ? "Saving project files…" : "Saved to project folders"}</span>;
}
