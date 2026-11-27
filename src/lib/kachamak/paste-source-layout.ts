import {copiedTextHints, copiedTheme, sourceThemeAttribute} from './paste-source-hints';

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
const legacyFontSizes = ['','10px','13px','16px','18px','24px','32px','48px'];
const palette: Record<string, string> = {
  'color-text':'text', 'color-text-prose':'text', 'color-text-primary':'text',
  'color-text-secondary':'secondary', 'color-text-tertiary':'tertiary',
  'color-surface':'paper', 'color-surface-secondary':'surface',
  'color-surface-tertiary':'surface', 'color-surface-elevated':'elevated',
  'color-border':'border', 'color-border-subtle':'border',
};
const radii: Record<string,string> = {xs:'4px',sm:'8px',md:'10px',lg:'12px',xl:'16px','2xl':'20px'};

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

function signedLength(value: string, max: number, percent = 0) {
  if (!value.startsWith('-')) return sourceLength(value,max,percent);
  const length=sourceLength(value.slice(1),max,percent);
  return length ? '-'+length : '';
}

export function sourceAspectRatio(value: string) {
  return /^(?:auto\s+)?\d+(?:\.\d+)?\s*\/\s*[1-9]\d*(?:\.\d+)?$/.test(value) ? value : '';
}

export function sourceRadius(value: string) {
  const token=/^var\(--dil-radius-([\w]+)\)$/.exec(value.trim());
  if (token && Object.hasOwn(radii,token[1])) return radii[token[1]];
  const corners=value.trim().split(/\s+/).map(length=>sourceLength(length,64,100));
  return corners.length<=4 && corners.every(Boolean) ? corners.join(' ') : '';
}

