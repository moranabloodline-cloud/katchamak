import {TABS,type Novel,type TabKey,type SectionKey} from './types';
import {findNodeInNovel} from './utils';

export function validWorkspaceTabOrder(value:unknown):value is TabKey[]|undefined {
  return value===undefined||Array.isArray(value)&&value.length<=10000&&new Set(value).size===value.length&&value.every(key=>typeof key==='string'&&(/^(binder|codex|planning|research|templates|prompts|timeline)$/.test(key)||/^note:[a-zA-Z0-9_-]{1,128}$/.test(key)));
}
function availableTabs(novel:Novel) {
  return [...TABS.filter(tab=>tab.key!=='trash'&&tab.key!=='timeline'),...(novel.openNoteTabs??[]).flatMap(id=>{
    const hit=findNodeInNovel(novel,id);return hit?[{key:`note:${id}` as TabKey,label:hit.node.title}]:[];
  }),{key:'timeline' as TabKey,label:'Timeline'}];
}
function rememberedOrder(novel:Novel,tabs=availableTabs(novel)) {
  return [...new Set([...(validWorkspaceTabOrder(novel.tabOrder)?novel.tabOrder??[]:[]),...tabs.map(tab=>tab.key)])];
}
export function workspaceTabs(novel:Novel) {
  const tabs=availableTabs(novel),available=new Map(tabs.filter(tab=>!novel.hiddenSections?.includes(tab.key as SectionKey)).map(tab=>[tab.key,tab]));
  return rememberedOrder(novel,tabs).flatMap(key=>available.has(key)?[available.get(key)!]:[]);
}
export function moveWorkspaceTabOrder(novel:Novel,from:TabKey,to:TabKey):TabKey[]|null {
  const visible=workspaceTabs(novel).map(tab=>tab.key);
  if(from===to||!visible.includes(from)||!visible.includes(to))return null;
  const order=rememberedOrder(novel),source=order.indexOf(from),target=order.indexOf(to);
  order.splice(source,1);order.splice(target,0,from);return order;
}
