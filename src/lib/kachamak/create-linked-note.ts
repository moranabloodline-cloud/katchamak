import {useKachamak} from './store';
import {captureNoteLocation} from './note-navigation';
import {findNodeInNovel} from './utils';

// Codex is only a location for ordinary notes; there are no entity types or generated content.
export function createLinkedCodexNote(projectId:string,sourceId:string,title:string,parentId:string|null=null) {
  const state=useKachamak.getState(),novel=state.novels.find(n=>n.id===state.activeNovelId);
  const source=novel?findNodeInNovel(novel,sourceId):null;
  const name=title.trim().slice(0,200);
  if(!novel||novel.id!==projectId||!source||!name)return null;
  if(parentId&&findNodeInNovel(novel,parentId)?.section!=='codex')return null;
  const location=captureNoteLocation();
  const id=state.addNode('codex',parentId,'doc',name);
  if(!id)return null;
  state.updateNode(source.section,sourceId,{links:[...new Set([...(source.node.links??[]),id])]});
  useKachamak.setState({...location,renamingNodeId:null});
  return id;
}
