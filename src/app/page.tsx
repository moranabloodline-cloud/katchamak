"use client";

import { useSyncExternalStore } from "react";
import { useKachamak } from "@/lib/kachamak/store";
import { Dashboard } from "@/components/kachamak/Dashboard";
import { ProjectFileStorage } from "@/components/kachamak/ProjectFileStorage";
import { Workspace } from "@/components/kachamak/Workspace";
import { FolderAccessWindow } from "@/components/kachamak/FolderAccessWindow";
import { isFolderAccessWindow } from "@/lib/kachamak/folder-access";

const emptySubscribe = () => () => {};

/** True once the persisted store has been rehydrated from localStorage. */
function useStoreHydrated(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const unsub = useKachamak.persist.onFinishHydration(onStoreChange);
      // if hydration already finished before we subscribed, notify once
      if (useKachamak.persist.hasHydrated()) {
        const t = setTimeout(onStoreChange, 0);
        return () => {
          clearTimeout(t);
          unsub();
        };
      }
      return unsub;
    },
    () => useKachamak.persist.hasHydrated(),
    () => false
  );
}

export default function Page() {
  const activeNovelId = useKachamak((s) => s.activeNovelId);
  const hydrated = useStoreHydrated();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted || !hydrated) {
    // localStorage store hydrates on the client only
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0d0d0d] text-foreground">
        <span className="text-4xl">🍲</span>
        <p className="text-sm text-muted-foreground">Warming up the Kachamak…</p>
      </div>
    );
  }

  if (isFolderAccessWindow()) return <FolderAccessWindow />;
  return <ProjectFileStorage>{activeNovelId ? <Workspace /> : <Dashboard />}</ProjectFileStorage>;
}

