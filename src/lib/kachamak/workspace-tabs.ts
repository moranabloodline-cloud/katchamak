import {TABS,type Novel,type TabKey,type SectionKey,type ViewMode} from './types';
import {findNodeInNovel} from './utils';

export function validWorkspaceTabOrder(value:unknown):value is TabKey[]|undefined {
  return value===undefined||Array.isArray(value)&&value.length<=10000&&new Set(value).size===value.length&&value.every(key=>typeof key==='string'&&(/^(binder|codex|planning|research|templates|prompts|timeline|family)$/.test(key)||/^note:[a-zA-Z0-9_-]{1,128}$/.test(key)));
}
function availableTabs(novel:Novel) {
  return [...TABS.filter(tab=>tab.key!=='trash'&&tab.key!=='timeline'&&tab.key!=='family'),...(novel.openNoteTabs??[]).flatMap(id=>{
    const hit=findNodeInNovel(novel,id);return hit?[{key:`note:${id}` as TabKey,label:hit.node.title}]:[];
  }),...TABS.filter(tab=>tab.key==='timeline'||tab.key==='family')];
}
function rememberedOrder(novel:Novel,tabs=availableTabs(novel)) {
  return [...new Set([...(validWorkspaceTabOrder(novel.tabOrder)?novel.tabOrder??[]:[]),...tabs.map(tab=>tab.key)])];
}
export function isWorkspaceTabHidden(novel:Novel,key:TabKey) {
  return !!(novel.hiddenTabs?.includes(key) || novel.hiddenSections?.includes(key as SectionKey));
}
function orderedTabs(novel:Novel) {
  const tabs=availableTabs(novel), byKey=new Map(tabs.map(tab=>[tab.key,tab]));
  return rememberedOrder(novel,tabs).flatMap(key=>byKey.has(key)?[byKey.get(key)!]:[]);
}
export function workspaceTabs(novel:Novel,hidden=false) {
  return orderedTabs(novel).filter(tab=>isWorkspaceTabHidden(novel,tab.key)===hidden);
}
export function revealWorkspaceTab(novel:Novel,key:TabKey):Novel {
  if(!isWorkspaceTabHidden(novel,key))return novel;
  return {...novel,
    ...(novel.hiddenTabs?.includes(key)?{hiddenTabs:novel.hiddenTabs.filter(tab=>tab!==key)}:{}),
    ...(novel.hiddenSections?.includes(key as SectionKey)?{hiddenSections:novel.hiddenSections.filter(tab=>tab!==key)}:{})
  };
}
export function visibleTabLocation(novel:Novel,key:TabKey,view:ViewMode) {
  if(!isWorkspaceTabHidden(novel,key))return null;
  const tabs=orderedTabs(novel), index=tabs.findIndex(tab=>tab.key===key);
  const adjacent=[...tabs.slice(index+1),...tabs.slice(0,Math.max(index,0)).reverse()];
  const next=adjacent.find(tab=>!isWorkspaceTabHidden(novel,tab.key))?.key;
  // With every tab hidden the current document stays open and + remains available.
  if(!next)return null;
  if(next==='family')return {activeTab:next,view:'family' as const,selectedNodeId:novel.sections.family?.find(n=>!n.hidden)?.id??null};
  if(next==='timeline')return {activeTab:next,view:'timeline' as const,selectedNodeId:null};
  return {activeTab:next,view:view==='family'||view==='timeline'?'write' as const:view};
}
export function moveWorkspaceTabOrder(novel:Novel,from:TabKey,to:TabKey):TabKey[]|null {
  const visible=workspaceTabs(novel).map(tab=>tab.key);
  if(from===to||!visible.includes(from)||!visible.includes(to))return null;
  const order=rememberedOrder(novel),source=order.indexOf(from),target=order.indexOf(to);
  order.splice(source,1);order.splice(target,0,from);return order;
}
