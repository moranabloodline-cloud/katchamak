'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { initializeWebLibrary, useWebLibrary, saveWebLibrary, reloadWebLibrary, refreshWebLibrary, projectAttachments, addProjectAttachment, attachmentUrl } from '@/lib/kachamak/cloud-library';
import { exportNovelJson, useKachamak } from '@/lib/kachamak/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { DraftopusLoading } from './DraftopusLoading';
import { LocalRecovery, LocalRecoveryNotice } from './LocalRecovery';
import { useLocalRecovery } from '@/lib/kachamak/local-recovery';
import { checkpointLocalDraft, exportPendingBackups } from '@/lib/kachamak/cloud-library';
export function WebLibraryStorage({ children }: { children: ReactNode }) {
  const state = useWebLibrary();
  const hasRecoveryIssue = useLocalRecovery(s => !!s.owner && (s.drafts.length > 0 || !!s.error));
  useEffect(() => { void initializeWebLibrary().catch(() => {}); }, []);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void refreshWebLibrary().catch(() => {}); };
    const interval = setInterval(refresh, 4000);
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    const closing = (event: BeforeUnloadEvent) => { const s = useWebLibrary.getState(); if (s.pending || s.busy) { void checkpointLocalDraft(); event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', closing);
    return () => { clearInterval(interval); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('beforeunload', closing); };
  }, []);
  if (!state.ready && (state.busy || !state.error)) return <DraftopusLoading />;
  if (!state.ready) return <main className="grid min-h-dvh place-items-center bg-[#0d0d0d] px-6 py-10 text-stone-100">
    <section className="w-full max-w-md space-y-4 rounded-xl border border-white/10 bg-[#151515] p-6 sm:p-8">
      <img src="/draftopus-logo.png" alt="" width={36} height={36} className="size-9 object-contain" />
      <h1 className="font-serif text-xl font-semibold">Could not open your cloud library</h1>
      <p role="alert" className="break-words text-sm text-stone-300">{state.error}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void initializeWebLibrary().catch(() => {})} className="rounded-md bg-amber-400 px-4 py-2 text-sm font-medium text-black hover:bg-amber-300">Retry</button>
        <a href={typeof window !== 'undefined' && window.draftopusClerkReady ? '/auth/clerk?resume=1' : '/signin-with-chatgpt?return_to=%2F'} target="_top" className="rounded-md px-3 py-2 text-sm text-stone-200 hover:bg-white/10">Sign in</a>
      </div>
      {hasRecoveryIssue && <details className="text-sm">
        <summary className="cursor-pointer text-amber-200">Local draft options</summary>
        <div className="mt-3"><LocalRecovery /></div>
      </details>}
    </section>
  </main>;
  return <>
    <LocalRecoveryNotice />
    {children}
    {state.error && <div role={state.retrying ? "status" : "alert"} className={`fixed inset-x-0 bottom-8 z-[100] flex max-h-[50dvh] flex-wrap items-center gap-3 overflow-auto p-3 text-sm ${state.retrying ? "bg-amber-950 text-amber-100" : "bg-red-950 text-red-100"}`}>
      <span className="min-w-0 flex-[1_1_18rem] break-words">{state.retrying ? "Cloud save interrupted. Retrying automatically..." : "Cloud save failed: " + state.error}</span>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <button onClick={() => void saveWebLibrary().catch(e => toast.error(String(e)))} className="underline">Retry save</button>
        <button onClick={() => void exportPendingBackups().catch(e => toast.error(String(e)))} className="underline">Export backups</button>
        {state.conflict && <button className="underline" onClick={() => { if (window.confirm('Reload the saved cloud library and discard unsaved edits? Export backups first to keep them.')) void reloadWebLibrary(true).catch(e => toast.error(String(e))); }}>Reload saved library</button>}
      </div>
    </div>}
  </>;
}
export function CloudStorageControls() {
  const email = useWebLibrary(s => s.email);
  const active = useKachamak(s => s.novels.find(novel => novel.id === s.activeNovelId)?.id ?? null);
  return <StorageActions key={JSON.stringify([email, active])} email={email} active={active} />;
}

