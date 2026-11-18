'use client';
import { useState } from 'react';
import { useLocalRecovery } from '@/lib/kachamak/local-recovery';
import { useWebLibrary, refreshLocalDrafts, recoverLocalDraft, exportLocalDraft, discardLocalDraft } from '@/lib/kachamak/cloud-library';
import { toast } from 'sonner';

export function LocalRecovery() {
  const state = useLocalRecovery(), ready = useWebLibrary(s => s.ready);
  const [working, setWorking] = useState(false);
  if (!state.owner) return null;
  const run = async (action: () => Promise<void>) => { setWorking(true); try { await action(); } catch (error) { toast.error(String(error)); } finally { setWorking(false); } };
  return <details className="fixed bottom-12 left-4 z-[110] max-h-[45vh] w-[min(32rem,calc(100vw-2rem))] overflow-auto rounded-lg border border-amber-500/30 bg-[#151515] px-4 py-2 text-sm shadow-lg" open={state.drafts.length > 0 || !!state.error ? true : undefined}>
    <summary className="cursor-pointer text-amber-200">Local recovery{state.drafts.length ? ` · ${state.drafts.length} draft${state.drafts.length === 1 ? '' : 's'}` : state.writing ? ' · saving…' : ''}</summary>
    <p className="mt-2 text-xs text-muted-foreground">Drafts are unencrypted on this browser profile. Anyone with access to the profile can read them outside the app. In the app, recovery requires server confirmation of the same account; it cannot be unlocked offline. Browser data removal, storage limits or a crash before the local write finishes can lose recent edits. Project backups do not include uploaded attachments.</p>
    {state.error && <p role="alert" className="mt-2 text-amber-200">{state.error}</p>}
    <button disabled={working} className="mt-2 underline" onClick={() => void run(refreshLocalDrafts)}>Refresh drafts</button>
    <ul className="max-h-48 overflow-auto">{state.drafts.map(draft => <li key={draft.id} className="mt-2 flex flex-wrap items-center gap-3">
      <span>{new Date(draft.updatedAt).toLocaleString()}</span>
      <button disabled={working || !ready} className="underline disabled:opacity-50" onClick={() => void run(() => recoverLocalDraft(draft))}>Recover as copies</button>
      <button disabled={working} className="underline" onClick={() => void run(() => exportLocalDraft(draft))}>Export project backups</button>
      <button disabled={working} className="underline" onClick={() => { if (window.confirm('Discard this local draft? This cannot be undone. Cloud projects will not be changed.')) void run(() => discardLocalDraft(draft)); }}>Discard</button>
    </li>)}</ul>
    {!!state.drafts.length && <p className="mt-2 text-xs text-muted-foreground">Recovery adds copies in a Recovered collection and keeps cloud originals. A draft may belong to another open window; newer changes in that window are preserved.</p>}
  </details>;
}
