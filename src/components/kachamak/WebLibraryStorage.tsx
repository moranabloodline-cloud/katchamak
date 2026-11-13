'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { initializeWebLibrary, useWebLibrary, flushWebLibrary, saveWebLibrary, connectWebFolder, reloadWebLibrary, projectAttachments, addProjectAttachment } from '@/lib/kachamak/web-library';
import { exportNovelJson, useKachamak } from '@/lib/kachamak/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export function WebLibraryStorage({ children }: { children: ReactNode }) {
  const state = useWebLibrary();
  const embedded = typeof window !== "undefined" && window.top !== window.self;
  useEffect(() => { void initializeWebLibrary().catch(() => {}); }, []);
  useEffect(() => {
    const closing = (event: BeforeUnloadEvent) => { const s = useWebLibrary.getState(); if (s.pending || s.busy || s.error) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', closing);
    return () => window.removeEventListener('beforeunload', closing);
  }, []);
  if (embedded) return <main className="flex min-h-screen items-center justify-center bg-[#0d0d0d] p-8 text-foreground"><section className="max-w-lg space-y-5 rounded-xl border border-amber-500/30 bg-[#151515] p-7"><h1 className="font-serif text-2xl text-[#f3d589]">KATCHAMAK</h1><p>Open the app in its own browser tab to access your local folders.</p><a className="inline-block rounded bg-amber-400 px-4 py-2 text-black" href={window.location.origin} target="_blank" rel="noreferrer">Open Katchamak</a></section></main>;
  if (!state.ready) return <main className="flex min-h-screen items-center justify-center bg-[#0d0d0d] p-8 text-foreground"><section className="max-w-lg space-y-5 rounded-xl border border-amber-500/30 bg-[#151515] p-7"><h1 className="font-serif text-2xl text-[#f3d589]">KATCHAMAK</h1><p>{state.busy ? 'Opening your folders…' : state.reconnect ? 'Reconnect your saved folders' : state.error ? 'Could not open your library' : 'Local folders need a supported browser'}</p>{!state.busy && !state.supported && <p className="text-sm text-muted-foreground">Open this web app in desktop Chrome or Edge to read and save your own folders. No projects are stored on Sites.</p>}{state.reconnect && <p className="text-sm text-muted-foreground">Your account remembers the folder locations on this browser. Allow access to read their contents again; you do not need to choose the locations again.</p>}{state.error && <p role="alert" className="text-sm text-red-300">{state.error} <a href="/signin-with-chatgpt?return_to=%2F" target="_top" className="underline">Sign in</a></p>}{(state.reconnect || state.error) && <button disabled={state.busy} onClick={() => void initializeWebLibrary(true).catch(() => {})} className="rounded bg-amber-400 px-4 py-2 text-black">Reconnect folders</button>}</section></main>;
  return <>{children}{state.error && <div role="alert" className="fixed inset-x-0 bottom-8 z-[100] flex items-center gap-3 bg-red-950 p-3 text-sm text-red-100"><span className="flex-1">Folder save failed: {state.error}</span><button onClick={() => void saveWebLibrary().catch(e => toast.error(String(e)))} className="underline">Retry save</button><button onClick={() => { for (const n of useKachamak.getState().novels) exportNovelJson(n); }} className="underline">Export backups</button></div>}</>;
}

export function WebFolderControls() {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<{ name: string; file: File }[]>([]);
  const email = useWebLibrary(s => s.email);
  const rootName = useWebLibrary(s => s.rootName);
  const active = useKachamak(s => s.activeNovelId);
  const input = useRef<HTMLInputElement>(null);
  const run = async (fn: () => Promise<unknown>) => { try { await fn(); } catch (error) { if ((error as Error).name !== 'AbortError') toast.error(String(error)); } };
  return <><p className="text-sm text-muted-foreground">Signed in as {email}</p><p className="text-sm"><strong>Library root:</strong> {rootName || 'Not selected — choose a folder to start'}</p><div className="flex flex-wrap gap-2 text-xs"><button className="rounded border border-white/20 px-3 py-2" onClick={() => void run(async () => { await saveWebLibrary(); window.location.assign('/signout-with-chatgpt?return_to=%2F'); })}>Sign out</button><button className="rounded border border-white/20 px-3 py-2" onClick={() => void run(connectWebFolder)}>Choose library root</button><button className="rounded border border-white/20 px-3 py-2" onClick={() => void run(async () => { await flushWebLibrary(); await reloadWebLibrary(); toast.success('Library reloaded from your folders.'); })}>Reload library</button>{active && <button className="rounded border border-white/20 px-3 py-2" onClick={() => void run(async () => { await flushWebLibrary(); setFiles(await projectAttachments()); setOpen(true); })}>Project files</button>}</div><Dialog open={open} onOpenChange={setOpen}><DialogContent className="border-white/10 bg-[#1b1b1b]"><DialogHeader><DialogTitle>Project files</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Files are read directly from this project's Files folder.</p><input ref={input} type="file" className="sr-only" aria-label="Add project file" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void run(async () => { await addProjectAttachment(file); setFiles(await projectAttachments()); }); }} /><button onClick={() => input.current?.click()} className="rounded bg-amber-400 px-3 py-2 text-black">Add file</button><ul className="max-h-80 overflow-auto">{files.map(({ name, file }) => <li key={name}><button className="py-2 text-amber-200 underline" onClick={() => { const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}>{name}</button></li>)}</ul>{!files.length && <p>No files yet.</p>}</DialogContent></Dialog></>;
}

