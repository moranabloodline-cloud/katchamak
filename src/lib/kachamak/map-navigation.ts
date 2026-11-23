import {useKachamak} from './store';
import {findProjectMap} from './project-maps';
import {homepageEntry} from './homepage';
import {findNodeInNovel} from './utils';
import type {Novel} from './types';

type Origin=Pick<ReturnType<typeof useKachamak.getState>,'activeTab'|'view'|'activeHomePageId'|'selectedNodeId'|'paneAId'|'paneBId'|'activePane'>;
type Visit={mapId:string;pinId?:string;origin:Origin};
const visits=new Map<string,Visit>();
const storageKey=(bookId:string)=>'kachamak:map-origin:'+bookId;

export function openProjectMap(book:Novel,mapId:string,pinId?:string) {
  const state=useKachamak.getState();
  if(state.activeNovelId!==book.id||!findProjectMap(book,mapId))return;
  const {activeTab,view,activeHomePageId,selectedNodeId,paneAId,paneBId,activePane}=state;
  const visit={mapId,pinId,origin:{activeTab,view,activeHomePageId,selectedNodeId,paneAId,paneBId,activePane}};
  visits.set(book.id,visit);
  try{window.sessionStorage.setItem(storageKey(book.id),JSON.stringify(visit));}catch{/* In-memory navigation still works. */}
  state.setTab('maps');
  useKachamak.setState({view:'write',selectedNodeId:mapId,paneAId:mapId,activePane:'a'});
}

export function mapVisit(book:Novel,mapId?:string){
  let visit=visits.get(book.id);
  if(!visit&&mapId){
    try{
      const value=JSON.parse(window.sessionStorage.getItem(storageKey(book.id))??'null');
      if(value?.mapId===mapId&&value.origin&&typeof value.origin.activeTab==='string'&&typeof value.origin.view==='string')visit=value;
    }catch{/* Storage is optional. */}
  }
  return visit?.mapId===mapId?visit:undefined;
}
export function clearMapVisit(bookId:string){
  visits.delete(bookId);
  try{window.sessionStorage.removeItem(storageKey(bookId));}catch{/* Storage is optional. */}
}
export function leaveMap(book:Novel,mapId:string) {
  const state=useKachamak.getState();
  if(state.activeNovelId!==book.id)return;
  const visit=mapVisit(book,mapId);
  clearMapVisit(book.id);
  if(visit){
    const back=visit.origin;
    if(back.view==='homepage'?!!homepageEntry(book,back.activeHomePageId):!!back.selectedNodeId&&!!findNodeInNovel(book,back.selectedNodeId)){
      const {activeTab,view,activeHomePageId,selectedNodeId,paneAId,paneBId,activePane}=back;
      useKachamak.setState({activeTab,view,activeHomePageId,selectedNodeId,paneAId,paneBId,activePane});
      return;
    }
  }
  state.select(null);
}

