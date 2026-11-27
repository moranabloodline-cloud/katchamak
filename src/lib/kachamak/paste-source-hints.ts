import {pastedTableStyleAttribute} from './paste-table-style';

export const sourceThemeAttribute = 'data-draftopus-source-theme';

const systemText = '-apple-system-body, ui-sans-serif, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, "Segoe UI Emoji", "Segoe UI Symbol", sans-serif';
const textSizes: Record<string, [number,number]> = {
  '3xs':[9,9], '2xs':[10,13], xs:[12,16], sm:[14,20], md:[16,26],
  lg:[18,28], xl:[20,28], '2xl':[24,32], '3xl':[30,36],
};
const captionSizes: Record<string, number> = {xs:10,sm:11,md:12,lg:14,xl:16};

export function copiedTheme(element: HTMLElement) {
  const saved=element.getAttribute(sourceThemeAttribute);
  if (saved==='dark' || saved==='light') return saved;
  const theme=element.getAttribute('data-theme');
  if ((theme==='dark' || theme==='light') && element.matches('div,article,section') &&
    element.querySelector('[data-d-text-flow][data-d-component]')) return theme;
}

// Some composed answers carry presentation roles instead of a style sheet.
// Convert those roles into ordinary typography inside the pasted fragment.
export function copiedTextHints(element: HTMLElement) {
  const component=element.getAttribute('data-d-component');
  if (!element.hasAttribute('data-d-text-flow') ||
    (component!=='text' && component!=='title' && component!=='caption')) return;
  const inline=element.hasAttribute('data-d-inline');
  const sizeName=element.getAttribute('data-d-size') ?? '';
  const caption=component==='caption';
  let [size,leading]=Object.hasOwn(textSizes,sizeName) ? textSizes[sizeName] : textSizes.md;
  if (caption) {
    size=Object.hasOwn(captionSizes,sizeName) ? captionSizes[sizeName] : 12;
    leading=size*1.3;
  }
  if (!sizeName && element.closest('td,th')?.closest('[data-d-component="table"],['+pastedTableStyleAttribute+'="rows"]')) {
    size=14;
    leading=20;
  }
  const previous=element.previousElementSibling;
  const card=element.parentElement?.matches('[data-d-component="grid-item"],[data-draftopus-layout="card"]');
  let marginTop='';
  if (!inline) {
    if (!previous) marginTop='0px';
    else if (caption) marginTop='4px';
    else if (component!=='title' || card) marginTop='8px';
    else marginTop=previous.matches('h1,h2,h3,h4,h5,h6') ? '16px' : '24px';
  }
  return {
    family: systemText,
    size: inline && !sizeName ? '' : size+'px',
    leading: inline && !sizeName ? '' : Number(leading.toFixed(2))+'px',
    color: caption ? 'var(--draftopus-source-secondary, var(--muted-foreground))' : '',
    marginTop,
    marginBottom: inline ? '' : '0px',
    weight: component==='title' || element.hasAttribute('data-d-default-strong') ? '600' : '',
  };
}
