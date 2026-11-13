'use client';
import type { ViewMode } from './types';
import { useKachamak } from './store';
export function readWorkspaceRoute() {
  if (typeof window === 'undefined') return null;
  if (window.location.hash === '#library') return { navigation: {activeNovelId:null,activeTab:'binder',selectedNodeId:null,paneAId:null,paneBId:null,activePane:'a'}, view:undefined };
  if (!window.location.hash.startsWith('#workspace?')) return null;
  const p = new URLSearchParams(window.location.hash.slice(11));
  return {navigation:{activeNovelId:p.get('project'),activeTab:p.get('tab')||'binder',selectedNodeId:p.get('note'),paneAId:p.get('a'),paneBId:p.get('b'),activePane:p.get('pane')||'a'},view:p.get('view') as ViewMode};
}
export function writeWorkspaceRoute() {
  if (typeof window === 'undefined') return;
  const s=useKachamak.getState();
  const p=new URLSearchParams();
  if(s.activeNovelId){p.set('project',s.activeNovelId);p.set('tab',s.activeTab);p.set('view',s.view);if(s.selectedNodeId)p.set('note',s.selectedNodeId);if(s.paneAId)p.set('a',s.paneAId);if(s.paneBId)p.set('b',s.paneBId);p.set('pane',s.activePane);}
  const hash=s.activeNovelId?'#workspace?'+p.toString():'#library';
  if(window.location.hash!==hash)window.history.replaceState(null,'',window.location.pathname+window.location.search+hash);
}
