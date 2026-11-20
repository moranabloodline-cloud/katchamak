import type { Novel, SectionKey } from './types';
import { INSPECTOR_TABS, SECTION_KEYS } from './types';
import { validNovelMetadata, validCoverImage } from './project-settings';
import { validHiddenDetailBlocks, validDetailBlockOrder } from './detail-blocks';
import { validWorkspaceTabOrder } from './workspace-tabs';
import { validNoteFontSize, validNotePageSettings, validTabPageSettings } from './page-format';
import { validHomepage } from './homepage';
import { validDocumentTarget } from './document-target';
import {validFamilyMembers,validFamilyRelationships} from './family-tree';
import { validEvent, validTimelineExtra } from './story-calendar';

// The existing reader contract, shared with cloud writes. Do not normalize,
// strip unknown fields or impose newer schema requirements here.
// Check the structure before adding anything to persistent storage. In particular,
// malformed trees or covers can otherwise make the dashboard unusable on reload.
export function isReadableProject(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const n = value as Record<string, unknown>;
  if (typeof n.title !== "string" || !n.title.trim()) return false;
  if (n.author !== undefined && typeof n.author !== "string") return false;
  if (!n.cover || typeof n.cover !== "object" || Array.isArray(n.cover)) return false;
  const cover = n.cover as Record<string, unknown>;
  if (typeof cover.bg !== "string" || typeof cover.icon !== "string" || !validNovelMetadata({series:n.series,seriesIndex:n.seriesIndex,language:n.language,genres:n.genres,subgenres:n.subgenres,chapterCount:n.chapterCount,targetAudience:n.targetAudience,tones:n.tones,writingStyles:n.writingStyles,plotTechniques:n.plotTechniques,sellingPoints:n.sellingPoints,explicitContent:n.explicitContent,archived:n.archived,cover:{image:cover.image}})) return false;
  if (!n.sections || typeof n.sections !== "object" || Array.isArray(n.sections)) return false;
  const sections = n.sections as Record<string, unknown>;
  const isTree = (nodes: unknown): boolean => Array.isArray(nodes) && nodes.every((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const node = value as Record<string, unknown>;
    return typeof node.id === "string" && typeof node.title === "string" &&
      typeof node.kind === "string" && ["content", "synopsis", "notes", "status", "label"].every((key) => node[key] === undefined || typeof node[key] === "string") &&
      (node.ignoreAutoLinking === undefined || typeof node.ignoreAutoLinking === 'boolean') &&
      (node.aliases === undefined || Array.isArray(node.aliases) && node.aliases.every(v => typeof v === 'string')) &&
      validFamilyMembers(node.familyMembers) && validCoverImage(node.image) && validDocumentTarget(node.documentTarget) &&
      validNotePageSettings(node.pageSettings) && validNoteFontSize(node.bodyFontSize) && validHiddenDetailBlocks(node.hiddenDetailBlocks) &&
      validHiddenDetailBlocks(node.collapsedDetailBlocks) && validDetailBlockOrder(node.detailBlockOrder) &&
      (node.event === undefined || validEvent(node.event)) &&
      (node.timelineKind === undefined || (node.timelineKind==="event"||node.timelineKind==="period")) &&
      (node.linkChoices === undefined || Array.isArray(node.linkChoices) && node.linkChoices.every(c => c && Number.isInteger(c.start) && Number.isInteger(c.end) && c.start >= 0 && c.end > c.start && typeof c.text === 'string' && (c.targetId === null || typeof c.targetId === 'string'))) &&
      isTree(node.children);
  });
  if (!SECTION_KEYS.some((key) => key in sections) && !Array.isArray(n.codex)) return false;
  if (!Object.values(sections).every((nodes) => isTree(nodes))) return false;
  if (n.statuses !== undefined && (!Array.isArray(n.statuses) || !n.statuses.every((s) => typeof s === "string"))) return false;
  if (n.labels !== undefined && (!Array.isArray(n.labels) || !n.labels.every((label) => label && typeof label === "object" && typeof label.id === "string" && typeof label.name === "string" && typeof label.color === "string"))) return false;
  if (n.trash !== undefined && (!Array.isArray(n.trash) || !n.trash.every((t) =>
    t && typeof t === "object" && typeof t.id === "string" &&
    typeof t.section === "string" && SECTION_KEYS.includes(t.section as SectionKey) &&
    validFamilyRelationships(t.familyRelationships) && isTree([t.node])
  ))) return false;
  if (n.openNoteTabs !== undefined && (!Array.isArray(n.openNoteTabs) || !n.openNoteTabs.every(id => typeof id === 'string'))) return false;
  if(n.tabFormats!==undefined && (!n.tabFormats || typeof n.tabFormats!=='object' || Array.isArray(n.tabFormats) ||
    !Object.entries(n.tabFormats).every(([tab,settings])=>
      (tab==='homepage' || SECTION_KEYS.includes(tab as SectionKey) || (tab.startsWith('note:') && tab.length>5)) && validTabPageSettings(settings))))return false;
  if(!validHomepage(n.homepage))return false;
  if(!validFamilyRelationships(n.familyRelationships) || !validWorkspaceTabOrder(n.tabOrder) || !validWorkspaceTabOrder(n.hiddenTabs))return false;
  if (n.hiddenInspectorTabs !== undefined && (!Array.isArray(n.hiddenInspectorTabs) ||
      n.hiddenInspectorTabs.length > INSPECTOR_TABS.length || new Set(n.hiddenInspectorTabs).size !== n.hiddenInspectorTabs.length ||
      !n.hiddenInspectorTabs.every(key => INSPECTOR_TABS.some(tab => tab.key === key)))) return false;
  if (n.hiddenSections !== undefined && (!Array.isArray(n.hiddenSections) || !n.hiddenSections.every(k => ['planning','research','templates','prompts','family'].includes(k)))) return false;
  if (n.timeline !== undefined) {
    const t = n.timeline as Novel['timeline'];
    if (!t || typeof t !== 'object' || (t.rootId !== null && typeof t.rootId !== 'string') || !['titles','synopsis'].includes(t.detail) || typeof t.compact !== 'boolean') return false;
    if (!validTimelineExtra(t)) return false;
  }
  return true;
}
