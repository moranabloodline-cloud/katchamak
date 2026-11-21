import {create} from 'zustand';
import {inspectorSettings} from './inspector-tabs';
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
  const book=state.novels.find(n=>n.id===state.activeNovelId);
  return window.matchMedia('(max-width: 1023px)').matches ||
    !!book && inspectorSettings(book,state.activeTab).hidden.includes('details');
}

export function addTimelineNote(section:SectionKey,parentId:string|null,kind:'event'|'period') {
  const state=useKachamak.getState();
  const id=state.addNode(section,parentId,'doc',kind==='period'?'New Time Period':'New Event',['timeline']);
  if(id&&state.activeNovelId){
    state.updateNode(section,id,{timelineKind:kind,icon:undefined});state.setView('timeline');
    if(!usesTimelineDialog())state.setRightPanelOpen(true);
    useTimelineAddRequest.setState({novelId:state.activeNovelId,section,noteId:id},true);
  }
  return id;
}
