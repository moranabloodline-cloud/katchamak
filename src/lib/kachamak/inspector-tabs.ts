import { INSPECTOR_TABS, SECTION_KEYS, type InspectorTabKey, type Novel, type SectionKey, type TabKey, type ViewMode } from './types';

export type InspectorSettings = {hidden: InspectorTabKey[]; selected?: InspectorTabKey; width?: number; open?: boolean};
export type CanvasInspectorTab = 'info' | 'tools';
export type CanvasInspectorSettings = {selected?: CanvasInspectorTab; width?:number; open?:boolean};
type InspectorBook = Pick<Novel, 'inspectorByTab' | 'hiddenInspectorTabs'>;

export function inspectorSettings(book: InspectorBook, workspace: TabKey): InspectorSettings {
  return book.inspectorByTab?.[workspace] ?? {hidden: book.hiddenInspectorTabs ?? []};
}

type PanelState = {
  activeNovelId: string | null; activeTab: TabKey; view: ViewMode; novels: Novel[];
  rightPanelWidth: number; rightPanelOpen: boolean;
};

const MIN_WIDTH = 190;
const MAX_WIDTH = 680;
export function clampInspectorWidth(px: number) {
  return Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, px)));
}

function currentSettings(state: PanelState) {
  const book = state.novels.find(book => book.id === state.activeNovelId);
  return book?.inspectorByTab?.[state.view === 'homepage' ? 'homepage' : state.activeTab];
}

export function inspectorWidth(state: PanelState) {
  return currentSettings(state)?.width ?? state.rightPanelWidth;
}

export function inspectorOpen(state: PanelState) {
  if (state.activeTab === 'gallery' && state.view !== 'homepage') return false;
  return currentSettings(state)?.open ?? state.rightPanelOpen;
}

export function withInspectorLayout(book: Novel, state: PanelState, layout: {width: number} | {open: boolean}) {
  if (book.id !== state.activeNovelId || (state.activeTab === 'gallery' && state.view !== 'homepage')) return book;
  if ('width' in layout ? layout.width === inspectorWidth(state) : layout.open === inspectorOpen(state)) return book;

  if (state.view === 'homepage') {
    return {...book, inspectorByTab: {...book.inspectorByTab, homepage: {...book.inspectorByTab?.homepage, ...layout}}};
  }
  const tab = state.activeTab;
  const settings = {...inspectorSettings(book, tab), ...layout};
  return {...book, inspectorByTab: {...book.inspectorByTab, [tab]: settings}};
}

export function selectedInspectorTab(settings: InspectorSettings, workspace: TabKey) {
  const preferred = settings.selected ?? (workspace === 'family' ? 'family' : workspace === 'timeline' ? 'details' : 'info');
  return settings.hidden.includes(preferred)
    ? INSPECTOR_TABS.find(tab => !settings.hidden.includes(tab.key))?.key
    : preferred;
}

export function changeInspectorTab(
  book: InspectorBook, workspace: TabKey, key: InspectorTabKey, action: 'hide' | 'show' | 'select'
): InspectorSettings | null {
  const settings = inspectorSettings(book, workspace);
  if (action === 'hide') {
    if (settings.hidden.includes(key)) return null;
    const visible = INSPECTOR_TABS.filter(tab => !settings.hidden.includes(tab.key));
    const index = visible.findIndex(tab => tab.key === key);
    const selected = selectedInspectorTab(settings, workspace) === key
      ? (visible[index + 1] ?? visible[index - 1])?.key : settings.selected;
    return {...settings, hidden: [...settings.hidden, key], selected};
  }
  if (settings.hidden.includes(key)) {
    return action === 'show' ? {...settings, hidden: settings.hidden.filter(tab => tab !== key), selected: key} : null;
  }
  return settings.selected === key ? null : {...settings, selected: key};
}

const isInspectorKey = (value: unknown) => INSPECTOR_TABS.some(tab => tab.key === value);
export function validHiddenInspectorTabs(value: unknown) {
  return Array.isArray(value) && value.length <= INSPECTOR_TABS.length &&
    new Set(value).size === value.length && value.every(isInspectorKey);
}

export function validInspectorByTab(value: unknown) {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([tab, settings]) =>
    settings && typeof settings === 'object' && !Array.isArray(settings) &&
    (settings.width === undefined || Number.isInteger(settings.width) && settings.width >= MIN_WIDTH && settings.width <= MAX_WIDTH) &&
    (settings.open === undefined || typeof settings.open === 'boolean') &&
    (tab === 'homepage'
      ? settings.hidden === undefined && (settings.selected === undefined || settings.selected === 'info' || settings.selected === 'tools')
      : (SECTION_KEYS.includes(tab as SectionKey) || tab === 'trash' || (tab.startsWith('note:') && tab.length > 5)) &&
        validHiddenInspectorTabs(settings.hidden) && (settings.selected === undefined ||
          (isInspectorKey(settings.selected) && !settings.hidden.includes(settings.selected)))));
}
