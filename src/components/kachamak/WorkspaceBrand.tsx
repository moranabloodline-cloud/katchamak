"use client";
import {useKachamak} from '@/lib/kachamak/store';
export function WorkspaceBrand({compact}: {compact: boolean}) {
  const closeNovel=useKachamak(s=>s.closeNovel);
  return (
    <button type="button" aria-label="Back to dashboard" title="Dashboard" onClick={closeNovel}
      className="flex min-w-0 flex-1 items-center gap-2 rounded text-left hover:opacity-80 focus-visible:outline-2 focus-visible:outline-amber-400">
      <img src="/kachamak-logo.png" alt="" width={48} height={48}
        className={`shrink-0 object-contain ${compact ? 'size-[26px]' : 'size-10 xl:size-12'}`}/>
      {!compact && <span className="min-w-0 truncate text-lg font-bold leading-none text-foreground">Kachamak</span>}
    </button>
  );
}
