"use client";
import {useKachamak} from '@/lib/kachamak/store';
export function WorkspaceBrand({compact}: {compact: boolean}) {
  const closeNovel=useKachamak(s=>s.closeNovel);
  return (
    <button type="button" aria-label="Back to dashboard" title="Dashboard" onClick={closeNovel}
      className="flex min-w-0 flex-1 items-center gap-0.5 rounded text-left hover:opacity-80 focus-visible:outline-2 focus-visible:outline-amber-400 @[205px]:gap-2">
      <img src="/kachamak-logo.png" alt="" width={48} height={48}
        className={`shrink-0 object-contain ${compact ? 'size-[26px]' : 'size-7 @[205px]:size-10 xl:@[220px]:size-12'}`}/>
      {!compact && <span className="min-w-0 truncate text-[clamp(1rem,11cqi,1.625rem)] font-bold leading-none text-foreground">Kachamak</span>}
    </button>
  );
}
