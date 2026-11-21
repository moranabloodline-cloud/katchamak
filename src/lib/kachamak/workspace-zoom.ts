import type {TabKey,ViewMode} from './types';
import {useSyncExternalStore} from 'react';

export type ZoomPanel = 'left'|'mid'|'right'|'paneA'|'paneB';
type Scope = {activeNovelId:string|null; activeTab:TabKey; view:ViewMode};
type LegacyZoom = {leftZoom:number; midZoom:number; rightZoom:number; paneAZoom:number|null; paneBZoom:number|null};

export function zoomScope(state:Scope) {
  return 'kachamak-workspace-zoom-v1:'+JSON.stringify([state.activeNovelId,state.view==='homepage'?'homepage':state.activeTab]);
}

// Device preferences are independent of book edits. Each setting has its own
// storage key so another window can change a different panel without a conflict.
const memory=new Map<string,string>();
const listeners=new Set<()=>void>();
export function subscribeZoom(listener:()=>void) {
  listeners.add(listener);
  window.addEventListener('storage',listener);
  return ()=>{listeners.delete(listener);window.removeEventListener('storage',listener);};
}
function read(key:string) {
  if(memory.has(key))return memory.get(key)!;
  try{return window.localStorage.getItem(key);}catch{return null;}
}
export function saveZoomSetting(scope:string,setting:string,value:string) {
  const key=scope+':'+setting;
  if(read(key)===value)return;
  try{window.localStorage.setItem(key,value);memory.delete(key);}
  catch{memory.set(key,value);}
  for(const notify of listeners)notify();
}
export function useZoomSetting(scope:string,setting:string) {
  return useSyncExternalStore(subscribeZoom,()=>read(scope+':'+setting),()=>null);
}
function legacyPanelZoom(state:LegacyZoom,panel:ZoomPanel) {
  switch(panel){
    case 'left':return state.leftZoom;
    case 'right':return state.rightZoom;
    case 'paneA':return state.paneAZoom;
    case 'paneB':return state.paneBZoom;
    case 'mid':return state.midZoom;
  }
}
function panelLevel(value:string|null,fallback:number) {
  const level=Number(value);
  return level>=0.5&&level<=2?level:fallback;
}
export function currentPanelZoom(state:Scope&LegacyZoom,panel:ZoomPanel) {
  const scope=zoomScope(state);
  const mid=panelLevel(read(scope+':mid'),state.midZoom??1);
  return panelLevel(read(scope+':'+panel),legacyPanelZoom(state,panel)??mid);
}
