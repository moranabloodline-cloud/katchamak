import {v5 as stableId} from 'uuid';
import {atlasOf, type MapAtlas} from './canvas-map';
import {HOME_ROOT, type HomeBlock, type Homepage} from './homepage';
import {galleryImage} from './project-image';
import {findNode, forEachNode} from './utils';
import type {NoteNode, Novel} from './types';

export function projectMaps(book:Novel) {
  const entries:{node:NoteNode;path:string}[]=[];
  function walk(nodes:NoteNode[],prefix:string) {
    for(const node of nodes) {
      const path=prefix+node.title;
      if(node.kind!=='folder')entries.push({node,path});
      walk(node.children,path+' / ');
    }
  }
  walk(book.sections.maps??[],'');
  return entries;
}

export function atlasBlock(node:NoteNode):HomeBlock {
  return {id:node.id,title:node.title,text:'',layout:'map',width:'wide',image:node.image,atlas:node.mapAtlas};
}

export function findProjectMap(book:Novel,id?:string) {
  const node=id&&findNode(book.sections.maps??[],id);
  return node&&node.kind!=='folder'?node:undefined;
}

// Allocate stable IDs on offline replay. A repeated image can depict independent maps.
export function migrateProjectMaps(book:Novel):Novel {
  const roots=book.sections?.maps??[];
  const added:NoteNode[]=[];
  const bindings=new Map<string,string>();
  let occupied:Set<string>|undefined;
  const sourceKey=(pageId:string,blockId:string)=>JSON.stringify(['canvas',pageId,blockId]);
  function create(key:string,title:string,image:string,atlas?:MapAtlas) {
    if(!occupied) {
      occupied=new Set();
      const remember=(node:NoteNode)=>occupied!.add(node.id);
      for(const branch of Object.values(book.sections??{}))forEachNode(branch,remember);
      for(const item of book.trash??[])forEachNode([item.node],remember);
    }
    let id=stableId('kachamak/project-map/'+key,stableId.URL);
    while(occupied.has(id))id=stableId(id,stableId.URL);
    occupied.add(id);
    const time=book.createdAt??0;
    added.push({id,kind:'doc',title:title.trim()||galleryImage(book.gallery,image)?.name||'Untitled map',image,mapAtlas:atlas,icon:'map',content:'',notes:'',synopsis:'',label:'',status:'',createdAt:time,updatedAt:time,children:[]});
    return id;
  }
  function convertPage<P extends Homepage>(page:P,pageId:string):P {
    let changed=false;
    const blocks=page.blocks.map(block=>{
      if(block.layout!=='map')return block;
      const key=sourceKey(pageId,block.id);
      if(block.mapId){bindings.set(key,block.mapId);return block;}
      if(!block.image)return block;
      const mapId=create(key,block.title,block.image,atlasOf(block));
      bindings.set(key,mapId);
      const {image,atlas,pin,...card}=block;
      changed=true;
      return {...card,mapId};
    });
    return changed?{...page,blocks}:page;
  }
  const homepage=book.homepage&&convertPage(book.homepage,HOME_ROOT);
  const pages=book.homePages?.map(page=>convertPage(page,page.id));
  let changed=homepage!==book.homepage||!!pages?.some((page,i)=>page!==book.homePages![i]);
  function convertNote(node:NoteNode):NoteNode {
    const children=node.children.map(convertNote);
    let link=node.noteMap;
    if(link?.kind==='canvas') {
      const id=bindings.get(sourceKey(link.pageId,link.blockId));
      if(id)link={kind:'map',mapId:id};
    }else if(link?.kind==='gallery'){
      const mapId=create(JSON.stringify(['note',node.id]),galleryImage(book.gallery,link.image)?.name||node.title,link.image,link.atlas);
      link={kind:'map',mapId};
    }
    if(link===node.noteMap && children.every((n,i)=>n===node.children[i]))return node;
    changed=true;
    return {...node,...(link!==node.noteMap?{noteMap:link}:{}),children};
  }
  const sections={...book.sections};
  for(const [section,branch] of Object.entries(sections)) {
    const nodes=branch.map(convertNote);
    if(nodes.some((n,i)=>n!==branch[i]))sections[section as keyof typeof sections]=nodes;
  }
  const trash=book.trash?.map(item=>{const node=convertNote(item.node);return node===item.node?item:{...item,node};});
  if(!changed&&!added.length)return book;
  if(added.length)sections.maps=[...(sections.maps??roots),...added];
  return {...book,sections,...(added.length?{mapsEnabled:true}:{}),...(homepage?{homepage}:{}),...(pages?{homePages:pages}:{}),...(trash?{trash}:{})};
}
