import { INSPECTOR_TABS, SECTION_KEYS, type InspectorTabKey, type Novel, type SectionKey, type TabKey } from './types';

export type InspectorSettings = {hidden: InspectorTabKey[]; selected?: InspectorTabKey};
type InspectorBook = Pick<Novel, 'inspectorByTab' | 'hiddenInspectorTabs'>;

export function inspectorSettings(book: InspectorBook, workspace: TabKey): InspectorSettings {
  return book.inspectorByTab?.[workspace] ?? {hidden: book.hiddenInspectorTabs ?? []};
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
    return {hidden: [...settings.hidden, key], selected};
  }
  if (settings.hidden.includes(key)) {
    return action === 'show' ? {hidden: settings.hidden.filter(tab => tab !== key), selected: key} : null;
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
    (SECTION_KEYS.includes(tab as SectionKey) || tab === 'trash' || (tab.startsWith('note:') && tab.length > 5)) &&
    settings && typeof settings === 'object' && !Array.isArray(settings) &&
    validHiddenInspectorTabs(settings.hidden) && (settings.selected === undefined ||
      (isInspectorKey(settings.selected) && !settings.hidden.includes(settings.selected))));
}
