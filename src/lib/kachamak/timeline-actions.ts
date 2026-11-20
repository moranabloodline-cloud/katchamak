import {create} from 'zustand';
import {useKachamak} from './store';
import type {SectionKey} from './types';

type TimelineAddRequest = {novelId:string;section:SectionKey;noteId:string};
// UI-only handoff: never included in project data, persisted state or cloud saves.
export const useTimelineAddRequest=create<TimelineAddRequest|null>(()=>null);
export function finishTimelineAdd(request:TimelineAddRequest) {
  if(useTimelineAddRequest.getState()===request)useTimelineAddRequest.setState(null,true);
}
export function usesTimelineDialog() {
  const state=useKachamak.getState();
  return window.matchMedia('(max-width: 1023px)').matches ||
    !!state.novels.find(n=>n.id===state.activeNovelId)?.hiddenInspectorTabs?.includes('details');
}

export function addTimelineNote(section:SectionKey,parentId:string|null,kind:'event'|'period') {
  const state=useKachamak.getState();
  const id=state.addNode(section,parentId,'doc',kind==='period'?'New Time Period':'New Event',['timeline']);
  if(id&&state.activeNovelId){
    state.updateNode(section,id,{timelineKind:kind,icon:undefined});state.setView('timeline');
    if(!state.rightPanelOpen && !usesTimelineDialog())state.toggleRightPanel();
    useTimelineAddRequest.setState({novelId:state.activeNovelId,section,noteId:id},true);
  }
  return id;
}
