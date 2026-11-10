import assert from "node:assert/strict";
import { bindDashboardZoom } from "../src/lib/kachamak/dashboard-zoom.ts";

const target = new EventTarget();
target.clientHeight = 800;
const steps = [];
const remove = bindDashboardZoom(target, (step) => steps.push(step));
function scroll(deltaY, ctrlKey = true, deltaMode = 0) {
  const event = new Event("wheel", { cancelable: true });
  Object.assign(event, { deltaY, ctrlKey, deltaMode });
  target.dispatchEvent(event);
  return event;
}
assert.equal(scroll(100, false).defaultPrevented, false, "ordinary scrolling stays native");
assert.deepEqual(steps, []);
assert.equal(scroll(-100).defaultPrevented, true, "Ctrl+wheel suppresses browser zoom");
scroll(100);
assert.deepEqual(steps, [10, -10], "wheel direction changes application zoom");
scroll(-20); scroll(-20);
assert.equal(steps.length, 2, "small trackpad movements accumulate");
scroll(-20);
assert.equal(steps.at(-1), 10);
scroll(4, true, 1);
assert.equal(steps.at(-1), -10, "line-mode wheel events are normalized");
scroll(-1, true, 2);
assert.equal(steps.at(-1), 10, "page-mode wheel events are normalized");
const before = steps.length;
remove();
assert.equal(scroll(100).defaultPrevented, false, "cleanup restores ordinary browser handling");
assert.equal(steps.length, before);
console.log("Dashboard Ctrl+wheel checks passed.");
