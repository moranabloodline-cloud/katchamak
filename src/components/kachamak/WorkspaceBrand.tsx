"use client";
import {useKachamak} from '@/lib/kachamak/store';
export function WorkspaceBrand() {
  const closeNovel=useKachamak(s=>s.closeNovel);
  return <button type="button" aria-label="Back to dashboard" title="Dashboard" onClick={closeNovel} className="flex min-w-0 flex-1 items-center gap-1.5 rounded text-left hover:opacity-80 focus-visible:outline-2 focus-visible:outline-amber-400"><img src="/kachamak-logo.png" alt="" width={28} height={28} className="h-7 w-7 shrink-0 object-contain"/><span className="min-w-0 truncate text-sm font-bold text-foreground">Kachamak</span></button>;
}
