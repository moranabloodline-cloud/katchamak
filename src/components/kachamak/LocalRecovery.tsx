'use client';
import { useEffect, useState } from 'react';
import { useLocalRecovery } from '@/lib/kachamak/local-recovery';
import { useWebLibrary, refreshLocalDrafts, recoverLocalDraft, exportLocalDraft, discardLocalDraft } from '@/lib/kachamak/cloud-library';
import { toast } from 'sonner';

export function LocalRecovery({ accountId }: { accountId?: string }) {
  const state = useLocalRecovery(), ready = useWebLibrary(s => s.ready);
  const [working, setWorking] = useState(false);
  if (!state.owner || (accountId !== undefined && state.owner !== accountId)) return null;
  const run = async (action: () => Promise<void>) => { setWorking(true); try { await action(); } catch (error) { toast.error(String(error)); } finally { setWorking(false); } };
  return <section aria-label="Local recovery" className="border-t border-white/10 pt-4 text-sm">
    <h3 className="font-medium">Local recovery</h3>
    <p className="mt-2 text-xs text-muted-foreground">Drafts are unencrypted on this browser profile. Anyone with access to the profile can read them outside the app. In the app, recovery requires server confirmation of the same account; it cannot be unlocked offline. Browser data removal, storage limits or a crash before the local write finishes can lose recent edits. Project backups do not include uploaded attachments.</p>
    {state.error && <p role="alert" className="mt-2 text-amber-200">{state.error}</p>}
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <button disabled={working} className="underline" onClick={() => void run(refreshLocalDrafts)}>Refresh drafts</button>
      {!state.drafts.length && !state.error && <span className="text-xs text-muted-foreground">{state.writing ? 'Saving local draft…' : 'No drafts to recover.'}</span>}
    </div>
    <ul className="max-h-48 overflow-auto">{state.drafts.map(draft => <li key={draft.id} className="mt-2 flex flex-wrap items-center gap-3">
      <span>{new Date(draft.updatedAt).toLocaleString()}</span>
      <button disabled={working || !ready} className="underline disabled:opacity-50" onClick={() => void run(() => recoverLocalDraft(draft))}>{draft.retryClone ? 'Retry clone save' : 'Recover as copies'}</button>
      <button disabled={working} className="underline" onClick={() => void run(() => exportLocalDraft(draft))}>Export project backups</button>
      <button disabled={working} className="underline" onClick={() => { if (window.confirm('Discard this local draft? This cannot be undone. Cloud projects will not be changed.')) void run(() => discardLocalDraft(draft)); }}>Discard</button>
    </li>)}</ul>
    {state.drafts.some(draft => !draft.retryClone) && <p className="mt-2 text-xs text-muted-foreground">Recovery adds copies in a Recovered collection and keeps cloud originals. A draft may belong to another open window; newer changes in that window are preserved.</p>}
  </section>;
}

export function LocalRecoveryNotice() {
  const owner = useLocalRecovery(s => s.owner);
  const hasDrafts = useLocalRecovery(s => s.drafts.length > 0);
  const error = useLocalRecovery(s => s.error);
  useEffect(() => {
    if (!owner || (!error && !hasDrafts)) return;
    const id = error
      ? toast.warning('Local draft protection needs attention.', { description: error })
      : toast.info('A local draft is ready to recover.', { description: 'Open Settings → Data & Privacy → Cloud storage to review it.' });
    return () => { toast.dismiss(id); };
  }, [owner, hasDrafts, error]);
  return null;
}
