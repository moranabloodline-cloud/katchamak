import type {LinkChoice, NoteNode, Novel} from './types';
import {contentText, flattenNotes, scanLinks, type NoteMatch} from './note-links';

export function pendingLinkReview(novel:Novel, source:NoteNode) {
  return scanLinks(contentText(source.content),flattenNotes(novel).map(row=>row.node),source.linkChoices,source.id).filter(match=>!match.explicit);
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
