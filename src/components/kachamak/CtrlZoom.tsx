"use client";

import { useEffect } from "react";
import { useKachamak } from "@/lib/kachamak/store";

export type ZoomPanel = "left" | "mid" | "right" | "paneA" | "paneB";

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
      acc += e.deltaY;
      if (Math.abs(acc) >= 50) {
        const step = acc < 0 ? 0.1 : -0.1;
        acc = 0;
        const s = useKachamak.getState();
        const cur =
          panel === "left"
            ? s.leftZoom
            : panel === "mid"
              ? s.midZoom
              : panel === "right"
                ? s.rightZoom
                : panel === "paneA"
                  ? s.paneAZoom ?? s.midZoom
                  : s.paneBZoom ?? s.midZoom;
        s.setPanelZoom(panel, (cur ?? 1) + step);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [panel, targetRef]);
  return null;
}
