'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { initializeWebLibrary, useWebLibrary, saveWebLibrary, reloadWebLibrary, refreshWebLibrary, projectAttachments, addProjectAttachment, attachmentUrl } from '@/lib/kachamak/cloud-library';
import { useKachamak } from '@/lib/kachamak/store';
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
        <a href="/signin-with-chatgpt?return_to=%2F" target="_top" className="rounded-md px-3 py-2 text-sm text-stone-200 hover:bg-white/10">Sign in</a>
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
  const email = useWebLibrary(s => s.email), active = useKachamak(s => s.activeNovelId);
  return <StorageActions key={JSON.stringify([email, active])} email={email} active={active} />;
}

function StorageActions({ email, active }: { email: string; active: string | null }) {
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
  return <>
    <p className="break-words text-sm text-muted-foreground">Signed in as {email}</p>
    <p className="text-sm">Your collections, projects, notes and attachments are saved privately to this account. Preview and browser use the same library.</p>
    <div className="flex flex-wrap gap-2 text-xs">
      <button disabled={busy} className={buttonClass} onClick={() => void run('Saving…', async () => { await saveWebLibrary(); toast.success('Saved to your account.'); })}>Save now</button>
      <button disabled={busy} className={buttonClass} onClick={() => void run('Reloading library…', async () => { await saveWebLibrary(); await reloadWebLibrary(); toast.success('Cloud library reloaded.'); })}>Reload library</button>
      {active && <button disabled={busy} className={buttonClass} onClick={() => void run('Opening project files…', async () => { await saveWebLibrary(); setFiles(await projectAttachments(active)); setOpen(true); })}>Project files</button>}
    </div>
    {!open && <p role="status" className={action ? 'text-xs text-muted-foreground' : 'sr-only'}>{action}</p>}
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
