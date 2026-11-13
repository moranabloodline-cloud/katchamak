'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { initializeWebLibrary, useWebLibrary, saveWebLibrary, reloadWebLibrary, refreshWebLibrary, projectAttachments, addProjectAttachment, attachmentUrl } from '@/lib/kachamak/cloud-library';
import { exportNovelJson, useKachamak } from '@/lib/kachamak/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
export function WebLibraryStorage({ children }: { children: ReactNode }) {
  const state = useWebLibrary();
  useEffect(() => { void initializeWebLibrary().catch(() => {}); }, []);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void refreshWebLibrary().catch(() => {}); };
    const interval = setInterval(refresh, 4000);
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    const closing = (event: BeforeUnloadEvent) => { const s = useWebLibrary.getState(); if (s.pending || s.busy) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', closing);
    return () => { clearInterval(interval); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('beforeunload', closing); };
  }, []);
  if (!state.ready) return <main className="flex min-h-screen items-center justify-center bg-[#0d0d0d] p-8 text-foreground"><section className="max-w-lg space-y-5 rounded-xl border border-amber-500/30 bg-[#151515] p-7"><h1 className="font-serif text-2xl text-[#f3d589]">KATCHAMAK</h1><p>{state.busy ? 'Opening your account library…' : 'Could not open your cloud library'}</p>{state.error && <p role="alert" className="text-sm text-red-300">{state.error}</p>}{!state.busy && <><button onClick={() => void initializeWebLibrary().catch(() => {})} className="rounded bg-amber-400 px-4 py-2 text-black">Retry</button><a href="/signin-with-chatgpt?return_to=%2F" target="_top" className="ml-4 underline">Sign in</a></>}</section></main>;
  return <>{children}{state.error && <div role="alert" className="fixed inset-x-0 bottom-8 z-[100] flex items-center gap-3 bg-red-950 p-3 text-sm text-red-100"><span className="flex-1">Cloud save failed: {state.error}</span><button onClick={() => void saveWebLibrary().catch(e => toast.error(String(e)))} className="underline">Retry save</button><button onClick={() => { for (const n of useKachamak.getState().novels) exportNovelJson(n); }} className="underline">Export backups</button>{state.conflict && <button className="underline" onClick={() => { if (window.confirm('Reload the saved cloud library and discard unsaved edits? Export backups first to keep them.')) void reloadWebLibrary(true).catch(e => toast.error(String(e))); }}>Reload saved library</button>}</div>}</>;
}
export function CloudStorageControls() {
  const [open, setOpen] = useState(false), [files, setFiles] = useState<Awaited<ReturnType<typeof projectAttachments>>>([]);
  const email = useWebLibrary(s => s.email), active = useKachamak(s => s.activeNovelId);
  const input = useRef<HTMLInputElement>(null);
  const run = async (fn: () => Promise<unknown>) => { try { await fn(); } catch (error) { toast.error(String(error)); } };
  return <><p className="text-sm text-muted-foreground">Signed in as {email}</p><p className="text-sm">Your collections, projects, notes and attachments are saved privately to this account. Preview and browser use the same library.</p><div className="flex flex-wrap gap-2 text-xs"><button className="rounded border border-white/20 px-3 py-2" onClick={() => void run(async () => { await saveWebLibrary(); toast.success('Saved to your account.'); })}>Save now</button><button className="rounded border border-white/20 px-3 py-2" onClick={() => void run(async () => { await saveWebLibrary(); await reloadWebLibrary(); toast.success('Cloud library reloaded.'); })}>Reload library</button><button className="rounded border border-white/20 px-3 py-2" onClick={() => void run(async () => { await saveWebLibrary(); window.location.assign('/signout-with-chatgpt?return_to=%2F'); })}>Sign out</button>{active && <button className="rounded border border-white/20 px-3 py-2" onClick={() => void run(async () => { await saveWebLibrary(); setFiles(await projectAttachments()); setOpen(true); })}>Project files</button>}</div><Dialog open={open} onOpenChange={setOpen}><DialogContent className="border-white/10 bg-[#1b1b1b]"><DialogHeader><DialogTitle>Project files</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Attachments are stored privately in your account.</p><input ref={input} type="file" className="sr-only" aria-label="Add project file" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void run(async () => { await addProjectAttachment(file); setFiles(await projectAttachments()); }); }} /><button onClick={() => input.current?.click()} className="rounded bg-amber-400 px-3 py-2 text-black">Add file</button><ul className="max-h-80 overflow-auto">{files.map(file => <li key={file.id}><a className="block py-2 text-amber-200 underline" href={attachmentUrl(file.id)} download={file.name}>{file.name}</a></li>)}</ul>{!files.length && <p>No files yet.</p>}</DialogContent></Dialog></>;
}
