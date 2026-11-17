import {useKachamak} from './store';
import type {SectionKey} from './types';

export function addTimelineNote(section:SectionKey,parentId:string|null,kind:'event'|'period') {
  const state=useKachamak.getState();
  const id=state.addNode(section,parentId,'doc',kind==='period'?'New Time Period':'New Event');
  if(id){state.updateNode(section,id,{timelineKind:kind});state.setView('timeline');if(!state.rightPanelOpen)state.toggleRightPanel();}
  return id;
}
