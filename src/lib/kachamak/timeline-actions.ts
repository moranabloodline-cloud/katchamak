import {create} from 'zustand';
import {useKachamak} from './store';
import type {SectionKey} from './types';

type TimelineAddRequest = {novelId:string;section:SectionKey;noteId:string};
// UI-only handoff: never included in project data, persisted state or cloud saves.
export const useTimelineAddRequest=create<TimelineAddRequest|null>(()=>null);
export function finishTimelineAdd(request:TimelineAddRequest) {
  if(useTimelineAddRequest.getState()===request)useTimelineAddRequest.setState(null,true);
}
export const usesCompactTimelineEditor=()=>window.matchMedia('(max-width: 1023px)').matches;

export function addTimelineNote(section:SectionKey,parentId:string|null,kind:'event'|'period') {
  const state=useKachamak.getState();
  const id=state.addNode(section,parentId,'doc',kind==='period'?'New Time Period':'New Event');
  if(id&&state.activeNovelId){
    state.updateNode(section,id,{timelineKind:kind});state.setView('timeline');
    if(!state.rightPanelOpen)state.toggleRightPanel();
    useTimelineAddRequest.setState({novelId:state.activeNovelId,section,noteId:id},true);
  }
  return id;
}