function StorageActions({ email, active }: { email: string; active: string | null }) {
  const syncStatus = useWebLibrary(state => {
    if (!state.ready) return 'Opening your cloud library…';
    if (state.retrying) return 'Retrying cloud save…';
    if (state.error) return 'Cloud save needs attention';
    if (state.busy || state.pending) return 'Saving to your account…';
    return 'Saved to your account';
  });
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<Awaited<ReturnType<typeof projectAttachments>>>([]);
  const [action, setAction] = useState('');
  const running = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const run = async (label: string, fn: () => Promise<unknown>) => {
    if (running.current) return;
    running.current = true;
    setAction(label);
    try { await fn(); }
    catch (error) { toast.error(String(error)); }
    finally {
      running.current = false;
      setAction('');
    }
  };
  const busy = action !== '';
  const buttonClass = 'rounded-full border border-border bg-card px-3 py-1.5 hover:bg-muted disabled:opacity-50';
  const downloadBackup = () => {
    const { novels, activeNovelId } = useKachamak.getState();
    const project = active === activeNovelId && novels.find(novel => novel.id === active);
    if (!project || !useWebLibrary.getState().ready) return;
    exportNovelJson(project);
    toast.success('Project backup downloaded.');
  };
  return <>
    <section className="space-y-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-semibold">Automatic cloud saving</h3>
        <p role="status" className="text-xs text-muted-foreground">{!open && action ? action : syncStatus}</p>
      </div>
      <p className="text-sm text-muted-foreground">Your private library is saved to your Draftopus account. Sign in on another device to open the same projects and files.</p>
      <p className="break-words text-xs text-muted-foreground">Signed in as {email}</p>
      <div className="flex flex-wrap gap-2 text-xs">
        <button type="button" disabled={busy} className={buttonClass} onClick={() => void run('Saving…', async () => { await saveWebLibrary(); toast.success('Saved to your account.'); })}>Save now</button>
        <button type="button" disabled={busy} className={buttonClass} onClick={() => void run('Reloading library…', async () => { await saveWebLibrary(); await reloadWebLibrary(); toast.success('Cloud library reloaded.'); })}>Reload library</button>
      </div>
    </section>
    <section className="space-y-2.5 border-t border-border pt-3">
      <h3 className="text-sm font-semibold">Keep a copy on this device</h3>
      <p className="text-sm text-muted-foreground">{active
        ? 'Download a JSON backup of this project. Uploaded attachments are available separately under Project files.'
        : 'Open a project to download a JSON backup or its uploaded attachments.'}</p>
      {active && <div className="flex flex-wrap gap-2 text-xs">
        <button type="button" disabled={busy} className={buttonClass} onClick={downloadBackup}>Download project backup</button>
        <button type="button" disabled={busy} className={buttonClass} onClick={() => void run('Opening project files…', async () => { await saveWebLibrary(); setFiles(await projectAttachments(active)); setOpen(true); })}>Project files</button>
      </div>}
      <p className="text-xs text-muted-foreground">Opening and syncing the library requires internet access. This browser can retain unsaved edits temporarily for recovery.</p>
    </section>
    <Dialog open={open} onOpenChange={(next) => { if (!busy || next) setOpen(next); }}>
      <DialogContent className="border-white/10 bg-[#1b1b1b]" aria-busy={busy}>
        <DialogHeader><DialogTitle>Project files</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Attachments are stored privately in your account.</p>
        <input ref={input} disabled={busy} type="file" className="sr-only" aria-label="Add project file" onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void run('Adding file…', async () => {
            await addProjectAttachment(file, active);
            setFiles(await projectAttachments(active));
          });
        }} />
        <button disabled={busy} onClick={() => input.current?.click()} className="rounded bg-amber-400 px-3 py-2 text-black disabled:opacity-50">{busy ? action : 'Add file'}</button>
        <ul className="max-h-80 overflow-auto">{files.map(file => <li key={file.id}><a className="block break-words py-2 text-amber-200 underline" href={attachmentUrl(file.id, active)} download={file.name}>{file.name}</a></li>)}</ul>
        {!files.length && <p>No files yet.</p>}
      </DialogContent>
    </Dialog>
  </>;
}
