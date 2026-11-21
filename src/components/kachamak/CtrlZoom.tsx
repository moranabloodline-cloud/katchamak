"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useKachamak } from "@/lib/kachamak/store";
import {currentPanelZoom, registerZoomReset, subscribeZoom, zoomScope, type ZoomPanel} from "@/lib/kachamak/workspace-zoom";

export function usePanelZoom(panel:ZoomPanel) {
  useKachamak(zoomScope);
  return useSyncExternalStore(subscribeZoom,()=>currentPanelZoom(useKachamak.getState(),panel),()=>1);
}

/* Ctrl + skrol nad panelom = zoom SADRŽINE tog panela (0.5–2.0, korak 0.1;
   trake/okvir ostaju iste visine pa linije trake 2 ostaju poravnate).
   Mora nativan listener sa passive:false — React onWheel je pasivan, pa
   preventDefault (gašenje zooma pregledača) ne bi radio. Mali komadi delte se
   sabiraju (trackpad) — jedan „skok“ točkića = jedan korak.
   Split površine (paneA/paneB) imaju SVOJ zoom — lenjir i strana se uvećavaju
   zajedno, svaka površina odvojeno (po Nikoli); stopPropagation čuva event
   da ne „probije“ do main listenera ( koji bi menjao midZoom). Kad zoom
   površine još nije podešen (null), čita midZoom — bez skoka pri prelasku
   iz Write moda. */
export function CtrlZoom({
  panel,
  targetRef,
}: {
  panel: ZoomPanel;
  targetRef: React.RefObject<HTMLElement | null>;
}) {
  const scope=useKachamak(zoomScope);
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    let acc = 0;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) {
        acc = 0;
        return;
      }
      e.preventDefault();
      /* zoom površine je LOKALAN — ne pusti event do main listenera */
      e.stopPropagation();
      acc += e.deltaY * (e.deltaMode===1?16:e.deltaMode===2?Math.max(el.clientHeight,1):1);
      if (Math.abs(acc) >= 50) {
        const step = acc < 0 ? 0.1 : -0.1;
        acc = 0;
        const s = useKachamak.getState();
        s.setPanelZoom(panel, currentPanelZoom(s,panel) + step);
      }
    };
    const unregisterReset = registerZoomReset(el, () => {
      acc = 0;
      const state = useKachamak.getState();
      // Shared Split chrome has no individual note under the pointer.
      if (panel === 'mid' && state.view === 'split') return;
      state.setPanelZoom(panel, 1);
    });
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      unregisterReset();
      el.removeEventListener("wheel", onWheel);
    };
  }, [panel, targetRef, scope]);
  return null;
}
