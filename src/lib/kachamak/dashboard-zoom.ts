/** A non-passive listener is required to replace the browser's Ctrl+wheel zoom. */
export function bindDashboardZoom(target: HTMLElement, change: (step: number) => void) {
  let accumulated = 0;
  const wheel = (event: WheelEvent) => {
    if (!event.ctrlKey) { accumulated = 0; return; }
    event.preventDefault();
    event.stopPropagation();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? target.clientHeight : 1);
    if (!delta) return;
    if (Math.sign(delta) !== Math.sign(accumulated)) accumulated = 0;
    accumulated += delta;
    if (Math.abs(accumulated) < 50) return;
    change(accumulated < 0 ? 10 : -10);
    accumulated = 0;
  };
  target.addEventListener("wheel", wheel, { passive: false });
  return () => target.removeEventListener("wheel", wheel);
}
