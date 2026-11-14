import {create} from 'zustand';
import {useKachamak} from './store';
import {findNodeInNovel} from './utils';
import type {TabKey, TreeScope, ViewMode} from './types';

type Location = {
  activeTab: TabKey; selectedNodeId: string | null;
  paneAId: string | null; paneBId: string | null;
  activePane: 'a' | 'b'; view: ViewMode; treeScope: TreeScope;
};
// A short reading trail belongs to this open session, never to a manuscript or backup.
export const useNoteTrail=create<{projectId:string|null;entries:Location[]}>(()=>({projectId:null,entries:[]}));
export function captureNoteLocation():Location {
  const {activeTab,selectedNodeId,paneAId,paneBId,activePane,view,treeScope}=useKachamak.getState();
  return {activeTab,selectedNodeId,paneAId,paneBId,activePane,view,treeScope};
}
export function openProjectNote(id:string,beside=false) {
  const state=useKachamak.getState(),novel=state.novels.find(n=>n.id===state.activeNovelId);
  const hit=novel?findNodeInNovel(novel,id):null;
  if(!novel||!hit)return false;
  if(!beside&&state.selectedNodeId===id&&(state.view==='write'||state.view==='split'))return true;
  const trail=useNoteTrail.getState();
  useNoteTrail.setState({projectId:novel.id,entries:[...(trail.projectId===novel.id?trail.entries:[]),captureNoteLocation()].slice(-30)});
  if(beside){
    // Always keep the actual source in its current pane, including after leaving Grid/Timeline.
    useKachamak.setState({view:'split',...(state.activePane==='a'?{paneAId:state.selectedNodeId}:{paneBId:state.selectedNodeId})});
    state.setActivePane(state.activePane==='a'?'b':'a');
  }else if(state.view!=='write'&&state.view!=='split')state.setView('write');
  state.setTab(hit.section);state.select(id);
  return true;
}
export function returnToPreviousNote() {
  const state=useKachamak.getState(),novel=state.novels.find(n=>n.id===state.activeNovelId),trail=useNoteTrail.getState();
  if(!novel||trail.projectId!==novel.id)return false;
  const entries=[...trail.entries];
  while(entries.length){
    const location=entries.pop()!;
    if(location.selectedNodeId&&!findNodeInNovel(novel,location.selectedNodeId))continue;
    const valid=(id:string|null)=>id&&findNodeInNovel(novel,id)?id:null;
    let tab=location.activeTab;
    if(tab.startsWith('note:')&&!novel.openNoteTabs?.includes(tab.slice(5)))tab=location.selectedNodeId?findNodeInNovel(novel,location.selectedNodeId)!.section:'binder';
    state.setTab(tab);
    useKachamak.setState({...location,activeTab:tab,paneAId:valid(location.paneAId),paneBId:valid(location.paneBId),renamingNodeId:null});
    useNoteTrail.setState({entries});return true;
  }
  useNoteTrail.setState({entries:[]});return false;
}
useKachamak.subscribe((state,previous)=>{
  if(state.activeNovelId!==previous.activeNovelId)useNoteTrail.setState({projectId:null,entries:[]});
});
