export function DraftopusLoading() {
  return <main className="grid min-h-dvh place-items-center bg-[#0d0d0d] px-6 text-stone-200">
    <div role="status" className="flex flex-col items-center gap-4">
      <img src="/draftopus-logo.png" alt="" width={48} height={48} className="size-12 object-contain motion-safe:animate-pulse" />
      <p className="text-sm">Opening Draftopus…</p>
    </div>
  </main>;
}
