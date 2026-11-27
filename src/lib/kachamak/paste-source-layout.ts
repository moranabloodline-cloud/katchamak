export const sourceFlowAttribute = 'data-draftopus-flow';
export const sourceSizeAttribute = 'data-draftopus-size';
const sourceTracks = '--draftopus-paste-tracks';
const sourceSize = '--draftopus-paste-size';
const blockTags = 'div,section,article,figure,aside,ul,ol,dl';
const namedSizes: Record<string, string> = {
  '3xs': '.7em', '2xs': '.75em', xs: '.8em', sm: '.9em', md: '1em',
  lg: '1.075em', xl: '1.25em', '2xl': '1.5em', '3xl': '1.85em',
};
const namedWeights: Record<string, string> = {normal:'400',medium:'500',semibold:'600',bold:'700'};

export function sourceLength(value: string, maxPixels: number, maxPercent = 0): string {
  if (value === '0' || value === '0px') return '0px';
  const match = /^(\d+(?:\.\d+)?|\.\d+)(px|pt|em|rem|%)$/i.exec(value.trim());
  if (!match) return '';
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === '%') return amount <= maxPercent ? amount + '%' : '';
  const pixels = amount * (unit === 'pt' ? 4 / 3 : unit === 'px' ? 1 : 16);
  return pixels <= maxPixels ? amount + unit : '';
}

function spacing(value: string, max: number) {
  const fallback = /^calc\(\s*var\(\s*--[\w-]+,\s*([\d.]+)(px|rem|em|pt)\s*\)\s*\*\s*([\d.]+)\s*\)$/i.exec(value);
  const length = fallback ? Number(fallback[1]) * Number(fallback[3]) + fallback[2] : value;
  return sourceLength(length, max);
}

