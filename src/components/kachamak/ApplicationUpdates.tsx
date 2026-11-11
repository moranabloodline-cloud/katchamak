"use client";

import { useEffect } from "react";
import { projectsSavedLocally } from "@/lib/kachamak/store";
import { watchApplicationUpdates } from "@/lib/kachamak/application-updates";

export function ApplicationUpdates() {
  useEffect(() => {
    const current = process.env.NEXT_PUBLIC_APPLICATION_SOURCE_TREE;
    if (process.env.NODE_ENV !== "production" || !current) return;
    let lastInteraction = Date.now();
    const activity = () => { lastInteraction = Date.now(); };
    window.addEventListener("input", activity, true);
    window.addEventListener("pointerdown", activity, true);
    window.addEventListener("keydown", activity, true);
    const stop = watchApplicationUpdates({
      current,
      fetchVersion: async () => {
        const response = await fetch("/app-version.json", { cache: "no-store", signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error("Version unavailable");
        return response.json();
      },
      canReload: () => document.visibilityState === "visible" && Date.now() - lastInteraction > 5000 &&
        !document.querySelector('[role="dialog"], [role="alertdialog"]') &&
        !(document.activeElement instanceof HTMLElement && (document.activeElement.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName))) && projectsSavedLocally(),
      reload: () => window.location.reload(), target: window,
    });
    return () => { stop(); window.removeEventListener("input", activity, true); window.removeEventListener("pointerdown", activity, true); window.removeEventListener("keydown", activity, true); };
  }, []);
  return null;
}
