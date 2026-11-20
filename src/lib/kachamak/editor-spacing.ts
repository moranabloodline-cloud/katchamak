import {editorForRange, paragraphSelector} from './editor-selection';

type Atom = Text | HTMLElement;
type Slice = {node: Atom; start: number; end: number};
type Target = {block: HTMLElement; selected: Slice[]; whole: boolean};
export type SpacingChange = {leading: number} | {remove: 'before' | 'after'};

const flowSelector = 'span[data-editor-spacing-flow]';
const runSelector = 'span[data-editor-spacing-run]';
const blockBoundary = paragraphSelector + ',ul,ol,table,hr,section,article,figure';

function atoms(root: Node, range?: Range): Atom[] {
  const result: Atom[] = [];
  function visit(node: Node) {
    if (range && !range.intersectsNode(node)) return;
    if (node.nodeType === Node.TEXT_NODE) {
      if ((node as Text).length) result.push(node as Text);
      return;
    }
    if (!(node instanceof HTMLElement) || node.getAttribute('contenteditable') === 'false') return;
    if (node.matches('br,img') || (!node.firstChild && node.matches(paragraphSelector))) {
      result.push(node);
      return;
    }
    for (const child of node.childNodes) visit(child);
  }
  visit(root);
  return result;
}

function targets(range: Range): Target[] {
  const editor = editorForRange(range);
  if (!editor || range.collapsed || editor.getAttribute('contenteditable') !== 'true') return [];
  const byBlock = new Map<HTMLElement, Slice[]>();
  for (const node of atoms(range.commonAncestorContainer, range)) {
    const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
    if (element?.closest('[contenteditable="false"]')) continue;
    const block = element?.closest<HTMLElement>(paragraphSelector);
    if (!block || block === editor || !editor.contains(block)) continue;
    const length = node.nodeType === Node.TEXT_NODE ? (node as Text).length : 1;
    const start = range.startContainer === node ? range.startOffset : 0;
    const end = range.endContainer === node ? range.endOffset : length;
    if (end <= start) continue;
    if (!byBlock.has(block)) byBlock.set(block, []);
    byBlock.get(block)!.push({node,start,end});
  }
  return Array.from(byBlock, ([block, selected]) => ({
    block, selected,
    whole: !block.querySelector(blockBoundary + ',[contenteditable="false"]') &&
      selected.every(({node,start,end}) => start === 0 && (node.nodeType !== Node.TEXT_NODE || end === (node as Text).length)) &&
      selected.length === atoms(block).length
  }));
}

export function selectedSpacing(range: Range) {
  const groups = targets(range);
  const values = new Set<number>();
  for (const {selected} of groups) {
    for (const {node} of selected) {
      const element = node.nodeType === Node.TEXT_NODE ? node.parentElement! : node as HTMLElement;
      const css = getComputedStyle(element);
      const value = parseFloat(css.lineHeight) / parseFloat(css.fontSize);
      if (Number.isFinite(value)) values.add(Number(value.toFixed(2)));
    }
  }
  return {value: values.size === 1 ? [...values][0] : null, wholeParagraphs: groups.some(group => group.whole)};
}

export function validSelectionLeading(value: number) {
  return Number.isFinite(value) && value >= 1 && value <= 4;
}

function unwrapSpacing(element: HTMLElement) {
  element.removeAttribute('data-editor-spacing-flow');
  element.removeAttribute('data-editor-spacing-run');
  element.style.removeProperty('line-height');
  element.style.removeProperty('--editor-natural-leading');
  if (!element.style.length) element.removeAttribute('style');
  if (!element.attributes.length) element.replaceWith(...element.childNodes);
}

// A separate inline formatting context allows tightly spaced selected lines to
// shrink below the paragraph's default line box. It contains just one inline
// group, so a nested list or table keeps its own paragraph settings.
function flowFor(block: HTMLElement, node: Node) {
  let child = node;
  while (child.parentNode && child.parentNode !== block) child = child.parentNode;
  if (child instanceof HTMLElement && child.matches(flowSelector)) return child;
  const boundary = (n: Node | null) => n instanceof HTMLElement && n.matches(blockBoundary + ',' + flowSelector + ',[contenteditable="false"]');
  let first = child;
  while (first.previousSibling && !boundary(first.previousSibling)) first = first.previousSibling;
  const flow = document.createElement('span');
  flow.dataset.editorSpacingFlow = '';
  if (block.style.lineHeight && (block.hasAttribute('data-editor-line-height') || !block.closest('[data-page-leading]'))) {
    flow.style.setProperty('--editor-natural-leading', block.style.lineHeight);
  }
  block.insertBefore(flow, first);
  let next: Node | null = first;
  while (next && !boundary(next)) {
    const sibling: Node | null = next.nextSibling;
    flow.append(next);
    next = sibling;
  }
  return flow;
}

