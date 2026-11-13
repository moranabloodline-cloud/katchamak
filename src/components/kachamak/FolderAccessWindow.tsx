'use client';
import { useEffect, useState } from 'react';
import { FOLDER_ACCESS, rememberedFolder, pickNativeFolder, type FolderHandle } from '@/lib/kachamak/folder-access';

/** Runs only in the same-origin, top-level permission window, never in the app. */
export function FolderAccessWindow() {
  const [connection, setConnection] = useState<{ accountId: string; current: FolderHandle | null; choose: boolean } | null>(null);
  const [identity, setIdentity] = useState<{ id: string; email: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const requestId = new URLSearchParams(window.location.search).get('request');
  const send = (data: Record<string, unknown>) => window.opener?.postMessage({ type: FOLDER_ACCESS, requestId, ...data }, window.location.origin);
  useEffect(() => {
    if (!window.opener || !requestId) { setError('This window must be opened from Choose library root in Katchamak.'); return; }
    let active = true;
    const receive = async (event: MessageEvent) => {
      const data = event.data;
      if (event.origin !== window.location.origin || event.source !== window.opener || data?.type !== FOLDER_ACCESS || data.requestId !== requestId) return;
      if (data.action === 'accepted') { window.close(); return; }
      if (data.action !== 'connect' || typeof data.accountId !== 'string') return;
      try {
        const response = await fetch('/api/account', { credentials: 'same-origin', cache: 'no-store' });
        if (!response.ok) throw new Error('Sign in with the same account as Preview, then connect the folder again.');
        const user = await response.json();
        if (user.id !== data.accountId) throw new Error('Preview and this window are signed in to different accounts.');
        const current = data.current ?? await rememberedFolder(user.id);
        if (active) { setIdentity(user); setConnection({ accountId: user.id, current, choose: Boolean(data.choose) }); }
      } catch (e) { if (active) setError((e as Error).message); }
    };
    window.addEventListener('message', receive);
    send({ action: 'ready' });
    return () => { active = false; window.removeEventListener('message', receive); };
  }, [requestId]);
  const connect = async (choose: boolean) => {
    if (!connection) return;
    setBusy(true); setError('');
    try {
      // Start the permission prompt on this click, before persistence or file reads.
      const handle = choose || !connection.current ? await pickNativeFolder() : connection.current;
      if (await handle.queryPermission({ mode: 'readwrite' }) !== 'granted' && await handle.requestPermission({ mode: 'readwrite' }) !== 'granted') throw new Error('Allow access to connect this folder.');
      await rememberedFolder(connection.accountId, handle);
      send({ action: 'selected', accountId: connection.accountId, handle }); setSent(true);
    } catch (e) { if ((e as Error).name !== 'AbortError') setError(['NotAllowedError', 'SecurityError'].includes((e as Error).name) ? 'This host blocks local folder access even in a separate window. Your files have not changed. Use this application directly in desktop Chrome or Edge.' : (e as Error).message); }
    finally { setBusy(false); }
  };
  return <main className="flex min-h-screen items-center justify-center bg-[#0d0d0d] p-6 text-foreground"><section className="w-full max-w-md space-y-5 rounded-xl border border-amber-400/30 bg-[#151515] p-6"><h1 className="font-serif text-2xl text-[#f3d589]">Connect your library</h1><p className="text-sm text-muted-foreground">Allow access here once, then continue working in Preview. Collections, projects and notes will be saved in this folder.</p>{identity && <p className="text-sm">{identity.email}</p>}{connection?.current && <p><strong>Library root:</strong> {connection.current.name}</p>}{error && <p role="alert" className="text-sm text-red-300">{error}</p>}{sent ? <p role="status">Connecting to Preview…</p> : <div className="flex flex-wrap gap-3">{connection?.current && !connection.choose && <button disabled={busy} className="rounded bg-amber-400 px-4 py-2 text-black" onClick={() => void connect(false)}>Connect this library</button>}{(!connection?.current || connection.choose) && <button disabled={!connection || busy} className="rounded border border-amber-400/40 px-4 py-2" onClick={() => void connect(true)}>{busy ? 'Connecting…' : 'Choose library root'}</button>}<button className="text-sm underline" onClick={() => { send({ action: 'cancel' }); window.close(); }}>Cancel</button></div>}</section></main>;
}
