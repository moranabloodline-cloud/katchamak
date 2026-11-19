import type {LinkChoice, NoteNode, Novel} from './types';
import {contentText, flattenNotes, scanLinks,indexText,rangeForMatch,validLinkChoices, type NoteMatch} from './note-links';

/** Begin a new manual Save pass. Skips belong to the previous review only.
 * Preserve working target IDs even after a rename, and release missing targets
 * for detection again. Never guess the replacement for an unavailable ID. */
export function prepareLinkReview(novel:Novel,source:NoteNode){
  const targets=new Set(flattenNotes(novel).map(row=>row.node.id));
  return removeUnavailableNoteLinks(source,targets);
}

export function removeUnavailableNoteLinks(source:Pick<NoteNode,'content'|'linkChoices'>,targets:ReadonlySet<string>){
  const root=document.createElement('div');root.innerHTML=source.content;
  const before=indexText(root);
  const valid=validLinkChoices(before.text,source.linkChoices);
  const retained=valid.filter(choice=>choice.targetId!==null&&targets.has(choice.targetId));
  const broken=Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href^="#note/"]')).filter(anchor=>!targets.has(anchor.getAttribute('href')!.slice(6)));
  let linkChoices=retained;
  if(broken.length){
    // Keep DOM text-node coordinates through every unwrapped link, so multiple
    // repairs cannot invalidate valid choices between the repaired anchors.
    const points=retained.map(choice=>({choice,range:rangeForMatch(before.parts,choice)})).filter(row=>row.range).map(({choice,range})=>({choice,start:range!.startContainer,from:range!.startOffset,end:range!.endContainer,to:range!.endOffset}));
    broken.forEach(anchor=>anchor.replaceWith(...Array.from(anchor.childNodes)));
    const after=indexText(root),parts=new Map(after.parts.map(part=>[part.node,part]));
    linkChoices=points.flatMap(point=>{
      const start=parts.get(point.start as Text),end=parts.get(point.end as Text);
      return start&&end?[{...point.choice,start:start.start+point.from,end:end.start+point.to}]:[];
    });
  }
  return {content:broken.length?root.innerHTML:source.content,linkChoices,unavailable:broken.length+valid.filter(choice=>choice.targetId!==null&&!targets.has(choice.targetId)).length};
}

export function pendingLinkReview(novel:Novel, source:NoteNode) {
  const targets = flattenNotes(novel).map(row => row.node).filter(note => !note.ignoreAutoLinking);
  return scanLinks(contentText(source.content),targets,source.linkChoices,source.id).filter(match=>!match.explicit);
}

/** A batch never resolves an ambiguous name without a selected target. */
export function reviewDecisions(matches:NoteMatch[], current:NoteMatch, targetId:string|null, scope:'one'|'instances'|'remaining'):LinkChoice[] {
  const selected=scope==='one'?[current]:scope==='instances'?matches.filter(match=>match.text.toLocaleLowerCase()===current.text.toLocaleLowerCase()):matches;
  if(scope==='remaining') {
    const decisions:LinkChoice[]=[];
    for(const match of selected) {
      if(match.candidates.length!==1)break;
      decisions.push({start:match.start,end:match.end,text:match.text,targetId:match.candidates[0].id});
    }
    return decisions;
  }
  if(targetId!==null&&selected.some(match=>!match.candidates.some(note=>note.id===targetId)))throw new Error('Choose a target for this name.');
  return selected.map(({start,end,text})=>({start,end,text,targetId}));
}

export function mergeReviewChoices(novel:Novel, source:NoteNode, originalHtml:string, decisions:LinkChoice[]) {
  if(source.content!==originalHtml)throw new Error('This note changed. Save it again to review its latest text.');
  const pending=pendingLinkReview(novel,source);
  for(const decision of decisions) {
    const match=pending.find(match=>match.start===decision.start&&match.end===decision.end&&match.text===decision.text);
    if(!match||decision.targetId!==null&&!match.candidates.some(note=>note.id===decision.targetId))throw new Error('The available link targets changed. Save again to refresh the review.');
  }
  return [...(source.linkChoices??[]).filter(choice=>!decisions.some(decision=>choice.start===decision.start&&choice.end===decision.end)),...decisions].sort((a,b)=>a.start-b.start);
}