function formatPartial({block, selected}: Target, leading: number) {
  const marked = new Set<Atom>();
  const flows = new Set<HTMLElement>();
  for (const slice of selected) {
    let node = slice.node;
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node as Text;
      if (slice.end < text.length) text.splitText(slice.end);
      if (slice.start) node = text.splitText(slice.start);
      slice.node = node;
    }
    marked.add(node);
    flows.add(flowFor(block, node));
  }
  for (const flow of flows) {
    const pieces = atoms(flow).map(node => {
      const old = node.parentElement?.closest<HTMLElement>(runSelector);
      return {node, value: marked.has(node) ? String(leading) : old?.dataset.editorSpacingRun || ''};
    });
    for (const run of Array.from(flow.querySelectorAll<HTMLElement>(runSelector)).reverse()) unwrapSpacing(run);
    // A legacy word-level override must keep its leading on the unselected
    // words without setting a minimum height for every line in the new range.
    for (const inline of flow.querySelectorAll<HTMLElement>('[style]')) {
      if (!inline.style.lineHeight || inline.closest('[contenteditable="false"]')) continue;
      const authored = inline.hasAttribute('data-editor-typography') || inline.style.getPropertyPriority('line-height') === 'important';
      if (authored || (!block.closest('[data-page-leading]') && !block.matches('h1,h2,h3,h4,h5,h6'))) {
        inline.style.setProperty('--editor-natural-leading', inline.style.lineHeight);
      }
      inline.style.removeProperty('line-height');
    }
    for (const {node, value} of pieces) {
      const run = document.createElement('span');
      run.dataset.editorSpacingRun = value;
      if (value) run.style.setProperty('line-height', value, 'important');
      node.replaceWith(run);
      run.append(node);
    }
  }
}

export function applySelectionSpacing(range: Range | null, change: SpacingChange) {
  if (!range || ('leading' in change && !validSelectionLeading(change.leading))) return false;
  const groups = targets(range);
  const applicable = 'remove' in change ? groups.filter(group => group.whole) : groups;
  if (!applicable.length) return false;
  const editor = editorForRange(range)!;
  const selection = editor.ownerDocument.getSelection();
  editor.focus({preventScroll:true});
  selection?.removeAllRanges();
  selection?.addRange(range);
  editor.dispatchEvent(new InputEvent('beforeinput', {bubbles:true, inputType:'formatBlock'}));
  for (const group of applicable) {
    const {block} = group;
    if ('remove' in change) {
      block.style.setProperty(change.remove === 'before' ? 'margin-block-start' : 'margin-block-end', '0', 'important');
    } else if (group.whole) {
      for (const wrapper of Array.from(block.querySelectorAll<HTMLElement>(runSelector + ',' + flowSelector)).reverse()) unwrapSpacing(wrapper);
      block.dataset.editorLineHeight = 'true';
      block.style.setProperty('line-height', String(change.leading), 'important');
      for (const inline of block.querySelectorAll<HTMLElement>('[style]')) {
        inline.style.removeProperty('line-height');
        inline.style.removeProperty('--editor-natural-leading');
      }
    } else {
      formatPartial(group, change.leading);
    }
  }
  if ('leading' in change) {
    const first = groups[0].selected[0].node, last = groups.at(-1)!.selected.at(-1)!.node;
    const next = document.createRange();
    if (first.nodeType === Node.TEXT_NODE) next.setStart(first, 0); else next.setStartBefore(first);
    if (last.nodeType === Node.TEXT_NODE) next.setEnd(last, (last as Text).length); else next.setEndAfter(last);
    selection?.removeAllRanges();
    selection?.addRange(next);
  }
  editor.dispatchEvent(new Event('input', {bubbles:true}));
  document.dispatchEvent(new Event('selectionchange'));
  return true;
}
