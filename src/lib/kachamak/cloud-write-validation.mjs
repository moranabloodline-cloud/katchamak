import {validEditorAppearance} from './page-format-validation.mjs';
import {isReadableProject} from './project-validation.ts';
import {CLOUD_NOTE_LEVELS} from './utils.ts';

export function validCloudLibrary(value) {
  if (!value || !Array.isArray(value.novels) || !Array.isArray(value.collections)) return false;
  if(value.editorAppearance!==undefined&&!validEditorAppearance(value.editorAppearance))return false;
  const ids = new Set(), collections = new Map();
  const validId = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(id);
  const validTarget=t=>t===undefined||!!t&&typeof t==='object'&&!Array.isArray(t)&&[t.amount,t.minimum,t.allowance].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=10000000)&&t.minimum<=t.amount&&['words','characters'].includes(t.unit)&&[t.showOverrun,t.showAllowance,t.notifications].every(v=>typeof v==='boolean');
  const visit = (nodes, seen, depth = 0) => Array.isArray(nodes) && depth <= CLOUD_NOTE_LEVELS && nodes.every(n => n && validId(n.id) && !seen.has(n.id) && (seen.add(n.id), typeof n.title === 'string' && typeof n.content === 'string' && (n.timelineKind===undefined||['event','period'].includes(n.timelineKind)) && (n.event===undefined||!!n.event&&Number.isSafeInteger(n.event.start)&&Math.abs(n.event.start)<=8e15&&(n.event.end===undefined||Number.isSafeInteger(n.event.end)&&n.event.end>=n.event.start&&n.event.end<=8e15)&&['year','month','day','time'].includes(n.event.precision)&&(n.event.endPrecision===undefined||['year','month','day','time'].includes(n.event.endPrecision))) && validTarget(n.documentTarget) && (n.image === undefined || typeof n.image === 'string' && n.image.length <= 700000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(n.image)) && (n.event?.cardStyle===undefined||['image','color'].includes(n.event.cardStyle)) && (n.event?.cardColor===undefined||typeof n.event.cardColor==='string'&&/^#[a-f0-9]{6}$/i.test(n.event.cardColor)) && (n.event?.cardOpacity===undefined||Number.isFinite(n.event.cardOpacity)&&n.event.cardOpacity>=0&&n.event.cardOpacity<=1) && (n.event?.cardDetail===undefined||['title','dates','synopsis'].includes(n.event.cardDetail)) && (n.event?.type===undefined || n.event.type==='event'&&n.event.end===undefined || n.event.type==='period'&&Number.isSafeInteger(n.event.end)&&n.event.end>n.event.start) && (n.event?.banner === undefined || typeof n.event.banner === 'string' && n.event.banner.length <= 700000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(n.event.banner)) && (n.aliases === undefined || (Array.isArray(n.aliases) && n.aliases.length <= 100 && n.aliases.every(a => typeof a === 'string' && a.length <= 500))) && visit(n.children, seen, depth + 1)));
  const metadataLabels=(items,limit)=>items===undefined||Array.isArray(items)&&items.length<=limit&&items.every(item=>typeof item==='string'&&!!item.trim()&&item.length<=100)&&new Set(items.map(item=>item.trim().toLocaleLowerCase())).size===items.length;
  for (const n of value.novels) {
    // Write-only gate: never accept a project that the existing reader rejects.
    // Keep GET/legacy migrations unchanged; validation must not rewrite data.
    try { if (!isReadableProject(n)) return false; } catch { return false; }
    const eras=n?.timeline?.calendar?.eras;
    if(eras!==undefined&&(!Array.isArray(eras)||eras.some(era=>era?.color!==undefined&&(typeof era.color!=='string'||!/^#[a-f0-9]{6}$/i.test(era.color)))))return false;
    if(n?.tabOrder!==undefined&&(!Array.isArray(n.tabOrder)||n.tabOrder.length>10000||new Set(n.tabOrder).size!==n.tabOrder.length||!n.tabOrder.every(key=>typeof key==='string'&&(/^(binder|codex|planning|research|templates|prompts|timeline|family|gallery)$/.test(key)||/^note:[a-zA-Z0-9_-]{1,128}$/.test(key)))))return false;
    if (!n || !validId(n.id) || ids.has(n.id) || typeof n.title !== 'string' || typeof n.author !== 'string' || !n.sections) return false;
    if ((n.series !== undefined && (typeof n.series !== 'string' || n.series.length > 200)) || (n.seriesIndex !== undefined && (typeof n.seriesIndex !== 'string' || n.seriesIndex.length > 100)) || (n.archived !== undefined && typeof n.archived !== 'boolean')) return false;
    if((n.targetAudience!==undefined&&(typeof n.targetAudience!=='string'||n.targetAudience.length>2000))||(n.explicitContent!==undefined&&typeof n.explicitContent!=='boolean')||!metadataLabels(n.tones,8)||!metadataLabels(n.writingStyles,12)||!metadataLabels(n.plotTechniques,12)||!metadataLabels(n.sellingPoints,12))return false;
    if((n.language!==undefined&&(typeof n.language!=='string'||n.language.length>100))||!metadataLabels(n.genres,4)||!metadataLabels(n.subgenres,12)||(n.chapterCount!==undefined&&(!Number.isSafeInteger(n.chapterCount)||n.chapterCount<1||n.chapterCount>1000)))return false;
    if (n.cover?.image !== undefined && (typeof n.cover.image !== 'string' || n.cover.image.length > 700000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(n.cover.image))) return false;
    ids.add(n.id);
    const seen = new Set();
    for(const key of ['timeline','family'])if(n.sections[key]!==undefined&&!visit(n.sections[key],seen))return false;
    for (const key of ['binder','codex','planning','research','templates','prompts']) if (!visit(n.sections[key], seen)) return false;
  }
  for (const c of value.collections) {
    if (!c || !validId(c.id) || collections.has(c.id) || typeof c.name !== 'string' || !c.name.trim() || !Array.isArray(c.projectIds) || !c.projectIds.every(id => ids.has(id))) return false;
    collections.set(c.id, c);
  }
  for (const c of value.collections) {
    const seen = new Set([c.id]); let parent = c.parentId;
    while (parent !== null) { if (seen.has(parent) || !collections.has(parent)) return false; seen.add(parent); parent = collections.get(parent).parentId; }
  }
  return true;
}
