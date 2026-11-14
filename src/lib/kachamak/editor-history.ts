type Point={path:number[];offset:number};
type Bookmark={start:Point;end:Point}|null;
type Frame={html:string;selection:Bookmark};
function bookmark(editor:HTMLElement):Bookmark {
  const selection=window.getSelection();if(!selection?.rangeCount)return null;
  const range=selection.getRangeAt(0);
  if(!editor.contains(range.startContainer)||!editor.contains(range.endContainer))return null;
  const point=(node:Node,offset:number):Point=>{const path:number[]=[];while(node!==editor&&node.parentNode){path.unshift(Array.prototype.indexOf.call(node.parentNode.childNodes,node));node=node.parentNode;}return {path,offset};};
  return {start:point(range.startContainer,range.startOffset),end:point(range.endContainer,range.endOffset)};
}
function restore(editor:HTMLElement,selection:Bookmark) {
  const range=document.createRange();
  const point=(p:Point):[Node,number]=>{let node:Node=editor;for(const index of p.path){if(!node.childNodes[index])break;node=node.childNodes[index];}return [node,Math.min(p.offset,node.nodeType===3?node.textContent?.length??0:node.childNodes.length)];};
  try{if(selection){range.setStart(...point(selection.start));range.setEnd(...point(selection.end));}else{range.selectNodeContents(editor);range.collapse(false);}}
  catch{range.selectNodeContents(editor);range.collapse(false);}
  const current=window.getSelection();current?.removeAllRanges();current?.addRange(range);
}
/** Private to one mounted editor. Nothing is written to browser storage or project data. */
export class EditorHistory {
  private frames:Frame[]=[];private index=0;private lastType='';private lastTime=0;
  reset(editor:HTMLElement){this.frames=[{html:editor.innerHTML,selection:bookmark(editor)}];this.index=0;this.lastType='';}
  before(editor:HTMLElement){if(this.frames[this.index])this.frames[this.index].selection=bookmark(editor);}
  record(editor:HTMLElement,type='',data:string|null=null){
    if(!this.frames.length)this.reset(editor);
    if(this.frames[this.index].html===editor.innerHTML)return;
    const now=Date.now(),merge=type==='insertText'&&this.lastType===type&&now-this.lastTime<750&&!!data&&!/\s/.test(data)&&this.index===this.frames.length-1&&this.index>0;
    this.frames.splice(this.index+1);
    const frame={html:editor.innerHTML,selection:bookmark(editor)};
    if(merge)this.frames[this.index]=frame;else{this.frames.push(frame);this.index++;}
    if(this.frames.length>100){this.frames.shift();this.index--;}
    this.lastType=type;this.lastTime=now;
  }
  step(editor:HTMLElement,direction:'undo'|'redo'){
    const next=this.index+(direction==='undo'?-1:1);
    if(next<0||next>=this.frames.length)return false;
    this.before(editor);this.index=next;this.lastType='';
    editor.innerHTML=this.frames[next].html;editor.focus();restore(editor,this.frames[next].selection);return true;
  }
}