function tracks(value: string) {
  if (!value || value.length > 240 || value === 'none') return '';
  // Only CSS track lengths and grid's sizing functions can reach the note.
  const rest = value.replace(/\b(?:repeat|minmax|fit-content|auto-fit|auto-fill|min-content|max-content|auto)\b|(?:\d+(?:\.\d+)?|\.\d+)(?:px|pt|rem|em|ch|fr|%)?/gi, '');
  if (!/^[\s(),]*$/.test(rest) ||
    Array.from(value.matchAll(/\brepeat\(\s*(\d+)/gi)).some(match => Number(match[1]) > 12)) return '';
  return value;
}

function flowOf(element: HTMLElement, source: CSSStyleDeclaration) {
  const saved = element.getAttribute(sourceFlowAttribute);
  if (saved === 'spacer' || element.getAttribute('data-d-component') === 'spacer') return 'spacer';
  if (!element.matches(blockTags)) return;
  if (saved === 'grid' || saved === 'row' || saved === 'column') return saved;
  const component = element.getAttribute('data-d-component');
  const direction = component && element.getAttribute('data-d-direction');
  if (component === 'grid' || /^(?:inline-)?grid$/.test(source.display) || tracks(source.gridTemplateColumns)) return 'grid';
  if (/^(?:inline-)?flex$/.test(source.display)) return source.flexDirection.startsWith('column') ? 'column' : 'row';
  if (component === 'row' || direction === 'row') return 'row';
  if (component === 'col' || direction === 'col' && element.childElementCount > 1) return 'column';
}

function safeColor(value: string) {
  return /^(?:#[\da-f]{3,8}|rgba?\([\d.,% /]+\)|[a-z]{1,24})$/i.test(value) ? value : '';
}

function boxStyle(element: HTMLElement, source: CSSStyleDeclaration, style: CSSStyleDeclaration) {
  style.width = sourceLength(source.width, 1600, 100);
  style.maxWidth = sourceLength(source.maxWidth, 1600, 100);
  style.height = sourceLength(source.height, 1200);
  style.minHeight = sourceLength(source.minHeight, 320);
  if (/^(?:auto\s+)?\d+(?:\.\d+)?\s*\/\s*[1-9]\d*(?:\.\d+)?$/.test(source.aspectRatio)) {
    style.aspectRatio = source.aspectRatio;
  }
  for (const property of ['marginTop','marginBottom','marginLeft','marginRight','paddingTop','paddingBottom','paddingLeft','paddingRight'] as const) {
    style[property] = spacing(source[property], 64);
  }
  const corners = source.borderRadius.trim().split(/\s+/).map(value=>sourceLength(value, 64, 100));
  if (corners.length <= 4 && corners.every(Boolean)) style.borderRadius = corners.join(' ');
  if (['solid','dashed','dotted','double'].includes(source.borderStyle) && sourceLength(source.borderWidth, 8)) {
    style.borderStyle = source.borderStyle;
    style.borderWidth = source.borderWidth;
    style.borderColor = safeColor(source.borderColor) || 'var(--border)';
  }
  // Keep paint on bounded boxes and shapes. Browser paragraph copies can
  // include the entire source page's paper and text colors as inline CSS.
  if (element.matches('aside') || element.matches('div,span,section,article,figure') &&
    (style.width || style.height || style.aspectRatio || style.paddingTop || style.borderWidth)) {
    const background = safeColor(source.backgroundColor);
    if (background !== 'transparent') style.backgroundColor = background;
    if (!style.backgroundColor && /^var\(--(?:color-surface|draftopus|muted)[\w-]*\)$/.test(source.backgroundColor)) {
      style.backgroundColor = 'var(--muted)';
    }
    if (style.backgroundColor) style.color = safeColor(source.color);
  }
}

export function pastedSourceStyle(element: HTMLElement, source: CSSStyleDeclaration, style: CSSStyleDeclaration) {
  const attributes: Record<string,string> = {};
  const flow = flowOf(element, source);
  if (flow) attributes[sourceFlowAttribute] = flow;
  if (flow === 'grid') {
    const columns = tracks(source.getPropertyValue(sourceTracks).trim() || source.gridTemplateColumns);
    if (columns) style.setProperty(sourceTracks, columns);
  }
  if (flow && flow !== 'spacer') {
    style.columnGap = spacing(source.columnGap || source.gap, 64);
    style.rowGap = spacing(source.rowGap || source.gap, 64);
    if (['start','end','flex-start','flex-end','center','baseline','stretch'].includes(source.alignItems)) style.alignItems = source.alignItems;
    if (['start','end','flex-start','flex-end','center','space-between','space-around','space-evenly'].includes(source.justifyContent)) style.justifyContent = source.justifyContent;
    if (['wrap','nowrap','wrap-reverse'].includes(source.flexWrap)) style.flexWrap = source.flexWrap;
    if ((flow==='row' && source.flexDirection==='row-reverse') || (flow==='column' && source.flexDirection==='column-reverse')) {
      style.flexDirection = source.flexDirection;
    }
  }
  if (element.matches(blockTags+',p,span,h1,h2,h3,h4,h5,h6,blockquote,figcaption')) {
    boxStyle(element, source, style);
  }
  // Preserve item sizing and placement as well as the container's layout.
  for (const key of ['flexGrow','flexShrink'] as const) {
    if (source[key] && Number(source[key]) >= 0 && Number(source[key]) <= 12) style[key] = source[key];
  }
  style.flexBasis = source.flexBasis === 'auto' ? 'auto' : sourceLength(source.flexBasis, 1600, 100);
  if (['start','end','flex-start','flex-end','center','baseline','stretch'].includes(source.alignSelf)) style.alignSelf = source.alignSelf;
  for (const [key, hint] of [['gridColumn','--grid-item-column'],['gridRow','--grid-item-row']] as const) {
    const placement = source[key] || source.getPropertyValue(hint).trim();
    if (/^(?:(?:span\s+)?[1-9]\d?|auto)(?:\s*\/\s*(?:(?:span\s+)?[1-9]\d?|auto))?$/.test(placement)) style[key] = placement;
  }
  if (/^-?\d{1,2}$/.test(source.order)) style.order = source.order;
  const component = element.getAttribute('data-d-component');
  const sizeHint = component ? namedSizes[element.getAttribute('data-d-size') ?? ''] : '';
  const cssSize = sourceLength(source.getPropertyValue(sourceSize).trim() || source.fontSize, 72);
  const font = cssSize || sizeHint;
  if (font && Number.parseFloat(font) > 0) {
    attributes[sourceSizeAttribute] = '';
    style.setProperty(sourceSize, font);
  }
  const weight = component ? namedWeights[element.getAttribute('data-d-weight') ?? ''] : '';
  if (source.fontWeight === 'bold' || Number(source.fontWeight) >= 600) style.fontWeight = 'bold';
  else if (source.fontWeight === 'normal' || /^\d{3}$/.test(source.fontWeight)) style.fontWeight = source.fontWeight;
  else if (weight) style.fontWeight = weight;
  return {attributes,flow};
}
