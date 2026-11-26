"use client";

import { useSyncExternalStore } from "react";
import { useKachamak } from "@/lib/kachamak/store";
import { DraftopusLoading } from "@/components/kachamak/DraftopusLoading";
import { Dashboard } from "@/components/kachamak/Dashboard";
import { ProjectFileStorage } from "@/components/kachamak/ProjectFileStorage";
import { Workspace } from "@/components/kachamak/Workspace";

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

  if (!mounted || !hydrated) return <DraftopusLoading />;

  return <ProjectFileStorage>{activeNovelId ? <Workspace /> : <Dashboard />}</ProjectFileStorage>;
}

