import {validBookStyle} from './book-style';
import {validKanban} from './kanban';
import {validCurrency,validTransaction} from './finance';
import type { Novel, SectionKey } from './types';
import { validHiddenInspectorTabs, validInspectorByTab } from './inspector-tabs';
import { SECTION_KEYS } from './types';
import { validNovelMetadata } from './project-settings';
import { validHiddenDetailBlocks, validDetailBlockOrder } from './detail-blocks';
import { validWorkspaceTabOrder } from './workspace-tabs';
import { validNoteFontSize, validNotePageSettings, validTabPageSettings } from './page-format';
import {validProjectImage, projectImageRefs, availableProjectImage} from './project-image';
import { validGallery } from './gallery';
import { validHomepage, validHomePages } from './homepage';
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
  if(n.publishEnabled!==undefined && typeof n.publishEnabled!=='boolean')return false;
  if(n.financeCurrency!==undefined && !validCurrency(n.financeCurrency))return false;
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
      (node.bookStyle===undefined || validBookStyle(node.bookStyle)) && (node.kanban===undefined || validKanban(node.kanban)) && (node.transaction===undefined || validTransaction(node.transaction)) && validFamilyMembers(node.familyMembers) && validProjectImage(node.image) && validDocumentTarget(node.documentTarget) &&
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
  if(!validGallery(n.gallery) || !validHomepage(n.homepage) || !validHomePages(n.homePages))return false;
  if(!validFamilyRelationships(n.familyRelationships) || !validWorkspaceTabOrder(n.tabOrder) || !validWorkspaceTabOrder(n.hiddenTabs))return false;
  if (n.hiddenInspectorTabs !== undefined && !validHiddenInspectorTabs(n.hiddenInspectorTabs)) return false;
  if (!validInspectorByTab(n.inspectorByTab)) return false;
  if (n.hiddenSections !== undefined && (!Array.isArray(n.hiddenSections) || !n.hiddenSections.every(k => ['planning','research','templates','prompts','family','finance','kanban','publish'].includes(k)))) return false;
  if (n.timeline !== undefined) {
    const t = n.timeline as Novel['timeline'];
    if (!t || typeof t !== 'object' || (t.rootId !== null && typeof t.rootId !== 'string') || !['titles','synopsis'].includes(t.detail) || typeof t.compact !== 'boolean') return false;
    if (!validTimelineExtra(t)) return false;
  }
  const book=value as Novel;
  for(const ref of projectImageRefs(book))if(!availableProjectImage(book.gallery,ref))return false;
  return true;
}