export function sourceObjectPosition(value: string) {
  if (!value || value.length>64) return '';
  const parts=value.trim().split(/\s+/);
  return parts.length<=4 && parts.every(part=>/^(?:left|right|center|top|bottom)$/i.test(part) || signedLength(part,800,200)) ? value : '';
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

function colorLiteral(value: string) {
  return /^(?:#[\da-f]{3,8}|[a-z]{1,24}|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([\da-z.,%+ /-]+\))$/i.test(value) ? value : '';
}

function sourceColor(value: string) {
  const variable=/^var\(\s*--([\w-]+)(?:,\s*(.+))?\)$/.exec(value.trim());
  if (!variable) return colorLiteral(value);
  const name=variable[1];
  if (Object.hasOwn(palette,name)) return 'var(--draftopus-source-'+palette[name]+')';
  if (/^(?:draftopus-source-(?:text|secondary|tertiary|paper|surface|elevated|border)|muted|muted-foreground|border)$/.test(name)) {
    return 'var(--'+name+')';
  }
  return colorLiteral(variable[2] ?? '');
}

function fontFamily(value: string) {
  if (value.length>320) return '';
  const families=value.split(',').map(family=>family.trim());
  return families.every(family=>/^(?:"[\p{L}\p{N} ._+-]+"|'[\p{L}\p{N} ._+-]+'|[\p{L}\p{N} ._+-]+)$/u.test(family))
    ? families.join(', ') : '';
}

function boxStyle(source: CSSStyleDeclaration, style: CSSStyleDeclaration) {
  style.width = sourceLength(source.width, 1600, 100);
  style.maxWidth = sourceLength(source.maxWidth, 1600, 100);
  style.height = sourceLength(source.height, 1200);
  style.minHeight = sourceLength(source.minHeight, 320);
  style.aspectRatio = sourceAspectRatio(source.aspectRatio);
  style.borderRadius = sourceRadius(source.borderRadius);
  for (const property of ['paddingTop','paddingBottom','paddingLeft','paddingRight','paddingInlineStart','paddingInlineEnd','paddingBlockStart','paddingBlockEnd'] as const) {
    style[property] = spacing(source[property], 64);
  }
  for (const property of ['marginLeft','marginRight','marginInlineStart','marginInlineEnd'] as const) {
    style[property] = source[property]==='auto' ? 'auto' : signedLength(source[property],96,30);
  }
  if (style.aspectRatio && source.overflow==='hidden') style.overflow='hidden';
  if (['solid','dashed','dotted','double'].includes(source.borderStyle) && sourceLength(source.borderWidth, 8)) {
    style.borderStyle = source.borderStyle;
    style.borderWidth = source.borderWidth;
    style.borderColor = sourceColor(source.borderColor) || 'var(--border)';
  } else {
    for (const side of ['Top','Right','Bottom','Left'] as const) {
      const width=sourceLength(source[`border${side}Width`],8);
      const line=source[`border${side}Style`];
      if (width && ['solid','dashed','dotted','double'].includes(line)) {
        style[`border${side}`]=width+' '+line+' '+(sourceColor(source[`border${side}Color`]) || 'currentColor');
      }
    }
  }
}

export function pastedSourceStyle(element: HTMLElement, source: CSSStyleDeclaration, style: CSSStyleDeclaration) {
  const attributes: Record<string,string> = {};
  const theme=copiedTheme(element);
  if (theme) attributes[sourceThemeAttribute]=theme;
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
  if (element.matches(blockTags+',p,span,h1,h2,h3,h4,h5,h6,blockquote,figcaption,table,td,th,pre,li,hr') ||
    element.matches('[role="separator"],[data-d-component="divider"]')) {
    boxStyle(source, style);
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
  const component=element.getAttribute('data-d-component');
  const hints=copiedTextHints(element);
  const sizeName=element.getAttribute('data-d-size') ?? '';
  const htmlFont=element.matches('font');
  const font=sourceLength(source.getPropertyValue(sourceSize).trim() || source.fontSize, 96, 600) ||
    (htmlFont && legacyFontSizes[Number(element.getAttribute('size'))]) ||
    hints?.size || (component && Object.hasOwn(namedSizes,sizeName) ? namedSizes[sizeName] : '');
  if (font && Number.parseFloat(font)>0) {
    attributes[sourceSizeAttribute] = '';
    style.setProperty(sourceSize, font);
  }
  const family=fontFamily(source.fontFamily || (htmlFont ? element.getAttribute('face') ?? '' : '')) || hints?.family;
  if (family) style.setProperty('font-family',family,'important');
  const weightName=element.getAttribute('data-d-weight') ?? '';
  const weight=/^(?:[1-9]\d{0,2}|1000|normal|bold|bolder|lighter)$/.test(source.fontWeight)
    ? source.fontWeight : component && Object.hasOwn(namedWeights,weightName) ? namedWeights[weightName] : hints?.weight;
  if (weight) style.setProperty('font-weight',weight,'important');
  const lineHeight=Number(source.lineHeight);
  const leading=(lineHeight>=.8 && lineHeight<=4 ? source.lineHeight : sourceLength(source.lineHeight,96,400)) || hints?.leading;
  if (leading && Number.parseFloat(leading)>0) {
    style.setProperty('line-height',leading,'important');
    attributes['data-editor-line-height']='';
  }
  const background=sourceColor(source.backgroundColor || element.getAttribute('bgcolor') || '');
  if (background && background!=='transparent') style.backgroundColor=background;
  style.color=sourceColor(source.color || (htmlFont ? element.getAttribute('color') ?? '' : '')) || hints?.color || '';
  style.textDecorationColor=sourceColor(source.textDecorationColor);
  if (['solid','double','dotted','dashed','wavy'].includes(source.textDecorationStyle)) style.textDecorationStyle=source.textDecorationStyle;
  style.letterSpacing=signedLength(source.letterSpacing,12);
  style.wordSpacing=signedLength(source.wordSpacing,24);
  if (['uppercase','lowercase','capitalize','none'].includes(source.textTransform)) style.textTransform=source.textTransform;
  if (source.fontVariantNumeric==='tabular-nums' || element.getAttribute('data-d-tabular-nums')==='true') style.fontVariantNumeric='tabular-nums';
  if (source.opacity && +source.opacity>=0 && +source.opacity<=1) style.opacity=source.opacity;
  const marginTop=signedLength(source.marginBlockStart || source.marginTop,96,30) ||
    (component==='grid' && element.previousElementSibling ? '16px' : hints?.marginTop);
  const marginBottom=signedLength(source.marginBlockEnd || source.marginBottom,96,30) || hints?.marginBottom;
  if (marginTop) style.setProperty('margin-top',marginTop,'important');
  if (marginBottom) style.setProperty('margin-bottom',marginBottom,'important');
  const indent=signedLength(source.textIndent,96,50);
  if (indent) style.setProperty('text-indent',indent,'important');
  return {attributes,flow};
}
